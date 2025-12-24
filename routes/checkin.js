const express = require('express');
const { getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { calculateSurviveDays, getTodayString } = require('../utils/helpers');

const router = express.Router();

// 获取用户打卡状态和存活天数
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const today = getTodayString();
        
        // 检查今天是否已打卡
        const [todayCheckin] = await connection.execute(
            'SELECT mood, check_time FROM check_ins WHERE user_id = ? AND check_date = ?',
            [userId, today]
        );
        
        // 计算存活天数（连续打卡天数）
        const surviveDays = await calculateSurviveDays(userId, connection);
        
        // 获取最新解锁的成就
        const [latestAchievement] = await connection.execute(`
            SELECT a.name, a.description, a.icon 
            FROM user_achievements ua 
            JOIN achievements a ON ua.achievement_id = a.id 
            WHERE ua.user_id = ? 
            ORDER BY ua.unlocked_at DESC 
            LIMIT 1
        `, [userId]);

        res.json({
            hasCheckedToday: todayCheckin.length > 0,
            todayMood: todayCheckin.length > 0 ? todayCheckin[0].mood : null,
            checkTime: todayCheckin.length > 0 ? todayCheckin[0].check_time : null,
            surviveDays,
            latestAchievement: latestAchievement.length > 0 ? latestAchievement[0] : null
        });
    } catch (error) {
        console.error('获取打卡状态错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 执行打卡
router.post('/checkin', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { mood } = req.body;
        const today = getTodayString();
        
        // 检查今天是否已打卡
        const [existingCheckin] = await connection.execute(
            'SELECT id FROM check_ins WHERE user_id = ? AND check_date = ?',
            [userId, today]
        );
        
        if (existingCheckin.length > 0) {
            return res.status(400).json({ error: '今天已经打过卡了' });
        }
        
        // 插入打卡记录
        await connection.execute(
            'INSERT INTO check_ins (user_id, check_date, mood) VALUES (?, ?, ?)',
            [userId, today, mood || null]
        );
        
        // 计算新的存活天数
        const surviveDays = await calculateSurviveDays(userId, connection);
        
        // 检查是否解锁新成就
        const [achievements] = await connection.execute(
            'SELECT id, name, description, icon FROM achievements WHERE required_days = ?',
            [surviveDays]
        );
        
        let newAchievement = null;
        if (achievements.length > 0) {
            const achievement = achievements[0];
            
            // 检查是否已经解锁过
            const [existing] = await connection.execute(
                'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
                [userId, achievement.id]
            );
            
            if (existing.length === 0) {
                // 解锁新成就
                await connection.execute(
                    'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
                    [userId, achievement.id]
                );
                newAchievement = achievement;
            }
        }
        
        res.json({
            message: '打卡成功',
            surviveDays,
            newAchievement
        });
    } catch (error) {
        console.error('打卡错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;