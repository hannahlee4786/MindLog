from __future__ import annotations

import logging
from typing import Any


LOGGER = logging.getLogger(__name__)


SONG_CATALOG: dict[str, list[dict[str, str]]] = {
    "calming_reflective": [
        {
            "title": "Fix You",
            "artist": "Coldplay",
            "album_cover_url": "https://upload.wikimedia.org/wikipedia/en/b/b2/Coldplay_-_X%26Y.png",
        }
    ],
    "hopeful_reset": [
        {
            "title": "Here Comes The Sun",
            "artist": "The Beatles",
            "album_cover_url": "https://upload.wikimedia.org/wikipedia/en/4/42/Beatles_-_Abbey_Road.jpg",
        }
    ],
    "gentle_encouragement": [
        {
            "title": "Dog Days Are Over",
            "artist": "Florence + The Machine",
            "album_cover_url": "https://upload.wikimedia.org/wikipedia/en/5/54/Lungs_album_cover.png",
        }
    ],
    "uplifting": [
        {
            "title": "Lovely Day",
            "artist": "Bill Withers",
            "album_cover_url": "https://upload.wikimedia.org/wikipedia/en/0/09/Menagerie_-_Bill_Withers.jpg",
        }
    ],
    "grounding": [
        {
            "title": "Holocene",
            "artist": "Bon Iver",
            "album_cover_url": "https://upload.wikimedia.org/wikipedia/en/6/68/Bon_Iver_Bon_Iver.jpg",
        }
    ],
}


def resolve_song_and_cover(gemini_response: dict[str, Any]) -> dict[str, str]:
    mood = str(gemini_response.get("music_mood", "") or "").strip()
    if mood in SONG_CATALOG and SONG_CATALOG[mood]:
        song = SONG_CATALOG[mood][0]
        return {
            "song_name": song["title"],
            "album_cover_url": song["album_cover_url"],
        }

    fallback_title = str(gemini_response.get("suggested_song_title", "") or "").strip()
    fallback_artist = str(gemini_response.get("suggested_song_artist", "") or "").strip()
    if fallback_title and fallback_artist:
        resolved = resolve_album_cover(fallback_title, fallback_artist)
        return {
            "song_name": fallback_title,
            "album_cover_url": resolved,
        }

    default_song = SONG_CATALOG["calming_reflective"][0]
    return {
        "song_name": default_song["title"],
        "album_cover_url": default_song["album_cover_url"],
    }


def resolve_album_cover(song_title: str, artist: str) -> str:
    """
    Music metadata API lookup stub.

    Replace this with a real integration if you want dynamic catalog resolution.
    """
    LOGGER.info("Album cover lookup stub for %s by %s", song_title, artist)
    return "https://example.com/album-cover-placeholder.jpg"
