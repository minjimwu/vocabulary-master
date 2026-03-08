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
        this.ctrlCount = 0; // 密技計數
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

            // 設置全域按鍵監聽 (用於密技)
            window.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
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
        // 傳遞 config 與 持久化背包 給 game state
        const inventory = this.progressManager.getInventory();
        this.gameState.startStage(category, stageConfig, this.vocabularyData, inventory);
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
            this.gameState.maxMonsterHP,
            this.gameState.inventory
        );
        this.ui.renderQuestion(question, currentIndex, totalQuestions);

        // 如果是 英文 -> 中文 模式 (顯示的是英文單字)，則朗讀該單字
        if (question.mode === 'en-to-zh' || question.mode === 'phonetic-spelling') {
            this.audio.speak(question.correctWord.word);
        }

        // 啟動計時器 (如果需要)
        this.startTimer();

        // 確保魔王凍結效果在下一題重置 (如果是正常過渡)
        this.ui.clearTimeStopEffect();
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
        } else {
            // 一般關卡
            duration = CONFIG.TIMER.NORMAL;
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
            this.gameState.maxMonsterHP,
            this.gameState.inventory
        );

        // 顯示答錯對話框
        this.audio.speak(currentQ.correctWord.word);
        this.ui.showWrongAnswerDialog(currentQ, '⌛ 逾時', () => {
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
                this.gameState.maxMonsterHP,
                this.gameState.inventory
            );

            if (this.gameState.checkStageEnd()) {
                // 擊敗怪物動畫
                setTimeout(() => {
                    this.ui.animateMonsterDefeat(() => {
                        this.endStage(true);
                    });
                }, 500); // 稍微延遲讓劍閃完
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
                this.gameState.maxMonsterHP,
                this.gameState.inventory
            );

            // 顯示答錯對話框
            // 播放正確單字的發音
            this.audio.speak(currentQ.correctWord.word);
            this.ui.showWrongAnswerDialog(currentQ, selected, () => {
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

        // 如果已選擇所有部分，檢查答案
        if (currentQ.selectedParts.length === currentQ.partsCount) {
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
                        this.gameState.maxMonsterHP,
                        this.gameState.inventory
                    );

                    if (this.gameState.checkStageEnd()) {
                        setTimeout(() => {
                            this.ui.animateMonsterDefeat(() => {
                                this.endStage(true);
                            });
                        }, 500);
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
                        this.gameState.maxMonsterHP,
                        this.gameState.inventory
                    );

                    // 顯示答錯對話框
                    // 播放正確單字的發音
                    this.audio.speak(currentQ.correctWord.word);
                    this.ui.showWrongAnswerDialog(currentQ, currentQ.selectedParts.join(''), () => {
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
                        this.gameState.maxMonsterHP,
                        this.gameState.inventory
                    );

                    if (this.gameState.checkStageEnd()) {
                        setTimeout(() => {
                            this.ui.animateMonsterDefeat(() => {
                                this.endStage(true);
                            });
                        }, 500);
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
                        this.gameState.maxMonsterHP,
                        this.gameState.inventory
                    );

                    this.audio.speak(currentQ.correctWord.word);
                    this.ui.showWrongAnswerDialog(currentQ, currentQ.selectedLetters.join(''), () => {
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

            // 更新通關後的道具數量回進度管理 (雖然商店買的道具也是透過進度管理，但戰鬥中消耗的也在此同步)
            // 不過目前邏輯是點擊使用就即時扣除 GameState.inventory，
            // 我們在結束時同步回 ProgressManager
            Object.keys(this.gameState.inventory).forEach(type => {
                const count = this.gameState.inventory[type];
                const current = this.progressManager.getInventory()[type] || 0;
                this.progressManager.updateInventory(type, count - current);
            });

            if (this.gameState.isBigBoss) {
                // 大魔王勝利 -> 播放終極動畫
                this.audio.playBossVictorySound();
                this.ui.showFinalVictoryAnimation(() => {
                    this.openTreasureChest(() => {
                        this.ui.renderCategorySelection();
                    }, 'BIG_BOSS');
                });
                return;
            } else if (this.gameState.isBoss) {
                this.audio.playBossVictorySound();
            } else {
                this.audio.playVictorySound();
            }
        }

        if (isVictory) {
            // 所有關卡勝利都觸發寶箱 (金幣)
            const stageType = this.gameState.isBigBoss ? 'BIG_BOSS' : (this.gameState.isBoss ? 'BOSS' : 'NORMAL');
            this.openTreasureChest(() => {
                this.ui.renderStageResult(
                    isVictory,
                    this.gameState.isBoss || this.gameState.isBigBoss,
                    this.currentCategory,
                    this.gameState.stageNumber,
                    0,
                    stats,
                    this.gameState
                );
            }, stageType);
        } else {
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
    }

    // --- 商店與寶物系統 ---

    // 開啟寶箱 (改為獲得金幣)
    openTreasureChest(onComplete, stageType) {
        const range = CONFIG.REWARDS[stageType] || CONFIG.REWARDS.NORMAL;
        const amount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

        this.ui.renderTreasureChest(amount, () => {
            this.progressManager.addCoins(amount);
            if (onComplete) onComplete();
        });
    }

    // 顯示商店
    // 顯示商店
    showShop() {
        const coins = this.progressManager.getCoins();
        const inventory = this.progressManager.getInventory();
        this.ui.renderShop(coins, inventory, CONFIG.ITEMS.SHOP);
    }

    // 購買物品
    buyItem(type) {
        const item = CONFIG.ITEMS.SHOP.find(i => i.id === type);
        if (!item) return;

        if (this.progressManager.saveItemPurchase(type, item.price)) {
            // 購買成功，重新渲染商店
            this.showShop();
        } else {
            alert('金幣不足！');
        }
    }

    // 使用時間停止
    useTimeStop(type) {
        if (this.gameState.useItem(type)) {
            // 根據類型決定增加的時間
            let extraTime = 0;
            if (type === CONFIG.ITEMS.TYPES.TIME_STOP_S) extraTime = 20;
            else if (type === CONFIG.ITEMS.TYPES.TIME_STOP_L) extraTime = 40;

            this.timeLeft += extraTime;
            this.ui.updateTimer(this.timeLeft, this.timeLeft <= CONFIG.TIMER.URGENT_THRESHOLD);

            this.ui.showTimeStopEffect();
            this.ui.updateStatus(
                this.gameState.hearts,
                this.gameState.maxHearts,
                this.gameState.monsterHP,
                this.gameState.maxMonsterHP,
                this.gameState.inventory
            );
        }
    }

    // 使用醫療包
    useMedkit(type) {
        if (this.gameState.hearts < this.gameState.maxHearts) {
            if (this.gameState.useItem(type)) {
                let healAmount = 0;
                if (type === CONFIG.ITEMS.TYPES.MEDKIT_S) healAmount = 1;
                else if (type === CONFIG.ITEMS.TYPES.MEDKIT_L) healAmount = 2;

                this.gameState.hearts = Math.min(this.gameState.maxHearts, this.gameState.hearts + healAmount);
                this.ui.showMedkitEffect();
                this.ui.updateStatus(
                    this.gameState.hearts,
                    this.gameState.maxHearts,
                    this.gameState.monsterHP,
                    this.gameState.maxMonsterHP,
                    this.gameState.inventory
                );
            }
        }
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

    // 全域按鍵處理 (密技)
    handleGlobalKeyDown(event) {
        // 僅在遊戲進行中且非結算畫面時有效 (簡單判斷: 是否有 monster-hp-bar)
        if (!document.getElementById('monster-hp-bar')) {
            this.ctrlCount = 0;
            return;
        }

        if (event.key === 'Control') {
            this.ctrlCount++;
            if (this.ctrlCount >= 10) {
                this.ctrlCount = 0;
                this.activateCheat();
            }
        } else {
            // 按下其他鍵則重置計數
            this.ctrlCount = 0;
        }
    }

    // 啟動密技
    activateCheat() {
        this.gameState.monsterHP = 0;
        this.ui.updateStatus(
            this.gameState.hearts,
            this.gameState.maxHearts,
            this.gameState.monsterHP,
            this.gameState.maxMonsterHP,
            this.gameState.inventory
        );

        // 觸發擊敗動畫與結算
        this.stopTimer();
        this.ui.animateMonsterDefeat(() => {
            this.endStage(true);
        });
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
