import { rgb, shift, type RGB } from '../util';
import {
  body, clipped, crack, ellBody, ellipsePath, lin, mottle, OUT, polyBody, polyPath, radial, rectBody, rectPath, rivet, woodGrain, blobPath, wobble,
  type G, type Path, type Rnd,
} from '../pack2/helpers';

/** Fælles hjælp til pack11: mønter, ædelsten, barrer, knogler, spind og andre småting. Alt tegnes set straks oppefra, lys fra øverst til venstre. */
export type { G, Path, Rnd, RGB };
export { body, clipped, crack, ellBody, ellipsePath, lin, mottle, OUT, polyBody, polyPath, radial, rectBody, rectPath, rivet, woodGrain, blobPath, wobble, rgb, shift };

export const TAU = Math.PI * 2;
export const GOLD: RGB = [232, 184, 52];
export const SILVER: RGB = [196, 202, 212];
export const COPPER: RGB = [190, 110, 62];
export const IRON: RGB = [104, 106, 114];
export const WOOD: RGB = [138, 94, 52];
export const WOOD_DARK: RGB = [90, 58, 34];
export const BONE: RGB = [222, 212, 184];
export const STONE: RGB = [132, 128, 122];
export const STONE_DARK: RGB = [88, 84, 82];
export const BLOOD: RGB = [120, 18, 16];

export const rf = (r: Rnd, a: number, b: number): number => a + r() * (b - a);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const pick = <T>(r: Rnd, list: T[]): T => list[Math.floor(r() * list.length) % list.length]!;

/** Metalfarve efter navn. */
export function metal(name: string): RGB {
  return name === 'silver' ? SILVER : name === 'copper' ? COPPER : name === 'iron' ? IRON : GOLD;
}

/** Mørk, blød "ambient occlusion" på jorden under en bunke. */
export function groundDark(g: G, cx: number, cy: number, rx: number, ry: number, a = 0.5): void {
  g.fillStyle = radial(g, cx, cy, Math.max(rx, ry), [[0, `rgba(12,6,2,${a})`], [0.7, `rgba(12,6,2,${a * 0.8})`], [1, 'rgba(12,6,2,0)']]);
  g.save();
  g.translate(cx, cy);
  g.scale(1, ry / Math.max(rx, ry));
  g.beginPath();
  g.arc(0, 0, Math.max(rx, ry), 0, TAU);
  g.restore();
  g.save();
  g.translate(cx, cy);
  g.scale(1, ry / Math.max(rx, ry));
  g.translate(-cx, -cy);
  g.beginPath();
  g.arc(cx, cy, Math.max(rx, ry), 0, TAU);
  g.fill();
  g.restore();
}

/** Mønt set oppefra. `sq` < 1 gør den til en tilt ellipse (mønten ligger på skrå i bunken). */
export function coin(g: G, x: number, y: number, r: number, col: RGB, sq = 1, rot = 0): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(1, sq);
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fillStyle = radial(g, 0, 0, r * 1.05, [[0, rgb(shift(col, 48))], [0.55, rgb(col)], [1, rgb(shift(col, -46))]], -r * 0.35, -r * 0.35, r * 0.05);
  g.fill();
  g.lineWidth = Math.max(0.7, r * 0.17);
  g.strokeStyle = 'rgba(34,18,4,.85)';
  g.stroke();
  if (r > 3) {
    g.beginPath();
    g.arc(0, 0, r * 0.66, 0, TAU);
    g.strokeStyle = rgb(shift(col, -40), 0.55);
    g.lineWidth = Math.max(0.5, r * 0.11);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.82, 3.4, 4.9);
    g.strokeStyle = 'rgba(255,250,224,.75)';
    g.lineWidth = Math.max(0.5, r * 0.13);
    g.stroke();
  }
  g.restore();
}

export interface HeapOpts {
  /** Mønternes radius i px. */
  coinR?: number;
  /** Ekstra metaller blandet i. */
  mixWith?: RGB[];
  /** Hvor kantet bunkens omrids er (0..1). */
  rough?: number;
  /** Rotation af hele bunken. */
  rot?: number;
}

