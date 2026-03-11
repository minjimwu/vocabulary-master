// 遊戲邏輯模塊
class GameState {
    constructor() {
        this.category = null;
        this.stageNumber = 1;
        this.currentQuestionIndex = 0;
        this.hearts = 0; // 玩家愛心
        this.maxHearts = 0;
        this.monsterHP = 0; // 怪物 HP
        this.maxMonsterHP = 0;
        this.isBoss = false; // 是否為小魔王
        this.isBigBoss = false; // 是否為大魔王
        this.vocabularyList = []; // 本關卡原始題目列表
        this.allVocabulary = [];
        this.currentQuestion = null;
        this.correctAnswers = 0; // 答對總數 (包括重試題)
        this.questionsToClear = 0; // 需要答對的淨題目數 (用於怪物扣血參考)
        this.stageConfig = null; // 當前關卡的設定 (from generateStageMap)

        // 題目隊列
        this.pendingQuestions = []; // 尚未出過的題目
        this.retryQuestions = []; // 答錯需要重考的題目

        // 寶物背包 (戰鬥中持有)
        this.inventory = {};
        this.lastQuestionWord = null; // 紀錄上一個出題單字，用於避免重複
    }

    // 生成關卡地圖 (靜態方法)
    static generateStageMap(totalWords) {
        const stages = [];
        let currentWordIndex = 0;
        let stageCount = 1;

        // 用於追蹤當前 "小魔王週期" 的起始點
        let groupStartIndex = 0;
        let normalStageCountInGroup = 0;

        // 1. 循環生成普通關卡
        const wordsPerStage = CONFIG.STAGE_GENERATION.WORDS_PER_NORMAL_STAGE;
        const stagesPerBoss = CONFIG.STAGE_GENERATION.NORMAL_STAGES_PER_BOSS;

        while (currentWordIndex < totalWords) {
            const start = currentWordIndex;
            const end = Math.min(start + wordsPerStage, totalWords); // 使用參數控制每關單字數

            // 加入普通關卡
            stages.push({
                index: stageCount++,
                type: 'NORMAL',
                start: start,
                end: end,
                label: `關卡 ${stageCount - 1}`
            });

            currentWordIndex = end;
            normalStageCountInGroup++;

            // 每 N 關普通關卡後，插入一個小魔王
            if (normalStageCountInGroup === stagesPerBoss) {
                stages.push({
                    index: stageCount++,
                    type: 'BOSS', // 小魔王
                    start: groupStartIndex,
                    end: currentWordIndex, // 範圍: 這一組的開始到現在
                    label: `小魔王`
                });
                // 重置組計數與起始點
                normalStageCountInGroup = 0;
                groupStartIndex = currentWordIndex;
            }
        }

        // 2. 處理剩餘的普通關卡 (如果有殘餘未滿 3 關，或剛好滿了但循環結束)
        // 注意: 如果剛好滿3關，上面的 if 會執行，normalStageCountInGroup 變為 0。
        // 如果有剩餘 (例如 2 關)，則追加一個小魔王涵蓋這些剩餘關卡。
        if (normalStageCountInGroup > 0) {
            stages.push({
                index: stageCount++,
                type: 'BOSS',
                start: groupStartIndex,
                end: currentWordIndex,
                label: `小魔王`
            });
        }

        // 3. 最後追加大魔王 (包含所有單字)
        stages.push({
            index: stageCount++,
            type: 'BIG_BOSS',
            start: 0,
            end: totalWords,
            label: `大魔王`
        });

        return stages;
    }

