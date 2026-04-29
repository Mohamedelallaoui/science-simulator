import { useState, useRef, useEffect, useCallback } from "react";
import { runSimulation } from "./projectileEngine";
import { useLang } from "../context/LanguageContext";
import "./ProjectileSimulation.css";

const LABELS = {
  fr: {
    title: "Mouvement Projectile",
    v0: "Vitesse initiale", angle: "Angle", y0: "Hauteur initiale",
    g: "Gravité", dt: "Pas de temps", airRes: "Résistance air",
    mass: "Masse", yes: "Oui", no: "Non",
    launch: "Lancer", reset: "Reset",
    tof: "Durée de vol", maxH: "Hauteur max",
    range: "Portée", impactV: "Vitesse impact",
    s: "s", m: "m", ms: "m/s",
    animating: "En vol…",
  },
  ar: {
    title: "حركة القذيفة",
    v0: "السرعة البدئية", angle: "الزاوية", y0: "الارتفاع البدئي",
    g: "الجاذبية", dt: "الخطوة الزمنية", airRes: "مقاومة الهواء",
    mass: "الكتلة", yes: "نعم", no: "لا",
    launch: "إطلاق", reset: "إعادة",
    tof: "مدة الطيران", maxH: "أقصى ارتفاع",
    range: "المدى", impactV: "سرعة الارتطام",
    s: "ث", m: "م", ms: "م/ث",
    animating: "في الهواء…",
  },
};

const DEFAULT = { v0: 30, angle: 45, y0: 0, g: 9.81, dt: 0.01, airResistance: false, mass: 1 };

// ─── CONSTANTS ───────────────────────────────
const GROUND_FRAC = 0.82;   // ground line at 82% of canvas height
const CANNON_X_FRAC = 0.18; // cannon horizontal position
const MAX_Y0 = 100;         // max initial height in meters
const COLUMN_ANIM_MS = 600; // column rise animation duration

