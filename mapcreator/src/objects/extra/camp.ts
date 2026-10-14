import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { blob, mix, rgb, rng, shift, softDot, type RGB } from '../util';
import { blobP, contact, ellP, OUT, polyP, sphere, speckle } from './helpers';

type G = CanvasRenderingContext2D;

const CANVAS: Record<string, RGB> = {
  sand: [214, 196, 150],
  green: [96, 124, 82],
  red: [168, 66, 54],
  grey: [150, 152, 150],
  blue: [84, 108, 156],
};

const tentParams = (stripes: boolean): ParamDef[] => {
  const p: ParamDef[] = [
    { key: 'color', label: 'Farve', type: 'select', default: 'sand', options: [{ value: 'sand', label: 'Sandfarvet' }, { value: 'green', label: 'Grøn' }, { value: 'red', label: 'Rød' }, { value: 'grey', label: 'Grå' }, { value: 'blue', label: 'Blå' }] },
    { key: 'open', label: 'Døren åben', type: 'toggle', default: true },
  ];
  if (stripes) p.push({ key: 'stripes', label: 'Striber', type: 'toggle', default: false });
  return p;
};

function peg(g: G, x: number, y: number, tx: number, ty: number): void {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(tx, ty);
  g.strokeStyle = 'rgba(60,44,28,.85)';
  g.lineWidth = 1.1;
  g.stroke();
  ellP(g, tx, ty, 1.8, 1.8, [110, 80, 48], { lw: 0.8, bevel: 0 });
}

/** Seams (sømme) og folder, der giver lærredet en malet struktur. */
function folds(g: G, r: () => number, x0: number, y0: number, x1: number, y1: number, n: number, vertical: boolean): void {
  g.strokeStyle = 'rgba(30,20,10,.13)';
  g.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    g.beginPath();
    if (vertical) {
      g.moveTo(x0 + (x1 - x0) * t, y0);
      g.quadraticCurveTo(x0 + (x1 - x0) * t + (r() - 0.5) * 6, (y0 + y1) / 2, x0 + (x1 - x0) * t, y1);
    } else {
      g.moveTo(x0, y0 + (y1 - y0) * t);
      g.quadraticCurveTo((x0 + x1) / 2, y0 + (y1 - y0) * t + (r() - 0.5) * 6, x1, y0 + (y1 - y0) * t);
    }
    g.stroke();
  }
}

