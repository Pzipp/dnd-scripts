import { fbm, smoothstep, valueNoise } from './noise';

/** Terrænmaterialer. Id'erne gemmes i kortene og må aldrig omnummereres. 0 = tomt. */
export interface Material {
  id: number;
  key: string;
  name: string;
  /** Farve til paletten i brugerfladen. */
  swatch: string;
}

export const MATERIALS: Material[] = [
  { id: 1, key: 'grass', name: 'Græs', swatch: '#6fa043' },
  { id: 2, key: 'earth', name: 'Jord', swatch: '#9a7a52' },
  { id: 3, key: 'sand', name: 'Sand', swatch: '#dcc592' },
  { id: 4, key: 'desert', name: 'Ørken', swatch: '#c9905c' },
  { id: 5, key: 'stone', name: 'Sten', swatch: '#8f8e86' },
  { id: 6, key: 'water', name: 'Vand', swatch: '#3f8fb0' },
  { id: 7, key: 'snow', name: 'Sne', swatch: '#e4ecf2' },
  { id: 8, key: 'mud', name: 'Mudder', swatch: '#6d6040' },
];

export const MATERIAL_GRASS = 1;
export const MATERIAL_WATER = 6;

function tint(out: Float64Array, r: number, g: number, b: number): void {
  out[0] = out[0]! + r;
  out[1] = out[1]! + g;
  out[2] = out[2]! + b;
}

/** Udgang fra `shade`: r, g, b (0..255) og a (0..1). */
export const shadeOut = new Float64Array(4);

function mix3(out: Float64Array, r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number): void {
  out[0] = r1 + (r2 - r1) * t;
  out[1] = g1 + (g2 - g1) * t;
  out[2] = b1 + (b2 - b1) * t;
}

/**
 * Farven på materiale `id` i verdenspunktet (x, y), skrevet til `shadeOut`.
 * `margin` (0..1) er hvor langt inde i materialet punktet ligger (lavt = ved en kant).
 */
export function shade(id: number, x: number, y: number, seed: number, margin: number): void {
  const o = shadeOut;
  o[3] = 1;
  const grain = valueNoise(x / 5, y / 5, seed + 7) - 0.5;
  switch (id) {
    case 1: {
      // græs: store pletter af lys og mørk, fint korn og enkelte mørke totter
      const t = smoothstep(0.3, 0.7, fbm(x / 240, y / 240, seed + 1, 3));
      mix3(o, 78, 128, 46, 138, 172, 72, t);
      const tuft = smoothstep(0.62, 0.8, valueNoise(x / 14, y / 14, seed + 3));
      const k = grain * 22 - tuft * 18;
      tint(o, k * 0.6, k, k * 0.4);
      return;
    }
    case 2: {
      const t = smoothstep(0.3, 0.7, fbm(x / 180, y / 180, seed + 11, 3));
      mix3(o, 122, 94, 62, 164, 134, 92, t);
      const peb = smoothstep(0.72, 0.8, valueNoise(x / 9, y / 9, seed + 13));
      const k = grain * 18 + peb * 26;
      tint(o, k, k, k * 0.8);
      return;
    }
    case 3: {
      const f = fbm(x / 200, y / 200, seed + 21, 3);
      mix3(o, 208, 182, 124, 232, 212, 160, smoothstep(0.3, 0.7, f));
      const ripple = Math.sin((x * 0.45 + y) / 16 + f * 9) * 7;
      const k = grain * 10 + ripple;
      tint(o, k, k, k * 0.9);
      return;
    }
    case 4: {
      const f = fbm(x / 260, y / 260, seed + 31, 3);
      mix3(o, 190, 134, 86, 216, 168, 112, smoothstep(0.3, 0.7, f));
      const crack = smoothstep(0.47, 0.5, Math.abs(fbm(x / 70, y / 70, seed + 33, 2) - 0.5) + 0.47);
      const k = grain * 14 - (1 - crack) * 24;
      tint(o, k, k * 0.9, k * 0.7);
      return;
    }
    case 5: {
      const f = fbm(x / 120, y / 120, seed + 41, 3);
      mix3(o, 120, 120, 114, 160, 158, 150, smoothstep(0.3, 0.7, f));
      const k = grain * 26;
      tint(o, k, k, k);
      return;
    }
    case 6: {
      // vand: lyst og gennemsigtigt ved kanten, dybere inde; bånd af lys som svage bølger
      const depth = smoothstep(0.05, 0.95, margin);
      mix3(o, 104, 176, 188, 36, 104, 140, depth);
      const f = fbm(x / 90, y / 90, seed + 51, 3);
      const wave = smoothstep(0.78, 1, Math.sin(f * 22));
      const k = wave * 26 + grain * 6;
      tint(o, k * 0.7, k, k);
      return;
    }
    case 7: {
      const f = fbm(x / 160, y / 160, seed + 61, 3);
      mix3(o, 236, 241, 245, 212, 225, 238, smoothstep(0.3, 0.7, f));
      const k = grain * 8;
      tint(o, k, k, k * 0.5);
      return;
    }
    case 8: {
      const f = fbm(x / 140, y / 140, seed + 71, 3);
      mix3(o, 82, 72, 46, 112, 100, 62, smoothstep(0.3, 0.7, f));
      const k = grain * 12;
      tint(o, k, k, k * 0.6);
      return;
    }
    default:
      o[0] = o[1] = o[2] = 0;
      o[3] = 0;
  }
}
