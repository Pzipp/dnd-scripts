import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rgb, rng, roundRect, shift, softDot, type RGB } from '../util';
import { contact, ellP, OUT, paint, polyP, rectP, sphere, speckle } from './helpers';

type G = CanvasRenderingContext2D;
const WOOD: RGB = [150, 108, 66];
const STONE: RGB = [128, 124, 118];
const IRON: RGB = [66, 66, 70];

/** Murværk: rækker af sten med fuger inden for en rektangel. */
function masonry(g: G, x: number, y: number, w: number, h: number, base: RGB, rows: number, r: () => number): void {
  const rh = h / rows;
  for (let i = 0; i < rows; i++) {
    const n = Math.max(2, Math.round(w / (rh * 1.8)));
    const bw = w / n;
    const off = i % 2 ? bw / 2 : 0;
    for (let k = -1; k <= n; k++) {
      const bx = x + k * bw + off;
      const x0 = Math.max(x, bx), x1 = Math.min(x + w, bx + bw);
      if (x1 - x0 < 1) continue;
      g.fillStyle = rgb(shift(base, (r() - 0.5) * 26));
      g.fillRect(x0, y + i * rh, x1 - x0, rh + 0.5);
      g.fillStyle = 'rgba(255,250,235,.16)';
      g.fillRect(x0, y + i * rh, x1 - x0, 1);
      g.fillStyle = 'rgba(0,0,0,.34)';
      g.fillRect(x0, y + (i + 1) * rh - 1, x1 - x0, 1);
      g.fillRect(x1 - 1, y + i * rh, 1, rh);
    }
  }
}

function flame(g: G, x: number, y: number, s: number, ang: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  for (const [k, c] of [[1, 'rgba(220,70,20,.95)'], [0.72, 'rgba(255,150,30,.95)'], [0.4, 'rgba(255,235,140,.98)']] as const) {
    g.beginPath();
    g.moveTo(0, s * 0.55 * k);
    g.quadraticCurveTo(s * 0.5 * k, s * 0.1 * k, s * 0.12 * k, -s * 0.5 * k);
    g.quadraticCurveTo(0, -s * 0.9 * k, -s * 0.12 * k, -s * 0.5 * k);
    g.quadraticCurveTo(-s * 0.5 * k, s * 0.1 * k, 0, s * 0.55 * k);
    g.fillStyle = c;
    g.fill();
  }
  g.restore();
}

function log(g: G, x: number, y: number, len: number, wid: number, ang: number, burnt: boolean): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  paint(g, () => roundRect(g, -len / 2, -wid / 2, len, wid, wid * 0.4), burnt ? [52, 40, 34] : [110, 76, 44], [-len / 2, -wid / 2, len / 2, wid / 2], { lw: Math.max(1, wid * 0.14), bevel: wid * 0.1 });
  ellP(g, len / 2 - wid * 0.2, 0, wid * 0.28, wid * 0.4, burnt ? [40, 32, 28] : [190, 150, 98], { lw: 0.8, bevel: 0 });
  g.restore();
}

// ---------------------------------------------------------------- ildsteder, smedje, gryde

