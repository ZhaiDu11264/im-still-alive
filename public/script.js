// 全局变量
let currentUser = null;
let token = localStorage.getItem('token');
let unreadMessageChecker = null; // 未读消息检查器

// API 基础URL
const API_BASE = '/api';

// 页面初始化
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
});

// 初始化应用
function initializeApp() {
    if (token) {
        showMainApp();
        loadUserData();
        // 启动定期检查未读消息
        startUnreadMessageChecker();
        // 初始化时更新未读徽章
        if (typeof updateTotalUnreadBadge === 'function') {
            updateTotalUnreadBadge();
        }
    } else {
        showAuthPage();
    }
}

// 启动定期检查未读消息
function startUnreadMessageChecker() {
    // 如果已经启动过，先清除旧的检查器
    if (unreadMessageChecker) {
        clearInterval(unreadMessageChecker);
        unreadMessageChecker = null;
    }

    // 立即检查一次
    if (typeof updateTotalUnreadBadge === 'function') {
        updateTotalUnreadBadge();
    }

    // 每15秒检查一次未读消息（更频繁的检查）
    unreadMessageChecker = setInterval(() => {
        if (token && typeof updateTotalUnreadBadge === 'function') {
            updateTotalUnreadBadge();
            // 如果当前在消息页面，也更新会话列表
            const messagesPage = document.getElementById('messages-page');
            if (messagesPage && messagesPage.classList.contains('active')) {
                const conversationsView = document.getElementById('conversations-view');
                if (conversationsView && conversationsView.classList.contains('active')) {
                    loadConversations();
                }
            }
        }
    }, 15000); // 15秒
}

// 设置事件监听器
function setupEventListeners() {
    // 登录表单
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // 注册表单
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // 打卡按钮
    document.getElementById('checkin-btn').addEventListener('click', handleCheckin);

    // 心情选择
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            selectMood(this.dataset.mood);
        });
    });

    // 添加好友按钮
    document.getElementById('add-friend-btn').addEventListener('click', showAddFriendModal);

    // 设置按钮
    document.getElementById('settings-btn').addEventListener('click', showSettingsModal);

    // 头像点击事件
    document.getElementById('profile-avatar').addEventListener('click', showAvatarSelector);

    // 登录用户名输入事件（预览头像）
    document.getElementById('login-username').addEventListener('input', previewUserAvatar);

    // 注册用户名输入事件（预览头像）
    document.getElementById('register-username').addEventListener('input', previewRegisterAvatar);

    // 国家选择事件（加载州/省列表）
    document.getElementById('register-country').addEventListener('change', handleCountryChange);

    // 教程引导事件
    document.getElementById('tutorial-next').addEventListener('click', nextTutorialStep);
    document.getElementById('tutorial-skip').addEventListener('click', skipTutorial);

    // 模态框关闭
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function (event) {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // 加载国家列表
    loadCountries();
}

// 显示登录页面
function showAuthPage() {
    document.getElementById('auth-page').classList.add('active');
    document.getElementById('main-app').classList.remove('active');
}

// 显示主应用
function showMainApp() {
    document.getElementById('auth-page').classList.remove('active');
    document.getElementById('main-app').classList.add('active');
}

// 切换登录/注册表单
function showLogin() {
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegister() {
    document.querySelector('.tab-btn.active').classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    // 确保国家列表已加载
    if (document.getElementById('register-country').options.length <= 1) {
        loadCountries();
    }
}

// 加载国家列表
async function loadCountries() {
    try {
        const response = await fetch(`${API_BASE}/location/countries`);
        const countries = await response.json();

        const countrySelect = document.getElementById('register-country');
        countrySelect.innerHTML = '<option value="">选择国家</option>';

        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            option.dataset.name = country.name;
            countrySelect.appendChild(option);
        });
    } catch (error) {
        console.error('加载国家列表失败:', error);
        showMessage('加载国家列表失败', 'error');
    }
}

// 处理国家选择变化
async function handleCountryChange() {
    const countrySelect = document.getElementById('register-country');
    const stateSelect = document.getElementById('register-state');
    const countryCode = countrySelect.value;

    if (!countryCode) {
        stateSelect.disabled = true;
        stateSelect.innerHTML = '<option value="">请先选择国家</option>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/location/states/${countryCode}`);
        const states = await response.json();

        stateSelect.innerHTML = '<option value="">选择州/省</option>';

        if (states.length === 0) {
            stateSelect.innerHTML = '<option value="">该国家暂无州/省数据</option>';
            stateSelect.disabled = true;
        } else {
            states.forEach(state => {
                const option = document.createElement('option');
                option.value = state.code;
                option.textContent = state.name;
                option.dataset.name = state.name;
                stateSelect.appendChild(option);
            });
            stateSelect.disabled = false;
        }
    } catch (error) {
        console.error('加载州/省列表失败:', error);
        showMessage('加载州/省列表失败', 'error');
    }
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            showMainApp();
            loadUserData();
            // 启动定期检查未读消息
            startUnreadMessageChecker();
            showMessage('登录成功！', 'success');
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const birthday = document.getElementById('register-birthday').value;

    // 获取国家和州/省信息
    const countrySelect = document.getElementById('register-country');
    const stateSelect = document.getElementById('register-state');

    const countryCode = countrySelect.value;
    const stateCode = stateSelect.value;

    if (!countryCode || !stateCode) {
        showMessage('请选择完整的地区信息', 'error');
        return;
    }

    // 获取国家和州/省的名称
    const countryName = countrySelect.options[countrySelect.selectedIndex].dataset.name;
    const stateName = stateSelect.options[stateSelect.selectedIndex].dataset.name;

    // 组合地区信息：国家 - 州/省
    const region = `${countryName} - ${stateName}`;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, birthday, region })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('注册成功！请登录', 'success');
            showLogin();
            document.getElementById('register-form').reset();
            // 重置州/省选择器
            document.getElementById('register-state').disabled = true;
            document.getElementById('register-state').innerHTML = '<option value="">请先选择国家</option>';
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 加载用户数据
async function loadUserData() {
    await loadCheckinStatus();
    const profileData = await loadProfile();
    await loadMessages();
    // 使用正确的函数更新未读徽章
    if (typeof updateTotalUnreadBadge === 'function') {
        await updateTotalUnreadBadge();
    }
    showPage('home');

    // 检查是否需要显示新手引导
    if (profileData && !profileData.user.tutorial_completed) {
        setTimeout(() => {
            startTutorial();
        }, 1000); // 延迟1秒显示，让用户先看到界面
    }
}