function aframe(g: G, o: DrawInput, big: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const col = CANVAS[param(o, 'color', 'sand')] ?? CANVAS.sand!;
  const open = param(o, 'open', true);
  const bodyBottom = big ? h * 0.22 : h * 0.5;
  const top = -h * 0.5;
  const bw = big ? w * 0.5 : w * 0.5;
  if (big) {
    // pæle og tove til baldakinen
    for (const s of [-1, 1]) {
      peg(g, s * bw * 0.96, bodyBottom + h * 0.26, s * (bw * 1.12), bodyBottom + h * 0.32);
      peg(g, s * bw * 0.98, top + h * 0.05, s * (bw * 1.1), top - h * 0.0);
    }
  } else {
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) peg(g, sx * bw * 0.97, sy * h * 0.46, sx * (bw + 7), sy * (h * 0.5 + 3));
  }
  contact(g, w * 0.04, h * 0.03, bw * 1.1, h * 0.5, 0.0);
  const left: [number, number][] = [[0, top], [-bw, top + h * 0.035], [-bw, bodyBottom - h * 0.035], [0, bodyBottom]];
  const right: [number, number][] = [[0, top], [bw, top + h * 0.035], [bw, bodyBottom - h * 0.035], [0, bodyBottom]];
  polyP(g, left, shift(col, 16), { lw: Math.max(1.6, w * 0.02), bevel: 0, light: 6, dark: 16 });
  polyP(g, right, shift(col, -26), { lw: Math.max(1.6, w * 0.02), bevel: 0, light: 4, dark: 12 });
  g.save();
  g.beginPath();
  g.moveTo(0, top);
  g.lineTo(bw, top + h * 0.035);
  g.lineTo(bw, bodyBottom - h * 0.035);
  g.lineTo(0, bodyBottom);
  g.lineTo(-bw, bodyBottom - h * 0.035);
  g.lineTo(-bw, top + h * 0.035);
  g.closePath();
  g.clip();
  folds(g, r, 0, top, -bw, bodyBottom, 3, false);
  folds(g, r, 0, top, bw, bodyBottom, 3, false);
  speckle(g, r, [-bw, top, bw, bodyBottom], 50, col, 0.28, 1.4);
  // lappede pletter
  for (let i = 0; i < 2; i++) {
    const px = (r() > 0.5 ? 1 : -1) * bw * (0.3 + r() * 0.5), py = top + (bodyBottom - top) * (0.2 + r() * 0.6);
    g.fillStyle = rgb(shift(col, -18), 0.5);
    g.fillRect(px - 4, py - 3, 8, 6);
    g.strokeStyle = 'rgba(30,20,10,.45)';
    g.lineWidth = 0.7;
    g.setLineDash([1.5, 1.5]);
    g.strokeRect(px - 4, py - 3, 8, 6);
    g.setLineDash([]);
  }
  g.restore();
  // rygning
  g.beginPath();
  g.moveTo(0, top);
  g.lineTo(0, bodyBottom);
  g.strokeStyle = 'rgba(20,10,5,.7)';
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.moveTo(-1.4, top + 1);
  g.lineTo(-1.4, bodyBottom - 1);
  g.strokeStyle = 'rgba(255,248,225,.3)';
  g.lineWidth = 1;
  g.stroke();
  // dør i den ene ende
  const dh = h * (big ? 0.13 : 0.2);
  const dw = bw * 0.5;
  const door: [number, number][] = [[-dw, bodyBottom], [dw, bodyBottom], [dw * 0.12, bodyBottom - dh], [-dw * 0.12, bodyBottom - dh]];
  if (open) {
    polyP(g, door, [22, 16, 12], { lw: 1.4, bevel: 0, light: 0, dark: 0 });
    // omslåede flapper
    polyP(g, [[-dw, bodyBottom], [-dw * 0.12, bodyBottom - dh], [-dw * 0.78, bodyBottom - dh * 0.15]], shift(col, 24), { lw: 1.2, bevel: 0 });
    polyP(g, [[dw, bodyBottom], [dw * 0.12, bodyBottom - dh], [dw * 0.78, bodyBottom - dh * 0.15]], shift(col, -12), { lw: 1.2, bevel: 0 });
  } else {
    polyP(g, door, shift(col, 6), { lw: 1.4, bevel: 0 });
    g.beginPath();
    g.moveTo(0, bodyBottom);
    g.lineTo(0, bodyBottom - dh);
    g.strokeStyle = 'rgba(30,20,10,.65)';
    g.lineWidth = 1.2;
    g.stroke();
    for (const k of [0.35, 0.7]) {
      g.beginPath();
      g.moveTo(-3, bodyBottom - dh * k);
      g.lineTo(3, bodyBottom - dh * k);
      g.strokeStyle = 'rgba(90,60,30,.9)';
      g.lineWidth = 1.6;
      g.stroke();
    }
  }
  ellP(g, 0, top, 2.4, 2.4, [90, 62, 36], { lw: 1, bevel: 0 });
  if (big) {
    // baldakin over indgangen
    const cy0 = bodyBottom, cy1 = h * 0.5;
    const canopy: [number, number][] = [[-bw * 0.98, cy0], [bw * 0.98, cy0], [bw * 1.02, cy1], [-bw * 1.02, cy1]];
    polyP(g, canopy, shift(col, 8), { lw: Math.max(1.6, w * 0.02), bevel: 0, light: 14, dark: 22 });
    g.save();
    g.beginPath();
    g.rect(-bw, cy0, bw * 2, cy1 - cy0);
    g.clip();
    for (let i = 0; i < 6; i++) {
      if (i % 2) continue;
      g.fillStyle = rgb(shift(col, -30), 0.35);
      g.fillRect(-bw + (i * bw * 2) / 6, cy0, (bw * 2) / 6, cy1 - cy0);
    }
    folds(g, r, -bw, cy0, bw, cy1, 3, true);
    g.restore();
    for (const s of [-1, 1]) ellP(g, s * bw * 0.96, cy1 - 3, 2.8, 2.8, [100, 70, 40], { lw: 1, bevel: 0 });
    // dør under baldakin
    if (open) polyP(g, [[-dw * 0.7, bodyBottom], [dw * 0.7, bodyBottom], [dw * 0.7, bodyBottom - 0], [-dw * 0.7, bodyBottom]], [22, 16, 12], { lw: 0, outline: null, bevel: 0 });
  }
}

