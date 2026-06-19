// ===== ACHIEVEMENTS SYSTEM =====
const Achievements = (() => {
  var DEFS = {
    first_rally:  { title:'First Rally',   desc:'Play your first game',                icon:'\u{1F3BE}' },
    combo_king:   { title:'Combo King',    desc:'Reach a 10x combo',                   icon:'\u{1F451}' },
    glass_master: { title:'Glass Master',  desc:'Return 5 glass bounces in one game',  icon:'\u{1FA9F}' },
    sinner:       { title:'Sinner',        desc:'Reach level 6',                       icon:'\u{1F608}' },
    holy_roller:  { title:'Holy Roller',   desc:'Reach level 10',                      icon:'\u{1F607}' },
    untouchable:  { title:'Untouchable',   desc:'Complete a level with no lives lost',  icon:'\u{1F525}' },
    power_player: { title:'Power Player',  desc:'Collect 10 power-ups total',           icon:'⚡' },
    smash_hit:    { title:'Smash Hit',     desc:'Land 5 smash shots in one game',       icon:'\u{1F4A5}' }
  };

  var unlocked = {};
  var toastQueue = [];
  var currentToast = null;
  var toastTimer = 0;

  // Per-game tracking
  var glassReturns = 0;
  var smashCount = 0;
  var levelStartLives = 0;

  function load() {
    try { unlocked = JSON.parse(localStorage.getItem('holydeuce_achievements') || '{}'); }
    catch(e) { unlocked = {}; }
  }

  function save() {
    localStorage.setItem('holydeuce_achievements', JSON.stringify(unlocked));
  }

  function resetGameTracking() {
    glassReturns = 0;
    smashCount = 0;
    levelStartLives = 0;
  }

  function tryUnlock(id) {
    if (unlocked[id]) return false;
    if (!DEFS[id]) return false;
    unlocked[id] = Date.now();
    save();
    toastQueue.push(id);
    return true;
  }

  function onLevelStart(lives) { levelStartLives = lives; }

  function onLevelComplete(lives, level) {
    if (lives >= levelStartLives) tryUnlock('untouchable');
    if (level >= 6) tryUnlock('sinner');
    if (level >= 10) tryUnlock('holy_roller');
  }

  function onGlassReturn() {
    glassReturns++;
    if (glassReturns >= 5) tryUnlock('glass_master');
  }

  function onSmash() {
    smashCount++;
    if (smashCount >= 5) tryUnlock('smash_hit');
  }

  function onCombo(combo) {
    if (combo >= 10) tryUnlock('combo_king');
  }

  function onPowerUpCollect(total) {
    if (total >= 10) tryUnlock('power_player');
  }

  function updateToasts(dt) {
    if (currentToast) {
      toastTimer -= dt;
      if (toastTimer <= 0) currentToast = null;
    }
    if (!currentToast && toastQueue.length > 0) {
      currentToast = toastQueue.shift();
      toastTimer = 180; // 3 seconds
      AudioEngine.sfxLevelUp();
    }
  }

  function drawToasts(ctx, W) {
    if (!currentToast) return;
    var def = DEFS[currentToast];
    var progress = toastTimer / 180;
    var slideY = progress > 0.85 ? (1 - progress) / 0.15 * 50
               : progress < 0.15 ? (progress / 0.15) * 50 - 50 + 50
               : 50;
    if (progress > 0.85) slideY = 50 - (1 - (toastTimer / 180 - 0.85) / 0.15) * 50;

    var y = Math.min(50, slideY);
    var boxW = 200;
    var x = W/2 - boxW/2;

    ctx.save();
    ctx.globalAlpha = Math.min(1, toastTimer / 20);
    // Background
    ctx.fillStyle = 'rgba(26,26,46,0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y - 20, boxW, 44, 8);
    ctx.fill();
    // Gold border
    ctx.strokeStyle = '#E8A825';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Icon + text
    ctx.fillStyle = '#E8A825';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, x + 12, y + 2);
    ctx.fillStyle = '#FFF8F0';
    ctx.font = '700 13px Inter, sans-serif';
    ctx.fillText(def.title, x + 38, y - 4);
    ctx.fillStyle = 'rgba(255,248,240,0.5)';
    ctx.font = '400 10px Inter, sans-serif';
    ctx.fillText(def.desc, x + 38, y + 10);
    ctx.restore();
  }

  function getAll() {
    var result = [];
    for (var id in DEFS) {
      result.push({ id:id, title:DEFS[id].title, desc:DEFS[id].desc, icon:DEFS[id].icon, unlocked:!!unlocked[id] });
    }
    return result;
  }

  function renderScreen(container) {
    var all = getAll();
    var html = '';
    all.forEach(function(a) {
      var cls = a.unlocked ? 'unlocked' : 'locked';
      html += '<div class="achievement-card ' + cls + '">'
        + '<span class="achievement-icon">' + a.icon + '</span>'
        + '<div class="achievement-info">'
        + '<div class="achievement-title">' + a.title + '</div>'
        + '<div class="achievement-desc">' + a.desc + '</div>'
        + '</div></div>';
    });
    container.innerHTML = html;
  }

  return {
    load:load, resetGameTracking:resetGameTracking, tryUnlock:tryUnlock,
    onLevelStart:onLevelStart, onLevelComplete:onLevelComplete,
    onGlassReturn:onGlassReturn, onSmash:onSmash, onCombo:onCombo,
    onPowerUpCollect:onPowerUpCollect,
    updateToasts:updateToasts, drawToasts:drawToasts,
    getAll:getAll, renderScreen:renderScreen
  };
})();
