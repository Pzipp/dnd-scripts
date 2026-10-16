import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { blob, mix, planks, rgb, rng, roundRect, shift, smooth, softDot, type RGB } from '../util';
import { blobP, contact, ellP, OUT, paint, polyP, rectP, sphere, speckle } from './helpers';

type G = CanvasRenderingContext2D;
const WOOD: RGB = [150, 108, 66];
const DARKWOOD: RGB = [104, 70, 42];
const BOTTLE: RGB[] = [[60, 150, 170], [150, 70, 160], [200, 150, 50]];

// ---------------------------------------------------------------- små hjælpere

export function barrelTop(g: G, x: number, y: number, R: number, r: () => number): void {
  ellP(g, x, y, R, R, shift(WOOD, 6), { lw: Math.max(1, R * 0.1), bevel: 0 });
  g.save();
  g.beginPath();
  g.arc(x, y, R * 0.82, 0, Math.PI * 2);
  g.clip();
  planks(g, x - R, y - R, R * 2, R * 2, shift(WOOD, 6), 5, r);
  g.restore();
  g.beginPath();
  g.arc(x, y, R * 0.9, 0, Math.PI * 2);
  g.strokeStyle = 'rgb(70,66,62)';
  g.lineWidth = Math.max(1, R * 0.1);
  g.stroke();
}

function crateTop(g: G, x: number, y: number, s: number, r: () => number): void {
  rectP(g, x - s / 2, y - s / 2, s, s, s * 0.06, shift(WOOD, -8), { lw: Math.max(1, s * 0.06) });
  g.strokeStyle = 'rgba(40,24,12,.55)';
  g.lineWidth = Math.max(0.8, s * 0.05);
  g.strokeRect(x - s * 0.36, y - s * 0.36, s * 0.72, s * 0.72);
  g.beginPath();
  g.moveTo(x - s * 0.36, y - s * 0.36);
  g.lineTo(x + s * 0.36, y + s * 0.36);
  g.moveTo(x + s * 0.36, y - s * 0.36);
  g.lineTo(x - s * 0.36, y + s * 0.36);
  g.stroke();
  void r;
}

export function sack(g: G, x: number, y: number, rad: number, col: RGB, r: () => number): void {
  const pts = blob(rad, rad * 0.92, 0.07, 11, r, x, y, r() * 3);
  smooth(g, pts);
  const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.4, rad * 0.1, x, y, rad * 1.1);
  gr.addColorStop(0, rgb(shift(col, 30)));
  gr.addColorStop(0.55, rgb(col));
  gr.addColorStop(1, rgb(shift(col, -42)));
  g.fillStyle = gr;
  g.fill();
  g.save();
  smooth(g, pts);
  g.clip();
  // folder fra bindestedet
  const tx = x + rad * 0.1, ty = y - rad * 0.18;
  g.strokeStyle = 'rgba(40,24,10,.3)';
  g.lineWidth = Math.max(0.6, rad * 0.04);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28 + r() * 0.5;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(a + 0.4) * rad * 0.5, ty + Math.sin(a + 0.4) * rad * 0.5, tx + Math.cos(a) * rad, ty + Math.sin(a) * rad);
    g.stroke();
  }
  speckle(g, r, [x - rad, y - rad, x + rad, y + rad], 24, col, 0.4, rad * 0.04);
  g.restore();
  smooth(g, pts);
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1, rad * 0.07);
  g.stroke();
  // bindesnor
  g.beginPath();
  g.ellipse(tx, ty, rad * 0.2, rad * 0.14, 0.5, 0, Math.PI * 2);
  g.fillStyle = rgb(shift(col, -50));
  g.fill();
  g.strokeStyle = 'rgba(30,16,6,.8)';
  g.lineWidth = Math.max(0.8, rad * 0.06);
  g.stroke();
}

// ---------------------------------------------------------------- stande og diske

const AWN: Record<string, [RGB, RGB]> = {
  red: [[190, 48, 44], [238, 226, 200]],
  blue: [[52, 86, 172], [238, 226, 200]],
  green: [[56, 130, 70], [236, 224, 190]],
  yellow: [[228, 178, 52], [176, 60, 44]],
  purple: [[122, 62, 152], [236, 220, 190]],
};

