import { clampCells } from './doc';
import { GROUND_RES, type GroundData } from './ground';
import type { Command } from './history';
import { CELL_PX, type Layer, type MapDoc } from './types';

/** Hvor det eksisterende kort sidder, når størrelsen ændres: 0 = op/venstre, 0.5 = midten, 1 = ned/højre. */
export interface Anchor {
  x: 0 | 0.5 | 1;
  y: 0 | 0.5 | 1;
}

/** Forskydning (hele felter) af det gamle kort i det nye. */
export function resizeOffset(oldCells: number, newCells: number, a: 0 | 0.5 | 1): number {
  return Math.round((newCells - oldCells) * a);
}

/** Terrænmasken i ny størrelse: det gamle flyttes `dx`/`dy` felter, nye områder får nærmeste kantmateriale (stier: ingen). */
export function resizeGround(g: GroundData, newW: number, newH: number, dx: number, dy: number): GroundData {
  const w = newW * GROUND_RES;
  const h = newH * GROUND_RES;
  const ox = dx * GROUND_RES;
  const oy = dy * GROUND_RES;
  const data = new Uint8Array(w * h);
  const path = g.path ? new Uint8Array(w * h) : undefined;
  for (let y = 0; y < h; y++) {
    const sy = Math.min(g.h - 1, Math.max(0, y - oy));
    const inY = y - oy >= 0 && y - oy < g.h;
    for (let x = 0; x < w; x++) {
      const sx = Math.min(g.w - 1, Math.max(0, x - ox));
      data[y * w + x] = g.data[sy * g.w + sx]!;
      if (path && inY && x - ox >= 0 && x - ox < g.w) path[y * w + x] = g.path![sy * g.w + sx]!;
    }
  }
  return { res: g.res, w, h, data, ...(path ? { path } : {}) };
}

interface Snapshot {
  widthCells: number;
  heightCells: number;
  layers: Layer[];
}

const keep = (doc: MapDoc): Snapshot => ({ widthCells: doc.widthCells, heightCells: doc.heightCells, layers: doc.layers.slice() });

/** Ændrer kortets størrelse. Genstande og mure flyttes med; genstande, hvis midte havner uden for kortet, fjernes (fortryd henter dem tilbage). */
export function resizeMap(widthCells: number, heightCells: number, anchor: Anchor): Command {
  let before: Snapshot | null = null;
  let after: Snapshot | null = null;
  return {
    label: 'Ændr kortstørrelse',
    relayout: true,
    apply(doc) {
      if (after) {
        doc.widthCells = after.widthCells;
        doc.heightCells = after.heightCells;
        doc.layers = after.layers.slice();
        return;
      }
      before = keep(doc);
      const nw = clampCells(widthCells);
      const nh = clampCells(heightCells);
      const dx = resizeOffset(doc.widthCells, nw, anchor.x);
      const dy = resizeOffset(doc.heightCells, nh, anchor.y);
      const px = dx * CELL_PX;
      const py = dy * CELL_PX;
      const layers = doc.layers.map((l): Layer => {
        const copy: Layer = { ...l };
        if (l.ground) copy.ground = resizeGround(l.ground, nw, nh, dx, dy);
        if (l.elements) {
          copy.elements = l.elements
            .map((e) => ({ ...e, x: e.x + px, y: e.y + py }))
            .filter((e) => e.x >= 0 && e.y >= 0 && e.x <= nw * CELL_PX && e.y <= nh * CELL_PX);
        }
        if (l.walls) copy.walls = l.walls.map((w) => ({ ...w, points: w.points.map(([x, y]) => [x + px, y + py] as [number, number]) }));
        return copy;
      });
      doc.widthCells = nw;
      doc.heightCells = nh;
      doc.layers = layers;
      after = keep(doc);
    },
    revert(doc) {
      if (!before) return;
      doc.widthCells = before.widthCells;
      doc.heightCells = before.heightCells;
      doc.layers = before.layers.slice();
    },
  };
}
