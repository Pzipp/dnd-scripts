import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, ellBody, leaf, lin, mottle, OUT, polyBody, rectBody, rectPath, rgb, shift, tube, wobble, blobPath, type G, type RGB, type Rnd } from '../pack2/helpers';
import { axe, breastplate, helmet, roundShield, sword, STEEL, IRON, BRONZE } from './arms';
import { bead, coin, sack, vary, woodDisc, woodRect, ironRect } from './common';

/** Markedsboder og butiksdiske: indretning set oppefra med varer. */

type Goods = (g: G, r: Rnd, x: number, y: number, w: number, h: number) => void;

/** Flettet kurv set oppefra med indhold i `fill`. */
function basket(g: G, r: Rnd, cx: number, cy: number, rad: number, fill: (cx: number, cy: number, rad: number) => void): void {
  ellBody(g, cx, cy, rad, rad, [150, 106, 56], { lw: 1.4 });
  g.save();
  g.beginPath();
  g.arc(cx, cy, rad - 1, 0, 7);
  g.clip();
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * 6.283;
    g.strokeStyle = i % 2 ? 'rgba(60,34,10,.35)' : 'rgba(255,220,150,.22)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * rad * 0.7, cy + Math.sin(a) * rad * 0.7);
    g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    g.stroke();
  }
  g.restore();
  ellBody(g, cx, cy, rad * 0.78, rad * 0.78, [70, 46, 24], { lw: 0.8, ao: 1 });
  g.save();
  g.beginPath();
  g.arc(cx, cy, rad * 0.76, 0, 7);
  g.clip();
  fill(cx, cy, rad * 0.78);
  g.restore();
  void r;
}

type Produce = 'cabbage' | 'apple' | 'carrot' | 'onion' | 'pumpkin' | 'pear' | 'turnip';

function produceItem(g: G, r: Rnd, x: number, y: number, s: number, t: Produce): void {
  if (t === 'cabbage') {
    bead(g, x, y, s, vary(r, [118, 168, 70], 20));
    g.strokeStyle = 'rgba(230,250,200,.4)';
    g.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(x - s * 0.1, y - s * 0.1, s * (0.35 + i * 0.22), 0.6, 4.6);
      g.stroke();
    }
  } else if (t === 'apple') {
    bead(g, x, y, s, r() < 0.5 ? vary(r, [196, 44, 36], 20) : vary(r, [150, 180, 56], 20));
    g.fillStyle = 'rgba(50,28,10,.8)';
    g.beginPath();
    g.arc(x + s * 0.1, y - s * 0.1, s * 0.12, 0, 7);
    g.fill();
  } else if (t === 'onion') {
    bead(g, x, y, s, vary(r, [190, 130, 70], 20), s * 0.92);
    g.strokeStyle = 'rgba(80,40,10,.35)';
    g.lineWidth = 0.7;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(x + i * s * 0.4, y - s * 0.8);
      g.quadraticCurveTo(x + i * s * 0.6, y, x + i * s * 0.4, y + s * 0.8);
      g.stroke();
    }
  } else if (t === 'pumpkin') {
    bead(g, x, y, s * 1.2, vary(r, [226, 122, 30], 16), s);
    g.strokeStyle = 'rgba(110,50,8,.4)';
    g.lineWidth = 0.9;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.ellipse(x, y, Math.abs(i) * s * 0.28 + 0.1, s, 0, -1.4, 1.4);
      g.stroke();
    }
    g.fillStyle = 'rgba(70,90,30,.9)';
    g.fillRect(x - 1, y - 2, 2.4, 2.4);
  } else if (t === 'pear') {
    bead(g, x, y, s * 0.9, vary(r, [190, 190, 70], 20), s * 1.1);
    g.fillStyle = 'rgba(60,34,10,.8)';
    g.fillRect(x, y - s, 1.4, 2.6);
  } else if (t === 'turnip') {
    bead(g, x, y, s, vary(r, [236, 226, 236], 10));
    g.fillStyle = 'rgba(130,60,140,.55)';
    g.beginPath();
    g.ellipse(x, y - s * 0.4, s * 0.8, s * 0.4, 0, 3.2, 6.3);
    g.fill();
  } else {
    // gulerod: lille bundt
    for (let i = 0; i < 4; i++) {
      const a = r() * 6.283;
      polyBody(g, [[x, y], [x + Math.cos(a) * s * 1.6 - Math.sin(a) * s * 0.28, y + Math.sin(a) * s * 1.6 + Math.cos(a) * s * 0.28], [x + Math.cos(a) * s * 1.6 + Math.sin(a) * s * 0.28, y + Math.sin(a) * s * 1.6 - Math.cos(a) * s * 0.28]], [226, 112, 26], { lw: 0.8, ao: 0.3, rim: 0.3 });
    }
    leaf(g, x, y, r() * 6.3, s * 1.2, s * 0.4, [80, 150, 50], false);
  }
}

