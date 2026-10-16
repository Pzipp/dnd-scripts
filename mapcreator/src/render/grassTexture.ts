import { hash32 } from './noise';

/**
 * Græsstrå som en lille, sømløs tekstur: ét par tusind buede strå (mørk rod, lys spids, svag skygge) tegnes én gang ved første brug
 * og slås derefter blot op pr. pixel (i stedet for at regne støj). Teksturen gentages hvert `N` verdenspixel; to opslag i forskellig
 * skala og retning skjuler gentagelsen. Til forhåndsvisningen (halv opløsning) findes en udglattet halv størrelse.
 */
const N = 256;
const BLADES = 3400;

interface Tex {
  n: number;
  /** Lysstyrke -1..1 (negativ = rod og skygge, positiv = spids). */
  lum: Float32Array;
  /** 0..1: hvor gulligt strået er. */
  tip: Float32Array;
}

let full: Tex | null = null;
let half: Tex | null = null;

/** Udgang fra `grassDetail`. */
export const grassOut = { lum: 0, tip: 0 };

function splat(t: Tex, x: number, y: number, v: number, tip: number, a: number): void {
  const n = t.n;
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const dx = x - fx;
  const dy = y - fy;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const w = (i ? dx : 1 - dx) * (j ? dy : 1 - dy) * a;
      if (w <= 0.001) continue;
      const px = (((fx + i) % n) + n) % n;
      const py = (((fy + j) % n) + n) % n;
      const k = py * n + px;
      t.lum[k] = t.lum[k]! + (v - t.lum[k]!) * Math.min(1, w);
      t.tip[k] = t.tip[k]! + (tip - t.tip[k]!) * Math.min(1, w);
    }
  }
}

function build(): Tex {
  const t: Tex = { n: N, lum: new Float32Array(N * N), tip: new Float32Array(N * N) };
  const rnd = (i: number, s: number): number => (hash32(i, s, 7717) & 0xffff) / 65536;
  for (let b = 0; b < BLADES; b++) {
    const x0 = rnd(b, 1) * N;
    const y0 = rnd(b, 2) * N;
    // mest opad, men med spredning; nogle få ligger ned
    const lie = rnd(b, 3) < 0.12;
    const ang0 = lie ? rnd(b, 4) * Math.PI * 2 : -Math.PI / 2 + (rnd(b, 4) - 0.5) * 1.7;
    const len = 5 + rnd(b, 5) * 8;
    const bend = (rnd(b, 6) - 0.5) * 0.9;
    const yellow = rnd(b, 7);
    const bright = (rnd(b, 8) - 0.5) * 0.3;
    const steps = Math.ceil(len / 0.55);
    // skygge under strået (forskudt nedad og til højre), tegnet først
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const ang = ang0 + bend * u;
      const x = x0 + Math.cos(ang) * len * u + 1.1;
      const y = y0 + Math.sin(ang) * len * u + 1.1;
      splat(t, x, y, -0.85, 0, 0.26 * (1 - u * 0.5));
    }
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const ang = ang0 + bend * u * u;
      const px = x0 + Math.cos(ang) * len * u;
      const py = y0 + Math.sin(ang) * len * u;
      const v = Math.max(-1, Math.min(1, -0.6 + 1.15 * Math.pow(u, 0.8) + bright));
      const wd = 1.25 - 0.85 * u;
      const nx = -Math.sin(ang) * wd * 0.35;
      const ny = Math.cos(ang) * wd * 0.35;
      splat(t, px + nx, py + ny, v, yellow * u, 0.75);
      splat(t, px - nx, py - ny, v, yellow * u, 0.75);
    }
  }
  return t;
}

function downsample(src: Tex): Tex {
  const n = src.n / 2;
  const t: Tex = { n, lum: new Float32Array(n * n), tip: new Float32Array(n * n) };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = (y * 2) * src.n + x * 2;
      const b = a + src.n;
      const l = (src.lum[a]! + src.lum[a + 1]! + src.lum[b]! + src.lum[b + 1]!) / 4;
      t.lum[y * n + x] = Math.max(-1, Math.min(1, l * 1.35)); // udglatning tager kontrast, så den lægges tilbage
      t.tip[y * n + x] = (src.tip[a]! + src.tip[a + 1]! + src.tip[b]! + src.tip[b + 1]!) / 4;
    }
  }
  return t;
}

/** Sæt `grassOut` (lysstyrke og gulning) for verdenspunktet (x, y); `scale` er pixels pr. verdenspixel (< 0.75 bruger den udglattede tekstur). */
export function grassDetail(x: number, y: number, ox: number, oy: number, scale: number): void {
  full ??= build();
  const useHalf = scale < 0.75;
  if (useHalf) half ??= downsample(full);
  const t = useHalf ? half! : full;
  const n = t.n;
  const k = useHalf ? 0.5 : 1;
  // opslag 1: som det er; opslag 2: drejet og i en anden skala, så teksturens gentagelse ikke ses
  const ax = Math.floor((x + ox) * k) & (n - 1);
  const ay = Math.floor((y + oy) * k) & (n - 1);
  const u = (x * 0.78 + y * 0.62) * 1.27 + ox * 0.3 + 91;
  const v = (-x * 0.62 + y * 0.78) * 1.27 + oy * 0.3 + 57;
  const bx = Math.floor(u * k) & (n - 1);
  const by = Math.floor(v * k) & (n - 1);
  const ia = ay * n + ax;
  const ib = by * n + bx;
  grassOut.lum = t.lum[ia]! + t.lum[ib]! * 0.55;
  grassOut.tip = (t.tip[ia]! + t.tip[ib]!) * 0.5;
}
