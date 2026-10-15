import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { blob, mix, rgb, rng, shift, smooth, type RGB } from '../util';
import { canopy, clamp01, conifer, growBranches, Leaves, litAt, mossClumps, OUTLINE, paintBranches, type CanopySpec, type Seg } from './helpers';

type G = CanvasRenderingContext2D;

// ------------------------------------------------------------------ farver ([skygge, mørk, mellem, lys, højlys])

const SUMMER: RGB[] = [[12, 40, 22], [28, 74, 30], [56, 114, 40], [102, 156, 54], [170, 208, 92]];
const SPRING: RGB[] = [[22, 58, 28], [50, 102, 40], [98, 148, 52], [158, 196, 82], [212, 234, 124]];
const OAK: RGB[] = [[10, 34, 20], [24, 62, 28], [48, 96, 36], [88, 134, 48], [146, 178, 76]];
const BIRCH: RGB[] = [[30, 62, 28], [64, 112, 40], [116, 160, 58], [176, 200, 92], [226, 232, 140]];
const AUTUMN_RED: RGB[] = [[58, 16, 10], [118, 38, 18], [174, 68, 26], [214, 112, 34], [244, 170, 62]];
const AUTUMN_GOLD: RGB[] = [[82, 46, 10], [150, 92, 18], [204, 146, 34], [236, 190, 62], [252, 228, 112]];
const AUTUMN_GREEN: RGB[] = [[40, 54, 18], [86, 100, 26], [140, 140, 38], [188, 170, 48], [226, 206, 90]];

const SEASON_RAMPS: Record<string, RGB[][]> = {
  summer: [SUMMER],
  spring: [SPRING, [SPRING[0]!, SPRING[1]!, SPRING[2]!, [190, 214, 100], [232, 244, 150]]],
  autumn: [AUTUMN_RED, AUTUMN_GOLD, AUTUMN_GOLD, AUTUMN_GREEN],
};

const dim = (o: DrawInput): number => Math.min(o.w, o.h) / 2;

// ------------------------------------------------------------------ eksisterende arter

export function drawBroad(g: G, o: DrawInput): void {
  const rp = SEASON_RAMPS[param(o, 'season', 'summer')] ?? SEASON_RAMPS.summer!;
  canopy(g, o, { ramps: rp, lobes: 26, lobeSize: 0.27, leaf: 'leaf', leafLen: 0.062, leafDensity: 1, rough: 0.16, rim: true });
}

export function drawOak(g: G, o: DrawInput): void {
  canopy(g, o, { ramps: [OAK], lobes: 30, lobeSize: 0.23, leaf: 'round', leafLen: 0.048, leafDensity: 1.05, rough: 0.22, rim: true });
}

export function drawBirch(g: G, o: DrawInput): void {
  canopy(g, o, { ramps: [BIRCH], lobes: 24, lobeSize: 0.22, leaf: 'leaf', leafLen: 0.052, leafDensity: 1, rough: 0.2, rim: true, vary: 22 });
}

export function drawSpruce(g: G, o: DrawInput): void {
  conifer(g, o, { dark: [16, 50, 36], light: [92, 150, 90], tiers: 5, branches: 14, snow: param(o, 'snow', false) });
}

// ------------------------------------------------------------------ fyr: kvaste af nåle på bare grene

function needleTuft(g: G, r: () => number, x: number, y: number, tr: number, pal: RGB[], R: number, snow: boolean): void {
  const lit = litAt(x, y, R);
  // mørk bund
  const gr = g.createRadialGradient(x - tr * 0.2, y - tr * 0.2, tr * 0.05, x, y, tr);
  gr.addColorStop(0, rgb(pal[1]!));
  gr.addColorStop(1, rgb(pal[0]!));
  smooth(g, blob(tr * 0.82, tr * 0.82, 0.14, 9, r, x, y));
  g.fillStyle = gr;
  g.fill();
  const lv = new Leaves(pal);
  const n = Math.round(tr * 3.2);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * tr * 0.5;
    const len = tr * (0.28 + r() * 0.34);
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    const loc = clamp01(lit * 0.45 + 0.35 - (Math.cos(a) + Math.sin(a)) * 0.2 + (r() - 0.5) * 0.35 + d / tr * 0.15);
    lv.add(loc * 4.99, px + Math.cos(a) * len * 0.5, py + Math.sin(a) * len * 0.5, a, len * 0.5, 0);
  }
  lv.flush(g, 'needle', 0.95, Math.max(0.7, tr * 0.045));
  if (snow) {
    g.fillStyle = 'rgba(248,252,255,.78)';
    for (let i = 0; i < 5; i++) {
      smooth(g, blob(tr * 0.22, tr * 0.16, 0.3, 6, r, x + (r() - 0.55) * tr * 0.8, y + (r() - 0.55) * tr * 0.8));
      g.fill();
    }
  }
}

