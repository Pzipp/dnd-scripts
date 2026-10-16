import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, clipped, ellBody, ellipsePath, mottle, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { woodRect, vary } from '../pack3/common';
import { apple, bottle, bowl, candle, cheeseWheel, goblet, loaf, plate, steam, BRASS, PEWTER } from './props';
import { pick } from './kit';

/** Banket og gæstebud: lange borde, runde festborde, buffet, stege og efterladte rester. */

/** En kuvert set oppefra: tallerken, bæger, brød og kniv. `ang` vender kuverten mod bordets kant. */
function setting(g: G, r: Rnd, x: number, y: number, ang: number, s: number, food: boolean): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  plate(g, 0, 0, s, [214, 210, 204]);
  if (food) {
    const t = Math.floor(r() * 4);
    if (t === 0) ellBody(g, 0, 0, s * 0.5, s * 0.36, [168, 100, 60], { lw: 0.8, ao: 0.5 });
    else if (t === 1) {
      apple(g, -s * 0.2, 0, s * 0.3);
      apple(g, s * 0.2, s * 0.1, s * 0.3, [214, 176, 50]);
    } else if (t === 2) ellBody(g, 0, 0, s * 0.5, s * 0.5, [226, 196, 120], { lw: 0.8, ao: 0.5 });
    else loaf(g, r, 0, 0, s * 0.9, s * 0.5, r() * 3);
  }
  goblet(g, s * 1.3, -s * 0.35, s * 0.38, [120, 24, 44]);
  tube(g, () => {
    g.beginPath();
    g.moveTo(-s * 1.35, -s * 0.6);
    g.lineTo(-s * 1.35, s * 0.5);
  }, s * 0.14, [190, 192, 200], { outline: 0.8 });
  tube(g, () => {
    g.beginPath();
    g.moveTo(s * 1.4 - s * 1.3 + s * 1.3, s * 0.3);
    g.lineTo(s * 1.4 - s * 1.3 + s * 1.3, s * 0.9);
  }, s * 0.13, [190, 192, 200], { outline: 0.8 });
  g.restore();
}

function cloth(g: G, x: number, y: number, w: number, h: number, col: RGB): void {
  const p = rectPath(g, x, y, w, h, 2);
  body(g, p, col, [x, y, x + w, y + h], { lw: 1.2, ao: 2 });
  g.strokeStyle = rgb(BRASS, 0.85);
  g.lineWidth = 1.2;
  g.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
}

function platter(g: G, r: Rnd, x: number, y: number, s: number, kind: string): void {
  ellBody(g, x, y, s, s * 0.7, [190, 190, 198], { lw: 1.2, ao: s * 0.06, rim: 1, light: 30 });
  g.save();
  g.translate(x, y);
  if (kind === 'roast') {
    ellBody(g, 0, 0, s * 0.72, s * 0.42, [176, 98, 50], { lw: 1.3, ao: s * 0.06, rim: 1.4 });
    clipped(g, ellipsePath(g, 0, 0, s * 0.72, s * 0.42), () => {
      mottle(g, r, [-s * 0.7, -s * 0.4, s * 0.7, s * 0.4], [150, 70, 30], 24, 3, 28, 0.6);
      g.strokeStyle = 'rgba(70,30,10,.4)';
      g.lineWidth = 0.9;
      for (let i = -4; i <= 4; i++) {
        g.beginPath();
        g.moveTo(i * s * 0.16, -s * 0.4);
        g.lineTo(i * s * 0.16 + 2, s * 0.4);
        g.stroke();
      }
    });
    ellBody(g, -s * 0.68, 0, s * 0.16, s * 0.2, [190, 112, 62], { lw: 1, ao: 1 });
    apple(g, -s * 0.9, 0, s * 0.12, [150, 40, 30]);
    for (const q of [-1, 1]) {
      apple(g, q * s * 0.8, q * s * 0.46, s * 0.12, [186, 36, 32]);
      for (let k = 0; k < 3; k++) ellBody(g, -s * 0.6 + k * s * 0.5, s * 0.55 * (q > 0 ? 1 : -1), s * 0.09, s * 0.06, [90, 140, 56], { lw: 0.6, ao: 0.2 });
    }
  } else if (kind === 'fish') {
    ellBody(g, 0, 0, s * 0.7, s * 0.2, [160, 170, 180], { lw: 1.2, ao: 1 });
    polyBody(g, [[s * 0.7, 0], [s * 0.95, -s * 0.2], [s * 0.95, s * 0.2]], [150, 160, 172], { lw: 1, ao: 0.4, rim: 0.3 });
    g.fillStyle = 'rgba(250,230,90,.9)';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.ellipse(-s * 0.2 + i * s * 0.26, s * 0.4, s * 0.1, s * 0.05, 0.4, 0, 7);
      g.fill();
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * 6.283;
      cheeseWheel(g, Math.cos(ang) * s * 0.4, Math.sin(ang) * s * 0.28, s * 0.22, pick(r, [[226, 190, 90], [232, 210, 130]] as RGB[]), r() < 0.3);
    }
    ellBody(g, 0, 0, s * 0.22, s * 0.18, [140, 60, 70], { lw: 0.9, ao: 0.6 });
  }
  g.restore();
}

