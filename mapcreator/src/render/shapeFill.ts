import { createGround } from '../model/ground';
import type { Wall } from '../model/types';
import { bounds } from '../model/shapes';
import type { Pt } from '../model/walls';
import { renderGroundTile } from './ground';

/**
 * Udfyldningen af en form: terrænmaterialet tegnes (som terræn) i formens omkreds én gang, huskes som lærred og lægges ind
 * i formens omrids med en klipning. Så får en form et gulv af planker, brosten eller græs med præcis den kant, den har.
 */
interface Entry {
  canvas: HTMLCanvasElement;
  x0: number;
  y0: number;
  w: number;
  h: number;
}

const MAX_PIXELS = 4_000_000;
const MAX_ENTRIES = 24;
const cache = new Map<string, Entry>();

function fillCanvas(wall: Wall, scale: number): Entry | null {
  const pts = wall.points as Pt[];
  if (!wall.fill || pts.length < 3) return null;
  const b = bounds(pts);
  const pad = 2;
  const x0 = Math.floor(b.x0) - pad;
  const y0 = Math.floor(b.y0) - pad;
  const w = Math.ceil(b.x1 - b.x0) + 2 * pad;
  const h = Math.ceil(b.y1 - b.y0) + 2 * pad;
  let s = scale;
  while (w * s * h * s > MAX_PIXELS) s /= 2;
  const key = `${wall.fill.material}|${wall.seed}|${w}|${h}|${s}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return { ...hit, x0, y0 };
  }
  const cells = (px: number) => Math.max(1, Math.ceil(px / 50));
  const ground = createGround(cells(w), cells(h), wall.fill.material);
  const cw = Math.max(1, Math.ceil(w * s));
  const ch = Math.max(1, Math.ceil(h * s));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(cw, ch);
  renderGroundTile(img, ground, wall.seed, 0, 0, s);
  ctx.putImageData(img, 0, 0);
  const entry: Entry = { canvas, x0, y0, w, h };
  cache.set(key, entry);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return entry;
}

/** Tegner udfyldningen af en form (hvis den har en) i verdenskoordinater. `scale` = pixels pr. verdenspixel, højst. */
export function drawShapeFill(g: CanvasRenderingContext2D, wall: Wall, scale: number): void {
  const e = fillCanvas(wall, scale);
  if (!e) return;
  const pts = wall.points as Pt[];
  g.save();
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.clip();
  g.drawImage(e.canvas, e.x0, e.y0, e.w, e.h);
  g.restore();
}
