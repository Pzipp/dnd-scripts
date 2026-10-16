import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { blobBody, blobPath, clipped, crack, ellipsePath, lin, mottle, polyBody, rectBody, rope, shift, wobble, type G, type RGB, type Rnd } from '../pack2/helpers';

const ROCK: Record<string, RGB> = { brown: [112, 92, 72], grey: [118, 114, 108], dark: [72, 64, 70] };
const tone = (o: DrawInput): RGB => ROCK[param(o, 'rock', 'brown')] ?? ROCK.brown!;
const rockParam = { key: 'rock', label: 'Klippe', type: 'select' as const, default: 'brown', options: [{ value: 'brown', label: 'Brun' }, { value: 'grey', label: 'Grå' }, { value: 'dark', label: 'Mørk' }] };

/** Klippekant langs en side: en uregelmæssig stribe sten. */
function rim(g: G, r: Rnd, x0: number, y0: number, x1: number, y1: number, depth: number, base: RGB, side: 1 | -1): void {
  const n = Math.max(6, Math.round(Math.hypot(x1 - x0, y1 - y0) / (depth * 0.9)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const pts = wobble(r, x + side * depth * (0.1 + r() * 0.25), y, depth * (0.6 + r() * 0.4), depth * (0.7 + r() * 0.35), 7, 0.28, r() * 6);
    polyBody(g, pts, shift(base, (r() - 0.5) * 26), { lw: 1.1, light: 24, dark: 30, ao: depth * 0.1 });
  }
}

/** Udhuggede trin set oppefra: trin skåret i klippen, mørkere (ned) eller lysere (op) i retning af enden. */
function carvedStairs(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const down = param(o, 'dir', 'down') === 'down';
  const n = Math.max(3, Math.round(param(o, 'steps', 8)));
  const base = tone(o);
  const edge = Math.min(w * 0.2, 16);
  // klippen langs siderne
  rim(g, r, -w / 2 + edge * 0.4, -h / 2, -w / 2 + edge * 0.4, h / 2, edge, base, 1);
  rim(g, r, w / 2 - edge * 0.4, -h / 2, w / 2 - edge * 0.4, h / 2, edge, base, -1);
  const x0 = -w / 2 + edge * 0.9;
  const x1 = w / 2 - edge * 0.9;
  const run = x1 - x0;
  const sh = h / n;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1 || 1);
    const k = down ? 0.35 + t * -0.9 : -0.55 + t * 0.95;
    const col = shift(base, 20 + k * 70);
    const y = -h / 2 + i * sh;
    rectBody(g, x0, y, run, sh + 0.5, 1, col, { lw: 1.2, light: 14, dark: 22, ao: sh * 0.18, rim: sh * 0.12 });
    // ujævn kant og slid
    clipped(g, () => { g.beginPath(); g.rect(x0, y, run, sh); }, () => mottle(g, r, [x0, y, x1, y + sh], col, 6, sh * 0.2, 12, 0.35));
  }
  // for ned: mørkt til sidst
  if (down) {
    g.fillStyle = lin(g, 0, h * 0.1, 0, h / 2, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.6)']]);
    g.fillRect(x0, h * 0.1, run, h * 0.4);
  } else {
    g.fillStyle = lin(g, 0, -h / 2, 0, -h * 0.1, [[0, 'rgba(255,238,200,.18)'], [1, 'rgba(255,238,200,0)']]);
    g.fillRect(x0, -h / 2, run, h * 0.4);
  }
  crack(g, r, -run * 0.2, -h * 0.2, h * 0.25, 1.4, 0.8, false);
}

