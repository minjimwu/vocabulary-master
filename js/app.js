// 主應用程序
class App {
    constructor() {
        this.dataLoader = new DataLoader();
        this.gameState = new GameState();
        this.ui = new UI();
        this.audio = new AudioSystem();
        this.progressManager = new ProgressManager();
        this.vocabularyData = null;
        this.currentCategory = null;
        this.stageMap = []; // 存儲當前分類的關卡映射
    }

    // 初始化應用
    async init() {
        try {
            // 顯示加載中
            document.getElementById('app').innerHTML = '<div class="loading">加載中...</div>';

            // 加載數據
            const data = await this.dataLoader.loadAll();
            this.vocabularyData = data.vocabulary;

            // 顯示分類選擇
            this.ui.renderCategorySelection();
        } catch (error) {
            console.error('初始化失敗:', error);
            document.getElementById('app').innerHTML = '<div class="error">加載失敗,請重新整理頁面</div>';
        }
    }

    // 選擇分類
    selectCategory(category) {
        this.currentCategory = category;
        const totalWords = (this.vocabularyData[category] || []).length;

        // 生成關卡地圖
        this.stageMap = GameState.generateStageMap(totalWords);

        this.ui.renderStageSelection(category, this.progressManager, this.stageMap);
    }

    // 開始關卡
    // stageIndex: 1-based index from map
    startStage(category, stageIndex) {
        // 檢查關卡是否解鎖
        if (!this.progressManager.isStageUnlocked(category, stageIndex)) {
            alert('此關卡尚未解鎖!');
            return;
        }

        // 查找對應的 config
        const stageConfig = this.stageMap.find(s => s.index === stageIndex);
        if (!stageConfig) {
            console.error('找不到關卡設定:', stageIndex);
            return;
        }

        this.currentCategory = category;
        // 傳遞 config 給 game state
        this.gameState.startStage(category, stageConfig, this.vocabularyData);
        this.ui.renderGameScreen(this.gameState);
        this.showNextQuestion();
    }

    // 顯示下一題
    showNextQuestion() {
        const question = this.gameState.generateQuestion();

        if (!question) {
            // 題目已完成。檢查結果。
            if (this.gameState.monsterHP <= 0) {
                this.endStage(true);
            } else {
                // 題目用完但怪物沒死 (通常不應該發生，因為有重試機制，除非邏輯錯誤或特殊設定)
                // 但為了安全起見，視為失敗
                this.endStage(false);
            }
            return;
        }

        const totalQuestions = this.gameState.totalQuestions;
        // 注意：這裡如果用 currentQuestionIndex 顯示可能對於重考邏輯顯示有點怪
        // 暫時維持原樣
        const currentIndex = this.gameState.currentQuestionIndex + 1;

        this.ui.updateStatus(
            this.gameState.hearts,
            this.gameState.maxHearts,
            this.gameState.monsterHP,
            this.gameState.maxMonsterHP
        );
        this.ui.renderQuestion(question, currentIndex, totalQuestions);

        // 如果是 英文 -> 中文 模式 (顯示的是英文單字)，則朗讀該單字
        if (question.mode === 'en-to-zh') {
            this.audio.speak(question.correctWord.word);
        }
    }