export function drawPine(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o) * 0.97;
  const snow = param(o, 'snow', false);
  const pal: RGB[] = snow
    ? [[52, 80, 80], [92, 126, 120], [148, 178, 176], [206, 224, 228], [248, 252, 255]]
    : [[28, 48, 26], [52, 84, 36], [88, 126, 48], [136, 168, 74], [190, 208, 120]];
  const segs: Seg[] = [];
  const arms = 5 + Math.floor(r() * 3);
  const tufts: { x: number; y: number; s: number }[] = [];
  const a0 = r() * 6.28;
  for (let i = 0; i < arms; i++) {
    const a = a0 + (i / arms) * Math.PI * 2 + (r() - 0.5) * 0.6;
    const L = R * (0.36 + r() * 0.2);
    const sub: Seg[] = [];
    const tips = growBranches(r, 0, 0, a, L, R * 0.075, 0, { maxDepth: 1, kids: [1, 2], spread: 1.0, shrink: 0.5, thin: 0.5, wander: 0.4, pieces: 3, minLen: 5 }, sub);
    segs.push(...sub);
    for (const t of tips) tufts.push({ x: t[0], y: t[1], s: R * (0.2 + r() * 0.1) });
    // kvast midtvejs
    const mx = Math.cos(a) * L * 0.55;
    const my = Math.sin(a) * L * 0.55;
    tufts.push({ x: mx + Math.cos(a + 1.5) * R * 0.06, y: my + Math.sin(a + 1.5) * R * 0.06, s: R * (0.17 + r() * 0.06) });
  }
  paintBranches(g, segs, [96, 70, 48], { outline: Math.max(1, R * 0.018) });
  tufts.sort((p, q) => Math.hypot(q.x, q.y) - Math.hypot(p.x, p.y));
  for (const t of tufts) needleTuft(g, r, t.x, t.y, t.s, pal, R, snow);
  needleTuft(g, r, 0, 0, R * 0.26, pal, R, snow);
}

// ------------------------------------------------------------------ dødt træ

function deadBranches(r: () => number, R: number): { segs: Seg[]; tips: [number, number, number][] } {
  const segs: Seg[] = [];
  const tips: [number, number, number][] = [];
  const arms = 5 + Math.floor(r() * 3);
  const a0 = r() * 6.28;
  for (let i = 0; i < arms; i++) {
    const a = a0 + (i / arms) * Math.PI * 2 + (r() - 0.5) * 0.7;
    growBranches(r, 0, 0, a, R * (0.34 + r() * 0.12), Math.max(3, R * 0.085), 0, { maxDepth: 3, kids: [2, 3], spread: 1.3, shrink: 0.62, thin: 0.42, wander: 0.5, pieces: 4, minLen: R * 0.07 }, segs, tips);
  }
  return { segs, tips };
}

function deadHub(g: G, r: () => number, R: number, base: RGB): void {
  const rr = R * 0.12;
  smooth(g, blob(rr * 1.15, rr * 1.15, 0.12, 10, r));
  g.fillStyle = rgb(shift(base, -30));
  g.fill();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, R * 0.025);
  g.stroke();
  for (let i = 3; i >= 0; i--) {
    g.fillStyle = rgb(shift([176, 150, 114], i % 2 ? -14 : 0));
    g.beginPath();
    g.arc(-rr * 0.05, -rr * 0.05, rr * (0.2 + i * 0.2), 0, Math.PI * 2);
    g.fill();
  }
}

