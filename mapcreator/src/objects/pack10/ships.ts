import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { tube } from '../pack2/helpers';
import {
  barrelTop, body, clamp, clipped, coil, crateTop, dot, drawHull, ellBody, halfWidthAt, hatch, innerShade, lerp, line, lin, longSail, mastTop, mossPatch,
  profile, radial, rectBody, rectPath, rf, rgb, sackTop, shift, squareSail, trace, WOOD, WOOD_DARK, woodGrain, yard,
  type G, type Path, type Profile, type RGB, type Rnd,
} from './kit';

/** Skibe og vrag set straks oppefra: dæk, luger, master, sejl, årer og kanoner. Stævnen vender opad (mod -y). */

const HULLS: Record<string, RGB> = {
  brown: [132, 90, 54],
  dark: [90, 62, 42],
  tarred: [60, 48, 42],
  blue: [58, 94, 130],
  red: [148, 58, 44],
  pale: [176, 150, 112],
};
const toneP: ParamDef = {
  key: 'tone', label: 'Skrog', type: 'select', default: 'brown',
  options: [{ value: 'brown', label: 'Brunt træ' }, { value: 'dark', label: 'Mørkt træ' }, { value: 'tarred', label: 'Tjæret' }, { value: 'blue', label: 'Blå' }, { value: 'red', label: 'Rød' }, { value: 'pale', label: 'Lyst træ' }],
};
const sailP: ParamDef = { key: 'sail', label: 'Sejl', type: 'select', default: 'set', options: [{ value: 'set', label: 'Sat' }, { value: 'furled', label: 'Beslået' }, { value: 'none', label: 'Ingen' }] };
const wearP = (d: number): ParamDef => ({ key: 'wear', label: 'Slid', type: 'range', min: 0, max: 1, step: 0.05, default: d });
const SAILCOLS: Record<string, RGB> = { cream: [228, 214, 176], white: [240, 236, 224], red: [170, 58, 46], brown: [168, 130, 84], blue: [70, 100, 140] };
const sailColP: ParamDef = { key: 'cloth', label: 'Sejlfarve', type: 'select', default: 'cream', options: [{ value: 'cream', label: 'Uldfarvet' }, { value: 'white', label: 'Hvid' }, { value: 'red', label: 'Rød' }, { value: 'brown', label: 'Brun' }, { value: 'blue', label: 'Blå' }] };
const cargoP: ParamDef = { key: 'cargo', label: 'Last', type: 'select', default: 'mixed', options: [{ value: 'none', label: 'Ingen' }, { value: 'barrels', label: 'Tønder' }, { value: 'crates', label: 'Kasser' }, { value: 'mixed', label: 'Blandet' }] };

// ------------------------------------------------------------------ fælles skibsopbygning

interface Ctx {
  g: G;
  r: Rnd;
  L: number;
  W: number;
  prof: Profile;
  deck: Path;
  DL: number;
  DW: number;
  dcy: number;
  /** y-koordinat for t (0 = stævn, 1 = hæk). */
  y: (t: number) => number;
  /** Halv bredde af dækket ved y. */
  dhw: (y: number) => number;
}

function makeShip(g: G, r: Rnd, L: number, W: number, prof: Profile, hullCol: RGB, deckCol: RGB, wear: number, o: { rail?: number; open?: boolean } = {}): Ctx {
  const h = drawHull(g, r, { L, W, prof, hullCol, deckCol, wear, rail: o.rail, open: o.open });
  const y = (t: number) => -L / 2 + t * L;
  return {
    g, r, L, W, prof, deck: h.deck, DL: h.DL, DW: h.DW, dcy: h.dcy, y,
    dhw: (yy) => halfWidthAt(h.DL, h.DW, prof, yy, h.dcy),
  };
}

/** Hævet dæk (bak eller forkastel) med skygge på dækket under, ræl og planker. */
function castle(c: Ctx, t0: number, t1: number, col: RGB, depthShadow = true): void {
  const { g, r } = c;
  const y0 = c.y(t0);
  const y1 = c.y(t1);
  const w = 2 * Math.min(c.dhw(y0 + 2), c.dhw(y1 - 2)) * 0.94;
  const x = -w / 2;
  const h = y1 - y0;
  if (depthShadow) {
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.fillRect(x + 3, y0 + 4, w, h);
  }
  rectBody(g, x, y0, w, h, 2, col, { lw: 1.8, ao: 3.4, rim: 1.4 });
  clipped(g, rectPath(g, x, y0, w, h, 2), () => {
    const n = Math.max(5, Math.round(w / 5));
    for (let i = 0; i < n; i++) {
      const px = x + (i * w) / n;
      g.fillStyle = rgb(shift(col, (r() - 0.5) * 20), 0.55);
      g.fillRect(px, y0, w / n, h);
      g.fillStyle = 'rgba(12,6,2,.5)';
      g.fillRect(px + w / n - 0.5, y0, 1, h);
    }
    woodGrain(g, r, [x, y0, x + w, y0 + h], col, { rot: Math.PI / 2, lines: n * 2, contrast: 0.7 });
    const jn = Math.max(2, Math.round(h / 40));
    g.fillStyle = 'rgba(12,6,2,.4)';
    for (let i = 1; i < jn; i++) g.fillRect(x, y0 + (i * h) / jn + rf(r, -3, 3), w, 1);
  });
  // rækværk: stolper og list langs kanten
  g.strokeStyle = 'rgba(20,10,4,.8)';
  g.lineWidth = 2.2;
  g.strokeRect(x + 2, y0 + 2, w - 4, h - 4);
  g.strokeStyle = rgb(shift(col, 26));
  g.lineWidth = 1.1;
  g.strokeRect(x + 1.4, y0 + 1.4, w - 4, h - 4);
  const per = 2 * (w + h);
  const nn = Math.round(per / 11);
  for (let i = 0; i < nn; i++) {
    let d = (i / nn) * per;
    let px = x + 2;
    let py = y0 + 2;
    if (d < w - 4) px += d;
    else if ((d -= w - 4) < h - 4) { px += w - 4; py += d; }
    else if ((d -= h - 4) < w - 4) { px += w - 4 - d; py += h - 4; }
    else { d -= w - 4; py += h - 4 - d; }
    dot(g, px, py, 1.5, shift(col, 12));
  }
}

/** Lukker til last: tønder, kasser og sække mellem to t-værdier. */
function cargoPiles(c: Ctx, kindName: string, t0: number, t1: number, density = 1): void {
  if (kindName === 'none') return;
  const { g, r } = c;
  const n = Math.round(((t1 - t0) * c.L) / 24 * density);
  for (let i = 0; i < n; i++) {
    const t = lerp(t0, t1, (i + r() * 0.5) / n);
    const y = c.y(t);
    const hw = c.dhw(y) * 0.8;
    const side = r() < 0.5 ? -1 : 1;
    const x = side * rf(r, hw * 0.25, hw);
    const k = kindName === 'mixed' ? (r() < 0.5 ? 'barrels' : 'crates') : kindName;
    if (k === 'barrels') barrelTop(g, r, x, y, rf(r, 6, 8.5));
    else crateTop(g, r, x, y, rf(r, 11, 16), rf(r, 11, 15), rf(r, -0.2, 0.2));
  }
}

/** Mast, stag og vant (liner til rælingen). */
function rigging(c: Ctx, t: number, rad: number, shrouds = 3, stays = true, tTop = 0.0, tBottom = 1.0): void {
  const { g } = c;
  const my = c.y(t);
  for (let i = 0; i < shrouds; i++) {
    const dy = (i - (shrouds - 1) / 2) * c.L * 0.035;
    const yy = my + dy;
    const hw = c.dhw(yy) * 0.97;
    line(g, 0, my, -hw, yy, 0.9);
    line(g, 0, my, hw, yy, 0.9);
  }
  if (stays) {
    line(g, 0, my, 0, c.y(tTop + 0.015), 1.1);
    line(g, 0, my, 0, c.y(tBottom - 0.02), 1.0);
  }
  mastTop(g, c.r, 0, my, rad);
}

