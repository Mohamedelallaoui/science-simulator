import { useState, useRef, useEffect, useCallback } from "react";
import "./FreeFall.css";

// ─── Planet data ──────────────────────────────────────────────────────────────
const PLANETS = [
  { id: "mercury", name: "Mercure",   g: 3.7,  color: "#b5a88a", emoji: "🪨", ring: false },
  { id: "venus",   name: "Vénus",     g: 8.87, color: "#e8c97a", emoji: "🌕", ring: false },
  { id: "earth",   name: "Terre",     g: 9.81, color: "#4ea3e0", emoji: "🌍", ring: false },
  { id: "moon",    name: "Lune",      g: 1.62, color: "#c8c8c8", emoji: "🌑", ring: false },
  { id: "mars",    name: "Mars",      g: 3.72, color: "#c1440e", emoji: "🔴", ring: false },
  { id: "jupiter", name: "Jupiter",   g: 24.8, color: "#c88b3a", emoji: "🟠", ring: false },
  { id: "saturn",  name: "Saturne",   g: 10.4, color: "#e4d191", emoji: "🪐", ring: true  },
  { id: "uranus",  name: "Uranus",    g: 8.69, color: "#7de8e8", emoji: "🔵", ring: true  },
  { id: "neptune", name: "Neptune",   g: 11.1, color: "#4b70dd", emoji: "🔵", ring: false },
];

// ─── Physics ──────────────────────────────────────────────────────────────────
// h = ½ g t²  →  t = √(2h/g)
// v = g·t
function calcFall(h, g) {
  if (g <= 0 || h <= 0) return { t: 0, v: 0 };
  const t = Math.sqrt((2 * h) / g);
  const v = g * t;
  return { t, v };
}

// ─── Animated drop canvas ─────────────────────────────────────────────────────
const CW = 100, CH = 260;
const BALL_R = 8;
const DROP_TOP = 24;
const DROP_BOT = CH - 24;
const DROP_RANGE = DROP_BOT - DROP_TOP - BALL_R;

function PlanetDrop({ planet, h, isDropping, progress }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);

    // Background column
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, CW, CH);

    // Ground line
    ctx.strokeStyle = planet.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, DROP_BOT); ctx.lineTo(CW - 8, DROP_BOT);
    ctx.stroke();

    // Height ruler marks
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = DROP_TOP + (i / 5) * DROP_RANGE;
      ctx.beginPath(); ctx.moveTo(CW / 2 - 6, y); ctx.lineTo(CW / 2 + 6, y); ctx.stroke();
    }

    // Ball position: quadratic (accelerating)
    const rawY = DROP_TOP + progress * progress * DROP_RANGE;
    const ballY = Math.min(rawY, DROP_BOT - BALL_R);

    // Trail
    for (let i = 1; i <= 6; i++) {
      const trailP = Math.max(0, progress - i * 0.06);
      const trailY = DROP_TOP + trailP * trailP * DROP_RANGE;
      if (trailY >= DROP_BOT - BALL_R) break;
      ctx.beginPath();
      ctx.arc(CW / 2, trailY, BALL_R * (1 - i * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = planet.color + Math.floor((1 - i * 0.15) * 40).toString(16).padStart(2, "0");
      ctx.fill();
    }

    // Ball
    const grad = ctx.createRadialGradient(
      CW / 2 - 2, ballY - 2, 1,
      CW / 2, ballY, BALL_R
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.3, planet.color);
    grad.addColorStop(1, planet.color + "88");
    ctx.beginPath();
    ctx.arc(CW / 2, ballY, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Impact flash when landed
    if (progress >= 1) {
      ctx.beginPath();
      ctx.arc(CW / 2, DROP_BOT, 14, 0, Math.PI * 2);
      ctx.fillStyle = planet.color + "33";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(CW / 2, DROP_BOT, 8, 0, Math.PI * 2);
      ctx.fillStyle = planet.color + "66";
      ctx.fill();
    }

    // g label
    ctx.fillStyle = planet.color;
    ctx.font = "bold 9px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(`g=${planet.g}`, CW / 2, CH - 6);

  }, [planet, progress]);

  return (
    <div className="ff-drop-col">
      <div className="ff-drop-col__name" style={{ color: planet.color }}>
        <span>{planet.emoji}</span> {planet.name}
      </div>
      <canvas ref={canvasRef} width={CW} height={CH} className="ff-drop-canvas" />
      <DropReadout planet={planet} h={h} progress={progress} />
    </div>
  );
}

