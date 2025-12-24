// ==================== 广场功能 ====================

// 全局变量
let currentFilter = 'all';
let selectedCoverFile = null;
let selectedTags = [];

// 显示发帖模态框
function showCreatePostModal() {
    document.getElementById('create-post-modal').classList.remove('hidden');
    // 重置表单
    resetCreatePostForm();
}

// 关闭发帖模态框
function closeCreatePostModal() {
    document.getElementById('create-post-modal').classList.add('hidden');
    resetCreatePostForm();
}

// 重置发帖表单
function resetCreatePostForm() {
    document.getElementById('create-post-form').reset();
    document.getElementById('cover-preview').classList.add('hidden');
    document.getElementById('cover-placeholder').style.display = 'flex';
    document.getElementById('title-count').textContent = '0';
    document.getElementById('content-count').textContent = '0';
    selectedCoverFile = null;
    selectedTags = [];
    
    // 重置标签选择
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

// 选择封面图片
function selectCoverImage() {
    document.getElementById('cover-file-input').click();
}

// 处理封面图片选择
function handleCoverImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        showMessage('请选择图片文件', 'error');
        return;
    }

    // 检查文件大小（限制5MB）
    if (file.size > 5 * 1024 * 1024) {
        showMessage('图片大小不能超过5MB', 'error');
        return;
    }

    selectedCoverFile = file;

    // 预览图片
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('cover-image').src = e.target.result;
        document.getElementById('cover-preview').classList.remove('hidden');
        document.getElementById('cover-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// 移除封面图片
function removeCoverImage() {
    selectedCoverFile = null;
    document.getElementById('cover-preview').classList.add('hidden');
    document.getElementById('cover-placeholder').style.display = 'flex';
    document.getElementById('cover-file-input').value = '';
}

// 切换标签选择
function toggleTag(button) {
    const tag = button.dataset.tag;
    
    if (button.classList.contains('selected')) {
        // 取消选择
        button.classList.remove('selected');
        selectedTags = selectedTags.filter(t => t !== tag);
    } else {
        // 选择标签（最多3个）
        if (selectedTags.length >= 3) {
            showMessage('最多只能选择3个标签', 'warning');
            return;
        }
        button.classList.add('selected');
        selectedTags.push(tag);
    }
}

// 筛选帖子
function filterPosts(filter) {
    currentFilter = filter;
    
    // 更新筛选按钮状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="filterPosts('${filter}')"]`).classList.add('active');
    
    // 加载帖子
    loadPosts();
}

// 加载帖子列表
async function loadPosts() {
    try {
        const response = await fetch(`${API_BASE}/plaza/posts?filter=${currentFilter}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayPosts(data.posts);
        } else {
            console.error('加载帖子失败:', data.error);
            displayEmptyState();
        }
    } catch (error) {
        console.error('加载帖子失败:', error);
        displayEmptyState();
    }
}

// 显示帖子列表
function displayPosts(posts) {
    const postsList = document.getElementById('posts-list');

    if (posts.length === 0) {
        displayEmptyState();
        return;
    }

    let html = '';
    posts.forEach(post => {
        const timeStr = formatPostTime(post.created_at);
        const coverHtml = post.cover_image 
            ? `<img src="${post.cover_image}" alt="封面" class="post-cover">`
            : `<div class="post-cover placeholder">📝</div>`;

        const tagsHtml = post.tags ? post.tags.split(',').map(tag => 
            `<span class="post-tag">${tag.trim()}</span>`
        ).join('') : '';

        html += `
            <div class="post-card">
                <div class="post-clickable-area" onclick="viewPost(${post.id})">
                    ${coverHtml}
                    <div class="post-content">
                        <div class="post-header">
                            <div class="post-author-avatar">${post.author_avatar || '👤'}</div>
                            <div class="post-author-info">
                                <div class="post-author-name">${post.author_username}</div>
                                <div class="post-time">${timeStr}</div>
                            </div>
                        </div>
                        
                        <div class="post-title">${escapeHtml(post.title)}</div>
                        <div class="post-excerpt">${escapeHtml(post.content)}</div>
                        
                        ${tagsHtml ? `<div class="post-tags">${tagsHtml}</div>` : ''}
                    </div>
                </div>
                
                <div class="post-stats">
                    <div class="post-actions">
                        <div class="post-action ${post.user_liked ? 'liked' : ''}" onclick="toggleLike(${post.id});">
                            <span>${post.user_liked ? '❤️' : '🤍'}</span>
                            <span>${post.likes_count || 0}</span>
                        </div>
                        <div class="post-action" onclick="viewPost(${post.id});">
                            <span>💬</span>
                            <span>${post.comments_count || 0}</span>
                        </div>
                        <div class="post-action">
                            <span>👁️</span>
                            <span>${post.views_count || 0}</span>
                        </div>
                        ${post.is_author ? `
                            <div class="post-action post-menu">
                                <button class="post-menu-btn" onclick="togglePostMenu(${post.id});" title="更多操作">
                                    ⋮
                                </button>
                                <div class="post-menu-dropdown hidden" id="post-menu-${post.id}">
                                    <button onclick="deletePostFromList(${post.id});" class="delete-post-btn">
                                        🗑️ 删除帖子
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    postsList.innerHTML = html;
}

// 显示空状态
function displayEmptyState() {
    const postsList = document.getElementById('posts-list');
    const emptyMessages = {
        'all': { icon: '📝', text: '还没有帖子', hint: '成为第一个发帖的人吧！' },
        'latest': { icon: '🕐', text: '暂无最新帖子', hint: '等待更多精彩内容' },
        'hot': { icon: '🔥', text: '暂无热门帖子', hint: '发布优质内容获得更多关注' },
        'my': { icon: '✏️', text: '你还没有发布帖子', hint: '分享你的存活故事吧！' }
    };

    const message = emptyMessages[currentFilter] || emptyMessages['all'];

    postsList.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">${message.icon}</div>
            <div class="empty-state-text">${message.text}</div>
            <div class="empty-state-hint">${message.hint}</div>
        </div>
    `;
}

// 格式化帖子时间
function formatPostTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 1分钟内
    if (diff < 60 * 1000) {
        return '刚刚';
    }

    // 1小时内
    if (diff < 60 * 60 * 1000) {
        return `${Math.floor(diff / (60 * 1000))}分钟前`;
    }

    // 今天
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    // 一周内
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[date.getDay()];
    }

    // 更早
    return date.toLocaleDateString('zh-CN');
}

// 全局变量
let currentPostId = null;
let selectedFriendsForShare = [];

// 查看帖子详情
async function viewPost(postId) {
    currentPostId = postId;
    
    console.log('正在加载帖子详情:', postId);
    console.log('API URL:', `${API_BASE}/plaza/posts/${postId}`);
    console.log('Token:', token ? '存在' : '不存在');
    
    try {
        const response = await fetch(`${API_BASE}/plaza/posts/${postId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('响应状态:', response.status);
        
        const data = await response.json();
        console.log('响应数据:', data);

        if (response.ok) {
            // 先显示模态框
            document.getElementById('post-detail-modal').classList.remove('hidden');
            // 然后设置内容
            displayPostDetail(data.post);
            await loadComments(postId);
        } else {
            console.error('加载失败:', data.error);
            showMessage(data.error || '加载帖子失败', 'error');
        }
    } catch (error) {
        console.error('查看帖子详情失败 - 详细错误:', error);
        console.error('错误堆栈:', error.stack);
        showMessage('网络错误，请重试', 'error');
    }
}

// 显示帖子详情
function displayPostDetail(post) {
    console.log('开始显示帖子详情:', post);
    
    const postDetailContent = document.getElementById('post-detail-content');
    console.log('找到的元素:', postDetailContent);
    
    if (!postDetailContent) {
        console.error('未找到 post-detail-content 元素');
        showMessage('页面元素加载错误', 'error');
        return;
    }
    
    const timeStr = formatPostTime(post.created_at);
    
    const coverHtml = post.cover_image 
        ? `<img src="${post.cover_image}" alt="封面" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px; margin-bottom: 20px;">`
        : '';

    const tagsHtml = post.tags ? post.tags.split(',').map(tag => 
        `<span class="post-tag">${tag.trim()}</span>`
    ).join('') : '';

    postDetailContent.innerHTML = `
        <div class="post-header">
            <div class="post-author-avatar">${post.author_avatar || '👤'}</div>
            <div class="post-author-info">
                <div class="post-author-name">${post.author_username}</div>
                <div class="post-time">${timeStr}</div>
            </div>
        </div>
        
        ${coverHtml}
        
        <div class="post-title" style="font-size: 1.4rem; margin-bottom: 15px;">${escapeHtml(post.title)}</div>
        <div class="post-content" style="line-height: 1.6; margin-bottom: 20px; white-space: pre-wrap;">${escapeHtml(post.content)}</div>
        
        ${tagsHtml ? `<div class="post-tags" style="margin-bottom: 20px;">${tagsHtml}</div>` : ''}
        
        <div class="post-stats">
            <div class="post-actions">
                <div class="post-action ${post.user_liked ? 'liked' : ''}" onclick="toggleLikeInDetail(${post.id})">
                    <span>${post.user_liked ? '❤️' : '🤍'}</span>
                    <span id="detail-likes-count">${post.likes_count || 0}</span>
                </div>
                <div class="post-action">
                    <span>💬</span>
                    <span id="detail-comments-count">${post.comments_count || 0}</span>
                </div>
                <div class="post-action">
                    <span>👁️</span>
                    <span>${post.views_count || 0}</span>
                </div>
            </div>
        </div>
    `;

    // 显示/隐藏删除按钮
    const deleteBtn = document.getElementById('delete-post-btn');
    if (post.is_author) {
        deleteBtn.classList.remove('hidden');
    } else {
        deleteBtn.classList.add('hidden');
    }
}

// 关闭帖子详情
function closePostDetail() {
    document.getElementById('post-detail-modal').classList.add('hidden');
    currentPostId = null;
    
    // 清空评论输入
    document.getElementById('comment-input').value = '';
    document.getElementById('comment-char-count').textContent = '0';
    
    // 隐藏操作菜单
    document.getElementById('post-actions-dropdown').classList.add('hidden');
}

// 切换操作菜单
function togglePostActionsMenu() {
    const dropdown = document.getElementById('post-actions-dropdown');
    dropdown.classList.toggle('hidden');
}

// 在详情页切换点赞
async function toggleLikeInDetail(postId) {
    try {
        const response = await fetch(`${API_BASE}/plaza/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // 更新详情页的点赞状态
            const likeAction = document.querySelector('#post-detail-content .post-action');
            const likesCount = document.getElementById('detail-likes-count');
            
            if (likeAction && likesCount) {
                if (data.liked) {
                    likeAction.classList.add('liked');
                    likeAction.querySelector('span:first-child').textContent = '❤️';
                } else {
                    likeAction.classList.remove('liked');
                    likeAction.querySelector('span:first-child').textContent = '🤍';
                }
                
                // 更新点赞数（简单的+1/-1，实际应该从服务器获取）
                const currentCount = parseInt(likesCount.textContent);
                likesCount.textContent = data.liked ? currentCount + 1 : currentCount - 1;
            }
            
            // 同时更新主列表中的状态
            loadPosts();
        } else {
            showMessage(data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换点赞失败:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 切换点赞
async function toggleLike(postId) {
    try {
        const response = await fetch(`${API_BASE}/plaza/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // 重新加载帖子列表以更新点赞状态
            loadPosts();
        } else {
            showMessage(data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换点赞失败:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 发布帖子
async function createPost(event) {
    event.preventDefault();

    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();

    if (!title || !content) {
        showMessage('请填写标题和内容', 'error');
        return;
    }

    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '发布中...';

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('tags', selectedTags.join(','));
        
        if (selectedCoverFile) {
            formData.append('cover', selectedCoverFile);
        }

        const response = await fetch(`${API_BASE}/plaza/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('帖子发布成功！', 'success');
            closeCreatePostModal();
            // 切换到"我的"筛选并重新加载
            filterPosts('my');
        } else {
            showMessage(data.error || '发布失败', 'error');
        }
    } catch (error) {
        console.error('发布帖子失败:', error);
        showMessage('网络错误，请重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '发布';
    }
}

// 字符计数
function setupCharacterCount() {
    const titleInput = document.getElementById('post-title');
    const contentTextarea = document.getElementById('post-content');
    const titleCount = document.getElementById('title-count');
    const contentCount = document.getElementById('content-count');

    titleInput.addEventListener('input', function() {
        titleCount.textContent = this.value.length;
    });

    contentTextarea.addEventListener('input', function() {
        contentCount.textContent = this.value.length;
    });
}

// 初始化广场页面
function initializePlaza() {
    // 设置字符计数
    setupCharacterCount();
    
    // 设置表单提交
    const createPostForm = document.getElementById('create-post-form');
    if (createPostForm) {
        createPostForm.addEventListener('submit', createPost);
    }
    
    // 点击模态框外部关闭
    const createPostModal = document.getElementById('create-post-modal');
    if (createPostModal) {
        createPostModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeCreatePostModal();
            }
        });
    }
    
    // 自动点击"全部"按钮来加载帖子
    filterPosts('all');
}

// 修改原有的 showPage 函数，添加广场页面的处理
const originalShowPageForPlaza = showPage;
showPage = function(pageName) {
    originalShowPageForPlaza(pageName);

    if (pageName === 'plaza') {
        // 更新页面标题
        document.getElementById('page-title').textContent = '存活广场';
        
        // 初始化广场页面
        setTimeout(() => {
            initializePlaza();
        }, 100);
    }
};

// ==================== 评论系统功能 ====================

// 加载评论列表
async function loadComments(postId) {
    try {
        const response = await fetch(`${API_BASE}/plaza/posts/${postId}/comments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayComments(data.comments);
            document.getElementById('comments-count').textContent = data.comments.length;
            document.getElementById('detail-comments-count').textContent = data.comments.length;
        } else {
            console.error('加载评论失败:', data.error);
        }
    } catch (error) {
        console.error('加载评论失败:', error);
    }
}

// 显示评论列表
function displayComments(comments) {
    const commentsList = document.getElementById('comments-list');

    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <div class="empty-state-icon">💬</div>
                <div class="empty-state-text">还没有评论</div>
                <div class="empty-state-hint">成为第一个评论的人吧！</div>
            </div>
        `;
        return;
    }

    let html = '';
    comments.forEach(comment => {
        const timeStr = formatPostTime(comment.created_at);
        const repliesHtml = comment.replies ? displayReplies(comment.replies) : '';

        html += `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-avatar">${comment.author_avatar || '👤'}</div>
                    <div class="comment-author-info">
                        <div class="comment-author-name">${comment.author_username}</div>
                        <div class="comment-time">${timeStr}</div>
                    </div>
                </div>
                
                <div class="comment-content">${escapeHtml(comment.content)}</div>
                
                <div class="comment-actions">
                    <button class="comment-action ${comment.user_liked ? 'liked' : ''}" onclick="toggleCommentLike(${comment.id})">
                        <span>${comment.user_liked ? '❤️' : '🤍'}</span>
                        <span class="comment-likes-count">${comment.likes_count || 0}</span>
                    </button>
                    <button class="comment-action" onclick="toggleReplyInput(${comment.id})">
                        <span>💬</span>
                        <span>回复</span>
                    </button>
                </div>
                
                <div id="reply-input-${comment.id}" class="reply-input-area hidden">
                    <div class="reply-input-container">
                        <textarea placeholder="回复 ${comment.author_username}..." maxlength="300"></textarea>
                        <button class="reply-submit-btn" onclick="submitReply(${comment.id})">回复</button>
                    </div>
                </div>
                
                ${repliesHtml}
            </div>
        `;
    });

    commentsList.innerHTML = html;
}

// 显示回复列表
function displayReplies(replies) {
    if (!replies || replies.length === 0) return '';

    let html = '<div class="replies-list">';
    replies.forEach(reply => {
        const timeStr = formatPostTime(reply.created_at);
        html += `
            <div class="reply-item" data-reply-id="${reply.id}">
                <div class="comment-header">
                    <div class="comment-avatar">${reply.author_avatar || '👤'}</div>
                    <div class="comment-author-info">
                        <div class="comment-author-name">${reply.author_username}</div>
                        <div class="comment-time">${timeStr}</div>
                    </div>
                </div>
                
                <div class="comment-content">${escapeHtml(reply.content)}</div>
                
                <div class="comment-actions">
                    <button class="comment-action ${reply.user_liked ? 'liked' : ''}" onclick="toggleReplyLike(${reply.id})">
                        <span>${reply.user_liked ? '❤️' : '🤍'}</span>
                        <span class="reply-likes-count">${reply.likes_count || 0}</span>
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

// 提交评论
async function submitComment() {
    const commentInput = document.getElementById('comment-input');
    const content = commentInput.value.trim();

    if (!content) {
        showMessage('请输入评论内容', 'error');
        return;
    }

    if (!currentPostId) {
        showMessage('帖子信息错误', 'error');
        return;
    }

    const submitBtn = document.getElementById('submit-comment-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '发表中...';

    try {
        const response = await fetch(`${API_BASE}/plaza/posts/${currentPostId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (response.ok) {
            commentInput.value = '';
            document.getElementById('comment-char-count').textContent = '0';
            await loadComments(currentPostId);
            showMessage('评论发表成功', 'success');
        } else {
            showMessage(data.error || '发表评论失败', 'error');
        }
    } catch (error) {
        console.error('发表评论失败:', error);
        showMessage('网络错误，请重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '发表';
    }
}

// 切换回复输入框
function toggleReplyInput(commentId) {
    const replyInput = document.getElementById(`reply-input-${commentId}`);
    replyInput.classList.toggle('hidden');
    
    if (!replyInput.classList.contains('hidden')) {
        const textarea = replyInput.querySelector('textarea');
        textarea.focus();
    }
}

// 提交回复
async function submitReply(commentId) {
    const replyInput = document.getElementById(`reply-input-${commentId}`);
    const textarea = replyInput.querySelector('textarea');
    const content = textarea.value.trim();

    if (!content) {
        showMessage('请输入回复内容', 'error');
        return;
    }

    const submitBtn = replyInput.querySelector('.reply-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '回复中...';

    try {
        const response = await fetch(`${API_BASE}/plaza/comments/${commentId}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (response.ok) {
            textarea.value = '';
            replyInput.classList.add('hidden');
            await loadComments(currentPostId);
            showMessage('回复发表成功', 'success');
        } else {
            showMessage(data.error || '发表回复失败', 'error');
        }
    } catch (error) {
        console.error('发表回复失败:', error);
        showMessage('网络错误，请重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '回复';
    }
}

// 切换评论点赞
async function toggleCommentLike(commentId) {
    try {
        const response = await fetch(`${API_BASE}/plaza/comments/${commentId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // 更新点赞状态
            const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
            const likeAction = commentItem.querySelector('.comment-action');
            const likesCount = commentItem.querySelector('.comment-likes-count');
            
            if (data.liked) {
                likeAction.classList.add('liked');
                likeAction.querySelector('span:first-child').textContent = '❤️';
            } else {
                likeAction.classList.remove('liked');
                likeAction.querySelector('span:first-child').textContent = '🤍';
            }
            
            const currentCount = parseInt(likesCount.textContent);
            likesCount.textContent = data.liked ? currentCount + 1 : currentCount - 1;
        } else {
            showMessage(data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换评论点赞失败:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 切换回复点赞
async function toggleReplyLike(replyId) {
    try {
        const response = await fetch(`${API_BASE}/plaza/replies/${replyId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // 更新点赞状态
            const replyItem = document.querySelector(`[data-reply-id="${replyId}"]`);
            const likeAction = replyItem.querySelector('.comment-action');
            const likesCount = replyItem.querySelector('.reply-likes-count');
            
            if (data.liked) {
                likeAction.classList.add('liked');
                likeAction.querySelector('span:first-child').textContent = '❤️';
            } else {
                likeAction.classList.remove('liked');
                likeAction.querySelector('span:first-child').textContent = '🤍';
            }
            
            const currentCount = parseInt(likesCount.textContent);
            likesCount.textContent = data.liked ? currentCount + 1 : currentCount - 1;
        } else {
            showMessage(data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换回复点赞失败:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// ==================== 分享功能 ====================

// 分享帖子
async function sharePost() {
    // 隐藏操作菜单
    document.getElementById('post-actions-dropdown').classList.add('hidden');
    
    // 加载好友列表
    await loadFriendsForShare();
    
    // 显示分享模态框
    document.getElementById('share-post-modal').classList.remove('hidden');
    
    // 设置帖子预览 - 使用正确的选择器
    const postTitleElement = document.querySelector('#post-detail-content .post-title');
    const postContentElement = document.querySelector('#post-detail-content .post-content');
    
    if (postTitleElement && postContentElement) {
        const postTitle = postTitleElement.textContent;
        const postContent = postContentElement.textContent;
        
        document.getElementById('share-post-title').textContent = postTitle;
        document.getElementById('share-post-excerpt').textContent = 
            postContent.length > 100 ? postContent.substring(0, 100) + '...' : postContent;
    } else {
        console.error('无法找到帖子标题或内容元素');
        document.getElementById('share-post-title').textContent = '帖子标题';
        document.getElementById('share-post-excerpt').textContent = '帖子内容预览...';
    }
}

// 加载好友列表用于分享
async function loadFriendsForShare() {
    try {
        const response = await fetch(`${API_BASE}/profile/friends`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayFriendsForShare(data.friends);
        } else {
            console.error('加载好友列表失败:', data.error);
        }
    } catch (error) {
        console.error('加载好友列表失败:', error);
    }
}

// 显示好友列表
function displayFriendsForShare(friends) {
    const friendsList = document.getElementById('friends-list-for-share');

    if (friends.length === 0) {
        friendsList.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <div class="empty-state-text">暂无好友</div>
                <div class="empty-state-hint">添加好友后可以分享帖子</div>
            </div>
        `;
        return;
    }

    let html = '';
    friends.forEach(friend => {
        html += `
            <div class="friend-item" onclick="toggleFriendSelection(${friend.id}, '${friend.username}', '${friend.avatar || '👤'}')">
                <div class="friend-avatar">${friend.avatar || '👤'}</div>
                <div class="friend-name">${friend.username}</div>riend-name">${friend.username}</div>
                <div class="friend-checkbox">
                    <span style="display: none;">✓</span>
                </div>
            </div>
        `;
    });

    friendsList.innerHTML = html;
}

// 切换好友选择
function toggleFriendSelection(friendId, friendName, friendAvatar) {
    const friendItem = event.currentTarget;
    const checkbox = friendItem.querySelector('.friend-checkbox span');
    
    if (friendItem.classList.contains('selected')) {
        // 取消选择
        friendItem.classList.remove('selected');
        checkbox.style.display = 'none';
        selectedFriendsForShare = selectedFriendsForShare.filter(f => f.id !== friendId);
    } else {
        // 选择好友
        friendItem.classList.add('selected');
        checkbox.style.display = 'block';
        selectedFriendsForShare.push({
            id: friendId,
            username: friendName,
            avatar: friendAvatar
        });
    }
    
    // 更新分享按钮状态
    const shareBtn = document.querySelector('.share-btn');
    shareBtn.disabled = selectedFriendsForShare.length === 0;
}

// 确认分享
async function confirmShare() {
    if (selectedFriendsForShare.length === 0) {
        showMessage('请选择要分享的好友', 'error');
        return;
    }

    const shareMessage = document.getElementById('share-message').value.trim();
    const shareBtn = document.querySelector('.share-btn');
    
    shareBtn.disabled = true;
    shareBtn.textContent = '分享中...';

    try {
        const response = await fetch(`${API_BASE}/plaza/posts/${currentPostId}/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                friendIds: selectedFriendsForShare.map(f => f.id),
                message: shareMessage
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`成功分享给 ${selectedFriendsForShare.length} 位好友`, 'success');
            closeShareModal();
        } else {
            showMessage(data.error || '分享失败', 'error');
        }
    } catch (error) {
        console.error('分享帖子失败:', error);
        showMessage('网络错误，请重试', 'error');
    } finally {
        shareBtn.disabled = false;
        shareBtn.textContent = '分享';
    }
}

// 关闭分享模态框
function closeShareModal() {
    document.getElementById('share-post-modal').classList.add('hidden');
    selectedFriendsForShare = [];
    document.getElementById('share-message').value = '';
    
    // 重置好友选择状态
    document.querySelectorAll('.friend-item').forEach(item => {
        item.classList.remove('selected');
        item.querySelector('.friend-checkbox span').style.display = 'none';
    });
}

// 删除帖子
async function deletePost() {
    if (!confirm('确定要删除这篇帖子吗？删除后无法恢复。')) {
        return;
    }

    // 隐藏操作菜单
    document.getElementById('post-actions-dropdown').classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/plaza/posts/${currentPostId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('帖子删除成功', 'success');
            closePostDetail();
            // 重新加载帖子列表
            loadPosts();
        } else {
            showMessage(data.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除帖子失败:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 设置评论字符计数
function setupCommentCharacterCount() {
    const commentInput = document.getElementById('comment-input');
    const commentCharCount = document.getElementById('comment-char-count');

    if (commentInput && commentCharCount) {
        commentInput.addEventListener('input', function() {
            commentCharCount.textContent = this.value.length;
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 如果当前页面是广场页面，初始化
    const plazaPage = document.getElementById('plaza-page');
    if (plazaPage && plazaPage.classList.contains('active')) {
        initializePlaza();
    }
    
    // 设置评论字符计数
    setupCommentCharacterCount();
    
    // 点击模态框外部关闭
    const postDetailModal = document.getElementById('post-detail-modal');
    if (postDetailModal) {
        postDetailModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closePostDetail();
            }
        });
    }
    
    const sharePostModal = document.getElementById('share-post-modal');
    if (sharePostModal) {
        sharePostModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeShareModal();
            }
        });
    }
});

// 切换帖子菜单
function togglePostMenu(postId) {
    // 关闭所有其他菜单
    document.querySelectorAll('.post-menu-dropdown').forEach(menu => {
        if (menu.id !== `post-menu-${postId}`) {
            menu.classList.add('hidden');
        }
    });
    
    // 切换当前菜单
    const menu = document.getElementById(`post-menu-${postId}`);
    menu.classList.toggle('hidden');
}

// 从列表中删除帖子
async function deletePostFromList(postId) {
    if (!confirm('确定要删除这篇帖子吗？删除后无法恢复。')) {
        return;
    }

    // 关闭菜单
    document.getElementById(`post-menu-${postId}`).classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/plaza/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('帖子删除成功', 'success');
            // 重新加载帖子列表
            loadPosts();
        } else {
            showMessage(data.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除帖子失败:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 点击页面其他地方时关闭所有菜单
document.addEventListener('click', function(e) {
    if (!e.target.closest('.post-menu')) {
        document.querySelectorAll('.post-menu-dropdown').forEach(menu => {
            menu.classList.add('hidden');
        });
    }
});