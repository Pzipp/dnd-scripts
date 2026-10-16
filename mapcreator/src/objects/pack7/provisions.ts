import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, clipped, ellBody, ellipsePath, mottle, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { woodRect, sack, vary } from '../pack3/common';
import { apple, board, bowl, cheeseWheel, dome, jar, loaf, steam, WOOD, WOOD_DARK } from './props';
import { pick } from './kit';

/** Madvarer og forråd set oppefra: bagerhylder, oste, pølser og skinker, frugt, vinfade, kornsække, kasser. */

function bakeryRack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [140, 100, 60], { vertical: false, count: 3, rad: 3 });
  const rows = Math.max(1, Math.round(H / 34));
  const n = Math.max(3, Math.round(W / 28));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + (W * (i + 0.5)) / n;
      const y = -H / 2 + (H * (j + 0.5)) / rows;
      const t = Math.floor(r() * 4);
      const s = Math.min(W / n, H / rows) * 0.42;
      if (t === 0) loaf(g, r, x, y, s * 2.2, s * 1.3, (r() - 0.5) * 0.3);
      else if (t === 1) ellBody(g, x, y, s * 1.05, s * 1.05, [210, 150, 80], { lw: 1, ao: s * 0.2, rim: 1 }), g.beginPath(), g.arc(x, y, s * 0.4, 0, 7), (g.strokeStyle = 'rgba(120,70,20,.5)'), g.stroke();
      else if (t === 2) { for (let k = 0; k < 3; k++) loaf(g, r, x - s * 0.6 + k * s * 0.6, y + (k - 1) * s * 0.1, s * 0.6, s * 1.6, 0.1 * (k - 1), [206, 150, 80]); }
      else { ellBody(g, x, y, s * 1.1, s * 0.8, [226, 190, 120], { lw: 1, ao: s * 0.15, rim: 0.8 }); for (let k = 0; k < 4; k++) ellBody(g, x + (r() - 0.5) * s, y + (r() - 0.5) * s * 0.6, 1.1, 1.1, [120, 50, 30], { lw: 0.3, ao: 0 }); }
    }
  }
}

function cheese(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const mode = param(o, 'stack', 'single');
  if (mode === 'single') cheeseWheel(g, 0, 0, S * 0.44, vary(r, [226, 190, 90], 20), param(o, 'cut', false));
  else if (mode === 'stack') {
    // stak set oppefra: øverste hjul øverst, nederste titter ud under
    cheeseWheel(g, S * 0.08, S * 0.08, S * 0.44, [214, 176, 82]);
    cheeseWheel(g, S * 0.02, S * 0.03, S * 0.4, [222, 186, 92]);
    cheeseWheel(g, -S * 0.04, -S * 0.02, S * 0.36, [232, 198, 104], param(o, 'cut', false));
  } else {
    for (let i = 0; i < 5; i++) {
      const a = r() * 6.283;
      const d = r() * S * 0.3;
      g.save();
      g.translate(Math.cos(a) * d, Math.sin(a) * d);
      g.rotate(r() * 6.28);
      polyBody(g, [[0, 0], [S * 0.34, -S * 0.1], [S * 0.34, S * 0.1]], pick(r, [[236, 206, 110], [226, 180, 80], [244, 226, 160]] as RGB[]), { lw: 1, ao: 1, rim: 0.8 });
      g.restore();
    }
  }
}