/** Vimpel/flag, der blafrer agterud fra mastetoppen. */
function pennant(c: Ctx, x: number, y: number, len: number, col: RGB, wave = 0): void {
  const { g } = c;
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(wave, len * 0.3, -wave, len * 0.7, 0, len);
  g.lineTo(len * 0.18, len * 0.45);
  g.closePath();
  g.fillStyle = rgb(col);
  g.fill();
  g.strokeStyle = 'rgba(20,10,4,.8)';
  g.lineWidth = 1.1;
  g.stroke();
  g.restore();
}

/** Årer i par langs begge sider: skaft ind over rælingen og blad i vandet (let slæbt agterud). */
function oars(c: Ctx, t0: number, t1: number, n: number, len: number, sweep: number, bladeW: number, pulled = 0): void {
  const { g, r } = c;
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const t = lerp(t0, t1, n === 1 ? 0.5 : i / (n - 1));
      const y = c.y(t);
      const hw = (c.W / 2) * c.prof(t);
      const sw = sweep + (r() - 0.5) * 0.05 + pulled * (i % 2 ? 0.05 : -0.04);
      const x0 = side * hw * 0.74;
      const x1 = side * (hw + len);
      const y1 = y + len * sw;
      const tr = () => {
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(x1, y1);
      };
      g.lineCap = 'round';
      tr();
      g.strokeStyle = 'rgba(8,4,0,.3)';
      g.lineWidth = 3.4;
      g.save();
      g.translate(2, 3);
      g.stroke();
      g.restore();
      tr();
      g.strokeStyle = 'rgba(18,9,3,.85)';
      g.lineWidth = 3.6;
      g.stroke();
      tr();
      g.strokeStyle = rgb([178, 140, 90]);
      g.lineWidth = 2.2;
      g.stroke();
      g.strokeStyle = 'rgba(255,238,196,.45)';
      g.lineWidth = 0.8;
      g.translate(-0.4, -0.5);
      g.stroke();
      g.translate(0.4, 0.5);
      // blad
      const ang = Math.atan2(y1 - y, x1 - x0);
      g.save();
      g.translate(x1, y1);
      g.rotate(ang);
      const bl = len * 0.3;
      g.beginPath();
      g.moveTo(-bl * 0.3, -bladeW * 0.28);
      g.lineTo(bl * 0.7, -bladeW * 0.5);
      g.quadraticCurveTo(bl * 1.0, 0, bl * 0.7, bladeW * 0.5);
      g.lineTo(-bl * 0.3, bladeW * 0.28);
      g.closePath();
      g.fillStyle = lin(g, 0, -bladeW / 2, 0, bladeW / 2, [[0, rgb([196, 158, 106])], [1, rgb([128, 92, 56])]]);
      g.fill();
      g.strokeStyle = 'rgba(18,9,3,.85)';
      g.lineWidth = 1.2;
      g.stroke();
      g.restore();
      // åregat (greb)
      g.fillStyle = 'rgba(18,9,3,.85)';
      g.beginPath();
      g.arc(x0, y, 2.6, 0, 7);
      g.fill();
      g.fillStyle = rgb([128, 88, 52]);
      g.beginPath();
      g.arc(x0 - 0.3, y - 0.3, 1.8, 0, 7);
      g.fill();
    }
  }
}

/** Rundt skjold set oppefra (hængt på rælingen). */
function shield(g: G, x: number, y: number, rad: number, col: RGB, col2: RGB, pattern: number): void {
  g.fillStyle = 'rgba(8,4,0,.4)';
  g.beginPath();
  g.arc(x + rad * 0.15, y + rad * 0.2, rad, 0, 7);
  g.fill();
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.fillStyle = radial(g, x, y, rad, [[0, rgb(shift(col, 26))], [0.6, rgb(col)], [1, rgb(shift(col, -34))]], x - rad * 0.4, y - rad * 0.4, 0.5);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.clip();
  g.fillStyle = rgb(col2);
  if (pattern === 0) {
    g.fillRect(x - rad, y - rad, rad, rad * 2);
  } else if (pattern === 1) {
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, rad, (i * Math.PI) / 2, (i * Math.PI) / 2 + Math.PI / 4);
      g.closePath();
      g.fill();
    }
  } else {
    g.fillRect(x - rad, y - rad * 0.22, rad * 2, rad * 0.44);
    g.fillRect(x - rad * 0.22, y - rad, rad * 0.44, rad * 2);
  }
  g.restore();
  g.strokeStyle = 'rgba(20,10,4,.9)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.stroke();
  g.strokeStyle = 'rgba(70,72,78,.8)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, rad * 0.9, 0, 7);
  g.stroke();
  // pukkel
  g.fillStyle = 'rgba(8,4,0,.5)';
  g.beginPath();
  g.arc(x + 0.7, y + 0.8, rad * 0.3, 0, 7);
  g.fill();
  g.fillStyle = radial(g, x, y, rad * 0.3, [[0, 'rgb(220,214,196)'], [1, 'rgb(110,112,120)']], x - rad * 0.1, y - rad * 0.1, 0.2);
  g.beginPath();
  g.arc(x, y, rad * 0.3, 0, 7);
  g.fill();
}

/** Kanon på dæk, pegende udad til siden (side = -1 venstre, 1 højre). */
function deckCannon(g: G, x: number, y: number, side: number, len: number, col: RGB = [64, 66, 72]): void {
  g.save();
  g.translate(x, y);
  g.scale(side, 1);
  // lavet
  rectBody(g, -len * 0.5, -len * 0.2, len * 0.6, len * 0.4, 1.5, [128, 88, 52], { lw: 1.2, ao: 1.2, rim: 0.8 });
  // hjul
  for (const yy of [-len * 0.22, len * 0.22]) {
    g.fillStyle = 'rgba(8,4,0,.6)';
    g.fillRect(-len * 0.2, yy - 2, len * 0.34, 4);
    g.fillStyle = rgb([84, 58, 36]);
    g.fillRect(-len * 0.2, yy - 1.5, len * 0.34, 3);
  }
  const tr = () => {
    g.beginPath();
    g.moveTo(-len * 0.4, 0);
    g.lineTo(len * 0.5, 0);
  };
  tube(g, tr, len * 0.2, col);
  g.fillStyle = rgb(shift(col, -26));
  g.beginPath();
  g.arc(-len * 0.4, 0, len * 0.1, 0, 7);
  g.fill();
  g.strokeStyle = 'rgba(8,4,0,.9)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(len * 0.5, 0, len * 0.09, 0, 7);
  g.stroke();
  g.restore();
}

/** Net som bunke: blød klump med maskenet, korkfloder og tunge sænkelodder; mørk grøn/brun garn. */
export function netPile(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, col: RGB = [120, 104, 70], spread = 1): void {
  const pts: [number, number][] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 0.34;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const path = () => {
    g.beginPath();
    const m = pts.length;
    g.moveTo((pts[0]![0] + pts[m - 1]![0]) / 2, (pts[0]![1] + pts[m - 1]![1]) / 2);
    for (let i = 0; i < m; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % m]!;
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
  };
  g.save();
  g.translate(2, 3);
  path();
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.fill();
  g.restore();
  path();
  g.fillStyle = radial(g, cx, cy, Math.max(rx, ry), [[0, rgb(shift(col, 22))], [0.7, rgb(col)], [1, rgb(shift(col, -36))]], cx - rx * 0.3, cy - ry * 0.3, 1);
  g.fill();
  g.save();
  path();
  g.clip();
  // maskenet: to skråstillede liniesæt, flere lag
  for (let layer = 0; layer < 2; layer++) {
    const ang = r() * 3;
    const step = 5.5 * spread;
    g.save();
    g.translate(cx, cy);
    g.rotate(ang);
    g.strokeStyle = layer ? 'rgba(20,14,6,.55)' : 'rgba(250,240,200,.28)';
    g.lineWidth = 0.8;
    g.beginPath();
    for (let k = -Math.max(rx, ry) * 1.6; k < Math.max(rx, ry) * 1.6; k += step) {
      g.moveTo(k, -ry * 2);
      g.lineTo(k + ry * 0.9, ry * 2);
      g.moveTo(k, -ry * 2);
      g.lineTo(k - ry * 0.9, ry * 2);
    }
    g.stroke();
    g.restore();
  }
  g.restore();
  path();
  g.strokeStyle = 'rgba(18,10,4,.85)';
  g.lineWidth = 1.4;
  g.stroke();
  // flåd (kork) og lodder
  for (let i = 0; i < Math.max(4, Math.round((rx + ry) / 9)); i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * 0.85;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    if (r() < 0.6) dot(g, x, y, 2.4, [196, 150, 84]);
    else dot(g, x, y, 1.8, [96, 98, 104]);
  }
}