    // 初始化關卡
    // stageConfig: { index, type, start, end, rangeEnd }
    startStage(category, stageConfig, vocabularyData, persistentInventory) {
        this.category = category;
        this.stageConfig = stageConfig;
        this.stageNumber = stageConfig.index;
        this.currentQuestionIndex = 0;

        this.isBigBoss = stageConfig.type === 'BIG_BOSS';
        this.isBoss = stageConfig.type === 'BOSS';

        // 獲取該分類的所有詞彙
        this.allVocabulary = vocabularyData[category] || [];

        // 獲取本關卡的詞彙列表
        this.vocabularyList = this.getStageVocabulary(stageConfig);

        // 初始化題目隊列
        this.pendingQuestions = [...this.vocabularyList];
        this.retryQuestions = [];

        // 設置愛心
        this.hearts = CONFIG.PLAYER_HEARTS;
        this.maxHearts = CONFIG.PLAYER_HEARTS;

        // 設置怪物 HP
        const baseHP = this.calculateMonsterHP();
        this.monsterHP = baseHP;
        this.maxMonsterHP = this.monsterHP;

        // 重置答題統計
        this.correctAnswers = 0;
        this.questionsToClear = this.vocabularyList.length;

        // 初始化戰鬥背包
        this.inventory = { ...persistentInventory };
    }

    // 計算怪物 HP
    calculateMonsterHP() {
        if (this.isBigBoss) return CONFIG.MONSTER_HP.BIG_BOSS;
        if (this.isBoss) return CONFIG.MONSTER_HP.BOSS;
        return CONFIG.MONSTER_HP.NORMAL;
    }

    // 獲取關卡詞彙列表
    getStageVocabulary(config) {
        // config.start 和 config.end 現在已經由 generateStageMap 明確計算好
        if (config.type === 'NORMAL') {
            const vocabulary = this.allVocabulary.slice(config.start, config.end);

            // 補足單字數量：若不足 WORDS_PER_NORMAL_STAGE，從先前的單字庫中隨機挑選補位
            const targetCount = CONFIG.STAGE_GENERATION.WORDS_PER_NORMAL_STAGE;
            if (vocabulary.length < targetCount && this.allVocabulary.length > 0) {
                const needed = targetCount - vocabulary.length;
                // 排除目前關卡已有的單字
                const currentWordIds = new Set(vocabulary.map(v => v.word));
                const pool = this.allVocabulary.filter(v => !currentWordIds.has(v.word));

                if (pool.length > 0) {
                    const extraWords = this.shuffleArray([...pool]).slice(0, needed);
                    vocabulary.push(...extraWords);
                }
            }
            return vocabulary;
        } else if (config.type === 'BOSS') {
            // 小魔王: 雖然範圍是 config.start 到 config.end (例如 30 個字)，
            // 但怪物只有 10 HP。不過題庫是這 30 個字。
            // 我們返回全部這 30 個字作為 "潛在題庫"。
            // generateQuestion 會從這裡面挑。
            const pool = this.allVocabulary.slice(config.start, config.end);
            return this.shuffleArray([...pool]);
        } else if (config.type === 'BIG_BOSS') {
            // 大魔王: 全部單字
            const pool = this.allVocabulary.slice(config.start, config.end);
            return this.shuffleArray([...pool]);
        }
        return [];
    }

