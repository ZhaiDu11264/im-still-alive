// 定时任务调度器 - 自动发送打卡提醒
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getTodayString } = require('./utils/helpers');

class ReminderScheduler {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'im_alive_db',
            charset: 'utf8mb4'
        };
        this.isRunning = false;
        this.intervalId = null;
    }

    async connectDB() {
        try {
            this.connection = await mysql.createConnection(this.dbConfig);
            console.log('📡 提醒服务数据库连接成功');
        } catch (error) {
            console.error('❌ 提醒服务数据库连接失败:', error);
            throw error;
        }
    }

    async checkAndSendReminders() {
        try {
            const today = getTodayString();
            const currentTime = new Date().toTimeString().substring(0, 5); // HH:MM 格式
            
            console.log(`🔍 检查提醒 - 当前时间: ${currentTime}, 日期: ${today}`);
            
            // 获取需要提醒且今天还没打卡的用户
            const [users] = await this.connection.execute(`
                SELECT u.id, u.username, u.reminder_time
                FROM users u
                LEFT JOIN check_ins c ON u.id = c.user_id AND c.check_date = ?
                WHERE u.notification_enabled = TRUE 
                AND u.do_not_disturb = FALSE
                AND c.id IS NULL
            `, [today]);
            
            let remindersSent = 0;
            
            // 检查每个用户的提醒时间
            for (const user of users) {
                const reminderTime = user.reminder_time.substring(0, 5);
                
                // 如果当前时间已过提醒时间，且在合理范围内（避免重复发送）
                if (currentTime >= reminderTime && currentTime <= this.addMinutes(reminderTime, 5)) {
                    // 检查今天是否已经发送过提醒
                    const [existingReminder] = await this.connection.execute(`
                        SELECT id FROM messages 
                        WHERE receiver_id = ? 
                        AND message_type = 'reminder' 
                        AND DATE(created_at) = ?
                    `, [user.id, today]);
                    
                    if (existingReminder.length === 0) {
                        // 发送提醒消息
                        await this.connection.execute(
                            'INSERT INTO messages (sender_id, receiver_id, message_type, content) VALUES (?, ?, ?, ?)',
                            [1, user.id, 'reminder', '⏰ 别忘了今天的打卡哦！坚持就是胜利！']
                        );
                        
                        remindersSent++;
                        console.log(`📨 已向用户 ${user.username} 发送提醒 (设定时间: ${reminderTime})`);
                    }
                }
            }
            
            if (remindersSent > 0) {
                console.log(`✅ 本次检查发送了 ${remindersSent} 条提醒消息`);
            }
            
        } catch (error) {
            console.error('❌ 检查提醒时出错:', error);
        }
    }

    // 辅助函数：给时间字符串添加分钟
    addMinutes(timeStr, minutes) {
        const [hours, mins] = timeStr.split(':').map(Number);
        const totalMinutes = hours * 60 + mins + minutes;
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMins = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
    }

    start() {
        if (this.isRunning) {
            console.log('⚠️  提醒服务已在运行中');
            return;
        }

        console.log('🚀 启动打卡提醒服务...');
        this.isRunning = true;
        
        // 每分钟检查一次
        this.intervalId = setInterval(() => {
            this.checkAndSendReminders();
        }, 60000); // 60秒
        
        // 立即执行一次检查
        this.checkAndSendReminders();
        
        console.log('✅ 提醒服务已启动，每分钟检查一次');
    }

    stop() {
        if (!this.isRunning) {
            console.log('⚠️  提醒服务未在运行');
            return;
        }

        console.log('🛑 停止提醒服务...');
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        if (this.connection) {
            this.connection.end();
        }
        
        console.log('✅ 提醒服务已停止');
    }

    // 手动触发提醒检查（用于测试）
    async manualCheck() {
        console.log('🔧 手动触发提醒检查...');
        await this.checkAndSendReminders();
    }
}

// 如果直接运行此文件，启动提醒服务
if (require.main === module) {
    const scheduler = new ReminderScheduler();
    
    async function startService() {
        try {
            await scheduler.connectDB();
            scheduler.start();
            
            // 优雅关闭
            process.on('SIGINT', () => {
                console.log('\n📴 收到关闭信号，正在停止提醒服务...');
                scheduler.stop();
                process.exit(0);
            });
            
        } catch (error) {
            console.error('❌ 启动提醒服务失败:', error);
            process.exit(1);
        }
    }
    
    startService();
}

module.exports = ReminderScheduler;