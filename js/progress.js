// 進度管理模塊
class ProgressManager {
    constructor() {
        this.storageKey = 'vocabulary_master_progress';
    }

    // 獲取所有進度
    getProgress() {
        const stored = localStorage.getItem(this.storageKey);
        const progress = stored ? JSON.parse(stored) : {};

        // 確保基礎屬性存在
        if (progress.coins === undefined) progress.coins = 0;
        if (!progress.inventory) {
            progress.inventory = {
                [CONFIG.ITEMS.TYPES.TIME_STOP_S]: 0,
                [CONFIG.ITEMS.TYPES.TIME_STOP_L]: 0,
                [CONFIG.ITEMS.TYPES.MEDKIT_S]: 0,
                [CONFIG.ITEMS.TYPES.MEDKIT_L]: 0
            };
        }
        return progress;
    }

    // 保存進度
    saveProgress(progress) {
        localStorage.setItem(this.storageKey, JSON.stringify(progress));
    }

    // 獲取金幣
    getCoins() {
        return this.getProgress().coins || 0;
    }

    // 添加金幣
    addCoins(amount) {
        const progress = this.getProgress();
        progress.coins = (progress.coins || 0) + amount;
        this.saveProgress(progress);
    }

    // 獲取背包
    getInventory() {
        return this.getProgress().inventory;
    }

    // 更新背包
    updateInventory(type, count) {
        const progress = this.getProgress();
        if (!progress.inventory) progress.inventory = {};
        progress.inventory[type] = (progress.inventory[type] || 0) + count;
        this.saveProgress(progress);
    }

    // 購買道具
    saveItemPurchase(type, price) {
        const progress = this.getProgress();
        if ((progress.coins || 0) >= price) {
            progress.coins -= price;
            if (!progress.inventory) progress.inventory = {};
            progress.inventory[type] = (progress.inventory[type] || 0) + 1;
            this.saveProgress(progress);
            return true;
        }
        return false;
    }

    // 保存關卡結果
    saveStageResult(category, stageNumber, isCleared) {
        const progress = this.getProgress();

        if (!progress[category]) {
            progress[category] = {
                completedStages: [],
                stars: {}
            };
        }

        // 如果通關，加入已完成列表
        if (isCleared && !progress[category].completedStages.includes(stageNumber)) {
            progress[category].completedStages.push(stageNumber);
        }

        this.saveProgress(progress);
    }

    // 檢查關卡是否解鎖
    isStageUnlocked(category, stageNumber) {
        // 第一關永遠解鎖
        if (stageNumber === 1) return true;

        const progress = this.getProgress();
        const categoryProgress = progress[category] || { completedStages: [] };

        // 檢查上一關是否通關
        // 無論之前是什麼類型的關卡，只要上一關 (index - 1) 完成了，目前關卡就解鎖
        return categoryProgress.completedStages.includes(stageNumber - 1);
    }

    // 檢查關卡是否已通關
    isStageCleared(category, stageNumber) {
        const progress = this.getProgress();
        const categoryProgress = progress[category];
        if (!categoryProgress) return false;

        return categoryProgress.completedStages.includes(stageNumber);
    }

    // 覆寫背包
    setInventory(inventory) {
        const progress = this.getProgress();
        progress.inventory = { ...inventory };
        this.saveProgress(progress);
    }

    // 重置所有進度
    resetProgress() {
        localStorage.removeItem(this.storageKey);
    }
}
