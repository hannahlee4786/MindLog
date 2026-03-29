# Backend Pipeline

This backend-only Python module processes:

1. A Presage session export placed in `backend/data/presage/`
2. An ElevenLabs transcript JSON placed in `backend/data/elevenlabs/`
3. A Gemini enrichment step that produces grounded journaling output

## Test Input Locations

Drop your sample files here for local testing:

- `backend/data/presage/sample_presage_session.log`
- `backend/data/elevenlabs/sample_elevenlabs.json`

The Presage input can be either:

- a raw text log with lines containing embedded JSON
- a JSON document with nested events
- a JSON array of event records

## Output Files

Running the pipeline writes debug outputs to `backend/outputs/`:

- `presage_summary.json`
- `presage_vector.json`
- `gemini_payload.json`
- `gemini_response.json`
- `final_output.json`

## Environment

Copy `.env.example` values into your environment or local `.env` file.

Required for real Gemini calls:

- `GEMINI_API_KEY`

Optional:

- `GEMINI_MODEL`
- `PRESAGE_SAMPLE_PATH`
- `ELEVENLABS_SAMPLE_PATH`
- `PIPELINE_OUTPUT_DIR`

## Install

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
cd backend
python3 main.py
```

If `GEMINI_API_KEY` is not set, the script falls back to a deterministic mock Gemini response so you can test the rest of the pipeline.

## Sample Final Output

```json
{
  "song_name": "Fix You",
  "album_cover_url": "https://example.com/fix-you.jpg",
  "affirmation": "I am allowed to rest and recover without guilt.",
  "summary": "You described feeling overwhelmed and tired, but also reflective and still trying to move forward.",
  "gratitude_points": [
    "You gave yourself space to reflect on your feelings.",
    "You are still showing resilience even in a hard moment.",
    "You recognized what is affecting your emotional state."
  ],
  "stress_score": 68
}
```