function sausages(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const mode = param(o, 'type', 'sausage');
  const n = Math.round(param(o, 'count', 9));
  if (mode === 'ham') {
    for (let i = 0; i < Math.min(5, n); i++) {
      g.save();
      g.translate((r() - 0.5) * S * 0.6, (r() - 0.5) * S * 0.6);
      g.rotate(r() * 6.28);
      const hp = ellipsePath(g, 0, 0, S * 0.26, S * 0.18);
      body(g, hp, [186, 96, 84], [-S * 0.26, -S * 0.18, S * 0.26, S * 0.18], { lw: 1.3, ao: 3, rim: 1.4 });
      ellBody(g, -S * 0.27, 0, S * 0.05, S * 0.05, [236, 226, 206], { lw: 0.9, ao: 0.3 });
      clipped(g, hp, () => {
        g.strokeStyle = 'rgba(100,40,30,.4)';
        g.lineWidth = 0.9;
        for (let k = -3; k <= 3; k++) {
          g.beginPath();
          g.moveTo(k * S * 0.07, -S * 0.2);
          g.lineTo(k * S * 0.07 + 2, S * 0.2);
          g.stroke();
        }
      });
      g.restore();
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    g.save();
    g.translate((r() - 0.5) * S * 0.5, -S * 0.4 + (i / n) * S * 0.8);
    g.rotate((r() - 0.5) * 0.9);
    const L = S * (0.45 + r() * 0.2);
    const col = pick(r, [[170, 70, 56], [140, 56, 44], [190, 100, 70]] as RGB[]);
    const p = rectPath(g, -L / 2, -S * 0.05, L, S * 0.1, S * 0.05);
    body(g, p, col, [-L / 2, -S * 0.05, L / 2, S * 0.05], { lw: 1.1, ao: 1.4, rim: 1 });
    g.strokeStyle = 'rgba(60,20,10,.5)';
    g.lineWidth = 1;
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.moveTo(k * L * 0.18, -S * 0.05);
      g.lineTo(k * L * 0.18, S * 0.05);
      g.stroke();
    }
    g.restore();
  }
}

function fruitBasket(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // flettet kurv set oppefra
  ellBody(g, 0, 0, S * 0.47, S * 0.47, [170, 130, 76], { lw: 1.6, ao: 4, rim: 2 });
  clipped(g, ellipsePath(g, 0, 0, S * 0.47, S * 0.47), () => {
    g.strokeStyle = 'rgba(70,40,12,.5)';
    g.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * 6.283;
      g.beginPath();
      g.moveTo(Math.cos(a) * S * 0.3, Math.sin(a) * S * 0.3);
      g.lineTo(Math.cos(a) * S * 0.5, Math.sin(a) * S * 0.5);
      g.stroke();
    }
  });
  g.beginPath();
  g.arc(0, 0, S * 0.4, 0, 7);
  g.fillStyle = 'rgba(30,18,8,.8)';
  g.fill();
  const t = param(o, 'fruit', 'apples');
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * S * 0.28;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    if (t === 'grapes') {
      ellBody(g, x, y, S * 0.065, S * 0.065, pick(r, [[100, 40, 120], [120, 56, 140]] as RGB[]), { lw: 0.8, ao: 0.4, rim: 0.4 });
    } else if (t === 'mixed') {
      apple(g, x, y, S * 0.1, pick(r, [[186, 36, 32], [214, 176, 50], [226, 130, 40], [120, 160, 50]] as RGB[]));
    } else {
      apple(g, x, y, S * 0.1, pick(r, [[186, 36, 32], [170, 40, 36], [120, 160, 50]] as RGB[]));
    }
  }
  tube(g, () => {
    g.beginPath();
    g.arc(0, 0, S * 0.46, 0.3, 1.2);
  }, 1.6, [120, 84, 44], { outline: 0.6 });
}

