import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { body, clipped, lin, mottle, OUT, plankBoard, radial, rectBody, rectPath, rgb, rivet, shift, tube, type G, type Path, type RGB, type Rnd } from '../pack2/helpers';

/**
 * Døre og porte (pakke 5), tegnet set lidt skråt fra fronten (som et opstalt med trin og karm), så de læses som døre
 * og ikke som grå firkanter. Lyset kommer fra øverst til venstre: dybe skygger i åbningens top og venstre side.
 */

export const STONE: RGB = [136, 130, 120];
export const IRON: RGB = [78, 80, 90];
export const PLASTER: RGB = [214, 200, 170];

const WOODS: { label: string; col: RGB }[] = [
  { label: 'Egetræ', col: [128, 88, 52] },
  { label: 'Mørkt træ', col: [88, 60, 40] },
  { label: 'Lyst fyr', col: [170, 132, 84] },
  { label: 'Rødmalet', col: [150, 54, 44] },
  { label: 'Grønmalet', col: [64, 102, 74] },
];
export const woodParam: ParamDef = { key: 'tone', label: 'Træ', type: 'select', default: '0', options: WOODS.map((w, i) => ({ value: String(i), label: w.label })) };
export const openParam: ParamDef = { key: 'open', label: 'Åben', type: 'toggle', default: false };
export const wearParam: ParamDef = { key: 'wear', label: 'Slid', type: 'range', min: 0, max: 1, step: 0.05, default: 0.3 };
export const woodOf = (o: DrawInput, def = 0): RGB => WOODS[Math.min(WOODS.length - 1, Math.max(0, parseInt(param(o, 'tone', String(def)), 10) || 0))]!.col;

// ------------------------------------------------------------------ fælles dele

/** Åbningens sti: rektangel eller rundbue foroven. */
export function openingPath(g: G, x: number, y: number, w: number, h: number, arch: boolean): Path {
  return () => {
    g.beginPath();
    if (arch) {
      g.moveTo(x, y + h);
      g.lineTo(x, y + w / 2);
      g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
      g.lineTo(x + w, y + h);
    } else g.rect(x, y, w, h);
    g.closePath();
  };
}

/** Sten i skifter med fuger, nuancer og slid (skal kaldes inden for en clip). */
export function masonry(g: G, r: Rnd, x: number, y: number, w: number, h: number, base: RGB, row: number, moss = 0): void {
  for (let yy = y, j = 0; yy < y + h; yy += row, j++) {
    const rh = Math.min(row, y + h - yy);
    let xx = x - (j % 2) * row * 0.8;
    while (xx < x + w) {
      const bw = row * (1.2 + r() * 1.1);
      g.fillStyle = rgb(shift(base, (r() - 0.5) * 30));
      g.fillRect(xx, yy, bw, rh);
      g.fillStyle = 'rgba(255,246,225,.15)';
      g.fillRect(xx, yy, bw, 1.2);
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.fillRect(xx, yy + rh - 1.6, bw, 1.6);
      xx += bw;
    }
  }
  g.strokeStyle = 'rgba(24,16,10,.62)';
  g.lineWidth = 1;
  for (let yy = y, j = 0; yy < y + h; yy += row, j++) {
    g.beginPath();
    g.moveTo(x, yy); g.lineTo(x + w, yy);
    let xx = x - (j % 2) * row * 0.8;
    while (xx < x + w) {
      const bw = row * (1.2 + r() * 1.1);
      g.moveTo(xx, yy); g.lineTo(xx, yy + row);
      xx += bw;
    }
    g.stroke();
  }
  mottle(g, r, [x, y, x + w, y + h], base, 10, row * 0.7, 20, 0.3);
  if (moss > 0) {
    for (let i = 0; i < moss * 22; i++) {
      g.fillStyle = `rgba(${70 + r() * 40},${110 + r() * 40},40,${0.35 + r() * 0.3})`;
      g.beginPath();
      g.ellipse(x + r() * w, y + h * (0.4 + r() * 0.6), 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, 7);
      g.fill();
    }
  }
}

