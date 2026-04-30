// ===== HOLY DEUCE - PADEL ARCADE ENGINE =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('game-wrapper');

const COLORS = {
  ball: '#E8A825', ballGlow: 'rgba(232,168,37,0.4)',
  paddle: '#C4392D', paddleEnd: '#E8832A',
  enemy: '#E8832A', enemyEnd: '#E8A825',
  text: '#FFF8F0', scoreText: '#E8A825', gold: '#E8A825'
};

const GLASS_W = 10; // glass wall thickness

let W, H;
let gameState = 'menu';
let nickname = '';
let score = 0;
let level = 1;
let lives = 3;
let combo = 0;
let maxCombo = 0;
let hitCount = 0;

let ball = { x:0, y:0, vx:0, vy:0, r:7, speed:0, trail:[] };
let player = { x:0, y:0, w:70, h:16 };
let enemy = { x:0, y:0, w:70, h:14, speed:0 };

// Glass bounce tracking for double-bounce rule
let playerGlassBounces = 0;
let enemyGlassBounces = 0;
let lastHitBy = 'none'; // 'player', 'enemy', 'none'

let inputX = null;
let keysDown = {};
let particles = [];
let screenShake = 0;
let lastTime = 0;

// ===== LEVEL CONFIG =====
function getLevelConfig(lvl) {
  return {
    ballSpeed: 3.8 + lvl * 0.65,
    enemySpeed: 2.0 + lvl * 0.5,
    enemyWidth: Math.max(36, 70 - lvl * 3.5),
    playerWidth: Math.max(44, 70 - lvl * 2)
  };
}

// ===== RESIZE =====
function resize() {
  const rect = wrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = rect.width;
  H = rect.height;
}
window.addEventListener('resize', resize);
resize();

// ===== INIT =====
function initGame() {
  score = 0; level = 1; lives = 3; combo = 0; maxCombo = 0; hitCount = 0;
  particles = [];
  const cfg = getLevelConfig(1);
  player.w = cfg.playerWidth; player.h = 16;
  player.x = W/2 - player.w/2; player.y = H - 65;
  enemy.w = cfg.enemyWidth; enemy.h = 14;
  enemy.x = W/2 - enemy.w/2; enemy.y = 48;
  resetBall();
}

function resetBall() {
  const cfg = getLevelConfig(level);
  ball.x = W/2; ball.y = H/2;
  ball.speed = cfg.ballSpeed;
  const angle = (Math.random()*0.6+0.2) * (Math.random()<0.5?1:-1);
  ball.vx = Math.sin(angle) * ball.speed;
  ball.vy = -Math.cos(angle) * ball.speed;
  ball.trail = [];
  enemy.speed = cfg.enemySpeed;
  enemy.w = cfg.enemyWidth;
  player.w = cfg.playerWidth;
  playerGlassBounces = 0;
  enemyGlassBounces = 0;
  lastHitBy = 'none';
}

function nextLevel() {
  level++; combo = 0; hitCount = 0;
  showLevelBanner('LEVEL ' + level);
  AudioEngine.sfxLevelUp();
  resetBall();
}

function showLevelBanner(text) {
  const b = document.getElementById('levelBanner');
  b.textContent = text; b.style.opacity = '1';
  setTimeout(function(){ b.style.opacity = '0'; }, 1500);
}

// ===== PARTICLES =====
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x:x, y:y, vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6,
      life:1, decay:0.02+Math.random()*0.03, r:2+Math.random()*3, color:color
    });
  }
}

// ===== INPUT =====
function handlePointerMove(clientX) {
  const rect = canvas.getBoundingClientRect();
  inputX = ((clientX - rect.left) / rect.width) * W;
}
canvas.addEventListener('mousemove', function(e){ handlePointerMove(e.clientX); });
canvas.addEventListener('touchmove', function(e){ e.preventDefault(); handlePointerMove(e.touches[0].clientX); }, {passive:false});
canvas.addEventListener('touchstart', function(e){ e.preventDefault(); handlePointerMove(e.touches[0].clientX); }, {passive:false});
document.addEventListener('keydown', function(e){ keysDown[e.key]=true; });
document.addEventListener('keyup', function(e){ keysDown[e.key]=false; });