// ------------------------------------------------------------------ kogge og handelsskibe

function cog(g: G, o: DrawInput, variant: 'cog' | 'merchant' | 'abandoned'): void {
  const r = rng(o.seed);
  const L = o.h * 0.92;
  const W = o.w * (variant === 'merchant' ? 0.68 : 0.72);
  const abandoned = variant === 'abandoned';
  const wear = abandoned ? 0.95 : param(o, 'wear', variant === 'merchant' ? 0.15 : 0.25);
  const hullCol = HULLS[param(o, 'tone', abandoned ? 'dark' : 'brown')] ?? HULLS.brown!;
  const prof = profile(variant === 'merchant' ? 1.0 : 0.82, variant === 'merchant' ? 0.58 : 0.72, 0.58);
  const c = makeShip(g, r, L, W, prof, hullCol, shift(WOOD, abandoned ? -22 : 0), wear);
  const sail = abandoned ? 'torn' : param(o, 'sail', 'set');
  const cloth = SAILCOLS[param(o, 'cloth', abandoned ? 'brown' : 'cream')] ?? SAILCOLS.cream!;
  // bak (agter) og lille forkastel
  castle(c, variant === 'merchant' ? 0.76 : 0.78, 0.96, shift(hullCol, 26));
  if (variant === 'merchant') castle(c, 0.08, 0.2, shift(hullCol, 22));
  // luger
  const hatches: [number, number, number][] = variant === 'merchant' ? [[0.3, 0.12, 0.05], [0.5, 0.2, 0.06], [0.66, 0.14, 0.05]] : [[0.5, 0.17, 0.05], [0.64, 0.14, 0.05]];
  for (const [t, wf, hf] of hatches) {
    const open = abandoned ? r() < 0.6 : r() < 0.15;
    hatch(g, r, 0, c.y(t), c.DW * wf * 2.2, c.L * hf, open);
  }
  if (!abandoned) cargoPiles(c, param(o, 'cargo', 'mixed'), 0.22, 0.72, 1);
  else {
    // væltede tønder og strandet affald
    for (let i = 0; i < 5; i++) {
      const y = c.y(rf(r, 0.2, 0.7));
      barrelTop(g, r, rf(r, -1, 1) * c.dhw(y) * 0.7, y, rf(r, 6, 8), [110, 82, 54]);
    }
    for (let i = 0; i < 3; i++) coil(g, r, rf(r, -1, 1) * c.W * 0.2, c.y(rf(r, 0.2, 0.7)), 8, [130, 112, 80]);
  }
  // ankervinde (spil) og rorpind agter
  const wy = c.y(0.2);
  if (variant !== 'merchant') ellBody(g, 0, wy, 7, 7, [110, 76, 46], { lw: 1.4 });
  // master og sejl
  const rad = Math.max(4, W * 0.035);
  const masts: [number, number][] = variant === 'merchant' ? [[0.26, 0.94], [0.5, 1.0]] : [[0.42, 1.0]];
  for (const [t, big] of masts) {
    rigging(c, t, rad, 3, false);
    const span = W * 1.36 * big;
    const dep = L * 0.05 * big;
    if (sail === 'set') squareSail(g, r, 0, c.y(t) - 2, span, dep, cloth, true, null);
    else if (sail === 'furled') squareSail(g, r, 0, c.y(t) - 2, span * 0.9, dep, cloth, false);
    else if (sail === 'torn') tornSail(g, r, 0, c.y(t), span * 0.9, dep, cloth);
    pennant(c, 0, c.y(t) + rad, L * 0.07, [176, 60, 44], 4);
  }
  if (variant === 'merchant') {
    // mesan: langsgående latinersejl
    const my = c.y(0.82);
    rigging(c, 0.82, rad * 0.8, 2, false);
    if (sail === 'set') longSail(g, r, 0, my, W * 0.12, my + L * 0.15, W * 0.2, cloth);
    else if (sail === 'furled') { line(g, 0, my, 0, my + L * 0.14, 3, 0, [140, 110, 70]); }
  }
  // rorpind og ror ved hækken
  rudder(c);
  if (wear > 0.55) {
    g.save();
    c.deck();
    g.clip();
    mossPatch(g, r, -c.DW * 0.3, c.y(0.6), c.DW * 0.25, Math.round(wear * 20));
    mossPatch(g, r, c.DW * 0.3, c.y(0.34), c.DW * 0.2, Math.round(wear * 14));
    g.restore();
  }
}

/** Rorpind og lille ror, set bagfra over hækken. */
function rudder(c: Ctx): void {
  const { g } = c;
  const y = c.y(0.935);
  const tr = () => {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(0, y - c.L * 0.045);
  };
  tube(g, tr, 3.2, [128, 88, 52]);
  const ry = c.y(1) - 1;
  rectBody(g, -4, ry - 3, 8, c.L * 0.04, 1.5, [100, 70, 44], { lw: 1.2, ao: 1 });
}

/** Revet sejl: laser og strimler af stof. */
function tornSail(g: G, r: Rnd, cx: number, cy: number, span: number, depth: number, col: RGB): void {
  yard(g, cx - span / 2, cx + span / 2, cy);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const x = cx - span / 2 + (i + 0.4 + r() * 0.3) * (span / n);
    if (r() < 0.2) continue;
    const len = depth * rf(r, 0.5, 1.9);
    const wid = (span / n) * rf(r, 0.35, 0.7);
    const sway = rf(r, -6, 6);
    g.beginPath();
    g.moveTo(x - wid / 2, cy);
    g.quadraticCurveTo(x - wid / 2 + sway, cy - len * 0.6, x + sway * 1.4, cy - len);
    g.quadraticCurveTo(x + wid / 2 + sway, cy - len * 0.5, x + wid / 2, cy);
    g.closePath();
    g.fillStyle = rgb(shift(col, -26 + r() * 22), 0.92);
    g.fill();
    g.strokeStyle = 'rgba(40,28,14,.7)';
    g.lineWidth = 1;
    g.stroke();
  }
}

// ------------------------------------------------------------------ galej og krigsskib