/** Skygge ind i åbningen: kraftig øverst og til venstre (lys fra øverst til venstre). */
export function innerShade(g: G, path: Path, depth: number): void {
  g.save();
  path();
  g.clip();
  g.translate(depth, depth);
  path();
  g.strokeStyle = 'rgba(6,3,0,.5)';
  g.lineWidth = depth * 1.4;
  g.stroke();
  g.translate(depth * 0.7, depth * 0.7);
  path();
  g.strokeStyle = 'rgba(6,3,0,.22)';
  g.lineWidth = depth * 1.4;
  g.stroke();
  g.restore();
  path();
  g.strokeStyle = 'rgba(14,8,4,.9)';
  g.lineWidth = 1.6;
  g.stroke();
}

/** Trappetrin foran: bredere nedad, lys top og mørk front. */
export function steps(g: G, r: Rnd, cx: number, y: number, w: number, h: number, n: number, col: RGB): void {
  const sh = h / n;
  for (let i = 0; i < n; i++) {
    const k = 1 - (n - 1 - i) * 0.07 - 0.0;
    const sw = w * (1 - (n - 1 - i) * 0.0) * (0.78 + 0.22 * ((i + 1) / n)) * k;
    const sy = y + i * sh;
    g.fillStyle = rgb(shift(col, 18 - i * 4 + (r() - 0.5) * 8));
    g.fillRect(cx - sw / 2, sy, sw, sh * 0.62);
    g.fillStyle = rgb(shift(col, -26));
    g.fillRect(cx - sw / 2, sy + sh * 0.62, sw, sh * 0.38);
    g.fillStyle = 'rgba(255,248,230,.3)';
    g.fillRect(cx - sw / 2 + 1, sy + 0.5, sw - 2, 1.4);
    g.strokeStyle = 'rgba(20,12,6,.8)';
    g.lineWidth = 1.2;
    g.strokeRect(cx - sw / 2, sy, sw, sh);
    g.fillStyle = 'rgba(20,12,6,.14)';
    g.fillRect(cx - sw / 2 + sw * 0.55, sy, sw * 0.45, sh * 0.62);
  }
}

