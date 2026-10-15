import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { blobPath, ear, eggPts, ellBody, eye, furBody, mottle, pick, rgb, shift, tone, tube, type G, type RGB, type Rnd } from './kit';
import { body, polyBody } from '../pack2/helpers';

/** Levende husdyr og vildt set oppefra: stående (hoved op) og liggende/sovende. */

type EarKind = 'point' | 'flop' | 'side' | 'round' | 'long';
type TailKind = 'whip' | 'bushy' | 'curl' | 'tuft' | 'short' | 'none';

interface Cfg {
  fur: RGB;
  belly?: RGB;
  spots?: RGB;
  spotN?: number;
  face?: RGB;
  mane?: RGB;
  /** Andele af højden: hoved, hals, krop, hale (normaliseres). */
  head: number;
  neck: number;
  bodyL: number;
  tail: number;
  /** Bredder som andel af boksens bredde. */
  bw: number;
  hw: number;
  snout: number;
  ear: EarKind;
  earS: number;
  tailK: TailKind;
  tailC?: RGB;
  hoof?: boolean;
  legW: number;
  horns?: 'cow' | 'goat' | 'ram';
  wool?: boolean;
  beard?: boolean;
  stripes?: boolean;
  pose?: 'stand' | 'lie';
  snoutCol?: RGB;
  narrow?: number;
}

/** Fødder (hove/poter), der titter frem under kroppen. */
function paws(g: G, r: Rnd, c: Cfg, cx: number, ys: number[], rx: number, walk: boolean): void {
  const col: RGB = c.hoof ? [48, 38, 32] : shift(c.fur, -28);
  ys.forEach((y, i) => {
    for (const s of [-1, 1]) {
      const off = walk ? (((i + (s > 0 ? 1 : 0)) % 2) * 2 - 1) * c.legW * 0.9 : 0;
      ellBody(g, cx + s * rx, y + off, c.legW * 0.62, c.legW * (c.hoof ? 0.85 : 0.95), col, { lw: 1, ao: 0.5, rim: 0.4 });
    }
  });
}

function tail(g: G, r: Rnd, c: Cfg, x: number, y: number, len: number, wid: number): void {
  const col = c.tailC ?? c.mane ?? shift(c.fur, -14);
  const sway = (r() - 0.5) * len * 0.6;
  switch (c.tailK) {
    case 'whip':
      tube(g, () => {
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + sway, y + len * 0.6, x + sway * 1.4, y + len);
      }, wid * 0.55, col, { outline: 1.3 });
      break;
    case 'bushy': {
      const p = () => {
        g.beginPath();
        g.moveTo(x - wid * 0.4, y);
        g.quadraticCurveTo(x + sway - wid * 1.2, y + len * 0.6, x + sway, y + len);
        g.quadraticCurveTo(x + sway + wid * 1.2, y + len * 0.6, x + wid * 0.4, y);
        g.closePath();
      };
      body(g, p, col, [x - wid, y, x + wid, y + len], { lw: 1.3, ao: 1 });
      break;
    }
    case 'curl':
      tube(g, () => {
        g.beginPath();
        g.arc(x + wid * 0.5, y + wid * 0.3, wid * 0.5, Math.PI * 1.1, Math.PI * 3.1);
      }, wid * 0.28, col, { outline: 1 });
      break;
    case 'tuft': {
      tube(g, () => {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + sway * 0.3, y + len * 0.7);
      }, wid * 0.3, shift(c.fur, -20), { outline: 1 });
      ellBody(g, x + sway * 0.3, y + len * 0.85, wid * 0.55, len * 0.32, col, { lw: 1, ao: 0.6 });
      break;
    }
    case 'short':
      ellBody(g, x, y + len * 0.3, wid * 0.4, len * 0.45, col, { lw: 1, ao: 0.5 });
      break;
    default:
  }
}

function snoutOf(g: G, c: Cfg, hx: number, hy: number, hw: number, hl: number): void {
  const col = c.snoutCol ?? c.face ?? shift(c.fur, -6);
  const sw = hw * (0.55 - c.snout * 0.18);
  const sl = hl * (0.3 + c.snout * 0.4);
  ellBody(g, hx, hy - hl * 0.5 + sl * 0.15, sw, sl, col, { lw: 1.2, ao: 0.8, rim: 0.5 });
  g.fillStyle = 'rgba(14,8,6,.8)';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(hx + s * sw * 0.42, hy - hl * 0.5 - sl * 0.45, sw * 0.16, sw * 0.12, 0, 0, 7);
    g.fill();
  }
}

