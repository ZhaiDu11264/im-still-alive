const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, password, birthday, region } = req.body;
        
        if (!username || !password || !region) {
            return res.status(400).json({ error: '用户名、密码和地区为必填项' });
        }

        const connection = getConnection();
        
        // 检查用户名是否已存在
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 获取随机头像
        const { getRandomAvatar } = require('../config/avatars');
        const avatar = getRandomAvatar();
        
        // 插入新用户
        const [result] = await connection.execute(
            'INSERT INTO users (username, password, birthday, region, avatar) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, birthday || null, region, avatar]
        );

        res.status(201).json({ 
            message: '注册成功',
            userId: result.insertId 
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 根据用户名获取头像（用于登录预览）
router.get('/avatar/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username) {
            return res.status(400).json({ error: '用户名不能为空' });
        }

        const connection = getConnection();
        
        // 查找用户头像
        const [users] = await connection.execute(
            'SELECT avatar FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            // 用户不存在，返回默认头像
            const { getDefaultAvatar } = require('../config/avatars');
            return res.json({ avatar: getDefaultAvatar() });
        }

        res.json({ avatar: users[0].avatar || '👤' });
    } catch (error) {
        console.error('获取头像错误:', error);
        const { getDefaultAvatar } = require('../config/avatars');
        res.json({ avatar: getDefaultAvatar() });
    }
});

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码为必填项' });
        }

        const connection = getConnection();
        
        // 查找用户
        const [users] = await connection.execute(
            'SELECT id, username, password FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        const user = users[0];
        
        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 生成JWT令牌
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;