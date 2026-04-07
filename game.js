// ===== HOLY DEUCE - PADEL ARCADE GAME ENGINE =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('game-wrapper');

const COLORS = {
  court: '#1A7A7A', courtDark: '#135C5C',
  courtLines: 'rgba(255,248,240,0.25)',
  ball: '#E8A825', ballGlow: 'rgba(232,168,37,0.4)',
  paddle: '#C4392D', paddleGradEnd: '#E8832A',
  enemy: '#E8832A', enemyGradEnd: '#E8A825',
  glass: 'rgba(255,255,255,0.08)', glassBorder: 'rgba(255,255,255,0.15)',
  text: '#FFF8F0', scoreText: '#E8A825', net: 'rgba(255,248,240,0.12)',
  gold: '#E8A825'
};

let W, H;
let gameState = 'menu';
let nickname = '';
let score = 0;
let level = 1;
let lives = 3;
let combo = 0;
let maxCombo = 0;
let hitCount = 0;

let ball = { x: 0, y: 0, vx: 0, vy: 0, r: 8, speed: 0, trail: [] };
let player = { x: 0, y: 0, w: 80, h: 18, speed: 0 };
let enemy = { x: 0, y: 0, w: 80, h: 16, speed: 0 };

let inputX = null;
let keysDown = {};
let particles = [];
let screenShake = 0;
let lastTime = 0;

// ===== LEVEL CONFIG =====
function getLevelConfig(lvl) {
  return {
    ballSpeed: 4 + lvl * 0.7,
    enemySpeed: 2.2 + lvl * 0.5,
    enemyWidth: Math.max(40, 80 - lvl * 4),
    playerWidth: Math.max(50, 80 - lvl * 2)
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
  const cfg = getLevelConfig(1);
  score = 0; level = 1; lives = 3; combo = 0; maxCombo = 0; hitCount = 0;
  particles = [];
  player.w = cfg.playerWidth; player.h = 18;
  player.x = W / 2 - player.w / 2; player.y = H - 60;
  enemy.w = cfg.enemyWidth; enemy.h = 16;
  enemy.x = W / 2 - enemy.w / 2; enemy.y = 40;
  resetBall();
}

function resetBall() {
  const cfg = getLevelConfig(level);
  ball.x = W / 2; ball.y = H / 2;
  ball.speed = cfg.ballSpeed;
  const angle = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? 1 : -1);
  ball.vx = Math.sin(angle) * ball.speed;
  ball.vy = -Math.cos(angle) * ball.speed;
  ball.trail = [];
  enemy.speed = cfg.enemySpeed;
  enemy.w = cfg.enemyWidth;
  player.w = cfg.playerWidth;
}

function nextLevel() {
  level++; combo = 0;
  showLevelBanner(`LEVEL ${level}`);
  AudioEngine.sfxLevelUp();
  resetBall();
}

function showLevelBanner(text) {
  const banner = document.getElementById('levelBanner');
  banner.textContent = text;
  banner.style.opacity = '1';
  setTimeout(() => { banner.style.opacity = '0'; }, 1500);
}

// ===== PARTICLES =====
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
      life: 1, decay: 0.02 + Math.random() * 0.03,
      r: 2 + Math.random() * 3, color
    });
  }
}

// ===== INPUT =====
function handlePointerMove(clientX) {
  const rect = canvas.getBoundingClientRect();
  inputX = ((clientX - rect.left) / rect.width) * W;
}
canvas.addEventListener('mousemove', e => handlePointerMove(e.clientX));
canvas.addEventListener('touchmove', e => { e.preventDefault(); handlePointerMove(e.touches[0].clientX); }, { passive: false });
canvas.addEventListener('touchstart', e => { e.preventDefault(); handlePointerMove(e.touches[0].clientX); }, { passive: false });
document.addEventListener('keydown', e => { keysDown[e.key] = true; });
document.addEventListener('keyup', e => { keysDown[e.key] = false; });

