// 预设头像配置
const AVATAR_CATEGORIES = {
    // 基础人物
    basic: {
        name: '基础头像',
        avatars: ['👤', '👨', '👩', '🧑', '👦', '👧']
    },
    
    // 职业人物
    professional: {
        name: '职业形象',
        avatars: ['👨‍💼', '👩‍💼', '🧑‍💻', '👨‍🎓', '👩‍🎓', '🧑‍🎨', '👨‍🚀', '👩‍🚀', '👨‍⚕️', '👩‍⚕️']
    },
    
    // 风格头像
    style: {
        name: '风格头像',
        avatars: ['🧔', '👱', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦲', '👩‍🦲', '🧑‍🦳', '👴', '👵']
    },
    
    // 动物头像
    animals: {
        name: '动物头像',
        avatars: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸']
    },
    
    // 表情头像
    emoji: {
        name: '表情头像',
        avatars: ['😀', '😃', '😄', '😁', '😊', '😇', '🙂', '🤗', '🤔', '😎', '🤓', '🥳']
    },
    
    // 特殊头像
    special: {
        name: '特殊头像',
        avatars: ['🤖', '👽', '👻', '🎭', '🎪', '🎨', '🎯', '🎲', '🎮', '🎸', '🎤', '🎧']
    }
};

// 获取所有头像
function getAllAvatars() {
    const allAvatars = [];
    Object.values(AVATAR_CATEGORIES).forEach(category => {
        allAvatars.push(...category.avatars);
    });
    return allAvatars;
}

// 获取默认头像
function getDefaultAvatar() {
    return '👤';
}

// 验证头像是否有效
function isValidAvatar(avatar) {
    return getAllAvatars().includes(avatar);
}

// 获取随机头像
function getRandomAvatar() {
    const allAvatars = getAllAvatars();
    return allAvatars[Math.floor(Math.random() * allAvatars.length)];
}

module.exports = {
    AVATAR_CATEGORIES,
    getAllAvatars,
    getDefaultAvatar,
    isValidAvatar,
    getRandomAvatar
};