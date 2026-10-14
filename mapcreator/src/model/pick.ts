import { hitTest } from './geometry';
import type { Layer, MapDoc, MapElement } from './types';
import { categoryOf, getKind } from '../objects';
import { sortedElements } from '../render/sprites';

/** Øverste genstand i punktet blandt synlige, ulåste lag. Store effekter (lys, tåge) vælges kun, hvis intet andet er i vejen. */
export function pickElement(doc: MapDoc, wx: number, wy: number, tolerance = 0): { layer: Layer; el: MapElement } | null {
  for (const pass of [0, 1]) {
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const layer = doc.layers[i]!;
      if (!layer.visible || layer.locked || !layer.elements) continue;
      const els = sortedElements(layer);
      for (let j = els.length - 1; j >= 0; j--) {
        const el = els[j]!;
        const k = getKind(el.kind);
        const effect = !!k && categoryOf(k) === 'effects' && k.shadow === 0 && el.w * el.h > 150 * 150;
        if (pass === 0 && effect) continue;
        if (hitTest(el, wx, wy, tolerance)) return { layer, el };
      }
    }
  }
  return null;
}
