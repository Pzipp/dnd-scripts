import { kind, param, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { body, clipped, mottle, rectPath, ellipsePath, wobble, woodGrain, rivet, rectBody, ellBody, mossPatch, crack, leaf } from '../pack2/helpers';
import { blobPath, dome, limb, pebble, rgb, shift, lin, radial, polyPath, type G, type RGB, type Rnd } from './common';

/** Kirkegård og afsides steder (pakke 8): gravsten, grave, mausoleumstag, porte, lygter, vejsidekors, vogn og afmærkning. Alt set oppefra. */

const FAM = 'gravex';
const GRASS: RGB = [92, 124, 66];

const sel = (key: string, label: string, opts: [string, string][], def: string): ParamDef => ({ key, label, type: 'select', default: def, options: opts.map(([value, l]) => ({ value, label: l })) });
const mossParam: ParamDef = { key: 'moss', label: 'Mos', type: 'range', min: 0, max: 1, step: 0.1, default: 0.3 };

/** Gravplads: jordhøj med kantsten. */
function plot(g: G, r: Rnd, w: number, h: number, fresh: boolean, edge: boolean): void {
  const mx = w * 0.3;
  const my = h * 0.2;
  const hp = blobPath(g, wobble(r, 0, h * 0.06, w * 0.5 - 2, h * 0.5 - 6, 10, 0.05));
  const col: RGB = fresh ? [104, 74, 48] : GRASS;
  body(g, hp, col, [-w / 2, -h / 2, w / 2, h / 2], { lw: 1.4, ao: 3, rim: 1.4 });
  clipped(g, hp, () => {
    mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], col, fresh ? 70 : 40, w * 0.05, fresh ? 28 : 22, 0.45);
    if (fresh) for (let i = 0; i < 14; i++) pebble(g, r, (r() - 0.5) * w * 0.8, (r() - 0.5) * h * 0.8, 1.4 + r() * 2, [120, 100, 80]);
  });
  if (edge) {
    const p = rectPath(g, -w * 0.46, -h * 0.4 + h * 0.06, w * 0.92, h * 0.8, 2);
    g.strokeStyle = 'rgba(20,12,6,.7)';
    g.lineWidth = 5;
    p();
    g.stroke();
    g.strokeStyle = 'rgb(150,144,130)';
    g.lineWidth = 3.2;
    p();
    g.stroke();
    g.strokeStyle = 'rgba(255,248,230,.4)';
    g.lineWidth = 1;
    g.save(); g.translate(-0.8, -0.8); p(); g.stroke(); g.restore();
  }
  void mx; void my;
}

