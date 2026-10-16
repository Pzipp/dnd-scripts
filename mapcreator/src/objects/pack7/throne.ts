import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, clipped, ellBody, ellipsePath, lin, mottle, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { vary } from '../pack3/common';
import { dome, foldCloth, BRASS, WOOD_DARK } from './props';
import { pick } from './kit';

/** Trone- og audienssal: trone, podie, baldakin og bannere. Alt set oppefra. */

const CLOTHS: RGB[] = [[140, 30, 40], [40, 56, 126], [36, 96, 66], [96, 40, 120], [170, 130, 40], [60, 56, 64]];

function throneSeat(g: G, r: Rnd, cx: number, cy: number, S: number, col: RGB): void {
  // armlæn og sæde set oppefra, ryglæn som tyk bjælke bagerst (foroven)
  for (const s of [-1, 1]) {
    rectBody(g, cx + s * S * 0.38 - S * 0.07, cy - S * 0.25, S * 0.14, S * 0.58, S * 0.05, [92, 60, 34], { lw: 1.5, ao: 1.2, rim: 1 });
    dome(g, cx + s * S * 0.38, cy + S * 0.3, S * 0.07, S * 0.07, BRASS, 1);
  }
  rectBody(g, cx - S * 0.3, cy - S * 0.22, S * 0.6, S * 0.6, S * 0.1, col, { lw: 1.6, ao: S * 0.05, rim: 2 });
  // pude: knapper og snor
  g.save();
  g.beginPath();
  g.rect(cx - S * 0.27, cy - S * 0.19, S * 0.54, S * 0.54);
  g.clip();
  g.strokeStyle = rgb(shift(col, -40), 0.4);
  g.lineWidth = 0.9;
  for (let i = -1; i <= 1; i += 2) {
    g.beginPath();
    g.moveTo(cx + i * S * 0.2, cy - S * 0.2);
    g.lineTo(cx - i * S * 0.2, cy + S * 0.36);
    g.stroke();
  }
  g.restore();
  for (const [dx, dy] of [[-0.14, 0.0], [0.14, 0.0], [-0.14, 0.24], [0.14, 0.24], [0, 0.12]] as [number, number][]) dome(g, cx + dx * S, cy + dy * S, S * 0.025, S * 0.025, BRASS, 0.6);
  g.strokeStyle = rgb(BRASS, 0.9);
  g.lineWidth = 1.4;
  g.strokeRect(cx - S * 0.3, cy - S * 0.22, S * 0.6, S * 0.6);
  // ryglæn: bred udskåret bjælke med spir
  const bk = rectPath(g, cx - S * 0.46, cy - S * 0.44, S * 0.92, S * 0.2, S * 0.06);
  body(g, bk, [100, 66, 38], [cx - S * 0.46, cy - S * 0.44, cx + S * 0.46, cy - S * 0.24], { lw: 1.7, ao: 1.8, rim: 1.4 });
  clipped(g, bk, () => {
    g.strokeStyle = 'rgba(255,210,120,.5)';
    g.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      g.beginPath();
      g.moveTo(cx + i * S * 0.1, cy - S * 0.43);
      g.lineTo(cx + i * S * 0.1, cy - S * 0.25);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,230,160,.25)';
    g.fillRect(cx - S * 0.46, cy - S * 0.44, S * 0.92, 2);
  });
  for (const s of [-1, 0, 1]) dome(g, cx + s * S * 0.4, cy - S * 0.44, S * 0.045, S * 0.045, BRASS, 0.9);
  void r;
}

function throneChair(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const col = vary(r, param(o, 'cloth', 'red') === 'blue' ? [40, 56, 126] : param(o, 'cloth', 'red') === 'purple' ? [96, 40, 120] : [140, 30, 40], 8);
  throneSeat(g, r, 0, S * 0.05, S * 1.1, col);
}

