import { mix, rgb, shift, type RGB } from '../util';
import { OUT, radial, type G, type Rnd } from '../pack2/helpers';

export { OUT, mix, rgb, shift };
export type { G, Rnd, RGB };

/** Fælles hjælp til pakke 8: alt tegnes set lige oppefra, med lys fra øverst til venstre. */

export const rr = (r: Rnd, a: number, b: number): number => a + r() * (b - a);
export const pickOf = <T>(r: Rnd, list: T[]): T => list[Math.floor(r() * list.length) % list.length]!;

/** Én rund kuppel (lysplet øverst til venstre, mørk nederst til højre) med kontur. */
export function dome(g: G, x: number, y: number, rx: number, ry: number, base: RGB, o: { lw?: number; hi?: number; lo?: number; rot?: number } = {}): void {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), o.rot ?? 0, 0, Math.PI * 2);
  g.fillStyle = radial(g, x, y, Math.max(rx, ry) * 1.05, [[0, rgb(shift(base, o.hi ?? 34))], [0.55, rgb(base)], [1, rgb(shift(base, -(o.lo ?? 44)))]], x - rx * 0.4, y - ry * 0.42, Math.max(rx, ry) * 0.05);
  g.fill();
  if (o.lw !== 0) {
    g.strokeStyle = 'rgba(22,12,6,.7)';
    g.lineWidth = o.lw ?? 1.2;
    g.stroke();
  }
}

/** Trækrone set oppefra: mørk bund, lapper af løv i lag, lysere øverst til venstre, løvprikker og kontur. */
export function canopy(g: G, r: Rnd, cx: number, cy: number, rad: number, base: RGB, o: { lobes?: number; squash?: number; dots?: number; dotCol?: RGB; rough?: number } = {}): void {
  const n = o.lobes ?? 9;
  const sq = o.squash ?? 1;
  const rough = o.rough ?? 0.18;
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.5;
    const d = rad * (0.5 + r() * 0.18);
    lobes.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * sq, rad * (0.38 + r() * 0.14)]);
  }
  // mørk underside med kontur
  g.beginPath();
  for (const [x, y, s] of lobes) {
    g.moveTo(x + s, y);
    g.ellipse(x, y, s, s * sq, 0, 0, Math.PI * 2);
  }
  g.moveTo(cx + rad * 0.6, cy);
  g.ellipse(cx, cy, rad * 0.6, rad * 0.6 * sq, 0, 0, Math.PI * 2);
  g.fillStyle = rgb(shift(base, -62));
  g.fill();
  g.strokeStyle = 'rgba(20,10,4,.75)';
  g.lineWidth = Math.max(1.2, rad * 0.03);
  g.stroke();
  // lapper sorteret, så de nederst til højre ligger nederst
  const ord = [...lobes].sort((p, q) => q[0] + q[1] - (p[0] + p[1]));
  for (const [x, y, s] of ord) {
    const k = ((x - cx) + (y - cy)) / (rad * 1.2);
    dome(g, x, y, s * (0.95 - rough * 0.3), s * sq * (0.95 - rough * 0.3), shift(base, -k * 16 + (r() - 0.5) * 12), { lw: 0, hi: 30, lo: 38 });
  }
  dome(g, cx - rad * 0.08, cy - rad * 0.1 * sq, rad * 0.48, rad * 0.48 * sq, shift(base, 6), { lw: 0, hi: 36, lo: 26 });
  // løv: lyse prikker oppe til venstre, mørke nede til højre
  const dots = o.dots ?? Math.round(rad * 1.6);
  const dc = o.dotCol ?? base;
  for (let i = 0; i < dots; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * rad * 0.9;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * sq;
    const lit = (-(x - cx) - (y - cy)) / (rad * 1.3);
    const s = rad * (0.03 + r() * 0.04);
    g.fillStyle = lit > 0 ? rgb(shift(dc, 22 + lit * 30), 0.55) : rgb(shift(dc, -34 + lit * 20), 0.5);
    g.beginPath();
    g.ellipse(x, y, s * 1.3, s, r() * 3, 0, 7);
    g.fill();
  }
}

/** Tykke streger fra et punkt (grene, rødder, ranker): mørk kontur og lys inderside. */
export function limb(g: G, pts: [number, number][], width: number, col: RGB): void {
  const trace = (): void => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  trace();
  g.strokeStyle = 'rgba(20,10,4,.8)';
  g.lineWidth = width + 1.8;
  g.stroke();
  trace();
  g.strokeStyle = rgb(shift(col, -14));
  g.lineWidth = width;
  g.stroke();
  g.save();
  g.translate(-width * 0.16, -width * 0.16);
  trace();
  g.strokeStyle = rgb(shift(col, 30), 0.75);
  g.lineWidth = Math.max(0.6, width * 0.35);
  g.stroke();
  g.restore();
}

