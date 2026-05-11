import { useState, useRef, useEffect, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import "./Phsimulation.css";

const LABELS = {
  fr: {
    title: "pH et Neutralisation Intelligente",
    subtitle: "Réactions acido-basiques — Acide-Base — 1ère Bac",
    solution: "Type de solution",
    acidStrong: "Acide fort (HCl)",
    acidWeak: "Acide faible (CH₃COOH)",
    base: "Base forte (NaOH)",
    buffer: "Tampon",
    water: "Eau pure",
    phInit: "pH initial",
    volume: "Volume (mL)",
    titrant: "Solution titrante",
    addTitrant: "Ajouter la solution",
    reset: "Réinitialiser",
    phFinal: "pH final",
    color: "Couleur indicateur",
    domain: "Domaine",
    acid: "Acide",
    neutral: "Neutre",
    basic: "Basique",
    pointEq: "Point d'équivalence",
    prediction: "Prédiction",
    comparison: "Comparaison",
    diagnosis: "Diagnostic",
    curve: "Courbe de titrage",
    indicator: "Indicateur coloré",
    indicators: {
      "Hélianthine": { range: [3.1, 4.4], acidColor: "#FF6B35", baseColor: "#FFEE58" },
      "Rouge de méthyle": { range: [4.4, 6.2], acidColor: "#EF5350", baseColor: "#FFEE58" },
      "Phénolphtaléine": { range: [8.2, 10.0], acidColor: "#FFFFFF", baseColor: "#F48FB1" },
      "Bleu de bromothymol": { range: [6.0, 7.6], acidColor: "#FFEE58", baseColor: "#42A5F5" },
    },
    messages: {
      acidZone: "Solution acide — pH < 7, excès d'ions H⁺",
      neutralZone: "Solution neutre — pH = 7, équilibre acido-basique",
      basicZone: "Solution basique — pH > 7, excès d'ions OH⁻",
      nearEq: "⚡ Proche du point d'équivalence !",
      atEq: "✓ Point d'équivalence atteint — pH = 7",
    },
    vol: "mL", added: "Ajouté",
  },
  ar: {
    title: "الـ pH والمعادلة الذكية",
    subtitle: "تفاعلات حمض-قاعدة — الأولى باكالوريا",
    solution: "نوع المحلول",
    acidStrong: "حمض قوي (HCl)",
    acidWeak: "حمض ضعيف (CH₃COOH)",
    base: "قاعدة قوية (NaOH)",
    buffer: "محلول منظم",
    water: "ماء نقي",
    phInit: "الـ pH الابتدائي",
    volume: "الحجم (mL)",
    titrant: "المحلول المعاير",
    addTitrant: "إضافة المحلول",
    reset: "إعادة تعيين",
    phFinal: "الـ pH النهائي",
    color: "لون الكاشف",
    domain: "المجال",
    acid: "حمضي",
    neutral: "محايد",
    basic: "قاعدي",
    pointEq: "نقطة التكافؤ",
    prediction: "التنبؤ",
    comparison: "المقارنة",
    diagnosis: "التشخيص",
    curve: "منحنى المعايرة",
    indicator: "الكاشف الملون",
    indicators: {
      "هيلانثين": { range: [3.1, 4.4], acidColor: "#FF6B35", baseColor: "#FFEE58" },
      "أحمر الميثيل": { range: [4.4, 6.2], acidColor: "#EF5350", baseColor: "#FFEE58" },
      "فينولفثالين": { range: [8.2, 10.0], acidColor: "#FFFFFF", baseColor: "#F48FB1" },
      "أزرق البروموتيمول": { range: [6.0, 7.6], acidColor: "#FFEE58", baseColor: "#42A5F5" },
    },
    messages: {
      acidZone: "محلول حمضي — pH < 7، فائض H⁺",
      neutralZone: "محلول محايد — pH = 7، توازن حمضي-قاعدي",
      basicZone: "محلول قاعدي — pH > 7، فائض OH⁻",
      nearEq: "⚡ قريب من نقطة التكافؤ!",
      atEq: "✓ تم الوصول لنقطة التكافؤ — pH = 7",
    },
    vol: "mL", added: "مضاف",
  },
};

const SOLUTIONS = ["acidStrong","acidWeak","base","buffer","water"];
const INITIAL_PH = { acidStrong:1, acidWeak:3.5, base:13, buffer:7, water:7 };
const TITRANT_TYPE = { acidStrong:"base", acidWeak:"base", base:"acidStrong", buffer:"base", water:"base" };

function computePH(solutionType, volAdded, volInit, phInit) {
  const total = volInit + volAdded;
  if (solutionType === "water") return 7;
  if (solutionType === "buffer") return phInit + 0.02 * volAdded;

  const concInit = Math.pow(10, solutionType.startsWith("acid") ? -(phInit) : -(14-phInit));
  const molesInit = concInit * volInit / 1000;
  const concTitrant = solutionType === "base" ? 0.1 : 0.1;
  const molesTitrant = concTitrant * volAdded / 1000;

  if (solutionType.startsWith("acid")) {
    const excess = molesInit - molesTitrant;
    if (excess > 1e-9) {
      const ph = -Math.log10(excess / (total / 1000));
      if (solutionType === "acidWeak") return Math.min(ph + 1.2, 13.5);
      return Math.min(ph, 13.5);
    } else if (Math.abs(excess) < 1e-9) {
      return 7;
    } else {
      const excessBase = -excess;
      return 14 + Math.log10(excessBase / (total / 1000));
    }
  } else {
    const excess = molesInit - molesTitrant;
    if (excess > 1e-9) {
      return 14 + Math.log10(excess / (total / 1000));
    } else if (Math.abs(excess) < 1e-9) {
      return 7;
    } else {
      const excessAcid = -excess;
      return -Math.log10(excessAcid / (total / 1000));
    }
  }
}

function phToColor(ph) {
  const stops = [
    [0,  "#8B0000"], [1,"#CC0000"], [2,"#FF2200"], [3,"#FF5500"],
    [4,  "#FF8800"], [5,"#FFCC00"], [6,"#AACC00"],
    [7,  "#00AA00"],
    [8,  "#00AACC"], [9,"#0088CC"], [10,"#0055CC"],
    [11, "#0033AA"], [12,"#220088"], [13,"#440066"], [14,"#220044"],
  ];
  const clamped = Math.max(0, Math.min(14, ph));
  const idx = Math.floor(clamped);
  const frac = clamped - idx;
  if (idx >= stops.length - 1) return stops[stops.length - 1][1];
  const c1 = hexToRgb(stops[idx][1]);
  const c2 = hexToRgb(stops[Math.min(idx + 1, stops.length - 1)][1]);
  const r = Math.round(c1.r + (c2.r - c1.r) * frac);
  const g = Math.round(c1.g + (c2.g - c1.g) * frac);
  const b = Math.round(c1.b + (c2.b - c1.b) * frac);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}

function getIndicatorColor(ph, indicator) {
  const { range, acidColor, baseColor } = indicator;
  if (ph < range[0]) return acidColor;
  if (ph > range[1]) return baseColor;
  const t = (ph - range[0]) / (range[1] - range[0]);
  const c1 = hexToRgb(acidColor.startsWith("#") ? acidColor : "#ffffff");
  const c2 = hexToRgb(baseColor.startsWith("#") ? baseColor : "#ffffff");
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

// ── CURVE CANVAS ──
function drawCurve(canvas, points, currentPH, isDark) {
  if (!canvas || points.length < 2) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const PAD = { top: 28, right: 22, bottom: 38, left: 42 };
  ctx.clearRect(0, 0, W, H);

  const bg = isDark ? "#0f1018" : "#fafaf8";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const maxVol = Math.max(...points.map(p => p.vol), 1);
  const toX = v => PAD.left + (v / maxVol) * (W - PAD.left - PAD.right);
  const toY = p => H - PAD.bottom - ((p / 14) * (H - PAD.top - PAD.bottom));

  // pH zones background
  const zones = [
    { yMin:0, yMax:7/14, color: isDark?"rgba(239,83,80,0.06)":"rgba(239,83,80,0.05)" },
    { yMin:6.8/14, yMax:7.2/14, color: isDark?"rgba(76,175,80,0.1)":"rgba(76,175,80,0.08)" },
    { yMin:7/14, yMax:1, color: isDark?"rgba(66,165,245,0.06)":"rgba(66,165,245,0.05)" },
  ];
  zones.forEach(z => {
    ctx.fillStyle = z.color;
    ctx.fillRect(PAD.left, H - PAD.bottom - z.yMax*(H-PAD.top-PAD.bottom),
      W - PAD.left - PAD.right, (z.yMax - z.yMin)*(H-PAD.top-PAD.bottom));
  });

  // Grid
  ctx.strokeStyle = isDark ? "#1c1e2e" : "#e8e8e0";
  ctx.lineWidth = 1;
  for (let ph = 0; ph <= 14; ph += 2) {
    const y = toY(ph);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W-PAD.right, y); ctx.stroke();
  }
  for (let v = 0; v <= maxVol; v += Math.round(maxVol/5)) {
    const x = toX(v);
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, H-PAD.bottom); ctx.stroke();
  }

  // pH=7 line
  ctx.strokeStyle = isDark ? "#2a5a2a" : "#81c784";
  ctx.lineWidth = 1;
  ctx.setLineDash([4,4]);
  const y7 = toY(7);
  ctx.beginPath(); ctx.moveTo(PAD.left, y7); ctx.lineTo(W-PAD.right, y7); ctx.stroke();
  ctx.setLineDash([]);

  // Axes
  ctx.strokeStyle = isDark ? "#3a3d55" : "#bbb";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, H-PAD.bottom);
  ctx.lineTo(W-PAD.right, H-PAD.bottom);
  ctx.stroke();

  // Labels
  ctx.fillStyle = isDark ? "#565870" : "#999";
  ctx.font = "10px Nunito, sans-serif";
  ctx.textAlign = "right";
  [0,2,4,6,7,8,10,12,14].forEach(ph => {
    ctx.fillText(ph, PAD.left - 5, toY(ph) + 4);
  });
  ctx.textAlign = "center";
  for (let v = 0; v <= maxVol; v += Math.round(maxVol/5)) {
    ctx.fillText(v, toX(v), H - PAD.bottom + 16);
  }

  // Axis labels
  ctx.fillStyle = isDark ? "#a0a3bb" : "#555";
  ctx.font = "bold 10px Nunito";
  ctx.textAlign = "center";
  ctx.fillText("V (mL)", W/2, H - 4);
  ctx.save();
  ctx.translate(12, H/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText("pH", 0, 0);
  ctx.restore();

  // Curve gradient
  if (points.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(toX(points[0].vol), toY(points[0].ph));
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i-1], p1 = points[i];
      const mx = (toX(p0.vol) + toX(p1.vol)) / 2;
      ctx.bezierCurveTo(mx, toY(p0.ph), mx, toY(p1.ph), toX(p1.vol), toY(p1.ph));
    }
    ctx.strokeStyle = isDark ? "#5ac8fa" : "#0071e3";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = isDark ? "rgba(90,200,250,0.5)" : "rgba(0,113,227,0.3)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Current point dot
  if (points.length > 0) {
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(toX(last.vol), toY(last.ph), 6, 0, Math.PI*2);
    ctx.fillStyle = phToColor(last.ph);
    ctx.shadowColor = phToColor(last.ph);
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    // pH label near dot
    ctx.fillStyle = isDark ? "#eeeef5" : "#1d1d1f";
    ctx.font = "bold 11px Nunito";
    ctx.textAlign = "left";
    ctx.fillText(`pH=${last.ph.toFixed(1)}`, toX(last.vol)+8, toY(last.ph)-4);
  }
}