function stall(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const [c1, c2] = AWN[param(o, 'color', 'red')] ?? AWN.red!;
  const awnB = h * 0.12;
  // disk
  rectP(g, -w * 0.47, h * 0.0, w * 0.94, h * 0.48, 3, WOOD, { lw: 1.8 });
  g.save();
  g.beginPath();
  g.rect(-w * 0.47, h * 0.0, w * 0.94, h * 0.48);
  g.clip();
  planks(g, -w * 0.47, h * 0.0, w * 0.94, h * 0.48, WOOD, 3, r);
  g.restore();
  // varer
  const goods = param(o, 'goods', 'fruit');
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = -w * 0.4 + (i / (n - 1)) * w * 0.8;
    const y = h * (0.3 + (r() - 0.5) * 0.1);
    const s = w * 0.04;
    if (goods === 'fruit') sphere(g, x, y, s, r() > 0.5 ? [200, 50, 40] : [140, 180, 60], 0.8);
    else if (goods === 'bread') {
      g.save();
      g.translate(x, y);
      g.rotate((r() - 0.5) * 0.8);
      ellP(g, 0, 0, s * 1.5, s, [204, 148, 78], { lw: 0.9, bevel: 0.5 });
      g.restore();
    } else sphere(g, x, y, s * 0.9, BOTTLE[i % 3]!, 0.8);
  }
  // pæle foran
  for (const x of [-w * 0.46, w * 0.46]) ellP(g, x, h * 0.46, w * 0.03, w * 0.03, DARKWOOD, { lw: 1.2, bevel: 0 });
  // markise
  const n2 = 6;
  const sw = (w * 0.98) / n2;
  const x0 = -w * 0.49;
  const top = -h / 2;
  const ridge = top + (awnB - top) * 0.5;
  contact(g, w * 0.02, awnB, w * 0.48, h * 0.1, 0.0);
  for (let i = 0; i < n2; i++) {
    const col = i % 2 ? c2 : c1;
    const xa = x0 + i * sw;
    // bagerste og forreste tagflade
    const gr = g.createLinearGradient(0, top, 0, awnB);
    gr.addColorStop(0, rgb(shift(col, -22)));
    gr.addColorStop(0.5, rgb(shift(col, -6)));
    gr.addColorStop(0.5001, rgb(shift(col, 14)));
    gr.addColorStop(1, rgb(shift(col, -10)));
    g.beginPath();
    g.rect(xa, top, sw + 0.4, awnB - top);
    g.arc(xa + sw / 2, awnB, sw / 2, Math.PI, 0, true);
    g.lineTo(xa, awnB);
    g.closePath();
    g.fillStyle = gr;
    g.fill();
    // fold-skygge
    const hg = g.createLinearGradient(xa, 0, xa + sw, 0);
    hg.addColorStop(0, 'rgba(255,255,255,.14)');
    hg.addColorStop(1, 'rgba(0,0,0,.16)');
    g.fillStyle = hg;
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.3;
    g.stroke();
  }
  g.beginPath();
  g.moveTo(x0, ridge);
  g.lineTo(x0 + n2 * sw, ridge);
  g.strokeStyle = 'rgba(20,10,5,.55)';
  g.lineWidth = 1.2;
  g.stroke();
  g.beginPath();
  g.moveTo(x0, ridge + 1.5);
  g.lineTo(x0 + n2 * sw, ridge + 1.5);
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.stroke();
}

function bar(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  rectP(g, -w / 2, -h * 0.42, w, h * 0.84, h * 0.1, DARKWOOD, { lw: 2, bevel: 2 });
  g.save();
  g.beginPath();
  g.rect(-w / 2, -h * 0.42, w, h * 0.84);
  g.clip();
  planks(g, -w / 2, -h * 0.42, w, h * 0.5, shift(DARKWOOD, 4), 2, r);
  // glans
  const sh = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  sh.addColorStop(0, 'rgba(255,230,190,.0)');
  sh.addColorStop(0.3, 'rgba(255,230,190,.16)');
  sh.addColorStop(0.6, 'rgba(255,230,190,.0)');
  g.fillStyle = sh;
  g.fillRect(-w / 2, -h * 0.42, w, h * 0.84);
  g.restore();
  // messingliste foran
  rectP(g, -w * 0.48, h * 0.24, w * 0.96, h * 0.1, h * 0.04, [196, 154, 62], { lw: 1.2, bevel: 0.8 });
  if (param(o, 'items', true)) {
    for (let i = 0; i < 9; i++) {
      const x = -w * 0.43 + (i / 8) * w * 0.86 + (r() - 0.5) * w * 0.02;
      const y = -h * 0.12 + (r() - 0.5) * h * 0.25;
      if (i % 3 === 1) sphere(g, x, y, h * 0.07, BOTTLE[(i / 3) | 0]!, 0.9);
      else {
        sphere(g, x, y, h * 0.08, [210, 180, 110], 1);
        ellP(g, x, y, h * 0.05, h * 0.05, [170, 100, 30], { lw: 0.6, bevel: 0 });
        g.beginPath();
        g.arc(x + h * 0.1, y, h * 0.035, -1.4, 1.4);
        g.strokeStyle = 'rgba(40,30,20,.8)';
        g.lineWidth = 1.2;
        g.stroke();
      }
    }
  }
}

