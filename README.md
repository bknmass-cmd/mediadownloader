# SnapVid 🚀
> Complete social media video and image downloader solution matching the **SnapVid** mobile interface.
> Supports **Instagram**, **YouTube & Shorts**, **TikTok**, **Threads**, and **X (Twitter)**.
> Built with **Python (FastAPI + yt-dlp)** + **Node.js (Express Gateway)** + **Angular + Capacitor** with **Android Native MediaStore** gallery integration.

---

## 📱 Features

1. **SnapVid Mobile UI (Light Mode & Dark Mode)**:
   - Header with vibrant cyan gradient (`#00bcd4` to `#0096c7`), "👑 PRO" badge, and **Settings** gear.
   - Quick **PASTE** button reads link directly from clipboard via `@capacitor/clipboard`.
   - **DOWNLOAD** button triggers fast multi-platform extraction.
   - Toggle seamlessly between **Light Mode** and **Dark Mode** via header toggle or Settings modal.
   - **How to Download** expandable guide accordion.
   - **Downloads Tab** with filter pills: `Downloading`, `Video`, `Image`, `Audio`, and the clean empty state when no downloads exist.

2. **Smart Carousel & Single Image Handling**:
   - For single images: Instant high-res preview and direct save.
   - For multi-image carousel posts: Responsive 2-column image preview grid with checkboxes.
   - Select individual photos, **"Select All"**, or **"Deselect All"**.
   - Download selected photos in a single tap!

3. **Dual Video Download**:
   - 🎵 **Download Video (With Music)**: Multiplexes best video and audio stream into a single MP4.
   - 🔇 **Download Video (Without Music / Muted)**: Fast FFmpeg stream copy stripping audio track.
   - 🎧 **Download Audio Only (MP3)**: Extracts audio track as high-quality MP3.

4. **Android Native MediaStore Integration**:
   - Saves files directly into phone storage:
     - Images: `Pictures/SnapVid/Images`
     - Videos & Audio: `Movies/SnapVid/Videos`
   - Uses native `MediaStorePlugin.java` so saved media immediately shows up inside the phone's native **Gallery / Google Photos app** (Android 10 through 15+).

---

## 📂 Project Architecture

```
SocialMediaDownloaderOwnAPK/
├── .github/
│   └── workflows/
│       └── build-apk.yml           # Automated cloud APK builder (GitHub Actions)
│
├── backend-python/                 # Python FastAPI + yt-dlp extractor
│   ├── app/
│   │   ├── main.py                 # /api/extract, /api/download, /health
│   │   ├── models/schemas.py       # Pydantic validation schemas
│   │   └── services/extractor.py   # yt-dlp metadata & FFmpeg processing
│   ├── requirements.txt            # Python dependencies
│   └── run.bat
│
├── backend-node/                   # Node.js Express API Gateway (Port 5000)
│   ├── src/server.js               # Express proxy & streaming endpoints
│   └── package.json
│
├── frontend/                       # Angular mobile app with Light & Dark mode
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.html  # SnapVid mobile UI layout
│   │   │   ├── app.component.ts    # Signals state, clipboard, & downloads
│   │   │   ├── models/             # MediaItem, ExtractResponse, SavedMedia
│   │   │   └── services/           # ApiService, StorageService, MediaStoreService
│   │   ├── styles.css              # Tailwind CSS styles
│   │   └── index.html
│   ├── android/                    # Capacitor Android platform
│   │   └── app/src/main/
│   │       ├── java/com/snapvid/downloader/
│   │       │   ├── MainActivity.java
│   │       │   └── MediaStorePlugin.java # Native MediaStore registration
│   │       └── AndroidManifest.xml # Storage & cleartext permissions
│   └── capacitor.config.ts         # App ID: com.snapvid.downloader
│
├── build-apk.bat                   # 1-Click local APK builder
├── run-all.bat                     # 1-Click launch for Python + Node + Angular
├── run-python-backend.bat          # Launch Python FastAPI server
├── run-node-backend.bat            # Launch Node Express server
├── run-frontend.bat                # Launch Angular dev server
└── push-github.bat                 # Push to GitHub to trigger cloud APK build
```

---

## 🚀 Quick Start

### 1. Launch All Services (Local Development)
Double-click [`run-all.bat`](file:///d:/Project/SocialMediaDownloaderOwnAPK/run-all.bat):
- Python Backend: `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`)
- Node.js Express Gateway: `http://localhost:5000`
- Angular Mobile App: `http://localhost:4200`

---

## 📦 How to Build the Android APK

### Method 1: Free Automated Build in GitHub Actions (Recommended)
1. Run [`push-github.bat`](file:///d:/Project/SocialMediaDownloaderOwnAPK/push-github.bat) to push your project to your GitHub repository.
2. Go to your repository on GitHub and open the **Actions** tab.
3. GitHub Actions builds the Android APK in Ubuntu with JDK 21 and Android SDK automatically.
4. Download `SnapVid-debug.apk` directly from GitHub Releases or Workflow Artifacts!

### Method 2: Local Gradle Build
1. Make sure JDK 17 or 21 and Android SDK are installed.
2. Double-click [`build-apk.bat`](file:///d:/Project/SocialMediaDownloaderOwnAPK/build-apk.bat).
3. The compiled APK will be generated as `SnapVid-debug.apk`.
