import type { MapDoc, Rect } from '../model/types';
import { CELL_PX } from '../model/types';
import { renderGroundTile } from './ground';

const TILE = 256;

interface Entry {
  canvas: HTMLCanvasElement;
}

/**
 * Forhåndsvisningens tegnede terræn pr. grundlag, i lavere opløsning end eksporten. Tegnes i fliser, lidt ad gangen,
 * så siden ikke fryser; et penselstrøg gentegner kun de fliser, det rører.
 */
export class GroundCache {
  scale = 0.5;
  private entries = new Map<string, Entry>();
  private queue: { layerId: string; tx: number; ty: number }[] = [];
  private queued = new Set<string>();

  get pending(): boolean {
    return this.queue.length > 0;
  }

  canvas(layerId: string): HTMLCanvasElement | undefined {
    return this.entries.get(layerId)?.canvas;
  }

  /** Smid alt væk (nyt kort). */
  reset(): void {
    this.entries.clear();
    this.queue = [];
    this.queued.clear();
  }

  /** Sørger for, at hvert grundlag har et lærred, og at nye lag bliver tegnet. */
  sync(doc: MapDoc): void {
    const mw = doc.widthCells * CELL_PX;
    const mh = doc.heightCells * CELL_PX;
    const scale = Math.min(0.5, 2400 / Math.max(mw, mh));
    if (scale !== this.scale) {
      this.reset();
      this.scale = scale;
    }
    const alive = new Set<string>();
    for (const l of doc.layers) {
      if (l.type !== 'ground' || !l.ground) continue;
      alive.add(l.id);
      if (!this.entries.has(l.id)) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(mw * scale);
        canvas.height = Math.ceil(mh * scale);
        this.entries.set(l.id, { canvas });
        this.invalidate(l.id, null, doc);
      }
    }
    for (const id of [...this.entries.keys()]) if (!alive.has(id)) this.entries.delete(id);
  }

  /** Marker et område (verdenspixels; null = hele laget) til gentegning. Rørte fliser tegnes først. */
  invalidate(layerId: string, rect: Rect | null, doc: MapDoc): void {
    const entry = this.entries.get(layerId);
    if (!entry) return;
    const cw = entry.canvas.width;
    const ch = entry.canvas.height;
    const r = rect ?? { x: 0, y: 0, w: cw / this.scale, h: ch / this.scale };
    const tx0 = Math.max(0, Math.floor((r.x * this.scale - 1) / TILE));
    const ty0 = Math.max(0, Math.floor((r.y * this.scale - 1) / TILE));
    const tx1 = Math.min(Math.ceil(cw / TILE) - 1, Math.floor(((r.x + r.w) * this.scale + 1) / TILE));
    const ty1 = Math.min(Math.ceil(ch / TILE) - 1, Math.floor(((r.y + r.h) * this.scale + 1) / TILE));
    const fresh: typeof this.queue = [];
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const key = `${layerId}:${tx}:${ty}`;
        if (this.queued.has(key)) continue;
        this.queued.add(key);
        fresh.push({ layerId, tx, ty });
      }
    }
    // Strøg (rect) først i køen, hele lag bagerst.
    this.queue = rect ? [...fresh, ...this.queue] : [...this.queue, ...fresh];
    void doc;
  }

  /** Tegner fliser, til tiden (ms) er gået. Returnerer true, hvis der er mere at tegne. */
  step(doc: MapDoc, budgetMs: number, seed = doc.seed): boolean {
    const start = performance.now();
    while (this.queue.length > 0 && performance.now() - start < budgetMs) {
      const t = this.queue.shift()!;
      this.queued.delete(`${t.layerId}:${t.tx}:${t.ty}`);
      const entry = this.entries.get(t.layerId);
      const ground = doc.layers.find((l) => l.id === t.layerId)?.ground;
      if (!entry || !ground) continue;
      const x = t.tx * TILE;
      const y = t.ty * TILE;
      const w = Math.min(TILE, entry.canvas.width - x);
      const h = Math.min(TILE, entry.canvas.height - y);
      if (w <= 0 || h <= 0) continue;
      const ctx = entry.canvas.getContext('2d')!;
      const img = ctx.createImageData(w, h);
      renderGroundTile(img, ground, seed, x / this.scale, y / this.scale, this.scale);
      ctx.putImageData(img, x, y);
    }
    return this.queue.length > 0;
  }
}

export const groundCache = new GroundCache();