function earsOf(g: G, c: Cfg, hx: number, hy: number, hw: number, hl: number): void {
  const col = shift(c.face ?? c.fur, -8);
  const inner: RGB = [214, 150, 140];
  for (const s of [-1, 1]) {
    const ex = hx + s * hw * 0.78;
    const ey = hy + hl * 0.1;
    switch (c.ear) {
      case 'point':
        ear(g, ex, ey, s > 0 ? -0.9 : Math.PI + 0.9, hl * 0.55 * c.earS, hw * 0.38, col, inner);
        break;
      case 'long':
        ear(g, ex, ey + hl * 0.12, s > 0 ? -0.35 : Math.PI + 0.35, hl * 0.95 * c.earS, hw * 0.3, col, inner);
        break;
      case 'side':
        ear(g, ex, ey, s > 0 ? -0.15 : Math.PI + 0.15, hl * 0.55 * c.earS, hw * 0.3, col, inner);
        break;
      case 'flop':
        ear(g, ex - s * hw * 0.2, ey + hl * 0.05, s > 0 ? 0.5 : Math.PI - 0.5, hl * 0.62 * c.earS, hw * 0.4, shift(col, -14));
        break;
      case 'round':
        ellBody(g, ex, ey, hw * 0.3 * c.earS, hw * 0.32 * c.earS, col, { lw: 1, ao: 0.5 });
        break;
    }
  }
}

function hornsOf(g: G, c: Cfg, hx: number, hy: number, hw: number): void {
  const horn: RGB = c.horns === 'goat' ? [112, 98, 80] : [226, 214, 182];
  for (const s of [-1, 1]) {
    if (c.horns === 'ram') {
      tube(g, () => {
        g.beginPath();
        g.arc(hx + s * hw * 0.95, hy + hw * 0.55, hw * 0.55, s > 0 ? -2.4 : -0.74, s > 0 ? 1.9 : 5.4, s < 0);
      }, hw * 0.3, [190, 168, 126], { outline: 1.5 });
    } else if (c.horns === 'goat') {
      tube(g, () => {
        g.beginPath();
        g.moveTo(hx + s * hw * 0.35, hy + hw * 0.3);
        g.quadraticCurveTo(hx + s * hw * 0.9, hy + hw * 1.5, hx + s * hw * 0.35, hy + hw * 2.2);
      }, hw * 0.22, horn, { outline: 1.3 });
    } else {
      tube(g, () => {
        g.beginPath();
        g.moveTo(hx + s * hw * 0.7, hy + hw * 0.1);
        g.quadraticCurveTo(hx + s * hw * 1.5, hy - hw * 0.1, hx + s * hw * 1.4, hy - hw * 0.9);
      }, hw * 0.24, horn, { outline: 1.3 });
    }
  }
}

function woolPuffs(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, col: RGB): void {
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * 0.82;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    const s = Math.min(rx, ry) * (0.26 + r() * 0.12);
    g.beginPath();
    g.arc(x, y, s, 0, 7);
    g.fillStyle = `rgba(30,18,8,.45)`;
    g.fill();
    g.beginPath();
    g.arc(x - s * 0.1, y - s * 0.12, s * 0.92, 0, 7);
    g.fillStyle = rgb(shift(col, (r() - 0.5) * 22), 1);
    g.fill();
    g.beginPath();
    g.arc(x - s * 0.3, y - s * 0.35, s * 0.4, 0, 7);
    g.fillStyle = 'rgba(255,252,240,.35)';
    g.fill();
  }
}

