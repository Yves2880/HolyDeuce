// ===== HOLY DEUCE - PADEL ARCADE ENGINE =====
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
var wrapper = document.getElementById('game-wrapper');

var COLORS = {
  ball:'#E8A825', ballGlow:'rgba(232,168,37,0.4)',
  paddle:'#C4392D', paddleEnd:'#E8832A',
  enemy:'#E8832A', enemyEnd:'#E8A825',
  text:'#FFF8F0', scoreText:'#E8A825', gold:'#E8A825'
};

var GW = CONFIG.glassW;
var W, H;
var gameState = 'menu'; // menu, countdown, playing, paused, gameover
var difficulty = 'normal';
var dailyMode = false;
var dailyRng = null;
var nickname = '';
var score = 0;
var level = 1;
var lives = 3;
var combo = 0;
var maxCombo = 0;
var hitCount = 0;
var smashCount = 0;

var ball = { x:0, y:0, vx:0, vy:0, r:7, speed:0, trail:[] };
var player = { x:0, y:0, w:70, h:16 };
var enemy = { x:0, y:0, w:70, h:14, speed:0 };

var playerGlassBounces = 0;
var enemyGlassBounces = 0;
var glassReturnCount = 0;

var inputX = null;
var keysDown = {};
var particles = [];
var screenShake = 0;
var lastTime = 0;
var smashReady = false;
var smashTapped = false;

// Court theme transition
var currentThemeIdx = 0;
var courtTheme = Object.assign({}, CONFIG.courtThemes[0]);
var targetThemeIdx = 0;
var themeTransition = 0;

// ===== LEVEL CONFIG =====
function getLevelConfig(lvl) {
  var d = CONFIG.difficulties[difficulty];
  return {
    ballSpeed: (3.8 + lvl * 0.65) * d.ballSpeedMult,
    enemySpeed: (2.0 + lvl * 0.5) * d.aiSmartness,
    enemyWidth: Math.max(36, 70 - lvl * 3.5),
    playerWidth: Math.max(44, (70 - lvl * 2) * d.paddleWidthMult)
  };
}

// ===== RESIZE =====
function resize() {
  var rect = wrapper.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = rect.width; H = rect.height;
}
window.addEventListener('resize', resize);
resize();

// ===== INIT =====
function initGame() {
  var d = CONFIG.difficulties[difficulty];
  score = 0; level = 1; lives = d.lives; combo = 0; maxCombo = 0;
  hitCount = 0; smashCount = 0; glassReturnCount = 0;
  particles = [];
  currentThemeIdx = 0; targetThemeIdx = 0; themeTransition = 0;
  courtTheme = Object.assign({}, CONFIG.courtThemes[0]);

  var cfg = getLevelConfig(1);
  player.w = cfg.playerWidth; player.h = 16;
  player.x = W/2 - player.w/2; player.y = H - 65;
  enemy.w = cfg.enemyWidth; enemy.h = 14;
  enemy.x = W/2 - enemy.w/2; enemy.y = 48;

  if (dailyMode) {
    var seed = parseInt(new Date().toISOString().slice(0,10).replace(/-/g,''));
    dailyRng = seededRandom(seed);
  } else {
    dailyRng = null;
  }

  PowerUps.reset();
  Achievements.load();
  Achievements.resetGameTracking();
  Achievements.tryUnlock('first_rally');
  Achievements.onLevelStart(lives);

  resetBall();
}

function resetBall() {
  var cfg = getLevelConfig(level);
  ball.x = W/2; ball.y = H/2;
  ball.speed = cfg.ballSpeed;
  var rng = dailyRng || Math.random;
  var angle = (rng()*0.6+0.2) * (rng()<0.5?1:-1);
  ball.vx = Math.sin(angle) * ball.speed;
  ball.vy = -Math.cos(angle) * ball.speed;
  ball.trail = [];
  enemy.speed = cfg.enemySpeed;
  enemy.w = cfg.enemyWidth;
  player.w = cfg.playerWidth;
  playerGlassBounces = 0;
  enemyGlassBounces = 0;
  smashReady = false;
}