function roundTent(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const col = CANVAS[param(o, 'color', 'sand')] ?? CANVAS.sand!;
  const stripes = param(o, 'stripes', false);
  const open = param(o, 'open', true);
  const n = 12;
  const rim = R * 0.94;
  contact(g, R * 0.06, R * 0.08, rim * 1.05, rim * 1.0, 0.0);
  g.beginPath();
  g.arc(0, 0, rim, 0, 6.28);
  g.fillStyle = rgb(col);
  g.fill();
  const doorIdx = 0; // ved bunden
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI / 2 - (3.14 / n) + (i / n) * 6.28;
    const a1 = a0 + 6.28 / n;
    const am = (a0 + a1) / 2;
    const lit = -Math.cos(am) * 0.7 - Math.sin(am) * 0.7;
    let base = stripes && i % 2 ? mix(col, [236, 224, 196], 0.7) : col;
    const isDoor = i === doorIdx;
    const sag = R * 0.05;
    const pts = [
      [0, 0],
      [Math.cos(a0) * rim, Math.sin(a0) * rim],
      [Math.cos(am) * (rim - sag), Math.sin(am) * (rim - sag)],
      [Math.cos(a1) * rim, Math.sin(a1) * rim],
    ] as [number, number][];
    if (isDoor && open) {
      polyP(g, pts, [22, 16, 12], { lw: 1.3, bevel: 0 });
      // flapper
      const f0: [number, number][] = [[Math.cos(a0 + 0.04) * R * 0.28, Math.sin(a0 + 0.04) * R * 0.28], [Math.cos(a0) * rim, Math.sin(a0) * rim], [Math.cos(a0 - 0.4) * rim * 0.9, Math.sin(a0 - 0.4) * rim * 0.9]];
      const f1: [number, number][] = [[Math.cos(a1 - 0.04) * R * 0.28, Math.sin(a1 - 0.04) * R * 0.28], [Math.cos(a1) * rim, Math.sin(a1) * rim], [Math.cos(a1 + 0.4) * rim * 0.9, Math.sin(a1 + 0.4) * rim * 0.9]];
      polyP(g, f0, shift(col, 20), { lw: 1.2, bevel: 0 });
      polyP(g, f1, shift(col, -16), { lw: 1.2, bevel: 0 });
      continue;
    }
    base = shift(base, lit * 30);
    polyP(g, pts, base, { lw: Math.max(1.2, R * 0.018), bevel: 0, light: 10, dark: 12 });
    g.save();
    g.beginPath();
    pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.clip();
    speckle(g, r, [-R, -R, R, R], 8, base, 0.25, 1.4);
    g.restore();
  }
  // tagkant og top
  g.beginPath();
  g.arc(0, 0, rim, 0, 6.28);
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1.8, R * 0.03);
  g.stroke();
  ellP(g, 0, 0, R * 0.1, R * 0.1, shift(col, -30), { lw: 1.3, bevel: 0.6 });
  ellP(g, 0, 0, R * 0.04, R * 0.04, [100, 72, 44], { lw: 0.8, bevel: 0 });
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (i / n) * 6.28 - 3.14 / n;
    peg(g, Math.cos(a) * rim * 0.99, Math.sin(a) * rim * 0.99, Math.cos(a) * (rim + R * 0.05), Math.sin(a) * (rim + R * 0.05));
  }
}

