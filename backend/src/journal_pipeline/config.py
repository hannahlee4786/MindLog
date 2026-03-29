from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class PipelineConfig:
    presage_sample_path: Path
    elevenlabs_sample_path: Path
    output_dir: Path
    gemini_api_key: str | None
    gemini_model: str


def _resolve_path(env_name: str, default_relative: str, backend_root: Path) -> Path:
    raw = os.getenv(env_name)
    if raw:
        path = Path(raw)
        return path if path.is_absolute() else backend_root.parent / path
    return backend_root / default_relative


def load_config() -> PipelineConfig:
    backend_root = Path(__file__).resolve().parents[2]
    return PipelineConfig(
        presage_sample_path=_resolve_path(
            "PRESAGE_SAMPLE_PATH",
            "data/presage/sample_presage_session.log",
            backend_root,
        ),
        elevenlabs_sample_path=_resolve_path(
            "ELEVENLABS_SAMPLE_PATH",
            "data/elevenlabs/sample_elevenlabs.json",
            backend_root,
        ),
        output_dir=_resolve_path("PIPELINE_OUTPUT_DIR", "outputs", backend_root),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    )
