/** Deterministisk værdistøj. Samme (x, y, seed) giver altid samme værdi, så et kort kan genskabes ud fra sit seed. */

/** 32 bit uden fortegn: samme (ix, iy, seed) giver altid samme tal. */
export function hash32(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}

function hash(ix: number, iy: number, seed: number): number {
  return hash32(ix, iy, seed) / 4294967296;
}

/** Glat støj i [0, 1). */
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Flere lag støj oven på hinanden, normaliseret til [0, 1). */
export function fbm(x: number, y: number, seed: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Udgang fra `cellular`: afstand til nærmeste og næstnærmeste punkt, nærmeste punkts hash og vektoren derfra (i celler). */
export const cellOut = { f1: 0, f2: 0, h: 0, dx: 0, dy: 0 };

/**
 * Cellestøj (Worley): ét tilfældigt punkt pr. celle; bruges til sten og fliser. `x`, `y` er i celler; `jitter` (0..1) er,
 * hvor langt punktet må ligge fra cellens midte. Resultatet står i `cellOut`.
 */
export function cellular(x: number, y: number, seed: number, jitter: number): void {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  let f1 = 9;
  let f2 = 9;
  let h1 = 0;
  let dx1 = 0;
  let dy1 = 0;
  const off = (1 - jitter) / 2;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const h = hash32(ix + i, iy + j, seed);
      const px = i + off + ((h & 0xffff) / 65536) * jitter;
      const py = j + off + ((h >>> 16) / 65536) * jitter;
      const ddx = fx - px;
      const ddy = fy - py;
      const d = ddx * ddx + ddy * ddy;
      if (d < f1) {
        f2 = f1;
        f1 = d;
        h1 = h;
        dx1 = ddx;
        dy1 = ddy;
      } else if (d < f2) f2 = d;
    }
  }
  cellOut.f1 = Math.sqrt(f1);
  cellOut.f2 = Math.sqrt(f2);
  cellOut.h = h1;
  cellOut.dx = dx1;
  cellOut.dy = dy1;
}