// ===== UPDATE =====
function update(dt) {
  if (gameState !== 'playing') return;

  // Player
  const pSpeed = 7;
  if (inputX !== null) {
    player.x += (inputX - player.w / 2 - player.x) * 0.25;
  }
  if (keysDown['ArrowLeft'] || keysDown['a'] || keysDown['A']) player.x -= pSpeed;
  if (keysDown['ArrowRight'] || keysDown['d'] || keysDown['D']) player.x += pSpeed;
  player.x = Math.max(8, Math.min(W - 8 - player.w, player.x));

  // Enemy AI
  const ec = enemy.x + enemy.w / 2;
  const diff = ball.x - ec;
  const wobble = Math.sin(Date.now() * 0.003) * 0.5;
  enemy.x += Math.sign(diff) * Math.min(Math.abs(diff), enemy.speed) + wobble;
  enemy.x = Math.max(8, Math.min(W - 8 - enemy.w, enemy.x));

  // Ball trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 12) ball.trail.shift();

  // Ball move
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounce (off glass walls)
  if (ball.x - ball.r <= 8) {
    ball.x = 8 + ball.r; ball.vx = Math.abs(ball.vx);
    spawnParticles(ball.x, ball.y, '#fff', 5); AudioEngine.sfxBounce();
  }
  if (ball.x + ball.r >= W - 8) {
    ball.x = W - 8 - ball.r; ball.vx = -Math.abs(ball.vx);
    spawnParticles(ball.x, ball.y, '#fff', 5); AudioEngine.sfxBounce();
  }

  // Player paddle collision
  if (ball.vy > 0 && ball.y + ball.r >= player.y && ball.y + ball.r <= player.y + player.h + ball.vy + 2) {
    if (ball.x >= player.x - ball.r && ball.x <= player.x + player.w + ball.r) {
      ball.y = player.y - ball.r;
      const hitPos = (ball.x - (player.x + player.w / 2)) / (player.w / 2);
      const angle = hitPos * 1.1;
      ball.speed = Math.min(ball.speed * 1.02, 12);
      ball.vx = Math.sin(angle) * ball.speed;
      ball.vy = -Math.cos(angle) * ball.speed;
      combo++; maxCombo = Math.max(maxCombo, combo);
      score += 10 + Math.min(combo, 10) * 5;
      hitCount++;
      spawnParticles(ball.x, ball.y, COLORS.gold, 8);
      screenShake = 3;
      AudioEngine.sfxHit();
      if (hitCount >= 8) { hitCount = 0; score += level * 50; nextLevel(); }
    }
  }

  // Enemy paddle collision
  if (ball.vy < 0 && ball.y - ball.r <= enemy.y + enemy.h && ball.y - ball.r >= enemy.y + enemy.h + ball.vy - 2) {
    if (ball.x >= enemy.x - ball.r && ball.x <= enemy.x + enemy.w + ball.r) {
      ball.y = enemy.y + enemy.h + ball.r;
      const hitPos = (ball.x - (enemy.x + enemy.w / 2)) / (enemy.w / 2);
      ball.vx = Math.sin(hitPos * 0.9) * ball.speed;
      ball.vy = Math.cos(hitPos * 0.9) * ball.speed;
      score += 5;
      spawnParticles(ball.x, ball.y, COLORS.enemy, 6);
      AudioEngine.sfxBounce();
    }
  }

  // Ball out top
  if (ball.y - ball.r < -20) {
    score += 25 + level * 10;
    spawnParticles(W / 2, 10, COLORS.scoreText, 15);
    AudioEngine.sfxScore();
    resetBall();
  }

  // Ball out bottom
  if (ball.y - ball.r > H + 20) {
    lives--; combo = 0; screenShake = 8;
    spawnParticles(ball.x, H, COLORS.paddle, 20);
    if (lives <= 0) {
      endGame();
    } else {
      AudioEngine.sfxLoseLife();
      resetBall();
    }
  }

  if (screenShake > 0) screenShake *= 0.85;
  if (screenShake < 0.2) screenShake = 0;

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
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

  // Court
  const cg = ctx.createLinearGradient(0, 0, 0, H);
  cg.addColorStop(0, COLORS.courtDark); cg.addColorStop(0.5, COLORS.court); cg.addColorStop(1, COLORS.courtDark);
  ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

  // Court lines
  ctx.strokeStyle = COLORS.courtLines; ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(8, H/2); ctx.lineTo(W-8, H/2); ctx.stroke();
  ctx.setLineDash([]);
  const bW = W * 0.6, bH = H * 0.2;
  ctx.strokeRect((W-bW)/2, H/2-bH, bW, bH);
  ctx.strokeRect((W-bW)/2, H/2, bW, bH);
  ctx.beginPath(); ctx.moveTo(W/2, H/2-bH); ctx.lineTo(W/2, H/2+bH); ctx.stroke();

  // Glass walls
  ctx.fillStyle = COLORS.glass; ctx.fillRect(0, 0, 8, H); ctx.fillRect(W-8, 0, 8, H);
  ctx.strokeStyle = COLORS.glassBorder; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(8, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W-8, 0); ctx.lineTo(W-8, H); ctx.stroke();

  // Net
  ctx.fillStyle = COLORS.net; ctx.fillRect(0, H/2-1, W, 3);
  for (let i = 0; i < W; i += 12) {
    ctx.fillStyle = 'rgba(255,248,240,0.2)'; ctx.fillRect(i, H/2-3, 2, 7);
  }

  // Ball trail
  ball.trail.forEach((t, i) => {
    ctx.globalAlpha = (i / ball.trail.length) * 0.3;
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath(); ctx.arc(t.x, t.y, ball.r * (i / ball.trail.length) * 0.7, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Ball glow
  const bg = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.r * 3);
  bg.addColorStop(0, COLORS.ballGlow); bg.addColorStop(1, 'transparent');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r * 3, 0, Math.PI * 2); ctx.fill();

  // Ball
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1; ctx.globalAlpha = 0.3; ctx.stroke(); ctx.globalAlpha = 1;

  // Player racket (bottom)
  drawPadelRacket(player.x, player.y, player.w, player.h, COLORS.paddle, COLORS.paddleGradEnd, false);

  // Enemy racket (top)
  drawPadelRacket(enemy.x, enemy.y, enemy.w, enemy.h, COLORS.enemy, COLORS.enemyGradEnd, true);

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // HUD
  drawHUD();
  ctx.restore();
}

// ===== PADEL RACKET DRAWING =====
function drawPadelRacket(x, y, w, h, color1, color2, flipped) {
  const cx = x + w / 2;
  const headW = w;
  const headH = h + 10;
  const handleW = 6;
  const handleH = 12;

  // Positions depend on orientation
  let headY, handleY;
  if (flipped) {
    // Enemy: handle on top, head on bottom
    handleY = y - 2;
    headY = y + handleH - 6;
  } else {
    // Player: head on top, handle on bottom
    headY = y;
    handleY = y + headH - 4;
  }

  // Handle
  const hGrad = ctx.createLinearGradient(cx - handleW/2, 0, cx + handleW/2, 0);
  hGrad.addColorStop(0, '#8B4513');
  hGrad.addColorStop(0.5, '#D2691E');
  hGrad.addColorStop(1, '#8B4513');
  ctx.fillStyle = hGrad;
  ctx.beginPath();
  ctx.roundRect(cx - handleW/2, handleY, handleW, handleH, 3);
  ctx.fill();

  // Grip wrap lines
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  for (let i = 2; i < handleH - 2; i += 3) {
    ctx.beginPath();
    ctx.moveTo(cx - handleW/2 + 1, handleY + i);
    ctx.lineTo(cx + handleW/2 - 1, handleY + i + 2);
    ctx.stroke();
  }

  // Racket head (rounded rectangle / teardrop)
  const grad = ctx.createLinearGradient(x, headY, x + headW, headY);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, headY + headH / 2, headW / 2, headH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Racket frame border
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, headY + headH / 2, headW / 2, headH / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner frame
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, headY + headH / 2, headW / 2 - 3, headH / 2 - 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Holes pattern (signature padel racket look)
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  const rows = 3;
  const cols = Math.floor(headW / 10);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hx = cx - (cols - 1) * 5 + c * 10;
      const hy = headY + headH / 2 - (rows - 1) * 4 + r * 8;
      // Check if hole is inside the ellipse
      const dx = (hx - cx) / (headW / 2 - 5);
      const dy = (hy - (headY + headH / 2)) / (headH / 2 - 5);
      if (dx * dx + dy * dy < 1) {
        ctx.beginPath();
        ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Top shine
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.ellipse(cx, headY + headH * 0.35, headW / 2 - 6, headH / 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.fillStyle = COLORS.scoreText;
  ctx.font = '700 24px "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.fillText(score.toLocaleString(), W / 2, H - 14);

  ctx.fillStyle = COLORS.text;
  ctx.font = '600 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`LVL ${level}`, 16, H - 16);

  ctx.textAlign = 'right';
  ctx.font = '16px sans-serif';
  let livesStr = '';
  for (let i = 0; i < lives; i++) livesStr += '\u{1F525}';
  ctx.fillText(livesStr, W - 16, H - 14);

  if (combo > 1) {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.gold;
    ctx.font = '700 16px Inter, sans-serif';
    ctx.globalAlpha = 0.8;
    ctx.fillText(`${combo}x COMBO`, W / 2, player.y - 20);
    ctx.globalAlpha = 1;
  }
}

// ===== GAME OVER =====
async function endGame() {
  gameState = 'gameover';
  AudioEngine.stopMusic();
  AudioEngine.sfxGameOver();

  const newHigh = await Leaderboard.isNewHigh(score);
  await Leaderboard.submitScore(nickname, score, level);

  document.getElementById('finalScore').textContent = score.toLocaleString();
  document.getElementById('finalLevel').textContent = `Level ${level} \u00b7 ${maxCombo}x max combo`;
  document.getElementById('newHighLabel').classList.toggle('hidden', !newHigh);
  document.getElementById('gameOverScreen').classList.remove('hidden');
}

// ===== GAME LOOP =====
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 16.67, 3);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

// ===== UI EVENTS =====
document.getElementById('playBtn').addEventListener('click', startGame);
document.getElementById('nicknameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') startGame();
});

