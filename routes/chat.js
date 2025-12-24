const express = require('express');
const { getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取用户的所有会话列表
router.get('/conversations', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;

        const [conversations] = await connection.execute(`
            SELECT 
                c.id,
                c.user1_id,
                c.user2_id,
                c.last_message_at,
                c.created_at,
                CASE 
                    WHEN c.user1_id = ? THEN u2.id
                    ELSE u1.id
                END as friend_id,
                CASE 
                    WHEN c.user1_id = ? THEN u2.username
                    ELSE u1.username
                END as friend_username,
                CASE 
                    WHEN c.user1_id = ? THEN u2.avatar
                    ELSE u1.avatar
                END as friend_avatar,
                (SELECT content FROM chat_messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT COUNT(*) FROM chat_messages 
                 WHERE conversation_id = c.id 
                 AND sender_id != ? 
                 AND is_read = FALSE) as unread_count
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE c.user1_id = ? OR c.user2_id = ?
            ORDER BY c.last_message_at DESC
        `, [userId, userId, userId, userId, userId, userId]);

        res.json(conversations);
    } catch (error) {
        console.error('获取会话列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 创建或获取与指定好友的会话
router.post('/conversations', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { friendId } = req.body;

        if (!friendId) {
            return res.status(400).json({ error: '好友ID不能为空' });
        }

        if (userId === friendId) {
            return res.status(400).json({ error: '不能与自己创建会话' });
        }

        // 验证是否为好友关系
        const [friendship] = await connection.execute(`
            SELECT id FROM friendships 
            WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
            AND status = 'accepted'
        `, [userId, friendId, friendId, userId]);

        if (friendship.length === 0) {
            return res.status(403).json({ error: '只能与好友创建会话' });
        }

        // 确保 user1_id < user2_id 以保证唯一性
        const user1Id = Math.min(userId, friendId);
        const user2Id = Math.max(userId, friendId);

        // 检查会话是否已存在
        const [existingConv] = await connection.execute(
            'SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?',
            [user1Id, user2Id]
        );

        if (existingConv.length > 0) {
            return res.json({ conversationId: existingConv[0].id, created: false });
        }

        // 创建新会话
        const [result] = await connection.execute(
            'INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)',
            [user1Id, user2Id]
        );

        res.json({ conversationId: result.insertId, created: true });
    } catch (error) {
        console.error('创建会话错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取指定会话的消息历史
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const conversationId = req.params.id;
        const { limit = 50, before } = req.query; // before: 用于分页，获取指定消息ID之前的消息

        // 验证用户是否是会话参与者
        const [conversation] = await connection.execute(
            'SELECT user1_id, user2_id FROM conversations WHERE id = ?',
            [conversationId]
        );

        if (conversation.length === 0) {
            return res.status(404).json({ error: '会话不存在' });
        }

        if (conversation[0].user1_id !== userId && conversation[0].user2_id !== userId) {
            return res.status(403).json({ error: '无权访问此会话' });
        }

        // 获取消息
        let query = `
            SELECT 
                cm.id,
                cm.sender_id,
                cm.content,
                cm.is_read,
                cm.created_at,
                u.username as sender_username,
                u.avatar as sender_avatar
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.id
            WHERE cm.conversation_id = ?
        `;

        const params = [conversationId];

        if (before) {
            query += ' AND cm.id < ?';
            params.push(parseInt(before));
        }

        // LIMIT不能用参数绑定，直接拼接
        const limitValue = parseInt(limit) || 50;
        query += ` ORDER BY cm.created_at DESC LIMIT ${limitValue}`;

        const [messages] = await connection.execute(query, params);

        // 反转顺序，使最新的消息在最后
        messages.reverse();

        res.json(messages);
    } catch (error) {
        console.error('获取消息历史错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 发送聊天消息
router.post('/messages', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const senderId = req.user.userId;
        const { conversationId, content } = req.body;

        if (!conversationId || !content) {
            return res.status(400).json({ error: '会话ID和消息内容不能为空' });
        }

        if (content.trim().length === 0) {
            return res.status(400).json({ error: '消息内容不能为空' });
        }

        if (content.length > 1000) {
            return res.status(400).json({ error: '消息内容不能超过1000字符' });
        }

        // 验证用户是否是会话参与者
        const [conversation] = await connection.execute(
            'SELECT user1_id, user2_id FROM conversations WHERE id = ?',
            [conversationId]
        );

        if (conversation.length === 0) {
            return res.status(404).json({ error: '会话不存在' });
        }

        if (conversation[0].user1_id !== senderId && conversation[0].user2_id !== senderId) {
            return res.status(403).json({ error: '无权在此会话中发送消息' });
        }

        // 插入消息
        const [result] = await connection.execute(
            'INSERT INTO chat_messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
            [conversationId, senderId, content.trim()]
        );

        // 更新会话的最后消息时间
        await connection.execute(
            'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
            [conversationId]
        );

        // 获取刚插入的消息详情
        const [newMessage] = await connection.execute(`
            SELECT 
                cm.id,
                cm.sender_id,
                cm.content,
                cm.is_read,
                cm.created_at,
                u.username as sender_username,
                u.avatar as sender_avatar
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.id
            WHERE cm.id = ?
        `, [result.insertId]);

        res.json(newMessage[0]);
    } catch (error) {
        console.error('发送消息错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 标记会话中的所有消息为已读
router.put('/conversations/:id/read', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const conversationId = req.params.id;

        // 验证用户是否是会话参与者
        const [conversation] = await connection.execute(
            'SELECT user1_id, user2_id FROM conversations WHERE id = ?',
            [conversationId]
        );

        if (conversation.length === 0) {
            return res.status(404).json({ error: '会话不存在' });
        }

        if (conversation[0].user1_id !== userId && conversation[0].user2_id !== userId) {
            return res.status(403).json({ error: '无权访问此会话' });
        }

        // 标记所有不是自己发送的消息为已读
        await connection.execute(
            'UPDATE chat_messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
            [conversationId, userId]
        );

        res.json({ message: '消息已标记为已读' });
    } catch (error) {
        console.error('标记消息已读错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取未读聊天消息总数
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;

        const [result] = await connection.execute(`
            SELECT COUNT(*) as unread_count
            FROM chat_messages cm
            JOIN conversations c ON cm.conversation_id = c.id
            WHERE (c.user1_id = ? OR c.user2_id = ?)
            AND cm.sender_id != ?
            AND cm.is_read = FALSE
        `, [userId, userId, userId]);

        res.json({ unreadCount: result[0].unread_count });
    } catch (error) {
        console.error('获取未读消息数量错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 标记所有聊天消息为已读
router.put('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;

        // 标记用户参与的所有会话中的未读消息为已读
        await connection.execute(`
            UPDATE chat_messages cm
            JOIN conversations c ON cm.conversation_id = c.id
            SET cm.is_read = TRUE
            WHERE (c.user1_id = ? OR c.user2_id = ?)
            AND cm.sender_id != ?
            AND cm.is_read = FALSE
        `, [userId, userId, userId]);

        res.json({ message: '所有聊天消息已标记为已读' });
    } catch (error) {
        console.error('批量标记聊天消息已读错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;
