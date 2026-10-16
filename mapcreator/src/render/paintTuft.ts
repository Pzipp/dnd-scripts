import { resolveKind } from '../objects';
import type { Rect } from '../model/types';
import { hash32 } from './noise';
import type { Brush, PaintStroke } from './paintBrush';
import { unionRect } from './paintBrush';
import { getSprite, spriteScale } from './sprites';

/** Tuftpensel: sætter græstotter (eller andre små genstande) ud med en mindste afstand og lægger dem som billede i laget. */
export interface TuftOptions {
  /** Genstandens nøgle (fx `grass_tuft`) og dens farve-parameter. */
  kind: string;
  tone: string;
  /** Afstand mellem totter i verdenspixels. */
  spacing: number;
  /** 0..1: hvor mange af pladserne, der får en tot. */
  density: number;
  /** Tottens størrelse i verdenspixels. */
  size: number;
}

const SIZE_STEPS = [0.7, 0.85, 1, 1.15, 1.3];

/**
 * Giver `Brush.stamp` til ét strøg. Pladserne ligger i et skævt net med fast afstand; hver plads afgøres højst én gang pr. strøg,
 * så man kan male frem og tilbage uden at tottene hober sig op. Nettet forskydes tilfældigt for hvert strøg.
 */
export function tuftStamper(o: TuftOptions, strokeSeed: number, opacity: number): NonNullable<Brush['stamp']> {
  const placed = new Set<number>();
  const sp = Math.max(8, o.spacing);
  const offX = ((hash32(strokeSeed, 1, 91) & 1023) / 1023) * sp;
  const offY = ((hash32(strokeSeed, 2, 91) & 1023) / 1023) * sp;
  let tmp: HTMLCanvasElement | null = null;
  return (stroke: PaintStroke, wx: number, wy: number): Rect | null => {
    const kind = resolveKind(o.kind);
    if (!kind) return null;
    const scale = stroke.paint.ppc / 50;
    const R = stroke.brush.size / 2;
    const i0 = Math.floor((wx - R - offX) / sp) - 1;
    const i1 = Math.ceil((wx + R - offX) / sp) + 1;
    const j0 = Math.floor((wy - R - offY) / sp) - 1;
    const j1 = Math.ceil((wy + R - offY) / sp) + 1;
    let dirty: Rect | null = null;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const h = hash32(i, j, strokeSeed);
        const x = (i + 0.5 + (((h & 1023) / 1023) - 0.5) * 0.85) * sp + offX;
        const y = (j + 0.5 + ((((h >>> 10) & 1023) / 1023) - 0.5) * 0.85) * sp + offY;
        const dx = x - wx;
        const dy = y - wy;
        if (dx * dx + dy * dy > R * R) continue;
        const cell = (j + 50000) * 100003 + (i + 50000);
        if (placed.has(cell)) continue;
        placed.add(cell);
        if (((h >>> 20) & 255) / 255 > o.density) continue;
        const size = Math.max(8, o.size * SIZE_STEPS[(h >>> 28) % SIZE_STEPS.length]!);
        const sprite = getSprite({ seed: (h >>> 4) % 8, w: size, h: size, params: { tone: o.tone } }, kind, spriteScale(scale, 2));
        const dim = Math.ceil(Math.hypot(sprite.ww, sprite.hh) * scale) + 2;
        if (!tmp) tmp = document.createElement('canvas');
        if (tmp.width !== dim || tmp.height !== dim) {
          tmp.width = dim;
          tmp.height = dim;
        }
        const g = tmp.getContext('2d', { willReadFrequently: true })!;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, dim, dim);
        g.translate(dim / 2, dim / 2);
        g.rotate((((h >>> 14) & 1023) / 1023) * Math.PI * 2);
        g.drawImage(sprite.canvas, sprite.ox * scale, sprite.oy * scale, sprite.ww * scale, sprite.hh * scale);
        const img = g.getImageData(0, 0, dim, dim);
        dirty = unionRect(dirty, stroke.blit(Math.round(x * scale - dim / 2), Math.round(y * scale - dim / 2), dim, dim, img.data, opacity));
      }
    }
    return dirty;
  };
}
