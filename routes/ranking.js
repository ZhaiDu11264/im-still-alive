const express = require('express');
const { getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { calculateSurviveDays } = require('../utils/helpers');

const router = express.Router();

// 好友排行榜
router.get('/friends', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        // 获取好友列表
        const [friends] = await connection.execute(`
            SELECT DISTINCT 
                CASE 
                    WHEN f.requester_id = ? THEN f.addressee_id 
                    ELSE f.requester_id 
                END as friend_id,
                u.username,
                u.avatar
            FROM friendships f
            JOIN users u ON (
                CASE 
                    WHEN f.requester_id = ? THEN u.id = f.addressee_id 
                    ELSE u.id = f.requester_id 
                END
            )
            WHERE (f.requester_id = ? OR f.addressee_id = ?) 
            AND f.status = 'accepted'
        `, [userId, userId, userId, userId]);
        
        // 计算每个好友的存活天数和今日打卡状态
        const friendsWithDays = [];
        const today = new Date().toISOString().split('T')[0];
        
        for (const friend of friends) {
            const surviveDays = await calculateSurviveDays(friend.friend_id, connection);
            
            // 检查今日是否已打卡
            const [todayCheckin] = await connection.execute(
                'SELECT id FROM check_ins WHERE user_id = ? AND check_date = ?',
                [friend.friend_id, today]
            );
            
            // 检查是否在1小时内已被提醒过（冷却状态）
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const [recentReminder] = await connection.execute(`
                SELECT id FROM messages 
                WHERE sender_id = ? AND receiver_id = ? AND message_type = 'reminder' 
                AND created_at > ?
            `, [userId, friend.friend_id, oneHourAgo]);
            
            friendsWithDays.push({
                userId: friend.friend_id,
                username: friend.username,
                avatar: friend.avatar,
                surviveDays,
                hasCheckedToday: todayCheckin.length > 0,
                isOnCooldown: recentReminder.length > 0
            });
        }
        
        // 添加自己
        const [currentUser] = await connection.execute(
            'SELECT username, avatar FROM users WHERE id = ?',
            [userId]
        );
        const myDays = await calculateSurviveDays(userId, connection);
        
        // 检查自己今日是否已打卡
        const [myTodayCheckin] = await connection.execute(
            'SELECT id FROM check_ins WHERE user_id = ? AND check_date = ?',
            [userId, today]
        );
        
        friendsWithDays.push({
            userId: userId,
            username: currentUser[0].username,
            avatar: currentUser[0].avatar,
            surviveDays: myDays,
            hasCheckedToday: myTodayCheckin.length > 0,
            isMe: true
        });
        
        // 按存活天数排序
        friendsWithDays.sort((a, b) => b.surviveDays - a.surviveDays);
        
        res.json(friendsWithDays);
    } catch (error) {
        console.error('获取好友排行榜错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 地区排行榜
router.get('/region', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        // 获取当前用户地区
        const [currentUser] = await connection.execute(
            'SELECT region FROM users WHERE id = ?',
            [userId]
        );
        
        if (currentUser.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        const userRegion = currentUser[0].region;
        
        // 获取同地区用户
        const [regionUsers] = await connection.execute(
            'SELECT id, username, avatar FROM users WHERE region = ?',
            [userRegion]
        );
        
        // 计算每个用户的存活天数
        const usersWithDays = [];
        for (const user of regionUsers) {
            const surviveDays = await calculateSurviveDays(user.id, connection);
            usersWithDays.push({
                username: user.username,
                avatar: user.avatar,
                surviveDays,
                isMe: user.id === userId
            });
        }
        
        // 按存活天数排序
        usersWithDays.sort((a, b) => b.surviveDays - a.surviveDays);
        
        res.json({
            region: userRegion,
            ranking: usersWithDays
        });
    } catch (error) {
        console.error('获取地区排行榜错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 全国排行榜
router.get('/national', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        // 获取所有用户（限制前100名）
        const [allUsers] = await connection.execute(
            'SELECT id, username, avatar, region FROM users LIMIT 100'
        );
        
        // 计算每个用户的存活天数
        const usersWithDays = [];
        for (const user of allUsers) {
            const surviveDays = await calculateSurviveDays(user.id, connection);
            usersWithDays.push({
                username: user.username,
                avatar: user.avatar,
                region: user.region,
                surviveDays,
                isMe: user.id === userId
            });
        }
        
        // 按存活天数排序
        usersWithDays.sort((a, b) => b.surviveDays - a.surviveDays);
        
        res.json(usersWithDays);
    } catch (error) {
        console.error('获取全国排行榜错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;