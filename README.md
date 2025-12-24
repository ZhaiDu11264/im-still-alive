# I'm Still Alive - 开源版本

一个简洁优雅的心情打卡应用，支持多用户、实时聊天、广场分享等功能。

## ✨ 功能特色

### 🎯 核心功能
- **心情打卡**: 每日记录心情状态，支持多种心情选择
- **成就系统**: 连续打卡解锁成就，激励持续使用
- **数据统计**: 可视化展示打卡历史和趋势
- **提醒功能**: 自定义打卡提醒时间

### 💬 社交功能
- **实时聊天**: WebSocket实时消息，支持表情包
- **广场分享**: 发布动态，查看他人分享
- **用户互动**: 点赞、回复、关注等社交功能

### 🎨 用户体验
- **响应式设计**: 完美适配手机、平板、桌面
- **深色模式**: 支持明暗主题切换
- **动画效果**: 流畅的交互动画和反馈
- **PWA支持**: 可安装为原生应用

### 🔒 安全特性
- **JWT认证**: 安全的用户身份验证
- **HTTPS支持**: 数据传输加密
- **输入验证**: 防止XSS和SQL注入
- **权限控制**: 细粒度的功能权限管理

## 🚀 快速开始

### 环境要求
- Node.js 16+
- MySQL 8.0+
- Python 3.8+ (用于生成SSL证书)

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/im-still-alive.git
cd im-still-alive
```

2. **安装依赖**
```bash
npm install
```

3. **配置数据库**
```bash
# 复制环境配置文件
cp .env.example .env

# 编辑 .env 文件，配置数据库连接
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=im_alive_db
```

4. **初始化数据库**
```bash
# 创建数据库表
node init-db.js

# 创建聊天相关表
node create-chat-tables.js

# 创建广场功能表
node create-plaza-tables.js
```

5. **生成SSL证书** (可选，用于HTTPS)
```bash
# 安装Python依赖
pip install cryptography

# 生成自签名证书
python generate_cert.py
```

6. **启动服务**
```bash
# 开发环境
npm start

# 或使用脚本
./start.sh  # Linux/Mac
start.bat   # Windows
```

7. **访问应用**
- HTTP: http://localhost:3002
- HTTPS: https://localhost:3443

## 📱 移动端使用

### 震动功能
移动设备需要赋予浏览器震动权限

### PWA安装
1. 用手机浏览器访问应用
2. 点击浏览器菜单中的"添加到主屏幕"
3. 即可像原生应用一样使用

## 🛠️ 技术栈

### 后端
- **Node.js + Express**: 服务器框架
- **MySQL**: 数据库
- **JWT**: 身份认证
- **WebSocket**: 实时通信
- **Multer**: 文件上传

### 前端
- **原生JavaScript**: 无框架依赖
- **CSS3**: 现代样式和动画
- **WebSocket**: 实时消息
- **PWA**: 渐进式Web应用

### 开发工具
- **Python**: SSL证书生成
- **Git**: 版本控制
- **npm**: 包管理

## 📂 项目结构

```
im-still-alive/
├── config/              # 配置文件
│   ├── database.js      # 数据库配置
│   └── avatars.js       # 头像配置
├── routes/              # 路由文件
│   ├── auth.js          # 用户认证
│   ├── checkin.js       # 打卡功能
│   ├── chat.js          # 聊天功能
│   ├── plaza.js         # 广场功能
│   └── ...
├── public/              # 前端文件
│   ├── index.html       # 主页面
│   ├── script.js        # 主要逻辑
│   ├── style.css        # 主要样式
│   ├── chat-functions.js # 聊天功能
│   └── ...
├── middleware/          # 中间件
├── utils/              # 工具函数
├── database/           # 数据库脚本
├── ssl/               # SSL证书
├── server.js          # 服务器入口
├── package.json       # 项目配置
└── README.md         # 说明文档
```

## 🔧 配置说明

### 环境变量 (.env)
```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=im_alive_db
DB_PORT=3306

# 服务器配置
PORT=3002
HTTPS_PORT=3443

# JWT密钥
JWT_SECRET=your_jwt_secret_key

# 文件上传
UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=5242880
```

### 数据库配置
确保MySQL服务运行，并创建对应的数据库：
```sql
CREATE DATABASE im_alive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 🎨 自定义配置

### 主题颜色
编辑 `public/style.css` 中的CSS变量：
```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
}
```

### 头像选项
编辑 `config/avatars.js` 添加更多头像选项。

### 心情选项
在 `public/script.js` 中的 `moodOptions` 数组添加新的心情选项。

## 🚀 部署指南

### 生产环境部署

1. **服务器准备**
```bash
# 安装Node.js和MySQL
# 克隆代码到服务器
# 配置防火墙开放端口3002和3443
```

2. **环境配置**
```bash
# 设置生产环境变量
export NODE_ENV=production

# 配置数据库连接
# 生成强密码的JWT_SECRET
```

3. **进程管理**
```bash
# 使用PM2管理进程
npm install -g pm2
pm2 start server.js --name "im-alive"
pm2 startup
pm2 save
```

4. **反向代理** (可选)
使用Nginx作为反向代理：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发流程
1. Fork项目
2. 创建功能分支: `git checkout -b feature/new-feature`
3. 提交更改: `git commit -am 'Add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 提交Pull Request

### 代码规范
- 使用2空格缩进
- 函数和变量使用驼峰命名
- 添加适当的注释
- 保持代码简洁易读

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有贡献者和使用者的支持！

## 📞 联系方式

- 项目主页: https://github.com/ZhaiDu11264/im-still-alive
- 问题反馈: https://github.com/ZhaiDu11264/im-still-alive/issues

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！