/** Bunke af mønter: yderste først, midten sidst; blød lys øverst til venstre og skygge nederst til højre. */
export function coinHeap(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, n: number, col: RGB, o: HeapOpts = {}): void {
  const cr = o.coinR ?? Math.max(3, Math.min(rx, ry) * 0.12);
  const rough = o.rough ?? 0.1;
  groundDark(g, cx + rx * 0.05, cy + ry * 0.08, rx * 1.12, ry * 1.12, 0.5);
  const lump = wobble(r, 0, 0, 1, 1, 9, rough);
  const cs: { x: number; y: number; d: number; c: RGB; sq: number; rot: number; s: number }[] = [];
  const pal = [col, ...(o.mixWith ?? [])];
  for (let i = 0; i < n; i++) {
    const a = r() * TAU;
    // jævn fordeling over fladen, lidt tungere mod midten
    const d = Math.pow(r(), 0.55);
    const k = 1 + (lump[Math.floor(((a / TAU) * lump.length) % lump.length)]![0] - 1) * 0.3;
    const x = cx + Math.cos(a) * d * rx * k * (1 - cr / Math.max(rx, 1) * 0.6);
    const y = cy + Math.sin(a) * d * ry * k * (1 - cr / Math.max(ry, 1) * 0.6);
    cs.push({ x, y, d, c: pick(r, pal), sq: 0.62 + r() * 0.38, rot: r() * TAU, s: 0.85 + r() * 0.3 });
  }
  cs.sort((a, b) => b.d - a.d);
  for (const c of cs) {
    const h = 1 - c.d;
    const lightDir = (-(c.x - cx) / rx - (c.y - cy) / ry) * 7;
    coin(g, c.x, c.y, cr * c.s, shift(c.c, h * 26 - 16 + lightDir + (r() - 0.5) * 22), c.sq, c.rot);
  }
  // samlet lys og skygge over bunken
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx * 1.1, ry * 1.1, 0, 0, TAU);
  g.clip();
  g.fillStyle = lin(g, cx - rx, cy - ry, cx + rx, cy + ry, [[0, 'rgba(255,240,180,.22)'], [0.45, 'rgba(255,240,180,0)'], [0.75, 'rgba(30,14,0,.1)'], [1, 'rgba(30,14,0,.34)']]);
  g.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4);
  g.restore();
  // glimt
  const gl = Math.max(2, Math.round(n / 14));
  for (let i = 0; i < gl; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r()) * 0.75;
    sparkle(g, cx + Math.cos(a) * d * rx - rx * 0.06, cy + Math.sin(a) * d * ry - ry * 0.08, cr * (0.5 + r() * 0.7));
  }
}

/** Fire-takket glimt. */
export function sparkle(g: G, x: number, y: number, s: number, a = 0.9): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = `rgba(255,252,236,${a})`;
  g.beginPath();
  g.moveTo(0, -s);
  g.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0);
  g.quadraticCurveTo(s * 0.12, s * 0.12, 0, s);
  g.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0);
  g.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s);
  g.fill();
  g.restore();
}

/** Ædelsten set oppefra: facetteret polygon, hvor hver facet får lys efter retning mod øverst til venstre. */
export function gem(g: G, x: number, y: number, r: number, col: RGB, rot = 0, sides = 6): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const outer: [number, number][] = [];
  const inner: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TAU;
    outer.push([Math.cos(a) * r, Math.sin(a) * r]);
    inner.push([Math.cos(a + 0.2) * r * 0.5, Math.sin(a + 0.2) * r * 0.5]);
  }
  g.lineJoin = 'round';
  // facetter mellem kant og bord
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    const am = ((i + 0.5) / sides) * TAU + rot;
    const light = Math.cos(am - Math.PI * 1.25);
    g.beginPath();
    g.moveTo(outer[i]![0], outer[i]![1]);
    g.lineTo(outer[j]![0], outer[j]![1]);
    g.lineTo(inner[j]![0], inner[j]![1]);
    g.lineTo(inner[i]![0], inner[i]![1]);
    g.closePath();
    g.fillStyle = rgb(shift(col, light * 56 - 6));
    g.fill();
    // trekanter mod bordets hjørner
    const t = (i + 0.5) % sides;
    void t;
  }
  // bord
  g.beginPath();
  inner.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.fillStyle = lin(g, -r * 0.5, -r * 0.5, r * 0.5, r * 0.5, [[0, rgb(shift(col, 66))], [1, rgb(shift(col, -4))]]);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = Math.max(0.4, r * 0.06);
  g.stroke();
  // kontur
  g.beginPath();
  outer.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.strokeStyle = rgb(shift(col, -88), 0.9);
  g.lineWidth = Math.max(0.7, r * 0.14);
  g.stroke();
  g.restore();
  if (r > 3.4) sparkle(g, x - r * 0.3, y - r * 0.32, r * 0.5);
}

