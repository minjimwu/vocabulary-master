// 遊戲配置
const CONFIG = {
    // Google Sheets 數據源
    VOCABULARY_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTN4Eqv8Ojo7DTOmZ2Jx62xLGfiZI49QiWVg2tZyulpRoysEekhQIFyva59t77OwP-vkvEwSIR6Z0rg/pub?gid=0&single=true&output=csv',
    CATEGORIES_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTN4Eqv8Ojo7DTOmZ2Jx62xLGfiZI49QiWVg2tZyulpRoysEekhQIFyva59t77OwP-vkvEwSIR6Z0rg/pub?gid=202243508&single=true&output=csv',

    // 基礎遊戲參數
    PLAYER_HEARTS: 3, // 玩家初始愛心數量

    // 怪物血量配置
    MONSTER_HP: {
        NORMAL: 10,
        BOSS: 20,
        BIG_BOSS: 20
    },

    // 關卡生成配置
    STAGE_GENERATION: {
        WORDS_PER_NORMAL_STAGE: 3,
        NORMAL_STAGES_PER_BOSS: 2
    },

    // 題型出現權重 (0 ~ 1)
    QUESTION_WEIGHTS: {
        WORD_ASSEMBLY: 0.2,
        FILL_IN_BLANK: 0.2,
        PHONETIC_SPELLING: 0.3, // 新增拼音題
        TRANSLATION: 0.3
    },

    // 倒數計時設定 (秒)
    TIMER: {
        BOSS: 20,
        BIG_BOSS: 10,
        URGENT_THRESHOLD: 5 // 剩餘幾秒開始手震/變紅
    },

    // UI 與 動畫延遲 (毫秒)
    DELAYS: {
        NEXT_QUESTION: 2000,
        STAGE_END: 2000,
        WRONG_ANSWER_LOCK: 5, // 答錯強迫停留時間(秒) -> 注意 ui.js 邏輯
    },

    // 遊戲玩法參數
    GAME_PARAMS: {
        FILL_IN_BLANK: {
            optionCount: 3,      // 選項數量
            maxRemoveChars: 4,   // 最多挖掉幾個字母
            maxOptionLength: 3,  // 選項最大長度 (字母數)
            minOptionLength: 2   // 選項最小長度
        },
        WORD_ASSEMBLY: {
            partsCount: 3        // 拼字題切割份數
        },
        PHONETIC_SPELLING: {
            optionCount: 3       // 拼音題每次提供的字母數量
        }
    }
};
