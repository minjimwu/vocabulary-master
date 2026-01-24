// UI 渲染模塊
class UI {
  constructor() {
    this.app = document.getElementById('app');
  }

  // 渲染關卡選擇畫面
  // stageMap: 由 GameState.generateStageMap 生成的數組
  renderStageSelection(category, progressManager, stageMap) {
    this.app.innerHTML = `
      <div class="stage-selection">
        <h1>選擇關卡 - ${category}</h1>
        <div class="stages-grid">
          ${this.generateStageButtons(category, progressManager, stageMap)}
        </div>
        <button class="back-btn" onclick="ui.renderCategorySelection()">返回</button>
      </div>
    `;
  }

  // 生成關卡按鈕
  generateStageButtons(category, progressManager, stageMap) {
    // 如果沒有 stageMap (向前兼容)，可能需要處理，但這裡假設都有
    if (!stageMap) return '<div class="error">關卡載入錯誤</div>';

    let html = '';

    stageMap.forEach(stage => {
      const isUnlocked = progressManager.isStageUnlocked(category, stage.index);
      const isCleared = progressManager.isStageCleared ? progressManager.isStageCleared(category, stage.index) : false;

      let label = stage.label || `關卡 ${stage.index}`;
      let icon = '';
      let btnClass = '';

      if (stage.type === 'BIG_BOSS') {
        icon = '🐉';
        btnClass = 'big-boss';
      } else if (stage.type === 'BOSS') {
        icon = '👑';
        btnClass = 'boss';
      }

      if (icon) {
        label = `${icon} ${label}`;
      }

      // 通關標記
      const clearedMark = isCleared ? '<div class="stars">✓</div>' : '';

      // 鎖定狀態
      const lockIcon = !isUnlocked ? '🔒' : '';

      html += `
        <button class="stage-btn ${btnClass} ${!isUnlocked ? 'locked' : ''}" 
                onclick="app.startStage('${category}', ${stage.index})"
                ${!isUnlocked ? 'disabled' : ''}>
          <div class="stage-label">${label}</div>
          ${clearedMark}
          ${lockIcon ? `<div class="lock-icon">${lockIcon}</div>` : ''}
        </button>
      `;
    });

    return html;
  }

  // 渲染遊戲戰鬥界面
  renderGameScreen(gameState) {
    // 大魔王使用特定圖片，或 boss 圖片
    const monsterImage = this.getMonsterImage(gameState.category, gameState.isBoss || gameState.isBigBoss);

    // 生成初始愛心 HTML
    let heartsHtml = '';
    for (let i = 0; i < gameState.maxHearts; i++) {
      heartsHtml += `<span class="heart">❤️</span>`;
    }

    const titlePrefix = gameState.isBigBoss ? '🐉 大魔王' : (gameState.isBoss ? '👑 小魔王' : '普通關卡');

    this.app.innerHTML = `
      <div class="game-screen">
        <div class="game-header">
          <div class="header-left">
            <h2>${gameState.category} - 關卡 ${gameState.stageNumber}</h2>
            <div class="stage-type">${titlePrefix}</div>
          </div>
          <button class="escape-btn" onclick="app.escapeStage()">🏃 逃跑</button>
        </div>
        
        <div class="monster-container">
          <img src="${monsterImage}" alt="怪物" class="monster-image" id="monster">
          
          <div class="monster-stats">
            <div class="monster-hp-container">
                <div class="monster-hp-bar" id="monster-hp-bar" style="width: 100%"></div>
                <div class="monster-hp-text" id="monster-hp-text">${gameState.monsterHP} / ${gameState.maxMonsterHP}</div>
            </div>
          </div>

          <div class="hearts-container" id="hearts-container">
            ${heartsHtml}
          </div>
        </div>

        <div class="battle-area">
          <div class="weakness-display">
            <div class="weakness-label">怪物弱點</div>
            <div class="weakness-text" id="weakness"></div>
            <div class="mode-hint" id="mode-hint"></div>
          </div>

          <div class="weapons-container" id="weapons">
            <!-- 武器選項將在這裡動態生成 -->
          </div>
        </div>

        <div class="question-counter" id="question-counter"></div>
      </div>
    `;
  }

  // 獲取怪物圖片路徑
  getMonsterImage(category, isBoss) {
    const images = CONFIG.MONSTER_IMAGES[category];
    return isBoss ? images.boss : images.normal;
  }

  // 渲染題目
  renderQuestion(question, questionNumber, totalQuestions) {
    const weaknessEl = document.getElementById('weakness');
    const modeHintEl = document.getElementById('mode-hint');
    const weaponsEl = document.getElementById('weapons');
    const counterEl = document.getElementById('question-counter');

    // 使用 innerHTML 以支持填空題的 HTML 標籤
    weaknessEl.innerHTML = question.weakness;
    // 根據題型設置提示文字
    if (question.mode === 'fill-in-blank') {
      modeHintEl.textContent = '選擇正確的字母填入空格';
    } else {
      modeHintEl.textContent = question.mode === 'zh-to-en' ? '選擇英文武器' : '選擇中文武器';
    }
    counterEl.textContent = `題目 ${questionNumber}`;

    weaponsEl.innerHTML = question.options.map((option, index) => `
      <button class="weapon-btn" onclick="app.selectWeapon('${option.replace(/'/g, "\\'")}')">
        ${option}
      </button>
    `).join('');
  }

  // 更新狀態
  updateStatus(currentHearts, maxHearts, currentMonsterHP, maxMonsterHP) {
    this.updateHearts(currentHearts, maxHearts);
    this.updateMonsterHP(currentMonsterHP, maxMonsterHP);
  }

