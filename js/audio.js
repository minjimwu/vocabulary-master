// 音效系統
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
    }

    // 初始化音效系統
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
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