function candlesticks(g: G, x: number, y: number, s: number, lit: boolean): void {
  ellBody(g, x, y, s, s, PEWTER, { lw: 0.9, ao: 0.6, rim: 0.5 });
  candle(g, x, y, s * 0.55, lit, [240, 232, 206]);
}

function longTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const mode = param(o, 'state', 'set');
  woodRect(g, r, -W / 2, -H / 2, W, H, [120, 82, 50], { vertical: false, count: Math.max(3, Math.round(H / 12)), nails: false, rad: 3, wear: 0.8 });
  // løber
  if (mode !== 'wrecked') cloth(g, -W * 0.5 + 4, -H * 0.18, W - 8, H * 0.36, pick(r, [[236, 230, 214], [150, 40, 46], [48, 70, 128]] as RGB[]));
  const n = Math.max(3, Math.round(W / 62));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    const s = Math.min(H * 0.16, 8.5);
    if (mode === 'wrecked') {
      // væltede bægre, knogler, rester
      setting(g, r, x + (r() - 0.5) * 6, -H * 0.3, Math.PI + (r() - 0.5) * 0.5, s, false);
      setting(g, r, x + (r() - 0.5) * 6, H * 0.3, (r() - 0.5) * 0.5, s, false);
      for (let k = 0; k < 3; k++) {
        const bx = x + (r() - 0.5) * (W / n) * 0.8;
        const by = (r() - 0.5) * H * 0.5;
        tube(g, () => {
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(bx + 8, by + (r() - 0.5) * 6);
        }, 2.2, [226, 216, 190], { outline: 0.8 });
        ellBody(g, bx + 8, by, 2.4, 2.2, [232, 224, 200], { lw: 0.7, ao: 0.2 });
      }
      g.fillStyle = 'rgba(110,20,36,.5)';
      g.beginPath();
      g.ellipse(x, (r() - 0.5) * H * 0.3, 10 + r() * 8, 4 + r() * 4, r() * 3, 0, 7);
      g.fill();
    } else {
      setting(g, r, x, -H * 0.34, Math.PI, s, mode === 'meal');
      setting(g, r, x, H * 0.34, 0, s, mode === 'meal');
    }
  }
  // midterstykker
  const lit = param(o, 'lit', true);
  const c = Math.max(2, Math.round(W / 90));
  for (let i = 0; i < c; i++) {
    const x = -W * 0.4 + (W * 0.8 * (i + 0.5)) / c;
    if (mode === 'meal') {
      if (i % 2 === 0) platter(g, r, x, 0, Math.min(H * 0.3, 18), pick(r, ['roast', 'cheese', 'fish']));
      else {
        bowl(g, x, 0, Math.min(H * 0.14, 9), [180, 150, 100], [210, 70, 60]);
        bottle(g, x + 12, 0, Math.min(H * 0.34, 22), 0.5, [60, 100, 70]);
      }
    } else {
      candlesticks(g, x, 0, Math.min(H * 0.11, 7), lit);
      if (mode === 'set') bottle(g, x + 14, 2, Math.min(H * 0.3, 20), 0.8, [90, 40, 60]);
    }
  }
}

function roundTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  ellBody(g, 0, 0, S * 0.48, S * 0.48, [124, 86, 52], { lw: 1.8, ao: 4, rim: 2.4 });
  clipped(g, ellipsePath(g, 0, 0, S * 0.48, S * 0.48), () => {
    g.strokeStyle = 'rgba(30,14,4,.3)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.moveTo(-S / 2, -S * 0.4 + i * S * 0.075);
      g.lineTo(S / 2, -S * 0.4 + i * S * 0.075 + (r() - 0.5) * 2);
      g.stroke();
    }
  });
  g.beginPath();
  g.arc(0, 0, S * 0.44, 0, 7);
  g.fillStyle = rgb(pick(r, [[236, 230, 214], [150, 40, 46], [48, 70, 128]] as RGB[]));
  g.fill();
  g.strokeStyle = rgb(BRASS, 0.9);
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(0, 0, S * 0.42, 0, 7);
  g.stroke();
  const n = Math.round(param(o, 'seats', 8));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    setting(g, r, Math.cos(a) * S * 0.33, Math.sin(a) * S * 0.33, a + Math.PI / 2 + Math.PI, S * 0.052, param(o, 'meal', true));
  }
  platter(g, r, 0, 0, S * 0.2, param(o, 'dish', 'roast'));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.283 + 0.5;
    candlesticks(g, Math.cos(a) * S * 0.17, Math.sin(a) * S * 0.17, S * 0.03, true);
  }
  steam(g, r, 0, 0, S * 0.3, 3, 0.12);
}

function uTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const t = Math.min(W, H) * 0.2;
  const col = pick(r, [[236, 230, 214], [150, 40, 46], [48, 70, 128]] as RGB[]);
  const segs: [number, number, number, number][] = [[-W / 2, -H / 2, W, t], [-W / 2, -H / 2, t, H], [W / 2 - t, -H / 2, t, H]];
  for (const [x, y, w, h] of segs) {
    woodRect(g, r, x, y, w, h, [118, 82, 50], { vertical: h > w, count: 3, rad: 3 });
    cloth(g, x + 2, y + 2, w - 4, h - 4, col);
  }
  // kuverter langs de indre sider
  const place = (x: number, y: number, ang: number) => setting(g, r, x, y, ang, t * 0.22, true);
  for (let i = 0; i < 7; i++) place(-W / 2 + t + (W - t * 2) * ((i + 0.5) / 7), -H / 2 + t + 3, Math.PI);
  for (let i = 0; i < 5; i++) {
    place(-W / 2 + t + 3, -H / 2 + t + (H - t) * ((i + 0.5) / 5), -Math.PI / 2);
    place(W / 2 - t - 3, -H / 2 + t + (H - t) * ((i + 0.5) / 5), Math.PI / 2);
  }
  for (let i = 0; i < 4; i++) candlesticks(g, -W * 0.4 + (W * 0.8 * (i + 0.5)) / 4, -H / 2 + t * 0.5, t * 0.15, true);
  platter(g, r, 0, -H / 2 + t * 0.5, t * 0.34, 'roast');
}

