#!/bin/bash

echo "🔍 验证部署环境..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    exit 1
fi

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL未安装"
    exit 1
fi

# 检查端口占用
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ 端口3002已被占用"
fi

if lsof -Pi :3443 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ 端口3443已被占用"
fi

echo "✅ 环境检查完成"
