/**
 * Draws the realistic cannon scene background onto the canvas.
 * Call this right after ctx.clearRect() in your draw function,
 * before drawing the grid and trajectory.
 */
export function drawScene(ctx, W, H, PAD, isDark) {
  // ── SKY ──
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H - PAD.bottom);
  if (isDark) {
    skyGrad.addColorStop(0, "#0a0a1a");
    skyGrad.addColorStop(0.5, "#0f1a2e");
    skyGrad.addColorStop(1, "#1a2a1a");
  } else {
    skyGrad.addColorStop(0, "#87ceeb");
    skyGrad.addColorStop(0.6, "#b0dff5");
    skyGrad.addColorStop(1, "#d4eecc");
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H - PAD.bottom);

  // ── SUN / MOON ──
  if (!isDark) {
    ctx.beginPath();
    ctx.arc(W - PAD.right - 60, PAD.top + 30, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#fffbe6";
    ctx.shadowColor = "#ffe066";
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    // moon
    ctx.beginPath();
    ctx.arc(W - PAD.right - 60, PAD.top + 35, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#d8d8c0";
    ctx.shadowColor = "#fffbe6";
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    // stars
    const stars = [[50,20],[120,40],[200,15],[300,50],[400,25],[500,10],[600,45]];
    stars.forEach(([sx, sy]) => {
      if (sx > PAD.left && sx < W - PAD.right && sy < H - PAD.bottom) {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,240,0.9)";
        ctx.fill();
      }
    });
  }

  // ── DISTANT MOUNTAINS ──
  const mtnColor = isDark ? "#1a2235" : "#8fb4a0";
  ctx.fillStyle = mtnColor;
  ctx.beginPath();
  ctx.moveTo(0, H - PAD.bottom);
  const peaks = [
    [0, 0.55], [0.08, 0.3], [0.18, 0.45], [0.28, 0.22],
    [0.38, 0.38], [0.5, 0.18], [0.62, 0.32], [0.72, 0.42],
    [0.82, 0.28], [0.92, 0.4], [1.0, 0.35], [1.0, 0.55],
  ];
  peaks.forEach(([px, py]) => {
    ctx.lineTo(px * W, (H - PAD.bottom) * py + PAD.top * 0.5);
  });
  ctx.lineTo(W, H - PAD.bottom);
  ctx.closePath();
  ctx.fill();

  // ── CLOSER HILLS ──
  const hillColor = isDark ? "#162010" : "#5a8a5a";
  ctx.fillStyle = hillColor;
  ctx.beginPath();
  ctx.moveTo(0, H - PAD.bottom);
  ctx.bezierCurveTo(
    W * 0.15, H - PAD.bottom - 60,
    W * 0.3,  H - PAD.bottom - 40,
    W * 0.5,  H - PAD.bottom - 70
  );
  ctx.bezierCurveTo(
    W * 0.7,  H - PAD.bottom - 45,
    W * 0.85, H - PAD.bottom - 55,
    W,        H - PAD.bottom - 30
  );
  ctx.lineTo(W, H - PAD.bottom);
  ctx.closePath();
  ctx.fill();

  // ── GROUND ──
  const groundGrad = ctx.createLinearGradient(0, H - PAD.bottom - 10, 0, H);
  if (isDark) {
    groundGrad.addColorStop(0, "#1a2a10");
    groundGrad.addColorStop(1, "#0d150a");
  } else {
    groundGrad.addColorStop(0, "#5a9e3a");
    groundGrad.addColorStop(1, "#3d7a28");
  }
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, H - PAD.bottom, W, PAD.bottom);

  // ── GROUND LINE (dirt strip) ──
  ctx.fillStyle = isDark ? "#2a1a08" : "#8b6914";
  ctx.fillRect(0, H - PAD.bottom, W, 6);

  // ── CANNON BASE (stone platform) ──
  const baseX = PAD.left - 10;
  const baseY = H - PAD.bottom - 14;
  ctx.fillStyle = isDark ? "#3a3028" : "#8a7a60";
  ctx.beginPath();
  ctx.roundRect(baseX - 10, baseY, 80, 14, 3);
  ctx.fill();
  ctx.strokeStyle = isDark ? "#555040" : "#b09878";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── CANNON WHEELS ──
  const wheelX = baseX + 28;
  const wheelY = baseY + 6;
  const wheelR = 14;

  // wheel shadow
  ctx.beginPath();
  ctx.ellipse(wheelX, wheelY + wheelR + 2, wheelR, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();

  // wheel rim
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, wheelR, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#2a2218" : "#5a4020";
  ctx.fill();
  ctx.strokeStyle = isDark ? "#6a5a40" : "#8a6030";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // wheel spokes
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(wheelX, wheelY);
    ctx.lineTo(wheelX + Math.cos(a) * (wheelR - 2), wheelY + Math.sin(a) * (wheelR - 2));
    ctx.strokeStyle = isDark ? "#6a5a40" : "#8a6030";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // hub
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, 3, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#aaa090" : "#c0a060";
  ctx.fill();

  // ── CANNON BARREL ──
  const barrelAngle = -30 * (Math.PI / 180); // fixed visual angle
  const barrelLen = 52;
  const barrelW = 10;
  const pivotX = baseX + 22;
  const pivotY = baseY - 4;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(barrelAngle);

  // barrel body gradient
  const barrelGrad = ctx.createLinearGradient(0, -barrelW, 0, barrelW);
  barrelGrad.addColorStop(0, isDark ? "#888070" : "#b0a080");
  barrelGrad.addColorStop(0.4, isDark ? "#555040" : "#7a6840");
  barrelGrad.addColorStop(1, isDark ? "#2a2418" : "#4a3820");
  ctx.fillStyle = barrelGrad;
  ctx.beginPath();
  ctx.roundRect(0, -barrelW / 2, barrelLen, barrelW, [2, 6, 6, 2]);
  ctx.fill();

  // barrel rings
  [12, 28, 44].forEach((rx) => {
    ctx.beginPath();
    ctx.rect(rx, -barrelW / 2 - 1.5, 5, barrelW + 3);
    ctx.fillStyle = isDark ? "#666050" : "#908060";
    ctx.fill();
  });

  // muzzle flash hint (subtle)
  ctx.beginPath();
  ctx.arc(barrelLen, 0, barrelW / 2 + 1, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#444030" : "#706050";
  ctx.fill();

  ctx.restore();

  // ── CANNON BODY (breech) ──
  ctx.fillStyle = isDark ? "#3a3228" : "#6a5838";
  ctx.beginPath();
  ctx.ellipse(pivotX, pivotY, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? "#5a5040" : "#9a8860";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── TREES (right side atmosphere) ──
  const treePositions = [W * 0.72, W * 0.82, W * 0.9];
  treePositions.forEach((tx) => {
    const ty = H - PAD.bottom - 2;
    // trunk
    ctx.fillStyle = isDark ? "#2a1a08" : "#5a3a18";
    ctx.fillRect(tx - 3, ty - 30, 6, 30);
    // foliage
    ctx.beginPath();
    ctx.arc(tx, ty - 38, 18, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? "#0a2808" : "#2a6a18";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx - 8, ty - 28, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx + 8, ty - 30, 13, 0, Math.PI * 2);
    ctx.fill();
  });
}