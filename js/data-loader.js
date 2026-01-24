// 數據加載模塊
class DataLoader {
    constructor() {
        this.vocabularyData = null;
        this.categoriesData = null;
    }

    // 獲取 CSV 數據
    async fetchCSV(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            return text;
        } catch (error) {
            console.error('Error fetching CSV:', error);
            throw error;
        }
    }

    // 解析 CSV 為數組
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index]?.trim() || '';
            });
            data.push(row);
        }

        return data;
    }

    // 加載並解析詞彙數據
    async loadVocabulary() {
        const csv = await this.fetchCSV(CONFIG.VOCABULARY_URL);
        const parsed = this.parseCSV(csv);

        // 按分類組織數據
        this.vocabularyData = {};
        parsed.forEach(row => {
            const category = row['分類'];
            if (!this.vocabularyData[category]) {
                this.vocabularyData[category] = [];
            }
            this.vocabularyData[category].push({
                word: row['單字'],
                chinese: row['中文']
            });
        });

        return this.vocabularyData;
    }

    // 加載並解析分類數據
    async loadCategories() {
        const csv = await this.fetchCSV(CONFIG.CATEGORIES_URL);
        this.categoriesData = this.parseCSV(csv);
        return this.categoriesData;
    }

    // 加載所有數據
    async loadAll() {
        await Promise.all([
            this.loadVocabulary(),
            this.loadCategories()
        ]);
        return {
            vocabulary: this.vocabularyData,
            categories: this.categoriesData
        };
    }

    // 獲取特定分類的詞彙
    getVocabularyByCategory(category) {
        return this.vocabularyData[category] || [];
    }
}
