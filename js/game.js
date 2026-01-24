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
        const normalPerBoss = CONFIG.NORMAL_STAGES_PER_BOSS;
        let currentWordIndex = 0;
        let stageCount = 1;
        let normalStageCount = 0;

        // 循環生成普通關卡與小魔王
        while (currentWordIndex < totalWords) {
            // 普通關卡
            const start = currentWordIndex;
            const end = Math.min(start + CONFIG.QUESTIONS_PER_STAGE, totalWords);

            const stageIndex = stageCount++;

            stages.push({
                index: stageIndex,
                type: 'NORMAL',
                start: start,
                end: end,
                label: `關卡 ${stageIndex}`
            });

            currentWordIndex = end;
            normalStageCount++;

            // 檢查是否需要插入小魔王
            // 條件: 滿 3 個普通關卡 且 還有剩餘單字 (如果不剩單字，則最後會是大魔王)
            if (normalStageCount === normalPerBoss && currentWordIndex < totalWords) {
                stages.push({
                    index: stageCount++,
                    type: 'BOSS', // 小魔王
                    rangeEnd: currentWordIndex, // 包含直到目前的單字
                    label: `小魔王`
                });
                normalStageCount = 0; // 重置計數
            }
        }

        // 最後如果最後一個關卡是小魔王，應該替換成大魔王? 
        // 或者是追加一個大魔王。需求: "最後有大魔王"
        // 如果剛好結束在小魔王之後，那就直接加一個大魔王。
        // 如果結束在普通關卡之後(例如只剩2關)，那就追加一個小魔王(如果需要?)，然後再大魔王?
        // 需求: "關卡 7: 小魔王... 因為已經沒有單字... 關卡 8: 大魔王... 改成 最後 才有大魔王"
        // 邏輯: 所有的單字都走完普通關卡後，如果前一個不是BOSS，可能補一個小BOSS?
        // 不，需求範例是: 單字 1-47 隨機出題... 大魔王
        // 所以:
        // 1. 生成所有普通關卡直到單字用完 (中間穿插小魔王)
        // 2. 如果最後一個生成的正好是小魔王(因為剛好滿3關)，把它移除，或保留？
        // 需求範例中: 關卡 6 (41-47) -> 關卡 7 (小魔王 31-47) -> 關卡 8 (大魔王 1-47)
        // 這意味著即便最後不足 3 關 (4-6只有3關? 不, 4是Boss. 5,6是普通)，最後還是會有一個小魔王 covering the last chunk.
        // 然後最後追加一個 Big Boss covering everything.

        // 修正邏輯:
        // 在上面的循環中，我們是每滿 3 關普通關卡加一個小魔王。
        // 如果循環結束時，normalStageCount > 0 (表示有殘餘的普通關卡未經小魔王驗收)，
        // 則追加一個小魔王。

        if (normalStageCount > 0) {
            stages.push({
                index: stageCount++,
                type: 'BOSS',
                rangeEnd: currentWordIndex,
                label: `小魔王`
            });
        }

        // 最後追加大魔王
        stages.push({
            index: stageCount++,
            type: 'BIG_BOSS',
            rangeEnd: totalWords,
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

        // 設置愛心
        this.maxHearts = CONFIG.PLAYER_HEARTS;
        this.hearts = this.maxHearts;

        // 設置怪物 HP
        this.maxMonsterHP = this.calculateMonsterHP();
        this.monsterHP = this.maxMonsterHP;

        // 重置答題統計
        this.correctAnswers = 0;
        this.questionsToClear = this.vocabularyList.length;
    }

    // 計算怪物 HP
    calculateMonsterHP() {
        if (this.isBigBoss) return CONFIG.MONSTER_HP_BIG_BOSS;
        // 普通關卡和小魔王都是 10 HP (或根據題目數量? 需求說是 10 HP)
        // 注意: Boss 關卡題目是隨機選 10 題，所以也是 10 HP。
        return CONFIG.MONSTER_HP_BOSS;
    }

    // 獲取關卡詞彙列表
    getStageVocabulary(config) {
        if (config.type === 'NORMAL') {
            return this.allVocabulary.slice(config.start, config.end);
        } else if (config.type === 'BOSS') {
            // 小魔王: 從本次小週期(通常是前3關)的範圍隨機選 10 題
            // 範圍結束是 config.rangeEnd。範圍開始呢？
            // 為了簡化，小魔王考的是 "最近的一批"。
            // 假設每批 30 字。如果是最後一批可能只有 17 字 (31-47)。
            // 我們可以簡單地拿 rangeEnd 往前推 30 個字 (或是全部，如果不到30)。
            // 或者更精確地：小魔王涵蓋 "未被上一個小魔王涵蓋" 的區域... 這需要狀態記憶。
            // 簡單做法：rangeEnd 往回推，直到上一個 Boss 的 rangeEnd 嗎? 不容易知道。
            // 採用需求暗示： "31-47" -> 17 個字。
            // 我們可以拿 rangeEnd 往前推 30 個字作為池子。
            const poolEnd = config.rangeEnd;
            const poolStart = Math.max(0, poolEnd - (CONFIG.NORMAL_STAGES_PER_BOSS * CONFIG.QUESTIONS_PER_STAGE));
            const pool = this.allVocabulary.slice(poolStart, poolEnd);
            return this.shuffleArray([...pool]).slice(0, CONFIG.BOSS_QUESTIONS);

        } else if (config.type === 'BIG_BOSS') {
            // 大魔王: 全部隨機選 20 題
            const pool = this.allVocabulary.slice(0, config.rangeEnd);
            return this.shuffleArray([...pool]).slice(0, CONFIG.BIG_BOSS_QUESTIONS);
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

    // 下一題 (未變更)
    nextQuestion() {
        this.currentQuestionIndex++;
        return this.generateQuestion();
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
