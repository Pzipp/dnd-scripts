import {
  ensureTile, PAINT_TILE, pxToWorldRect, scaleOf, snapshotBytes, tileKey, touchTile,
  type PaintData, type Tile, type TileSnapshot,
} from '../model/paint';
import type { Rect } from '../model/types';
import { isVoid, rimShade, setShadeScale, shade, shadeOut } from './materials';
import { fbm, smoothstep, valueNoise } from './noise';
import { isStoneMaterial, STONE_STYLES, stone, stoneAt, stoneColor } from './stones';

const T = PAINT_TILE;

/**
 * Pensler til det malede underlag. Et penselstrøg samler en maske (størst opnåede dækning pr. pixel), og resultatet regnes ud fra
 * lagets indhold FØR strøget og materialets farve: derfor lægger overlappende stempler sig ikke oven på hinanden, og gennemsigtigheden
 * gælder hele strøget. Intet af det huskes bagefter, kun pixels (og et billede af fliserne før strøget, til fortryd).
 */
export type BrushKind = 'round' | 'edge' | 'grid' | 'tuft';

export interface Brush {
  kind: BrushKind;
  /** Diameter i verdenspixels. */
  size: number;
  /** 0..1 */
  opacity: number;
  /** Rund pensel: 1 = hård kant, 0 = blød helt ind til midten. */
  hardness: number;
  /** Kantpensel: 0 = næsten rund, 1 = meget ujævn. */
  roughness: number;
  material: number;
  /** Mønstrets størrelse (1 = normal) og drejning i grader. */
  textureScale: number;
  rotation: number;
  /** Brosten, fliser og planker males som hele sten (afgjort ved stenens midte), ikke skåret ved penselkanten. */
  wholeStones: boolean;
  /** Viskelæder: fjerner maling i stedet for at lægge noget. */
  erase: boolean;
  seed: number;
  /** Tuftpensel: sætter totter ud (browserdel, se paintTuft.ts). */
  stamp?: (stroke: PaintStroke, wx: number, wy: number) => Rect | null;
}

/** Hvad strøget husker om en flise: den før strøget, strøgets maske og de farver, der er regnet ud. */
interface StrokeTile {
  tile: Tile;
  before: Uint8ClampedArray | null;
  mask: Uint8Array;
  color: Uint8ClampedArray;
  has: Uint8Array;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Tomrummets klippekant: bredden (verdenspixels) fra land til sort, som penselkanten spredes over. */
const RIM_WIDTH = 34;

export class PaintStroke {
  private tiles = new Map<number, StrokeTile>();
  /** Hele sten (række, søjle) der allerede er malet i dette strøg. */
  private stones = new Set<number>();
  private scale: number;
  private cosR: number;
  private sinR: number;
  private wholeStones: boolean;
  /** Pixelområdet strøget har rørt (til det område, der skal tegnes igen). */
  private px0 = Infinity;
  private py0 = Infinity;
  private px1 = -Infinity;
  private py1 = -Infinity;

  constructor(readonly paint: PaintData, readonly brush: Brush) {
    this.scale = scaleOf(paint);
    const a = (brush.rotation * Math.PI) / 180;
    this.cosR = Math.cos(a);
    this.sinR = Math.sin(a);
    this.wholeStones = brush.wholeStones && !brush.erase && isStoneMaterial(brush.material);
  }

  get isEmpty(): boolean {
    return this.tiles.size === 0;
  }

  /** Flisen med dens strøg-tilstand; første gang tages et billede af flisen, som den er nu. `null`: flisen kan ikke males på. */
  private open(tx: number, ty: number): StrokeTile | null {
    const key = tileKey(tx, ty);
    let st = this.tiles.get(key);
    if (st) return st;
    const existed = this.paint.tiles.has(key);
    const tile = ensureTile(this.paint, tx, ty);
    if (!tile) return null;
    const lazy = !existed && !!this.paint.lazy;
    st = {
      tile,
      before: existed || lazy ? tile.data.slice() : null,
      mask: new Uint8Array(T * T),
      color: new Uint8ClampedArray(T * T * 4),
      has: new Uint8Array(T * T),
    };
    this.tiles.set(key, st);
    return st;
  }

  private mark(x0: number, y0: number, x1: number, y1: number): void {
    if (x0 < this.px0) this.px0 = x0;
    if (y0 < this.py0) this.py0 = y0;
    if (x1 > this.px1) this.px1 = x1;
    if (y1 > this.py1) this.py1 = y1;
  }

