import { useState, useRef, useEffect } from "react";
import "./SmartInterference.css";

// ─── Physics ──────────────────────────────────────────────────────────────────
function interfrange(lambda_nm, D_m, a_mm) {
  return (lambda_nm * 1e-9 * D_m) / (a_mm * 1e-3) * 1000; // → mm
}

// nm → [r,g,b]
function nmToRGB(lam) {
  let r = 0, g = 0, b = 0;
  if (lam >= 380 && lam < 440) { r = (440 - lam) / 60; b = 1; }
  else if (lam < 490) { g = (lam - 440) / 50; b = 1; }
  else if (lam < 510) { g = 1; b = (510 - lam) / 20; }
  else if (lam < 580) { r = (lam - 510) / 70; g = 1; }
  else if (lam < 645) { r = 1; g = (645 - lam) / 65; }
  else { r = 1; }
  const f = lam < 420 ? 0.3 + 0.7 * (lam - 380) / 40
    : lam > 680 ? 0.3 + 0.7 * (700 - lam) / 20 : 1;
  return [Math.round(255 * r * f), Math.round(255 * g * f), Math.round(255 * b * f)];
}

function rgbStr(lam) { const [r, g, b] = nmToRGB(lam); return `rgb(${r},${g},${b})`; }

const LAMBDA_NAMES = {
  380: "Violet extrême", 420: "Violet", 450: "Indigo", 480: "Bleu",
  510: "Cyan-vert", 530: "Vert", 560: "Vert-jaune", 580: "Jaune",
  600: "Orange clair", 620: "Orange", 650: "Rouge", 680: "Rouge foncé", 700: "Infrarouge limite",
};
function lambdaName(lam) {
  const keys = Object.keys(LAMBDA_NAMES).map(Number);
  return LAMBDA_NAMES[keys.reduce((p, c) => Math.abs(c - lam) < Math.abs(p - lam) ? c : p)];
}

// ─── Canvas painters ──────────────────────────────────────────────────────────
const FW = 740, FH = 88;
const RANGE_MM = 28;

function paintFringes(canvas, lambda, iMm, topLabel) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const [lr, lg, lb] = nmToRGB(lambda);
  const imgData = ctx.createImageData(W, H);
  const pixels = imgData.data; // ← renamed to avoid shadowing

  for (let x = 0; x < W; x++) {
    const xMm = (x / W - 0.5) * RANGE_MM;
    const phase = Math.PI * xMm / iMm;
    const I = Math.cos(phase) ** 2 * Math.exp(-((xMm / 11) * (xMm / 11)));
    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 4;
      pixels[idx]     = Math.round(lr * I);
      pixels[idx + 1] = Math.round(lg * I);
      pixels[idx + 2] = Math.round(lb * I);
      pixels[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Order markers
  for (let n = -5; n <= 5; n++) {
    const xPx = W / 2 + (n * iMm / RANGE_MM) * W;
    if (xPx < 4 || xPx > W - 4) continue;
    ctx.strokeStyle = n === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.28)";
    ctx.lineWidth = n === 0 ? 1.8 : 0.8;
    ctx.setLineDash(n === 0 ? [] : [2, 3]);
    ctx.beginPath(); ctx.moveTo(xPx, 0); ctx.lineTo(xPx, H); ctx.stroke();
    ctx.setLineDash([]);
    if (n !== 0 && Math.abs(n) <= 3) {
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.font = "8px 'Courier New'"; ctx.textAlign = "center";
      ctx.fillText(n > 0 ? `+${n}` : `${n}`, xPx, H - 3);
    }
  }

  // Interfrange arrow 0 → +1
  const x0 = W / 2;
  const x1 = W / 2 + (iMm / RANGE_MM) * W;
  if (x1 < W - 8) {
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, 10); ctx.lineTo(x1, 10); ctx.stroke();

    // Left arrowhead at x0
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.moveTo(x0, 10); ctx.lineTo(x0 + 4, 6); ctx.lineTo(x0 + 4, 14); ctx.closePath(); ctx.fill();
    // Right arrowhead at x1
    ctx.beginPath(); ctx.moveTo(x1, 10); ctx.lineTo(x1 - 4, 6); ctx.lineTo(x1 - 4, 14); ctx.closePath(); ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "bold 9px 'Courier New'"; ctx.textAlign = "center";
    ctx.fillText(`i=${iMm.toFixed(3)}mm`, (x0 + x1) / 2, 8);
  }

  // Bottom label
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "bold 10px 'Courier New'"; ctx.textAlign = "left";
  ctx.fillText(topLabel, 6, H - 5);
}

const GW = 740, GH = 170;

