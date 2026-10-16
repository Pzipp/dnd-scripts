import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, clipped, ellBody, ellipsePath, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { woodRect, vary } from '../pack3/common';
import { dome, foldCloth, BRASS } from './props';
import { eye, pick } from './kit';

/** Børneværelse og legetøj set oppefra: dukker, klodser, gyngehest, tinsoldater, dukkehus, tøjdyr. */

const BRIGHT: RGB[] = [[200, 50, 50], [50, 100, 190], [230, 190, 50], [60, 150, 80], [200, 110, 40], [150, 70, 160]];

function dollBody(g: G, r: Rnd, x: number, y: number, S: number, rot: number, kindSel: string): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const dress = pick(r, BRIGHT);
  const skin: RGB = kindSel === 'porcelain' ? [240, 226, 214] : kindSel === 'rag' ? [226, 190, 140] : [200, 150, 100];
  // arme (liggende udstrakt), ben
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.12, -S * 0.12);
      g.lineTo(s * S * 0.4, -S * 0.02 + (r() - 0.5) * S * 0.1);
    }, S * 0.1, kindSel === 'puppet' ? [150, 110, 70] : skin, { outline: 1.1 });
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * S * 0.06, S * 0.22);
      g.lineTo(s * S * 0.12 + s * (r() - 0.3) * S * 0.08, S * 0.52);
    }, S * 0.1, kindSel === 'porcelain' ? [236, 232, 224] : [90, 70, 56], { outline: 1.1 });
  }
  // kjole (trapez set oppefra)
  polyBody(g, [[-S * 0.14, -S * 0.15], [S * 0.14, -S * 0.15], [S * 0.26, S * 0.3], [-S * 0.26, S * 0.3]], dress, { lw: 1.2, ao: 1.5, rim: 1 });
  g.strokeStyle = rgb(shift(dress, 40), 0.7);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-S * 0.22, S * 0.26);
  g.lineTo(S * 0.22, S * 0.26);
  g.stroke();
  // hoved og hår
  ellBody(g, 0, -S * 0.28, S * 0.14, S * 0.15, skin, { lw: 1.1, ao: S * 0.03 });
  const hair = pick(r, [[60, 40, 24], [210, 170, 70], [140, 60, 36], [30, 24, 20]] as RGB[]);
  g.save();
  g.beginPath();
  g.ellipse(0, -S * 0.28, S * 0.14, S * 0.15, 0, 0, 7);
  g.clip();
  g.fillStyle = rgb(hair);
  g.beginPath();
  g.ellipse(0, -S * 0.32, S * 0.15, S * 0.12, 0, 0, 7);
  g.fill();
  g.restore();
  if (kindSel === 'porcelain') {
    g.fillStyle = 'rgba(210,90,90,.7)';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(s * S * 0.07, -S * 0.22, S * 0.025, 0, 7);
      g.fill();
    }
  } else if (kindSel === 'puppet') {
    g.strokeStyle = 'rgba(40,30,20,.8)';
    g.lineWidth = 0.8;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * S * 0.4, -S * 0.02);
      g.lineTo(s * S * 0.42, -S * 0.45);
      g.stroke();
    }
    ellBody(g, 0, -S * 0.5, S * 0.1, S * 0.03, [150, 110, 70], { lw: 0.8, ao: 0.2 });
  }
  g.restore();
}

function doll(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h) * 1.4;
  dollBody(g, r, 0, 0, S, (r() - 0.5) * 0.5, param(o, 'type', 'rag'));
}

function blocks(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const n = Math.round(param(o, 'count', 6));
  const cells: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * S * 0.6;
    const y = (r() - 0.5) * S * 0.6;
    const s = S * (0.22 + r() * 0.08);
    g.save();
    g.translate(x, y);
    g.rotate((r() - 0.5) * 1.2);
    const col = pick(r, BRIGHT);
    rectBody(g, -s / 2, -s / 2, s, s, 1.5, col, { lw: 1.1, ao: s * 0.08, rim: 1 });
    g.fillStyle = 'rgba(255,248,230,.88)';
    // bogstavskumle (blot hvide aftegninger, ingen tekst)
    g.beginPath();
    g.arc(0, 0, s * 0.22, 0, 7);
    g.fill();
    g.fillStyle = rgb(col);
    g.beginPath();
    g.arc(0, 0, s * 0.12, 0, 7);
    g.fill();
    g.restore();
    cells.push([x, y]);
  }
  void cells;
}

