from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from .config import load_config
from .gemini_client import (
    GEMINI_SYSTEM_PROMPT,
    build_gemini_payload,
    call_gemini,
)
from .io_utils import save_json_file
from .presage import build_presage_vector, parse_presage_session, summarize_presage
from .scoring import compute_stress_score
from .songs import resolve_song_and_cover
from .transcript import load_elevenlabs_json


LOGGER = logging.getLogger(__name__)


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


def build_final_output(
    gemini_response: dict[str, Any],
    song_resolution: dict[str, str],
    stress_score: int,
) -> dict[str, Any]:
    gratitude_points = gemini_response.get("gratitude_points")
    if not isinstance(gratitude_points, list):
        gratitude_points = []

    return {
        "song_name": song_resolution["song_name"],
        "album_cover_url": song_resolution["album_cover_url"],
        "affirmation": str(gemini_response.get("affirmation", "")),
        "summary": str(gemini_response.get("summary", "")),
        "gratitude_points": [str(item) for item in gratitude_points[:3]],
        "stress_score": int(stress_score),
    }


def run_pipeline() -> dict[str, Any]:
    config = load_config()
    LOGGER.info("Pipeline started")

    presage_session = parse_presage_session(config.presage_sample_path)
    presage_summary = summarize_presage(presage_session)
    save_json_file(config.output_dir / "presage_summary.json", presage_summary)

    presage_vector = build_presage_vector(presage_summary)
    save_json_file(config.output_dir / "presage_vector.json", presage_vector)

    scoring_result = compute_stress_score(presage_summary)

    transcript_payload = load_elevenlabs_json(config.elevenlabs_sample_path)
    gemini_payload = build_gemini_payload(
        presage_summary=presage_summary,
        stress_score=scoring_result["stress_score"],
        physiology_summary=scoring_result["physiology_summary"],
        transcript=transcript_payload["transcript"],
    )
    save_json_file(config.output_dir / "gemini_payload.json", gemini_payload)

    gemini_response = call_gemini(
        gemini_payload=gemini_payload,
        api_key=config.gemini_api_key,
        model=config.gemini_model,
    )
    save_json_file(config.output_dir / "gemini_response.json", gemini_response)

    song_resolution = resolve_song_and_cover(gemini_response)
    final_output = build_final_output(
        gemini_response=gemini_response,
        song_resolution=song_resolution,
        stress_score=scoring_result["stress_score"],
    )
    save_json_file(config.output_dir / "final_output.json", final_output)

    LOGGER.info("Pipeline finished")
    return {
        "presage_summary": presage_summary,
        "presage_vector": presage_vector,
        "scoring_result": scoring_result,
        "gemini_payload": gemini_payload,
        "gemini_response": gemini_response,
        "final_output": final_output,
        "gemini_system_prompt": GEMINI_SYSTEM_PROMPT,
        "sample_expected_final_output": _sample_expected_final_output(),
    }


def _sample_expected_final_output() -> dict[str, Any]:
    return {
        "song_name": "Fix You",
        "album_cover_url": "https://example.com/fix-you.jpg",
        "affirmation": "I am allowed to rest and recover without guilt.",
        "summary": (
            "You described feeling overwhelmed and tired, but also reflective and "
            "still trying to move forward."
        ),
        "gratitude_points": [
            "You gave yourself space to reflect on your feelings.",
            "You are still showing resilience even in a hard moment.",
            "You recognized what is affecting your emotional state.",
        ],
        "stress_score": 68,
    }


def main() -> None:
    configure_logging()
    try:
        results = run_pipeline()
    except Exception as exc:
        LOGGER.exception("Pipeline failed: %s", exc)
        raise

    final_output = results["final_output"]
    LOGGER.info("Final output ready: %s", final_output)
