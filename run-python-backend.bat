@echo off
title SnapVid Python Backend
cd /d "%~dp0backend-python"
echo ========================================================
echo   Starting SnapVid Python FastAPI Backend
echo ========================================================

set "PY_EXE=python"
if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    set "PY_EXE=%LOCALAPPDATA%\Python\bin\python.exe"
)

echo Using Python: %PY_EXE%
echo Starting FastAPI server at http://0.0.0.0:8000...
echo Swagger UI Docs: http://localhost:8000/docs
echo.
"%PY_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
