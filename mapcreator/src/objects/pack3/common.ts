import { crack, mottle, OUT, plankBoard, rectPath, rgb, shift, woodGrain, radial, lin, ellBody, polyBody, rivet, type G, type RGB, type Rnd } from '../pack2/helpers';

export type { G, RGB, Rnd };

/** Bord/flade af planker med kontur, indre skygge og kantlys. */
export function woodRect(g: G, r: Rnd, x: number, y: number, w: number, h: number, base: RGB, o: { count?: number; vertical?: boolean; nails?: boolean; wear?: number; rad?: number } = {}): void {
  const path = rectPath(g, x, y, w, h, o.rad ?? 2);
  g.save();
  path();
  g.clip();
  const vertical = o.vertical ?? w < h;
  const count = o.count ?? Math.max(2, Math.round((vertical ? w : h) / 11));
  plankBoard(g, r, x, y, w, h, base, count, { vertical, nails: o.nails, wear: o.wear ?? 0.5 });
  // indre kantskygge nederst til højre
  g.strokeStyle = 'rgba(10,4,0,.22)';
  g.lineWidth = 5;
  g.translate(-2, -2);
  path();
  g.stroke();
  g.restore();
  // kantlys øverst til venstre
  g.beginPath();
  g.moveTo(x + 2.5, y + h - 2);
  g.lineTo(x + 2.5, y + 2.5);
  g.lineTo(x + w - 2, y + 2.5);
  g.strokeStyle = 'rgba(255,236,190,.38)';
  g.lineWidth = 1.2;
  g.stroke();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.7;
  g.lineJoin = 'round';
  g.stroke();
}

/** Rund trækant (låg, drejeskive, bordplade). */
export function woodDisc(g: G, r: Rnd, cx: number, cy: number, rad: number, base: RGB, rings = 0): void {
  ellBody(g, cx, cy, rad, rad, base, {});
  g.save();
  g.beginPath();
  g.arc(cx, cy, rad - 1, 0, 7);
  g.clip();
  woodGrain(g, r, [cx - rad, cy - rad, cx + rad, cy + rad], base, { rot: r() * 3, lines: Math.round(rad / 2.4), contrast: 0.9 });
  for (let i = 1; i <= rings; i++) {
    g.beginPath();
    g.arc(cx, cy, (rad * i) / (rings + 1), 0, 7);
    g.strokeStyle = 'rgba(30,14,4,.2)';
    g.lineWidth = 0.8;
    g.stroke();
  }
  g.restore();
}

/** Metalflade (jern/stål) med glans og nitter. */
export function ironRect(g: G, r: Rnd, x: number, y: number, w: number, h: number, base: RGB = [92, 94, 100], o: { rivets?: boolean; rad?: number; rust?: number } = {}): void {
  const path = rectPath(g, x, y, w, h, o.rad ?? 2);
  path();
  g.fillStyle = lin(g, x, y, x + w, y + h, [[0, rgb(shift(base, 38))], [0.45, rgb(base)], [1, rgb(shift(base, -36))]]);
  g.fill();
  g.save();
  path();
  g.clip();
  mottle(g, r, [x, y, x + w, y + h], base, Math.round((w * h) / 90), 3, 14, 0.4);
  if (o.rust) mottle(g, r, [x, y, x + w, y + h], [150, 80, 36], Math.round(((w * h) / 140) * o.rust), 2.4, 18, 0.5);
  g.strokeStyle = 'rgba(255,255,255,.34)';
  g.lineWidth = 1.3;
  g.beginPath();
  g.moveTo(x + 1.5, y + h - 2);
  g.lineTo(x + 1.5, y + 1.5);
  g.lineTo(x + w - 2, y + 1.5);
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.28)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x + w - 1, y + 2);
  g.lineTo(x + w - 1, y + h - 1);
  g.lineTo(x + 2, y + h - 1);
  g.stroke();
  g.restore();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.5;
  g.stroke();
  if (o.rivets) {
    const s = Math.max(1.1, Math.min(w, h) * 0.06);
    for (const [px, py] of [[x + s * 2.2, y + s * 2.2], [x + w - s * 2.2, y + s * 2.2], [x + s * 2.2, y + h - s * 2.2], [x + w - s * 2.2, y + h - s * 2.2]] as [number, number][]) rivet(g, px, py, s, base);
  }
}

/** Blank kugle (perle, frugt, glas) med spejling. */
export function bead(g: G, x: number, y: number, rad: number, col: RGB, ry = rad): void {
  g.beginPath();
  g.ellipse(x, y, rad, ry, 0, 0, 7);
  g.fillStyle = radial(g, x, y, rad * 1.1, [[0, rgb(shift(col, 50))], [0.5, rgb(col)], [1, rgb(shift(col, -55))]], x - rad * 0.35, y - ry * 0.4, rad * 0.05);
  g.fill();
  g.strokeStyle = 'rgba(20,10,5,.75)';
  g.lineWidth = Math.max(0.7, rad * 0.14);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.beginPath();
  g.ellipse(x - rad * 0.35, y - ry * 0.4, rad * 0.22, ry * 0.16, -0.6, 0, 7);
  g.fill();
}

/** Ridser på en flade (kaldes i clip). */
export function scratches(g: G, r: Rnd, x: number, y: number, w: number, h: number, n: number): void {
  for (let i = 0; i < n; i++) crack(g, r, x + r() * w, y + r() * h, 3 + r() * 8, r() * 6.3, 0.5, false);
}

/** Sæk med bundet hals eller åben med indhold (korn, mel, krydderi). */
export function sack(g: G, r: Rnd, cx: number, cy: number, rad: number, col: RGB, fill?: RGB): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * 6.283;
    const k = 1 + (r() - 0.5) * 0.14;
    pts.push([cx + Math.cos(a) * rad * k, cy + Math.sin(a) * rad * 0.9 * k]);
  }
  polyBody(g, pts, col, { lw: 1.3 });
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rad * 0.95, rad * 0.85, 0, 0, 7);
  g.clip();
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.283;
    g.strokeStyle = 'rgba(40,24,8,.18)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(cx + Math.cos(a) * rad * 0.5 + 2, cy + Math.sin(a) * rad * 0.5, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    g.stroke();
  }
  g.restore();
  if (fill) {
    ellBody(g, cx, cy, rad * 0.55, rad * 0.5, fill, { lw: 0.8 });
    mottle(g, r, [cx - rad * 0.4, cy - rad * 0.4, cx + rad * 0.4, cy + rad * 0.4], fill, 10, 1.4, 20, 0.7);
  } else {
    g.fillStyle = 'rgba(20,10,4,.5)';
    g.beginPath();
    g.ellipse(cx, cy, rad * 0.18, rad * 0.14, 0, 0, 7);
    g.fill();
    g.strokeStyle = 'rgba(190,160,100,.9)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(cx, cy, rad * 0.3, rad * 0.25, 0, 0, 7);
    g.stroke();
  }
}

/** Mønt. */
export function coin(g: G, x: number, y: number, rad: number, col: RGB = [220, 178, 60]): void {
  ellBody(g, x, y, rad, rad, col, { lw: 0.8, ao: 0.6, rim: 0.5 });
  g.beginPath();
  g.arc(x, y, rad * 0.62, 0, 7);
  g.strokeStyle = 'rgba(90,60,10,.5)';
  g.lineWidth = 0.6;
  g.stroke();
}

/** Tilfældig nuance af en farve. */
export function vary(r: Rnd, c: RGB, d = 14): RGB {
  return [c[0] + (r() - 0.5) * d, c[1] + (r() - 0.5) * d, c[2] + (r() - 0.5) * d];
}
