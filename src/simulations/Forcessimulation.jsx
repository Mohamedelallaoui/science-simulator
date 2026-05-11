import { useState, useRef, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import "./ForcesSimulation.css";

const LABELS = {
  fr: {
    title: "Forces et Mouvement Comparatif",
    subtitle: "Travail et énergie cinétique — 1ère Bac",
    addCase: "+ Ajouter un cas",
    removeCase: "Supprimer",
    force: "Force F",
    mass: "Masse m",
    friction: "Frottement f",
    duration: "Durée t",
    case: "Cas",
    accel: "Accélération",
    speed: "Vitesse finale",
    kinEnergy: "Énergie cinétique",
    work: "Travail net",
    distance: "Distance",
    newton: "N", kg: "kg", ms2: "m/s²",
    ms: "m/s", joule: "J", meter: "m", sec: "s",
    simulate: "Simuler",
    reset: "Réinitialiser",
    formula1: "F = m × a",
    formula2: "Ec = ½mv²",
    formula3: "W = F × d",
    comparison: "Comparaison des cas",
    noMotion: "Pas de mouvement — F ≤ f",
    motion: "Mouvement uniforme — F = f",
    accelMotion: "Accélération — F > f",
    winner: "🏆 Plus rapide",
    track: "Piste",
    object: "Objet",
  },
  ar: {
    title: "القوى والحركة المقارنة",
    subtitle: "الشغل والطاقة الحركية — الأولى باكالوريا",
    addCase: "+ إضافة حالة",
    removeCase: "حذف",
    force: "القوة F",
    mass: "الكتلة m",
    friction: "الاحتكاك f",
    duration: "المدة t",
    case: "الحالة",
    accel: "التسارع",
    speed: "السرعة النهائية",
    kinEnergy: "الطاقة الحركية",
    work: "الشغل الصافي",
    distance: "المسافة",
    newton: "N", kg: "kg", ms2: "م/ث²",
    ms: "م/ث", joule: "J", meter: "م", sec: "ث",
    simulate: "محاكاة",
    reset: "إعادة تعيين",
    formula1: "F = m × a",
    formula2: "Ec = ½mv²",
    formula3: "W = F × d",
    comparison: "مقارنة الحالات",
    noMotion: "لا حركة — F ≤ f",
    motion: "حركة منتظمة — F = f",
    accelMotion: "تسارع — F > f",
    winner: "🏆 الأسرع",
    track: "المسار",
    object: "الجسم",
  },
};

const COLORS = ["#0A84FF","#30D158","#FF9F0A","#BF5AF2","#FF453A","#5AC8FA"];

const DEFAULT_CASES = [
  { id:1, F:20, m:2, f:4, t:5, color:COLORS[0] },
  { id:2, F:30, m:3, f:2, t:5, color:COLORS[1] },
];

function physics(c) {
  const a = Math.max(0, (c.F - c.f) / c.m);
  const v = a * c.t;
  const d = 0.5 * a * c.t * c.t;
  const Ec = 0.5 * c.m * v * v;
  const W = (c.F - c.f) * d;
  const state = c.F <= c.f ? "none" : c.F === c.f ? "uniform" : "accel";
  return { a, v, d, Ec, W, state };
}

// ── TRACK CANVAS ──
function drawTracks(canvas, cases, progresses, isDark) {
  if (!canvas || cases.length === 0) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const bg = isDark ? "#0f1018" : "#f9f8f5";
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

  const trackH = Math.min(62, (H - 20) / cases.length);
  const trackPad = 14;
  const startX = 60;
  const endX = W - 20;
  const trackW = endX - startX;
  const objR = Math.min(trackH * 0.28, 14);

  // Finish line
  ctx.strokeStyle = isDark ? "#3a3d55" : "#c0c8d8";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(endX, 10); ctx.lineTo(endX, H-10); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = isDark ? "#565870" : "#888";
  ctx.font = "9px Nunito"; ctx.textAlign = "center";
  ctx.fillText("Fin", endX, 8);

  cases.forEach((c, i) => {
    const res = physics(c);
    const maxDist = Math.max(...cases.map(cc => physics(cc).d), 0.1);
    const prog = progresses[i] || 0;
    const cx = startX + (trackW - objR*2) * Math.min(prog,1);
    const cy = trackPad + i * trackH + trackH/2;

    // Track groove
    ctx.fillStyle = isDark ? "#191b28" : "#e8eaf0";
    ctx.beginPath();
    ctx.roundRect(startX - 4, cy - objR - 4, trackW + 4, (objR + 4)*2, 8);
    ctx.fill();

    // Track surface
    ctx.fillStyle = isDark ? "#1e2030" : "#f0f2f8";
    ctx.beginPath();
    ctx.roundRect(startX - 2, cy - objR - 2, trackW, (objR+2)*2, 6);
    ctx.fill();

    // Progress filled
    const filledW = Math.min(prog, 1) * (trackW - objR*2);
    if (filledW > 0) {
      ctx.fillStyle = c.color + "28";
      ctx.beginPath();
      ctx.roundRect(startX, cy - objR, filledW, objR*2, 4);
      ctx.fill();
    }

    // Object (circle with gradient)
    const grd = ctx.createRadialGradient(cx - objR*0.3, cy - objR*0.3, 1, cx, cy, objR);
    grd.addColorStop(0, lighten(c.color, 40));
    grd.addColorStop(1, c.color);
    ctx.fillStyle = grd;
    ctx.shadowColor = c.color;
    ctx.shadowBlur = prog > 0 ? 10 : 0;
    ctx.beginPath(); ctx.arc(cx, cy, objR, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Speed arrow
    if (res.a > 0 && prog > 0 && prog < 1) {
      const arrowLen = Math.min(res.v * 4, 28);
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + objR, cy);
      ctx.lineTo(cx + objR + arrowLen, cy);
      ctx.stroke();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.moveTo(cx + objR + arrowLen, cy);
      ctx.lineTo(cx + objR + arrowLen - 6, cy - 4);
      ctx.lineTo(cx + objR + arrowLen - 6, cy + 4);
      ctx.closePath(); ctx.fill();
    }

    // Case label left
    ctx.fillStyle = c.color;
    ctx.font = "bold 10px Nunito"; ctx.textAlign = "right";
    ctx.fillText(`C${i+1}`, startX - 8, cy + 4);

    // Finish flag if done
    if (prog >= 1) {
      ctx.font = "14px serif"; ctx.textAlign = "center";
      ctx.fillText("🏁", endX, cy + 5);
    }
  });
}

function lighten(hex, amt) {
  let r=parseInt(hex.slice(1,3),16)+amt;
  let g=parseInt(hex.slice(3,5),16)+amt;
  let b=parseInt(hex.slice(5,7),16)+amt;
  return `rgb(${Math.min(r,255)},${Math.min(g,255)},${Math.min(b,255)})`;
}

// ── BAR CHART ──
function drawBars(canvas, cases, metric, isDark) {
  if (!canvas || cases.length === 0) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = isDark ? "#0f1018" : "#f9f8f5";
  ctx.fillRect(0,0,W,H);

  const vals = cases.map(c => {
    const r = physics(c);
    if (metric==="a") return r.a;
    if (metric==="v") return r.v;
    if (metric==="Ec") return r.Ec;
    if (metric==="d") return r.d;
    return r.W;
  });

  const maxVal = Math.max(...vals, 0.1);
  const PAD = {top:22,right:12,bottom:28,left:10};
  const barW = (W-PAD.left-PAD.right) / cases.length - 10;
  const chartH = H - PAD.top - PAD.bottom;

  vals.forEach((v,i) => {
    const x = PAD.left + i*(barW+10) + 5;
    const bh = (v/maxVal)*chartH;
    const y = PAD.top + chartH - bh;
    const c = cases[i];

    // Bar
    const grd = ctx.createLinearGradient(0,y,0,y+bh);
    grd.addColorStop(0, c.color + "cc");
    grd.addColorStop(1, c.color + "44");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.roundRect(x,y,barW,bh,4); ctx.fill();

    // Value label
    ctx.fillStyle = isDark ? "#eeeef5" : "#1d1d1f";
    ctx.font = "bold 9px Nunito"; ctx.textAlign = "center";
    ctx.fillText(v.toFixed(1), x+barW/2, y-5);

    // Case label
    ctx.fillStyle = c.color;
    ctx.fillText(`C${i+1}`, x+barW/2, H-PAD.bottom+14);
  });

  // Y axis
  ctx.strokeStyle = isDark ? "#2a2d42" : "#ddd";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD.left,PAD.top); ctx.lineTo(PAD.left,H-PAD.bottom); ctx.stroke();
}

