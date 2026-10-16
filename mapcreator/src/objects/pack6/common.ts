import { rgb, shift, type RGB } from '../util';
import { crack, lin, mottle, mossPatch, polyBody, polyPath, radial, OUT, type G, type Rnd } from '../pack2/helpers';
import { mixc, rf, clamp, lerp } from '../pack4/common';

/** Fælles hjælp til pakke 6 (ruiner, helligdomme, lejre, fantasy): sten i lag, søjletromler, murstumper og skrå visning (lys øverst til venstre). */
export type { G, Rnd, RGB };
export { OUT, rf, clamp, lerp, mixc, rgb, shift, crack, mottle, mossPatch, polyBody, polyPath, radial, lin };
export type P = [number, number];

export const STONES: Record<string, RGB> = {
  grey: [150, 146, 138],
  sand: [194, 170, 126],
  dark: [96, 94, 102],
  mossy: [124, 130, 108],
  white: [212, 208, 198],
  red: [160, 108, 88],
};

export const stoneOptions = [
  { value: 'grey', label: 'Grå' },
  { value: 'sand', label: 'Sand' },
  { value: 'dark', label: 'Mørk' },
  { value: 'mossy', label: 'Mosgroet' },
  { value: 'white', label: 'Marmor' },
  { value: 'red', label: 'Rødlig' },
];

export const stoneOf = (name: string): RGB => STONES[name] ?? STONES.grey!;

/** Rotation af et punkt omkring (cx, cy). */
export const rot = (x: number, y: number, a: number, cx = 0, cy = 0): P => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
};

/** Retvinklet blok (let skæv) som polygon: x, y er midten. */
export function blockPts(r: Rnd, cx: number, cy: number, w: number, h: number, a = 0, jit = 0.06): P[] {
  const hw = w / 2;
  const hh = h / 2;
  const base: P[] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
  return base.map(([x, y]) => {
    const q = rot(x + (r() - 0.5) * jit * w, y + (r() - 0.5) * jit * h, a);
    return [cx + q[0], cy + q[1]] as P;
  });
}

/** En stenblok set skråt: sidefladen (dybde `d` nedad) og topfladen med gradient, slid og kontur. */
export function stoneBlock(g: G, r: Rnd, cx: number, cy: number, w: number, h: number, col: RGB, o: { a?: number; d?: number; moss?: number; chip?: number } = {}): void {
  const pts = blockPts(r, cx, cy, w, h, o.a ?? 0);
  const c = shift(col, (r() - 0.5) * 22);
  void o.d;
  polyBody(g, pts, c, { lw: 1.3, ao: Math.max(0.6, Math.min(w, h) * 0.1), light: 28, dark: 30 });
  if (o.chip !== 0 && w > 8) {
    g.save();
    polyPath(g, pts)();
    g.clip();
    mottle(g, r, [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], c, 4, Math.min(w, h) * 0.18, 16, 0.3);
    if (r() < 0.45) crack(g, r, cx + (r() - 0.5) * w * 0.6, cy + (r() - 0.5) * h * 0.5, Math.min(w, h) * 0.6, r() * 6.28, 0.7, false);
    g.restore();
  }
  if (o.moss && r() < o.moss) mossPatch(g, r, cx + (r() - 0.5) * w * 0.4, cy - h * 0.1, Math.min(w, h) * 0.45, 5);
}