export function ringHandle(g: G, x: number, y: number, s: number, col: RGB = [184, 150, 70]): void {
  g.fillStyle = 'rgba(8,4,0,.5)';
  g.beginPath(); g.arc(x + s * 0.2, y + s * 0.3, s * 0.45, 0, 7); g.fill();
  g.fillStyle = rgb(shift(col, -30));
  g.beginPath(); g.arc(x, y, s * 0.42, 0, 7); g.fill();
  g.strokeStyle = 'rgba(8,4,0,.85)';
  g.lineWidth = s * 0.3;
  g.beginPath(); g.arc(x, y + s * 0.5, s * 0.52, 0, 7); g.stroke();
  g.strokeStyle = rgb(shift(col, 20));
  g.lineWidth = s * 0.2;
  g.beginPath(); g.arc(x, y + s * 0.5, s * 0.52, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(255,250,220,.75)';
  g.lineWidth = s * 0.07;
  g.beginPath(); g.arc(x, y + s * 0.5, s * 0.52, 3.6, 4.5); g.stroke();
}

/** Jernbånd med nitter og krøllet ende. */
export function strap(g: G, x: number, y: number, len: number, th: number, curl: boolean): void {
  rectBody(g, x, y, len, th, th * 0.25, IRON, { lw: 1.1, ao: 1 });
  for (let i = 0; i < 3; i++) rivet(g, x + len * (0.14 + 0.36 * i), y + th / 2, th * 0.2, [150, 150, 158]);
  if (curl) {
    for (const s of [-1, 1]) {
      g.strokeStyle = 'rgba(10,6,2,.85)';
      g.lineWidth = th * 0.26;
      g.beginPath();
      g.arc(x + len, y + th / 2 + s * th * 0.4, th * 0.4, -1, 3.4);
      g.stroke();
    }
  }
}

export function glassPane(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle = lin(g, x, y, x + w, y + h, [[0, 'rgb(184,226,236)'], [0.5, 'rgb(100,160,184)'], [1, 'rgb(40,80,104)']]);
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.beginPath();
  g.moveTo(x + w * 0.1, y); g.lineTo(x + w * 0.5, y); g.lineTo(x, y + h * 0.55); g.lineTo(x, y + h * 0.2);
  g.fill();
}

// ------------------------------------------------------------------ bladene

export type Style = 'plank' | 'strap' | 'studded' | 'panel' | 'stable' | 'iron' | 'bars' | 'cell' | 'glazed';

export function leaf(g: G, r: Rnd, x: number, y: number, w: number, h: number, wood: RGB, style: Style, wear: number, hingeLeft: boolean): void {
  if (style === 'iron' || style === 'cell') {
    // jernplader
    const base: RGB = [92, 96, 106];
    const rows = style === 'cell' ? 3 : 2;
    const ph = h / rows;
    for (let j = 0; j < rows; j++) {
      rectBody(g, x + 0.5, y + j * ph + 0.5, w - 1, ph - 1, 1.5, shift(base, (r() - 0.5) * 14), { lw: 1.2, ao: 1.6 });
      for (const [fx, fy] of [[0.1, 0.12], [0.9, 0.12], [0.1, 0.88], [0.9, 0.88]] as const) rivet(g, x + w * fx, y + j * ph + ph * fy, Math.max(1.3, w * 0.025), [150, 152, 160]);
    }
    clipped(g, rectPath(g, x, y, w, h), () => {
      mottle(g, r, [x, y, x + w, y + h], [128, 74, 44], Math.round(wear * 26), w * 0.07, 24, 0.5);
      g.fillStyle = lin(g, x, y, x + w, y + h, [[0, 'rgba(255,255,255,.14)'], [0.35, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.3)']]);
      g.fillRect(x, y, w, h);
    });
    if (style === 'cell') {
      const gw = w * 0.4;
      const gh = h * 0.18;
      const gx = x + (w - gw) / 2;
      const gy = y + h * 0.16;
      g.fillStyle = 'rgb(8,6,6)';
      g.fillRect(gx, gy, gw, gh);
      g.strokeStyle = 'rgb(120,124,134)';
      g.lineWidth = 1.8;
      g.beginPath();
      for (let i = 1; i < 4; i++) { g.moveTo(gx + (i / 4) * gw, gy); g.lineTo(gx + (i / 4) * gw, gy + gh); }
      g.stroke();
      g.strokeStyle = OUT;
      g.lineWidth = 1.6;
      g.strokeRect(gx, gy, gw, gh);
    }
    return;
  }
  if (style === 'bars') {
    g.fillStyle = 'rgb(10,8,8)';
    g.fillRect(x, y, w, h);
    const n = Math.max(3, Math.round(w / 9));
    for (let i = 0; i < n; i++) {
      const bx = x + ((i + 0.5) / n) * w;
      tube(g, () => { g.beginPath(); g.moveTo(bx, y); g.lineTo(bx, y + h); }, Math.max(2.4, w * 0.045), IRON, { outline: 1.2, round: false });
    }
    for (const t of [0.22, 0.78]) tube(g, () => { g.beginPath(); g.moveTo(x, y + h * t); g.lineTo(x + w, y + h * t); }, Math.max(3, w * 0.055), IRON, { outline: 1.2, round: false });
    for (let i = 0; i < n; i++) {
      const bx = x + ((i + 0.5) / n) * w;
      g.fillStyle = rgb(shift(IRON, 30));
      g.beginPath(); g.moveTo(bx - 2.2, y + 0.5); g.lineTo(bx, y - 3); g.lineTo(bx + 2.2, y + 0.5); g.fill();
    }
    return;
  }
  const count = Math.max(3, Math.round(w / (style === 'plank' ? 11 : 9)));
  plankBoard(g, r, x, y, w, h, style === 'panel' || style === 'glazed' ? wood : wood, count, { vertical: true, nails: style === 'plank', wear });
  if (style === 'panel' || style === 'glazed') {
    // fyldinger med fas
    const cols = 1;
    const rowsP = style === 'glazed' ? 1 : 2;
    const mx = w * 0.16;
    const my = h * 0.07;
    const ph = (h - my * (rowsP + 1)) / rowsP;
    for (let c = 0; c < cols; c++) {
      for (let j = 0; j < rowsP; j++) {
        const px = x + mx;
        const py = y + my + j * (ph + my) + (style === 'glazed' ? h * 0.3 : 0);
        const phh = style === 'glazed' ? h * 0.62 - my : ph;
        rectBody(g, px, py, w - mx * 2, phh, 2, shift(wood, -10), { lw: 1.2, ao: 2 });
        g.strokeStyle = 'rgba(255,240,205,.3)';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(px + 1, py + phh - 1); g.lineTo(px + 1, py + 1); g.lineTo(px + w - mx * 2 - 1, py + 1); g.stroke();
      }
    }
    if (style === 'glazed') {
      glassPane(g, x + w * 0.24, y + h * 0.08, w * 0.52, h * 0.2);
      g.strokeStyle = rgb(shift(wood, -30));
      g.lineWidth = 1.6;
      g.strokeRect(x + w * 0.24, y + h * 0.08, w * 0.52, h * 0.2);
      g.beginPath(); g.moveTo(x + w * 0.5, y + h * 0.08); g.lineTo(x + w * 0.5, y + h * 0.28); g.stroke();
    }
    return;
  }
  const hl = hingeLeft;
  const sx = hl ? x : x + w * 0.28;
  const sl = w * 0.72;
  if (style === 'strap') {
    for (const t of [0.14, 0.76]) {
      g.save();
      if (!hl) { g.translate(x + w, 0); g.scale(-1, 1); g.translate(-x, 0); strap(g, x, y + h * t, sl, Math.max(4, h * 0.07), true); }
      else strap(g, sx, y + h * t, sl, Math.max(4, h * 0.07), true);
      g.restore();
    }
  } else if (style === 'studded') {
    for (const t of [0.12, 0.8]) rectBody(g, x, y + h * t, w, h * 0.07, 1, IRON, { lw: 1, ao: 1 });
    const cx = Math.max(2, Math.round(w / 12));
    const cy = Math.max(3, Math.round(h / 16));
    for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) rivet(g, x + ((i + 0.5) / cx) * w, y + ((j + 0.5) / cy) * h, Math.max(1.4, w * 0.026), [170, 160, 140]);
  } else if (style === 'stable') {
    // Z-bånd: to vandrette planker og en skrå
    const th = Math.max(5, h * 0.09);
    for (const t of [0.1, 0.82]) rectBody(g, x + 1, y + h * t, w - 2, th, 1, shift(wood, -14), { lw: 1, ao: 1.4 });
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.translate(x + w / 2, y + h / 2);
    g.rotate(Math.atan2(h * 0.72, w));
    rectBody(g, -Math.hypot(w, h * 0.72) / 2, -th / 2, Math.hypot(w, h * 0.72), th, 1, shift(wood, -8), { lw: 1, ao: 1.4 });
    g.restore();
    for (const [fx, fy] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.82], [0.9, 0.82]] as const) rivet(g, x + w * fx, y + h * fy + th / 2, 1.5, [110, 100, 90]);
  }
}