type Stone = 'cross' | 'round' | 'obelisk' | 'angel' | 'plain' | 'wood';
/** Gravsten set oppefra: stenen står i toppen af graven (nord); dens tykkelse ses som en lysende kant. */
function gravestone(g: G, w: number, h: number, seed: number, type: Stone, moss: number): void {
  const r = rng(seed);
  plot(g, r, w, h, type === 'wood', type !== 'wood' && type !== 'angel');
  const stoneCol: RGB = shift([150, 146, 138], (r() - 0.5) * 24);
  const sy = -h * 0.36;
  const mosser = (x: number, y: number, rad: number): void => {
    if (moss > 0.05) for (let i = 0; i < moss * 6; i++) mossPatch(g, r, x + (r() - 0.5) * rad, y + (r() - 0.5) * rad, rad * 0.4, 6);
  };
  if (type === 'cross') {
    // kors set oppefra: lodret og vandret arm, med lysning og skygge
    const arm = w * 0.14;
    const L = w * 0.42;
    const cx = 0;
    const cy = sy + h * 0.1;
    for (const horizontal of [false, true]) {
      const px = horizontal ? cx - L / 2 : cx - arm / 2;
      const py = horizontal ? cy - arm / 2 - h * 0.02 : cy - L * 0.3;
      const pw = horizontal ? L : arm;
      const ph = horizontal ? arm : L * 0.9;
      rectBody(g, px, py, pw, ph, 2, stoneCol, { lw: 1.6, ao: 2.4, light: 36 });
    }
    rectBody(g, cx - arm * 1.3, cy + L * 0.5, arm * 2.6, arm * 0.9, 2, shift(stoneCol, -8), { lw: 1.4, ao: 1.4 });
    mosser(cx, cy, L);
    return;
  }
  if (type === 'round') {
    const p = rectPath(g, -w * 0.2, sy - h * 0.08, w * 0.4, h * 0.2, w * 0.05);
    body(g, p, stoneCol, [-w * 0.2, sy - h * 0.08, w * 0.2, sy + h * 0.12], { lw: 1.6, ao: 2, light: 40 });
    g.strokeStyle = 'rgba(30,24,18,.5)';
    g.lineWidth = 1;
    g.beginPath(); g.arc(0, sy + h * 0.02, w * 0.06, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(-w * 0.1, sy + h * 0.07); g.lineTo(w * 0.1, sy + h * 0.07); g.stroke();
    mosser(0, sy, w * 0.3);
    return;
  }
  if (type === 'plain') {
    const p = rectPath(g, -w * 0.22, sy - h * 0.06, w * 0.44, h * 0.13, 2);
    body(g, p, stoneCol, [-w * 0.22, sy - h * 0.06, w * 0.22, sy + h * 0.07], { lw: 1.6, ao: 2, light: 40 });
    crack(g, r, -w * 0.1, sy - h * 0.04, w * 0.14, 1.2, 0.8);
    mosser(0, sy, w * 0.3);
    return;
  }
  if (type === 'obelisk') {
    // obelisk: kvadratisk fod, tre trin og en pyramideformet spids set oppefra
    const s = w * 0.3;
    const cx = 0;
    const cy = -h * 0.05;
    for (const [k, c] of [[1.0, -8], [0.78, 2], [0.56, 10]] as const) {
      rectBody(g, cx - (s * k) / 2, cy - (s * k) / 2, s * k, s * k, 1.5, shift(stoneCol, c), { lw: 1.4, ao: 1.6 });
    }
    // pyramidespids: fire trekanter i to lysgrader
    const q = s * 0.3;
    const faces: [[number, number][], number][] = [
      [[[cx - q, cy - q], [cx + q, cy - q], [cx, cy]], 26],
      [[[cx - q, cy - q], [cx - q, cy + q], [cx, cy]], 12],
      [[[cx + q, cy - q], [cx + q, cy + q], [cx, cy]], -18],
      [[[cx - q, cy + q], [cx + q, cy + q], [cx, cy]], -30],
    ];
    for (const [pts, d] of faces) {
      polyPath(g, pts)();
      g.fillStyle = rgb(shift(stoneCol, d));
      g.fill();
      g.strokeStyle = 'rgba(20,14,8,.7)';
      g.lineWidth = 1;
      g.stroke();
    }
    mosser(cx, cy, s);
    return;
  }
  if (type === 'angel') {
    // grav med stenstatue af engel set oppefra: udbredte vinger, hoved og foldede hænder
    const cx = 0;
    const cy = -h * 0.04;
    rectBody(g, cx - w * 0.3, cy - h * 0.34, w * 0.6, h * 0.68, 3, shift(stoneCol, -10), { lw: 1.6, ao: 2.4 });
    for (const s of [-1, 1]) {
      g.save();
      g.translate(cx, cy - h * 0.04);
      g.scale(s, 1);
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(w * 0.12, -h * 0.12, w * 0.3, -h * 0.14, w * 0.34, -h * 0.02);
      g.bezierCurveTo(w * 0.3, h * 0.12, w * 0.2, h * 0.22, w * 0.05, h * 0.3);
      g.closePath();
      g.fillStyle = lin(g, 0, -h * 0.1, w * 0.3, h * 0.25, [[0, rgb(shift(stoneCol, 36))], [1, rgb(shift(stoneCol, -22))]]);
      g.fill();
      g.strokeStyle = 'rgba(20,16,10,.75)';
      g.lineWidth = 1.3;
      g.stroke();
      g.strokeStyle = 'rgba(40,34,26,.4)';
      g.lineWidth = 0.9;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(w * 0.02, -h * 0.02 + i * h * 0.04); g.lineTo(w * (0.3 - i * 0.04), -h * 0.03 + i * h * 0.05); g.stroke(); }
      g.restore();
    }
    dome(g, cx, cy - h * 0.2, w * 0.06, w * 0.06, shift(stoneCol, 22), { lw: 1.2 });
    rectBody(g, cx - w * 0.07, cy - h * 0.12, w * 0.14, h * 0.2, w * 0.05, shift(stoneCol, 4), { lw: 1.2, ao: 1.4 });
    mosser(cx, cy, w * 0.5);
    return;
  }
  // trækors på frisk jord
  const wood: RGB = [136, 100, 62];
  rectBody(g, -w * 0.06, sy - h * 0.12, w * 0.12, h * 0.34, 1, wood, { lw: 1.4, ao: 1.2 });
  rectBody(g, -w * 0.2, sy - h * 0.04, w * 0.4, h * 0.1, 1, shift(wood, 8), { lw: 1.4, ao: 1.2 });
  // visne blomster
  for (let i = 0; i < 4; i++) dome(g, (r() - 0.5) * w * 0.4, h * 0.1 + r() * h * 0.2, 2, 2, [[220, 80, 90], [240, 220, 90], [250, 250, 250]][i % 3] as RGB, { lw: 0.5 });
}
const graveKind = (key: string, name: string, type: Stone, w: number, h: number): ObjectKind =>
  kind({
    key, family: FAM, name, w, h, shadow: 10, bleed: 0.05, randomRotation: false, tags: ['graveyard', 'crypt', 'outdoor'],
    params: [mossParam],
    draw: (g, o) => gravestone(g, o.w, o.h, o.seed, type, param(o, 'moss', 0.3)),
  });