export const GEM_COLORS: RGB[] = [[196, 28, 52], [32, 140, 70], [46, 92, 200], [226, 200, 60], [150, 48, 190], [40, 190, 200], [240, 240, 250], [236, 120, 40]];

/** Barre set oppefra: skrå sider (mørk kant) og lys top med glans. */
export function ingot(g: G, x: number, y: number, w: number, h: number, rot: number, col: RGB): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const rad = Math.min(w, h) * 0.2;
  const base = rectPath(g, -w / 2, -h / 2, w, h, rad);
  base();
  g.fillStyle = lin(g, -w / 2, -h / 2, w / 2, h / 2, [[0, rgb(shift(col, -4))], [1, rgb(shift(col, -64))]]);
  g.fill();
  const iw = w * 0.76;
  const ih = h * 0.6;
  const top = rectPath(g, -iw / 2 - w * 0.03, -ih / 2 - h * 0.05, iw, ih, rad * 0.7);
  top();
  g.fillStyle = lin(g, -iw / 2, -ih / 2, iw / 2, ih / 2, [[0, rgb(shift(col, 54))], [0.5, rgb(col)], [1, rgb(shift(col, -22))]]);
  g.fill();
  g.strokeStyle = 'rgba(255,250,224,.55)';
  g.lineWidth = Math.max(0.5, h * 0.05);
  g.beginPath();
  g.moveTo(-iw / 2 - w * 0.03 + rad * 0.5, -ih / 2 - h * 0.05 + 0.5);
  g.lineTo(iw / 2 - w * 0.03 - rad * 0.5, -ih / 2 - h * 0.05 + 0.5);
  g.stroke();
  base();
  g.strokeStyle = 'rgba(30,16,4,.85)';
  g.lineWidth = Math.max(0.8, h * 0.09);
  g.stroke();
  g.restore();
}

/** Skjold set oppefra (rund) med bule, kant og beslag. */
export function roundShield(g: G, r: Rnd, x: number, y: number, rad: number, col: RGB, rim: RGB = IRON): void {
  g.save();
  g.translate(x, y);
  g.rotate(r() * TAU);
  g.beginPath();
  g.arc(0, 0, rad, 0, TAU);
  g.fillStyle = radial(g, 0, 0, rad * 1.05, [[0, rgb(shift(col, 38))], [0.7, rgb(col)], [1, rgb(shift(col, -46))]], -rad * 0.3, -rad * 0.3, rad * 0.05);
  g.fill();
  // planker/tværdeling
  g.save();
  g.clip();
  g.strokeStyle = 'rgba(20,10,4,.35)';
  g.lineWidth = Math.max(0.6, rad * 0.04);
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(-rad, i * rad * 0.34);
    g.lineTo(rad, i * rad * 0.34);
    g.stroke();
  }
  g.restore();
  g.beginPath();
  g.arc(0, 0, rad * 0.92, 0, TAU);
  g.strokeStyle = rgb(rim);
  g.lineWidth = rad * 0.14;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, rad * 0.92, 3.4, 4.9);
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.lineWidth = rad * 0.05;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, rad, 0, TAU);
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1, rad * 0.06);
  g.stroke();
  // bule
  g.beginPath();
  g.arc(0, 0, rad * 0.26, 0, TAU);
  g.fillStyle = radial(g, 0, 0, rad * 0.27, [[0, rgb(shift(rim, 66))], [1, rgb(shift(rim, -34))]], -rad * 0.08, -rad * 0.08, 0.5);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(0.8, rad * 0.04);
  g.stroke();
  g.restore();
}