  updateHP(currentHearts, maxHearts) {
    this.updateHearts(currentHearts, maxHearts);
  }

  // 更新愛心顯示
  updateHearts(currentHearts, maxHearts) {
    const container = document.getElementById('hearts-container');
    if (!container) return;

    let html = '';
    for (let i = 0; i < maxHearts; i++) {
      if (i < currentHearts) {
        html += `<span class="heart">❤️</span>`;
      } else {
        html += `<span class="heart lost">❤️</span>`;
      }
    }
    container.innerHTML = html;
  }

  // 更新怪物 HP 條
  updateMonsterHP(current, max) {
    const hpBar = document.getElementById('monster-hp-bar');
    const hpText = document.getElementById('monster-hp-text');

    if (hpBar && hpText) {
      const percentage = Math.max(0, (current / max) * 100);
      hpBar.style.width = percentage + '%';
      hpText.textContent = `${current} / ${max}`;
    }
  }

  // 攻擊命中動畫
  animateHit() {
    const monster = document.getElementById('monster');
    monster.classList.add('hit');
    setTimeout(() => monster.classList.remove('hit'), 500);
  }

  // 攻擊 MISS
  animateMiss() {
    const monster = document.getElementById('monster');
    const miss = document.createElement('div');
    miss.className = 'miss-text';
    miss.textContent = 'MISS!';
    monster.parentElement.appendChild(miss);

    setTimeout(() => miss.remove(), 1000);
  }

  // 顯示答錯對話框
  showWrongAnswerDialog(question, onContinue) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-title">MISS!</div>
                <div class="modal-answer-label">正確答案是</div>
                <div class="modal-answer-text">
                    ${question.correctWord.word}<br>
                    ${question.correctWord.chinese}
                </div>
                <button class="learn-btn" id="learn-btn">我領悟了弱點</button>
            </div>
        `;

    this.app.appendChild(overlay);

    const btn = overlay.querySelector('#learn-btn');
    btn.focus();

    btn.onclick = () => {
      overlay.remove();
      if (onContinue) onContinue();
    };
  }

  // 顯示通關動畫 (全螢幕)
  showFinalVictoryAnimation(onComplete) {
    const overlay = document.createElement('div');
    overlay.className = 'final-victory-overlay';
    overlay.innerHTML = `
            <div class="final-victory-content">
                <div class="victory-icon">🏆</div>
                <h1>恭喜通關!</h1>
                <p>你已經成為真正的單字王!</p>
            </div>
            <div class="confetti-container"></div>
        `;
    document.body.appendChild(overlay);

    // 簡單的五彩紙屑效果 (CSS)
    // 這裡我們只是創建一些元素讓 CSS 驅動
    const confettiContainer = overlay.querySelector('.confetti-container');
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
      confettiContainer.appendChild(confetti);
    }

    // 3秒後結束
    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.remove();
        if (onComplete) onComplete();
      }, 1000);
    }, 4000);
  }

  // 渲染關卡結果
  renderStageResult(isVictory, isBoss, category, stageNumber, stars = 0, stats = null, gameState = null) {
    const statsText = stats ? `答對 ${stats.correctAnswers} / ${stats.totalQuestions} 題` : '';

    let message = '';
    if (isVictory) {
      message = isBoss ? '恭喜擊敗魔王!' : '成功完成關卡!';
    } else {
      if (gameState && gameState.hearts <= 0) {
        message = '愛心耗盡，請再試一次!';
      } else {
        message = '彈藥用盡，怪物逃跑了!';
      }
    }

    this.app.innerHTML = `
      <div class="result-screen ${isVictory ? 'victory' : 'defeat'}">
        <div class="result-content">
          <h1>${isVictory ? '🎉 勝利!' : '😢 失敗'}</h1>
          
          <p class="stats-text">${statsText}</p>
          
          <p class="result-message">${message}</p>
          <div class="result-buttons">
            ${isVictory ? `
              <button class="next-btn" onclick="app.nextStage()">下一關</button>
            ` : `
              <button class="retry-btn" onclick="app.startStage('${category}', ${stageNumber})">重試</button>
            `}
            <button class="back-btn" onclick="app.backToStageSelection()">關卡選擇</button>
          </div>
        </div>
      </div>
    `;
  }

  // 渲染分類選擇
  renderCategorySelection() {
    // 定義分類圖標
    const icons = {
      '幼蟲期': '🐛',
      '結蛹期': '🧶',
      '展翅期': '🦅',
      '蝶舞期': '🦋'
    };

    const categories = Object.keys(CONFIG.MONSTER_IMAGES);

    let buttonsHtml = categories.map(category => {
      const icon = icons[category] || '❓';
      return `
          <button class="category-btn" onclick="app.selectCategory('${category}')">
            <div class="category-icon">${icon}</div>
            <div class="category-name">${category}</div>
          </button>
            `;
    }).join('');

    this.app.innerHTML = `
      <div class="category-selection">
        <h1>單字王</h1>
        <div class="categories-grid">
          ${buttonsHtml}
        </div>
        <button class="settings-btn" onclick="app.showSettings()">⚙️ 設定</button>
      </div>
    `;
  }

  // 渲染設定頁面
  renderSettings() {
    this.app.innerHTML = `
      <div class="settings-screen">
        <h1>⚙️ 設定</h1>
        <div class="settings-content">
          <div class="setting-item">
            <h3>進度管理</h3>
            <p>清空所有關卡進度和記錄</p>
            <button class="danger-btn" onclick="app.resetProgress()">清空進度</button>
          </div>
        </div>
        <button class="back-btn" onclick="ui.renderCategorySelection()">返回</button>
      </div>
    `;
  }
}