function galley(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const L = o.h * 0.9;
  const W = o.w * 0.38;
  const hullCol = HULLS[param(o, 'tone', 'pale')] ?? HULLS.pale!;
  const prof = profile(1.15, 0.7, 0.62);
  const c = makeShip(g, r, L, W, prof, hullCol, shift(WOOD, 4), 0.2, { rail: 0.09 });
  // vædder (næb) forrest
  const ramY = c.y(0) - L * 0.04;
  g.beginPath();
  g.moveTo(-W * 0.07, c.y(0.0) + 2);
  g.lineTo(0, ramY);
  g.lineTo(W * 0.07, c.y(0.0) + 2);
  g.closePath();
  g.fillStyle = rgb([128, 98, 58]);
  g.fill();
  g.strokeStyle = 'rgba(14,8,2,.9)';
  g.lineWidth = 1.5;
  g.stroke();
  // gangbro langs midten
  const x0 = -W * 0.07;
  const wy0 = c.y(0.16);
  const wy1 = c.y(0.82);
  rectBody(g, x0, wy0, W * 0.14, wy1 - wy0, 1.5, shift(hullCol, 24), { lw: 1.5, ao: 2, rim: 1.2 });
  clipped(g, rectPath(g, x0, wy0, W * 0.14, wy1 - wy0, 1), () => {
    woodGrain(g, r, [x0, wy0, -x0, wy1], hullCol, { rot: Math.PI / 2, lines: 6 });
    for (let y = wy0; y < wy1; y += 9) {
      g.fillStyle = 'rgba(12,6,2,.4)';
      g.fillRect(x0, y, W * 0.14, 1);
    }
  });
  // roerbænke i par
  const nb = Math.round(((0.78 - 0.18) * L) / 24);
  for (let i = 0; i < nb; i++) {
    const t = lerp(0.18, 0.78, i / (nb - 1));
    const y = c.y(t);
    const hw = c.dhw(y);
    for (const side of [-1, 1]) {
      const bx = side * (hw * 0.55);
      rectBody(g, bx - hw * 0.4, y - 2.8, hw * 0.8, 5.6, 1.3, WOOD_DARK, { lw: 1.1, ao: 1 });
      // roer (tegnet som en sidebænk)
      dot(g, bx + side * hw * 0.2, y, 2, [178, 140, 92]);
    }
  }
  const sail = param(o, 'sail', 'furled');
  const oarsOut = param(o, 'oars', true);
  if (oarsOut) oars(c, 0.14, 0.82, Math.round(((0.68) * L) / 25), W * 0.62, 0.28, W * 0.15, 1);
  // mast og latinersejl
  const my = c.y(0.38);
  rigging(c, 0.38, Math.max(3.5, W * 0.04), 2, true, 0.02, 0.98);
  const cloth = SAILCOLS[param(o, 'cloth', 'cream')] ?? SAILCOLS.cream!;
  if (sail === 'set') longSail(g, r, -W * 0.05, my + L * 0.22, W * 0.05, my - L * 0.28, W * 0.9, cloth);
  else if (sail === 'furled') {
    line(g, -W * 0.02, my + L * 0.24, W * 0.02, my - L * 0.26, 4, 0, shift(cloth, -30));
    line(g, -W * 0.02, my + L * 0.24, W * 0.02, my - L * 0.26, 2.4, 0, shift(cloth, -4));
  }
  // agterdæk og lanterne
  castle(c, 0.85, 0.98, shift(hullCol, 30));
  const ly = c.y(0.91);
  dot(g, -W * 0.18, ly, 3, [250, 204, 110]);
  dot(g, W * 0.18, ly, 3, [250, 204, 110]);
  rudderPair(c);
}

function rudderPair(c: Ctx): void {
  const { g } = c;
  for (const side of [-1, 1]) {
    const x = side * c.W * 0.26;
    const y0 = c.y(0.9);
    const y1 = c.y(1.0) + c.L * 0.02;
    const tr = () => {
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x, y1);
    };
    tube(g, tr, 4.2, [126, 90, 56]);
    g.fillStyle = rgb([96, 66, 40]);
    g.fillRect(x - 3, y1 - 8, 6, 12);
    g.strokeStyle = 'rgba(14,8,2,.85)';
    g.lineWidth = 1;
    g.strokeRect(x - 3, y1 - 8, 6, 12);
  }
}

function warship(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const L = o.h * 0.9;
  const W = o.w * 0.7;
  const hullCol = HULLS[param(o, 'tone', 'tarred')] ?? HULLS.tarred!;
  const prof = profile(0.95, 0.66, 0.5);
  const c = makeShip(g, r, L, W, prof, hullCol, shift(WOOD, -6), param(o, 'wear', 0.2));
  const sail = param(o, 'sail', 'furled');
  const cloth = SAILCOLS[param(o, 'cloth', 'white')] ?? SAILCOLS.white!;
  // bovsprydet fremad og klyverbom
  const bsy = c.y(0.02);
  const tr = () => {
    g.beginPath();
    g.moveTo(0, c.y(0.12));
    g.lineTo(0, bsy - L * 0.04);
  };
  tube(g, tr, 5, [132, 92, 56]);
  castle(c, 0.8, 0.97, shift(hullCol, 30));
  castle(c, 0.1, 0.2, shift(hullCol, 26));
  // kanoner
  const cn = Math.round(L / 46);
  for (let i = 0; i < cn; i++) {
    const t = lerp(0.26, 0.74, i / (cn - 1));
    const y = c.y(t);
    const hw = c.dhw(y);
    if (Math.abs(t - 0.5) < 0.05) continue;
    deckCannon(g, -hw * 0.82, y, -1, hw * 0.56);
    deckCannon(g, hw * 0.82, y, 1, hw * 0.56);
  }
  // luger imellem kanonerne
  hatch(g, r, 0, c.y(0.31), c.DW * 0.26, c.L * 0.045, false);
  hatch(g, r, 0, c.y(0.66), c.DW * 0.26, c.L * 0.045, r() < 0.3);
  // master: fore, hoved, mesan
  const rad = Math.max(4.5, W * 0.04);
  const masts: [number, number][] = [[0.27, 0.8], [0.5, 1.0], [0.72, 0.75]];
  for (const [t, big] of masts) {
    rigging(c, t, rad * big, 3, false);
    const span = W * 1.3 * big;
    const dep = L * 0.042 * big;
    if (sail === 'set') squareSail(g, r, 0, c.y(t) - 2, span, dep, cloth, true, null);
    else if (sail === 'furled') squareSail(g, r, 0, c.y(t) - 2, span * 0.92, dep, cloth, false);
  }
  const flag = param(o, 'flag', 'red');
  const fcol: RGB = flag === 'black' ? [30, 28, 30] : flag === 'blue' ? [50, 80, 150] : [176, 52, 40];
  pennant(c, 0, c.y(0.5) + rad, L * 0.09, fcol, 5);
  // ror
  const wy = c.y(0.88);
  ellBody(g, 0, wy, 8, 8, [120, 84, 52], { lw: 1.4, ao: 1.5 });
  g.strokeStyle = rgb([76, 50, 30]);
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.28;
    g.beginPath();
    g.moveTo(Math.cos(a) * 4, wy + Math.sin(a) * 4);
    g.lineTo(Math.cos(a) * 11, wy + Math.sin(a) * 11);
    g.stroke();
  }
  dot(g, 0, wy, 3.5, [168, 128, 60]);
  rudder(c);
}

// ------------------------------------------------------------------ langskib