/** Vinfade ligger side om side set oppefra: aflange tønder med bånd og spund. */
function wineBarrels(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const n = Math.round(param(o, 'count', 4));
  const bw = W / n;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + i * bw + bw * 0.06;
    const w = bw * 0.88;
    const p = () => {
      g.beginPath();
      g.moveTo(x + w * 0.12, -H / 2);
      g.quadraticCurveTo(x - w * 0.04, 0, x + w * 0.12, H / 2);
      g.lineTo(x + w * 0.88, H / 2);
      g.quadraticCurveTo(x + w * 1.04, 0, x + w * 0.88, -H / 2);
      g.closePath();
    };
    body(g, p, vary(r, [138, 96, 56], 18), [x, -H / 2, x + w, H / 2], { lw: 1.6, ao: 3, rim: 1.4, angle: 0 });
    clipped(g, p, () => {
      g.strokeStyle = 'rgba(30,14,4,.4)';
      g.lineWidth = 0.8;
      for (let k = 1; k < 7; k++) {
        g.beginPath();
        g.moveTo(x + (w * k) / 7, -H / 2);
        g.lineTo(x + (w * k) / 7, H / 2);
        g.stroke();
      }
      for (const y of [-0.36, -0.16, 0.16, 0.36]) {
        g.fillStyle = 'rgba(60,60,66,.85)';
        g.fillRect(x, y * H - 2, w, 4);
        g.fillStyle = 'rgba(255,255,255,.22)';
        g.fillRect(x, y * H - 2, w, 1);
      }
    });
    dome(g, x + w * 0.5, 0, w * 0.1, w * 0.1, [60, 40, 28], 0.9);
    ellBody(g, x + w * 0.5, 0, w * 0.045, w * 0.045, [20, 12, 8], { lw: 0.5, ao: 0 });
    p();
    g.strokeStyle = 'rgba(22,12,6,.85)';
    g.lineWidth = 1.6;
    g.stroke();
  }
}

function sackStack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const h = Math.round(param(o, 'height', 2));
  const cols = Math.max(2, Math.round(W / 38));
  const rows = Math.max(1, Math.round(H / 38));
  const base: RGB = pick(r, [[196, 170, 120], [176, 150, 106], [210, 190, 146]] as RGB[]);
  // nederste lag først, derefter højere lag forskudt (hver stak ses ovenfra)
  for (let lvl = 0; lvl < h; lvl++) {
    const sc = 1 - lvl * 0.12;
    const cc = Math.max(1, cols - lvl);
    const rr = Math.max(1, rows - (lvl > 1 ? 1 : 0));
    for (let j = 0; j < rr; j++) {
      for (let i = 0; i < cc; i++) {
        const px = -W / 2 + (W * (i + 0.5 + lvl * 0.5)) / cols;
        const py = -H / 2 + (H * (j + 0.5)) / rows;
        sack(g, r, px - lvl * 2, py - lvl * 2, Math.min(W / cols, H / rows) * 0.5 * sc, vary(r, shift(base, lvl * 8), 12), r() < 0.3 ? [226, 214, 160] : undefined);
      }
    }
  }
}

function vegCrate(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [140, 100, 60], { vertical: false, count: 4, rad: 2, nails: true });
  rectBody(g, -W * 0.42, -H * 0.42, W * 0.84, H * 0.84, 2, [50, 34, 22], { lw: 1, ao: 3 });
  const t = param(o, 'goods', 'veg');
  const n = 16;
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * W * 0.74;
    const y = (r() - 0.5) * H * 0.74;
    if (t === 'fish') {
      g.save();
      g.translate(x, y);
      g.rotate(r() * 6);
      ellBody(g, 0, 0, W * 0.1, H * 0.05, pick(r, [[150, 170, 186], [176, 150, 130]] as RGB[]), { lw: 0.8, ao: 0.6, rim: 0.4 });
      polyBody(g, [[W * 0.1, 0], [W * 0.15, -H * 0.04], [W * 0.15, H * 0.04]], [140, 150, 164], { lw: 0.6, ao: 0.2, rim: 0.2 });
      g.restore();
    } else if (t === 'onions') {
      ellBody(g, x, y, W * 0.055, W * 0.055, pick(r, [[226, 190, 110], [190, 100, 120]] as RGB[]), { lw: 0.8, ao: 0.6, rim: 0.5 });
    } else if (t === 'eggs') {
      ellBody(g, x, y, W * 0.045, W * 0.058, pick(r, [[240, 232, 214], [206, 170, 130]] as RGB[]), { lw: 0.7, ao: 0.4, rim: 0.4 });
    } else {
      const k = Math.floor(r() * 3);
      if (k === 0) ellBody(g, x, y, W * 0.07, W * 0.07, [90, 150, 60], { lw: 0.9, ao: 1, rim: 0.7 });
      else if (k === 1) apple(g, x, y, W * 0.05, [226, 120, 36]);
      else ellBody(g, x, y, W * 0.055, W * 0.055, [156, 90, 50], { lw: 0.8, ao: 0.6, rim: 0.4 });
    }
  }
  if (t === 'fish') for (let i = 0; i < 20; i++) ellBody(g, (r() - 0.5) * W * 0.8, (r() - 0.5) * H * 0.8, 1.6, 1.6, [226, 240, 248], { lw: 0.3, ao: 0 });
}