    // 生成題目
    generateQuestion() {
        let questionWord = null;

        if (this.pendingQuestions.length > 0) {
            // 優先從 pending 取，若首個單字與上一題重複且還有其他選項，則往後排
            if (this.lastQuestionWord && this.pendingQuestions[0].word === this.lastQuestionWord.word && this.pendingQuestions.length > 1) {
                const dup = this.pendingQuestions.shift();
                this.pendingQuestions.push(dup);
            }
            questionWord = this.pendingQuestions.shift();
        } else if (this.retryQuestions.length > 0) {
            // 從 retry 取，隨機挑選直到不重複 (若只有一個則還是只能選它)
            let index = Math.floor(Math.random() * this.retryQuestions.length);
            if (this.lastQuestionWord && this.retryQuestions.length > 1) {
                let attempts = 0;
                while (this.retryQuestions[index].word === this.lastQuestionWord.word && attempts < 10) {
                    index = Math.floor(Math.random() * this.retryQuestions.length);
                    attempts++;
                }
            }
            questionWord = this.retryQuestions.splice(index, 1)[0];
        } else if (this.monsterHP > 0 && this.hearts > 0) {
            // 題目耗盡重置題庫
            this.pendingQuestions = this.shuffleArray([...this.vocabularyList]);
            // 遞迴呼叫時會處理 pending 的重複邏輯
            return this.generateQuestion();
        } else {
            return null;
        }

        const correctWord = questionWord;
        this.lastQuestionWord = correctWord; // 更新最後使用的單字

        // 隨機決定題型
        const rand = Math.random();
        const weights = CONFIG.QUESTION_WEIGHTS;

        // 單字組成題：需要至少3個字母
        if (correctWord.word.length >= 3 && rand < weights.WORD_ASSEMBLY) {
            return this.generateWordAssemblyQuestion(correctWord);
        }

        // 填空題：需要至少2個字母
        if (correctWord.word.length >= 2 && rand < (weights.WORD_ASSEMBLY + weights.FILL_IN_BLANK)) {
            return this.generateFillInBlankQuestion(correctWord);
        }

        // 拼音題 (聽音 -> 拼字母)
        if (rand < (weights.WORD_ASSEMBLY + weights.FILL_IN_BLANK + weights.PHONETIC_SPELLING)) {
            return this.generatePhoneticSpellingQuestion(correctWord);
        }

        // 中文拼字題 (中文 -> 拼字母)
        if (rand < (weights.WORD_ASSEMBLY + weights.FILL_IN_BLANK + weights.PHONETIC_SPELLING + (weights.ZH_TO_SPELLING || 0))) {
            return this.generateZhToSpellingQuestion(correctWord);
        }

        // 中文->英文 或 英文->中文 (各佔剩餘的一部分)
        const mode = Math.random() < 0.5 ? 'zh-to-en' : 'en-to-zh';
        const wrongOptions = this.getWrongOptions(correctWord, 2);
        const options = this.shuffleArray([
            correctWord,
            ...wrongOptions
        ]);

        this.currentQuestion = {
            mode: mode,
            weakness: mode === 'zh-to-en' ? correctWord.chinese : correctWord.word,
            options: options.map(opt => mode === 'zh-to-en' ? opt.word : opt.chinese),
            answer: mode === 'zh-to-en' ? correctWord.word : correctWord.chinese,
            correctWord: correctWord
        };

        return this.currentQuestion;
    }