function drakkar(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const L = o.h * 0.9;
  const W = o.w * 0.46;
  const hullCol = HULLS[param(o, 'tone', 'brown')] ?? HULLS.brown!;
  const prof = profile(1.4, 0.34, 0.5);
  const c = makeShip(g, r, L, W, prof, hullCol, shift(WOOD, 6), param(o, 'wear', 0.2), { rail: 0.08 });
  // drageforstavn og hækstavn: buede, udskårne spidser
  const stem = (y: number, dir: number, head: boolean) => {
    const tr = () => {
      g.beginPath();
      g.moveTo(0, y);
      g.quadraticCurveTo(W * 0.1 * (head ? 0.4 : 0), y + dir * L * 0.03, 0, y + dir * L * 0.05);
    };
    tube(g, tr, W * 0.1, [150, 104, 60]);
    if (head) {
      g.save();
      g.translate(0, y + dir * L * 0.05);
      g.beginPath();
      g.ellipse(0, 0, W * 0.09, W * 0.12, 0, 0, 7);
      g.fillStyle = radial(g, 0, 0, W * 0.12, [[0, rgb([186, 138, 80])], [1, rgb([110, 74, 42])]], -W * 0.03, -W * 0.04, 1);
      g.fill();
      g.strokeStyle = 'rgba(14,8,2,.9)';
      g.lineWidth = 1.5;
      g.stroke();
      dot(g, -W * 0.04, -W * 0.01, 1.6, [20, 12, 6]);
      dot(g, W * 0.04, -W * 0.01, 1.6, [20, 12, 6]);
      g.restore();
    }
  };
  stem(c.y(0) + L * 0.012, -1, param(o, 'dragon', true));
  stem(c.y(1) - L * 0.012, 1, false);
  // skjolde på rælingen
  if (param(o, 'shields', true)) {
    const n = Math.round(L / 20);
    const cols: [RGB, RGB][] = [[[190, 60, 44], [236, 218, 170]], [[220, 190, 84], [60, 60, 70]], [[60, 90, 140], [236, 218, 170]], [[236, 226, 200], [170, 54, 40]], [[40, 40, 44], [214, 180, 80]]];
    for (let i = 0; i < n; i++) {
      const t = lerp(0.2, 0.86, i / (n - 1));
      const y = c.y(t);
      const hw = (c.W / 2) * prof(t);
      const cc = cols[(i + Math.floor(r() * 2)) % cols.length]!;
      const rr = W * 0.085;
      shield(g, -hw + rr * 0.35, y, rr, cc[0], cc[1], i % 3);
      shield(g, hw - rr * 0.35, y, rr, cc[0], cc[1], (i + 1) % 3);
    }
  }
  // sækkelast og kister i midten
  for (let i = 0; i < 4; i++) {
    const y = c.y(rf(r, 0.3, 0.72));
    if (r() < 0.5) crateTop(g, r, rf(r, -1, 1) * c.dhw(y) * 0.5, y, 12, 10, rf(r, -0.2, 0.2), [128, 90, 54]);
    else sackTop(g, r, rf(r, -1, 1) * c.dhw(y) * 0.5, y, 6);
  }
  // roerbænke
  const nb = Math.round(((0.78 - 0.22) * L) / 26);
  for (let i = 0; i < nb; i++) {
    const t = lerp(0.22, 0.78, i / (nb - 1));
    const y = c.y(t);
    const hw = c.dhw(y);
    rectBody(g, -hw * 0.95, y - 2.4, hw * 1.9, 4.8, 1.2, WOOD_DARK, { lw: 1, ao: 0.8, rim: 0.5 });
  }
  // årer
  if (param(o, 'oars', true)) oars(c, 0.22, 0.8, nb, W * 0.64, 0.3, W * 0.13, 1);
  // mast og stribet sejl
  const rad = Math.max(3.6, W * 0.045);
  const sail = param(o, 'sail', 'set');
  const cloth = SAILCOLS[param(o, 'cloth', 'red')] ?? SAILCOLS.red!;
  rigging(c, 0.46, rad, 2, true, 0.0, 1.0);
  if (sail === 'set') squareSail(g, r, 0, c.y(0.46) - 2, W * 1.5, L * 0.07, shift(cloth, 0), true, [236, 226, 196]);
  else if (sail === 'furled') squareSail(g, r, 0, c.y(0.46) - 2, W * 1.3, L * 0.07, cloth, false);
  // styreåre
  const sx = c.W * 0.38;
  const tr = () => {
    g.beginPath();
    g.moveTo(sx, c.y(0.92));
    g.lineTo(sx + 5, c.y(1) + L * 0.03);
  };
  tube(g, tr, 3.6, [150, 108, 64]);
}

// ------------------------------------------------------------------ fiskerbåd, pram, flåde

function fishingBoat(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const L = o.h * 0.92;
  const W = o.w * 0.82;
  const hullCol = HULLS[param(o, 'tone', 'blue')] ?? HULLS.blue!;
  const prof = profile(0.8, 0.7, 0.52);
  const c = makeShip(g, r, L, W, prof, hullCol, shift(WOOD, -4), param(o, 'wear', 0.45), { rail: 0.1 });
  const { g: _g } = c;
  // fiskekasser og net
  if (param(o, 'net', true)) {
    netPile(g, r, -W * 0.08, c.y(0.4), W * 0.28, L * 0.1, [112, 100, 68]);
    netPile(g, r, W * 0.06, c.y(0.56), W * 0.22, L * 0.07, [124, 106, 72]);
  }
  for (let i = 0; i < 3; i++) {
    const y = c.y(0.22 + i * 0.05);
    crateTop(g, r, rf(r, 0.1, 0.35) * c.dhw(y) * (i % 2 ? 1 : -1), y, 13, 9, rf(r, -0.15, 0.15), [150, 124, 84]);
    for (let k = 0; k < 3; k++) {
      g.fillStyle = rgb([176 + k * 14, 186, 196]);
      g.beginPath();
      g.ellipse(rf(r, -1, 1) * 3 + (i % 2 ? 1 : -1) * c.dhw(y) * 0.2, y + rf(r, -2, 2), 2.4, 1, rf(r, 0, 3), 0, 7);
      g.fill();
    }
  }
  // styrehus (tag set oppefra) agter
  const hy = c.y(0.74);
  const hw = c.dhw(hy) * 0.78;
  const hh = L * 0.14;
  g.fillStyle = 'rgba(8,4,0,.38)';
  g.fillRect(-hw + 3, hy - hh / 2 + 4, hw * 2, hh);
  rectBody(g, -hw, hy - hh / 2, hw * 2, hh, 2, [176, 62, 46], { lw: 1.8, ao: 2.4, rim: 1.2 });
  clipped(g, rectPath(g, -hw, hy - hh / 2, hw * 2, hh, 2), () => {
    for (let i = 1; i < 6; i++) {
      g.fillStyle = 'rgba(20,8,4,.38)';
      g.fillRect(-hw, hy - hh / 2 + (i * hh) / 6, hw * 2, 1);
    }
    g.fillStyle = lin(g, -hw, hy - hh / 2, hw, hy + hh / 2, [[0, 'rgba(255,230,210,.22)'], [1, 'rgba(0,0,0,.28)']]);
    g.fillRect(-hw, hy - hh / 2, hw * 2, hh);
    // skorsten
    g.fillStyle = 'rgba(18,8,4,.85)';
  });
  ellBody(g, hw * 0.4, hy, 4, 4, [60, 56, 56], { lw: 1.2 });
  // mast og luggersejl
  const mt = 0.3;
  rigging(c, mt, Math.max(3.4, W * 0.04), 2, true, 0.02, 0.9);
  const sail = param(o, 'sail', 'furled');
  const cloth = SAILCOLS[param(o, 'cloth', 'brown')] ?? SAILCOLS.brown!;
  if (sail === 'set') longSail(g, r, 0, c.y(mt), W * 0.06, c.y(mt) + L * 0.34, W * 0.55, cloth);
  else if (sail === 'furled') line(g, 0, c.y(mt), 0, c.y(mt) + L * 0.3, 4, 0, shift(cloth, -30));
  // flåd ved rælingen
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const y = c.y(0.2 + i * 0.1 + (side > 0 ? 0.03 : 0));
      dot(g, side * (c.dhw(y) + 2), y, 2.6, [220, 120, 60]);
    }
  }
}