function fireplace(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const lit = param(o, 'lit', true);
  if (lit) softDot(g, 0, h * 0.2, w * 0.75, [255, 150, 60], 0.3);
  // murmasse
  g.save();
  roundRect(g, -w / 2, -h / 2, w, h * 0.78, 4);
  g.clip();
  masonry(g, -w / 2, -h / 2, w, h * 0.78, STONE, 6, r);
  g.restore();
  roundRect(g, -w / 2, -h / 2, w, h * 0.78, 4);
  g.strokeStyle = OUT;
  g.lineWidth = 2.2;
  g.stroke();
  // ildsted
  const fx = -w * 0.34, fy = -h * 0.28, fw = w * 0.68, fh = h * 0.56;
  const gr = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
  gr.addColorStop(0, 'rgb(40,32,30)');
  gr.addColorStop(1, 'rgb(14,10,10)');
  roundRect(g, fx, fy, fw, fh, 3);
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.stroke();
  g.save();
  roundRect(g, fx, fy, fw, fh, 3);
  g.clip();
  if (lit) softDot(g, 0, fy + fh * 0.55, fw * 0.6, [255, 110, 30], 0.7);
  log(g, -fw * 0.12, fy + fh * 0.6, fw * 0.62, fh * 0.2, 0.25, !lit);
  log(g, fw * 0.1, fy + fh * 0.5, fw * 0.6, fh * 0.2, -0.3, !lit);
  log(g, 0, fy + fh * 0.72, fw * 0.55, fh * 0.17, 0.05, !lit);
  if (lit) {
    flame(g, -fw * 0.12, fy + fh * 0.42, fh * 0.5, 0.1);
    flame(g, fw * 0.1, fy + fh * 0.4, fh * 0.62, -0.08);
    flame(g, fw * 0.02, fy + fh * 0.32, fh * 0.4, 0.04);
    for (let i = 0; i < 10; i++) softDot(g, (r() - 0.5) * fw * 0.8, fy + fh * (0.5 + r() * 0.4), fh * 0.05, [255, 190, 90], 0.9);
  } else speckle(g, r, [fx, fy + fh * 0.5, fx + fw, fy + fh], 40, [90, 86, 82], 0.7, 1.4);
  g.restore();
  // hærd foran
  rectP(g, -w * 0.46, h * 0.28, w * 0.92, h * 0.22, 3, [112, 108, 102], { lw: 1.8 });
  g.save();
  g.beginPath();
  g.rect(-w * 0.46, h * 0.28, w * 0.92, h * 0.22);
  g.clip();
  masonry(g, -w * 0.46, h * 0.28, w * 0.92, h * 0.22, [112, 108, 102], 2, r);
  if (lit) softDot(g, 0, h * 0.3, w * 0.4, [255, 150, 60], 0.35);
  g.restore();
}

function stove(g: G, o: DrawInput): void {
  const { w, h } = o;
  const lit = param(o, 'lit', true);
  if (lit) softDot(g, 0, 0, w * 0.9, [255, 130, 50], 0.22);
  rectP(g, -w * 0.46, -h * 0.4, w * 0.92, h * 0.86, w * 0.06, IRON, { lw: 2, bevel: 2, light: 26 });
  // rør
  ellP(g, w * 0.28, -h * 0.4, w * 0.13, w * 0.13, [48, 48, 52], { lw: 1.6, bevel: 1.5 });
  ellP(g, w * 0.28, -h * 0.4, w * 0.075, w * 0.075, [10, 8, 8], { lw: 1, bevel: 0 });
  // kogeplader
  for (const [x, y] of [[-0.2, -0.16], [0.2, -0.04], [-0.2, 0.16], [0.2, 0.22]] as const) {
    const cx = w * x, cy = h * y;
    const R = w * 0.15;
    const gr = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
    if (lit) {
      gr.addColorStop(0, 'rgb(255,170,60)');
      gr.addColorStop(1, 'rgb(150,40,20)');
    } else {
      gr.addColorStop(0, 'rgb(90,90,96)');
      gr.addColorStop(1, 'rgb(38,38,42)');
    }
    g.beginPath();
    g.arc(cx, cy, R, 0, 6.28);
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.stroke();
    for (const k of [0.65, 0.3]) {
      g.beginPath();
      g.arc(cx, cy, R * k, 0, 6.28);
      g.strokeStyle = lit ? 'rgba(80,10,0,.45)' : 'rgba(0,0,0,.5)';
      g.lineWidth = 1;
      g.stroke();
    }
  }
  // lem til brændekammer
  rectP(g, -w * 0.38, h * 0.36, w * 0.4, h * 0.08, 1.5, [44, 44, 48], { lw: 1.3, bevel: 0.8 });
  sphere(g, -w * 0.28, h * 0.4, w * 0.025, [190, 150, 60], 0.6);
}

