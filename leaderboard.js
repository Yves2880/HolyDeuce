// ===== FIREBASE LEADERBOARD =====
// Uses Firebase Realtime Database REST API (no SDK needed)
// Setup: Create a Firebase project, get the database URL, and paste it below.
// Database rules should allow public read and validated writes.

const Leaderboard = (() => {
  // ============================================================
  // PASTE YOUR FIREBASE REALTIME DATABASE URL BELOW
  // Example: https://your-project-id-default-rtdb.firebaseio.com
  // ============================================================
  const FIREBASE_URL = '';

  function isConfigured() {
    return FIREBASE_URL && FIREBASE_URL.length > 10;
  }

  // Local storage fallback
  function getLocal() {
    try { return JSON.parse(localStorage.getItem('holydeuce_scores') || '[]'); }
    catch { return []; }
  }

  function saveLocal(name, pts, lvl) {
    const scores = getLocal();
    scores.push({ name, score: pts, level: lvl, date: Date.now() });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('holydeuce_scores', JSON.stringify(scores.slice(0, 100)));
  }

  // Firebase REST API
  async function fetchGlobal() {
    if (!isConfigured()) return getLocal();
    try {
      const res = await fetch(
        `${FIREBASE_URL}/scores.json?orderBy="score"&limitToLast=50`
      );
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (!data) return [];
      const scores = Object.values(data);
      scores.sort((a, b) => b.score - a.score);
      return scores;
    } catch (e) {
      console.warn('Firebase fetch failed, using local:', e);
      return getLocal();
    }
  }

  async function submitScore(name, pts, lvl) {
    // Always save locally
    saveLocal(name, pts, lvl);

    if (!isConfigured()) return;

    const entry = {
      name: name.slice(0, 12),
      score: pts,
      level: lvl,
      date: Date.now()
    };

    try {
      await fetch(`${FIREBASE_URL}/scores.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (e) {
      console.warn('Firebase submit failed:', e);
    }
  }

  async function isNewHigh(pts) {
    const scores = await fetchGlobal();
    if (scores.length === 0) return true;
    return pts > scores[0].score;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function renderTable(tableEl) {
    const scores = await fetchGlobal();
    let html = `<div class="score-row header">
      <span class="rank">#</span><span class="name">Player</span>
      <span class="level">Lvl</span><span class="pts">Score</span>
    </div>`;
    const top = scores.slice(0, 15);
    if (top.length === 0) {
      html += `<div class="score-row"><span style="color:rgba(255,248,240,0.3);margin:12px auto;">No scores yet. Be the first!</span></div>`;
    }
    top.forEach((s, i) => {
      const medal = i === 0 ? ' style="color:#E8A825"' : i === 1 ? ' style="color:#C0C0C0"' : i === 2 ? ' style="color:#CD7F32"' : '';
      html += `<div class="score-row">
        <span class="rank"${medal}>${i + 1}</span>
        <span class="name">${escapeHtml(s.name)}</span>
        <span class="level">${s.level}</span>
        <span class="pts">${s.score.toLocaleString()}</span>
      </div>`;
    });
    if (!isConfigured()) {
      html += `<div style="text-align:center;padding:12px 0 4px;font-size:11px;color:rgba(255,248,240,0.25);">Local scores only — Firebase not configured</div>`;
    }
    tableEl.innerHTML = html;
  }

  return { fetchGlobal, submitScore, isNewHigh, renderTable, isConfigured };
})();
