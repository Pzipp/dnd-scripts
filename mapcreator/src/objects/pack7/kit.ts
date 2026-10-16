import { blobPath, body, clipped, ellBody, ellipsePath, lin, mottle, OUT, radial, rgb, shift, tube, type Box, type G, type Path, type RGB, type Rnd } from '../pack2/helpers';

export type { G, RGB, Rnd, Box, Path };
export { blobPath, body, clipped, ellBody, ellipsePath, lin, mottle, OUT, radial, rgb, shift, tube };

/** Små fælles hjælpere til pakke 7 (levende væsner og indretning). */
export const pick = <T>(r: Rnd, l: T[]): T => l[Math.floor(r() * l.length) % l.length]!;
export const tone = (r: Rnd, c: RGB, d = 14): RGB => [c[0] + (r() - 0.5) * d, c[1] + (r() - 0.5) * d, c[2] + (r() - 0.5) * d];

/** Æg-formet kropssti: smallere forrest (op, negativ y). */
export function eggPts(r: Rnd, cx: number, cy: number, rx: number, ry: number, narrow: number, n = 16, rough = 0.025): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const front = Math.max(0, -Math.sin(a));
    const k = (1 - narrow * front) * (1 + (r() - 0.5) * 2 * rough);
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * (1 + (r() - 0.5) * rough)]);
  }
  return out;
}

/** Pels: legemet med gradient, korte hårstrøg i retning hale (+y), rygstribe og blødt lys øverst til venstre. */
export function furBody(g: G, r: Rnd, path: Path, box: Box, base: RGB, o: { strokes?: number; len?: number; spine?: RGB; spots?: RGB; spotN?: number; belly?: RGB; lw?: number; ao?: number; dir?: number } = {}): void {
  body(g, path, base, box, { lw: o.lw ?? 1.5, ao: o.ao });
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0;
  const h = y1 - y0;
  const cx = (x0 + x1) / 2;
  clipped(g, path, () => {
    const n = o.strokes ?? Math.round((w * h) / 28);
    const L = o.len ?? Math.max(2.5, Math.min(w, h) * 0.12);
    const dir = o.dir ?? Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * w;
      const y = y0 + r() * h;
      // hårene flugter ud fra rygraden
      const spread = ((x - cx) / (w / 2)) * 0.7;
      const a = dir + spread + (r() - 0.5) * 0.5;
      g.strokeStyle = r() < 0.5 ? rgb(shift(base, -34), 0.34) : rgb(shift(base, 30), 0.34);
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
      g.stroke();
    }
    if (o.spots) {
      for (let i = 0; i < (o.spotN ?? 6); i++) {
        const sx = x0 + w * (0.15 + r() * 0.7);
        const sy = y0 + h * (0.1 + r() * 0.8);
        const rx = w * (0.1 + r() * 0.18);
        const ry = h * (0.06 + r() * 0.12);
        g.fillStyle = rgb(o.spots, 0.95);
        const pts: [number, number][] = [];
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * 6.283;
          const q = 0.65 + r() * 0.6;
          pts.push([sx + Math.cos(a) * rx * q, sy + Math.sin(a) * ry * q]);
        }
        blobPath(g, pts)();
        g.fill();
      }
    }
    if (o.belly) {
      g.fillStyle = rgb(o.belly, 0.55);
      g.beginPath();
      g.ellipse(cx + w * 0.06, y1 - h * 0.08, w * 0.42, h * 0.16, 0, 0, 7);
      g.fill();
    }
    if (o.spine) {
      g.strokeStyle = rgb(o.spine, 0.45);
      g.lineWidth = Math.max(1, w * 0.05);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx, y0 + h * 0.1);
      g.quadraticCurveTo(cx + (r() - 0.5) * w * 0.1, cy(y0, y1), cx, y1 - h * 0.08);
      g.stroke();
    }
    // lysplet øverst til venstre
    g.fillStyle = radial(g, x0 + w * 0.32, y0 + h * 0.3, Math.max(w, h) * 0.5, [[0, 'rgba(255,244,214,.22)'], [1, 'rgba(255,244,214,0)']]);
    g.fillRect(x0, y0, w, h);
  });
}
const cy = (a: number, b: number): number => (a + b) / 2;

/** Lille blank øjenprik (set oppefra, i hovedets side). */
export function eye(g: G, x: number, y: number, s: number, col = 'rgba(16,8,4,.95)'): void {
  g.fillStyle = col;
  g.beginPath();
  g.ellipse(x, y, s, s * 1.1, 0, 0, 7);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)';
  g.beginPath();
  g.arc(x - s * 0.3, y - s * 0.35, s * 0.32, 0, 7);
  g.fill();
}

/** Spidst eller rundt øre fra et punkt, pegende i vinklen `ang`. */
export function ear(g: G, x: number, y: number, ang: number, len: number, wid: number, col: RGB, inner?: RGB): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const path = () => {
    g.beginPath();
    g.moveTo(0, -wid);
    g.quadraticCurveTo(len * 0.7, -wid * 0.9, len, 0);
    g.quadraticCurveTo(len * 0.7, wid * 0.9, 0, wid);
    g.closePath();
  };
  body(g, path, col, [0, -wid, len, wid], { lw: 1.1, ao: 0.6, rim: 0.4 });
  if (inner) {
    g.fillStyle = rgb(inner, 0.85);
    g.beginPath();
    g.moveTo(len * 0.1, -wid * 0.45);
    g.quadraticCurveTo(len * 0.6, -wid * 0.4, len * 0.78, 0);
    g.quadraticCurveTo(len * 0.6, wid * 0.4, len * 0.1, wid * 0.45);
    g.fill();
  }
  g.restore();
}

/** Mørk hulrum-farve til skygger og læsioner. */
export const SOOT = 'rgba(20,10,5,.7)';
