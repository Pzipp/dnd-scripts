import { blob, mix, polygon, rgb, rng, shift, smooth, type RGB } from '../util';

/**
 * Fælles motor til de nye og forbedrede basisgenstande (træer, buske, sten, stammer).
 * Alt tegnes med Canvas-stier og gradienter; blade og nåle samles i få store stier pr. farve, så et træ tegnes hurtigt.
 * Lysretning: øverst til venstre. Skygge og dybde nederst til højre.
 */
export const OUTLINE = 'rgba(26,15,8,.86)';
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 0..1: hvor meget lys et punkt får (1 = øverst til venstre) i en genstand med radius R. */
export const litAt = (x: number, y: number, R: number): number => clamp01(0.5 - (x + y) / (R * 1.9));

/** Farve langs en række af stop (t = 0..1). */
export function ramp(cols: RGB[], t: number): RGB {
  const n = cols.length - 1;
  const p = clamp01(t) * n;
  const i = Math.min(n - 1, Math.floor(p));
  return mix(cols[i]!, cols[i + 1]!, p - i);
}

export const tintBy = (c: RGB, t: number): RGB => [c[0] + t * 0.5, c[1] + t, c[2] + t * 0.3];

/** Glat sti uden at starte en ny (til at samle flere former i én sti). */
export function smoothTo(g: CanvasRenderingContext2D, pts: [number, number][]): void {
  const n = pts.length;
  g.moveTo((pts[0]![0] + pts[n - 1]![0]) / 2, (pts[0]![1] + pts[n - 1]![1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  g.closePath();
}

// ------------------------------------------------------------------ blade i bunker

export type LeafShape = 'leaf' | 'round' | 'needle' | 'star';

/** Samler blade (eller nåle) i farvespande og tegner hvert spand med ét fyld. Hurtigt, selv med hundredvis af blade. */
export class Leaves {
  private b: number[][];
  constructor(private cols: RGB[]) {
    this.b = cols.map(() => []);
  }
  /** x, y = midte; ang = retning; len = halv længde; wid = halv bredde. */
  add(bucket: number, x: number, y: number, ang: number, len: number, wid: number): void {
    const k = Math.max(0, Math.min(this.cols.length - 1, bucket | 0));
    this.b[k]!.push(x, y, ang, len, wid);
  }
  flush(g: CanvasRenderingContext2D, shape: LeafShape, alpha = 1, lw = 1): void {
    for (let k = 0; k < this.cols.length; k++) {
      const a = this.b[k]!;
      if (!a.length) continue;
      g.beginPath();
      for (let i = 0; i < a.length; i += 5) {
        const x = a[i]!;
        const y = a[i + 1]!;
        const ang = a[i + 2]!;
        const l = a[i + 3]!;
        const w = a[i + 4]!;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        if (shape === 'round') {
          g.moveTo(x + c * l, y + s * l);
          g.ellipse(x, y, l, Math.max(0.1, w), ang, 0, Math.PI * 2);
        } else if (shape === 'needle') {
          g.moveTo(x - c * l, y - s * l);
          g.lineTo(x + c * l, y + s * l);
        } else if (shape === 'star') {
          for (let q = 0; q < 10; q++) {
            const rr = q % 2 ? l * 0.62 : l;
            const aa = ang + (q * Math.PI) / 5;
            if (q) g.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
            else g.moveTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
          }
          g.closePath();
        } else {
          g.moveTo(x - c * l, y - s * l);
          g.quadraticCurveTo(x - s * w * 2, y + c * w * 2, x + c * l, y + s * l);
          g.quadraticCurveTo(x + s * w * 2, y - c * w * 2, x - c * l, y - s * l);
        }
      }
      if (shape === 'needle') {
        g.strokeStyle = rgb(this.cols[k]!, alpha);
        g.lineWidth = lw;
        g.lineCap = 'round';
        g.stroke();
      } else {
        g.fillStyle = rgb(this.cols[k]!, alpha);
        g.fill();
      }
      a.length = 0;
    }
  }
}

// ------------------------------------------------------------------ løvkrone

export interface CanopySpec {
  /** Farverampe(r) fra mørkest til lysest: [skygge, mørk, mellem, lys, højlys]. Flere ramper blandes lap for lap. */
  ramps: RGB[][];
  lobes: number;
  /** Lappernes størrelse som andel af radius. */
  lobeSize: number;
  leaf: LeafShape;
  /** Bladets halve længde som andel af radius. */
  leafLen: number;
  leafDensity: number;
  rough?: number;
  vary?: number;
  /** Andel af radius (standard .95). */
  scale?: number;
  accents?: { col: RGB; n: number; size: number }[];
  /** Blanke højlys på bladene (laurbær, vedbend). */
  sheen?: number;
  /** Lyse blade langs kanten og små udstikkende blade. */
  rim?: boolean;
  outline?: boolean;
}

interface Lobe {
  x: number;
  y: number;
  lr: number;
  pts: [number, number][];
  ramp: RGB[];
  ri: number;
  grp: number;
}

/**
 * Løvkrone set oppefra: en mørk grundform, mange overlappende lapper med radial belysning, hundredvis af små blade
 * i flere nuancer (lyse mod øverst til venstre), kantskygger mellem lapperne og en samlet belysning ovenpå.
 */
export function canopy(g: CanvasRenderingContext2D, o: { w: number; h: number; seed: number }, S: CanopySpec): number {
  const r = rng(o.seed);
  const R = (Math.min(o.w, o.h) / 2) * (S.scale ?? 0.95);
  const sq = 1 + (r() - 0.5) * 0.2;
  g.save();
  g.scale(sq, 1 / sq);
  const tt = (r() - 0.5) * (S.vary ?? 16);
  const ramps = S.ramps.map((rp) => rp.map((c) => tintBy(c, tt)));
  const base = R * S.lobeSize;
  const rough = S.rough ?? 0.16;
  const lobes: Lobe[] = [];
  let grp = 0;
  const mk = (x: number, y: number, lr: number): void => {
    const ri = Math.floor(r() * ramps.length);
    lobes.push({ x, y, lr, pts: blob(lr, lr * (0.88 + r() * 0.24), rough, 10, r, x, y, r() * 6), ramp: ramps[ri]!, ri, grp });
  };
  const nOuter = Math.max(5, Math.round(S.lobes * 0.38));
  const a0 = r() * 6.28;
  for (let i = 0; i < nOuter; i++) {
    const a = a0 + (i / nOuter) * Math.PI * 2 + (r() - 0.5) * 0.9 * ((Math.PI * 2) / nOuter);
    const lr = base * (0.85 + r() * 0.4);
    const d = R - lr * (0.78 + r() * 0.22);
    mk(Math.cos(a) * d, Math.sin(a) * d, lr);
  }
  grp = 1;
  const nMid = Math.max(4, Math.round(S.lobes * 0.26));
  const am = r() * 6.28;
  for (let i = 0; i < nMid; i++) {
    const a = am + (i / nMid) * Math.PI * 2 + (r() - 0.5) * 0.8;
    const lr = base * (0.9 + r() * 0.45);
    mk(Math.cos(a) * R * (0.38 + r() * 0.18), Math.sin(a) * R * (0.38 + r() * 0.18), lr);
  }
  grp = 2;
  mk((r() - 0.5) * R * 0.15, (r() - 0.5) * R * 0.15, base * 1.45);
  for (let i = 0; i < S.lobes - nOuter - nMid - 1; i++) {
    const lr = base * (0.65 + r() * 0.5);
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * (R - lr) * 0.85;
    mk(Math.cos(a) * d, Math.sin(a) * d, lr);
  }
  const darkest = ramps[0]![0]!;
  // 1) grundform med kontur
  g.lineJoin = 'round';
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1.2, R * 0.045);
  for (const l of lobes) {
    smooth(g, l.pts);
    g.stroke();
  }
  for (const l of lobes) {
    smooth(g, l.pts);
    g.fillStyle = rgb(l.ramp[0]!);
    g.fill();
  }
  g.fillStyle = rgb(ramps[0]![0]!);
  g.beginPath();
  g.arc(0, 0, R * 0.7, 0, Math.PI * 2);
  g.fill();
  if (S.rim) {
    // små mørke blade, der stikker ud over kanten
    const lv = new Leaves([darkest, ramps[0]![1]!]);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2;
      const d = R * (0.93 + r() * 0.07);
      lv.add(i % 2, Math.cos(a) * d, Math.sin(a) * d, a + (r() - 0.5), R * S.leafLen * 1.3, R * S.leafLen * 0.5);
    }
    lv.flush(g, S.leaf === 'needle' ? 'leaf' : S.leaf);
  }
  // 2) lapperne i tre lag (yderst, midt, inderst): klumper med eget lys, kastet skygge og blade, der spiller ud over kanten.
  // Bladene samles pr. lag, så antallet af fyld holdes lavt.
  const flat = ramps.flat();
  const nr = ramps[0]!.length;
  for (let grp2 = 0; grp2 < 3; grp2++) {
    const gl = lobes.filter((l) => l.grp === grp2);
    if (!gl.length) continue;
    g.save();
    g.translate(base * 0.1, base * 0.14);
    g.beginPath();
    for (const l of gl) smoothTo(g, l.pts);
    g.fillStyle = rgb(darkest, 0.5);
    g.fill();
    g.restore();
    const lv = new Leaves(flat);
    for (const l of gl) {
      const lit = clamp01(litAt(l.x, l.y, R) + (r() - 0.5) * 0.22);
      const [c0, c1, c2, c3, c4] = l.ramp as [RGB, RGB, RGB, RGB, RGB];
      const col = ramp([c1, c2, c3], lit);
      smooth(g, l.pts);
      const gr = g.createRadialGradient(l.x - l.lr * 0.36, l.y - l.lr * 0.36, l.lr * 0.05, l.x + l.lr * 0.08, l.y + l.lr * 0.08, l.lr * 1.1);
      gr.addColorStop(0, rgb(mix(col, c4, 0.45)));
      gr.addColorStop(0.5, rgb(col));
      gr.addColorStop(0.9, rgb(mix(col, c0, 0.6)));
      gr.addColorStop(1, rgb(mix(col, c0, 0.8)));
      g.fillStyle = gr;
      g.fill();
      const n = Math.round(S.leafDensity * (l.lr / R) ** 2 * 340);
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * l.lr * 1.06;
        const dx = Math.cos(a) * d;
        const dy = Math.sin(a) * d;
        const loc = clamp01(lit * 0.5 + 0.5 - (dx + dy) / (l.lr * 2.4) + (r() - 0.5) * 0.5 - (d / l.lr) * 0.12);
        const ln = R * S.leafLen * (0.55 + r() * r() * 1.4);
        lv.add(l.ri * nr + loc * (nr - 0.01), l.x + dx, l.y + dy, Math.atan2(dy, dx) + (r() - 0.5) * 1.8, ln, ln * 0.42);
      }
    }
    lv.flush(g, S.leaf, 0.93, Math.max(0.8, R * 0.014));
  }
  // 3) samlet belysning (lys øverst til venstre, dyb skygge nederst til højre) kun hvor der er tegnet
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const lg = g.createLinearGradient(-R * 0.75, -R * 0.75, R * 0.85, R * 0.85);
  lg.addColorStop(0, 'rgba(255,248,190,.20)');
  lg.addColorStop(0.42, 'rgba(255,248,190,0)');
  lg.addColorStop(0.58, 'rgba(8,16,6,0)');
  lg.addColorStop(1, 'rgba(8,16,6,.42)');
  g.fillStyle = lg;
  g.fillRect(-R * 1.1, -R * 1.1, R * 2.2, R * 2.2);
  g.restore();
  // 4) glans, bær, blomster
  if (S.sheen) {
    const lv = new Leaves([ramps[0]![4]!]);
    for (let i = 0; i < S.sheen; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R * 0.85;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      if (litAt(x, y, R) < 0.35) continue;
      lv.add(0, x, y, -0.8 + (r() - 0.5) * 0.6, R * S.leafLen * 0.8, R * S.leafLen * 0.18);
    }
    lv.flush(g, 'leaf', 0.55);
  }
  for (const ac of S.accents ?? []) {
    for (let i = 0; i < ac.n; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R * 0.84;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const s = R * ac.size * (0.8 + r() * 0.4);
      g.fillStyle = 'rgba(14,6,2,.45)';
      g.beginPath();
      g.arc(x + s * 0.25, y + s * 0.3, s * 1.05, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = rgb(shift(ac.col, (r() - 0.5) * 30));
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.beginPath();
      g.arc(x - s * 0.3, y - s * 0.32, s * 0.32, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
  return R;
}

// ------------------------------------------------------------------ nåletræer

export interface ConiferSpec {
  dark: RGB;
  light: RGB;
  tiers: number;
  /** Grene i yderste lag. */
  branches: number;
  /** Grenenes længde i forhold til laget. */
  reach?: number;
  /** Hvor bred grenen er (1 = normal). */
  fat?: number;
  snow?: boolean;
  needle?: RGB;
  /** Kvaste i enden (fyr): 0 = lukket gren. */
  droop?: number;
  tipCol?: RGB;
}

/** Gran/cypres set oppefra: lag af fjeragtige grene med mange nåle, lyse mod øverst til venstre. */
export function conifer(g: CanvasRenderingContext2D, o: { w: number; h: number; seed: number }, S: ConiferSpec): void {
  const r = rng(o.seed);
  const R = (Math.min(o.w, o.h) / 2) * 0.97;
  const dark: RGB = S.snow ? [58, 86, 84] : S.dark;
  const light: RGB = S.snow ? [232, 242, 246] : S.light;
  const tt = (r() - 0.5) * 12;
  const tiers = S.tiers;
  const reach = S.reach ?? 1;
  g.lineCap = 'round';
  // mørk bund, så der ikke ses jord mellem grenene
  smooth(g, blob(R * 0.62, R * 0.62, 0.1, 12, r));
  g.fillStyle = rgb(shift(dark, -22));
  g.fill();
  for (let k = 0; k < tiers; k++) {
    const t = k / Math.max(1, tiers - 1);
    const Rk = R * (1 - t * 0.78);
    const n = Math.round(S.branches * (1.15 - t * 0.4)) + (r() < 0.5 ? 0 : 1);
    const off = r() * 6.28;
    const pal: RGB[] = [0, 0.25, 0.5, 0.75, 1].map((u) => mix(tintBy(dark, tt), tintBy(light, tt), clamp01(t * 0.5 + u * 0.55 - 0.1)));
    const nd = new Leaves(pal);
    for (let j = 0; j < n; j++) {
      const a = off + (j / n) * Math.PI * 2 + (r() - 0.5) * 0.3;
      const L = Rk * (0.9 + r() * 0.16) * reach;
      const hw = ((Math.PI * Rk) / n) * 0.5 * (S.fat ?? 1) * (0.8 + r() * 0.35);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const curl = (r() - 0.5) * 0.22;
      const tx = Math.cos(a + curl) * L;
      const ty = Math.sin(a + curl) * L;
      const facing = 0.5 + 0.5 * Math.cos(a + (Math.PI * 3) / 4);
      const col = mix(tintBy(dark, tt), tintBy(light, tt), clamp01(t * 0.5 + facing * 0.5 - 0.1 + (r() - 0.5) * 0.12));
      // kerne (smal gren)
      g.beginPath();
      g.moveTo(-sa * hw * 0.28, ca * hw * 0.28);
      g.quadraticCurveTo(ca * L * 0.55 - sa * hw * 0.5, sa * L * 0.55 + ca * hw * 0.5, tx, ty);
      g.quadraticCurveTo(ca * L * 0.55 + sa * hw * 0.5, sa * L * 0.55 - ca * hw * 0.5, sa * hw * 0.28, -ca * hw * 0.28);
      g.closePath();
      g.fillStyle = rgb(shift(col, -24));
      g.fill();
      // nåle
      const nn = 10;
      for (let q = 0; q < nn; q++) {
        const u = 0.12 + (q / nn) * 0.9;
        const px = ca * L * u + (tx - ca * L) * u * u;
        const py = sa * L * u + (ty - sa * L) * u * u;
        const w = hw * 2.4 * Math.sin(Math.PI * Math.min(0.98, u * 0.92 + 0.08));
        for (const s of [-1, 1]) {
          for (let m = 0; m < 2; m++) {
            const aa = a + s * (0.7 + r() * 0.35 - u * 0.25);
            const ln = Math.max(R * 0.04, w * (0.5 + r() * 0.4));
            const lit = clamp01(facing * 0.7 + (s < 0 ? 0.2 : -0.1) + (r() - 0.5) * 0.4 + u * 0.12);
            nd.add(lit * 4.99, px + Math.cos(aa) * ln * 0.5, py + Math.sin(aa) * ln * 0.5, aa, ln * 0.5, 0);
          }
        }
      }
      // skyggekant under grenens kerne
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(tx * 0.92, ty * 0.92);
      g.strokeStyle = rgb(mix(light, col, 0.4), 0.45);
      g.lineWidth = Math.max(0.6, R * 0.012);
      g.stroke();
    }
    nd.flush(g, 'needle', 0.95, Math.max(0.9, R * 0.02));
    if (S.snow) {
      g.fillStyle = 'rgba(250,253,255,.55)';
      for (let j = 0; j < n; j++) {
        const a = off + (j / n) * Math.PI * 2;
        const d = Rk * (0.3 + r() * 0.5);
        smooth(g, blob(Rk * 0.1, Rk * 0.07, 0.3, 6, r, Math.cos(a) * d, Math.sin(a) * d, a));
        g.fill();
      }
    }
  }
  // toppen
  const tg = g.createRadialGradient(-R * 0.03, -R * 0.03, 0, 0, 0, R * 0.12);
  tg.addColorStop(0, rgb(S.tipCol ?? mix(light, [255, 255, 220], 0.4)));
  tg.addColorStop(1, rgb(mix(dark, light, 0.4)));
  g.fillStyle = tg;
  g.beginPath();
  g.arc(0, 0, R * 0.07, 0, Math.PI * 2);
  g.fill();
  // samlet lys og skygge
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const lg = g.createLinearGradient(-R * 0.8, -R * 0.8, R * 0.9, R * 0.9);
  lg.addColorStop(0, 'rgba(255,250,200,.12)');
  lg.addColorStop(0.5, 'rgba(0,0,0,0)');
  lg.addColorStop(1, 'rgba(0,10,4,.34)');
  g.fillStyle = lg;
  g.fillRect(-R * 1.1, -R * 1.1, R * 2.2, R * 2.2);
  g.restore();
}

// ------------------------------------------------------------------ grene

export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  d: number;
}

export interface GrowOpts {
  maxDepth: number;
  /** Antal børn pr. forgrening (min, max). */
  kids: [number, number];
  /** Spredning af børnenes vinkel. */
  spread: number;
  /** Børnenes længde i forhold til moderen. */
  shrink: number;
  /** Tykkelse i forhold til moderen. */
  thin: number;
  /** Slingren i vinkel pr. stykke. */
  wander: number;
  pieces?: number;
  minLen?: number;
}

/** Vokser grene (slyngede stykker, aftagende tykkelse). Returnerer spidserne. */
export function growBranches(r: () => number, x: number, y: number, a: number, len: number, w: number, depth: number, O: GrowOpts, out: Seg[], tips: [number, number, number][] = []): [number, number, number][] {
  const pieces = O.pieces ?? 4;
  let cx = x;
  let cy = y;
  let ca = a;
  let cw = w;
  const endW = w * O.thin;
  for (let i = 0; i < pieces; i++) {
    ca += (r() - 0.5) * O.wander;
    const l = (len / pieces) * (0.85 + r() * 0.3);
    const nx = cx + Math.cos(ca) * l;
    const ny = cy + Math.sin(ca) * l;
    const nw = w + (endW - w) * ((i + 1) / pieces);
    out.push({ x1: cx, y1: cy, x2: nx, y2: ny, w: (cw + nw) / 2, d: depth });
    // sidegrene midt på stammen
    if (depth < O.maxDepth && i > 0 && i < pieces - 1 && r() < 0.5 && len * O.shrink > (O.minLen ?? 3)) {
      growBranches(r, nx, ny, ca + (r() < 0.5 ? -1 : 1) * (0.5 + r() * O.spread * 0.5), len * O.shrink * (0.7 + r() * 0.3), nw * 0.7, depth + 1, O, out, tips);
    }
    cx = nx;
    cy = ny;
    cw = nw;
  }
  if (depth < O.maxDepth && len * O.shrink > (O.minLen ?? 3)) {
    const k = O.kids[0] + Math.floor(r() * (O.kids[1] - O.kids[0] + 1));
    for (let i = 0; i < k; i++) {
      const spr = k === 1 ? (r() - 0.5) * O.spread * 0.6 : ((i / (k - 1)) - 0.5) * O.spread + (r() - 0.5) * 0.3;
      growBranches(r, cx, cy, ca + spr, len * O.shrink * (0.75 + r() * 0.3), cw * 0.95, depth + 1, O, out, tips);
    }
  } else tips.push([cx, cy, ca]);
  return tips;
}

/** Tegner grene i fire gennemløb: kontur, krop, lys kant (øverst til venstre) og skyggekant (nederst til højre). Stykker samles efter tykkelse, så antallet af streger holdes nede. */
export function paintBranches(g: CanvasRenderingContext2D, segs: Seg[], base: RGB, opts: { light?: number; outline?: number } = {}): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const ol = opts.outline ?? 1.2;
  const q = (w: number): number => Math.max(1, Math.round(w / 1.4));
  const byW = new Map<number, Seg[]>();
  for (const s of segs) {
    const k = q(s.w);
    const l = byW.get(k);
    if (l) l.push(s);
    else byW.set(k, [s]);
  }
  const keys = [...byW.keys()].sort((a, b) => b - a);
  const trace = (list: Seg[], dx = 0, dy = 0): void => {
    g.beginPath();
    for (const s of list) {
      g.moveTo(s.x1 + dx, s.y1 + dy);
      g.lineTo(s.x2 + dx, s.y2 + dy);
    }
  };
  g.strokeStyle = OUTLINE;
  for (const k of keys) {
    g.lineWidth = k * 1.4 + ol * 2;
    trace(byW.get(k)!);
    g.stroke();
  }
  for (const k of keys) {
    const list = byW.get(k)!;
    const byD = new Map<number, Seg[]>();
    for (const s of list) {
      const l = byD.get(s.d);
      if (l) l.push(s);
      else byD.set(s.d, [s]);
    }
    g.lineWidth = k * 1.4;
    for (const [d, dl] of byD) {
      g.strokeStyle = rgb(shift(base, -d * 7));
      trace(dl);
      g.stroke();
    }
  }
  for (const k of keys) {
    const w = k * 1.4;
    if (w < 2.2) continue;
    const list = byW.get(k)!;
    g.lineWidth = w * 0.32;
    g.strokeStyle = rgb(shift(base, 34 + (opts.light ?? 0)), 0.55);
    trace(list, -w * 0.2, -w * 0.2);
    g.stroke();
    g.strokeStyle = 'rgba(10,5,2,.34)';
    trace(list, w * 0.24, w * 0.24);
    g.stroke();
  }
}

// ------------------------------------------------------------------ sten

export interface RockPal {
  base: RGB;
  hi: RGB;
  lo: RGB;
  /** Farve på korn og sprækker. */
  grain: RGB;
}

export const ROCK_PALS: Record<string, RockPal> = {
  grey: { base: [128, 128, 122], hi: [196, 196, 186], lo: [58, 58, 62], grain: [60, 60, 58] },
  dark: { base: [86, 86, 90], hi: [150, 152, 158], lo: [30, 30, 36], grain: [28, 28, 32] },
  sandstone: { base: [176, 146, 106], hi: [236, 208, 160], lo: [96, 70, 48], grain: [110, 80, 54] },
  limestone: { base: [196, 190, 172], hi: [240, 236, 220], lo: [116, 108, 94], grain: [120, 112, 98] },
  slate: { base: [92, 98, 108], hi: [150, 158, 170], lo: [38, 42, 52], grain: [40, 44, 54] },
  flint: { base: [66, 70, 78], hi: [128, 136, 148], lo: [20, 22, 28], grain: [226, 222, 208] },
  red: { base: [150, 98, 78], hi: [212, 154, 120], lo: [76, 42, 34], grain: [88, 50, 40] },
  ice: { base: [150, 186, 206], hi: [236, 248, 255], lo: [64, 98, 130], grain: [220, 240, 250] },
};

export interface RockOpts {
  n?: number;
  rough?: number;
  rot?: number;
  /** Mængde mos 0..1 (på oversiden). */
  moss?: number;
  lichen?: number;
  snow?: number;
  /** Vandrette lag (skifer, sandsten). */
  strata?: number;
  cracks?: number;
  grain?: number;
  /** Afrundet (flodsten) i stedet for kantet. */
  round?: boolean;
  /** Ingen kontaktskygge (i stenbunker tegnes den samlet). */
  noShadow?: boolean;
  /** Højde: hvor stærkt toppen løftes (kontrast i facetterne). */
  relief?: number;
}

export function mossClumps(g: CanvasRenderingContext2D, r: () => number, cx: number, cy: number, rx: number, ry: number, n: number, size: number, dry = false): void {
  const cols: RGB[] = dry ? [[78, 92, 40], [118, 132, 58], [166, 176, 88]] : [[40, 84, 34], [70, 124, 46], [122, 168, 70]];
  const dots: number[][] = [[], [], []];
  // mosplamager: et tæppe af små, tætte prikker i tre nuancer, lysest øverst til venstre
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const px = cx + Math.cos(a) * d * rx;
    const py = cy + Math.sin(a) * d * ry;
    const s = size * (0.7 + r() * 0.7);
    const m = 12 + Math.floor(s * 0.6);
    for (let k = 0; k < m; k++) {
      const aa = r() * Math.PI * 2;
      const dd = Math.sqrt(r()) * s;
      const x = px + Math.cos(aa) * dd;
      const y = py + Math.sin(aa) * dd * 0.8;
      const lit = clamp01(0.5 - (Math.cos(aa) + Math.sin(aa)) * 0.3 - (dd / s) * 0.15 + (r() - 0.5) * 0.5);
      dots[lit < 0.33 ? 0 : lit < 0.66 ? 1 : 2]!.push(x, y, s * (0.1 + r() * 0.16));
    }
  }
  cols.forEach((c, t) => {
    const a = dots[t]!;
    g.beginPath();
    for (let i = 0; i < a.length; i += 3) {
      g.moveTo(a[i]! + a[i + 2]!, a[i + 1]!);
      g.arc(a[i]!, a[i + 1]!, a[i + 2]!, 0, Math.PI * 2);
    }
    g.fillStyle = rgb(c, 0.92);
    g.fill();
  });
}

/** Kantet eller rund sten set oppefra, med affasede facetter, korn, sprækker, lav, mos og sne. Returnerer omridset. */
export function rockBody(g: CanvasRenderingContext2D, r: () => number, cx: number, cy: number, rx: number, ry: number, pal: RockPal, O: RockOpts = {}): [number, number][] {
  const n = O.n ?? 10;
  const rough = O.rough ?? 0.2;
  const rot = O.rot ?? r() * 6.28;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.55 * ((Math.PI * 2) / n);
    const k = 1 + (r() - 0.5) * 2 * rough;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const rel = O.relief ?? 1;
  const path = () => (O.round ? smooth(g, pts) : polygon(g, pts));
  // kroppen
  path();
  const bg = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  bg.addColorStop(0, rgb(mix(pal.base, pal.hi, 0.55)));
  bg.addColorStop(0.5, rgb(pal.base));
  bg.addColorStop(1, rgb(mix(pal.base, pal.lo, 0.75)));
  g.fillStyle = bg;
  g.fill();
  g.save();
  path();
  g.clip();
  // facetter: ring af skråflader og en top, hver lyst efter sin retning
  const k2 = 0.56;
  const inner: [number, number][] = pts.map((p) => [cx + (p[0] - cx) * k2 + (r() - 0.5) * rx * 0.14 - rx * 0.05, cy + (p[1] - cy) * k2 + (r() - 0.5) * ry * 0.14 - ry * 0.06]);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    const p2 = inner[i]!;
    const q2 = inner[(i + 1) % n]!;
    const mx = (p[0] + q[0]) / 2 - cx;
    const my = (p[1] + q[1]) / 2 - cy;
    const l = Math.hypot(mx, my) || 1;
    const lit = -(mx / l) * 0.72 - (my / l) * 0.72 + (r() - 0.5) * 0.25;
    polygon(g, [p, q, q2, p2]);
    g.fillStyle = lit > 0 ? rgb(pal.hi, Math.min(0.62, lit * 0.5 * rel)) : rgb(pal.lo, Math.min(0.62, -lit * 0.62 * rel));
    g.fill();
    // kantlys på de lyse ribber
    if (lit > 0.25) {
      g.beginPath();
      g.moveTo(p2[0], p2[1]);
      g.lineTo(q2[0], q2[1]);
      g.strokeStyle = rgb(pal.hi, 0.4);
      g.lineWidth = Math.max(0.6, rx * 0.02);
      g.stroke();
    }
  }
  // toppladen: blød lys-til-skygge
  polygon(g, inner);
  const tg = g.createLinearGradient(cx - rx * 0.5, cy - ry * 0.5, cx + rx * 0.4, cy + ry * 0.4);
  tg.addColorStop(0, rgb(pal.hi, 0.38 * rel));
  tg.addColorStop(1, rgb(pal.lo, 0.2 * rel));
  g.fillStyle = tg;
  g.fill();
  // lag
  if (O.strata) {
    g.lineWidth = Math.max(0.6, ry * 0.025);
    for (let i = 0; i < O.strata; i++) {
      const y = cy - ry + ((i + 0.5 + (r() - 0.5) * 0.5) / O.strata) * ry * 2;
      g.beginPath();
      g.moveTo(cx - rx * 1.1, y);
      for (let x = -1; x <= 1.01; x += 0.25) g.lineTo(cx + x * rx * 1.1, y + (r() - 0.5) * ry * 0.1);
      g.strokeStyle = rgb(pal.lo, 0.35);
      g.stroke();
      g.beginPath();
      g.moveTo(cx - rx * 1.1, y + ry * 0.03);
      g.lineTo(cx + rx * 1.1, y + ry * 0.03 + (r() - 0.5) * ry * 0.06);
      g.strokeStyle = rgb(pal.hi, 0.18);
      g.stroke();
    }
  }
  // korn
  const grains = Math.round((O.grain ?? 26) * Math.min(1.6, (rx * ry) / 900 + 0.4));
  for (let i = 0; i < grains; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.95;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    g.fillStyle = rgb(pal.grain, 0.18 + r() * 0.3);
    g.beginPath();
    g.arc(x, y, Math.max(0.5, rx * (0.012 + r() * 0.022)), 0, Math.PI * 2);
    g.fill();
  }
  // sprækker med lys kant
  const nc = O.cracks ?? 2;
  for (let i = 0; i < nc; i++) {
    const a = r() * Math.PI * 2;
    let x = cx + Math.cos(a) * rx * 0.9;
    let y = cy + Math.sin(a) * ry * 0.9;
    const tx = cx + (r() - 0.5) * rx * 0.5;
    const ty = cy + (r() - 0.5) * ry * 0.5;
    const seg = 5;
    const cp: [number, number][] = [[x, y]];
    for (let s = 1; s <= seg; s++) {
      x += (tx - x) / (seg - s + 1) + (r() - 0.5) * rx * 0.22;
      y += (ty - y) / (seg - s + 1) + (r() - 0.5) * ry * 0.22;
      cp.push([x, y]);
    }
    const stroke = (dx: number, dy: number, col: string, w: number) => {
      g.beginPath();
      cp.forEach((p, j) => (j ? g.lineTo(p[0] + dx, p[1] + dy) : g.moveTo(p[0] + dx, p[1] + dy)));
      g.strokeStyle = col;
      g.lineWidth = w;
      g.stroke();
    };
    const w = Math.max(0.6, rx * 0.022);
    stroke(w * 0.7, w * 0.7, rgb(pal.hi, 0.3), w);
    stroke(0, 0, rgb(pal.lo, 0.85), w);
  }
  // lav
  if (O.lichen) {
    for (let i = 0; i < Math.round(O.lichen * 7); i++) {
      const x = cx + (r() - 0.65) * rx * 1.1;
      const y = cy + (r() - 0.65) * ry * 1.1;
      const col: RGB = r() < 0.5 ? [206, 186, 80] : [168, 190, 140];
      for (let q = 0; q < 7; q++) {
        g.fillStyle = rgb(col, 0.5 + r() * 0.3);
        g.beginPath();
        g.arc(x + (r() - 0.5) * rx * 0.1, y + (r() - 0.5) * ry * 0.1, Math.max(0.6, rx * (0.012 + r() * 0.024)), 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // mos: tykkest på oversiden mod øverst til venstre
  if (O.moss) {
    mossClumps(g, r, cx - rx * 0.22, cy - ry * 0.22, rx * 0.75, ry * 0.7, Math.round(4 + O.moss * 12), Math.min(rx, ry) * (0.16 + O.moss * 0.1));
  }
  if (O.snow) {
    const sn = O.snow;
    for (let i = 0; i < 4; i++) {
      const bx = cx - rx * (0.08 + r() * 0.3);
      const by = cy - ry * (0.08 + r() * 0.3);
      const bs = rx * (0.2 + sn * 0.2 + r() * 0.1);
      smooth(g, blob(bs, bs * (0.75 + r() * 0.3), 0.3, 8, r, bx, by + bs * 0.12));
      g.fillStyle = 'rgba(110,140,180,.55)';
      g.fill();
      smooth(g, blob(bs, bs * (0.75 + r() * 0.3), 0.3, 8, r, bx, by));
      const sg = g.createRadialGradient(bx - bs * 0.3, by - bs * 0.3, bs * 0.1, bx, by, bs * 1.1);
      sg.addColorStop(0, 'rgb(255,255,255)');
      sg.addColorStop(1, 'rgb(208,224,240)');
      g.fillStyle = sg;
      g.fill();
    }
  }
  g.restore();
  // kontur
  path();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, rx * 0.05);
  g.lineJoin = 'round';
  g.stroke();
  // lys kant øverst til venstre
  g.save();
  path();
  g.clip();
  path();
  g.translate(rx * 0.035, ry * 0.035);
  g.strokeStyle = rgb(pal.hi, 0.35);
  g.lineWidth = Math.max(0.6, rx * 0.03);
  g.stroke();
  g.restore();
  return pts;
}

export { rng };