// ── MAIN COMPONENT ──
export default function ForcesSimulation() {
  const { lang } = useLang();
  const L = LABELS[lang];
  const trackRef = useRef(null);
  const barARef  = useRef(null);
  const barVRef  = useRef(null);
  const barERef  = useRef(null);
  const animRef  = useRef(null);

  const [cases, setCases]       = useState(DEFAULT_CASES);
  const [progresses, setProgs]  = useState([0,0]);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);
  const nextId = useRef(3);

  const isDark = () => document.documentElement.dataset.theme !== "light";

  const setCase = (id, key, val) => {
    setCases(prev => prev.map(c => c.id === id ? {...c,[key]:val} : c));
  };

  const addCase = () => {
    if (cases.length >= 6) return;
    const newCase = { id: nextId.current++, F:15, m:2, f:3, t:5, color: COLORS[cases.length] };
    setCases(prev => [...prev, newCase]);
    setProgs(prev => [...prev, 0]);
  };

  const removeCase = (id) => {
    if (cases.length <= 1) return;
    const idx = cases.findIndex(c => c.id === id);
    setCases(prev => prev.filter(c => c.id !== id));
    setProgs(prev => prev.filter((_,i) => i !== idx));
  };

  const resetSim = () => {
    cancelAnimationFrame(animRef.current);
    setProgs(cases.map(() => 0));
    setRunning(false);
    setDone(false);
  };

  const simulate = () => {
    resetSim();
    setRunning(true);
    const results = cases.map(physics);
    const maxDist = Math.max(...results.map(r => r.d), 0.1);
    const startTime = performance.now();
    const simDuration = 3000; // ms

    const animate = (now) => {
      const t = Math.min((now - startTime) / simDuration, 1);
      const eased = t < 1 ? t * (2 - t) : 1;
      setProgs(results.map(r => (r.d / maxDist) * eased));
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setRunning(false);
        setDone(true);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  // Draw track
  useEffect(() => {
    const canvas = trackRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawTracks(canvas, cases, progresses, isDark());
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const c = trackRef.current;
    if (!c) return;
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    drawTracks(c, cases, progresses, isDark());
  }, [cases, progresses]);

  // Draw bars
  const drawAllBars = () => {
    const d = isDark();
    [["a",barARef],["v",barVRef],["Ec",barERef]].forEach(([m,ref]) => {
      const c = ref.current;
      if (!c) return;
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      drawBars(c, cases, m, d);
    });
  };

  useEffect(() => { drawAllBars(); }, [cases, done]);

  // Winner
  const winner = done ? cases.reduce((best, c, i) => {
    const d = physics(c).d;
    return d > physics(cases[best]).d ? i : best;
  }, 0) : -1;

  return (
    <div className="forces-sim">
      <div className="forces-header">
        <div>
          <h2 className="forces-title">{L.title}</h2>
          <p className="forces-subtitle">{L.subtitle}</p>
        </div>
        <span className="forces-badge">1ère Bac — Physique</span>
      </div>

      <div className="forces-layout">

        {/* ── CASES PANEL ── */}
        <aside className="forces-cases">
          {cases.map((c, i) => {
            const res = physics(c);
            return (
              <div key={c.id} className="case-card"
                style={{ borderColor: c.color + "55" }}>
                <div className="case-card-header"
                  style={{ borderBottom: `2px solid ${c.color}` }}>
                  <div className="case-dot" style={{ background: c.color }} />
                  <span className="case-title"
                    style={{ color: c.color }}>{L.case} {i+1}</span>
                  {winner === i && done && (
                    <span className="case-winner">{L.winner}</span>
                  )}
                  {cases.length > 1 && (
                    <button className="case-remove"
                      onClick={() => removeCase(c.id)}>✕</button>
                  )}
                </div>

                <div className="case-inputs">
                  {[
                    { key:"F", label:L.force, unit:L.newton, min:0, max:100, step:1 },
                    { key:"m", label:L.mass,  unit:L.kg,     min:0.5, max:20, step:0.5 },
                    { key:"f", label:L.friction, unit:L.newton, min:0, max:50, step:0.5 },
                    { key:"t", label:L.duration, unit:L.sec,  min:1, max:20, step:1 },
                  ].map(({ key, label, unit, min, max, step }) => (
                    <div key={key} className="case-input-row">
                      <div className="ci-top">
                        <span className="ci-label">{label}</span>
                        <span className="ci-val">{c[key]} <em>{unit}</em></span>
                      </div>
                      <input type="range" min={min} max={max} step={step}
                        value={c[key]}
                        style={{ accentColor: c.color }}
                        onChange={e => setCase(c.id, key, +e.target.value)} />
                    </div>
                  ))}
                </div>

                <div className="case-results">
                  <div className="cr-item">
                    <span>{L.accel}</span>
                    <strong style={{ color: c.color }}>{res.a.toFixed(2)} {L.ms2}</strong>
                  </div>
                  <div className="cr-item">
                    <span>{L.speed}</span>
                    <strong style={{ color: c.color }}>{res.v.toFixed(2)} {L.ms}</strong>
                  </div>
                  <div className="cr-item">
                    <span>{L.distance}</span>
                    <strong style={{ color: c.color }}>{res.d.toFixed(2)} {L.meter}</strong>
                  </div>
                  <div className="cr-item">
                    <span>{L.kinEnergy}</span>
                    <strong style={{ color: c.color }}>{res.Ec.toFixed(1)} {L.joule}</strong>
                  </div>
                </div>

                <div className={`case-state case-state--${res.state}`}>
                  {res.state === "none" ? L.noMotion
                    : res.state === "uniform" ? L.motion
                    : L.accelMotion}
                </div>
              </div>
            );
          })}

          {cases.length < 6 && (
            <button className="btn-add-case" onClick={addCase}>
              {L.addCase}
            </button>
          )}
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="forces-main">

          {/* Track */}
          <div className="track-wrap">
            <canvas ref={trackRef} className="forces-canvas"
              style={{ height: `${Math.max(80, cases.length * 68)}px` }} />
          </div>

          {/* Actions */}
          <div className="forces-actions">
            <button className="btn-simulate" onClick={simulate} disabled={running}>
              {running ? "⏳" : "▶"} {L.simulate}
            </button>
            <button className="btn-reset-f" onClick={resetSim}>↺ {L.reset}</button>
            <div className="formulas">
              <span>{L.formula1}</span>
              <span>{L.formula2}</span>
              <span>{L.formula3}</span>
            </div>
          </div>

          {/* Bar charts */}
          <div className="bars-section">
            <p className="bars-title">{L.comparison}</p>
            <div className="bars-grid">
              {[
                { ref: barARef, label: `${L.accel} (${L.ms2})` },
                { ref: barVRef, label: `${L.speed} (${L.ms})` },
                { ref: barERef, label: `${L.kinEnergy} (${L.joule})` },
              ].map(({ ref, label }) => (
                <div key={label} className="bar-wrap">
                  <p className="bar-label">{label}</p>
                  <canvas ref={ref} className="bar-canvas" />
                </div>
              ))}
            </div>
          </div>

          {/* Comparison table */}
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>{L.case}</th>
                  <th>{L.accel}</th>
                  <th>{L.speed}</th>
                  <th>{L.distance}</th>
                  <th>{L.kinEnergy}</th>
                  <th>{L.work}</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c, i) => {
                  const r = physics(c);
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="table-dot" style={{ background: c.color }} />
                        {L.case} {i+1}
                      </td>
                      <td style={{ color: c.color }}>{r.a.toFixed(2)}</td>
                      <td style={{ color: c.color }}>{r.v.toFixed(2)}</td>
                      <td style={{ color: c.color }}>{r.d.toFixed(2)}</td>
                      <td style={{ color: c.color }}>{r.Ec.toFixed(1)}</td>
                      <td style={{ color: c.color }}>{r.W.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}