import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { blobBody, blobPath, body, clipped, ellBody, ellipsePath, lin, mottle, polyBody, radial, rectBody, rectPath, rgb, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { woodRect, vary } from '../pack3/common';
import { board, book, bowl, candle, dome, foldCloth, glow, bottle, steam, WOOD, WOOD_DARK, BRASS, CLAY } from './props';
import { pick } from './kit';

/** Soveværelse: himmelseng, klædeskab, kommode, vaskestand, natbord, vugge, skærm og tæpper. */

const FABRIC: RGB[] = [[132, 36, 44], [44, 64, 120], [60, 100, 64], [120, 80, 140], [160, 120, 50], [60, 56, 70]];

/** Himmelsengens baldakin set oppefra: stof med fold, kantsnor og kvaster. */
function canopyBed(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const col = vary(r, pick(r, FABRIC), 10);
  const trim = BRASS;
  // fire stolper
  const px = W * 0.46;
  const py = H * 0.47;
  // sengen under baldakinen: madras, hovedpuder og dyne
  const sheet: RGB = pick(r, [[236, 230, 214], [220, 214, 196]] as RGB[]);
  rectBody(g, -W * 0.44, -H * 0.44, W * 0.88, H * 0.88, 4, [110, 74, 44], { lw: 1.4, ao: 3 });
  rectBody(g, -W * 0.4, -H * 0.4, W * 0.8, H * 0.8, 5, sheet, { lw: 1, ao: 3 });
  const pillows = o.w > 2.4 * 50 ? 2 : 1;
  for (let i = 0; i < pillows; i++) {
    const px2 = pillows === 1 ? 0 : (i ? 1 : -1) * W * 0.2;
    rectBody(g, px2 - W * 0.16, -H * 0.38, W * 0.32, H * 0.14, 5, [248, 244, 232], { lw: 1, ao: 2, rim: 1 });
  }
  foldCloth(g, r, -W * 0.4, -H * 0.1, W * 0.8, H * 0.5, col, 4);
  // baldakin: gennemsigtigt stof over sengen
  const p = rectPath(g, -W * 0.5, -H * 0.5, W, H, 5);
  g.save();
  g.globalAlpha = 0.55;
  body(g, p, col, [-W / 2, -H / 2, W / 2, H / 2], { lw: 0.01, ao: 5, outline: null });
  clipped(g, p, () => {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      g.beginPath();
      g.moveTo(-W / 2 + t * W, -H / 2);
      g.quadraticCurveTo(-W / 2 + t * W + (r() - 0.5) * 6, 0, -W / 2 + t * W, H / 2);
      g.strokeStyle = rgb(shift(col, -34), 0.4);
      g.lineWidth = 2;
      g.stroke();
    }
    g.fillStyle = radial(g, -W * 0.2, -H * 0.25, W * 0.7, [[0, 'rgba(255,240,210,.3)'], [1, 'rgba(255,240,210,0)']]);
    g.fillRect(-W / 2, -H / 2, W, H);
  });
  g.restore();
  // kantsnor og midterbjælker
  g.save();
  p();
  g.clip();
  g.strokeStyle = rgb(trim);
  g.lineWidth = 3;
  g.strokeRect(-W / 2 + 1.5, -H / 2 + 1.5, W - 3, H - 3);
  g.lineWidth = 1.6;
  g.strokeStyle = rgb(shift(trim, -30), 0.9);
  g.beginPath();
  g.moveTo(-W / 2, -H / 2);
  g.lineTo(W / 2, H / 2);
  g.moveTo(W / 2, -H / 2);
  g.lineTo(-W / 2, H / 2);
  g.stroke();
  g.restore();
  // frynser langs kanten
  g.strokeStyle = rgb(trim);
  g.lineWidth = 1;
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    g.beginPath();
    g.moveTo(-W / 2 + t * W, H / 2);
    g.lineTo(-W / 2 + t * W, H / 2 + 3.4);
    g.stroke();
  }
  p();
  g.strokeStyle = 'rgba(22,12,6,.8)';
  g.lineWidth = 1.8;
  g.stroke();
  // stolpeknopper og kvaster
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      dome(g, sx * px, sy * py, 4.4, 4.4, trim, 1);
      g.strokeStyle = rgb(trim);
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(sx * px, sy * py);
      g.lineTo(sx * px, sy * py + sy * 6);
      g.stroke();
    }
  }
  // udsnit af hovedgærdet antydet foroven
  rectBody(g, -W * 0.3, -H * 0.5 - 2, W * 0.6, 4, 1.5, WOOD_DARK, { lw: 1.1, ao: 0.4 });
}

