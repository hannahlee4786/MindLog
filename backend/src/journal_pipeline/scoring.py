from __future__ import annotations

import logging
from typing import Any


LOGGER = logging.getLogger(__name__)


def compute_stress_score(presage_features: dict[str, Any]) -> dict[str, Any]:
    """
    Transparent 0-100 score based on simple interpretable heuristics.
    """
    breathing_rate_mean = _num(presage_features.get("breathing_rate_mean"))
    breathing_rate_std = _num(presage_features.get("breathing_rate_std"))
    pulse_rate_std = _num(presage_features.get("pulse_rate_std"))
    breathing_rate_slope = _num(presage_features.get("breathing_rate_slope"))
    blink_rate = _num(presage_features.get("blink_rate"))
    talking_ratio = _num(presage_features.get("talking_ratio"))
    stable_ratio = _num(presage_features.get("stable_ratio"))

    score = 20.0
    score += min(max((breathing_rate_mean - 12.0) * 4.0, 0.0), 25.0)
    score += min(breathing_rate_std * 6.0, 20.0)
    score += min(pulse_rate_std * 8.0, 20.0)
    score += min(max(breathing_rate_slope, 0.0) * 25.0, 10.0)
    score += min(blink_rate * 25.0, 10.0)
    score += min(max(0.0, 0.4 - talking_ratio) * 25.0, 5.0)
    score += min(max(0.0, 0.7 - stable_ratio) * 30.0, 10.0)
    score = max(0.0, min(score, 100.0))

    physiology_summary = _build_physiology_summary(presage_features)
    LOGGER.info("Computed deterministic stress score: %.2f", score)
    return {
        "stress_score": int(round(score)),
        "physiology_summary": physiology_summary,
    }


def _build_physiology_summary(presage_features: dict[str, Any]) -> str:
    trend = presage_features.get("breathing_rate_trend", "steady")
    signal_quality = presage_features.get("signal_quality", "unknown")
    pulse_rate_std = _num(presage_features.get("pulse_rate_std"))
    breathing_rate_std = _num(presage_features.get("breathing_rate_std"))

    phrases = [
        _trend_phrase(trend),
        f"Signals were {signal_quality}.",
        _variability_phrase("Pulse variability", pulse_rate_std),
        _variability_phrase("Breathing variability", breathing_rate_std),
    ]
    return " ".join(phrase for phrase in phrases if phrase)


def _trend_phrase(trend: str) -> str:
    if trend == "increasing":
        return "Breathing rate increased over the session."
    if trend == "decreasing":
        return "Breathing rate decreased over the session."
    return "Breathing rate remained relatively steady."


def _variability_phrase(label: str, value: float) -> str:
    if value >= 3.0:
        level = "high"
    elif value >= 1.0:
        level = "moderate"
    else:
        level = "low"
    return f"{label} was {level}."


def _num(value: Any) -> float:
    try:
        return float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0