function nextLevel() {
  Achievements.onLevelComplete(lives, level);
  level++; combo = 0; hitCount = 0;
  Achievements.onLevelStart(lives);
  if (level >= 6) Achievements.tryUnlock('sinner');
  if (level >= 10) Achievements.tryUnlock('holy_roller');

  // Theme change every 3 levels
  var newThemeIdx = Math.min(Math.floor((level-1) / CONFIG.levelPerThemeChange), CONFIG.courtThemes.length - 1);
  if (newThemeIdx !== currentThemeIdx) {
    targetThemeIdx = newThemeIdx;
    themeTransition = 0;
  }

  Effects.triggerFlash();
  spawnParticles(W/2, H/2, COLORS.gold, 30);
  AudioEngine.sfxLevelUp();
  showLevelBanner('LEVEL ' + level);

  // Countdown before next level starts
  gameState = 'countdown';
  Effects.startCountdown(function() {
    gameState = 'playing';
    resetBall();
  });
}

function showLevelBanner(text) {
  var b = document.getElementById('levelBanner');
  b.textContent = text; b.style.opacity = '1';
  setTimeout(function(){ b.style.opacity = '0'; }, 1500);
}

// ===== PARTICLES =====
function spawnParticles(x, y, color, count) {
  for (var i = 0; i < count; i++) {
    if (particles.length > 100) particles.shift();
    particles.push({
      x:x, y:y, vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6,
      life:1, decay:0.02+Math.random()*0.03, r:2+Math.random()*3, color:color
    });
  }
}

// ===== INPUT =====
function handlePointerMove(clientX) {
  var rect = canvas.getBoundingClientRect();
  inputX = ((clientX - rect.left) / rect.width) * W;
}
canvas.addEventListener('mousemove', function(e){ handlePointerMove(e.clientX); });
canvas.addEventListener('touchmove', function(e){ e.preventDefault(); handlePointerMove(e.touches[0].clientX); }, {passive:false});
canvas.addEventListener('touchstart', function(e){
  e.preventDefault();
  handlePointerMove(e.touches[0].clientX);
  if (Effects.isTutorialActive()) { Effects.dismissTutorial(); return; }
  if (smashReady && gameState === 'playing') smashTapped = true;
}, {passive:false});
canvas.addEventListener('click', function() {
  if (Effects.isTutorialActive()) { Effects.dismissTutorial(); return; }
  if (smashReady && gameState === 'playing') smashTapped = true;
});
document.addEventListener('keydown', function(e){
  keysDown[e.key] = true;
  if (e.key === 'Escape' && (gameState === 'playing' || gameState === 'paused')) togglePause();
  if (e.key === ' ' && smashReady && gameState === 'playing') smashTapped = true;
});
document.addEventListener('keyup', function(e){ keysDown[e.key] = false; });

// Auto-pause on tab switch
document.addEventListener('visibilitychange', function() {
  if (document.hidden && gameState === 'playing') togglePause();
});

// ===== ENEMY AI =====
function predictBallX(bx, bvx, by, bvy, targetY, wallL, wallR) {
  var x = bx, vx = bvx, y = by, vy = bvy;
  if (vy >= 0) return x; // ball moving away
  var steps = Math.abs((targetY - y) / vy);
  x += vx * steps;
  // Reflect off walls
  while (x < wallL || x > wallR) {
    if (x < wallL) { x = wallL + (wallL - x); vx = -vx; }
    if (x > wallR) { x = wallR - (x - wallR); vx = -vx; }
  }
  return x;
}

