import type { LayerType, ParamValue } from '../../model/types';
import type { ParamDef } from '../registry';
import { mix, rgb, shift, type RGB } from '../util';
import { blobPath, clipped, crack, ellBody, lin, mottle, OUT, polyBody, radial, rectBody, rectPath, wobble, type G, type Rnd } from '../pack2/helpers';

/** Fælles hjælp til pakke 9: fælder, farer, magi og lys. Alt tegnes set lige oppefra, lys øverst til venstre. */
export type { G, Rnd, RGB, ParamDef, ParamValue };

/** Gulvfælder og pletter ligger på gulvet og må stå i effektlaget; flade ting har ingen skygge. */
export const FLOOR: LayerType[] = ['ground', 'objects', 'effects'];
export const FX: LayerType[] = ['effects', 'objects'];

/** Farvetemaer til magi og lys (kerne = lysest, kant = mætteste). */
export const GLOW: Record<string, { core: RGB; edge: RGB; label: string }> = {
  arcane: { core: [226, 210, 255], edge: [132, 88, 236], label: 'Arkan (violet)' },
  holy: { core: [255, 250, 214], edge: [248, 200, 88], label: 'Hellig (guld)' },
  fire: { core: [255, 236, 170], edge: [244, 96, 28], label: 'Ild (orange)' },
  frost: { core: [230, 250, 255], edge: [84, 176, 244], label: 'Is (blå)' },
  poison: { core: [226, 255, 190], edge: [96, 190, 48], label: 'Gift (grøn)' },
  blood: { core: [255, 190, 180], edge: [176, 24, 36], label: 'Blod (rød)' },
  nature: { core: [226, 255, 210], edge: [76, 178, 92], label: 'Natur (grøn)' },
  shadow: { core: [176, 150, 216], edge: [50, 24, 90], label: 'Skygge (mørk)' },
  lightning: { core: [255, 255, 240], edge: [120, 170, 255], label: 'Lyn (lyseblå)' },
};

export const glowOptions = Object.entries(GLOW).map(([value, v]) => ({ value, label: v.label }));
export const glowParam = (def: string): ParamDef => ({ key: 'glow', label: 'Farve', type: 'select', default: def, options: glowOptions });
export const glowOf = (o: { params: Record<string, ParamValue> }, def: string): { core: RGB; edge: RGB } => {
  const k = o.params.glow;
  return GLOW[typeof k === 'string' ? k : def] ?? GLOW[def]!;
};

export const stateParam = (def: string, opts: [string, string][], label = 'Tilstand'): ParamDef => ({
  key: 'state', label, type: 'select', default: def, options: opts.map(([value, l]) => ({ value, label: l })),
});

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Blød gløde (radial) i en farve; alfa falder jævnt til 0 ved kanten, så den aldrig afskæres. */
export function glow(g: G, x: number, y: number, r: number, col: RGB, a: number, ry = r): void {
  g.save();
  g.translate(x, y);
  g.scale(1, ry / r);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, rgb(col, a));
  gr.addColorStop(0.35, rgb(col, a * 0.55));
  gr.addColorStop(0.7, rgb(col, a * 0.16));
  gr.addColorStop(1, rgb(col, 0));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Stenflise/gulvflade med revner og pletter (kaldes med en kasse). */
export function slab(g: G, r: Rnd, x: number, y: number, w: number, h: number, base: RGB, o: { cracks?: number; rad?: number; moss?: boolean; seams?: boolean } = {}): void {
  const rad = o.rad ?? Math.min(w, h) * 0.05;
  rectBody(g, x, y, w, h, rad, base, { lw: Math.max(1.2, Math.min(w, h) * 0.025), ao: Math.min(w, h) * 0.04 });
  const path = rectPath(g, x, y, w, h, rad);
  clipped(g, path, () => {
    mottle(g, r, [x, y, x + w, y + h], base, 26, Math.min(w, h) * 0.07, 22, 0.32);
    for (let i = 0; i < (o.cracks ?? 2); i++) crack(g, r, x + r() * w, y + r() * h, Math.min(w, h) * (0.25 + r() * 0.3), r() * 6.3, Math.max(0.8, Math.min(w, h) * 0.014));
    if (o.moss) {
      for (let i = 0; i < 6; i++) {
        g.fillStyle = rgb([74 + r() * 30, 110 + r() * 30, 50], 0.4 + r() * 0.3);
        g.beginPath();
        g.ellipse(x + r() * w, y + (r() < 0.5 ? 0 : h), Math.min(w, h) * (0.06 + r() * 0.08), Math.min(w, h) * 0.05, r() * 3, 0, 7);
        g.fill();
      }
    }
  });
}