const tentKinds: ObjectKind[] = [
  kind({ key: 'tent_small', family: 'tent', name: 'Lille telt', w: 2, h: 3, shadow: 6, bleed: 0.08, params: tentParams(false), draw: (g, o) => aframe(g, o, false) }),
  kind({ key: 'tent_large', family: 'tent', name: 'Stort telt', w: 3, h: 4, shadow: 8, bleed: 0.08, params: tentParams(false), draw: (g, o) => aframe(g, o, true) }),
  kind({ key: 'tent_round', family: 'tent', name: 'Rundt telt', w: 3, h: 3, randomRotation: false, shadow: 8, bleed: 0.06, params: tentParams(true), draw: roundTent }),
];

// ---------------------------------------------------------------- lejr

function rotRect(cx: number, cy: number, len: number, wid: number, ang: number, cut: number): [number, number][] {
  const c = Math.cos(ang), s = Math.sin(ang);
  const base: [number, number][] = [[-len / 2 + cut, -wid / 2], [len / 2 - cut, -wid / 2], [len / 2, -wid / 2 + cut], [len / 2, wid / 2 - cut], [len / 2 - cut, wid / 2], [-len / 2 + cut, wid / 2], [-len / 2, wid / 2 - cut], [-len / 2, -wid / 2 + cut]];
  return base.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as [number, number]);
}

function logSeats(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const n = param(o, 'count', 4);
  const pit = param(o, 'pit', true);
  if (pit) {
    softDot(g, 0, 0, R * 0.5, [20, 14, 10], 0.5);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 6.28 + 0.2;
      blobP(g, blob(R * 0.09, R * 0.075, 0.2, 7, r, Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3, a), mix([126, 122, 116], [96, 92, 88], r()), { lw: 1.2, bevel: 0.6 });
    }
    ellP(g, 0, 0, R * 0.2, R * 0.2, [52, 44, 40], { lw: 0.5, outline: null, bevel: 0 });
    speckle(g, r, [-R * 0.2, -R * 0.2, R * 0.2, R * 0.2], 14, [90, 84, 80], 0.6, 1.2);
  }
  const start = r() * 6.28;
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * 6.28 + (r() - 0.5) * 0.2;
    const d = R * 0.66;
    const len = Math.min(R * 0.75, ((6.28 * d) / n) * 0.82), wid = R * 0.24;
    const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
    const ang = a + Math.PI / 2;
    const pts = rotRect(cx, cy, len, wid, ang, wid * 0.22);
    contact(g, cx + R * 0.04, cy + R * 0.05, len * 0.6, wid * 0.7, 0.0);
    polyP(g, pts, [118, 82, 50], { lw: Math.max(1.4, R * 0.03), bevel: wid * 0.1, light: 22, dark: 34 });
    // barkfurer
    g.save();
    g.beginPath();
    pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.clip();
    g.strokeStyle = 'rgba(30,18,8,.4)';
    g.lineWidth = 1;
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let k = 0; k < 7; k++) {
      const off = (r() - 0.5) * wid * 0.85;
      const l0 = -len / 2 + r() * len * 0.2, l1 = len / 2 - r() * len * 0.2;
      g.beginPath();
      g.moveTo(cx + l0 * c - off * s, cy + l0 * s + off * c);
      g.lineTo(cx + l1 * c - off * s, cy + l1 * s + off * c);
      g.stroke();
    }
    g.restore();
    // savede ender med årringe
    for (const e of [-1, 1]) {
      const ex = cx + (e * (len / 2 - wid * 0.08)) * c, ey = cy + (e * (len / 2 - wid * 0.08)) * s;
      g.save();
      g.translate(ex, ey);
      g.rotate(ang);
      ellP(g, 0, 0, wid * 0.18, wid * 0.46, [196, 156, 104], { lw: 0.9, bevel: 0 });
      g.beginPath();
      g.ellipse(0, 0, wid * 0.08, wid * 0.24, 0, 0, 6.28);
      g.strokeStyle = 'rgba(100,64,30,.5)';
      g.lineWidth = 0.7;
      g.stroke();
      g.restore();
    }
  }
}