// 加载打卡状态
async function loadCheckinStatus() {
    try {
        const response = await fetch(`${API_BASE}/checkin/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            updateCheckinUI(data);
        }
    } catch (error) {
        console.error('加载打卡状态失败:', error);
    }
}

// 更新打卡UI
function updateCheckinUI(data) {
    console.log('更新打卡UI数据:', data); // 调试信息
    document.getElementById('survive-days').textContent = data.surviveDays;

    const checkinBtn = document.getElementById('checkin-btn');
    const moodSelector = document.getElementById('mood-selector');
    const achievementSection = document.getElementById('achievement-section');
    const todayMood = document.getElementById('today-mood');

    if (data.hasCheckedToday) {
        checkinBtn.disabled = true;
        checkinBtn.innerHTML = '<span class="checkin-text">已存活</span>';
        moodSelector.classList.add('hidden');

        if (data.todayMood) {
            todayMood.innerHTML = `
                <h4>今日心情</h4>
                <div style="font-size: 2rem; margin-top: 10px;">${data.todayMood}</div>
                <div style="color: #666; margin-top: 5px;">打卡时间: ${new Date(data.checkTime).toLocaleTimeString()}</div>
            `;
            todayMood.classList.remove('hidden');
        }
    } else {
        checkinBtn.disabled = false;
        checkinBtn.innerHTML = '<span class="checkin-text">今日打卡</span>';
        todayMood.classList.add('hidden');
    }

    // 显示成就里程碑和进度（不显示恭喜信息，只显示进度）
    displayAchievementProgress(data.surviveDays, null);
}

// 显示成就进度
function displayAchievementProgress(surviveDays, newlyUnlockedAchievement) {
    const achievementSection = document.getElementById('achievement-section');

    // 成就里程碑定义
    const milestones = [
        { days: 1, name: '新手上路', icon: '🎯', description: '完成第一次存活·' },
        { days: 7, name: '坚持一周', icon: '📅', description: '连续存活7天' },
        { days: 30, name: '月度达人', icon: '🏆', description: '连续存活30天' },
        { days: 90, name: '季度英雄', icon: '👑', description: '连续存活90天' },
        { days: 180, name: '半年勇士', icon: '⭐', description: '连续存活180天' },
        { days: 365, name: '年度传奇', icon: '💎', description: '连续存活365天' },
        { days: 1000, name: '不朽之魂', icon: '🔥', description: '连续存活1000天' }
    ];

    // 找到当前已完成的最高成就
    const completedMilestones = milestones.filter(m => m.days <= surviveDays);
    const currentMilestone = completedMilestones[completedMilestones.length - 1];

    // 找到下一个目标
    const nextMilestone = milestones.find(m => m.days > surviveDays);

    let html = '';

    if (surviveDays === 0) {
        // 还没开始打卡
        html = `
            <h4>🎯 开始你的打卡之旅</h4>
            <div style="text-align: center; margin-top: 15px;">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🚀</div>
                <div style="color: #666;">点击打卡按钮开始记录你的存活天数</div>
                <div style="color: #667eea; margin-top: 10px; font-weight: bold;">第一个成就：${milestones[0].icon} ${milestones[0].name}</div>
            </div>
        `;
    } else if (newlyUnlockedAchievement) {
        // 只有在传入新解锁成就时才显示庆祝信息
        html = `
            <h4>🎉 恭喜解锁新成就！</h4>
            <div style="text-align: center; margin-top: 15px;">
                <div style="font-size: 3rem; margin-bottom: 10px;">${newlyUnlockedAchievement.icon}</div>
                <div style="font-weight: bold; font-size: 1.2rem; color: #667eea;">${newlyUnlockedAchievement.name}</div>
                <div style="color: #666; margin-top: 5px;">${newlyUnlockedAchievement.description}</div>
            </div>
        `;

        // 如果还有下一个目标，也显示
        if (nextMilestone) {
            const progress = ((surviveDays - currentMilestone.days) / (nextMilestone.days - currentMilestone.days)) * 100;
            const remaining = nextMilestone.days - surviveDays;

            html += `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f0f0f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-weight: bold;">下一个目标</span>
                        <span style="color: #667eea;">${nextMilestone.icon} ${nextMilestone.name}</span>
                    </div>
                    <div style="background: #f0f0f0; border-radius: 10px; height: 20px; overflow: hidden; margin-bottom: 8px;">
                        <div style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #666;">
                        <span>已坚持 ${surviveDays} 天</span>
                        <span>还需 ${remaining} 天</span>
                    </div>
                </div>
            `;
        }
    } else if (nextMilestone) {
        // 显示进度和下一个目标（正常状态，不显示恭喜信息）
        const prevMilestone = currentMilestone || { days: 0 };
        const progress = ((surviveDays - prevMilestone.days) / (nextMilestone.days - prevMilestone.days)) * 100;
        const remaining = nextMilestone.days - surviveDays;

        html = `
            <h4>📊 打卡进度</h4>
            <div style="margin-top: 15px;">
                ${currentMilestone ? `
                    <div style="text-align: center; margin-bottom: 15px;">
                        <div style="font-size: 2rem;">${currentMilestone.icon}</div>
                        <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">当前成就：${currentMilestone.name}</div>
                    </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: bold; color: #667eea;">下一个目标</span>
                    <span style="font-size: 1.1rem;">${nextMilestone.icon} ${nextMilestone.name}</span>
                </div>
                
                <div style="background: #f0f0f0; border-radius: 10px; height: 24px; overflow: hidden; margin-bottom: 8px; position: relative;">
                    <div style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.85rem; font-weight: bold; color: ${progress > 50 ? 'white' : '#333'};">
                        ${Math.round(progress)}%
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #666;">
                    <span>已坚持 ${surviveDays} 天</span>
                    <span>目标 ${nextMilestone.days} 天</span>
                </div>
                
                <div style="text-align: center; margin-top: 12px; padding: 10px; background: #f8f9ff; border-radius: 8px;">
                    <span style="color: #667eea; font-weight: bold;">还需打卡 ${remaining} 天</span>
                </div>
            </div>
        `;
    } else {
        // 已完成所有成就
        html = `
            <h4>👑 传奇成就</h4>
            <div style="text-align: center; margin-top: 15px;">
                <div style="font-size: 3rem; margin-bottom: 10px;">🏆</div>
                <div style="font-weight: bold; font-size: 1.2rem; color: #667eea;">恭喜！你已完成所有成就</div>
                <div style="color: #666; margin-top: 10px;">已连续打卡 ${surviveDays} 天</div>
                <div style="color: #666; margin-top: 5px;">继续保持，创造属于你的传奇！</div>
            </div>
        `;
    }

    achievementSection.innerHTML = html;
    achievementSection.classList.remove('hidden');
}

// 处理打卡
async function handleCheckin() {
    const moodSelector = document.getElementById('mood-selector');

    if (moodSelector.classList.contains('hidden')) {
        moodSelector.classList.remove('hidden');
    }
}

// 选择心情并打卡
async function selectMood(mood) {
    try {
        const response = await fetch(`${API_BASE}/checkin/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ mood })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('打卡响应数据:', data); // 调试信息
            
            // 显示打卡成功动画
            showCheckinSuccessAnimation(mood, data.surviveDays);
            
            // 延迟显示消息，让动画先播放
            setTimeout(() => {
                showMessage('打卡成功！', 'success');
            }, 1000);

            // 隐藏心情选择器
            document.getElementById('mood-selector').classList.add('hidden');

            // 如果解锁了新成就，显示成就弹窗和成就区域的恭喜信息
            if (data.newAchievement) {
                console.log('解锁新成就:', data.newAchievement); // 调试信息
                
                // 延迟显示成就弹窗，让打卡动画先完成
                setTimeout(() => {
                    showAchievementModal(data.newAchievement);
                }, 2000);
                
                // 更新UI，显示新解锁的成就
                setTimeout(() => {
                    document.getElementById('survive-days').textContent = data.surviveDays;
                    displayAchievementProgress(data.surviveDays, data.newAchievement);
                    
                    // 更新打卡按钮状态
                    const checkinBtn = document.getElementById('checkin-btn');
                    checkinBtn.disabled = true;
                    checkinBtn.innerHTML = '<span class="checkin-text">已存活</span>';
                    
                    // 显示今日心情
                    const todayMood = document.getElementById('today-mood');
                    todayMood.innerHTML = `
                        <h4>今日心情</h4>
                        <div style="font-size: 2rem; margin-top: 10px;">${mood}</div>
                        <div style="color: #666; margin-top: 5px;">打卡时间: ${new Date().toLocaleTimeString()}</div>
                    `;
                    todayMood.classList.remove('hidden');
                }, 1500);
            } else {
                // 没有新成就，延迟刷新状态
                setTimeout(async () => {
                    await loadCheckinStatus();
                }, 1500);
            }
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 显示页面
function showPage(pageName) {
    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="showPage('${pageName}')"]`).classList.add('active');

    // 更新页面内容
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageName}-page`).classList.add('active');

    // 更新页面标题
    const titles = {
        'home': '我还活着',
        'ranking': '存活排行榜',
        'plaza': '存活广场',
        'messages': '消息',
        'profile': '我的'
    };
    document.getElementById('page-title').textContent = titles[pageName];

    // 加载页面数据
    if (pageName === 'ranking') {
        showRanking('friends');
    } else if (pageName === 'messages') {
        loadMessages();
        // 立即更新未读徽章，但不自动标记为已读
        updateTotalUnreadBadge();
        // 隐藏浮动提醒按钮
        updateFloatingRemindButton('messages', 0);
    } else if (pageName === 'profile') {
        loadProfile();
        loadCalendar();
        setupCalendarNavigation(); // 设置日历导航
        // 隐藏浮动提醒按钮
        updateFloatingRemindButton('profile', 0);
    } else {
        // 其他页面也隐藏浮动提醒按钮
        updateFloatingRemindButton('other', 0);
    }
}

// 显示排行榜
async function showRanking(type) {
    // 更新标签状态
    document.querySelectorAll('.ranking-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[onclick="showRanking('${type}')"]`).classList.add('active');

    try {
        const response = await fetch(`${API_BASE}/ranking/${type}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayRanking(data, type);

            // 如果是好友页面，检查批量提醒冷却状态
            if (type === 'friends') {
                checkBatchRemindCooldown();
            }
        }
    } catch (error) {
        console.error('加载排行榜失败:', error);
    }
}

// 检查批量提醒冷却状态
async function checkBatchRemindCooldown() {
    try {
        const response = await fetch(`${API_BASE}/messages/batch-remind-cooldown`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok && data.isOnCooldown) {
            const floatingRemindBtn = document.getElementById('floating-remind-btn');
            if (floatingRemindBtn.classList.contains('show') && !floatingRemindBtn.disabled) {
                // 如果按钮当前是可用状态，但批量提醒在冷却中，则禁用按钮
                floatingRemindBtn.classList.add('disabled');
                floatingRemindBtn.disabled = true;
                floatingRemindBtn.classList.remove('pulse');

                // 更新按钮标题显示剩余时间
                floatingRemindBtn.title = `批量提醒冷却中，还需 ${data.remainingTime} 分钟`;
            }
        }
    } catch (error) {
        console.error('检查批量提醒冷却状态失败:', error);
    }
}

// 显示排行榜数据
function displayRanking(data, type) {
    console.log(`显示${type}排行榜数据:`, data); // 调试信息

    const rankingList = document.getElementById('ranking-list');
    const floatingRemindBtn = document.getElementById('floating-remind-btn');
    const remindBadge = document.getElementById('remind-badge');

    let html = '';

    const rankings = type === 'region' ? data.ranking : data;

    // 统计未打卡的好友数量（用于浮动提醒按钮）
    let uncheckedFriendsCount = 0;
    let availableFriendsCount = 0;
    if (type === 'friends') {
        uncheckedFriendsCount = rankings.filter(item => !item.isMe && item.hasCheckedToday === false).length;
        availableFriendsCount = rankings.filter(item => !item.isMe && item.hasCheckedToday === false && !item.isOnCooldown).length;
    }

    // 显示或隐藏浮动提醒按钮
    updateFloatingRemindButton(type, uncheckedFriendsCount, availableFriendsCount);

    rankings.forEach((item, index) => {
        // 为好友排行榜添加提醒按钮
        let actionButton = '';
        if (type === 'friends' && !item.isMe && item.hasCheckedToday === false) {
            if (item.isOnCooldown) {
                // 冷却中的灰色按钮
                actionButton = `
                    <button class="remind-btn cooldown" disabled title="1小时内已提醒过">
                        ⏰
                    </button>
                `;
            } else {
                // 可用的橙色按钮
                actionButton = `
                    <button class="remind-btn" onclick="remindFriendCheckin(${item.userId}, '${item.username}')" 
                            title="提醒打卡">
                        📢
                    </button>
                `;
            }
        }

        // 为好友添加聊天按钮
        let chatButton = '';
        if (type === 'friends' && !item.isMe) {
            chatButton = `
                <button class="chat-btn" onclick="openConversationFromRanking(${item.userId}, '${item.username}', '${item.avatar || '👤'}')" 
                        title="发消息">
                    💬
                </button>
            `;
        }

        // 显示打卡状态
        let checkinStatus = '';
        if (type === 'friends' && item.hasCheckedToday !== undefined) {
            checkinStatus = item.hasCheckedToday
                ? '<span class="checkin-status checked">✅ 已打卡</span>'
                : '<span class="checkin-status unchecked">⏰ 未打卡</span>';
        }

        html += `
            <div class="ranking-item ${item.isMe ? 'me' : ''} ${type === 'friends' && !item.hasCheckedToday ? 'unchecked' : ''}">
                <div class="ranking-number">${index + 1}</div>
                <div class="ranking-user-info">
                    <div class="ranking-avatar">${item.avatar || '👤'}</div>
                    <div class="ranking-info">
                        <div>${item.username}${item.isMe ? ' (我)' : ''}</div>
                        <div class="ranking-days">存活 ${item.surviveDays} 天</div>
                        ${type === 'national' ? `<div class="ranking-days">${item.region}</div>` : ''}
                        ${checkinStatus}
                    </div>
                </div>
                <div class="ranking-actions">
                    ${chatButton}
                    ${actionButton}
                </div>
            </div>
        `;
    });

    if (type === 'region' && data.region) {
        html = `<div style="text-align: center; padding: 15px; background: #f8f9ff; font-weight: bold;">${data.region} 地区排行榜</div>` + html;
    }

    rankingList.innerHTML = html;
}

// 更新未读消息徽章
async function updateUnreadBadge() {
    try {
        const response = await fetch(`${API_BASE}/messages/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            const badge = document.getElementById('unread-badge');
            const unreadCount = data.unreadCount;

            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('更新未读徽章失败:', error);
    }
}

// 加载消息
async function loadMessages() {
    try {
        const response = await fetch(`${API_BASE}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayMessages(data);
            // 加载消息后更新徽章，但不自动标记为已读
            await updateTotalUnreadBadge();
        }
    } catch (error) {
        console.error('加载消息失败:', error);
    }
}

// 显示消息列表
function displayMessages(messages) {
    const messagesList = document.getElementById('messages-list');
    let html = '';

    if (messages.length === 0) {
        html = '<div style="text-align: center; padding: 40px; color: #999;">暂无消息</div>';
    } else {
        messages.forEach(message => {
            let actionButtons = '';

            // 如果是好友申请消息，添加接受/拒绝按钮
            if (message.message_type === 'friend_request' && message.friendship_status === 'pending') {
                // 只有当好友关系状态为 pending 时才显示操作按钮
                actionButtons = `
                    <div style="margin-top: 10px;">
                        <button onclick="handleFriendRequest('accept', ${message.sender_id}, ${message.id})" 
                                style="padding: 5px 15px; margin-right: 10px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            接受
                        </button>
                        <button onclick="handleFriendRequest('reject', ${message.sender_id}, ${message.id})" 
                                style="padding: 5px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            拒绝
                        </button>
                    </div>
                `;
            }

            // 添加标记已读按钮，只有未读消息才显示
            let markReadButton = '';
            if (!message.is_read) {
                markReadButton = `
                    <button onclick="markAsRead(${message.id}); event.stopPropagation();" 
                            style="padding: 3px 8px; margin-left: 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
                        标记已读
                    </button>
                `;
            }

            html += `
                <div class="message-item ${!message.is_read ? 'unread' : ''}">
                    <div style="font-weight: bold;">
                        ${message.sender_username || '系统'}
                        ${markReadButton}
                    </div>
                    <div class="message-content">${message.content}</div>
                    <div class="message-time">${new Date(message.created_at).toLocaleString()}</div>
                    ${actionButtons}
                </div>
            `;
        });
    }

    messagesList.innerHTML = html;
}

// 标记消息为已读
async function markAsRead(messageId) {
    try {
        await fetch(`${API_BASE}/messages/${messageId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        loadMessages();
        // 标记已读后立即更新徽章
        await updateTotalUnreadBadge();
    } catch (error) {
        console.error('标记消息已读失败:', error);
    }
}

// 更新浮动提醒按钮状态
function updateFloatingRemindButton(pageType, uncheckedCount, availableCount = null) {
    const floatingRemindBtn = document.getElementById('floating-remind-btn');
    const remindBadge = document.getElementById('remind-badge');

    console.log('更新浮动按钮状态:', { pageType, uncheckedCount, availableCount }); // 调试信息

    if (pageType === 'friends') {
        floatingRemindBtn.classList.add('show');

        // 如果没有提供availableCount，则假设所有未打卡好友都可以提醒
        const actualAvailableCount = availableCount !== null ? availableCount : uncheckedCount;

        if (actualAvailableCount > 0) {
            // 有可提醒的好友 - 显示橙色可用按钮
            console.log('设置按钮为可用状态');
            floatingRemindBtn.classList.add('pulse');
            floatingRemindBtn.classList.remove('disabled');
            floatingRemindBtn.disabled = false;
            remindBadge.textContent = actualAvailableCount > 99 ? '99+' : actualAvailableCount.toString();
            remindBadge.classList.remove('hidden');
        } else if (uncheckedCount > 0) {
            // 有未打卡好友但都在冷却中 - 显示灰色不可用按钮
            console.log('设置按钮为冷却状态（灰色）');
            floatingRemindBtn.classList.remove('pulse');
            floatingRemindBtn.classList.add('disabled');
            floatingRemindBtn.disabled = true;
            remindBadge.textContent = uncheckedCount > 99 ? '99+' : uncheckedCount.toString();
            remindBadge.classList.remove('hidden');
        } else {
            // 没有未打卡好友 - 显示灰色不可用按钮
            console.log('设置按钮为无好友状态（灰色）');
            floatingRemindBtn.classList.remove('pulse');
            floatingRemindBtn.classList.add('disabled');
            floatingRemindBtn.disabled = true;
            remindBadge.textContent = '0';
            remindBadge.classList.remove('hidden');
        }
    } else {
        // 非好友页面 - 完全隐藏按钮
        console.log('隐藏浮动按钮');
        floatingRemindBtn.classList.remove('show');
        floatingRemindBtn.classList.remove('pulse');
        floatingRemindBtn.classList.remove('disabled');
        remindBadge.classList.add('hidden');
        floatingRemindBtn.disabled = false; // 重置状态
    }
}

// 批量提醒所有未打卡好友
async function batchRemindFriends() {
    const floatingRemindBtn = document.getElementById('floating-remind-btn');

    // 如果按钮已禁用，则不执行操作
    if (floatingRemindBtn.disabled || floatingRemindBtn.classList.contains('disabled')) {
        return;
    }

    const originalIcon = floatingRemindBtn.querySelector('.remind-icon').textContent;

    // 显示加载状态
    floatingRemindBtn.classList.add('disabled');
    floatingRemindBtn.disabled = true;
    floatingRemindBtn.classList.remove('pulse');
    floatingRemindBtn.querySelector('.remind-icon').textContent = '⏳';

    try {
        const response = await fetch(`${API_BASE}/messages/batch-remind-friends`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`✅ ${data.message}！`, 'success');

            // 显示详细信息
            if (data.remindedFriends && data.remindedFriends.length > 0) {
                const friendsList = data.remindedFriends.join('、');
                setTimeout(() => {
                    showMessage(`已提醒好友：${friendsList}`, 'info');
                }, 1500);
            }

            // 如果还有未被提醒的好友，显示提示信息
            if (data.remindedCount < data.totalUnchecked) {
                const remainingCount = data.totalUnchecked - data.remindedCount;
                setTimeout(() => {
                    showMessage(`还有 ${remainingCount} 位好友在1小时内已被提醒过`, 'info');
                }, 3000);
            }

            // 暂时显示"已提醒"状态
            setTimeout(() => {
                const floatingRemindBtn = document.getElementById('floating-remind-btn');
                const remindIcon = floatingRemindBtn.querySelector('.remind-icon');
                remindIcon.textContent = '✅';
                floatingRemindBtn.classList.add('disabled');
                floatingRemindBtn.disabled = true;
                floatingRemindBtn.classList.remove('pulse');

                // 2秒后刷新排行榜以更新所有按钮状态
                setTimeout(() => {
                    remindIcon.textContent = originalIcon;
                    // 刷新好友排行榜以更新冷却状态
                    showRanking('friends');
                }, 2000);
            }, 1000);

        } else {
            showMessage(`❌ ${data.error}`, 'error');

            // 出错时立即恢复按钮状态
            setTimeout(() => {
                floatingRemindBtn.classList.remove('disabled');
                floatingRemindBtn.disabled = false;
                floatingRemindBtn.classList.add('pulse');
                floatingRemindBtn.querySelector('.remind-icon').textContent = originalIcon;
            }, 1000);
        }
    } catch (error) {
        showMessage('❌ 网络错误，请重试', 'error');

        // 出错时立即恢复按钮状态
        setTimeout(() => {
            floatingRemindBtn.classList.remove('disabled');
            floatingRemindBtn.disabled = false;
            floatingRemindBtn.classList.add('pulse');
            floatingRemindBtn.querySelector('.remind-icon').textContent = originalIcon;
        }, 1000);
    }
}

// 提醒好友打卡
async function remindFriendCheckin(targetUserId, username) {
    try {
        const response = await fetch(`${API_BASE}/messages/remind-checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ targetUserId })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`已提醒 ${username} 打卡！`, 'success');
            // 刷新排行榜以更新按钮状态
            const currentTab = document.querySelector('.ranking-tab.active');
            if (currentTab) {
                const tabType = currentTab.textContent === '好友' ? 'friends' :
                    currentTab.textContent === '地区' ? 'region' : 'national';
                showRanking(tabType);
            }
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 处理好友申请
async function handleFriendRequest(action, requesterId, messageId) {
    event.stopPropagation(); // 阻止事件冒泡

    try {
        const response = await fetch(`${API_BASE}/messages/friend-request/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ requesterId })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(data.message, 'success');
            // 标记消息为已读
            await markAsRead(messageId);
            // 更新徽章
            await updateUnreadBadge();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 加载用户资料
async function loadProfile() {
    try {
        const response = await fetch(`${API_BASE}/profile/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            return displayProfile(data);
        }
    } catch (error) {
        console.error('加载用户资料失败:', error);
    }
    return null;
}

// 显示用户资料
function displayProfile(data) {
    document.getElementById('profile-username').textContent = data.user.username;
    document.getElementById('profile-avatar').textContent = data.user.avatar || '👤';

    // 应用用户的主题设置
    if (data.user.theme) {
        applyTheme(data.user.theme);
    }

    displayAchievementShowcase(data.achievements);
    loadStats(); // 加载统计数据
    return data; // 返回数据供其他函数使用
}

// 显示成就展柜
function displayAchievementShowcase(userAchievements) {
    const achievementsList = document.getElementById('achievements-list');

    // 所有成就定义
    const allAchievements = [
        { days: 1, name: '新手上路', icon: '🎯', description: '完成第一次打卡' },
        { days: 7, name: '坚持一周', icon: '📅', description: '连续打卡7天' },
        { days: 30, name: '月度达人', icon: '🏆', description: '连续打卡30天' },
        { days: 90, name: '季度英雄', icon: '👑', description: '连续打卡90天' },
        { days: 180, name: '半年勇士', icon: '⭐', description: '连续打卡180天' },
        { days: 365, name: '年度传奇', icon: '💎', description: '连续打卡365天' },
        { days: 1000, name: '不朽之魂', icon: '🔥', description: '连续打卡1000天' }
    ];

    // 创建用户已解锁成就的映射
    const unlockedMap = {};
    userAchievements.forEach(achievement => {
        unlockedMap[achievement.name] = achievement;
    });

    // 添加统计信息和时间轴
    const unlockedCount = userAchievements.length;
    const totalCount = allAchievements.length;
    const completionRate = Math.round((unlockedCount / totalCount) * 100);

    let html = `
        <div class="achievement-summary">
            <div class="achievement-stats">
                <div class="stat-number">${unlockedCount}/${totalCount}</div>
                <div class="stat-label">成就完成度</div>
                <div class="completion-rate">${completionRate}%</div>
            </div>
        </div>
        
        <div class="achievement-timeline-container">
            <h4 style="margin-bottom: 20px; color: var(--text-color);">成就时间轴</h4>
            <div class="achievement-timeline" id="achievement-timeline">
    `;

    // 计算进度线的宽度
    let lastUnlockedIndex = -1;
    allAchievements.forEach((achievement, index) => {
        if (unlockedMap[achievement.name]) {
            lastUnlockedIndex = index;
        }
    });

    // 创建时间轴节点
    allAchievements.forEach((achievement, index) => {
        const isUnlocked = unlockedMap[achievement.name];
        const unlockDate = isUnlocked ? new Date(isUnlocked.unlocked_at).toLocaleDateString() : null;

        html += `
            <div class="timeline-item ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="timeline-marker">
                    <div class="timeline-icon">${achievement.icon}</div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-title">${achievement.name}</div>
                    <div class="timeline-days">${achievement.days}天</div>
                    <div class="timeline-description">${achievement.description}</div>
                    ${isUnlocked ? `<div class="timeline-date">✅ ${unlockDate}</div>` : '<div class="timeline-locked">🔒 未解锁</div>'}
                </div>
            </div>
        `;
    });

    // 添加进度线
    if (lastUnlockedIndex >= 0) {
        // 计算进度线宽度：从第一个图标中心到最后解锁成就的图标中心
        const progressWidth = lastUnlockedIndex === 0 ?
            '30px' : // 如果只解锁第一个，显示到第一个图标
            `calc(${(lastUnlockedIndex / (allAchievements.length - 1)) * 100}% + 30px)`;
        html += `<div class="timeline-progress-line" style="width: ${progressWidth};"></div>`;
    }

    html += `
            </div>
        </div>
    `;

    achievementsList.innerHTML = html;

    // 初始化时间轴拖动功能
    initTimelineDrag();
}

// 加载日历
async function loadCalendar() {
    try {
        const response = await fetch(`${API_BASE}/profile/calendar`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayCalendar(data);
        }
    } catch (error) {
        console.error('加载日历失败:', error);
    }
}

// 显示日历
function displayCalendar(checkins) {
    console.log('显示日历数据:', checkins); // 调试信息

    const calendarContainer = document.getElementById('calendar-container');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 获取当月第一天和最后一天
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    let html = '';

    // 添加月份标题
    html += `<div style="grid-column: 1 / -1; text-align: center; font-weight: bold; padding: 15px; background: #f8f9ff; border-radius: 10px; margin-bottom: 10px;">${currentYear}年${currentMonth + 1}月</div>`;

    // 添加星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        html += `<div style="text-align: center; font-weight: bold; padding: 10px; color: #667eea;">${day}</div>`;
    });

    // 创建打卡日期的映射，便于快速查找
    const checkinMap = {};
    checkins.forEach(checkin => {
        // 处理不同的日期格式，使用本地时区
        let dateKey;
        if (typeof checkin.check_date === 'string' && checkin.check_date.includes('-')) {
            dateKey = checkin.check_date.split('T')[0]; // 处理 "2025-12-18" 或 "2025-12-18T00:00:00.000Z" 格式
        } else {
            // 使用本地时区格式化日期
            const date = new Date(checkin.check_date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateKey = `${year}-${month}-${day}`;
        }
        checkinMap[dateKey] = checkin;
    });

    // 添加日期
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        // 使用本地时区格式化日期
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = date.toDateString() === today.toDateString();
        const checkin = checkinMap[dateStr];

        let classes = 'calendar-day';
        if (checkin) classes += ' checked';
        if (isToday) classes += ' today';

        const moodText = checkin ? (checkin.mood || '✓') : '';
        const titleText = checkin ? `${dateStr} - 心情: ${checkin.mood || '无'}` : dateStr;

        html += `
            <div class="${classes}" style="${!isCurrentMonth ? 'color: #ccc;' : ''}" title="${titleText}">
                <div style="font-size: 0.9rem;">${date.getDate()}</div>
                ${moodText ? `<div style="font-size: 1.2rem; margin-top: 2px;">${moodText}</div>` : ''}
            </div>
        `;
    }

    calendarContainer.innerHTML = html;
}

// 显示添加好友模态框
function showAddFriendModal() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3>添加好友</h3>
        <form id="add-friend-form" style="margin-top: 20px;">
            <input type="text" id="friend-username" placeholder="输入用户名" style="width: 100%; padding: 15px; border: 1px solid #ddd; border-radius: 10px; margin-bottom: 15px;">
            <button type="submit" style="width: 100%; padding: 15px; border: none; border-radius: 10px; background: #667eea; color: white; font-size: 16px; cursor: pointer;">发送好友申请</button>
        </form>
    `;

    document.getElementById('add-friend-form').addEventListener('submit', handleAddFriend);
    document.getElementById('modal').style.display = 'block';
}

// 处理添加好友
async function handleAddFriend(e) {
    e.preventDefault();

    const username = document.getElementById('friend-username').value;

    try {
        const response = await fetch(`${API_BASE}/messages/friend-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('好友申请已发送！', 'success');
            closeModal();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 显示设置模态框
async function showSettingsModal() {
    // 先获取当前用户设置
    let currentSettings = {
        notification_enabled: true,
        do_not_disturb: false,
        reminder_time: '09:00'
    };

    try {
        const response = await fetch(`${API_BASE}/profile/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentSettings = {
                notification_enabled: data.user.notification_enabled,
                do_not_disturb: data.user.do_not_disturb,
                reminder_time: data.user.reminder_time ? data.user.reminder_time.substring(0, 5) : '09:00'
            };
        }
    } catch (error) {
        console.error('获取用户设置失败:', error);
    }

    const currentTheme = document.body.getAttribute('data-theme') || 'light';

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3>设置</h3>
        <div style="margin-top: 20px;">
            <label style="display: flex; align-items: center; margin-bottom: 15px;">
                <input type="checkbox" id="notification-enabled" ${currentSettings.notification_enabled ? 'checked' : ''} style="margin-right: 10px;">
                <span>打卡提醒</span>
            </label>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">提醒时间</label>
                <input type="time" id="reminder-time" value="${currentSettings.reminder_time}" 
                       style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 5px; background: var(--card-bg); color: var(--text-color);">
            </div>
            
            <label style="display: flex; align-items: center; margin-bottom: 15px;">
                <input type="checkbox" id="do-not-disturb" ${currentSettings.do_not_disturb ? 'checked' : ''} style="margin-right: 10px;">
                <span>勿扰模式</span>
            </label>
            
            <div class="theme-toggle" style="margin-bottom: 20px;">
                <span class="theme-label">🌙 深色主题</span>
                <label class="theme-switch">
                    <input type="checkbox" id="theme-toggle" ${currentTheme === 'dark' ? 'checked' : ''} onchange="handleThemeToggle()">
                    <span class="theme-slider"></span>
                </label>
                <span class="theme-label">☀️ 浅色主题</span>
            </div>
            
            <button onclick="saveSettings()" style="width: 100%; padding: 15px; border: none; border-radius: 10px; background: var(--primary-color); color: white; font-size: 16px; cursor: pointer;">保存设置</button>
            <button onclick="logout()" style="width: 100%; padding: 15px; border: none; border-radius: 10px; background: #dc3545; color: white; font-size: 16px; cursor: pointer; margin-top: 10px;">退出登录</button>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ff4444;">
                <h4 style="color: #ff4444; margin-bottom: 15px;">⚠️ 危险操作</h4>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 15px; line-height: 1.4;">
                    注销账号将永久删除您的所有数据，包括打卡记录、成就、好友关系等，此操作不可恢复。
                </p>
                <button onclick="showDeleteAccountConfirm()" style="width: 100%; padding: 15px; border: none; border-radius: 10px; background: #ff4444; color: white; font-size: 16px; cursor: pointer;">注销账号</button>
            </div>
        </div>
    `;

    document.getElementById('modal').style.display = 'block';
}

// 保存设置
async function saveSettings() {
    const notificationEnabled = document.getElementById('notification-enabled').checked;
    const doNotDisturb = document.getElementById('do-not-disturb').checked;
    const reminderTime = document.getElementById('reminder-time').value;
    const themeToggle = document.getElementById('theme-toggle');
    const theme = themeToggle ? (themeToggle.checked ? 'dark' : 'light') : 'light';

    // 验证提醒时间
    if (!reminderTime) {
        showMessage('请选择提醒时间', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/profile/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                notification_enabled: notificationEnabled,
                do_not_disturb: doNotDisturb,
                reminder_time: reminderTime,
                theme: theme
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('设置保存成功！', 'success');
            closeModal();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 退出登录
function logout() {
    // 清除未读消息检查器
    if (unreadMessageChecker) {
        clearInterval(unreadMessageChecker);
        unreadMessageChecker = null;
    }
    
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    // 刷新页面，自动跳转到登录界面
    window.location.reload();
}

// 显示注销账号确认对话框
function showDeleteAccountConfirm() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h3 style="color: #ff4444;">⚠️ 注销账号确认</h3>
        <div style="margin-top: 20px;">
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h4 style="color: #856404; margin-bottom: 10px;">此操作将永久删除：</h4>
                <ul style="color: #856404; margin-left: 20px; line-height: 1.6;">
                    <li>所有打卡记录和存活天数</li>
                    <li>已获得的成就和进度</li>
                    <li>好友关系和消息记录</li>
                    <li>个人设置和偏好</li>
                    <li>账号信息（用户名将可被他人注册）</li>
                </ul>
            </div>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <p style="color: #721c24; font-weight: bold; margin-bottom: 10px;">⚠️ 重要提醒</p>
                <p style="color: #721c24; line-height: 1.5;">
                    此操作无法撤销！删除后无法恢复任何数据。如果您只是想暂时停用账号，建议选择"退出登录"。
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: var(--text-color);">
                    请输入您的密码确认删除：
                </label>
                <input type="password" id="delete-password" placeholder="输入密码确认" 
                       style="width: 100%; padding: 12px; border: 2px solid #ff4444; border-radius: 8px; font-size: 16px; background: var(--card-bg); color: var(--text-color);">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; color: var(--text-color);">
                    <input type="checkbox" id="delete-confirm" style="margin-right: 10px; transform: scale(1.2);">
                    <span>我已阅读并理解上述警告，确认要永久删除我的账号</span>
                </label>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="showSettingsModal()" style="flex: 1; padding: 15px; border: none; border-radius: 10px; background: var(--text-muted); color: white; font-size: 16px; cursor: pointer;">
                    取消
                </button>
                <button onclick="confirmDeleteAccount()" style="flex: 1; padding: 15px; border: none; border-radius: 10px; background: #ff4444; color: white; font-size: 16px; cursor: pointer; font-weight: bold;">
                    确认删除账号
                </button>
            </div>
        </div>
    `;
}

// 确认删除账号
async function confirmDeleteAccount() {
    const password = document.getElementById('delete-password').value;
    const confirmed = document.getElementById('delete-confirm').checked;

    if (!password) {
        showMessage('请输入密码确认', 'error');
        return;
    }

    if (!confirmed) {
        showMessage('请勾选确认框', 'error');
        return;
    }

    // 最后一次确认
    if (!confirm('最后确认：您真的要永久删除账号吗？此操作无法撤销！')) {
        return;
    }

    try {
        showMessage('正在删除账号...', 'info');

        const response = await fetch(`${API_BASE}/profile/delete-account`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                confirmPassword: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('账号已成功注销，所有数据已永久删除', 'success');

            // 清除本地数据
            localStorage.removeItem('token');
            token = null;
            currentUser = null;

            // 延迟跳转到登录页面
            setTimeout(() => {
                closeModal();
                showAuthPage();
                showMessage('感谢您使用我们的服务，再见！', 'info');
            }, 3000);

        } else {
            showMessage(data.error || '删除账号失败', 'error');
        }

    } catch (error) {
        console.error('删除账号错误:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 显示成就模态框
function showAchievementModal(achievement) {
    const modalBody = document.getElementById('modal-body');

    // 获取成就对应的天数信息
    const milestones = [
        { days: 1, name: '新手上路', icon: '🎯' },
        { days: 7, name: '坚持一周', icon: '📅' },
        { days: 30, name: '月度达人', icon: '🏆' },
        { days: 90, name: '季度英雄', icon: '👑' },
        { days: 180, name: '半年勇士', icon: '⭐' },
        { days: 365, name: '年度传奇', icon: '💎' },
        { days: 1000, name: '不朽之魂', icon: '🔥' }
    ];

    const milestoneInfo = milestones.find(m => m.name === achievement.name);
    const nextMilestone = milestones.find(m => m.days > (milestoneInfo?.days || 0));

    modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <!-- 庆祝动画效果 -->
            <div style="position: relative; margin-bottom: 20px;">
                <div style="font-size: 5rem; animation: bounce 1s infinite alternate;">${achievement.icon}</div>
                <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); font-size: 2rem; animation: sparkle 2s infinite;">✨</div>
            </div>
            
            <h2 style="color: #667eea; margin-bottom: 10px;">🎉 恭喜解锁新成就！</h2>
            <h3 style="margin-bottom: 15px;">${achievement.name}</h3>
            <p style="color: #666; font-size: 1.1rem; margin-bottom: 20px;">${achievement.description}</p>
            
            ${milestoneInfo ? `
                <div style="background: #f8f9ff; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="color: #667eea; font-weight: bold;">连续打卡 ${milestoneInfo.days} 天达成！</div>
                </div>
            ` : ''}
            
            ${nextMilestone ? `
                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
                    <div style="color: #999; font-size: 0.9rem;">下一个目标</div>
                    <div style="color: #667eea; font-weight: bold; margin-top: 5px;">
                        ${nextMilestone.icon} ${nextMilestone.name} (${nextMilestone.days}天)
                    </div>
                </div>
            ` : `
                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
                    <div style="color: #667eea; font-weight: bold;">🏆 你已完成所有成就！</div>
                    <div style="color: #999; font-size: 0.9rem; margin-top: 5px;">继续坚持，创造属于你的传奇！</div>
                </div>
            `}
            
            <button onclick="closeModal()" style="margin-top: 20px; padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 25px; font-size: 1rem; cursor: pointer;">
                太棒了！
            </button>
        </div>
        
        <style>
            @keyframes bounce {
                0% { transform: translateY(0); }
                100% { transform: translateY(-10px); }
            }
            
            @keyframes sparkle {
                0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
                50% { opacity: 0.5; transform: translateX(-50%) scale(1.2); }
            }
        </style>
    `;

    document.getElementById('modal').style.display = 'block';

    // 3秒后自动关闭（可选）
    setTimeout(() => {
        if (document.getElementById('modal').style.display === 'block') {
            // closeModal();
        }
    }, 5000);
}

// 关闭模态框
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// 预览用户头像（登录时）
async function previewUserAvatar() {
    const username = document.getElementById('login-username').value;
    const previewAvatar = document.getElementById('login-preview-avatar');

    if (!username) {
        previewAvatar.textContent = '👤';
        return;
    }

    try {
        // 调用API获取用户头像
        const response = await fetch(`${API_BASE}/auth/avatar/${encodeURIComponent(username)}`);

        if (response.ok) {
            const data = await response.json();
            previewAvatar.textContent = data.avatar || '👤';
        } else {
            previewAvatar.textContent = '👤';
        }
    } catch (error) {
        console.error('获取头像预览失败:', error);
        previewAvatar.textContent = '👤';
    }
}

// 预览注册用户头像
async function previewRegisterAvatar() {
    const username = document.getElementById('register-username').value;
    const previewAvatar = document.getElementById('register-preview-avatar');

    if (!username) {
        previewAvatar.textContent = '👤';
        return;
    }

    try {
        // 对于注册，如果用户名已存在则显示现有头像，否则显示随机头像预览
        const response = await fetch(`${API_BASE}/auth/avatar/${encodeURIComponent(username)}`);

        if (response.ok) {
            const data = await response.json();
            previewAvatar.textContent = data.avatar || '👤';
        } else {
            // 生成一个随机头像预览
            const avatars = ['👤', '👨', '👩', '🧑', '👦', '👧', '🧔', '👱', '👨‍💼', '👩‍💼', '🧑‍💻', '🤖', '🐶', '🐱', '😊', '😎'];
            const hash = username.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            const avatarIndex = Math.abs(hash) % avatars.length;
            previewAvatar.textContent = avatars[avatarIndex];
        }
    } catch (error) {
        console.error('获取头像预览失败:', error);
        previewAvatar.textContent = '👤';
    }
}

// 显示头像选择器
async function showAvatarSelector() {
    try {
        const response = await fetch(`${API_BASE}/profile/avatars`);
        const avatarCategories = await response.json();

        const modalBody = document.getElementById('modal-body');
        let html = `
            <h3>选择头像</h3>
            <div class="avatar-selector">
        `;

        Object.entries(avatarCategories).forEach(([key, category]) => {
            html += `
                <div class="avatar-category">
                    <h4>${category.name}</h4>
                    <div class="avatar-grid">
            `;

            category.avatars.forEach(avatar => {
                html += `
                    <div class="avatar-option" onclick="selectAvatar('${avatar}')" title="${avatar}">
                        ${avatar}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="closeModal()" style="padding: 10px 20px; background: #ccc; color: #333; border: none; border-radius: 5px; margin-right: 10px; cursor: pointer;">取消</button>
            </div>
        `;

        modalBody.innerHTML = html;
        document.getElementById('modal').style.display = 'block';

    } catch (error) {
        showMessage('获取头像列表失败', 'error');
    }
}

// 选择头像
async function selectAvatar(avatar) {
    try {
        const response = await fetch(`${API_BASE}/profile/avatar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ avatar })
        });

        const data = await response.json();

        if (response.ok) {
            // 更新页面显示
            document.getElementById('profile-avatar').textContent = avatar;
            showMessage('头像更新成功！', 'success');
            closeModal();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('网络错误，请重试', 'error');
    }
}

// 新手引导系统
let currentTutorialStep = 0;
const tutorialSteps = [
    {
        title: '欢迎来到《我还活着》',
        text: '这是一个记录你每日存活状态的打卡应用，让我们开始你的存活之旅吧！',
        icon: '🎯',
        target: null
    },
    {
        title: '每日打卡',
        text: '点击这个大按钮进行每日打卡，记录你今天的存活状态和心情。',
        icon: '📅',
        target: '#checkin-btn'
    },
    {
        title: '存活天数',
        text: '这里显示你连续打卡的天数，坚持打卡让数字不断增长！',
        icon: '💪',
        target: '.survive-counter'
    },
    {
        title: '成就系统',
        text: '达到特定天数会解锁成就，这里显示你的进度和下一个目标。',
        icon: '🏆',
        target: '#achievement-section'
    },
    {
        title: '探索更多',
        text: '使用底部导航探索排行榜、消息和个人页面。现在开始你的打卡之旅吧！',
        icon: '🚀',
        target: '.bottom-nav'
    }
];

function startTutorial() {
    currentTutorialStep = 0;
    document.getElementById('tutorial-overlay').classList.remove('hidden');
    showTutorialStep();
}

function showTutorialStep() {
    const step = tutorialSteps[currentTutorialStep];
    const overlay = document.getElementById('tutorial-overlay');
    const highlight = document.getElementById('tutorial-highlight');

    // 更新卡片内容
    document.querySelector('.tutorial-icon').textContent = step.icon;
    document.querySelector('.tutorial-title').textContent = step.title;
    document.querySelector('.tutorial-text').textContent = step.text;

    // 更新进度
    const progress = ((currentTutorialStep + 1) / tutorialSteps.length) * 100;
    document.getElementById('tutorial-progress').style.width = `${progress}%`;
    document.getElementById('tutorial-step').textContent = `${currentTutorialStep + 1} / ${tutorialSteps.length}`;

    // 更新按钮文本
    const nextBtn = document.getElementById('tutorial-next');
    nextBtn.textContent = currentTutorialStep === tutorialSteps.length - 1 ? '完成' : '下一步';

    // 高亮目标元素
    if (step.target) {
        const targetElement = document.querySelector(step.target);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            highlight.style.display = 'block';
            highlight.style.left = `${rect.left - 10}px`;
            highlight.style.top = `${rect.top - 10}px`;
            highlight.style.width = `${rect.width + 20}px`;
            highlight.style.height = `${rect.height + 20}px`;

            // 滚动到目标元素
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    } else {
        highlight.style.display = 'none';
    }
}

function nextTutorialStep() {
    if (currentTutorialStep < tutorialSteps.length - 1) {
        currentTutorialStep++;
        showTutorialStep();
    } else {
        completeTutorial();
    }
}

function skipTutorial() {
    completeTutorial();
}

async function completeTutorial() {
    // 隐藏引导界面
    document.getElementById('tutorial-overlay').classList.add('hidden');

    // 调用API标记教程完成
    try {
        await fetch(`${API_BASE}/profile/tutorial/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        showMessage('欢迎加入《我还活着》！开始你的打卡之旅吧！', 'success');
    } catch (error) {
        console.error('标记教程完成失败:', error);
    }
}

// 重置教程（用于测试）
async function resetTutorial() {
    try {
        await fetch(`${API_BASE}/profile/tutorial/reset`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        showMessage('教程已重置，刷新页面查看效果', 'success');
    } catch (error) {
        console.error('重置教程失败:', error);
    }
}

// 显示消息提示
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 25px;
        border-radius: 25px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        transition: all 0.3s;
        ${type === 'success' ? 'background: #28a745;' : type === 'error' ? 'background: #dc3545;' : 'background: #667eea;'}
    `;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
}

// 全局变量用于日历导航
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();

// 加载统计数据
async function loadStats() {
    try {
        console.log('开始加载统计数据...');
        const response = await fetch(`${API_BASE}/profile/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('统计数据API响应:', data);

        if (response.ok) {
            displayStats(data);
        } else {
            console.error('统计数据API错误:', data);
            // 显示默认值
            displayStats({
                consecutiveDays: 0,
                totalCheckins: 0,
                checkinRate: 0
            });
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
        // 显示默认值
        displayStats({
            consecutiveDays: 0,
            totalCheckins: 0,
            checkinRate: 0
        });
    }
}

// 显示统计数据
function displayStats(stats) {
    console.log('显示统计数据:', stats);

    const consecutiveDaysEl = document.getElementById('consecutive-days');
    const totalCheckinsEl = document.getElementById('total-checkins');
    const checkinRateEl = document.getElementById('checkin-rate');

    if (consecutiveDaysEl) {
        consecutiveDaysEl.textContent = stats.consecutiveDays || 0;
    }
    if (totalCheckinsEl) {
        totalCheckinsEl.textContent = stats.totalCheckins || 0;
    }
    if (checkinRateEl) {
        checkinRateEl.textContent = `${stats.checkinRate || 0}%`;
    }
}

// 设置日历导航
function setupCalendarNavigation() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn && nextBtn) {
        // 移除之前的事件监听器
        prevBtn.replaceWith(prevBtn.cloneNode(true));
        nextBtn.replaceWith(nextBtn.cloneNode(true));

        // 重新获取元素并添加事件监听器
        document.getElementById('prev-month').addEventListener('click', () => {
            currentCalendarMonth--;
            if (currentCalendarMonth < 0) {
                currentCalendarMonth = 11;
                currentCalendarYear--;
            }
            loadCalendar(currentCalendarYear, currentCalendarMonth + 1);
        });

        document.getElementById('next-month').addEventListener('click', () => {
            const today = new Date();
            const maxYear = today.getFullYear();
            const maxMonth = today.getMonth();

            // 不能超过当前月份
            if (currentCalendarYear < maxYear ||
                (currentCalendarYear === maxYear && currentCalendarMonth < maxMonth)) {
                currentCalendarMonth++;
                if (currentCalendarMonth > 11) {
                    currentCalendarMonth = 0;
                    currentCalendarYear++;
                }
                loadCalendar(currentCalendarYear, currentCalendarMonth + 1);
            }
        });
    }
}

// 更新loadCalendar函数以支持年月参数
async function loadCalendar(year = null, month = null) {
    try {
        let url = `${API_BASE}/profile/calendar`;
        if (year && month) {
            url += `?year=${year}&month=${month}`;
            currentCalendarYear = year;
            currentCalendarMonth = month - 1;
        } else {
            // 使用当前年月
            const today = new Date();
            currentCalendarYear = today.getFullYear();
            currentCalendarMonth = today.getMonth();
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayCalendar(data, currentCalendarYear, currentCalendarMonth);
        }
    } catch (error) {
        console.error('加载日历失败:', error);
    }
}

// 更新displayCalendar函数
function displayCalendar(checkins, year = null, month = null) {
    console.log('显示日历数据:', checkins); // 调试信息

    const calendarContainer = document.getElementById('calendar-container');
    const calendarTitle = document.getElementById('calendar-title');

    // 使用传入的年月或当前年月
    const displayYear = year || new Date().getFullYear();
    const displayMonth = month !== null ? month : new Date().getMonth();

    // 更新标题
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月'];
    calendarTitle.textContent = `${displayYear}年${monthNames[displayMonth]} 存活日历`;

    // 获取当月第一天和最后一天
    const firstDay = new Date(displayYear, displayMonth, 1);
    const lastDay = new Date(displayYear, displayMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    let html = '';

    // 添加星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        html += `<div style="text-align: center; font-weight: bold; padding: 10px; color: var(--primary-color); background: var(--card-bg); border-radius: 8px;">${day}</div>`;
    });

    // 创建打卡日期的映射，便于快速查找
    const checkinMap = {};
    checkins.forEach(checkin => {
        // 处理不同的日期格式，使用本地时区
        let dateKey;
        if (typeof checkin.check_date === 'string' && checkin.check_date.includes('-')) {
            dateKey = checkin.check_date.split('T')[0]; // 处理 "2025-12-18" 或 "2025-12-18T00:00:00.000Z" 格式
        } else {
            // 使用本地时区格式化日期
            const date = new Date(checkin.check_date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateKey = `${year}-${month}-${day}`;
        }
        checkinMap[dateKey] = checkin;
    });

    // 添加日期
    const today = new Date();
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        // 使用本地时区格式化日期
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const isCurrentMonth = date.getMonth() === displayMonth;
        const isToday = date.toDateString() === today.toDateString();
        const checkin = checkinMap[dateStr];

        let classes = 'calendar-day';
        if (checkin) classes += ' checked';
        if (isToday) classes += ' today';
        if (!isCurrentMonth) classes += ' other-month';

        const moodEmoji = checkin && checkin.mood ? `<div class="mood-emoji">${checkin.mood}</div>` : '';
        const titleText = checkin ? `${dateStr} - 心情: ${checkin.mood || '无'}` : dateStr;

        html += `
            <div class="${classes}" title="${titleText}">
                <div>${date.getDate()}</div>
                ${moodEmoji}
            </div>
        `;
    }

    calendarContainer.innerHTML = html;

    // 更新导航按钮状态
    updateCalendarNavButtons();
}

// 更新日历导航按钮状态
function updateCalendarNavButtons() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const today = new Date();

    if (prevBtn && nextBtn) {
        // 下一个月按钮：不能超过当前月份
        const isCurrentOrFutureMonth = currentCalendarYear > today.getFullYear() ||
            (currentCalendarYear === today.getFullYear() && currentCalendarMonth >= today.getMonth());

        nextBtn.disabled = isCurrentOrFutureMonth;

        // 上一个月按钮：总是可用（可以查看历史记录）
        prevBtn.disabled = false;
    }
}

// 主题相关函数
function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);

    // 保存到服务器
    saveThemeToServer(newTheme);
}

async function saveThemeToServer(theme) {
    try {
        const response = await fetch(`${API_BASE}/profile/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ theme })
        });

        if (!response.ok) {
            console.error('保存主题设置失败');
        }
    } catch (error) {
        console.error('保存主题设置错误:', error);
    }
}

// 初始化主题
function initializeTheme() {
    // 优先使用localStorage中的主题，然后是用户设置，最后是默认主题
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

// 在页面加载时初始化主题
document.addEventListener('DOMContentLoaded', function () {
    initializeTheme();
});

// 处理主题切换
function handleThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    applyTheme(newTheme);
}

// 初始化时间轴拖动功能
function initTimelineDrag() {
    const timeline = document.getElementById('achievement-timeline');
    if (!timeline) return;

    const container = timeline.parentElement;
    let isDown = false;
    let startX;
    let scrollLeft;

    timeline.addEventListener('mousedown', (e) => {
        isDown = true;
        timeline.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });

    timeline.addEventListener('mouseleave', () => {
        isDown = false;
        timeline.style.cursor = 'grab';
    });

    timeline.addEventListener('mouseup', () => {
        isDown = false;
        timeline.style.cursor = 'grab';
    });

    timeline.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 2; // 滚动速度
        container.scrollLeft = scrollLeft - walk;
    });

    // 触摸设备支持
    let touchStartX = 0;
    let touchScrollLeft = 0;

    timeline.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].pageX - container.offsetLeft;
        touchScrollLeft = container.scrollLeft;
    });

    timeline.addEventListener('touchmove', (e) => {
        const x = e.touches[0].pageX - container.offsetLeft;
        const walk = (x - touchStartX) * 2;
        container.scrollLeft = touchScrollLeft - walk;
    });
}
// ==================== 打卡成功动画效果 ====================

