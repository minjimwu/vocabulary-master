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
        this.timer = null; // 計時器 Interval
        this.timeLeft = 0;
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
        // 顯示預覽而非直接開始
        this.ui.renderStagePreview(this.gameState);
    }

    // 確認開始戰鬥
    confirmStartStage() {
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
        if (question.mode === 'en-to-zh' || question.mode === 'phonetic-spelling') {
            this.audio.speak(question.correctWord.word);
        }

        // 啟動計時器 (如果需要)
        this.startTimer();
    }

    // 啟動計時器
    startTimer() {
        this.stopTimer();
        this.ui.hideTimer();

        let duration = 0;
        if (this.gameState.isBigBoss) {
            duration = CONFIG.TIMER.BIG_BOSS;
        } else if (this.gameState.isBoss) {
            duration = CONFIG.TIMER.BOSS;
        }

        if (duration > 0) {
            this.timeLeft = duration;
            this.ui.updateTimer(this.timeLeft);

            this.timer = setInterval(() => {
                this.timeLeft--;
                const isUrgent = this.timeLeft <= CONFIG.TIMER.URGENT_THRESHOLD;
                this.ui.updateTimer(this.timeLeft, isUrgent);

                if (this.timeLeft <= 0) {
                    this.handleTimeout();
                }
            }, 1000);
        }
    }

    // 停止計時器
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    // 處理超時 (視為 MISS)
    handleTimeout() {
        this.stopTimer();

        // 禁用所有按鈕
        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.disabled = true;
        });

        const currentQ = this.gameState.currentQuestion;

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

    // 選擇武器(答題)
    selectWeapon(selected) {
        this.stopTimer();
        // 禁用所有按鈕
        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.disabled = true;
        });

        const isCorrect = this.gameState.checkAnswer(selected);
        const currentQ = this.gameState.currentQuestion;

        if (isCorrect) {
            // 答對
            this.audio.playHitSound();
            // 唸出單字
            this.audio.speak(currentQ.correctWord.word);
            this.ui.animateHit();
            this.ui.animateSwordAttack();
            this.gameState.updateStatus(true);
            this.ui.updateStatus(
                this.gameState.hearts,
                this.gameState.maxHearts,
                this.gameState.monsterHP,
                this.gameState.maxMonsterHP
            );

            if (this.gameState.checkStageEnd()) {
                setTimeout(() => this.endStage(true), CONFIG.DELAYS.STAGE_END);
                return;
            }

            setTimeout(() => {
                this.gameState.nextQuestion();
                this.showNextQuestion();
            }, CONFIG.DELAYS.NEXT_QUESTION);

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

        // 如果已進入選擇流程且計時器還在跑，不需要停，
        // 但如果想更嚴格一點，可以在點擊第一個 part 時就停，或是直到滿3個。
        // 這裡選擇直到滿3個再停。

        // 從剩餘選項中移除
        const index = currentQ.remainingOptions.indexOf(part);
        if (index > -1) {
            currentQ.remainingOptions.splice(index, 1);
        }

        // 更新 UI 顯示
        this.ui.updateWordAssembly(currentQ);

        // 如果已選擇3個部分，檢查答案
        if (currentQ.selectedParts.length === 3) {
            this.stopTimer();
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
                    // 唸出單字
                    this.audio.speak(currentQ.correctWord.word);
                    this.ui.animateHit();
                    this.ui.animateSwordAttack();
                    this.gameState.correctAnswers++;
                    this.gameState.updateStatus(true);
                    this.ui.updateStatus(
                        this.gameState.hearts,
                        this.gameState.maxHearts,
                        this.gameState.monsterHP,
                        this.gameState.maxMonsterHP
                    );

                    if (this.gameState.checkStageEnd()) {
                        setTimeout(() => this.endStage(true), 2000);
                        return;
                    }

                    setTimeout(() => {
                        this.gameState.nextQuestion();
                        this.showNextQuestion();
                    }, 2000);

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


    // 選擇拼音字母（拼音題專用）
    selectPhoneticLetter(letter) {
        const currentQ = this.gameState.currentQuestion;

        // 紀錄選擇
        currentQ.selectedLetters.push(letter);
        currentQ.currentIndex++;

        if (currentQ.currentIndex < currentQ.targetWord.length) {
            // 尚未結束：刷新選項並更新 UI
            currentQ.options = this.gameState.getPhoneticOptions(currentQ.targetWord, currentQ.currentIndex);
            this.ui.updatePhoneticSpelling(currentQ);
        } else {
            // 拼寫完成：顯示最後一個字母，清空選項，然後檢查最終結果
            currentQ.options = []; // 清空選項
            this.ui.updatePhoneticSpelling(currentQ);

            this.stopTimer();
            // 禁用按鈕
            document.querySelectorAll('.weapon-btn').forEach(btn => btn.disabled = true);

            setTimeout(() => {
                // 檢查最終拼寫字串是否與目標一致
                const finalSpelling = currentQ.selectedLetters.join('').toLowerCase();
                const isCorrect = finalSpelling === currentQ.targetWord.toLowerCase();

                if (isCorrect) {
                    // 答對
                    this.audio.playHitSound();
                    this.audio.speak(currentQ.correctWord.word);
                    this.ui.animateHit();
                    this.ui.animateSwordAttack();
                    this.gameState.correctAnswers++;
                    this.gameState.updateStatus(true);
                    this.ui.updateStatus(
                        this.gameState.hearts,
                        this.gameState.maxHearts,
                        this.gameState.monsterHP,
                        this.gameState.maxMonsterHP
                    );

                    if (this.gameState.checkStageEnd()) {
                        setTimeout(() => this.endStage(true), CONFIG.DELAYS.STAGE_END);
                        return;
                    }

                    setTimeout(() => {
                        this.gameState.nextQuestion();
                        this.showNextQuestion();
                    }, CONFIG.DELAYS.NEXT_QUESTION);
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

    // 重新選擇拼音字母
    deselectPhoneticLetter(index) {
        const currentQ = this.gameState.currentQuestion;
        if (currentQ.mode !== 'phonetic-spelling') return;

        // 回溯到該 index (只保留 index 之前的字母)
        currentQ.selectedLetters = currentQ.selectedLetters.slice(0, index);
        currentQ.currentIndex = index;

        // 重新獲取該位元的選項
        currentQ.options = this.gameState.getPhoneticOptions(currentQ.targetWord, currentQ.currentIndex);

        // 更新 UI
        this.ui.updatePhoneticSpelling(currentQ);

        // 確保按鈕可用
        document.querySelectorAll('.weapon-btn').forEach(btn => btn.disabled = false);
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
        this.stopTimer();
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