function updateEnemyAI(dt) {
  var d = CONFIG.difficulties[difficulty];
  var accuracy = Math.min(0.95, 0.6 + level * 0.05) * d.aiSmartness;
  var reactionZone = H * 0.55; // only react when ball is in top half

  var targetX;
  if (ball.vy < 0 && ball.y < reactionZone) {
    // Ball coming toward enemy - predict landing
    var predicted = predictBallX(ball.x, ball.vx, ball.y, ball.vy, enemy.y + enemy.h, GW, W - GW);
    var error = (1 - accuracy) * 40;
    var rng = dailyRng || Math.random;
    targetX = predicted + (rng() - 0.5) * error;
  } else {
    // Ball moving away - drift toward center
    targetX = W / 2;
  }

  var ec = enemy.x + enemy.w / 2;
  var diff = targetX - ec;
  var moveSpeed = enemy.speed * dt;
  enemy.x += Math.sign(diff) * Math.min(Math.abs(diff), moveSpeed);
  enemy.x = Math.max(GW, Math.min(W - GW - enemy.w, enemy.x));
}

// ===== PAUSE =====
function togglePause() {
  if (gameState === 'playing') {
    gameState = 'paused';
    AudioEngine.pauseMusic();
    document.getElementById('pauseScreen').classList.remove('hidden');
  } else if (gameState === 'paused') {
    gameState = 'playing';
    AudioEngine.resumeMusic();
    document.getElementById('pauseScreen').classList.add('hidden');
  }
}