// 显示打卡成功动画
function showCheckinSuccessAnimation(mood, surviveDays) {
    // 创建动画容器
    const animationContainer = document.createElement('div');
    animationContainer.className = 'checkin-success-animation';
    animationContainer.innerHTML = `
        <div class="checkin-animation-content">
            <div class="checkin-success-icon">
                <div class="checkin-mood-large">${mood}</div>
                <div class="checkin-success-ring"></div>
                <div class="checkin-success-ring-2"></div>
            </div>
            <div class="checkin-success-text">
                <h2 class="checkin-success-title">打卡成功！</h2>
                <p class="checkin-success-subtitle">已连续存活 ${surviveDays} 天</p>
            </div>
            <div class="checkin-confetti-container">
                ${generateConfetti()}
            </div>
        </div>
    `;
    
    document.body.appendChild(animationContainer);
    
    // 触发动画
    setTimeout(() => {
        animationContainer.classList.add('show');
        
        // 添加震动效果（延迟一点确保用户交互已完成）
        setTimeout(() => {
            addVibrationEffect();
        }, 200);
    }, 50);
    
    // 添加粒子动画
    createParticleEffect();
    
    // 2.5秒后移除动画
    setTimeout(() => {
        animationContainer.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(animationContainer);
        }, 500);
    }, 2500);
}

