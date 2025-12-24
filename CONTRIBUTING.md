# 贡献指南

感谢你对 I'm Still Alive 项目的关注！我们欢迎各种形式的贡献。

## 🚀 如何贡献

### 报告Bug
1. 检查是否已有相同的Issue
2. 使用Bug报告模板创建新Issue
3. 提供详细的复现步骤和环境信息

### 功能建议
1. 检查是否已有相同的功能请求
2. 详细描述功能需求和使用场景
3. 如果可能，提供设计草图或原型

### 代码贡献
1. Fork项目到你的GitHub账户
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 进行开发并测试
4. 提交代码: `git commit -m 'Add amazing feature'`
5. 推送到分支: `git push origin feature/amazing-feature`
6. 创建Pull Request

## 📝 开发规范

### 代码风格
- 使用2空格缩进
- 函数名使用驼峰命名法
- 变量名要有意义
- 添加必要的注释

### 提交信息
使用清晰的提交信息格式：
```
类型(范围): 简短描述

详细描述（可选）

相关Issue: #123
```

类型包括：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建或辅助工具变动

### 测试
- 确保新功能有适当的测试
- 运行现有测试确保没有破坏性变更
- 手动测试核心功能

## 🔍 开发环境设置

1. **克隆项目**
```bash
git clone https://github.com/ZhaiDu11264/im-still-alive.git
cd im-still-alive
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境**
```bash
cp .env.example .env
# 编辑.env文件配置数据库等信息
```

4. **初始化数据库**
```bash
node init-db.js
node create-chat-tables.js
node create-plaza-tables.js
```

5. **启动开发服务器**
```bash
npm start
```

## 🎯 项目结构

```
├── config/          # 配置文件
├── routes/          # API路由
├── public/          # 前端文件
├── middleware/      # 中间件
├── utils/          # 工具函数
├── database/       # 数据库脚本
└── ssl/           # SSL证书
```

## 📋 开发任务

### 当前需要帮助的领域
- [ ] 单元测试编写
- [ ] 国际化支持
- [ ] 性能优化
- [ ] 移动端体验改进
- [ ] 文档完善

### 功能路线图
- [ ] 数据导出功能
- [ ] 第三方登录集成
- [ ] 推送通知
- [ ] 数据分析面板
- [ ] 插件系统

## 🤝 社区准则

### 行为准则
- 保持友善和尊重
- 欢迎新手参与
- 建设性的讨论
- 避免争议性话题

### 沟通渠道
- GitHub Issues: 功能讨论和Bug报告
- Pull Requests: 代码审查和讨论
- Discussions: 一般性讨论和问答

## 🏆 贡献者

感谢所有为项目做出贡献的开发者！

## 📞 联系我们

如果你有任何问题或建议，可以通过以下方式联系：
- 创建GitHub Issue

再次感谢你的贡献！🎉