/** Stående dyr, hoved op (negativ y), set oppefra. */
function standing(g: G, o: DrawInput, c: Cfg, walk: boolean, graze: boolean): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const headF = graze ? c.head * 0.8 : c.head;
  const neckF = graze ? c.neck * 0.15 : c.neck;
  const sum = headF + neckF + c.bodyL + c.tail * 0.95;
  const k = H / sum;
  const hlTot = headF * k;
  const hl = hlTot * 0.68;
  const nl = neckF * k;
  const hlx = hlTot;
  const bl = c.bodyL * k;
  const top = -H / 2;
  const hx = (graze ? 0.35 : 0.0) * W * 0 + (r() - 0.5) * W * 0.04;
  const hy = top + hlTot * 0.66 + (graze ? 0.12 * H : 0);
  const by = top + hlx + nl + bl / 2 - (graze ? hlTot * 0.35 : 0);
  const brx = (W * c.bw) / 2;
  const bry = bl / 2;
  const hw = (W * c.hw) / 2;
  // hove under kroppen
  paws(g, r, c, 0, [by - bry * 0.5, by + bry * 0.55], brx * 0.82, walk);
  // hale
  tail(g, r, c, 0, by + bry * 0.88, c.tail * k, brx * 0.72);
  // hals (går ind under kroppen)
  if (nl > 0 || graze) {
    const nw = hw * (c.mane ? 1.05 : 1.2);
    const path = () => {
      g.beginPath();
      g.moveTo(hx - hw * 1.1, hy);
      g.lineTo(hx + hw * 1.1, hy);
      g.lineTo(brx * 0.7, by - bry * 0.5);
      g.lineTo(-brx * 0.7, by - bry * 0.5);
      g.closePath();
    };
    body(g, path, shift(c.fur, -4), [-brx, hy, brx, by], { lw: 1.4, ao: 2 });
    void nw;
  }
  // krop
  const pts = eggPts(r, 0, by, brx, bry, c.narrow ?? 0.22);
  if (c.wool) {
    g.save();
    woolPuffs(g, r, 0, by, brx * 1.04, bry * 1.02, c.fur);
    g.restore();
  } else {
    furBody(g, r, blobPath(g, pts), [-brx, by - bry, brx, by + bry], c.fur, { spots: c.spots, spotN: c.spotN, belly: c.belly, spine: c.stripes ? shift(c.fur, -48) : undefined, lw: 1.6, ao: Math.max(2, brx * 0.14) });
  }
  // manke langs halsen og ryggen
  if (c.mane && nl > 0) {
    const mx = [hx, hx * 0.5, 0];
    g.save();
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const y = hy + hl * 0.2 + t * (by - bry * 0.1 - hy - hl * 0.2);
      const x = mx[0]! * (1 - t) + 0 * t + (r() - 0.5) * hw * 0.3;
      g.strokeStyle = rgb(shift(c.mane, (r() - 0.5) * 24), 0.9);
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * hw * 0.9, y + hl * 0.12 + r() * 3);
      g.stroke();
    }
    g.restore();
  }
  // hoved
  const headPath = () => {
    g.beginPath();
    g.moveTo(hx - hw * 0.5, hy - hl * 0.5);
    g.quadraticCurveTo(hx - hw * 1.1, hy + hl * 0.05, hx - hw * 0.9, hy + hl * 0.45);
    g.quadraticCurveTo(hx, hy + hl * 0.62, hx + hw * 0.9, hy + hl * 0.45);
    g.quadraticCurveTo(hx + hw * 1.1, hy + hl * 0.05, hx + hw * 0.5, hy - hl * 0.5);
    g.closePath();
  };
  earsOf(g, c, hx, hy + hl * 0.2, hw, hl);
  if (c.horns) hornsOf(g, c, hx, hy + hl * 0.15, hw);
  body(g, headPath, c.face ?? shift(c.fur, 2), [hx - hw, hy - hl / 2, hx + hw, hy + hl / 2], { lw: 1.4, ao: 1.4 });
  if (c.stripes) {
    g.strokeStyle = 'rgba(30,20,10,.35)';
    g.lineWidth = 1.2;
    for (const s of [-0.3, 0, 0.3]) {
      g.beginPath();
      g.moveTo(hx + s * hw, hy - hl * 0.3);
      g.lineTo(hx + s * hw * 1.3, hy + hl * 0.2);
      g.stroke();
    }
  }
  snoutOf(g, c, hx, hy, hw, hl);
  if (c.beard) {
    polyBody(g, [[hx - hw * 0.18, hy - hl * 0.55], [hx + hw * 0.18, hy - hl * 0.55], [hx, hy - hl * 0.9]], [196, 188, 170], { lw: 0.9, ao: 0.3, rim: 0.2 });
  }
  eye(g, hx - hw * 0.62, hy + hl * 0.02, Math.max(1.1, hw * 0.14));
  eye(g, hx + hw * 0.62, hy + hl * 0.02, Math.max(1.1, hw * 0.14));
  if (graze) {
    // græstotter foran munden
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
      g.strokeStyle = rgb([96 + r() * 40, 150 + r() * 40, 50], 0.95);
      g.lineWidth = 1.2;
      g.beginPath();
      const sx = hx + (r() - 0.5) * hw;
      const sy = hy - hl * 0.58;
      g.moveTo(sx, sy);
      g.lineTo(sx + Math.cos(a) * hl * 0.3, sy + Math.sin(a) * hl * 0.34);
      g.stroke();
    }
  }
}