function forge(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const lit = param(o, 'lit', true);
  if (lit) softDot(g, w * 0.2, 0, w * 0.8, [255, 130, 50], 0.28);
  // bælg
  const bx = -w * 0.1;
  const bellows: [number, number][] = [[bx, -h * 0.1], [-w * 0.44, -h * 0.26], [-w * 0.48, 0], [-w * 0.44, h * 0.26], [bx, h * 0.1]];
  contact(g, -w * 0.28, 0.02 * h, w * 0.25, h * 0.3, 0.3);
  polyP(g, bellows, [128, 84, 50], { lw: 1.8, bevel: 1.5 });
  g.strokeStyle = 'rgba(40,20,8,.6)';
  g.lineWidth = 1.2;
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    g.beginPath();
    g.moveTo(bx + (-w * 0.45 - bx) * t, -h * 0.1 - h * 0.15 * t);
    g.lineTo(bx + (-w * 0.45 - bx) * t, h * 0.1 + h * 0.15 * t);
    g.stroke();
  }
  rectP(g, -w * 0.5, -h * 0.05, w * 0.1, h * 0.1, 2, [110, 76, 44], { lw: 1.3 });
  g.beginPath();
  g.moveTo(-w * 0.46, 0);
  g.lineTo(-w * 0.52, h * 0.3);
  g.strokeStyle = OUT;
  g.lineWidth = 4;
  g.stroke();
  g.strokeStyle = rgb(WOOD);
  g.lineWidth = 2.4;
  g.stroke();
  // stenblok
  const x0 = bx, y0 = -h * 0.42, bw = w * 0.58, bh = h * 0.84;
  g.save();
  roundRect(g, x0, y0, bw, bh, 5);
  g.clip();
  masonry(g, x0, y0, bw, bh, [124, 118, 112], 8, r);
  g.restore();
  roundRect(g, x0, y0, bw, bh, 5);
  g.strokeStyle = OUT;
  g.lineWidth = 2.2;
  g.stroke();
  // kulleje
  const cx = x0 + bw * 0.12, cy = -h * 0.14, cw = bw * 0.76, ch = h * 0.5;
  roundRect(g, cx, cy, cw, ch, 4);
  g.fillStyle = 'rgb(24,18,16)';
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.8;
  g.stroke();
  g.save();
  roundRect(g, cx, cy, cw, ch, 4);
  g.clip();
  if (lit) softDot(g, cx + cw / 2, cy + ch / 2, cw * 0.7, [255, 100, 20], 0.85);
  for (let i = 0; i < 34; i++) {
    const x = cx + r() * cw, y = cy + r() * ch;
    const hot = lit && r() > 0.35;
    g.beginPath();
    g.ellipse(x, y, cw * 0.06, cw * 0.045, r() * 3, 0, 6.28);
    g.fillStyle = hot ? rgb([255, 120 + r() * 100, 30], 0.95) : rgb([50 + r() * 30, 44, 42]);
    g.fill();
  }
  g.restore();
  // skorsten (mørkere massiv bagest)
  rectP(g, x0 + bw * 0.1, y0 + bh * 0.04, bw * 0.8, h * 0.17, 3, [96, 92, 88], { lw: 1.6, bevel: 1 });
}

function anvil(g: G, o: DrawInput): void {
  const R = Math.min(o.w, o.h) / 2;
  const r = rng(o.seed);
  // stub
  contact(g, R * 0.1, R * 0.12, R * 0.95, R * 0.95, 0.3);
  ellP(g, 0, 0, R * 0.9, R * 0.9, [140, 100, 62], { lw: Math.max(1.5, R * 0.07), bevel: R * 0.05 });
  g.strokeStyle = 'rgba(70,44,22,.45)';
  g.lineWidth = Math.max(0.7, R * 0.03);
  for (const k of [0.6, 0.38]) {
    g.beginPath();
    g.ellipse(0, 0, R * 0.8 * k, R * 0.8 * k, 0, 0, 6.28);
    g.stroke();
  }
  g.save();
  g.rotate(-0.25);
  const S = R * 1.25;
  const pts: [number, number][] = [[-0.98, 0], [-0.6, -0.1], [-0.36, -0.22], [-0.3, -0.3], [0.58, -0.3], [0.66, -0.36], [0.74, -0.3], [0.74, 0.3], [0.66, 0.36], [0.58, 0.3], [-0.3, 0.3], [-0.36, 0.22], [-0.6, 0.1]];
  const sp = pts.map(([x, y]) => [x * S, y * S] as [number, number]);
  contact(g, S * 0.1, S * 0.1, S * 0.9, S * 0.4, 0.3);
  polyP(g, sp, [88, 92, 100], { lw: Math.max(1.5, R * 0.07), bevel: R * 0.06, light: 40, dark: 36 });
  g.beginPath();
  g.moveTo(-0.3 * S, -0.19 * S);
  g.lineTo(0.6 * S, -0.19 * S);
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.lineWidth = Math.max(0.8, R * 0.04);
  g.stroke();
  rectP(g, 0.38 * S, -0.06 * S, 0.1 * S, 0.1 * S, 0.5, [20, 20, 22], { lw: 0.6, bevel: 0 });
  ellP(g, 0.2 * S, 0, 0.04 * S, 0.04 * S, [20, 20, 22], { lw: 0.5, bevel: 0 });
  if (param(o, 'hot', false)) {
    softDot(g, -0.05 * S, 0, S * 0.55, [255, 120, 30], 0.5);
    rectP(g, -0.28 * S, -0.05 * S, 0.5 * S, 0.1 * S, 1, [255, 150, 50], { lw: 0.6, bevel: 0, light: 50 });
    rectP(g, -0.28 * S, -0.03 * S, 0.28 * S, 0.05 * S, 1, [255, 230, 150], { lw: 0, outline: null, bevel: 0 });
  }
  g.restore();
  void r;
}

