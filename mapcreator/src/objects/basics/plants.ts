import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { blob, mix, rgb, rng, shift, smooth, type RGB } from '../util';
import { canopy, clamp01, growBranches, Leaves, litAt, mossClumps, OUTLINE, paintBranches, type CanopySpec, type Seg } from './helpers';

type G = CanvasRenderingContext2D;
const dim = (o: DrawInput): number => Math.min(o.w, o.h) / 2;

const BUSH: RGB[] = [[12, 46, 22], [32, 82, 32], [60, 122, 40], [108, 164, 56], [170, 208, 92]];

// ------------------------------------------------------------------ græsstrå og bregner

interface BladeOpts {
  pal: RGB[];
  /** Strået bøjer sig udad fra midten. */
  arch?: number;
  wid?: number;
  /** 0..1: andel af rødder, der får et frøstand. */
  heads?: number;
  headCol?: RGB;
}

/** Tilspidsede strå, set oppefra: udgår fra rødder spredt i en ellipse og peger udad. Samles i fem farvespande. */
function blades(g: G, r: () => number, cx: number, cy: number, rx: number, ry: number, n: number, len: number, O: BladeOpts): void {
  const R = Math.max(rx, ry);
  const bk = O.pal.map(() => [] as number[]);
  const heads: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 1.3) * 0.75;
    const bx = cx + Math.cos(a) * rx * d;
    const by = cy + Math.sin(a) * ry * d;
    const dir = a + (r() - 0.5) * 1.4;
    const L = len * (0.55 + r() * 0.65) * (1 - d * 0.25);
    const bend = (r() - 0.5) * (O.arch ?? 0.5);
    const tx = bx + Math.cos(dir + bend) * L;
    const ty = by + Math.sin(dir + bend) * L;
    const mx = bx + Math.cos(dir) * L * 0.55 + Math.cos(dir + 1.57) * bend * L * 0.4;
    const my = by + Math.sin(dir) * L * 0.55 + Math.sin(dir + 1.57) * bend * L * 0.4;
    const lit = clamp01(litAt(tx - cx, ty - cy, R) * 0.7 + 0.15 + (r() - 0.5) * 0.35);
    const w = (O.wid ?? 0.04) * R * (0.7 + r() * 0.6);
    const b = Math.min(O.pal.length - 1, Math.floor(lit * O.pal.length));
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir);
    bk[b]!.push(bx + nx * w, by + ny * w, bx - nx * w, by - ny * w, mx, my, tx, ty);
    if (O.heads && r() < O.heads) heads.push(tx, ty, dir);
  }
  O.pal.forEach((c, k) => {
    const a = bk[k]!;
    if (!a.length) return;
    g.beginPath();
    for (let i = 0; i < a.length; i += 8) {
      g.moveTo(a[i]!, a[i + 1]!);
      g.quadraticCurveTo(a[i + 4]! + (a[i]! - a[i + 2]!) * 0.5, a[i + 5]! + (a[i + 1]! - a[i + 3]!) * 0.5, a[i + 6]!, a[i + 7]!);
      g.quadraticCurveTo(a[i + 4]! - (a[i]! - a[i + 2]!) * 0.5, a[i + 5]! - (a[i + 1]! - a[i + 3]!) * 0.5, a[i + 2]!, a[i + 3]!);
      g.closePath();
    }
    g.fillStyle = rgb(c);
    g.fill();
  });
  if (heads.length) {
    const hc = O.headCol ?? [112, 70, 40];
    g.beginPath();
    for (let i = 0; i < heads.length; i += 3) {
      g.moveTo(heads[i]! + Math.cos(heads[i + 2]!) * R * 0.1, heads[i + 1]! + Math.sin(heads[i + 2]!) * R * 0.1);
      g.ellipse(heads[i]!, heads[i + 1]!, R * 0.1, R * 0.045, heads[i + 2]!, 0, Math.PI * 2);
    }
    g.fillStyle = rgb(shift(hc, -30));
    g.fill();
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(0.6, R * 0.012);
    g.stroke();
    g.beginPath();
    for (let i = 0; i < heads.length; i += 3) {
      g.moveTo(heads[i]! - R * 0.04, heads[i + 1]! - R * 0.04 + R * 0.02);
      g.ellipse(heads[i]! - R * 0.02, heads[i + 1]! - R * 0.02, R * 0.06, R * 0.02, heads[i + 2]!, 0, Math.PI * 2);
    }
    g.fillStyle = rgb(shift(hc, 24), 0.7);
    g.fill();
  }
}

