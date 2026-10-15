import { rgb, rng, type RGB } from '../util';

/** Fælles hjælp til pakke 4 (landskab og konstruktioner): støj, højdefelter med skygge og lys, små tegnehjælpere. */
export type G = CanvasRenderingContext2D;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const mixc = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Glat værdistøj (0..1) med fast heltal-hash; `seed` giver et nyt mønster. */
export function makeNoise(seed: number): (x: number, y: number) => number {
  const s = (seed * 2654435761) >>> 0;
  const h = (ix: number, iy: number): number => {
    let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + s) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = h(ix, iy);
    const b = h(ix + 1, iy);
    const c = h(ix, iy + 1);
    const d = h(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export function fbm(n: (x: number, y: number) => number, x: number, y: number, oct: number): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += n(x * f + i * 17.3, y * f - i * 9.1) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

export const hasDom = (): boolean => typeof document !== 'undefined' && typeof document.createElement === 'function';

/** Lysretning (øverst til venstre), normaliseret. */
const LX = -0.55;
const LY = -0.62;
const LZ = 0.56;
const LN = Math.hypot(LX, LY, LZ);
export const LIGHT: [number, number, number] = [LX / LN, LY / LN, LZ / LN];

export interface FieldPixel {
  /** Højde 0..1 (ca.), normaliseret lysværdi -1..1 og skygge 0..1 (1 = i skygge). */
  h: number;
  lit: number;
  shade: number;
  slope: number;
  u: number;
  v: number;
  /** Afstand fra kanten af afdækningen (0 = udenfor). */
  alpha: number;
}

export interface ReliefOpts {
  /** Opløsning langs den længste led. */
  res: number;
  /** Højdefelt i enhedskoordinater u, v in [-1, 1]; returnerer højde (>= 0). */
  height: (u: number, v: number, i: number, j: number) => number;
  /** Farve for en celle (rgb 0..255) og alfa; får lys og skygge udregnet. */
  color: (p: FieldPixel, out: RGB) => void;
  /** Tærskel for, hvornår højden tæller som genstand (alfa fra 0 til 1 over [lo, hi]). */
  edge?: [number, number];
  /** Hvor stejlt overfladen lyser (højere = mere relief). */
  relief?: number;
  /** Længde af kastet skygge (andel af bredden, 0 = ingen). */
  castLen?: number;
}

/** Tegner et højdefelt som skyggelagt relief (lys fra øverst til venstre) i boksen [-w/2..w/2] x [-h/2..h/2]. */
export function drawRelief(g: G, w: number, h: number, o: ReliefOpts): void {
  if (!hasDom()) {
    // testmiljø uden lærred: tegn en enkel plet, så funktionen stadig kører
    g.beginPath();
    g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    g.fill();
    return;
  }
  const aspect = w / h;
  const RW = aspect >= 1 ? o.res : Math.max(16, Math.round(o.res * aspect));
  const RH = aspect >= 1 ? Math.max(16, Math.round(o.res / aspect)) : o.res;
  const H = new Float32Array(RW * RH);
  for (let j = 0; j < RH; j++) {
    const v = ((j + 0.5) / RH) * 2 - 1;
    for (let i = 0; i < RW; i++) {
      const u = ((i + 0.5) / RW) * 2 - 1;
      H[j * RW + i] = o.height(u, v, i, j);
    }
  }
  const [e0, e1] = o.edge ?? [0.02, 0.09];
  const rel = (o.relief ?? 1) * (RW / 2.4);
  const cast = o.castLen ?? 0.22;
  const steps = 9;
  const cv = document.createElement('canvas');
  cv.width = RW;
  cv.height = RH;
  const cg = cv.getContext('2d')!;
  const img = cg.createImageData(RW, RH);
  const px = img.data;
  const out: RGB = [0, 0, 0];
  const at = (i: number, j: number): number => H[clamp(j, 0, RH - 1) * RW + clamp(i, 0, RW - 1)]!;
  const castDx = LIGHT[0] / Math.hypot(LIGHT[0], LIGHT[1]);
  const castDy = LIGHT[1] / Math.hypot(LIGHT[0], LIGHT[1]);
  for (let j = 0; j < RH; j++) {
    for (let i = 0; i < RW; i++) {
      const hh = H[j * RW + i]!;
      const alpha = smoothstep(e0, e1, hh);
      const k = (j * RW + i) * 4;
      if (alpha <= 0.002) {
        px[k + 3] = 0;
        continue;
      }
      const dx = (at(i + 1, j) - at(i - 1, j)) * 0.5 * rel;
      const dy = (at(i, j + 1) - at(i, j - 1)) * 0.5 * rel;
      const nl = Math.hypot(dx, dy, 1);
      const lit = clamp(((-dx * LIGHT[0] - dy * LIGHT[1] + LIGHT[2]) / nl - 0.55) * 2.2, -1, 1);
      // kastet skygge: ser mod lyset, om noget højere står i vejen
      let shade = 0;
      if (cast > 0) {
        for (let s = 1; s <= steps; s++) {
          const d = (s / steps) * cast * RW;
          const hx = at(Math.round(i + castDx * d), Math.round(j + castDy * d));
          const need = hh + (d / RW) * 1.5;
          if (hx > need) {
            shade = Math.max(shade, clamp((hx - need) * 6, 0, 1));
            if (shade >= 1) break;
          }
        }
      }
      out[0] = 0; out[1] = 0; out[2] = 0;
      o.color({ h: hh, lit, shade, slope: nl - 1, u: ((i + 0.5) / RW) * 2 - 1, v: ((j + 0.5) / RH) * 2 - 1, alpha }, out);
      px[k] = clamp(out[0], 0, 255);
      px[k + 1] = clamp(out[1], 0, 255);
      px[k + 2] = clamp(out[2], 0, 255);
      px[k + 3] = Math.round(alpha * 255);
    }
  }
  cg.putImageData(img, 0, 0);
  g.save();
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(cv, -w / 2, -h / 2, w, h);
  g.restore();
}

/** Tilfældigt heltal i [a, b]. */
export const rint = (r: () => number, a: number, b: number): number => a + Math.floor(r() * (b - a + 1));
export const rf = (r: () => number, a: number, b: number): number => a + r() * (b - a);

export { rng };

/** Billig sten (7 hjørner): fyld, mørk kontur og lys plet øverst til venstre. */
export function pebble(g: G, r: () => number, x: number, y: number, s: number, col: RGB): void {
  const n = 7;
  const rot = r() * 6.28;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * 6.283;
    const k = 0.72 + r() * 0.5;
    const px = x + Math.cos(a) * s * k;
    const py = y + Math.sin(a) * s * k * 0.8;
    if (i) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.closePath();
  g.fillStyle = rgb([col[0] - 14, col[1] - 14, col[2] - 12]);
  g.fill();
  g.strokeStyle = 'rgba(18,10,6,.8)';
  g.lineWidth = Math.max(0.7, s * 0.16);
  g.stroke();
  g.fillStyle = rgb([col[0] + 30, col[1] + 28, col[2] + 22], 0.8);
  g.beginPath();
  g.ellipse(x - s * 0.22, y - s * 0.24, s * 0.42, s * 0.3, -0.5, 0, 7);
  g.fill();
}
