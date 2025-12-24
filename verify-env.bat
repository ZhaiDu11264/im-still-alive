@echo off
chcp 65001 >nul

echo 🔍 验证部署环境...

REM 检查Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装
    exit /b 1
)

REM 检查MySQL
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL未安装
    exit /b 1
)

REM 检查端口占用
netstat -an | findstr :3002 >nul
if not errorlevel 1 (
    echo ⚠️ 端口3002已被占用
)

netstat -an | findstr :3443 >nul
if not errorlevel 1 (
    echo ⚠️ 端口3443已被占用
)

echo ✅ 环境检查完成
pause