function drawFern(g: G, o: DrawInput, fronds = 9, big = 1, pal?: RGB[]): void {
  const r = rng(o.seed);
  const R = dim(o);
  const cols: RGB[] = pal ?? [[22, 66, 30], [44, 100, 40], [76, 140, 52], [120, 174, 70], [176, 208, 106]];
  const t = (r() - 0.5) * 14;
  const list: { a: number; f: number }[] = [];
  const a0 = r() * 6.28;
  for (let i = 0; i < fronds; i++) {
    const a = a0 + (i / fronds) * Math.PI * 2 + (r() - 0.5) * 0.4;
    list.push({ a, f: 0.5 + 0.5 * Math.cos(a + Math.PI * 0.75) });
  }
  list.sort((p, q) => p.f - q.f);
  for (const f of list) {
    const L = R * (0.72 + r() * 0.26) * big;
    const bend = (r() < 0.5 ? -1 : 1) * (0.1 + r() * 0.22);
    const ca = Math.cos(f.a);
    const sa = Math.sin(f.a);
    const at = (u: number): [number, number, number] => {
      const k = Math.sin(u * Math.PI) * bend * L * 0.5;
      return [ca * L * u - sa * k, sa * L * u + ca * k, f.a + bend * Math.cos(u * Math.PI) * 0.9];
    };
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(14,30,10,.85)';
    g.lineWidth = Math.max(1.2, R * 0.04);
    g.beginPath();
    for (let q = 0; q <= 8; q++) {
      const p = at(q / 8);
      q ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
    }
    g.stroke();
    const lv = new Leaves(cols.map((c) => [c[0] + t * 0.4, c[1] + t, c[2] + t * 0.3] as RGB));
    const np = 12;
    for (let q = 1; q <= np; q++) {
      const u = 0.1 + (q / np) * 0.88;
      const p = at(u);
      const ll = L * 0.27 * Math.sin(Math.min(1, u * 1.1 + 0.08) * Math.PI * 0.85 + 0.12) + L * 0.02;
      for (const s of [-1, 1]) {
        const aa = p[2] + s * (1.15 - u * 0.4);
        lv.add(clamp01(f.f * 0.55 + u * 0.12 + (s < 0 ? 0.18 : 0) + (r() - 0.5) * 0.2) * 4.99, p[0] + Math.cos(aa) * ll * 0.5, p[1] + Math.sin(aa) * ll * 0.5, aa, ll * 0.5, L * 0.026);
      }
    }
    lv.flush(g, 'leaf', 0.97);
    g.strokeStyle = rgb(mix(cols[3]!, cols[2]!, 0.5), 0.85);
    g.lineWidth = Math.max(0.8, R * 0.016);
    g.beginPath();
    for (let q = 0; q <= 8; q++) {
      const p = at(q / 8);
      q ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
    }
    g.stroke();
  }
}

export function drawReeds(g: G, o: DrawInput, cattail = false): void {
  const r = rng(o.seed);
  const R = dim(o);
  blades(g, r, 0, 0, R * 0.5, R * 0.45, 90, R * 0.62, { pal: [[44, 76, 32], [72, 112, 42], [112, 148, 58], [158, 182, 84], [204, 214, 120]], arch: 0.6, wid: 0.04, heads: cattail ? 0.18 : 0.04, headCol: [104, 66, 40] });
}

