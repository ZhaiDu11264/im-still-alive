const express = require('express');
const { getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取用户资料和成就
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        // 获取用户基本信息
        const [users] = await connection.execute(
            'SELECT username, birthday, region, avatar, tutorial_completed, notification_enabled, do_not_disturb, reminder_time, theme FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        // 获取用户成就
        const [achievements] = await connection.execute(`
            SELECT a.name, a.description, a.icon, ua.unlocked_at
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = ?
            ORDER BY ua.unlocked_at DESC
        `, [userId]);
        
        res.json({
            user: users[0],
            achievements
        });
    } catch (error) {
        console.error('获取用户资料错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取存活日历
router.get('/calendar', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { year, month } = req.query;
        
        let query = 'SELECT DATE_FORMAT(check_date, "%Y-%m-%d") as check_date, mood, check_time FROM check_ins WHERE user_id = ?';
        let params = [userId];
        
        if (year && month) {
            query += ' AND YEAR(check_date) = ? AND MONTH(check_date) = ?';
            params.push(year, month);
        }
        
        query += ' ORDER BY check_date DESC';
        
        const [checkins] = await connection.execute(query, params);
        
        res.json(checkins);
    } catch (error) {
        console.error('获取存活日历错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取打卡统计数据
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        let surviveDays = 0;
        let totalCheckins = 0;
        let monthCheckins = 0;
        let checkinRate = 0;
        let daysInMonth = 0;
        
        try {
            // 获取连续存活天数（使用现有的helper函数逻辑）
            const { calculateSurviveDays } = require('../utils/helpers');
            surviveDays = await calculateSurviveDays(userId, connection);
        } catch (error) {
            console.error('计算存活天数错误:', error);
        }
        
        try {
            // 获取总打卡次数
            const [totalResult] = await connection.execute(
                'SELECT COUNT(*) as total_checkins FROM check_ins WHERE user_id = ?',
                [userId]
            );
            totalCheckins = totalResult[0].total_checkins;
        } catch (error) {
            console.error('获取总打卡次数错误:', error);
        }
        
        try {
            // 获取本月打卡数据
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            
            const [monthResult] = await connection.execute(
                'SELECT COUNT(*) as month_checkins FROM check_ins WHERE user_id = ? AND YEAR(check_date) = ? AND MONTH(check_date) = ?',
                [userId, currentYear, currentMonth]
            );
            
            // 计算本月应该打卡的天数（从本月1号到今天）
            const today = new Date();
            daysInMonth = Math.min(today.getDate(), new Date(currentYear, currentMonth, 0).getDate());
            
            monthCheckins = monthResult[0].month_checkins;
            checkinRate = daysInMonth > 0 ? Math.round((monthCheckins / daysInMonth) * 100) : 0;
        } catch (error) {
            console.error('获取本月打卡数据错误:', error);
        }
        
        const result = {
            consecutiveDays: surviveDays,
            totalCheckins: totalCheckins,
            monthCheckins: monthCheckins,
            checkinRate: checkinRate,
            daysInMonth: daysInMonth
        };
        
        console.log('统计数据结果:', result);
        res.json(result);
    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.status(500).json({ 
            error: '服务器错误',
            details: error.message 
        });
    }
});

// 更新设置
router.put('/settings', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { notification_enabled, do_not_disturb, reminder_time, theme } = req.body;
        
        // 验证提醒时间格式
        if (reminder_time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reminder_time)) {
            return res.status(400).json({ error: '提醒时间格式不正确，请使用 HH:MM 格式' });
        }
        
        // 验证主题
        if (theme && !['light', 'dark'].includes(theme)) {
            return res.status(400).json({ error: '无效的主题选择' });
        }
        
        await connection.execute(
            'UPDATE users SET notification_enabled = ?, do_not_disturb = ?, reminder_time = ?, theme = ? WHERE id = ?',
            [notification_enabled, do_not_disturb, reminder_time || '09:00', theme || 'light', userId]
        );
        
        res.json({ message: '设置更新成功' });
    } catch (error) {
        console.error('更新设置错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新头像
router.put('/avatar', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { avatar } = req.body;
        
        if (!avatar) {
            return res.status(400).json({ error: '头像不能为空' });
        }
        
        // 验证头像是否在预设列表中
        const { isValidAvatar } = require('../config/avatars');
        if (!isValidAvatar(avatar)) {
            return res.status(400).json({ error: '无效的头像选择' });
        }
        
        await connection.execute(
            'UPDATE users SET avatar = ? WHERE id = ?',
            [avatar, userId]
        );
        
        res.json({ message: '头像更新成功', avatar });
    } catch (error) {
        console.error('更新头像错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取可用头像列表
router.get('/avatars', (req, res) => {
    try {
        const { AVATAR_CATEGORIES } = require('../config/avatars');
        res.json(AVATAR_CATEGORIES);
    } catch (error) {
        console.error('获取头像列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 完成教程
router.post('/tutorial/complete', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        await connection.execute(
            'UPDATE users SET tutorial_completed = TRUE WHERE id = ?',
            [userId]
        );
        
        res.json({ message: '教程完成状态已更新' });
    } catch (error) {
        console.error('更新教程状态错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 重置教程（用于测试）
router.post('/tutorial/reset', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        await connection.execute(
            'UPDATE users SET tutorial_completed = FALSE WHERE id = ?',
            [userId]
        );
        
        res.json({ message: '教程状态已重置' });
    } catch (error) {
        console.error('重置教程状态错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 注销账号 - 永久删除用户数据
router.delete('/delete-account', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { confirmPassword } = req.body;
        
        // 验证密码确认
        if (!confirmPassword) {
            return res.status(400).json({ error: '请输入密码确认删除' });
        }
        
        // 获取用户信息验证密码
        const [users] = await connection.execute(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(confirmPassword, users[0].password);
        
        if (!isValidPassword) {
            return res.status(400).json({ error: '密码错误，无法删除账号' });
        }
        
        // 开始事务删除所有相关数据
        await connection.beginTransaction();
        
        try {
            console.log(`开始删除用户 ${userId} 的所有数据...`);
            
            // 1. 删除用户成就记录
            await connection.execute('DELETE FROM user_achievements WHERE user_id = ?', [userId]);
            console.log('已删除用户成就记录');
            
            // 2. 删除打卡记录
            await connection.execute('DELETE FROM check_ins WHERE user_id = ?', [userId]);
            console.log('已删除打卡记录');
            
            // 3. 删除好友关系（作为请求者和被请求者）
            await connection.execute('DELETE FROM friendships WHERE requester_id = ? OR addressee_id = ?', [userId, userId]);
            console.log('已删除好友关系');
            
            // 4. 删除消息记录（作为发送者和接收者）
            await connection.execute('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
            console.log('已删除消息记录');
            
            // 5. 最后删除用户记录
            await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
            console.log('已删除用户记录');
            
            // 提交事务
            await connection.commit();
            
            console.log(`用户 ${userId} 的所有数据已成功删除`);
            
            res.json({ 
                message: '账号已成功注销，所有数据已永久删除',
                deletedUserId: userId
            });
            
        } catch (error) {
            // 回滚事务
            await connection.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('注销账号错误:', error);
        res.status(500).json({ 
            error: '注销账号失败，请稍后重试',
            details: error.message 
        });
    }
});

module.exports = router;