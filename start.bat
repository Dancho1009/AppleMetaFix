@echo off
chcp 65001 > nul

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

if not exist node_modules (
    echo 未检测到依赖，正在安装...
    call npm install
    if errorlevel 1 (
        echo [错误] npm install 失败。
        pause
        exit /b 1
    )
)

echo 启动开发环境...
call npm run dev

pause