    // 生成填空題
    generateFillInBlankQuestion(correctWord) {
        const { optionCount, maxRemoveChars, maxOptionLength, minOptionLength } = CONFIG.GAME_PARAMS.FILL_IN_BLANK;
        const word = correctWord.word;
        const len = word.length;

        // 決定去除的長度：
        // 1. 至少留 1 個字 (len - 1)
        // 2. 不超過設定的挖空上限 (maxRemoveChars)
        // 3. 不能超過設定的最大選項長度 (maxOptionLength)
        const maxRemove = Math.min(len - 1, maxRemoveChars, maxOptionLength);

        if (maxRemove < 1) {
            return this.generateQuestion();
        }

        const removeCount = Math.floor(Math.random() * maxRemove) + 1; // 1 to maxRemove

        // 決定起始位置
        const maxStartIndex = len - removeCount;
        const startIndex = Math.floor(Math.random() * (maxStartIndex + 1));

        const extractedPart = word.substring(startIndex, startIndex + removeCount);

        // 生成 mask
        const mask = '_'.repeat(removeCount);
        const maskedWord = word.substring(0, startIndex) + mask + word.substring(startIndex + removeCount);

        // 生成錯誤選項
        const wrongOptionCount = optionCount - 1;
        const wrongOptions = [];
        let attempts = 0;

        while (wrongOptions.length < wrongOptionCount && attempts < 100) {
            attempts++;
            const randomWordObj = this.allVocabulary[Math.floor(Math.random() * this.allVocabulary.length)];
            const otherWord = randomWordObj.word;

            // 確保單字夠長
            if (otherWord.length < removeCount) continue;

            const start = Math.floor(Math.random() * (otherWord.length - removeCount + 1));
            const part = otherWord.substring(start, start + removeCount);

            // 檢查長度限制
            if (part.length > maxOptionLength) continue;

            if (part !== extractedPart && !wrongOptions.includes(part)) {
                wrongOptions.push(part);
            }
        }

        // 用隨機字母補足
        while (wrongOptions.length < wrongOptionCount) {
            let randomStr = '';
            const chars = 'abcdefghijklmnopqrstuvwxyz';
            // 隨機長度 (minOptionLength ~ removeCount, 但不超過 maxOptionLength)
            // 其實這裡應該跟 extractedPart 長度一致比較難猜? 還是隨機?
            // 需求是 "每個最多 3 個字母"，且題目是填空，通常選項長度該等於空格長度 (removeCount)
            // 讓我們鎖定長度為 removeCount，因為 removeCount 已經被限制在 maxOptionLength 內了
            const targetLen = removeCount;

            for (let k = 0; k < targetLen; k++) {
                randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            if (randomStr !== extractedPart && !wrongOptions.includes(randomStr)) {
                wrongOptions.push(randomStr);
            }
        }

        const options = this.shuffleArray([extractedPart, ...wrongOptions]);

        this.currentQuestion = {
            mode: 'fill-in-blank',
            // weakness 只顯示中文提示
            weakness: `${correctWord.chinese}`,
            maskedWord: maskedWord,
            options: options,
            answer: extractedPart,
            correctWord: correctWord
        };

        return this.currentQuestion;
    }

    // 生成單字組成題
    generateWordAssemblyQuestion(correctWord) {
        const word = correctWord.word;
        const len = word.length;

        // 將單字依照自然發音法 (Phonics) 邏輯切分成 2-5 份
        let parts = [];

        if (len <= 2) {
            // 長度不足或為2：直接每個字母切分
            parts = word.split('');
        } else {
            // 基礎音節正則表達式：尋找母音群及其前後的子音
            // [^aeiouy]* (開頭子音) + [aeiouy]+ (母音) + [^aeiouy]*$ (字尾子音) 或 [^aeiouy](?=[^aeiouy]) (母音後的單個子音，前提是後面還有子音)
            const match = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);

            if (!match) {
                // 如果正則完全沒有匹配 (例如全是子音如 "rhythm" 或未命中)，則對半切分
                const mid = Math.floor(len / 2);
                parts = [word.substring(0, mid), word.substring(mid)];
            } else {
                parts = [...match];

                // 確保沒有匹配到母音的尾部字母不會丟失
                const joined = parts.join('');
                if (joined.length < len) {
                    parts[parts.length - 1] += word.substring(joined.length);
                }

                // 若超過 5 份，合併相鄰最短的兩個部分
                while (parts.length > 5) {
                    let minLen = 999;
                    let mergeIdx = 0;
                    for (let i = 0; i < parts.length - 1; i++) {
                        if (parts[i].length + parts[i + 1].length < minLen) {
                            minLen = parts[i].length + parts[i + 1].length;
                            mergeIdx = i;
                        }
                    }
                    parts.splice(mergeIdx, 2, parts[mergeIdx] + parts[mergeIdx + 1]);
                }

                // 若只有 1 份，但單字超過 2 個字母，從中間對半切以增加題目的難度與互動
                if (parts.length === 1 && len > 2) {
                    const mid = Math.floor(len / 2);
                    parts = [word.substring(0, mid), word.substring(mid)];
                }
            }
        }

        // 打亂順序
        const shuffledParts = this.shuffleArray([...parts]);

        this.currentQuestion = {
            mode: 'word-assembly',
            weakness: correctWord.chinese,
            options: shuffledParts,
            answer: parts, // 正確順序
            correctWord: correctWord,
            selectedParts: [], // 玩家已選擇的部分
            remainingOptions: [...shuffledParts], // 剩餘可選的部分
            partsCount: parts.length // 保存分割數量供 UI 參考渲染
        };

        return this.currentQuestion;
    }