// ===== UPDATE =====
function update(dt) {
  if (gameState !== 'playing') return;

  // Player movement
  if (inputX !== null) {
    player.x += (inputX - player.w/2 - player.x) * 0.25;
  }
  if (keysDown['ArrowLeft']||keysDown['a']||keysDown['A']) player.x -= 7;
  if (keysDown['ArrowRight']||keysDown['d']||keysDown['D']) player.x += 7;
  player.x = Math.max(GLASS_W, Math.min(W - GLASS_W - player.w, player.x));

  // Enemy AI
  var ec = enemy.x + enemy.w/2;
  var diff = ball.x - ec;
  var wobble = Math.sin(Date.now()*0.003)*0.5;
  enemy.x += Math.sign(diff)*Math.min(Math.abs(diff), enemy.speed) + wobble;
  enemy.x = Math.max(GLASS_W, Math.min(W - GLASS_W - enemy.w, enemy.x));

  // Ball trail
  ball.trail.push({x:ball.x, y:ball.y});
  if (ball.trail.length > 12) ball.trail.shift();

  // Ball move
  ball.x += ball.vx;
  ball.y += ball.vy;

  // === SIDE GLASS WALL BOUNCES ===
  if (ball.x - ball.r <= GLASS_W) {
    ball.x = GLASS_W + ball.r;
    ball.vx = Math.abs(ball.vx);
    spawnParticles(ball.x, ball.y, 'rgba(180,220,230,0.6)', 6);
    AudioEngine.sfxBounce();
    screenShake = 2;
  }
  if (ball.x + ball.r >= W - GLASS_W) {
    ball.x = W - GLASS_W - ball.r;
    ball.vx = -Math.abs(ball.vx);
    spawnParticles(ball.x, ball.y, 'rgba(180,220,230,0.6)', 6);
    AudioEngine.sfxBounce();
    screenShake = 2;
  }

  // === BACK GLASS WALL BOUNCES (padel mechanic!) ===
  // Bottom back wall (behind player)
  if (ball.y + ball.r >= H - GLASS_W) {
    if (playerGlassBounces < 1) {
      // First bounce off back glass - ball comes back into play
      ball.y = H - GLASS_W - ball.r;
      ball.vy = -Math.abs(ball.vy) * 0.75;
      playerGlassBounces++;
      spawnParticles(ball.x, H - GLASS_W, 'rgba(180,220,230,0.8)', 10);
      AudioEngine.sfxBounce();
      screenShake = 4;
    } else {
      // Second time reaching back wall = double bounce, lose life
      lives--; combo = 0; screenShake = 8;
      spawnParticles(ball.x, H - GLASS_W, COLORS.paddle, 20);
      if (lives <= 0) { endGame(); return; }
      AudioEngine.sfxLoseLife();
      resetBall();
      return;
    }
  }

  // Top back wall (behind enemy)
  if (ball.y - ball.r <= GLASS_W) {
    if (enemyGlassBounces < 1) {
      ball.y = GLASS_W + ball.r;
      ball.vy = Math.abs(ball.vy) * 0.75;
      enemyGlassBounces++;
      spawnParticles(ball.x, GLASS_W, 'rgba(180,220,230,0.8)', 10);
      AudioEngine.sfxBounce();
      screenShake = 4;
    } else {
      // Enemy missed after glass bounce - player scores
      score += 25 + level * 10;
      spawnParticles(W/2, GLASS_W, COLORS.scoreText, 15);
      AudioEngine.sfxScore();
      resetBall();
      return;
    }
  }

  // === PLAYER PADDLE COLLISION ===
  if (ball.vy > 0 && ball.y + ball.r >= player.y && ball.y + ball.r <= player.y + player.h + ball.vy + 2) {
    if (ball.x >= player.x - ball.r && ball.x <= player.x + player.w + ball.r) {
      ball.y = player.y - ball.r;
      var hitPos = (ball.x - (player.x + player.w/2)) / (player.w/2);
      var angle = hitPos * 1.1;
      ball.speed = Math.min(ball.speed * 1.02, 11);
      ball.vx = Math.sin(angle) * ball.speed;
      ball.vy = -Math.cos(angle) * ball.speed;
      lastHitBy = 'player';
      playerGlassBounces = 0; // reset glass bounces on hit
      combo++; maxCombo = Math.max(maxCombo, combo);
      score += 10 + Math.min(combo, 10) * 5;
      hitCount++;
      spawnParticles(ball.x, ball.y, COLORS.gold, 8);
      screenShake = 3;
      AudioEngine.sfxHit();
      if (hitCount >= 8) { score += level * 50; nextLevel(); }
    }
  }

  // === ENEMY PADDLE COLLISION ===
  if (ball.vy < 0 && ball.y - ball.r <= enemy.y + enemy.h && ball.y - ball.r >= enemy.y + enemy.h + ball.vy - 2) {
    if (ball.x >= enemy.x - ball.r && ball.x <= enemy.x + enemy.w + ball.r) {
      ball.y = enemy.y + enemy.h + ball.r;
      var hp = (ball.x - (enemy.x + enemy.w/2)) / (enemy.w/2);
      ball.vx = Math.sin(hp*0.9) * ball.speed;
      ball.vy = Math.cos(hp*0.9) * ball.speed;
      lastHitBy = 'enemy';
      enemyGlassBounces = 0; // reset glass bounces on hit
      score += 5;
      spawnParticles(ball.x, ball.y, COLORS.enemy, 6);
      AudioEngine.sfxBounce();
    }
  }

  // Screen shake decay
  if (screenShake > 0) screenShake *= 0.85;
  if (screenShake < 0.2) screenShake = 0;

  // Particles update
  for (var i = particles.length-1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ===== DRAW =====
function draw() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random()-0.5)*screenShake*2, (Math.random()-0.5)*screenShake*2);
  }

  // Court (from court.js)
  drawCourt(ctx, W, H);

  // Ball trail
  ball.trail.forEach(function(t, i) {
    ctx.globalAlpha = (i/ball.trail.length)*0.3;
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(t.x, t.y, ball.r*(i/ball.trail.length)*0.7, 0, Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Ball glow
  var bg = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.r*3);
  bg.addColorStop(0, COLORS.ballGlow); bg.addColorStop(1, 'transparent');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r*3, 0, Math.PI*2); ctx.fill();

  // Ball (tennis ball look)
  var ballGrad = ctx.createRadialGradient(ball.x-2, ball.y-2, 0, ball.x, ball.y, ball.r);
  ballGrad.addColorStop(0, '#F0D040');
  ballGrad.addColorStop(1, '#D4A017');
  ctx.fillStyle = ballGrad;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
  // Ball seam
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r*0.6, -0.8, 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r*0.6, Math.PI-0.8, Math.PI+0.8);
  ctx.stroke();

  // Player racket
  drawPadelRacket(ctx, player.x, player.y, player.w, player.h, COLORS.paddle, COLORS.paddleEnd, false);

  // Enemy racket
  drawPadelRacket(ctx, enemy.x, enemy.y, enemy.w, enemy.h, COLORS.enemy, COLORS.enemyEnd, true);

  // Glass bounce indicator
  if (playerGlassBounces > 0) {
    ctx.fillStyle = 'rgba(232,168,37,0.5)';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GLASS!', ball.x, H - GLASS_W - 6);
  }

  // Particles
  particles.forEach(function(p) {
    ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // HUD
  drawHUD();
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
  ctx.fillText('LVL ' + level, GLASS_W + 6, H - 18);

  ctx.textAlign = 'right';
  ctx.font = '14px sans-serif';
  var livesStr = '';
  for (var i = 0; i < lives; i++) livesStr += '\u{1F525}';
  ctx.fillText(livesStr, W - GLASS_W - 6, H - 18);

  if (combo > 1) {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.gold;
    ctx.font = '700 15px Inter, sans-serif';
    ctx.globalAlpha = 0.8;
    ctx.fillText(combo + 'x COMBO', W/2, player.y - 24);
    ctx.globalAlpha = 1;
  }
}

// ===== GAME OVER =====
async function endGame() {
  gameState = 'gameover';
  AudioEngine.stopMusic();
  AudioEngine.sfxGameOver();
  var newHigh = await Leaderboard.isNewHigh(score);
  await Leaderboard.submitScore(nickname, score, level);
  document.getElementById('finalScore').textContent = score.toLocaleString();
  document.getElementById('finalLevel').textContent = 'Level ' + level + ' · ' + maxCombo + 'x max combo';
  document.getElementById('newHighLabel').classList.toggle('hidden', !newHigh);
  document.getElementById('gameOverScreen').classList.remove('hidden');
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
document.getElementById('playBtn').addEventListener('click', startGame);
document.getElementById('nicknameInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') startGame();
});