function honeyJars(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [150, 108, 66], { vertical: false, count: 3, rad: 2 });
  const n = Math.max(3, Math.round(W / 24));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    const rad = Math.min(W / n * 0.42, H * 0.4);
    jar(g, x, (r() - 0.5) * H * 0.2, rad, [196, 160, 60], [120, 84, 50], pick(r, [[220, 160, 30], [200, 120, 24], [240, 190, 60]] as RGB[]));
  }
}

function pieTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [150, 108, 66], { vertical: false, count: 3, rad: 3 });
  rectBody(g, -W * 0.46, -H * 0.4, W * 0.92, H * 0.8, 1, [236, 230, 214], { lw: 0.9, ao: 1.5 });
  const n = Math.max(2, Math.round(W / 40));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    const R = Math.min(W / n * 0.42, H * 0.36);
    ellBody(g, x, 0, R, R, [150, 150, 158], { lw: 1, ao: R * 0.1, rim: 0.8 });
    ellBody(g, x, 0, R * 0.86, R * 0.86, [206, 150, 80], { lw: 0.9, ao: R * 0.12, rim: 1 });
    g.strokeStyle = 'rgba(110,60,20,.6)';
    g.lineWidth = 1;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 6.283;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7);
      g.lineTo(x + Math.cos(a) * R * 0.84, Math.sin(a) * R * 0.84);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(x - R * 0.3, -R * 0.3);
    g.lineTo(x + R * 0.3, R * 0.3);
    g.moveTo(x + R * 0.3, -R * 0.3);
    g.lineTo(x - R * 0.3, R * 0.3);
    g.stroke();
  }
  steam(g, r, 0, 0, W * 0.4, 3, 0.08);
}

const T = { family: 'provisions', shadow: 5 } as const;
const tags = ['village', 'city', 'tavern', 'house', 'farm', 'indoor'];