const stallParams = [
  { key: 'color', label: 'Markise', type: 'select' as const, default: 'red', options: [{ value: 'red', label: 'Rød' }, { value: 'blue', label: 'Blå' }, { value: 'green', label: 'Grøn' }, { value: 'yellow', label: 'Gul' }, { value: 'purple', label: 'Lilla' }] },
  { key: 'goods', label: 'Varer', type: 'select' as const, default: 'fruit', options: [{ value: 'fruit', label: 'Frugt' }, { value: 'bread', label: 'Brød' }, { value: 'bottles', label: 'Flasker' }] },
];

const stallKinds: ObjectKind[] = [
  kind({ key: 'stall_striped', family: 'stall', name: 'Markedsstand', w: 2, h: 1.5, keepAspect: true, shadow: 8, bleed: 0.06, params: stallParams, draw: stall }),
  kind({ key: 'bar_counter', family: 'stall', name: 'Bardisk', w: 3, h: 1, keepAspect: false, shadow: 6, bleed: 0.03, params: [{ key: 'items', label: 'Krus og flasker', type: 'toggle', default: true }], draw: bar }),
];

// ---------------------------------------------------------------- brønde og springvand

function well(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const state = param(o, 'state', 'water');
  const inner = R * 0.6;
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fillStyle = 'rgb(60,56,52)';
  g.fill();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 6.28 + 0.02;
    const a1 = ((i + 1) / n) * 6.28 - 0.02;
    polyP(
      g,
      [
        [Math.cos(a0) * inner, Math.sin(a0) * inner],
        [Math.cos(a0) * R * 0.99, Math.sin(a0) * R * 0.99],
        [Math.cos((a0 + a1) / 2) * R * 1.0, Math.sin((a0 + a1) / 2) * R * 1.0],
        [Math.cos(a1) * R * 0.99, Math.sin(a1) * R * 0.99],
        [Math.cos(a1) * inner, Math.sin(a1) * inner],
      ],
      mix([138, 134, 126], [112, 110, 104], r()),
      { lw: Math.max(1, R * 0.04), bevel: R * 0.03, light: 24, dark: 20 },
    );
  }
  g.beginPath();
  g.arc(0, 0, inner, 0, Math.PI * 2);
  g.strokeStyle = OUT;
  g.lineWidth = Math.max(1.5, R * 0.06);
  g.stroke();
  g.save();
  g.beginPath();
  g.arc(0, 0, inner * 0.98, 0, Math.PI * 2);
  g.clip();
  if (state === 'covered') {
    planks(g, -inner, -inner, inner * 2, inner * 2, WOOD, 6, r);
    for (const y of [-0.45, 0.45]) {
      g.fillStyle = 'rgb(60,56,54)';
      g.fillRect(-inner, inner * y - R * 0.04, inner * 2, R * 0.08);
    }
  } else if (state === 'dry') {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, inner);
    gr.addColorStop(0, 'rgb(6,4,4)');
    gr.addColorStop(1, 'rgb(40,34,30)');
    g.fillStyle = gr;
    g.fillRect(-inner, -inner, inner * 2, inner * 2);
  } else {
    const gr = g.createRadialGradient(-inner * 0.2, -inner * 0.2, 0, 0, 0, inner);
    gr.addColorStop(0, 'rgb(70,120,150)');
    gr.addColorStop(1, 'rgb(18,40,60)');
    g.fillStyle = gr;
    g.fillRect(-inner, -inner, inner * 2, inner * 2);
    g.strokeStyle = 'rgba(255,255,255,.25)';
    g.lineWidth = 1;
    for (const k of [0.3, 0.55]) {
      g.beginPath();
      g.ellipse(-inner * 0.05, 0, inner * k, inner * k * 0.8, 0, 0.3, 4.2);
      g.stroke();
    }
  }
  // indre skygge fra kanten
  const ig = g.createRadialGradient(0, 0, inner * 0.6, 0, 0, inner);
  ig.addColorStop(0, 'rgba(0,0,0,0)');
  ig.addColorStop(1, 'rgba(0,0,0,.4)');
  g.fillStyle = ig;
  g.fillRect(-inner, -inner, inner * 2, inner * 2);
  g.restore();
  if (param(o, 'beam', true) && state !== 'covered') {
    // sving med tov og krank
    for (const x of [-R * 0.97, R * 0.97]) rectP(g, x - R * 0.07, -R * 0.1, R * 0.14, R * 0.2, 1.5, DARKWOOD, { lw: 1.4 });
    rectP(g, -R * 0.98, -R * 0.055, R * 1.96, R * 0.11, 2, WOOD, { lw: 1.4, bevel: 1 });
    rectP(g, -R * 0.3, -R * 0.11, R * 0.6, R * 0.22, R * 0.08, shift(WOOD, 14), { lw: 1.4 });
    g.strokeStyle = 'rgba(30,16,8,.55)';
    g.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * R * 0.11, -R * 0.1);
      g.lineTo(i * R * 0.11, R * 0.1);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(R * 1.1, -R * 0.06);
    g.lineTo(R * 1.1, R * 0.3);
    g.strokeStyle = rgb(DARKWOOD);
    g.lineWidth = Math.max(2, R * 0.07);
    g.stroke();
    ellP(g, 0, R * 0.04, R * 0.02, R * 0.02, [200, 190, 160], { lw: 0.5, bevel: 0 });
  }
}

