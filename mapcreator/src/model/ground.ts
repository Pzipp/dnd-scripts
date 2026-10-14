import { CELL_PX, type Rect } from './types';

/** Terrænmaske: ét materiale-id pr. maskecelle (GROUND_RES × GROUND_RES maskeceller pr. felt). 0 = tomt (gennemsigtigt). */
export const GROUND_RES = 4;

export interface GroundData {
  res: number;
  w: number;
  h: number;
  data: Uint8Array;
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
    for (let y = iy0; y <= iy1; y++) {
      for (let x = ix0; x <= ix1; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
        const i = y * g.w + x;
        const old = g.data[i]!;
        if (old === material) continue;
        if (!this.before.has(i)) this.before.set(i, old);
        g.data[i] = material;
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
    for (const [i, v] of this.before) g.data[i] = v;
    const rect = cellsToRect(this.x0, this.y0, this.x1, this.y1);
    this.before.clear();
    return rect;
  }

  /** Resultatet som data til en kommando (indekser, før- og efterværdier, område). */
  result(g: GroundData): CellChange | null {
    if (this.isEmpty) return null;
    const indices = Uint32Array.from(this.before.keys());
    const before = Uint8Array.from(this.before.values());
    const after = Uint8Array.from(indices, (i) => g.data[i]!);
    return { indices, before, after, rect: cellsToRect(this.x0, this.y0, this.x1, this.y1) };
  }
}

export interface CellChange {
  indices: Uint32Array;
  before: Uint8Array;
  after: Uint8Array;
  rect: Rect;
}

/** Ændringen, hvis hele laget fyldes med `material`. */
export function fillChange(g: GroundData, material: number): CellChange | null {
  const idx: number[] = [];
  for (let i = 0; i < g.data.length; i++) if (g.data[i] !== material) idx.push(i);
  if (idx.length === 0) return null;
  const indices = Uint32Array.from(idx);
  return {
    indices,
    before: Uint8Array.from(indices, (i) => g.data[i]!),
    after: new Uint8Array(indices.length).fill(material),
    rect: cellsToRect(0, 0, g.w - 1, g.h - 1),
  };
}

export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// ---- gem/indlæs: kørselslængde-kodet og base64, så en maske fylder lidt i JSON ----

export function encodeGround(g: GroundData): { res: number; w: number; h: number; rle: string } {
  const bytes: number[] = [];
  const d = g.data;
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
  return { res: g.res, w: g.w, h: g.h, rle: btoa(bin) };
}

export function decodeGround(raw: { res: number; w: number; h: number; rle: string }): GroundData {
  const { res, w, h } = raw;
  if (![res, w, h].every((n) => Number.isInteger(n) && n > 0) || w * h > 4096 * 4096) throw new Error('Ugyldig terrænmaske.');
  const bin = atob(raw.rle);
  const data = new Uint8Array(w * h);
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
  return { res, w, h, data };
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
