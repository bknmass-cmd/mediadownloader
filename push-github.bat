@echo off
title SnapVid - Git Push & Cloud APK Auto-Build
echo ========================================================
echo   Pushing code to GitHub:
echo   (This automatically triggers GitHub Actions to build SnapVid.apk)
echo ========================================================
echo.

if exist "C:\Program Files\Git\cmd" set "PATH=C:\Program Files\Git\cmd;%PATH%"
cd /d "%~dp0"

echo [1/3] Staging all files...
git add -A

echo.
echo [2/3] Committing changes...
git commit -m "feat: complete SnapVid project with Python, Node Express, Angular and MediaStore APK" 2>nul || echo No changes to commit.

echo.
echo [3/3] Pushing to main branch...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   SUCCESS! Pushed to GitHub!
    echo   Your APK build is now running in GitHub Actions:
    echo   Go to GitHub -> Actions tab -> SnapVid-APK -> Download!
    echo ========================================================
) else (
    echo.
    echo [NOTICE] If origin is not set yet, connect your repo:
    echo   git remote add origin https://github.com/<your-username>/SnapVid.git
    echo   git push -u origin main
)

echo.
pause
