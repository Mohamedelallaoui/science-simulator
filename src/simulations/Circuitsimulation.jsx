import { useState, useRef, useEffect, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import "./CircuitSimulation.css";

// ── LABELS ──
const LABELS = {
  fr: {
    title: "Circuit Électrique Intelligent",
    subtitle: "Transfert d'énergie — Comportement global d'un circuit",
    tension: "Tension U",
    resistance: "Résistance R",
    switch: "Interrupteur",
    open: "Ouvert",
    closed: "Fermé",
    components: "Composants",
    lamp: "Lampe",
    resistor: "Résistance",
    motor: "Moteur",
    current: "Intensité I",
    brightness: "Luminosité",
    power: "Puissance P",
    energy: "Énergie E (1min)",
    diagnosis: "Diagnostic",
    noErrors: "✓ Circuit correct — aucune anomalie détectée",
    switchOpen: "⚠ Interrupteur ouvert — aucun courant ne circule",
    overload: "⚠ Surcharge — intensité trop élevée (> 2A)",
    shortCircuit: "⚠ Court-circuit — résistance nulle détectée",
    noComponent: "⚠ Aucun composant actif dans le circuit",
    formula: "Loi d'Ohm : U = R × I",
    unitV: "V", unitA: "A", unitOhm: "Ω",
    unitW: "W", unitJ: "J",
    reset: "Réinitialiser",
    hint: "Conseil",
    hints: [
      "Augmentez la tension pour plus de luminosité",
      "Une résistance élevée protège les composants",
      "Vérifiez toujours l'interrupteur avant l'analyse",
    ],
  },
  ar: {
    title: "الدائرة الكهربائية الذكية",
    subtitle: "نقل الطاقة — السلوك العام للدائرة",
    tension: "الجهد U",
    resistance: "المقاومة R",
    switch: "القاطع",
    open: "مفتوح",
    closed: "مغلق",
    components: "المكونات",
    lamp: "مصباح",
    resistor: "مقاومة",
    motor: "محرك",
    current: "شدة التيار I",
    brightness: "اللمعان",
    power: "القدرة P",
    energy: "الطاقة E (دقيقة)",
    diagnosis: "التشخيص",
    noErrors: "✓ الدائرة سليمة — لا أخطاء",
    switchOpen: "⚠ القاطع مفتوح — لا يمر أي تيار",
    overload: "⚠ حمل زائد — شدة التيار مرتفعة (> 2A)",
    shortCircuit: "⚠ قصر دائرة — مقاومة معدومة",
    noComponent: "⚠ لا يوجد مكون نشط في الدائرة",
    formula: "قانون أوم : U = R × I",
    unitV: "V", unitA: "A", unitOhm: "Ω",
    unitW: "W", unitJ: "J",
    reset: "إعادة تعيين",
    hint: "نصيحة",
    hints: [
      "ارفع الجهد لزيادة اللمعان",
      "المقاومة العالية تحمي المكونات",
      "تحقق دائماً من القاطع قبل التحليل",
    ],
  },
};

const DEFAULT = { U: 12, R: 6, closed: true, lamp: true, resistor: false, motor: false };

// ── CIRCUIT CANVAS ──
function drawCircuit(canvas, { U, R, closed, lamp, resistor, motor }, I, brightness) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const isDark = document.documentElement.dataset.theme !== "light";
  const bg     = isDark ? "#0f1018" : "#f9f8f5";
  const wire   = closed && I > 0 ? (isDark ? "#4fc3f7" : "#1565c0") : (isDark ? "#2a2d42" : "#c0c8d8");
  const wireW  = 2.5;
  const glow   = closed && I > 0;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Circuit rectangle coordinates
  const L = W * 0.12, R2 = W * 0.88, T = H * 0.12, B = H * 0.88;
  const mx = W / 2, my = H / 2;

  // Animated current flow dots
  if (glow) {
    ctx.shadowColor = isDark ? "#4fc3f7" : "#1565c0";
    ctx.shadowBlur = 10;
  }

  // Draw wires
  ctx.strokeStyle = wire;
  ctx.lineWidth = wireW;
  ctx.lineCap = "round";

  // Top wire (left to right)
  ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(R2, T); ctx.stroke();
  // Right wire (top to bottom)
  ctx.beginPath(); ctx.moveTo(R2, T); ctx.lineTo(R2, B); ctx.stroke();
  // Bottom wire (right to left)
  ctx.beginPath(); ctx.moveTo(R2, B); ctx.lineTo(L, B); ctx.stroke();
  // Left wire (bottom to top)
  ctx.beginPath(); ctx.moveTo(L, B); ctx.lineTo(L, T); ctx.stroke();
  ctx.shadowBlur = 0;

  // ── BATTERY (left side) ──
  const bx = L, by = my;
  drawBattery(ctx, bx, by, U, isDark);

  // ── SWITCH (top wire, left quarter) ──
  const sx = L + (mx - L) * 0.45, sy = T;
  drawSwitch(ctx, sx, sy, closed, isDark);

  // ── COMPONENTS (top wire, right half) ──
  const compX = mx + (R2 - mx) * 0.3;
  if (lamp) drawLamp(ctx, compX, T, brightness, glow, isDark);

  // ── RESISTOR (right wire or bottom) ──
  if (resistor) drawResistor(ctx, R2, my, isDark);

  // ── MOTOR (bottom wire) ──
  if (motor) drawMotor(ctx, mx, B, glow && I > 0, isDark);

  // ── CURRENT ARROWS (animated feel) ──
  if (glow) {
    drawArrows(ctx, L, R2, T, B, isDark);
  }

  // ── U label ──
  ctx.fillStyle = isDark ? "#a0a3bb" : "#555";
  ctx.font = "bold 11px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`U = ${U}V`, L - 28, my);

  // ── I label ──
  if (glow) {
    ctx.fillStyle = isDark ? "#4fc3f7" : "#1565c0";
    ctx.fillText(`I = ${I.toFixed(2)}A`, mx, T - 14);
  }
}

