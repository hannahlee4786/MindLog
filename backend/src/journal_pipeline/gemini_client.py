from __future__ import annotations

import json
import logging
from typing import Any

from .io_utils import save_json_file


LOGGER = logging.getLogger(__name__)

GEMINI_SYSTEM_PROMPT = """You are a grounded journaling assistant.
Use only the provided transcript, stress_score, physiology_summary, and presage_features.
Do not invent physiological measurements.
Do not diagnose mental health, medical, or psychiatric conditions.
Keep the response supportive, concrete, and emotionally aware.
Return strict JSON only and follow the schema exactly."""

GEMINI_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "affirmation": {"type": "string"},
        "gratitude_points": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 3,
        },
        "music_mood": {"type": "string"},
        "suggested_song_title": {"type": "string"},
        "suggested_song_artist": {"type": "string"},
    },
    "required": [
        "summary",
        "affirmation",
        "gratitude_points",
        "music_mood",
        "suggested_song_title",
        "suggested_song_artist",
    ],
    "additionalProperties": False,
}


def build_gemini_payload(
    presage_summary: dict[str, Any],
    stress_score: int,
    physiology_summary: str,
    transcript: str,
) -> dict[str, Any]:
    return {
        "transcript": transcript,
        "stress_score": stress_score,
        "physiology_summary": physiology_summary,
        "presage_features": {
            "pulse_rate_mean": presage_summary.get("pulse_rate_mean", 0.0),
            "pulse_rate_std": presage_summary.get("pulse_rate_std", 0.0),
            "breathing_rate_mean": presage_summary.get("breathing_rate_mean", 0.0),
            "breathing_rate_std": presage_summary.get("breathing_rate_std", 0.0),
            "breathing_rate_trend": presage_summary.get("breathing_rate_trend", "steady"),
            "pulse_trace_std": presage_summary.get("pulse_trace_std", 0.0),
            "breathing_trace_std": presage_summary.get("breathing_trace_std", 0.0),
            "blink_count": presage_summary.get("blink_count", 0),
            "blink_rate": presage_summary.get("blink_rate", 0.0),
            "talking_ratio": presage_summary.get("talking_ratio", 0.0),
            "signal_quality": presage_summary.get("signal_quality", "unknown"),
        },
    }


def call_gemini(
    gemini_payload: dict[str, Any],
    api_key: str | None,
    model: str,
) -> dict[str, Any]:
    if not api_key:
        LOGGER.warning("GEMINI_API_KEY not set. Using deterministic mock Gemini response.")
        return build_mock_gemini_response(gemini_payload)

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError(
            "google-genai is not installed. Add it to requirements and your environment."
        ) from exc

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model,
        contents=json.dumps(gemini_payload, indent=2),
        config=types.GenerateContentConfig(
            system_instruction=GEMINI_SYSTEM_PROMPT,
            temperature=0.2,
            response_mime_type="application/json",
            response_json_schema=GEMINI_RESPONSE_SCHEMA,
        ),
    )

    if getattr(response, "parsed", None):
        parsed = response.parsed
        if hasattr(parsed, "model_dump"):
            return parsed.model_dump()
        if isinstance(parsed, dict):
            return parsed

    text = getattr(response, "text", "")
    if not text:
        raise ValueError("Gemini returned an empty response")

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini returned non-JSON output: {text}") from exc


def build_mock_gemini_response(gemini_payload: dict[str, Any]) -> dict[str, Any]:
    transcript = gemini_payload.get("transcript", "")
    stress_score = int(gemini_payload.get("stress_score", 0))
    mood = _infer_mock_mood(stress_score)
    summary = (
        "You described a reflective moment with both strain and effort to keep moving."
        if transcript
        else "You captured a reflective moment with limited transcript detail."
    )
    return {
        "summary": summary,
        "affirmation": "I can respond to this moment with honesty, care, and patience.",
        "gratitude_points": [
            "You took time to check in with yourself.",
            "You created a record of how this moment feels.",
            "You are still looking for a steady next step.",
        ],
        "music_mood": mood,
        "suggested_song_title": "Fix You",
        "suggested_song_artist": "Coldplay",
    }


def _infer_mock_mood(stress_score: int) -> str:
    if stress_score >= 75:
        return "grounding"
    if stress_score >= 55:
        return "calming_reflective"
    if stress_score >= 35:
        return "gentle_encouragement"
    return "uplifting"