/** Sværd set oppefra (liggende langs x): klinge, parérstang, greb og knop. */
export function sword(g: G, x: number, y: number, len: number, rot: number, blade: RGB = [206, 212, 222], guard: RGB = GOLD, grip: RGB = [88, 40, 28]): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const bw = len * 0.055;
  const bl = len * 0.7;
  // klinge
  g.beginPath();
  g.moveTo(-len / 2 + len * 0.25, -bw);
  g.lineTo(-len / 2 + len * 0.25 + bl * 0.88, -bw);
  g.lineTo(-len / 2 + len * 0.25 + bl, 0);
  g.lineTo(-len / 2 + len * 0.25 + bl * 0.88, bw);
  g.lineTo(-len / 2 + len * 0.25, bw);
  g.closePath();
  g.fillStyle = lin(g, 0, -bw, 0, bw, [[0, rgb(shift(blade, 50))], [0.48, rgb(blade)], [0.52, rgb(shift(blade, -30))], [1, rgb(shift(blade, -56))]]);
  g.fill();
  g.strokeStyle = 'rgba(24,14,8,.85)';
  g.lineWidth = Math.max(0.8, len * 0.012);
  g.stroke();
  g.beginPath();
  g.moveTo(-len / 2 + len * 0.28, 0);
  g.lineTo(-len / 2 + len * 0.25 + bl * 0.85, 0);
  g.strokeStyle = 'rgba(30,30,40,.35)';
  g.lineWidth = Math.max(0.5, len * 0.01);
  g.stroke();
  // greb
  g.fillStyle = rgb(grip);
  g.fillRect(-len / 2 + len * 0.05, -bw * 0.62, len * 0.2, bw * 1.24);
  g.strokeStyle = 'rgba(20,8,4,.8)';
  g.lineWidth = 0.8;
  g.strokeRect(-len / 2 + len * 0.05, -bw * 0.62, len * 0.2, bw * 1.24);
  // parérstang
  const gx = -len / 2 + len * 0.25;
  g.beginPath();
  g.roundRect?.(gx - len * 0.022, -bw * 2.3, len * 0.044, bw * 4.6, len * 0.012);
  if (!g.roundRect) g.rect(gx - len * 0.022, -bw * 2.3, len * 0.044, bw * 4.6);
  g.fillStyle = lin(g, gx, -bw * 2.3, gx, bw * 2.3, [[0, rgb(shift(guard, 46))], [1, rgb(shift(guard, -44))]]);
  g.fill();
  g.strokeStyle = 'rgba(30,16,4,.85)';
  g.stroke();
  // knop
  g.beginPath();
  g.arc(-len / 2 + len * 0.035, 0, bw * 1.1, 0, TAU);
  g.fillStyle = radial(g, -len / 2 + len * 0.035, 0, bw * 1.2, [[0, rgb(shift(guard, 60))], [1, rgb(shift(guard, -40))]], -len / 2 + len * 0.03, -bw * 0.4, 0.4);
  g.fill();
  g.stroke();
  g.restore();
}