export function drawDead(g: G, o: DrawInput, opts: { moss?: boolean; snow?: boolean } = {}): void {
  const r = rng(o.seed);
  const R = dim(o);
  const base: RGB = opts.snow ? [96, 82, 70] : [112, 94, 76];
  const { segs, tips } = deadBranches(r, R);
  paintBranches(g, segs, base, { outline: Math.max(0.9, R * 0.014) });
  // bark: knaster og furer på de tykke grene
  g.lineCap = 'round';
  for (const s of segs) {
    if (s.w < 4) continue;
    if (r() < 0.45) {
      const t = r();
      g.fillStyle = 'rgba(30,18,10,.6)';
      g.beginPath();
      g.ellipse(s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t, s.w * 0.2, s.w * 0.13, Math.atan2(s.y2 - s.y1, s.x2 - s.x1), 0, Math.PI * 2);
      g.fill();
    }
  }
  if (opts.moss) {
    for (const s of segs) {
      if (s.w < 3.5 || r() < 0.4) continue;
      const mx = (s.x1 + s.x2) / 2 - s.w * 0.12;
      const my = (s.y1 + s.y2) / 2 - s.w * 0.12;
      mossClumps(g, r, mx, my, Math.hypot(s.x2 - s.x1, s.y2 - s.y1) * 0.35, s.w * 0.22, 3, s.w * 0.5, true);
    }
  }
  if (opts.snow) {
    g.lineCap = 'round';
    for (const s of segs) {
      if (s.w < 2.5) continue;
      g.strokeStyle = 'rgba(248,252,255,.88)';
      g.lineWidth = s.w * 0.42;
      g.beginPath();
      g.moveTo(s.x1 - s.w * 0.18, s.y1 - s.w * 0.18);
      g.lineTo(s.x2 - s.w * 0.18, s.y2 - s.w * 0.18);
      g.stroke();
    }
  }
  // fine kviste i spidserne
  g.strokeStyle = rgb(shift(base, -10));
  g.lineWidth = Math.max(0.7, R * 0.012);
  for (const t of tips) {
    for (let i = 0; i < 2; i++) {
      const a = t[2] + (r() - 0.5) * 1.8;
      const l = R * (0.04 + r() * 0.06);
      g.beginPath();
      g.moveTo(t[0], t[1]);
      g.lineTo(t[0] + Math.cos(a) * l, t[1] + Math.sin(a) * l);
      g.stroke();
    }
  }
  deadHub(g, r, R, base);
}

// ------------------------------------------------------------------ nye arter

function drawMaple(g: G, o: DrawInput): void {
  const rp = param(o, 'season', 'summer') === 'autumn' ? [AUTUMN_RED, AUTUMN_RED, AUTUMN_GOLD, AUTUMN_GREEN] : [SUMMER, [[16, 52, 26], [38, 90, 34], [72, 130, 44], [122, 170, 60], [184, 214, 100]] as RGB[]];
  canopy(g, o, { ramps: rp, lobes: 28, lobeSize: 0.24, leaf: 'star', leafLen: 0.07, leafDensity: 0.7, rough: 0.14, rim: true });
}

function drawBeech(g: G, o: DrawInput): void {
  const copper = param(o, 'tone', 'green') === 'copper';
  const rp: RGB[] = copper ? [[34, 12, 22], [74, 28, 38], [120, 52, 48], [168, 90, 58], [214, 144, 86]] : [[18, 52, 28], [40, 92, 36], [78, 138, 48], [130, 178, 66], [194, 220, 110]];
  canopy(g, o, { ramps: [rp], lobes: 20, lobeSize: 0.3, leaf: 'leaf', leafLen: 0.048, leafDensity: 1.35, rough: 0.12, rim: true });
}