function cauldron(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const liq: Record<string, [RGB, RGB]> = { soup: [[196, 120, 52], [120, 60, 26]], potion: [[110, 220, 110], [30, 110, 50]], water: [[110, 170, 200], [30, 70, 100]], blood: [[170, 30, 36], [70, 8, 12]] };
  const [l1, l2] = liq[param(o, 'liquid', 'soup')] ?? liq.soup!;
  contact(g, R * 0.1, R * 0.14, R * 0.95, R * 0.95, 0.4);
  // hanke
  for (const s of [-1, 1]) ellP(g, s * R * 0.92, 0, R * 0.14, R * 0.14, [52, 52, 56], { lw: Math.max(1, R * 0.06), bevel: 0.5 });
  ellP(g, 0, 0, R * 0.88, R * 0.88, IRON, { lw: Math.max(1.6, R * 0.07), bevel: R * 0.07, light: 34 });
  const gr = g.createRadialGradient(-R * 0.2, -R * 0.2, 0, 0, 0, R * 0.7);
  gr.addColorStop(0, rgb(l1));
  gr.addColorStop(1, rgb(l2));
  g.beginPath();
  g.arc(0, 0, R * 0.7, 0, 6.28);
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)';
  g.lineWidth = Math.max(1, R * 0.06);
  g.stroke();
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * R * 0.5;
    const s = R * (0.04 + r() * 0.07);
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, 6.28);
    g.strokeStyle = rgb(shift(l1, 50), 0.9);
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = rgb(shift(l1, 70), 0.3);
    g.fill();
  }
  softDot(g, -R * 0.25, -R * 0.3, R * 0.25, [255, 255, 255], 0.25);
}

const lit = { key: 'lit', label: 'Tændt', type: 'toggle' as const, default: true };

const hearthKinds: ObjectKind[] = [
  kind({ key: 'fireplace', family: 'hearth', name: 'Pejs', w: 2, h: 1.2, keepAspect: false, shadow: 6, bleed: 0.3, params: [lit], draw: fireplace }),
  kind({ key: 'stove', family: 'hearth', name: 'Komfur', w: 1, h: 1, shadow: 6, bleed: 0.2, params: [lit], draw: stove }),
  kind({ key: 'forge', family: 'hearth', name: 'Esse', w: 2, h: 2, shadow: 7, bleed: 0.2, params: [lit], draw: forge }),
  kind({ key: 'anvil', family: 'hearth', name: 'Ambolt', w: 1, h: 1, randomRotation: false, shadow: 5, bleed: 0.3, params: [{ key: 'hot', label: 'Glødende emne', type: 'toggle', default: false }], draw: anvil }),
  kind({
    key: 'cauldron', family: 'hearth', name: 'Gryde', w: 1, h: 1, randomRotation: true, shadow: 5, bleed: 0.1,
    params: [{ key: 'liquid', label: 'Indhold', type: 'select', default: 'soup', options: [{ value: 'soup', label: 'Suppe' }, { value: 'potion', label: 'Eliksir' }, { value: 'water', label: 'Vand' }, { value: 'blood', label: 'Blod' }] }],
    draw: cauldron,
  }),
];

