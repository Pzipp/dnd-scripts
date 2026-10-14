import { hitTest } from './geometry';
import type { Layer, MapDoc, MapElement, Opening, Wall } from './types';
import { hitOpening, hitWall } from './walls';
import { categoryOf, getKind } from '../objects';
import { sortedElements } from '../render/sprites';

export type Picked =
  | { type: 'element'; layer: Layer; el: MapElement }
  | { type: 'wall'; layer: Layer; wall: Wall }
  | { type: 'opening'; layer: Layer; wall: Wall; opening: Opening };

/** Det øverste i punktet blandt synlige, ulåste lag. Store effekter (lys, tåge) vælges kun, hvis intet andet er i vejen. */
export function pickAt(doc: MapDoc, wx: number, wy: number, tolerance = 0): Picked | null {
  for (const pass of [0, 1]) {
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const layer = doc.layers[i]!;
      if (!layer.visible || layer.locked) continue;
      if (layer.walls && pass === 0) {
        for (let w = layer.walls.length - 1; w >= 0; w--) {
          const wall = layer.walls[w]!;
          const o = wall.openings.find((x) => hitOpening(wall, x, wx, wy, tolerance));
          if (o) return { type: 'opening', layer, wall, opening: o };
          if (hitWall(wall, wx, wy, tolerance)) return { type: 'wall', layer, wall };
        }
      }
      if (!layer.elements) continue;
      const els = sortedElements(layer);
      for (let j = els.length - 1; j >= 0; j--) {
        const el = els[j]!;
        const k = getKind(el.kind);
        const effect = !!k && categoryOf(k) === 'effects' && k.shadow === 0 && el.w * el.h > 150 * 150;
        if (pass === 0 && effect) continue;
        if (hitTest(el, wx, wy, tolerance)) return { type: 'element', layer, el };
      }
    }
  }
  return null;
}

/** Øverste genstand (ældre navn, bruges af tests og værktøjer, der kun vil have genstande). */
export function pickElement(doc: MapDoc, wx: number, wy: number, tolerance = 0): { layer: Layer; el: MapElement } | null {
  const p = pickAt(doc, wx, wy, tolerance);
  return p?.type === 'element' ? { layer: p.layer, el: p.el } : null;
}
