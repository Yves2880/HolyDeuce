// ===== PADEL RACKET DRAWING =====
function drawPadelRacket(ctx, x, y, w, h, color1, color2, flipped) {
  const cx = x + w / 2;
  const scale = w / 80;

  // Dimensions
  const headW = w * 0.95;
  const headH = h * 1.8;
  const throatH = 8 * scale;
  const handleW = 8 * scale;
  const handleH = 16 * scale;
  const totalH = headH + throatH + handleH;

  let headCY, throatY, handleTopY;
  if (flipped) {
    handleTopY = y - 2;
    throatY = handleTopY + handleH;
    headCY = throatY + throatH + headH / 2;
  } else {
    headCY = y + headH / 2;
    throatY = y + headH;
    handleTopY = throatY + throatH;
  }

  ctx.save();

  // === HANDLE ===
  const hGrad = ctx.createLinearGradient(cx - handleW/2, 0, cx + handleW/2, 0);
  hGrad.addColorStop(0, '#2a2a2a');
  hGrad.addColorStop(0.3, '#444');
  hGrad.addColorStop(0.7, '#444');
  hGrad.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = hGrad;
  ctx.beginPath();
  ctx.roundRect(cx - handleW/2, handleTopY, handleW, handleH, 2 * scale);
  ctx.fill();

  // Grip wrap diagonal lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < handleH; i += 3 * scale) {
    ctx.beginPath();
    ctx.moveTo(cx - handleW/2, handleTopY + i);
    ctx.lineTo(cx + handleW/2, handleTopY + i + 3 * scale);
    ctx.stroke();
  }

  // === THROAT (triangular bridge) ===
  ctx.fillStyle = color1;
  ctx.beginPath();
  if (flipped) {
    ctx.moveTo(cx - handleW/2, throatY);
    ctx.lineTo(cx + handleW/2, throatY);
    ctx.lineTo(cx + headW * 0.3, throatY + throatH);
    ctx.lineTo(cx - headW * 0.3, throatY + throatH);
  } else {
    ctx.moveTo(cx - headW * 0.3, throatY);
    ctx.lineTo(cx + headW * 0.3, throatY);
    ctx.lineTo(cx + handleW/2, throatY + throatH);
    ctx.lineTo(cx - handleW/2, throatY + throatH);
  }
  ctx.closePath();
  ctx.fill();

  // Throat cutout (triangle hole)
  ctx.fillStyle = flipped ? '#135C5C' : '#135C5C';
  ctx.beginPath();
  if (flipped) {
    ctx.moveTo(cx, throatY + 2 * scale);
    ctx.lineTo(cx + headW * 0.12, throatY + throatH - 1 * scale);
    ctx.lineTo(cx - headW * 0.12, throatY + throatH - 1 * scale);
  } else {
    ctx.moveTo(cx - headW * 0.12, throatY + 1 * scale);
    ctx.lineTo(cx + headW * 0.12, throatY + 1 * scale);
    ctx.lineTo(cx, throatY + throatH - 2 * scale);
  }
  ctx.closePath();
  ctx.fill();

  // === RACKET HEAD ===
  // Teardrop shape: wider at top, narrower toward throat
  const grad = ctx.createRadialGradient(cx, headCY, 0, cx, headCY, headW/2);
  grad.addColorStop(0, color2);
  grad.addColorStop(1, color1);

  ctx.fillStyle = grad;
  ctx.beginPath();
  // Draw teardrop using bezier curves
  const topY = headCY - headH / 2;
  const botY = headCY + headH / 2;
  const narrowW = headW * 0.65;
  if (!flipped) {
    // Wide at top, narrow at bottom
    ctx.moveTo(cx, topY);
    ctx.bezierCurveTo(cx + headW/2, topY, cx + headW/2, headCY, cx + narrowW/2, botY);
    ctx.lineTo(cx - narrowW/2, botY);
    ctx.bezierCurveTo(cx - headW/2, headCY, cx - headW/2, topY, cx, topY);
  } else {
    // Wide at bottom, narrow at top
    ctx.moveTo(cx - narrowW/2, topY);
    ctx.bezierCurveTo(cx - headW/2, headCY, cx - headW/2, botY, cx, botY);
    ctx.bezierCurveTo(cx + headW/2, botY, cx + headW/2, headCY, cx + narrowW/2, topY);
    ctx.lineTo(cx - narrowW/2, topY);
  }
  ctx.closePath();
  ctx.fill();

  // Frame border
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();

  // Inner frame line
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.save();
  ctx.scale(0.88, 0.88);
  ctx.translate(cx * (1/0.88 - 1), headCY * (1/0.88 - 1));
  ctx.beginPath();
  if (!flipped) {
    ctx.moveTo(cx, topY);
    ctx.bezierCurveTo(cx + headW/2, topY, cx + headW/2, headCY, cx + narrowW/2, botY);
    ctx.lineTo(cx - narrowW/2, botY);
    ctx.bezierCurveTo(cx - headW/2, headCY, cx - headW/2, topY, cx, topY);
  } else {
    ctx.moveTo(cx - narrowW/2, topY);
    ctx.bezierCurveTo(cx - headW/2, headCY, cx - headW/2, botY, cx, botY);
    ctx.bezierCurveTo(cx + headW/2, botY, cx + headW/2, headCY, cx + narrowW/2, topY);
    ctx.lineTo(cx - narrowW/2, topY);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // === HOLES GRID ===
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  const holeR = 1.8 * scale;
  const spacingX = 7 * scale;
  const spacingY = 6.5 * scale;
  const rows = Math.floor(headH / spacingY) - 2;
  const cols = Math.floor(headW / spacingX) - 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hx = cx - (cols - 1) * spacingX / 2 + c * spacingX;
      const hy = headCY - (rows - 1) * spacingY / 2 + r * spacingY;

      // Check if inside the teardrop shape (approximate with ellipse that narrows)
      const yNorm = (hy - headCY) / (headH / 2);
      const widthAtY = flipped
        ? (yNorm > 0 ? headW/2 : narrowW/2 + (headW/2 - narrowW/2) * (1 - Math.abs(yNorm)))
        : (yNorm < 0 ? headW/2 : narrowW/2 + (headW/2 - narrowW/2) * (1 - Math.abs(yNorm)));
      const xDist = Math.abs(hx - cx);

      if (xDist < widthAtY * 0.75 && Math.abs(yNorm) < 0.85) {
        ctx.beginPath();
        ctx.arc(hx, hy, holeR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Top shine highlight
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.ellipse(cx - headW * 0.1, headCY - headH * 0.15, headW * 0.25, headH * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}