// ===== UPDATE =====
function update(dt) {
  // Theme transition
  if (targetThemeIdx !== currentThemeIdx) {
    themeTransition += 0.02 * dt;
    if (themeTransition >= 1) {
      themeTransition = 1;
      currentThemeIdx = targetThemeIdx;
    }
    var from = CONFIG.courtThemes[currentThemeIdx];
    var to = CONFIG.courtThemes[targetThemeIdx];
    courtTheme.bg1 = lerpColor(from.bg1, to.bg1, themeTransition);
    courtTheme.bg2 = lerpColor(from.bg2, to.bg2, themeTransition);
    courtTheme.line = from.line; // keep current line color (hard to lerp rgba)
    courtTheme.glass = from.glass;
    courtTheme.shine = from.shine;
  }

  Effects.updateFlash(dt);
  Effects.updatePopups(dt);
  Effects.updateTutorial(dt);
  Achievements.updateToasts(dt);

  if (gameState === 'countdown') {
    Effects.updateCountdown(dt);
    return;
  }
  if (gameState !== 'playing') return;

  // Player movement
  if (inputX !== null) {
    player.x += (inputX - player.w/2 - player.x) * 0.25;
  }
  if (keysDown['ArrowLeft']||keysDown['a']||keysDown['A']) player.x -= 7;
  if (keysDown['ArrowRight']||keysDown['d']||keysDown['D']) player.x += 7;
  player.x = Math.max(GW, Math.min(W - GW - player.w, player.x));

  // Enemy AI
  updateEnemyAI(dt);

  // Magnet power-up effect
  if (PowerUps.hasEffect('magnet') && ball.vy > 0 && ball.y > H * 0.6) {
    var pcx = player.x + player.w/2;
    ball.vx += (pcx - ball.x) * 0.003;
  }

  // Ball trail (scales with speed)
  ball.trail.push({x:ball.x, y:ball.y});
  var maxTrail = Math.floor(6 + ball.speed * 1.5);
  while (ball.trail.length > maxTrail) ball.trail.shift();

  // Ball move
  ball.x += ball.vx; ball.y += ball.vy;

  // Smash detection
  smashReady = false;
  if (ball.vy > 0 && ball.y > player.y - CONFIG.smash.proximity && ball.y < player.y &&
      ball.speed < CONFIG.smash.speedThreshold) {
    smashReady = true;
  }

  // Side glass wall bounces
  if (ball.x - ball.r <= GW) {
    ball.x = GW + ball.r; ball.vx = Math.abs(ball.vx);
    spawnParticles(ball.x, ball.y, 'rgba(180,220,230,0.6)', 6);
    AudioEngine.sfxBounce(); screenShake = 2;
  }
  if (ball.x + ball.r >= W - GW) {
    ball.x = W - GW - ball.r; ball.vx = -Math.abs(ball.vx);
    spawnParticles(ball.x, ball.y, 'rgba(180,220,230,0.6)', 6);
    AudioEngine.sfxBounce(); screenShake = 2;
  }

  // Back glass wall bounces (padel mechanic!)
  if (ball.y + ball.r >= H - GW) {
    if (playerGlassBounces < 1) {
      ball.y = H - GW - ball.r;
      ball.vy = -Math.abs(ball.vy) * 0.75;
      playerGlassBounces++;
      spawnParticles(ball.x, H - GW, 'rgba(180,220,230,0.8)', 10);
      AudioEngine.sfxBounce(); screenShake = 4;
    } else {
      loseLife(); return;
    }
  }
  if (ball.y - ball.r <= GW) {
    if (enemyGlassBounces < 1) {
      ball.y = GW + ball.r;
      ball.vy = Math.abs(ball.vy) * 0.75;
      enemyGlassBounces++;
      spawnParticles(ball.x, GW, 'rgba(180,220,230,0.8)', 10);
      AudioEngine.sfxBounce(); screenShake = 4;
    } else {
      score += 25 + level * 10;
      Effects.addPopup(W/2, GW + 30, '+' + (25 + level*10), 0);
      spawnParticles(W/2, GW, COLORS.scoreText, 15);
      AudioEngine.sfxScore();
      startCountdownAndReset(); return;
    }
  }

  // Player paddle collision
  if (ball.vy > 0 && ball.y + ball.r >= player.y && ball.y + ball.r <= player.y + player.h + ball.vy + 2) {
    if (ball.x >= player.x - ball.r && ball.x <= player.x + player.w + ball.r) {
      ball.y = player.y - ball.r;
      var hitPos = (ball.x - (player.x + player.w/2)) / (player.w/2);
      var angle = hitPos * 1.1;

      // Smash check
      if (smashTapped) {
        ball.speed = Math.min(ball.speed * CONFIG.smash.multiplier, 14);
        score += CONFIG.smash.bonusPoints;
        smashCount++;
        Achievements.onSmash();
        Effects.addPopup(ball.x, ball.y - 20, 'SMASH! +' + CONFIG.smash.bonusPoints, 10);
        spawnParticles(ball.x, ball.y, '#F44336', 15);
        AudioEngine.sfxSmash();
        vibrate([50,30,80]);
        screenShake = 6;
        smashTapped = false;
      } else {
        ball.speed = Math.min(ball.speed * 1.02, 11);
        vibrate(30);
      }

      ball.vx = Math.sin(angle) * ball.speed;
      ball.vy = -Math.cos(angle) * ball.speed;

      // Glass return tracking
      if (playerGlassBounces > 0) {
        glassReturnCount++;
        Achievements.onGlassReturn();
      }
      playerGlassBounces = 0;

      combo++; maxCombo = Math.max(maxCombo, combo);
      Achievements.onCombo(combo);
      var points = 10 + Math.min(combo, 10) * 5;
      score += points;
      hitCount++;
      Effects.addPopup(ball.x, ball.y - 10, '+' + points, combo);
      spawnParticles(ball.x, ball.y, COLORS.gold, 8);
      screenShake = 3;
      AudioEngine.sfxHit();
      if (hitCount >= CONFIG.hitsPerLevel) {
        score += level * 50;
        Effects.addPopup(W/2, H/2, 'LEVEL BONUS +' + (level*50), 5);
        nextLevel();
      }
    }
  }

  // Enemy paddle collision
  if (ball.vy < 0 && ball.y - ball.r <= enemy.y + enemy.h && ball.y - ball.r >= enemy.y + enemy.h + ball.vy - 2) {
    if (ball.x >= enemy.x - ball.r && ball.x <= enemy.x + enemy.w + ball.r) {
      // Fireball check
      if (PowerUps.isFireballReady()) {
        PowerUps.consumeFireball();
        score += 50;
        Effects.addPopup(ball.x, ball.y, 'FIREBALL! +50', 8);
        spawnParticles(ball.x, ball.y, '#F44336', 20);
        // Ball passes through - don't bounce
      } else {
        ball.y = enemy.y + enemy.h + ball.r;
        var hp = (ball.x - (enemy.x + enemy.w/2)) / (enemy.w/2);
        // Enemy smash at higher levels
        var d2 = CONFIG.difficulties[difficulty];
        var smashChance = (0.05 + level * 0.03) * d2.aiSmartness;
        var rng2 = dailyRng || Math.random;
        if (rng2() < smashChance && ball.speed < 7) {
          ball.speed = Math.min(ball.speed * 1.4, 12);
        }
        ball.vx = Math.sin(hp*0.9) * ball.speed;
        ball.vy = Math.cos(hp*0.9) * ball.speed;
        enemyGlassBounces = 0;
        score += 5;
        Effects.addPopup(ball.x, ball.y + 10, '+5', 0);
        spawnParticles(ball.x, ball.y, COLORS.enemy, 6);
        AudioEngine.sfxBounce();
      }
    }
  }

  // Power-ups
  PowerUps.update(dt, ball, player, W, H, dailyRng);
  Achievements.onPowerUpCollect(PowerUps.getTotalCollected());

  // Screen shake decay
  if (screenShake > 0) screenShake *= 0.85;
  if (screenShake < 0.2) screenShake = 0;

  // Particles update
  for (var i = particles.length-1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }

  smashTapped = false;
}

