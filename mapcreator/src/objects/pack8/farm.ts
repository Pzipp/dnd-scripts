import { kind, param, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { body, clipped, mottle, rectPath, ellipsePath, wobble, woodGrain, leaf, rivet, mossPatch, polyBody, rectBody, ellBody } from '../pack2/helpers';
import { blobPath, dome, limb, pebble, rgb, shift, lin, radial, polyPath, type G, type RGB, type Rnd } from './common';

/** Landbrug og have (pakke 8): marker, hegn, høstakke, drivhus, bistader, dyrehuse, bærbuske, urtehave, skilte og markstene. Alt set oppefra. */

const FAM = 'farmx';
const SOIL: RGB = [104, 76, 50];

const ripeParam: ParamDef = { key: 'ripe', label: 'Modenhed', type: 'range', min: 0, max: 1, step: 0.1, default: 0.7 };

/** Pløjet jord med furer langs x. */
function tilled(g: G, r: Rnd, x: number, y: number, w: number, h: number, rows: number): void {
  const p = rectPath(g, x, y, w, h, 3);
  body(g, p, SOIL, [x, y, x + w, y + h], { lw: 1.6, ao: 3 });
  clipped(g, p, () => {
    mottle(g, r, [x, y, x + w, y + h], SOIL, 50, w * 0.03, 22, 0.4);
    for (let i = 0; i < rows; i++) {
      const yy = y + ((i + 0.5) / rows) * h;
      g.fillStyle = 'rgba(40,24,12,.35)';
      g.fillRect(x, yy + h / rows * 0.18, w, h / rows * 0.18);
      g.fillStyle = 'rgba(190,150,100,.22)';
      g.fillRect(x, yy - h / rows * 0.32, w, h / rows * 0.14);
    }
  });
}

type Crop = 'wheat' | 'corn' | 'cabbage' | 'vine' | 'flax' | 'carrot';

function field(g: G, w: number, h: number, seed: number, crop: Crop, ripe: number): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const rows = crop === 'vine' ? Math.max(3, Math.round(h / 38)) : Math.max(4, Math.round(h / (crop === 'cabbage' ? 30 : 20)));
  tilled(g, r, x0, y0, w, h, rows);
  const rh = h / rows;
  const green: RGB = crop === 'flax' ? [96, 140, 120] : crop === 'carrot' ? [86, 140, 60] : [96, 150, 58];
  const gold: RGB = crop === 'wheat' ? [222, 188, 80] : crop === 'corn' ? [208, 170, 56] : crop === 'flax' ? [150, 160, 170] : crop === 'carrot' ? [100, 150, 54] : [120, 150, 60];
  const col = (): RGB => {
    const k = ripe;
    return [green[0] + (gold[0] - green[0]) * k + (r() - 0.5) * 18, green[1] + (gold[1] - green[1]) * k + (r() - 0.5) * 18, green[2] + (gold[2] - green[2]) * k + (r() - 0.5) * 18];
  };
  for (let i = 0; i < rows; i++) {
    const yy = y0 + (i + 0.5) * rh;
    if (crop === 'wheat' || crop === 'flax') {
      // tætte strå som korte lodrette streger med aks
      const n = Math.round(w / 3.4);
      for (let k = 0; k < n; k++) {
        const x = x0 + 2 + (k / n) * (w - 4) + (r() - 0.5) * 2;
        const c = col();
        g.strokeStyle = 'rgba(30,24,6,.55)';
        g.lineWidth = 2.6;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x, yy + rh * 0.34);
        g.lineTo(x + 0.7, yy - rh * 0.32);
        g.stroke();
        g.strokeStyle = rgb(shift(c, (k % 2 ? 14 : -10)));
        g.lineWidth = 1.7;
        g.stroke();
        if (crop === 'wheat' && ripe > 0.35) {
          g.fillStyle = rgb(shift(c, 24));
          g.beginPath();
          g.ellipse(x + 0.7, yy - rh * 0.34, 1.3, 2.6, 0, 0, 7);
          g.fill();
        }
        if (crop === 'flax' && ripe < 0.6 && r() < 0.35) dome(g, x + 0.7, yy - rh * 0.3, 1.5, 1.5, [110, 140, 230], { lw: 0 });
      }
    } else if (crop === 'corn') {
      const n = Math.round(w / 15);
      for (let k = 0; k < n; k++) {
        const x = x0 + 8 + (k / n) * (w - 12) + (r() - 0.5) * 3;
        const c = col();
        const a0 = r() * 6.283;
        for (let j = 0; j < 6; j++) leaf(g, x, yy, a0 + j * 1.05, rh * 0.55, rh * 0.13, shift(c, (r() - 0.5) * 24), true);
        dome(g, x, yy, 2.2, 2.2, [236, 214, 90], { lw: 0.6 });
      }
    } else if (crop === 'cabbage') {
      const n = Math.round(w / 24);
      for (let k = 0; k < n; k++) {
        const x = x0 + 12 + (k / n) * (w - 16);
        const rad = rh * 0.38 * (0.7 + ripe * 0.4);
        dome(g, x, yy, rad, rad, shift([90, 148, 72], (r() - 0.5) * 24), { lw: 1 });
        for (let j = 0; j < 4; j++) {
          g.strokeStyle = 'rgba(20,50,20,.35)';
          g.lineWidth = 0.9;
          g.beginPath();
          g.arc(x, yy, rad * (0.25 + j * 0.2), 0.6 + j, 2.5 + j);
          g.stroke();
        }
      }
    } else if (crop === 'carrot') {
      const n = Math.round(w / 9);
      for (let k = 0; k < n; k++) {
        const x = x0 + 4 + (k / n) * (w - 8);
        const a0 = r() * 6.283;
        for (let j = 0; j < 5; j++) leaf(g, x, yy, a0 + j * 1.26, rh * 0.42, rh * 0.07, shift(col(), 8), false);
        if (ripe > 0.7 && r() < 0.35) dome(g, x, yy, 1.6, 1.6, [236, 130, 40], { lw: 0.5 });
      }
    } else {
      // vin: espalier med pæle og tråd, bladrige ranker og klaser
      g.strokeStyle = 'rgba(30,20,10,.55)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x0, yy);
      g.lineTo(x0 + w, yy);
      g.stroke();
      const n = Math.round(w / 22);
      for (let k = 0; k <= n; k++) {
        const x = x0 + (k / n) * w;
        rectBody(g, x - 1.6, yy - 1.6, 3.2, 3.2, 0.6, [110, 78, 48], { lw: 0.8, ao: 0.6 });
      }
      for (let k = 0; k < n; k++) {
        const x = x0 + ((k + 0.5) / n) * w;
        for (let j = 0; j < 5; j++) leaf(g, x + (r() - 0.5) * 10, yy + (r() - 0.5) * 4, r() * 6.283, rh * 0.28, rh * 0.12, shift([84, 138, 52], (r() - 0.5) * 30), false);
        if (ripe > 0.4) for (let j = 0; j < 3; j++) dome(g, x + (r() - 0.5) * 12, yy + (r() - 0.3) * 6, 1.8, 1.8, ripe > 0.7 ? [86, 40, 100] : [150, 176, 70], { lw: 0.4 });
      }
    }
  }
  // ukrudt og sten ved kanten
  for (let i = 0; i < 4; i++) pebble(g, r, x0 + r() * w, r() < 0.5 ? y0 + 2 : y0 + h - 2, 2 + r() * 2, [128, 118, 100]);
}

