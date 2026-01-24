// 遊戲配置
const CONFIG = {
    // Google Sheets 數據源
    VOCABULARY_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTN4Eqv8Ojo7DTOmZ2Jx62xLGfiZI49QiWVg2tZyulpRoysEekhQIFyva59t77OwP-vkvEwSIR6Z0rg/pub?gid=0&single=true&output=csv',
    CATEGORIES_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTN4Eqv8Ojo7DTOmZ2Jx62xLGfiZI49QiWVg2tZyulpRoysEekhQIFyva59t77OwP-vkvEwSIR6Z0rg/pub?gid=202243508&single=true&output=csv',

    // 遊戲參數（愛心機制 & 怪物血量）
    PLAYER_HEARTS: 3, // 玩家初始愛心數量
    MONSTER_HP_NORMAL: 10, // 普通怪物血量
    MONSTER_HP_BOSS: 10,   // 小魔王血量
    MONSTER_HP_BIG_BOSS: 20, // 大魔王血量
    QUESTIONS_PER_STAGE: 10, // 每關題目數量
    NORMAL_STAGES_PER_BOSS: 3, // 每幾個普通關卡出現一個小魔王
    BOSS_QUESTIONS: 10, // 小魔王題目數量
    BIG_BOSS_QUESTIONS: 20, // 大魔王題目數量

    // 怪物圖片路徑
    MONSTER_IMAGES: {
        '幼蟲期': {
            normal: 'images/monsters/larva_normal.png',
            boss: 'images/monsters/larva_boss.png'
        },
        '結蛹期': {
            normal: 'images/monsters/pupa_normal.png',
            boss: 'images/monsters/pupa_boss.png'
        },
        '展翅期': {
            normal: 'images/monsters/wings_normal.png',
            boss: 'images/monsters/wings_boss.png'
        },
        '蝶舞期': {
            normal: 'images/monsters/butterfly_normal.png',
            boss: 'images/monsters/butterfly_boss.png'
        }
    }
};