function loseLife() {
  lives--; combo = 0; screenShake = 8;
  spawnParticles(ball.x, H - GW, COLORS.paddle, 20);
  vibrate(200);
  if (lives <= 0) { endGame(); return; }
  AudioEngine.sfxLoseLife();
  startCountdownAndReset();
}

function startCountdownAndReset() {
  resetBall();
  gameState = 'countdown';
  Effects.startCountdown(function() { gameState = 'playing'; });
}

// ===== DRAW =====
function draw() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random()-0.5)*screenShake*2, (Math.random()-0.5)*screenShake*2);
  }

  drawCourt(ctx, W, H, courtTheme);

  // Ball trail
  var trailAlpha = Math.min(0.5, 0.15 + ball.speed / 15);
  ball.trail.forEach(function(t, i) {
    ctx.globalAlpha = (i/ball.trail.length) * trailAlpha;
    ctx.fillStyle = PowerUps.isFireballReady() ? '#F44336' : COLORS.ball;
    ctx.beginPath();
    ctx.arc(t.x, t.y, ball.r * (i/ball.trail.length) * 0.7, 0, Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Ball glow
  var bg = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.r*3);
  var glowColor = PowerUps.isFireballReady() ? 'rgba(244,67,54,0.4)' : COLORS.ballGlow;
  bg.addColorStop(0, glowColor); bg.addColorStop(1, 'transparent');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r*3, 0, Math.PI*2); ctx.fill();

  // Ball
  var ballC1 = PowerUps.isFireballReady() ? '#FF6633' : '#F0D040';
  var ballC2 = PowerUps.isFireballReady() ? '#CC3300' : '#D4A017';
  var ballGrad = ctx.createRadialGradient(ball.x-2, ball.y-2, 0, ball.x, ball.y, ball.r);
  ballGrad.addColorStop(0, ballC1); ballGrad.addColorStop(1, ballC2);
  ctx.fillStyle = ballGrad;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r*0.6, -0.8, 0.8); ctx.stroke();
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r*0.6, Math.PI-0.8, Math.PI+0.8); ctx.stroke();

  // Smash indicator
  if (smashReady && gameState === 'playing') {
    var pulse = 0.7 + Math.sin(Date.now() * 0.01) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#F44336';
    ctx.font = '900 18px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.fillText('SMASH!', player.x + player.w/2, player.y - 28);
    ctx.globalAlpha = 1;
  }

  // Player racket
  drawPadelRacket(ctx, player.x, player.y, player.w, player.h, COLORS.paddle, COLORS.paddleEnd, false);

  // Enemy racket
  drawPadelRacket(ctx, enemy.x, enemy.y, enemy.w, enemy.h, COLORS.enemy, COLORS.enemyEnd, true);

  // Glass bounce indicator
  if (playerGlassBounces > 0) {
    ctx.fillStyle = 'rgba(232,168,37,0.6)';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GLASS!', ball.x, H - GW - 8);
  }

  // Power-ups
  PowerUps.draw(ctx, W, H);

  // Particles
  particles.forEach(function(p) {
    ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Score popups
  Effects.drawPopups(ctx);

  // HUD
  drawHUD();

  // Achievement toasts
  Achievements.drawToasts(ctx, W);

  // Countdown
  Effects.drawCountdown(ctx, W, H);

  // Screen flash
  Effects.drawFlash(ctx, W, H);

  // Tutorial
  Effects.drawTutorial(ctx, W, H);

  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = COLORS.scoreText;
  ctx.font = '700 24px "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.fillText(score.toLocaleString(), W/2, H - 16);

  ctx.fillStyle = COLORS.text;
  ctx.font = '600 12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LVL ' + level, GW + 6, H - 18);

  ctx.textAlign = 'right';
  ctx.font = '14px sans-serif';
  var livesStr = '';
  for (var i = 0; i < lives; i++) livesStr += '\u{1F525}';
  ctx.fillText(livesStr, W - GW - 6, H - 18);

  if (combo > 1) {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.gold;
    ctx.font = '700 15px Inter, sans-serif';
    ctx.globalAlpha = 0.8;
    ctx.fillText(combo + 'x COMBO', W/2, player.y - 30);
    ctx.globalAlpha = 1;
  }

  // Difficulty indicator
  ctx.textAlign = 'left';
  ctx.font = '600 9px Inter, sans-serif';
  ctx.fillStyle = difficulty === 'holy' ? '#C4392D' : difficulty === 'easy' ? '#4CAF50' : 'rgba(255,248,240,0.3)';
  ctx.fillText(CONFIG.difficulties[difficulty].label, GW + 6, GW + 16);

  // Daily mode indicator
  if (dailyMode) {
    ctx.fillStyle = '#E8A825';
    ctx.fillText('DAILY', GW + 6, GW + 28);
  }
}

