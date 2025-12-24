
// 从排行榜打开聊天
function openConversationFromRanking(friendId, friendName, friendAvatar) {
    // 切换到消息页面
    showPage('messages');

    // 稍微延迟一下，确保页面已切换
    setTimeout(() => {
        openConversation(friendId, friendName, friendAvatar);
    }, 100);
}
