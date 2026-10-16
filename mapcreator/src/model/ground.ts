import { CELL_PX } from './types';

/**
 * Den gamle terrænmaske: ét materiale-id pr. maskecelle (GROUND_RES × GROUND_RES maskeceller pr. felt). 0 = tomt. Kort fra før
 * det malede underlag (model/paint.ts) og generatoren bruger den; `renderGroundTile` tegner den. Formen til udfyldning af former bruger den også.
 */
export const GROUND_RES = 4;

export interface GroundData {
  res: number;
  w: number;
  h: number;
  /** Terrænets materiale-id pr. maskecelle. */
  data: Uint8Array;
  /** Stier oven på terrænet: materiale-id pr. maskecelle (0 = ingen sti). Oprettes ved første sti. */
  path?: Uint8Array;
}

export function createGround(widthCells: number, heightCells: number, fill = 0): GroundData {
  const w = widthCells * GROUND_RES;
  const h = heightCells * GROUND_RES;
  return { res: GROUND_RES, w, h, data: new Uint8Array(w * h).fill(fill) };
}

/** Maskecellens bredde i verdenspixels. */
export const MASK_CELL_PX = CELL_PX / GROUND_RES;

// ---- gem/indlæs: kørselslængde-kodet og base64, så en maske fylder lidt i JSON ----

function encodeBytes(d: Uint8Array): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < d.length) {
    const v = d[i]!;
    let run = 1;
    while (i + run < d.length && d[i + run] === v) run++;
    i += run;
    bytes.push(v);
    let n = run;
    while (n >= 0x80) {
      bytes.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    bytes.push(n);
  }
  let bin = '';
  for (let k = 0; k < bytes.length; k += 8192) bin += String.fromCharCode(...bytes.slice(k, k + 8192));
  return btoa(bin);
}

function decodeBytes(rle: string, length: number): Uint8Array {
  const bin = atob(rle);
  const data = new Uint8Array(length);
  let pos = 0;
  let i = 0;
  while (i < bin.length) {
    const v = bin.charCodeAt(i++);
    let n = 0;
    let shift = 0;
    for (;;) {
      if (i >= bin.length) throw new Error('Ødelagt terrænmaske.');
      const b = bin.charCodeAt(i++);
      n |= (b & 0x7f) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
    }
    if (pos + n > data.length) throw new Error('Ødelagt terrænmaske.');
    data.fill(v, pos, pos + n);
    pos += n;
  }
  if (pos !== data.length) throw new Error('Ødelagt terrænmaske.');
  return data;
}

export interface EncodedGround {
  res: number;
  w: number;
  h: number;
  rle: string;
  /** Stierne (samme kodning); udelades, når der ingen er. */
  path?: string;
}

export function encodeGround(g: GroundData): EncodedGround {
  const out: EncodedGround = { res: g.res, w: g.w, h: g.h, rle: encodeBytes(g.data) };
  if (g.path?.some((v) => v !== 0)) out.path = encodeBytes(g.path);
  return out;
}

export function decodeGround(raw: EncodedGround): GroundData {
  const { res, w, h } = raw;
  if (![res, w, h].every((n) => Number.isInteger(n) && n > 0) || w * h > 4096 * 4096) throw new Error('Ugyldig terrænmaske.');
  const g: GroundData = { res, w, h, data: decodeBytes(raw.rle, w * h) };
  if (typeof raw.path === 'string') g.path = decodeBytes(raw.path, w * h);
  return g;
}