/** Liggende dyr: sammenrullet på siden, hoved hvilende. Boksen er bredere end høj. */
function lying(g: G, o: DrawInput, c: Cfg): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const brx = W * 0.36;
  const bry = H * 0.36;
  const by = H * 0.08;
  const bx = W * 0.1;
  const flip = r() < 0.5 ? -1 : 1;
  g.save();
  g.scale(flip, 1);
  // sammenfoldede ben
  for (const [x, y] of [[-brx * 0.5, bry * 0.95], [brx * 0.35, bry * 1.0], [-brx * 0.15, -bry * 0.9]] as [number, number][]) {
    ellBody(g, bx + x, by + y * 0.9, c.legW * 1.1, c.legW * 0.9, c.hoof ? shift(c.fur, -22) : shift(c.fur, -14), { lw: 1.1, ao: 0.6 });
  }
  tail(g, r, c, bx + brx * 0.9, by + bry * 0.35, W * 0.2, bry * 0.4);
  // krop
  const rot = (r() - 0.5) * 0.3;
  g.save();
  g.translate(bx, by);
  g.rotate(rot);
  const pts = eggPts(r, 0, 0, brx, bry, 0, 18, 0.04);
  if (c.wool) woolPuffs(g, r, 0, 0, brx * 1.02, bry * 1.02, c.fur);
  else furBody(g, r, blobPath(g, pts), [-brx, -bry, brx, bry], c.fur, { spots: c.spots, spotN: c.spotN, belly: c.belly, dir: 0, lw: 1.6, ao: bry * 0.12 });
  g.restore();
  // hoved lagt foran til venstre
  const hw = H * c.hw * 1.15;
  const hl = hw * (1.5 + c.snout * 0.8);
  const hx = bx - brx * 0.98;
  const hy = by + bry * (0.05 + (r() - 0.5) * 0.3);
  g.save();
  g.translate(hx, hy);
  g.rotate(-1.45 + (r() - 0.5) * 0.4);
  const headPath = () => {
    g.beginPath();
    g.moveTo(-hw * 0.5, -hl * 0.5);
    g.quadraticCurveTo(-hw * 1.1, hl * 0.05, -hw * 0.9, hl * 0.45);
    g.quadraticCurveTo(0, hl * 0.62, hw * 0.9, hl * 0.45);
    g.quadraticCurveTo(hw * 1.1, hl * 0.05, hw * 0.5, -hl * 0.5);
    g.closePath();
  };
  earsOf(g, c, 0, hl * 0.15, hw, hl);
  if (c.horns) hornsOf(g, c, 0, hl * 0.1, hw);
  body(g, headPath, c.face ?? shift(c.fur, 2), [-hw, -hl / 2, hw, hl / 2], { lw: 1.4, ao: 1.2 });
  snoutOf(g, c, 0, 0, hw, hl);
  // lukkede øjne
  g.strokeStyle = 'rgba(20,10,5,.85)';
  g.lineWidth = 1.2;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(s * hw * 0.55, hl * 0.04, hw * 0.16, 0.2, Math.PI - 0.2);
    g.stroke();
  }
  g.restore();
  g.restore();
}

function present(c: Cfg, o: DrawInput): void {
  void c;
  void o;
}
void present;

// ---------------------------------------------------------------- arter

const poseParam: ParamDef = { key: 'pose', label: 'Stilling', type: 'select', default: 'stand', options: [{ value: 'stand', label: 'Står' }, { value: 'walk', label: 'Går' }, { value: 'graze', label: 'Æder' }] };

function coatPick(r: Rnd, list: RGB[]): RGB {
  return tone(r, pick(r, list), 10);
}

function run(g: G, o: DrawInput, c: Cfg): void {
  const p = param(o, 'pose', 'stand');
  standing(g, o, c, p === 'walk', p === 'graze');
}