function drawBattery(ctx, x, y, U, dark) {
  const h = 44, w = 18;
  ctx.fillStyle = dark ? "#2a2d42" : "#e8eaf6";
  ctx.strokeStyle = dark ? "#4a4d62" : "#9fa8da";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
  ctx.fill(); ctx.stroke();

  // Terminals
  const lines = Math.min(Math.round(U / 3), 6);
  for (let i = 0; i < lines; i++) {
    const ly = y - h / 2 + 6 + i * 6;
    ctx.strokeStyle = i % 2 === 0 ? "#ef5350" : "#42a5f5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 6, ly); ctx.lineTo(x + 6, ly);
    ctx.stroke();
  }

  // + and - labels
  ctx.fillStyle = "#ef5350";
  ctx.font = "bold 10px Nunito"; ctx.textAlign = "center";
  ctx.fillText("+", x, y - h / 2 - 5);
  ctx.fillStyle = "#42a5f5";
  ctx.fillText("−", x, y + h / 2 + 12);
}

function drawSwitch(ctx, x, y, closed, dark) {
  const r = 6;
  // Left contact
  ctx.fillStyle = dark ? "#4a4d62" : "#9fa8da";
  ctx.beginPath(); ctx.arc(x - 18, y, r / 2, 0, Math.PI * 2); ctx.fill();
  // Right contact
  ctx.beginPath(); ctx.arc(x + 18, y, r / 2, 0, Math.PI * 2); ctx.fill();

  // Lever
  ctx.strokeStyle = closed ? (dark ? "#4fc3f7" : "#1565c0") : (dark ? "#ff6b6b" : "#e53935");
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  if (closed) {
    ctx.lineTo(x + 18, y);
  } else {
    ctx.lineTo(x + 14, y - 16);
  }
  ctx.stroke();

  // Label
  ctx.fillStyle = dark ? "#6b7385" : "#888";
  ctx.font = "9px Nunito"; ctx.textAlign = "center";
  ctx.fillText(closed ? "K" : "K", x, y + 18);
}

