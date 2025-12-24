// 共享工具函数

// 计算用户存活天数的函数
async function calculateSurviveDays(userId, connection) {
    const [checkins] = await connection.execute(
        'SELECT check_date FROM check_ins WHERE user_id = ? ORDER BY check_date DESC',
        [userId]
    );
    
    if (checkins.length === 0) {
        return 0;
    }
    
    const dates = checkins.map(c => {
        const date = new Date(c.check_date);
        // 确保时间为当天的开始时间，避免时区问题
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    });
    
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // 获取最新的打卡日期
    const latestCheckinDate = dates[0];
    
    // 计算最新打卡日期到今天的天数差
    const daysDiff = Math.floor((todayDate.getTime() - latestCheckinDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // 如果最新打卡超过1天前，说明连续打卡已中断
    if (daysDiff > 1) {
        return 0;
    }
    
    let surviveDays = 0;
    
    // 从最新打卡日期开始往前计算连续天数
    for (let i = 0; i < dates.length; i++) {
        const expectedDate = new Date(latestCheckinDate);
        expectedDate.setDate(latestCheckinDate.getDate() - i);
        
        // 检查是否有对应日期的打卡记录
        const hasCheckin = dates.some(date => date.getTime() === expectedDate.getTime());
        
        if (hasCheckin) {
            surviveDays++;
        } else {
            break;
        }
    }
    
    return surviveDays;
}

// 格式化日期为 YYYY-MM-DD 格式（使用本地时区）
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 获取今天的日期字符串
function getTodayString() {
    return formatDate(new Date());
}

module.exports = {
    calculateSurviveDays,
    formatDate,
    getTodayString
};