/** Podie med trin: koncentriske rektangler (eller ellipser), tæppe ned ad trinnene. */
function dais(g: G, o: DrawInput, withThrone: boolean): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const round = param(o, 'shape', 'rect') === 'round';
  const steps = Math.round(param(o, 'steps', 3));
  const stone: RGB = [168, 160, 148];
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const inset = t * Math.min(W, H) * 0.2;
    const x = -W / 2 + inset;
    const y = -H / 2 + inset * 0.6;
    const w = W - inset * 2;
    const h = H - inset * 1.4;
    const path = round ? ellipsePath(g, 0, -inset * 0.1, w / 2, h / 2) : rectPath(g, x, y, w, h, 3);
    body(g, path, shift(stone, i * 10 - 10), [x, y, x + w, y + h], { lw: 1.7, ao: 4, rim: 2.4 });
    if (i === 0) {
      clipped(g, path, () => {
        mottle(g, r, [x, y, x + w, y + h], stone, 40, 5, 16, 0.35);
        g.strokeStyle = 'rgba(40,30,20,.3)';
        g.lineWidth = 0.8;
        for (let k = 1; k < 8; k++) {
          g.beginPath();
          g.moveTo(x + (w * k) / 8, y);
          g.lineTo(x + (w * k) / 8, y + h);
          g.stroke();
        }
      });
    }
  }
  const topInset = (steps - 1) / steps * Math.min(W, H) * 0.2;
  const col = vary(r, pick(r, CLOTHS), 8);
  // tæppe over trinnene
  const cw = W * 0.26;
  const cy0 = -H / 2 + topInset * 0.6 + H * 0.1;
  const run = rectPath(g, -cw / 2, cy0, cw, H / 2 - cy0 + 2, 1);
  body(g, run, col, [-cw / 2, cy0, cw / 2, H / 2], { lw: 1.2, ao: 2 });
  g.fillStyle = rgb(BRASS, 0.9);
  g.fillRect(-cw / 2 + 3, cy0, 1.4, H / 2 - cy0);
  g.fillRect(cw / 2 - 4.4, cy0, 1.4, H / 2 - cy0);
  if (withThrone) throneSeat(g, r, 0, -H * 0.12, Math.min(W, H) * 0.42, col);
}

function canopy(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const col = vary(r, pick(r, CLOTHS), 8);
  const p = rectPath(g, -W / 2, -H / 2, W, H, 4);
  body(g, p, col, [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.8, ao: 5 });
  clipped(g, p, () => {
    // folder fra midten mod hjørnerne (pyramideformet tag af stof)
    for (const [x, y] of [[-W / 2, -H / 2], [W / 2, -H / 2], [-W / 2, H / 2], [W / 2, H / 2]] as [number, number][]) {
      g.strokeStyle = rgb(shift(col, -40), 0.55);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(x, y);
      g.stroke();
      g.strokeStyle = rgb(shift(col, 34), 0.3);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-1, -1);
      g.lineTo(x - 1, y - 1);
      g.stroke();
    }
    for (const [x, y, w, h] of [[0, -H / 2, W, 0], [0, H / 2, W, 0], [-W / 2, 0, 0, H], [W / 2, 0, 0, H]] as [number, number, number, number][]) {
      g.strokeStyle = rgb(shift(col, -26), 0.35);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(x, y);
      g.stroke();
      void w;
      void h;
    }
    g.fillStyle = lin(g, -W / 2, -H / 2, W / 2, H / 2, [[0, 'rgba(255,240,210,.28)'], [0.5, 'rgba(255,240,210,0)'], [1, 'rgba(0,0,0,.28)']]);
    g.fillRect(-W / 2, -H / 2, W, H);
    // guldkant
    g.strokeStyle = rgb(BRASS);
    g.lineWidth = 5;
    g.strokeRect(-W / 2 + 3, -H / 2 + 3, W - 6, H - 6);
    g.strokeStyle = 'rgba(120,80,10,.6)';
    g.lineWidth = 1;
    g.strokeRect(-W / 2 + 5.5, -H / 2 + 5.5, W - 11, H - 11);
  });
  // frynser på kanten
  g.strokeStyle = rgb(BRASS);
  g.lineWidth = 1;
  const n = Math.round(W / 4);
  for (let i = 0; i <= n; i++) {
    const x = -W / 2 + (i / n) * W;
    g.beginPath();
    g.moveTo(x, H / 2);
    g.lineTo(x, H / 2 + 3);
    g.stroke();
  }
  // midtknop og hjørnestolper
  dome(g, 0, 0, Math.min(W, H) * 0.07, Math.min(W, H) * 0.07, BRASS, 1.2);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) dome(g, sx * (W / 2 - 3), sy * (H / 2 - 3), 3.4, 3.4, shift(BRASS, 10), 1);
}