export function drawFlowers(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o);
  const col: Record<string, RGB> = { white: [246, 246, 238], yellow: [246, 208, 58], purple: [158, 96, 200], red: [220, 58, 58] };
  const c = col[param(o, 'color', 'yellow')] ?? col.yellow!;
  blades(g, r, 0, 0, R * 0.78, R * 0.7, 46, R * 0.38, { pal: [[34, 74, 30], [58, 108, 40], [88, 140, 52], [130, 172, 70], [176, 204, 104]], arch: 0.5, wid: 0.035 });
  const fl: [number, number, number][] = [];
  for (let i = 0; i < 20; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.78;
    fl.push([Math.cos(a) * d, Math.sin(a) * d, R * (0.045 + r() * 0.03)]);
  }
  fl.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
  for (const tone of [0, 1]) {
    const cc = tone ? mix(c, [255, 255, 255], 0.35) : c;
    g.beginPath();
    for (const [x, y, s] of fl) {
      for (let k = 0; k < 5; k++) {
        const aa = (k / 5) * Math.PI * 2 + x;
        const px = x + Math.cos(aa) * s * (tone ? 0.55 : 0.8);
        const py = y + Math.sin(aa) * s * (tone ? 0.55 : 0.8);
        g.moveTo(px + s * (tone ? 0.4 : 0.62), py);
        g.arc(px, py, s * (tone ? 0.4 : 0.62), 0, Math.PI * 2);
      }
    }
    g.fillStyle = tone ? rgb(cc, 0.7) : rgb(shift(c, -34));
    g.fill();
  }
  g.beginPath();
  for (const [x, y, s] of fl) {
    g.moveTo(x + s * 0.42, y);
    g.arc(x, y, s * 0.42, 0, Math.PI * 2);
  }
  g.fillStyle = 'rgb(236,176,36)';
  g.fill();
  g.beginPath();
  for (const [x, y, s] of fl) {
    g.moveTo(x - s * 0.1 + s * 0.2, y - s * 0.1);
    g.arc(x - s * 0.1, y - s * 0.1, s * 0.2, 0, Math.PI * 2);
  }
  g.fillStyle = 'rgba(255,248,200,.8)';
  g.fill();
}

// ------------------------------------------------------------------ buske

function bushSpec(over: Partial<CanopySpec> = {}): CanopySpec {
  return { ramps: [BUSH], lobes: 12, lobeSize: 0.36, leaf: 'leaf', leafLen: 0.075, leafDensity: 1.1, rough: 0.18, rim: true, ...over };
}

export function drawBush(g: G, o: DrawInput, berries: boolean): void {
  const blue = param(o, 'berry', 'red') === 'blue';
  canopy(g, o, bushSpec(berries ? { accents: [{ col: blue ? [64, 76, 178] : [196, 36, 52], n: 22, size: 0.04 }] } : {}));
}

function drawHawthorn(g: G, o: DrawInput): void {
  const haws = param(o, 'season', 'blossom') === 'haws';
  canopy(g, o, bushSpec({
    ramps: [[[14, 44, 26], [34, 76, 34], [58, 110, 42], [98, 148, 56], [152, 188, 86]]],
    accents: haws ? [{ col: [196, 36, 40], n: 30, size: 0.032 }] : [{ col: [252, 246, 244], n: 55, size: 0.034 }, { col: [244, 196, 206], n: 16, size: 0.028 }],
  }));
}

function drawHazel(g: G, o: DrawInput): void {
  canopy(g, o, bushSpec({
    ramps: [[[22, 56, 24], [48, 98, 34], [86, 140, 46], [134, 176, 62], [188, 212, 98]]],
    leaf: 'round', leafLen: 0.1, leafDensity: 0.7, lobes: 11, accents: [{ col: [206, 196, 120], n: 12, size: 0.022 }],
  }));
}

function drawLaurel(g: G, o: DrawInput): void {
  canopy(g, o, bushSpec({
    ramps: [[[8, 34, 28], [18, 62, 44], [34, 94, 60], [66, 128, 84], [128, 176, 138]]],
    leaf: 'leaf', leafLen: 0.1, leafDensity: 0.8, sheen: 90, lobes: 12,
  }));
}

function drawGorse(g: G, o: DrawInput): void {
  canopy(g, o, bushSpec({
    ramps: [[[14, 42, 24], [32, 72, 32], [58, 104, 40], [92, 134, 50], [136, 166, 66]]],
    leaf: 'needle', leafLen: 0.11, leafDensity: 1.8, lobes: 11, rough: 0.24, accents: [{ col: [250, 214, 40], n: 70, size: 0.024 }],
  }));
}