const HORSE_COATS: Record<string, RGB[]> = {
  bay: [[128, 78, 44]],
  black: [[48, 40, 38]],
  white: [[214, 210, 200]],
  chestnut: [[168, 98, 46]],
  dun: [[190, 160, 110]],
  grey: [[150, 150, 152]],
};

function horse(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x51);
  const sel = param(o, 'coat', 'auto');
  const fur = coatPick(r, sel === 'auto' ? Object.values(HORSE_COATS).flat() : HORSE_COATS[sel] ?? HORSE_COATS.bay!);
  const maneC: RGB = fur[0] > 180 && fur[1] > 170 ? [190, 186, 176] : sel === 'chestnut' || sel === 'dun' ? [90, 58, 34] : shift(fur, -52);
  run(g, o, { fur, mane: maneC, tailC: maneC, face: shift(fur, 4), head: 0.22, neck: 0.2, bodyL: 0.42, tail: 0.3, bw: 0.6, hw: 0.33, snout: 0.9, ear: 'point', earS: 0.5, tailK: 'bushy', hoof: true, legW: o.w * 0.07, narrow: 0.12, snoutCol: shift(fur, -10) });
}
function cow(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x52);
  const sel = param(o, 'coat', 'spots');
  const spotted = sel === 'spots';
  const fur: RGB = spotted ? [236, 232, 222] : sel === 'brown' ? tone(r, [128, 82, 50], 10) : tone(r, [52, 44, 42], 8);
  run(g, o, { fur, spots: spotted ? [44, 36, 34] : undefined, spotN: 6, belly: undefined, head: 0.2, neck: 0.1, bodyL: 0.52, tail: 0.24, bw: 0.7, hw: 0.31, snout: 0.5, ear: 'side', earS: 0.6, tailK: 'tuft', tailC: [60, 44, 36], hoof: true, horns: 'cow', legW: o.w * 0.08, snoutCol: [226, 178, 166], face: spotted ? [232, 226, 216] : undefined });
}
function pig(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x53);
  const fur: RGB = param(o, 'coat', 'pink') === 'dark' ? tone(r, [96, 76, 70], 12) : param(o, 'coat', 'pink') === 'spots' ? tone(r, [228, 184, 170], 8) : tone(r, [228, 170, 160], 10);
  run(g, o, { fur, spots: param(o, 'coat', 'pink') === 'spots' ? [74, 56, 52] : undefined, spotN: 4, head: 0.22, neck: 0.04, bodyL: 0.58, tail: 0.14, bw: 0.7, hw: 0.28, snout: 0.35, ear: 'flop', earS: 0.8, tailK: 'curl', hoof: true, legW: o.w * 0.09, snoutCol: shift(fur, 14) });
}
function sheep(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x54);
  const dark = param(o, 'coat', 'white') === 'dark';
  const fur: RGB = dark ? tone(r, [74, 64, 58], 10) : tone(r, [232, 226, 210], 10);
  run(g, o, { fur, face: dark ? [52, 44, 40] : [64, 52, 46], wool: true, head: 0.2, neck: 0.05, bodyL: 0.55, tail: 0.1, bw: 0.7, hw: 0.2, snout: 0.45, ear: 'side', earS: 0.6, tailK: 'short', tailC: fur, hoof: true, legW: o.w * 0.08, horns: param(o, 'horns', false) ? 'ram' : undefined, snoutCol: [58, 46, 42] });
}
function goat(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x55);
  const fur = coatPick(r, [[214, 208, 196], [120, 90, 64], [64, 54, 50], [170, 140, 100]]);
  run(g, o, { fur, head: 0.22, neck: 0.12, bodyL: 0.46, tail: 0.1, bw: 0.6, hw: 0.27, snout: 0.5, ear: 'side', earS: 0.7, tailK: 'short', tailC: shift(fur, -10), hoof: true, legW: o.w * 0.07, horns: 'goat', beard: true, stripes: true });
}
function donkey(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x56);
  const fur = coatPick(r, [[130, 124, 118], [100, 92, 86], [160, 150, 140]]);
  run(g, o, { fur, mane: shift(fur, -44), tailC: shift(fur, -40), face: shift(fur, 6), head: 0.22, neck: 0.16, bodyL: 0.44, tail: 0.24, bw: 0.58, hw: 0.31, snout: 0.8, ear: 'long', earS: 1, tailK: 'tuft', hoof: true, legW: o.w * 0.06, snoutCol: [190, 178, 166], stripes: true });
}
function dog(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x57);
  const kindSel = param(o, 'coat', 'auto');
  const coats: Record<string, RGB> = { brown: [150, 104, 60], black: [48, 42, 40], tan: [196, 160, 100], grey: [120, 116, 112], white: [226, 220, 208] };
  const fur = tone(r, kindSel === 'auto' ? pick(r, Object.values(coats)) : coats[kindSel] ?? coats.brown!, 10);
  run(g, o, { fur, spots: r() < 0.3 ? shift(fur, -60) : undefined, spotN: 3, belly: [226, 216, 196], head: 0.26, neck: 0.06, bodyL: 0.44, tail: 0.26, bw: 0.58, hw: 0.36, snout: 0.5, ear: 'flop', earS: 0.8, tailK: 'whip', tailC: shift(fur, -10), legW: o.w * 0.12, snoutCol: shift(fur, -12) });
}
function cat(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x58);
  const coats: RGB[] = [[184, 120, 60], [58, 52, 52], [172, 168, 160], [214, 208, 198], [110, 96, 80]];
  const fur = tone(r, pick(r, coats), 8);
  run(g, o, { fur, stripes: r() < 0.6, belly: [232, 226, 212], head: 0.24, neck: 0.05, bodyL: 0.4, tail: 0.42, bw: 0.56, hw: 0.4, snout: 0.15, ear: 'point', earS: 0.7, tailK: 'whip', legW: o.w * 0.1, snoutCol: [226, 170, 160] });
}
function wolf(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x59);
  const fur = coatPick(r, [[112, 108, 102], [84, 82, 84], [146, 134, 116], [200, 198, 192], [60, 56, 52]]);
  run(g, o, { fur, belly: [200, 194, 180], stripes: true, head: 0.24, neck: 0.08, bodyL: 0.44, tail: 0.3, bw: 0.52, hw: 0.34, snout: 0.8, ear: 'point', earS: 0.6, tailK: 'bushy', legW: o.w * 0.09, snoutCol: shift(fur, -14) });
}
function deer(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x5a);
  const fur = coatPick(r, [[162, 108, 64], [140, 96, 60], [176, 124, 76]]);
  run(g, o, { fur, spots: param(o, 'spots', false) ? [236, 226, 204] : undefined, spotN: 14, belly: [226, 210, 180], head: 0.2, neck: 0.16, bodyL: 0.44, tail: 0.1, bw: 0.5, hw: 0.27, snout: 0.8, ear: 'point', earS: 0.7, tailK: 'short', tailC: [236, 226, 204], hoof: true, legW: o.w * 0.07, snoutCol: [60, 46, 40] });
  if (param(o, 'antlers', true)) {
    const rr = rng(o.seed ^ 0x77);
    const hy = -o.h / 2 + o.h * 0.1;
    for (const s of [-1, 1]) {
      const base: [number, number] = [s * o.w * 0.1, hy];
      for (let b = 0; b < 3; b++) {
        const ang = -Math.PI / 2 + s * (0.5 + b * 0.12);
        tube(g, () => {
          g.beginPath();
          g.moveTo(base[0], base[1] + b * 3);
          g.lineTo(base[0] + Math.cos(ang) * o.h * 0.1 * (b + 1) * 0.6 * s * -s + s * o.w * 0.12 * (b + 0.4), base[1] - o.h * (0.04 + 0.05 * b) - rr() * 2);
        }, Math.max(1.4, o.w * 0.028), [212, 196, 162], { outline: 1.2 });
      }
    }
  }
}

