@echo off
title SnapVid Node.js Express Gateway
cd /d "%~dp0backend-node"
echo ========================================================
echo   Starting SnapVid Node.js Express Gateway (Port 5000)
echo ========================================================

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing Express dependencies...
    call npm.cmd install
)

echo Starting Node.js server...
node src/server.js
pause
