const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');

// 导入路由
const authRoutes = require('./routes/auth');
const checkinRoutes = require('./routes/checkin');
const rankingRoutes = require('./routes/ranking');
const profileRoutes = require('./routes/profile');
const messageRoutes = require('./routes/messages');
const reminderRoutes = require('./routes/reminders');
const locationRoutes = require('./routes/location');
const chatRoutes = require('./routes/chat');
const plazaRoutes = require('./routes/plaza');

const app = express();
const PORT = process.env.PORT || 3002;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/plaza', plazaRoutes);

// 根路径返回前端页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
async function startServer() {
    try {
        await connectDB();
        
        const HTTP_PORT = PORT;
        const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
        
        // 启动HTTP服务器
        const httpServer = http.createServer(app);
        httpServer.listen(HTTP_PORT, () => {
            console.log(`HTTP服务器运行在 http://localhost:${HTTP_PORT}`);
        });
        
        // 尝试启动HTTPS服务器
        try {
            console.log('🔧 正在启动HTTPS服务器...');
            
            // 检查SSL证书文件是否存在
            const keyPath = path.join(__dirname, 'ssl', 'key.pem');
            const certPath = path.join(__dirname, 'ssl', 'cert.pem');
            
            if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
                console.log('✅ 找到SSL证书文件');
                
                const httpsOptions = {
                    key: fs.readFileSync(keyPath, 'utf8'),
                    cert: fs.readFileSync(certPath, 'utf8')
                };
                
                const httpsServer = https.createServer(httpsOptions, app);
                
                httpsServer.listen(HTTPS_PORT, () => {
                    console.log(`✅ HTTPS服务器运行在 https://localhost:${HTTPS_PORT}`);
                    console.log('🔒 HTTPS已启用，手机震动功能可正常使用');
                    console.log('⚠️  浏览器会显示安全警告，点击"高级"→"继续访问"即可');
                });
                
                httpsServer.on('error', (error) => {
                    console.error('HTTPS服务器错误:', error.message);
                    if (error.code === 'EADDRINUSE') {
                        console.log(`端口 ${HTTPS_PORT} 已被占用，请尝试其他端口`);
                    }
                });
                
            } else {
                console.log('❌ SSL证书文件不存在，跳过HTTPS启动');
                console.log(`需要的文件: ${keyPath}, ${certPath}`);
            }
            
        } catch (httpsError) {
            console.log('⚠️  HTTPS启动失败，仅使用HTTP服务器');
            console.log('错误:', httpsError.message);
        }
        
    } catch (error) {
        console.error('启动服务器失败:', error);
        process.exit(1);
    }
}

startServer();