// ---------------------------------------------------------------- tæpper

const RUG: Record<string, { base: RGB; acc: RGB; trim: RGB }> = {
  red: { base: [140, 36, 40], acc: [214, 168, 70], trim: [60, 20, 24] },
  blue: { base: [40, 62, 132], acc: [232, 218, 180], trim: [20, 28, 64] },
  green: { base: [44, 104, 74], acc: [218, 184, 80], trim: [18, 50, 36] },
  brown: { base: [118, 78, 48], acc: [212, 176, 120], trim: [60, 38, 22] },
};

const rugParams = [
  { key: 'color', label: 'Farve', type: 'select' as const, default: 'red', options: [{ value: 'red', label: 'Rød' }, { value: 'blue', label: 'Blå' }, { value: 'green', label: 'Grøn' }, { value: 'brown', label: 'Brun' }] },
  { key: 'pattern', label: 'Mønster', type: 'select' as const, default: 'ornate', options: [{ value: 'ornate', label: 'Medaljon' }, { value: 'diamond', label: 'Tern' }, { value: 'stripes', label: 'Striber' }] },
];

function rug(g: G, o: DrawInput, shape: 'round' | 'rect'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const pal = RUG[param(o, 'color', 'red')] ?? RUG.red!;
  const pattern = param(o, 'pattern', 'ornate');
  const m = Math.min(w, h);
  const bw = m * 0.12;
  const outer = (inset: number) => {
    if (shape === 'round') {
      g.beginPath();
      g.ellipse(0, 0, w / 2 - inset, h / 2 - inset, 0, 0, 6.28);
    } else roundRect(g, -w / 2 + inset, -h / 2 + inset, w - inset * 2, h - inset * 2, Math.max(1, m * 0.03));
  };
  // frynser (kun rektangulære, på de korte ender)
  if (shape === 'rect') {
    const long = w >= h;
    g.strokeStyle = rgb(shift(pal.acc, -10), 0.95);
    g.lineWidth = Math.max(1, m * 0.025);
    const n = Math.round((long ? h : w) / (m * 0.05));
    for (let i = 0; i <= n; i++) {
      const t = -0.5 + i / n;
      for (const s of [-1, 1]) {
        g.beginPath();
        if (long) {
          g.moveTo(s * w * 0.5, t * h * 0.96);
          g.lineTo(s * (w * 0.5 + m * 0.06), t * h * 0.96 + (r() - 0.5) * 2);
        } else {
          g.moveTo(t * w * 0.96, s * h * 0.5);
          g.lineTo(t * w * 0.96 + (r() - 0.5) * 2, s * (h * 0.5 + m * 0.06));
        }
        g.stroke();
      }
    }
  }
  paint(g, () => outer(0), pal.base, [-w / 2, -h / 2, w / 2, h / 2], { lw: Math.max(1.4, m * 0.03), bevel: 1, light: 12, dark: 16 });
  g.save();
  outer(0);
  g.clip();
  // kant: to bånd
  outer(bw * 0.5);
  g.strokeStyle = rgb(pal.trim);
  g.lineWidth = bw;
  g.stroke();
  outer(bw * 0.18);
  g.strokeStyle = rgb(pal.acc);
  g.lineWidth = Math.max(1, bw * 0.12);
  g.stroke();
  outer(bw * 0.95);
  g.strokeStyle = rgb(pal.acc);
  g.lineWidth = Math.max(1, bw * 0.1);
  g.stroke();
  // indre felt
  g.save();
  outer(bw);
  g.clip();
  g.fillStyle = rgb(pal.base);
  g.fillRect(-w / 2, -h / 2, w, h);
  const long = w >= h;
  if (pattern === 'diamond') {
    const s = Math.max(m * 0.2, 14);
    for (let yy = -h / 2; yy < h / 2 + s; yy += s) {
      for (let xx = -w / 2; xx < w / 2 + s; xx += s) {
        const cx = xx + s / 2 + (((Math.round((yy + h / 2) / s)) % 2) ? s / 2 : 0);
        g.beginPath();
        g.moveTo(cx, yy);
        g.lineTo(cx + s * 0.4, yy + s / 2);
        g.lineTo(cx, yy + s);
        g.lineTo(cx - s * 0.4, yy + s / 2);
        g.closePath();
        g.fillStyle = rgb(pal.trim, 0.55);
        g.fill();
        g.strokeStyle = rgb(pal.acc, 0.85);
        g.lineWidth = Math.max(0.8, m * 0.015);
        g.stroke();
        g.beginPath();
        g.arc(cx, yy + s / 2, s * 0.08, 0, 6.28);
        g.fillStyle = rgb(pal.acc, 0.9);
        g.fill();
      }
    }
  } else if (pattern === 'stripes') {
    const n = Math.max(3, Math.round((long ? w : h) / (m * 0.24)));
    for (let i = 0; i < n; i++) {
      const t = -0.5 + (i + 0.5) / n;
      g.fillStyle = rgb(i % 2 ? pal.trim : pal.acc, i % 2 ? 0.6 : 0.8);
      if (long) g.fillRect(t * w - (w / n) * 0.18, -h / 2, (w / n) * 0.36, h);
      else g.fillRect(-w / 2, t * h - (h / n) * 0.18, w, (h / n) * 0.36);
    }
  } else {
    // medaljon
    const rr = m * 0.3;
    const cnt = shape === 'rect' ? Math.max(1, Math.round((long ? w : h) / (m * 1.1))) : 1;
    for (let i = 0; i < cnt; i++) {
      const t = cnt === 1 ? 0 : -0.5 + (i + 0.5) / cnt;
      const cx = long ? t * w : 0, cy = long ? 0 : t * h;
      g.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * 6.28;
        const rad = k % 2 ? rr * 0.78 : rr;
        g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      g.closePath();
      g.fillStyle = rgb(pal.acc, 0.92);
      g.fill();
      g.strokeStyle = rgb(pal.trim);
      g.lineWidth = Math.max(1, m * 0.02);
      g.stroke();
      ellP(g, cx, cy, rr * 0.5, rr * 0.5, pal.trim, { lw: Math.max(0.8, m * 0.012), outline: rgb(pal.acc), bevel: 0 });
      ellP(g, cx, cy, rr * 0.22, rr * 0.22, pal.acc, { lw: 0.8, outline: rgb(pal.trim), bevel: 0 });
    }
    if (shape === 'rect' && cnt === 1) {
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        const cx = sx * (w / 2 - bw - m * 0.14), cy = sy * (h / 2 - bw - m * 0.14);
        g.beginPath();
        g.moveTo(cx, cy - m * 0.09);
        g.lineTo(cx + m * 0.07, cy);
        g.lineTo(cx, cy + m * 0.09);
        g.lineTo(cx - m * 0.07, cy);
        g.closePath();
        g.fillStyle = rgb(pal.acc, 0.85);
        g.fill();
      }
    }
  }
  g.restore();
  // vævestruktur og slid
  g.strokeStyle = 'rgba(0,0,0,.05)';
  g.lineWidth = 1;
  for (let y = -h / 2; y < h / 2; y += 3) {
    g.beginPath();
    g.moveTo(-w / 2, y);
    g.lineTo(w / 2, y);
    g.stroke();
  }
  g.restore();
  outer(0);
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1.2, m * 0.025);
  g.stroke();
}

