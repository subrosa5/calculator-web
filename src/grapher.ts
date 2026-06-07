import { evaluate } from './evaluator';

interface View {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

interface GraphState {
  fn: string;
  view: View;
  dragging: boolean;
  dragStart: { x: number; y: number };
  dragView: View;
  mouse: { x: number; y: number } | null;
  error: string;
}

const state: GraphState = {
  fn: 'sin(x)',
  view: { xMin: -10, xMax: 10, yMin: -4, yMax: 4 },
  dragging: false,
  dragStart: { x: 0, y: 0 },
  dragView: { xMin: -10, xMax: 10, yMin: -4, yMax: 4 },
  mouse: null,
  error: '',
};

function toCanvas(wx: number, wy: number, W: number, H: number, v: View) {
  return {
    x: ((wx - v.xMin) / (v.xMax - v.xMin)) * W,
    y: H - ((wy - v.yMin) / (v.yMax - v.yMin)) * H,
  };
}

function toWorld(cx: number, cy: number, W: number, H: number, v: View) {
  return {
    x: v.xMin + (cx / W) * (v.xMax - v.xMin),
    y: v.yMin + ((H - cy) / H) * (v.yMax - v.yMin),
  };
}

function niceStep(range: number, ticks: number): number {
  const raw = range / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  if (norm < 1.5) return mag;
  if (norm < 3.5) return 2 * mag;
  if (norm < 7.5) return 5 * mag;
  return 10 * mag;
}

function draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  const W = canvas.width;
  const H = canvas.height;
  const v = state.view;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#060610';
  ctx.fillRect(0, 0, W, H);