function rockingHorse(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // to buede medier set oppefra (lange lister)
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * W * 0.3, -H * 0.46);
      g.lineTo(s * W * 0.3, H * 0.46);
    }, W * 0.08, [118, 82, 48], { outline: 1.3 });
  }
  // krop, hals og hoved
  const col: RGB = pick(r, [[150, 100, 60], [200, 196, 190], [90, 70, 54]] as RGB[]);
  const bp = ellipsePath(g, 0, H * 0.08, W * 0.3, H * 0.32);
  body(g, bp, col, [-W * 0.3, -H * 0.24, W * 0.3, H * 0.4], { lw: 1.4, ao: 3, rim: 1.5 });
  const nk = ellipsePath(g, 0, -H * 0.24, W * 0.16, H * 0.16);
  body(g, nk, shift(col, -4), [-W * 0.16, -H * 0.4, W * 0.16, -H * 0.08], { lw: 1.2, ao: 1.5 });
  ellBody(g, 0, -H * 0.4, W * 0.13, H * 0.1, shift(col, 4), { lw: 1.2, ao: 1.2 });
  for (const s of [-1, 1]) polyBody(g, [[s * W * 0.08, -H * 0.3], [s * W * 0.16, -H * 0.38], [s * W * 0.04, -H * 0.36]], shift(col, -20), { lw: 0.8, ao: 0.2, rim: 0.2 });
  tube(g, () => {
    g.beginPath();
    g.moveTo(0, -H * 0.44);
    g.quadraticCurveTo(W * 0.04, -H * 0.1, 0, H * 0.2);
  }, W * 0.07, [60, 40, 28], { outline: 0.8 });
  // sadel og tøjler
  ellBody(g, 0, H * 0.06, W * 0.2, H * 0.12, [130, 40, 40], { lw: 1.1, ao: 1.2 });
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.16, -H * 0.34);
    g.quadraticCurveTo(-W * 0.3, -H * 0.2, -W * 0.14, 0);
  }, 1.4, [170, 40, 40], { outline: 0.6 });
  // hale
  tube(g, () => {
    g.beginPath();
    g.moveTo(0, H * 0.38);
    g.quadraticCurveTo(W * 0.08, H * 0.5, -W * 0.02, H * 0.56);
  }, W * 0.07, [60, 40, 28], { outline: 0.8 });
  eye(g, -W * 0.08, -H * 0.42, 1.5);
  eye(g, W * 0.08, -H * 0.42, 1.5);
}

function soldiers(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const n = Math.round(param(o, 'count', 7));
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * S * 0.8;
    const y = (r() - 0.5) * S * 0.8;
    const c = i % 2 ? [70, 110, 210] : [214, 70, 60];
    g.save();
    g.translate(x, y);
    g.rotate(r() * 6.28);
    const s = S * 0.11;
    // sokkel, krop, hoved, gevær
    ellBody(g, 0, 0, s * 1.05, s * 1.05, [120, 84, 50], { lw: 0.9, ao: 0.6, rim: 0.4 });
    for (const q of [-1, 1]) ellBody(g, q * s * 0.78, 0, s * 0.3, s * 0.4, c as RGB, { lw: 0.8, ao: 0.3 });
    ellBody(g, 0, 0, s * 0.72, s * 0.5, c as RGB, { lw: 1, ao: 0.6, rim: 0.4 });
    ellBody(g, 0, 0, s * 0.34, s * 0.34, [30, 26, 28], { lw: 0.8, ao: 0.3, rim: 0.3 });
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * 0.9, s * 0.3);
      g.lineTo(s * 0.9, -s * 1.7);
    }, s * 0.18, [90, 60, 36], { outline: 0.7 });
    g.restore();
  }
}