const rugKinds: ObjectKind[] = [
  kind({ key: 'rug_round', family: 'rug', name: 'Rundt tæppe', w: 2, h: 2, layers: ['ground', 'objects', 'effects'], shadow: 1, bleed: 0.04, params: rugParams, draw: (g, o) => rug(g, o, 'round') }),
  kind({ key: 'rug_rect', family: 'rug', name: 'Rektangulært tæppe', w: 2, h: 3, keepAspect: false, layers: ['ground', 'objects', 'effects'], shadow: 1, bleed: 0.06, params: rugParams, draw: (g, o) => rug(g, o, 'rect') }),
  kind({ key: 'rug_runner', family: 'rug', name: 'Løber', w: 1, h: 4, keepAspect: false, shadow: 1, bleed: 0.06, layers: ['ground', 'objects', 'effects'], params: rugParams, draw: (g, o) => rug(g, o, 'rect') }),
];

// ---------------------------------------------------------------- reol og våbenstativ

const BOOKS: RGB[] = [[140, 40, 40], [40, 80, 120], [60, 110, 60], [150, 110, 40], [100, 50, 110], [90, 60, 40], [170, 160, 140]];

function bookshelf(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const content = param(o, 'content', 'books');
  rectP(g, -w / 2, -h / 2, w, h, 3, [118, 82, 50], { lw: 2, bevel: 1.5 });
  const ix = -w / 2 + h * 0.14, iy = -h / 2 + h * 0.14, iw = w - h * 0.28, ih = h * 0.72;
  g.fillStyle = 'rgb(40,28,20)';
  g.fillRect(ix, iy, iw, ih);
  g.strokeStyle = 'rgba(0,0,0,.6)';
  g.lineWidth = 1;
  g.strokeRect(ix, iy, iw, ih);
  g.save();
  g.beginPath();
  g.rect(ix, iy, iw, ih);
  g.clip();
  let x = ix + 1;
  while (x < ix + iw - 2) {
    if (content === 'empty') break;
    if (r() < 0.07) {
      x += iw * 0.04; // hul
      continue;
    }
    const bw = iw * (0.022 + r() * 0.03);
    const bh = ih * (0.7 + r() * 0.26);
    const col = BOOKS[(r() * BOOKS.length) | 0]!;
    if (content === 'jars' && r() > 0.62) {
      const rad = ih * 0.2;
      sphere(g, x + rad, iy + ih / 2 + (r() - 0.5) * ih * 0.5, rad, [[120, 200, 150], [210, 120, 90], [150, 150, 220], [220, 200, 100]][(r() * 4) | 0] as RGB, 0.9);
      x += rad * 2 + 1;
      continue;
    }
    g.save();
    const lean = r() < 0.06 ? 0.25 : 0;
    g.translate(x + bw / 2, iy + ih);
    g.rotate(-lean);
    const gr = g.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    gr.addColorStop(0, rgb(shift(col, 26)));
    gr.addColorStop(1, rgb(shift(col, -26)));
    g.fillStyle = gr;
    g.fillRect(-bw / 2, -bh, bw, bh);
    g.strokeStyle = 'rgba(10,5,0,.8)';
    g.lineWidth = 0.9;
    g.strokeRect(-bw / 2, -bh, bw, bh);
    g.fillStyle = 'rgba(230,200,120,.7)';
    g.fillRect(-bw / 2, -bh * (0.8 - r() * 0.2), bw, 1.2);
    g.fillRect(-bw / 2, -bh * 0.3, bw, 1);
    g.restore();
    x += bw + 0.5 + lean * 8;
  }
  g.restore();
  // inderkant skygge
  const sg = g.createLinearGradient(ix, iy, ix, iy + ih);
  sg.addColorStop(0, 'rgba(0,0,0,.35)');
  sg.addColorStop(0.25, 'rgba(0,0,0,0)');
  g.fillStyle = sg;
  g.fillRect(ix, iy, iw, ih);
  g.strokeStyle = 'rgba(255,230,180,.25)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(-w / 2 + 2, h / 2 - 2);
  g.lineTo(-w / 2 + 2, -h / 2 + 2);
  g.lineTo(w / 2 - 2, -h / 2 + 2);
  g.stroke();
}

