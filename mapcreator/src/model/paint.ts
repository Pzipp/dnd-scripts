import { CELL_PX, type Rect } from './types';

/**
 * Malet underlag: et fladt billede pr. grund- og gulvlag, delt i fliser (256 × 256 pixels, RGBA uden forhåndsmultiplikation).
 * Laget husker ikke, hvordan noget er malet, kun pixels. Fliser, der aldrig er malet i, findes ikke (gennemsigtige) eller
 * tegnes først ved behov ud fra en baggrund (`fill`) eller et ældre kort (`lazy`).
 */
export const PAINT_TILE = 256;
const T = PAINT_TILE;

/** Pixels pr. felt, vi vælger mellem: heltal, så en forskydning i hele felter altid er hele pixels. */
export const PPC_CHOICES = [50, 25, 10, 5];
const MAX_EDGE_PX = 4096;

/** Opløsningen (pixels pr. felt) til et kort: den fineste, så længste side højst fylder `MAX_EDGE_PX` pixels. */
export function choosePpc(widthCells: number, heightCells: number): number {
  const side = Math.max(widthCells, heightCells);
  return PPC_CHOICES.find((p) => side * p <= MAX_EDGE_PX) ?? PPC_CHOICES.at(-1)!;
}

export interface Tile {
  data: Uint8ClampedArray;
  /** Stiger, hver gang `data` ændres (så lærredet til visning ved, at det skal opdateres). */
  ver: number;
  /** Lærredet til visning (se render/paintView.ts) og den version, det viser. */
  canvas?: HTMLCanvasElement;
  cver: number;
}

/** Tegner en flises indhold, når den første gang skal bruges. `x0`, `y0`: flisens første pixel i laget. */
export interface LazySource {
  render(data: Uint8ClampedArray, x0: number, y0: number): void;
  /** Et ældre kort: skal tegnes helt færdigt, før det gemmes. */
  legacy?: boolean;
}

/** Baggrund: fliser uden indhold tegnes som et materiale. `ox`, `oy`: hvor langt (verdenspixels) mønstret er forskudt. */
export interface FillSpec {
  material: number;
  ox: number;
  oy: number;
}

export interface PaintData {
  /** Pixels pr. felt. */
  ppc: number;
  /** Lagets størrelse i pixels. */
  w: number;
  h: number;
  tiles: Map<number, Tile>;
  fill?: FillSpec;
  lazy?: LazySource;
  /** Fliser, serveren har, men som endnu ikke er hentet (se `store.open`). */
  remote: Set<number>;
  /** Fliser, serveren har (som sidst gemt eller åbnet), og fliser ændret siden da. */
  saved: Set<number>;
  dirty: Set<number>;
}

export const tileKey = (tx: number, ty: number): number => ty * 256 + tx;
export const keyX = (key: number): number => key & 255;
export const keyY = (key: number): number => key >> 8;
export const keyName = (key: number): string => `${keyX(key)}_${keyY(key)}`;

export const scaleOf = (p: PaintData): number => p.ppc / CELL_PX;
export const tilesWide = (p: PaintData): number => Math.ceil(p.w / T);
export const tilesHigh = (p: PaintData): number => Math.ceil(p.h / T);

export function createPaint(widthCells: number, heightCells: number, fillMaterial = 0): PaintData {
  const ppc = choosePpc(widthCells, heightCells);
  return {
    ppc,
    w: widthCells * ppc,
    h: heightCells * ppc,
    tiles: new Map(),
    remote: new Set(),
    saved: new Set(),
    dirty: new Set(),
    ...(fillMaterial ? { fill: { material: fillMaterial, ox: 0, oy: 0 } } : {}),
  };
}

export const hasTile = (p: PaintData, tx: number, ty: number): boolean => p.tiles.has(tileKey(tx, ty));

/** Er flisen i laget (de sidste kan stikke ud over kanten)? */
export const tileInside = (p: PaintData, tx: number, ty: number): boolean => tx >= 0 && ty >= 0 && tx < tilesWide(p) && ty < tilesHigh(p);

/**
 * Flisen, med indhold tegnet frem, hvis den kommer fra en baggrund eller et ældre kort. Findes den ikke, og laget har
 * ingen kilde, laves en tom. `null`: flisen ligger hos serveren og er ikke hentet endnu (så kan der ikke males på den).
 */
export function ensureTile(p: PaintData, tx: number, ty: number): Tile | null {
  const key = tileKey(tx, ty);
  const have = p.tiles.get(key);
  if (have) return have;
  if (p.remote.has(key) || !tileInside(p, tx, ty)) return null;
  const data = new Uint8ClampedArray(T * T * 4);
  if (p.lazy) {
    p.lazy.render(data, tx * T, ty * T);
    p.dirty.add(key);
  }
  const tile: Tile = { data, ver: 1, cver: 0 };
  p.tiles.set(key, tile);
  return tile;
}

