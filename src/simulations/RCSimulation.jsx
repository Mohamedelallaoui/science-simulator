import { useState, useRef, useEffect, useCallback } from "react";
import "./RCSimulation.css";

// ─── Canvas dimensions ───────────────────────────────────────────────────────
const W = 820;
const H = 380;
const PAD = { top: 28, right: 28, bottom: 52, left: 64 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

// ─── Physics helpers ─────────────────────────────────────────────────────────
function tau(R, C) { return R * C; }                          // τ = RC  (seconds)
function uc_charge(t, E, T)    { return E * (1 - Math.exp(-t / T)); }
function uc_discharge(t, U0, T){ return U0 * Math.exp(-t / T); }

// Build curve data: array of {t, uc} over 5τ
function buildCurve(mode, E, R, C, steps = 400) {
  const T = tau(R, C);
  const tMax = 5 * T;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * tMax;
    const uc = mode === "charge"
      ? uc_charge(t, E, T)
      : uc_discharge(t, E, T);   // U0 = E (fully charged initially)
    pts.push({ t, uc });
  }
  return pts;
}

// ─── Draw ────────────────────────────────────────────────────────────────────
function drawChart(canvas, pts, E, R, C, mode, animProgress, tauMarked) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const T = tau(R, C);
  const tMax = 5 * T;
  const yMax = E * 1.08;
  const toX = t  => PAD.left + (t / tMax) * PLOT_W;
  const toY = uc => PAD.top + PLOT_H - (uc / yMax) * PLOT_H;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#080b14");
  bg.addColorStop(1, "#0b1020");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid
  const gridCols = 10, gridRows = 8;
  ctx.strokeStyle = "rgba(255,200,80,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridCols; i++) {
    const x = PAD.left + (i / gridCols) * PLOT_W;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + PLOT_H); ctx.stroke();
  }
  for (let j = 0; j <= gridRows; j++) {
    const y = PAD.top + (j / gridRows) * PLOT_H;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + PLOT_W, y); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = "rgba(255,200,80,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, PAD.top + PLOT_H);
  ctx.lineTo(PAD.left + PLOT_W, PAD.top + PLOT_H);
  ctx.stroke();

  // Y ticks & labels
  ctx.fillStyle = "rgba(255,200,80,0.6)";
  ctx.font = "11px 'Courier New'";
  ctx.textAlign = "right";
  const yTicks = [0, 0.25, 0.5, 0.63, 0.75, 1.0];
  yTicks.forEach(frac => {
    const v = frac * E;
    const y = toY(v);
    ctx.strokeStyle = frac === 0.63 ? "rgba(255,200,80,0.25)" : "rgba(255,200,80,0.1)";
    ctx.lineWidth = frac === 0.63 ? 1.5 : 1;
    ctx.setLineDash(frac === 0.63 ? [4, 4] : []);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + PLOT_W, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = frac === 0.63 ? "#fcd34d" : "rgba(255,200,80,0.5)";
    ctx.fillText(v.toFixed(1) + "V", PAD.left - 6, y + 4);
  });

  // X ticks (τ multiples)
  ctx.textAlign = "center";
  for (let k = 0; k <= 5; k++) {
    const x = toX(k * T);
    ctx.strokeStyle = "rgba(255,200,80,0.12)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + PLOT_H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,200,80,0.55)";
    ctx.font = "11px 'Courier New'";
    ctx.fillText(k === 0 ? "0" : `${k}τ`, x, PAD.top + PLOT_H + 18);
  }

  // Axis labels
  ctx.fillStyle = "rgba(255,200,80,0.75)";
  ctx.font = "12px 'Courier New'";
  ctx.textAlign = "left";
  ctx.fillText("Uc (V)", PAD.left + 4, PAD.top - 8);
  ctx.textAlign = "center";
  ctx.fillText("t (s)", PAD.left + PLOT_W / 2, H - 6);

  // Asymptote line (E for charge, 0 for discharge)
  ctx.strokeStyle = "rgba(255,100,100,0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 5]);
  const asymY = mode === "charge" ? toY(E) : toY(0);
  ctx.beginPath();
  ctx.moveTo(PAD.left, asymY);
  ctx.lineTo(PAD.left + PLOT_W, asymY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Main curve — animated up to animProgress
  const visibleCount = Math.floor(pts.length * animProgress);
  if (visibleCount > 1) {
    // Glow pass
    ctx.save();
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 14;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(toX(pts[0].t), toY(pts[0].uc));
    for (let i = 1; i < visibleCount; i++) {
      ctx.lineTo(toX(pts[i].t), toY(pts[i].uc));
    }
    ctx.stroke();
    ctx.restore();

    // Crisp pass
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(pts[0].t), toY(pts[0].uc));
    for (let i = 1; i < visibleCount; i++) {
      ctx.lineTo(toX(pts[i].t), toY(pts[i].uc));
    }
    ctx.stroke();
  }

  // τ marker — highlighted vertical at t=τ
  const tauX = toX(T);
  const tauUc = mode === "charge" ? uc_charge(T, E, T) : uc_discharge(T, E, T);
  const tauY = toY(tauUc);

  if (animProgress > 0.2) {
    ctx.strokeStyle = tauMarked ? "#4ade80" : "rgba(250,204,21,0.6)";
    ctx.lineWidth = tauMarked ? 2 : 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(tauX, PAD.top); ctx.lineTo(tauX, PAD.top + PLOT_H); ctx.stroke();
    ctx.setLineDash([]);

    // τ dot
    ctx.beginPath();
    ctx.arc(tauX, tauY, 6, 0, Math.PI * 2);
    ctx.fillStyle = tauMarked ? "#4ade80" : "#facc15";
    ctx.fill();
    ctx.strokeStyle = "#080b14";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // τ label
    ctx.fillStyle = tauMarked ? "#4ade80" : "#facc15";
    ctx.font = "bold 12px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("τ", tauX, PAD.top - 10);
    ctx.font = "11px 'Courier New'";
    ctx.fillText(tauUc.toFixed(2) + "V", tauX, tauY - 12);
  }

  // 63% horizontal dashed guide
  const ref63Y = toY(mode === "charge" ? 0.632 * E : 0.368 * E);
  ctx.strokeStyle = "rgba(250,204,21,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(PAD.left, ref63Y);
  ctx.lineTo(tauX, ref63Y);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ─── Challenge component ──────────────────────────────────────────────────────