function weapon(g: G, k: number, x: number, h: number, r: () => number): void {
  const steel: RGB = [186, 192, 202];
  const wood: RGB = [120, 80, 44];
  const wd = h * 0.065;
  const blade = (len: number, y0: number, wid: number) => {
    paint(g, () => {
      g.beginPath();
      g.moveTo(x - wid, y0);
      g.lineTo(x - wid, y0 + len * 0.9);
      g.lineTo(x, y0 + len);
      g.lineTo(x + wid, y0 + len * 0.9);
      g.lineTo(x + wid, y0);
      g.closePath();
    }, steel, [x - wid, y0, x + wid, y0 + len], { lw: 1, bevel: 0.5, light: 30 });
  };
  if (k === 0 || k === 1) {
    // sværd (hjalt øverst)
    const top = -h * 0.42;
    blade(h * 0.52, top + h * 0.22, wd * 0.8);
    rectP(g, x - wd * 2.1, top + h * 0.18, wd * 4.2, wd * 0.9, 1, [176, 140, 60], { lw: 1, bevel: 0.4 });
    rectP(g, x - wd * 0.6, top + h * 0.02, wd * 1.2, h * 0.17, 1, wood, { lw: 1, bevel: 0.4 });
    sphere(g, x, top, wd * 0.9, [176, 140, 60], 0.8);
  } else if (k === 2) {
    // spyd
    const top = -h * 0.48;
    rectP(g, x - wd * 0.4, top + h * 0.12, wd * 0.8, h * 0.85, 0.5, wood, { lw: 1, bevel: 0.4 });
    polyP(g, [[x, top], [x + wd * 1.1, top + h * 0.14], [x, top + h * 0.12], [x - wd * 1.1, top + h * 0.14]], steel, { lw: 1, bevel: 0 });
  } else if (k === 3) {
    // økse
    const top = -h * 0.44;
    rectP(g, x - wd * 0.45, top, wd * 0.9, h * 0.88, 0.5, wood, { lw: 1, bevel: 0.4 });
    polyP(g, [[x, top + h * 0.04], [x + wd * 2.8, top - h * 0.02], [x + wd * 2.8, top + h * 0.26], [x, top + h * 0.2]], steel, { lw: 1, bevel: 0.4 });
  } else {
    // stridskølle
    const top = -h * 0.44;
    rectP(g, x - wd * 0.45, top + h * 0.1, wd * 0.9, h * 0.78, 0.5, wood, { lw: 1, bevel: 0.4 });
    sphere(g, x, top + h * 0.09, wd * 1.5, [110, 114, 124], 1);
  }
  void r;
}

