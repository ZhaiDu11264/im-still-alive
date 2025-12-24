const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/covers';
        // 确保上传目录存在
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB限制
    },
    fileFilter: function (req, file, cb) {
        // 只允许图片文件
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件'));
        }
    }
});

// 获取帖子列表
router.get('/posts', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { filter = 'all', page = 1, limit = 20 } = req.query;
        
        const offset = (page - 1) * limit;
        const limitNum = parseInt(limit);
        
        let query, params;
        
        // 根据不同的筛选条件构建不同的查询
        // 使用字符串拼接而不是参数绑定来处理LIMIT和OFFSET
        switch (filter) {
            case 'my':
                query = `
                    SELECT 
                        p.id,
                        p.title,
                        p.content,
                        p.cover_image,
                        p.tags,
                        p.created_at,
                        p.views_count,
                        p.likes_count,
                        p.comments_count,
                        u.username as author_username,
                        u.avatar as author_avatar,
                        CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked,
                        CASE WHEN p.author_id = ? THEN 1 ELSE 0 END as is_author
                    FROM plaza_posts p
                    JOIN users u ON p.author_id = u.id
                    LEFT JOIN plaza_likes pl ON p.id = pl.post_id AND pl.user_id = ?
                    WHERE p.author_id = ?
                    ORDER BY p.created_at DESC
                    LIMIT ${limitNum} OFFSET ${offset}
                `;
                params = [userId, userId, userId];
                break;
                
            case 'hot':
                query = `
                    SELECT 
                        p.id,
                        p.title,
                        p.content,
                        p.cover_image,
                        p.tags,
                        p.created_at,
                        p.views_count,
                        p.likes_count,
                        p.comments_count,
                        u.username as author_username,
                        u.avatar as author_avatar,
                        CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked,
                        CASE WHEN p.author_id = ? THEN 1 ELSE 0 END as is_author
                    FROM plaza_posts p
                    JOIN users u ON p.author_id = u.id
                    LEFT JOIN plaza_likes pl ON p.id = pl.post_id AND pl.user_id = ?
                    ORDER BY p.likes_count DESC, p.views_count DESC, p.created_at DESC
                    LIMIT ${limitNum} OFFSET ${offset}
                `;
                params = [userId, userId];
                break;
                
            default: // 'all' 和 'latest'
                query = `
                    SELECT 
                        p.id,
                        p.title,
                        p.content,
                        p.cover_image,
                        p.tags,
                        p.created_at,
                        p.views_count,
                        p.likes_count,
                        p.comments_count,
                        u.username as author_username,
                        u.avatar as author_avatar,
                        CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked,
                        CASE WHEN p.author_id = ? THEN 1 ELSE 0 END as is_author
                    FROM plaza_posts p
                    JOIN users u ON p.author_id = u.id
                    LEFT JOIN plaza_likes pl ON p.id = pl.post_id AND pl.user_id = ?
                    ORDER BY p.created_at DESC
                    LIMIT ${limitNum} OFFSET ${offset}
                `;
                params = [userId, userId];
                break;
        }
        
        console.log('执行SQL查询:', query);
        console.log('参数:', params);
        
        const [posts] = await connection.execute(query, params);
        
        res.json({ posts });
    } catch (error) {
        console.error('获取帖子列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 发布帖子
router.post('/posts', authenticateToken, upload.single('cover'), async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const { title, content, tags } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: '标题和内容不能为空' });
        }
        
        if (title.length > 100) {
            return res.status(400).json({ error: '标题不能超过100字符' });
        }
        
        if (content.length > 1000) {
            return res.status(400).json({ error: '内容不能超过1000字符' });
        }
        
        let coverImagePath = null;
        if (req.file) {
            // 保存相对路径
            coverImagePath = '/uploads/covers/' + req.file.filename;
        }
        
        const [result] = await connection.execute(
            'INSERT INTO plaza_posts (author_id, title, content, cover_image, tags) VALUES (?, ?, ?, ?, ?)',
            [userId, title, content, coverImagePath, tags || null]
        );
        
        res.json({ 
            message: '帖子发布成功',
            postId: result.insertId
        });
    } catch (error) {
        console.error('发布帖子错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取帖子详情
router.get('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const postId = req.params.id;
        
        console.log('获取帖子详情请求 - 用户ID:', userId, '帖子ID:', postId);
        
        // 增加浏览量
        await connection.execute(
            'UPDATE plaza_posts SET views_count = views_count + 1 WHERE id = ?',
            [postId]
        );
        
        const query = `
            SELECT 
                p.id,
                p.title,
                p.content,
                p.cover_image,
                p.tags,
                p.created_at,
                p.views_count,
                p.likes_count,
                p.comments_count,
                u.username as author_username,
                u.avatar as author_avatar,
                CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked,
                CASE WHEN p.author_id = ? THEN 1 ELSE 0 END as is_author
            FROM plaza_posts p
            JOIN users u ON p.author_id = u.id
            LEFT JOIN plaza_likes pl ON p.id = pl.post_id AND pl.user_id = ?
            WHERE p.id = ?
        `;
        
        console.log('执行帖子详情查询:', query);
        console.log('查询参数:', [userId, userId, postId]);
        
        const [posts] = await connection.execute(query, [userId, userId, postId]);
        
        console.log('查询结果数量:', posts.length);
        if (posts.length > 0) {
            console.log('帖子详情:', posts[0]);
        }
        
        if (posts.length === 0) {
            console.log('帖子不存在:', postId);
            return res.status(404).json({ error: '帖子不存在' });
        }
        
        res.json({ post: posts[0] });
    } catch (error) {
        console.error('获取帖子详情错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 切换点赞
router.post('/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const postId = req.params.id;
        
        // 检查是否已点赞
        const [existingLike] = await connection.execute(
            'SELECT id FROM plaza_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );
        
        if (existingLike.length > 0) {
            // 取消点赞
            await connection.execute(
                'DELETE FROM plaza_likes WHERE post_id = ? AND user_id = ?',
                [postId, userId]
            );
            
            await connection.execute(
                'UPDATE plaza_posts SET likes_count = likes_count - 1 WHERE id = ?',
                [postId]
            );
            
            res.json({ message: '已取消点赞', liked: false });
        } else {
            // 添加点赞
            await connection.execute(
                'INSERT INTO plaza_likes (post_id, user_id) VALUES (?, ?)',
                [postId, userId]
            );
            
            await connection.execute(
                'UPDATE plaza_posts SET likes_count = likes_count + 1 WHERE id = ?',
                [postId]
            );
            
            res.json({ message: '点赞成功', liked: true });
        }
    } catch (error) {
        console.error('切换点赞错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取帖子评论
router.get('/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const postId = req.params.id;
        
        // 获取评论及其回复
        const [comments] = await connection.execute(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                u.username as author_username,
                u.avatar as author_avatar,
                CASE WHEN cl.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked,
                (SELECT COUNT(*) FROM plaza_comment_likes WHERE comment_id = c.id) as likes_count
            FROM plaza_comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN plaza_comment_likes cl ON c.id = cl.comment_id AND cl.user_id = ?
            WHERE c.post_id = ? AND c.parent_id IS NULL
            ORDER BY c.created_at ASC
        `, [userId, postId]);
        
        // 为每个评论获取回复
        for (let comment of comments) {
            const [replies] = await connection.execute(`
                SELECT 
                    c.id,
                    c.content,
                    c.created_at,
                    u.username as author_username,
                    u.avatar as author_avatar,
                    CASE WHEN cl.user_id IS NOT NULL THEN 1 ELSE 0 END as user_liked,
                    (SELECT COUNT(*) FROM plaza_comment_likes WHERE comment_id = c.id) as likes_count
                FROM plaza_comments c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN plaza_comment_likes cl ON c.id = cl.comment_id AND cl.user_id = ?
                WHERE c.parent_id = ?
                ORDER BY c.created_at ASC
            `, [userId, comment.id]);
            
            comment.replies = replies;
        }
        
        res.json({ comments });
    } catch (error) {
        console.error('获取评论错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 发表评论
router.post('/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const postId = req.params.id;
        const { content } = req.body;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: '评论内容不能为空' });
        }
        
        if (content.length > 500) {
            return res.status(400).json({ error: '评论内容不能超过500字符' });
        }
        
        // 检查帖子是否存在
        const [post] = await connection.execute(
            'SELECT id FROM plaza_posts WHERE id = ?',
            [postId]
        );
        
        if (post.length === 0) {
            return res.status(404).json({ error: '帖子不存在' });
        }
        
        // 插入评论
        const [result] = await connection.execute(
            'INSERT INTO plaza_comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [postId, userId, content.trim()]
        );
        
        // 更新帖子评论数
        await connection.execute(
            'UPDATE plaza_posts SET comments_count = comments_count + 1 WHERE id = ?',
            [postId]
        );
        
        res.json({ 
            message: '评论发表成功',
            commentId: result.insertId
        });
    } catch (error) {
        console.error('发表评论错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 回复评论
router.post('/comments/:id/replies', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const commentId = req.params.id;
        const { content } = req.body;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: '回复内容不能为空' });
        }
        
        if (content.length > 300) {
            return res.status(400).json({ error: '回复内容不能超过300字符' });
        }
        
        // 检查评论是否存在并获取帖子ID
        const [comment] = await connection.execute(
            'SELECT post_id FROM plaza_comments WHERE id = ? AND parent_id IS NULL',
            [commentId]
        );
        
        if (comment.length === 0) {
            return res.status(404).json({ error: '评论不存在' });
        }
        
        // 插入回复
        const [result] = await connection.execute(
            'INSERT INTO plaza_comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
            [comment[0].post_id, userId, content.trim(), commentId]
        );
        
        // 更新帖子评论数
        await connection.execute(
            'UPDATE plaza_posts SET comments_count = comments_count + 1 WHERE id = ?',
            [comment[0].post_id]
        );
        
        res.json({ 
            message: '回复发表成功',
            replyId: result.insertId
        });
    } catch (error) {
        console.error('发表回复错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 切换评论点赞
router.post('/comments/:id/like', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const commentId = req.params.id;
        
        // 检查是否已点赞
        const [existingLike] = await connection.execute(
            'SELECT id FROM plaza_comment_likes WHERE comment_id = ? AND user_id = ?',
            [commentId, userId]
        );
        
        if (existingLike.length > 0) {
            // 取消点赞
            await connection.execute(
                'DELETE FROM plaza_comment_likes WHERE comment_id = ? AND user_id = ?',
                [commentId, userId]
            );
            
            res.json({ message: '已取消点赞', liked: false });
        } else {
            // 添加点赞
            await connection.execute(
                'INSERT INTO plaza_comment_likes (comment_id, user_id) VALUES (?, ?)',
                [commentId, userId]
            );
            
            res.json({ message: '点赞成功', liked: true });
        }
    } catch (error) {
        console.error('切换评论点赞错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 切换回复点赞
router.post('/replies/:id/like', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const replyId = req.params.id;
        
        // 检查是否已点赞
        const [existingLike] = await connection.execute(
            'SELECT id FROM plaza_comment_likes WHERE comment_id = ? AND user_id = ?',
            [replyId, userId]
        );
        
        if (existingLike.length > 0) {
            // 取消点赞
            await connection.execute(
                'DELETE FROM plaza_comment_likes WHERE comment_id = ? AND user_id = ?',
                [replyId, userId]
            );
            
            res.json({ message: '已取消点赞', liked: false });
        } else {
            // 添加点赞
            await connection.execute(
                'INSERT INTO plaza_comment_likes (comment_id, user_id) VALUES (?, ?)',
                [replyId, userId]
            );
            
            res.json({ message: '点赞成功', liked: true });
        }
    } catch (error) {
        console.error('切换回复点赞错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 分享帖子给好友
router.post('/posts/:id/share', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const postId = req.params.id;
        const { friendIds, message } = req.body;
        
        if (!friendIds || friendIds.length === 0) {
            return res.status(400).json({ error: '请选择要分享的好友' });
        }
        
        // 检查帖子是否存在
        const [post] = await connection.execute(
            'SELECT title, author_id FROM plaza_posts WHERE id = ?',
            [postId]
        );
        
        if (post.length === 0) {
            return res.status(404).json({ error: '帖子不存在' });
        }
        
        // 获取分享者信息
        const [sharer] = await connection.execute(
            'SELECT username FROM users WHERE id = ?',
            [userId]
        );
        
        // 为每个好友发送分享消息
        let successCount = 0;
        for (const friendId of friendIds) {
            try {
                // 验证好友关系
                const [friendship] = await connection.execute(`
                    SELECT id FROM friendships 
                    WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
                    AND status = 'accepted'
                `, [userId, friendId, friendId, userId]);
                
                if (friendship.length > 0) {
                    const shareContent = message 
                        ? `${sharer[0].username} 分享了帖子《${post[0].title}》给你：${message}`
                        : `${sharer[0].username} 分享了帖子《${post[0].title}》给你`;
                    
                    await connection.execute(
                        'INSERT INTO messages (sender_id, receiver_id, message_type, content) VALUES (?, ?, ?, ?)',
                        [userId, friendId, 'post_share', shareContent]
                    );
                    
                    successCount++;
                }
            } catch (error) {
                console.error(`分享给好友 ${friendId} 失败:`, error);
            }
        }
        
        if (successCount === 0) {
            return res.status(400).json({ error: '分享失败，请检查好友关系' });
        }
        
        res.json({ 
            message: `成功分享给 ${successCount} 位好友`,
            sharedCount: successCount
        });
    } catch (error) {
        console.error('分享帖子错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 删除帖子
router.delete('/posts/:id', authenticateToken, async (req, res) => {
    try {
        const connection = getConnection();
        const userId = req.user.userId;
        const postId = req.params.id;
        
        // 检查是否是作者
        const [post] = await connection.execute(
            'SELECT author_id, cover_image FROM plaza_posts WHERE id = ?',
            [postId]
        );
        
        if (post.length === 0) {
            return res.status(404).json({ error: '帖子不存在' });
        }
        
        if (post[0].author_id !== userId) {
            return res.status(403).json({ error: '只能删除自己的帖子' });
        }
        
        // 删除封面图片文件
        if (post[0].cover_image) {
            const filePath = path.join(__dirname, '..', 'public', post[0].cover_image);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        // 删除相关数据
        await connection.execute('DELETE FROM plaza_comment_likes WHERE comment_id IN (SELECT id FROM plaza_comments WHERE post_id = ?)', [postId]);
        await connection.execute('DELETE FROM plaza_likes WHERE post_id = ?', [postId]);
        await connection.execute('DELETE FROM plaza_comments WHERE post_id = ?', [postId]);
        await connection.execute('DELETE FROM plaza_posts WHERE id = ?', [postId]);
        
        res.json({ message: '帖子删除成功' });
    } catch (error) {
        console.error('删除帖子错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;