function paintGraph(canvas, beams) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#03060d"); bg.addColorStop(1, "#060b16");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Grid
  for (let j = 0; j <= 5; j++) {
    const y = 4 + (H - 8) * j / 5;
    ctx.strokeStyle = "rgba(60,100,200,0.1)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let mm = -12; mm <= 12; mm += 4) {
    const x = W / 2 + (mm / RANGE_MM) * W;
    ctx.strokeStyle = "rgba(60,100,200,0.1)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = "rgba(120,160,255,0.3)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, H - 20); ctx.lineTo(W, H - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H - 20); ctx.stroke();

  beams.forEach((beam, bi) => {
    const [lr, lg, lb] = nmToRGB(beam.lambda);
    ctx.save();
    ctx.shadowBlur = 12; ctx.shadowColor = `rgb(${lr},${lg},${lb})`;
    ctx.strokeStyle = `rgba(${lr},${lg},${lb},0.9)`;
    ctx.lineWidth = bi === 0 ? 2.5 : 1.8;
    ctx.setLineDash(bi === 0 ? [] : [7, 5]);
    ctx.beginPath();
    for (let px = 0; px < W; px++) {
      const xMm = (px / W - 0.5) * RANGE_MM;
      const I = Math.cos(Math.PI * xMm / beam.iMm) ** 2 * Math.exp(-((xMm / 13) * (xMm / 13)));
      const y = H - 21 - I * (H - 30);
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
  });

  // x-axis labels
  ctx.fillStyle = "rgba(120,160,255,0.45)";
  ctx.font = "9px 'Courier New'"; ctx.textAlign = "center";
  for (let mm = -12; mm <= 12; mm += 4) {
    const x = W / 2 + (mm / RANGE_MM) * W;
    ctx.fillText(mm === 0 ? "0" : mm, x, H - 7);
  }
  ctx.fillText("x (mm)", W - 28, H - 7);
  ctx.textAlign = "left"; ctx.fillText("I(x)", 4, 12);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "9px 'Courier New'"; ctx.textAlign = "center";
  ctx.fillText("I₀", 26, H - 22 - (H - 30));
  ctx.fillText("0", 26, H - 21);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function BeamPanel({ beam, onChange, colorStr, letter }) {
  return (
    <div className="si-beam" style={{ "--bc": colorStr }}>
      <div className="si-beam__header">
        <span className="si-beam__dot" style={{ background: colorStr }} />
        <span className="si-beam__label">Faisceau {letter}</span>
        <span className="si-beam__i">
          i = <strong>{interfrange(beam.lambda, beam.D, beam.a).toFixed(4)} mm</strong>
        </span>
      </div>

      <div className="si-ctrl">
        <div className="si-ctrl__row">
          <span>λ</span>
          <span style={{ color: colorStr }}>
            {beam.lambda} nm <em>· {lambdaName(beam.lambda)}</em>
          </span>
        </div>
        <input type="range" min={380} max={700} step={5} value={beam.lambda}
          onChange={e => onChange({ ...beam, lambda: +e.target.value })}
          className="si-range" style={{ "--tc": colorStr }} />
      </div>

      <div className="si-ctrl">
        <div className="si-ctrl__row">
          <span>D (distance)</span><span>{beam.D} m</span>
        </div>
        <input type="range" min={0.2} max={3.0} step={0.05} value={beam.D}
          onChange={e => onChange({ ...beam, D: +e.target.value })}
          className="si-range si-range--teal" />
      </div>

      <div className="si-ctrl">
        <div className="si-ctrl__row">
          <span>a (écart fentes)</span><span>{beam.a} mm</span>
        </div>
        <input type="range" min={0.1} max={3.0} step={0.05} value={beam.a}
          onChange={e => onChange({ ...beam, a: +e.target.value })}
          className="si-range si-range--rose" />
      </div>
    </div>
  );
}

function CompareTable({ beamA, beamB }) {
  const iA = interfrange(beamA.lambda, beamA.D, beamA.a);
  const iB = interfrange(beamB.lambda, beamB.D, beamB.a);
  const cmp = (a, b) => a === b ? "=" : a > b ? ">" : "<";
  const rows = [
    ["λ (nm)", beamA.lambda,      beamB.lambda,      cmp(beamA.lambda, beamB.lambda), false],
    ["D (m)",  beamA.D,           beamB.D,           cmp(beamA.D,      beamB.D),      false],
    ["a (mm)", beamA.a,           beamB.a,           cmp(beamA.a,      beamB.a),      false],
    ["i (mm)", iA.toFixed(4),     iB.toFixed(4),     cmp(iA,           iB),           true ],
  ];

  const insight = (() => {
    if (beamA.a === beamB.a && beamA.D === beamB.D)
      return `λ seul varie : i ∝ λ → i_A/i_B = ${(iA / iB).toFixed(3)}`;
    if (beamA.lambda === beamB.lambda && beamA.a === beamB.a)
      return `D seul varie : i ∝ D → i_A/i_B = ${(iA / iB).toFixed(3)}`;
    if (beamA.lambda === beamB.lambda && beamA.D === beamB.D)
      return `a seul varie : i ∝ 1/a → i_A/i_B = ${(iA / iB).toFixed(3)}`;
    return `i_A / i_B = ${(iA / iB).toFixed(3)} — faisceau ${iA > iB ? "A" : "B"} a les franges les plus larges`;
  })();

  return (
    <div className="si-cmp">
      <table className="si-cmp__table">
        <thead>
          <tr>
            <th>Paramètre</th>
            <th className="a-col">A</th>
            <th></th>
            <th className="b-col">B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([param, va, vb, c, isResult]) => (
            <tr key={param} className={isResult ? "result-row" : ""}>
              <td><code>{param}</code></td>
              <td className="a-col">{va}</td>
              <td>
                <span className={`cmp-badge cmp-${c === "=" ? "eq" : c === ">" ? "gt" : "lt"}`}>
                  {c}
                </span>
              </td>
              <td className="b-col">{vb}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="si-cmp__insight">💡 {insight}</div>
    </div>
  );
}

function PredictPanel({ beamA }) {
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState(null);
  const correct = interfrange(beamA.lambda, beamA.D, beamA.a);

  function check() {
    const v = parseFloat(guess);
    if (isNaN(v)) return;
    setStatus(Math.abs(v - correct) / correct < 0.05 ? "ok" : "bad");
  }

  return (
    <div className={`si-predict si-predict--${status || "idle"}`}>
      <div className="si-predict__icon">
        {status === "ok" ? "🎯" : status === "bad" ? "✗" : "🔮"}
      </div>
      <div className="si-predict__body">
        <div className="si-predict__title">
          {status === "ok" ? "Bravo ! Calcul correct !" : "Calcule l'interfrange du Faisceau A"}
        </div>
        <div className="si-predict__params">
          λ = <strong>{beamA.lambda} nm</strong>
          {" · "}D = <strong>{beamA.D} m</strong>
          {" · "}a = <strong>{beamA.a} mm</strong>
        </div>
        {status === "ok" ? (
          <div className="si-predict__answer">
            i = λD/a = {beamA.lambda}nm × {beamA.D}m / {beamA.a}mm
            {" = "}<strong>{correct.toFixed(4)} mm</strong>
          </div>
        ) : (
          <div className="si-predict__input-row">
            <input
              type="number" step="0.0001" placeholder="i en mm"
              value={guess}
              onChange={e => { setGuess(e.target.value); setStatus(null); }}
              onKeyDown={e => e.key === "Enter" && check()}
              className="si-predict__input"
            />
            <span>mm</span>
            <button onClick={check} className="si-predict__btn">Vérifier</button>
          </div>
        )}
        {status === "bad" && (
          <div className="si-predict__hint">
            Rappel : i = λD/a = {(beamA.lambda * 1e-9).toExponential(2)}
            {" × "}{beamA.D} / {(beamA.a * 1e-3).toExponential(2)}
            {" = "}<strong>{correct.toFixed(4)} mm</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SmartInterference() {
  const fARef = useRef(null);
  const fBRef = useRef(null);
  const gRef  = useRef(null);

  const [beamA, setBeamA] = useState({ lambda: 530, D: 1.0, a: 0.5 });
  const [beamB, setBeamB] = useState({ lambda: 650, D: 1.5, a: 0.5 });
  const [tab, setTab]     = useState("compare");
  const [overlay, setOverlay] = useState(true);

  const iA = interfrange(beamA.lambda, beamA.D, beamA.a);
  const iB = interfrange(beamB.lambda, beamB.D, beamB.a);
  const colorA = rgbStr(beamA.lambda);
  const colorB = rgbStr(beamB.lambda);

  useEffect(() => {
    paintFringes(fARef.current, beamA.lambda, iA, `A · λ=${beamA.lambda}nm`);
    paintFringes(fBRef.current, beamB.lambda, iB, `B · λ=${beamB.lambda}nm`);
    const beams = overlay
      ? [{ lambda: beamA.lambda, iMm: iA }, { lambda: beamB.lambda, iMm: iB }]
      : [{ lambda: beamA.lambda, iMm: iA }];
    paintGraph(gRef.current, beams);
  }, [beamA, beamB, iA, iB, overlay]);

  const TABS = [
    { id: "compare", icon: "⇄",  label: "Comparaison" },
    { id: "predict", icon: "🔮", label: "Prédiction"  },
    { id: "formula", icon: "📐", label: "Formules"    },
  ];

  return (
    <div className="si-sim">

      {/* Header */}
      <div className="si-header">
        <div className="si-header__badges">
          <span className="si-bdg si-bdg--level">2ème Bac</span>
          <span className="si-bdg si-bdg--topic">Ondes lumineuses · Interférences Intelligentes</span>
        </div>
        <h2 className="si-header__title">
          <span style={{ color: colorA }}>≋</span>
          {" "}Interférences Lumineuses Intelligentes{" "}
          <span style={{ color: colorB }}>≋</span>
        </h2>
        <p className="si-header__sub">
          Comparaison · Courbe I(x) · Prédiction — deux faisceaux en temps réel
        </p>
      </div>

      {/* Fringe pair */}
      <div className="si-fringes">
        <div className="si-fringe-block">
          <div className="si-fringe-lbl" style={{ color: colorA }}>
            Faisceau A — {beamA.lambda} nm
          </div>
          <canvas ref={fARef} width={FW} height={FH} className="si-fringe-cv" />
        </div>
        <div className="si-fringes__sep">
          <span>VS</span>
          <div className="si-fringes__ratio">
            i_A/i_B = <strong>{(iA / iB).toFixed(3)}</strong>
          </div>
        </div>
        <div className="si-fringe-block">
          <div className="si-fringe-lbl" style={{ color: colorB }}>
            Faisceau B — {beamB.lambda} nm
          </div>
          <canvas ref={fBRef} width={FW} height={FH} className="si-fringe-cv" />
        </div>
      </div>

      {/* Intensity graph */}
      <div className="si-graph-wrap">
        <div className="si-graph-toolbar">
          <span className="si-graph-title">Courbes d'intensité I(x)</span>
          <label className="si-toggle-label">
            <input
              type="checkbox"
              checked={overlay}
              onChange={e => setOverlay(e.target.checked)}
            />
            <span className="si-toggle-track"><span className="si-toggle-thumb" /></span>
            <span>Superposer A+B</span>
          </label>
        </div>
        <canvas ref={gRef} width={GW} height={GH} className="si-graph-cv" />
        <div className="si-graph-legend">
          <span className="si-legend-item">
            <span className="si-legend-line si-legend-line--solid" style={{ background: colorA }} />
            A — {beamA.lambda} nm &nbsp;|&nbsp; i={iA.toFixed(4)} mm
          </span>
          {overlay && (
            <span className="si-legend-item">
              <span className="si-legend-line si-legend-line--dashed" style={{ borderColor: colorB }} />
              B — {beamB.lambda} nm &nbsp;|&nbsp; i={iB.toFixed(4)} mm
            </span>
          )}
        </div>
      </div>

      {/* Beam controls */}
      <div className="si-beams">
        <BeamPanel beam={beamA} onChange={setBeamA} colorStr={colorA} letter="A" />
        <BeamPanel beam={beamB} onChange={setBeamB} colorStr={colorB} letter="B" />
      </div>

      {/* Tabs */}
      <div className="si-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`si-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="si-tab-body">
        {tab === "compare" && <CompareTable beamA={beamA} beamB={beamB} />}
        {tab === "predict" && <PredictPanel beamA={beamA} />}
        {tab === "formula" && (
          <div className="si-formulas">
            {[
              ["i = λD / a",           "Interfrange (adapter les unités : λ en m, D en m, a en m)"],
              ["xₙ = n · i",           "Frange brillante d'ordre n"],
              ["xₙ = (n + ½) · i",    "Frange sombre d'ordre n"],
              ["δ = a · x / D",        "Différence de marche au point x"],
              ["I(x) = I₀ cos²(πx/i)","Distribution d'intensité"],
              ["δ = nλ → constructive","Condition d'interférence constructive"],
            ].map(([f, desc]) => (
              <div key={f} className="si-formula-row">
                <code>{f}</code><span>{desc}</span>
              </div>
            ))}
            <div className="si-formula-live">
              <div className="si-formula-live__title" style={{ color: colorA }}>▶ Faisceau A</div>
              <code>
                i = {beamA.lambda}×10⁻⁹ × {beamA.D} / ({beamA.a}×10⁻³)
                {" = "}<strong>{iA.toFixed(4)} mm</strong>
              </code>
            </div>
            <div className="si-formula-live">
              <div className="si-formula-live__title" style={{ color: colorB }}>▶ Faisceau B</div>
              <code>
                i = {beamB.lambda}×10⁻⁹ × {beamB.D} / ({beamB.a}×10⁻³)
                {" = "}<strong>{iB.toFixed(4)} mm</strong>
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}