/** Banner på stang set oppefra: stangknop, og dugen vejer ud til siden med bølger. */
function banner(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const c1: RGB = vary(r, pick(r, CLOTHS), 8);
  const c2: RGB = pick(r, [[236, 226, 190], [20, 20, 24], [212, 170, 50], [236, 236, 240]] as RGB[]);
  const emblem = param(o, 'emblem', 'stripe');
  const L = W * 0.88;
  const x0 = -W * 0.44;
  const hgt = H * 0.5;
  const amp = H * 0.1;
  const edge = (t: number, sgn: number) => ({ x: x0 + t * L, y: sgn * hgt / 2 * (1 - t * 0.08) + Math.sin(t * 7 + o.seed) * amp * t });
  const path = () => {
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const e = edge(i / 16, -1);
      if (i) g.lineTo(e.x, e.y);
      else g.moveTo(e.x, e.y);
    }
    for (let i = 16; i >= 0; i--) {
      const e = edge(i / 16, 1);
      // svalehale i enden
      const tail = i === 16 ? hgt * 0.2 : 0;
      g.lineTo(e.x - tail, e.y);
    }
    g.closePath();
  };
  body(g, path, c1, [x0, -hgt, x0 + L, hgt], { lw: 1.5, ao: 3 });
  clipped(g, path, () => {
    // folder tværs over
    for (let i = 1; i < 10; i++) {
      const t = i / 10;
      g.strokeStyle = i % 2 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.14)';
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(x0 + t * L, -hgt);
      g.quadraticCurveTo(x0 + t * L + Math.sin(i) * 4, 0, x0 + t * L, hgt);
      g.stroke();
    }
    g.fillStyle = rgb(c2);
    const mx = x0 + L * 0.52;
    if (emblem === 'stripe') g.fillRect(x0, -hgt * 0.12, L, hgt * 0.24);
    else if (emblem === 'cross') {
      g.fillRect(x0, -hgt * 0.1, L, hgt * 0.2);
      g.fillRect(x0 + L * 0.28, -hgt, L * 0.14, hgt * 2);
    } else if (emblem === 'chevron') {
      g.beginPath();
      g.moveTo(x0, -hgt * 0.6);
      g.lineTo(mx, 0);
      g.lineTo(x0, hgt * 0.6);
      g.lineTo(x0, hgt * 0.35);
      g.lineTo(mx - L * 0.2, 0);
      g.lineTo(x0, -hgt * 0.35);
      g.fill();
    } else if (emblem === 'disc') {
      g.beginPath();
      g.arc(mx, 0, hgt * 0.28, 0, 7);
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(x0, -hgt);
      g.lineTo(x0 + L * 0.4, -hgt);
      g.lineTo(x0 + L, hgt);
      g.lineTo(x0 + L * 0.6, hgt);
      g.fill();
    }
    g.fillStyle = lin(g, 0, -hgt, 0, hgt, [[0, 'rgba(255,240,210,.22)'], [1, 'rgba(0,0,0,.2)']]);
    g.fillRect(x0, -hgt, L, hgt * 2);
  });
  path();
  g.strokeStyle = 'rgba(20,10,5,.8)';
  g.lineWidth = 1.6;
  g.stroke();
  // frynser
  g.strokeStyle = rgb(BRASS);
  g.lineWidth = 1;
  // stang set oppefra (cirkel) med knop og tværstang
  tube(g, () => {
    g.beginPath();
    g.moveTo(x0 - 3, -hgt * 0.62);
    g.lineTo(x0 - 3, hgt * 0.62);
  }, 3, [120, 84, 50], { outline: 1 });
  dome(g, x0 - 3, 0, 5, 5, BRASS, 1.1);
}

