// ==================== 聊天系统功能 ====================

// 全局变量
let currentConversationId = null;
let currentFriendId = null;
let currentFriendName = null;
let currentFriendAvatar = null;
let chatPollingInterval = null;
let lastMessageId = null;

// 加载会话列表
async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE}/chat/conversations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const conversations = await response.json();

        if (response.ok) {
            displayConversations(conversations);
            updateChatUnreadBadge();
        }
    } catch (error) {
        console.error('加载会话列表失败:', error);
    }
}

// 显示会话列表
function displayConversations(conversations) {
    const conversationsList = document.getElementById('conversations-list');

    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 3rem; margin-bottom: 10px;">💬</div>
                <div>暂无聊天记录</div>
                <div style="font-size: 0.9rem; margin-top: 10px;">从好友列表开始聊天吧！</div>
            </div>
        `;
        return;
    }


    let html = '';
    conversations.forEach(conv => {
        const unreadBadge = conv.unread_count > 0
            ? `<span class="conversation-unread-badge">${conv.unread_count > 99 ? '99+' : conv.unread_count}</span>`
            : '';

        // 添加标记已读按钮（仅在有未读消息时显示）
        const markReadButton = conv.unread_count > 0
            ? `<button class="conversation-mark-read-btn" onclick="markConversationAsReadFromList(${conv.id}); event.stopPropagation();" title="标记已读">✓</button>`
            : '';

        const lastMessage = conv.last_message || '开始聊天吧';
        const displayMessage = lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage;

        const timeStr = formatMessageTime(conv.last_message_at);

        html += `
            <div class="conversation-item ${conv.unread_count > 0 ? 'unread' : ''}" 
                 onclick="openConversationWithUnreadJump(${conv.friend_id}, '${conv.friend_username}', '${conv.friend_avatar}', ${conv.id}, ${conv.unread_count > 0})">
                <div class="conversation-avatar">${conv.friend_avatar || '👤'}</div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <span class="conversation-name">${conv.friend_username}</span>
                        <span class="conversation-time">${timeStr}</span>
                    </div>
                    <div class="conversation-last-message">${displayMessage}</div>
                </div>
                <div class="conversation-actions">
                    ${markReadButton}
                    ${unreadBadge}
                </div>
            </div>
        `;
    });

    conversationsList.innerHTML = html;
}

// 格式化消息时间
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 今天
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return '昨天';
    }

    // 一周内
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[date.getDay()];
    }

    // 更早
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 打开与好友的聊天窗口
async function openConversation(friendId, friendName, friendAvatar, conversationId = null) {
    currentFriendId = friendId;
    currentFriendName = friendName;
    currentFriendAvatar = friendAvatar || '👤';

    // 确保加载了当前用户信息
    if (!currentUser) {
        try {
            const response = await fetch(`${API_BASE}/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                currentUser = await response.json();
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }
    }

    // 如果没有提供conversationId，需要创建或获取
    if (!conversationId) {
        try {
            const response = await fetch(`${API_BASE}/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friendId })
            });

            const data = await response.json();

            if (response.ok) {
                currentConversationId = data.conversationId;
            } else {
                showMessage(data.error, 'error');
                return;
            }
        } catch (error) {
            showMessage('创建会话失败', 'error');
            return;
        }
    } else {
        currentConversationId = conversationId;
    }

    // 更新聊天窗口头部
    document.getElementById('chat-username').textContent = friendName;
    document.getElementById('chat-avatar').textContent = friendAvatar || '👤';

    // 加载消息历史
    await loadChatMessages();

    // 显示聊天窗口
    showChatView();

    // 立即标记为已读（用户打开聊天窗口就表示要查看消息）
    markConversationAsRead(currentConversationId);

    // 开始轮询新消息
    startChatPolling();
}

// 加载聊天消息
async function loadChatMessages() {
    try {
        const response = await fetch(`${API_BASE}/chat/conversations/${currentConversationId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const messages = await response.json();

        if (response.ok) {
            displayChatMessages(messages);
            if (messages.length > 0) {
                lastMessageId = messages[messages.length - 1].id;
            }
        }
    } catch (error) {
        console.error('加载消息失败:', error);
    }
}

// 显示聊天消息
function displayChatMessages(messages) {
    const chatMessages = document.getElementById('chat-messages');

    if (messages.length === 0) {
        chatMessages.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 2rem; margin-bottom: 10px;">👋</div>
                <div>开始聊天吧！</div>
            </div>
        `;
        return;
    }

    let html = '';
    const userId = currentUser?.id || JSON.parse(atob(token.split('.')[1])).userId;
    let firstUnreadMessageId = null;
    let hasUnreadMessages = false;
    let lastDate = null;

    messages.forEach((msg, index) => {
        const isSent = msg.sender_id === userId;
        const messageClass = isSent ? 'sent' : 'received';
        const isUnread = !isSent && !msg.is_read; // 只有接收的消息才可能未读
        
        // 记录第一条未读消息的ID
        if (isUnread && !firstUnreadMessageId) {
            firstUnreadMessageId = `message-${msg.id}`;
            hasUnreadMessages = true;
        }

        // 检查是否需要添加日期分割
        const messageDate = new Date(msg.created_at);
        const messageDateStr = formatDateForSeparator(messageDate);
        
        if (lastDate !== messageDateStr) {
            html += `
                <div class="date-separator">
                    <div class="date-separator-line"></div>
                    <div class="date-separator-text">${messageDateStr}</div>
                    <div class="date-separator-line"></div>
                </div>
            `;
            lastDate = messageDateStr;
        }

        const timeStr = messageDate.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // 使用消息中返回的头像信息
        const avatar = isSent ? (msg.sender_avatar || currentUser?.avatar || '👤') : (msg.sender_avatar || currentFriendAvatar);

        // 添加未读消息标识
        const unreadClass = isUnread ? 'unread-message' : '';
        const unreadIndicator = isUnread ? '<div class="unread-indicator">新消息</div>' : '';

        html += `
            <div class="message-row ${messageClass} ${unreadClass}" id="message-${msg.id}">
                ${!isSent ? `<div class="message-avatar">${avatar}</div>` : ''}
                <div class="message-bubble ${messageClass}">
                    ${unreadIndicator}
                    <div class="message-content">${escapeHtml(msg.content)}</div>
                    <div class="message-time">${timeStr}</div>
                </div>
                ${isSent ? `<div class="message-avatar">${avatar}</div>` : ''}
            </div>
        `;
    });

    chatMessages.innerHTML = html;

    // 如果有未读消息，滚动到第一条未读消息
    if (hasUnreadMessages && firstUnreadMessageId) {
        setTimeout(() => {
            const firstUnreadElement = document.getElementById(firstUnreadMessageId);
            if (firstUnreadElement) {
                firstUnreadElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // 添加高亮效果
                firstUnreadElement.classList.add('highlight-unread');
                setTimeout(() => {
                    firstUnreadElement.classList.remove('highlight-unread');
                }, 2000); // 2秒后移除高亮
            }
        }, 100); // 稍微延迟确保DOM更新完成
    } else {
        // 没有未读消息时平滑滚动到最新消息（底部）
        setTimeout(() => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
            
            // 如果有消息，高亮最新的消息
            if (messages.length > 0) {
                const lastMessage = document.getElementById(`message-${messages[messages.length - 1].id}`);
                if (lastMessage) {
                    lastMessage.classList.add('highlight-latest');
                    setTimeout(() => {
                        lastMessage.classList.remove('highlight-latest');
                    }, 1500); // 1.5秒后移除高亮
                }
            }
        }, 100);
    }
}

// 格式化日期分割器显示文本
function formatDateForSeparator(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = today.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return '今天';
    } else if (diffDays === 1) {
        return '昨天';
    } else if (diffDays === 2) {
        return '前天';
    } else if (diffDays < 7) {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return weekdays[date.getDay()];
    } else if (date.getFullYear() === now.getFullYear()) {
        // 同年显示月日
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    } else {
        // 不同年显示完整日期
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    }
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 发送聊天消息
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();

    if (!content) {
        return;
    }

    if (!currentConversationId) {
        showMessage('会话不存在', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/chat/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                conversationId: currentConversationId,
                content: content
            })
        });

        const message = await response.json();

        if (response.ok) {
            // 清空输入框
            input.value = '';

            // 添加消息到界面
            const chatMessages = document.getElementById('chat-messages');
            const userId = currentUser?.id || JSON.parse(atob(token.split('.')[1])).userId;
            const timeStr = new Date(message.created_at).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // 使用返回的头像或当前用户头像
            const avatar = message.sender_avatar || currentUser?.avatar || '👤';

            const messageHtml = `
                <div class="message-row sent">
                    <div class="message-bubble sent">
                        <div class="message-content">${escapeHtml(message.content)}</div>
                        <div class="message-time">${timeStr}</div>
                    </div>
                    <div class="message-avatar">${avatar}</div>
                </div>
            `;

            chatMessages.insertAdjacentHTML('beforeend', messageHtml);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            lastMessageId = message.id;
        } else {
            showMessage(message.error, 'error');
        }
    } catch (error) {
        showMessage('发送消息失败', 'error');
    }
}

// 标记会话为已读
async function markConversationAsRead(conversationId, skipReload = false) {
    try {
        await fetch(`${API_BASE}/chat/conversations/${conversationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // 立即更新未读徽章
        updateTotalUnreadBadge();
        
        // 只有在不跳过重新加载时才重新加载会话列表
        if (!skipReload) {
            // 立即重新加载会话列表，不延迟
            loadConversations();
        }
    } catch (error) {
        console.error('标记已读失败:', error);
    }
}

// 从会话列表标记已读（专门用于会话列表的按钮）
async function markConversationAsReadFromList(conversationId) {
    try {
        const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // 立即更新界面
            updateTotalUnreadBadge();
            loadConversations();
            showMessage('已标记为已读', 'success');
        } else {
            showMessage('标记已读失败', 'error');
        }
    } catch (error) {
        console.error('标记已读失败:', error);
        showMessage('操作失败，请重试', 'error');
    }
}

// 从会话列表打开会话并跳转到未读消息（如果有的话）
async function openConversationWithUnreadJump(friendId, friendName, friendAvatar, conversationId, hasUnread) {
    // 先打开会话
    await openConversation(friendId, friendName, friendAvatar, conversationId);
    
    // 显示相应的提示
    setTimeout(() => {
        if (hasUnread) {
            showMessage('已定位到未读消息', 'info');
        } else {
            showMessage('已跳转到最新消息', 'info');
        }
    }, 600); // 稍微延迟确保滚动动画完成
}

// 开始轮询新消息
function startChatPolling() {
    // 清除之前的轮询
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
    }

    // 每5秒检查新消息
    chatPollingInterval = setInterval(async () => {
        if (!currentConversationId) {
            stopChatPolling();
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}/chat/conversations/${currentConversationId}/messages?limit=10`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const messages = await response.json();

            if (response.ok && messages.length > 0) {
                const newMessages = messages.filter(msg => msg.id > lastMessageId);

                if (newMessages.length > 0) {
                    const chatMessages = document.getElementById('chat-messages');
                    const userId = currentUser?.id || JSON.parse(atob(token.split('.')[1])).userId;

                    newMessages.forEach(msg => {
                        const isSent = msg.sender_id === userId;
                        const messageClass = isSent ? 'sent' : 'received';
                        const timeStr = new Date(msg.created_at).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        // 使用消息中的头像信息
                        const avatar = isSent ? (msg.sender_avatar || currentUser?.avatar || '👤') : (msg.sender_avatar || currentFriendAvatar);

                        const messageHtml = `
                            <div class="message-row ${messageClass}">
                                ${!isSent ? `<div class="message-avatar">${avatar}</div>` : ''}
                                <div class="message-bubble ${messageClass}">
                                    <div class="message-content">${escapeHtml(msg.content)}</div>
                                    <div class="message-time">${timeStr}</div>
                                </div>
                                ${isSent ? `<div class="message-avatar">${avatar}</div>` : ''}
                            </div>
                        `;

                        chatMessages.insertAdjacentHTML('beforeend', messageHtml);
                    });

                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    lastMessageId = messages[messages.length - 1].id;

                    // 标记为已读，但跳过重新加载会话列表（避免频繁刷新）
                    markConversationAsRead(currentConversationId, true);
                }
            }
        } catch (error) {
            console.error('轮询新消息失败:', error);
        }
    }, 5000);
}

// 停止轮询
function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

// 更新聊天未读徽章
async function updateChatUnreadBadge() {
    try {
        const response = await fetch(`${API_BASE}/chat/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // 更新总的未读徽章（包括聊天和系统通知）
            updateTotalUnreadBadge();
            return data.unreadCount;
        }
    } catch (error) {
        console.error('获取聊天未读数失败:', error);
    }
    return 0;
}

// 更新总的未读徽章（聊天 + 系统通知）
async function updateTotalUnreadBadge() {
    try {
        // 获取聊天未读数
        const chatResponse = await fetch(`${API_BASE}/chat/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const chatData = await chatResponse.json();
        const chatUnread = chatResponse.ok ? chatData.unreadCount : 0;

        // 获取系统通知未读数
        const sysResponse = await fetch(`${API_BASE}/messages/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const sysData = await sysResponse.json();
        const sysUnread = sysResponse.ok ? sysData.unreadCount : 0;

        // 更新导航栏徽章
        const totalUnread = chatUnread + sysUnread;

        // 使用正确的徽章ID
        const badge = document.getElementById('unread-badge');

        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.classList.remove('hidden');
                badge.style.display = '';
            } else {
                badge.classList.add('hidden');
                badge.style.display = 'none';
            }
            console.log('更新消息徽章:', totalUnread, '(聊天:', chatUnread, '+ 系统:', sysUnread, ')');
        } else {
            console.warn('未找到消息徽章元素 #unread-badge');
        }
    } catch (error) {
        console.error('更新总未读数失败:', error);
    }
}