function TauChallenge({ T, onResult }) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState(null); // null | "correct" | "wrong"

  function check() {
    const val = parseFloat(answer);
    if (isNaN(val)) return;
    const pct = Math.abs(val - T) / T;
    if (pct < 0.05) {
      setStatus("correct");
      onResult(true);
    } else {
      setStatus("wrong");
      onResult(false);
    }
  }

  return (
    <div className={`rc-challenge ${status === "correct" ? "rc-challenge--ok" : status === "wrong" ? "rc-challenge--bad" : ""}`}>
      <div className="rc-challenge__icon">
        {status === "correct" ? "✅" : status === "wrong" ? "❌" : "🎯"}
      </div>
      <div className="rc-challenge__body">
        <p className="rc-challenge__prompt">
          {status === "correct"
            ? `Bravo ! τ = ${T.toFixed(3)} s — La tension vaut 63.2% de E à t = τ`
            : status === "wrong"
            ? `Incorrect. Rappel : τ = R × C. Réessaie !`
            : `Défi τ : Quelle est la valeur de la constante de temps τ pour ces paramètres ?`}
        </p>
        {status !== "correct" && (
          <div className="rc-challenge__input-row">
            <input
              type="number"
              step="0.001"
              placeholder="τ en secondes"
              value={answer}
              onChange={e => { setAnswer(e.target.value); setStatus(null); }}
              className="rc-challenge__input"
              onKeyDown={e => e.key === "Enter" && check()}
            />
            <button onClick={check} className="rc-challenge__btn">Vérifier</button>
          </div>
        )}
        {status === "wrong" && (
          <p className="rc-challenge__hint">Indice : τ = R × C = {(T).toFixed(1)} s</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RCSimulation() {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const [E, setE]   = useState(10);     // volts
  const [R, setR]   = useState(1000);   // ohms (1 kΩ)
  const [C, setC]   = useState(0.001);  // farads (1 mF)
  const [mode, setMode] = useState("charge");
  const [animProg, setAnimProg] = useState(1);
  const [tauMarked, setTauMarked] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);

  const T = tau(R, C);
  const pts = buildCurve(mode, E, R, C);

  // Animated redraw on param change
  const startAnim = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setTauMarked(false);
    let start = null;
    const duration = 1200;
    function step(ts) {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      setAnimProg(prog);
      if (prog < 1) animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => { startAnim(); }, [E, R, C, mode, startAnim]);

  useEffect(() => {
    if (canvasRef.current) {
      drawChart(canvasRef.current, pts, E, R, C, mode, animProg, tauMarked);
    }
  }, [pts, E, R, C, mode, animProg, tauMarked]);

  // Slider helpers
  const rSteps = [100, 200, 500, 1000, 2000, 5000, 10000];
  const cSteps = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01];
  const rIdx = rSteps.indexOf(R);
  const cIdx = cSteps.indexOf(C);

  function formatR(v) { return v >= 1000 ? `${v/1000} kΩ` : `${v} Ω`; }
  function formatC(v) {
    if (v < 0.001) return `${(v * 1e6).toFixed(0)} µF`;
    return `${(v * 1000).toFixed(1)} mF`;
  }

  const ucAtTau = mode === "charge"
    ? uc_charge(T, E, T).toFixed(3)
    : uc_discharge(T, E, T).toFixed(3);
  const pctAtTau = mode === "charge" ? "63.2" : "36.8";

  return (
    <div className="rc-sim">
      {/* Header */}
      <div className="rc-sim__header">
        <div className="rc-sim__badge-row">
          <span className="rc-sim__badge rc-sim__badge--level">2ème Bac</span>
          <span className="rc-sim__badge rc-sim__badge--topic">Dipôle RC · Charge / Décharge</span>
        </div>
        <h2 className="rc-sim__title">⚡ Circuit RC Intelligent</h2>
        <p className="rc-sim__subtitle">Visualise Uc(t) et comprends la constante de temps τ</p>
      </div>

      {/* Mode toggle */}
      <div className="rc-sim__mode-toggle">
        <button
          className={`rc-sim__mode-btn ${mode === "charge" ? "active" : ""}`}
          onClick={() => setMode("charge")}
        >▲ Charge</button>
        <button
          className={`rc-sim__mode-btn ${mode === "discharge" ? "active" : ""}`}
          onClick={() => setMode("discharge")}
        >▼ Décharge</button>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={W} height={H} className="rc-sim__canvas" />

      {/* Controls */}
      <div className="rc-sim__controls">
        {/* E */}
        <div className="rc-sim__ctrl-group">
          <div className="rc-sim__ctrl-label">
            <span>Tension <em>E</em></span>
            <span className="rc-sim__ctrl-val">{E} V</span>
          </div>
          <input type="range" min={1} max={20} step={1}
            value={E} onChange={e => setE(+e.target.value)}
            className="rc-sim__range rc-sim__range--amber"
          />
        </div>
        {/* R */}
        <div className="rc-sim__ctrl-group">
          <div className="rc-sim__ctrl-label">
            <span>Résistance <em>R</em></span>
            <span className="rc-sim__ctrl-val">{formatR(R)}</span>
          </div>
          <input type="range" min={0} max={rSteps.length - 1} step={1}
            value={rIdx >= 0 ? rIdx : 3}
            onChange={e => setR(rSteps[+e.target.value])}
            className="rc-sim__range rc-sim__range--red"
          />
        </div>
        {/* C */}
        <div className="rc-sim__ctrl-group">
          <div className="rc-sim__ctrl-label">
            <span>Capacité <em>C</em></span>
            <span className="rc-sim__ctrl-val">{formatC(C)}</span>
          </div>
          <input type="range" min={0} max={cSteps.length - 1} step={1}
            value={cIdx >= 0 ? cIdx : 3}
            onChange={e => setC(cSteps[+e.target.value])}
            className="rc-sim__range rc-sim__range--blue"
          />
        </div>
      </div>

      {/* Info cards */}
      <div className="rc-sim__info-row">
        <div className="rc-sim__info-card rc-sim__info-card--tau">
          <span className="rc-sim__info-label">τ = R × C</span>
          <span className="rc-sim__info-val">{T.toFixed(4)} s</span>
        </div>
        <div className="rc-sim__info-card">
          <span className="rc-sim__info-label">Uc à t = τ</span>
          <span className="rc-sim__info-val">{ucAtTau} V <span className="rc-sim__info-pct">({pctAtTau}% de E)</span></span>
        </div>
        <div className="rc-sim__info-card">
          <span className="rc-sim__info-label">Uc à t = 5τ</span>
          <span className="rc-sim__info-val">
            {mode === "charge" ? "≈ E = " + E + " V" : "≈ 0 V"}
            <span className="rc-sim__info-pct"> (99.3%)</span>
          </span>
        </div>
        <div className="rc-sim__info-card">
          <span className="rc-sim__info-label">Équation</span>
          <span className="rc-sim__info-val rc-sim__info-val--eq">
            {mode === "charge"
              ? `Uc = E(1 − e^(−t/τ))`
              : `Uc = E·e^(−t/τ)`}
          </span>
        </div>
      </div>

      {/* Challenge zone */}
      <div className="rc-sim__challenge-toggle">
        <button
          className="rc-sim__challenge-open-btn"
          onClick={() => setShowChallenge(v => !v)}
        >
          {showChallenge ? "▲ Masquer le défi" : "🎯 Défi 63% — Teste tes connaissances"}
        </button>
      </div>

      {showChallenge && (
        <TauChallenge
          T={T}
          onResult={ok => ok && setTauMarked(true)}
        />
      )}

      {/* Formula derivation */}
      <div className="rc-sim__formula-block">
        <div className="rc-sim__formula-title">📐 Rappel de cours</div>
        <div className="rc-sim__formula-grid">
          <div><code>τ = RC</code><span>Constante de temps</span></div>
          <div><code>t = τ → Uc ≈ 0.632·E</code><span>Charge (63.2%)</span></div>
          <div><code>t = τ → Uc ≈ 0.368·E</code><span>Décharge (36.8%)</span></div>
          <div><code>t ≥ 5τ</code><span>Régime permanent (99.3%)</span></div>
        </div>
      </div>
    </div>
  );
}