function wardrobe(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [120, 82, 50], { vertical: false, count: 4, rad: 2 });
  // gesims
  g.strokeStyle = 'rgba(30,14,4,.55)';
  g.lineWidth = 2;
  g.strokeRect(-W / 2 + 3, -H / 2 + 3, W - 6, H - 6);
  g.strokeStyle = 'rgba(255,230,180,.3)';
  g.lineWidth = 1;
  g.strokeRect(-W / 2 + 5.5, -H / 2 + 5.5, W - 11, H - 11);
  // pynt på toppen
  if (param(o, 'items', true)) {
    ellBody(g, -W * 0.3, 0, 5, 5, CLAY, { lw: 1, ao: 1, rim: 0.5 });
    ellBody(g, -W * 0.3, 0, 2.6, 2.6, [30, 18, 10], { lw: 0.6, ao: 0 });
    book(g, r, W * 0.12, 0, W * 0.2, H * 0.4, 0.2, pick(r, FABRIC));
    candle(g, W * 0.34, 0, 3.4, false);
  }
}

function dresser(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [138, 96, 58], { vertical: false, count: 4, rad: 3 });
  // løber
  rectBody(g, -W * 0.42, -H * 0.18, W * 0.84, H * 0.36, 1, [236, 228, 208], { lw: 0.9, ao: 1.2 });
  g.fillStyle = 'rgba(150,50,50,.5)';
  g.fillRect(-W * 0.42, -H * 0.18, W * 0.84, 2);
  g.fillRect(-W * 0.42, H * 0.18 - 2, W * 0.84, 2);
  // spejl (lagt fladt), kam, kande, lys
  g.save();
  g.translate(-W * 0.25, 0);
  ellBody(g, 0, 0, H * 0.32, H * 0.24, BRASS, { lw: 1, ao: 1, rim: 0.7 });
  g.beginPath();
  g.ellipse(0, 0, H * 0.26, H * 0.18, 0, 0, 7);
  g.fillStyle = lin(g, -H * 0.2, -H * 0.2, H * 0.2, H * 0.2, [[0, 'rgb(220,232,240)'], [0.5, 'rgb(150,180,200)'], [1, 'rgb(190,210,226)']]);
  g.fill();
  g.restore();
  ellBody(g, W * 0.12, 0, 5, 5, [120, 150, 190], { lw: 1, ao: 1, rim: 0.5 });
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.24, -H * 0.1);
    g.lineTo(W * 0.24, H * 0.12);
  }, 2.6, [210, 190, 140], { outline: 1 });
  candle(g, W * 0.36, 0, 3.6, param(o, 'lit', false));
  // håndtag-rækker
  g.fillStyle = rgb(BRASS);
  for (const x of [-0.3, 0, 0.3]) {
    g.beginPath();
    g.arc(x * W, H * 0.4, 1.5, 0, 7);
    g.fill();
  }
}

function washStand(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  // rundt bord med fad, kande og håndklæde
  ellBody(g, 0, 0, S * 0.46, S * 0.46, [126, 88, 54], { lw: 1.7, ao: 3 });
  clipped(g, ellipsePath(g, 0, 0, S * 0.46, S * 0.46), () => {
    g.strokeStyle = 'rgba(30,14,4,.3)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(-S / 2, -S * 0.4 + i * S * 0.1);
      g.lineTo(S / 2, -S * 0.4 + i * S * 0.1 + (r() - 0.5) * 2);
      g.stroke();
    }
  });
  ellBody(g, -S * 0.06, S * 0.06, S * 0.3, S * 0.3, [220, 224, 228], { lw: 1.2, ao: S * 0.04, rim: 1 });
  g.beginPath();
  g.arc(-S * 0.06, S * 0.06, S * 0.23, 0, 7);
  g.fillStyle = radial(g, -S * 0.06, S * 0.06, S * 0.23, [[0, 'rgba(176,206,226,.95)'], [1, 'rgba(100,140,172,.95)']], -S * 0.13, -S * 0.02, 1);
  g.fill();
  g.strokeStyle = 'rgba(60,90,160,.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(-S * 0.06, S * 0.06, S * 0.28, 0.4, 5.4);
  g.stroke();
  ellBody(g, S * 0.24, -S * 0.2, S * 0.1, S * 0.1, [214, 220, 226], { lw: 1, ao: 1, rim: 0.7 });
  ellBody(g, S * 0.24, -S * 0.2, S * 0.065, S * 0.065, [44, 46, 56], { lw: 0.6, ao: 0 });
  tube(g, () => {
    g.beginPath();
    g.arc(S * 0.34, -S * 0.2, S * 0.07, -1.2, 1.2);
  }, 2, [200, 206, 214], { outline: 1 });
  foldCloth(g, r, -S * 0.36, -S * 0.3, S * 0.2, S * 0.1, [236, 232, 220], 2);
  ellBody(g, S * 0.28, S * 0.22, 3.6, 2.6, [236, 210, 150], { lw: 0.8, ao: 0.4 });
}