function drawLamp(ctx, x, y, brightness, on, dark) {
  const r = 16;
  // Glow effect when on
  if (on && brightness > 0.1) {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    const alpha = brightness * 0.6;
    grd.addColorStop(0, `rgba(255,230,100,${alpha})`);
    grd.addColorStop(1, "rgba(255,230,100,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, Math.PI * 2); ctx.fill();
  }

  // Bulb circle
  ctx.fillStyle = on && brightness > 0.1
    ? `rgba(255,${200 + Math.round(brightness * 55)},${80 + Math.round(brightness * 80)},${0.4 + brightness * 0.6})`
    : (dark ? "#1e2030" : "#e8e8f0");
  ctx.strokeStyle = dark ? "#5a5d72" : "#9fa8da";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Filament
  ctx.strokeStyle = on && brightness > 0.1 ? "#ffd54f" : (dark ? "#4a4d62" : "#bdbdbd");
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 4); ctx.lineTo(x - 2, y - 4);
  ctx.lineTo(x + 2, y + 4); ctx.lineTo(x + 6, y - 4);
  ctx.stroke();

  // Base
  ctx.fillStyle = dark ? "#3a3d52" : "#c5cae9";
  ctx.fillRect(x - 8, y + r - 2, 16, 8);

  ctx.fillStyle = dark ? "#a0a3bb" : "#555";
  ctx.font = "9px Nunito"; ctx.textAlign = "center";
  ctx.fillText("L", x, y + r + 16);
}

function drawResistor(ctx, x, y, dark) {
  const w = 32, h = 14;
  ctx.fillStyle = dark ? "#2a2d42" : "#e8eaf6";
  ctx.strokeStyle = dark ? "#5a5d72" : "#9fa8da";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 3);
  ctx.fill(); ctx.stroke();

  // Stripes
  const colors = ["#f44336","#ff9800","#ffeb3b","#4caf50"];
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x - 10 + i * 6, y - h / 2 + 2, 4, h - 4);
  });

  ctx.fillStyle = dark ? "#a0a3bb" : "#555";
  ctx.font = "9px Nunito"; ctx.textAlign = "center";
  ctx.fillText("R", x, y + h / 2 + 14);
}

function drawMotor(ctx, x, y, spinning, dark) {
  const r = 16;
  ctx.fillStyle = dark ? "#1e3a2a" : "#e8f5e9";
  ctx.strokeStyle = spinning ? "#4caf50" : (dark ? "#4a4d62" : "#a5d6a7");
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = dark ? "#a0a3bb" : "#555";
  ctx.font = "bold 11px Nunito"; ctx.textAlign = "center";
  ctx.fillText("M", x, y + 4);
  ctx.font = "9px Nunito";
  ctx.fillText("Motor", x, y + r + 14);
}