/** Lægger en hentet flise på plads. */
export function putTile(p: PaintData, key: number, data: Uint8ClampedArray): void {
  p.tiles.set(key, { data, ver: 1, cver: 0 });
  p.remote.delete(key);
}

export function touchTile(t: Tile): void {
  t.ver++;
}

/** Rektanglet (verdenspixels) en flise dækker. */
export function tileRect(p: PaintData, tx: number, ty: number): Rect {
  const s = scaleOf(p);
  return { x: (tx * T) / s, y: (ty * T) / s, w: T / s, h: T / s };
}

/** Rektanglet (verdenspixels) dækket af laget i pixels [x0, x1) × [y0, y1). */
export function pxToWorldRect(p: PaintData, x0: number, y0: number, x1: number, y1: number): Rect {
  const s = scaleOf(p);
  return { x: x0 / s, y: y0 / s, w: (x1 - x0) / s, h: (y1 - y0) / s };
}

// ---- fortryd: fliser før en ændring ----

/** Fliser, som de var (kopier); `null` = flisen fandtes ikke. */
export type TileSnapshot = Map<number, Uint8ClampedArray | null>;

export const snapshotBytes = (s: TileSnapshot): number => {
  let n = 0;
  for (const d of s.values()) n += d?.length ?? 0;
  return n;
};

/**
 * Bytter lagets fliser med dem i `snap`: bagefter står `snap` med det, der var der før (så samme kald fortryder og gentager).
 * Returnerer det berørte område i verdenspixels.
 */
export function swapTiles(p: PaintData, snap: TileSnapshot): Rect | null {
  let tx0 = Infinity, ty0 = Infinity, tx1 = -Infinity, ty1 = -Infinity;
  for (const [key, want] of [...snap]) {
    const cur = p.tiles.get(key);
    snap.set(key, cur ? cur.data.slice() : null);
    if (want === null) p.tiles.delete(key);
    else if (cur) {
      cur.data.set(want);
      cur.ver++;
    } else p.tiles.set(key, { data: want.slice(), ver: 1, cver: 0 });
    p.dirty.add(key);
    tx0 = Math.min(tx0, keyX(key)); tx1 = Math.max(tx1, keyX(key));
    ty0 = Math.min(ty0, keyY(key)); ty1 = Math.max(ty1, keyY(key));
  }
  if (tx0 === Infinity) return null;
  const a = tileRect(p, tx0, ty0);
  const b = tileRect(p, tx1, ty1);
  return { x: a.x, y: a.y, w: b.x + b.w - a.x, h: b.y + b.h - a.y };
}

// ---- gem og indlæs ----

export interface PaintMeta {
  ppc: number;
  w: number;
  h: number;
  /** Fliserne serveren har: "tx_ty". */
  tiles: string[];
  fill?: FillSpec;
  /** Med en baggrund: fliser, der er malet helt væk (de må ikke tegnes ud fra baggrunden igen). */
  blank?: string[];
}

/** Er flisen helt gennemsigtig? (Sådanne fliser gemmes ikke.) */
export function isBlank(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return false;
  return true;
}

/** Fliserne, der skal gemmes: dem med indhold. */
export function liveKeys(p: PaintData): number[] {
  const out: number[] = [];
  for (const [key, t] of p.tiles) if (!isBlank(t.data)) out.push(key);
  for (const key of p.remote) out.push(key);
  return out.sort((a, b) => a - b);
}

export function encodePaintMeta(p: PaintData, keys: number[] = liveKeys(p)): PaintMeta {
  const meta: PaintMeta = { ppc: p.ppc, w: p.w, h: p.h, tiles: keys.map(keyName) };
  if (p.fill) {
    meta.fill = { ...p.fill };
    const live = new Set(keys);
    const blank = [...p.tiles.keys()].filter((k) => !live.has(k)).sort((a, b) => a - b).map(keyName);
    if (blank.length) meta.blank = blank;
  }
  return meta;
}