function barge(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const L = o.h * 0.94;
  const W = o.w * 0.9;
  const hullCol = HULLS[param(o, 'tone', 'dark')] ?? HULLS.dark!;
  const e = 0.12;
  const prof: Profile = (t) => (t < e ? Math.sqrt(1 - Math.pow((e - t) / e, 2)) * 0.97 + 0.03 : t > 1 - 0.08 ? 0.95 : 1);
  const c = makeShip(g, r, L, W, prof, hullCol, shift(WOOD, -8), param(o, 'wear', 0.5), { rail: 0.07 });
  const cargo = param(o, 'cargo', 'hay');
  const y0 = c.y(0.14);
  const y1 = c.y(0.82);
  const w = c.DW * 0.82;
  if (cargo === 'hay') {
    for (let i = 0; i < 5; i++) {
      const y = lerp(y0 + 20, y1 - 20, i / 4);
      for (const side of [-1, 1]) {
        const x = side * w * 0.24;
        rectBody(g, x - w * 0.22, y - L * 0.04, w * 0.44, L * 0.08, 5, [204, 176, 96], { lw: 1.4, ao: 2 });
        clipped(g, rectPath(g, x - w * 0.22, y - L * 0.04, w * 0.44, L * 0.08, 5), () => {
          for (let k = 0; k < 24; k++) {
            g.strokeStyle = r() < 0.5 ? 'rgba(120,90,36,.5)' : 'rgba(250,230,150,.45)';
            g.lineWidth = 0.8;
            const xx = x + rf(r, -w * 0.22, w * 0.22);
            const yy = y + rf(r, -L * 0.04, L * 0.04);
            g.beginPath();
            g.moveTo(xx, yy);
            g.lineTo(xx + rf(r, -6, 6), yy + rf(r, -3, 3));
            g.stroke();
          }
          g.strokeStyle = 'rgba(70,50,20,.75)';
          g.lineWidth = 1.2;
          g.strokeRect(x - w * 0.2, y - L * 0.03, w * 0.4, L * 0.06);
        });
      }
    }
  } else if (cargo === 'barrels') {
    const rr = w * 0.065;
    for (let ry = y0 + rr; ry < y1; ry += rr * 2.05) for (let rx = -w * 0.42; rx <= w * 0.42; rx += rr * 2.05) barrelTop(g, r, rx + (r() - 0.5) * 2, ry + (r() - 0.5) * 2, rr);
  } else if (cargo === 'crates') {
    const s = w * 0.15;
    for (let ry = y0 + s / 2; ry < y1; ry += s * 1.08) for (let rx = -w * 0.4; rx <= w * 0.4; rx += s * 1.08) crateTop(g, r, rx, ry, s, s, rf(r, -0.08, 0.08));
  } else if (cargo === 'tarp') {
    // presenning over last
    const pp = () => {
      g.beginPath();
      g.moveTo(-w * 0.45, y0);
      g.quadraticCurveTo(0, y0 - 14, w * 0.45, y0);
      g.lineTo(w * 0.45, y1);
      g.quadraticCurveTo(0, y1 + 14, -w * 0.45, y1);
      g.closePath();
    };
    body(g, pp, [96, 106, 86], [-w * 0.45, y0, w * 0.45, y1], { lw: 1.8, ao: 5, rim: 1.5 });
    clipped(g, pp, () => {
      for (let k = 0; k < 14; k++) {
        g.beginPath();
        const x = rf(r, -w * 0.4, w * 0.4);
        g.moveTo(x, y0);
        g.quadraticCurveTo(x + rf(r, -12, 12), (y0 + y1) / 2, x + rf(r, -8, 8), y1);
        g.strokeStyle = r() < 0.5 ? 'rgba(20,24,16,.3)' : 'rgba(210,220,190,.2)';
        g.lineWidth = rf(r, 1, 2.6);
        g.stroke();
      }
    });
    for (let i = 0; i < 6; i++) {
      const y = lerp(y0 + 8, y1 - 8, i / 5);
      line(g, -w * 0.45, y, w * 0.45, y, 1.8, 0, [160, 128, 84]);
    }
  }
  // lang stage og styreåre
  const sy = c.y(0.88);
  const tr = () => {
    g.beginPath();
    g.moveTo(c.W * 0.36, c.y(0.15));
    g.lineTo(c.W * 0.38, c.y(0.15) + L * 0.34);
  };
  if (param(o, 'pole', true)) tube(g, tr, 3.2, [150, 108, 64]);
  const tr2 = () => {
    g.beginPath();
    g.moveTo(0, sy);
    g.lineTo(0, c.y(1) + L * 0.04);
  };
  tube(g, tr2, 4, [140, 100, 60]);
  rectBody(g, -6, c.y(1) + L * 0.01, 12, L * 0.045, 1.5, [100, 70, 44], { lw: 1.2 });
  // fortøjningspullerter
  for (const side of [-1, 1]) for (const t of [0.08, 0.5, 0.92]) dot(g, side * c.dhw(c.y(t)) * 0.9, c.y(t), 3.4, [90, 92, 98]);
  coil(g, r, -c.DW * 0.28, c.y(0.9), 9);
}

function raft(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const n = Math.max(4, Math.round(w / 21));
  const logW = (w * 0.94) / n;
  const L = h * 0.94;
  // stammer
  for (let i = 0; i < n; i++) {
    const x = -w * 0.47 + i * logW;
    const len = L * rf(r, 0.9, 1);
    const y0 = -len / 2 + rf(r, -L * 0.02, L * 0.02);
    const col = shift([138, 98, 58], (r() - 0.5) * 30);
    const p = rectPath(g, x + 0.5, y0, logW - 1, len, logW * 0.46);
    g.save();
    g.translate(2, 3);
    p();
    g.fillStyle = 'rgba(8,4,0,.3)';
    g.fill();
    g.restore();
    body(g, p, col, [x, y0, x + logW, y0 + len], { lw: 1.7, ao: logW * 0.14, rim: 1.2, angle: 0, light: 30, dark: 40 });
    clipped(g, p, () => {
      woodGrain(g, r, [x, y0, x + logW, y0 + len], col, { rot: Math.PI / 2, lines: 5, contrast: 1.1, knots: r() < 0.5 ? 1 : 0 });
      // barkkanter
      g.strokeStyle = 'rgba(30,16,6,.3)';
      g.lineWidth = 0.9;
      for (let k = 0; k < 4; k++) {
        const yy = y0 + r() * len;
        g.beginPath();
        g.moveTo(x, yy);
        g.lineTo(x + logW, yy + rf(r, -2, 2));
        g.stroke();
      }
    });
    // savet endefladen
    g.fillStyle = rgb(shift(col, 36));
    g.beginPath();
    g.ellipse(x + logW / 2, y0 + 2.4, logW * 0.32, 2, 0, 0, 7);
    g.fill();
  }
  // surringer (tværgående rebbindinger)
  for (const t of [0.2, 0.5, 0.8]) {
    const y = -L / 2 + t * L;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-w * 0.47, y);
    g.lineTo(w * 0.47, y);
    g.strokeStyle = 'rgba(18,10,4,.8)';
    g.lineWidth = 5.8;
    g.stroke();
    for (let i = 0; i < n; i++) {
      const x = -w * 0.47 + (i + 0.5) * logW;
      coil(g, r, x, y, Math.min(5.4, logW * 0.4), [168, 136, 84]);
    }
  }
  // last: sæk, kasse og lille bål
  const cargo = param(o, 'cargo', 'sacks');
  if (cargo === 'sacks') {
    sackTop(g, r, -w * 0.18, -L * 0.12, 9);
    sackTop(g, r, w * 0.06, -L * 0.1, 8);
    sackTop(g, r, -w * 0.02, L * 0.12, 9);
    crateTop(g, r, w * 0.2, L * 0.18, 16, 13, 0.2);
  } else if (cargo === 'fire') {
    ellBody(g, 0, 0, w * 0.15, w * 0.15, [108, 106, 102], { lw: 1.5, ao: 3 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.28;
      ellBody(g, Math.cos(a) * w * 0.1, Math.sin(a) * w * 0.1, 5, 4, [138, 134, 126], { lw: 1 });
    }
    g.fillStyle = radial(g, 0, 0, w * 0.1, [[0, 'rgba(255,224,120,.95)'], [0.5, 'rgba(236,120,40,.8)'], [1, 'rgba(120,30,10,0)']]);
    g.beginPath();
    g.arc(0, 0, w * 0.1, 0, 7);
    g.fill();
  } else if (cargo === 'mast') {
    mastTop(g, r, 0, -L * 0.1, 5);
    squareSail(g, r, 0, -L * 0.1 - 2, w * 0.95, h * 0.1, [200, 184, 140], true);
    line(g, 0, -L * 0.1, -w * 0.42, -L * 0.3, 1);
    line(g, 0, -L * 0.1, w * 0.42, -L * 0.3, 1);
    line(g, 0, -L * 0.1, -w * 0.42, L * 0.2, 1);
    line(g, 0, -L * 0.1, w * 0.42, L * 0.2, 1);
  }
  // styreåre
  const tr = () => {
    g.beginPath();
    g.moveTo(w * 0.32, L * 0.36);
    g.lineTo(w * 0.42, L * 0.52);
  };
  tube(g, tr, 3.4, [160, 120, 72]);
}