function weaponRack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const mode = param(o, 'set', 'mixed');
  const n = 6;
  contact(g, 0, 0, w * 0.45, h * 0.4, 0);
  for (let i = 0; i < n; i++) {
    const x = -w * 0.38 + (i / (n - 1)) * w * 0.76;
    const k = mode === 'swords' ? 0 : mode === 'polearms' ? 2 + (i % 3 === 1 ? 1 : 0) + (i % 3 === 2 ? 2 : 0) : (r() * 5) | 0;
    g.save();
    g.translate(0, 0);
    weapon(g, k, x, h, r);
    g.restore();
  }
  // holdere (skinner over våbnene) og endestolper
  for (const y of [-h * 0.2, h * 0.22]) rectP(g, -w * 0.5, y - h * 0.045, w, h * 0.09, 2, WOOD, { lw: 1.5, bevel: 1 });
  for (const x of [-w * 0.5, w * 0.5 - h * 0.14]) rectP(g, x, -h * 0.3, h * 0.14, h * 0.6, 2, [100, 68, 40], { lw: 1.6, bevel: 1 });
}

const shelfKinds: ObjectKind[] = [
  kind({
    key: 'bookshelf', family: 'storage', name: 'Bogreol', w: 2, h: 0.8, keepAspect: false, shadow: 5, bleed: 0.02,
    params: [{ key: 'content', label: 'Indhold', type: 'select', default: 'books', options: [{ value: 'books', label: 'Bøger' }, { value: 'jars', label: 'Bøger og krukker' }, { value: 'empty', label: 'Tom' }] }],
    draw: bookshelf,
  }),
  kind({
    key: 'weapon_rack', family: 'storage', name: 'Våbenstativ', w: 2, h: 1, keepAspect: false, shadow: 4, bleed: 0.03,
    params: [{ key: 'set', label: 'Våben', type: 'select', default: 'mixed', options: [{ value: 'mixed', label: 'Blandede' }, { value: 'swords', label: 'Sværd' }, { value: 'polearms', label: 'Stangvåben' }] }],
    draw: weaponRack,
  }),
];

export const homeKinds: ObjectKind[] = [...hearthKinds, ...rugKinds, ...shelfKinds];
