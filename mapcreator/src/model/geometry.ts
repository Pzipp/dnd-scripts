import type { MapElement } from './types';

type Box = Pick<MapElement, 'x' | 'y' | 'w' | 'h' | 'rot'>;

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rot';

export const HANDLES: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const DIR: Record<Exclude<HandleId, 'rot'>, [number, number]> = {
  nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0],
};

/** Verdenspunkt -> genstandens egne koordinater (origo i midten, før rotation). */
export function toLocal(el: Box, wx: number, wy: number): [number, number] {
  const dx = wx - el.x;
  const dy = wy - el.y;
  const c = Math.cos(-el.rot);
  const s = Math.sin(-el.rot);
  return [dx * c - dy * s, dx * s + dy * c];
}

export function toWorld(el: Box, lx: number, ly: number): [number, number] {
  const c = Math.cos(el.rot);
  const s = Math.sin(el.rot);
  return [el.x + lx * c - ly * s, el.y + lx * s + ly * c];
}

export function hitTest(el: Box, wx: number, wy: number, tolerance = 0): boolean {
  const [lx, ly] = toLocal(el, wx, wy);
  return Math.abs(lx) <= el.w / 2 + tolerance && Math.abs(ly) <= el.h / 2 + tolerance;
}

/** Håndtagets placering i verdenskoordinater. Rotationshåndtaget ligger `rotOffset` verdenspixels over toppen. */
export function handlePos(el: Box, h: HandleId, rotOffset: number): [number, number] {
  if (h === 'rot') return toWorld(el, 0, -el.h / 2 - rotOffset);
  const [dx, dy] = DIR[h];
  return toWorld(el, (dx * el.w) / 2, (dy * el.h) / 2);
}

export interface Resize {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Trækker i et håndtag og giver ny position og størrelse. Det modsatte hjørne/den modsatte kant står stille.
 * `lockAspect` gælder kun hjørner.
 */
export function resizeBy(el: Box, h: Exclude<HandleId, 'rot'>, wx: number, wy: number, lockAspect: boolean, minSize = 8): Resize {
  const [sx, sy] = DIR[h];
  const [lx, ly] = toLocal(el, wx, wy);
  let left = -el.w / 2;
  let right = el.w / 2;
  let top = -el.h / 2;
  let bottom = el.h / 2;
  if (sx === 1) right = Math.max(left + minSize, lx);
  if (sx === -1) left = Math.min(right - minSize, lx);
  if (sy === 1) bottom = Math.max(top + minSize, ly);
  if (sy === -1) top = Math.min(bottom - minSize, ly);
  let nw = right - left;
  let nh = bottom - top;
  if (lockAspect && sx !== 0 && sy !== 0) {
    const k = Math.max(nw / el.w, nh / el.h);
    nw = el.w * k;
    nh = el.h * k;
    if (sx === 1) right = left + nw;
    else left = right - nw;
    if (sy === 1) bottom = top + nh;
    else top = bottom - nh;
  }
  const [x, y] = toWorld(el, (left + right) / 2, (top + bottom) / 2);
  return { x, y, w: nw, h: nh };
}

/** Rotation (radianer) så rotationshåndtaget peger mod markøren. `step` runder af (fx 15°). */
export function rotationTo(el: Box, wx: number, wy: number, step = 0): number {
  let a = Math.atan2(wy - el.y, wx - el.x) + Math.PI / 2;
  if (step > 0) a = Math.round(a / step) * step;
  return a;
}