function buffet(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [118, 80, 48], { vertical: false, count: 3, rad: 3 });
  cloth(g, -W / 2 + 3, -H / 2 + 3, W - 6, H - 6, [236, 230, 214]);
  const n = Math.max(3, Math.round(W / 46));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    const t = Math.floor(r() * 5);
    const s = Math.min(W / n * 0.42, H * 0.38);
    if (t === 0) platter(g, r, x, 0, s, 'roast');
    else if (t === 1) platter(g, r, x, 0, s, 'cheese');
    else if (t === 2) platter(g, r, x, 0, s, 'fish');
    else if (t === 3) {
      for (let k = 0; k < 5; k++) loaf(g, r, x + (k - 2) * s * 0.4, (r() - 0.5) * s * 0.5, s * 0.5, s * 0.3, (r() - 0.5) * 0.6);
    } else {
      bowl(g, x, 0, s * 0.8, [190, 160, 110]);
      for (let k = 0; k < 6; k++) apple(g, x + (r() - 0.5) * s * 0.7, (r() - 0.5) * s * 0.7, s * 0.14, pick(r, [[186, 36, 32], [214, 176, 50], [120, 160, 50]] as RGB[]));
    }
  }
}

function roastPlatter(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  platter(g, r, 0, 0, Math.min(o.w, o.h) * 0.46, param(o, 'dish', 'roast'));
  steam(g, r, 0, 0, Math.min(o.w, o.h) * 0.4, 3, 0.1);
}

function wineRack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [100, 68, 40], { vertical: false, count: 3, rad: 3 });
  const n = Math.max(3, Math.round(W / 14));
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (W * (i + 0.5)) / n;
    bottle(g, x, 0, H * 0.8, Math.PI / 2 * 0 + (r() - 0.5) * 0.1, pick(r, [[60, 100, 70], [90, 40, 60], [50, 70, 50]] as RGB[]), r() < 0.5);
  }
}

const T = { family: 'feast', shadow: 6 } as const;
const tags = ['indoor', 'tavern', 'rich', 'city', 'house'];
const stateParam = { key: 'state', label: 'Bord', type: 'select' as const, default: 'set', options: [{ value: 'set', label: 'Dækket' }, { value: 'meal', label: 'Med mad' }, { value: 'wrecked', label: 'Efter festen' }] };
const litParam = { key: 'lit', label: 'Lys tændt', type: 'toggle' as const, default: true };

export const feastKinds: ObjectKind[] = [
  kind({ ...T, key: 'feast_table_long', name: 'Gæstebudsbord', w: 4, h: 1.2, params: [stateParam, litParam], tags, draw: longTable }),
  kind({ ...T, key: 'feast_table_long_xl', name: 'Gæstebudsbord, langt', w: 6, h: 1.4, params: [stateParam, litParam], tags, draw: longTable }),
  kind({ ...T, key: 'feast_table_short', name: 'Gæstebudsbord, kort', w: 2.6, h: 1.1, params: [stateParam, litParam], tags, draw: longTable }),
  kind({ ...T, key: 'feast_table_round', name: 'Stort festbord, rundt', w: 3.2, h: 3.2, params: [{ key: 'seats', label: 'Pladser', type: 'range', min: 4, max: 12, step: 1, default: 8 }, { key: 'meal', label: 'Mad', type: 'toggle', default: true }, { key: 'dish', label: 'Midterret', type: 'select', default: 'roast', options: [{ value: 'roast', label: 'Steg' }, { value: 'cheese', label: 'Oste' }, { value: 'fish', label: 'Fisk' }] }], tags, draw: roundTable }),
  kind({ ...T, key: 'feast_table_u', name: 'U-formet banketbord', w: 6, h: 5, params: [], tags: [...tags, 'temple'], draw: uTable }),
  kind({ ...T, key: 'feast_buffet', name: 'Buffetbord', w: 3.6, h: 0.9, params: [], tags, draw: buffet }),
  kind({ ...T, key: 'feast_platter', name: 'Fad med steg', w: 1.2, h: 1.2, shadow: 3, randomRotation: true, params: [{ key: 'dish', label: 'Ret', type: 'select', default: 'roast', options: [{ value: 'roast', label: 'Steg' }, { value: 'cheese', label: 'Oste' }, { value: 'fish', label: 'Fisk' }] }], tags, draw: roastPlatter }),
  kind({ ...T, key: 'feast_wine_rack', name: 'Vinhylde', w: 2, h: 0.7, params: [], tags: [...tags, 'rich'], draw: wineRack }),
];
void radial;
void rectBody;
void vary;
