import { useState, useRef, useEffect, useCallback } from "react";
import "./InterferenceSimulation.css";

// ─── Constants & helpers ──────────────────────────────────────────────────────
const LAMBDA_PRESETS = [
  { label: "380 nm", value: 380, name: "Violet extrême" },
  { label: "440 nm", value: 440, name: "Violet" },
  { label: "480 nm", value: 480, name: "Bleu" },
  { label: "530 nm", value: 530, name: "Vert" },
  { label: "580 nm", value: 580, name: "Jaune" },
  { label: "620 nm", value: 620, name: "Orange" },
  { label: "660 nm", value: 660, name: "Rouge" },
  { label: "700 nm", value: 700, name: "Rouge foncé" },
];

// Convert wavelength (nm) → RGB, simplified visible spectrum
function lambdaToRGB(lambda) {
  let r, g, b;
  if (lambda >= 380 && lambda < 440) {
    r = (440 - lambda) / 60; g = 0; b = 1;
  } else if (lambda < 490) {
    r = 0; g = (lambda - 440) / 50; b = 1;
  } else if (lambda < 510) {
    r = 0; g = 1; b = (510 - lambda) / 20;
  } else if (lambda < 580) {
    r = (lambda - 510) / 70; g = 1; b = 0;
  } else if (lambda < 645) {
    r = 1; g = (645 - lambda) / 65; b = 0;
  } else {
    r = 1; g = 0; b = 0;
  }
  const factor = lambda < 420 ? 0.3 + 0.7 * (lambda - 380) / 40
    : lambda > 680 ? 0.3 + 0.7 * (700 - lambda) / 20 : 1;
  return [
    Math.round(255 * r * factor),
    Math.round(255 * g * factor),
    Math.round(255 * b * factor),
  ];
}

function interfrange(lambda_nm, D_cm, a_mm) {
  // i = λD/a
  const lambda_m = lambda_nm * 1e-9;
  const D_m = D_cm * 0.01;
  const a_m = a_mm * 1e-3;
  return (lambda_m * D_m / a_m) * 1000; // result in mm
}

// ─── Fringe canvas painter ────────────────────────────────────────────────────
const FRINGE_W = 820;
const FRINGE_H = 200;
const SCREEN_W = 820;
const SCREEN_H = 80;

function drawFringes(canvas, lambda, D, a, brightness = 1) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const [lr, lg, lb] = lambdaToRGB(lambda);
  const i_px = interfrange(lambda, D, a) * (W / 50); // scale: 50mm → full width
  if (!isFinite(i_px) || i_px < 0.5) return;

  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let x = 0; x < W; x++) {
    const xMm = (x - W / 2) * (50 / W); // physical position in mm
    const phase = (2 * Math.PI * xMm) / (interfrange(lambda, D, a));
    const intensity = Math.cos(phase / 2) * Math.cos(phase / 2) * brightness;
    const envelope = Math.exp(-Math.pow(xMm / 18, 2)); // Gaussian envelope
    const I = intensity * envelope;

    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 4;
      data[idx]     = Math.round(lr * I);
      data[idx + 1] = Math.round(lg * I);
      data[idx + 2] = Math.round(lb * I);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Fringe markers (central + ±1 ±2 ±3)
  ctx.font = "10px 'Courier New'";
  ctx.textAlign = "center";
  for (let n = -4; n <= 4; n++) {
    const xBright = W / 2 + n * i_px;
    if (xBright < 10 || xBright > W - 10) continue;
    ctx.strokeStyle = n === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = n === 0 ? 1.5 : 1;
    ctx.setLineDash(n === 0 ? [] : [3, 3]);
    ctx.beginPath();
    ctx.moveTo(xBright, 0);
    ctx.lineTo(xBright, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = n === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)";
    ctx.fillText(n === 0 ? "O" : (n > 0 ? `+${n}` : `${n}`), xBright, H - 4);
  }

  // Interfrange arrow
  const cx = W / 2;
  const arrowY = 14;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx, arrowY);
  ctx.lineTo(cx + i_px, arrowY);
  ctx.stroke();
  // arrowheads
  [[cx, 1], [cx + i_px, -1]].forEach(([x, d]) => {
    ctx.beginPath();
    ctx.moveTo(x, arrowY);
    ctx.lineTo(x + d * 5, arrowY - 4);
    ctx.lineTo(x + d * 5, arrowY + 4);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();
  });
  const iMm = interfrange(lambda, D, a);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "bold 10px 'Courier New'";
  ctx.fillText(`i = ${iMm.toFixed(3)} mm`, cx + i_px / 2, arrowY - 5);
}

