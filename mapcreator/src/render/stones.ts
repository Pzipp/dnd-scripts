import { fbm, hash32, smoothstep, valueNoise } from './noise';

/**
 * Sten i rækker (brosten, fliser): hver sten er en hel, afrundet sten i en forskudt række, som i genstanden "Brosten".
 * Terrænet afgør pr. sten, om den hører til materialet (se `stoneAt` og `ground.ts`), så en overgang består af hele sten
 * og aldrig af halve. Alt regnes i verdenskoordinater og uden tilstand, så fliser og zoom giver samme billede.
 */
export interface StoneStyle {
  /** Rækkehøjde (verdenspixels). */
  rowH: number;
  /** Stenens bredde i rækkehøjder: mindste og største. */
  wMin: number;
  wMax: number;
  /** Fuge mellem stenene (verdenspixels). */
  gap: number;
  /** Afrunding som andel af den korteste halvside. */
  round: number;
  /** Laveste grå og spredning mellem stenene. */
  lo: number;
  spread: number;
  /** Farveskær: tillæg til rød, grøn, blå (efter grå). */
  tint: [number, number, number];
  /** Træplanker i stedet for sten: farve og åretegning. */
  wood?: boolean;
}

export const STONE_STYLES: Record<number, StoneStyle> = {
  14: { rowH: 15, wMin: 0.9, wMax: 1.55, gap: 1.8, round: 0.4, lo: 104, spread: 56, tint: [10, 3, -10] },
  17: { rowH: 14, wMin: 5, wMax: 9, gap: 1.4, round: 0.08, lo: 0, spread: 0, tint: [0, 0, 0], wood: true },
  16: { rowH: 36, wMin: 1.0, wMax: 2.0, gap: 2.6, round: 0.13, lo: 116, spread: 46, tint: [-2, 0, 6] },
};

export const isStoneMaterial = (id: number): boolean => id in STONE_STYLES;

/** Stenen, `stoneAt` sidst fandt: midte, halve mål og to hashværdier. Cellen er rækken og søjlen den ligger i. */
export const stone = { row: 0, col: 0, cx: 0, cy: 0, hw: 0, hh: 0, a: 0, b: 0 };

const h01 = (x: number, y: number, seed: number): number => (hash32(x, y, seed) & 0xffff) / 65536;

/** Find stenen (sten-materialet `id`), som verdenspunktet (x, y) ligger i eller ved siden af; resultatet står i `stone`. */
export function stoneAt(id: number, x: number, y: number, seed: number): void {
  const st = STONE_STYLES[id]!;
  const s = seed + id * 7;
  const row = Math.floor(y / st.rowH);
  const avg = st.rowH * (st.wMin + st.wMax) / 2;
  const off = h01(row, 1, s + 301) * avg;
  const k0 = Math.floor((x - off) / avg);
  const bound = (k: number): number => off + k * avg + (h01(row, k, s + 303) - 0.5) * 0.6 * avg;
  let k = k0;
  if (x < bound(k0)) k = k0 - 1;
  else if (x >= bound(k0 + 1)) k = k0 + 1;
  const x0 = bound(k);
  const x1 = bound(k + 1);
  const hash = hash32(row, k, s + 305);
  const tall = 0.86 + 0.14 * ((hash >>> 20) / 4096);
  stone.row = row;
  stone.col = k;
  stone.cx = (x0 + x1) / 2 + (((hash >>> 4) & 255) / 255 - 0.5) * 0.8;
  stone.cy = (row + 0.5) * st.rowH + (((hash >>> 12) & 255) / 255 - 0.5) * 0.8;
  stone.hw = (x1 - x0 - st.gap) / 2;
  stone.hh = (st.rowH * tall - st.gap) / 2;
  stone.a = (hash & 255) / 255;
  stone.b = ((hash >>> 8) & 255) / 255;
}

/** Tegn stenen (eller fugen) i punktet (x, y) til `out` (r, g, b, a); `stone` skal være sat af `stoneAt` for samme punkt. */
export function stoneColor(out: Float64Array, id: number, x: number, y: number, seed: number): void {
  const st = STONE_STYLES[id]!;
  seed += id * 7;
  const lx = x - stone.cx;
  const ly = y - stone.cy;
  const hw = stone.hw;
  const hh = stone.hh;
  const rad = Math.max(0.5, Math.min(hw, hh) * st.round * 2);
  const qx = Math.abs(lx) - (hw - rad);
  const qy = Math.abs(ly) - (hh - rad);
  const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
  const grain = valueNoise(x / 2.4, y / 2.4, seed + 311) - 0.5;
  // fuge: mørk jord, mørkere helt inde mellem stenene
  const mort = (st.wood ? 28 : 48) + grain * 12;
  const cover = smoothstep(0.55, -0.55, d);
  let r = mort + (st.wood ? 8 : 6);
  let g = mort + (st.wood ? 2 : 1);
  let b = mort + (st.wood ? -6 : -4);
  if (d > 0) {
    // skygge ned og til højre fra stenen
    const sh = smoothstep(2.6, 0, d) * (lx > 0 || ly > 0 ? 0.3 : 0.1);
    r *= 1 - sh; g *= 1 - sh; b *= 1 - sh;
  }
  if (cover > 0) {
    if (st.wood) {
      // planke: årer langs længden, lysere i midten, mørkere ved kanterne
      const e = smoothstep(-1.8, 0, d);
      const gr = Math.sin((x + stone.a * 90) / 7 + valueNoise(x / 30, y / 2, seed + 315) * 7) * 0.5 + 0.5;
      const t = 0.15 + stone.a * 0.7;
      const k = (gr - 0.5) * 16 + grain * 9 + (1 - Math.abs(ly / hh)) * 7 - e * 16;
      const pr = 108 + (164 - 108) * t + k;
      const pg = 74 + (118 - 74) * t + k * 0.8;
      const pb = 44 + (70 - 44) * t + k * 0.55;
      r += (pr - r) * cover;
      g += (pg - g) * cover;
      b += (pb - b) * cover;
      out[0] = r; out[1] = g; out[2] = b; out[3] = 1;
      return;
    }
    const mott = (fbm(x / 9, y / 9, seed + 313, 2) - 0.5) * 22;
    const base = st.lo + stone.a * st.spread + mott + grain * 12;
    const nx = lx / hw;
    const ny = ly / hh;
    // buet flade: lysere i midten og mod øverst til venstre, mørkere ved kanten og nederst til højre
    const dome = 1 - Math.min(1, nx * nx + ny * ny);
    const e = smoothstep(-2.6, 0, d);
    const light = -(nx + ny) * 14 * (0.4 + e) + dome * 9 - e * 20 + (stone.b - 0.5) * 8;
    const v = base + light;
    const sr = v + st.tint[0] + stone.b * 8;
    const sg = v + st.tint[1] + stone.b * 3;
    const sb = v + st.tint[2] - stone.b * 6;
    r += (sr - r) * cover;
    g += (sg - g) * cover;
    b += (sb - b) * cover;
  }
  out[0] = r;
  out[1] = g;
  out[2] = b;
  out[3] = 1;
}

/** Terrænfarven for et helt område af sten-materiale `id` i punktet (x, y). */
export function stoneShade(out: Float64Array, id: number, x: number, y: number, seed: number): void {
  stoneAt(id, x, y, seed);
  stoneColor(out, id, x, y, seed);
}
