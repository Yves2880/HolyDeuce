// ===== VISUAL EFFECTS: popups, flash, countdown, tutorial =====
const Effects = (() => {
  let popups = [];
  let flashAlpha = 0;
  let countdownValue = 0;
  let countdownTimer = 0;
  let countdownCb = null;
  let tutorialTimer = 0;
  let tutorialActive = false;

  // --- SCORE POPUPS ---
  function addPopup(x, y, text, combo) {
    var color = combo >= 8 ? '#C4392D' : combo >= 3 ? '#E8A825' : '#FFF8F0';
    if (popups.length > 10) popups.shift();
    popups.push({ x:x, y:y, text:text, alpha:1, color:color, size: Math.min(20, 14 + combo) });
  }

  function updatePopups(dt) {
    for (var i = popups.length-1; i >= 0; i--) {
      popups[i].y -= 1.5 * dt;
      popups[i].alpha -= 0.025 * dt;
      if (popups[i].alpha <= 0) popups.splice(i, 1);
    }
  }

  function drawPopups(ctx) {
    popups.forEach(function(p) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.font = '700 ' + p.size + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;
  }

  // --- SCREEN FLASH ---
  function triggerFlash() { flashAlpha = 0.6; }

  function updateFlash(dt) {
    if (flashAlpha > 0) flashAlpha -= 0.03 * dt;
    if (flashAlpha < 0) flashAlpha = 0;
  }

  function drawFlash(ctx, W, H) {
    if (flashAlpha <= 0) return;
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = '#FFF';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // --- COUNTDOWN ---
  function startCountdown(cb) {
    countdownValue = 3;
    countdownTimer = CONFIG.countdown.framesPerNumber;
    countdownCb = cb;
  }

  function updateCountdown(dt) {
    if (countdownValue <= 0) return;
    countdownTimer -= dt;
    if (countdownTimer <= 0) {
      countdownValue--;
      if (countdownValue > 0) {
        countdownTimer = CONFIG.countdown.framesPerNumber;
        AudioEngine.sfxBounce();
      } else {
        AudioEngine.sfxScore();
        if (countdownCb) countdownCb();
        countdownCb = null;
      }
    }
  }

  function drawCountdown(ctx, W, H) {
    if (countdownValue <= 0) return;
    var progress = countdownTimer / CONFIG.countdown.framesPerNumber;
    var scale = 0.5 + progress * 0.5;
    var text = countdownValue.toString();

    ctx.save();
    ctx.globalAlpha = progress;
    ctx.fillStyle = '#E8A825';
    ctx.font = '900 ' + Math.round(80 * scale) + 'px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(232,168,37,0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText(text, W/2, H/2);
    ctx.restore();
  }

  function isCountingDown() { return countdownValue > 0; }

  // --- TUTORIAL ---
  function checkFirstPlay() {
    if (!localStorage.getItem('holydeuce_tutorial_done')) {
      tutorialActive = true;
      tutorialTimer = 240;
      return true;
    }
    return false;
  }

  function updateTutorial(dt) {
    if (!tutorialActive) return;
    tutorialTimer -= dt;
    if (tutorialTimer <= 0) {
      tutorialActive = false;
      localStorage.setItem('holydeuce_tutorial_done', '1');
    }
  }

  function dismissTutorial() {
    tutorialActive = false;
    localStorage.setItem('holydeuce_tutorial_done', '1');
  }

  function drawTutorial(ctx, W, H) {
    if (!tutorialActive) return;
    var alpha = Math.min(1, tutorialTimer / 30);
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = 'rgba(26,26,46,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFF8F0';
    ctx.font = '700 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOW TO PLAY', W/2, H * 0.3);

    ctx.font = '400 14px Inter, sans-serif';
    ctx.fillStyle = '#E8A825';
    ctx.fillText('Drag or use arrow keys', W/2, H * 0.3 + 30);
    ctx.fillText('to move your paddle', W/2, H * 0.3 + 50);

    ctx.fillStyle = '#2AADAD';
    ctx.fillText('Ball bounces off glass walls!', W/2, H * 0.3 + 85);
    ctx.fillText('Return it before double bounce', W/2, H * 0.3 + 105);

    ctx.fillStyle = '#C4392D';
    ctx.fillText('Tap when ball is close to SMASH!', W/2, H * 0.3 + 140);

    // Animated arrow
    var arrowX = W/2 + Math.sin(Date.now() * 0.005) * 40;
    ctx.fillStyle = '#E8A825';
    ctx.beginPath();
    ctx.moveTo(arrowX - 10, H * 0.7);
    ctx.lineTo(arrowX + 10, H * 0.7);
    ctx.lineTo(arrowX, H * 0.7 + 12);
    ctx.closePath();
    ctx.fill();

    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,248,240,0.4)';
    ctx.fillText('Tap anywhere to start', W/2, H * 0.85);

    ctx.restore();
  }

  function isTutorialActive() { return tutorialActive; }

  return {
    addPopup: addPopup, updatePopups: updatePopups, drawPopups: drawPopups,
    triggerFlash: triggerFlash, updateFlash: updateFlash, drawFlash: drawFlash,
    startCountdown: startCountdown, updateCountdown: updateCountdown,
    drawCountdown: drawCountdown, isCountingDown: isCountingDown,
    checkFirstPlay: checkFirstPlay, updateTutorial: updateTutorial,
    dismissTutorial: dismissTutorial, drawTutorial: drawTutorial,
    isTutorialActive: isTutorialActive
  };
})();
