from __future__ import annotations

import json
import logging
import math
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from .io_utils import load_json_file, load_text_file


LOGGER = logging.getLogger(__name__)


@dataclass
class PresageSession:
    records: list[dict[str, Any]]


def parse_presage_session(path: Path) -> PresageSession:
    LOGGER.info("Loading Presage session from %s", path)
    suffix = path.suffix.lower()

    if suffix in {".json", ".jsonl"}:
        raw = load_json_file(path)
        return PresageSession(records=_normalize_presage_payload(raw))

    text = load_text_file(path)
    records = _parse_presage_text_log(text)
    return PresageSession(records=records)


def summarize_presage(session: PresageSession) -> dict[str, Any]:
    LOGGER.info("Summarizing %s Presage records", len(session.records))

    pulse_rates: list[float] = []
    breathing_rates: list[float] = []
    pulse_trace_values: list[float] = []
    breathing_trace_values: list[float] = []
    stable_values: list[bool] = []
    blink_count = 0
    talking_frames = 0
    face_frames = 0

    for index, record in enumerate(session.records):
        _extend_numeric_list(pulse_rates, _extract_nested_numbers(record, "pulse", "rate"))
        _extend_numeric_list(
            breathing_rates,
            _extract_nested_numbers(record, "breathing", "rate"),
        )
        _extend_numeric_list(
            pulse_trace_values,
            _extract_nested_numbers(record, "pulse", "trace"),
        )
        _extend_numeric_list(
            breathing_trace_values,
            _extract_nested_numbers(record, "breathing", "upperTrace"),
        )

        face = record.get("face")
        if isinstance(face, dict):
            face_frames += 1

            blinking = face.get("blinking")
            if _extract_detected(blinking):
                blink_count += 1

            talking = face.get("talking")
            if _extract_detected(talking):
                talking_frames += 1

        stable_values.extend(_collect_stable_flags(record))

        if not record.get("_time_index"):
            record["_time_index"] = index

    breathing_rate_slope = _compute_slope(breathing_rates)
    pulse_rate_slope = _compute_slope(pulse_rates)

    summary = {
        "record_count": len(session.records),
        "pulse_rate_mean": _safe_mean(pulse_rates),
        "pulse_rate_std": _safe_std(pulse_rates),
        "pulse_rate_slope": pulse_rate_slope,
        "breathing_rate_mean": _safe_mean(breathing_rates),
        "breathing_rate_std": _safe_std(breathing_rates),
        "breathing_rate_slope": breathing_rate_slope,
        "breathing_rate_trend": _trend_label(breathing_rate_slope),
        "pulse_trace_std": _safe_std(pulse_trace_values),
        "breathing_trace_std": _safe_std(breathing_trace_values),
        "blink_count": blink_count,
        "blink_rate": (blink_count / face_frames) if face_frames else 0.0,
        "talking_ratio": (talking_frames / face_frames) if face_frames else 0.0,
        "signal_quality": _signal_quality_label(stable_values),
        "stable_ratio": (sum(stable_values) / len(stable_values)) if stable_values else 0.0,
        "metadata": _first_metadata(session.records),
    }
    return summary


def build_presage_vector(presage_summary: dict[str, Any]) -> dict[str, float]:
    keys = [
        "pulse_rate_mean",
        "pulse_rate_std",
        "breathing_rate_mean",
        "breathing_rate_std",
        "breathing_rate_slope",
        "pulse_trace_std",
        "breathing_trace_std",
        "blink_rate",
        "talking_ratio",
    ]
    return {key: float(presage_summary.get(key, 0.0) or 0.0) for key in keys}


def fetch_presage_from_mongodb(
    session_id: str,
    mongo_uri: str,
    db_name: str,
    collection_name: str,
) -> Any:
    """
    MongoDB integration stub.

    Plug your real schema in here once you know whether a session is stored as:
    - raw text logs
    - a list of event documents
    - a nested JSON document
    """
    try:
        from pymongo import MongoClient
    except ImportError as exc:
        raise RuntimeError("pymongo is not installed. Add it to your environment.") from exc

    LOGGER.info("Fetching Presage session %s from MongoDB", session_id)
    client = MongoClient(mongo_uri)
    collection = client[db_name][collection_name]

    # Replace this query and normalization logic with your real schema.
    document = collection.find_one({"session_id": session_id})
    if document is None:
        raise LookupError(f"Session {session_id} was not found in MongoDB")

    return document


