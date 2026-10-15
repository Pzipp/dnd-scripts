import { CELL_PX, type Rect } from './types';

/** Terrænmaske: ét materiale-id pr. maskecelle (GROUND_RES × GROUND_RES maskeceller pr. felt). 0 = tomt (gennemsigtigt). */
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

/** Hvilket af de to lag et penselstrøg skriver i: selve terrænet eller stierne oven på det. */
export type GroundTarget = 'base' | 'path';

function cells(g: GroundData, target: GroundTarget): Uint8Array {
  if (target === 'base') return g.data;
  return (g.path ??= new Uint8Array(g.w * g.h));
}

export function createGround(widthCells: number, heightCells: number, fill = 0): GroundData {
  const w = widthCells * GROUND_RES;
  const h = heightCells * GROUND_RES;
  return { res: GROUND_RES, w, h, data: new Uint8Array(w * h).fill(fill) };
}

/** Maskecellens bredde i verdenspixels. */
export const MASK_CELL_PX = CELL_PX / GROUND_RES;

/** Rektangel (verdenspixels) dækket af maskecellerne [x0..x1] × [y0..y1] (inklusive). */
export function cellsToRect(x0: number, y0: number, x1: number, y1: number): Rect {
  return { x: x0 * MASK_CELL_PX, y: y0 * MASK_CELL_PX, w: (x1 - x0 + 1) * MASK_CELL_PX, h: (y1 - y0 + 1) * MASK_CELL_PX };
}

/** Samler et penselstrøg: husker de oprindelige værdier, så strøget kan fortrydes (også midt i trækket). */
export class Stroke {
  constructor(readonly target: GroundTarget = 'base') {}
  private before = new Map<number, number>();
  private x0 = Infinity;
  private y0 = Infinity;
  private x1 = -Infinity;
  private y1 = -Infinity;

  get isEmpty(): boolean {
    return this.before.size === 0;
  }

  /** Maler en cirkel (centrum og radius i verdenspixels). Returnerer det ændrede område i verdenspixels (eller null). */
  stamp(g: GroundData, wx: number, wy: number, radius: number, material: number): Rect | null {
    const cx = wx / MASK_CELL_PX - 0.5;
    const cy = wy / MASK_CELL_PX - 0.5;
    const r = radius / MASK_CELL_PX;
    const ix0 = Math.max(0, Math.floor(cx - r));
    const ix1 = Math.min(g.w - 1, Math.ceil(cx + r));
    const iy0 = Math.max(0, Math.floor(cy - r));
    const iy1 = Math.min(g.h - 1, Math.ceil(cy + r));
    let cx0 = Infinity, cy0 = Infinity, cx1 = -Infinity, cy1 = -Infinity;
    const arr = this.target === 'path' && material === 0 && !g.path ? null : cells(g, this.target);
    if (!arr) return null;
    for (let y = iy0; y <= iy1; y++) {
      for (let x = ix0; x <= ix1; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
        const i = y * g.w + x;
        const old = arr[i]!;
        if (old === material) continue;
        if (!this.before.has(i)) this.before.set(i, old);
        arr[i] = material;
        if (x < cx0) cx0 = x;
        if (x > cx1) cx1 = x;
        if (y < cy0) cy0 = y;
        if (y > cy1) cy1 = y;
      }
    }
    if (cx0 === Infinity) return null;
    this.x0 = Math.min(this.x0, cx0);
    this.y0 = Math.min(this.y0, cy0);
    this.x1 = Math.max(this.x1, cx1);
    this.y1 = Math.max(this.y1, cy1);
    return cellsToRect(cx0, cy0, cx1, cy1);
  }

  /** Maler langs en linje, så hurtige træk ikke efterlader huller. */
  line(g: GroundData, ax: number, ay: number, bx: number, by: number, radius: number, material: number): Rect | null {
    const step = Math.max(1, radius / 3);
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    let dirty: Rect | null = null;
    for (let k = 0; k <= n; k++) {
      const r = this.stamp(g, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, radius, material);
      dirty = unionRect(dirty, r);
    }
    return dirty;
  }

  /** Lægger det oprindelige tilbage (fx hvis strøget afbrydes). */
  undoAll(g: GroundData): Rect | null {
    if (this.isEmpty) return null;
    const arr = cells(g, this.target);
    for (const [i, v] of this.before) arr[i] = v;
    const rect = cellsToRect(this.x0, this.y0, this.x1, this.y1);
    this.before.clear();
    return rect;
  }

  /** Resultatet som data til en kommando (indekser, før- og efterværdier, område). */
  result(g: GroundData): CellChange | null {
    if (this.isEmpty) return null;
    const indices = Uint32Array.from(this.before.keys());
    const before = Uint8Array.from(this.before.values());
    const arr = cells(g, this.target);
    const after = Uint8Array.from(indices, (i) => arr[i]!);
    return { indices, before, after, rect: cellsToRect(this.x0, this.y0, this.x1, this.y1), target: this.target };
  }
}

export interface CellChange {
  indices: Uint32Array;
  before: Uint8Array;
  after: Uint8Array;
  rect: Rect;
  target: GroundTarget;
}

/** Ændringen, hvis hele laget fyldes med `material`. */
export function fillChange(g: GroundData, material: number, target: GroundTarget = 'base'): CellChange | null {
  if (target === 'path' && material === 0 && !g.path) return null;
  const arr = cells(g, target);
  const idx: number[] = [];
  for (let i = 0; i < arr.length; i++) if (arr[i] !== material) idx.push(i);
  if (idx.length === 0) return null;
  const indices = Uint32Array.from(idx);
  return {
    indices,
    before: Uint8Array.from(indices, (i) => arr[i]!),
    after: new Uint8Array(indices.length).fill(material),
    rect: cellsToRect(0, 0, g.w - 1, g.h - 1),
    target,
  };
}

/** Skriver `values` i de celler, en ændring rører (både ved gentag og fortryd). */
export function writeChange(g: GroundData, change: CellChange, values: Uint8Array): void {
  const arr = cells(g, change.target);
  const { indices } = change;
  for (let k = 0; k < indices.length; k++) arr[indices[k]!] = values[k]!;
}

export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

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

/** Materialet i et verdenspunkt: det øverste synlige grundlag med terræn dér (0 = ingenting). */
export function materialAt(doc: { layers: { visible: boolean; ground?: GroundData }[] }, wx: number, wy: number): number {
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const g = doc.layers[i]!.ground;
    if (!g || !doc.layers[i]!.visible) continue;
    const x = Math.floor(wx / MASK_CELL_PX);
    const y = Math.floor(wy / MASK_CELL_PX);
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) continue;
    const m = g.data[y * g.w + x]!;
    if (m !== 0) return m;
  }
  return 0;
}
