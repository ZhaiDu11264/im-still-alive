#!/bin/bash

# I'm Still Alive 部署脚本

echo "🚀 开始部署 I'm Still Alive..."

# 检查Node.js版本
echo "📋 检查环境..."
node_version=$(node -v)
echo "Node.js版本: $node_version"

if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL未安装，请先安装MySQL"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 检查环境配置
if [ ! -f .env ]; then
    echo "⚙️ 创建环境配置文件..."
    cp .env.example .env
    echo "请编辑 .env 文件配置数据库连接信息"
    echo "配置完成后重新运行此脚本"
    exit 0
fi

# 生成SSL证书
echo "🔒 生成SSL证书..."
if command -v python3 &> /dev/null; then
    python3 -c "import cryptography" 2>/dev/null
    if [ $? -eq 0 ]; then
        python3 generate_cert.py
    else
        echo "⚠️ 缺少cryptography库，请运行: pip install cryptography"
        echo "跳过SSL证书生成，将仅支持HTTP访问"
    fi
else
    echo "⚠️ Python3未安装，跳过SSL证书生成"
fi

# 初始化数据库
echo "🗄️ 初始化数据库..."
node init-db.js
if [ $? -ne 0 ]; then
    echo "❌ 数据库初始化失败，请检查数据库配置"
    exit 1
fi

echo "📊 创建聊天表..."
node create-chat-tables.js

echo "🏛️ 创建广场表..."
node create-plaza-tables.js

# 创建上传目录
echo "📁 创建上传目录..."
mkdir -p public/uploads
touch public/uploads/.gitkeep

# 设置权限
echo "🔐 设置文件权限..."
chmod +x start.sh
chmod +x deploy.sh

echo "✅ 部署完成！"
echo ""
echo "🌐 启动服务:"
echo "  开发环境: npm start"
echo "  生产环境: ./start.sh"
echo ""
echo "📱 访问地址:"
echo "  HTTP:  http://localhost:3002"
echo "  HTTPS: https://localhost:3443"
echo ""
echo "📚 更多信息请查看 README.md"