// ===== GAME OVER =====
async function endGame() {
  gameState = 'gameover';
  AudioEngine.stopMusic();
  AudioEngine.sfxGameOver();
  vibrate([100,50,100,50,200]);

  var newHigh = await Leaderboard.isNewHigh(score);
  if (dailyMode) {
    await Leaderboard.submitScore(nickname, score, level, true);
  } else {
    await Leaderboard.submitScore(nickname, score, level, false);
  }

  document.getElementById('finalScore').textContent = score.toLocaleString();
  document.getElementById('finalLevel').textContent = 'Level ' + level + ' · ' + maxCombo + 'x combo';
  document.getElementById('newHighLabel').classList.toggle('hidden', !newHigh);
  document.getElementById('gameOverScreen').classList.remove('hidden');
}

// ===== SHARE =====
function shareScore() {
  var text = '\u{1F525} HOLY DEUCE \u{1F525}\n'
    + 'Score: ' + score.toLocaleString() + ' | Level ' + level + ' | ' + maxCombo + 'x Combo\n'
    + (dailyMode ? 'Daily Challenge | ' : '')
    + 'Can you beat me?\nhttps://yves2880.github.io/HolyDeuce/';

  if (navigator.share) {
    navigator.share({ title: 'Holy Deuce Score', text: text }).catch(function(){});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      var btn = document.getElementById('shareBtn');
      btn.textContent = 'COPIED!';
      setTimeout(function(){ btn.textContent = 'SHARE'; }, 2000);
    });
  }
}