/** Kranie set oppefra (rundt kranium, kæbe og tænder skimtes nederst, øjenhuler som mørke buer). */
export function skull(g: G, x: number, y: number, s: number, rot = 0, col: RGB = BONE): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  // kæbe
  g.beginPath();
  g.ellipse(0, s * 0.5, s * 0.34, s * 0.3, 0, 0, TAU);
  g.fillStyle = rgb(shift(col, -26));
  g.fill();
  g.strokeStyle = 'rgba(36,24,12,.85)';
  g.lineWidth = Math.max(0.7, s * 0.06);
  g.stroke();
  // kranium
  g.beginPath();
  g.ellipse(0, 0, s * 0.5, s * 0.58, 0, 0, TAU);
  g.fillStyle = radial(g, 0, 0, s * 0.62, [[0, rgb(shift(col, 30))], [0.6, rgb(col)], [1, rgb(shift(col, -52))]], -s * 0.18, -s * 0.22, s * 0.04);
  g.fill();
  g.stroke();
  // øjenhuler
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(sx * s * 0.2, s * 0.34, s * 0.14, s * 0.1, sx * 0.25, 0, TAU);
    g.fillStyle = 'rgba(14,8,4,.88)';
    g.fill();
  }
  // næse
  g.beginPath();
  g.moveTo(0, s * 0.4);
  g.lineTo(-s * 0.04, s * 0.54);
  g.lineTo(s * 0.04, s * 0.54);
  g.closePath();
  g.fillStyle = 'rgba(14,8,4,.8)';
  g.fill();
  // tænder
  g.strokeStyle = 'rgba(34,22,10,.7)';
  g.lineWidth = Math.max(0.4, s * 0.025);
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * s * 0.07, s * 0.6);
    g.lineTo(i * s * 0.07, s * 0.72);
    g.stroke();
  }
  // sømme
  g.strokeStyle = 'rgba(60,44,24,.55)';
  g.lineWidth = Math.max(0.4, s * 0.025);
  g.beginPath();
  g.moveTo(0, -s * 0.52);
  g.quadraticCurveTo(s * 0.05, -s * 0.1, 0, s * 0.2);
  g.moveTo(-s * 0.4, -s * 0.12);
  g.quadraticCurveTo(0, -s * 0.2, s * 0.4, -s * 0.12);
  g.stroke();
  g.restore();
}

/** Knogle liggende fra a til b med runde ender. */
export function bone(g: G, x0: number, y0: number, x1: number, y1: number, wd: number, col: RGB = BONE): void {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const L = Math.hypot(x1 - x0, y1 - y0);
  g.save();
  g.translate(x0, y0);
  g.rotate(a);
  g.beginPath();
  g.moveTo(0, -wd * 0.36);
  g.lineTo(L, -wd * 0.36);
  g.lineTo(L, wd * 0.36);
  g.lineTo(0, wd * 0.36);
  g.closePath();
  g.fillStyle = lin(g, 0, -wd * 0.4, 0, wd * 0.4, [[0, rgb(shift(col, 30))], [0.5, rgb(col)], [1, rgb(shift(col, -46))]]);
  g.fill();
  for (const [ex, sgn] of [[0, -1], [L, 1]] as const) {
    for (const sy of [-1, 1]) {
      g.beginPath();
      g.arc(ex + sgn * wd * 0.1, sy * wd * 0.34, wd * 0.34, 0, TAU);
      g.fillStyle = rgb(shift(col, sy < 0 ? 12 : -14));
      g.fill();
    }
  }
  g.strokeStyle = 'rgba(40,28,12,.8)';
  g.lineWidth = Math.max(0.6, wd * 0.12);
  g.beginPath();
  g.moveTo(0, -wd * 0.36);
  g.lineTo(L, -wd * 0.36);
  g.moveTo(0, wd * 0.36);
  g.lineTo(L, wd * 0.36);
  g.stroke();
  for (const ex of [0, L]) {
    g.beginPath();
    g.arc(ex, -wd * 0.34, wd * 0.34, Math.PI * 0.5, Math.PI * 1.5 + (ex ? -Math.PI : 0));
    g.stroke();
    g.beginPath();
    g.arc(ex, wd * 0.34, wd * 0.34, -Math.PI * 0.5 - (ex ? 0 : -Math.PI), Math.PI * 0.5 - (ex ? 0 : -Math.PI));
    g.stroke();
  }
  g.restore();
}