const fieldKind = (key: string, name: string, w: number, h: number, crop: Crop, ripe: number, tags: string[]): ObjectKind =>
  kind({ key, family: FAM, name, w, h, shadow: 0, bleed: 0.02, tags, params: [{ ...ripeParam, default: ripe }], draw: (g, o) => field(g, o.w, o.h, o.seed, crop, param(o, 'ripe', ripe)) });

// ------------------------------------------------------------------ hegn

type Fence = 'picket' | 'rail' | 'stone' | 'wicker' | 'hurdle' | 'iron';
function fence(g: G, w: number, h: number, seed: number, type: Fence): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const wood: RGB = [150, 112, 70];
  const th = Math.min(h, 22);
  if (type === 'stone') {
    const n = Math.round(w / (th * 0.55));
    for (let i = 0; i < n * 2; i++) {
      const x = x0 + ((i + 0.5) / (n * 2)) * w;
      pebble(g, r, x, (r() - 0.5) * th * 0.35, th * (0.28 + r() * 0.14), shift([134, 126, 112], (r() - 0.5) * 32));
    }
    for (let i = 0; i < 6; i++) mossPatch(g, r, x0 + r() * w, (r() - 0.5) * th * 0.5, th * 0.2, 6);
    return;
  }
  if (type === 'wicker') {
    const p = rectPath(g, x0, -th * 0.3, w, th * 0.6, th * 0.3);
    body(g, p, [168, 128, 78], [x0, -th * 0.3, x0 + w, th * 0.3], { lw: 1.4, ao: 2 });
    clipped(g, p, () => {
      for (let i = 0; i < w / 5; i++) {
        g.strokeStyle = i % 2 ? 'rgba(255,230,170,.35)' : 'rgba(40,20,6,.4)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(x0 + i * 5, -th * 0.3);
        g.quadraticCurveTo(x0 + i * 5 + 3, 0, x0 + i * 5, th * 0.3);
        g.stroke();
      }
    });
    for (let i = 0; i <= Math.round(w / 40); i++) ellBody(g, x0 + (i / Math.max(1, Math.round(w / 40))) * w, 0, 2.6, 2.6, [112, 78, 46], { lw: 1, ao: 0.6 });
    return;
  }
  if (type === 'iron') {
    const n = Math.round(w / 8);
    for (const yy of [-th * 0.28, th * 0.28]) limb(g, [[x0, yy], [x0 + w, yy]], 2.4, [60, 62, 70]);
    for (let i = 0; i <= n; i++) {
      const x = x0 + (i / n) * w;
      rectBody(g, x - 1.2, -th * 0.38, 2.4, th * 0.76, 0.6, [64, 66, 74], { lw: 0.8, ao: 0.6 });
      dome(g, x, -th * 0.4, 1.8, 1.8, [110, 112, 122], { lw: 0.6 });
    }
    for (let i = 0; i <= 2; i++) rectBody(g, x0 + (i / 2) * w - 3, -th * 0.45, 6, th * 0.9, 1, [96, 92, 86], { lw: 1.2, ao: 1 });
    return;
  }
  if (type === 'hurdle') {
    // flettet kvasbarrikade: skråstivere
    const p = rectPath(g, x0, -th * 0.4, w, th * 0.8, 1);
    for (let i = 0; i < w / 12; i++) {
      g.save();
      g.translate(x0 + i * 12 + 6, 0);
      g.rotate(0.45 * (i % 2 ? 1 : -1));
      rectBody(g, -1.6, -th * 0.5, 3.2, th, 0.6, shift(wood, (r() - 0.5) * 24), { lw: 0.9, ao: 0.5 });
      g.restore();
    }
    for (const yy of [-th * 0.35, th * 0.35]) rectBody(g, x0, yy - 2, w, 4, 1, shift(wood, -14), { lw: 1.1, ao: 0.8 });
    void p;
    return;
  }
  // stakit/tremmehegn: et eller to liggere og lodrette brædder set fra oven
  const rails = type === 'picket' ? [0] : [-th * 0.22, th * 0.22];
  for (const yy of rails) {
    const p = rectPath(g, x0, yy - 2.4, w, 4.8, 1);
    body(g, p, shift(wood, -10), [x0, yy - 2.4, x0 + w, yy + 2.4], { lw: 1.2, ao: 1 });
    clipped(g, p, () => woodGrain(g, r, [x0, yy - 2.4, x0 + w, yy + 2.4], wood, { lines: 2, contrast: 0.7 }));
  }
  const n = type === 'picket' ? Math.round(w / 9) : Math.round(w / 55);
  for (let i = 0; i <= n; i++) {
    const x = x0 + (i / n) * w;
    if (type === 'picket') {
      const bw = 5;
      const p = rectPath(g, x - bw / 2, -th * 0.42, bw, th * 0.84, 0.8);
      body(g, p, shift([226, 214, 190], (r() - 0.5) * 30), [x - bw / 2, -th * 0.42, x + bw / 2, th * 0.42], { lw: 1, ao: 0.7, light: 14 });
      // spids
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(x - bw / 2 + 0.5, -th * 0.42, 1.2, th * 0.84);
    } else {
      rectBody(g, x - 3.2, -th * 0.4, 6.4, th * 0.8, 1.2, shift(wood, -4), { lw: 1.3, ao: 1 });
      dome(g, x, 0, 1.4, 1.4, shift(wood, 40), { lw: 0 });
    }
  }
}
const fenceKind = (key: string, name: string, w: number, type: Fence, tags: string[]): ObjectKind =>
  kind({ key, family: FAM, name, w, h: 0.5, shadow: 6, bleed: 0.03, keepAspect: false, tags, draw: (g, o) => fence(g, o.w, o.h, o.seed, type) });

