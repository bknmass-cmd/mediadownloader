@echo off
title SnapVid - Build Android APK
echo ========================================================
echo   SnapVid - Building Android APK
echo   Stack: Angular + Capacitor 7/8 + Android MediaStore
echo ========================================================

cd /d "%~dp0frontend"

echo.
echo [1/3] Building Angular production bundle...
call npm.cmd run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Angular build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Synchronizing Capacitor Android project...
call npx.cmd cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Compiling Native Android APK with Gradle...
if exist "android\gradlew.bat" (
    cd android
    call gradlew.bat assembleDebug
    if %ERRORLEVEL% EQU 0 (
        cd ..
        if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
            copy "android\app\build\outputs\apk\debug\app-debug.apk" "..\SnapVid-debug.apk" >nul
            echo.
            echo ========================================================
            echo   SUCCESS! APK built successfully:
            echo   - File: SnapVid-debug.apk (in project root)
            echo ========================================================
        )
    ) else (
        echo.
        echo [INFO] Local Gradle build requires JDK 17/21 and Android SDK.
        echo If you do not have Java/Android SDK locally:
        echo   1. Push your code to GitHub with push-github.bat
        echo   2. GitHub Actions will automatically compile SnapVid.apk for free!
        cd ..
    )
) else (
    echo [NOTICE] Run through GitHub Actions for automatic cloud APK compilation.
)

cd /d "%~dp0"
echo.
pause