function nightstand(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  woodRect(g, r, -S / 2, -S / 2, S, S, [128, 88, 52], { vertical: false, count: 4, rad: 3 });
  g.beginPath();
  g.arc(0, 0, S * 0.42, 0, 7);
  g.strokeStyle = 'rgba(30,14,4,.3)';
  g.lineWidth = 1;
  g.stroke();
  candle(g, S * 0.1, -S * 0.1, S * 0.12, param(o, 'lit', true), [236, 226, 196]);
  g.fillStyle = 'rgba(0,0,0,.2)';
  book(g, r, -S * 0.16, S * 0.14, S * 0.34, S * 0.22, -0.3, pick(r, FABRIC));
  // lys-skær
  glow(g, S * 0.1, -S * 0.1, S * 0.5, [255, 190, 100], 0.18);
}

function cradle(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // kurver (vugge-medier) i enderne
  for (const s of [-1, 1]) rectBody(g, s * W * 0.46 - 3, -H * 0.52, 6, H * 1.04, 3, [96, 62, 36], { lw: 1.3, ao: 1 });
  const p = rectPath(g, -W * 0.44, -H * 0.46, W * 0.88, H * 0.92, W * 0.22);
  body(g, p, [150, 108, 66], [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.8, ao: 4 });
  clipped(g, p, () => {
    g.strokeStyle = 'rgba(40,20,8,.3)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) {
      const y = -H * 0.46 + (i + 0.5) * (H * 0.92 / 12);
      g.beginPath();
      g.moveTo(-W / 2, y);
      g.lineTo(W / 2, y);
      g.stroke();
    }
  });
  // indre: pude og tæppe
  const ip = rectPath(g, -W * 0.34, -H * 0.38, W * 0.68, H * 0.76, W * 0.16);
  body(g, ip, [236, 230, 214], [-W / 2, -H / 2, W / 2, H / 2], { lw: 1, ao: 3 });
  foldCloth(g, r, -W * 0.3, -H * 0.02, W * 0.6, H * 0.36, pick(r, [[150, 170, 210], [220, 160, 170], [170, 200, 160]] as RGB[]), 3);
  if (param(o, 'baby', true)) {
    ellBody(g, 0, -H * 0.2, W * 0.15, W * 0.15, [236, 196, 160], { lw: 1, ao: 1.5 });
    g.fillStyle = 'rgba(40,24,16,.8)';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(s * W * 0.05, -H * 0.2, 0.8, 0, 7);
      g.fill();
    }
  }
}

function screen(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const n = Math.max(3, Math.round(param(o, 'panels', 4)));
  const pw = W / n;
  const col = vary(r, pick(r, FABRIC), 10);
  // knækket zig-zag: hver fløj er et lille skråt panel set oppefra
  for (let i = 0; i < n; i++) {
    const y0 = (i % 2 ? 1 : -1) * H * 0.35;
    const y1 = (i % 2 ? -1 : 1) * H * 0.35;
    const x0 = -W / 2 + i * pw;
    const x1 = x0 + pw;
    const t = 2.6;
    polyBody(g, [[x0, y0 - t], [x1, y1 - t], [x1, y1 + t], [x0, y0 + t]], shift(col, i % 2 ? -8 : 6), { lw: 1.3, ao: 0.8, rim: 0.6 });
    // ramme
    g.strokeStyle = rgb(WOOD_DARK, 0.9);
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x0, y0 - t);
    g.lineTo(x1, y1 - t);
    g.stroke();
  }
  for (let i = 0; i <= n; i++) {
    const y = (i % 2 ? -1 : 1) * H * 0.35 * (i === 0 ? -1 : 1) * (i % 2 ? 1 : 1);
    void y;
    const yy = (i % 2 ? 1 : -1) * H * 0.35;
    dome(g, -W / 2 + i * pw, yy, 2.6, 2.6, [96, 62, 36], 0.9);
  }
}

function blanketPile(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const n = Math.round(param(o, 'count', 3));
  for (let i = 0; i < n; i++) {
    g.save();
    g.translate((r() - 0.5) * W * 0.12, -H * 0.3 + i * (H * 0.6 / Math.max(1, n - 1)) * (n > 1 ? 1 : 0));
    g.rotate((r() - 0.5) * 0.12);
    foldCloth(g, r, -W * 0.44, -H * 0.18, W * 0.88, H * 0.36, vary(r, pick(r, FABRIC), 10), 3 + i);
    // stribede kanter
    g.fillStyle = 'rgba(240,220,170,.55)';
    g.fillRect(-W * 0.44, -H * 0.12, W * 0.88, 1.6);
    g.fillRect(-W * 0.44, H * 0.1, W * 0.88, 1.6);
    g.restore();
  }
}