// ------------------------------------------------------------------ høstakke og baller

function hay(g: G, w: number, h: number, seed: number, form: 'bale' | 'stack' | 'loose' | 'bales'): void {
  const r = rng(seed);
  const gold: RGB = [214, 182, 86];
  const strands = (cx: number, cy: number, rad: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * rad;
      const l = rad * (0.2 + r() * 0.25);
      const a2 = r() * 6.283;
      g.strokeStyle = r() < 0.5 ? rgb(shift(gold, 26 + r() * 20), 0.8) : rgb(shift(gold, -36), 0.6);
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
      g.lineTo(cx + Math.cos(a) * d + Math.cos(a2) * l, cy + Math.sin(a) * d + Math.sin(a2) * l);
      g.stroke();
    }
  };
  if (form === 'loose') {
    for (let i = 0; i < 5; i++) {
      const x = (r() - 0.5) * w * 0.5;
      const y = (r() - 0.5) * h * 0.5;
      const rad = w * (0.18 + r() * 0.12);
      const p = blobPath(g, wobble(r, x, y, rad, rad * 0.8, 9, 0.25));
      body(g, p, shift(gold, (r() - 0.5) * 20), [x - rad, y - rad, x + rad, y + rad], { lw: 1, ao: 2 });
      clipped(g, p, () => strands(x, y, rad, 40));
    }
    return;
  }
  if (form === 'bale' || form === 'bales') {
    const list = form === 'bale' ? [[0, 0, 0.44]] : [[-0.26, -0.2, 0.3], [0.24, -0.16, 0.3], [-0.04, 0.26, 0.3]];
    for (const [px, py, k] of list as [number, number, number][]) {
      const cx = px * w;
      const cy = py * h;
      const rad = k * Math.min(w, h);
      const p = ellipsePath(g, cx, cy, rad, rad);
      body(g, p, gold, [cx - rad, cy - rad, cx + rad, cy + rad], { lw: 1.6, ao: rad * 0.12 });
      clipped(g, p, () => {
        // spiralformet viklet halm og bånd
        for (let t = 1; t < 7; t++) {
          g.strokeStyle = `rgba(80,56,16,${0.35})`;
          g.lineWidth = 1.1;
          g.beginPath();
          g.arc(cx + (r() - 0.5) * 2, cy + (r() - 0.5) * 2, (t / 7) * rad, 0.4 * t, 5.5 + 0.4 * t);
          g.stroke();
        }
        strands(cx, cy, rad, 60);
      });
      // net/bånd
      g.strokeStyle = 'rgba(70,52,30,.7)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(cx, cy, rad * 0.7, 0, 7);
      g.stroke();
    }
    return;
  }
  // stak: kegle med rebstrimler set oppefra
  const rad = Math.min(w, h) * 0.47;
  const p = ellipsePath(g, 0, 0, rad, rad);
  body(g, p, gold, [-rad, -rad, rad, rad], { lw: 1.8, ao: rad * 0.1, dark: 46 });
  clipped(g, p, () => {
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * 6.283 + r() * 0.12;
      g.strokeStyle = r() < 0.5 ? 'rgba(255,236,150,.5)' : 'rgba(90,60,16,.4)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(Math.cos(a) * rad * 0.1, Math.sin(a) * rad * 0.1);
      g.lineTo(Math.cos(a + 0.12) * rad, Math.sin(a + 0.12) * rad);
      g.stroke();
    }
  });
  for (const k of [0.45, 0.75]) {
    g.strokeStyle = 'rgba(100,72,34,.7)';
    g.lineWidth = 1.2;
    g.setLineDash([3, 3]);
    g.beginPath();
    g.arc(0, 0, rad * k, 0, 7);
    g.stroke();
    g.setLineDash([]);
  }
  dome(g, -rad * 0.04, -rad * 0.04, rad * 0.08, rad * 0.08, shift(gold, -30), { lw: 0.8 });
}
const hayKind = (key: string, name: string, w: number, h: number, form: 'bale' | 'stack' | 'loose' | 'bales', rot: boolean): ObjectKind =>
  kind({ key, family: FAM, name, w, h, shadow: 14, bleed: 0.04, randomRotation: rot, tags: ['farm', 'village'], draw: (g, o) => hay(g, o.w, o.h, o.seed, form) });

