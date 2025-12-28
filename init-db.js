// 数据库初始化脚本
require('dotenv').config();
const mysql = require('mysql2/promise');

async function initDatabase() {
    const dbName = process.env.DB_NAME || 'im_alive_db';
    const baseConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        charset: 'utf8mb4'
    };
    const config = {
        ...baseConfig,
        database: dbName
    };

    console.log('🚀 开始初始化数据库...');

    try {
        const bootstrapConnection = await mysql.createConnection(baseConfig);
        await bootstrapConnection.execute(
            `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        await bootstrapConnection.end();
        console.log(`✅ 数据库 ${dbName} 已准备`);

        const connection = await mysql.createConnection(config);
        console.log('✅ 连接到数据库');

        // 创建用户表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                birthday DATE,
                region VARCHAR(100) NOT NULL,
                avatar VARCHAR(50) DEFAULT '👤',
                tutorial_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notification_enabled BOOLEAN DEFAULT TRUE,
                do_not_disturb BOOLEAN DEFAULT FALSE,
                reminder_time TIME DEFAULT '09:00:00',
                theme VARCHAR(20) DEFAULT 'light'
            )
        `);
        console.log('✅ 用户表创建完成');

        // 兼容已有数据库：补上新增字段
        const [themeColumns] = await connection.execute(
            'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [dbName, 'users', 'theme']
        );
        if (themeColumns.length === 0) {
            await connection.execute(
                "ALTER TABLE users ADD COLUMN theme VARCHAR(20) DEFAULT 'light'"
            );
            console.log('✅ users.theme 字段已补充');
        }

        // 创建打卡记录表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS check_ins (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                check_date DATE NOT NULL,
                mood VARCHAR(20),
                check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_date (user_id, check_date)
            )
        `);
        console.log('✅ 打卡记录表创建完成');

        // 创建成就表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS achievements (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                required_days INT NOT NULL,
                icon VARCHAR(50)
            )
        `);
        console.log('✅ 成就表创建完成');

        // 创建用户成就表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                achievement_id INT NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_achievement (user_id, achievement_id)
            )
        `);
        console.log('✅ 用户成就表创建完成');

        // 创建好友关系表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS friendships (
                id INT PRIMARY KEY AUTO_INCREMENT,
                requester_id INT NOT NULL,
                addressee_id INT NOT NULL,
                status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_friendship (requester_id, addressee_id)
            )
        `);
        console.log('✅ 好友关系表创建完成');

        // 创建消息表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                message_type ENUM('friend_request', 'system', 'reminder') DEFAULT 'system',
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ 消息表创建完成');

        // 插入默认成就数据
        const achievements = [
            ['新手上路', '完成第一次打卡', 1, '🎯'],
            ['坚持一周', '连续打卡7天', 7, '📅'],
            ['月度达人', '连续打卡30天', 30, '🏆'],
            ['季度英雄', '连续打卡90天', 90, '👑'],
            ['半年勇士', '连续打卡180天', 180, '⭐'],
            ['年度传奇', '连续打卡365天', 365, '💎'],
            ['不朽之魂', '连续打卡1000天', 1000, '🔥']
        ];

        for (const [name, description, required_days, icon] of achievements) {
            await connection.execute(
                'INSERT IGNORE INTO achievements (name, description, required_days, icon) VALUES (?, ?, ?, ?)',
                [name, description, required_days, icon]
            );
        }
        console.log('✅ 默认成就数据插入完成');

        // 检查表数量
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📊 数据库中共有 ${tables.length} 个表`);

        await connection.end();
        console.log('🎉 数据库初始化完成！');

    } catch (error) {
        console.error('❌ 初始化失败:', error.message);
        process.exit(1);
    }
}

initDatabase();