function fur(g: G, o: DrawInput): void {
  // skindtæppe lagt på gulvet (uden skyggekast)
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const base: RGB = pick(r, [[120, 90, 62], [150, 140, 128], [88, 70, 56], [200, 192, 176]] as RGB[]);
  const pts: [number, number][] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    let k = 0.88 + r() * 0.1;
    // ben-udløbere
    if (i % 4 === 1) k = 1.05;
    pts.push([Math.cos(a) * W * 0.46 * k, Math.sin(a) * H * 0.46 * k]);
  }
  blobBody(g, pts, base, { lw: 1.6, ao: 4 });
  clipped(g, blobPath(g, pts), () => {
    for (let i = 0; i < 400; i++) {
      const x = (r() - 0.5) * W;
      const y = (r() - 0.5) * H;
      g.strokeStyle = r() < 0.5 ? rgb(shift(base, -30), 0.4) : rgb(shift(base, 30), 0.4);
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (x / W) * 4, y + 3 + (y / H) * 4);
      g.stroke();
    }
    mottle(g, r, [-W / 2, -H / 2, W / 2, H / 2], base, 10, 12, 30, 0.2);
  });
  // hoved
  ellBody(g, 0, -H * 0.46, W * 0.12, H * 0.1, shift(base, 6), { lw: 1.4, ao: 1.5 });
}

const T = { family: 'bedroom', shadow: 6 } as const;
const tags = ['indoor', 'house', 'tavern'];

export const bedroomKinds: ObjectKind[] = [
  kind({ ...T, key: 'bedroom_canopy_bed', name: 'Himmelseng', w: 2, h: 2.6, shadow: 10, params: [], tags: [...tags, 'rich'], draw: canopyBed }),
  kind({ ...T, key: 'bedroom_canopy_bed_double', name: 'Himmelseng, dobbelt', w: 2.8, h: 2.8, shadow: 10, params: [], tags: [...tags, 'rich'], draw: canopyBed }),
  kind({ ...T, key: 'bedroom_wardrobe', name: 'Klædeskab', w: 1.4, h: 0.8, shadow: 9, params: [{ key: 'items', label: 'Pynt', type: 'toggle', default: true }], tags: [...tags, 'rich'], draw: wardrobe }),
  kind({ ...T, key: 'bedroom_wardrobe_large', name: 'Klædeskab, stort', w: 2.2, h: 0.9, shadow: 9, params: [{ key: 'items', label: 'Pynt', type: 'toggle', default: true }], tags: [...tags, 'rich'], draw: wardrobe }),
  kind({ ...T, key: 'bedroom_dresser', name: 'Kommode', w: 1.4, h: 0.7, params: [{ key: 'lit', label: 'Lys tændt', type: 'toggle', default: false }], tags, draw: dresser }),
  kind({ ...T, key: 'bedroom_washstand', name: 'Vaskestand', w: 0.9, h: 0.9, params: [], tags, draw: washStand }),
  kind({ ...T, key: 'bedroom_nightstand', name: 'Natbord', w: 0.7, h: 0.7, shadow: 5, params: [{ key: 'lit', label: 'Lys tændt', type: 'toggle', default: true }], tags, draw: nightstand }),
  kind({ ...T, key: 'bedroom_cradle', name: 'Vugge', w: 0.8, h: 1.2, shadow: 5, params: [{ key: 'baby', label: 'Barn', type: 'toggle', default: true }], tags: [...tags, 'village'], draw: cradle }),
  kind({ ...T, key: 'bedroom_screen', name: 'Skærm', w: 2.2, h: 0.5, shadow: 6, params: [{ key: 'panels', label: 'Fløje', type: 'range', min: 3, max: 6, step: 1, default: 4 }], tags: [...tags, 'rich'], draw: screen }),
  kind({ ...T, key: 'bedroom_blankets', name: 'Foldede tæpper', w: 1, h: 0.8, shadow: 2, randomRotation: true, params: [{ key: 'count', label: 'Antal', type: 'range', min: 1, max: 4, step: 1, default: 3 }], tags, draw: blanketPile }),
  kind({ ...T, key: 'bedroom_fur_rug', name: 'Skindtæppe', w: 2, h: 1.6, shadow: 0, randomRotation: true, params: [], tags: [...tags, 'camp', 'arctic'], draw: fur }),
];
void ellipsePath;
void bowl;
void bottle;
void steam;
void WOOD;
void BRASS;
void board;
