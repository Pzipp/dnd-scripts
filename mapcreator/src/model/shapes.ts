import type { Pt } from './walls';

/** Forenkler en frihåndslinje (Ramer–Douglas–Peucker): beholder de punkter, der afviger mere end `eps` pixels fra den rette linje. */
export function simplify(points: Pt[], eps: number): Pt[] {
  if (points.length < 3) return points.map((p) => [p[0], p[1]] as Pt);
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let worst = -1;
    let wd = 0;
    const [ax, ay] = points[a]!;
    const [bx, by] = points[b]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]!;
      let d: number;
      if (len2 === 0) d = Math.hypot(px - ax, py - ay);
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
      }
      if (d > wd) {
        wd = d;
        worst = i;
      }
    }
    if (worst >= 0 && wd > eps) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return points.filter((_, i) => keep[i]).map((p) => [p[0], p[1]] as Pt);
}

/** Udjævner hjørner (Chaikin): hver iteration klipper hjørnerne og fordobler omtrent antallet af punkter. */
export function chaikin(points: Pt[], iterations = 1, closed = false): Pt[] {
  let pts = points.map((p) => [p[0], p[1]] as Pt);
  for (let it = 0; it < iterations && pts.length > 2; it++) {
    const out: Pt[] = [];
    const n = pts.length;
    const last = closed ? n : n - 1;
    if (!closed) out.push(pts[0]!);
    for (let i = 0; i < last; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % n]!;
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(pts[n - 1]!);
    pts = out;
  }
  return pts;
}

/** Hjørnerne i et rektangel mellem to modstående punkter (med uret fra øverst til venstre). */
export function rectPoints(a: Pt, b: Pt): Pt[] {
  const x0 = Math.min(a[0], b[0]);
  const x1 = Math.max(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]);
  const y1 = Math.max(a[1], b[1]);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

/** Punkter på en ellipse omkring midten (cx, cy) med radierne rx og ry. */
export function ellipsePoints(cx: number, cy: number, rx: number, ry: number, n = 32): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

/** Ligger (x, y) inde i polygonen? */
export function pointInPolygon(pts: Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function bounds(pts: Pt[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}
