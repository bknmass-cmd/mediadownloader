import os
import sys
from pathlib import Path
import time
import uuid
import tempfile
import subprocess
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import httpx
import yt_dlp

# Ensure app package is importable
app_dir = str(Path(__file__).resolve().parent)
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from models.schemas import ExtractRequest, ExtractResponse
from services.extractor import MediaExtractor, get_ffmpeg_path

app = FastAPI(
    title="SnapVid API",
    description="High-performance social media video and image extraction service for SnapVid.",
    version="1.0.0"
)

# Enable CORS for Capacitor Android and Web
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(http://|https://|capacitor://|ionic://).*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def remove_temp_file(path: str):
    """Cleanup file after streaming response."""
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Error removing temp file {path}: {e}")

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": "SnapVid",
        "ffmpeg": bool(get_ffmpeg_path())
    }

@app.post("/api/extract", response_model=ExtractResponse)
def extract_media(payload: ExtractRequest):
    """
    Extracts media metadata, carousel photos, and video details.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL must not be empty.")
    try:
        data = MediaExtractor.extract_info(url)
        return data
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

@app.get("/api/download")
async def download_media(
    background_tasks: BackgroundTasks,
    url: str = Query(..., description="Target source media URL"),
    type: str = Query("video", description="'video' or 'image'"),
    mute: bool = Query(False, description="If true, strips audio from video"),
    audio_only: bool = Query(False, description="If true, downloads audio only as MP3"),
    filename: Optional[str] = Query(None, description="Custom download filename")
):
    """
    Streams media content with support for high-res images, full videos, muted videos, and MP3 audio.
    """
    clean_filename = filename or f"snapvid_{int(time.time())}"
    ffmpeg_exe = get_ffmpeg_path()

    # 1. Image Download
    if type == "image":
        try:
            client = httpx.AsyncClient(
                timeout=60.0,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
                }
            )
            req = client.build_request("GET", url)
            resp = await client.send(req, stream=True)

            if resp.status_code >= 400:
                await resp.aclose()
                await client.aclose()
                raise HTTPException(status_code=resp.status_code, detail="Remote server rejected image request.")

            content_type = resp.headers.get("content-type", "image/jpeg")

            async def image_generator():
                try:
                    async for chunk in resp.aiter_bytes():
                        yield chunk
                finally:
                    await resp.aclose()
                    await client.aclose()

            ext = "jpg"
            if "png" in content_type:
                ext = "png"
            elif "webp" in content_type:
                ext = "webp"

            final_name = f"{clean_filename}.{ext}" if not clean_filename.endswith(f".{ext}") else clean_filename

            return StreamingResponse(
                image_generator(),
                media_type=content_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{final_name}"',
                    "Access-Control-Expose-Headers": "Content-Disposition"
                }
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Image download failed: {str(e)}")

    # 2. Video / Audio Download via yt-dlp
    temp_dir = tempfile.gettempdir()
    unique_id = uuid.uuid4().hex[:8]

    if audio_only:
        out_tmpl = os.path.join(temp_dir, f"audio_{unique_id}.%(ext)s")
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": out_tmpl,
            "quiet": True,
            "no_warnings": True,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }] if ffmpeg_exe else [],
        }
    else:
        out_tmpl = os.path.join(temp_dir, f"video_{unique_id}.%(ext)s")
        ydl_opts = {
            "format": "bestvideo+bestaudio/best" if not mute else "bestvideo/best",
            "outtmpl": out_tmpl,
            "merge_output_format": "mp4",
            "quiet": True,
            "no_warnings": True,
        }

    if ffmpeg_exe:
        ydl_opts["ffmpeg_location"] = ffmpeg_exe

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"yt-dlp download failed: {str(e)}")

    # Locate downloaded file
    prefix = f"audio_{unique_id}" if audio_only else f"video_{unique_id}"
    matched_files = [
        os.path.join(temp_dir, f)
        for f in os.listdir(temp_dir)
        if f.startswith(prefix)
    ]
    if not matched_files:
        raise HTTPException(status_code=500, detail="Downloaded media file was not found on disk.")

    downloaded_file = matched_files[0]

    # If mute is requested and ffmpeg is available, strip audio
    if not audio_only and mute and ffmpeg_exe:
        muted_file = os.path.join(temp_dir, f"muted_{unique_id}.mp4")
        cmd = [
            ffmpeg_exe, "-y",
            "-i", downloaded_file,
            "-an",
            "-c:v", "copy",
            muted_file
        ]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode == 0 and os.path.exists(muted_file):
            remove_temp_file(downloaded_file)
            downloaded_file = muted_file

    background_tasks.add_task(remove_temp_file, downloaded_file)

    ext = "mp3" if audio_only else "mp4"
    mime = "audio/mpeg" if audio_only else "video/mp4"
    final_filename = f"{clean_filename}.{ext}" if not clean_filename.endswith(f".{ext}") else clean_filename

    return FileResponse(
        path=downloaded_file,
        media_type=mime,
        filename=final_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{final_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
