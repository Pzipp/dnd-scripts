import { grassDetail, grassOut } from './grassTexture';
import { stoneShade } from './stones';
import { IMAGE_MATERIALS } from './imageMaterials';
import { isImageMaterial, sampleTexture, textureAverage } from './imageTextures';
import { cellOut, cellular, fbm, hash32, smoothstep, valueNoise } from './noise';

/** Terrænmaterialer. Id'erne gemmes i kortene og må aldrig omnummereres. 0 = tomt. */
export interface Material {
  id: number;
  key: string;
  name: string;
  /** Farve til paletten i brugerfladen. */
  swatch: string;
  /** Overskrift i paletten. */
  group: string;
  /** Hård kant mod naboen (brosten, fliser, gulv) i stedet for en blød, ujævn overgang. */
  crisp?: boolean;
  /** Kan lægges som sti oven på andet terræn. */
  pathable?: boolean;
}

export const MATERIAL_GROUPS = ['Natur', 'Sand og sten', 'Vand', 'Lava', 'Veje og gulve', 'Tomrum'];

export const MATERIALS: Material[] = [
  { id: 1, key: 'grass', name: 'Græs, mark', swatch: '#6fa043', group: 'Natur' },
  { id: 9, key: 'grass_forest', name: 'Græs, skov', swatch: '#3f7138', group: 'Natur' },
  { id: 10, key: 'grass_dry', name: 'Græs, tørt', swatch: '#b4a458', group: 'Natur' },
  { id: 2, key: 'earth', name: 'Jord', swatch: '#9a7a52', group: 'Natur', pathable: true },
  { id: 8, key: 'mud', name: 'Mudder', swatch: '#6d6040', group: 'Natur', pathable: true },
  { id: 7, key: 'snow', name: 'Sne', swatch: '#e4ecf2', group: 'Natur', pathable: true },
  { id: 3, key: 'sand', name: 'Sand', swatch: '#dcc592', group: 'Sand og sten', pathable: true },
  { id: 11, key: 'sand_pale', name: 'Sand, strand', swatch: '#efe3bd', group: 'Sand og sten', pathable: true },
  { id: 12, key: 'sand_red', name: 'Sand, rødt', swatch: '#c96e44', group: 'Sand og sten', pathable: true },
  { id: 13, key: 'sand_dark', name: 'Sand, mørkt', swatch: '#867660', group: 'Sand og sten', pathable: true },
  { id: 4, key: 'desert', name: 'Ørken', swatch: '#c9905c', group: 'Sand og sten', pathable: true },
  { id: 5, key: 'stone', name: 'Sten', swatch: '#8f8e86', group: 'Sand og sten', pathable: true },
  { id: 6, key: 'water', name: 'Vand', swatch: '#3f8fb0', group: 'Vand' },
  { id: 14, key: 'cobble', name: 'Brosten', swatch: '#8d867a', group: 'Veje og gulve', crisp: true, pathable: true },
  { id: 15, key: 'gravel', name: 'Grus', swatch: '#a39a88', group: 'Veje og gulve', pathable: true },
  { id: 16, key: 'flagstone', name: 'Fliser', swatch: '#9a9ca0', group: 'Veje og gulve', crisp: true, pathable: true },
  { id: 18, key: 'rock_dark', name: 'Fjeld, mørkt', swatch: '#3b3835', group: 'Sand og sten' },
  { id: 19, key: 'void_brown', name: 'Tomrum, brun klippekant', swatch: '#14100d', group: 'Tomrum' },
  { id: 20, key: 'void_purple', name: 'Tomrum, lilla klippekant', swatch: '#150f17', group: 'Tomrum' },
  { id: 21, key: 'void_ice', name: 'Tomrum, iskant', swatch: '#0d1217', group: 'Tomrum' },
  { id: 17, key: 'planks', name: 'Trægulv', swatch: '#8a5f38', group: 'Veje og gulve', crisp: true, pathable: true },
];

MATERIALS.push(...IMAGE_MATERIALS);
const BY_ID = new Map(MATERIALS.map((m) => [m.id, m]));
export const materialById = (id: number): Material | undefined => BY_ID.get(id);

export const MATERIAL_GRASS = 1;
/** Tomrum: sort, hvor der ikke er kort. Mod andet terræn får det en klippekant (se `renderGroundTile`). */
export const isVoid = (id: number): boolean => id >= 19 && id <= 21;

/** Klippekantens farver pr. tomrumsmateriale: [lys, mørk]. */
const RIM: Record<number, [[number, number, number], [number, number, number]]> = {
  19: [[132, 108, 84], [64, 50, 40]],
  20: [[110, 80, 108], [46, 34, 52]],
  21: [[206, 226, 238], [104, 136, 160]],
};

