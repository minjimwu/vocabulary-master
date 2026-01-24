// 進度管理模塊
class ProgressManager {
    constructor() {
        this.storageKey = 'vocabulary_master_progress';
    }

    // 獲取所有進度
    getProgress() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : {};
    }

    // 保存進度
    saveProgress(progress) {
        localStorage.setItem(this.storageKey, JSON.stringify(progress));
    }

    // 保存關卡結果
    saveStageResult(category, stageNumber, isCleared) {
        const progress = this.getProgress();

        if (!progress[category]) {
            progress[category] = {
                completedStages: [],
                stars: {} // 保留結構兼容性，雖然不再使用
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

    // 重置所有進度
    resetProgress() {
        localStorage.removeItem(this.storageKey);
    }
}