// ===== GAME LOOP =====
function gameLoop(timestamp) {
  var dt = Math.min((timestamp - lastTime) / 16.67, 3);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

// ===== UI EVENTS =====
document.getElementById('playBtn').addEventListener('click', function() { startGame(false); });
document.getElementById('dailyBtn').addEventListener('click', function() { startGame(true); });
document.getElementById('nicknameInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') startGame(false);
});

document.getElementById('replayBtn').addEventListener('click', function() {
  document.getElementById('gameOverScreen').classList.add('hidden');
  initGame();
  gameState = 'countdown';
  AudioEngine.startMusic();
  Effects.startCountdown(function() {
    gameState = 'playing';
    Effects.checkFirstPlay();
  });
});

document.getElementById('menuBtn').addEventListener('click', function() {
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('startScreen').classList.remove('hidden');
  gameState = 'menu';
});

document.getElementById('showLeaderboardBtn').addEventListener('click', function() {
  showLeaderboard('alltime');
});

document.getElementById('showLeaderboardBtn2').addEventListener('click', function() {
  showLeaderboard('alltime');
});

function showLeaderboard(tab) {
  var isDaily = tab === 'daily';
  Leaderboard.renderTable(document.getElementById('scoreTable'), isDaily);
  var fromScreen = gameState === 'gameover' ? 'gameOverScreen' : 'startScreen';
  document.getElementById(fromScreen).classList.add('hidden');
  document.getElementById('leaderboardScreen').classList.remove('hidden');
  // Highlight active tab
  document.getElementById('tabAllTime').classList.toggle('tab-active', !isDaily);
  document.getElementById('tabDaily').classList.toggle('tab-active', isDaily);
}

document.getElementById('tabAllTime').addEventListener('click', function() { showLeaderboard('alltime'); });
document.getElementById('tabDaily').addEventListener('click', function() { showLeaderboard('daily'); });

document.getElementById('backBtn').addEventListener('click', function() {
  document.getElementById('leaderboardScreen').classList.add('hidden');
  if (gameState === 'gameover') {
    document.getElementById('gameOverScreen').classList.remove('hidden');
  } else {
    document.getElementById('startScreen').classList.remove('hidden');
  }
});

document.getElementById('showAchievementsBtn').addEventListener('click', function() {
  Achievements.renderScreen(document.getElementById('achievementsList'));
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('achievementsScreen').classList.remove('hidden');
});

document.getElementById('achievementsBackBtn').addEventListener('click', function() {
  document.getElementById('achievementsScreen').classList.add('hidden');
  document.getElementById('startScreen').classList.remove('hidden');
});

document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.getElementById('pauseMenuBtn').addEventListener('click', function() {
  document.getElementById('pauseScreen').classList.add('hidden');
  document.getElementById('startScreen').classList.remove('hidden');
  gameState = 'menu';
  AudioEngine.stopMusic();
});

document.getElementById('soundToggle').addEventListener('click', function() {
  var on = AudioEngine.toggle();
  document.getElementById('soundToggle').textContent = on ? '\u{1F50A}' : '\u{1F507}';
  if (on && gameState === 'playing') AudioEngine.startMusic();
});

document.getElementById('shareBtn').addEventListener('click', shareScore);

// Difficulty buttons
document.querySelectorAll('.diff-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.diff-btn').forEach(function(b){ b.classList.remove('diff-active'); });
    btn.classList.add('diff-active');
    difficulty = btn.dataset.diff;
  });
});

function startGame(isDaily) {
  var input = document.getElementById('nicknameInput');
  nickname = input.value.trim() || 'Player';
  dailyMode = isDaily;
  document.getElementById('startScreen').classList.add('hidden');
  initGame();
  AudioEngine.init();
  AudioEngine.startMusic();
  gameState = 'countdown';
  Effects.startCountdown(function() {
    gameState = 'playing';
    Effects.checkFirstPlay();
  });
}

// Init
requestAnimationFrame(gameLoop);
