@echo off
title SnapVid Frontend (Angular)
cd /d "%~dp0frontend"
echo ========================================================
echo   Starting SnapVid Angular Mobile App Dev Server
echo ========================================================

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing Angular dependencies...
    call npm.cmd install --legacy-peer-deps
)

echo Starting Angular server at http://localhost:4200...
call npm.cmd run start
pause