function cookStand(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const lit = param(o, 'lit', true);
  const rot = r() * 6.28;
  if (lit) softDot(g, 0, 0, R * 1.7, [255, 150, 60], 0.28);
  // stenring
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * 6.28;
    blobP(g, blob(R * 0.13, R * 0.11, 0.2, 7, r, Math.cos(a) * R * 0.52, Math.sin(a) * R * 0.52, a), mix([128, 124, 118], [94, 90, 86], r()), { lw: 1.2, bevel: 0.7 });
  }
  ellP(g, 0, 0, R * 0.44, R * 0.44, [40, 32, 28], { lw: 0, outline: null, bevel: 0 });
  if (lit) {
    softDot(g, 0, 0, R * 0.5, [255, 100, 20], 0.9);
    for (let i = 0; i < 5; i++) {
      const a = r() * 6.28;
      g.save();
      g.translate(Math.cos(a) * R * 0.34, Math.sin(a) * R * 0.34);
      g.scale(0.5, 0.5);
      g.beginPath();
      g.arc(0, 0, R * 0.12, 0, 6.28);
      g.fillStyle = 'rgba(255,170,40,.95)';
      g.fill();
      g.restore();
    }
  }
  // ben i trefod
  for (let i = 0; i < 3; i++) {
    const a = rot + (i / 3) * 6.28;
    const x = Math.cos(a) * R * 0.92, y = Math.sin(a) * R * 0.92;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(x, y);
    g.lineCap = 'round';
    g.strokeStyle = OUT;
    g.lineWidth = Math.max(3, R * 0.11);
    g.stroke();
    g.strokeStyle = 'rgb(112,78,46)';
    g.lineWidth = Math.max(2, R * 0.075);
    g.stroke();
    g.beginPath();
    g.moveTo(-0.7, -0.7);
    g.lineTo(x - 0.7, y - 0.7);
    g.strokeStyle = 'rgba(255,230,180,.3)';
    g.lineWidth = 1;
    g.stroke();
  }
  g.lineCap = 'butt';
  ellP(g, 0, 0, R * 0.09, R * 0.09, [60, 56, 54], { lw: 1, bevel: 0 });
  // gryde på kæde
  contact(g, R * 0.05, R * 0.07, R * 0.34, R * 0.34, 0.3);
  ellP(g, 0, 0, R * 0.34, R * 0.34, [60, 60, 64], { lw: Math.max(1.4, R * 0.06), bevel: R * 0.03 });
  const gr = g.createRadialGradient(-R * 0.08, -R * 0.08, 0, 0, 0, R * 0.26);
  gr.addColorStop(0, 'rgb(190,116,56)');
  gr.addColorStop(1, 'rgb(104,56,28)');
  g.beginPath();
  g.arc(0, 0, R * 0.26, 0, 6.28);
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.5)';
  g.lineWidth = 1;
  g.stroke();
  softDot(g, -R * 0.1, -R * 0.1, R * 0.1, [255, 255, 255], 0.2);
  g.beginPath();
  g.arc(0, 0, R * 0.4, -2.7, -0.4);
  g.strokeStyle = 'rgba(30,30,32,.85)';
  g.lineWidth = Math.max(1.4, R * 0.04);
  g.stroke();
  sphere(g, 0, 0, R * 0.04, [30, 30, 32], 0.5);
}

const campKinds: ObjectKind[] = [
  kind({
    key: 'log_seats', family: 'camp', name: 'Stammer som siddepladser', w: 3, h: 3, randomRotation: true, shadow: 4, bleed: 0.04,
    params: [
      { key: 'count', label: 'Antal stammer', type: 'range', min: 3, max: 6, step: 1, default: 4 },
      { key: 'pit', label: 'Ildsted i midten', type: 'toggle', default: true },
    ],
    draw: logSeats,
  }),
  kind({ key: 'cook_stand', family: 'camp', name: 'Grydestativ over bål', w: 2, h: 2, randomRotation: true, shadow: 5, bleed: 0.4, params: [{ key: 'lit', label: 'Tændt', type: 'toggle', default: true }], draw: cookStand }),
];

export const campExtraKinds: ObjectKind[] = [...tentKinds, ...campKinds];