export function decodePaintMeta(raw: unknown, widthCells: number, heightCells: number): PaintData {
  const m = raw as Partial<PaintMeta> | null;
  if (!m || typeof m !== 'object') throw new Error('Ugyldigt malet lag.');
  const { ppc, w, h } = m;
  if (!PPC_CHOICES.includes(ppc as number) || w !== widthCells * (ppc as number) || h !== heightCells * (ppc as number)) throw new Error('Ugyldigt malet lag.');
  if (!Array.isArray(m.tiles) || m.tiles.length > 4096) throw new Error('Ugyldigt malet lag.');
  const p = createPaint(widthCells, heightCells);
  p.ppc = ppc as number;
  p.w = w as number;
  p.h = h as number;
  for (const name of m.tiles) {
    const match = /^(\d{1,3})_(\d{1,3})$/.exec(String(name));
    if (!match) throw new Error('Ugyldigt malet lag.');
    const key = tileKey(+match[1]!, +match[2]!);
    p.remote.add(key);
    p.saved.add(key);
  }
  const f = m.fill;
  if (f && typeof f.material === 'number' && Number.isFinite(f.ox) && Number.isFinite(f.oy)) p.fill = { material: f.material, ox: f.ox, oy: f.oy };
  if (p.fill && Array.isArray(m.blank)) {
    for (const name of m.blank.slice(0, 4096)) {
      const match = /^(\d{1,3})_(\d{1,3})$/.exec(String(name));
      if (match) putTile(p, tileKey(+match[1]!, +match[2]!), new Uint8ClampedArray(T * T * 4));
    }
  }
  return p;
}

// ---- kortets størrelse ændres ----

/**
 * Laget i en ny størrelse: det gamle flyttes `dx`/`dy` felter (hele pixels, da opløsningen er et helt tal pr. felt). Fliser uden for
 * det nye kort smides væk; ny plads er tom (eller baggrund, som følger med forskydningen; `attach` giver laget dens kilde). Fliser, der ikke er hentet, skal være det først.
 */
export function resizePaint(p: PaintData, newWc: number, newHc: number, dx: number, dy: number, attach?: (out: PaintData) => void): PaintData {
  const out = createPaint(newWc, newHc);
  out.ppc = p.ppc;
  out.w = newWc * p.ppc;
  out.h = newHc * p.ppc;
  if (p.fill) out.fill = { material: p.fill.material, ox: p.fill.ox + dx * CELL_PX, oy: p.fill.oy + dy * CELL_PX };
  attach?.(out);
  const ox = dx * p.ppc;
  const oy = dy * p.ppc;
  for (const [key, t] of p.tiles) {
    const sx0 = keyX(key) * T;
    const sy0 = keyY(key) * T;
    // målets pixels: [sx0 + ox, sx0 + ox + T) osv., beskåret til det nye lag
    const dxa = Math.max(0, sx0 + ox);
    const dxb = Math.min(out.w, sx0 + ox + T);
    const dya = Math.max(0, sy0 + oy);
    const dyb = Math.min(out.h, sy0 + oy + T);
    if (dxa >= dxb || dya >= dyb) continue;
    for (let ty = Math.floor(dya / T); ty <= Math.floor((dyb - 1) / T); ty++) {
      for (let tx = Math.floor(dxa / T); tx <= Math.floor((dxb - 1) / T); tx++) {
        const ax = Math.max(dxa, tx * T);
        const bx = Math.min(dxb, (tx + 1) * T);
        const ay = Math.max(dya, ty * T);
        const by = Math.min(dyb, (ty + 1) * T);
        const dkey = tileKey(tx, ty);
        let dest = out.tiles.get(dkey);
        if (!dest) {
          dest = { data: new Uint8ClampedArray(T * T * 4), ver: 1, cver: 0 };
          out.lazy?.render(dest.data, tx * T, ty * T); // det nye område i flisen følger baggrunden
          out.tiles.set(dkey, dest);
        }
        for (let y = ay; y < by; y++) {
          const from = ((y - oy - sy0) * T + (ax - ox - sx0)) * 4;
          const to = ((y - ty * T) * T + (ax - tx * T)) * 4;
          dest.data.set(t.data.subarray(from, from + (bx - ax) * 4), to);
        }
        out.dirty.add(dkey);
      }
    }
  }
  for (const key of p.saved) out.saved.add(key);
  return out;
}

// ---- opslag ----

/** Pixlens farve i et verdenspunkt (RGBA 0..255), eller null, hvis flisen ikke findes. */
export function pixelAt(p: PaintData, wx: number, wy: number): [number, number, number, number] | null {
  const s = scaleOf(p);
  const px = Math.floor(wx * s);
  const py = Math.floor(wy * s);
  if (px < 0 || py < 0 || px >= p.w || py >= p.h) return null;
  const t = p.tiles.get(tileKey(Math.floor(px / T), Math.floor(py / T)));
  if (!t) return null;
  const i = ((py % T) * T + (px % T)) * 4;
  return [t.data[i]!, t.data[i + 1]!, t.data[i + 2]!, t.data[i + 3]!];
}

/** Ligner farven vand (blå, mere blå end rød)? Bruges af spredningen til at undgå vand, nu terrænet er et billede. */
export const looksLikeWater = (c: [number, number, number, number]): boolean => c[3] > 128 && c[2] > c[0] + 24 && c[2] >= c[1] - 10;