function boar(g: G, o: DrawInput): void {
  const r = rng(o.seed ^ 0x5b);
  const fur = coatPick(r, [[78, 62, 50], [96, 76, 58], [58, 48, 42]]);
  run(g, o, { fur, stripes: true, head: 0.26, neck: 0.04, bodyL: 0.5, tail: 0.1, bw: 0.62, hw: 0.28, snout: 0.7, ear: 'point', earS: 0.55, tailK: 'tuft', hoof: true, legW: o.w * 0.08, snoutCol: [70, 56, 50] });
  const hl = (o.h * 0.26) / 1.1;
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * o.w * 0.07, -o.h / 2 + hl * 0.45);
      g.quadraticCurveTo(s * o.w * 0.16, -o.h / 2 + hl * 0.3, s * o.w * 0.14, -o.h / 2 + hl * 0.05);
    }, 2.2, [232, 224, 198], { outline: 1 });
  }
}

const coatSel = (list: [string, string][]): ParamDef => ({ key: 'coat', label: 'Pels', type: 'select', default: list[0]![0], options: list.map(([value, label]) => ({ value, label })) });
const lie = (draw: (g: G, o: DrawInput, lyingCfg?: boolean) => void) => draw;
void lie;

function lyingOf(cfgOf: (o: DrawInput) => Cfg) {
  return (g: G, o: DrawInput): void => lying(g, o, cfgOf(o));
}

