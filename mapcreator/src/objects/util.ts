/** Fælles hjælp til tegnefunktionerne. */
export type RGB = [number, number, number];

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rgb = (c: RGB, a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const shift = (c: RGB, d: number): RGB => [c[0] + d, c[1] + d, c[2] + d];

/** Punkter på en uregelmæssig ellipse. */
export function blob(rx: number, ry: number, rough: number, n: number, r: () => number, cx = 0, cy = 0, rot = 0): [number, number][] {
  const pts: [number, number][] = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * rough;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}

/** Lukket, glat sti gennem midtpunkterne mellem punkterne. */
export function smooth(g: CanvasRenderingContext2D, pts: [number, number][]): void {
  const n = pts.length;
  g.beginPath();
  g.moveTo((pts[0]![0] + pts[n - 1]![0]) / 2, (pts[0]![1] + pts[n - 1]![1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  g.closePath();
}

export function polygon(g: CanvasRenderingContext2D, pts: [number, number][]): void {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

/** Bløde, runde pletter af én farve (fx tåge, lys). */
export function softDot(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: RGB, alpha: number): void {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgb(col, alpha));
  gr.addColorStop(1, rgb(col, 0));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

/** Træfarvet flade med planker, der løber langs x. */
export function planks(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: RGB, count: number, r: () => number): void {
  const ph = h / count;
  for (let i = 0; i < count; i++) {
    g.fillStyle = rgb(shift(base, (r() - 0.5) * 22));
    g.fillRect(x, y + i * ph, w, ph + 0.5);
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.fillRect(x, y + i * ph, w, Math.max(0.7, ph * 0.06));
    // årer
    g.strokeStyle = 'rgba(0,0,0,.10)';
    g.lineWidth = Math.max(0.5, ph * 0.04);
    g.beginPath();
    const yy = y + i * ph + ph * (0.3 + r() * 0.4);
    g.moveTo(x, yy);
    g.lineTo(x + w, yy + (r() - 0.5) * ph * 0.2);
    g.stroke();
  }
}