function drawBirchGrove(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o);
  const n = 3 + Math.floor(r() * 2);
  const cs: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28 + i * 1.6;
    const d = R * (0.2 + r() * 0.3);
    cs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: R * (0.5 + r() * 0.18) });
  }
  cs.sort((p, q) => p.x + p.y - (q.x + q.y));
  cs.forEach((c, i) => {
    g.save();
    g.translate(c.x, c.y);
    canopy(g, { w: c.s * 2, h: c.s * 2, seed: o.seed * 7 + i * 131 }, { ramps: [BIRCH], lobes: 14, lobeSize: 0.26, leaf: 'leaf', leafLen: 0.06, leafDensity: 1, rough: 0.2, rim: true, vary: 26 });
    g.restore();
  });
}

function drawYoung(g: G, o: DrawInput): void {
  canopy(g, o, { ramps: [SPRING, [SPRING[0]!, SPRING[1]!, [88, 140, 48], [150, 192, 74], [214, 236, 124]]], lobes: 10, lobeSize: 0.34, leaf: 'leaf', leafLen: 0.09, leafDensity: 0.9, rough: 0.18, rim: true });
}

function drawAncient(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o);
  // tykke grene, der skimtes mellem lapperne
  const segs: Seg[] = [];
  const arms = 6 + Math.floor(r() * 3);
  const a0 = r() * 6.28;
  for (let i = 0; i < arms; i++) {
    growBranches(r, 0, 0, a0 + (i / arms) * Math.PI * 2 + (r() - 0.5) * 0.4, R * 0.5, R * 0.1, 0, { maxDepth: 2, kids: [2, 2], spread: 1.0, shrink: 0.5, thin: 0.45, wander: 0.5, pieces: 4, minLen: R * 0.1 }, segs);
  }
  g.fillStyle = 'rgba(8,10,4,.45)';
  g.beginPath();
  g.arc(0, 0, R * 0.9, 0, Math.PI * 2);
  g.fill();
  paintBranches(g, segs, [92, 72, 54], { outline: Math.max(1.2, R * 0.016) });
  const lobes = canopy(g, o, { ramps: [[[8, 30, 18], [20, 56, 26], [42, 88, 34], [80, 126, 46], [134, 170, 72]]], lobes: 46, lobeSize: 0.17, leaf: 'round', leafLen: 0.04, leafDensity: 1.1, rough: 0.28, rim: true, scale: 0.97 });
  void lobes;
}

function drawPalm(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o) * 0.98;
  const n = 11 + Math.floor(r() * 3);
  const a0 = r() * 6.28;
  const fr: { a: number; f: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.3;
    fr.push({ a, f: 0.5 + 0.5 * Math.cos(a + Math.PI * 0.75) });
  }
  fr.sort((p, q) => p.f - q.f);
  const pal: RGB[] = [[12, 46, 24], [26, 82, 34], [50, 122, 44], [96, 162, 60], [160, 204, 96]];
  for (const f of fr) {
    const L = R * (0.84 + r() * 0.16);
    const bend = (r() < 0.5 ? -1 : 1) * (0.14 + r() * 0.16);
    const ca = Math.cos(f.a);
    const sa = Math.sin(f.a);
    const ptAt = (t: number): [number, number, number] => {
      const k = Math.sin(t * Math.PI) * bend * L * 0.55;
      return [ca * L * t - sa * k, sa * L * t + ca * k, f.a + bend * Math.cos(t * Math.PI) * 0.9];
    };
    // ribben
    g.lineCap = 'round';
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(1.6, R * 0.04);
    g.beginPath();
    for (let q = 0; q <= 8; q++) {
      const p = ptAt(q / 8);
      q ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
    }
    g.stroke();
    const lv = new Leaves(pal);
    for (let q = 1; q <= 16; q++) {
      const t = 0.1 + (q / 16) * 0.9;
      const p = ptAt(t);
      const ll = L * 0.3 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.9 + 0.15) * 0.9 + L * 0.03;
      for (const s of [-1, 1]) {
        const aa = p[2] + s * (1.15 - t * 0.35) + (r() - 0.5) * 0.2;
        const side = s < 0 ? 0 : 0.0;
        lv.add(clamp01(f.f * 0.55 + t * 0.15 + (s < 0 ? 0.2 : 0) - side + (r() - 0.5) * 0.18) * 4.99, p[0] + Math.cos(aa) * ll * 0.5, p[1] + Math.sin(aa) * ll * 0.5, aa, ll * 0.5, L * 0.022);
      }
    }
    lv.flush(g, 'leaf', 0.97);
    g.strokeStyle = rgb(mix(pal[3]!, pal[2]!, 0.4));
    g.lineWidth = Math.max(1, R * 0.022);
    g.beginPath();
    for (let q = 0; q <= 8; q++) {
      const p = ptAt(q / 8);
      q ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
    }
    g.stroke();
  }
  // krone: gamle bladfæster og kokosnødder
  g.fillStyle = rgb([66, 48, 30]);
  g.beginPath();
  g.arc(0, 0, R * 0.13, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, R * 0.02);
  g.stroke();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28 + 0.4;
    const x = Math.cos(a) * R * 0.07;
    const y = Math.sin(a) * R * 0.07;
    const gr = g.createRadialGradient(x - R * 0.02, y - R * 0.02, 1, x, y, R * 0.06);
    gr.addColorStop(0, 'rgb(170,126,78)');
    gr.addColorStop(1, 'rgb(74,48,26)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, R * 0.055, 0, Math.PI * 2);
    g.fill();
  }
}