function drawHeather(g: G, o: DrawInput): void {
  canopy(g, o, bushSpec({
    ramps: [[[34, 24, 44], [76, 44, 92], [124, 70, 130], [172, 108, 166], [220, 164, 208]], [[26, 40, 28], [56, 74, 40], [96, 112, 56], [140, 148, 84], [188, 188, 120]]],
    leaf: 'round', leafLen: 0.04, leafDensity: 3.2, lobes: 14, lobeSize: 0.3, rough: 0.24, rim: true,
  }));
}

function drawThorn(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o);
  canopy(g, o, bushSpec({
    ramps: [[[22, 24, 14], [52, 62, 28], [90, 98, 42], [134, 138, 62], [180, 178, 98]]],
    lobes: 8, lobeSize: 0.3, leaf: 'needle', leafLen: 0.07, leafDensity: 0.9, scale: 0.86, rim: false,
  }));
  const segs: Seg[] = [];
  const n = 7 + Math.floor(r() * 3);
  const a0 = r() * 6.28;
  for (let i = 0; i < n; i++) {
    growBranches(r, (r() - 0.5) * R * 0.2, (r() - 0.5) * R * 0.2, a0 + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.5, R * 0.5, Math.max(2, R * 0.05), 0, { maxDepth: 2, kids: [1, 2], spread: 1.2, shrink: 0.6, thin: 0.4, wander: 0.9, pieces: 4, minLen: R * 0.06 }, segs);
  }
  paintBranches(g, segs, [96, 70, 52], { outline: Math.max(0.8, R * 0.012) });
  // torne
  g.strokeStyle = 'rgba(40,26,16,.95)';
  g.lineWidth = Math.max(0.8, R * 0.016);
  g.lineCap = 'round';
  g.beginPath();
  for (const s of segs) {
    if (r() < 0.55) continue;
    const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1) + (r() < 0.5 ? -1 : 1) * 1.1;
    const l = R * 0.07;
    g.moveTo(s.x1, s.y1);
    g.lineTo(s.x1 + Math.cos(a) * l, s.y1 + Math.sin(a) * l);
  }
  g.stroke();
}

function drawBramble(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o);
  const ripe = param(o, 'berry', 'ripe') === 'ripe';
  canopy(g, o, bushSpec({
    ramps: [[[16, 42, 24], [36, 76, 34], [62, 110, 42], [100, 146, 54], [150, 184, 84]]],
    lobes: 10, lobeSize: 0.3, leaf: 'leaf', leafLen: 0.1, leafDensity: 0.7, scale: 0.9, rough: 0.22,
  }));
  // buede, tornede stængler
  const segs: Seg[] = [];
  const n = 6;
  const a0 = r() * 6.28;
  for (let i = 0; i < n; i++) {
    growBranches(r, 0, 0, a0 + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.6, R * 0.55, Math.max(2, R * 0.045), 0, { maxDepth: 1, kids: [1, 1], spread: 0.8, shrink: 0.7, thin: 0.5, wander: 0.7, pieces: 5, minLen: R * 0.06 }, segs);
  }
  paintBranches(g, segs, [120, 62, 58], { outline: Math.max(0.7, R * 0.01) });
  const lv = new Leaves([[30, 74, 30], [58, 112, 40], [100, 150, 54]]);
  for (const s of segs) {
    if (r() < 0.5) continue;
    const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
    for (const sd of [-1, 1]) lv.add(Math.floor(r() * 3), s.x2 + Math.cos(a + sd * 0.9) * R * 0.06, s.y2 + Math.sin(a + sd * 0.9) * R * 0.06, a + sd * 0.9, R * 0.09, R * 0.04);
  }
  lv.flush(g, 'leaf');
  // bær
  const cols: RGB[] = ripe ? [[34, 18, 46], [64, 34, 78]] : [[190, 40, 52], [214, 84, 70]];
  for (let i = 0; i < 20; i++) {
    const s = segs[Math.floor(r() * segs.length)]!;
    const x = s.x2 + (r() - 0.5) * R * 0.1;
    const y = s.y2 + (r() - 0.5) * R * 0.1;
    const rr = R * (0.035 + r() * 0.015);
    g.fillStyle = rgb(cols[0]!);
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rgb(cols[1]!, 0.9);
    g.beginPath();
    g.arc(x - rr * 0.25, y - rr * 0.25, rr * 0.55, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)';
    g.beginPath();
    g.arc(x - rr * 0.35, y - rr * 0.4, rr * 0.22, 0, Math.PI * 2);
    g.fill();
  }
}