function freshGrave(g: G, w: number, h: number, seed: number, open: boolean): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const y0 = -h / 2;
  if (open) {
    // åben grav: mørkt hul med jordbunke og en spade
    const earth = blobPath(g, wobble(r, w * 0.22, 0, w * 0.26, h * 0.4, 9, 0.2));
    body(g, earth, [112, 80, 52], [x0, y0, x0 + w, y0 + h], { lw: 1.4, ao: 3 });
    clipped(g, earth, () => mottle(g, r, [x0, y0, x0 + w, y0 + h], [112, 80, 52], 40, 4, 24, 0.45));
    const hp = rectPath(g, -w * 0.3, -h * 0.34, w * 0.42, h * 0.68, 3);
    hp();
    g.fillStyle = 'rgb(10,6,4)';
    g.fill();
    clipped(g, hp, () => {
      g.fillStyle = lin(g, -w * 0.3, 0, w * 0.12, 0, [[0, 'rgba(0,0,0,.5)'], [1, 'rgba(60,40,26,.6)']]);
      g.fillRect(-w * 0.3, -h * 0.34, w * 0.42, h * 0.68);
      g.fillStyle = 'rgba(100,74,50,.5)';
      g.fillRect(-w * 0.3, h * 0.2, w * 0.42, h * 0.14);
    });
    g.strokeStyle = 'rgba(70,46,26,.95)';
    g.lineWidth = 3.2;
    hp();
    g.stroke();
    // spade
    limb(g, [[w * 0.12, h * 0.38], [w * 0.4, h * 0.3]], 3, [136, 100, 62]);
    const bl = polyPath(g, [[w * 0.04, h * 0.36], [w * 0.14, h * 0.32], [w * 0.14, h * 0.46], [w * 0.04, h * 0.42]]);
    body(g, bl, [112, 114, 124], [w * 0.04, h * 0.32, w * 0.14, h * 0.46], { lw: 1, ao: 0.8 });
    return;
  }
  // friskgravet jord: høj jord med træ-kors og blomster
  plot(g, r, w, h, true, false);
  for (let i = 0; i < 18; i++) {
    const a = r() * 6.283;
    pebble(g, r, Math.cos(a) * w * 0.3 * Math.sqrt(r()), Math.sin(a) * h * 0.3 * Math.sqrt(r()), 1.5 + r() * 2.5, [128, 98, 70]);
  }
  rectBody(g, -w * 0.05, -h * 0.4, w * 0.1, h * 0.3, 1, [136, 100, 62], { lw: 1.3, ao: 1 });
  rectBody(g, -w * 0.17, -h * 0.34, w * 0.34, h * 0.08, 1, [144, 108, 66], { lw: 1.3, ao: 1 });
  for (let i = 0; i < 6; i++) dome(g, (r() - 0.5) * w * 0.3, h * 0.05 + r() * h * 0.25, 2, 2, [[226, 80, 100], [250, 220, 90], [244, 244, 244]][i % 3] as RGB, { lw: 0.5 });
  limb(g, [[w * 0.3, -h * 0.3], [w * 0.4, h * 0.4]], 3, [136, 100, 62]);
  const bl = polyPath(g, [[w * 0.28, -h * 0.34], [w * 0.36, -h * 0.4], [w * 0.38, -h * 0.28], [w * 0.3, -h * 0.24]]);
  body(g, bl, [112, 114, 124], [w * 0.28, -h * 0.4, w * 0.38, -h * 0.24], { lw: 1, ao: 0.8 });
}

