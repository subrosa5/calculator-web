const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  '∑∏∫∂∇∆∞≈≠≤≥±√πφ∈∅∩∪⊕⊗' +
  '0123456789' +
  'sincostanloglnabs';

const ACCENT: Record<string, [number, number, number]> = {
  space:  [68,  102, 255],
  forest: [0,   255, 136],
  sunset: [255, 102, 34 ],
  ocean:  [34,  204, 238],
  violet: [170, 68,  255],
};

const FS = 14;

interface Drop {
  row:   number;
  speed: number;
  bright: number;
}

export function initMatrix(): void {
  const canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement;
  const ctx    = canvas.getContext('2d')!;

  let W = 0, H = 0;
  let drops: Drop[] = [];

  function resize(): void {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const cols = Math.floor(W / FS);
    drops = Array.from({ length: cols }, () => ({
      row:    -Math.floor(Math.random() * 60),
      speed:  0.3 + Math.random() * 0.7,
      bright: 0.4 + Math.random() * 0.6,
    }));
  }

  function accent(): [number, number, number] {
    const key = document.documentElement.dataset.color || 'forest';
    return ACCENT[key] ?? ACCENT.forest;
  }

  let last = 0;

  function frame(ts: number): void {
    const dt = Math.min(ts - last, 50);
    last = ts;

    const isDark = document.documentElement.dataset.theme !== 'light';

    // Fade overlay — ключ эффекта
    ctx.fillStyle = isDark
      ? 'rgba(8,8,18,0.055)'
      : 'rgba(238,238,248,0.07)';
    ctx.fillRect(0, 0, W, H);

    const [r, g, b] = accent();
    ctx.font = `${FS}px "Share Tech Mono", monospace`;

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const x = i * FS;
      const y = Math.floor(d.row) * FS;

      if (y < 0 || y > H + FS) {
        d.row += d.speed * dt * 0.06;
        if (d.row * FS > H + FS * 5) {
          d.row   = -Math.floor(Math.random() * 40 + 5);
          d.speed = 0.3 + Math.random() * 0.7;
          d.bright = 0.4 + Math.random() * 0.6;
        }
        continue;
      }

      // Ведущий символ — почти белый
      const leadOpacity = isDark ? 0.92 : 0.75;
      ctx.fillStyle = isDark
        ? `rgba(220,255,240,${leadOpacity * d.bright})`
        : `rgba(10,20,40,${leadOpacity * d.bright})`;
      ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, y);

      // Символ позади — цвет темы
      ctx.fillStyle = `rgba(${r},${g},${b},${0.55 * d.bright})`;
      ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, y - FS * 2);

      d.row += d.speed * dt * 0.06;

      if (d.row * FS > H + FS * 5) {
        d.row   = -Math.floor(Math.random() * 40 + 5);
        d.speed = 0.3 + Math.random() * 0.7;
        d.bright = 0.4 + Math.random() * 0.6;
      }
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(ts => { last = ts; requestAnimationFrame(frame); });
}
