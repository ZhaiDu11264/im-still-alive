const express = require('express');
const { getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { getTodayString } = require('../utils/helpers');

const router = express.Router();

// 获取需要提醒的用户列表
router.get('/pending', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const today = getTodayString();
        const currentTime = new Date().toTimeString().substring(0, 5); // HH:MM 格式
        
        // 获取需要提醒且今天还没打卡的用户
        const [users] = await connection.execute(`
            SELECT u.id, u.username, u.reminder_time, u.notification_enabled, u.do_not_disturb
            FROM users u
            LEFT JOIN check_ins c ON u.id = c.user_id AND c.check_date = ?
            WHERE u.notification_enabled = TRUE 
            AND u.do_not_disturb = FALSE
            AND c.id IS NULL
            AND TIME(u.reminder_time) <= TIME(?)
        `, [today, currentTime]);
        
        res.json(users);
    } catch (error) {
        console.error('获取提醒用户列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 发送提醒消息
router.post('/send', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const { userIds } = req.body;
        
        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ error: '用户ID列表不能为空' });
        }
        
        // 为每个用户发送提醒消息
        for (const userId of userIds) {
            await connection.execute(
                'INSERT INTO messages (sender_id, receiver_id, message_type, content) VALUES (?, ?, ?, ?)',
                [1, userId, 'reminder', '⏰ 别忘了今天的打卡哦！坚持就是胜利！']
            );
        }
        
        res.json({ 
            message: `成功发送 ${userIds.length} 条提醒消息`,
            count: userIds.length 
        });
    } catch (error) {
        console.error('发送提醒消息错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 手动触发提醒检查（用于测试）
router.post('/check', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const today = getTodayString();
        const currentTime = new Date().toTimeString().substring(0, 5);
        
        // 获取需要提醒的用户
        const [users] = await connection.execute(`
            SELECT u.id, u.username, u.reminder_time
            FROM users u
            LEFT JOIN check_ins c ON u.id = c.user_id AND c.check_date = ?
            WHERE u.notification_enabled = TRUE 
            AND u.do_not_disturb = FALSE
            AND c.id IS NULL
        `, [today]);
        
        let remindersSent = 0;
        
        // 检查每个用户的提醒时间
        for (const user of users) {
            const reminderTime = user.reminder_time.substring(0, 5);
            
            // 如果当前时间已过提醒时间，发送提醒
            if (currentTime >= reminderTime) {
                await connection.execute(
                    'INSERT INTO messages (sender_id, receiver_id, message_type, content) VALUES (?, ?, ?, ?)',
                    [1, user.id, 'reminder', '⏰ 别忘了今天的打卡哦！坚持就是胜利！']
                );
                remindersSent++;
            }
        }
        
        res.json({
            message: '提醒检查完成',
            totalUsers: users.length,
            remindersSent,
            currentTime,
            checkDate: today
        });
    } catch (error) {
        console.error('提醒检查错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;