/** Mausoleum set oppefra: gavltag af sten med rygning og en lille kors-top, dørstolper foran. */
function mausoleum(g: G, w: number, h: number, seed: number, cap: 'gable' | 'dome'): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const base: RGB = [146, 140, 130];
  // trin ved indgangen
  for (let i = 0; i < 3; i++) rectBody(g, x0 + w * (0.3 - i * 0.03), y0 + h - (3 - i) * 5, w * (0.4 + i * 0.06), 6, 1, shift(base, 6 - i * 6), { lw: 1.1, ao: 1 });
  if (cap === 'gable') {
    const rh = (h - 12) / 2;
    for (const [i, d] of [[0, 18], [1, -20]] as const) {
      const yy = y0 + i * rh;
      const p = rectPath(g, x0, yy, w, rh, 2);
      body(g, p, shift(base, d), [x0, yy, x0 + w, yy + rh], { lw: 1.6, ao: 2.4 });
      clipped(g, p, () => {
        for (let yy2 = yy; yy2 < yy + rh; yy2 += 7) {
          g.strokeStyle = 'rgba(30,22,16,.5)';
          g.lineWidth = 1;
          g.beginPath(); g.moveTo(x0, yy2); g.lineTo(x0 + w, yy2); g.stroke();
          for (let xx = x0 + ((yy2 / 7) % 2) * 6; xx < x0 + w; xx += 12) { g.beginPath(); g.moveTo(xx, yy2); g.lineTo(xx, yy2 + 7); g.stroke(); }
        }
        mottle(g, r, [x0, yy, x0 + w, yy + rh], shift(base, d), 18, 5, 18, 0.4);
      });
    }
    rectBody(g, x0 - 2, y0 + rh - 3, w + 4, 6, 2, shift(base, 28), { lw: 1.4, ao: 1 });
    // kors ovenpå rygningen
    rectBody(g, -2, y0 + rh - 14, 4, 12, 1, shift(base, 34), { lw: 1, ao: 0.6 });
    rectBody(g, -6, y0 + rh - 10, 12, 3.6, 1, shift(base, 34), { lw: 1, ao: 0.6 });
    for (const s of [-1, 1]) for (const t of [0.12, 0.88]) rectBody(g, s * (w / 2 - 3) - 3, y0 + h * t - 3, 6, 6, 1, shift(base, 10), { lw: 1, ao: 0.6 });
    return;
  }
  const rad = Math.min(w, h) * 0.46;
  const bp = rectPath(g, x0, y0 + 2, w, h - 10, 3);
  body(g, bp, shift(base, -10), [x0, y0, x0 + w, y0 + h], { lw: 1.6, ao: 2.4 });
  clipped(g, bp, () => mottle(g, r, [x0, y0, x0 + w, y0 + h], base, 24, 5, 18, 0.4));
  dome(g, 0, -h * 0.04, rad, rad, [112, 150, 130], { lw: 1.8, hi: 46 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.283;
    g.strokeStyle = 'rgba(30,60,50,.45)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(Math.cos(a) * rad * 0.15, -h * 0.04 + Math.sin(a) * rad * 0.15); g.lineTo(Math.cos(a) * rad, -h * 0.04 + Math.sin(a) * rad); g.stroke();
  }
  dome(g, -1, -h * 0.04 - 1, rad * 0.14, rad * 0.14, [180, 170, 120], { lw: 0.8 });
}

// ------------------------------------------------------------------ porte, lygter, kors, vogn