/** Pels-opsætning til liggende udgaver, så de ligner de stående. */
function cfgFor(species: string, o: DrawInput): Cfg {
  const r = rng(o.seed ^ 0x61);
  const base = { head: 0.2, neck: 0.1, bodyL: 0.5, tail: 0.2, bw: 0.5, hw: 0.2, snout: 0.5, ear: 'point' as EarKind, earS: 0.6, tailK: 'whip' as TailKind, legW: o.h * 0.1 };
  switch (species) {
    case 'horse': {
      const fur = coatPick(r, Object.values(HORSE_COATS).flat());
      return { ...base, fur, mane: shift(fur, -50), tailC: shift(fur, -50), hoof: true, legW: o.h * 0.07, snout: 0.9, hw: 0.17, tailK: 'bushy' };
    }
    case 'cow': {
      const spotted = param(o, 'coat', 'spots') === 'spots';
      return { ...base, fur: spotted ? [236, 232, 222] : tone(r, [128, 82, 50], 10), spots: spotted ? [44, 36, 34] : undefined, spotN: 7, hoof: true, horns: 'cow', ear: 'side', tailK: 'tuft', legW: o.h * 0.08, hw: 0.17, snoutCol: [226, 178, 166] };
    }
    case 'pig':
      return { ...base, fur: tone(r, [228, 170, 160], 10), hoof: true, ear: 'flop', earS: 0.8, tailK: 'curl', hw: 0.22, snout: 0.35, snoutCol: [238, 184, 176] };
    case 'sheep':
      return { ...base, fur: tone(r, [232, 226, 210], 10), wool: true, face: [64, 52, 46], hoof: true, ear: 'side', tailK: 'short', hw: 0.17, snoutCol: [58, 46, 42] };
    case 'dog': {
      const fur = coatPick(r, [[150, 104, 60], [48, 42, 40], [196, 160, 100], [120, 116, 112]]);
      return { ...base, fur, belly: [226, 216, 196], ear: 'flop', earS: 0.8, tailK: 'bushy', hw: 0.2, snout: 0.5, snoutCol: shift(fur, -12) };
    }
    case 'cat': {
      const fur = coatPick(r, [[184, 120, 60], [58, 52, 52], [172, 168, 160], [214, 208, 198]]);
      return { ...base, fur, stripes: true, tailK: 'whip', hw: 0.26, snout: 0.15, snoutCol: [226, 170, 160], legW: o.h * 0.08 };
    }
    default: {
      const fur = coatPick(r, [[112, 108, 102], [84, 82, 84], [146, 134, 116]]);
      return { ...base, fur, tailK: 'bushy', snout: 0.8, hw: 0.2, snoutCol: shift(fur, -14) };
    }
  }
}

const hay = (g: G, r: Rnd, w: number, h: number): void => {
  void g;
  void r;
  void w;
  void h;
};
void hay;
void mottle;

const A = { family: 'creature', shadow: 7, bleed: 0.06, randomRotation: true, sizeJitter: 0.06, keepAspect: false } as const;
const farmTags = ['farm', 'village', 'outdoor', 'grassland'];
const wildTags = ['forest', 'outdoor', 'grassland'];

