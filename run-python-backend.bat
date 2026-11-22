@echo off
title SnapVid Python Backend
cd /d "%~dp0backend-python"
echo ========================================================
echo   Starting SnapVid Python FastAPI Backend
echo ========================================================

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo Installing dependencies from requirements.txt...
pip install -r requirements.txt

echo Starting FastAPI server at http://0.0.0.0:8000...
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