function pile(g: G, r: Rnd, cx: number, cy: number, rad: number, t: Produce): void {
  const sz = t === 'pumpkin' ? rad * 0.42 : rad * 0.27;
  const n = Math.round(rad * rad * 0.9 / (sz * sz) * 0.45) + 3;
  const used: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let tries = 0; tries < 8; tries++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * (rad - sz * 0.7);
      const px = cx + Math.cos(a) * d;
      const py = cy + Math.sin(a) * d;
      if (used.every(([ux, uy]) => Math.hypot(ux - px, uy - py) > sz * 1.1)) {
        used.push([px, py]);
        produceItem(g, r, px, py, sz, t);
        break;
      }
    }
  }
}

const vegGoods: Goods = (g, r, x, y, w, h) => {
  const types: Produce[] = ['cabbage', 'apple', 'carrot', 'onion', 'pumpkin', 'pear', 'turnip'];
  const n = Math.max(2, Math.round(w / (h * 0.95)));
  const rad = Math.min(h * 0.46, (w / n) * 0.48);
  for (let i = 0; i < n; i++) {
    const t = types[Math.floor(r() * types.length)]!;
    const cx = x + (w / n) * (i + 0.5);
    const cy = y + h / 2;
    basket(g, r, cx, cy, rad, (bx, by, br) => pile(g, r, bx, by, br, t));
  }
};

/** Stofruller (liggende) og et foldet stativ. */
function clothRoll(g: G, r: Rnd, x: number, y: number, len: number, th: number, col: RGB, pat: number): void {
  const path = rectPath(g, x, y, len, th, th * 0.35);
  body(g, path, col, [x, y, x + len, y + th], { lw: 1.2, ao: th * 0.12, rim: 1 });
  g.save();
  path();
  g.clip();
  if (pat === 1) {
    g.fillStyle = rgb(shift(col, 70), 0.55);
    for (let i = 0; i < len; i += th * 0.8) g.fillRect(x + i, y, th * 0.3, th);
  } else if (pat === 2) {
    g.fillStyle = rgb(shift(col, -60), 0.5);
    g.fillRect(x, y + th * 0.4, len, th * 0.16);
    g.fillRect(x, y + th * 0.72, len, th * 0.1);
  } else if (pat === 3) {
    g.fillStyle = rgb(shift(col, 80), 0.6);
    for (let i = 0; i < len; i += th * 0.7) {
      g.beginPath();
      g.arc(x + i + th * 0.3, y + th * 0.5, th * 0.14, 0, 7);
      g.fill();
    }
  }
  // fold langs rullen
  g.strokeStyle = 'rgba(0,0,0,.12)';
  g.lineWidth = 0.8;
  for (let i = 0; i < len; i += 4 + r() * 4) {
    g.beginPath();
    g.moveTo(x + i, y);
    g.lineTo(x + i + (r() - 0.5) * 2, y + th);
    g.stroke();
  }
  g.restore();
  // rullens ende som spiral
  const ex = x + len;
  ellBody(g, ex - th * 0.1, y + th / 2, th * 0.5, th * 0.5, shift(col, 18), { lw: 1.1, ao: 0.6 });
  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.lineWidth = 0.8;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.arc(ex - th * 0.1, y + th / 2, th * 0.11 * i, 0, 7);
    g.stroke();
  }
}