// ------------------------------------------------------------------ bunddække

function drawGrassPatch(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o);
  const dry = param(o, 'tone', 'green') === 'dry';
  const pal: RGB[] = dry ? [[96, 78, 34], [132, 108, 46], [170, 144, 62], [208, 182, 88], [236, 214, 130]] : [[34, 76, 32], [58, 110, 40], [92, 146, 52], [136, 176, 70], [184, 208, 108]];
  const under = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.7);
  under.addColorStop(0, rgb(pal[0]!, 0.95));
  under.addColorStop(0.8, rgb(pal[0]!, 0.7));
  under.addColorStop(1, rgb(pal[0]!, 0));
  g.fillStyle = under;
  g.beginPath();
  g.arc(0, 0, R * 0.7, 0, Math.PI * 2);
  g.fill();
  blades(g, r, 0, 0, R * 0.8, R * 0.75, 170, R * 0.4, { pal, arch: 0.6, wid: 0.03, heads: dry ? 0.1 : 0.04, headCol: dry ? [150, 120, 60] : [170, 160, 100] });
}

function drawMoss(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o);
  smooth(g, blob(R * 0.9, R * 0.78, 0.28, 12, r));
  const gr = g.createRadialGradient(-R * 0.2, -R * 0.2, 0, 0, 0, R);
  gr.addColorStop(0, 'rgb(86,140,54)');
  gr.addColorStop(1, 'rgb(40,84,36)');
  g.fillStyle = gr;
  g.fill();
  g.save();
  smooth(g, blob(R * 0.9, R * 0.78, 0.28, 12, rng(o.seed)));
  g.clip();
  mossClumps(g, r, 0, 0, R * 0.8, R * 0.7, 26, R * 0.2);
  g.restore();
}

function drawBracken(g: G, o: DrawInput): void {
  drawFern(g, o, 13, 1, [[28, 70, 30], [54, 106, 38], [90, 146, 50], [136, 178, 68], [188, 210, 104]]);
}

function drawUndergrowth(g: G, o: DrawInput): void {
  canopy(g, o, {
    ramps: [[[16, 52, 28], [36, 92, 40], [66, 132, 52], [112, 170, 70], [168, 206, 106]]],
    lobes: 9, lobeSize: 0.34, leaf: 'leaf', leafLen: 0.15, leafDensity: 0.6, rough: 0.26, rim: true, scale: 0.8,
  });
}

function drawClover(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o);
  const lv = new Leaves([[44, 96, 44], [70, 132, 54], [110, 168, 72], [160, 200, 106]]);
  for (let i = 0; i < 150; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 0.85;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const l = litAt(x, y, R);
    lv.add(clamp01(l * 0.8 + (r() - 0.5) * 0.5) * 3.99, x, y, r() * 6.28, R * 0.09, R * 0.065);
  }
  lv.flush(g, 'round', 1);
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.beginPath();
  for (let i = 0; i < 22; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 0.8;
    g.moveTo(Math.cos(a) * d + R * 0.075, Math.sin(a) * d);
    g.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.075, 0, Math.PI * 2);
  }
  g.fill();
  g.beginPath();
  for (let i = 0; i < 22; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 0.8;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    for (let k = 0; k < 5; k++) {
      const px = x + Math.cos(k * 1.26) * R * 0.035;
      const py = y + Math.sin(k * 1.26) * R * 0.035;
      g.moveTo(px + R * 0.03, py);
      g.arc(px, py, R * 0.03, 0, Math.PI * 2);
    }
  }
  g.fillStyle = 'rgb(248,244,238)';
  g.fill();
}

