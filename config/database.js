const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'im_alive_db',
    charset: 'utf8mb4',
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000
};

let connection;

async function connectDB() {
    try {
        console.log('正在连接数据库...');
        console.log(`连接配置: ${dbConfig.user}@${dbConfig.host}:${dbConfig.database}`);
        
        connection = await mysql.createConnection(dbConfig);
        
        // 测试连接
        await connection.execute('SELECT 1');
        console.log('✅ MySQL数据库连接成功');
        return connection;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n🔧 解决方案:');
            console.log('1. 检查 .env 文件中的数据库用户名和密码');
            console.log('2. 确保MySQL服务正在运行');
            console.log('3. 确认用户有访问数据库的权限');
            console.log('4. 如果是新安装的MySQL，root用户可能没有密码，请设置 DB_PASSWORD=');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n🔧 解决方案:');
            console.log('1. 启动MySQL服务');
            console.log('2. 检查MySQL是否在端口3306运行');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('\n🔧 解决方案:');
            console.log('1. 创建数据库: CREATE DATABASE im_alive_db;');
            console.log('2. 或执行 setup_database.sql 脚本');
        }
        
        throw error;
    }
}

function getConnection() {
    if (!connection) {
        throw new Error('数据库未连接，请先调用 connectDB()');
    }
    return connection;
}

module.exports = { connectDB, getConnection };