function irongate(g: G, w: number, h: number, seed: number, open: boolean): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const iron: RGB = [44, 46, 54];
  // to stenpiller med hætter
  for (const s of [-1, 1]) {
    const px = s < 0 ? x0 : x0 + w - h * 0.9;
    rectBody(g, px, -h * 0.45, h * 0.9, h * 0.9, 2, [140, 134, 122], { lw: 1.6, ao: 2.4 });
    rectBody(g, px + h * 0.15, -h * 0.3, h * 0.6, h * 0.6, 2, [158, 152, 140], { lw: 1.4, ao: 1.6 });
    mottle(g, r, [px, -h * 0.45, px + h * 0.9, h * 0.45], [140, 134, 122], 6, 3, 14, 0.3);
    dome(g, px + h * 0.45, 0, h * 0.14, h * 0.14, [170, 164, 150], { lw: 1 });
  }
  const gx0 = x0 + h * 0.9;
  const gw = w - h * 1.8;
  const leaves = (hx: number, dir: number): void => {
    g.save();
    g.translate(hx, 0);
    const len = gw / 2;
    const a = open ? dir * 1.2 : 0;
    g.rotate(dir > 0 ? Math.PI - 0 - (open ? 0 : 0) : 0);
    g.restore();
    g.save();
    g.translate(hx, 0);
    if (open) g.rotate(dir * 1.25);
    const L = dir > 0 ? -len : len;
    g.scale(1, 1);
    // jernstænger langs bladet
    g.strokeStyle = 'rgba(10,8,6,.8)';
    g.lineWidth = 4.6;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(L, 0); g.stroke();
    g.strokeStyle = rgb(iron);
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(L, 0); g.stroke();
    g.strokeStyle = 'rgba(170,172,184,.5)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, -0.8); g.lineTo(L, -0.8); g.stroke();
    // lodrette stave set som små kugler og spyd (spidserne som prikker), her ses de oppefra som prikker
    for (let i = 1; i <= 8; i++) dome(g, (L * i) / 9, 0, 1.9, 1.9, [96, 98, 110], { lw: 0.8 });
    dome(g, L, 0, 2.6, 2.6, [140, 120, 60], { lw: 0.8 });
    g.restore();
    void a;
  };
  leaves(gx0, -1);
  leaves(gx0 + gw, 1);
  rivet(g, gx0, 0, 3, [110, 110, 120]);
  rivet(g, gx0 + gw, 0, 3, [110, 110, 120]);
  if (!open) {
    rectBody(g, gx0 + gw / 2 - 5, -3.5, 10, 7, 1.5, [90, 80, 40], { lw: 1.2, ao: 0.8 });
  }
}

function lampPost(g: G, w: number, h: number, seed: number, form: 'post' | 'hanging' | 'standing'): void {
  const r = rng(seed);
  const R = Math.min(w, h) / 2;
  // varm glød i bunden
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
  gr.addColorStop(0, 'rgba(255,214,130,.6)');
  gr.addColorStop(0.5, 'rgba(255,190,90,.22)');
  gr.addColorStop(1, 'rgba(255,170,60,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
  if (form === 'hanging') {
    // konsol fra væggen (nord) og lanterne i enden
    limb(g, [[0, -R * 0.95], [0, -R * 0.35]], 4, [50, 52, 60]);
    limb(g, [[0, -R * 0.7], [-R * 0.25, -R * 0.45], [-R * 0.04, -R * 0.35]], 2, [50, 52, 60]);
    rectBody(g, -R * 0.18, -R * 0.2, R * 0.36, R * 0.36, 3, [54, 50, 46], { lw: 1.3, ao: 1.4 });
    dome(g, 0, -R * 0.02, R * 0.12, R * 0.12, [255, 232, 150], { lw: 0, hi: 20 });
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
      g.strokeStyle = 'rgba(20,16,12,.9)';
      g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(sx * R * 0.18, sy * R * 0.18 - R * 0.02); g.lineTo(sx * R * 0.1, sy * R * 0.1 - R * 0.02); g.stroke();
    }
    return;
  }
  // lygtepæl: sokkel, stolpe (cirkel) og lampehus med glas set oppefra
  dome(g, 0, 0, R * 0.26, R * 0.26, [58, 60, 70], { lw: 1.4, hi: 30 });
  dome(g, 0, 0, R * 0.19, R * 0.19, [76, 78, 90], { lw: 1 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283;
    g.strokeStyle = 'rgba(190,192,204,.35)';
    g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(Math.cos(a) * R * 0.07, Math.sin(a) * R * 0.07); g.lineTo(Math.cos(a) * R * 0.19, Math.sin(a) * R * 0.19); g.stroke();
  }
  dome(g, 0, 0, R * 0.09, R * 0.09, form === 'standing' ? [255, 232, 150] : [214, 190, 120], { lw: 0.8, hi: 20 });
  // krone-hætte
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.283 + 0.78;
    limb(g, [[0, 0], [Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3]], 2, [52, 54, 62]);
  }
  void r;
}

