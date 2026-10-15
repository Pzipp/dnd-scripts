import type { MapDoc, Rect } from '../model/types';
import { CELL_PX } from '../model/types';
import type { GroundData } from '../model/ground';
import { GROUND_RENDER_VERSION, renderGroundTile } from './ground';

const TILE = 256;
/** Hvor langt (verdenspixels) en terrænændring kan påvirke tegningen uden for sig selv. */
const BLEND_PAD = 36;
/** Hvor langt uden for en flise maskecellerne kan påvirke den (overgange og hele sten). Bruges til flisens fingeraftryk. */
const SIG_PAD = 110;


interface Entry {
  canvas: HTMLCanvasElement;
}

/** Det, serveren har gemt for et lag (se `api.ts`). */
export interface BakedLayer {
  version: number;
  scale: number;
  tile: number;
  sigs: Record<string, string>;
}

/** Fingeraftrykket af alt, en flises billede afhænger af: maskecellerne omkring den, seed, skala og tegnekodens version. */
export function tileSignature(ground: GroundData, seed: number, scale: number, tx: number, ty: number): string {
  const cell = CELL_PX / ground.res;
  const x0 = (tx * TILE) / scale - SIG_PAD;
  const y0 = (ty * TILE) / scale - SIG_PAD;
  const x1 = ((tx + 1) * TILE) / scale + SIG_PAD;
  const y1 = ((ty + 1) * TILE) / scale + SIG_PAD;
  const cx0 = Math.max(0, Math.floor(x0 / cell));
  const cy0 = Math.max(0, Math.floor(y0 / cell));
  const cx1 = Math.min(ground.w - 1, Math.floor(x1 / cell));
  const cy1 = Math.min(ground.h - 1, Math.floor(y1 / cell));
  let a = 0x811c9dc5 ^ GROUND_RENDER_VERSION;
  let b = 0x9747b28c ^ seed;
  const mix = (v: number): void => {
    a = Math.imul(a ^ v, 16777619);
    b = Math.imul(b ^ v, 2246822519) + (b >>> 15);
  };
  mix(Math.round(scale * 1e6));
  mix(tx);
  mix(ty);
  mix(cx0 * 7 + cy0);
  mix(cx1 * 7 + cy1);
  const path = ground.path;
  for (let y = cy0; y <= cy1; y++) {
    for (let x = cx0; x <= cx1; x++) {
      const i = y * ground.w + x;
      mix(path ? ground.data[i]! | (path[i]! << 8) : ground.data[i]!);
    }
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
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
  /** Fingeraftrykket for hver flise, som den står tegnet på lærredet (nøgle: lag:tx:ty). */
  private drawn = new Map<string, string>();
  /** Det, serveren har gemt (samme nøgler). */
  private stored = new Map<string, string>();
  /** Mens gemte fliser hentes, tegnes der ikke, så vi ikke regner det, der allerede findes. */
  paused = false;

  get pending(): boolean {
    return this.paused || this.queue.length > 0;
  }

  canvas(layerId: string): HTMLCanvasElement | undefined {
    return this.entries.get(layerId)?.canvas;
  }

  /** Smid alt væk (nyt kort). */
  reset(): void {
    this.entries.clear();
    this.queue = [];
    this.queued.clear();
    this.drawn.clear();
    this.stored.clear();
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
    if (this.stored.size > 0) for (const k of [...this.stored.keys()]) if (!alive.has(k.split(':')[0]!)) { this.stored.delete(k); this.drawn.delete(k); }
  }

  /** Marker et område (verdenspixels; null = hele laget) til gentegning. Rørte fliser tegnes først. */
  invalidate(layerId: string, rect: Rect | null, doc: MapDoc): void {
    const entry = this.entries.get(layerId);
    if (!entry) return;
    const cw = entry.canvas.width;
    const ch = entry.canvas.height;
    // overgangene mellem materialer rækker lidt uden for de malede celler
    const r = rect ? { x: rect.x - BLEND_PAD, y: rect.y - BLEND_PAD, w: rect.w + 2 * BLEND_PAD, h: rect.h + 2 * BLEND_PAD } : { x: 0, y: 0, w: cw / this.scale, h: ch / this.scale };
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
        this.drawn.delete(key);
        fresh.push({ layerId, tx, ty });
      }
    }
    // Strøg (rect) først i køen, hele lag bagerst.
    this.queue = rect ? [...fresh, ...this.queue] : [...this.queue, ...fresh];
    void doc;
  }

  /** Tegner fliser, til tiden (ms) er gået. Returnerer true, hvis der er mere at tegne. */
  step(doc: MapDoc, budgetMs: number, seed = doc.seed): boolean {
    if (this.paused) return true;
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
      const sig = tileSignature(ground, seed, this.scale, t.tx, t.ty);
      renderGroundTile(img, ground, seed, x / this.scale, y / this.scale, this.scale);
      ctx.putImageData(img, x, y);
      this.drawn.set(`${t.layerId}:${t.tx}:${t.ty}`, sig);
    }
    return this.queue.length > 0;
  }

  /**
   * Bruger de fliser, serveren har gemt, i stedet for at regne dem: for hver flise, hvis gemte fingeraftryk passer til maskens
   * nuværende indhold, hentes billedet; resten regnes som sædvanligt. `fetchTile` giver billedet for (lag, "tx_ty", fingeraftryk).
   */
  async applyBake(doc: MapDoc, baked: Record<string, BakedLayer>, fetchTile: (layerId: string, key: string, sig: string) => Promise<Blob>): Promise<void> {
    this.sync(doc);
    const seed = doc.seed;
    const jobs: Promise<void>[] = [];
    for (const l of doc.layers) {
      const m = baked[l.id];
      const entry = this.entries.get(l.id);
      if (l.type !== 'ground' || !l.ground || !m || !entry) continue;
      if (m.version !== GROUND_RENDER_VERSION || m.tile !== TILE || Math.abs(m.scale - this.scale) > 1e-9) continue;
      const ground = l.ground;
      for (const [key, sig] of Object.entries(m.sigs)) {
        const [tx, ty] = key.split('_').map(Number) as [number, number];
        const qk = `${l.id}:${tx}:${ty}`;
        if (!this.queued.has(qk)) continue;
        if (tileSignature(ground, seed, this.scale, tx, ty) !== sig) continue;
        // flisen tages ud af køen, til billedet er hentet; fejler det, regnes flisen alligevel
        this.queued.delete(qk);
        this.queue = this.queue.filter((q) => !(q.layerId === l.id && q.tx === tx && q.ty === ty));
        jobs.push((async () => {
          try {
            const bmp = await createImageBitmap(await fetchTile(l.id, key, sig));
            const ctx = entry.canvas.getContext('2d')!;
            const x = tx * TILE;
            const y = ty * TILE;
            ctx.clearRect(x, y, TILE, TILE);
            ctx.drawImage(bmp, x, y);
            bmp.close();
            this.drawn.set(qk, sig);
            this.stored.set(qk, sig);
          } catch {
            this.queued.add(qk);
            this.queue.push({ layerId: l.id, tx, ty });
          }
        })());
      }
    }
    await Promise.all(jobs);
  }

  /**
   * Det, der skal gemmes hos serveren for hvert grundlag: manifest med alle færdigtegnede fliser og billederne af dem, der er nye
   * eller ændret. Fliser, der stadig skal tegnes, er ikke med (de kommer med næste gang). Kald `markStored` bagefter.
   */
  async bakePayload(doc: MapDoc): Promise<{ layerId: string; manifest: BakedLayer; tiles: Map<string, Blob> }[]> {
    const out: { layerId: string; manifest: BakedLayer; tiles: Map<string, Blob> }[] = [];
    for (const l of doc.layers) {
      const entry = this.entries.get(l.id);
      if (l.type !== 'ground' || !l.ground || !entry) continue;
      const sigs: Record<string, string> = {};
      const tiles = new Map<string, Blob>();
      let changed = false;
      const cols = Math.ceil(entry.canvas.width / TILE);
      const rows = Math.ceil(entry.canvas.height / TILE);
      for (let ty = 0; ty < rows; ty++) {
        for (let tx = 0; tx < cols; tx++) {
          const k = `${l.id}:${tx}:${ty}`;
          const sig = this.drawn.get(k);
          if (!sig || this.queued.has(k)) continue;
          sigs[`${tx}_${ty}`] = sig;
          if (this.stored.get(k) === sig) continue;
          changed = true;
          const w = Math.min(TILE, entry.canvas.width - tx * TILE);
          const h = Math.min(TILE, entry.canvas.height - ty * TILE);
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          c.getContext('2d')!.drawImage(entry.canvas, tx * TILE, ty * TILE, w, h, 0, 0, w, h);
          const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/webp', 0.92));
          if (blob) tiles.set(`${tx}_${ty}`, blob);
          else delete sigs[`${tx}_${ty}`];
        }
      }
      const storedCount = [...this.stored.keys()].filter((k) => k.startsWith(`${l.id}:`)).length;
      if (changed || storedCount !== Object.keys(sigs).length) out.push({ layerId: l.id, manifest: { version: GROUND_RENDER_VERSION, scale: this.scale, tile: TILE, sigs }, tiles });
    }
    return out;
  }

  /** Husk, at serveren nu har de fliser, som manifestet nævner. */
  markStored(layerId: string, manifest: BakedLayer): void {
    for (const k of [...this.stored.keys()]) if (k.startsWith(`${layerId}:`)) this.stored.delete(k);
    for (const [key, sig] of Object.entries(manifest.sigs)) {
      const [tx, ty] = key.split('_');
      this.stored.set(`${layerId}:${tx}:${ty}`, sig);
    }
  }

  /** Er der færdigtegnede fliser, serveren endnu ikke har? (Bruges til at gemme dem, når tegningen er færdig.) */
  get unstored(): boolean {
    for (const [k, sig] of this.drawn) if (this.stored.get(k) !== sig) return true;
    return false;
  }
}

export const groundCache = new GroundCache();