// ------------------------------------------------------------------ bygninger i det små

function roofRect(g: G, r: Rnd, x: number, y: number, w: number, h: number, col: RGB, rowH: number): void {
  const p = rectPath(g, x, y, w, h, 1.5);
  body(g, p, col, [x, y, x + w, y + h], { lw: 1.8, ao: 2.4 });
  clipped(g, p, () => {
    for (let yy = y, j = 0; yy < y + h; yy += rowH, j++) {
      for (let xx = x - (j % 2) * rowH * 0.5; xx < x + w; xx += rowH) {
        g.fillStyle = rgb(shift(col, (r() - 0.5) * 24));
        g.fillRect(xx + 0.5, yy + 0.5, rowH - 1, rowH - 1);
      }
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.fillRect(x, yy + rowH - 1.4, w, 1.4);
    }
    // lysere øverst til venstre
    g.fillStyle = lin(g, x, y, x + w, y + h, [[0, 'rgba(255,240,200,.18)'], [0.5, 'rgba(255,240,200,0)'], [1, 'rgba(0,0,0,.2)']]);
    g.fillRect(x, y, w, h);
  });
}

/** Tag set oppefra med rygning: to flader i to nuancer. */
function gablePlan(g: G, r: Rnd, x: number, y: number, w: number, h: number, col: RGB, row: number): void {
  const hh = h / 2;
  roofRect(g, r, x, y, w, hh, shift(col, 14), row);
  roofRect(g, r, x, y + hh, w, hh, shift(col, -18), row);
  rectBody(g, x - 1, y + hh - 2.4, w + 2, 4.8, 1.5, shift(col, 26), { lw: 1.4, ao: 0.8 });
}

function coop(g: G, w: number, h: number, seed: number): void {
  const r = rng(seed);
  // hønsehus (tag set oppefra) med hønsegård og høns
  const bw = w * 0.5;
  const bh = h * 0.56;
  const bx = -w / 2 + 4;
  const by = -h / 2 + 4;
  gablePlan(g, r, bx, by, bw, bh, [140, 96, 62], 8);
  // luge/stige
  rectBody(g, bx + bw - 2, by + bh * 0.2, w * 0.14, bh * 0.2, 1, [150, 112, 70], { lw: 1.1, ao: 0.8 });
  // hønsegård
  const fx = bx + bw + 4;
  const p = rectPath(g, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 3);
  g.save();
  g.setLineDash([5, 3]);
  g.strokeStyle = 'rgba(110,80,50,.9)';
  g.lineWidth = 2.4;
  p();
  g.stroke();
  g.restore();
  void fx;
  for (let i = 0; i < 5; i++) {
    const x = (r() * 0.5 + 0.2) * w * 0.5 + (r() < 0.6 ? w * 0.05 : -w * 0.4);
    const y = h * (0.1 + r() * 0.32);
    // høne set oppefra
    g.save();
    g.translate(x, y);
    g.rotate(r() * 6.283);
    const col: RGB = r() < 0.5 ? [230, 214, 190] : [150, 84, 46];
    dome(g, 0, 0, 4.2, 3, col, { lw: 0.8 });
    dome(g, 4.3, 0, 1.8, 1.6, shift(col, 8), { lw: 0.6 });
    g.fillStyle = 'rgb(210,60,40)';
    g.fillRect(5.2, -0.6, 1, 1.2);
    g.restore();
  }
}