function wayCross(g: G, w: number, h: number, seed: number, wood: boolean): void {
  const r = rng(seed);
  const R = Math.min(w, h) / 2;
  const col: RGB = wood ? [136, 100, 62] : [148, 142, 132];
  // trappefod
  for (let i = 0; i < 3; i++) {
    const s = R * (0.95 - i * 0.2);
    rectBody(g, -s, -s, s * 2, s * 2, 2, shift(col, -8 + i * 8), { lw: 1.4, ao: 2 });
  }
  const arm = R * 0.17;
  const p1 = rectPath(g, -arm / 2, -R * 0.5, arm, R * 0.95, 1.5);
  body(g, p1, col, [-arm / 2, -R * 0.5, arm / 2, R * 0.45], { lw: 1.5, ao: 1.4, light: 30 });
  const p2 = rectPath(g, -R * 0.32, -R * 0.26, R * 0.64, arm, 1.5);
  body(g, p2, shift(col, 6), [-R * 0.32, -R * 0.26, R * 0.32, -R * 0.26 + arm], { lw: 1.5, ao: 1.4, light: 30 });
  if (wood) clipped(g, p1, () => woodGrain(g, r, [-arm / 2, -R * 0.5, arm / 2, R * 0.45], col, { lines: 3, rot: Math.PI / 2 }));
  else for (let i = 0; i < 3; i++) mossPatch(g, r, (r() - 0.5) * R, R * 0.5 + (r() - 0.5) * R * 0.3, R * 0.2, 6);
  for (let i = 0; i < 5; i++) dome(g, (r() - 0.5) * R * 1.4, R * 1.0 * (r() < 0.5 ? 1 : -1) * 0.9, 1.6, 1.6, [[220, 80, 90], [240, 220, 90], [244, 244, 244]][i % 3] as RGB, { lw: 0.4 });
}

type Wagon = 'abandoned' | 'broken' | 'covered';
function wagon(g: G, w: number, h: number, seed: number, form: Wagon): void {
  const r = rng(seed);
  const bw = w * 0.76;
  const bh = h * 0.58;
  const wood: RGB = [128, 92, 56];
  g.save();
  if (form === 'broken') g.rotate(0.14);
  // hjul: set oppefra som smalle tykke striber ved siden af vognen
  const wheel = (cx: number, cy: number, skew: number): void => {
    const L = h * 0.3;
    g.save();
    g.translate(cx, cy);
    g.rotate(skew);
    const p = rectPath(g, -5, -L, 10, L * 2, 3);
    body(g, p, [92, 66, 40], [-5, -L, 5, L], { lw: 1.4, ao: 1.4 });
    clipped(g, p, () => {
      g.strokeStyle = 'rgba(30,20,10,.55)';
      g.lineWidth = 1;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(-5, i * L * 0.28); g.lineTo(5, i * L * 0.28); g.stroke(); }
    });
    g.fillStyle = 'rgba(110,112,122,.9)';
    g.fillRect(-5.5, -1.4, 11, 2.8);
    g.restore();
  };
  wheel(-bw * 0.3, -bh / 2 - 6, 0);
  if (form !== 'broken') wheel(-bw * 0.3, bh / 2 + 6, 0);
  wheel(bw * 0.28, -bh / 2 - 6, 0);
  wheel(bw * 0.28, bh / 2 + 6, form === 'broken' ? 0.4 : 0);
  // aksler
  for (const ax of [-bw * 0.3, bw * 0.28]) {
    g.strokeStyle = 'rgba(30,20,10,.85)';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(ax, -bh / 2 - 4); g.lineTo(ax, bh / 2 + 4); g.stroke();
  }
  // vognkasse
  const p = rectPath(g, -bw / 2, -bh / 2, bw, bh, 3);
  body(g, p, wood, [-bw / 2, -bh / 2, bw / 2, bh / 2], { lw: 1.8, ao: 3 });
  clipped(g, p, () => {
    for (let i = 1; i < 6; i++) {
      g.fillStyle = 'rgba(10,4,0,.5)';
      g.fillRect(-bw / 2, -bh / 2 + (i * bh) / 6, bw, 1.4);
    }
    woodGrain(g, r, [-bw / 2, -bh / 2, bw / 2, bh / 2], wood, { lines: 14, contrast: 0.9 });
    mottle(g, r, [-bw / 2, -bh / 2, bw / 2, bh / 2], wood, 24, 5, 20, 0.45);
  });
  const inner = rectPath(g, -bw / 2 + 5, -bh / 2 + 5, bw - 10, bh - 10, 2);
  inner();
  g.fillStyle = 'rgba(30,18,8,.45)';
  g.fill();
  if (form === 'covered') {
    // sejldug over buer
    const cp = rectPath(g, -bw * 0.46, -bh * 0.46, bw * 0.92, bh * 0.92, 10);
    body(g, cp, [222, 212, 186], [-bw / 2, -bh / 2, bw / 2, bh / 2], { lw: 1.6, ao: 3 });
    clipped(g, cp, () => {
      for (let i = 1; i < 6; i++) { g.strokeStyle = 'rgba(80,60,30,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-bw / 2 + (i * bw) / 6, -bh / 2); g.lineTo(-bw / 2 + (i * bw) / 6, bh / 2); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.2)';
      g.fillRect(-bw / 2, -bh / 2, bw, bh * 0.35);
      mottle(g, r, [-bw / 2, -bh / 2, bw / 2, bh / 2], [200, 190, 160], 12, 6, 18, 0.4);
    });
  } else {
    for (let i = 0; i < 3; i++) {
      const bx = -bw * 0.2 + r() * bw * 0.4;
      const by = (r() - 0.5) * bh * 0.5;
      rectBody(g, bx - 8, by - 6, 16, 12, 1.5, shift([140, 104, 64], (r() - 0.5) * 24), { lw: 1.2, ao: 1 });
    }
    // knækket bræt og mos
    for (let i = 0; i < 3; i++) mossPatch(g, r, (r() - 0.5) * bw * 0.8, (r() - 0.5) * bh * 0.7, bh * 0.2, 6);
  }
  // trækstang (stang foran)
  limb(g, [[bw / 2, 0], [bw / 2 + w * 0.2, 0]], 5, [110, 78, 46]);
  g.restore();
}