function drawCypress(g: G, o: DrawInput): void {
  conifer(g, o, { dark: [14, 42, 30], light: [74, 118, 76], tiers: 7, branches: 8, reach: 0.9, fat: 0.8 });
}

function drawFirYoung(g: G, o: DrawInput): void {
  conifer(g, o, { dark: [26, 70, 44], light: [112, 168, 102], tiers: 4, branches: 9, snow: param(o, 'snow', false) });
}

function drawApple(g: G, o: DrawInput): void {
  const blossom = param(o, 'season', 'apples') === 'blossom';
  const spec: CanopySpec = {
    ramps: [blossom ? SPRING : SUMMER],
    lobes: 22, lobeSize: 0.27, leaf: 'leaf', leafLen: 0.055, leafDensity: 1, rough: 0.18, rim: true,
    accents: blossom ? [{ col: [250, 226, 232], n: 70, size: 0.028 }, { col: [240, 170, 190], n: 30, size: 0.024 }] : [{ col: [200, 40, 38], n: 14, size: 0.04 }, { col: [226, 190, 52], n: 5, size: 0.036 }],
  };
  canopy(g, o, spec);
}

function drawLarch(g: G, o: DrawInput): void {
  const gold = param(o, 'autumn', false);
  const rp: RGB[] = gold ? [[96, 52, 10], [168, 104, 20], [220, 164, 40], [244, 202, 76], [255, 236, 130]] : [[30, 66, 30], [66, 112, 42], [114, 158, 58], [168, 198, 84], [214, 232, 128]];
  canopy(g, o, { ramps: [rp], lobes: 22, lobeSize: 0.25, leaf: 'needle', leafLen: 0.075, leafDensity: 2.2, rough: 0.2, rim: false, vary: 18 });
}

function drawSwamp(g: G, o: DrawInput): void {
  const r = rng(o.seed + 5);
  const R = dim(o);
  const rp: RGB[] = [[14, 32, 30], [30, 62, 48], [58, 98, 66], [98, 138, 90], [150, 180, 126]];
  canopy(g, o, { ramps: [rp], lobes: 26, lobeSize: 0.25, leaf: 'leaf', leafLen: 0.052, leafDensity: 1, rough: 0.22, rim: true });
  // hængende mos: lange, blege tråde
  const cols: RGB[] = [[96, 120, 96], [150, 172, 138], [196, 210, 176]];
  const lv = cols.map(() => [] as number[]);
  for (let i = 0; i < 70; i++) {
    const a = r() * 6.28;
    const d = R * (0.35 + r() * 0.6);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const len = R * (0.1 + r() * 0.2);
    const b = Math.min(2, Math.floor(litAt(x, y, R) * 3));
    lv[b]!.push(x, y, x + Math.cos(a + 0.9) * len * 0.3, y + Math.sin(a + 0.9) * len * 0.3 + len * 0.2, x + Math.cos(a) * len, y + Math.sin(a) * len + len * 0.35);
  }
  g.lineCap = 'round';
  cols.forEach((c, k) => {
    const a = lv[k]!;
    g.beginPath();
    for (let i = 0; i < a.length; i += 6) {
      g.moveTo(a[i]!, a[i + 1]!);
      g.quadraticCurveTo(a[i + 2]!, a[i + 3]!, a[i + 4]!, a[i + 5]!);
    }
    g.strokeStyle = rgb(c, 0.7);
    g.lineWidth = Math.max(0.8, R * 0.014);
    g.stroke();
  });
}

