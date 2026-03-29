from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from .io_utils import load_json_file


LOGGER = logging.getLogger(__name__)


def load_elevenlabs_json(path: Path) -> dict[str, Any]:
    LOGGER.info("Loading ElevenLabs transcript from %s", path)
    payload = load_json_file(path)

    transcript = _extract_transcript(payload)
    if not transcript:
        raise ValueError(f"No transcript text found in ElevenLabs payload: {path}")

    return {
        "transcript": transcript,
        "speakers": _extract_optional(payload, ["speakers", "speaker_segments", "speaker_labels"]),
        "timestamps": _extract_optional(payload, ["timestamps", "words", "segments"]),
        "raw": payload,
    }


def _extract_transcript(payload: Any) -> str:
    if isinstance(payload, str):
        return payload.strip()

    if isinstance(payload, dict):
        for key in ("transcript", "text", "full_text"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        words = payload.get("words")
        if isinstance(words, list):
            tokens = []
            for item in words:
                if isinstance(item, dict):
                    token = item.get("text") or item.get("word")
                    if isinstance(token, str):
                        tokens.append(token)
            if tokens:
                return " ".join(tokens).strip()

        segments = payload.get("segments")
        if isinstance(segments, list):
            pieces = []
            for item in segments:
                if isinstance(item, dict):
                    text = item.get("text")
                    if isinstance(text, str):
                        pieces.append(text.strip())
            if pieces:
                return " ".join(piece for piece in pieces if piece).strip()

    if isinstance(payload, list):
        pieces = []
        for item in payload:
            text = _extract_transcript(item)
            if text:
                pieces.append(text)
        return " ".join(pieces).strip()

    return ""


def _extract_optional(payload: Any, keys: list[str]) -> Any:
    if isinstance(payload, dict):
        for key in keys:
            if key in payload:
                return payload[key]
    return None
