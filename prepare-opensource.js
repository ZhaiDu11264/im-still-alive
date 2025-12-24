const fs = require('fs');
const path = require('path');

console.log('🧹 准备开源版本...');

// 需要删除的开发文件
const filesToRemove = [
    // 临时证书生成文件
    'create-dev-cert.js',
    'create-https-cert.js', 
    'create-simple-cert.js',
    'create-valid-cert.js',
    'create-working-cert.js',
    'generate-simple-cert.js',
    'generate-ssl-cert.js',
    'generate-valid-https-cert.js',
    
    // 迁移脚本（保留主要的）
    'migrate-avatar.js',
    'migrate-post-moderation.js',
    'migrate-region.js', 
    'migrate-reminder-time.js',
    'migrate-theme.js',
    'migrate-tutorial.js',
    'chat-integration-patch.js',
    
    // 临时文件
    'clear-chat-tables.js',
    
    // 开发文档
    'PLAZA_FEATURE.md',
    'UNREAD_MESSAGES_UPDATE.md'
];

// 需要清理的目录
const dirsToClean = [
    'ssl',
    'public/uploads'
];

// 删除文件
filesToRemove.forEach(file => {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`✅ 删除文件: ${file}`);
    }
});

// 清理目录但保留.gitkeep
dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            if (file !== '.gitkeep') {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                    console.log(`✅ 删除文件: ${filePath}`);
                }
            }
        });
        
        // 确保有.gitkeep文件
        const gitkeepPath = path.join(dir, '.gitkeep');
        if (!fs.existsSync(gitkeepPath)) {
            fs.writeFileSync(gitkeepPath, '');
            console.log(`✅ 创建: ${gitkeepPath}`);
        }
    }
});

// 创建uploads目录的.gitkeep
const uploadsDir = 'public/uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const gitkeepPath = path.join(uploadsDir, '.gitkeep');
if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
    console.log(`✅ 创建: ${gitkeepPath}`);
}

// 更新package.json
const packagePath = 'package.json';
if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // 更新项目信息
    packageJson.name = 'im-still-alive';
    packageJson.version = '1.0.0';
    packageJson.description = '一个简洁优雅的心情打卡应用';
    packageJson.keywords = ['mood', 'checkin', 'chat', 'social', 'pwa'];
    packageJson.author = 'Your Name <your.email@example.com>';
    packageJson.license = 'MIT';
    packageJson.repository = {
        type: 'git',
        url: 'https://github.com/your-username/im-still-alive.git'
    };
    packageJson.bugs = {
        url: 'https://github.com/your-username/im-still-alive/issues'
    };
    packageJson.homepage = 'https://github.com/your-username/im-still-alive#readme';
    
    // 添加脚本
    packageJson.scripts = {
        ...packageJson.scripts,
        'deploy': 'node prepare-opensource.js',
        'setup': process.platform === 'win32' ? 'deploy.bat' : './deploy.sh'
    };
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ 更新 package.json');
}

// 重命名README
if (fs.existsSync('README_OPENSOURCE.md')) {
    if (fs.existsSync('README.md')) {
        fs.unlinkSync('README.md');
    }
    fs.renameSync('README_OPENSOURCE.md', 'README.md');
    console.log('✅ 更新 README.md');
}

console.log('');
console.log('🎉 开源版本准备完成！');
console.log('');
console.log('📋 接下来的步骤:');
console.log('1. 检查并更新 .env.example 文件');
console.log('2. 更新 package.json 中的仓库信息');
console.log('3. 检查 README.md 中的链接和联系方式');
console.log('4. 提交到Git仓库');
console.log('');
console.log('🚀 部署命令:');
console.log('  npm run setup  # 自动部署');
console.log('  npm start      # 启动服务');