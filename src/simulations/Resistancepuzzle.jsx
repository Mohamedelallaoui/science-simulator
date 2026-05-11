import { useState, useRef, useCallback } from "react";
import "./ResistancePuzzle.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const RESISTOR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6",
];

const PRESET_CHALLENGES = [
  {
    label: "Défi 1 — Série simple",
    desc: "Place 3 résistances en série",
    target: 300,
    hint: "Req = R1 + R2 + R3",
    resistors: [100, 100, 100],
  },
  {
    label: "Défi 2 — Parallèle",
    desc: "Place 2 résistances en parallèle",
    target: 50,
    hint: "1/Req = 1/R1 + 1/R2",
    resistors: [100, 100],
  },
  {
    label: "Défi 3 — Mixte",
    desc: "Combine série et parallèle",
    target: 150,
    hint: "Groupe d'abord les parallèles",
    resistors: [100, 100, 100],
  },
];

// ─── Circuit Node types ───────────────────────────────────────────────────────
// A circuit is a tree: { type: "series"|"parallel"|"resistor", children?, value? }

function calcReq(node) {
  if (!node) return 0;
  if (node.type === "resistor") return node.value;
  if (node.type === "series") {
    return node.children.reduce((s, c) => s + calcReq(c), 0);
  }
  if (node.type === "parallel") {
    const sum = node.children.reduce((s, c) => s + 1 / calcReq(c), 0);
    return sum === 0 ? Infinity : 1 / sum;
  }
  return 0;
}

function countResistors(node) {
  if (!node) return 0;
  if (node.type === "resistor") return 1;
  return node.children.reduce((s, c) => s + countResistors(c), 0);
}

let idCounter = 1;
function mkId() { return idCounter++; }

function mkResistor(value) {
  return { id: mkId(), type: "resistor", value };
}

// ─── SVG Circuit Renderer ─────────────────────────────────────────────────────
// Recursive layout: returns { width, height, svg }
const R_W = 48, R_H = 24, WIRE = 16, GAP = 12;