function fountain(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const flow = param(o, 'flow', true);
  ellP(g, 0, 0, R, R, [150, 148, 142], { lw: Math.max(1.6, R * 0.04), bevel: R * 0.04 });
  g.save();
  g.beginPath();
  g.arc(0, 0, R * 0.96, 0, 6.28);
  g.clip();
  speckle(g, r, [-R, -R, R, R], 60, [140, 138, 130], 0.4, 1.4);
  g.restore();
  ellP(g, 0, 0, R * 0.84, R * 0.84, [122, 120, 116], { lw: Math.max(1.2, R * 0.03), bevel: 0 });
  const wg = g.createRadialGradient(-R * 0.15, -R * 0.15, 0, 0, 0, R * 0.78);
  wg.addColorStop(0, 'rgb(112,190,206)');
  wg.addColorStop(1, 'rgb(40,110,140)');
  g.beginPath();
  g.arc(0, 0, R * 0.76, 0, 6.28);
  g.fillStyle = wg;
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.3)';
  g.lineWidth = 1.2;
  for (const k of [0.5, 0.62, 0.72]) {
    g.beginPath();
    g.arc(0, 0, R * k, 0.3 + k, 2.4 + k);
    g.stroke();
  }
  // sokkel og øvre skål
  ellP(g, 0, 0, R * 0.3, R * 0.3, [160, 158, 150], { lw: Math.max(1.4, R * 0.04), bevel: R * 0.03 });
  ellP(g, 0, 0, R * 0.2, R * 0.2, [104, 170, 190], { lw: Math.max(1, R * 0.03), bevel: 0 });
  if (flow) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 6.28 + r() * 0.3;
      const d = R * (0.28 + r() * 0.34);
      softDot(g, Math.cos(a) * d, Math.sin(a) * d, R * 0.06, [255, 255, 255], 0.6);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.28;
      g.beginPath();
      g.arc(0, 0, R * (0.38 + (i % 2) * 0.12), a, a + 0.5);
      g.strokeStyle = 'rgba(255,255,255,.5)';
      g.lineWidth = 1.2;
      g.stroke();
    }
    softDot(g, 0, 0, R * 0.16, [255, 255, 255], 0.9);
  } else {
    ellP(g, 0, 0, R * 0.07, R * 0.07, [90, 90, 86], { lw: 1, bevel: 0 });
  }
}

