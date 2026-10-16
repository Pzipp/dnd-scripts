import planksOak from '../assets/planks_oak.jpg';
import planksBroken from '../assets/planks_broken.jpg';

/**
 * Materialer, der er et gentagende billede (maling i stedet for udregnet mønster). Billedet læses ind én gang; `sampleTexture`
 * slår op med gentagelse i begge retninger og blød overgang mellem pixels. Billedet formindskes ved indlæsningen, så én billedpixel er én verdenspixel ved mønsterskala 100 %.
 */
interface Tex {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

/** Billedet og hvor stort det vises: verdenspixels pr. billedpixel (billedet formindskes ved indlæsningen). */
const SOURCES: Record<number, { url: string; scale: number }> = {
  22: { url: planksOak, scale: 0.25 },
  23: { url: planksBroken, scale: 0.36 },
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
