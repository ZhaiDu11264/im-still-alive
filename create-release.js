const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎉 创建 I\'m Still Alive 开源发布版本');
console.log('');

// 检查Git状态
try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
        console.log('⚠️ 检测到未提交的更改:');
        console.log(gitStatus);
        console.log('请先提交所有更改后再创建发布版本');
        process.exit(1);
    }
} catch (error) {
    console.log('⚠️ 未检测到Git仓库，跳过Git检查');
}

// 读取package.json
const packagePath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

console.log(`📦 项目: ${packageJson.name}`);
console.log(`📋 版本: ${packageJson.version}`);
console.log(`📝 描述: ${packageJson.description}`);
console.log('');

// 创建发布信息
const releaseInfo = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    releaseDate: new Date().toISOString().split('T')[0],
    features: [
        '心情打卡系统',
        '实时聊天功能', 
        '广场分享',
        '成就系统',
        'PWA支持',
        'HTTPS支持',
        '响应式设计'
    ],
    requirements: {
        nodejs: '16+',
        mysql: '8.0+',
        python: '3.8+ (可选，用于SSL证书生成)'
    }
};

// 创建发布说明
const releaseNotes = `# ${releaseInfo.name} v${releaseInfo.version}

发布日期: ${releaseInfo.releaseDate}

## 🎯 项目简介

${releaseInfo.description}

## ✨ 主要功能

${releaseInfo.features.map(feature => `- ${feature}`).join('\n')}

## 📋 系统要求

- Node.js ${releaseInfo.requirements.nodejs}
- MySQL ${releaseInfo.requirements.mysql}
- Python ${releaseInfo.requirements.python}

## 🚀 快速开始

1. 克隆项目
\`\`\`bash
git clone https://github.com/your-username/im-still-alive.git
cd im-still-alive
\`\`\`

2. 自动部署
\`\`\`bash
npm run setup
\`\`\`

3. 启动服务
\`\`\`bash
npm start
\`\`\`

## 📱 访问地址

- HTTP: http://localhost:3002
- HTTPS: https://localhost:3443

## 📚 文档

- [安装指南](README.md#快速开始)
- [贡献指南](CONTRIBUTING.md)
- [发布检查清单](RELEASE_CHECKLIST.md)

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

本项目采用 MIT 许可证。

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！
`;

// 写入发布说明
fs.writeFileSync('RELEASE_NOTES.md', releaseNotes);
console.log('✅ 创建发布说明: RELEASE_NOTES.md');

// 创建部署验证脚本
const verifyScript = `#!/bin/bash

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
`;

fs.writeFileSync('verify-env.sh', verifyScript);
console.log('✅ 创建环境验证脚本: verify-env.sh');

// 创建Windows版本的验证脚本
const verifyScriptWin = `@echo off
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
`;

fs.writeFileSync('verify-env.bat', verifyScriptWin);
console.log('✅ 创建Windows环境验证脚本: verify-env.bat');

// 更新package.json脚本
packageJson.scripts = {
    ...packageJson.scripts,
    'verify': process.platform === 'win32' ? 'verify-env.bat' : './verify-env.sh',
    'release': 'node create-release.js'
};

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
console.log('✅ 更新package.json脚本');

console.log('');
console.log('🎉 开源发布版本创建完成！');
console.log('');
console.log('📋 发布文件:');
console.log('  - README.md (项目说明)');
console.log('  - LICENSE (MIT许可证)');
console.log('  - CONTRIBUTING.md (贡献指南)');
console.log('  - RELEASE_NOTES.md (发布说明)');
console.log('  - RELEASE_CHECKLIST.md (发布检查清单)');
console.log('');
console.log('🚀 部署脚本:');
console.log('  - deploy.sh / deploy.bat (自动部署)');
console.log('  - verify-env.sh / verify-env.bat (环境验证)');
console.log('  - generate_cert.py (SSL证书生成)');
console.log('');
console.log('📝 下一步:');
console.log('1. 检查 RELEASE_CHECKLIST.md 中的所有项目');
console.log('2. 更新 README.md 中的仓库链接');
console.log('3. 测试完整的部署流程');
console.log('4. 创建Git标签并推送到仓库');
console.log('');
console.log('🌟 发布到GitHub:');
console.log('  git tag v' + packageJson.version);
console.log('  git push origin v' + packageJson.version);
console.log('  # 然后在GitHub上创建Release');