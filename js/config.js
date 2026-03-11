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
        FILL_IN_BLANK: 0.15,
        PHONETIC_SPELLING: 0.25, // 聽音 -> 拼字母
        ZH_TO_SPELLING: 0.2,    // 中文 -> 拼字母 (新增)
        TRANSLATION: 0.2
    },

    // 倒數計時設定 (秒)
    TIMER: {
        NORMAL: 40,
        BOSS: 30,
        BIG_BOSS: 20,
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
    },

    // 寶物配置
    ITEMS: {
        MAX_ACCUMULATION: 99, // 增加堆疊上限
        TYPES: {
            TIME_STOP_S: 'timeStopS', // 小時間停止 +20s
            TIME_STOP_L: 'timeStopL', // 大時間停止 +40s
            MEDKIT_S: 'medkitS',     // 小治療藥水 +1 HP
            MEDKIT_L: 'medkitL'      // 大治療藥水 +2 HP
        },
        SHOP: [
            { id: 'medkitS', name: '小治療藥水', icon: '💊', desc: '回復 1 點愛心', price: 6, effect: { type: 'hp', value: 1 } },
            { id: 'medkitL', name: '大治療藥水', icon: '💉', desc: '回復 2 點愛心', price: 10, effect: { type: 'hp', value: 2 } },
            { id: 'timeStopS', name: '小時間停止', icon: '⏱️', desc: '倒數時間 +20 秒', price: 6, effect: { type: 'time', value: 20 } },
            { id: 'timeStopL', name: '大時間停止', icon: '⏳', desc: '倒數時間 +40 秒', price: 10, effect: { type: 'time', value: 40 } }
        ]
    },

    // 獎勵配置
    REWARDS: {
        NORMAL: { min: 1, max: 3 },
        BOSS: { min: 4, max: 8 },
        BIG_BOSS: { min: 10, max: 15 }
    }
};