document.getElementById('replayBtn').addEventListener('click', function() {
  document.getElementById('gameOverScreen').classList.add('hidden');
  initGame(); gameState = 'playing';
  AudioEngine.startMusic();
  showLevelBanner('LEVEL 1');
});

document.getElementById('menuBtn').addEventListener('click', function() {
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('startScreen').classList.remove('hidden');
  gameState = 'menu';
});

document.getElementById('showLeaderboardBtn').addEventListener('click', function() {
  Leaderboard.renderTable(document.getElementById('scoreTable'));
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('leaderboardScreen').classList.remove('hidden');
});

document.getElementById('showLeaderboardBtn2').addEventListener('click', function() {
  Leaderboard.renderTable(document.getElementById('scoreTable'));
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('leaderboardScreen').classList.remove('hidden');
});

document.getElementById('backBtn').addEventListener('click', function() {
  document.getElementById('leaderboardScreen').classList.add('hidden');
  if (gameState === 'gameover') {
    document.getElementById('gameOverScreen').classList.remove('hidden');
  } else {
    document.getElementById('startScreen').classList.remove('hidden');
  }
});

document.getElementById('soundToggle').addEventListener('click', function() {
  var on = AudioEngine.toggle();
  document.getElementById('soundToggle').textContent = on ? '\u{1F50A}' : '\u{1F507}';
  if (on && gameState === 'playing') AudioEngine.startMusic();
});

function startGame() {
  var input = document.getElementById('nicknameInput');
  nickname = input.value.trim() || 'Player';
  document.getElementById('startScreen').classList.add('hidden');
  initGame(); gameState = 'playing';
  AudioEngine.init();
  AudioEngine.startMusic();
  showLevelBanner('LEVEL 1');
}

requestAnimationFrame(gameLoop);
