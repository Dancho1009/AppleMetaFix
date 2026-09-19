@echo off
chcp 65001 > nul

echo =====================================
echo AppleMetaFix 启动器
echo =====================================

cd /d %~dp0

if not exist node_modules (
    echo 未检测到依赖，正在安装...
    npm install
)

echo 启动开发环境...
npm run dev

pause