  // Grid
  const stepX = niceStep(v.xMax - v.xMin, 8);
  const stepY = niceStep(v.yMax - v.yMin, 6);
  const startX = Math.ceil(v.xMin / stepX) * stepX;
  const startY = Math.ceil(v.yMin / stepY) * stepY;

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = startX; x <= v.xMax; x += stepX) {
    const { x: cx } = toCanvas(x, 0, W, H, v);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
  }
  for (let y = startY; y <= v.yMax; y += stepY) {
    const { y: cy } = toCanvas(0, y, W, H, v);
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  }
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = 'rgba(150,150,200,0.6)';
  ctx.font = '10px Share Tech Mono, monospace';
  ctx.textAlign = 'center';
  for (let x = startX; x <= v.xMax; x += stepX) {
    if (Math.abs(x) < stepX * 0.01) continue;
    const { x: cx, y: cy } = toCanvas(x, 0, W, H, v);
    const labelY = Math.min(Math.max(cy + 12, 12), H - 4);
    ctx.fillText(parseFloat(x.toPrecision(6)).toString(), cx, labelY);
  }
  ctx.textAlign = 'right';
  for (let y = startY; y <= v.yMax; y += stepY) {
    if (Math.abs(y) < stepY * 0.01) continue;
    const { x: cx, y: cy } = toCanvas(0, y, W, H, v);
    const labelX = Math.min(Math.max(cx - 4, 4), W - 4);
    ctx.fillText(parseFloat(y.toPrecision(6)).toString(), labelX, cy + 4);
  }

  // Axes
  const origin = toCanvas(0, 0, W, H, v);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, origin.y); ctx.lineTo(W, origin.y);
  ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, H);
  ctx.stroke();

  // Function curve
  if (!state.fn) return;

  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0, 255, 136, 0.4)';
  ctx.shadowBlur = 6;
  ctx.beginPath();

  const steps = W * 2;
  let penDown = false;

  for (let i = 0; i <= steps; i++) {
    const wx = v.xMin + (i / steps) * (v.xMax - v.xMin);
    try {
      const wy = evaluate(state.fn, true, { x: wx });
      if (!isFinite(wy) || Math.abs(wy) > 1e10) { penDown = false; continue; }
      const { x: cx, y: cy } = toCanvas(wx, wy, W, H, v);
      if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
      else ctx.lineTo(cx, cy);
    } catch {
      penDown = false;
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Crosshair
  if (state.mouse) {
    const world = toWorld(state.mouse.x, state.mouse.y, W, H, v);
    let fy: number | null = null;
    try { fy = evaluate(state.fn, true, { x: world.x }); } catch { /* ignore */ }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(state.mouse.x, 0); ctx.lineTo(state.mouse.x, H);
    ctx.moveTo(0, state.mouse.y); ctx.lineTo(W, state.mouse.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (fy !== null && isFinite(fy)) {
      const { x: fx, y: fcy } = toCanvas(world.x, fy, W, H, v);
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(fx, fcy, 4, 0, Math.PI * 2);
      ctx.fill();

      const label = `(${world.x.toFixed(3)}, ${fy.toFixed(3)})`;
      ctx.font = '11px Share Tech Mono, monospace';
      ctx.fillStyle = 'rgba(0,255,136,0.9)';
      ctx.textAlign = state.mouse.x > W / 2 ? 'right' : 'left';
      const lx = state.mouse.x > W / 2 ? state.mouse.x - 8 : state.mouse.x + 8;
      ctx.fillText(label, lx, Math.max(fcy - 10, 14));
    }
  }
}

export function initGrapher(): void {
  const canvas  = document.getElementById('graph-canvas')  as HTMLCanvasElement;
  const input   = document.getElementById('fn-input')       as HTMLInputElement;
  const btnPlot = document.getElementById('btn-plot')       as HTMLButtonElement;
  const errEl   = document.getElementById('graph-error')    as HTMLElement;

  const ctx = canvas.getContext('2d')!;

  function resize(): void {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width  = rect.width  || 280;
    canvas.height = rect.width  || 280;
    draw(canvas, ctx);
  }

  function plot(): void {
    state.fn = input.value.trim();
    state.error = '';
    errEl.textContent = '';
    try {
      evaluate(state.fn, true, { x: 0 });
    } catch (e) {
      state.error = e instanceof Error ? e.message : 'Ошибка';
      errEl.textContent = state.error;
    }
    draw(canvas, ctx);
  }

  btnPlot.addEventListener('click', plot);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') plot(); });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { x: wx, y: wy } = toWorld(mx, my, canvas.width, canvas.height, state.view);
    const factor = e.deltaY > 0 ? 1.15 : 0.87;
    const v = state.view;
    state.view = {
      xMin: wx + (v.xMin - wx) * factor,
      xMax: wx + (v.xMax - wx) * factor,
      yMin: wy + (v.yMin - wy) * factor,
      yMax: wy + (v.yMax - wy) * factor,
    };
    draw(canvas, ctx);
  }, { passive: false });

  canvas.addEventListener('mousedown', e => {
    state.dragging = true;
    state.dragStart = { x: e.offsetX, y: e.offsetY };
    state.dragView = { ...state.view };
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mousemove', e => {
    state.mouse = { x: e.offsetX, y: e.offsetY };
    if (state.dragging) {
      const dx = e.offsetX - state.dragStart.x;
      const dy = e.offsetY - state.dragStart.y;
      const v = state.dragView;
      const W = canvas.width;
      const H = canvas.height;
      const rangeX = v.xMax - v.xMin;
      const rangeY = v.yMax - v.yMin;
      state.view = {
        xMin: v.xMin - (dx / W) * rangeX,
        xMax: v.xMax - (dx / W) * rangeX,
        yMin: v.yMin + (dy / H) * rangeY,
        yMax: v.yMax + (dy / H) * rangeY,
      };
    }
    draw(canvas, ctx);
  });

  canvas.addEventListener('mouseup', () => {
    state.dragging = false;
    canvas.style.cursor = 'crosshair';
  });

  canvas.addEventListener('mouseleave', () => {
    state.mouse = null;
    state.dragging = false;
    canvas.style.cursor = 'crosshair';
    draw(canvas, ctx);
  });

  canvas.style.cursor = 'crosshair';

  new ResizeObserver(resize).observe(canvas.parentElement!);
  resize();
}