/** Sammenstyrtet mur: række af blokke med huller og forskudte rækker. `len` langs x. */
export function wallRun(g: G, r: Rnd, x0: number, y0: number, len: number, thick: number, col: RGB, o: { gaps?: number; rows?: number; moss?: number; d?: number; a?: number } = {}): void {
  const rows = o.rows ?? Math.max(1, Math.round(thick / 12));
  const rh = thick / rows;
  const a = o.a ?? 0;
  for (let k = 0; k < rows; k++) {
    let x = 0;
    const off = k % 2 ? rh * 0.8 : 0;
    x -= off;
    while (x < len) {
      const bw = rh * rf(r, 1.4, 2.4);
      const w = Math.min(bw, len - Math.max(0, x));
      const bx = Math.max(0, x);
      const ww = x < 0 ? bw + x : w;
      x += bw;
      if (ww < rh * 0.5) continue;
      if (r() < (o.gaps ?? 0) * (0.5 + k / rows * 0.6)) continue;
      const q = rot(bx + ww / 2, k * rh + rh / 2 - thick / 2, a);
      stoneBlock(g, r, x0 + q[0], y0 + q[1], ww - 0.8, rh - 0.8, col, { a, d: o.d ?? rh * 0.25, moss: o.moss ?? 0.3 });
    }
  }
}

/** Murbrokker: kantede sten i en klynge. */
export function rubble(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, col: RGB, n: number, size: number): void {
  const items: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r());
    items.push({ x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, s: size * rf(r, 0.45, 1.2) });
  }
  items.sort((p, q) => p.y - q.y);
  for (const it of items) {
    const k = 5 + Math.floor(r() * 3);
    const pts: P[] = [];
    const rt = r() * 6.28;
    for (let i = 0; i < k; i++) {
      const a = rt + (i / k) * 6.283;
      const f = 0.7 + r() * 0.5;
      pts.push([it.x + Math.cos(a) * it.s * f, it.y + Math.sin(a) * it.s * f * 0.78]);
    }
    polyBody(g, pts, shift(col, (r() - 0.5) * 34), { lw: Math.max(0.7, it.s * 0.12), light: 34, dark: 34, ao: it.s * 0.2 });
  }
}

/** Søjletromle set oppefra: cirkel med fuge-ring, riller og let radial lysning (højden ses kun som lys og skygge). */
export function drum(g: G, r: Rnd, cx: number, cy: number, rad: number, _H: number, col: RGB, o: { flutes?: number; top?: boolean } = {}): void {
  g.beginPath();
  g.arc(cx, cy, rad, 0, Math.PI * 2);
  g.fillStyle = radial(g, cx, cy, rad, [[0, rgb(shift(col, 36))], [0.7, rgb(shift(col, 6))], [1, rgb(shift(col, -34))]], cx - rad * 0.3, cy - rad * 0.3, 1);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.stroke();
  const fl = o.flutes ?? 0;
  for (let i = 0; i < fl; i++) {
    const a = (i / fl) * 6.283;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * rad * 0.78, cy + Math.sin(a) * rad * 0.78);
    g.lineTo(cx + Math.cos(a) * rad * 0.96, cy + Math.sin(a) * rad * 0.96);
    g.strokeStyle = 'rgba(20,12,6,.3)';
    g.lineWidth = 1;
    g.stroke();
  }
  g.beginPath();
  g.arc(cx, cy, rad * 0.74, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(20,12,6,.22)';
  g.lineWidth = 1;
  g.stroke();
  void r;
  void o.top;
}

/** Græstotter og blade spredt i et område (planter i sprækker). */
export function tufts(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, n: number, col: RGB = [86, 124, 50]): void {
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const L = 3 + r() * 5;
    g.strokeStyle = rgb(mixc(col, [160, 180, 90], r()), 0.9);
    g.lineWidth = 0.9;
    for (let k = -1; k <= 1; k++) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + k * L * 0.4, y - L);
      g.stroke();
    }
  }
}