function waymarks(g: G, w: number, h: number, seed: number, form: 'post' | 'reflector' | 'cairnline'): void {
  const r = rng(seed);
  if (form === 'post') {
    // række af lave pæle langs vejen med malet top
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + ((i + 0.5) / n) * w;
      dome(g, x, 0, h * 0.34, h * 0.34, [124, 90, 56], { lw: 1.4 });
      dome(g, x, 0, h * 0.2, h * 0.2, i % 2 ? [226, 226, 214] : [196, 52, 44], { lw: 0.8, hi: 30 });
    }
    return;
  }
  if (form === 'reflector') {
    for (let i = 0; i < 3; i++) {
      const x = -w / 2 + ((i + 0.5) / 3) * w;
      rectBody(g, x - h * 0.12, -h * 0.3, h * 0.24, h * 0.6, 2, [186, 180, 164], { lw: 1.3, ao: 1.2 });
      dome(g, x, 0, h * 0.09, h * 0.09, [250, 200, 70], { lw: 0.6 });
    }
    return;
  }
  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + ((i + 0.5) / 3) * w;
    pebble(g, r, x, 0, h * 0.34, [150, 142, 128]);
    pebble(g, r, x + 1, -h * 0.06, h * 0.22, [164, 156, 142]);
    pebble(g, r, x + 1, -h * 0.1, h * 0.1, [176, 168, 154]);
  }
}