function pigsty(g: G, w: number, h: number, seed: number): void {
  const r = rng(seed);
  const p = rectPath(g, -w / 2, -h / 2, w, h, 4);
  body(g, p, [96, 72, 44], [-w / 2, -h / 2, w / 2, h / 2], { lw: 1.4, ao: 3 });
  clipped(g, p, () => {
    mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], [80, 58, 34], 60, w * 0.04, 22, 0.45);
    // mudderpytter
    for (let i = 0; i < 3; i++) {
      const x = (r() - 0.5) * w * 0.5;
      const y = (r() - 0.2) * h * 0.4;
      g.fillStyle = 'rgba(40,28,16,.6)';
      g.beginPath();
      g.ellipse(x, y, w * 0.12, h * 0.08, r() * 3, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(120,96,70,.4)';
      g.beginPath();
      g.ellipse(x - 1, y - 1, w * 0.08, h * 0.05, r() * 3, 0, 7);
      g.fill();
    }
  });
  // trug
  rectBody(g, -w * 0.4, -h * 0.4, w * 0.3, h * 0.1, 2, [124, 92, 56], { lw: 1.2, ao: 1 });
  // grise
  for (let i = 0; i < 3; i++) {
    g.save();
    g.translate(-w * 0.1 + i * w * 0.22, h * 0.1 + (r() - 0.5) * h * 0.2);
    g.rotate(r() * 6.283);
    const col: RGB = [236, 168, 156];
    dome(g, 0, 0, w * 0.07, w * 0.045, col, { lw: 0.9 });
    dome(g, w * 0.08, 0, w * 0.03, w * 0.027, shift(col, 6), { lw: 0.8 });
    g.fillStyle = 'rgba(120,50,50,.9)';
    g.fillRect(-w * 0.075, -0.6, 2, 1.2);
    g.restore();
  }
  // lille halvtag i hjørnet
  gablePlan(g, r, w * 0.12, -h / 2 + 3, w * 0.36, h * 0.32, [124, 90, 56], 8);
  // hegn om hele
  g.strokeStyle = 'rgba(80,54,30,.95)';
  g.lineWidth = 3;
  p();
  g.stroke();
  g.strokeStyle = 'rgba(190,150,100,.6)';
  g.lineWidth = 1;
  p();
  g.stroke();
}

function greenhouse(g: G, w: number, h: number, seed: number, broken: boolean): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const frame: RGB = [236, 232, 216];
  rectBody(g, x0, y0, w, h, 2, [82, 100, 62], { lw: 1.6, ao: 2 });
  // planter bag glasset: bede
  for (let i = 0; i < 3; i++) {
    const bx = x0 + w * (0.06 + i * 0.32);
    rectBody(g, bx, y0 + h * 0.12, w * 0.26, h * 0.76, 2, [104, 76, 50], { lw: 1, ao: 1.4 });
    for (let k = 0; k < 8; k++) {
      const px = bx + w * 0.13 + (r() - 0.5) * w * 0.18;
      const py = y0 + h * (0.2 + (k / 8) * 0.64);
      const a0 = r() * 6;
      for (let j = 0; j < 4; j++) leaf(g, px, py, a0 + j * 1.57, h * 0.09, h * 0.04, shift([90, 150, 60], (r() - 0.5) * 30), false);
      if (r() < 0.5) dome(g, px, py, 1.6, 1.6, [220, 60, 50], { lw: 0.4 });
    }
  }
  // glasflader: lys blågrøn gennemsigtighed med reflekser og sprosser
  const cols = Math.max(4, Math.round(w / 36));
  const rowsN = 2;
  const gw = w / cols;
  const gh = h / rowsN;
  for (let c = 0; c < cols; c++) {
    for (let j = 0; j < rowsN; j++) {
      const lit = j === 0 ? 0.3 : 0.18;
      const gx = x0 + c * gw;
      const gy = y0 + j * gh;
      g.fillStyle = lin(g, gx, gy, gx + gw, gy + gh, [[0, `rgba(210,240,244,${lit + 0.2})`], [1, `rgba(120,180,190,${lit})`]]);
      g.fillRect(gx, gy, gw, gh);
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.beginPath();
      g.moveTo(gx + gw * 0.12, gy + 2);
      g.lineTo(gx + gw * 0.4, gy + 2);
      g.lineTo(gx + 2, gy + gh * 0.4);
      g.lineTo(gx + 2, gy + gh * 0.18);
      g.fill();
      if (broken && r() < 0.28) {
        g.fillStyle = 'rgba(30,40,30,.78)';
        g.beginPath();
        g.moveTo(gx + gw * 0.2, gy + gh * 0.2);
        g.lineTo(gx + gw * 0.9, gy + gh * 0.3);
        g.lineTo(gx + gw * 0.7, gy + gh * 0.9);
        g.lineTo(gx + gw * 0.3, gy + gh * 0.7);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,.8)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(gx + gw * 0.5, gy + gh * 0.5);
        g.lineTo(gx + gw * 0.95, gy + gh * 0.1);
        g.moveTo(gx + gw * 0.5, gy + gh * 0.5);
        g.lineTo(gx + gw * 0.1, gy + gh * 0.95);
        g.stroke();
      }
    }
  }
  g.strokeStyle = rgb(frame);
  g.lineWidth = 2.2;
  for (let c = 0; c <= cols; c++) { g.beginPath(); g.moveTo(x0 + c * gw, y0); g.lineTo(x0 + c * gw, y0 + h); g.stroke(); }
  g.beginPath(); g.moveTo(x0, y0 + gh); g.lineTo(x0 + w, y0 + gh); g.stroke();
  // rygning
  g.strokeStyle = 'rgba(90,86,74,.85)';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(x0, y0 + gh); g.lineTo(x0 + w, y0 + gh); g.stroke();
  g.strokeStyle = 'rgba(30,24,16,.8)';
  g.lineWidth = 1.6;
  g.strokeRect(x0, y0, w, h);
}

