@echo off
chcp 65001 >nul
setlocal

cd /d %~dp0

echo =====================================
echo AppleMetaFix Launcher
echo =====================================

echo [1/5] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    pause
    exit /b 1
)
node -v

echo [2/5] Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found.
    pause
    exit /b 1
)
call npm -v

if not exist "node_modules\.bin\electron-vite.cmd" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [3/5] Starting process manager...
node scripts\launcher.js

exit /b 0
