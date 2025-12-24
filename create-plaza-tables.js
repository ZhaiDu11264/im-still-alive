const { getConnection, connectDB } = require('./config/database');

async function createPlazaTables() {
    // 先连接数据库
    await connectDB();
    const connection = getConnection();
    
    try {
        // 创建广场帖子表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS plaza_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                author_id INT NOT NULL,
                title VARCHAR(100) NOT NULL,
                content TEXT NOT NULL,
                cover_image VARCHAR(255),
                tags VARCHAR(255),
                views_count INT DEFAULT 0,
                likes_count INT DEFAULT 0,
                comments_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_author_id (author_id),
                INDEX idx_created_at (created_at),
                INDEX idx_likes_count (likes_count),
                INDEX idx_views_count (views_count)
            )
        `);
        
        // 创建点赞表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS plaza_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES plaza_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_like (post_id, user_id),
                INDEX idx_post_id (post_id),
                INDEX idx_user_id (user_id)
            )
        `);
        
        // 创建评论表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS plaza_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                parent_id INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES plaza_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES plaza_comments(id) ON DELETE CASCADE,
                INDEX idx_post_id (post_id),
                INDEX idx_user_id (user_id),
                INDEX idx_parent_id (parent_id),
                INDEX idx_created_at (created_at)
            )
        `);
        
        // 创建评论点赞表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS plaza_comment_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                comment_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (comment_id) REFERENCES plaza_comments(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_comment_like (comment_id, user_id),
                INDEX idx_comment_id (comment_id),
                INDEX idx_user_id (user_id)
            )
        `);
        
        console.log('广场数据表创建成功！');
        
        // 创建上传目录
        const fs = require('fs');
        const uploadDir = 'public/uploads/covers';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('上传目录创建成功！');
        }
        
    } catch (error) {
        console.error('创建广场数据表失败:', error);
    }
}

// 如果直接运行此文件，则执行创建表操作
if (require.main === module) {
    createPlazaTables().then(() => {
        process.exit(0);
    });
}

module.exports = { createPlazaTables };