/** Fælles kasteskygge er slået fra i genstanden; denne tegner en lille mørk kontaktskygge under en ting (ikke indbagt skygge). */
export function contact(g: G, cx: number, cy: number, rx: number, ry: number, a = 0.28): void {
  g.fillStyle = `rgba(8,4,0,${a})`;
  g.beginPath();
  g.ellipse(cx + rx * 0.08, cy + ry * 0.12, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

export const base = { keepAspect: true as const, bleed: 0.05, layers: ['objects' as const, 'effects' as const] };

/** Blok set oppefra: kun topfladen (x, y, w × d) med fase, kantskygge mod nederst til højre og fuger. Højden `H` ses som en mørk kant (ingen sideflade). */
export function box(g: G, r: Rnd, x: number, y: number, w: number, d: number, H: number, col: RGB, o: { courses?: number; lw?: number; wear?: number } = {}): void {
  const lw = o.lw ?? 1.4;
  const e = Math.max(1.2, Math.min(4, H * 0.18));
  // kantskygge (højdens antydning)
  g.fillStyle = 'rgba(10,5,2,.4)';
  g.fillRect(x + e * 0.6, y + e * 0.9, w, d);
  polyBody(g, [[x, y], [x + w, y], [x + w, y + d], [x, y + d]], shift(col, 14), { lw, light: 30, dark: 26, ao: Math.max(1.2, Math.min(w, d) * 0.07) });
  g.save();
  g.beginPath();
  g.rect(x, y, w, d);
  g.clip();
  const rows = o.courses ?? 0;
  for (let k = 1; k < rows; k++) {
    g.fillStyle = 'rgba(14,8,4,.22)';
    g.fillRect(x, y + (k / rows) * d, w, 1);
  }
  mottle(g, r, [x, y, x + w, y + d], col, Math.round((w * d) / 120), 5, 18, 0.25);
  for (let i = 0; i < (o.wear ?? 1) * 2; i++) crack(g, r, x + r() * w, y + r() * d, Math.min(w, d) * 0.5, r() * 6.28, 0.7, false);
  g.restore();
}

/** Flamme med glød. */
export function flame(g: G, x: number, y: number, s: number, col: RGB = [255, 190, 70]): void {
  g.save();
  const gl = g.createRadialGradient(x, y, 0, x, y, s * 3.2);
  gl.addColorStop(0, rgb(col, 0.5));
  gl.addColorStop(1, rgb(col, 0));
  g.fillStyle = gl;
  g.fillRect(x - s * 3.2, y - s * 3.2, s * 6.4, s * 6.4);
  g.beginPath();
  g.moveTo(x, y - s * 1.5);
  g.quadraticCurveTo(x + s * 0.9, y - s * 0.2, x, y + s * 0.6);
  g.quadraticCurveTo(x - s * 0.9, y - s * 0.2, x, y - s * 1.5);
  g.fillStyle = rgb(mixc(col, [255, 255, 220], 0.45));
  g.fill();
  g.restore();
}

/** Lys (stearin) set skråt med flamme. */
export function candle(g: G, x: number, y: number, s: number, col: RGB = [236, 226, 196], flameCol: RGB = [255, 190, 70], lit = true): void {
  g.fillStyle = rgb(shift(col, -40));
  g.fillRect(x - s * 0.5, y, s, s * 1.6);
  g.fillStyle = rgb(col);
  g.beginPath();
  g.ellipse(x, y, s * 0.5, s * 0.3, 0, 0, 7);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 0.8;
  g.strokeRect(x - s * 0.5, y, s, s * 1.6);
  if (lit) flame(g, x, y - s * 0.8, s * 0.7, flameCol);
}

/** Vand: gradient, bølgeglimt og lys kant. Kaldes inden for en clip. */
export function water(g: G, r: Rnd, x0: number, y0: number, x1: number, y1: number, col: RGB = [66, 136, 168]): void {
  g.fillStyle = lin(g, x0, y0, x1, y1, [[0, rgb(shift(col, -26))], [0.5, rgb(col)], [1, rgb(shift(col, 22))]]);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const n = Math.max(3, Math.round(((x1 - x0) * (y1 - y0)) / 700));
  for (let i = 0; i < n; i++) {
    const x = rf(r, x0, x1);
    const y = rf(r, y0, y1);
    g.beginPath();
    g.ellipse(x, y, rf(r, 3, 9), rf(r, 1, 2.6), 0, 0, Math.PI * 2);
    g.strokeStyle = `rgba(230,248,255,${0.2 + r() * 0.3})`;
    g.lineWidth = 0.9;
    g.stroke();
  }
}
