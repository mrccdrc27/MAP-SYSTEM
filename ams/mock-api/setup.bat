@echo off
REM Colors and formatting for Windows batch
REM Using ANSI escape codes (requires Windows 10+)

setlocal enabledelayedexpansion

echo.
echo ============================================
echo  AMS Mock API Server Setup ^& Runner
echo ============================================
echo.

REM Get the directory where this script is located
set MOCK_API_DIR=%~dp0
cd /d "%MOCK_API_DIR%"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [*] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [!] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
    echo.
)

REM Check Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%
echo.

echo Available commands:
echo   npm start   - Run in production mode
echo   npm run dev - Run in development mode (with auto-reload)
echo.

set /p start_server="Start server? (y/n) "
if /i "%start_server%"=="y" (
    echo [*] Starting server...
    echo.
    call npm start
) else (
    echo [!] Setup complete! Run 'npm start' to begin.
    pause
)