    // 選擇武器(答題)
    selectWeapon(selected) {
        // 禁用所有按鈕
        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.disabled = true;
        });

        const isCorrect = this.gameState.checkAnswer(selected);
        const currentQ = this.gameState.currentQuestion;

        if (isCorrect) {
            // 答對
            this.audio.playHitSound();
            this.ui.animateHit();
            this.gameState.updateStatus(true);
            this.ui.updateStatus(
                this.gameState.hearts,
                this.gameState.maxHearts,
                this.gameState.monsterHP,
                this.gameState.maxMonsterHP
            );

            if (this.gameState.checkStageEnd()) {
                setTimeout(() => this.endStage(true), 1000);
                return;
            }

            setTimeout(() => {
                this.gameState.nextQuestion();
                this.showNextQuestion();
            }, 1000);

        } else {
            // 答錯
            this.audio.playMissSound();
            this.gameState.updateStatus(false);
            this.ui.updateStatus(
                this.gameState.hearts,
                this.gameState.maxHearts,
                this.gameState.monsterHP,
                this.gameState.maxMonsterHP
            );

            // 顯示答錯對話框
            // 播放正確單字的發音
            this.audio.speak(currentQ.correctWord.word);
            this.ui.showWrongAnswerDialog(currentQ, () => {
                if (this.gameState.hearts <= 0) {
                    this.endStage(false);
                } else {
                    this.gameState.nextQuestion();
                    this.showNextQuestion();
                }
            });
        }
    }

    // 取消選擇單字部分
    deselectWordPart(index) {
        const currentQ = this.gameState.currentQuestion;

        // 確保 index 有效
        if (index < 0 || index >= currentQ.selectedParts.length) return;

        // 移除該部分
        const removedPart = currentQ.selectedParts.splice(index, 1)[0];

        // 加回剩餘選項
        currentQ.remainingOptions.push(removedPart);

        // 更新 UI
        this.ui.updateWordAssembly(currentQ);

        // 恢復所有按鈕狀態 (以防之前因為選滿而被禁用)
        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.disabled = false;
        });
    }

    // 選擇單字部分（單字組成題專用）
    selectWordPart(part) {
        const currentQ = this.gameState.currentQuestion;

        // 添加選中的部分
        currentQ.selectedParts.push(part);

        // 從剩餘選項中移除
        const index = currentQ.remainingOptions.indexOf(part);
        if (index > -1) {
            currentQ.remainingOptions.splice(index, 1);
        }

        // 更新 UI 顯示
        this.ui.updateWordAssembly(currentQ);

        // 如果已選擇3個部分，檢查答案
        if (currentQ.selectedParts.length === 3) {
            // 禁用所有按鈕
            document.querySelectorAll('.weapon-btn').forEach(btn => {
                btn.disabled = true;
            });

            setTimeout(() => {
                // 檢查順序是否正確
                const isCorrect = currentQ.selectedParts.every((part, index) => part === currentQ.answer[index]);

                if (isCorrect) {
                    // 答對
                    this.audio.playHitSound();
                    this.ui.animateHit();
                    this.gameState.correctAnswers++;
                    this.gameState.updateStatus(true);
                    this.ui.updateStatus(
                        this.gameState.hearts,
                        this.gameState.maxHearts,
                        this.gameState.monsterHP,
                        this.gameState.maxMonsterHP
                    );

                    if (this.gameState.checkStageEnd()) {
                        setTimeout(() => this.endStage(true), 1000);
                        return;
                    }

                    setTimeout(() => {
                        this.gameState.nextQuestion();
                        this.showNextQuestion();
                    }, 1000);

                } else {
                    // 答錯
                    this.audio.playMissSound();
                    this.gameState.retryQuestions.push(currentQ.correctWord);
                    this.gameState.updateStatus(false);
                    this.ui.updateStatus(
                        this.gameState.hearts,
                        this.gameState.maxHearts,
                        this.gameState.monsterHP,
                        this.gameState.maxMonsterHP
                    );

                    // 顯示答錯對話框
                    // 播放正確單字的發音
                    this.audio.speak(currentQ.correctWord.word);
                    this.ui.showWrongAnswerDialog(currentQ, () => {
                        if (this.gameState.hearts <= 0) {
                            this.endStage(false);
                        } else {
                            this.gameState.nextQuestion();
                            this.showNextQuestion();
                        }
                    });
                }
            }, 300);
        }
    }


    // 結束關卡
    endStage(isVictory) {
        const stats = this.gameState.getStats();

        if (isVictory) {
            this.progressManager.saveStageResult(
                this.currentCategory,
                this.gameState.stageNumber,
                true
            );

            if (this.gameState.isBigBoss) {
                // 大魔王勝利 -> 播放終極動畫
                this.audio.playBossVictorySound();
                this.ui.showFinalVictoryAnimation(() => {
                    // 大魔王勝利後直接回首頁，不顯示結算畫面
                    this.ui.renderCategorySelection();
                });
                return; // 暫停渲染，等待動畫結束後直接回首頁
            } else if (this.gameState.isBoss) {
                this.audio.playBossVictorySound();
            } else {
                this.audio.playVictorySound();
            }
        }

        this.ui.renderStageResult(
            isVictory,
            this.gameState.isBoss || this.gameState.isBigBoss,
            this.currentCategory,
            this.gameState.stageNumber,
            0,
            stats,
            this.gameState
        );
    }

    // 下一關
    nextStage() {
        // 需要檢查是否還有下一關
        const nextIndex = this.gameState.stageNumber + 1;
        // 從 stageMap 檢查是否存在
        const exists = this.stageMap.some(s => s.index === nextIndex);

        if (exists) {
            this.startStage(this.currentCategory, nextIndex);
        } else {
            // 沒有下一關了，返回首頁 (分類選擇)
            alert('恭喜完成所有關卡!');
            this.ui.renderCategorySelection();
        }
    }

    // 逃跑
    escapeStage() {
        // 直接逃跑，不需要確認
        this.backToStageSelection();
    }

    // 返回關卡選擇
    backToStageSelection() {
        // 需重新生成 map 嗎？其實已經在 selectCategory 生成並傳入 renderStageSelection 了
        // 為了確保狀態一致，我們可以再次調用 renderStageSelection (map 已經存儲在 this.stageMap)
        if (this.stageMap.length > 0) {
            this.ui.renderStageSelection(this.currentCategory, this.progressManager, this.stageMap);
        } else {
            // fallback
            this.selectCategory(this.currentCategory);
        }
    }

    // 顯示設定頁面
    showSettings() {
        this.ui.renderSettings();
    }

    // 清空進度
    resetProgress() {
        if (confirm('確定要清空所有進度嗎?此操作無法復原!')) {
            this.progressManager.resetProgress();
            alert('進度已清空!');
            // 強制重新載入以確保狀態完全重置
            location.reload();
        }
    }
}

// 全局實例
let app;
let ui;

// 頁面加載完成後初始化
window.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app; // Explicitly expose to window
    ui = app.ui;
    window.ui = ui;   // Explicitly expose to window
    app.init();
});
