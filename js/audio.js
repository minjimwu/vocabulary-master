// 音效系統
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.voices = [];
        this.currentUtterance = null; // 防止被垃圾回收

        // 預加載語音列表
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => {
                this.voices = window.speechSynthesis.getVoices();
            };
        }
    }

    // 初始化音效系統
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // 朗讀英文
    speak(text, retryCount = 0) {
        if (!this.enabled) return;
        if (!window.speechSynthesis) return;

        // 確保語音列表已加載
        if (this.voices.length === 0) {
            this.voices = window.speechSynthesis.getVoices();
            // 如果還是沒有語音，且還有重試機會，稍後再試
            if (this.voices.length === 0 && retryCount < 3) {
                setTimeout(() => this.speak(text, retryCount + 1), 100);
                return;
            }
        }

        // 取消之前的發音
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // 尋找最佳英語語音
        // 優先順序: Google US English -> Microsoft Emily/David -> 任何 en-US -> 任何 en
        const voice = this.voices.find(v => v.name.includes('Google US English')) ||
            this.voices.find(v => v.name.includes('Microsoft David')) ||
            this.voices.find(v => v.lang === 'en-US') ||
            this.voices.find(v => v.lang.startsWith('en'));

        if (voice) {
            utterance.voice = voice;
        }

        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.volume = 1.0; // 確保最大音量

        // 保存引用以防被垃圾回收
        this.currentUtterance = utterance;

        // 錯誤處理
        utterance.onerror = (e) => {
            console.error('TTS Error:', e);
            // 針對 synthesis-failed 錯誤進行重試
            if ((e.error === 'synthesis-failed' || e.error === 'interrupted') && retryCount < 3) {
                console.log(`TTS Retry (${retryCount + 1})...`);
                setTimeout(() => this.speak(text, retryCount + 1), 50);
            }
        };

        // 延遲一點點再播放，避免 race condition
        setTimeout(() => {
            try {
                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.error('speak execution error:', err);
            }
        }, 10);
    }

    // 播放音效
    playTone(frequency, duration, type = 'sine') {
        if (!this.enabled) return;

        this.init();

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // 攻擊命中音效
    playHitSound() {
        this.playTone(800, 0.1);
        setTimeout(() => this.playTone(1000, 0.1), 100);
    }

    // 攻擊 MISS 音效
    playMissSound() {
        this.playTone(200, 0.2, 'sawtooth');
    }

    // 勝利音效
    playVictorySound() {
        const notes = [523, 659, 784, 1047]; // C, E, G, C
        notes.forEach((note, index) => {
            setTimeout(() => this.playTone(note, 0.3), index * 150);
        });
    }

    // 小魔王勝利音效
    playBossVictorySound() {
        const notes = [523, 587, 659, 698, 784, 880, 988, 1047]; // 完整音階
        notes.forEach((note, index) => {
            setTimeout(() => this.playTone(note, 0.2), index * 100);
        });
    }

    // 切換音效
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}
