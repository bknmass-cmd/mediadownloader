@echo off
title SnapVid - Full Stack Launcher
echo ========================================================
echo   Launching SnapVid (Python Extractor + Node Gateway + Angular)
echo ========================================================

start "SnapVid Python Backend" cmd /c "run-python-backend.bat"
start "SnapVid Node Express Gateway" cmd /c "run-node-backend.bat"
start "SnapVid Angular Mobile Frontend" cmd /c "run-frontend.bat"

echo.
echo Services launched in separate terminal windows:
echo - Python Extractor API:  http://localhost:8000 (Docs at http://localhost:8000/docs)
echo - Node.js Express API:   http://localhost:5000 (Health at http://localhost:5000/health)
echo - Angular Mobile App:    http://localhost:4200
echo.
pause
