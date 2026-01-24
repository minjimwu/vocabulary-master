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
        while (currentWordIndex < totalWords) {
            const start = currentWordIndex;
            const end = Math.min(start + 10, totalWords); // 強制 10 個單字一組

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

            // 每 3 關普通關卡後，插入一個小魔王
            if (normalStageCountInGroup === 3) {
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
    startStage(category, stageConfig, vocabularyData) {
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

        // 設置愛心: 固定 3 顆
        this.hearts = 3;
        this.maxHearts = 3;

        // 設置怪物 HP
        const baseHP = this.calculateMonsterHP();
        // 確保怪物血量不超過題目總數 (針對剩餘單字不足 10 的普通關卡)
        this.monsterHP = Math.min(baseHP, this.vocabularyList.length);
        this.maxMonsterHP = this.monsterHP;

        // 重置答題統計
        this.correctAnswers = 0;
        this.questionsToClear = this.vocabularyList.length;
    }

    // 計算怪物 HP
    calculateMonsterHP() {
        if (this.isBigBoss) return 20; // 大魔王 20 HP
        return 10; // 普通怪物 與 小魔王 都是 10 HP
    }

    // 獲取關卡詞彙列表
    getStageVocabulary(config) {
        // config.start 和 config.end 現在已經由 generateStageMap 明確計算好
        if (config.type === 'NORMAL') {
            return this.allVocabulary.slice(config.start, config.end);
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

    // 生成題目 (未變更)
    generateQuestion() {
        let questionWord = null;

        if (this.pendingQuestions.length > 0) {
            questionWord = this.pendingQuestions.shift();
        } else if (this.retryQuestions.length > 0) {
            const index = Math.floor(Math.random() * this.retryQuestions.length);
            questionWord = this.retryQuestions.splice(index, 1)[0];
        } else if (this.monsterHP > 0 && this.hearts > 0) {
            // 題目耗盡但戰鬥未結束：重置題庫繼續出題 (Endless Mode)
            // 需求: "若都沒題目了，則重覆出題庫的題目"
            this.pendingQuestions = this.shuffleArray([...this.vocabularyList]);
            return this.generateQuestion();
        } else {
            return null;
        }

        const correctWord = questionWord;
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

    // 檢查關卡是否結束 (未變更)
    checkStageEnd() {
        if (this.hearts <= 0) return true;
        if (this.monsterHP <= 0) return true;
        return this.pendingQuestions.length === 0 && this.retryQuestions.length === 0;
    }

    // 獲取答題統計
    getStats() {
        return {
            correctAnswers: this.correctAnswers,
            totalQuestions: this.questionsToClear
        };
    }
}