// ─── Optical diagram canvas ───────────────────────────────────────────────────
const DIAG_W = 820;
const DIAG_H = 260;

function drawDiagram(canvas, lambda, D_cm, a_mm, s1Y, s2Y, dragging) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#04080f");
  bg.addColorStop(1, "#080d18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const [lr, lg, lb] = lambdaToRGB(lambda);
  const lightColor = `rgb(${lr},${lg},${lb})`;

  // Layout positions
  const sourceX = 60;
  const slitX   = 260;
  const screenX = W - 60;
  const cy = H / 2;

  // ── Source (laser) ──
  const grad = ctx.createRadialGradient(sourceX, cy, 2, sourceX, cy, 30);
  grad.addColorStop(0, lightColor);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sourceX, cy, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sourceX, cy, 7, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "10px 'Courier New'";
  ctx.textAlign = "center";
  ctx.fillText("Source", sourceX, cy + 24);
  ctx.fillText(`λ=${lambda}nm`, sourceX, cy + 36);

  // ── Incident beam ──
  ctx.strokeStyle = `rgba(${lr},${lg},${lb},0.35)`;
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sourceX + 10, cy);
  ctx.lineTo(slitX - 8, cy);
  ctx.stroke();
  ctx.lineCap = "butt";

  // ── Slit barrier ──
  const barrierH = H * 0.8;
  const barrierTop = (H - barrierH) / 2;
  ctx.fillStyle = "rgba(140,160,200,0.15)";
  ctx.fillRect(slitX - 6, barrierTop, 12, barrierH);
  ctx.strokeStyle = "rgba(140,160,200,0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(slitX - 6, barrierTop, 12, barrierH);

  // Slit label
  ctx.fillStyle = "rgba(200,220,255,0.55)";
  ctx.font = "10px 'Courier New'";
  ctx.textAlign = "center";
  ctx.fillText("Fentes", slitX, barrierTop - 8);
  ctx.fillText(`a=${a_mm}mm`, slitX, barrierTop - 18);

  // ── Draggable slits S1, S2 ──
  const s1x = slitX, s2x = slitX;
  const isClose1 = dragging === "s1";
  const isClose2 = dragging === "s2";

  [["S1", s1x, s1Y, isClose1], ["S2", s2x, s2Y, isClose2]].forEach(([lbl, sx, sy, hot]) => {
    // Opening in barrier
    ctx.clearRect(sx - 5, sy - 4, 10, 8);
    ctx.fillStyle = hot ? `rgba(${lr},${lg},${lb},0.3)` : "rgba(0,0,0,0)";
    ctx.fillRect(sx - 5, sy - 4, 10, 8);

    // Slit indicator dot
    ctx.beginPath();
    ctx.arc(sx, sy, hot ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = hot ? lightColor : `rgba(${lr},${lg},${lb},0.7)`;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = `bold 10px 'Courier New'`;
    ctx.textAlign = "left";
    ctx.fillText(lbl, sx + 10, sy + 4);
  });

  // ── Diffracted rays (S1, S2 → screen) ──
  const nRays = 7;
  const screenFull = H;
  for (let k = 0; k < nRays; k++) {
    const targetY = (k / (nRays - 1)) * screenFull;
    [[s1Y, 0.22], [s2Y, 0.22]].forEach(([sy, alpha]) => {
      const dx = screenX - slitX;
      const dy = targetY - sy;
      const xMm = ((targetY - H/2) / (screenFull / 2)) * 15; // ±15mm range
      const phase = (2 * Math.PI * xMm) / interfrange(lambda, D_cm, a_mm);
      const I = Math.cos(phase / 2) * Math.cos(phase / 2) * Math.exp(-Math.pow(xMm / 18, 2));

      ctx.strokeStyle = `rgba(${lr},${lg},${lb},${alpha * I + 0.04})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(slitX, sy);
      ctx.lineTo(screenX, targetY);
      ctx.stroke();
    });
  }

  // ── Screen ──
  const screenGrad = ctx.createLinearGradient(screenX - 8, 0, screenX + 8, 0);
  screenGrad.addColorStop(0, "rgba(60,80,120,0.3)");
  screenGrad.addColorStop(0.5, "rgba(80,100,140,0.5)");
  screenGrad.addColorStop(1, "rgba(40,60,100,0.2)");
  ctx.fillStyle = screenGrad;
  ctx.fillRect(screenX - 5, 0, 10, H);
  ctx.strokeStyle = "rgba(140,160,220,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(screenX - 5, 0);
  ctx.lineTo(screenX - 5, H);
  ctx.stroke();
  ctx.fillStyle = "rgba(200,220,255,0.5)";
  ctx.font = "10px 'Courier New'";
  ctx.textAlign = "center";
  ctx.fillText("Écran", screenX + 14, cy - 10);
  ctx.fillText(`D=${D_cm}cm`, screenX + 14, cy + 2);

  // ── D distance arrow ──
  const arrowY2 = H - 14;
  ctx.strokeStyle = "rgba(200,220,255,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(slitX, arrowY2); ctx.lineTo(screenX - 6, arrowY2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(200,220,255,0.5)";
  ctx.font = "10px 'Courier New'";
  ctx.textAlign = "center";
  ctx.fillText(`D = ${D_cm} cm`, (slitX + screenX) / 2, arrowY2 - 4);

  // ── a distance (between slits) arrow ──
  if (Math.abs(s1Y - s2Y) > 10) {
    const ax = slitX - 24;
    ctx.strokeStyle = "rgba(200,220,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax, s1Y);
    ctx.lineTo(ax, s2Y);
    ctx.stroke();
    ctx.fillStyle = "rgba(200,220,255,0.5)";
    ctx.font = "10px 'Courier New'";
    ctx.textAlign = "right";
    ctx.fillText(`a`, ax - 3, (s1Y + s2Y) / 2 + 4);
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InterferenceSimulation() {
  const diagRef   = useRef(null);
  const fringeRef = useRef(null);

  const [lambda, setLambda]   = useState(530);   // nm
  const [D, setD]             = useState(50);    // cm
  const [a, setA]             = useState(0.5);   // mm
  const [s1Y, setS1Y]         = useState(0);     // relative offset (reset by a slider)
  const [s2Y, setS2Y]         = useState(0);
  const [dragging, setDragging] = useState(null); // "s1" | "s2" | null
  const [showFormula, setShowFormula] = useState(false);

  const diagH = DIAG_H;
  const cy = diagH / 2;
  // Map a_mm → pixel separation in diagram
  const aSep = Math.min(a * 38, diagH * 0.38);

  // Actual slit positions in diagram
  const s1YAbs = cy - aSep / 2 + s1Y;
  const s2YAbs = cy + aSep / 2 + s2Y;

  const redraw = useCallback(() => {
    if (diagRef.current) {
      drawDiagram(diagRef.current, lambda, D, a, s1YAbs, s2YAbs, dragging);
    }
    if (fringeRef.current) {
      drawFringes(fringeRef.current, lambda, D, a);
    }
  }, [lambda, D, a, s1YAbs, s2YAbs, dragging]);

  useEffect(() => { redraw(); }, [redraw]);

  // Drag handlers on the diagram canvas
  function getSlitFromEvent(e) {
    const rect = diagRef.current.getBoundingClientRect();
    const scaleX = DIAG_W / rect.width;
    const scaleY = diagH / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;
    const slitX = 260;
    if (Math.abs(x - slitX) > 40) return null;
    if (Math.abs(y - s1YAbs) < 14) return "s1";
    if (Math.abs(y - s2YAbs) < 14) return "s2";
    return null;
  }

  function onMouseDown(e) {
    const slit = getSlitFromEvent(e);
    if (slit) { setDragging(slit); e.preventDefault(); }
  }

  function onMouseMove(e) {
    if (!dragging) return;
    const rect = diagRef.current.getBoundingClientRect();
    const scaleY = diagH / rect.height;
    const y = (e.clientY - rect.top) * scaleY;
    if (dragging === "s1") setS1Y(Math.max(-60, Math.min(60, y - (cy - aSep / 2))));
    if (dragging === "s2") setS2Y(Math.max(-60, Math.min(60, y - (cy + aSep / 2))));
  }

  function onMouseUp() { setDragging(null); }

  // Touch support
  function onTouchStart(e) {
    const touch = e.touches[0];
    const slit = getSlitFromEvent(touch);
    if (slit) { setDragging(slit); e.preventDefault(); }
  }
  function onTouchMove(e) {
    if (!dragging) return;
    const touch = e.touches[0];
    onMouseMove(touch);
    e.preventDefault();
  }

  const iMm = interfrange(lambda, D, a);
  const currentPreset = LAMBDA_PRESETS.find(p => p.value === lambda) || LAMBDA_PRESETS[2];
  const [lr, lg, lb] = lambdaToRGB(lambda);
  const lightColor = `rgb(${lr},${lg},${lb})`;

  // Real separation between dragged slits in mm
  const realSep_mm = (Math.abs(s1YAbs - s2YAbs) / (diagH * 0.38)) * a * 0.38 * diagH / 38;

  return (
    <div className="intf-sim">
      {/* Header */}
      <div className="intf-sim__header">
        <div className="intf-sim__badge-row">
          <span className="intf-sim__badge intf-sim__badge--level">2ème Bac</span>
          <span className="intf-sim__badge intf-sim__badge--topic">Ondes lumineuses · Interférences</span>
        </div>
        <h2 className="intf-sim__title">
          <span className="intf-sim__title-wave" style={{ color: lightColor }}>≋</span>
          {" "}Interférences Lumineuses Manipulables
        </h2>
        <p className="intf-sim__subtitle">Expérience de Young — glisse les fentes, observe les franges en temps réel</p>
      </div>

      {/* Lambda selector */}
      <div className="intf-sim__lambda-row">
        {LAMBDA_PRESETS.map(p => (
          <button
            key={p.value}
            className={`intf-sim__lambda-btn ${lambda === p.value ? "active" : ""}`}
            style={{
              "--lc": `rgb(${lambdaToRGB(p.value).join(",")})`,
            }}
            onClick={() => setLambda(p.value)}
            title={p.name}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Optical diagram */}
      <div className="intf-sim__diagram-wrap">
        <div className="intf-sim__drag-hint">
          <span>☝ Glisse les fentes S1 et S2 pour modifier la séparation</span>
        </div>
        <canvas
          ref={diagRef}
          width={DIAG_W}
          height={diagH}
          className={`intf-sim__canvas intf-sim__canvas--diag ${dragging ? "dragging" : ""}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onMouseUp}
        />
      </div>

      {/* Fringe pattern */}
      <div className="intf-sim__fringe-wrap">
        <div className="intf-sim__fringe-label">Motif de franges sur l'écran</div>
        <canvas
          ref={fringeRef}
          width={FRINGE_W}
          height={FRINGE_H}
          className="intf-sim__canvas intf-sim__canvas--fringes"
        />
      </div>

      {/* Controls */}
      <div className="intf-sim__controls">
        <div className="intf-sim__ctrl">
          <div className="intf-sim__ctrl-label">
            <span>Longueur d'onde <em>λ</em></span>
            <span className="intf-sim__ctrl-val" style={{ color: lightColor }}>{lambda} nm</span>
          </div>
          <input
            type="range" min={380} max={700} step={5}
            value={lambda}
            onChange={e => setLambda(+e.target.value)}
            className="intf-sim__range"
            style={{ "--thumb-color": lightColor }}
          />
        </div>
        <div className="intf-sim__ctrl">
          <div className="intf-sim__ctrl-label">
            <span>Distance source–écran <em>D</em></span>
            <span className="intf-sim__ctrl-val">{D} cm</span>
          </div>
          <input
            type="range" min={10} max={200} step={5}
            value={D}
            onChange={e => setD(+e.target.value)}
            className="intf-sim__range intf-sim__range--teal"
          />
        </div>
        <div className="intf-sim__ctrl">
          <div className="intf-sim__ctrl-label">
            <span>Séparation des fentes <em>a</em></span>
            <span className="intf-sim__ctrl-val">{a} mm</span>
          </div>
          <input
            type="range" min={0.1} max={2.0} step={0.05}
            value={a}
            onChange={e => { setA(+e.target.value); setS1Y(0); setS2Y(0); }}
            className="intf-sim__range intf-sim__range--rose"
          />
        </div>
      </div>

      {/* Results row */}
      <div className="intf-sim__results">
        <div className="intf-sim__result-card intf-sim__result-card--main">
          <span className="intf-sim__result-label">Interfrange <em>i</em></span>
          <span className="intf-sim__result-val" style={{ color: lightColor }}>
            {iMm.toFixed(4)} mm
          </span>
          <span className="intf-sim__result-sub">= {(iMm / 10).toFixed(5)} cm</span>
        </div>
        <div className="intf-sim__result-card">
          <span className="intf-sim__result-label">λ</span>
          <span className="intf-sim__result-val">{lambda} nm</span>
          <span className="intf-sim__result-sub">{currentPreset.name}</span>
        </div>
        <div className="intf-sim__result-card">
          <span className="intf-sim__result-label">D</span>
          <span className="intf-sim__result-val">{D} cm</span>
          <span className="intf-sim__result-sub">{(D / 100).toFixed(2)} m</span>
        </div>
        <div className="intf-sim__result-card">
          <span className="intf-sim__result-label">a</span>
          <span className="intf-sim__result-val">{a} mm</span>
          <span className="intf-sim__result-sub">{(a * 1e-3).toExponential(1)} m</span>
        </div>
        <div className="intf-sim__result-card">
          <span className="intf-sim__result-label">Ordre central</span>
          <span className="intf-sim__result-val">n = 0</span>
          <span className="intf-sim__result-sub">frange brillante</span>
        </div>
      </div>

      {/* Formula accordion */}
      <div className="intf-sim__formula-section">
        <button
          className="intf-sim__formula-toggle"
          onClick={() => setShowFormula(v => !v)}
        >
          {showFormula ? "▲" : "▼"} Formules & Cours
        </button>
        {showFormula && (
          <div className="intf-sim__formula-body">
            <div className="intf-sim__formula-grid">
              <div className="intf-sim__formula-item">
                <code>i = λD / a</code>
                <span>Interfrange (m)</span>
              </div>
              <div className="intf-sim__formula-item">
                <code>x<sub>n</sub> = n·i</code>
                <span>Frange brillante d'ordre n</span>
              </div>
              <div className="intf-sim__formula-item">
                <code>x<sub>n</sub> = (n + ½)·i</code>
                <span>Frange sombre d'ordre n</span>
              </div>
              <div className="intf-sim__formula-item">
                <code>δ = a·x / D</code>
                <span>Différence de marche</span>
              </div>
              <div className="intf-sim__formula-item">
                <code>Constructive: δ = nλ</code>
                <span>Interférence constructive</span>
              </div>
              <div className="intf-sim__formula-item">
                <code>Destructive: δ = (n+½)λ</code>
                <span>Interférence destructive</span>
              </div>
            </div>
            <div className="intf-sim__formula-live">
              <span>Application numérique :</span>
              <code>
                i = {lambda}×10⁻⁹ × {D}×10⁻² / {a}×10⁻³ = <strong>{iMm.toFixed(4)} mm</strong>
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}