function spiral(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const down = param(o, 'dir', 'down') === 'down';
  const n = 12;
  const base = tone(o);
  const rimP = blobPath(g, wobble(r, 0, 0, R, R, 16, 0.05));
  rimP();
  g.fillStyle = rgbOf(shift(base, -36));
  g.fill();
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const t = i / (n - 1);
    const col = shift(base, 24 + (down ? -t * 72 : t * 60 - 30));
    const p = () => {
      g.beginPath();
      g.moveTo(Math.cos(a0) * R * 0.22, Math.sin(a0) * R * 0.22);
      g.lineTo(Math.cos(a0) * R * 0.9, Math.sin(a0) * R * 0.9);
      g.arc(0, 0, R * 0.9, a0, a1);
      g.lineTo(Math.cos(a1) * R * 0.22, Math.sin(a1) * R * 0.22);
      g.arc(0, 0, R * 0.22, a1, a0, true);
      g.closePath();
    };
    p();
    g.fillStyle = rgbOf(col);
    g.fill();
    g.strokeStyle = 'rgba(14,8,4,.75)';
    g.lineWidth = 1.1;
    g.stroke();
  }
  ellipsePath(g, 0, 0, R * 0.22, R * 0.22)();
  g.fillStyle = rgbOf(shift(base, 8));
  g.fill();
  g.strokeStyle = 'rgba(14,8,4,.8)';
  g.lineWidth = 1.4;
  g.stroke();
  rimP();
  g.strokeStyle = 'rgba(14,8,4,.85)';
  g.lineWidth = 1.8;
  g.stroke();
}

const rgbOf = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

function ladderHole(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const base = tone(o);
  const ladder = param(o, 'ladder', true);
  blobBody(g, wobble(r, 0, 0, R, R, 12, 0.08), shift(base, 6), { lw: 1.6 });
  const hole = blobPath(g, wobble(r, 0, 0, R * 0.68, R * 0.68, 12, 0.08));
  hole();
  g.fillStyle = 'radial-gradient(black,black)';
  g.fillStyle = 'rgb(8,6,6)';
  g.fill();
  if (ladder) {
    g.strokeStyle = 'rgb(150,112,66)';
    g.lineWidth = Math.max(1.5, R * 0.08);
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * R * 0.26, -R * 0.62);
      g.lineTo(sx * R * 0.26, R * 0.62);
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(-R * 0.26, -R * 0.46 + i * R * 0.23);
      g.lineTo(R * 0.26, -R * 0.46 + i * R * 0.23);
      g.stroke();
    }
  }
  hole();
  g.strokeStyle = 'rgba(0,0,0,.9)';
  g.lineWidth = 2;
  g.stroke();
}

/** Revnet hul eller afgrund set oppefra. */
function pit(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const base = tone(o);
  const outer = wobble(r, 0, 0, w * 0.5, h * 0.5, 14, 0.22);
  blobBody(g, outer, shift(base, 4), { lw: 1.8, ao: 4 });
  const inner = blobPath(g, wobble(r, 0, 0, w * 0.4, h * 0.4, 14, 0.2));
  inner();
  g.fillStyle = 'rgb(4,3,4)';
  g.fill();
  clipped(g, inner, () => {
    // lidt kant der skinner ned i dybet
    g.strokeStyle = 'rgba(120,100,84,.35)';
    g.lineWidth = 3;
    inner();
    g.translate(2, 2);
    inner();
    g.stroke();
  });
  inner();
  g.strokeStyle = 'rgba(0,0,0,.95)';
  g.lineWidth = 2;
  g.stroke();
  for (let i = 0; i < 6; i++) crack(g, r, (r() - 0.5) * w * 0.9, (r() - 0.5) * h * 0.9, w * 0.12, r() * 6.28, 0.9, false);
}