const clothGoods: Goods = (g, r, x, y, w, h) => {
  const cols: RGB[] = [[170, 40, 44], [40, 70, 150], [214, 170, 50], [50, 120, 70], [120, 50, 140], [210, 200, 180], [60, 130, 150], [200, 110, 50]];
  const stackW = w * 0.24;
  const rollsW = w - stackW - 4;
  const rows = 3;
  const th = (h - 4) / rows - 2;
  for (let row = 0; row < rows; row++) {
    const len = rollsW * (0.9 + r() * 0.1);
    clothRoll(g, r, x + 2 + r() * (rollsW - len), y + 2 + row * (th + 2), len, th, cols[Math.floor(r() * cols.length)]!, Math.floor(r() * 4));
  }
  // foldet stak
  let yy = y + h - 4;
  for (let i = 0; i < 5; i++) {
    const c = cols[Math.floor(r() * cols.length)]!;
    const hh = 4 + r() * 2;
    rectBody(g, x + w - stackW - 1 + (r() - 0.5) * 2, yy - hh, stackW, hh, 1, c, { lw: 1, ao: 0.8, rim: 0.5 });
    yy -= hh - 0.4;
  }
};

const SPICES: RGB[] = [[210, 70, 36], [226, 168, 36], [120, 76, 40], [50, 44, 40], [96, 130, 50], [200, 150, 90], [170, 40, 50], [220, 200, 140]];

const spiceGoods: Goods = (g, r, x, y, w, h) => {
  const n = Math.max(3, Math.round(w / (h * 0.5)));
  const rows = 2;
  const per = Math.ceil(n / rows);
  const rad = Math.min((w / per) * 0.46, (h / rows) * 0.46);
  let k = 0;
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < per; i++) {
      const cx = x + (w / per) * (i + 0.5) + (row ? w / per / 2 - w / per / 4 : 0);
      const cy = y + (h / rows) * (row + 0.5);
      const col = SPICES[(k++ + Math.floor(r() * 3)) % SPICES.length]!;
      if (r() < 0.55) {
        woodDisc(g, r, cx, cy, rad, [140, 96, 52]);
        ellBody(g, cx, cy, rad * 0.8, rad * 0.8, [60, 36, 18], { lw: 0.8, ao: 1 });
        const pts = wobble(r, cx - rad * 0.06, cy - rad * 0.06, rad * 0.7, rad * 0.7, 12, 0.08);
        g.fillStyle = rgb(col);
        blobPath(g, pts)();
        g.fill();
        g.fillStyle = lin(g, cx - rad * 0.6, cy - rad * 0.6, cx + rad * 0.6, cy + rad * 0.6, [[0, 'rgba(255,255,255,.35)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.35)']]);
        blobPath(g, pts)();
        g.fill();
        mottle(g, r, [cx - rad * 0.5, cy - rad * 0.5, cx + rad * 0.5, cy + rad * 0.5], col, 14, 1.4, 22, 0.6);
      } else {
        sack(g, r, cx, cy, rad * 1.02, vary(r, [190, 160, 110], 14), col);
      }
    }
  }
};