// ─── BACKGROUND + GRID ───────────────────────
function drawBackground(ctx, W, H) {
  const sky = ctx.createLinearGradient(0, 0, W * 0.6, H);
  sky.addColorStop(0,    "#7db8d8");
  sky.addColorStop(0.38, "#a8cfe0");
  sky.addColorStop(0.65, "#d4b89a");
  sky.addColorStop(0.82, "#e8c9a8");
  sky.addColorStop(1,    "#f0dcc0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // horizon glow
  const glow = ctx.createRadialGradient(W * 0.72, H * 0.7, 0, W * 0.72, H * 0.7, W * 0.5);
  glow.addColorStop(0,   "rgba(255,210,150,0.4)");
  glow.addColorStop(1,   "rgba(255,200,130,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // horizon mist
  const horizonY = H * GROUND_FRAC;
  const mist = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 50);
  mist.addColorStop(0,   "rgba(255,240,220,0)");
  mist.addColorStop(0.45,"rgba(255,240,220,0.5)");
  mist.addColorStop(1,   "rgba(255,240,220,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, horizonY - 30, W, 80);

  // distant hills
  ctx.fillStyle = "rgba(180,200,210,0.22)";
  ctx.beginPath();
  ctx.moveTo(W * 0.5, horizonY + 4);
  ctx.bezierCurveTo(W * 0.62, horizonY - 20, W * 0.74, horizonY - 24, W * 0.86, horizonY - 12);
  ctx.bezierCurveTo(W * 0.93, horizonY - 5, W * 0.98, horizonY + 2, W, horizonY + 4);
  ctx.lineTo(W, horizonY + 18); ctx.lineTo(W * 0.5, horizonY + 18);
  ctx.closePath(); ctx.fill();

  // ground
  const ground = ctx.createLinearGradient(0, horizonY, 0, H);
  ground.addColorStop(0,   "rgba(210,225,235,0.75)");
  ground.addColorStop(1,   "rgba(180,200,215,0.35)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizonY, W, H - horizonY);
}

function drawGrid(ctx, W, H, traj, groundY, muzzleX, muzzleY, scaleX, scaleY, y0Physics) {
  // We draw a coordinate system rooted at ground level below the cannon
  // X axis = along the ground from cannon base
  // Y axis = vertical from ground up
  const originX = muzzleX; // x origin aligns with cannon
  const originY = groundY; // y origin = ground

  const gridColor = "rgba(255,255,255,0.22)";
  const labelColor = "rgba(255,255,255,0.65)";
  const axisColor = "rgba(255,255,255,0.5)";

  ctx.save();
  ctx.font = "11px Nunito, sans-serif";
  ctx.textAlign = "center";

  // How many meters fit on screen
  const metersRight = (W - originX - 20) / scaleX;
  const metersUp    = (originY - 20) / scaleY;

  const stepX = niceStep(metersRight / 6);
  const stepY = niceStep(metersUp / 5);

  // Vertical grid lines (X ticks)
  for (let mx = 0; mx <= metersRight + stepX; mx += stepX) {
    const px = originX + mx * scaleX;
    if (px > W - 10) break;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(px, 20); ctx.lineTo(px, originY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = labelColor;
    ctx.fillText(mx.toFixed(0), px, originY + 14);
  }

  // Horizontal grid lines (Y ticks)
  ctx.textAlign = "right";
  for (let my = 0; my <= metersUp + stepY; my += stepY) {
    const py = originY - my * scaleY;
    if (py < 15) break;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(originX, py); ctx.lineTo(W - 10, py); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = labelColor;
    ctx.fillText(my.toFixed(0), originX - 6, py + 4);
  }

  // X axis (ground line)
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(originX - 10, originY); ctx.lineTo(W - 10, originY); ctx.stroke();

  // Y axis (vertical at cannon)
  ctx.beginPath(); ctx.moveTo(originX, originY + 10); ctx.lineTo(originX, 20); ctx.stroke();

  // Axis arrows
  ctx.fillStyle = axisColor;
  // X arrow
  ctx.beginPath();
  ctx.moveTo(W - 10, originY);
  ctx.lineTo(W - 18, originY - 5);
  ctx.lineTo(W - 18, originY + 5);
  ctx.closePath(); ctx.fill();
  // Y arrow
  ctx.beginPath();
  ctx.moveTo(originX, 20);
  ctx.lineTo(originX - 5, 28);
  ctx.lineTo(originX + 5, 28);
  ctx.closePath(); ctx.fill();

  // Axis labels
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "bold 12px Nunito, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("x (m)", W - 8, originY - 8);
  ctx.textAlign = "center";
  ctx.fillText("y (m)", originX, 14);

  // y0 reference dashed line (initial height)
  if (y0Physics > 0) {
    const py0 = originY - y0Physics * scaleY;
    ctx.strokeStyle = "rgba(255,200,80,0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(originX - 10, py0); ctx.lineTo(originX + 60, py0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,200,80,0.8)";
    ctx.font = "10px Nunito, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`y₀=${y0Physics}m`, originX - 8, py0 - 4);
  }

  ctx.restore();
}

function niceStep(approx) {
  const pow = Math.pow(10, Math.floor(Math.log10(approx)));
  const norm = approx / pow;
  if (norm < 1.5) return pow;
  if (norm < 3.5) return 2 * pow;
  if (norm < 7.5) return 5 * pow;
  return 10 * pow;
}

// ─── COLUMN ──────────────────────────────────
function drawColumn(ctx, baseX, groundY, cannonY, colProgress) {
  if (colProgress <= 0) return;
  const colTop = groundY - (groundY - cannonY) * colProgress;
  const colW   = 22;
  const platW  = 80;
  const platH  = 14;

  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.beginPath();
  ctx.ellipse(baseX, groundY + 5, platW * 0.55, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // column body
  const colGrad = ctx.createLinearGradient(baseX - colW / 2, 0, baseX + colW / 2, 0);
  colGrad.addColorStop(0,   "#9aa8bc");
  colGrad.addColorStop(0.3, "#c8d0e0");
  colGrad.addColorStop(0.65,"#dde2ee");
  colGrad.addColorStop(1,   "#aab4c8");
  ctx.fillStyle = colGrad;
  ctx.beginPath();
  ctx.roundRect(baseX - colW / 2, colTop + platH / 2, colW, groundY - colTop - platH / 2, 4);
  ctx.fill();

  // column highlight stripe
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.roundRect(baseX - colW / 2 + 3, colTop + platH + 6, 4, groundY - colTop - platH - 14, 2);
  ctx.fill();

  // base foot
  const footGrad = ctx.createLinearGradient(baseX - platW * 0.4, 0, baseX + platW * 0.4, 0);
  footGrad.addColorStop(0,   "#8898b0");
  footGrad.addColorStop(0.4, "#bcc8d8");
  footGrad.addColorStop(0.7, "#ccd4e4");
  footGrad.addColorStop(1,   "#9aabb8");
  ctx.fillStyle = footGrad;
  ctx.beginPath();
  ctx.roundRect(baseX - platW * 0.4, groundY - 10, platW * 0.8, 10, [0, 0, 4, 4]);
  ctx.fill();
  ctx.fillStyle = "#c8d4e0";
  ctx.beginPath();
  ctx.ellipse(baseX, groundY - 10, platW * 0.4, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // wide platform cap on top
  const sideGrad = ctx.createLinearGradient(baseX - platW / 2, 0, baseX + platW / 2, 0);
  sideGrad.addColorStop(0,   "#9aa8bc");
  sideGrad.addColorStop(0.3, "#c8d0e0");
  sideGrad.addColorStop(0.7, "#dde4f0");
  sideGrad.addColorStop(1,   "#aab4c8");
  ctx.fillStyle = sideGrad;
  ctx.beginPath();
  ctx.roundRect(baseX - platW / 2, colTop, platW, platH, 4);
  ctx.fill();

  // platform top face ellipse
  const topGrad = ctx.createRadialGradient(baseX - 10, colTop, 2, baseX, colTop, platW / 2);
  topGrad.addColorStop(0,   "#eef0f8");
  topGrad.addColorStop(0.6, "#d8dce8");
  topGrad.addColorStop(1,   "#b8c0d0");
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.ellipse(baseX, colTop, platW / 2, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // rim
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(baseX, colTop, platW / 2, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// ─── CANNON ──────────────────────────────────
function drawCannon(ctx, pivotX, pivotY, angleDeg) {
  const rad = -(angleDeg * Math.PI) / 180;
  const barrelLen = 80;
  const barrelR = 9;

  // base oval
  const baseGrad = ctx.createRadialGradient(pivotX, pivotY + 36, 4, pivotX, pivotY + 36, 36);
  baseGrad.addColorStop(0, "#c8ccd8"); baseGrad.addColorStop(1, "#5a6878");
  ctx.fillStyle = baseGrad;
  ctx.beginPath(); ctx.ellipse(pivotX, pivotY + 38, 34, 11, 0, 0, Math.PI * 2); ctx.fill();

  // triangular mount
  const mGrad = ctx.createLinearGradient(pivotX - 26, pivotY, pivotX + 26, pivotY + 48);
  mGrad.addColorStop(0, "#c0c8d8"); mGrad.addColorStop(0.5, "#9aa8bc"); mGrad.addColorStop(1, "#7888a0");
  ctx.fillStyle = mGrad;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY - 4);
  ctx.lineTo(pivotX - 26, pivotY + 40);
  ctx.lineTo(pivotX + 26, pivotY + 40);
  ctx.closePath(); ctx.fill();

  // mount highlight
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY - 4); ctx.lineTo(pivotX - 8, pivotY + 40); ctx.lineTo(pivotX + 2, pivotY + 40);
  ctx.closePath(); ctx.fill();

  // pivot circle
  const pGrad = ctx.createRadialGradient(pivotX - 4, pivotY - 3, 2, pivotX, pivotY, 13);
  pGrad.addColorStop(0, "#dde0e8"); pGrad.addColorStop(1, "#5a6878");
  ctx.fillStyle = pGrad;
  ctx.beginPath(); ctx.arc(pivotX, pivotY, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#7a8898";
  ctx.beginPath(); ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2); ctx.fill();

  // barrel
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(rad);
  const bGrad = ctx.createLinearGradient(0, -barrelR, 0, barrelR);
  bGrad.addColorStop(0, "#b8c8d8"); bGrad.addColorStop(0.25, "#8898b8");
  bGrad.addColorStop(0.6, "#6070a0"); bGrad.addColorStop(1, "#3a4868");
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.roundRect(4, -barrelR, barrelLen, barrelR * 2, [barrelR, barrelR * 1.4, barrelR * 1.4, barrelR]);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath(); ctx.roundRect(8, -barrelR + 2, barrelLen - 12, 4, 2); ctx.fill();
  // muzzle
  const mGrad2 = ctx.createRadialGradient(barrelLen + 4, 0, 2, barrelLen + 4, 0, barrelR + 2);
  mGrad2.addColorStop(0, "#9aacbc"); mGrad2.addColorStop(1, "#4a5868");
  ctx.fillStyle = mGrad2;
  ctx.beginPath(); ctx.ellipse(barrelLen + 4, 0, 5, barrelR + 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a2030";
  ctx.beginPath(); ctx.ellipse(barrelLen + 5, 0, 3, barrelR - 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ─── MUZZLE TIP ──────────────────────────────
function getMuzzleTip(pivotX, pivotY, angleDeg) {
  const rad = -(angleDeg * Math.PI) / 180;
  return {
    mx: pivotX + Math.cos(rad) * 84,
    my: pivotY + Math.sin(rad) * 84,
  };
}

// ─── MAIN COMPONENT ──────────────────────────
export default function ProjectileSimulation() {
  const { lang } = useLang();
  const L = LABELS[lang];
  const canvasRef   = useRef(null);
  const animRef     = useRef(null);
  const colAnimRef  = useRef(null);
  const trajectoryRef = useRef([]);

  const [inputs, setInputs]       = useState(DEFAULT);
  const [result, setResult]       = useState(null);
  const [animStep, setAnimStep]   = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [colProgress, setColProgress] = useState(0); // 0..1

  const set = (k, v) => setInputs(p => ({ ...p, [k]: v }));

  // ── LAYOUT CALCULATIONS ──
  // Returns all the key positions given canvas size + y0 + angle
  const getLayout = useCallback((W, H, y0Phys, angleDeg) => {
    const groundY  = H * GROUND_FRAC;
    const cannonX  = W * CANNON_X_FRAC;

    // Max column height in canvas pixels (when y0 = MAX_Y0)
    const maxColPx = H * 0.38;
    const colHeightPx = (y0Phys / MAX_Y0) * maxColPx;

    // Cannon pivot sits on top of column (or on ground if y0=0)
    const cannonBaseY = groundY - colHeightPx - (colHeightPx > 0 ? 14 : 0); // 14 = platH
    const pivotX = cannonX;
    const pivotY = cannonBaseY - 42;

    const { mx, my } = getMuzzleTip(pivotX, pivotY, angleDeg);

    return { groundY, cannonX, colHeightPx, cannonBaseY, pivotX, pivotY, mx, my };
  }, []);

  // ── SCALE: pixels per meter ──
  const getScale = useCallback((W, H, traj, layout) => {
    if (!traj || traj.length === 0) return { scaleX: 1, scaleY: 1 };
    const maxX = Math.max(...traj.map(p => p.x), 1);
    const maxY = Math.max(...traj.map(p => p.y), inputs.y0, 1);
    const availW = W - layout.mx - 30;
    const availH = layout.groundY - 30;
    const scaleX = availW / maxX;
    const scaleY = availH / maxY;
    return { scaleX: Math.min(scaleX, scaleY), scaleY: Math.min(scaleX, scaleY) };
  }, [inputs.y0]);

  // Physics (x,y) → canvas pixel
  // Origin is at ground level directly below muzzle tip
  const toCanvas = useCallback((px, py, layout, scale) => {
    return {
      cx: layout.mx + px * scale.scaleX,
      cy: layout.groundY - py * scale.scaleY,
    };
  }, []);

  // ── MAIN DRAW ──
  const draw = useCallback((traj, step, canvas, y0Phys, angleDeg, colProg) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    drawBackground(ctx, W, H);

    const layout = getLayout(W, H, y0Phys, angleDeg);
    const scale  = getScale(W, H, traj, layout);

    // Grid (drawn before objects so it's behind everything)
    drawGrid(ctx, W, H, traj, layout.groundY, layout.mx, layout.my, scale.scaleX, scale.scaleY, y0Phys);

    // Column (animates up)
    drawColumn(ctx, layout.cannonX, layout.groundY, layout.cannonBaseY, colProg);

    // Cannon
    drawCannon(ctx, layout.pivotX, layout.pivotY, angleDeg);

    if (!traj || traj.length === 0) return;

    const visible = traj.slice(0, step + 1);

    // Ghost trajectory
    ctx.beginPath();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    traj.forEach((p, i) => {
      const { cx, cy } = toCanvas(p.x, p.y, layout, scale);
      i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Animated arc
    if (visible.length > 1) {
      // glow
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,220,120,0.22)";
      ctx.lineWidth = 10; ctx.lineCap = "round";
      visible.forEach((p, i) => {
        const { cx, cy } = toCanvas(p.x, p.y, layout, scale);
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // bright line
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,235,160,0.95)";
      ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255,220,100,0.9)"; ctx.shadowBlur = 12;
      visible.forEach((p, i) => {
        const { cx, cy } = toCanvas(p.x, p.y, layout, scale);
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      });
      ctx.stroke(); ctx.shadowBlur = 0;

      // ball
      const last = visible[visible.length - 1];
      const { cx: bx, cy: by } = toCanvas(last.x, last.y, layout, scale);
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#fff5d0";
      ctx.shadowColor = "rgba(255,220,80,1)"; ctx.shadowBlur = 20;
      ctx.fill(); ctx.shadowBlur = 0;

      // landing shadow
      if (step >= traj.length - 1) {
        const end = traj[traj.length - 1];
        const { cx: ex, cy: ey } = toCanvas(end.x, 0, layout, scale);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.beginPath(); ctx.ellipse(ex, ey, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Peak dashed line + label
    if (step >= traj.length - 1 && traj.length > 0) {
      const peakIdx = traj.reduce((b, p, i) => p.y > traj[b].y ? i : b, 0);
      const peak = traj[peakIdx];
      const { cx: peakX, cy: peakY } = toCanvas(peak.x, peak.y, layout, scale);
      const { cy: baseYc } = toCanvas(peak.x, 0, layout, scale);
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(peakX, peakY); ctx.lineTo(peakX, baseYc); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold 12px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${peak.y.toFixed(1)} m`, peakX, peakY - 10);
    }
  }, [getLayout, getScale, toCanvas]);

  // ── ANIMATION LOOP ──
  useEffect(() => {
    if (!isAnimating) return;
    const traj = trajectoryRef.current;
    if (animStep >= traj.length - 1) { setIsAnimating(false); return; }
    animRef.current = requestAnimationFrame(() =>
      setAnimStep(s => Math.min(s + 2, traj.length - 1))
    );
    return () => cancelAnimationFrame(animRef.current);
  }, [isAnimating, animStep]);

  // ── REDRAW on any relevant state change ──
  useEffect(() => {
    draw(trajectoryRef.current, animStep, canvasRef.current, inputs.y0, inputs.angle, colProgress);
  }, [animStep, draw, inputs.angle, inputs.y0, colProgress]);

  // ── COLUMN ANIMATION when y0 changes ──
  useEffect(() => {
    cancelAnimationFrame(colAnimRef.current);
    const targetProgress = inputs.y0 / MAX_Y0;
    const startTime = performance.now();
    const startProgress = colProgress;

    const animate = (now) => {
      const t = Math.min((now - startTime) / COLUMN_ANIM_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const current = startProgress + (targetProgress - startProgress) * eased;
      setColProgress(current);
      if (t < 1) colAnimRef.current = requestAnimationFrame(animate);
    };
    colAnimRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(colAnimRef.current);
  }, [inputs.y0]);

  // ── RESIZE ──
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw(trajectoryRef.current, animStep, canvas, inputs.y0, inputs.angle, colProgress);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const handleLaunch = () => {
    cancelAnimationFrame(animRef.current);
    const sim = runSimulation(inputs);
    trajectoryRef.current = sim.trajectory;
    setResult(sim);
    setAnimStep(0);
    setIsAnimating(true);
  };

  const handleReset = () => {
    cancelAnimationFrame(animRef.current);
    trajectoryRef.current = [];
    setResult(null);
    setAnimStep(0);
    setIsAnimating(false);
    draw([], 0, canvasRef.current, inputs.y0, inputs.angle, colProgress);
  };

  return (
    <div className="proj-fullpage">
      <canvas ref={canvasRef} className="proj-canvas" />

      {/* LEFT GLASS PANEL */}
      <div className="proj-glass proj-glass--left">
        <p className="glass-title">{L.title}</p>
        <div className="glass-inputs">
          <SliderInput label={L.v0}    unit="m/s"  min={1}   max={100} step={1}   value={inputs.v0}    onChange={v => set("v0", v)} />
          <SliderInput label={L.angle} unit="°"    min={1}   max={89}  step={1}   value={inputs.angle} onChange={v => set("angle", v)} />
          <SliderInput label={L.y0}    unit="m"    min={0}   max={100} step={1}   value={inputs.y0}    onChange={v => set("y0", v)} />
          <SliderInput label={L.g}     unit="m/s²" min={1}   max={25}  step={0.1} value={inputs.g}     onChange={v => set("g", v)} />
          <SliderInput label={L.mass}  unit="kg"   min={0.1} max={100} step={0.1} value={inputs.mass}  onChange={v => set("mass", v)} />
          <div className="glass-row">
            <span className="glass-label">{L.airRes}</span>
            <div className="toggle-row">
              <button className={`tog ${!inputs.airResistance ? "tog--on" : ""}`} onClick={() => set("airResistance", false)}>{L.no}</button>
              <button className={`tog ${inputs.airResistance  ? "tog--on" : ""}`} onClick={() => set("airResistance", true)}>{L.yes}</button>
            </div>
          </div>
          <div className="glass-row">
            <span className="glass-label">{L.dt}</span>
            <select className="glass-select" value={inputs.dt} onChange={e => set("dt", +e.target.value)}>
              <option value={0.001}>0.001 s</option>
              <option value={0.005}>0.005 s</option>
              <option value={0.01}>0.01 s</option>
              <option value={0.05}>0.05 s</option>
            </select>
          </div>
        </div>
        <div className="glass-actions">
          <button className="btn-launch" onClick={handleLaunch} disabled={isAnimating}>
            {isAnimating ? L.animating : `🚀 ${L.launch}`}
          </button>
          <button className="btn-reset" onClick={handleReset}>↺ {L.reset}</button>
        </div>
      </div>

      {/* BOTTOM RESULTS PANEL */}
      {result && (
        <div className="proj-glass proj-glass--bottom">
          <ResultItem icon="⏱" label={L.tof}     value={result.timeOfFlight.toFixed(2)}   unit={L.s} />
          <ResultItem icon="↑"  label={L.maxH}    value={result.maxHeight.toFixed(2)}      unit={L.m} />
          <ResultItem icon="↔" label={L.range}    value={result.range.toFixed(2)}          unit={L.m} />
          <ResultItem icon="💥" label={L.impactV} value={result.impactVelocity.toFixed(2)} unit={L.ms} />
        </div>
      )}
    </div>
  );
}

function SliderInput({ label, unit, min, max, step, value, onChange }) {
  return (
    <div className="glass-row glass-row--slider">
      <div className="glass-row-top">
        <span className="glass-label">{label}</span>
        <span className="glass-val">{value} <em>{unit}</em></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} />
    </div>
  );
}

function ResultItem({ icon, label, value, unit }) {
  return (
    <div className="result-item">
      <span className="result-icon">{icon}</span>
      <span className="result-label">{label}</span>
      <span className="result-value">{value} <em>{unit}</em></span>
    </div>
  );
}