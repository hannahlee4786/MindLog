from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.journal_pipeline.pipeline import configure_logging, run_pipeline


configure_logging()

app = FastAPI(title="MindLog API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ProcessRequest(BaseModel):
    transcript: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/process")
def process(body: ProcessRequest | None = None) -> dict:
    try:
        results = run_pipeline()
        return results["final_output"]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