function dollHouse(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // sadeltag set oppefra: rygning langs midten, to tagflader med tegl, skorsten
  const wall = rectPath(g, -W / 2, -H / 2, W, H, 3);
  body(g, wall, [226, 206, 170], [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.8, ao: 4 });
  const col = pick(r, BRIGHT);
  for (const s of [-1, 1]) {
    const y0 = s < 0 ? -H * 0.46 : 0;
    const p = rectPath(g, -W * 0.46, y0, W * 0.92, H * 0.46, 2);
    body(g, p, col, [-W / 2, y0, W / 2, y0 + H * 0.46], { lw: 1.4, ao: 2.4, rim: 1.2, angle: s < 0 ? 100 : 80 });
    clipped(g, p, () => {
      g.strokeStyle = 'rgba(0,0,0,.28)';
      g.lineWidth = 0.9;
      for (let k = 1; k < 7; k++) {
        g.beginPath();
        g.moveTo(-W * 0.46, y0 + (H * 0.46 * k) / 7);
        g.lineTo(W * 0.46, y0 + (H * 0.46 * k) / 7);
        g.stroke();
      }
      for (let k = 0; k < 6; k++) {
        for (let m = 0; m < 14; m++) {
          g.beginPath();
          g.moveTo(-W * 0.46 + ((m + (k % 2) * 0.5) * W * 0.92) / 14, y0 + (H * 0.46 * k) / 7);
          g.lineTo(-W * 0.46 + ((m + (k % 2) * 0.5) * W * 0.92) / 14, y0 + (H * 0.46 * (k + 1)) / 7);
          g.stroke();
        }
      }
    });
  }
  g.fillStyle = 'rgba(40,20,10,.55)';
  g.fillRect(-W * 0.46, -1, W * 0.92, 2);
  rectBody(g, W * 0.18, -H * 0.3, W * 0.14, H * 0.2, 1, [150, 90, 70], { lw: 1.2, ao: 1 });
  rectBody(g, W * 0.2, -H * 0.27, W * 0.1, H * 0.14, 1, [30, 20, 16], { lw: 0.6, ao: 0.3 });
}

function hoopBall(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  g.beginPath();
  g.arc(-S * 0.12, 0, S * 0.34, 0, 7);
  g.strokeStyle = 'rgba(14,8,4,.8)';
  g.lineWidth = S * 0.06 + 1.6;
  g.stroke();
  g.strokeStyle = rgb([186, 140, 80]);
  g.lineWidth = S * 0.06;
  g.stroke();
  g.strokeStyle = 'rgba(255,230,170,.6)';
  g.lineWidth = S * 0.02;
  g.beginPath();
  g.arc(-S * 0.12 - 0.5, -0.5, S * 0.34, 3.4, 5.4);
  g.stroke();
  // bold
  const bx = S * 0.28;
  const by = S * 0.22;
  g.beginPath();
  g.arc(bx, by, S * 0.12, 0, 7);
  g.fillStyle = radial(g, bx, by, S * 0.12, [[0, 'rgb(240,110,90)'], [1, 'rgb(150,30,30)']], bx - S * 0.04, by - S * 0.04, 0.5);
  g.fill();
  g.strokeStyle = 'rgba(20,10,5,.8)';
  g.lineWidth = 1;
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.7)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.arc(bx, by, S * 0.12, 0.4, 2.2);
  g.stroke();
  void r;
}

function plush(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const col = pick(r, [[160, 112, 70], [230, 220, 200], [200, 150, 160], [140, 160, 200]] as RGB[]);
  // tøjbjørn set oppefra: krop, hoved, ører, ben og arme udstrakt
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    const y = dy * S * (dy < 0 ? 0.2 : 0.32);
    ellBody(g, dx * S * (dy < 0 ? 0.28 : 0.2), y + (dy < 0 ? -S * 0.02 : S * 0.0), S * 0.12, S * 0.1, shift(col, -6), { lw: 1.2, ao: 1.2 });
  }
  ellBody(g, 0, S * 0.05, S * 0.25, S * 0.3, col, { lw: 1.4, ao: S * 0.05, rim: 1.4 });
  ellBody(g, 0, S * 0.1, S * 0.14, S * 0.15, shift(col, 18), { lw: 0.8, ao: 0.6 });
  ellBody(g, 0, -S * 0.26, S * 0.19, S * 0.17, col, { lw: 1.3, ao: S * 0.03, rim: 1.2 });
  for (const s of [-1, 1]) ellBody(g, s * S * 0.16, -S * 0.38, S * 0.07, S * 0.07, shift(col, -10), { lw: 1, ao: 0.6 });
  ellBody(g, 0, -S * 0.22, S * 0.08, S * 0.06, shift(col, 22), { lw: 0.8, ao: 0.3 });
  ellBody(g, 0, -S * 0.24, S * 0.025, S * 0.02, [30, 20, 20], { lw: 0.4, ao: 0 });
  for (const s of [-1, 1]) eye(g, s * S * 0.07, -S * 0.3, S * 0.02);
  // sløjfe
  const bow = pick(r, BRIGHT);
  polyBody(g, [[0, -S * 0.1], [-S * 0.1, -S * 0.15], [-S * 0.1, -S * 0.05]], bow, { lw: 0.8, ao: 0.2, rim: 0.2 });
  polyBody(g, [[0, -S * 0.1], [S * 0.1, -S * 0.15], [S * 0.1, -S * 0.05]], bow, { lw: 0.8, ao: 0.2, rim: 0.2 });
}