def _normalize_presage_payload(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in (_normalize_record(entry) for entry in payload) if item]

    if isinstance(payload, dict):
        if "records" in payload and isinstance(payload["records"], list):
            return [item for item in (_normalize_record(entry) for entry in payload["records"]) if item]

        if "events" in payload and isinstance(payload["events"], list):
            return [item for item in (_normalize_record(entry) for entry in payload["events"]) if item]

        normalized = _normalize_record(payload)
        return [normalized] if normalized else []

    raise ValueError("Unsupported Presage payload format")


def _parse_presage_text_log(text: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for index, line in enumerate(text.splitlines()):
        line = line.strip()
        if not line:
            continue

        json_blob = _extract_json_from_line(line)
        if not json_blob:
            continue

        try:
            payload = json.loads(json_blob)
        except json.JSONDecodeError:
            LOGGER.debug("Skipping unparsable Presage line %s", index)
            continue

        for record in _normalize_presage_payload(payload):
            if "_time_index" not in record:
                record["_time_index"] = index
            records.append(record)

    if not records:
        raise ValueError("No Presage records could be parsed from the provided file")
    return records


def _extract_json_from_line(line: str) -> str | None:
    start = line.find("{")
    if start == -1:
        return None
    candidate = line[start:]
    try:
        json.loads(candidate)
        return candidate
    except json.JSONDecodeError:
        return _trim_to_balanced_json(candidate)


def _trim_to_balanced_json(candidate: str) -> str | None:
    depth = 0
    in_string = False
    escape = False
    for index, char in enumerate(candidate):
        if escape:
            escape = False
            continue
        if char == "\\":
            escape = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return candidate[: index + 1]
    return None


def _normalize_record(entry: Any) -> dict[str, Any] | None:
    if not isinstance(entry, dict):
        return None

    if "payload" in entry and isinstance(entry["payload"], dict):
        merged = dict(entry["payload"])
        if "timestamp" in entry and "timestamp" not in merged:
            merged["timestamp"] = entry["timestamp"]
        return merged

    return dict(entry)


def _extract_nested_numbers(record: dict[str, Any], *keys: str) -> list[float]:
    current: Any = record
    for key in keys:
        if not isinstance(current, dict):
            return []
        current = current.get(key)
    return _flatten_numbers(current)


def _flatten_numbers(value: Any) -> list[float]:
    if value is None:
        return []
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if math.isfinite(float(value)):
            return [float(value)]
        return []
    if isinstance(value, list):
        values: list[float] = []
        for item in value:
            values.extend(_flatten_numbers(item))
        return values
    if isinstance(value, dict):
        values: list[float] = []
        for item in value.values():
            values.extend(_flatten_numbers(item))
        return values
    return []


def _extract_detected(value: Any) -> bool:
    if isinstance(value, dict):
        detected = value.get("detected")
        if isinstance(detected, bool):
            return detected
        if isinstance(detected, (int, float)):
            return bool(detected)
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return False


def _collect_stable_flags(record: dict[str, Any]) -> list[bool]:
    flags: list[bool] = []
    for key, value in _walk_items(record):
        if "stable" not in key.lower():
            continue
        if isinstance(value, bool):
            flags.append(value)
        elif isinstance(value, (int, float)):
            flags.append(bool(value))
    return flags


def _walk_items(value: Any, prefix: str = "") -> Iterable[tuple[str, Any]]:
    if isinstance(value, dict):
        for key, nested in value.items():
            next_prefix = f"{prefix}.{key}" if prefix else key
            yield next_prefix, nested
            yield from _walk_items(nested, next_prefix)
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            next_prefix = f"{prefix}[{index}]"
            yield next_prefix, nested
            yield from _walk_items(nested, next_prefix)


def _safe_mean(values: list[float]) -> float:
    return float(np.mean(values)) if values else 0.0


def _safe_std(values: list[float]) -> float:
    return float(np.std(values)) if values else 0.0


def _compute_slope(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    x = np.arange(len(values), dtype=float)
    y = np.array(values, dtype=float)
    slope, _ = np.polyfit(x, y, 1)
    return float(slope)


def _trend_label(slope: float, threshold: float = 0.05) -> str:
    if slope > threshold:
        return "increasing"
    if slope < -threshold:
        return "decreasing"
    return "steady"


def _signal_quality_label(stable_values: list[bool]) -> str:
    if not stable_values:
        return "unknown"

    stable_ratio = sum(stable_values) / len(stable_values)
    if stable_ratio >= 0.8:
        return "stable"
    if stable_ratio >= 0.5:
        return "mixed"
    return "unstable"


def _first_metadata(records: list[dict[str, Any]]) -> dict[str, Any]:
    for record in records:
        metadata = record.get("metadata")
        if isinstance(metadata, dict):
            return metadata
    return {}


def _extend_numeric_list(target: list[float], values: list[float]) -> None:
    if values:
        target.extend(values)