void ellBody; void ellipsePath; void leaf; void sel; void radial;
export const graveKinds: ObjectKind[] = [
  graveKind('gravex_stone_cross', 'Grav med stenkors', 'cross', 1.2, 2.2),
  graveKind('gravex_stone_round', 'Grav med rundbuet sten', 'round', 1.2, 2.2),
  graveKind('gravex_stone_plain', 'Grav med slidt sten', 'plain', 1.2, 2.2),
  graveKind('gravex_stone_obelisk', 'Obelisk-gravmæle', 'obelisk', 1.6, 1.6),
  graveKind('gravex_stone_angel', 'Grav med engel', 'angel', 1.8, 2.4),
  graveKind('gravex_wood_cross', 'Grav med trækors', 'wood', 1.2, 2.2),
  kind({ key: 'gravex_fresh', family: FAM, name: 'Friskgravet grav', w: 1.2, h: 2.2, shadow: 6, bleed: 0.05, tags: ['graveyard', 'crypt'], draw: (g, o) => freshGrave(g, o.w, o.h, o.seed, false) }),
  kind({ key: 'gravex_open', family: FAM, name: 'Åben grav med spade', w: 1.8, h: 2.2, shadow: 6, bleed: 0.05, tags: ['graveyard', 'crypt'], draw: (g, o) => freshGrave(g, o.w, o.h, o.seed, true) }),
  kind({ key: 'gravex_mausoleum_roof', family: FAM, name: 'Mausoleum, stentag', w: 3, h: 3.6, shadow: 20, bleed: 0.03, tags: ['graveyard', 'crypt', 'rich', 'temple'], draw: (g, o) => mausoleum(g, o.w, o.h, o.seed, 'gable') }),
  kind({ key: 'gravex_mausoleum_dome', family: FAM, name: 'Mausoleum med kuppel', w: 3.4, h: 3.4, shadow: 20, bleed: 0.03, tags: ['graveyard', 'crypt', 'rich', 'temple'], draw: (g, o) => mausoleum(g, o.w, o.h, o.seed, 'dome') }),
  kind({ key: 'gravex_irongate_closed', family: FAM, name: 'Kirkegårdsport, lukket', w: 3.4, h: 0.8, shadow: 8, bleed: 0.04, keepAspect: false, tags: ['graveyard', 'city', 'rich', 'ruin'], draw: (g, o) => irongate(g, o.w, o.h, o.seed, false) }),
  kind({ key: 'gravex_irongate_open', family: FAM, name: 'Kirkegårdsport, åben', w: 3.4, h: 1.6, shadow: 8, bleed: 0.04, keepAspect: false, tags: ['graveyard', 'city', 'rich', 'ruin'], draw: (g, o) => irongate(g, o.w, o.h, o.seed, true) }),
  kind({ key: 'gravex_lamppost', family: FAM, name: 'Lygtepæl', w: 1.6, h: 1.6, shadow: 0, bleed: 0.05, layers: ['effects', 'objects'], tags: ['city', 'village', 'graveyard'], draw: (g, o) => lampPost(g, o.w, o.h, o.seed, 'post') }),
  kind({ key: 'gravex_lamp_standing', family: FAM, name: 'Lygtepæl, tændt', w: 2.4, h: 2.4, shadow: 0, bleed: 0.05, layers: ['effects', 'objects'], tags: ['city', 'village', 'graveyard'], draw: (g, o) => lampPost(g, o.w, o.h, o.seed, 'standing') }),
  kind({ key: 'gravex_lamp_hanging', family: FAM, name: 'Hængende lanterne', w: 2, h: 2, shadow: 0, bleed: 0.05, layers: ['effects', 'objects'], tags: ['city', 'village', 'house', 'tavern'], draw: (g, o) => lampPost(g, o.w, o.h, o.seed, 'hanging') }),
  kind({ key: 'gravex_wayside_cross', family: FAM, name: 'Vejsidekors, sten', w: 1.6, h: 1.6, shadow: 10, bleed: 0.05, tags: ['village', 'grassland', 'forest', 'temple'], draw: (g, o) => wayCross(g, o.w, o.h, o.seed, false) }),
  kind({ key: 'gravex_wayside_cross_wood', family: FAM, name: 'Vejsidekors, træ', w: 1.4, h: 1.4, shadow: 10, bleed: 0.05, tags: ['village', 'grassland', 'forest', 'poor'], draw: (g, o) => wayCross(g, o.w, o.h, o.seed, true) }),
  kind({ key: 'gravex_wagon_abandoned', family: FAM, name: 'Forladt vogn', w: 3.6, h: 2.2, shadow: 14, bleed: 0.06, randomRotation: false, tags: ['ruin', 'grassland', 'battlefield', 'farm'], draw: (g, o) => wagon(g, o.w, o.h, o.seed, 'abandoned') }),
  kind({ key: 'gravex_wagon_broken', family: FAM, name: 'Vognvrag, brækket aksel', w: 3.6, h: 2.4, shadow: 14, bleed: 0.06, tags: ['ruin', 'battlefield', 'grassland'], draw: (g, o) => wagon(g, o.w, o.h, o.seed, 'broken') }),
  kind({ key: 'gravex_wagon_covered', family: FAM, name: 'Dækket vogn, forladt', w: 3.8, h: 2.4, shadow: 14, bleed: 0.06, tags: ['ruin', 'grassland', 'camp', 'battlefield'], draw: (g, o) => wagon(g, o.w, o.h, o.seed, 'covered') }),
  kind({ key: 'gravex_waymarks_posts', family: FAM, name: 'Vejafmærkning, pæle', w: 3, h: 0.6, shadow: 6, bleed: 0.05, keepAspect: false, tags: ['village', 'grassland', 'mountain', 'arctic'], draw: (g, o) => waymarks(g, o.w, o.h, o.seed, 'post') }),
  kind({ key: 'gravex_waymarks_stones', family: FAM, name: 'Vejafmærkning, stenvarder', w: 3, h: 0.7, shadow: 6, bleed: 0.05, keepAspect: false, tags: ['mountain', 'grassland', 'arctic'], draw: (g, o) => waymarks(g, o.w, o.h, o.seed, 'cairnline') }),
  kind({ key: 'gravex_waymarks_marker', family: FAM, name: 'Vejafmærkning, markører', w: 2, h: 0.6, shadow: 4, bleed: 0.05, keepAspect: false, tags: ['village', 'city', 'grassland'], draw: (g, o) => waymarks(g, o.w, o.h, o.seed, 'reflector') }),
];
