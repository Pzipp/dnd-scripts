import { mix, polygon, rgb, roundRect, shift, smooth, softDot, type RGB } from '../util';

/** Fælles hjælp til de ekstra genstande: flader med gradient, affasning (lys øverst til venstre) og kontur. */
export const OUT = 'rgba(20,10,5,.82)';
export type Box = [number, number, number, number];
export type Path = () => void;

export interface PaintOpts {
  lw?: number;
  /** Affasningens bredde (0 = ingen). */
  bevel?: number;
  light?: number;
  dark?: number;
  outline?: string | null;
  alpha?: number;
}

/** Fylder en sti med en lys-til-mørk gradient (lys øverst til venstre), affasning og mørk kontur. */
export function paint(g: CanvasRenderingContext2D, path: Path, base: RGB, box: Box, o: PaintOpts = {}): void {
  const lw = o.lw ?? 1.5;
  const [x0, y0, x1, y1] = box;
  path();
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, rgb(shift(base, o.light ?? 20), o.alpha ?? 1));
  gr.addColorStop(0.5, rgb(base, o.alpha ?? 1));
  gr.addColorStop(1, rgb(shift(base, -(o.dark ?? 28)), o.alpha ?? 1));
  g.fillStyle = gr;
  g.fill();
  const s = o.bevel ?? lw * 0.9;
  if (s > 0) {
    g.save();
    path();
    g.clip();
    g.translate(-s, -s);
    path();
    g.strokeStyle = 'rgba(0,0,0,.26)';
    g.lineWidth = s * 2;
    g.stroke();
    g.translate(s * 2, s * 2);
    path();
    g.strokeStyle = 'rgba(255,248,225,.3)';
    g.stroke();
    g.restore();
  }
  if (o.outline !== null) {
    path();
    g.strokeStyle = o.outline ?? OUT;
    g.lineWidth = lw;
    g.lineJoin = 'round';
    g.stroke();
  }
}

export function rectP(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number, base: RGB, o: PaintOpts = {}): void {
  paint(g, () => roundRect(g, x, y, w, h, rad), base, [x, y, x + w, y + h], o);
}

export function ellP(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, base: RGB, o: PaintOpts = {}): void {
  paint(
    g,
    () => {
      g.beginPath();
      g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    },
    base,
    [cx - rx, cy - ry, cx + rx, cy + ry],
    o,
  );
}

export function bounds(pts: [number, number][]): Box {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of pts) {
    a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y);
  }
  return [a, b, c, d];
}

export function polyP(g: CanvasRenderingContext2D, pts: [number, number][], base: RGB, o: PaintOpts = {}): void {
  paint(g, () => polygon(g, pts), base, bounds(pts), o);
}

export function blobP(g: CanvasRenderingContext2D, pts: [number, number][], base: RGB, o: PaintOpts = {}): void {
  paint(g, () => smooth(g, pts), base, bounds(pts), o);
}

/** Kugle med radial gradient og highlight (svampehatte, sække, krukker). */
export function sphere(g: CanvasRenderingContext2D, x: number, y: number, rad: number, base: RGB, lw = 1.2, ry = rad): void {
  const gr = g.createRadialGradient(x - rad * 0.35, y - ry * 0.4, rad * 0.05, x, y, rad * 1.05);
  gr.addColorStop(0, rgb(shift(base, 48)));
  gr.addColorStop(0.45, rgb(base));
  gr.addColorStop(1, rgb(shift(base, -48)));
  g.beginPath();
  g.ellipse(x, y, rad, ry, 0, 0, Math.PI * 2);
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = lw;
  g.stroke();
}

/** Bløde kontaktskygger under ting, der står på underlaget. */
export function contact(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.35): void {
  g.save();
  g.translate(x, y);
  g.scale(1, ry / rx);
  softDot(g, 0, 0, rx, [10, 5, 0], a);
  g.restore();
}

/** Små pletter i den aktuelle clip (struktur på sten, jord, træ). */
export function speckle(g: CanvasRenderingContext2D, r: () => number, box: Box, n: number, col: RGB, a: number, size: number): void {
  const [x0, y0, x1, y1] = box;
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    g.fillStyle = rgb(shift(col, (r() - 0.5) * 50), a * (0.5 + r() * 0.5));
    g.beginPath();
    g.ellipse(x, y, size * (0.4 + r()), size * (0.3 + r() * 0.7), r() * 3, 0, Math.PI * 2);
    g.fill();
  }
}

/** Sten set oppefra, delt i facetter, hvor hver facet lyses af mod øverst til venstre. */
export function facetStone(g: CanvasRenderingContext2D, rx: number, ry: number, r: () => number, base: RGB, n = 9, rough = 0.2, lw = 1.6): [number, number][] {
  const pts: [number, number][] = [];
  const rot = r() * 6;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.4;
    const k = 1 + (r() - 0.5) * 2 * rough;
    pts.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]);
  }
  const peak: [number, number] = [-rx * 0.12 + (r() - 0.5) * rx * 0.2, -ry * 0.12 + (r() - 0.5) * ry * 0.2];
  polygon(g, pts);
  g.fillStyle = rgb(base);
  g.fill();
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    const mx = (p[0] + q[0]) / 2 - peak[0];
    const my = (p[1] + q[1]) / 2 - peak[1];
    const l = Math.hypot(mx, my) || 1;
    const lit = -(mx / l) * 0.7 - (my / l) * 0.7; // -1..1 mod øverst til venstre
    polygon(g, [peak, p, q]);
    g.fillStyle = rgb(shift(base, lit * 46 + (r() - 0.5) * 8));
    g.fill();
  }
  polygon(g, pts);
  g.strokeStyle = OUT;
  g.lineWidth = lw;
  g.lineJoin = 'round';
  g.stroke();
  return pts;
}

export const lerpC = mix;