  private rect(): Rect | null {
    if (this.px0 === Infinity) return null;
    return pxToWorldRect(this.paint, this.px0, this.py0, this.px1 + 1, this.py1 + 1);
  }

  /** Maskens værdi (0..255) i pixel (px, py); 0 uden for de berørte fliser. */
  private maskAtPx(px: number, py: number): number {
    const st = this.tiles.get(tileKey(Math.floor(px / T), Math.floor(py / T)));
    return st ? st.mask[(py % T) * T + (px % T)]! : 0;
  }

  /** Materialets farve i verdenspunktet (x, y) til `shadeOut`, med mønstrets størrelse og drejning. */
  private colorAt(x: number, y: number): void {
    const b = this.brush;
    if (b.textureScale !== 1 || b.rotation !== 0) {
      const u = (x * this.cosR + y * this.sinR) / b.textureScale;
      const v = (-x * this.sinR + y * this.cosR) / b.textureScale;
      shade(b.material, u, v, b.seed, 1);
    } else shade(b.material, x, y, b.seed, 1);
  }

  /** Én stempling (cirkel, ujævn kant eller felter) midt i (wx, wy). Returnerer det ændrede område i verdenspixels. */
  dab(wx: number, wy: number): Rect | null {
    const b = this.brush;
    if (b.kind === 'tuft' && !b.erase) return b.stamp ? b.stamp(this, wx, wy) : null;
    const s = this.scale;
    const R = b.size / 2;
    const rough = b.kind === 'edge' ? b.roughness : 0;
    const amp = rough * Math.min(R * 0.5, 24);
    let bx0 = wx - R - 2 - amp * 1.6;
    let bx1 = wx + R + 2 + amp * 1.6;
    let by0 = wy - R - 2 - amp * 1.6;
    let by1 = wy + R + 2 + amp * 1.6;
    // felter: kvadratet af hele felter
    let gx0 = 0, gy0 = 0, gx1 = 0, gy1 = 0;
    if (b.kind === 'grid') {
      const g = gridRect(wx, wy, b.size);
      gx0 = g.x; gy0 = g.y; gx1 = g.x + g.w; gy1 = g.y + g.h;
      bx0 = gx0; bx1 = gx1; by0 = gy0; by1 = gy1;
    }
    const x0 = Math.max(0, Math.floor(bx0 * s));
    const x1 = Math.min(this.paint.w - 1, Math.ceil(bx1 * s));
    const y0 = Math.max(0, Math.floor(by0 * s));
    const y1 = Math.min(this.paint.h - 1, Math.ceil(by1 * s));
    if (x0 > x1 || y0 > y1) return null;
    setShadeScale(s);
    const inner = R * b.hardness;
    const hard = b.hardness >= 0.97;
    const rim = !b.erase && isVoid(b.material);
    const ns = R * 0.5 + 8;
    let touched = false;
    for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++) {
      for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) {
        const st = this.open(tx, ty);
        if (!st) continue;
        const ax = Math.max(x0, tx * T);
        const bx = Math.min(x1, tx * T + T - 1);
        const ay = Math.max(y0, ty * T);
        const by = Math.min(y1, ty * T + T - 1);
        let changed = false;
        for (let py = ay; py <= by; py++) {
          const wyy = (py + 0.5) / s;
          for (let px = ax; px <= bx; px++) {
            const wxx = (px + 0.5) / s;
            let a: number;
            if (b.kind === 'grid') {
              a = wxx >= gx0 && wxx < gx1 && wyy >= gy0 && wyy < gy1 ? 1 : 0;
            } else {
              const ddx = wxx - wx;
              const ddy = wyy - wy;
              const d = Math.sqrt(ddx * ddx + ddy * ddy);
              if (b.kind === 'edge') {
                const n1 = fbm(wxx / ns, wyy / ns, b.seed + 501, 2) - 0.5;
                const n2 = valueNoise(wxx / 7, wyy / 7, b.seed + 503) - 0.5;
                const rr = R + amp * (n1 * 2.2 + n2 * 0.9);
                a = rim ? Math.min(1, Math.max(0, (rr - d) / RIM_WIDTH)) : Math.min(1, Math.max(0, (rr - d) * s * 1.4 + 0.5));
              } else if (rim) {
                // tomrum: dækningen stiger jævnt fra kanten og ind, og det bliver til klippekanten
                a = Math.min(1, Math.max(0, (R - d) / RIM_WIDTH));
              } else if (hard) {
                a = Math.min(1, Math.max(0, (R - d) * s + 0.5));
              } else if (d >= R) a = 0;
              else if (d <= inner) a = 1;
              else a = 1 - smooth((d - inner) / (R - inner));
            }
            if (a <= 0) continue;
            const m = Math.round(a * 255);
            const i = (py - ty * T) * T + (px - tx * T);
            if (m <= st.mask[i]!) continue;
            st.mask[i] = m;
            if (!this.wholeStones) {
              this.composePixel(st, i, wxx, wyy);
              changed = true;
            }
          }
        }
        if (changed) {
          touchTile(st.tile);
          touched = true;
        }
      }
    }
    if (this.wholeStones) touched = this.paintStones(x0, y0, x1, y1);
    if (!touched) return null;
    this.mark(x0, y0, x1, y1);
    return pxToWorldRect(this.paint, x0, y0, x1 + 1, y1 + 1);
  }

  /** Lægger penselfarven (eller viskelæderet) i pixel `i` i flisen ud fra flisens billede før strøget og maskens værdi. */
  private composePixel(st: StrokeTile, i: number, wx: number, wy: number): void {
    const b = this.brush;
    const data = st.tile.data;
    const o = i * 4;
    const bf = st.before;
    const m = (st.mask[i]! / 255) * b.opacity;
    const r0 = bf ? bf[o]! : 0;
    const g0 = bf ? bf[o + 1]! : 0;
    const b0 = bf ? bf[o + 2]! : 0;
    const a0 = bf ? bf[o + 3]! / 255 : 0;
    if (b.erase) {
      data[o] = r0;
      data[o + 1] = g0;
      data[o + 2] = b0;
      data[o + 3] = a0 * (1 - m) * 255;
      return;
    }
    if (isVoid(b.material)) {
      this.composeVoid(st, i, wx, wy, r0, g0, b0, a0);
      return;
    }
    if (!st.has[i]) {
      this.colorAt(wx, wy);
      st.color[o] = shadeOut[0]!;
      st.color[o + 1] = shadeOut[1]!;
      st.color[o + 2] = shadeOut[2]!;
      st.color[o + 3] = shadeOut[3]! * 255;
      st.has[i] = 1;
    }
    const ca = (st.color[o + 3]! / 255) * m;
    const oa = ca + a0 * (1 - ca);
    if (oa <= 0) {
      data[o + 3] = 0;
      return;
    }
    const k0 = (a0 * (1 - ca)) / oa;
    const k1 = ca / oa;
    data[o] = st.color[o]! * k1 + r0 * k0;
    data[o + 1] = st.color[o + 1]! * k1 + g0 * k0;
    data[o + 2] = st.color[o + 2]! * k1 + b0 * k0;
    data[o + 3] = oa * 255;
  }

  /**
   * Tomrum med klippekant: maskens værdi (0 ved kanten, 1 inde i tomrummet) bliver til land i skygge, en lys klippekant, klippeflade og
   * så sort. Land er flisens indhold før strøget; hvor der intet er, vokser kanten ud af ingenting.
   */
  private composeVoid(st: StrokeTile, i: number, wx: number, wy: number, r0: number, g0: number, b0: number, a0: number): void {
    const data = st.tile.data;
    const o = i * 4;
    const jag = (valueNoise(wx / 7, wy / 7, this.brush.seed + 121) - 0.5) * 0.16;
    const u = Math.min(1, Math.max(0, st.mask[i]! / 255 + jag));
    const dark = 1 - 0.5 * smoothstep(0.0, 0.2, u);
    const lr = r0 * dark, lg = g0 * dark, lb = b0 * dark;
    rimShade(this.brush.material, wx, wy, this.brush.seed);
    const toRim = smoothstep(0.17, 0.21, u);
    const toBlack = smoothstep(0.7, 0.84, u);
    const hi = 1 + 0.3 * Math.max(0, 1 - Math.abs(u - 0.2) / 0.025);
    const k = 1 - toBlack;
    data[o] = (lr + (shadeOut[0]! * hi - lr) * toRim) * k + 8 * toBlack;
    data[o + 1] = (lg + (shadeOut[1]! * hi - lg) * toRim) * k + 7 * toBlack;
    data[o + 2] = (lb + (shadeOut[2]! * hi - lb) * toRim) * k + 9 * toBlack;
    data[o + 3] = (a0 + (1 - a0) * smoothstep(0.1, 0.2, u)) * 255;
  }

  /** Hele sten: hver sten, der rører området, males helt, hvis maskens værdi ved stenens midte er stor nok (hver sten kun én gang). */
  private paintStones(x0: number, y0: number, x1: number, y1: number): boolean {
    const b = this.brush;
    const st = STONE_STYLES[b.material]!;
    const s = this.scale;
    const wx0 = x0 / s - st.rowH * st.wMax;
    const wx1 = (x1 + 1) / s + st.rowH * st.wMax;
    const row0 = Math.floor((y0 / s) / st.rowH);
    const row1 = Math.floor(((y1 + 1) / s) / st.rowH);
    let touched = false;
    for (let row = row0; row <= row1; row++) {
      const yMid = (row + 0.5) * st.rowH;
      let x = wx0;
      let guard = 0;
      while (x < wx1 && guard++ < 400) {
        stoneAt(b.material, x, yMid, b.seed);
        const cellId = (row + 4096) * 8192 + (stone.col + 4096);
        const cx = stone.cx;
        const cy = stone.cy;
        const hw = stone.hw;
        const next = cx + hw + st.gap / 2 + 1.5;
        if (!this.stones.has(cellId)) {
          const m = this.maskAtPx(Math.floor(cx * s), Math.floor(cy * s));
          // ved kanten afgør stenens egen vægt, så kanten ikke bliver en lige linje
          if (m / 255 > 0.5 + (stone.b - 0.5) * 0.34 && cx * s >= 0 && cy * s >= 0) {
            this.stones.add(cellId);
            if (this.paintStone(cx, cy, hw, stone.hh, st.gap, row, stone.col)) touched = true;
          }
        }
        x = Math.max(next, x + 1);
      }
    }
    return touched;
  }

  /** Maler alle pixels, der hører til stenen (række, søjle): dens celle i rækken. */
  private paintStone(cx: number, cy: number, hw: number, hh: number, gap: number, row: number, col: number): boolean {
    const b = this.brush;
    const s = this.scale;
    const st = STONE_STYLES[b.material]!;
    const ex = hw + gap + 1;
    const ey = st.rowH / 2 + 1;
    const x0 = Math.max(0, Math.floor((cx - ex) * s));
    const x1 = Math.min(this.paint.w - 1, Math.ceil((cx + ex) * s));
    const y0 = Math.max(0, Math.floor((cy - ey) * s));
    const y1 = Math.min(this.paint.h - 1, Math.ceil((cy + ey) * s));
    let touched = false;
    for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++) {
      for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) {
        const sti = this.open(tx, ty);
        if (!sti) continue;
        const data = sti.tile.data;
        const bf = sti.before;
        const ax = Math.max(x0, tx * T);
        const bx = Math.min(x1, tx * T + T - 1);
        const ay = Math.max(y0, ty * T);
        const by = Math.min(y1, ty * T + T - 1);
        for (let py = ay; py <= by; py++) {
          const wy = (py + 0.5) / s;
          for (let px = ax; px <= bx; px++) {
            const wx = (px + 0.5) / s;
            // kun pixels, som denne sten ejer (cellerne deler fladen uden overlap)
            stoneAt(b.material, wx, wy, b.seed);
            if (stone.row !== row || stone.col !== col) continue;
            stoneColor(shadeOut, b.material, wx, wy, b.seed);
            const o = ((py - ty * T) * T + (px - tx * T)) * 4;
            const ca = shadeOut[3]! * b.opacity;
            const a0 = bf ? bf[o + 3]! / 255 : 0;
            const oa = ca + a0 * (1 - ca);
            if (oa <= 0) continue;
            const k0 = (a0 * (1 - ca)) / oa;
            const k1 = ca / oa;
            data[o] = shadeOut[0]! * k1 + (bf ? bf[o]! : 0) * k0;
            data[o + 1] = shadeOut[1]! * k1 + (bf ? bf[o + 1]! : 0) * k0;
            data[o + 2] = shadeOut[2]! * k1 + (bf ? bf[o + 2]! : 0) * k0;
            data[o + 3] = oa * 255;
            touched = true;
          }
        }
        touchTile(sti.tile);
      }
    }
    if (touched) this.mark(x0, y0, x1, y1);
    return touched;
  }

  /** Lægger et billede (RGBA, uden forhåndsmultiplikation) på laget ved pixel (x0, y0) med `opacity`. Bruges af tuftpenslen. */
  blit(x0: number, y0: number, w: number, h: number, rgba: Uint8ClampedArray, opacity: number): Rect | null {
    const ax0 = Math.max(0, x0);
    const ay0 = Math.max(0, y0);
    const ax1 = Math.min(this.paint.w, x0 + w);
    const ay1 = Math.min(this.paint.h, y0 + h);
    if (ax0 >= ax1 || ay0 >= ay1) return null;
    let touched = false;
    for (let ty = Math.floor(ay0 / T); ty <= Math.floor((ay1 - 1) / T); ty++) {
      for (let tx = Math.floor(ax0 / T); tx <= Math.floor((ax1 - 1) / T); tx++) {
        const st = this.open(tx, ty);
        if (!st) continue;
        const data = st.tile.data;
        for (let py = Math.max(ay0, ty * T); py < Math.min(ay1, ty * T + T); py++) {
          for (let px = Math.max(ax0, tx * T); px < Math.min(ax1, tx * T + T); px++) {
            const so = ((py - y0) * w + (px - x0)) * 4;
            const sa = (rgba[so + 3]! / 255) * opacity;
            if (sa <= 0) continue;
            const o = ((py - ty * T) * T + (px - tx * T)) * 4;
            const a0 = data[o + 3]! / 255;
            const oa = sa + a0 * (1 - sa);
            const k0 = (a0 * (1 - sa)) / oa;
            const k1 = sa / oa;
            data[o] = rgba[so]! * k1 + data[o]! * k0;
            data[o + 1] = rgba[so + 1]! * k1 + data[o + 1]! * k0;
            data[o + 2] = rgba[so + 2]! * k1 + data[o + 2]! * k0;
            data[o + 3] = oa * 255;
            touched = true;
          }
        }
        touchTile(st.tile);
      }
    }
    if (!touched) return null;
    this.mark(ax0, ay0, ax1 - 1, ay1 - 1);
    return pxToWorldRect(this.paint, ax0, ay0, ax1, ay1);
  }

  /** Maler langs en linje, så hurtige træk ikke efterlader huller. */
  line(ax: number, ay: number, bx: number, by: number): Rect | null {
    const b = this.brush;
    if (b.kind === 'tuft' && !b.erase) return this.dab(bx, by);
    const step = b.kind === 'grid' ? 25 : Math.max(1, (b.size / 2) * (b.hardness < 0.97 && b.kind === 'round' ? 0.2 : 0.3));
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    let dirty: Rect | null = null;
    for (let k = 0; k <= n; k++) dirty = unionRect(dirty, this.dab(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n));
    return dirty;
  }

  /** Fliserne som før strøget (til fortryd) og det berørte område; null, hvis intet er malet. */
  finish(): { before: TileSnapshot; rect: Rect; bytes: number } | null {
    const rect = this.rect();
    if (this.isEmpty || !rect) return null;
    const before: TileSnapshot = new Map();
    for (const [key, st] of this.tiles) {
      before.set(key, st.before);
      this.paint.dirty.add(key);
    }
    return { before, rect, bytes: snapshotBytes(before) };
  }

  /** Lægger det oprindelige tilbage (fx hvis strøget afbrydes). */
  cancel(): Rect | null {
    const rect = this.rect();
    for (const [key, st] of this.tiles) {
      if (st.before) st.tile.data.set(st.before);
      else this.paint.tiles.delete(key);
      touchTile(st.tile);
    }
    this.tiles.clear();
    this.stones.clear();
    this.px0 = this.py0 = Infinity;
    this.px1 = this.py1 = -Infinity;
    return rect;
  }
}

/** Gitterpenslen: kvadratet af hele felter (verdenspixels), som penslen dækker, når musen står i (wx, wy). */
export function gridRect(wx: number, wy: number, size: number): Rect {
  const n = Math.max(1, Math.round(size / 50));
  const cx = n % 2 ? Math.floor(wx / 50) - (n - 1) / 2 : Math.round(wx / 50) - n / 2;
  const cy = n % 2 ? Math.floor(wy / 50) - (n - 1) / 2 : Math.round(wy / 50) - n / 2;
  return { x: cx * 50, y: cy * 50, w: n * 50, h: n * 50 };
}

export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}