const fishGoods: Goods = (g, r, x, y, w, h) => {
  const path = rectPath(g, x, y, w, h, 3);
  body(g, path, [150, 176, 190], [x, y, x + w, y + h], { lw: 1.2 });
  g.save();
  path();
  g.clip();
  mottle(g, r, [x, y, x + w, y + h], [220, 240, 250], 40, 3.5, 40, 0.5);
  g.restore();
  const n = Math.round(w / 22) + 1;
  for (let i = 0; i < n; i++) {
    const cx = x + 14 + ((w - 28) * (i + 0.5)) / n + (r() - 0.5) * 8;
    const cy = y + h * (0.25 + r() * 0.5);
    const len = Math.min(h * 0.9, 26 + r() * 10);
    const ang = (r() - 0.5) * 1.4 + (r() < 0.5 ? 0 : Math.PI);
    const col = r() < 0.5 ? vary(r, [120, 140, 156], 24) : vary(r, [180, 110, 80], 24);
    g.save();
    g.translate(cx, cy);
    g.rotate(ang);
    // hale
    polyBody(g, [[-len * 0.4, 0], [-len * 0.66, -len * 0.2], [-len * 0.6, 0], [-len * 0.66, len * 0.2]], shift(col, -20), { lw: 1, ao: 0.3, rim: 0.3 });
    ellBody(g, 0, 0, len * 0.5, len * 0.19, col, { lw: 1.1, ao: 1, rim: 0.8 });
    g.save();
    g.beginPath();
    g.ellipse(0, 0, len * 0.5 - 1, len * 0.19 - 1, 0, 0, 7);
    g.clip();
    g.fillStyle = 'rgba(255,255,255,.28)';
    g.fillRect(-len * 0.5, -len * 0.19, len, len * 0.1);
    g.strokeStyle = 'rgba(0,0,0,.13)';
    g.lineWidth = 0.6;
    for (let k = -4; k < 5; k++) {
      g.beginPath();
      g.arc(k * len * 0.1, 0, len * 0.16, -1, 1);
      g.stroke();
    }
    g.restore();
    g.fillStyle = 'rgba(230,240,255,.95)';
    g.beginPath();
    g.arc(len * 0.36, -len * 0.04, len * 0.045, 0, 7);
    g.fill();
    g.fillStyle = '#111';
    g.beginPath();
    g.arc(len * 0.37, -len * 0.04, len * 0.022, 0, 7);
    g.fill();
    g.restore();
  }
};

const weaponGoods: Goods = (g, r, x, y, w, h) => {
  const path = rectPath(g, x, y, w, h, 2);
  body(g, path, [70, 28, 30], [x, y, x + w, y + h], { lw: 1.2 });
  const n = Math.max(3, Math.round(w / 15));
  for (let i = 0; i < n; i++) {
    const px = x + 8 + ((w - 16) * (i + 0.5)) / n;
    const t = i % 4;
    if (t === 0) sword(g, px, y + h * 0.1, Math.PI / 2 + (r() - 0.5) * 0.08, h * 0.82, { wide: 1.1 });
    else if (t === 1) axe(g, px, y + h * 0.1, Math.PI / 2, h * 0.8, { double: r() < 0.3 });
    else if (t === 2) sword(g, px, y + h * 0.08, Math.PI / 2, h * 0.5, { blade: [190, 194, 204], guard: IRON, wide: 1.5 });
    else sword(g, px, y + h * 0.1, Math.PI / 2, h * 0.8, { curved: 0.06, guard: BRONZE });
  }
};

const jewelGoods: Goods = (g, r, x, y, w, h) => {
  const path = rectPath(g, x, y, w, h, 2);
  body(g, path, [96, 26, 56], [x, y, x + w, y + h], { lw: 1.2 });
  g.save();
  path();
  g.clip();
  mottle(g, r, [x, y, x + w, y + h], [96, 26, 56], 30, 4, 22, 0.5);
  g.restore();
  const gems: RGB[] = [[60, 100, 220], [60, 190, 110], [220, 50, 60], [240, 220, 120], [160, 90, 220], [240, 240, 255]];
  const n = Math.max(3, Math.round(w / 26));
  for (let i = 0; i < n; i++) {
    const cx = x + (w * (i + 0.5)) / n;
    const cy = y + h * (0.3 + r() * 0.4);
    const t = i % 3;
    if (t === 0) {
      // halskæde: bue af perler
      for (let k = 0; k <= 9; k++) {
        const a = Math.PI * (0.1 + (k / 9) * 0.8);
        bead(g, cx + Math.cos(a) * w * 0.05, cy - h * 0.1 + Math.sin(a) * h * 0.3, 1.8, k === 4 ? gems[Math.floor(r() * 6)]! : [226, 190, 80]);
      }
    } else if (t === 1) {
      // ring
      for (let k = 0; k < 2; k++) {
        const rx = cx + (k - 0.5) * 12;
        g.beginPath();
        g.arc(rx, cy, 4.5, 0, 7);
        g.strokeStyle = 'rgba(20,10,0,.8)';
        g.lineWidth = 3.2;
        g.stroke();
        g.strokeStyle = 'rgb(226,184,70)';
        g.lineWidth = 2;
        g.stroke();
        bead(g, rx, cy - 4.5, 2, gems[Math.floor(r() * 6)]!);
      }
    } else {
      // løse ædelsten
      for (let k = 0; k < 4; k++) {
        const gx = cx + (r() - 0.5) * 16;
        const gy = cy + (r() - 0.5) * h * 0.4;
        const c = gems[Math.floor(r() * 6)]!;
        polyBody(g, [[gx, gy - 3.4], [gx + 3, gy], [gx, gy + 3.4], [gx - 3, gy]], c, { lw: 0.8, ao: 0.5, rim: 0.5 });
        g.fillStyle = 'rgba(255,255,255,.7)';
        g.fillRect(gx - 1.1, gy - 1.6, 1.2, 1.2);
      }
    }
  }
  coin(g, x + w - 8, y + h - 8, 3.2);
};

