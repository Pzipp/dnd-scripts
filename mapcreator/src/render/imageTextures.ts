import planksOak from '../assets/planks_oak.jpg';
import planksBroken from '../assets/planks_broken.jpg';
import planksGrey from '../assets/planks_grey.jpg';
import waterCalm from '../assets/water_calm.jpg';
import grassForest from '../assets/grass_forest_img.jpg';
import grassDry from '../assets/grass_dry_img.jpg';
import grassMeadow from '../assets/grass_meadow_img.jpg';
import planksOakBroken from '../assets/planks_oak_broken.jpg';
import waterDeep from '../assets/water_deep.jpg';
import waterRough from '../assets/water_rough.jpg';

/**
 * Materialer, der er et gentagende billede (maling i stedet for udregnet mønster). Billedet læses ind én gang; `sampleTexture`
 * slår op med gentagelse i begge retninger og blød overgang mellem pixels. Billedet formindskes ved indlæsningen, så én billedpixel er én verdenspixel ved mønsterskala 100 %.
 */
interface Tex {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

/**
 * Billedet, hvor stort det vises (verdenspixels pr. billedpixel; billedet formindskes ved indlæsningen) og en gennemsnitsfarve,
 * der bruges, til billedet er læst ind. Billederne dækker 8 × 8 m (ca. 5,3 felter), så 768 px vises med 0,34.
 */
const SOURCES: Record<number, { url: string; scale: number; avg: [number, number, number] }> = {
  22: { url: planksOak, scale: 0.25, avg: [123, 82, 50] },
  23: { url: planksBroken, scale: 0.36, avg: [90, 80, 71] },
  24: { url: planksGrey, scale: 0.34, avg: [71, 65, 62] },
  25: { url: waterCalm, scale: 0.34, avg: [51, 183, 211] },
  26: { url: grassForest, scale: 0.34, avg: [53, 59, 30] },
  27: { url: grassDry, scale: 0.34, avg: [152, 117, 69] },
  28: { url: grassMeadow, scale: 0.34, avg: [96, 149, 48] },
  29: { url: planksOakBroken, scale: 0.36, avg: [104, 75, 52] },
  30: { url: waterDeep, scale: 0.34, avg: [14, 40, 63] },
  31: { url: waterRough, scale: 0.34, avg: [49, 105, 125] },
};
const loaded = new Map<number, Tex>();

async function loadOne(id: number, url: string, scale: number): Promise<void> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  loaded.set(id, { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data });
}

/** Færdig, når alle billedmaterialer er læst ind (straks færdig uden for browseren, fx i tests). */
export const texturesReady: Promise<void> =
  typeof document === 'undefined' || typeof Image === 'undefined'
    ? Promise.resolve()
    : Promise.all(Object.entries(SOURCES).map(([id, v]) => loadOne(+id, v.url, v.scale).catch(() => undefined))).then(() => undefined);

/** Gennemsnitsfarven, til billedet er læst ind. */
export const textureAverage = (id: number): [number, number, number] => SOURCES[id]?.avg ?? [128, 128, 128];

export const isImageMaterial = (id: number): boolean => id in SOURCES;

/** Billedets farve i (x, y) til `out` (r, g, b). Returnerer false, hvis billedet ikke er læst ind endnu. */
export function sampleTexture(id: number, x: number, y: number, out: Float64Array): boolean {
  const t = loaded.get(id);
  if (!t) return false;
  const fx = x - 0.5;
  const fy = y - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const ax = fx - x0;
  const ay = fy - y0;
  const xa = ((x0 % t.w) + t.w) % t.w;
  const ya = ((y0 % t.h) + t.h) % t.h;
  const xb = (xa + 1) % t.w;
  const yb = (ya + 1) % t.h;
  const d = t.data;
  const i00 = (ya * t.w + xa) * 4;
  const i10 = (ya * t.w + xb) * 4;
  const i01 = (yb * t.w + xa) * 4;
  const i11 = (yb * t.w + xb) * 4;
  for (let k = 0; k < 3; k++) {
    const top = d[i00 + k]! * (1 - ax) + d[i10 + k]! * ax;
    const bot = d[i01 + k]! * (1 - ax) + d[i11 + k]! * ax;
    out[k] = top * (1 - ay) + bot * ay;
  }
  return true;
}