function bannerPair(g: G, o: DrawInput): void {
  // to bannere side om side, hængende i vindstød
  const r = rng(o.seed);
  g.save();
  g.translate(0, -o.h * 0.25);
  banner(g, { ...o, h: o.h * 0.5, seed: o.seed });
  g.restore();
  g.save();
  g.translate(0, o.h * 0.25);
  banner(g, { ...o, h: o.h * 0.5, seed: o.seed ^ 77 });
  g.restore();
  void r;
}

const T = { family: 'throne', shadow: 6 } as const;
const tags = ['indoor', 'rich', 'city', 'military', 'temple'];
const emblemParam = { key: 'emblem', label: 'Mærke', type: 'select' as const, default: 'stripe', options: [{ value: 'stripe', label: 'Bånd' }, { value: 'cross', label: 'Kors' }, { value: 'chevron', label: 'Spær' }, { value: 'disc', label: 'Skive' }, { value: 'bend', label: 'Skråbjælke' }] };
const shapeParams = [{ key: 'shape', label: 'Form', type: 'select' as const, default: 'rect', options: [{ value: 'rect', label: 'Firkantet' }, { value: 'round', label: 'Rundt' }] }, { key: 'steps', label: 'Trin', type: 'range' as const, min: 1, max: 4, step: 1, default: 3 }];

export const throneKinds: ObjectKind[] = [
  kind({ ...T, key: 'throne_chair', name: 'Trone', w: 1.2, h: 1.2, params: [{ key: 'cloth', label: 'Pude', type: 'select', default: 'red', options: [{ value: 'red', label: 'Rød' }, { value: 'blue', label: 'Blå' }, { value: 'purple', label: 'Lilla' }] }], tags, draw: throneChair }),
  kind({ ...T, key: 'throne_dais', name: 'Podie', w: 4, h: 2.4, shadow: 7, params: shapeParams, tags, draw: (g, o) => dais(g, o, false) }),
  kind({ ...T, key: 'throne_dais_throne', name: 'Podie med trone', w: 4, h: 3, shadow: 7, params: shapeParams, tags, draw: (g, o) => dais(g, o, true) }),
  kind({ ...T, key: 'throne_dais_round', name: 'Podie, rundt', w: 3, h: 3, shadow: 7, params: [{ key: 'shape', label: 'Form', type: 'select', default: 'round', options: [{ value: 'round', label: 'Rundt' }, { value: 'rect', label: 'Firkantet' }] }, { key: 'steps', label: 'Trin', type: 'range', min: 1, max: 4, step: 1, default: 2 }], tags, draw: (g, o) => dais(g, o, false) }),
  kind({ ...T, key: 'throne_canopy', name: 'Baldakin', w: 3, h: 3, shadow: 9, params: [], tags, draw: canopy }),
  kind({ ...T, key: 'throne_banner', name: 'Banner', w: 2.4, h: 1.2, shadow: 4, randomRotation: false, params: [emblemParam], tags: [...tags, 'battlefield', 'camp'], draw: banner }),
  kind({ ...T, key: 'throne_banner_pair', name: 'Bannere, par', w: 2.4, h: 2.2, shadow: 4, params: [emblemParam], tags: [...tags, 'battlefield', 'camp'], draw: bannerPair }),
];
void ellBody;
void foldCloth;
void polyBody;
void radial;
void WOOD_DARK;