function layoutNode(node, colorMap) {
  if (!node) return { w: 0, h: 0, el: null };

  if (node.type === "resistor") {
    const color = colorMap[node.id] || "#94a3b8";
    const w = R_W + WIRE * 2;
    const h = R_H + 8;
    const cx = w / 2, cy = h / 2;
    const el = (
      <g key={node.id}>
        {/* Wire left */}
        <line x1={0} y1={cy} x2={WIRE} y2={cy} stroke="#64748b" strokeWidth={2} />
        {/* Body */}
        <rect x={WIRE} y={cy - R_H / 2} width={R_W} height={R_H}
          rx={4} fill={color + "22"} stroke={color} strokeWidth={2} />
        {/* Zigzag */}
        <polyline
          points={Array.from({ length: 7 }, (_, i) => {
            const px = WIRE + 6 + i * (R_W - 12) / 6;
            const py = cy + (i % 2 === 0 ? -5 : 5);
            return `${px},${py}`;
          }).join(" ")}
          fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round"
        />
        {/* Wire right */}
        <line x1={WIRE + R_W} y1={cy} x2={w} y2={cy} stroke="#64748b" strokeWidth={2} />
        {/* Value label */}
        <text x={cx} y={cy + R_H / 2 + 11} textAnchor="middle"
          fontSize={9} fill={color} fontFamily="'Courier New', monospace" fontWeight="700">
          {node.value}Ω
        </text>
      </g>
    );
    return { w, h, el };
  }

  if (node.type === "series") {
    const children = node.children.map(c => layoutNode(c, colorMap));
    const totalW = children.reduce((s, c) => s + c.w, 0) + GAP * (children.length - 1);
    const maxH = Math.max(...children.map(c => c.h), R_H + 8);
    let x = 0;
    const els = children.map((c, i) => {
      const el = (
        <g key={i} transform={`translate(${x}, ${(maxH - c.h) / 2})`}>
          {c.el}
        </g>
      );
      x += c.w;
      if (i < children.length - 1) x += GAP;
      return el;
    });
    return { w: totalW, h: maxH, el: <>{els}</> };
  }

  if (node.type === "parallel") {
    const children = node.children.map(c => layoutNode(c, colorMap));
    const maxW = Math.max(...children.map(c => c.w));
    const totalH = children.reduce((s, c) => s + c.h, 0) + GAP * (children.length - 1);
    const busX = WIRE;
    let y = 0;
    const rails = [];
    const branchEls = children.map((c, i) => {
      const cy = y + c.h / 2;
      // Center horizontally
      const offX = (maxW - c.w) / 2;
      const el = (
        <g key={i} transform={`translate(${busX + offX}, ${y})`}>
          {c.el}
        </g>
      );
      // Left connector from bus to branch
      rails.push(
        <line key={`lw${i}`} x1={busX} y1={cy} x2={busX + offX} y2={cy}
          stroke="#64748b" strokeWidth={2} />,
        // Right connector from branch to bus
        <line key={`rw${i}`} x1={busX + offX + c.w} y1={cy} x2={busX + maxW} y2={cy}
          stroke="#64748b" strokeWidth={2} />
      );
      y += c.h + (i < children.length - 1 ? GAP : 0);
      return el;
    });

    // Vertical bus lines
    const midY = totalH / 2;
    const busRight = busX + maxW;
    const leftBus = (
      <line key="lb" x1={busX} y1={0} x2={busX} y2={totalH}
        stroke="#64748b" strokeWidth={2} />
    );
    const rightBus = (
      <line key="rb" x1={busRight} y1={0} x2={busRight} y2={totalH}
        stroke="#64748b" strokeWidth={2} />
    );
    // Entry/exit wires
    const entryWire = (
      <line key="ew" x1={0} y1={midY} x2={busX} y2={midY}
        stroke="#64748b" strokeWidth={2} />
    );
    const exitWire = (
      <line key="xw" x1={busRight} y1={midY} x2={busRight + WIRE} y2={midY}
        stroke="#64748b" strokeWidth={2} />
    );

    const totalW = maxW + WIRE * 2;
    return {
      w: totalW, h: totalH,
      el: <>{entryWire}{leftBus}{rightBus}{exitWire}{rails}{branchEls}</>
    };
  }

  return { w: 0, h: 0, el: null };
}

// ─── Puzzle slot system ───────────────────────────────────────────────────────
// The student builds a circuit tree by clicking slots
// Circuit tree is edited via UI actions

function SlotCircuit({ circuit, onAddSeries, onAddParallel, onRemove, colorMap, path = [] }) {
  if (!circuit) {
    return (
      <div className="rp-slot rp-slot--empty" onClick={() => onAddSeries(path)}>
        <span>+</span>
      </div>
    );
  }

  if (circuit.type === "resistor") {
    const color = colorMap[circuit.id] || "#94a3b8";
    return (
      <div className="rp-slot rp-slot--resistor" style={{ borderColor: color, background: color + "18" }}>
        <span className="rp-slot__val" style={{ color }}>{circuit.value} Ω</span>
        <button className="rp-slot__rm" onClick={() => onRemove(path)} title="Retirer">×</button>
      </div>
    );
  }

  if (circuit.type === "series") {
    return (
      <div className="rp-group rp-group--series">
        <span className="rp-group__label">SÉRIE</span>
        <div className="rp-group__children rp-group__children--series">
          {circuit.children.map((c, i) => (
            <SlotCircuit key={c.id ?? i} circuit={c} colorMap={colorMap}
              onAddSeries={onAddSeries} onAddParallel={onAddParallel} onRemove={onRemove}
              path={[...path, "children", i]} />
          ))}
          <button className="rp-group__add" onClick={() => onAddSeries([...path, "children", circuit.children.length])}>
            + Série
          </button>
          <button className="rp-group__add rp-group__add--par" onClick={() => onAddParallel([...path, "children", circuit.children.length])}>
            ⫠ Parallèle
          </button>
        </div>
        <button className="rp-slot__rm rp-group__rm" onClick={() => onRemove(path)}>×</button>
      </div>
    );
  }

  if (circuit.type === "parallel") {
    return (
      <div className="rp-group rp-group--parallel">
        <span className="rp-group__label">PARALLÈLE</span>
        <div className="rp-group__children rp-group__children--parallel">
          {circuit.children.map((c, i) => (
            <SlotCircuit key={c.id ?? i} circuit={c} colorMap={colorMap}
              onAddSeries={onAddSeries} onAddParallel={onAddParallel} onRemove={onRemove}
              path={[...path, "children", i]} />
          ))}
          <button className="rp-group__add" onClick={() => onAddSeries([...path, "children", circuit.children.length])}>
            + Branche
          </button>
        </div>
        <button className="rp-slot__rm rp-group__rm" onClick={() => onRemove(path)}>×</button>
      </div>
    );
  }
}