function drawOlive(g: G, o: DrawInput): void {
  canopy(g, o, {
    ramps: [[[34, 52, 36], [76, 98, 66], [122, 144, 96], [174, 188, 140], [220, 228, 188]]],
    lobes: 26, lobeSize: 0.24, leaf: 'leaf', leafLen: 0.05, leafDensity: 1.1, rough: 0.28, rim: true, scale: 0.92,
    accents: [{ col: [46, 36, 52], n: 16, size: 0.02 }],
  });
}

function drawWillow(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = dim(o);
  const rp: RGB[] = [[28, 58, 40], [62, 104, 62], [108, 148, 84], [160, 190, 114], [206, 226, 158]];
  canopy(g, o, { ramps: [rp], lobes: 16, lobeSize: 0.3, leaf: 'leaf', leafLen: 0.05, leafDensity: 0.8, rough: 0.14, scale: 0.86, rim: false });
  // hængende grene: lange, buede tråde med små blade
  const cols: RGB[] = [rp[0]!, rp[1]!, rp[2]!, rp[3]!, rp[4]!];
  const buckets = cols.map(() => [] as number[]);
  const lv = new Leaves(cols);
  const N = 90;
  for (let i = 0; i < N; i++) {
    const a = r() * 6.28;
    const r0 = R * (0.18 + r() * 0.5);
    const r1 = R * (0.8 + r() * 0.22);
    const bend = (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.5);
    const x0 = Math.cos(a) * r0;
    const y0 = Math.sin(a) * r0;
    const x1 = Math.cos(a + bend) * r1;
    const y1 = Math.sin(a + bend) * r1;
    const mx = Math.cos(a - bend * 0.15) * (r0 + r1) * 0.6;
    const my = Math.sin(a - bend * 0.15) * (r0 + r1) * 0.6;
    const lit = clamp01(litAt(x1, y1, R) * 0.8 + (r() - 0.5) * 0.3 + 0.1);
    buckets[Math.min(4, Math.floor(lit * 5))]!.push(x0, y0, mx, my, x1, y1);
    for (let k = 0; k < 4; k++) {
      const t = 0.4 + (k / 4) * 0.6;
      const px = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * mx + t * t * x1;
      const py = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * my + t * t * y1;
      lv.add(Math.min(4, Math.floor(lit * 5)) + (r() < 0.2 ? 1 : 0), px, py, a + bend + (r() - 0.5), R * 0.06, R * 0.016);
    }
  }
  g.lineCap = 'round';
  cols.forEach((c, k) => {
    const a = buckets[k]!;
    if (!a.length) return;
    g.beginPath();
    for (let i = 0; i < a.length; i += 6) {
      g.moveTo(a[i]!, a[i + 1]!);
      g.quadraticCurveTo(a[i + 2]!, a[i + 3]!, a[i + 4]!, a[i + 5]!);
    }
    g.strokeStyle = rgb(c, 0.85);
    g.lineWidth = Math.max(1.1, R * 0.024);
    g.stroke();
  });
  lv.flush(g, 'leaf', 0.95);
}

// ------------------------------------------------------------------ registrering

const snowParam: ParamDef = { key: 'snow', label: 'Sne', type: 'toggle', default: false };
const TREE = { randomRotation: true, sizeJitter: 0.2, bleed: 0.08 };

/** Gengives i nature.ts: de eksisterende træers nye tegning. */
export const treeDrawers = {
  tree_broad: drawBroad,
  tree_oak: drawOak,
  tree_birch: drawBirch,
  tree_spruce: drawSpruce,
  tree_pine: drawPine,
  tree_dead: (g: G, o: DrawInput) => drawDead(g, o),
};