const wellKinds: ObjectKind[] = [
  kind({
    key: 'well_stone', family: 'well', name: 'Stenbrønd', w: 2, h: 2, shadow: 8, bleed: 0.08,
    params: [
      { key: 'state', label: 'Brønd', type: 'select', default: 'water', options: [{ value: 'water', label: 'Med vand' }, { value: 'dry', label: 'Tør' }, { value: 'covered', label: 'Tildækket' }] },
      { key: 'beam', label: 'Sving med tov', type: 'toggle', default: true },
    ],
    draw: well,
  }),
  kind({ key: 'fountain_round', family: 'well', name: 'Springvand', w: 3, h: 3, shadow: 6, bleed: 0.05, params: [{ key: 'flow', label: 'Sprudler', type: 'toggle', default: true }], draw: fountain }),
];

// ---------------------------------------------------------------- vogne

function wheel(g: G, x: number, y: number, len: number, wid: number): void {
  rectP(g, x - wid / 2, y - len / 2, wid, len, wid * 0.3, [72, 50, 32], { lw: 1.4, bevel: 0.8 });
  g.strokeStyle = 'rgba(20,10,5,.5)';
  g.lineWidth = 0.8;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(x - wid / 2, y - len / 2 + (i * len) / 4);
    g.lineTo(x + wid / 2, y - len / 2 + (i * len) / 4);
    g.stroke();
  }
}

function load(g: G, kindName: string, x0: number, y0: number, x1: number, y1: number, r: () => number): void {
  const w = x1 - x0, h = y1 - y0;
  if (kindName === 'hay') {
    blobP(g, blob(w * 0.48, h * 0.48, 0.06, 14, r, (x0 + x1) / 2, (y0 + y1) / 2), [208, 172, 84], { lw: 1.5 });
    g.save();
    smooth(g, blob(w * 0.48, h * 0.48, 0.06, 14, r, (x0 + x1) / 2, (y0 + y1) / 2));
    g.clip();
    for (let i = 0; i < 130; i++) {
      const x = x0 + r() * w, y = y0 + r() * h;
      const a = r() * 3.14;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      g.strokeStyle = rgb(shift([208, 172, 84], (r() - 0.5) * 70), 0.7);
      g.lineWidth = 0.8;
      g.stroke();
    }
    g.restore();
  } else if (kindName === 'crates') {
    const s = Math.min(w, h) * 0.46;
    for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.3], [0.3, 0.75], [0.72, 0.74]] as const) crateTop(g, x0 + w * fx, y0 + h * fy, s, r);
  } else if (kindName === 'sacks') {
    for (const [fx, fy] of [[0.28, 0.25], [0.72, 0.3], [0.3, 0.74], [0.7, 0.72]] as const) sack(g, x0 + w * fx, y0 + h * fy, Math.min(w, h) * 0.26, [196, 168, 118], r);
  } else if (kindName === 'barrels') {
    for (const [fx, fy] of [[0.28, 0.27], [0.72, 0.27], [0.28, 0.73], [0.72, 0.73]] as const) barrelTop(g, x0 + w * fx, y0 + h * fy, Math.min(w, h) * 0.22, r);
  }
}

function handCart(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const bw = w * 0.62;
  // håndtag
  for (const x of [-w * 0.2, w * 0.2]) {
    g.beginPath();
    g.moveTo(x, -h * 0.5);
    g.lineTo(x, -h * 0.15);
    g.strokeStyle = OUT;
    g.lineWidth = w * 0.065;
    g.lineCap = 'round';
    g.stroke();
    g.strokeStyle = rgb(shift(WOOD, 8));
    g.lineWidth = w * 0.04;
    g.stroke();
  }
  g.lineCap = 'butt';
  wheel(g, -bw / 2 - w * 0.06, h * 0.14, h * 0.26, w * 0.1);
  wheel(g, bw / 2 + w * 0.06, h * 0.14, h * 0.26, w * 0.1);
  rectP(g, -bw / 2, -h * 0.22, bw, h * 0.7, w * 0.04, WOOD, { lw: 1.8 });
  g.save();
  g.beginPath();
  g.rect(-bw / 2 + w * 0.05, -h * 0.22 + w * 0.05, bw - w * 0.1, h * 0.7 - w * 0.1);
  g.clip();
  planks(g, -bw / 2, -h * 0.22, bw, h * 0.7, shift(WOOD, -14), 7, r);
  g.restore();
  g.strokeStyle = 'rgba(30,16,8,.7)';
  g.lineWidth = 1.2;
  g.strokeRect(-bw / 2 + w * 0.05, -h * 0.22 + w * 0.05, bw - w * 0.1, h * 0.7 - w * 0.1);
  const l = param(o, 'load', 'hay');
  if (l !== 'empty') load(g, l, -bw / 2 + w * 0.07, -h * 0.22 + w * 0.07, bw / 2 - w * 0.07, h * 0.48 - w * 0.07, r);
}