function hives(g: G, w: number, h: number, seed: number, form: 'skep' | 'box' | 'row'): void {
  const r = rng(seed);
  if (form === 'skep') {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const x = (i - 1) * w * 0.3;
      const y = (r() - 0.5) * h * 0.2 + (i === 1 ? -h * 0.1 : h * 0.06);
      const rad = w * 0.13;
      dome(g, x, y, rad, rad, [214, 180, 84], { lw: 1.4, hi: 40 });
      for (let k = 1; k < 5; k++) {
        g.strokeStyle = 'rgba(100,70,20,.55)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y, rad * (k / 5), 0, 7);
        g.stroke();
      }
      // bier flyver omkring
      for (let b = 0; b < 4; b++) {
        const a = r() * 6.283;
        const d = rad * (1.2 + r() * 0.6);
        dome(g, x + Math.cos(a) * d, y + Math.sin(a) * d, 1.3, 0.9, [240, 200, 40], { lw: 0.4 });
      }
    }
    return;
  }
  const n = form === 'row' ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const bw = form === 'row' ? w * 0.27 : w * 0.6;
    const bh = form === 'row' ? h * 0.7 : h * 0.7;
    const bx = form === 'row' ? -w / 2 + i * w * 0.34 + w * 0.03 : -bw / 2;
    const by = -bh / 2;
    const col: RGB = form === 'row' ? [[226, 214, 180], [112, 160, 190], [210, 130, 100]][i] as RGB : [226, 214, 180];
    // stand med to ben og kasse med tag set oppefra
    rectBody(g, bx - 3, by + bh * 0.2, bw + 6, bh * 0.14, 1, [110, 80, 50], { lw: 1, ao: 0.8 });
    rectBody(g, bx - 3, by + bh * 0.68, bw + 6, bh * 0.14, 1, [110, 80, 50], { lw: 1, ao: 0.8 });
    gablePlan(g, r, bx, by, bw, bh, col, 6);
    // indflyvningsbræt forneden
    rectBody(g, bx + bw * 0.2, by + bh - 1, bw * 0.6, bh * 0.14, 1, [140, 104, 64], { lw: 1, ao: 0.6 });
    for (let k = 0; k < 3; k++) dome(g, bx + bw * (0.3 + 0.2 * k), by + bh + bh * 0.15, 1.2, 0.9, [240, 200, 40], { lw: 0.3 });
  }
}

function herbGarden(g: G, w: number, h: number, seed: number): void {
  const r = rng(seed);
  const x0 = -w / 2;
  const y0 = -h / 2;
  // ramme af brædder med fire bede
  rectBody(g, x0, y0, w, h, 2, [128, 96, 60], { lw: 1.6, ao: 2 });
  const herbs: { c: RGB; kind: number }[] = [{ c: [88, 140, 70], kind: 0 }, { c: [110, 120, 150], kind: 1 }, { c: [70, 120, 60], kind: 2 }, { c: [130, 150, 70], kind: 3 }];
  const m = 4;
  const bw = (w - m * 3) / 2;
  const bh = (h - m * 3) / 2;
  for (let i = 0; i < 4; i++) {
    const bx = x0 + m + (i % 2) * (bw + m);
    const by = y0 + m + Math.floor(i / 2) * (bh + m);
    const p = rectPath(g, bx, by, bw, bh, 2);
    body(g, p, [100, 72, 46], [bx, by, bx + bw, by + bh], { lw: 1, ao: 1.6 });
    const hb = herbs[i]!;
    clipped(g, p, () => {
      for (let k = 0; k < 16; k++) {
        const x = bx + 4 + r() * (bw - 8);
        const y = by + 4 + r() * (bh - 8);
        if (hb.kind === 0) for (let j = 0; j < 3; j++) leaf(g, x, y, r() * 6.283, 8, 3.2, shift(hb.c, (r() - 0.5) * 30), true);
        else if (hb.kind === 1) { for (let j = 0; j < 5; j++) leaf(g, x, y, r() * 6.283, 7, 1.4, shift(hb.c, (r() - 0.5) * 30), false); if (r() < 0.5) dome(g, x, y, 1.4, 1.4, [190, 130, 220], { lw: 0 }); }
        else if (hb.kind === 2) dome(g, x, y, 4 + r() * 2, 3.5 + r() * 2, shift(hb.c, (r() - 0.5) * 30), { lw: 0.7 });
        else { for (let j = 0; j < 6; j++) leaf(g, x, y, (j / 6) * 6.283, 5, 1.2, shift(hb.c, (r() - 0.5) * 30), false); dome(g, x, y, 1, 1, [240, 230, 120], { lw: 0 }); }
      }
    });
  }
}

function berryBush(g: G, w: number, h: number, seed: number, berry: RGB, leafCol: RGB): void {
  const r = rng(seed);
  const R = Math.min(w, h) / 2;
  const lobes = 7;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * 6.283 + r() * 0.5;
    const d = R * 0.42;
    dome(g, Math.cos(a) * d, Math.sin(a) * d, R * (0.5 + r() * 0.12), R * (0.5 + r() * 0.12), shift(leafCol, (r() - 0.5) * 22 - 8), { lw: 1.2 });
  }
  dome(g, -R * 0.06, -R * 0.06, R * 0.58, R * 0.58, shift(leafCol, 6), { lw: 0, hi: 32 });
  for (let i = 0; i < 40; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * R * 0.88;
    leaf(g, Math.cos(a) * d, Math.sin(a) * d, r() * 6.283, R * 0.22, R * 0.07, shift(leafCol, (r() - 0.5) * 40 + 10), false);
  }
  for (let i = 0; i < 30; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * R * 0.82;
    dome(g, Math.cos(a) * d, Math.sin(a) * d, R * 0.06, R * 0.06, shift(berry, (r() - 0.5) * 30), { lw: 0.5, hi: 50 });
  }
}

