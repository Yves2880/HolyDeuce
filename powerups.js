// ===== POWER-UP SYSTEM =====
const PowerUps = (() => {
  var TYPES = {
    wider:    { color:'#4CAF50', label:'W+',  desc:'Wide Paddle' },
    slowmo:   { color:'#2196F3', label:'SLO', desc:'Slow Motion' },
    multi:    { color:'#FF9800', label:'x3',  desc:'Multi Ball' },
    magnet:   { color:'#9C27B0', label:'MAG', desc:'Magnet' },
    fireball: { color:'#F44336', label:'FIR', desc:'Fireball' }
  };
  var typeKeys = Object.keys(TYPES);

  var falling = [];     // power-ups on court
  var active = {};      // active effects { type: remainingFrames }
  var extraBalls = [];  // for multi-ball
  var spawnTimer = 0;
  var totalCollected = 0;
  var fireballReady = false;

  // Original values to restore
  var savedPlayerW = 0;
  var savedBallSpeed = 0;

  function reset() {
    falling = [];
    active = {};
    extraBalls = [];
    spawnTimer = CONFIG.powerUp.spawnMinFrames + Math.random() * (CONFIG.powerUp.spawnMaxFrames - CONFIG.powerUp.spawnMinFrames);
    totalCollected = 0;
    fireballReady = false;
  }

  function spawn(W, H, rng) {
    var r = rng ? rng() : Math.random();
    var type = typeKeys[Math.floor(r * typeKeys.length)];
    var x = CONFIG.glassW + 30 + (rng ? rng() : Math.random()) * (W - CONFIG.glassW * 2 - 60);
    falling.push({ type:type, x:x, y:CONFIG.glassW + 20, vy:CONFIG.powerUp.fallSpeed });
  }

  function update(dt, ball, player, W, H, rng) {
    // Spawn timer
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawn(W, H, rng);
      spawnTimer = CONFIG.powerUp.spawnMinFrames + (rng ? rng() : Math.random()) * (CONFIG.powerUp.spawnMaxFrames - CONFIG.powerUp.spawnMinFrames);
    }

    // Move falling power-ups
    for (var i = falling.length-1; i >= 0; i--) {
      falling[i].y += falling[i].vy * dt;
      // Check collection by player paddle
      var f = falling[i];
      var r = CONFIG.powerUp.radius;
      if (f.y + r >= player.y && f.y - r <= player.y + player.h &&
          f.x >= player.x - r && f.x <= player.x + player.w + r) {
        activate(f.type, ball, player);
        falling.splice(i, 1);
        continue;
      }
      // Remove if off screen
      if (f.y > H + 20) falling.splice(i, 1);
    }

    // Tick active effects
    for (var key in active) {
      active[key] -= dt;
      if (active[key] <= 0) {
        deactivate(key, ball, player);
        delete active[key];
      }
    }

    // Update extra balls (multi-ball)
    for (var j = extraBalls.length-1; j >= 0; j--) {
      var eb = extraBalls[j];
      eb.x += eb.vx; eb.y += eb.vy;
      eb.trail.push({x:eb.x, y:eb.y});
      if (eb.trail.length > 8) eb.trail.shift();
      // Wall bounces
      if (eb.x - eb.r <= CONFIG.glassW) { eb.x = CONFIG.glassW + eb.r; eb.vx = Math.abs(eb.vx); }
      if (eb.x + eb.r >= W - CONFIG.glassW) { eb.x = W - CONFIG.glassW - eb.r; eb.vx = -Math.abs(eb.vx); }
      // Remove if out of bounds vertically
      if (eb.y < -30 || eb.y > H + 30) { extraBalls.splice(j, 1); continue; }
      // Bounce off back walls
      if (eb.y - eb.r <= CONFIG.glassW) { eb.y = CONFIG.glassW + eb.r; eb.vy = Math.abs(eb.vy) * 0.75; }
      if (eb.y + eb.r >= H - CONFIG.glassW) { eb.y = H - CONFIG.glassW - eb.r; eb.vy = -Math.abs(eb.vy) * 0.75; }
    }
  }

  function activate(type, ball, player) {
    totalCollected++;
    AudioEngine.sfxScore();
    vibrate(40);

    // If same type already active, just refresh duration
    if (active[type]) {
      active[type] = CONFIG.powerUp.duration;
      return;
    }

    active[type] = CONFIG.powerUp.duration;

    if (type === 'wider') {
      savedPlayerW = player.w;
      player.w = Math.min(player.w * 1.5, 130);
    } else if (type === 'slowmo') {
      savedBallSpeed = ball.speed;
      ball.speed *= 0.5;
      ball.vx *= 0.5; ball.vy *= 0.5;
    } else if (type === 'multi') {
      for (var i = 0; i < 2; i++) {
        var angle = (Math.random() - 0.5) * 1.5;
        extraBalls.push({
          x: ball.x, y: ball.y, r: 6,
          vx: Math.sin(angle) * ball.speed * 0.9,
          vy: -Math.cos(angle) * ball.speed * 0.9,
          trail: []
        });
      }
    } else if (type === 'magnet') {
      // Effect applied in game.js update
    } else if (type === 'fireball') {
      fireballReady = true;
    }
  }

  function deactivate(type, ball, player) {
    if (type === 'wider') {
      player.w = savedPlayerW || player.w / 1.5;
    } else if (type === 'slowmo') {
      if (savedBallSpeed > 0) {
        var ratio = savedBallSpeed / (ball.speed || 1);
        ball.speed = savedBallSpeed;
        ball.vx *= ratio; ball.vy *= ratio;
      }
    } else if (type === 'multi') {
      extraBalls = [];
    }
  }

  function hasEffect(type) { return !!active[type]; }
  function isFireballReady() { return fireballReady; }
  function consumeFireball() { fireballReady = false; }
  function getExtraBalls() { return extraBalls; }
  function getTotalCollected() { return totalCollected; }

  function draw(ctx, W, H) {
    // Draw falling power-ups
    falling.forEach(function(f) {
      var t = TYPES[f.type];
      var r = CONFIG.powerUp.radius;
      // Glow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, r * 2, 0, Math.PI*2); ctx.fill();
      // Circle
      ctx.globalAlpha = 1;
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI*2); ctx.fill();
      // Border
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Label
      ctx.fillStyle = '#FFF';
      ctx.font = '700 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label, f.x, f.y);
    });

    // Draw extra balls
    extraBalls.forEach(function(eb) {
      eb.trail.forEach(function(t, i) {
        ctx.globalAlpha = (i/eb.trail.length)*0.2;
        ctx.fillStyle = '#FF9800';
        ctx.beginPath(); ctx.arc(t.x, t.y, 4, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FF9800';
      ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI*2); ctx.fill();
    });

    // Draw active effect indicators (bottom-right HUD)
    var idx = 0;
    for (var key in active) {
      var t2 = TYPES[key];
      var ix = W - CONFIG.glassW - 20 - idx * 28;
      var iy = 20;
      var pct = active[key] / CONFIG.powerUp.duration;
      // Timer arc
      ctx.strokeStyle = t2.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ix, iy, 10, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct);
      ctx.stroke();
      // Icon
      ctx.fillStyle = t2.color;
      ctx.font = '700 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t2.label, ix, iy);
      idx++;
    }
    ctx.globalAlpha = 1;
  }

  return {
    reset:reset, update:update, draw:draw,
    hasEffect:hasEffect, isFireballReady:isFireballReady,
    consumeFireball:consumeFireball, getExtraBalls:getExtraBalls,
    getTotalCollected:getTotalCollected
  };
})();