/** Klippeflade til kanten af tomrummet: kantede blokke med lyse kanter, skrevet til `shadeOut`. */
export function rimShade(id: number, x: number, y: number, seed: number): void {
  const [lo, hi] = RIM[id] ?? RIM[19]!;
  cellular(x / 15, y / 15, seed + 211, 0.9);
  const v = ((cellOut.h & 255) / 255) * 0.55;
  const ridge = 1 - smoothstep(0.02, 0.16, cellOut.f2 - cellOut.f1);
  const f = fbm(x / 60, y / 60, seed + 213, 3);
  const t = Math.min(1, Math.max(0, smoothstep(0.2, 0.8, f) * 0.5 + v + (cellOut.dx + cellOut.dy) * -0.18));
  const o = shadeOut;
  o[3] = 1;
  mix3(o, hi[0], hi[1], hi[2], lo[0], lo[1], lo[2], t);
  const k = -ridge * 26;
  tint(o, k, k, k);
}
export const MATERIAL_WATER = 6;

function tint(out: Float64Array, r: number, g: number, b: number): void {
  out[0] = out[0]! + r;
  out[1] = out[1]! + g;
  out[2] = out[2]! + b;
}

/** Pixels pr. verdenspixel for den tegning, der er i gang (sættes af `renderGroundTile`); græsstråene bruger den til at vælge tekstur. */
export let shadeScale = 1;
export const setShadeScale = (s: number): void => { shadeScale = s; };
/** Til sammenligning i tests: slå strå-teksturen fra. */
export let grassTextured = true;
export const setGrassTextured = (v: boolean): void => { grassTextured = v; };