/** Ribbensbue set oppefra (som en lille hvælving af ribben). */
export function ribcage(g: G, x: number, y: number, s: number, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const yy = -s * 0.4 + i * s * 0.2;
    const wd = s * (0.46 - Math.abs(i - 1.5) * 0.06);
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(side * s * 0.04, yy);
      g.quadraticCurveTo(side * wd * 1.1, yy - s * 0.04, side * wd, yy + s * 0.12);
      g.strokeStyle = 'rgba(40,28,12,.85)';
      g.lineWidth = s * 0.075;
      g.stroke();
      g.strokeStyle = rgb(BONE);
      g.lineWidth = s * 0.05;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,240,.4)';
      g.lineWidth = s * 0.015;
      g.translate(-0.5, -0.5);
      g.stroke();
      g.translate(0.5, 0.5);
    }
  }
  g.beginPath();
  g.moveTo(0, -s * 0.5);
  g.lineTo(0, s * 0.5);
  g.strokeStyle = 'rgba(40,28,12,.85)';
  g.lineWidth = s * 0.075;
  g.stroke();
  g.strokeStyle = rgb(shift(BONE, -6));
  g.lineWidth = s * 0.05;
  g.stroke();
  g.restore();
}

/** Spindelvæv med radiale tråde og spiral, tegnet inden for en cirkel (delvist klippet af `frac`). */
export function web(g: G, r: Rnd, cx: number, cy: number, rad: number, spokes = 10, rings = 5, a = 0.7): void {
  g.save();
  g.lineCap = 'round';
  const ang: number[] = [];
  for (let i = 0; i < spokes; i++) ang.push((i / spokes) * TAU + (r() - 0.5) * 0.25);
  const lens = ang.map(() => rad * (0.82 + r() * 0.18));
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = pass ? `rgba(250,248,240,${a})` : 'rgba(30,26,22,.4)';
    g.lineWidth = pass ? 0.8 : 1.5;
    const o = pass ? 0 : 0.6;
    g.beginPath();
    for (let i = 0; i < spokes; i++) {
      g.moveTo(cx + o, cy + o);
      g.lineTo(cx + Math.cos(ang[i]!) * lens[i]! + o, cy + Math.sin(ang[i]!) * lens[i]! + o);
    }
    for (let k = 1; k <= rings; k++) {
      const f = k / (rings + 0.4);
      for (let i = 0; i < spokes; i++) {
        const j = (i + 1) % spokes;
        const ra = lens[i]! * f;
        const rb = lens[j]! * f;
        const x0 = cx + Math.cos(ang[i]!) * ra;
        const y0 = cy + Math.sin(ang[i]!) * ra;
        const x1 = cx + Math.cos(ang[j]!) * rb;
        const y1 = cy + Math.sin(ang[j]!) * rb;
        const mx = (x0 + x1) / 2 - (cx - (x0 + x1) / 2) * 0.12;
        const my = (y0 + y1) / 2 - (cy - (y0 + y1) / 2) * 0.12;
        g.moveTo(x0 + o, y0 + o);
        g.quadraticCurveTo(mx + o, my + o, x1 + o, y1 + o);
      }
    }
    g.stroke();
  }
  g.restore();
}

/** Krukke/gryde set oppefra: ydre rand, indre mørk mund og indhold tegnes af `fill`. */
export function potTop(g: G, cx: number, cy: number, rad: number, col: RGB, lipW: number, fill: (inner: number) => void): void {
  g.beginPath();
  g.arc(cx, cy, rad, 0, TAU);
  g.fillStyle = radial(g, cx, cy, rad * 1.05, [[0, rgb(shift(col, 24))], [0.7, rgb(col)], [1, rgb(shift(col, -46))]], cx - rad * 0.35, cy - rad * 0.35, rad * 0.1);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1, rad * 0.06);
  g.stroke();
  const inner = rad - lipW;
  g.beginPath();
  g.arc(cx, cy, inner, 0, TAU);
  g.fillStyle = 'rgba(10,5,2,.92)';
  g.fill();
  g.save();
  g.beginPath();
  g.arc(cx, cy, inner, 0, TAU);
  g.clip();
  fill(inner);
  // indre skygge fra kanten øverst til venstre
  g.beginPath();
  g.arc(cx, cy, inner, 0, TAU);
  g.strokeStyle = 'rgba(8,4,0,.55)';
  g.lineWidth = Math.max(1.5, rad * 0.1);
  g.save();
  g.translate(rad * 0.04, rad * 0.05);
  g.stroke();
  g.restore();
  g.restore();
  g.beginPath();
  g.arc(cx, cy, inner, 0, TAU);
  g.strokeStyle = 'rgba(14,8,2,.85)';
  g.lineWidth = Math.max(0.8, rad * 0.04);
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, rad - lipW * 0.35, 3.4, 4.9);
  g.strokeStyle = 'rgba(255,248,224,.4)';
  g.lineWidth = Math.max(0.6, lipW * 0.25);
  g.stroke();
}

