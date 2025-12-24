@echo off
chcp 65001 >nul

echo 🚀 开始部署 I'm Still Alive...

REM 检查Node.js版本
echo 📋 检查环境...
node -v
if errorlevel 1 (
    echo ❌ Node.js未安装，请先安装Node.js
    pause
    exit /b 1
)

REM 检查MySQL
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ MySQL未安装或未添加到PATH，请先安装MySQL
    pause
    exit /b 1
)

REM 安装依赖
echo 📦 安装依赖...
npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

REM 检查环境配置
if not exist .env (
    echo ⚙️ 创建环境配置文件...
    copy .env.example .env
    echo 请编辑 .env 文件配置数据库连接信息
    echo 配置完成后重新运行此脚本
    pause
    exit /b 0
)

REM 生成SSL证书
echo 🔒 生成SSL证书...
python --version >nul 2>&1
if not errorlevel 1 (
    python -c "import cryptography" >nul 2>&1
    if not errorlevel 1 (
        python generate_cert.py
    ) else (
        echo ⚠️ 缺少cryptography库，请运行: pip install cryptography
        echo 跳过SSL证书生成，将仅支持HTTP访问
    )
) else (
    echo ⚠️ Python未安装，跳过SSL证书生成
)

REM 初始化数据库
echo 🗄️ 初始化数据库...
node init-db.js
if errorlevel 1 (
    echo ❌ 数据库初始化失败，请检查数据库配置
    pause
    exit /b 1
)

echo 📊 创建聊天表...
node create-chat-tables.js

echo 🏛️ 创建广场表...
node create-plaza-tables.js

REM 创建上传目录
echo 📁 创建上传目录...
if not exist public\uploads mkdir public\uploads
echo. > public\uploads\.gitkeep

echo ✅ 部署完成！
echo.
echo 🌐 启动服务:
echo   开发环境: npm start
echo   生产环境: start.bat
echo.
echo 📱 访问地址:
echo   HTTP:  http://localhost:3002
echo   HTTPS: https://localhost:3443
echo.
echo 📚 更多信息请查看 README.md
pause