export const plantDrawers = {
  bush: (g: G, o: DrawInput) => drawBush(g, o, false),
  bush_berry: (g: G, o: DrawInput) => drawBush(g, o, true),
  fern: (g: G, o: DrawInput) => drawFern(g, o),
  reeds: (g: G, o: DrawInput) => drawReeds(g, o),
  flowers: drawFlowers,
};

const PLANT = { randomRotation: true, sizeJitter: 0.25, bleed: 0.06 };

export const plantKinds: ObjectKind[] = [
  kind({
    key: 'bush_hawthorn', family: 'plant', name: 'Tjørn', w: 1.6, h: 1.6, shadow: 8, ...PLANT, tags: ['village', 'farm', 'forest'], draw: drawHawthorn,
    params: [{ key: 'season', label: 'Tilstand', type: 'select', default: 'blossom', options: [{ value: 'blossom', label: 'Blomstrende' }, { value: 'haws', label: 'Med bær' }] }],
  }),
  kind({ key: 'bush_hazel', family: 'plant', name: 'Hassel', w: 1.6, h: 1.6, shadow: 8, ...PLANT, tags: ['village', 'farm'], draw: drawHazel }),
  kind({ key: 'bush_laurel', family: 'plant', name: 'Laurbærbusk', w: 1.4, h: 1.4, shadow: 8, ...PLANT, tags: ['city', 'rich', 'temple'], draw: drawLaurel }),
  kind({ key: 'bush_gorse', family: 'plant', name: 'Ginst', w: 1.5, h: 1.5, shadow: 7, ...PLANT, tags: ['mountain', 'desert'], draw: drawGorse }),
  kind({ key: 'heather', family: 'plant', name: 'Lyng', w: 1.5, h: 1.5, shadow: 5, ...PLANT, tags: ['mountain', 'arctic'], draw: drawHeather }),
  kind({ key: 'bush_thorn', family: 'plant', name: 'Tornebusk', w: 1.5, h: 1.5, shadow: 6, ...PLANT, tags: ['desert', 'ruin', 'graveyard', 'battlefield'], draw: drawThorn }),
  kind({
    key: 'bush_bramble', family: 'plant', name: 'Brombær', w: 1.7, h: 1.7, shadow: 7, ...PLANT, tags: ['village', 'ruin', 'farm'], draw: drawBramble,
    params: [{ key: 'berry', label: 'Bær', type: 'select', default: 'ripe', options: [{ value: 'ripe', label: 'Modne' }, { value: 'unripe', label: 'Umodne' }] }],
  }),
  kind({
    key: 'grass_patch', family: 'plant', name: 'Græsplet', w: 1.6, h: 1.6, shadow: 0, ...PLANT, tags: ['farm', 'village', 'desert'], draw: drawGrassPatch,
    params: [{ key: 'tone', label: 'Farve', type: 'select', default: 'green', options: [{ value: 'green', label: 'Grøn' }, { value: 'dry', label: 'Tør' }] }],
  }),
  kind({ key: 'moss_patch', family: 'plant', name: 'Mosplet', w: 1.5, h: 1.5, shadow: 0, ...PLANT, tags: ['swamp', 'cave', 'ruin'], draw: drawMoss }),
  kind({ key: 'bracken', family: 'plant', name: 'Bregnebusk', w: 1.8, h: 1.8, shadow: 3, ...PLANT, tags: ['swamp', 'cave'], draw: drawBracken }),
  kind({ key: 'undergrowth', family: 'plant', name: 'Undervækst', w: 1.6, h: 1.6, shadow: 5, ...PLANT, tags: ['swamp', 'ruin'], draw: drawUndergrowth }),
  kind({ key: 'clover', family: 'plant', name: 'Kløver', w: 1.4, h: 1.4, shadow: 0, ...PLANT, tags: ['farm', 'village'], draw: drawClover }),
  kind({ key: 'cattails', family: 'plant', name: 'Dunhammer', w: 1.5, h: 1.5, shadow: 0, ...PLANT, bleed: 0.1, tags: ['swamp', 'water'], draw: (g, o) => drawReeds(g, o, true) }),
];