/** Mørkt hul med blød indre skygge (åben afgrund): tegner kun mørket; lys fra kanten giver dybde. */
export function voidHole(g: G, path: () => void, box: [number, number, number, number], depth = 1): void {
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.max(x1 - x0, y1 - y0) / 2;
  path();
  g.fillStyle = radial(g, cx, cy, R * 1.05, [[0, 'rgb(4,3,4)'], [0.55, 'rgb(12,9,10)'], [1, 'rgb(34,28,26)']], cx + R * 0.1, cy + R * 0.1, 0);
  g.fill();
  clipped(g, path, () => {
    // lys falder ind i øverste venstre kant, mørk skygge fra den modsatte kant
    g.save();
    g.translate(R * 0.07 * depth, R * 0.07 * depth);
    path();
    g.strokeStyle = 'rgba(0,0,0,.6)';
    g.lineWidth = R * 0.24;
    g.stroke();
    g.restore();
    g.save();
    g.translate(-R * 0.05, -R * 0.06);
    path();
    g.strokeStyle = 'rgba(150,130,104,.18)';
    g.lineWidth = R * 0.05;
    g.stroke();
    g.restore();
  });
  path();
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1.4, R * 0.04);
  g.lineJoin = 'round';
  g.stroke();
}

/** Uregelmæssig hulkant (ujævn rand af jord/sten omkring et hul). */
export function holePts(r: Rnd, rx: number, ry: number, rough = 0.07, n = 18): [number, number][] {
  return wobble(r, 0, 0, rx, ry, n, rough);
}

/** En spids pig/pæl set oppefra: lille metalkegle med glans (stikker op mod beskueren). */
export function spike(g: G, x: number, y: number, s: number, col: RGB = [176, 182, 194], len = 1): void {
  g.fillStyle = 'rgba(0,0,0,.4)';
  g.beginPath();
  g.arc(x + s * 0.18, y + s * 0.22, s * 1.05, 0, 7);
  g.fill();
  g.beginPath();
  g.arc(x, y, s, 0, 7);
  g.fillStyle = radial(g, x, y, s * 1.05, [[0, rgb(shift(col, 70))], [0.35, rgb(shift(col, 18))], [1, rgb(shift(col, -64))]], x - s * 0.32 * len, y - s * 0.34 * len, s * 0.02);
  g.fill();
  g.strokeStyle = 'rgba(16,8,4,.75)';
  g.lineWidth = Math.max(0.7, s * 0.14);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.beginPath();
  g.arc(x - s * 0.3, y - s * 0.32, s * 0.16, 0, 7);
  g.fill();
}

/** Rune: et par tilfældige, kantede streger i et 3x5-net. */
export function rune(g: G, x: number, y: number, s: number, r: Rnd, col: RGB, a = 0.9, lw = Math.max(0.8, s * 0.12)): void {
  g.save();
  g.translate(x, y);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) pts.push([(i % 3 - 1) * s * 0.34, (Math.floor(i / 3) * 2 - 1) * s * 0.5 + (r() - 0.5) * s * 0.1]);
  pts.push([0, 0], [0, -s * 0.5], [0, s * 0.5]);
  const n = 2 + Math.floor(r() * 3);
  g.beginPath();
  g.moveTo(0, -s * 0.5);
  g.lineTo(0, s * 0.5);
  for (let i = 0; i < n; i++) {
    const p = pts[Math.floor(r() * pts.length)]!;
    const q = pts[Math.floor(r() * pts.length)]!;
    g.moveTo(p[0], p[1]);
    g.lineTo(q[0], q[1]);
  }
  g.strokeStyle = rgb(col, a * 0.35);
  g.lineWidth = lw * 2.6;
  g.stroke();
  g.strokeStyle = rgb(mix(col, [255, 255, 255], 0.45), a);
  g.lineWidth = lw;
  g.stroke();
  g.restore();
}

/** Kredsløb af runer (eller tegn) rundt om en ring. */
export function runeRing(g: G, rad: number, n: number, s: number, r: Rnd, col: RGB, a = 0.9): void {
  for (let i = 0; i < n; i++) {
    const an = (i / n) * Math.PI * 2;
    g.save();
    g.translate(Math.cos(an) * rad, Math.sin(an) * rad);
    g.rotate(an + Math.PI / 2);
    rune(g, 0, 0, s, r, col, a);
    g.restore();
  }
}

/** Glødende streg (to lag: bred blød og smal lys) langs en sti. */
export function glowStroke(g: G, trace: () => void, w: number, col: RGB, core: RGB, a = 0.9): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  trace();
  g.strokeStyle = rgb(col, a * 0.22);
  g.lineWidth = w * 4;
  g.stroke();
  trace();
  g.strokeStyle = rgb(col, a * 0.5);
  g.lineWidth = w * 2;
  g.stroke();
  trace();
  g.strokeStyle = rgb(core, a);
  g.lineWidth = w;
  g.stroke();
}

export const ring = (g: G, rad: number, ry = rad) => () => {
  g.beginPath();
  g.ellipse(0, 0, Math.max(0.1, rad), Math.max(0.1, ry), 0, 0, Math.PI * 2);
};

export const polyRing = (g: G, rad: number, n: number, rot = -Math.PI / 2) => () => {
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    if (i) g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath();
};

/** Stjerne ({n}/{k}) som sti. */
export const starPath = (g: G, rad: number, n: number, k: number, rot = -Math.PI / 2) => () => {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = rot + ((i * k) / n) * Math.PI * 2;
    if (i) g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
};

export { blobPath, clipped, crack, ellBody, lin, mix, mottle, OUT, polyBody, radial, rectBody, rgb, shift, wobble };