/** Strå-teksturen i (x, y) med forskydning efter kortets seed (resultatet står i `grassOut`). */
function grassAt(x: number, y: number, seed: number): void {
  if (seed !== grassSeed) {
    grassSeed = seed;
    grassOx = hash32(seed, 11, 0) & 255;
    grassOy = hash32(seed, 13, 0) & 255;
  }
  grassDetail(x, y, grassOx, grassOy, shadeScale);
}
let grassSeed = NaN;
let grassOx = 0;
let grassOy = 0;

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
      // græs: store pletter af lys og mørk, strå i en lille tekstur (se grassTexture.ts) og enkelte mørke totter
      const t = smoothstep(0.3, 0.7, fbm(x / 240, y / 240, seed + 1, 2));
      mix3(o, 78, 128, 46, 138, 172, 72, t);
      if (grassTextured) {
        grassAt(x, y, seed);
        const tuft = smoothstep(0.62, 0.8, valueNoise(x / 14, y / 14, seed + 3));
        const f = 1 + grassOut.lum * 0.3 - tuft * 0.1;
        const up = Math.max(0, grassOut.lum) * grassOut.tip;
        o[0] = o[0]! * f + up * 26;
        o[1] = o[1]! * f + up * 16;
        o[2] = o[2]! * f - up * 6;
        return;
      }
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
    case 9: {
      // skovgræs: mørkt, mosset, med blade og kviste på jorden
      const t = smoothstep(0.3, 0.7, fbm(x / 160, y / 160, seed + 91, 3));
      mix3(o, 44, 84, 40, 80, 122, 54, t);
      const litter = smoothstep(0.66, 0.86, fbm(x / 9, y / 9, seed + 93, 2)) * 0.8;
      const moss = smoothstep(0.55, 0.8, fbm(x / 40, y / 40, seed + 95, 2));
      if (grassTextured) {
        grassAt(x, y, seed);
        const f = 1 + grassOut.lum * 0.34;
        o[0] = o[0]! * f;
        o[1] = o[1]! * f;
        o[2] = o[2]! * f;
      } else {
        const k = grain * 20;
        tint(o, k * 0.5, k, k * 0.4);
      }
      tint(o, litter * 22 - moss * 8, litter * 4 - moss * 2, litter * -10 - moss * 8);
      return;
    }
    case 10: {
      // tørt græs: strå, bare pletter af jord og lange, tørre totter
      const t = smoothstep(0.3, 0.7, fbm(x / 200, y / 200, seed + 101, 3));
      mix3(o, 150, 148, 78, 198, 178, 98, t);
      const bare = smoothstep(0.62, 0.8, fbm(x / 70, y / 70, seed + 103, 3));
      o[0] = o[0]! + (150 - o[0]!) * bare * 0.55;
      o[1] = o[1]! + (116 - o[1]!) * bare * 0.55;
      o[2] = o[2]! + (74 - o[2]!) * bare * 0.55;
      if (grassTextured) {
        grassAt(x, y, seed);
        const f = 1 + grassOut.lum * 0.3;
        const up = Math.max(0, grassOut.lum) * (0.4 + grassOut.tip);
        o[0] = o[0]! * f + up * 22;
        o[1] = o[1]! * f + up * 18;
        o[2] = o[2]! * f + up * 2;
        return;
      }
      const blade = valueNoise(x / 1.8, y / 7, seed + 105) * 0.6 + valueNoise(x / 3.5, y / 14, seed + 107) * 0.4;
      const k = grain * 14 + (blade - 0.5) * 40;
      tint(o, k, k * 0.9, k * 0.4);
      return;
    }
    case 11: {
      // strandsand: lyst og fint, med bløde bølgemønstre
      const f = fbm(x / 220, y / 220, seed + 111, 3);
      mix3(o, 234, 222, 184, 248, 240, 210, smoothstep(0.3, 0.7, f));
      const ripple = Math.sin((x * 0.3 + y * 0.9) / 11 + f * 12) * 5;
      const k = grain * 9 + ripple;
      tint(o, k, k, k * 0.9);
      return;
    }
    case 12: {
      // rødt sand: klitter med skarpere rygge
      const f = fbm(x / 240, y / 240, seed + 121, 3);
      mix3(o, 188, 100, 60, 224, 142, 88, smoothstep(0.3, 0.7, f));
      const ridge = Math.abs(Math.sin((x * 0.55 + y) / 22 + f * 14));
      const k = grain * 10 - (1 - smoothstep(0, 0.35, ridge)) * 16;
      tint(o, k, k * 0.8, k * 0.6);
      return;
    }
    case 13: {
      // mørkt sand: vulkansk eller flodsand med mørke korn
      const f = fbm(x / 180, y / 180, seed + 131, 3);
      mix3(o, 112, 100, 86, 152, 138, 114, smoothstep(0.3, 0.7, f));
      const spec = smoothstep(0.72, 0.84, valueNoise(x / 2.2, y / 2.2, seed + 133));
      const k = grain * 14 - spec * 30;
      tint(o, k, k, k * 0.9);
      return;
    }
    case 19:
    case 20:
    case 21: {
      const k = valueNoise(x / 40, y / 40, seed + 191) * 9;
      o[0] = 8 + k;
      o[1] = 7 + k * 0.9;
      o[2] = 9 + k;
      return;
    }
    case 18: {
      // massivt, mørkt fjeld (grottevægge, dungeon): kantede blokke med lyse kanter og mørk støj
      cellular(x / 34, y / 34, seed + 181, 0.9);
      const v = ((cellOut.h & 255) / 255) * 0.5;
      const ridge = 1 - smoothstep(0.02, 0.14, cellOut.f2 - cellOut.f1);
      const f = fbm(x / 90, y / 90, seed + 183, 3);
      mix3(o, 38, 35, 33, 66, 62, 58, smoothstep(0.25, 0.75, f) * 0.7 + v * 0.3);
      const k = grain * 14 - ridge * 14 - (cellOut.dx + cellOut.dy) * 10;
      tint(o, k, k, k * 0.95);
      return;
    }
    case 14:
    case 16:
    case 17:
      // brosten, fliser og trægulv: hele sten i forskudte rækker (se stones.ts)
      stoneShade(o, id, x, y, seed);
      return;
    case 15: {
      // grus: små sten i beige og grå
      const f = fbm(x / 60, y / 60, seed + 151, 2);
      mix3(o, 146, 138, 124, 176, 166, 148, smoothstep(0.3, 0.7, f));
      const a = (valueNoise(x / 3.3, y / 3.3, seed + 153) - 0.5) * 62;
      const b = (valueNoise(x / 1.7, y / 1.7, seed + 155) - 0.5) * 38;
      const dark = smoothstep(0.7, 0.86, valueNoise(x / 2.4, y / 2.4, seed + 157)) * 44;
      tint(o, a + b - dark, a + b - dark, (a + b) * 0.9 - dark);
      return;
    }
    default:
      if (isImageMaterial(id)) {
        // malet materiale (billede, se imageTextures.ts); gennemsnitsfarven, til billedet er læst ind
        if (!sampleTexture(id, x, y, o)) {
          const [r, g, b] = textureAverage(id);
          o[0] = r;
          o[1] = g;
          o[2] = b;
        }
        return;
      }
      o[0] = o[1] = o[2] = 0;
      o[3] = 0;
  }
}
