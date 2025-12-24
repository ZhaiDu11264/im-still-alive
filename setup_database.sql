-- 设置数据库脚本
-- 请在MySQL Workbench或其他MySQL客户端中执行此脚本

-- 1. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS im_alive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 使用数据库
USE im_alive_db;

-- 3. 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    birthday DATE,
    region VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notification_enabled BOOLEAN DEFAULT TRUE,
    do_not_disturb BOOLEAN DEFAULT FALSE
);

-- 4. 创建打卡记录表
CREATE TABLE IF NOT EXISTS check_ins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    check_date DATE NOT NULL,
    mood VARCHAR(20),
    check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, check_date)
);

-- 5. 创建成就表
CREATE TABLE IF NOT EXISTS achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    required_days INT NOT NULL,
    icon VARCHAR(50)
);

-- 6. 创建用户成就表
CREATE TABLE IF NOT EXISTS user_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id)
);

-- 7. 创建好友关系表
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
);

-- 8. 创建消息表
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
);

-- 9. 插入默认成就数据
INSERT IGNORE INTO achievements (name, description, required_days, icon) VALUES
('新手上路', '完成第一次打卡', 1, '🎯'),
('坚持一周', '连续打卡7天', 7, '📅'),
('月度达人', '连续打卡30天', 30, '🏆'),
('季度英雄', '连续打卡90天', 90, '👑'),
('半年勇士', '连续打卡180天', 180, '⭐'),
('年度传奇', '连续打卡365天', 365, '💎'),
('不朽之魂', '连续打卡1000天', 1000, '🔥');

-- 完成提示
SELECT '数据库设置完成！' as message;