const GOODS: Record<string, Goods> = { veg: vegGoods, cloth: clothGoods, spice: spiceGoods, fish: fishGoods, weapons: weaponGoods, jewel: jewelGoods };

const AWN: Record<string, [RGB, RGB]> = {
  veg: [[60, 130, 70], [236, 230, 200]],
  cloth: [[170, 40, 50], [236, 220, 180]],
  spice: [[210, 130, 40], [240, 224, 180]],
  fish: [[50, 100, 150], [236, 236, 230]],
  weapons: [[110, 40, 40], [200, 190, 170]],
  jewel: [[90, 40, 130], [230, 200, 120]],
};

function awning(g: G, r: Rnd, x: number, y: number, w: number, h: number, a: RGB, b: RGB): void {
  const n = Math.max(4, Math.round(w / 14));
  const sw = w / n;
  const path = () => {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w, y);
    for (let i = n - 1; i >= 0; i--) {
      g.lineTo(x + (i + 1) * sw, y + h - sw * 0.2);
      g.arc(x + (i + 0.5) * sw, y + h - sw * 0.2, sw / 2, 0, Math.PI);
    }
    g.closePath();
  };
  path();
  g.fillStyle = rgb(a);
  g.fill();
  g.save();
  path();
  g.clip();
  for (let i = 0; i < n; i += 2) {
    g.fillStyle = rgb(b);
    g.fillRect(x + i * sw, y, sw, h + sw);
  }
  // stoffets bølger og dybde
  g.fillStyle = lin(g, x, y, x, y + h, [[0, 'rgba(255,255,255,.22)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.28)']]);
  g.fillRect(x, y, w, h + sw);
  for (let i = 0; i <= n; i++) {
    g.strokeStyle = 'rgba(0,0,0,.18)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x + i * sw, y);
    g.lineTo(x + i * sw + (r() - 0.5) * 2, y + h);
    g.stroke();
  }
  g.restore();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.lineJoin = 'round';
  g.stroke();
  g.beginPath();
  g.moveTo(x + 2, y + 2);
  g.lineTo(x + w - 2, y + 2);
  g.strokeStyle = 'rgba(255,240,200,.45)';
  g.lineWidth = 1.2;
  g.stroke();
}

function stall(kindKey: string) {
  return (g: G, o: DrawInput): void => {
    const r = rng(o.seed);
    const W = o.w;
    const H = o.h;
    const x0 = -W / 2;
    const y0 = -H / 2;
    const withAwning = param(o, 'awning', true);
    const goodsH = H * (withAwning ? 0.58 : 0.74);
    const ty = y0 + H - goodsH - H * 0.05;
    // bordplade
    woodRect(g, r, x0 + 2, ty, W - 4, goodsH, [150, 104, 60], { count: 4, vertical: false, nails: true });
    // kasser bagved
    if (!withAwning) {
      woodRect(g, r, x0 + 4, y0 + 2, W * 0.28, H * 0.2, [134, 94, 54], { count: 3 });
      woodRect(g, r, x0 + W * 0.7, y0 + 2, W * 0.26, H * 0.2, [122, 84, 48], { count: 3 });
    }
    const pad = 5;
    g.save();
    GOODS[kindKey]!(g, r, x0 + 2 + pad, ty + pad, W - 4 - pad * 2, goodsH - pad * 2);
    g.restore();
    if (withAwning) {
      const [a, b] = AWN[kindKey]!;
      awning(g, r, x0 + 1, y0 + 1, W - 2, ty - y0 - 1 + 4, a, b);
    }
  };
}