/** Lille ildglimt/glød (lysende plet). */
export function glow(g: G, x: number, y: number, rad: number, col: RGB, a = 0.6): void {
  g.fillStyle = radial(g, x, y, rad, [[0, rgb(col, a)], [0.5, rgb(col, a * 0.4)], [1, rgb(col, 0)]]);
  g.beginPath();
  g.arc(x, y, rad, 0, TAU);
  g.fill();
}

/** Blodpøl: uregelmæssig, mørk og blank med lys kant. */
export function bloodPool(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, a = 0.9): void {
  const path = blobPath(g, wobble(r, cx, cy, rx, ry, 9, 0.26, r() * 3));
  path();
  g.fillStyle = `rgba(104,12,12,${a})`;
  g.fill();
  clipped(g, path, () => {
    g.fillStyle = radial(g, cx, cy, Math.max(rx, ry), [[0, 'rgba(170,24,20,.55)'], [1, 'rgba(60,4,4,.3)']], cx - rx * 0.2, cy - ry * 0.2, 1);
    g.fillRect(cx - rx * 1.4, cy - ry * 1.4, rx * 2.8, ry * 2.8);
    g.fillStyle = 'rgba(255,200,190,.4)';
    g.beginPath();
    g.ellipse(cx - rx * 0.3, cy - ry * 0.35, rx * 0.22, ry * 0.1, -0.5, 0, TAU);
    g.fill();
  });
  path();
  g.strokeStyle = 'rgba(50,4,4,.7)';
  g.lineWidth = 1.2;
  g.stroke();
}

/** Stearinlys/lysestage-lys set oppefra: lille voksskive med flamme. */
export function candle(g: G, x: number, y: number, rad: number, lit = true, wax: RGB = [236, 226, 196]): void {
  g.beginPath();
  g.arc(x, y, rad, 0, TAU);
  g.fillStyle = radial(g, x, y, rad * 1.1, [[0, rgb(shift(wax, 18))], [1, rgb(shift(wax, -50))]], x - rad * 0.3, y - rad * 0.3, 0.3);
  g.fill();
  g.strokeStyle = 'rgba(40,28,14,.8)';
  g.lineWidth = Math.max(0.6, rad * 0.16);
  g.stroke();
  if (lit) {
    glow(g, x, y, rad * 3.4, [255, 190, 80], 0.42);
    g.fillStyle = 'rgba(255,210,100,.95)';
    g.beginPath();
    g.arc(x, y, rad * 0.55, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,250,220,.95)';
    g.beginPath();
    g.arc(x - rad * 0.08, y - rad * 0.08, rad * 0.28, 0, TAU);
    g.fill();
  } else {
    g.fillStyle = 'rgba(30,20,10,.9)';
    g.beginPath();
    g.arc(x, y, rad * 0.14, 0, TAU);
    g.fill();
  }
}

/** Rød stjerne-/blodrune: bruges til kulttegn. Tegner en pentagram med runde ender. */
export function pentagram(g: G, cx: number, cy: number, rad: number, col: string, lw: number, circle = true): void {
  g.save();
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (circle) {
    g.beginPath();
    g.arc(cx, cy, rad, 0, TAU);
    g.stroke();
  }
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + ((i * 2) % 5) * (TAU / 5);
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  g.restore();
}