function signpost(g: G, w: number, h: number, seed: number, arms: number): void {
  const r = rng(seed);
  const post = 6;
  const wood: RGB = [136, 100, 62];
  const list: number[] = [];
  const base = r() * 6.283;
  for (let i = 0; i < arms; i++) list.push(base + (i / arms) * 6.283 + (r() - 0.5) * 0.6 + (arms === 2 ? 1.5 : 0));
  const L = Math.min(w, h) * 0.46;
  for (const a of list) {
    g.save();
    g.rotate(a);
    const ln = L * (0.8 + r() * 0.2);
    const p = polyPath(g, [[post * 0.5, -5], [ln - 6, -5], [ln + 2, 0], [ln - 6, 5], [post * 0.5, 5]]);
    g.fillStyle = 'rgba(8,4,0,.3)';
    g.save(); g.translate(2, 2.5); p(); g.fill(); g.restore();
    body(g, p, shift(wood, (r() - 0.5) * 24), [0, -5, ln, 5], { lw: 1.3, ao: 1.2 });
    clipped(g, p, () => woodGrain(g, r, [0, -5, ln, 5], wood, { lines: 3, contrast: 0.7 }));
    g.fillStyle = 'rgba(30,20,10,.55)';
    for (let k = 0; k < 4; k++) g.fillRect(ln * (0.22 + k * 0.14), -1.2, ln * 0.09, 2.4);
    rivet(g, ln * 0.12, 0, 1.2, [110, 106, 100]);
    g.restore();
  }
  dome(g, 0, 0, post, post, [112, 80, 48], { lw: 1.4 });
  g.strokeStyle = 'rgba(40,24,10,.5)';
  g.lineWidth = 0.8;
  g.beginPath(); g.arc(0, 0, post * 0.6, 0, 7); g.stroke();
}

function markstone(g: G, w: number, h: number, seed: number, form: 'boundary' | 'milestone' | 'cairn'): void {
  const r = rng(seed);
  const R = Math.min(w, h) / 2;
  if (form === 'cairn') {
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * R * 0.7;
      pebble(g, r, Math.cos(a) * d, Math.sin(a) * d, R * (0.2 + r() * 0.15), shift([138, 130, 116], (r() - 0.5) * 30));
    }
    pebble(g, r, 0, 0, R * 0.3, [150, 142, 128]);
    return;
  }
  const p = polyPath(g, [[-R * 0.55, -R * 0.7], [R * 0.5, -R * 0.74], [R * 0.6, R * 0.1], [R * 0.4, R * 0.74], [-R * 0.5, R * 0.7], [-R * 0.62, R * 0.1]]);
  body(g, p, [140, 134, 120], [-R, -R, R, R], { lw: 1.8, ao: 2.4 });
  clipped(g, p, () => {
    mottle(g, r, [-R, -R, R, R], [140, 134, 120], 24, R * 0.2, 24, 0.5);
    for (let i = 0; i < 3; i++) mossPatch(g, r, (r() - 0.5) * R, R * (0.3 + r() * 0.4), R * 0.3, 8);
    g.strokeStyle = 'rgba(40,30,20,.55)';
    g.lineWidth = 1.3;
    if (form === 'milestone') {
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-R * 0.3 + k * R * 0.2, -R * 0.4); g.lineTo(-R * 0.3 + k * R * 0.2, R * 0.0); g.stroke(); }
    } else {
      g.beginPath(); g.moveTo(-R * 0.3, -R * 0.3); g.lineTo(R * 0.3, R * 0.3); g.moveTo(R * 0.3, -R * 0.3); g.lineTo(-R * 0.3, R * 0.3); g.stroke();
    }
  });
}

