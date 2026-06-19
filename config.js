// ===== HOLY DEUCE - GAME CONFIGURATION =====
const CONFIG = {
  difficulties: {
    easy:   { lives: 4, ballSpeedMult: 0.85, paddleWidthMult: 1.2, aiSmartness: 0.6, label: 'EASY' },
    normal: { lives: 3, ballSpeedMult: 1.0,  paddleWidthMult: 1.0, aiSmartness: 1.0, label: 'NORMAL' },
    holy:   { lives: 2, ballSpeedMult: 1.15, paddleWidthMult: 0.8, aiSmartness: 1.5, label: 'HOLY' }
  },
  courtThemes: [
    { name:'Blue',  bg1:'#0D5E5E', bg2:'#1A7A7A', line:'rgba(255,255,255,0.6)', glass:'rgba(180,220,230,0.12)', shine:'rgba(255,255,255,0.06)' },
    { name:'Green', bg1:'#1A5E2A', bg2:'#2A8A3A', line:'rgba(255,255,255,0.55)', glass:'rgba(180,230,190,0.12)', shine:'rgba(200,255,200,0.06)' },
    { name:'Clay',  bg1:'#8B5513', bg2:'#CD853F', line:'rgba(255,255,255,0.5)',  glass:'rgba(230,200,170,0.12)', shine:'rgba(255,230,200,0.06)' },
    { name:'Night', bg1:'#151535', bg2:'#252555', line:'rgba(180,180,255,0.4)',   glass:'rgba(140,140,200,0.15)', shine:'rgba(180,180,255,0.06)' }
  ],
  levelPerThemeChange: 3,
  hitsPerLevel: 8,
  smash: { proximity: 40, speedThreshold: 6, multiplier: 1.8, bonusPoints: 25 },
  powerUp: { spawnMinFrames: 900, spawnMaxFrames: 1500, fallSpeed: 1.2, duration: 480, radius: 13 },
  countdown: { framesPerNumber: 50 },
  glassW: 10
};

function lerpColor(a, b, t) {
  var ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16);
  var br = parseInt(b.slice(1,3),16), bg2 = parseInt(b.slice(3,5),16), bb = parseInt(b.slice(5,7),16);
  var r = Math.round(ar + (br-ar)*t), g = Math.round(ag + (bg2-ag)*t), bl = Math.round(ab + (bb-ab)*t);
  return '#' + ((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1);
}

function seededRandom(seed) {
  var s = seed|0;
  return function() {
    s = (s + 0x6D2B79F5)|0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch(e) {}
}
