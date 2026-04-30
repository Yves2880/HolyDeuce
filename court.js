// ===== PADEL COURT DRAWING =====
function drawCourt(ctx, W, H) {
  // Court surface - blue/teal padel court
  const cg = ctx.createLinearGradient(0, 0, 0, H);
  cg.addColorStop(0, '#0D5E5E');
  cg.addColorStop(0.5, '#1A7A7A');
  cg.addColorStop(1, '#0D5E5E');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, W, H);

  // Subtle court texture
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 2);
  }

  const glassW = 10;
  const courtL = glassW;
  const courtR = W - glassW;
  const courtT = glassW;
  const courtB = H - glassW;
  const courtW = courtR - courtL;
  const courtH = courtB - courtT;

  // === COURT LINES (white like real padel) ===
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;

  // Outer boundary
  ctx.strokeRect(courtL, courtT, courtW, courtH);

  // Net line (center) - thicker
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(courtL, H / 2);
  ctx.lineTo(courtR, H / 2);
  ctx.stroke();

  // Service lines
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  const serviceDistTop = courtH * 0.28;
  const serviceDistBot = courtH * 0.72;

  // Top service line
  ctx.beginPath();
  ctx.moveTo(courtL, courtT + serviceDistTop);
  ctx.lineTo(courtR, courtT + serviceDistTop);
  ctx.stroke();

  // Bottom service line
  ctx.beginPath();
  ctx.moveTo(courtL, courtT + serviceDistBot);
  ctx.lineTo(courtR, courtT + serviceDistBot);
  ctx.stroke();

  // Center service lines (vertical)
  ctx.beginPath();
  ctx.moveTo(W / 2, courtT);
  ctx.lineTo(W / 2, courtT + serviceDistTop);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(W / 2, courtT + serviceDistBot);
  ctx.lineTo(W / 2, courtB);
  ctx.stroke();

  // === NET ===
  // Net posts
  ctx.fillStyle = '#AAA';
  ctx.fillRect(courtL - 3, H / 2 - 3, 6, 6);
  ctx.fillRect(courtR - 3, H / 2 - 3, 6, 6);

  // Net mesh
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (let i = courtL + 6; i < courtR; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, H / 2 - 2);
    ctx.lineTo(i, H / 2 + 2);
    ctx.stroke();
  }

  // Net shadow
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(courtL, H / 2 + 3, courtW, 4);

  // === GLASS WALLS ===
  // Side glass panels
  const glassColor = 'rgba(180,220,230,0.12)';
  const glassShine = 'rgba(255,255,255,0.06)';

  // Left glass
  ctx.fillStyle = glassColor;
  ctx.fillRect(0, 0, glassW, H);
  ctx.fillStyle = glassShine;
  ctx.fillRect(2, 0, 2, H);

  // Right glass
  ctx.fillStyle = glassColor;
  ctx.fillRect(W - glassW, 0, glassW, H);
  ctx.fillStyle = glassShine;
  ctx.fillRect(W - 4, 0, 2, H);

  // Back glass (top - behind enemy)
  ctx.fillStyle = glassColor;
  ctx.fillRect(0, 0, W, glassW);
  ctx.fillStyle = glassShine;
  ctx.fillRect(0, 2, W, 2);

  // Back glass (bottom - behind player)
  ctx.fillStyle = glassColor;
  ctx.fillRect(0, H - glassW, W, glassW);
  ctx.fillStyle = glassShine;
  ctx.fillRect(0, H - 4, W, 2);

  // Glass wall borders (metal frame)
  ctx.strokeStyle = 'rgba(200,210,220,0.25)';
  ctx.lineWidth = 2;

  // Left frame
  ctx.beginPath(); ctx.moveTo(glassW, 0); ctx.lineTo(glassW, H); ctx.stroke();
  // Right frame
  ctx.beginPath(); ctx.moveTo(W - glassW, 0); ctx.lineTo(W - glassW, H); ctx.stroke();
  // Top frame
  ctx.beginPath(); ctx.moveTo(0, glassW); ctx.lineTo(W, glassW); ctx.stroke();
  // Bottom frame
  ctx.beginPath(); ctx.moveTo(0, H - glassW); ctx.lineTo(W, H - glassW); ctx.stroke();

  // Corner posts (metal)
  ctx.fillStyle = 'rgba(180,190,200,0.3)';
  ctx.fillRect(0, 0, glassW, glassW);
  ctx.fillRect(W - glassW, 0, glassW, glassW);
  ctx.fillRect(0, H - glassW, glassW, glassW);
  ctx.fillRect(W - glassW, H - glassW, glassW, glassW);

  // === WIRE MESH above glass (top sections of side walls) ===
  ctx.strokeStyle = 'rgba(180,190,200,0.08)';
  ctx.lineWidth = 0.5;
  // Left mesh hints
  for (let y = 0; y < H; y += 12) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(glassW, y); ctx.stroke();
  }
  for (let y = 0; y < H; y += 12) {
    ctx.beginPath(); ctx.moveTo(W - glassW, y); ctx.lineTo(W, y); ctx.stroke();
  }
}