function wagon(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const bw = w * 0.74;
  const y0 = -h * 0.28, y1 = h * 0.46;
  // krumtap og åg
  g.beginPath();
  g.moveTo(0, y0);
  g.lineTo(0, -h * 0.5);
  g.strokeStyle = OUT;
  g.lineWidth = w * 0.08;
  g.stroke();
  g.strokeStyle = rgb(shift(WOOD, 6));
  g.lineWidth = w * 0.05;
  g.stroke();
  rectP(g, -w * 0.2, -h * 0.5, w * 0.4, w * 0.06, 2, DARKWOOD, { lw: 1.3 });
  for (const y of [-h * 0.12, h * 0.3]) {
    wheel(g, -bw / 2 - w * 0.04, y, h * 0.19, w * 0.09);
    wheel(g, bw / 2 + w * 0.04, y, h * 0.19, w * 0.09);
  }
  rectP(g, -bw / 2, y0, bw, y1 - y0, w * 0.03, WOOD, { lw: 2 });
  const cover = param(o, 'cover', 'open') === 'covered';
  if (!cover) {
    g.save();
    g.beginPath();
    g.rect(-bw / 2 + w * 0.04, y0 + w * 0.04, bw - w * 0.08, y1 - y0 - w * 0.08);
    g.clip();
    planks(g, -bw / 2, y0, bw, y1 - y0, shift(WOOD, -14), 12, r);
    g.restore();
    g.strokeStyle = 'rgba(30,16,8,.7)';
    g.lineWidth = 1.2;
    g.strokeRect(-bw / 2 + w * 0.04, y0 + w * 0.04, bw - w * 0.08, y1 - y0 - w * 0.08);
    const kinds = ['crates', 'sacks', 'barrels', 'hay'];
    const mid = (y0 + y1) / 2;
    load(g, kinds[(r() * 4) | 0]!, -bw / 2 + w * 0.06, y0 + w * 0.06, bw / 2 - w * 0.06, mid, r);
    load(g, kinds[(r() * 4) | 0]!, -bw / 2 + w * 0.06, mid, bw / 2 - w * 0.06, y1 - w * 0.06, r);
  } else {
    // sejldug over buer
    const cx0 = -bw / 2 + w * 0.02, cw = bw - w * 0.04;
    const cy0 = y0 + h * 0.0, ch = y1 - y0 + h * 0.0;
    const path = () => {
      roundRect(g, cx0, cy0, cw, ch, w * 0.12);
    };
    paint(g, path, [226, 212, 180], [cx0, cy0, cx0 + cw, cy0 + ch], { lw: 2, bevel: 2 });
    g.save();
    path();
    g.clip();
    const hg = g.createLinearGradient(cx0, 0, cx0 + cw, 0);
    hg.addColorStop(0, 'rgba(0,0,0,.22)');
    hg.addColorStop(0.35, 'rgba(255,255,255,.22)');
    hg.addColorStop(0.7, 'rgba(0,0,0,.02)');
    hg.addColorStop(1, 'rgba(0,0,0,.3)');
    g.fillStyle = hg;
    g.fillRect(cx0, cy0, cw, ch);
    g.strokeStyle = 'rgba(70,50,30,.45)';
    g.lineWidth = 1.2;
    for (let i = 1; i < 7; i++) {
      const y = cy0 + (ch * i) / 7;
      g.beginPath();
      g.moveTo(cx0, y);
      g.lineTo(cx0 + cw, y);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(0, cy0);
    g.lineTo(0, cy0 + ch);
    g.strokeStyle = 'rgba(70,50,30,.35)';
    g.stroke();
    speckle(g, r, [cx0, cy0, cx0 + cw, cy0 + ch], 40, [200, 186, 150], 0.3, 1.2);
    g.restore();
  }
}

const cartKinds: ObjectKind[] = [
  kind({
    key: 'cart_hand', family: 'cart', name: 'Trækvogn', w: 1.6, h: 2.6, shadow: 6, bleed: 0.05,
    params: [{ key: 'load', label: 'Last', type: 'select', default: 'hay', options: [{ value: 'empty', label: 'Tom' }, { value: 'hay', label: 'Hø' }, { value: 'crates', label: 'Kasser' }, { value: 'sacks', label: 'Sække' }, { value: 'barrels', label: 'Tønder' }] }],
    draw: handCart,
  }),
  kind({
    key: 'wagon', family: 'cart', name: 'Vogn', w: 2, h: 4, shadow: 8, bleed: 0.05,
    params: [{ key: 'cover', label: 'Overdækning', type: 'select', default: 'open', options: [{ value: 'open', label: 'Åben med last' }, { value: 'covered', label: 'Sejldug' }] }],
    draw: wagon,
  }),
];

// ---------------------------------------------------------------- varer

function hay(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const n = param(o, 'count', 1);
  const bh = h / n;
  for (let k = 0; k < n; k++) {
    g.save();
    g.translate((r() - 0.5) * w * 0.06 * (n - 1), -h / 2 + bh * (k + 0.5));
    g.rotate((r() - 0.5) * 0.08 * (n > 1 ? 1 : 0));
    const bw = w * 0.96, bhh = bh * 0.92;
    const col: RGB = mix([206, 170, 82], [190, 150, 70], r());
    rectP(g, -bw / 2, -bhh / 2, bw, bhh, 3, col, { lw: 1.7 });
    g.save();
    g.beginPath();
    g.rect(-bw / 2, -bhh / 2, bw, bhh);
    g.clip();
    for (let i = 0; i < 160; i++) {
      const x = (r() - 0.5) * bw, y = (r() - 0.5) * bhh;
      const a = (r() - 0.5) * 0.9;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
      g.strokeStyle = rgb(shift(col, (r() - 0.5) * 80), 0.75);
      g.lineWidth = 0.8;
      g.stroke();
    }
    g.restore();
    for (const x of [-bw * 0.24, bw * 0.24]) {
      g.fillStyle = 'rgba(80,56,30,.85)';
      g.fillRect(x - 2, -bhh / 2, 4, bhh);
      g.fillStyle = 'rgba(255,230,170,.35)';
      g.fillRect(x - 2, -bhh / 2, 1.2, bhh);
    }
    g.restore();
  }
}

function sacks(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const tone = param(o, 'tone', 'grain');
  const col: RGB = tone === 'flour' ? [232, 226, 210] : tone === 'coal' ? [74, 70, 70] : [188, 156, 104];
  const spots = [[-0.32, -0.22, 0.45], [0.34, -0.26, 0.42], [0.0, 0.34, 0.48]] as const;
  for (const [x, y, s] of spots) {
    contact(g, R * x + R * 0.1, R * y + R * 0.14, R * s * 1.05, R * s * 1.0, 0.35);
    sack(g, R * x, R * y, R * s, mix(col, shift(col, r() > 0.5 ? 14 : -12), 0.7), r);
  }
}

const goodsKinds: ObjectKind[] = [
  kind({
    key: 'haybale', family: 'goods', name: 'Høballer', w: 1.2, h: 0.8, keepAspect: false, shadow: 5, bleed: 0.04,
    params: [{ key: 'count', label: 'Antal', type: 'range', min: 1, max: 3, step: 1, default: 1 }],
    draw: hay,
  }),
  kind({
    key: 'sacks', family: 'goods', name: 'Sække', w: 1.2, h: 1.2, randomRotation: true, sizeJitter: 0.1, shadow: 4, bleed: 0.04,
    params: [{ key: 'tone', label: 'Indhold', type: 'select', default: 'grain', options: [{ value: 'grain', label: 'Korn' }, { value: 'flour', label: 'Mel' }, { value: 'coal', label: 'Kul' }] }],
    draw: sacks,
  }),
];

export const townKinds: ObjectKind[] = [...stallKinds, ...wellKinds, ...cartKinds, ...goodsKinds];
