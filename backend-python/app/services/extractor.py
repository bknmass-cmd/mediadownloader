import os
import sys
from pathlib import Path
import re
import uuid
import tempfile
import subprocess
from typing import Dict, Any, List, Optional
import yt_dlp
import httpx

# Ensure app package is importable
app_dir = str(Path(__file__).resolve().parent.parent)
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from models.schemas import ExtractResponse, MediaItemSchema

def get_ffmpeg_path() -> Optional[str]:
    """Finds ffmpeg path from environment, imageio_ffmpeg, or system PATH."""
    try:
        import imageio_ffmpeg
        path = imageio_ffmpeg.get_ffmpeg_exe()
        if path and os.path.exists(path):
            return path
    except Exception:
        pass

    import shutil
    return shutil.which("ffmpeg")

def detect_platform(url: str) -> str:
    url_lower = url.lower()
    if "instagram.com" in url_lower or "instagr.am" in url_lower:
        return "instagram"
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    if "threads.net" in url_lower:
        return "threads"
    if "twitter.com" in url_lower or "x.com" in url_lower or "t.co" in url_lower:
        return "twitter"
    if "tiktok.com" in url_lower:
        return "tiktok"
    if "facebook.com" in url_lower or "fb.watch" in url_lower:
        return "facebook"
    return "generic"

def is_video_metadata(entry: Dict[str, Any]) -> bool:
    """Checks whether an entry/info dict represents a video or a photo."""
    vcodec = entry.get("vcodec")
    if vcodec and vcodec != "none":
        return True
    ext = (entry.get("ext") or "").lower()
    if ext in ["mp4", "webm", "mkv", "mov", "m4v"]:
        return True
    formats = entry.get("formats") or []
    for f in formats:
        if f.get("vcodec") and f.get("vcodec") != "none":
            return True
        f_ext = (f.get("ext") or "").lower()
        if f_ext in ["mp4", "webm", "mkv", "mov"]:
            return True
    return False

class MediaExtractor:
    @staticmethod
    def extract_info(url: str) -> ExtractResponse:
        platform = detect_platform(url)
        ffmpeg_exe = get_ffmpeg_path()

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "extract_flat": False,
            "nocheckcertificate": True,
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
        }
        if ffmpeg_exe:
            ydl_opts["ffmpeg_location"] = ffmpeg_exe

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception as e:
            raise RuntimeError(f"Extraction failed: {str(e)}")

        if not info:
            raise RuntimeError("Could not retrieve media info from the provided URL.")

        title = info.get("title") or info.get("description") or "SnapVid_Media"
        # Sanitize title
        title = re.sub(r'[\r\n\t]+', ' ', title).strip()
        if len(title) > 90:
            title = title[:87] + "..."

        entries = info.get("entries")
        items: List[MediaItemSchema] = []

        if entries and len(entries) > 0:
            # Multi-item post (Carousel or playlist)
            for idx, entry in enumerate(entries):
                if not entry:
                    continue
                item_id = str(entry.get("id") or f"item_{idx + 1}")
                is_video = is_video_metadata(entry)

                thumb = entry.get("thumbnail")
                if not thumb and entry.get("thumbnails"):
                    thumb = entry["thumbnails"][-1].get("url")

                media_url = entry.get("url")
                if not media_url and entry.get("formats"):
                    # Find highest quality format
                    formats = [f for f in entry["formats"] if f.get("url")]
                    if formats:
                        media_url = formats[-1].get("url")

                if not thumb and media_url and not is_video:
                    thumb = media_url

                items.append(
                    MediaItemSchema(
                        id=item_id,
                        type="video" if is_video else "image",
                        thumbnail_url=thumb or media_url or "",
                        media_url=media_url or thumb or "",
                        duration=entry.get("duration"),
                        width=entry.get("width"),
                        height=entry.get("height")
                    )
                )

            media_type = "carousel"
        else:
            # Single item
            is_video = is_video_metadata(info)
            thumb = info.get("thumbnail")
            if not thumb and info.get("thumbnails"):
                thumb = info["thumbnails"][-1].get("url")

            media_url = info.get("url")
            if not media_url and info.get("formats"):
                formats = [f for f in info["formats"] if f.get("url")]
                if formats:
                    media_url = formats[-1].get("url")

            if not thumb and media_url and not is_video:
                thumb = media_url

            items.append(
                MediaItemSchema(
                    id=str(info.get("id") or "1"),
                    type="video" if is_video else "image",
                    thumbnail_url=thumb or media_url or "",
                    media_url=media_url or thumb or "",
                    duration=info.get("duration"),
                    width=info.get("width"),
                    height=info.get("height")
                )
            )
            media_type = "video" if is_video else "single_image"

        return ExtractResponse(
            platform=platform,
            media_type=media_type,
            title=title,
            items=items,
            thumbnail=items[0].thumbnail_url if items else None
        )
