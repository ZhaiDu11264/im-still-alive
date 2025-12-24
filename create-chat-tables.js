const mysql = require('mysql2/promise');
require('dotenv').config();

async function createChatTables() {
    let connection;

    try {
        // 创建数据库连接
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('已连接到数据库');

        // 创建会话表
        console.log('\n创建 conversations 表...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS conversations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user1_id INT NOT NULL,
                user2_id INT NOT NULL,
                last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_conversation (user1_id, user2_id),
                INDEX idx_last_message (last_message_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ conversations 表创建成功');

        // 创建聊天消息表
        console.log('\n创建 chat_messages 表...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                conversation_id INT NOT NULL,
                sender_id INT NOT NULL,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_conversation (conversation_id, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ chat_messages 表创建成功');

        // 验证表是否创建成功
        console.log('\n验证表结构...');
        const [tables] = await connection.execute(`
            SHOW TABLES LIKE 'conversations'
        `);

        if (tables.length > 0) {
            const [columns] = await connection.execute(`
                DESCRIBE conversations
            `);
            console.log('\nconversations 表结构：');
            columns.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''}`);
            });
        }

        const [chatTables] = await connection.execute(`
            SHOW TABLES LIKE 'chat_messages'
        `);

        if (chatTables.length > 0) {
            const [chatColumns] = await connection.execute(`
                DESCRIBE chat_messages
            `);
            console.log('\nchat_messages 表结构：');
            chatColumns.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''}`);
            });
        }

        console.log('\n✅ 聊天系统数据库表创建完成！');

    } catch (error) {
        console.error('❌ 创建表失败:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n数据库连接已关闭');
        }
    }
}

// 执行创建
createChatTables();