export const provisionKinds: ObjectKind[] = [
  kind({ ...T, key: 'prov_bakery_rack', name: 'Bagerhylde', w: 2, h: 1, params: [], tags, draw: bakeryRack }),
  kind({ ...T, key: 'prov_bakery_rack_big', name: 'Bagerhylde, stor', w: 3, h: 1.6, params: [], tags, draw: bakeryRack }),
  kind({ ...T, key: 'prov_cheese', name: 'Ostehjul', w: 0.8, h: 0.8, shadow: 3, randomRotation: true, params: [{ key: 'stack', label: 'Opstilling', type: 'select', default: 'single', options: [{ value: 'single', label: 'Ét hjul' }, { value: 'stack', label: 'Stak' }, { value: 'wedges', label: 'Kiler' }] }, { key: 'cut', label: 'Skåret', type: 'toggle', default: false }], tags, draw: cheese }),
  kind({ ...T, key: 'prov_cheese_stack', name: 'Ostestak', w: 1, h: 1, shadow: 4, randomRotation: true, params: [{ key: 'stack', label: 'Opstilling', type: 'select', default: 'stack', options: [{ value: 'stack', label: 'Stak' }, { value: 'single', label: 'Ét hjul' }, { value: 'wedges', label: 'Kiler' }] }, { key: 'cut', label: 'Skåret', type: 'toggle', default: true }], tags, draw: cheese }),
  kind({ ...T, key: 'prov_sausages', name: 'Pølser', w: 1, h: 1, shadow: 3, randomRotation: true, params: [{ key: 'type', label: 'Slags', type: 'select', default: 'sausage', options: [{ value: 'sausage', label: 'Pølser' }, { value: 'ham', label: 'Skinker' }] }, { key: 'count', label: 'Antal', type: 'range', min: 3, max: 14, step: 1, default: 9 }], tags, draw: sausages }),
  kind({ ...T, key: 'prov_hams', name: 'Skinker', w: 1.2, h: 1.2, shadow: 3, randomRotation: true, params: [{ key: 'type', label: 'Slags', type: 'select', default: 'ham', options: [{ value: 'ham', label: 'Skinker' }, { value: 'sausage', label: 'Pølser' }] }, { key: 'count', label: 'Antal', type: 'range', min: 3, max: 14, step: 1, default: 5 }], tags, draw: sausages }),
  kind({ ...T, key: 'prov_fruit_basket', name: 'Frugtkurv', w: 0.9, h: 0.9, shadow: 4, randomRotation: true, params: [{ key: 'fruit', label: 'Frugt', type: 'select', default: 'apples', options: [{ value: 'apples', label: 'Æbler' }, { value: 'grapes', label: 'Druer' }, { value: 'mixed', label: 'Blandet' }] }], tags, draw: fruitBasket }),
  kind({ ...T, key: 'prov_wine_barrels', name: 'Vinfade i række', w: 3, h: 1.4, params: [{ key: 'count', label: 'Antal', type: 'range', min: 2, max: 8, step: 1, default: 4 }], tags: [...tags, 'harbor', 'dungeon'], draw: wineBarrels }),
  kind({ ...T, key: 'prov_wine_barrels_long', name: 'Vinfade, lang række', w: 5, h: 1.4, params: [{ key: 'count', label: 'Antal', type: 'range', min: 3, max: 10, step: 1, default: 6 }], tags: [...tags, 'harbor', 'dungeon'], draw: wineBarrels }),
  kind({ ...T, key: 'prov_grain_sacks', name: 'Kornsække i stak', w: 1.6, h: 1.2, params: [{ key: 'height', label: 'Lag', type: 'range', min: 1, max: 3, step: 1, default: 2 }], tags: [...tags, 'harbor'], draw: sackStack }),
  kind({ ...T, key: 'prov_grain_sacks_big', name: 'Kornsække, stor stak', w: 2.6, h: 1.8, params: [{ key: 'height', label: 'Lag', type: 'range', min: 1, max: 3, step: 1, default: 3 }], tags: [...tags, 'harbor'], draw: sackStack }),
  kind({ ...T, key: 'prov_crate_veg', name: 'Kasse med grønt', w: 1, h: 0.8, params: [{ key: 'goods', label: 'Indhold', type: 'select', default: 'veg', options: [{ value: 'veg', label: 'Grønt' }, { value: 'onions', label: 'Løg' }, { value: 'eggs', label: 'Æg' }, { value: 'fish', label: 'Fisk' }] }], tags, draw: vegCrate }),
  kind({ ...T, key: 'prov_honey', name: 'Honningkrukker', w: 1.4, h: 0.6, params: [], tags, draw: honeyJars }),
  kind({ ...T, key: 'prov_pie_table', name: 'Bord med tærter', w: 2, h: 0.9, params: [], tags, draw: pieTable }),
];
void WOOD;
void WOOD_DARK;
void bowl;
void board;
void mottle;
void radial;