export const farmKinds: ObjectKind[] = [
  fieldKind('farmx_field_wheat', 'Hvedemark', 5, 3.6, 'wheat', 0.8, ['farm', 'village', 'grassland']),
  fieldKind('farmx_field_wheat_young', 'Hvedemark, ung', 4, 3, 'wheat', 0.1, ['farm', 'village', 'grassland']),
  fieldKind('farmx_field_corn', 'Majsmark', 4, 3.6, 'corn', 0.6, ['farm', 'village']),
  fieldKind('farmx_field_cabbage', 'Kålmark', 3.6, 3, 'cabbage', 0.8, ['farm', 'village']),
  fieldKind('farmx_field_vine', 'Vinmark', 5, 3.6, 'vine', 0.7, ['farm', 'rich', 'village']),
  fieldKind('farmx_field_flax', 'Hørmark', 4, 3, 'flax', 0.5, ['farm', 'village']),
  fieldKind('farmx_field_carrot', 'Gulerodsbede', 2.6, 2, 'carrot', 0.8, ['farm', 'village', 'house']),
  fenceKind('farmx_fence_picket', 'Stakit', 3, 'picket', ['farm', 'village', 'house']),
  fenceKind('farmx_fence_rail', 'Hegn med liggere', 3, 'rail', ['farm', 'village', 'grassland']),
  fenceKind('farmx_fence_stone', 'Stendige', 3, 'stone', ['farm', 'grassland', 'village', 'ruin']),
  fenceKind('farmx_fence_wicker', 'Flettet gærde', 3, 'wicker', ['farm', 'village', 'poor']),
  fenceKind('farmx_fence_hurdle', 'Kvasgærde', 3, 'hurdle', ['farm', 'village', 'poor', 'camp']),
  fenceKind('farmx_fence_iron', 'Jernhegn', 3, 'iron', ['city', 'rich', 'graveyard', 'house']),
  hayKind('farmx_hay_bale', 'Rundballe', 1.6, 1.6, 'bale', true),
  hayKind('farmx_hay_bales', 'Halmballer', 2.4, 2.4, 'bales', true),
  hayKind('farmx_hay_stack', 'Høstak', 2.6, 2.6, 'stack', true),
  hayKind('farmx_hay_loose', 'Løst hø', 2.4, 2, 'loose', true),
  kind({ key: 'farmx_coop', family: FAM, name: 'Hønsehus med gård', w: 3, h: 2.4, shadow: 10, bleed: 0.03, tags: ['farm', 'village'], draw: (g, o) => coop(g, o.w, o.h, o.seed) }),
  kind({ key: 'farmx_pigsty', family: FAM, name: 'Svinesti', w: 3.4, h: 2.6, shadow: 6, bleed: 0.03, tags: ['farm', 'village', 'poor'], draw: (g, o) => pigsty(g, o.w, o.h, o.seed) }),
  kind({ key: 'farmx_greenhouse', family: FAM, name: 'Drivhus', w: 4, h: 2.4, shadow: 12, bleed: 0.02, tags: ['farm', 'rich', 'city', 'house'], params: [{ key: 'broken', label: 'Knuste ruder', type: 'toggle', default: false }], draw: (g, o) => greenhouse(g, o.w, o.h, o.seed, param(o, 'broken', false)) }),
  kind({ key: 'farmx_hives_skep', family: FAM, name: 'Bistader af strå', w: 2, h: 1.4, shadow: 10, bleed: 0.06, randomRotation: true, tags: ['farm', 'village', 'forest'], draw: (g, o) => hives(g, o.w, o.h, o.seed, 'skep') }),
  kind({ key: 'farmx_hive_box', family: FAM, name: 'Bistade, kasse', w: 1.2, h: 1.2, shadow: 10, bleed: 0.06, randomRotation: true, tags: ['farm', 'village', 'forest'], draw: (g, o) => hives(g, o.w, o.h, o.seed, 'box') }),
  kind({ key: 'farmx_hives_row', family: FAM, name: 'Række af bistader', w: 3, h: 1.2, shadow: 10, bleed: 0.06, tags: ['farm', 'village'], draw: (g, o) => hives(g, o.w, o.h, o.seed, 'row') }),
  kind({ key: 'farmx_herb_garden', family: FAM, name: 'Urtehave', w: 3, h: 2.4, shadow: 4, bleed: 0.03, tags: ['farm', 'village', 'house'], draw: (g, o) => herbGarden(g, o.w, o.h, o.seed) }),
  kind({ key: 'farmx_bush_red', family: FAM, name: 'Jordbær- og ribsbusk', w: 1.6, h: 1.6, shadow: 14, bleed: 0.05, randomRotation: true, sizeJitter: 0.2, tags: ['forest', 'farm', 'grassland'], draw: (g, o) => berryBush(g, o.w, o.h, o.seed, [200, 36, 48], [66, 118, 54]) }),
  kind({ key: 'farmx_bush_blue', family: FAM, name: 'Blåbærbusk', w: 1.6, h: 1.6, shadow: 14, bleed: 0.05, randomRotation: true, sizeJitter: 0.2, tags: ['forest', 'farm', 'grassland'], draw: (g, o) => berryBush(g, o.w, o.h, o.seed, [60, 70, 150], [76, 120, 66]) }),
  kind({ key: 'farmx_bush_black', family: FAM, name: 'Brombærkrat', w: 2.2, h: 2.2, shadow: 14, bleed: 0.05, randomRotation: true, sizeJitter: 0.2, tags: ['forest', 'grassland', 'ruin'], draw: (g, o) => berryBush(g, o.w, o.h, o.seed, [40, 24, 44], [58, 98, 48]) }),
  kind({ key: 'farmx_signpost_2', family: FAM, name: 'Vejviser, to retninger', w: 1.4, h: 1.4, shadow: 10, bleed: 0.06, randomRotation: true, tags: ['village', 'grassland', 'forest'], draw: (g, o) => signpost(g, o.w, o.h, o.seed, 2) }),
  kind({ key: 'farmx_signpost_4', family: FAM, name: 'Vejkryds-skilt, fire retninger', w: 1.6, h: 1.6, shadow: 10, bleed: 0.06, randomRotation: true, tags: ['village', 'grassland', 'forest', 'city'], draw: (g, o) => signpost(g, o.w, o.h, o.seed, 4) }),
  kind({ key: 'farmx_boundary_stone', family: FAM, name: 'Markskel', w: 0.9, h: 0.9, shadow: 8, bleed: 0.05, randomRotation: true, sizeJitter: 0.2, tags: ['farm', 'grassland', 'village'], draw: (g, o) => markstone(g, o.w, o.h, o.seed, 'boundary') }),
  kind({ key: 'farmx_milestone', family: FAM, name: 'Mile- og vejsten', w: 0.9, h: 0.9, shadow: 8, bleed: 0.05, randomRotation: true, tags: ['village', 'grassland', 'city'], draw: (g, o) => markstone(g, o.w, o.h, o.seed, 'milestone') }),
  kind({ key: 'farmx_cairn', family: FAM, name: 'Stenvarde', w: 1.2, h: 1.2, shadow: 10, bleed: 0.05, randomRotation: true, sizeJitter: 0.2, tags: ['mountain', 'grassland', 'camp'], draw: (g, o) => markstone(g, o.w, o.h, o.seed, 'cairn') }),
];
void radial; void limb; void polyBody; void ellipsePath;