// ------------------------------------------------------------------ vrag og synkende skib

/** Takket polygon til udklip af en brudt skrogkant. */
function jagged(r: Rnd, pts: [number, number][], amp: number, step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.round(len / step));
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const d = (r() - 0.5) * 2 * amp;
      out.push([lerp(a[0], b[0], t) + nx * d, lerp(a[1], b[1], t) + ny * d]);
    }
  }
  return out;
}

function wreckHull(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const L = o.h * 0.9;
  const W = o.w * 0.78;
  const prof = profile(0.9, 0.7, 0.55);
  const hullCol = HULLS[param(o, 'tone', 'dark')] ?? HULLS.dark!;
  const y0 = -L / 2;
  const keelCol: RGB = [86, 58, 36];
  // ribber (spanter) fra køl til ydersiden, hele skibet
  const outerPts = (t: number) => (W / 2) * prof(t);
  g.save();
  for (let i = 0; i < 22; i++) {
    const t = 0.05 + i * (0.9 / 21);
    const y = y0 + t * L;
    const hw = outerPts(t);
    for (const side of [-1, 1]) {
      if (side === 1 && t > 0.2 && t < 0.5 && r() < 0.6) continue;
      const tr = () => {
        g.beginPath();
        g.moveTo(0, y + 2);
        g.quadraticCurveTo(side * hw * 0.5, y + 4, side * hw, y - 3 - r() * 8);
      };
      tube(g, tr, 3.4, keelCol, { outline: 1.8 });
    }
  }
  // køl
  const kt = () => {
    g.beginPath();
    g.moveTo(0, y0 + L * 0.03);
    g.lineTo(0, y0 + L * 0.97);
  };
  tube(g, kt, 6.4, keelCol);
  g.restore();
  // bevaret plankebeklædning: hæk og venstre side
  const keep: [number, number][] = [
    [-W * 0.6, y0 + L * 0.3], [-W * 0.1, y0 + L * 0.34], [W * 0.05, y0 + L * 0.5], [W * 0.5, y0 + L * 0.6], [W * 0.6, y0 + L * 1.02],
    [-W * 0.6, y0 + L * 1.02],
  ];
  const jg = jagged(r, keep, 9, 14);
  const keepPath = () => trace(g, jg);
  g.save();
  keepPath();
  g.clip();
  const c = makeShip(g, r, L, W, prof, hullCol, shift(WOOD, -26), 0.9, { rail: 0.08 });
  hatch(g, r, 0, c.y(0.7), c.DW * 0.4, L * 0.05, true);
  g.restore();
  keepPath();
  g.strokeStyle = 'rgba(14,8,2,.85)';
  g.lineWidth = 1.8;
  g.stroke();
  // splinter langs brudkanten
  for (let i = 0; i < jg.length; i += 2) {
    const p = jg[i]!;
    g.fillStyle = rgb(shift(hullCol, 30 + r() * 20));
    g.beginPath();
    g.moveTo(p[0], p[1]);
    g.lineTo(p[0] + rf(r, -9, 9), p[1] + rf(r, -9, 9));
    g.lineTo(p[0] + rf(r, -4, 4), p[1] + rf(r, -4, 4));
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(14,8,2,.6)';
    g.lineWidth = 0.8;
    g.stroke();
  }
  // knækket mast
  const my = y0 + L * 0.72;
  mastTop(g, r, 0, my, 5);
  const tr = () => {
    g.beginPath();
    g.moveTo(0, my);
    g.lineTo(W * 0.55, my - L * 0.12);
  };
  tube(g, tr, 5.4, [138, 96, 58]);
  tornSail(g, r, W * 0.28, my - L * 0.06, W * 0.4, 18, [190, 170, 130]);
  // løse planker og tov
  for (let i = 0; i < 7; i++) plank(g, r, rf(r, -W * 0.55, W * 0.55), y0 + rf(r, 0.05, 0.5) * L, rf(r, 22, 46), hullCol);
  coil(g, r, -W * 0.35, y0 + L * 0.42, 9);
}

function plank(g: G, r: Rnd, x: number, y: number, len: number, col: RGB): void {
  g.save();
  g.translate(x, y);
  g.rotate(r() * Math.PI);
  const w = rf(r, 4, 6.5);
  const pts: [number, number][] = [[-len / 2, -w / 2], [len / 2 - 4, -w / 2], [len / 2, rf(r, -w / 3, w / 3)], [len / 2 - 5, w / 2], [-len / 2, w / 2]];
  g.save();
  g.translate(1.5, 2.2);
  trace(g, pts);
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.fill();
  g.restore();
  const c = shift(col, 12 + (r() - 0.5) * 24);
  trace(g, pts);
  g.fillStyle = lin(g, 0, -w / 2, 0, w / 2, [[0, rgb(shift(c, 16))], [1, rgb(shift(c, -22))]]);
  g.fill();
  g.strokeStyle = 'rgba(14,8,2,.85)';
  g.lineWidth = 1.2;
  g.stroke();
  g.strokeStyle = 'rgba(255,236,196,.2)';
  g.beginPath();
  g.moveTo(-len / 2, -w / 2 + 1);
  g.lineTo(len / 2 - 6, -w / 2 + 1);
  g.stroke();
  g.fillStyle = 'rgba(14,8,2,.6)';
  g.fillRect(-len / 2 + 4, -0.5, 1.2, 1.2);
  g.fillRect(len / 2 - 9, -0.5, 1.2, 1.2);
  g.restore();
}

function wreckDebris(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const cx = [-w * 0.2, w * 0.18, w * 0.02];
  const cy = [-h * 0.15, h * 0.12, h * 0.28];
  for (let i = 0; i < 9; i++) plank(g, r, rf(r, -w * 0.42, w * 0.42), rf(r, -h * 0.42, h * 0.42), rf(r, 30, 70), HULLS.brown!);
  // en rib
  const tr = () => {
    g.beginPath();
    g.moveTo(-w * 0.3, h * 0.3);
    g.quadraticCurveTo(0, h * 0.05, w * 0.3, h * 0.28);
  };
  tube(g, tr, 5.6, [100, 68, 42]);
  barrelTop(g, r, cx[0]! + 8, cy[0]!, 11, [112, 80, 50]);
  barrelTop(g, r, cx[1]! - 6, cy[1]! - 12, 9, [124, 88, 54]);
  coil(g, r, cx[2]!, cy[2]!, 11, [146, 120, 78]);
  crateTop(g, r, -w * 0.05, -h * 0.34, 20, 16, 0.5, [140, 104, 64]);
  const mt = () => {
    g.beginPath();
    g.moveTo(-w * 0.4, -h * 0.05);
    g.lineTo(w * 0.1, -h * 0.4);
  };
  tube(g, mt, 4.4, [138, 96, 58]);
  tornSail(g, r, -w * 0.15, -h * 0.22, w * 0.3, 14, [196, 178, 138]);
}