// ------------------------------------------------------------------ dørblok

interface Cfg {
  leaves: 1 | 2;
  frame: 'stone' | 'timber' | 'plain';
  style: Style;
  arch?: boolean;
  steps?: number;
  transom?: boolean;
  lantern?: boolean;
  /** Dørens bredde som andel af kassen. */
  open?: boolean;
}

function doorBlock(g: G, o: DrawInput, c: Cfg): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const wood = woodOf(o);
  const wear = param(o, 'wear', 0.3);
  const open = param(o, 'open', false);
  const n = c.steps ?? 0;
  const stepsH = n ? h * 0.05 * n + 2 : 0;
  const fh = h - stepsH;
  const x0 = -w / 2;
  const y0 = -h / 2;
  const t = w * (c.frame === 'timber' ? 0.1 : 0.14);
  const ox = x0 + t;
  const ow = w - 2 * t;
  const oy = y0 + t * (c.arch ? 0.8 : 1.0);
  const oh = fh - t * (c.arch ? 0.8 : 1.0) - (n ? 0 : 0);
  // væg/ramme
  if (c.frame === 'stone') {
    rectBody(g, x0, y0, w, fh, 3, STONE, { lw: 1.8, ao: 2.4 });
    clipped(g, rectPath(g, x0, y0, w, fh, 3), () => masonry(g, r, x0, y0, w, fh, STONE, Math.max(8, w * 0.1), wear * 0.5));
    if (!c.arch) {
      // overligger og slutsten
      rectBody(g, x0 + t * 0.2, y0 + t * 0.15, w - t * 0.4, t * 0.9, 2, shift(STONE, 8), { lw: 1.4, ao: 1.6 });
      rectBody(g, -t * 0.55, y0 + t * 0.1, t * 1.1, t * 1.05, 2, shift(STONE, 18), { lw: 1.4, ao: 1.4 });
    } else {
      g.strokeStyle = 'rgba(24,16,10,.8)';
      g.lineWidth = 1.4;
      const cx = 0;
      const cy = oy + ow / 2;
      g.beginPath();
      for (let i = 1; i < 9; i++) {
        const a = Math.PI + (i / 9) * Math.PI;
        g.moveTo(cx + Math.cos(a) * ow / 2, cy + Math.sin(a) * ow / 2);
        g.lineTo(cx + Math.cos(a) * (ow / 2 + t * 0.95), cy + Math.sin(a) * (ow / 2 + t * 0.95));
      }
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, ow / 2 + t * 0.95, Math.PI, 0);
      g.stroke();
    }
  } else if (c.frame === 'timber') {
    rectBody(g, x0, y0, w, fh, 2, PLASTER, { lw: 1.8, ao: 2 });
    clipped(g, rectPath(g, x0, y0, w, fh), () => mottle(g, r, [x0, y0, x0 + w, y0 + fh], PLASTER, 26, w * 0.05, 14, 0.35));
    const beam: RGB = [88, 60, 38];
    rectBody(g, x0, y0, t * 0.9, fh, 1.5, beam, { lw: 1.4, ao: 1.4 });
    rectBody(g, x0 + w - t * 0.9, y0, t * 0.9, fh, 1.5, beam, { lw: 1.4, ao: 1.4 });
    rectBody(g, x0, y0, w, t * 0.9, 1.5, beam, { lw: 1.4, ao: 1.4 });
    rectBody(g, ox - 2, y0 + t * 0.8, ow + 4, 3, 1, shift(beam, 10), { lw: 1 });
  } else {
    rectBody(g, x0, y0, w, fh, 2, shift(wood, -30), { lw: 1.8, ao: 2 });
    clipped(g, rectPath(g, x0, y0, w, fh), () => mottle(g, r, [x0, y0, x0 + w, y0 + fh], wood, 12, w * 0.06, 14, 0.3));
  }
  // åbning med bagved (mørk) og bladene
  const path = openingPath(g, ox, oy, ow, oh, !!c.arch);
  path();
  g.fillStyle = 'rgb(16,10,8)';
  g.fill();
  const tr = c.transom ? oh * 0.2 : 0;
  clipped(g, path, () => {
    const ly = oy + tr + (c.arch ? ow * 0.0 : 0);
    const lh = oh - tr;
    if (c.transom) {
      // vifte-/overvindue: glas med sprosser
      glassPane(g, ox, oy, ow, tr);
      g.strokeStyle = rgb(shift(wood, -34));
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 1; i < 4; i++) { g.moveTo(ox + (i / 4) * ow, oy); g.lineTo(ox + (i / 4) * ow, oy + tr); }
      g.stroke();
      g.fillStyle = rgb(shift(wood, -20));
      g.fillRect(ox, oy + tr - 2, ow, 4);
    }
    if (open) {
      // set ind i et oplyst rum, bladene slået ind mod væggen
      g.fillStyle = radial(g, ox + ow / 2, ly + lh * 0.7, ow, [[0, 'rgb(255,214,140)'], [0.45, 'rgb(150,100,56)'], [1, 'rgb(24,14,10)']]);
      g.fillRect(ox, ly, ow, lh);
      g.fillStyle = 'rgba(80,50,28,.7)';
      g.fillRect(ox, ly + lh * 0.82, ow, lh * 0.18);
      const lw = ow * 0.2;
      g.fillStyle = rgb(shift(wood, -10));
      g.beginPath();
      g.moveTo(ox, ly); g.lineTo(ox + lw, ly + lh * 0.05); g.lineTo(ox + lw, ly + lh * 0.97); g.lineTo(ox, ly + lh);
      g.closePath(); g.fill();
      g.strokeStyle = OUT; g.lineWidth = 1.4; g.stroke();
      if (c.leaves === 2) {
        g.fillStyle = rgb(shift(wood, -34));
        g.beginPath();
        g.moveTo(ox + ow, ly); g.lineTo(ox + ow - lw, ly + lh * 0.05); g.lineTo(ox + ow - lw, ly + lh * 0.97); g.lineTo(ox + ow, ly + lh);
        g.closePath(); g.fill(); g.stroke();
      }
    } else if (c.leaves === 1) {
      leaf(g, r, ox, ly, ow, lh, wood, c.style, wear, true);
      for (const t2 of [0.12, 0.78]) {
        g.fillStyle = 'rgba(0,0,0,.55)';
        g.fillRect(ox, ly + lh * t2 + 1, 2.4, lh * 0.08);
      }
      ringHandle(g, ox + ow * 0.8, ly + lh * 0.52, Math.max(4.5, ow * 0.08));
    } else {
      const lw = ow / 2;
      leaf(g, r, ox, ly, lw, lh, wood, c.style, wear, true);
      leaf(g, r, ox + lw, ly, lw, lh, wood, c.style, wear, false);
      g.fillStyle = 'rgba(0,0,0,.6)';
      g.fillRect(ox + lw - 1.2, ly, 2.4, lh);
      g.fillStyle = 'rgba(255,240,205,.18)';
      g.fillRect(ox + lw + 1.2, ly, 1, lh);
      ringHandle(g, ox + lw - ow * 0.07, ly + lh * 0.52, Math.max(4.5, ow * 0.06));
      ringHandle(g, ox + lw + ow * 0.07, ly + lh * 0.52, Math.max(4.5, ow * 0.06));
    }
  });
  innerShade(g, path, Math.max(3, ow * 0.05));
  // bund: tærskel og trin
  if (c.lantern) {
    const lx = ox + ow + t * 0.5;
    g.fillStyle = 'rgba(255,200,100,.25)';
    g.beginPath(); g.arc(lx, oy + oh * 0.3, t * 1.3, 0, 7); g.fill();
    rectBody(g, lx - 3, oy + oh * 0.3 - 5, 6, 10, 1.5, [60, 50, 40], { lw: 1 });
    g.fillStyle = 'rgb(255,214,120)';
    g.fillRect(lx - 1.8, oy + oh * 0.3 - 3, 3.6, 6);
  }
  if (n) steps(g, r, 0, y0 + fh - 1, w * 0.96, stepsH, n, STONE);
  else {
    rectBody(g, ox - 2, y0 + fh - 4, ow + 4, 4, 1, shift(STONE, 14), { lw: 1.2 });
  }
}

