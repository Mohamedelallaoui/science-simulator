import { useState, useRef, useEffect, useCallback } from "react";
import "./LensSimulation.css";

const W = 800;
const H = 480;
const CX = W / 2;
const CY = H / 2;
const PX_PER_CM = 14; // 1 cm = 14px

function cmToPx(cm) { return cm * PX_PER_CM; }

function computeImage(objectDist, focalLen) {
  // object is at -|objectDist| (left of lens)
  // Using thin lens formula: 1/v - 1/u = 1/f  (sign convention: distances left = negative)
  // u = -|objectDist|
  const u = -Math.abs(objectDist);
  const f = focalLen;
  if (Math.abs(u - f) < 0.01) return null; // object at focal point → no image
  const v = 1 / (1 / f - 1 / u);
  const m = v / u; // lateral magnification
  return { v, m };
}

export default function LensSimulation() {
  const canvasRef = useRef(null);
  const [objectDist, setObjectDist] = useState(24); // in cm (positive = left of lens)
  const [focalLen, setFocalLen] = useState(10);     // in cm

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // --- Background ---
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0e1a");
    bg.addColorStop(1, "#0d1526");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // --- Grid ---
    ctx.strokeStyle = "rgba(100,160,255,0.07)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += cmToPx(2)) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += cmToPx(2)) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // --- Principal axis ---
    ctx.strokeStyle = "rgba(180,210,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(W, CY); ctx.stroke();
    ctx.setLineDash([]);

    // --- Lens ---
    const lensH = 180;
    const lensTop = CY - lensH / 2;
    const lensBot = CY + lensH / 2;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    // Biconvex lens shape
    ctx.beginPath();
    ctx.moveTo(CX, lensTop);
    ctx.bezierCurveTo(CX + 28, CY - 40, CX + 28, CY + 40, CX, lensBot);
    ctx.strokeStyle = "#38bdf8";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CX, lensTop);
    ctx.bezierCurveTo(CX - 28, CY - 40, CX - 28, CY + 40, CX, lensBot);
    ctx.stroke();

    // Fill lens
    ctx.beginPath();
    ctx.moveTo(CX, lensTop);
    ctx.bezierCurveTo(CX + 28, CY - 40, CX + 28, CY + 40, CX, lensBot);
    ctx.bezierCurveTo(CX - 28, CY + 40, CX - 28, CY - 40, CX, lensTop);
    ctx.closePath();
    ctx.fillStyle = "rgba(56,189,248,0.07)";
    ctx.fill();

    // Lens arrows
    ctx.fillStyle = "#38bdf8";
    const arrowSize = 8;
    [[CX, lensTop, -1], [CX, lensBot, 1]].forEach(([x, y, dir]) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - arrowSize / 2, y + dir * arrowSize);
      ctx.lineTo(x + arrowSize / 2, y + dir * arrowSize);
      ctx.closePath();
      ctx.fill();
    });

    // --- Focal points ---
    const fPx = cmToPx(focalLen);
    const fPoints = [CX + fPx, CX - fPx];
    fPoints.forEach((fx, i) => {
      ctx.beginPath();
      ctx.arc(fx, CY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
      ctx.fillStyle = "rgba(251,191,36,0.85)";
      ctx.font = "bold 11px 'Courier New'";
      ctx.fillText(i === 0 ? "F'" : "F", fx - 6, CY - 10);
    });

    // Object arrow
    const objXPx = CX - cmToPx(objectDist);
    const objH = 70; // fixed visual height
    ctx.strokeStyle = "#a78bfa";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(objXPx, CY);
    ctx.lineTo(objXPx, CY - objH);
    ctx.stroke();
    // arrowhead
    ctx.fillStyle = "#a78bfa";
    ctx.beginPath();
    ctx.moveTo(objXPx, CY - objH);
    ctx.lineTo(objXPx - 5, CY - objH + 10);
    ctx.lineTo(objXPx + 5, CY - objH + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(167,139,250,0.85)";
    ctx.font = "bold 12px 'Courier New'";
    ctx.fillText("AB", objXPx + 7, CY - objH + 4);

    // Compute image
    const result = computeImage(objectDist, focalLen);

    if (result) {
      const { v, m } = result;
      const imgXPx = CX + cmToPx(v);
      const imgHPx = Math.abs(m) * objH;
      const isReal = v > 0;
      const isInverted = m < 0;
      const imgTopPx = isInverted ? CY : CY - imgHPx;

      // --- 3 canonical rays ---
      const rayColor = isReal ? "rgba(52,211,153,0.75)" : "rgba(251,146,60,0.7)";
      ctx.lineWidth = 1.5;

      // Ray 1: parallel to axis → through F'
      ctx.strokeStyle = rayColor;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(objXPx, CY - objH);
      ctx.lineTo(CX, CY - objH);      // hits lens at height objH
      ctx.lineTo(CX + fPx, CY);       // through F'
      if (isReal) {
        ctx.lineTo(imgXPx, CY - imgHPx * (isInverted ? -1 : 1));
      } else {
        ctx.lineTo(imgXPx, CY - imgHPx);
        ctx.setLineDash([4, 3]);
        ctx.lineTo(imgXPx - cmToPx(5), CY - imgHPx * 1.5);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Ray 2: through center (no deviation)
      ctx.beginPath();
      ctx.moveTo(objXPx, CY - objH);
      ctx.lineTo(CX, CY);             // passes center unchanged
      if (isReal) {
        ctx.lineTo(imgXPx, CY - imgHPx * (isInverted ? -1 : 1));
      } else {
        ctx.lineTo(W, CY + (CY / (CX - objXPx)) * (W - objXPx));
      }
      ctx.stroke();

      // Ray 3: through F → exits parallel
      const f2Px = CX - fPx;
      const slopeToF = (CY - (CY - objH)) / (f2Px - objXPx);
      const yAtLens = (CY - objH) + slopeToF * (CX - objXPx);
      ctx.beginPath();
      ctx.moveTo(objXPx, CY - objH);
      ctx.lineTo(CX, yAtLens);
      ctx.lineTo(isReal ? imgXPx : W, yAtLens);
      ctx.stroke();

      // Image arrow
      const imgColor = isReal ? "#34d399" : "#fb923c";
      ctx.strokeStyle = imgColor;
      ctx.lineWidth = 2.5;
      const imgBaseY = CY;
      const imgTipY = isInverted ? CY + imgHPx : CY - imgHPx;
      ctx.beginPath();
      ctx.moveTo(imgXPx, imgBaseY);
      ctx.lineTo(imgXPx, imgTipY);
      if (!isReal) ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = imgColor;
      const dir2 = isInverted ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(imgXPx, imgTipY);
      ctx.lineTo(imgXPx - 5, imgTipY - dir2 * 10);
      ctx.lineTo(imgXPx + 5, imgTipY - dir2 * 10);
      ctx.closePath();
      ctx.fill();
      ctx.font = "bold 12px 'Courier New'";
      ctx.fillStyle = imgColor;
      ctx.fillText("A'B'", imgXPx + 7, imgTipY + (isInverted ? 4 : -4));
    }

    // --- distance labels ---
    ctx.font = "11px 'Courier New'";
    ctx.fillStyle = "rgba(200,220,255,0.55)";
    ctx.fillText(`|OA| = ${objectDist} cm`, objXPx + 4, CY + 18);
    if (result) {
      const { v } = result;
      ctx.fillText(`|OA'| = ${Math.abs(v).toFixed(1)} cm`, CX + cmToPx(v) + 4, CY + 18);
    }
  }, [objectDist, focalLen]);

  useEffect(() => { draw(); }, [draw]);

  const result = computeImage(objectDist, focalLen);
  let imageType = "—", imageNature = "—", imagePosition = "—", magnification = "—";
  if (result) {
    const { v, m } = result;
    imageType = v > 0 ? "Réelle" : "Virtuelle";
    imageNature = m < 0 ? "Renversée" : "Droite";
    imagePosition = `${v > 0 ? "+" : ""}${v.toFixed(2)} cm (${v > 0 ? "droite" : "gauche"} de la lentille)`;
    magnification = m.toFixed(3);
  } else {
    imageType = "Pas d'image (objet au foyer)";
  }

  return (
    <div className="lens-sim">
      <div className="lens-sim__header">
        <span className="lens-sim__badge">Optique · 1ère Bac</span>
        <h2 className="lens-sim__title">🔭 Lentilles Convergentes Interactives</h2>
        <p className="lens-sim__subtitle">Formation des images — déplacement en temps réel</p>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="lens-sim__canvas"
      />

      <div className="lens-sim__controls">
        <div className="lens-sim__slider-group">
          <label className="lens-sim__label">
            <span>Distance objet <em>|OA|</em></span>
            <span className="lens-sim__value">{objectDist} cm</span>
          </label>
          <input
            type="range" min={2} max={50} step={0.5}
            value={objectDist}
            onChange={e => setObjectDist(+e.target.value)}
            className="lens-sim__range lens-sim__range--purple"
          />
        </div>
        <div className="lens-sim__slider-group">
          <label className="lens-sim__label">
            <span>Distance focale <em>f'</em></span>
            <span className="lens-sim__value">{focalLen} cm</span>
          </label>
          <input
            type="range" min={3} max={20} step={0.5}
            value={focalLen}
            onChange={e => setFocalLen(+e.target.value)}
            className="lens-sim__range lens-sim__range--cyan"
          />
        </div>
      </div>

      <div className="lens-sim__results">
        <div className="lens-sim__result-card">
          <span className="lens-sim__result-label">Type d'image</span>
          <span className={`lens-sim__result-val ${result?.v > 0 ? "real" : "virtual"}`}>{imageType}</span>
        </div>
        <div className="lens-sim__result-card">
          <span className="lens-sim__result-label">Nature</span>
          <span className="lens-sim__result-val">{imageNature}</span>
        </div>
        <div className="lens-sim__result-card">
          <span className="lens-sim__result-label">Position A'</span>
          <span className="lens-sim__result-val">{imagePosition}</span>
        </div>
        <div className="lens-sim__result-card">
          <span className="lens-sim__result-label">Grandissement γ</span>
          <span className="lens-sim__result-val">{magnification}</span>
        </div>
      </div>

      <div className="lens-sim__formula">
        <span>Formule conjuguée :</span>
        <code>1/OA' − 1/OA = 1/f'</code>
        <span className="lens-sim__formula-vals">
          {result
            ? `→ 1/${result.v.toFixed(2)} − 1/${(-objectDist).toFixed(2)} = 1/${focalLen}`
            : "Objet au foyer → pas d'image"}
        </span>
      </div>

      <div className="lens-sim__legend">
        <span><span className="dot purple" />Objet AB</span>
        <span><span className="dot green" />Image réelle A'B'</span>
        <span><span className="dot orange" />Image virtuelle A'B'</span>
        <span><span className="dot cyan" />Lentille</span>
        <span><span className="dot yellow" />Foyers F, F'</span>
      </div>
    </div>
  );
}