function toyBox(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, pick(r, [[176, 70, 60], [60, 110, 170], [90, 140, 80]] as RGB[]), { vertical: false, count: 4, rad: 3, nails: true });
  // låg åbent: tøjdyr, klodser og en bold stikker op
  rectBody(g, -W * 0.4, -H * 0.38, W * 0.8, H * 0.76, 3, [60, 36, 24], { lw: 1.2, ao: 4 });
  for (let i = 0; i < 6; i++) {
    const x = (r() - 0.5) * W * 0.6;
    const y = (r() - 0.5) * H * 0.5;
    const t = Math.floor(r() * 3);
    if (t === 0) {
      g.save();
      g.translate(x, y);
      g.rotate(r() * 3);
      rectBody(g, -5, -5, 10, 10, 1, pick(r, BRIGHT), { lw: 0.9, ao: 0.6 });
      g.restore();
    } else if (t === 1) ellBody(g, x, y, 6, 6, pick(r, BRIGHT), { lw: 0.9, ao: 0.8, rim: 0.4 });
    else ellBody(g, x, y, 7, 5, [180, 130, 90], { lw: 0.9, ao: 0.8, rim: 0.4 });
  }
}

const T = { family: 'toys', shadow: 3 } as const;
const tags = ['indoor', 'house', 'village', 'city'];

export const toyKinds: ObjectKind[] = [
  kind({ ...T, key: 'toy_doll', name: 'Dukke', w: 0.5, h: 0.8, randomRotation: true, params: [{ key: 'type', label: 'Slags', type: 'select', default: 'rag', options: [{ value: 'rag', label: 'Kludedukke' }, { value: 'porcelain', label: 'Porcelænsdukke' }, { value: 'puppet', label: 'Marionet' }] }], tags, draw: doll }),
  kind({ ...T, key: 'toy_blocks', name: 'Legeklodser', w: 0.8, h: 0.8, randomRotation: true, params: [{ key: 'count', label: 'Antal', type: 'range', min: 2, max: 10, step: 1, default: 6 }], tags, draw: blocks }),
  kind({ ...T, key: 'toy_rocking_horse', name: 'Gyngehest', w: 0.8, h: 1.4, params: [], tags: [...tags, 'rich'], draw: rockingHorse }),
  kind({ ...T, key: 'toy_soldiers', name: 'Tinsoldater', w: 1, h: 1, shadow: 2, randomRotation: true, params: [{ key: 'count', label: 'Antal', type: 'range', min: 2, max: 12, step: 1, default: 7 }], tags, draw: soldiers }),
  kind({ ...T, key: 'toy_dollhouse', name: 'Dukkehus', w: 1.2, h: 1.2, shadow: 6, params: [], tags: [...tags, 'rich'], draw: dollHouse }),
  kind({ ...T, key: 'toy_hoop', name: 'Tøndebånd og bold', w: 1, h: 1, randomRotation: true, params: [], tags, draw: hoopBall }),
  kind({ ...T, key: 'toy_plush', name: 'Tøjbjørn', w: 0.6, h: 0.8, randomRotation: true, params: [], tags, draw: plush }),
  kind({ ...T, key: 'toy_chest', name: 'Legetøjskasse', w: 1.2, h: 0.8, shadow: 5, params: [], tags, draw: toyBox }),
];
void dome;
void foldCloth;
void BRASS;
void vary;
