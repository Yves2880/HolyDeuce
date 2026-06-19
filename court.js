// ===== PADEL COURT DRAWING (with theme support) =====
function drawCourt(ctx, W, H, theme) {
  theme = theme || CONFIG.courtThemes[0];

  // Court surface
  var cg = ctx.createLinearGradient(0, 0, 0, H);
  cg.addColorStop(0, theme.bg1);
  cg.addColorStop(0.5, theme.bg2);
  cg.addColorStop(1, theme.bg1);
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, H);

  // Subtle court texture
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (var y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 2);
  }

  var gw = CONFIG.glassW;
  var courtL = gw, courtR = W - gw, courtT = gw, courtB = H - gw;
  var courtW = courtR - courtL, courtH = courtB - courtT;

  // Court lines
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(courtL, courtT, courtW, courtH);

  // Net line
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(courtL, H/2);
  ctx.lineTo(courtR, H/2);
  ctx.stroke();

  // Service lines
  ctx.lineWidth = 2;
  var sTop = courtH * 0.28;
  var sBot = courtH * 0.72;

  ctx.beginPath(); ctx.moveTo(courtL, courtT + sTop); ctx.lineTo(courtR, courtT + sTop); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(courtL, courtT + sBot); ctx.lineTo(courtR, courtT + sBot); ctx.stroke();

  // Center service lines
  ctx.beginPath(); ctx.moveTo(W/2, courtT); ctx.lineTo(W/2, courtT + sTop); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2, courtT + sBot); ctx.lineTo(W/2, courtB); ctx.stroke();

  // Net posts
  ctx.fillStyle = '#AAA';
  ctx.fillRect(courtL - 3, H/2 - 3, 6, 6);
  ctx.fillRect(courtR - 3, H/2 - 3, 6, 6);

  // Net mesh
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (var i = courtL + 6; i < courtR; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, H/2-2); ctx.lineTo(i, H/2+2); ctx.stroke();
  }

  // Net shadow
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(courtL, H/2+3, courtW, 4);

  // Glass walls
  // Side glass
  ctx.fillStyle = theme.glass;
  ctx.fillRect(0, 0, gw, H);
  ctx.fillRect(W-gw, 0, gw, H);
  ctx.fillStyle = theme.shine;
  ctx.fillRect(2, 0, 2, H);
  ctx.fillRect(W-4, 0, 2, H);

  // Back glass (top + bottom)
  ctx.fillStyle = theme.glass;
  ctx.fillRect(0, 0, W, gw);
  ctx.fillRect(0, H-gw, W, gw);
  ctx.fillStyle = theme.shine;
  ctx.fillRect(0, 2, W, 2);
  ctx.fillRect(0, H-4, W, 2);

  // Metal frame borders
  ctx.strokeStyle = 'rgba(200,210,220,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(gw, 0); ctx.lineTo(gw, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W-gw, 0); ctx.lineTo(W-gw, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, gw); ctx.lineTo(W, gw); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H-gw); ctx.lineTo(W, H-gw); ctx.stroke();

  // Corner posts
  ctx.fillStyle = 'rgba(180,190,200,0.3)';
  ctx.fillRect(0, 0, gw, gw);
  ctx.fillRect(W-gw, 0, gw, gw);
  ctx.fillRect(0, H-gw, gw, gw);
  ctx.fillRect(W-gw, H-gw, gw, gw);

  // Wire mesh hints on side walls
  ctx.strokeStyle = 'rgba(180,190,200,0.08)';
  ctx.lineWidth = 0.5;
  for (var y2 = 0; y2 < H; y2 += 12) {
    ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(gw, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W-gw, y2); ctx.lineTo(W, y2); ctx.stroke();
  }
}
