import { ensureTile, PAINT_TILE, scaleOf, tileKey, tilesHigh, tilesWide, tileRect, type PaintData, type Tile } from '../model/paint';
import type { MapDoc, Rect } from '../model/types';
import { hasGround } from '../model/types';

const T = PAINT_TILE;

/** Flisens lærred til visning (oprettes ved første brug og opdateres, når flisen er ændret). */
export function tileCanvas(t: Tile): HTMLCanvasElement {
  if (!t.canvas) {
    t.canvas = document.createElement('canvas');
    t.canvas.width = T;
    t.canvas.height = T;
    t.cver = 0;
  }
  if (t.cver !== t.ver) {
    t.canvas.getContext('2d')!.putImageData(new ImageData(t.data as Uint8ClampedArray<ArrayBuffer>, T, T), 0, 0);
    t.cver = t.ver;
  }
  return t.canvas;
}

/** Flisernes område (indeks) for et rektangel i verdenspixels. */
function tileRange(p: PaintData, view: Rect | null): { tx0: number; ty0: number; tx1: number; ty1: number } {
  const s = scaleOf(p);
  if (!view) return { tx0: 0, ty0: 0, tx1: tilesWide(p) - 1, ty1: tilesHigh(p) - 1 };
  return {
    tx0: Math.max(0, Math.floor((view.x * s) / T)),
    ty0: Math.max(0, Math.floor((view.y * s) / T)),
    tx1: Math.min(tilesWide(p) - 1, Math.floor(((view.x + view.w) * s) / T)),
    ty1: Math.min(tilesHigh(p) - 1, Math.floor(((view.y + view.h) * s) / T)),
  };
}

/**
 * Tegner et malet lag i verdenskoordinater (kortets øverste venstre hjørne er (0, 0)). `view` er det synlige område (null = alt).
 * Fliserne overlapper en smule, så der ikke opstår tynde streger mellem dem, når kameraet står mellem hele pixels.
 */
export function drawPaintLayer(ctx: CanvasRenderingContext2D, p: PaintData, view: Rect | null, zoom: number): void {
  const { tx0, ty0, tx1, ty1 } = tileRange(p, view);
  const over = 0.5 / Math.max(zoom, 1e-6);
  ctx.imageSmoothingEnabled = true;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const tile = p.tiles.get(tileKey(tx, ty));
      if (!tile) continue;
      const r = tileRect(p, tx, ty);
      ctx.drawImage(tileCanvas(tile), r.x, r.y, r.w + over, r.h + over);
    }
  }
}

/**
 * Tegner de fliser i det synlige område, der endnu mangler (baggrund eller ældre kort), til tiden (ms) er gået.
 * Returnerer true, hvis der er flere synlige fliser at tegne.
 */
export function stepLazy(doc: MapDoc, view: Rect, budgetMs: number): boolean {
  const start = performance.now();
  for (const l of doc.layers) {
    const p = l.paint;
    if (!p || !l.visible || !hasGround(l.type) || !p.lazy) continue;
    const { tx0, ty0, tx1, ty1 } = tileRange(p, view);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (p.tiles.has(tileKey(tx, ty)) || p.remote.has(tileKey(tx, ty))) continue;
        if (performance.now() - start >= budgetMs) return true;
        ensureTile(p, tx, ty);
      }
    }
  }
  return false;
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/**
 * Tegner alle fliser frem (før eksport, gem og ændring af kortets størrelse), uden at siden fryser. Lag fra ældre kort har
 * bagefter ikke brug for deres kilde mere. `only`: kun lag med ældre kilde.
 */
export async function materializeAll(doc: MapDoc, opts: { onProgress?: (done: number, total: number) => void; onlyLegacy?: boolean } = {}): Promise<void> {
  const layers = doc.layers.filter((l) => l.paint?.lazy && hasGround(l.type) && (!opts.onlyLegacy || l.paint.lazy.legacy));
  let total = 0;
  for (const l of layers) total += tilesWide(l.paint!) * tilesHigh(l.paint!);
  let done = 0;
  let last = performance.now();
  for (const l of layers) {
    const p = l.paint!;
    for (let ty = 0; ty < tilesHigh(p); ty++) {
      for (let tx = 0; tx < tilesWide(p); tx++) {
        ensureTile(p, tx, ty);
        done++;
        if (performance.now() - last > 40) {
          opts.onProgress?.(done, total);
          await tick();
          last = performance.now();
        }
      }
    }
    if (p.lazy?.legacy) delete p.lazy;
  }
  opts.onProgress?.(total, total);
}