function drawArrows(ctx, L, R2, T, B, dark) {
  const col = dark ? "rgba(79,195,247,0.55)" : "rgba(21,101,192,0.45)";
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  const pts = [
    [L + (R2 - L) * 0.25, T, 0],
    [R2, T + (B - T) * 0.35, 90],
    [R2 - (R2 - L) * 0.3, B, 180],
    [L, B - (B - T) * 0.35, 270],
  ];
  pts.forEach(([x, y, angle]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(5, 5); ctx.lineTo(-5, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });
}

// ── MAIN COMPONENT ──
export default function CircuitSimulation() {
  const { lang } = useLang();
  const L = LABELS[lang];
  const canvasRef = useRef(null);
  const [inputs, setInputs] = useState(DEFAULT);
  const [hintIdx, setHintIdx] = useState(0);

  const set = (k, v) => setInputs(p => ({ ...p, [k]: v }));
  const toggle = (k) => setInputs(p => ({ ...p, [k]: !p[k] }));

  // Physics
  const I = (!inputs.closed || inputs.R === 0) ? 0 : inputs.U / inputs.R;
  const brightness = Math.min(I / 2, 1);
  const P = I * inputs.U;
  const E = P * 60;

  // Diagnosis
  const getDiagnosis = () => {
    if (!inputs.closed) return { msg: L.switchOpen, type: "warn" };
    if (inputs.R === 0) return { msg: L.shortCircuit, type: "error" };
    if (I > 2) return { msg: L.overload, type: "error" };
    if (!inputs.lamp && !inputs.resistor && !inputs.motor)
      return { msg: L.noComponent, type: "warn" };
    return { msg: L.noErrors, type: "ok" };
  };
  const diag = getDiagnosis();

  // Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawCircuit(canvas, inputs, I, brightness);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCircuit(canvas, inputs, I, brightness);
  }, [inputs, I, brightness]);

  // Rotate hints
  useEffect(() => {
    const id = setInterval(() => setHintIdx(h => (h + 1) % L.hints.length), 4000);
    return () => clearInterval(id);
  }, [L.hints.length]);

  const reset = () => setInputs(DEFAULT);

  return (
    <div className="circuit-sim">
      {/* ── HEADER ── */}
      <div className="circuit-header">
        <div>
          <h2 className="circuit-title">{L.title}</h2>
          <p className="circuit-subtitle">{L.subtitle}</p>
        </div>
        <span className="circuit-level-badge">1ère Bac</span>
      </div>

      <div className="circuit-layout">
        {/* ── LEFT PANEL ── */}
        <aside className="circuit-panel">
          {/* Tension */}
          <div className="cp-group">
            <div className="cp-row-top">
              <label className="cp-label">{L.tension}</label>
              <span className="cp-val">{inputs.U} <em>{L.unitV}</em></span>
            </div>
            <input type="range" min={1} max={24} step={1}
              value={inputs.U} onChange={e => set("U", +e.target.value)} />
          </div>

          {/* Resistance */}
          <div className="cp-group">
            <div className="cp-row-top">
              <label className="cp-label">{L.resistance}</label>
              <span className="cp-val">{inputs.R} <em>{L.unitOhm}</em></span>
            </div>
            <input type="range" min={0} max={20} step={0.5}
              value={inputs.R} onChange={e => set("R", +e.target.value)} />
          </div>

          {/* Switch */}
          <div className="cp-group">
            <label className="cp-label">{L.switch}</label>
            <div className="cp-toggle-row">
              <button
                className={`cp-tog ${!inputs.closed ? "cp-tog--on cp-tog--open" : ""}`}
                onClick={() => set("closed", false)}>{L.open}</button>
              <button
                className={`cp-tog ${inputs.closed ? "cp-tog--on" : ""}`}
                onClick={() => set("closed", true)}>{L.closed}</button>
            </div>
          </div>

          {/* Components */}
          <div className="cp-group">
            <label className="cp-label">{L.components}</label>
            <div className="cp-comps">
              {[["lamp", L.lamp, "💡"], ["resistor", L.resistor, "🔲"], ["motor", L.motor, "⚙️"]].map(([k, lbl, ic]) => (
                <button key={k}
                  className={`cp-comp ${inputs[k] ? "cp-comp--on" : ""}`}
                  onClick={() => toggle(k)}>
                  <span>{ic}</span>
                  <span>{lbl}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Formula */}
          <div className="cp-formula">
            <span>{L.formula}</span>
          </div>

          <button className="cp-reset" onClick={reset}>↺ {L.reset}</button>
        </aside>

        {/* ── CANVAS ── */}
        <div className="circuit-main">
          <div className="canvas-wrap">
            <canvas ref={canvasRef} className="circuit-canvas" />
          </div>

          {/* ── RESULTS ── */}
          <div className="circuit-results">
            <ResultCard label={L.current} value={I.toFixed(2)} unit={L.unitA}
              color={I > 2 ? "var(--c-error)" : "var(--c-ok)"} />
            <ResultCard label={L.brightness}
              value={`${Math.round(brightness * 100)}%`} unit=""
              color="var(--c-accent)" custom={
                <div className="brightness-bar">
                  <div className="brightness-fill"
                    style={{ width: `${brightness * 100}%`,
                             background: `hsl(${50 - brightness * 30}, 100%, ${50 + brightness * 20}%)` }} />
                </div>
              } />
            <ResultCard label={L.power} value={P.toFixed(2)} unit={L.unitW}
              color="var(--text-secondary)" />
            <ResultCard label={L.energy} value={(E).toFixed(0)} unit={L.unitJ}
              color="var(--text-secondary)" />
          </div>

          {/* ── DIAGNOSIS ── */}
          <div className={`circuit-diag circuit-diag--${diag.type}`}>
            <span className="diag-icon">
              {diag.type === "ok" ? "✓" : diag.type === "warn" ? "⚠" : "✕"}
            </span>
            <span className="diag-msg">{diag.msg}</span>
          </div>

          {/* ── HINT ── */}
          <div className="circuit-hint">
            <span className="hint-label">{L.hint}</span>
            <span className="hint-text">{L.hints[hintIdx]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, unit, color, custom }) {
  return (
    <div className="res-card">
      <span className="res-label">{label}</span>
      <span className="res-value" style={{ color }}>{value} <em>{unit}</em></span>
      {custom}
    </div>
  );
}