// ===== FIREBASE LEADERBOARD (with daily challenge support) =====
var Leaderboard = (function() {
  // PASTE YOUR FIREBASE REALTIME DATABASE URL BELOW
  var FIREBASE_URL = '';

  function isConfigured() { return FIREBASE_URL && FIREBASE_URL.length > 10; }

  function getLocalKey(daily) {
    if (!daily) return 'holydeuce_scores';
    return 'holydeuce_daily_' + new Date().toISOString().slice(0,10);
  }

  function getLocal(daily) {
    try { return JSON.parse(localStorage.getItem(getLocalKey(daily)) || '[]'); }
    catch(e) { return []; }
  }

  function saveLocal(name, pts, lvl, daily) {
    var key = getLocalKey(daily);
    var scores = getLocal(daily);
    scores.push({ name:name, score:pts, level:lvl, date:Date.now() });
    scores.sort(function(a,b){ return b.score - a.score; });
    localStorage.setItem(key, JSON.stringify(scores.slice(0, 100)));
  }

  async function fetchGlobal(daily) {
    if (!isConfigured()) return getLocal(daily);
    try {
      var path = daily ? '/daily_scores/' + new Date().toISOString().slice(0,10) : '/scores';
      var res = await fetch(FIREBASE_URL + path + '.json?orderBy="score"&limitToLast=50');
      if (!res.ok) throw new Error('fetch failed');
      var data = await res.json();
      if (!data) return getLocal(daily);
      var scores = Object.values(data);
      scores.sort(function(a,b){ return b.score - a.score; });
      return scores;
    } catch(e) {
      return getLocal(daily);
    }
  }

  async function submitScore(name, pts, lvl, daily) {
    saveLocal(name, pts, lvl, daily);
    if (!isConfigured()) return;
    var path = daily ? '/daily_scores/' + new Date().toISOString().slice(0,10) : '/scores';
    var entry = { name:name.slice(0,12), score:pts, level:lvl, date:Date.now() };
    try {
      await fetch(FIREBASE_URL + path + '.json', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify(entry)
      });
    } catch(e) {}
  }

  async function isNewHigh(pts) {
    var scores = await fetchGlobal(false);
    if (scores.length === 0) return true;
    return pts > scores[0].score;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function renderTable(tableEl, daily) {
    var scores = await fetchGlobal(daily);
    var html = '<div class="score-row header">'
      + '<span class="rank">#</span><span class="name">Player</span>'
      + '<span class="level">Lvl</span><span class="pts">Score</span></div>';
    var top = scores.slice(0, 15);
    if (top.length === 0) {
      html += '<div class="score-row"><span style="color:rgba(255,248,240,0.3);margin:12px auto;">'
        + (daily ? 'No daily scores yet!' : 'No scores yet. Be the first!') + '</span></div>';
    }
    top.forEach(function(s, i) {
      var medal = i === 0 ? ' style="color:#E8A825"' : i === 1 ? ' style="color:#C0C0C0"' : i === 2 ? ' style="color:#CD7F32"' : '';
      html += '<div class="score-row">'
        + '<span class="rank"' + medal + '>' + (i+1) + '</span>'
        + '<span class="name">' + escapeHtml(s.name) + '</span>'
        + '<span class="level">' + s.level + '</span>'
        + '<span class="pts">' + s.score.toLocaleString() + '</span></div>';
    });
    if (!isConfigured()) {
      html += '<div style="text-align:center;padding:12px 0 4px;font-size:11px;color:rgba(255,248,240,0.25);">Local scores only</div>';
    }
    tableEl.innerHTML = html;
  }

  return { fetchGlobal:fetchGlobal, submitScore:submitScore, isNewHigh:isNewHigh, renderTable:renderTable };
})();