export const treeKinds: ObjectKind[] = [
  kind({
    key: 'tree_maple', family: 'tree', name: 'Ahorn', w: 4, h: 4, shadow: 32, ...TREE, tags: ['village', 'grassland'], draw: drawMaple,
    params: [{ key: 'season', label: 'Årstid', type: 'select', default: 'summer', options: [{ value: 'summer', label: 'Sommer' }, { value: 'autumn', label: 'Efterår' }] }],
  }),
  kind({
    key: 'tree_beech', family: 'tree', name: 'Bøg', w: 4.5, h: 4.5, shadow: 34, ...TREE, tags: ['village'], draw: drawBeech,
    params: [{ key: 'tone', label: 'Blade', type: 'select', default: 'green', options: [{ value: 'green', label: 'Grønne' }, { value: 'copper', label: 'Kobber' }] }],
  }),
  kind({ key: 'tree_willow', family: 'tree', name: 'Pil', w: 4, h: 4, shadow: 28, ...TREE, tags: ['swamp', 'water'], draw: drawWillow }),
  kind({ key: 'tree_birch_grove', family: 'tree', name: 'Birkegruppe', w: 4, h: 4, shadow: 26, ...TREE, tags: ['arctic'], draw: drawBirchGrove }),
  kind({ key: 'tree_dead_moss', family: 'tree', name: 'Dødt træ med mos', w: 3.5, h: 3.5, shadow: 10, ...TREE, tags: ['swamp', 'ruin', 'graveyard'], draw: (g, o) => drawDead(g, o, { moss: true }) }),
  kind({ key: 'tree_dead_snow', family: 'tree', name: 'Snedækket dødt træ', w: 3.5, h: 3.5, shadow: 10, ...TREE, tags: ['arctic', 'mountain'], draw: (g, o) => drawDead(g, o, { snow: true }) }),
  kind({ key: 'tree_young', family: 'tree', name: 'Ungt træ', w: 2, h: 2, shadow: 14, ...TREE, tags: ['farm', 'village'], draw: drawYoung }),
  kind({ key: 'tree_ancient', family: 'tree', name: 'Gammelt kæmpetræ', w: 7, h: 7, shadow: 46, ...TREE, tags: ['magic', 'ruin'], draw: drawAncient }),
  kind({ key: 'tree_palm', family: 'tree', name: 'Palme', w: 3, h: 3, shadow: 24, ...TREE, tags: ['desert', 'water', 'harbor'], draw: drawPalm }),
  kind({ key: 'tree_cypress', family: 'tree', name: 'Cypres', w: 1.8, h: 1.8, shadow: 20, ...TREE, tags: ['graveyard', 'village', 'desert'], draw: drawCypress }),
  kind({ key: 'tree_fir_young', family: 'tree', name: 'Ung gran', w: 1.8, h: 1.8, shadow: 14, ...TREE, tags: ['arctic', 'mountain'], params: [snowParam], draw: drawFirYoung }),
  kind({
    key: 'tree_apple', family: 'tree', name: 'Æbletræ', w: 3, h: 3, shadow: 24, ...TREE, tags: ['farm', 'village'], draw: drawApple,
    params: [{ key: 'season', label: 'Tilstand', type: 'select', default: 'apples', options: [{ value: 'apples', label: 'Med æbler' }, { value: 'blossom', label: 'Blomstrende' }] }],
  }),
  kind({ key: 'tree_larch', family: 'tree', name: 'Lærk', w: 3.5, h: 3.5, shadow: 26, ...TREE, tags: ['mountain', 'arctic'], params: [{ key: 'autumn', label: 'Gylden', type: 'toggle', default: false }], draw: drawLarch }),
  kind({ key: 'tree_swamp', family: 'tree', name: 'Sumptræ', w: 4, h: 4, shadow: 28, ...TREE, tags: ['swamp'], draw: drawSwamp }),
  kind({ key: 'tree_olive', family: 'tree', name: 'Oliventræ', w: 3, h: 3, shadow: 22, ...TREE, tags: ['farm', 'desert', 'village'], draw: drawOlive }),
];