import { blobPath, lin, polyPath, type Path } from '../pack2/helpers';

export type { Path };
export { blobPath, polyPath, lin, radial };

/** Vand i en sti: dybt midt i, lysere og grønnere ved kanten (lavvande), svage bølgestreger og lysglimt. */
export function waterFill(g: G, r: Rnd, path: Path, box: [number, number, number, number], deep: RGB = [40, 96, 128], shallow: RGB = [112, 176, 178], o: { ripples?: number; rim?: number } = {}): void {
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  g.save();
  path();
  g.clip();
  g.fillStyle = lin(g, x0, y0, x1, y1, [[0, rgb(shift(deep, 10))], [1, rgb(shift(deep, -14))]]);
  g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  const rim = o.rim ?? Math.min(x1 - x0, y1 - y0) * 0.16;
  for (let i = 0; i < 4; i++) {
    path();
    g.strokeStyle = rgb(shallow, 0.2 + i * 0.05);
    g.lineWidth = rim * (2.2 - i * 0.5);
    g.stroke();
  }
  // mørk skygge langs kanten øverst til venstre (bred bred) og lys nederst til højre
  g.save();
  g.translate(1.5, 1.5);
  path();
  g.strokeStyle = 'rgba(8,24,30,.35)';
  g.lineWidth = 3;
  g.stroke();
  g.restore();
  const n = o.ripples ?? 10;
  for (let i = 0; i < n; i++) {
    const x = cx + (r() - 0.5) * (x1 - x0) * 0.8;
    const y = cy + (r() - 0.5) * (y1 - y0) * 0.8;
    const s = 5 + r() * Math.min(x1 - x0, y1 - y0) * 0.1;
    g.strokeStyle = `rgba(220,245,250,${0.18 + r() * 0.2})`;
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(x, y, s, s * 0.4, 0, 0.2, 2.9);
    g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle = 'rgba(255,255,255,.45)';
    g.fillRect(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 2.2, 1);
  }
  g.restore();
  path();
  g.strokeStyle = 'rgba(14,32,34,.7)';
  g.lineWidth = 1.4;
  g.lineJoin = 'round';
  g.stroke();
}

/** Skum: små hvide bobler og korte streger i en retning, i en kasse. */
export function foam(g: G, r: Rnd, x: number, y: number, w: number, h: number, n: number, a = 0.8): void {
  for (let i = 0; i < n; i++) {
    const px = x + r() * w;
    const py = y + r() * h;
    const s = 1.2 + r() * Math.min(5, Math.max(w, h) * 0.04);
    g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '226,244,250'},${a * (0.45 + r() * 0.55)})`;
    g.beginPath();
    g.ellipse(px, py, s * (1 + r()), s, r() * 3, 0, 7);
    g.fill();
  }
}

/** En sten set oppefra (uregelmæssig, lys øverst til venstre). */
export function pebble(g: G, r: Rnd, x: number, y: number, s: number, base: RGB): void {
  const pts: [number, number][] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    const k = 0.78 + r() * 0.3;
    pts.push([x + Math.cos(a) * s * k, y + Math.sin(a) * s * k * 0.84]);
  }
  const p = blobPath(g, pts);
  p();
  g.fillStyle = lin(g, x - s, y - s, x + s, y + s, [[0, rgb(shift(base, 30))], [0.5, rgb(base)], [1, rgb(shift(base, -44))]]);
  g.fill();
  g.strokeStyle = 'rgba(20,12,6,.72)';
  g.lineWidth = Math.max(0.9, s * 0.1);
  g.stroke();
  g.fillStyle = 'rgba(255,248,230,.28)';
  g.beginPath();
  g.ellipse(x - s * 0.3, y - s * 0.3, s * 0.3, s * 0.2, -0.7, 0, 7);
  g.fill();
}

/** Siv/rør set oppefra: en lille sværm af spidse blade. */
export function reedTuft(g: G, r: Rnd, x: number, y: number, s: number, col: RGB = [96, 130, 60]): void {
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + r() * 0.5;
    const l = s * (0.7 + r() * 0.5);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.3) * l * 0.5, y + Math.sin(a + 0.3) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.strokeStyle = 'rgba(20,30,8,.7)';
    g.lineWidth = Math.max(1.5, s * 0.15);
    g.stroke();
    g.strokeStyle = rgb(shift(col, (r() - 0.5) * 40));
    g.lineWidth = Math.max(0.9, s * 0.09);
    g.stroke();
  }
}