    // 生成拼音題 (聽音拼寫 - 字母重組)
    generatePhoneticSpellingQuestion(correctWord) {
        const word = correctWord.word.toLowerCase();

        // 將單字切分為單一字母
        const letters = word.split('');

        // 產生 3 個不在單字內的隨機干擾字母
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        const wrongLetters = [];
        let attempts = 0;

        while (wrongLetters.length < 3 && attempts < 100) {
            attempts++;
            const randomChar = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            // 確保隨機字母不包含在原始單字中，且尚未被加入干擾項目中
            if (!letters.includes(randomChar) && !wrongLetters.includes(randomChar)) {
                wrongLetters.push(randomChar);
            }
        }

        // 將原始字母與干擾字母合併後，一起打亂順序
        const allLetters = [...letters, ...wrongLetters];
        const shuffledLetters = this.shuffleArray(allLetters);

        this.currentQuestion = {
            mode: 'phonetic-spelling',
            weakness: '👂', // 放大鏡中的圖示
            targetWord: word,
            correctWord: correctWord, // 原始物件
            selectedLetters: [],
            remainingOptions: [...shuffledLetters], // 剩餘可選的字母池
            options: shuffledLetters // 初始選項就是打亂後的所有字母
        };

        return this.currentQuestion;
    }

    // 生成中文拼字題 (中文提示 -> 拼字母)
    generateZhToSpellingQuestion(correctWord) {
        const word = correctWord.word.toLowerCase();

        // 將單字切分為單一字母
        const letters = word.split('');

        // 產生 3 個不在單字內的隨機干擾字母
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        const wrongLetters = [];
        let attempts = 0;

        while (wrongLetters.length < 3 && attempts < 100) {
            attempts++;
            const randomChar = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            if (!letters.includes(randomChar) && !wrongLetters.includes(randomChar)) {
                wrongLetters.push(randomChar);
            }
        }

        const allLetters = [...letters, ...wrongLetters];
        const shuffledLetters = this.shuffleArray(allLetters);

        this.currentQuestion = {
            mode: 'zh-to-spelling',
            weakness: correctWord.chinese, // 顯示中文提示
            targetWord: word,
            correctWord: correctWord,
            selectedLetters: [],
            remainingOptions: [...shuffledLetters],
            options: shuffledLetters
        };

        return this.currentQuestion;
    }

    // 獲取錯誤選項 (未變更)
    getWrongOptions(correctWord, count) {
        const available = this.allVocabulary.filter(w =>
            w.word !== correctWord.word && w.chinese !== correctWord.chinese
        );

        const shuffled = this.shuffleArray([...available]);
        return shuffled.slice(0, count);
    }

    // 打亂數組 (未變更)
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // 檢查答案 (未變更)
    checkAnswer(selected) {
        const isCorrect = selected === this.currentQuestion.answer;
        if (isCorrect) {
            this.correctAnswers++;
        } else {
            this.retryQuestions.push(this.currentQuestion.correctWord);
        }
        return isCorrect;
    }

    // 更新狀態 (分離愛心與怪物血量) (未變更)
    updateStatus(isCorrect) {
        if (isCorrect) {
            this.monsterHP = Math.max(0, this.monsterHP - 1);
        } else {
            this.hearts = Math.max(0, this.hearts - 1);
        }
    }

    // (兼容舊接口)
    updateHP(isCorrect) {
        this.updateStatus(isCorrect);
    }

    // 下一題
    nextQuestion() {
        this.currentQuestionIndex++;
        // return this.generateQuestion(); // FIX: Do not generate here, app.js calls generateQuestion via showNextQuestion
    }

    // 檢查關卡是否結束
    checkStageEnd() {
        if (this.hearts <= 0) return true;
        if (this.monsterHP <= 0) return true;
        return false;
    }

    // 獲取答題統計
    getStats() {
        return {
            correctCount: this.correctAnswers,
            wordCount: this.vocabularyList.length
        };
    }

    // --- 寶物系統 ---

    // 獲得寶物
    addItem(type, count = 1) {
        const max = CONFIG.ITEMS.MAX_ACCUMULATION;
        if ((this.inventory[type] || 0) < max) {
            this.inventory[type] = (this.inventory[type] || 0) + count;
            return true;
        }
        return false;
    }

    // 使用寶物
    useItem(type) {
        if ((this.inventory[type] || 0) > 0) {
            this.inventory[type]--;
            return true;
        }
        return false;
    }
}