export const animalKinds: ObjectKind[] = [
  kind({ ...A, key: 'creature_horse', name: 'Hest', w: 1.1, h: 2.3, params: [poseParam, coatSel([['auto', 'Efter seed'], ['bay', 'Brun'], ['black', 'Sort'], ['white', 'Hvid'], ['chestnut', 'Rødbrun'], ['dun', 'Gulbrun'], ['grey', 'Grå']])], tags: [...farmTags, 'city', 'military', 'camp'], draw: horse }),
  kind({ ...A, key: 'creature_donkey', name: 'Æsel', w: 0.9, h: 1.9, params: [poseParam], tags: [...farmTags, 'camp'], draw: donkey }),
  kind({ ...A, key: 'creature_cow', name: 'Ko', w: 1.2, h: 2.2, params: [poseParam, coatSel([['spots', 'Skæmmet'], ['brown', 'Brun'], ['black', 'Sort']])], tags: farmTags, draw: cow }),
  kind({ ...A, key: 'creature_pig', name: 'Gris', w: 0.9, h: 1.5, params: [poseParam, coatSel([['pink', 'Lyserød'], ['spots', 'Plettet'], ['dark', 'Mørk']])], tags: farmTags, draw: pig }),
  kind({ ...A, key: 'creature_sheep', name: 'Får', w: 0.85, h: 1.3, params: [poseParam, coatSel([['white', 'Hvidt'], ['dark', 'Mørkt']]), { key: 'horns', label: 'Horn', type: 'toggle', default: false }], tags: [...farmTags, 'mountain'], draw: sheep }),
  kind({ ...A, key: 'creature_goat', name: 'Ged', w: 0.75, h: 1.25, params: [poseParam], tags: [...farmTags, 'mountain'], draw: goat }),
  kind({ ...A, key: 'creature_dog', name: 'Hund', w: 0.7, h: 1.2, params: [poseParam, coatSel([['auto', 'Efter seed'], ['brown', 'Brun'], ['black', 'Sort'], ['tan', 'Lys'], ['grey', 'Grå'], ['white', 'Hvid']])], tags: [...farmTags, 'city', 'house', 'tavern', 'camp'], draw: dog }),
  kind({ ...A, key: 'creature_cat', name: 'Kat', w: 0.4, h: 0.8, params: [poseParam], tags: [...farmTags, 'city', 'house', 'tavern'], draw: cat }),
  kind({ ...A, key: 'creature_wolf', name: 'Ulv', w: 0.7, h: 1.4, params: [poseParam], tags: [...wildTags, 'mountain', 'arctic'], draw: wolf }),
  kind({ ...A, key: 'creature_deer', name: 'Hjort', w: 0.8, h: 1.7, params: [poseParam, { key: 'antlers', label: 'Gevir', type: 'toggle', default: true }, { key: 'spots', label: 'Pletter', type: 'toggle', default: false }], tags: wildTags, draw: deer }),
  kind({ ...A, key: 'creature_boar', name: 'Vildsvin', w: 0.9, h: 1.5, params: [poseParam], tags: wildTags, draw: boar }),
  kind({ ...A, key: 'creature_horse_sleep', name: 'Hest, liggende', w: 2.2, h: 1.3, params: [], tags: [...farmTags, 'camp'], draw: lyingOf((o) => cfgFor('horse', o)) }),
  kind({ ...A, key: 'creature_cow_sleep', name: 'Ko, liggende', w: 2.1, h: 1.3, params: [coatSel([['spots', 'Skæmmet'], ['brown', 'Brun']])], tags: farmTags, draw: lyingOf((o) => cfgFor('cow', o)) }),
  kind({ ...A, key: 'creature_pig_sleep', name: 'Gris, sovende', w: 1.5, h: 1.0, params: [], tags: farmTags, draw: lyingOf((o) => cfgFor('pig', o)) }),
  kind({ ...A, key: 'creature_sheep_sleep', name: 'Får, liggende', w: 1.3, h: 0.95, params: [], tags: [...farmTags, 'mountain'], draw: lyingOf((o) => cfgFor('sheep', o)) }),
  kind({ ...A, key: 'creature_dog_sleep', name: 'Hund, sovende', w: 0.95, h: 0.7, params: [], tags: [...farmTags, 'city', 'house', 'tavern', 'camp'], draw: lyingOf((o) => cfgFor('dog', o)) }),
  kind({ ...A, key: 'creature_cat_sleep', name: 'Kat, sovende', w: 0.6, h: 0.5, params: [], tags: [...farmTags, 'city', 'house', 'tavern'], draw: lyingOf((o) => cfgFor('cat', o)) }),
  kind({ ...A, key: 'creature_wolf_sleep', name: 'Ulv, sovende', w: 1.1, h: 0.8, params: [], tags: [...wildTags, 'mountain', 'arctic', 'cave'], draw: lyingOf((o) => cfgFor('wolf', o)) }),
];
