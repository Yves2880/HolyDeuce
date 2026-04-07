// ===== ARCADE MUSIC ENGINE (Web Audio API) =====
const AudioEngine = (() => {
  let actx = null;
  let musicGain = null;
  let sfxGain = null;
  let musicPlaying = false;
  let enabled = true;
  let musicInterval = null;
  let currentStep = 0;

  function init() {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = actx.createGain();
    musicGain.gain.value = 0.18;
    musicGain.connect(actx.destination);
    sfxGain = actx.createGain();
    sfxGain.gain.value = 0.25;
    sfxGain.connect(actx.destination);
  }

  function playNote(freq, duration, dest, type, startTime) {
    if (!actx || !enabled) return;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.3, startTime || actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, (startTime || actx.currentTime) + duration);
    osc.connect(g);
    g.connect(dest || musicGain);
    osc.start(startTime || actx.currentTime);
    osc.stop((startTime || actx.currentTime) + duration);
  }

  // Catchy arcade melody - latin/padel vibe
  const bassLine = [130.81, 130.81, 164.81, 146.83, 130.81, 130.81, 174.61, 164.81,
                    146.83, 146.83, 174.61, 164.81, 130.81, 130.81, 164.81, 146.83];
  const melody =   [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 659.25, 0,
                    523.25, 587.33, 659.25, 783.99, 880.00, 783.99, 659.25, 0];
  const melody2 =  [783.99, 880.00, 783.99, 659.25, 587.33, 523.25, 440.00, 0,
                    523.25, 440.00, 523.25, 587.33, 659.25, 587.33, 523.25, 0];
  const perc = [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1];

  function startMusic() {
    if (musicPlaying || !enabled) return;
    init();
    musicPlaying = true;
    currentStep = 0;
    const bpm = 140;
    const stepTime = 60 / bpm / 2;

    musicInterval = setInterval(() => {
      if (!enabled || !actx) { stopMusic(); return; }
      const t = actx.currentTime;
      const bar = Math.floor(currentStep / 16) % 2;
      const idx = currentStep % 16;

      // Bass
      playNote(bassLine[idx], stepTime * 0.8, musicGain, 'triangle', t);

      // Melody
      const mel = bar === 0 ? melody[idx] : melody2[idx];
      if (mel > 0) playNote(mel, stepTime * 0.6, musicGain, 'square', t);

      // Percussion (noise-like)
      if (perc[idx]) {
        const n = actx.createOscillator();
        const ng = actx.createGain();
        n.type = 'sawtooth';
        n.frequency.value = 80 + Math.random() * 40;
        ng.gain.setValueAtTime(0.08, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        n.connect(ng);
        ng.connect(musicGain);
        n.start(t);
        n.stop(t + 0.05);
      }

      currentStep++;
    }, stepTime * 1000);
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  }

  // Sound effects
  function sfxHit() {
    init();
    if (!enabled) return;
    playNote(660, 0.08, sfxGain, 'square');
    playNote(880, 0.06, sfxGain, 'sine');
  }

  function sfxBounce() {
    init();
    if (!enabled) return;
    playNote(440, 0.05, sfxGain, 'triangle');
  }

  function sfxScore() {
    init();
    if (!enabled) return;
    const t = actx.currentTime;
    playNote(523, 0.1, sfxGain, 'square', t);
    playNote(659, 0.1, sfxGain, 'square', t + 0.1);
    playNote(784, 0.15, sfxGain, 'square', t + 0.2);
  }

  function sfxLoseLife() {
    init();
    if (!enabled) return;
    const t = actx.currentTime;
    playNote(300, 0.15, sfxGain, 'sawtooth', t);
    playNote(200, 0.2, sfxGain, 'sawtooth', t + 0.15);
    playNote(120, 0.3, sfxGain, 'sawtooth', t + 0.3);
  }

  function sfxGameOver() {
    init();
    if (!enabled) return;
    const t = actx.currentTime;
    playNote(400, 0.2, sfxGain, 'square', t);
    playNote(350, 0.2, sfxGain, 'square', t + 0.2);
    playNote(300, 0.2, sfxGain, 'square', t + 0.4);
    playNote(200, 0.5, sfxGain, 'sawtooth', t + 0.6);
  }

  function sfxLevelUp() {
    init();
    if (!enabled) return;
    const t = actx.currentTime;
    playNote(523, 0.1, sfxGain, 'square', t);
    playNote(659, 0.1, sfxGain, 'square', t + 0.08);
    playNote(784, 0.1, sfxGain, 'square', t + 0.16);
    playNote(1047, 0.2, sfxGain, 'square', t + 0.24);
  }

  function toggle() {
    enabled = !enabled;
    if (!enabled) stopMusic();
    return enabled;
  }

  return { init, startMusic, stopMusic, sfxHit, sfxBounce, sfxScore,
           sfxLoseLife, sfxGameOver, sfxLevelUp, toggle, isEnabled: () => enabled };
})();
