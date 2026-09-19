@echo off
chcp 65001 >nul

cd /d %~dp0

echo =====================================
echo AppleMetaFix 启动器
echo =====================================

where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js LTS。
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 npm。
    pause
    exit /b 1
)

if not exist "node_modules\.bin\electron-vite.cmd" (
    echo 未检测到 Electron 开发依赖，正在安装...
    call npm install
    if errorlevel 1 (
        echo [错误] npm install 失败。
        pause
        exit /b 1
    )
)

REM 检查 Electron 二进制是否正常
npx electron --version >nul 2>&1
if errorlevel 1 (
    echo Electron 二进制异常，正在重新安装...
    call npm rebuild electron
    if errorlevel 1 (
        echo [错误] Electron 修复失败。
        pause
        exit /b 1
    )
)

echo 检查依赖完成。
echo 启动开发环境...
call npm run dev

if errorlevel 1 (
    echo.
    echo [错误] AppleMetaFix 启动失败。
)

pause