const awningParam = { key: 'awning', label: 'Markise', type: 'toggle' as const, default: true };

const stallDefs: [string, string, string][] = [
  ['market_stall_veg', 'veg', 'Markedsbod med grønt'],
  ['market_stall_cloth', 'cloth', 'Markedsbod med stof'],
  ['market_stall_spice', 'spice', 'Markedsbod med krydderier'],
  ['market_stall_fish', 'fish', 'Markedsbod med fisk'],
  ['market_stall_weapons', 'weapons', 'Markedsbod med våben'],
  ['market_stall_jewel', 'jewel', 'Markedsbod med smykker'],
];

/** Disk/skranke med varer, vægt og møntstakke. */
function counter(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const x0 = -W / 2;
  const y0 = -H / 2;
  const top = param(o, 'stone', false);
  if (top) {
    rectBody(g, x0 + 1, y0 + 1, W - 2, H - 2, 3, [150, 146, 140], { lw: 1.8 });
    g.save();
    g.beginPath();
    g.rect(x0 + 2, y0 + 2, W - 4, H - 4);
    g.clip();
    mottle(g, r, [x0, y0, x0 + W, y0 + H], [150, 146, 140], 70, 5, 20, 0.5);
    g.restore();
  } else {
    woodRect(g, r, x0 + 1, y0 + 1, W - 2, H - 2, [128, 86, 50], { count: 5, vertical: false, nails: true, rad: 3 });
  }
  // listekant foran (nederst)
  rectBody(g, x0 + 1, y0 + H - H * 0.14, W - 2, H * 0.13, 2, [96, 62, 34], { lw: 1.2, ao: 1 });
  // vare-rækker
  const potCols: RGB[] = [[150, 60, 40], [60, 100, 150], [90, 130, 70], [190, 150, 60]];
  const n = Math.max(2, Math.round(W / 55));
  for (let i = 0; i < n; i++) {
    const cx = x0 + (W * (i + 0.5)) / n;
    const cy = y0 + H * 0.42;
    if (i % 3 === 0) {
      // lille stak varer i krukker
      for (let k = 0; k < 3; k++) {
        const bx = cx + (k - 1) * 11;
        const by = cy + (k % 2) * 7 - 4;
        ellBody(g, bx, by, 5, 5, vary(r, potCols[Math.floor(r() * 4)]!, 10), { lw: 1, ao: 1 });
        g.fillStyle = 'rgba(0,0,0,.5)';
        g.beginPath();
        g.arc(bx, by, 2.5, 0, 7);
        g.fill();
      }
    } else if (i % 3 === 1) {
      // vægt med to skåle
      const cxs = cx;
      rectBody(g, cxs - 1.2, cy - 10, 2.4, 20, 1, [110, 84, 40], { lw: 0.9, ao: 0.5, rim: 0.3 });
      rectBody(g, cxs - 13, cy - 11.5, 26, 2.2, 1, [188, 150, 60], { lw: 0.9, ao: 0.5, rim: 0.3 });
      for (const s of [-1, 1]) {
        ellBody(g, cxs + s * 12, cy - 4, 6, 6, [206, 168, 70], { lw: 1 });
        g.fillStyle = 'rgba(70,50,20,.55)';
        g.beginPath();
        g.arc(cxs + s * 12, cy - 4, 3.6, 0, 7);
        g.fill();
        if (s > 0) coin(g, cxs + s * 12, cy - 4, 2.1);
      }
    } else {
      // bog og ruller
      rectBody(g, cx - 10, cy - 7, 14, 10, 1.5, vary(r, [120, 50, 40], 20), { lw: 1 });
      g.strokeStyle = 'rgba(230,210,150,.8)';
      g.lineWidth = 0.9;
      g.strokeRect(cx - 8, cy - 5, 10, 6);
      tube(g, () => {
        g.beginPath();
        g.moveTo(cx - 10, cy + 8);
        g.lineTo(cx + 12, cy + 6);
      }, 5, [226, 214, 176], { outline: 1.4 });
    }
  }
  // møntbunke og bog til højre
  for (let k = 0; k < 5; k++) coin(g, x0 + W - 18 + (k % 3) * 4.5, y0 + H * 0.7 + (k % 2) * 2, 2.8 + r());
  // klokke
  ellBody(g, x0 + 14, y0 + H * 0.68, 5, 5, [214, 172, 60], { lw: 1 });
  ellBody(g, x0 + 14, y0 + H * 0.68, 1.6, 1.6, [255, 220, 120], { lw: 0.6, ao: 0.2 });
}