// 生成彩带效果
function generateConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
    let confettiHTML = '';
    
    for (let i = 0; i < 50; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 3;
        const duration = 3 + Math.random() * 2;
        const left = Math.random() * 100;
        
        confettiHTML += `
            <div class="confetti-piece" style="
                background-color: ${color};
                left: ${left}%;
                animation-delay: ${delay}s;
                animation-duration: ${duration}s;
            "></div>
        `;
    }
    
    return confettiHTML;
}

// 创建粒子效果
function createParticleEffect() {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-container';
    document.body.appendChild(particleContainer);
    
    // 创建多个粒子
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            createParticle(particleContainer);
        }, i * 100);
    }
    
    // 3秒后移除粒子容器
    setTimeout(() => {
        if (particleContainer.parentNode) {
            document.body.removeChild(particleContainer);
        }
    }, 3000);
}

// 创建单个粒子
function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'success-particle';
    
    // 随机位置和属性
    const startX = Math.random() * window.innerWidth;
    const startY = window.innerHeight / 2;
    const endX = startX + (Math.random() - 0.5) * 400;
    const endY = startY - Math.random() * 300 - 100;
    const size = Math.random() * 8 + 4;
    const duration = Math.random() * 1000 + 1500;
    
    particle.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(45deg, #667eea, #764ba2);
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        opacity: 1;
        transform: scale(0);
    `;
    
    container.appendChild(particle);
    
    // 动画
    particle.animate([
        { 
            transform: 'scale(0) rotate(0deg)', 
            opacity: 1,
            left: startX + 'px',
            top: startY + 'px'
        },
        { 
            transform: 'scale(1) rotate(180deg)', 
            opacity: 1,
            left: (startX + endX) / 2 + 'px',
            top: (startY + endY) / 2 + 'px',
            offset: 0.5
        },
        { 
            transform: 'scale(0) rotate(360deg)', 
            opacity: 0,
            left: endX + 'px',
            top: endY + 'px'
        }
    ], {
        duration: duration,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }).onfinish = () => {
        if (particle.parentNode) {
            container.removeChild(particle);
        }
    };
}

// 添加震动效果
function addVibrationEffect() {
    console.log('尝试触发震动效果...');
    
    // 检查是否支持震动API
    if ('vibrate' in navigator) {
        console.log('设备支持震动API');
        
        try {
            // 更强的震动模式：长震-短停-中震-短停-长震
            const vibrationPattern = [300, 100, 200, 100, 300];
            const result = navigator.vibrate(vibrationPattern);
            console.log('震动API调用结果:', result);
            
            // 如果第一次震动失败，尝试简单震动
            if (!result) {
                setTimeout(() => {
                    console.log('尝试简单震动...');
                    navigator.vibrate(500);
                }, 100);
            }
        } catch (error) {
            console.error('震动API调用失败:', error);
            
            // 尝试备用震动方式
            try {
                navigator.vibrate(500);
            } catch (backupError) {
                console.error('备用震动也失败:', backupError);
            }
        }
    } else {
        console.log('设备不支持震动API');
        
        // 对于不支持震动的设备，可以添加其他反馈
        // 比如屏幕闪烁效果
        addScreenFlashEffect();
    }
}

// 屏幕闪烁效果（震动的替代方案）
function addScreenFlashEffect() {
    console.log('添加屏幕闪烁效果作为震动替代');
    
    const flashOverlay = document.createElement('div');
    flashOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.8);
        z-index: 10001;
        pointer-events: none;
        opacity: 0;
    `;
    
    document.body.appendChild(flashOverlay);
    
    // 快速闪烁两次
    flashOverlay.animate([
        { opacity: 0 },
        { opacity: 1 },
        { opacity: 0 },
        { opacity: 1 },
        { opacity: 0 }
    ], {
        duration: 400,
        easing: 'ease-in-out'
    }).onfinish = () => {
        document.body.removeChild(flashOverlay);
    };
}