document.getElementById('replayBtn').addEventListener('click', () => {
  document.getElementById('gameOverScreen').classList.add('hidden');
  initGame();
  gameState = 'playing';
  AudioEngine.startMusic();
  showLevelBanner('LEVEL 1');
});

document.getElementById('menuBtn').addEventListener('click', () => {
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('startScreen').classList.remove('hidden');
  gameState = 'menu';
});

document.getElementById('showLeaderboardBtn').addEventListener('click', () => {
  Leaderboard.renderTable(document.getElementById('scoreTable'));
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('leaderboardScreen').classList.remove('hidden');
});

document.getElementById('showLeaderboardBtn2').addEventListener('click', () => {
  Leaderboard.renderTable(document.getElementById('scoreTable'));
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('leaderboardScreen').classList.remove('hidden');
});

document.getElementById('backBtn').addEventListener('click', () => {
  document.getElementById('leaderboardScreen').classList.add('hidden');
  if (gameState === 'gameover') {
    document.getElementById('gameOverScreen').classList.remove('hidden');
  } else {
    document.getElementById('startScreen').classList.remove('hidden');
  }
});

document.getElementById('soundToggle').addEventListener('click', () => {
  const on = AudioEngine.toggle();
  document.getElementById('soundToggle').textContent = on ? '\u{1F50A}' : '\u{1F507}';
  if (on && gameState === 'playing') AudioEngine.startMusic();
});

function startGame() {
  const input = document.getElementById('nicknameInput');
  nickname = input.value.trim() || 'Player';
  document.getElementById('startScreen').classList.add('hidden');
  initGame();
  gameState = 'playing';
  AudioEngine.init();
  AudioEngine.startMusic();
  showLevelBanner('LEVEL 1');
}

// Start render loop
requestAnimationFrame(gameLoop);