// Deep get/set helpers for the circuit tree
function getAt(obj, path) {
  let cur = obj;
  for (const k of path) cur = cur[k];
  return cur;
}

function setAt(obj, path, value) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (typeof head === "number") {
    const arr = [...obj];
    arr[head] = setAt(arr[head], rest, value);
    return arr;
  }
  return { ...obj, [head]: setAt(obj[head], rest, value) };
}

function removeAt(obj, path) {
  if (path.length === 1) {
    const [key] = path;
    if (typeof key === "number") {
      const arr = [...obj];
      arr.splice(key, 1);
      return arr;
    }
    const { [key]: _, ...rest } = obj;
    return rest;
  }
  const [head, ...rest] = path;
  if (typeof head === "number") {
    const arr = [...obj];
    arr[head] = removeAt(arr[head], rest);
    return arr;
  }
  return { ...obj, [head]: removeAt(obj[head], rest) };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ResistancePuzzle() {
  const [resistors, setResistors] = useState([
    { id: mkId(), value: 100 },
    { id: mkId(), value: 220 },
    { id: mkId(), value: 330 },
    { id: mkId(), value: 470 },
  ]);
  const [newVal, setNewVal]       = useState(100);
  const [circuit, setCircuit]     = useState(null);
  const [selectedR, setSelectedR] = useState(null); // id of resistor being placed
  const [challenge, setChallenge] = useState(null);
  const [solved, setSolved]       = useState(false);
  const [showSVG, setShowSVG]     = useState(true);

  // Build color map: resistor id → color
  const colorMap = {};
  resistors.forEach((r, i) => { colorMap[r.id] = RESISTOR_COLORS[i % RESISTOR_COLORS.length]; });

  const req = circuit ? calcReq(circuit) : null;

  // ── Circuit mutation helpers ─────────────────────────────────────────────
  function insertAt(path, node) {
    if (circuit === null) {
      setCircuit(node);
      return;
    }
    if (path.length === 0) {
      // Replace root → wrap in series
      setCircuit({ id: mkId(), type: "series", children: [circuit, node] });
      return;
    }
    const parent = getAt(circuit, path.slice(0, -1));
    const idx = path[path.length - 1];
    // Insert into children array
    const newChildren = [...parent.children];
    newChildren.splice(typeof idx === "number" ? idx : newChildren.length, 0, node);
    setCircuit(setAt(circuit, [...path.slice(0, -1), "children"], newChildren));
  }

  function handleAddSeries(path) {
    if (!selectedR) return;
    const r = resistors.find(r => r.id === selectedR);
    if (!r) return;
    const node = mkResistor(r.value);
    colorMap[node.id] = colorMap[r.id];
    // Extend the colorMap for the new id
    const newColorMap = { ...colorMap, [node.id]: colorMap[r.id] };

    if (!circuit) { setCircuit(node); return; }

    // Navigate to the parent group at path (dropping last index)
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    if (parentPath.length === 0) {
      // inserting at root level
      if (circuit.type === "series") {
        const nc = [...circuit.children];
        nc.splice(idx, 0, node);
        setCircuit({ ...circuit, children: nc });
      } else {
        setCircuit({ id: mkId(), type: "series", children: [circuit, node] });
      }
    } else {
      const parent = getAt(circuit, parentPath);
      const nc = [...parent.children];
      nc.splice(idx, 0, node);
      setCircuit(setAt(circuit, [...parentPath, "children"], nc));
    }
  }

  function handleAddParallel(path) {
    if (!selectedR) return;
    const r = resistors.find(r => r.id === selectedR);
    if (!r) return;
    const node = mkResistor(r.value);

    if (!circuit) { setCircuit(node); return; }

    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    if (parentPath.length === 0) {
      if (circuit.type === "parallel") {
        const nc = [...circuit.children];
        nc.splice(idx, 0, node);
        setCircuit({ ...circuit, children: nc });
      } else {
        setCircuit({ id: mkId(), type: "parallel", children: [circuit, node] });
      }
    } else {
      const parent = getAt(circuit, parentPath);
      if (parent.type === "parallel") {
        const nc = [...parent.children];
        nc.splice(idx, 0, node);
        setCircuit(setAt(circuit, [...parentPath, "children"], nc));
      } else {
        // wrap the last child in parallel
        const nc = [...parent.children];
        const last = nc[nc.length - 1];
        nc[nc.length - 1] = { id: mkId(), type: "parallel", children: [last, node] };
        setCircuit(setAt(circuit, [...parentPath, "children"], nc));
      }
    }
  }

  function handleRemove(path) {
    if (path.length === 0) { setCircuit(null); return; }
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    if (parentPath.length === 0) {
      const parent = circuit;
      if (parent.children) {
        const nc = parent.children.filter((_, i) => i !== idx);
        if (nc.length === 1) { setCircuit(nc[0]); return; }
        if (nc.length === 0) { setCircuit(null); return; }
        setCircuit({ ...parent, children: nc });
      } else {
        setCircuit(null);
      }
    } else {
      const parent = getAt(circuit, parentPath);
      const nc = parent.children.filter((_, i) => i !== idx);
      if (nc.length === 1) {
        setCircuit(setAt(circuit, parentPath, nc[0]));
      } else if (nc.length === 0) {
        setCircuit(setAt(circuit, parentPath, null));
      } else {
        setCircuit(setAt(circuit, [...parentPath, "children"], nc));
      }
    }
  }

  // ── SVG diagram ───────────────────────────────────────────────────────────
  let svgEl = null, svgW = 0, svgH = 0;
  if (circuit) {
    const layout = layoutNode(circuit, colorMap);
    svgW = layout.w + 32;
    svgH = layout.h + 32;
    svgEl = (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width={Math.min(svgW, 760)} height={svgH}
        style={{ overflow: "visible" }}>
        {/* Battery symbol */}
        <line x1={2} y1={svgH / 2} x2={16} y2={svgH / 2} stroke="#64748b" strokeWidth={2} />
        <line x1={16} y1={svgH / 2 - 10} x2={16} y2={svgH / 2 + 10} stroke="#22c55e" strokeWidth={3} />
        <line x1={20} y1={svgH / 2 - 6} x2={20} y2={svgH / 2 + 6} stroke="#22c55e" strokeWidth={1.5} />
        <line x1={20} y1={svgH / 2} x2={32} y2={svgH / 2} stroke="#64748b" strokeWidth={2} />
        <g transform={`translate(16, ${svgH / 2 - layout.h / 2})`}>
          {layout.el}
        </g>
        {/* Close circuit line */}
        <line x1={16 + layout.w} y1={svgH / 2} x2={svgW - 2} y2={svgH / 2} stroke="#64748b" strokeWidth={2} />
      </svg>
    );
  }

  // ── Check challenge ───────────────────────────────────────────────────────
  function checkChallenge() {
    if (!challenge || req === null) return;
    const ok = Math.abs(req - challenge.target) < 1;
    setSolved(ok);
  }

  function loadChallenge(ch) {
    setChallenge(ch);
    setSolved(false);
    setCircuit(null);
    setSelectedR(null);
    // Replace resistors with challenge set
    const newRs = ch.resistors.map(v => ({ id: mkId(), value: v }));
    setResistors(newRs);
  }

  function addCustomResistor() {
    const v = Math.max(1, Math.min(100000, newVal));
    setResistors(rs => [...rs, { id: mkId(), value: v }]);
  }

  function removeResistor(id) {
    setResistors(rs => rs.filter(r => r.id !== id));
    if (selectedR === id) setSelectedR(null);
  }

  const reqStr = req !== null
    ? (isFinite(req) ? req.toFixed(2) + " Ω" : "∞ Ω")
    : "—";

  return (
    <div className="rp-sim">
      {/* Header */}
      <div className="rp-sim__header">
        <div className="rp-sim__badges">
          <span className="rp-badge rp-badge--level">Tronc Commun</span>
          <span className="rp-badge rp-badge--topic">Conducteurs Ohmiques · Série / Parallèle</span>
        </div>
        <h2 className="rp-sim__title">
          <span className="rp-sim__title-icon">⚡</span> Association de Résistances
        </h2>
        <p className="rp-sim__subtitle">Construis ton circuit — calcule R<sub>eq</sub> en temps réel</p>
      </div>

      {/* Challenge selector */}
      <div className="rp-challenges">
        <span className="rp-challenges__label">Défis :</span>
        {PRESET_CHALLENGES.map((ch, i) => (
          <button key={i}
            className={`rp-challenges__btn ${challenge?.label === ch.label ? "active" : ""}`}
            onClick={() => loadChallenge(ch)}>
            {ch.label}
          </button>
        ))}
        <button className="rp-challenges__btn rp-challenges__btn--free"
          onClick={() => { setChallenge(null); setSolved(false); }}>
          Libre
        </button>
      </div>

      {challenge && (
        <div className={`rp-challenge-banner ${solved ? "rp-challenge-banner--solved" : ""}`}>
          <div className="rp-cb__left">
            <span className="rp-cb__icon">{solved ? "🎉" : "🎯"}</span>
            <div>
              <div className="rp-cb__title">{solved ? "Bravo ! Défi réussi !" : challenge.desc}</div>
              <div className="rp-cb__meta">
                Cible : <strong>{challenge.target} Ω</strong>
                {" · "}<em>{challenge.hint}</em>
              </div>
            </div>
          </div>
          <button className="rp-cb__check" onClick={checkChallenge}>Vérifier</button>
        </div>
      )}

      <div className="rp-workspace">
        {/* Left: Resistor bank */}
        <div className="rp-bank">
          <div className="rp-bank__title">Boîte à résistances</div>
          <div className="rp-bank__list">
            {resistors.map(r => {
              const color = colorMap[r.id];
              const isSelected = selectedR === r.id;
              return (
                <div
                  key={r.id}
                  className={`rp-resistor-chip ${isSelected ? "selected" : ""}`}
                  style={{ "--rc": color }}
                  onClick={() => setSelectedR(isSelected ? null : r.id)}
                >
                  <span className="rp-resistor-chip__body">
                    <span className="rp-resistor-chip__zig">≈</span>
                    <span className="rp-resistor-chip__val">{r.value} Ω</span>
                  </span>
                  <button className="rp-resistor-chip__rm"
                    onClick={e => { e.stopPropagation(); removeResistor(r.id); }}>
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add custom */}
          <div className="rp-bank__add">
            <div className="rp-bank__add-title">Ajouter une résistance</div>
            <div className="rp-bank__add-row">
              <input type="number" min={1} max={100000} value={newVal}
                onChange={e => setNewVal(+e.target.value)}
                className="rp-bank__add-input" />
              <span className="rp-bank__add-unit">Ω</span>
              <button onClick={addCustomResistor} className="rp-bank__add-btn">+</button>
            </div>
            <input type="range" min={1} max={10000} step={1} value={newVal}
              onChange={e => setNewVal(+e.target.value)}
              className="rp-bank__slider" />
          </div>

          {/* Instructions */}
          <div className="rp-bank__help">
            <div className="rp-help-step">
              <span className="rp-help-step__num">1</span>
              <span>Clique sur une résistance pour la sélectionner</span>
            </div>
            <div className="rp-help-step">
              <span className="rp-help-step__num">2</span>
              <span>Clique sur <strong>+ Série</strong> ou <strong>⫠ Parallèle</strong> dans le circuit</span>
            </div>
            <div className="rp-help-step">
              <span className="rp-help-step__num">3</span>
              <span>Clique <strong>×</strong> pour retirer un élément</span>
            </div>
          </div>
        </div>

        {/* Right: Circuit builder */}
        <div className="rp-builder">
          <div className="rp-builder__top">
            <div className="rp-builder__title">Circuit</div>
            <div className="rp-builder__req">
              R<sub>eq</sub> = <span className="rp-builder__req-val">{reqStr}</span>
            </div>
            <div className="rp-builder__actions">
              <button className="rp-builder__action" onClick={() => setShowSVG(v => !v)}>
                {showSVG ? "🔧 Vue arbre" : "📐 Vue schéma"}
              </button>
              <button className="rp-builder__action rp-builder__action--reset"
                onClick={() => { setCircuit(null); setSolved(false); }}>
                Réinitialiser
              </button>
            </div>
          </div>

          {/* SVG Schematic */}
          {showSVG && (
            <div className="rp-schematic">
              {circuit ? (
                <div className="rp-schematic__inner">{svgEl}</div>
              ) : (
                <div className="rp-schematic__empty">
                  Le schéma apparaît ici
                </div>
              )}
            </div>
          )}

          {/* Tree builder */}
          <div className="rp-tree">
            {circuit ? (
              <SlotCircuit
                circuit={circuit}
                colorMap={colorMap}
                onAddSeries={handleAddSeries}
                onAddParallel={handleAddParallel}
                onRemove={handleRemove}
                path={[]}
              />
            ) : (
              <div className="rp-tree__empty">
                <div className="rp-tree__empty-icon">⟿</div>
                <p>Sélectionne une résistance puis clique ci-dessous</p>
                <button className="rp-group__add"
                  onClick={() => {
                    if (!selectedR) return;
                    const r = resistors.find(r => r.id === selectedR);
                    if (r) setCircuit(mkResistor(r.value));
                  }}>
                  + Placer la résistance
                </button>
              </div>
            )}
          </div>

          {/* Formula derivation */}
          {circuit && req !== null && (
            <div className="rp-derivation">
              <div className="rp-derivation__title">Calcul de R<sub>eq</sub></div>
              <DerivationText node={circuit} />
              <div className="rp-derivation__result">
                → R<sub>eq</sub> = <strong>{reqStr}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formula reference */}
      <div className="rp-formulas">
        <div className="rp-formula-card rp-formula-card--series">
          <div className="rp-formula-card__title">En série</div>
          <code>R<sub>eq</sub> = R₁ + R₂ + … + Rₙ</code>
          <p>Le courant est identique dans tous les conducteurs</p>
        </div>
        <div className="rp-formula-card rp-formula-card--parallel">
          <div className="rp-formula-card__title">En parallèle</div>
          <code>1/R<sub>eq</sub> = 1/R₁ + 1/R₂ + … + 1/Rₙ</code>
          <p>La tension est identique aux bornes de tous les conducteurs</p>
        </div>
      </div>
    </div>
  );
}

// ─── Derivation text ──────────────────────────────────────────────────────────
function DerivationText({ node, depth = 0 }) {
  if (!node) return null;
  if (node.type === "resistor") {
    return <span className="rp-deriv__r">{node.value}Ω</span>;
  }
  if (node.type === "series") {
    const parts = node.children.map((c, i) => (
      <span key={i}>
        {i > 0 && <span className="rp-deriv__op"> + </span>}
        <DerivationText node={c} depth={depth + 1} />
      </span>
    ));
    const r = calcReq(node);
    return (
      <span className="rp-deriv__group rp-deriv__group--series">
        ({parts}) = <strong>{r.toFixed(1)}Ω</strong>
      </span>
    );
  }
  if (node.type === "parallel") {
    const parts = node.children.map((c, i) => (
      <span key={i}>
        {i > 0 && <span className="rp-deriv__op"> + </span>}
        <span>1/<DerivationText node={c} depth={depth + 1} /></span>
      </span>
    ));
    const r = calcReq(node);
    return (
      <span className="rp-deriv__group rp-deriv__group--parallel">
        1/({parts}) = <strong>{r.toFixed(1)}Ω</strong>
      </span>
    );
  }
  return null;
}