function ropeBridge(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const broken = param(o, 'broken', false);
  const vertical = h >= w;
  g.save();
  if (!vertical) g.rotate(-Math.PI / 2);
  const W = vertical ? w : h;
  const L = vertical ? h : w;
  const n = Math.max(6, Math.round(L / (W * 0.34)));
  const pw = L / n;
  const gap = broken ? 1 + Math.floor(r() * 2) : -1;
  const start = Math.floor(n * (0.3 + r() * 0.4));
  for (let i = 0; i < n; i++) {
    if (i >= start && i < start + (gap < 0 ? 0 : gap + 1)) continue;
    const y = -L / 2 + i * pw;
    const wob = (r() - 0.5) * W * 0.05;
    rectBody(g, -W * 0.38 + wob, y + pw * 0.06, W * 0.76, pw * 0.88, 1, shift([130, 94, 58], (r() - 0.5) * 30), { lw: 1.1 });
  }
  for (const sx of [-1, 1]) {
    const pts: [number, number][] = [];
    for (let k = 0; k <= 8; k++) pts.push([sx * (W * 0.42 + Math.sin((k / 8) * Math.PI) * W * 0.04), -L / 2 + (k / 8) * L]);
    rope(g, pts, Math.max(2, W * 0.07));
  }
  // pæle i begge ender
  for (const sy of [-1, 1]) for (const sx of [-1, 1]) rectBody(g, sx * W * 0.45 - W * 0.06, sy * (L / 2 - W * 0.08) - W * 0.06, W * 0.12, W * 0.12, 1, [90, 64, 40], { lw: 1 });
  g.restore();
}

function stoneBridge(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const vertical = h >= w;
  g.save();
  if (!vertical) g.rotate(-Math.PI / 2);
  const W = vertical ? w : h;
  const L = vertical ? h : w;
  const base: RGB = [128, 124, 116];
  const n = Math.max(3, Math.round(L / (W * 0.7)));
  for (let i = 0; i < n; i++) {
    rectBody(g, -W * 0.36, -L / 2 + (i / n) * L, W * 0.72, L / n + 0.5, 1, shift(base, (r() - 0.5) * 18), { lw: 1.2 });
  }
  for (const sx of [-1, 1]) {
    const m = Math.max(5, Math.round(L / (W * 0.5)));
    for (let i = 0; i < m; i++) rectBody(g, sx * W * 0.44 - W * 0.08, -L / 2 + (i / m) * L, W * 0.16, L / m + 0.5, 1, shift(base, -14 + (r() - 0.5) * 18), { lw: 1.1 });
  }
  g.restore();
}

export const stairKinds: ObjectKind[] = [
  kind({
    key: 'stairs_carved', family: 'carved', name: 'Udhuggede trapper', w: 2, h: 3, keepAspect: false, shadow: 5, bleed: 0.06,
    params: [{ key: 'dir', label: 'Retning', type: 'select', default: 'down', options: [{ value: 'down', label: 'Ned' }, { value: 'up', label: 'Op' }] }, { key: 'steps', label: 'Trin', type: 'range', min: 3, max: 14, step: 1, default: 8 }, rockParam],
    draw: carvedStairs,
  }),
  kind({
    key: 'stairs_spiral_carved', family: 'carved', name: 'Udhugget vindeltrappe', w: 2.4, h: 2.4, shadow: 5, bleed: 0.05,
    params: [{ key: 'dir', label: 'Retning', type: 'select', default: 'down', options: [{ value: 'down', label: 'Ned' }, { value: 'up', label: 'Op' }] }, rockParam],
    draw: spiral,
  }),
  kind({ key: 'ladder_hole', family: 'carved', name: 'Skakt med stige', w: 1.3, h: 1.3, shadow: 3, bleed: 0.06, params: [{ key: 'ladder', label: 'Stige', type: 'toggle', default: true }, rockParam], draw: ladderHole }),
  kind({ key: 'pit_chasm', family: 'carved', name: 'Hul / afgrund', w: 2.5, h: 2.5, keepAspect: false, randomRotation: true, shadow: 0, bleed: 0.06, params: [rockParam], draw: pit }),
  kind({
    key: 'bridge_rope', family: 'carved', name: 'Rebbro', w: 1.2, h: 5, keepAspect: false, shadow: 6, bleed: 0.06,
    params: [{ key: 'broken', label: 'Brækkede planker', type: 'toggle', default: false }], draw: ropeBridge,
  }),
  kind({ key: 'bridge_stone', family: 'carved', name: 'Stenbro', w: 2, h: 5, keepAspect: false, shadow: 6, bleed: 0.06, draw: stoneBridge }),
];