/** Åbent bord med skiftende varer (til loppemarked og håndværkere). */
function wares(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const x0 = -W / 2;
  const y0 = -H / 2;
  woodRect(g, r, x0 + 1, y0 + 1, W - 2, H - 2, [146, 100, 58], { count: 4, vertical: false, nails: true, rad: 3 });
  const kinds = ['pot', 'bottle', 'candle', 'book', 'sack'];
  const cols = Math.max(3, Math.round(W / 24));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < 2; j++) {
      const cx = x0 + (W * (i + 0.5)) / cols + (r() - 0.5) * 4;
      const cy = y0 + H * (0.3 + 0.4 * j) + (r() - 0.5) * 4;
      const t = kinds[Math.floor(r() * kinds.length)]!;
      if (t === 'pot') {
        ellBody(g, cx, cy, 6.5, 6.5, vary(r, [160, 90, 50], 20), { lw: 1.1 });
        ellBody(g, cx, cy, 4, 4, [40, 20, 10], { lw: 0.8, ao: 1 });
      } else if (t === 'bottle') {
        bead(g, cx, cy, 4.2, vary(r, [60, 120, 90], 40));
        g.fillStyle = 'rgba(90,60,30,.9)';
        g.beginPath();
        g.arc(cx, cy, 1.4, 0, 7);
        g.fill();
      } else if (t === 'candle') {
        for (let k = 0; k < 3; k++) {
          bead(g, cx + (k - 1) * 5, cy + (k % 2) * 3, 2.4, [240, 226, 180]);
          g.fillStyle = 'rgba(255,170,40,.9)';
          g.beginPath();
          g.arc(cx + (k - 1) * 5, cy + (k % 2) * 3, 0.9, 0, 7);
          g.fill();
        }
      } else if (t === 'book') {
        rectBody(g, cx - 7, cy - 5, 14, 10, 1.5, vary(r, [100, 50, 40], 40), { lw: 1 });
        g.fillStyle = 'rgba(230,210,150,.7)';
        g.fillRect(cx - 5, cy - 3, 9, 1);
        g.fillRect(cx - 5, cy, 9, 1);
      } else {
        sack(g, r, cx, cy, 7, vary(r, [190, 160, 110], 14));
      }
    }
  }
}

export const shopKinds: ObjectKind[] = [
  ...stallDefs.map(([key, k, name]) =>
    kind({
      key, family: 'shop', name, w: 3, h: 2, keepAspect: false, shadow: 6, bleed: 0.05, randomRotation: false,
      params: [awningParam],
      tags: ['city', 'village', 'outdoor', 'poor'],
      draw: stall(k),
    }),
  ),
  kind({
    key: 'shop_counter', family: 'shop', name: 'Butiksdisk', w: 3.5, h: 1.4, keepAspect: false, shadow: 6, bleed: 0.04,
    params: [{ key: 'stone', label: 'Stenplade', type: 'toggle', default: false }],
    tags: ['indoor', 'city', 'village', 'house'],
    draw: counter,
  }),
  kind({
    key: 'shop_wares_table', family: 'shop', name: 'Varebord', w: 3, h: 1.4, keepAspect: false, shadow: 6, bleed: 0.04,
    tags: ['indoor', 'city', 'village', 'tavern'],
    draw: wares,
  }),
];

void axe;
void breastplate;
void helmet;
void roundShield;
void STEEL;