function sinkingShip(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const L = o.h * 0.9;
  const W = o.w * 0.66;
  const stage = param(o, 'stage', 0.55);
  g.save();
  g.rotate(0.07 * stage);
  const hullCol = HULLS[param(o, 'tone', 'brown')] ?? HULLS.brown!;
  const prof = profile(0.9, 0.7, 0.55);
  const c = makeShip(g, r, L, W, prof, hullCol, shift(WOOD, -10), 0.4);
  castle(c, 0.78, 0.96, shift(hullCol, 26));
  hatch(g, r, 0, c.y(0.5), c.DW * 0.36, L * 0.05, true);
  hatch(g, r, 0, c.y(0.62), c.DW * 0.36, L * 0.05, true);
  for (let i = 0; i < 4; i++) barrelTop(g, r, rf(r, -1, 1) * c.dhw(c.y(0.4)) * 0.7, c.y(rf(r, 0.28, 0.5)), 7, [120, 86, 54]);
  rigging(c, 0.4, 5, 3, false);
  squareSail(g, r, 0, c.y(0.4) - 2, W * 1.3, L * 0.05, SAILCOLS.cream!, true);
  g.restore();
  // vand, der æder hækken: bløde vandflader og skumringe
  const wy = L * (0.1 + 0.5 * stage) - L * 0.1;
  const wr = W * (1.0 + stage * 0.5);
  g.fillStyle = radial(g, 0, wy + L * 0.18, wr * 1.2, [[0, 'rgba(28,84,104,.8)'], [0.55, 'rgba(36,104,126,.62)'], [0.85, 'rgba(60,140,160,.2)'], [1, 'rgba(60,140,160,0)']]);
  g.beginPath();
  g.ellipse(0, wy + L * 0.18, wr * 1.2, wr * 1.6, 0, 0, 7);
  g.fill();
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(rf(r, -4, 4), wy + L * 0.12 + i * 6, wr * (0.62 + i * 0.1), wr * (0.9 + i * 0.1), 0, Math.PI * 1.1, Math.PI * 1.9);
    g.strokeStyle = `rgba(236,248,250,${0.5 - i * 0.1})`;
    g.lineWidth = 2.6 - i * 0.4;
    g.stroke();
  }
  // skumpletter og bobler
  for (let i = 0; i < 30; i++) {
    const a = r() * 6.28;
    const d = rf(r, 0.4, 1) * wr;
    g.fillStyle = `rgba(240,250,252,${0.3 + r() * 0.4})`;
    g.beginPath();
    g.ellipse(Math.cos(a) * d * 0.9, wy + L * 0.18 + Math.sin(a) * d * 1.2, rf(r, 1.5, 4.5), rf(r, 1, 3), r() * 3, 0, 7);
    g.fill();
  }
  // flydende affald
  for (let i = 0; i < 6; i++) plank(g, r, rf(r, -W * 0.7, W * 0.7), wy + rf(r, 0.08, 0.34) * L, rf(r, 18, 38), hullCol);
  barrelTop(g, r, W * 0.55, wy + L * 0.05, 8, [120, 86, 54]);
}

// ------------------------------------------------------------------ registrering

const base = { layers: ['objects', 'effects'] as ('objects' | 'effects')[], keepAspect: true as const };
const HARBOR = ['harbor', 'water', 'city', 'outdoor'];

export const shipKinds: ObjectKind[] = [
  kind({ key: 'ship_cog', family: 'ships', name: 'Kogge', w: 4.4, h: 12, ...base, shadow: 14, params: [sailP, sailColP, toneP, cargoP, wearP(0.25)], tags: HARBOR, draw: (g, o) => cog(g, o, 'cog') }),
  kind({ key: 'ship_merchant', family: 'ships', name: 'Handelsskib med tre master', w: 5.2, h: 15, ...base, shadow: 16, params: [sailP, sailColP, toneP, cargoP, wearP(0.15)], tags: [...HARBOR, 'rich'], draw: (g, o) => cog(g, o, 'merchant') }),
  kind({ key: 'ship_galley', family: 'ships', name: 'Galej', w: 4.2, h: 14, ...base, shadow: 12, params: [sailP, sailColP, toneP, { key: 'oars', label: 'Årer ude', type: 'toggle', default: true }], tags: [...HARBOR, 'military'], draw: (g, o) => galley(g, o) }),
  kind({ key: 'ship_warship', family: 'ships', name: 'Krigsskib med kanoner', w: 5.6, h: 16, ...base, shadow: 16, params: [sailP, sailColP, toneP, { key: 'flag', label: 'Flag', type: 'select', default: 'red', options: [{ value: 'red', label: 'Rødt' }, { value: 'black', label: 'Sort' }, { value: 'blue', label: 'Blåt' }] }, wearP(0.2)], tags: [...HARBOR, 'military', 'battlefield'], draw: (g, o) => warship(g, o) }),
  kind({ key: 'ship_drakkar', family: 'ships', name: 'Vikingeskib med skjolde', w: 4.6, h: 12.5, ...base, shadow: 12, params: [sailP, sailColP, toneP, { key: 'oars', label: 'Årer ude', type: 'toggle', default: true }, { key: 'shields', label: 'Skjolde', type: 'toggle', default: true }, { key: 'dragon', label: 'Drageforstavn', type: 'toggle', default: true }, wearP(0.2)], tags: [...HARBOR, 'military', 'arctic'], draw: (g, o) => drakkar(g, o) }),
  kind({ key: 'ship_fishing', family: 'ships', name: 'Fiskerbåd med net', w: 3, h: 7, ...base, shadow: 10, params: [sailP, sailColP, toneP, { key: 'net', label: 'Net på dæk', type: 'toggle', default: true }, wearP(0.45)], tags: [...HARBOR, 'village', 'poor'], draw: (g, o) => fishingBoat(g, o) }),
  kind({ key: 'ship_barge', family: 'ships', name: 'Flodpram', w: 3.2, h: 9, ...base, shadow: 9, params: [{ key: 'cargo', label: 'Last', type: 'select', default: 'hay', options: [{ value: 'none', label: 'Ingen' }, { value: 'hay', label: 'Hø' }, { value: 'barrels', label: 'Tønder' }, { value: 'crates', label: 'Kasser' }, { value: 'tarp', label: 'Presenning' }] }, toneP, { key: 'pole', label: 'Stage', type: 'toggle', default: true }, wearP(0.5)], tags: [...HARBOR, 'village', 'farm', 'poor'], draw: (g, o) => barge(g, o) }),
  kind({ key: 'ship_raft', family: 'ships', name: 'Tømmerflåde', w: 3.4, h: 4, ...base, shadow: 8, params: [{ key: 'cargo', label: 'Last', type: 'select', default: 'sacks', options: [{ value: 'none', label: 'Ingen' }, { value: 'sacks', label: 'Sække og kasse' }, { value: 'fire', label: 'Bål' }, { value: 'mast', label: 'Mast og sejl' }] }], tags: ['water', 'swamp', 'poor', 'outdoor'], draw: (g, o) => raft(g, o) }),
  kind({ key: 'ship_abandoned', family: 'ships', name: 'Forladt skib', w: 4.4, h: 12, ...base, shadow: 14, params: [], tags: [...HARBOR, 'ruin', 'poor'], draw: (g, o) => cog(g, o, 'abandoned') }),
  kind({ key: 'ship_wreck', family: 'ships', name: 'Skibsvrag', w: 4.4, h: 11, ...base, shadow: 8, params: [toneP], tags: [...HARBOR, 'ruin', 'battlefield'], draw: (g, o) => wreckHull(g, o) }),
  kind({ key: 'ship_sinking', family: 'ships', name: 'Synkende skib', w: 5.2, h: 12, ...base, shadow: 4, params: [{ key: 'stage', label: 'Hvor langt nede', type: 'range', min: 0.2, max: 1, step: 0.05, default: 0.55 }, toneP], tags: [...HARBOR, 'battlefield'], draw: (g, o) => sinkingShip(g, o) }),
  kind({ key: 'ship_debris', family: 'ships', name: 'Vragdele', w: 4, h: 4, ...base, randomRotation: true, shadow: 4, params: [], tags: [...HARBOR, 'ruin', 'battlefield'], draw: (g, o) => wreckDebris(g, o) }),
];
