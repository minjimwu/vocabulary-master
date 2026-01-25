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

  // 獲取隨機怪物 Emoji
  getMonsterEmoji(isBigBoss, isBoss) {
    if (isBigBoss) {
      const bosses = ['🐉', '🐲', '🌋', '🌩️', '👹'];
      return bosses[Math.floor(Math.random() * bosses.length)];
    } else if (isBoss) {
      const miniBosses = ['🦖', '🦍', '🦁', '🐯', '🐻', '🦈', '🐊', '🐃', '🦏', '🐘'];
      return miniBosses[Math.floor(Math.random() * miniBosses.length)];
    } else {
      const monsters = ['😈', '👺', '👻', '👽', '👾', '🤖', '🎃', '🦇', '🐍', '🕷️', '🐺', '🦂'];
      return monsters[Math.floor(Math.random() * monsters.length)];
    }
  }

  // 渲染遊戲戰鬥界面
  renderGameScreen(gameState) {
    // 根據怪物類型選擇 emoji
    const monsterEmoji = this.getMonsterEmoji(gameState.isBigBoss, gameState.isBoss);

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
            <div class="hearts-container" id="hearts-container">
            ${heartsHtml}
          </div>
          <button class="escape-btn" onclick="app.escapeStage()">🏃 逃跑</button>
        </div>
        
        <div class="monster-container" id="monster-container">
          <div class="timer-container" id="timer-container" style="display: none;">
            <span class="timer-icon">⏳</span>
            <span class="timer-text" id="timer-text">0</span>
          </div>
          <div class="monster-emoji ${gameState.isBigBoss ? 'big-boss' : (gameState.isBoss ? 'boss' : 'normal')}" id="monster">
            ${monsterEmoji}
          </div>
          
          <div class="magnifier" id="magnifier">
            <div class="weakness-text" id="weakness"></div>
          </div>

          <div class="monster-stats">
            <div class="monster-hp-container">
                <div class="monster-hp-bar" id="monster-hp-bar" style="width: 100%"></div>
                <div class="monster-hp-text" id="monster-hp-text">${gameState.monsterHP} / ${gameState.maxMonsterHP}</div>
            </div>
          </div>
        </div>

        <div class="battle-area">
          <div class="weakness-display" style="display: none;">
            <div id="mode-hint"></div>
          </div>

          <div class="weapons-container" id="weapons">
            <!-- 武器選項將在這裡動態生成 -->
          </div>
        </div>

        <div class="question-counter" id="question-counter"></div>
      </div>
    `;
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
    } else if (question.mode === 'word-assembly') {
      modeHintEl.textContent = '依序選擇正確的部分拼成單字';
    } else {
      modeHintEl.textContent = question.mode === 'zh-to-en' ? '選擇英文武器' : '選擇中文武器';
    }
    counterEl.textContent = `題目 ${questionNumber}`;

    // 設置發音重聽功能 (點擊放大鏡內的圖標即可重聽)
    weaknessEl.style.cursor = 'pointer';
    weaknessEl.onclick = () => {
      // 拼音題或英文出題模式都允許點擊重聽
      if (question.mode === 'phonetic-spelling' || question.mode === 'en-to-zh') {
        app.audio.speak(question.correctWord.word);
      }
    };

    this.randomizeMagnifierPosition();

    // 單字組成題的特殊渲染
    if (question.mode === 'word-assembly') {
      weaponsEl.innerHTML = `
        <div class="word-assembly-container">
          <div class="selected-parts" id="selected-parts">
            ${question.selectedParts.map((part, index) => `<span class="word-part selected" onclick="app.deselectWordPart(${index})" style="cursor: pointer;">${part}</span>`).join('')}
            ${Array((question.partsCount || 3) - question.selectedParts.length).fill('<span class="word-part empty">?</span>').join('')}
          </div>
          <div class="remaining-options">
            ${question.remainingOptions.map(option => `
              <button class="weapon-btn word-part-btn" onclick="app.selectWordPart('${option.replace(/'/g, "\\'")}')">
                ${option}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (question.mode === 'phonetic-spelling') {
      // 拼音題渲染
      weaponsEl.innerHTML = `
        <div class="phonetic-container">
          <div class="selected-parts" id="phonetic-slots">
            ${Array(question.targetWord.length).fill(0).map((_, i) => {
        const char = question.selectedLetters[i] || '?';
        const isFilled = i < question.selectedLetters.length;
        return `<span class="word-part ${isFilled ? 'selected' : 'empty'}" ${isFilled ? `onclick="app.deselectPhoneticLetter(${i})"` : ''} style="${isFilled ? 'cursor: pointer;' : ''}">${char}</span>`;
      }).join('')}
          </div>
          <div class="remaining-options">
            ${question.options.map(option => `
              <button class="weapon-btn" onclick="app.selectPhoneticLetter('${option}')">
                ${option}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (question.mode === 'fill-in-blank') {
      // 填空題特殊渲染 (Mask 顯示在上方)
      weaponsEl.innerHTML = `
        <div class="fill-in-blank-container">
           <span class="masked-word">${question.maskedWord}</span>
           <div class="options-container weapons-container" style="margin-top: 20px;">
              ${question.options.map((option, index) => `
                <button class="weapon-btn" onclick="app.selectWeapon('${option.replace(/'/g, "\\'")}')">
                  ${option}
                </button>
              `).join('')}
           </div>
        </div>
      `;
    } else {
      // 普通題目渲染
      weaponsEl.innerHTML = question.options.map((option, index) => `
        <button class="weapon-btn" onclick="app.selectWeapon('${option.replace(/'/g, "\\'")}')">
          ${option}
        </button>
      `).join('');
    }
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

  // 更新單字組成題顯示
  updateWordAssembly(question) {
    const selectedPartsEl = document.getElementById('selected-parts');
    if (!selectedPartsEl) return;

    selectedPartsEl.innerHTML = `
      ${question.selectedParts.map((part, index) => `<span class="word-part selected" onclick="app.deselectWordPart(${index})" style="cursor: pointer;">${part}</span>`).join('')}
      ${Array((question.partsCount || 3) - question.selectedParts.length).fill('<span class="word-part empty">?</span>').join('')}
    `;

    // 更新剩餘選項
    const weaponsEl = document.getElementById('weapons');
    const remainingOptionsEl = weaponsEl.querySelector('.remaining-options');
    if (remainingOptionsEl) {
      remainingOptionsEl.innerHTML = question.remainingOptions.map(option => `
        <button class="weapon-btn word-part-btn" onclick="app.selectWordPart('${option.replace(/'/g, "\\'")}')" >
          ${option}
        </button>
      `).join('');
    }
  }

  // 更新拼音題顯示
  updatePhoneticSpelling(question) {
    const slotsEl = document.getElementById('phonetic-slots');
    const weaponsEl = document.getElementById('weapons');
    if (!slotsEl || !weaponsEl) return;

    // 更新槽位
    slotsEl.innerHTML = Array(question.targetWord.length).fill(0).map((_, i) => {
      const char = question.selectedLetters[i] || '?';
      const isFilled = i < question.selectedLetters.length;
      return `<span class="word-part ${isFilled ? 'selected' : 'empty'}" ${isFilled ? `onclick="app.deselectPhoneticLetter(${i})"` : ''} style="${isFilled ? 'cursor: pointer;' : ''}">${char}</span>`;
    }).join('');

    // 更新選項佈建
    const optionsHtml = question.options.map(option => `
      <button class="weapon-btn" onclick="app.selectPhoneticLetter('${option}')">
        ${option}
      </button>
    `).join('');

    const remainingOptionsEl = weaponsEl.querySelector('.remaining-options');
    if (remainingOptionsEl) {
      remainingOptionsEl.innerHTML = optionsHtml;
    }
  }

  // 隨機定位放大鏡
  randomizeMagnifierPosition() {
    // 使用 requestAnimationFrame 確保 DOM 已經渲染並可以獲取正確的尺寸
    requestAnimationFrame(() => {
      const container = document.getElementById('monster-container');
      const magnifier = document.getElementById('magnifier');
      const monster = document.getElementById('monster');
      if (!container || !magnifier || !monster) return;

      // 獲取怪物的邊界矩形 (相對於視口)
      const monsterRect = monster.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // 計算怪物相對於容器的位置
      const monsterLeft = monsterRect.left - containerRect.left;
      const monsterTop = monsterRect.top - containerRect.top;
      const monsterWidth = monsterRect.width;
      const monsterHeight = monsterRect.height;

      // 放大鏡尺寸
      const magWidth = 180;
      const magHeight = 180;

      // 計算隨機位置：
      // 目標是讓放大鏡的"中心"位於怪物的範圍內。
      // 因此放大鏡的左上角位置應為：(怪物左邊界 + 隨機X) - (放大鏡寬度 / 2)

      // 生成相對於怪物的隨機中心點 offset
      // 為了不讓放大鏡完全偏離，我們可以限制隨機中心點在怪物的 20% ~ 80% 區域內
      const randomCenterX = monsterLeft + (monsterWidth * (0.2 + Math.random() * 0.6));
      const randomCenterY = monsterTop + (monsterHeight * (0.2 + Math.random() * 0.6));

      // 計算放大鏡的 left/top
      let finalLeft = randomCenterX - (magWidth / 2);
      let finalTop = randomCenterY - (magHeight / 2);

      // 邊界檢查 (確保不超出容器，雖然稍微超出也還好，只要能看到)
      // const maxLeft = containerRect.width - magWidth;
      // const maxTop = containerRect.height - magHeight;

      magnifier.style.left = `${finalLeft}px`;
      magnifier.style.top = `${finalTop}px`;
    });
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

  // 更新計時器
  updateTimer(seconds, isUrgent = false) {
    const container = document.getElementById('timer-container');
    const text = document.getElementById('timer-text');
    if (!container || !text) return;

    container.style.display = 'flex';
    text.textContent = seconds;

    if (isUrgent) {
      container.classList.add('urgent');
    } else {
      container.classList.remove('urgent');
    }
  }

  // 隱藏計時器
  hideTimer() {
    const container = document.getElementById('timer-container');
    if (container) {
      container.style.display = 'none';
      container.classList.remove('urgent');
    }
  }

  // 更新計時器
  updateTimer(seconds, isUrgent = false) {
    const container = document.getElementById('timer-container');
    const text = document.getElementById('timer-text');
    if (!container || !text) return;

    container.style.display = 'flex';
    text.textContent = seconds;

    if (isUrgent) {
      container.classList.add('urgent');
    } else {
      container.classList.remove('urgent');
    }
  }

  // 隱藏計時器
  hideTimer() {
    const container = document.getElementById('timer-container');
    if (container) {
      container.style.display = 'none';
      container.classList.remove('urgent');
    }
  }

  // 攻擊命中動畫
  animateHit() {
    const monster = document.getElementById('monster');
    monster.classList.add('hit');
    setTimeout(() => monster.classList.remove('hit'), 500);
  }

  // 劍揮擊動畫
  animateSwordAttack() {
    const monster = document.getElementById('monster');
    if (!monster) return;

    const sword = document.createElement('div');
    sword.className = 'sword-swing';
    sword.textContent = '🗡️';

    // 增加隨機起始位置（略微偏左或偏右）
    const offset = Math.random() * 40 - 20;
    sword.style.marginLeft = offset + 'px';

    monster.appendChild(sword);

    // 強制重繪
    sword.offsetHeight;
    sword.classList.add('animate');

    // 動畫結束後移除
    setTimeout(() => {
      sword.remove();
    }, 600);
  }

  // 攻擊 MISS
  animateMiss() {
    const monster = document.getElementById('monster');
    const miss = document.createElement('div');
    miss.className = 'miss-text';
    miss.textContent = '😵‍💫 MISS! 🤕';
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
                <div class="modal-title">😵‍💫 MISS! 🤕</div>
                <div class="modal-answer-label">正確答案是</div>
                <div class="modal-answer-text" id="modal-answer-replay" style="cursor: pointer;">
                    <div class="word-pronounce-container">
                        <span class="word">${question.correctWord.word}</span>
                    </div>
                    <div class="chinese">${question.correctWord.chinese}</div>
                </div>
                <button class="learn-btn" id="learn-btn" disabled>我領悟了弱點 (5)</button>
            </div>
        `;

    this.app.appendChild(overlay);

    const replayArea = overlay.querySelector('#modal-answer-replay');
    replayArea.onclick = () => {
      if (window.app && window.app.audio) {
        window.app.audio.speak(question.correctWord.word);
      }
    };

    const btn = overlay.querySelector('#learn-btn');

    // 強制倒數
    let countdown = CONFIG.DELAYS.WRONG_ANSWER_LOCK;
    const intervalId = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        btn.textContent = `我領悟了弱點 (${countdown})`;
      } else {
        clearInterval(intervalId);
        btn.textContent = '我領悟了弱點';
        btn.disabled = false;
        btn.focus();
      }
    }, 1000);

    btn.onclick = () => {
      if (btn.disabled) return; // double check
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
    const statsText = stats ? `答對 ${stats.correctCount} 題 / 共 ${stats.wordCount} 個單字` : '';

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

    const categories = Object.keys(app.vocabularyData || {});

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

  // 渲染關卡單字預覽
  renderStagePreview(gameState) {
    const wordList = gameState.vocabularyList;
    const title = gameState.isBigBoss ? '🐉 大魔王 挑戰準備' : (gameState.isBoss ? '👑 小魔王 挑戰準備' : `第 ${gameState.stageNumber} 關 準備`);

    this.app.innerHTML = `
      <div class="stage-preview">
        <h1>${title}</h1>
        <p class="preview-hint">複習一下本關單字：</p>
        <div class="word-list-container">
          ${wordList.map(item => `
            <div class="word-item" onclick="app.audio.speak('${item.word.replace(/'/g, "\\'")}')" style="cursor: pointer;">
              <span class="en">${item.word}</span>
              <span class="zh">${item.chinese}</span>
            </div>
          `).join('')}
        </div>
        <div class="preview-actions">
          <button class="confirm-start-btn" onclick="app.confirmStartStage()">開始戰鬥！</button>
          <button class="back-btn" onclick="app.backToStageSelection()">返回</button>
        </div>
      </div>
    `;
  }
}