function DropReadout({ planet, h, progress }) {
  const { t, v } = calcFall(h, planet.g);
  const elapsed = t * progress;
  const currentV = planet.g * elapsed;
  const currentH = Math.min(h, 0.5 * planet.g * elapsed * elapsed);

  return (
    <div className="ff-readout" style={{ "--pc": planet.color }}>
      <div className="ff-readout__row">
        <span>t</span>
        <span>{progress >= 1 ? t.toFixed(3) : elapsed.toFixed(3)} s</span>
      </div>
      <div className="ff-readout__row">
        <span>v</span>
        <span>{progress >= 1 ? v.toFixed(2) : currentV.toFixed(2)} m/s</span>
      </div>
      <div className="ff-readout__row">
        <span>Δh</span>
        <span>{currentH.toFixed(1)} m</span>
      </div>
    </div>
  );
}

// ─── Bar chart comparison ─────────────────────────────────────────────────────
function CompareChart({ h, selectedIds }) {
  const selected = PLANETS.filter(p => selectedIds.includes(p.id));
  const results = selected.map(p => ({ ...p, ...calcFall(h, p.g) }));
  const maxT = Math.max(...results.map(r => r.t), 0.01);
  const maxV = Math.max(...results.map(r => r.v), 0.01);

  return (
    <div className="ff-chart">
      <div className="ff-chart__section">
        <div className="ff-chart__title">Temps de chute <em>t (s)</em></div>
        {results.map(r => (
          <div key={r.id} className="ff-chart__bar-row">
            <span className="ff-chart__bar-label" style={{ color: r.color }}>{r.name}</span>
            <div className="ff-chart__bar-track">
              <div
                className="ff-chart__bar-fill"
                style={{
                  width: `${(r.t / maxT) * 100}%`,
                  background: r.color,
                  boxShadow: `0 0 8px ${r.color}88`,
                }}
              />
            </div>
            <span className="ff-chart__bar-val">{r.t.toFixed(3)} s</span>
          </div>
        ))}
      </div>
      <div className="ff-chart__section">
        <div className="ff-chart__title">Vitesse d'impact <em>v (m/s)</em></div>
        {results.map(r => (
          <div key={r.id} className="ff-chart__bar-row">
            <span className="ff-chart__bar-label" style={{ color: r.color }}>{r.name}</span>
            <div className="ff-chart__bar-track">
              <div
                className="ff-chart__bar-fill"
                style={{
                  width: `${(r.v / maxV) * 100}%`,
                  background: r.color,
                  boxShadow: `0 0 8px ${r.color}88`,
                }}
              />
            </div>
            <span className="ff-chart__bar-val">{r.v.toFixed(2)} m/s</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Formula derivation ───────────────────────────────────────────────────────
function FormulaPanel({ h, selectedIds }) {
  const earth = PLANETS.find(p => p.id === "earth");
  const { t, v } = calcFall(h, earth.g);

  return (
    <div className="ff-formula">
      <div className="ff-formula__block">
        <div className="ff-formula__title">Équations de la chute libre</div>
        <div className="ff-formula__grid">
          <div><code>h = ½ g t²</code><span>Position (chute depuis le repos)</span></div>
          <div><code>v = g · t</code><span>Vitesse à l'instant t</span></div>
          <div><code>t = √(2h / g)</code><span>Durée de chute depuis h</span></div>
          <div><code>v = √(2gh)</code><span>Vitesse d'impact</span></div>
          <div><code>v² = 2gh</code><span>Relation énergie cinétique</span></div>
          <div><code>a = g = cste</code><span>Accélération constante (pas de frottements)</span></div>
        </div>
      </div>
      <div className="ff-formula__live">
        <div className="ff-formula__live-title">Application numérique — Terre (g = 9.81 m/s²)</div>
        <code>h = {h} m → t = √(2 × {h} / 9.81) = <strong>{t.toFixed(4)} s</strong></code>
        <code>v = 9.81 × {t.toFixed(4)} = <strong>{v.toFixed(4)} m/s</strong></code>
        <code>v = √(2 × 9.81 × {h}) = <strong>{Math.sqrt(2 * 9.81 * h).toFixed(4)} m/s</strong></code>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FreeFall() {
  const [h, setH] = useState(50);
  const [selectedIds, setSelectedIds] = useState(["earth", "moon", "mars", "jupiter"]);
  const [isDropping, setIsDropping] = useState(false);
  const [progress, setProgress] = useState(0);   // 0..1 unified animation progress
  const [tab, setTab] = useState("animate");
  const animRef = useRef(null);
  const startRef = useRef(null);

  // Duration of animation is keyed to the slowest planet (longest fall time)
  const selected = PLANETS.filter(p => selectedIds.includes(p.id));
  const maxT = Math.max(...selected.map(p => calcFall(h, p.g).t), 0.01);
  const ANIM_DURATION_MS = Math.min(Math.max(maxT * 600, 1200), 4000);

  function togglePlanet(id) {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(x => x !== id) : prev
        : prev.length < 6 ? [...prev, id] : prev
    );
    setProgress(0); setIsDropping(false);
  }

  function startDrop() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setProgress(0);
    setIsDropping(true);
    startRef.current = null;

    function step(ts) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const prog = Math.min(elapsed / ANIM_DURATION_MS, 1);
      setProgress(prog);
      if (prog < 1) animRef.current = requestAnimationFrame(step);
      else setIsDropping(false);
    }
    animRef.current = requestAnimationFrame(step);
  }

  function reset() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setProgress(0); setIsDropping(false);
  }

  // Per-planet progress: each planet lands at its own t/maxT fraction
  function planetProgress(planet) {
    const { t } = calcFall(h, planet.g);
    const fraction = t / maxT;
    return Math.min(progress / fraction, 1);
  }

  return (
    <div className="ff-sim">
      {/* ── Header ── */}
      <div className="ff-header">
        <div className="ff-header__badges">
          <span className="ff-badge ff-badge--level">TCS · 2ème Bac</span>
          <span className="ff-badge ff-badge--topic">Mécanique · Chute Libre</span>
        </div>
        <h2 className="ff-header__title">
          <span className="ff-header__icon">🪐</span>
          Chute Libre Comparée
        </h2>
        <p className="ff-header__sub">
          Lâche un objet sur plusieurs planètes — compare g, t, v en temps réel
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="ff-controls">
        <div className="ff-ctrl-group">
          <div className="ff-ctrl-label">
            <span>Hauteur de chute <em>h</em></span>
            <span className="ff-ctrl-val">{h} m</span>
          </div>
          <input type="range" min={1} max={500} step={1}
            value={h}
            onChange={e => { setH(+e.target.value); reset(); }}
            className="ff-range" />
          <div className="ff-ctrl-presets">
            {[5, 10, 20, 50, 100, 200].map(v => (
              <button key={v}
                className={`ff-preset ${h === v ? "active" : ""}`}
                onClick={() => { setH(v); reset(); }}>
                {v}m
              </button>
            ))}
          </div>
        </div>

        <div className="ff-drop-btn-group">
          <button
            className={`ff-drop-btn ${isDropping ? "ff-drop-btn--dropping" : ""}`}
            onClick={startDrop}
            disabled={isDropping}
          >
            {isDropping ? "⏳ Chute en cours…" : "▼ Lâcher !"}
          </button>
          <button className="ff-reset-btn" onClick={reset}>↺ Reset</button>
        </div>
      </div>

      {/* ── Planet selector ── */}
      <div className="ff-planet-selector">
        <span className="ff-planet-selector__label">Planètes (max 6) :</span>
        <div className="ff-planet-selector__grid">
          {PLANETS.map(p => (
            <button
              key={p.id}
              className={`ff-planet-chip ${selectedIds.includes(p.id) ? "active" : ""}`}
              style={{ "--pc": p.color }}
              onClick={() => { togglePlanet(p.id); reset(); }}
            >
              <span>{p.emoji}</span>
              <span>{p.name}</span>
              <span className="ff-planet-chip__g">{p.g} m/s²</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ff-tabs">
        {[
          { id: "animate", label: "🎬 Animation" },
          { id: "compare", label: "📊 Comparaison" },
          { id: "formula", label: "📐 Formules" },
        ].map(t => (
          <button key={t.id}
            className={`ff-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === "animate" && (
        <div className="ff-drops-wrap">
          <div className="ff-drops">
            {selected.map(planet => (
              <PlanetDrop
                key={planet.id}
                planet={planet}
                h={h}
                isDropping={isDropping}
                progress={planetProgress(planet)}
              />
            ))}
          </div>
          <div className="ff-drops-note">
            Chaque balle tombe indépendamment selon <em>g</em> de sa planète.
            L'animation est mise à l'échelle sur la chute la plus lente.
          </div>
        </div>
      )}

      {tab === "compare" && (
        <CompareChart h={h} selectedIds={selectedIds} />
      )}

      {tab === "formula" && (
        <FormulaPanel h={h} selectedIds={selectedIds} />
      )}

      {/* ── g reference table ── */}
      <div className="ff-g-table">
        <div className="ff-g-table__title">Tableau de référence — g par planète</div>
        <div className="ff-g-table__grid">
          {PLANETS.map(p => {
            const { t, v } = calcFall(h, p.g);
            return (
              <div key={p.id} className="ff-g-row" style={{ "--pc": p.color }}>
                <span className="ff-g-row__planet">
                  {p.emoji} {p.name}
                </span>
                <span className="ff-g-row__g">{p.g} m/s²</span>
                <span className="ff-g-row__t">t = {t.toFixed(3)} s</span>
                <span className="ff-g-row__v">v = {v.toFixed(2)} m/s</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}