import type { Opening, OpeningKind, Wall } from './types';

export type Pt = [number, number];

/** Åbninger, der skærer et hul i muren (vinduer sidder i muren). */
export const GAP_KINDS: OpeningKind[] = ['opening', 'door', 'double_door', 'gate'];
export const isGap = (k: OpeningKind): boolean => GAP_KINDS.includes(k);

/** Murens linje som liste af punkter; en lukket mur får første punkt tilføjet til sidst. */
export function pathOf(wall: Pick<Wall, 'points' | 'closed'>): Pt[] {
  const pts = wall.points.map((p) => [p[0], p[1]] as Pt);
  if (wall.closed && pts.length > 2) pts.push([pts[0]![0], pts[0]![1]]);
  return pts;
}

export function pathLength(path: Pt[]): number {
  let n = 0;
  for (let i = 1; i < path.length; i++) n += Math.hypot(path[i]![0] - path[i - 1]![0], path[i]![1] - path[i - 1]![1]);
  return n;
}

export interface OnPath {
  x: number;
  y: number;
  /** Enhedsvektor langs linjen. */
  tx: number;
  ty: number;
  /** Segmentets nummer (0 = mellem punkt 0 og 1). */
  seg: number;
}

/** Punkt og retning ved buelængden `s` (klemmes til linjens ender). */
export function pointAt(path: Pt[], s: number): OnPath {
  let rest = Math.max(0, s);
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1]!;
    const [bx, by] = path[i]!;
    const len = Math.hypot(bx - ax, by - ay);
    if (rest <= len || i === path.length - 1) {
      const t = len === 0 ? 0 : Math.min(1, rest / len);
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, tx: len ? (bx - ax) / len : 1, ty: len ? (by - ay) / len : 0, seg: i - 1 };
    }
    rest -= len;
  }
  const p = path[0] ?? [0, 0];
  return { x: p[0], y: p[1], tx: 1, ty: 0, seg: 0 };
}

export interface Nearest extends OnPath {
  /** Buelængde fra start til det nærmeste punkt. */
  s: number;
  dist: number;
}

/** Det nærmeste punkt på linjen til (x, y). */
export function nearestOnPath(path: Pt[], x: number, y: number): Nearest | null {
  let best: Nearest | null = null;
  let cum = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1]!;
    const [bx, by] = path[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (len * len)));
    const px = ax + dx * t;
    const py = ay + dy * t;
    const dist = Math.hypot(x - px, y - py);
    if (!best || dist < best.dist) best = { x: px, y: py, tx: len ? dx / len : 1, ty: len ? dy / len : 0, seg: i - 1, s: cum + t * len, dist };
    cum += len;
  }
  return best;
}

/** Delstykket af linjen mellem buelængderne s0 og s1 (med interpolerede endepunkter). */
export function subPath(path: Pt[], s0: number, s1: number): Pt[] {
  const out: Pt[] = [];
  let cum = 0;
  const a = pointAt(path, s0);
  out.push([a.x, a.y]);
  for (let i = 1; i < path.length; i++) {
    cum += Math.hypot(path[i]![0] - path[i - 1]![0], path[i]![1] - path[i - 1]![1]);
    if (cum > s0 + 1e-6 && cum < s1 - 1e-6) out.push([path[i]![0], path[i]![1]]);
  }
  const b = pointAt(path, s1);
  out.push([b.x, b.y]);
  return out;
}

/** Linjens massive stykker, når intervallerne `cuts` (buelængder) tages væk. */
export function solidPieces(path: Pt[], cuts: [number, number][]): Pt[][] {
  const total = pathLength(path);
  const sorted = cuts
    .map(([a, b]) => [Math.max(0, Math.min(a, b)), Math.min(total, Math.max(a, b))] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const c of sorted) {
    const last = merged.at(-1);
    if (last && c[0] <= last[1]) last[1] = Math.max(last[1], c[1]);
    else merged.push([c[0], c[1]]);
  }
  const pieces: Pt[][] = [];
  let from = 0;
  for (const [a, b] of merged) {
    if (a - from > 0.5) pieces.push(subPath(path, from, a));
    from = b;
  }
  if (total - from > 0.5) pieces.push(subPath(path, from, total));
  return pieces;
}

export const gapRanges = (wall: Wall): [number, number][] =>
  wall.openings.filter((o) => isGap(o.kind)).map((o) => [o.at - o.width / 2, o.at + o.width / 2] as [number, number]);

/** Er (x, y) tæt nok på murens krop (inden for halv tykkelse + tolerance)? */
export function hitWall(wall: Wall, x: number, y: number, tolerance = 0): boolean {
  const n = nearestOnPath(pathOf(wall), x, y);
  return !!n && n.dist <= wall.thickness / 2 + tolerance;
}

/** Åbning i (x, y)? Ligger inden for åbningens bredde langs muren og murens tykkelse på tværs. */
export function hitOpening(wall: Wall, o: Opening, x: number, y: number, tolerance = 0): boolean {
  const path = pathOf(wall);
  const c = pointAt(path, o.at);
  const dx = x - c.x;
  const dy = y - c.y;
  const along = dx * c.tx + dy * c.ty;
  const across = -dx * c.ty + dy * c.tx;
  return Math.abs(along) <= o.width / 2 + tolerance && Math.abs(across) <= wall.thickness / 2 + tolerance;
}

/** Midtpunkter af segmenterne (til at indsætte nye punkter). */
export function midpoints(wall: Pick<Wall, 'points' | 'closed'>): { at: Pt; index: number }[] {
  const path = pathOf(wall);
  const out: { at: Pt; index: number }[] = [];
  for (let i = 1; i < path.length; i++) out.push({ at: [(path[i]![0] + path[i - 1]![0]) / 2, (path[i]![1] + path[i - 1]![1]) / 2], index: i });
  return out;
}

/** Låser en retning til trin af `stepDeg` grader omkring `from` (til mur-tegning med Shift). */
export function constrainAngle(from: Pt, to: Pt, stepDeg = 15): Pt {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return to;
  const step = (stepDeg * Math.PI) / 180;
  const a = Math.round(Math.atan2(dy, dx) / step) * step;
  return [from[0] + Math.cos(a) * len, from[1] + Math.sin(a) * len];
}