// 更新系统通知未读徽章
async function updateSystemUnreadBadge() {
    try {
        const response = await fetch(`${API_BASE}/messages/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            const badge = document.getElementById('system-unread-badge');
            if (badge) {
                if (data.unreadCount > 0) {
                    badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            // 同时更新总未读数
            updateTotalUnreadBadge();
        }
    } catch (error) {
        console.error('获取系统通知未读数失败:', error);
    }
}

// 显示会话列表视图
function showConversationsView() {
    document.getElementById('conversations-view').classList.add('active');
    document.getElementById('chat-view').classList.remove('active');
    document.getElementById('notifications-view').classList.remove('active');

    // 停止轮询
    stopChatPolling();
    currentConversationId = null;
    lastMessageId = null;

    // 重新加载会话列表和更新徽章
    loadConversations();
    updateTotalUnreadBadge();
}

// 显示聊天窗口视图
function showChatView() {
    document.getElementById('conversations-view').classList.remove('active');
    document.getElementById('chat-view').classList.add('active');
    document.getElementById('notifications-view').classList.remove('active');
}

// 显示系统通知视图
function showNotificationsView() {
    document.getElementById('conversations-view').classList.remove('active');
    document.getElementById('chat-view').classList.remove('active');
    document.getElementById('notifications-view').classList.add('active');

    // 加载系统通知并更新徽章
    loadSystemNotifications();
    updateSystemUnreadBadge();
}

// 加载系统通知
async function loadSystemNotifications() {
    try {
        const response = await fetch(`${API_BASE}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const messages = await response.json();

        if (response.ok) {
            displaySystemNotifications(messages);
            // 加载后更新徽章
            updateSystemUnreadBadge();
        }
    } catch (error) {
        console.error('加载系统通知失败:', error);
    }
}

// 显示系统通知
function displaySystemNotifications(messages) {
    const notificationsList = document.getElementById('notifications-list');
    let html = '';

    if (messages.length === 0) {
        html = '<div style="text-align: center; padding: 40px; color: #999;">暂无通知</div>';
    } else {
        messages.forEach(message => {
            let actionButtons = '';

            // 如果是好友申请消息，添加接受/拒绝按钮
            if (message.message_type === 'friend_request' && message.friendship_status === 'pending') {
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

            html += `
                <div class="message-item ${!message.is_read ? 'unread' : ''}" onclick="markAsReadAndRefresh(${message.id})">
                    <div style="font-weight: bold;">${message.sender_username || '系统'}</div>
                    <div class="message-content">${message.content}</div>
                    <div class="message-time">${new Date(message.created_at).toLocaleString()}</div>
                    ${actionButtons}
                </div>
            `;
        });
    }

    notificationsList.innerHTML = html;
}

// 标记为已读并刷新徽章
async function markAsReadAndRefresh(messageId) {
    await markAsRead(messageId);
    // 刷新系统通知和总未读数
    updateSystemUnreadBadge();
    updateTotalUnreadBadge();
    // 重新加载通知列表以更新显示
    loadSystemNotifications();
}

// 全部标记为已读（聊天和系统通知）
async function markAllMessagesAsRead() {
    try {
        // 标记所有系统通知为已读
        const response1 = await fetch(`${API_BASE}/messages/mark-all-read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // 标记所有聊天消息为已读
        const response2 = await fetch(`${API_BASE}/chat/mark-all-read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response1.ok && response2.ok) {
            showMessage('所有消息已标记为已读', 'success');
            // 立即刷新相关界面
            loadConversations();
            loadSystemNotifications();
            updateTotalUnreadBadge();
        } else {
            showMessage('标记已读失败', 'error');
        }
    } catch (error) {
        console.error('全部标记已读失败:', error);
        showMessage('操作失败，请重试', 'error');
    }
}

// 标记所有系统通知为已读
async function markAllNotificationsAsRead() {
    try {
        const response = await fetch(`${API_BASE}/messages/mark-all-read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showMessage('所有通知已标记为已读', 'success');
            // 立即刷新相关界面
            loadSystemNotifications();
            updateSystemUnreadBadge();
            updateTotalUnreadBadge();
        } else {
            showMessage('标记已读失败', 'error');
        }
    } catch (error) {
        console.error('标记通知已读失败:', error);
        showMessage('操作失败，请重试', 'error');
    }
}

// 修改原有的 showPage 函数，添加消息页面的处理
const originalShowPage = showPage;
showPage = function (pageName) {
    originalShowPage(pageName);

    if (pageName === 'messages') {
        // 显示会话列表视图
        showConversationsView();
        // 立即更新未读数，但不自动标记为已读
        updateSystemUnreadBadge();
        updateTotalUnreadBadge();
    }
};

// 添加发送消息按钮事件监听
document.addEventListener('DOMContentLoaded', function () {
    const sendBtn = document.getElementById('send-message-btn');
    const chatInput = document.getElementById('chat-input');

    if (sendBtn) {
        sendBtn.addEventListener('click', sendChatMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});
// ==================== 表情功能 ====================

// 表情数据
const emojiData = {
    smileys: [
        '😊', '😂', '🤣', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂',
        '🤗', '🤔', '😐', '😑', '🙄', '😏', '😣', '😥', '😮', '🤐',
        '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜', '😝', '🤤',
        '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖',
        '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯'
    ],
    gestures: [
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
        '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
        '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
        '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂'
    ],
    objects: [
        '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🎄', '🎃', '🎆', '🎇',
        '🧨', '✨', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎗️',
        '🎟️', '🎫', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '🏀',
        '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓'
    ],
    nature: [
        '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱',
        '🪴', '🌲', '🌳', '🌴', '🌵', '🌶️', '🍄', '🌾', '💐', '🌿',
        '🍀', '🍃', '🍂', '🍁', '🌊', '🌀', '🌈', '🌂', '☂️', '☔',
        '⛱️', '⚡', '❄️', '☃️', '⛄', '☄️', '🔥', '💧', '🌟', '⭐'
    ],
    food: [
        '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
        '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
        '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔',
        '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈'
    ]
};

let currentEmojiCategory = 'smileys';

// 切换表情选择器显示/隐藏
function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emoji-picker');
    const isHidden = emojiPicker.classList.contains('hidden');
    
    if (isHidden) {
        emojiPicker.classList.remove('hidden');
        showEmojiCategory(currentEmojiCategory);
    } else {
        emojiPicker.classList.add('hidden');
    }
}

// 显示指定分类的表情
function showEmojiCategory(category) {
    currentEmojiCategory = category;
    
    // 更新分类按钮状态
    document.querySelectorAll('.emoji-category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // 显示表情网格
    const emojiGrid = document.getElementById('emoji-grid');
    const emojis = emojiData[category] || [];
    
    let html = '';
    emojis.forEach(emoji => {
        html += `<button class="emoji-item" onclick="insertEmoji('${emoji}')">${emoji}</button>`;
    });
    
    emojiGrid.innerHTML = html;
}

// 插入表情到输入框
function insertEmoji(emoji) {
    const chatInput = document.getElementById('chat-input');
    const currentValue = chatInput.value;
    const cursorPosition = chatInput.selectionStart;
    
    // 在光标位置插入表情
    const newValue = currentValue.slice(0, cursorPosition) + emoji + currentValue.slice(cursorPosition);
    chatInput.value = newValue;
    
    // 设置光标位置到表情后面
    const newCursorPosition = cursorPosition + emoji.length;
    chatInput.setSelectionRange(newCursorPosition, newCursorPosition);
    
    // 聚焦输入框
    chatInput.focus();
    
    // 隐藏表情选择器
    document.getElementById('emoji-picker').classList.add('hidden');
}

// 点击页面其他地方时关闭表情选择器
document.addEventListener('click', function(e) {
    const emojiPicker = document.getElementById('emoji-picker');
    const emojiBtn = document.querySelector('.emoji-btn');
    
    if (emojiPicker && !emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
        emojiPicker.classList.add('hidden');
    }
});

// 初始化表情功能
function initializeEmojiFeature() {
    // 默认显示笑脸分类
    showEmojiCategory('smileys');
}

// 页面加载完成后初始化表情功能
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeEmojiFeature();
    }, 100);
});