const frameKind = (def: { key: string; name: string; w: number; h: number; tags: string[] } & Cfg & { params?: ParamDef[] }): ObjectKind =>
  kind({
    key: def.key, family: 'door', name: def.name, w: def.w, h: def.h, shadow: 0, bleed: 0.02, randomRotation: false, tags: def.tags,
    params: def.params ?? [woodParam, openParam, wearParam],
    draw: (g, o) => doorBlock(g, o, def),
  });

export const doorBlockKinds: ObjectKind[] = [
  frameKind({ key: 'door_single', name: 'Enkeltdør, planker', w: 1.2, h: 1.8, leaves: 1, frame: 'stone', style: 'strap', steps: 1, tags: ['village', 'city', 'house', 'indoor'] }),
  frameKind({ key: 'door_single_panel', name: 'Fyldingsdør', w: 1.2, h: 1.9, leaves: 1, frame: 'stone', style: 'panel', steps: 1, tags: ['city', 'house', 'rich'] }),
  frameKind({ key: 'door_double', name: 'Dobbeltdør', w: 2.2, h: 2.1, leaves: 2, frame: 'stone', style: 'strap', steps: 2, tags: ['city', 'tavern', 'house', 'rich'] }),
  frameKind({ key: 'door_front', name: 'Hoveddør med trin', w: 1.8, h: 2.4, leaves: 1, frame: 'timber', style: 'glazed', transom: true, steps: 3, lantern: true, tags: ['village', 'city', 'house', 'tavern'] }),
  frameKind({ key: 'door_arch', name: 'Buet dør, studs', w: 1.6, h: 2.2, leaves: 1, frame: 'stone', style: 'studded', arch: true, steps: 2, tags: ['city', 'temple', 'military', 'house'] }),
  frameKind({ key: 'door_church', name: 'Kirkeport', w: 2.4, h: 3.2, leaves: 2, frame: 'stone', style: 'studded', arch: true, steps: 3, tags: ['temple', 'city', 'rich', 'village'] }),
  frameKind({ key: 'door_stable', name: 'Staldport', w: 2.4, h: 2.2, leaves: 2, frame: 'timber', style: 'stable', steps: 0, tags: ['farm', 'village', 'poor'] }),
  frameKind({ key: 'door_castle', name: 'Slotsport', w: 3.4, h: 3.8, leaves: 2, frame: 'stone', style: 'studded', arch: true, steps: 3, tags: ['military', 'city', 'rich'] }),
  frameKind({ key: 'door_iron', name: 'Jerndør', w: 1.3, h: 1.9, leaves: 1, frame: 'stone', style: 'iron', steps: 1, params: [openParam, wearParam], tags: ['dungeon', 'military', 'crypt'] }),
  frameKind({ key: 'door_iron_double', name: 'Dobbelt jernport', w: 2.4, h: 2.3, leaves: 2, frame: 'stone', style: 'iron', steps: 1, params: [openParam, wearParam], tags: ['dungeon', 'military', 'crypt'] }),
  frameKind({ key: 'door_cell', name: 'Celledør', w: 1.2, h: 1.9, leaves: 1, frame: 'stone', style: 'cell', steps: 0, params: [openParam, wearParam], tags: ['dungeon', 'military'] }),
  frameKind({ key: 'door_bars', name: 'Gitterdør', w: 1.3, h: 1.9, leaves: 1, frame: 'stone', style: 'bars', steps: 0, params: [openParam, wearParam], tags: ['dungeon', 'crypt', 'military'] }),
  frameKind({ key: 'door_cottage', name: 'Hytteport, brædder', w: 1.1, h: 1.7, leaves: 1, frame: 'plain', style: 'plank', steps: 0, tags: ['village', 'poor', 'forest', 'farm'] }),
];
