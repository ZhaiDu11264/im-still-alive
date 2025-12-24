const express = require('express');
const { getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 检查批量提醒冷却状态
router.get('/batch-remind-cooldown', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        // 检查是否在1小时内进行过批量提醒
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const [recentBatchReminder] = await connection.execute(`
            SELECT COUNT(*) as count FROM messages 
            WHERE sender_id = ? AND message_type = 'reminder' 
            AND content LIKE '%批量提醒%' AND created_at > ?
        `, [userId, oneHourAgo]);
        
        const isOnCooldown = recentBatchReminder[0].count > 0;
        let remainingTime = 0;
        
        if (isOnCooldown) {
            // 获取最近一次批量提醒的时间
            const [lastBatchReminder] = await connection.execute(`
                SELECT created_at FROM messages 
                WHERE sender_id = ? AND message_type = 'reminder' 
                AND content LIKE '%批量提醒%' 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [userId]);
            
            if (lastBatchReminder.length > 0) {
                const lastReminderTime = new Date(lastBatchReminder[0].created_at);
                const cooldownEndTime = new Date(lastReminderTime.getTime() + 60 * 60 * 1000);
                remainingTime = Math.max(0, Math.ceil((cooldownEndTime - new Date()) / 1000 / 60)); // 分钟
            }
        }
        
        res.json({ 
            isOnCooldown,
            remainingTime // 剩余冷却时间（分钟）
        });
    } catch (error) {
        console.error('检查批量提醒冷却状态错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取未读消息数量
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        const [result] = await connection.execute(`
            SELECT COUNT(*) as unread_count
            FROM messages 
            WHERE receiver_id = ? AND is_read = FALSE
        `, [userId]);
        
        res.json({ unreadCount: result[0].unread_count });
    } catch (error) {
        console.error('获取未读消息数量错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取消息列表
router.get('/', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        const [messages] = await connection.execute(`
            SELECT 
                m.id,
                m.sender_id,
                m.message_type,
                m.content,
                m.is_read,
                m.created_at,
                CASE 
                    WHEN m.message_type IN ('reminder', 'system') OR m.sender_id = 1 THEN '系统'
                    ELSE u.username 
                END as sender_username,
                f.status as friendship_status
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            LEFT JOIN friendships f ON (
                (f.requester_id = m.sender_id AND f.addressee_id = m.receiver_id) OR
                (f.requester_id = m.receiver_id AND f.addressee_id = m.sender_id)
            )
            WHERE m.receiver_id = ?
            ORDER BY m.created_at DESC
        `, [userId]);
        
        res.json(messages);
    } catch (error) {
        console.error('获取消息列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 发送好友申请
router.post('/friend-request', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const senderId = req.user.userId;
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: '用户名不能为空' });
        }
        
        // 查找目标用户
        const [targetUsers] = await connection.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (targetUsers.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        const targetUserId = targetUsers[0].id;
        
        if (senderId === targetUserId) {
            return res.status(400).json({ error: '不能添加自己为好友' });
        }
        
        // 检查是否已经是好友或已发送申请
        const [existingFriendship] = await connection.execute(`
            SELECT status FROM friendships 
            WHERE (requester_id = ? AND addressee_id = ?) 
            OR (requester_id = ? AND addressee_id = ?)
        `, [senderId, targetUserId, targetUserId, senderId]);
        
        if (existingFriendship.length > 0) {
            const status = existingFriendship[0].status;
            if (status === 'accepted') {
                return res.status(400).json({ error: '已经是好友了' });
            } else if (status === 'pending') {
                return res.status(400).json({ error: '好友申请已发送，请等待对方回应' });
            }
        }
        
        // 创建好友申请
        await connection.execute(
            'INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, ?)',
            [senderId, targetUserId, 'pending']
        );
        
        // 发送消息通知
        const [senderInfo] = await connection.execute(
            'SELECT username FROM users WHERE id = ?',
            [senderId]
        );
        
        await connection.execute(
            'INSERT INTO messages (sender_id, receiver_id, message_type, content) VALUES (?, ?, ?, ?)',
            [senderId, targetUserId, 'friend_request', `${senderInfo[0].username} 想要添加您为好友`]
        );
        
        res.json({ message: '好友申请已发送' });
    } catch (error) {
        console.error('发送好友申请错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 处理好友申请
router.post('/friend-request/:action', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { action } = req.params; // 'accept' or 'reject'
        const { requesterId } = req.body;
        
        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ error: '无效的操作' });
        }
        
        // 更新好友申请状态
        const newStatus = action === 'accept' ? 'accepted' : 'rejected';
        
        const [result] = await connection.execute(
            'UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE requester_id = ? AND addressee_id = ? AND status = ?',
            [newStatus, requesterId, userId, 'pending']
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '好友申请不存在或已处理' });
        }
        
        // 发送回复消息
        const [userInfo] = await connection.execute(
            'SELECT username FROM users WHERE id = ?',
            [userId]
        );
        
        const responseMessage = action === 'accept' 
            ? `${userInfo[0].username} 接受了您的好友申请` 
            : `${userInfo[0].username} 拒绝了您的好友申请`;
            
        await connection.execute(
            'INSERT INTO messages (sender_id, receiver_id, message_type, content) VALUES (?, ?, ?, ?)',
            [userId, requesterId, 'system', responseMessage]
        );
        
        res.json({ 
            message: action === 'accept' ? '已接受好友申请' : '已拒绝好友申请' 
        });
    } catch (error) {
        console.error('处理好友申请错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 批量提醒所有未打卡好友
router.post('/batch-remind-friends', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const senderId = req.user.userId;
        
        // 获取所有好友
        const [friends] = await connection.execute(`
            SELECT DISTINCT 
                CASE 
                    WHEN f.requester_id = ? THEN f.addressee_id 
                    ELSE f.requester_id 
                END as friend_id,
                u.username
            FROM friendships f
            JOIN users u ON (
                CASE 
                    WHEN f.requester_id = ? THEN u.id = f.addressee_id 
                    ELSE u.id = f.requester_id 
                END
            )
            WHERE (f.requester_id = ? OR f.addressee_id = ?) 
            AND f.status = 'accepted'
        `, [senderId, senderId, senderId, senderId]);
        
        if (friends.length === 0) {
            return res.status(400).json({ error: '您还没有好友' });
        }
        
        // 检查今日打卡状态，筛选出未打卡的好友
        const today = new Date().toISOString().split('T')[0];
        const uncheckedFriends = [];
        
        for (const friend of friends) {
            const [todayCheckin] = await connection.execute(
                'SELECT id FROM check_ins WHERE user_id = ? AND check_date = ?',
                [friend.friend_id, today]
            );
            
            if (todayCheckin.length === 0) {
                uncheckedFriends.push(friend);
            }
        }
        
        if (uncheckedFriends.length === 0) {
            return res.status(400).json({ error: '所有好友今日都已打卡' });
        }
        
        // 检查是否在短时间内重复提醒（防止骚扰）
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const [recentBatchReminder] = await connection.execute(`
            SELECT COUNT(*) as count FROM messages 
            WHERE sender_id = ? AND message_type = 'reminder' 
            AND content LIKE '%批量提醒%' AND created_at > ?
        `, [senderId, oneHourAgo]);
        
        if (recentBatchReminder[0].count > 0) {
            return res.status(400).json({ error: '请勿频繁批量提醒，每小时最多一次' });
        }
        
        // 获取发送者信息
        const [senderInfo] = await connection.execute(
            'SELECT username FROM users WHERE id = ?',
            [senderId]
        );
        
        // 批量发送提醒消息
        let successCount = 0;
        const remindedFriends = [];
        
        for (const friend of uncheckedFriends) {
            try {
                // 检查是否在1小时内已经单独提醒过这个好友
                const [recentIndividualReminder] = await connection.execute(`
                    SELECT id FROM messages 
                    WHERE sender_id = ? AND receiver_id = ? AND message_type = 'reminder' 
                    AND created_at > ?
                `, [senderId, friend.friend_id, oneHourAgo]);
                
                if (recentIndividualReminder.length === 0) {
                    await connection.execute(
                        'INSERT INTO messages (sender_id, receiver_id, message_type, content) VALUES (?, ?, ?, ?)',
                        [senderId, friend.friend_id, 'reminder', `${senderInfo[0].username} 批量提醒您：别忘了今天的打卡哦！💪 (来自好友关怀)`]
                    );
                    successCount++;
                    remindedFriends.push(friend.username);
                }
            } catch (error) {
                console.error(`提醒好友 ${friend.username} 失败:`, error);
            }
        }
        
        if (successCount === 0) {
            return res.status(400).json({ error: '所有好友都在1小时内已被提醒过' });
        }
        
        res.json({ 
            message: `成功提醒了 ${successCount} 位好友`,
            remindedCount: successCount,
            remindedFriends: remindedFriends,
            totalUnchecked: uncheckedFriends.length
        });
    } catch (error) {
        console.error('批量提醒好友错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 发送打卡提醒
router.post('/remind-checkin', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const senderId = req.user.userId;
        const { targetUserId } = req.body;
        
        if (!targetUserId) {
            return res.status(400).json({ error: '目标用户ID不能为空' });
        }
        
        // 验证是否为好友关系
        const [friendship] = await connection.execute(`
            SELECT id FROM friendships 
            WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
            AND status = 'accepted'
        `, [senderId, targetUserId, targetUserId, senderId]);
        
        if (friendship.length === 0) {
            return res.status(403).json({ error: '只能提醒好友打卡' });
        }
        
        // 检查目标用户今日是否已打卡
        const today = new Date().toISOString().split('T')[0];
        const [todayCheckin] = await connection.execute(
            'SELECT id FROM check_ins WHERE user_id = ? AND check_date = ?',
            [targetUserId, today]
        );
        
        if (todayCheckin.length > 0) {
            return res.status(400).json({ error: '该用户今日已打卡' });
        }
        
        // 检查是否在短时间内重复提醒（防止骚扰）
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const [recentReminder] = await connection.execute(`
            SELECT id FROM messages 
            WHERE sender_id = ? AND receiver_id = ? AND message_type = 'reminder' 
            AND created_at > ?
        `, [senderId, targetUserId, oneHourAgo]);
        
        if (recentReminder.length > 0) {
            return res.status(400).json({ error: '请勿频繁提醒，每小时最多提醒一次' });
        }
        
        // 获取发送者信息
        const [senderInfo] = await connection.execute(
            'SELECT username FROM users WHERE id = ?',
            [senderId]
        );
        
        // 发送提醒消息
        await connection.execute(
            'INSERT INTO messages (sender_id, receiver_id, message_type, content) VALUES (?, ?, ?, ?)',
            [senderId, targetUserId, 'reminder', `${senderInfo[0].username} 提醒您：别忘了今天的打卡哦！💪`]
        );
        
        res.json({ message: '提醒已发送' });
    } catch (error) {
        console.error('发送打卡提醒错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 标记消息为已读
router.put('/:messageId/read', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { messageId } = req.params;
        
        await connection.execute(
            'UPDATE messages SET is_read = TRUE WHERE id = ? AND receiver_id = ?',
            [messageId, userId]
        );
        
        res.json({ message: '消息已标记为已读' });
    } catch (error) {
        console.error('标记消息已读错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 标记所有系统消息为已读
router.put('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        
        await connection.execute(
            'UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND is_read = FALSE',
            [userId]
        );
        
        res.json({ message: '所有消息已标记为已读' });
    } catch (error) {
        console.error('批量标记消息已读错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;