// ── BEAKER CANVAS ──
function drawBeaker(canvas, ph, volAdded, volInit, isDark) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const bg = isDark ? "#0f1018" : "#fafaf8";
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

  const bx = W/2 - 38, by = H * 0.12, bw = 76, bh = H * 0.62;
  const liquidH = bh * Math.min((volInit + volAdded) / (volInit * 2.5), 0.92);
  const color = phToColor(ph);

  // Beaker glass
  ctx.strokeStyle = isDark ? "#4a4d62" : "#b0b8d0";
  ctx.lineWidth = 2;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(180,200,230,0.08)";
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx, by + bh);
  ctx.lineTo(bx + bw, by + bh);
  ctx.lineTo(bx + bw, by);
  ctx.fill(); ctx.stroke();

  // Liquid
  const liquidY = by + bh - liquidH;
  ctx.fillStyle = color + "99";
  ctx.fillRect(bx + 2, liquidY, bw - 4, liquidH);

  // Liquid surface shimmer
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(bx + 2, liquidY, bw - 4, 3);

  // Bubbles (when acid/base reaction)
  if (volAdded > 0 && ph !== 7) {
    for (let i = 0; i < 5; i++) {
      const bxb = bx + 10 + (i * 13) % 56;
      const byb = liquidY + 10 + (i * 17) % (liquidH - 20);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(bxb, byb, 3, 0, Math.PI*2); ctx.stroke();
    }
  }

  // Graduation marks
  ctx.strokeStyle = isDark ? "#3a3d55" : "#c0c8d8";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const gy = by + bh - (bh/4)*i;
    ctx.beginPath();
    ctx.moveTo(bx + bw - 14, gy);
    ctx.lineTo(bx + bw - 2, gy);
    ctx.stroke();
    ctx.fillStyle = isDark ? "#565870" : "#999";
    ctx.font = "9px Nunito";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(volInit * i / 4)}`, bx - 4, gy + 4);
  }

  // pH label on beaker
  ctx.fillStyle = isDark ? "#eeeef5" : "#1d1d1f";
  ctx.font = "bold 14px Nunito";
  ctx.textAlign = "center";
  ctx.fillText(`pH = ${ph.toFixed(2)}`, W/2, by + bh + 26);

  // Color circle indicator
  ctx.beginPath();
  ctx.arc(W/2, by + bh + 52, 12, 0, Math.PI*2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ── MAIN COMPONENT ──
export default function PHSimulation() {
  const { lang } = useLang();
  const L = LABELS[lang];
  const curveRef = useRef(null);
  const beakerRef = useRef(null);

  const indicatorKeys = Object.keys(L.indicators);
  const [solutionType, setSolutionType] = useState("acidStrong");
  const [phInit, setPhInit] = useState(1);
  const [volume, setVolume] = useState(20);
  const [volAdded, setVolAdded] = useState(0);
  const [selectedIndicator, setSelectedIndicator] = useState(indicatorKeys[0]);
  const [curvePoints, setCurvePoints] = useState([{ vol: 0, ph: 1 }]);

  const ph = computePH(solutionType, volAdded, volume, phInit);
  const color = phToColor(ph);
  const isDark = document.documentElement.dataset.theme !== "light";

  const getDomain = () => {
    if (ph < 6.8) return L.acid;
    if (ph > 7.2) return L.basic;
    return L.neutral;
  };

  const getMessage = () => {
    if (Math.abs(ph - 7) < 0.1) return { msg: L.messages.atEq, type: "ok" };
    if (Math.abs(ph - 7) < 0.5) return { msg: L.messages.nearEq, type: "warn" };
    if (ph < 7) return { msg: L.messages.acidZone, type: "acid" };
    return { msg: L.messages.basicZone, type: "base" };
  };

  const addTitrant = () => {
    const step = 2;
    const newVol = volAdded + step;
    setVolAdded(newVol);
    const newPH = computePH(solutionType, newVol, volume, phInit);
    setCurvePoints(prev => [...prev, { vol: newVol, ph: newPH }]);
  };

  const reset = () => {
    setVolAdded(0);
    const initPH = INITIAL_PH[solutionType];
    setPhInit(initPH);
    setCurvePoints([{ vol: 0, ph: initPH }]);
  };

  const changeSolution = (type) => {
    setSolutionType(type);
    const initPH = INITIAL_PH[type];
    setPhInit(initPH);
    setVolAdded(0);
    setCurvePoints([{ vol: 0, ph: initPH }]);
  };

  // Curve canvas
  useEffect(() => {
    const canvas = curveRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawCurve(canvas, curvePoints, ph, isDark);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const c = curveRef.current;
    if (c) { c.width = c.offsetWidth; c.height = c.offsetHeight; }
    drawCurve(curveRef.current, curvePoints, ph, isDark);
  }, [curvePoints, ph, isDark]);

  // Beaker canvas
  useEffect(() => {
    const canvas = beakerRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawBeaker(canvas, ph, volAdded, volume, isDark);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const c = beakerRef.current;
    if (c) { c.width = c.offsetWidth; c.height = c.offsetHeight; }
    drawBeaker(beakerRef.current, ph, volAdded, volume, isDark);
  }, [ph, volAdded, volume, isDark]);

  const msg = getMessage();
  const indicatorColor = getIndicatorColor(ph, L.indicators[selectedIndicator]);
  const eqVol = volume; // simplified: eq when equal moles

  return (
    <div className="ph-sim">
      <div className="ph-header">
        <div>
          <h2 className="ph-title">{L.title}</h2>
          <p className="ph-subtitle">{L.subtitle}</p>
        </div>
        <span className="ph-badge">1ère Bac — Chimie</span>
      </div>

      <div className="ph-layout">

        {/* ── LEFT PANEL ── */}
        <aside className="ph-panel">

          {/* Solution type */}
          <div className="pp-group">
            <label className="pp-label">{L.solution}</label>
            <div className="pp-solutions">
              {SOLUTIONS.map(s => (
                <button key={s}
                  className={`pp-sol ${solutionType === s ? "pp-sol--on" : ""}`}
                  onClick={() => changeSolution(s)}>
                  {L[s]}
                </button>
              ))}
            </div>
          </div>

          {/* pH init */}
          <div className="pp-group">
            <div className="pp-row-top">
              <label className="pp-label">{L.phInit}</label>
              <span className="pp-val">{phInit.toFixed(1)}</span>
            </div>
            <input type="range" min={0} max={14} step={0.1}
              value={phInit}
              onChange={e => { setPhInit(+e.target.value); setCurvePoints([{vol:0,ph:+e.target.value}]); setVolAdded(0); }} />
            {/* pH strip */}
            <div className="ph-strip">
              <div className="ph-strip-pointer" style={{ left: `${(phInit/14)*100}%` }} />
            </div>
          </div>

          {/* Volume */}
          <div className="pp-group">
            <div className="pp-row-top">
              <label className="pp-label">{L.volume}</label>
              <span className="pp-val">{volume} {L.vol}</span>
            </div>
            <input type="range" min={5} max={100} step={5}
              value={volume}
              onChange={e => { setVolume(+e.target.value); reset(); }} />
          </div>

          {/* Indicator */}
          <div className="pp-group">
            <label className="pp-label">{L.indicator}</label>
            <div className="pp-indicators">
              {indicatorKeys.map(ind => (
                <button key={ind}
                  className={`pp-ind ${selectedIndicator === ind ? "pp-ind--on" : ""}`}
                  onClick={() => setSelectedIndicator(ind)}>
                  <span className="pp-ind-dot"
                    style={{ background: getIndicatorColor(ph, L.indicators[ind]) }} />
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <button className="pp-add" onClick={addTitrant}>
            + {L.addTitrant} (+2 mL)
          </button>
          <button className="pp-reset" onClick={reset}>↺ {L.reset}</button>

          {/* Equiv point */}
          <div className="pp-eq">
            <span>{L.pointEq}</span>
            <span>≈ {eqVol} mL</span>
          </div>
        </aside>

        {/* ── CENTER — Beaker + results ── */}
        <div className="ph-center">
          <div className="beaker-wrap">
            <canvas ref={beakerRef} className="ph-canvas" />
          </div>

          {/* Result cards */}
          <div className="ph-results">
            <div className="ph-res-card ph-res-main"
              style={{ borderColor: color, boxShadow: `0 0 18px ${color}33` }}>
              <span className="phrc-label">{L.phFinal}</span>
              <span className="phrc-value" style={{ color }}>{ph.toFixed(2)}</span>
              <span className="phrc-domain" style={{
                background: ph < 7 ? "rgba(239,83,80,0.1)" : ph > 7 ? "rgba(66,165,245,0.1)" : "rgba(76,175,80,0.1)",
                color: ph < 7 ? "#ef5350" : ph > 7 ? "#42a5f5" : "#4caf50"
              }}>{getDomain()}</span>
            </div>

            <div className="ph-res-card">
              <span className="phrc-label">{L.color}</span>
              <div className="phrc-color-row">
                <div className="phrc-color-ball"
                  style={{ background: indicatorColor, boxShadow: `0 0 12px ${indicatorColor}88` }} />
                <span className="phrc-color-name">{selectedIndicator}</span>
              </div>
            </div>

            <div className="ph-res-card">
              <span className="phrc-label">{L.added}</span>
              <span className="phrc-value" style={{ fontSize:"1.2rem" }}>
                {volAdded} <em style={{fontSize:"0.7rem",fontWeight:400,color:"var(--text-muted)"}}>mL</em>
              </span>
            </div>
          </div>

          {/* Diagnosis */}
          <div className={`ph-diag ph-diag--${msg.type}`}>
            {msg.msg}
          </div>

          {/* pH scale bar */}
          <div className="ph-scale-wrap">
            <div className="ph-scale" />
            <div className="ph-scale-cursor" style={{ left: `${(ph/14)*100}%`, background: color }}>
              <span>{ph.toFixed(1)}</span>
            </div>
            <div className="ph-scale-labels">
              {[0,2,4,6,7,8,10,12,14].map(n => (
                <span key={n} style={{ left: `${(n/14)*100}%` }}>{n}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT — Curve ── */}
        <div className="ph-curve-col">
          <p className="ph-curve-title">{L.curve}</p>
          <div className="curve-wrap">
            <canvas ref={curveRef} className="ph-canvas" />
          </div>

          {/* Prediction vs comparison */}
          <div className="ph-pred-cards">
            <div className="ph-pred-card">
              <span className="pred-label">🔮 {L.prediction}</span>
              <span className="pred-val">
                pH final prévu ≈ {computePH(solutionType, eqVol, volume, phInit).toFixed(1)}
              </span>
            </div>
            <div className="ph-pred-card">
              <span className="pred-label">📊 {L.comparison}</span>
              <span className="pred-val">
                ΔpH = {Math.abs(ph - phInit).toFixed(2)} depuis pH₀={phInit.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}