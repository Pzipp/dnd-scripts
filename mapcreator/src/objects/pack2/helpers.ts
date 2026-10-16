import { mix, rgb, shift, softDot, type RGB } from '../util';

/** Fælles hjælp til pakke 2: lag-på-lag maling (gradient, ambient occlusion, rim-lys, struktur). Lyset kommer fra øverst til venstre. */
export type G = CanvasRenderingContext2D;
export type Rnd = () => number;
export type Path = () => void;
export type Box = [number, number, number, number];

export const OUT = 'rgba(22,12,6,.82)';
export const OUT_SOFT = 'rgba(22,12,6,.5)';

export const rr = (r: Rnd, a: number, b: number): number => a + (r() - 0.5 + 0.5) * (b - a);
export const pick = <T>(r: Rnd, list: T[]): T => list[Math.floor(r() * list.length) % list.length]!;
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export function ellipsePath(g: G, cx: number, cy: number, rx: number, ry: number, rot = 0): Path {
  return () => {
    g.beginPath();
    g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  };
}

export function rectPath(g: G, x: number, y: number, w: number, h: number, rad = 0): Path {
  return () => {
    const r = Math.max(0, Math.min(rad, Math.abs(w) / 2, Math.abs(h) / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
}

export function polyPath(g: G, pts: [number, number][], close = true): Path {
  return () => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    if (close) g.closePath();
  };
}

/** Glat lukket sti gennem midtpunkterne. */
export function blobPath(g: G, pts: [number, number][]): Path {
  return () => {
    const n = pts.length;
    g.beginPath();
    g.moveTo((pts[0]![0] + pts[n - 1]![0]) / 2, (pts[0]![1] + pts[n - 1]![1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % n]!;
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
  };
}

export function wobble(r: Rnd, cx: number, cy: number, rx: number, ry: number, n: number, rough: number, rot = 0): [number, number][] {
  const out: [number, number][] = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * rough;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

export function lin(g: G, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}

export function radial(g: G, x: number, y: number, r: number, stops: [number, string][], fx = x, fy = y, fr = 0): CanvasGradient {
  const gr = g.createRadialGradient(fx, fy, fr, x, y, r);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}

export function clipped(g: G, path: Path, fn: () => void): void {
  g.save();
  path();
  g.clip();
  fn();
  g.restore();
}

/**
 * Skygger tegnes ikke i genstanden: kortbyggerens fælles skyggesystem (`shadow` på varianten, lysretningen og lagets højde)
 * lægger dem på alle genstande ens. Funktionerne findes, så tegnefilerne ikke skal ændres, men gør intet.
 */
export function groundShadow(_g: G, _x: number, _y: number, _rx: number, _ry: number, _a = 0.4): void {}

export function castShadow(_g: G, _path: Path, _dx: number, _dy: number, _blur: number, _a = 0.4): void {}

export interface BodyOpts {
  lw?: number;
  /** Lys og mørk forskydning i gradienten. */
  light?: number;
  dark?: number;
  /** Retning for gradienten (grader, 0 = mod højre); standard er øverst til venstre mod nederst til højre. */
  angle?: number;
  /** Bredde på ambient occlusion langs kanten (nederst til højre) og rim-lys (øverst til venstre). */
  ao?: number;
  rim?: number;
  outline?: string | null;
  alpha?: number;
}

/** Hovedmetoden: fylder en sti med gradient, tilføjer blød AO og rim-lys indvendigt og en mørk kontur. */
export function body(g: G, path: Path, base: RGB, box: Box, o: BodyOpts = {}): void {
  const lw = o.lw ?? 1.6;
  const a = o.alpha ?? 1;
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hw = (x1 - x0) / 2;
  const hh = (y1 - y0) / 2;
  const ang = ((o.angle ?? 45) * Math.PI) / 180;
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const ext = Math.abs(dx) * hw + Math.abs(dy) * hh;
  path();
  g.fillStyle = lin(g, cx - dx * ext, cy - dy * ext, cx + dx * ext, cy + dy * ext, [
    [0, rgb(shift(base, o.light ?? 26), a)],
    [0.5, rgb(base, a)],
    [1, rgb(shift(base, -(o.dark ?? 34)), a)],
  ]);
  g.fill();
  const s = o.ao ?? Math.max(1.2, Math.min(hw, hh) * 0.09);
  if (s > 0) {
    g.save();
    path();
    g.clip();
    for (let i = 0; i < 2; i++) {
      const k = 1 + i * 1.4;
      g.save();
      g.translate(-s * 0.5 * k, -s * 0.5 * k);
      path();
      g.strokeStyle = `rgba(10,5,0,${0.17 - i * 0.06})`;
      g.lineWidth = s * k * 1.6;
      g.stroke();
      g.restore();
    }
    const rim = o.rim ?? Math.max(0.8, s * 0.45);
    g.translate(rim, rim);
    path();
    g.strokeStyle = 'rgba(255,246,220,.34)';
    g.lineWidth = rim * 1.6;
    g.stroke();
    g.restore();
  }
  if (o.outline !== null) {
    path();
    g.strokeStyle = o.outline ?? OUT;
    g.lineWidth = lw;
    g.lineJoin = 'round';
    g.stroke();
  }
}

export function ellBody(g: G, cx: number, cy: number, rx: number, ry: number, base: RGB, o: BodyOpts = {}): void {
  body(g, ellipsePath(g, cx, cy, rx, ry), base, [cx - rx, cy - ry, cx + rx, cy + ry], o);
}

export function rectBody(g: G, x: number, y: number, w: number, h: number, rad: number, base: RGB, o: BodyOpts = {}): void {
  body(g, rectPath(g, x, y, w, h, rad), base, [x, y, x + w, y + h], o);
}

export function polyBody(g: G, pts: [number, number][], base: RGB, o: BodyOpts = {}): void {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of pts) {
    a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y);
  }
  body(g, polyPath(g, pts), base, [a, b, c, d], o);
}

export function blobBody(g: G, pts: [number, number][], base: RGB, o: BodyOpts = {}): void {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of pts) {
    a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y);
  }
  body(g, blobPath(g, pts), base, [a, b, c, d], o);
}

/** Kugle med radial gradient, spejling og kontur. */
export function orb(g: G, x: number, y: number, rad: number, base: RGB, lw = 1.1, ry = rad): void {
  g.beginPath();
  g.ellipse(x, y, rad, ry, 0, 0, Math.PI * 2);
  g.fillStyle = radial(g, x, y, rad * 1.05, [[0, rgb(shift(base, 58))], [0.4, rgb(base)], [1, rgb(shift(base, -58))]], x - rad * 0.38, y - ry * 0.4, rad * 0.05);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = lw;
  g.stroke();
}

/** Træets årer: lange, let bølgede streger langs vinklen `rot` i en kasse (skal kaldes inden for en clip). */
export function woodGrain(g: G, r: Rnd, box: Box, base: RGB, o: { rot?: number; lines?: number; contrast?: number; knots?: number } = {}): void {
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0;
  const h = y1 - y0;
  const rot = o.rot ?? 0;
  const L = Math.hypot(w, h);
  const n = o.lines ?? Math.max(6, Math.round(Math.min(w, h) / 3.2));
  const k = o.contrast ?? 1;
  g.save();
  g.translate((x0 + x1) / 2, (y0 + y1) / 2);
  g.rotate(rot);
  const span = Math.abs(Math.cos(rot)) < 0.01 ? h : Math.max(w, h);
  for (let i = 0; i < n; i++) {
    const yy = (r() - 0.5) * (rot ? L : span);
    const dark = r() < 0.6;
    g.strokeStyle = dark ? `rgba(30,14,4,${(0.1 + r() * 0.16) * k})` : `rgba(255,226,170,${(0.06 + r() * 0.1) * k})`;
    g.lineWidth = 0.5 + r() * Math.max(0.6, Math.min(w, h) * 0.02);
    g.beginPath();
    const amp = 1 + r() * 2.2;
    const ph = r() * 6;
    for (let t = 0; t <= 8; t++) {
      const xx = -L / 2 + (t / 8) * L;
      const py = yy + Math.sin(t * 0.9 + ph) * amp;
      if (t) g.lineTo(xx, py);
      else g.moveTo(xx, py);
    }
    g.stroke();
  }
  const kn = o.knots ?? 0;
  for (let i = 0; i < kn; i++) {
    const kx = (r() - 0.5) * w * 0.8;
    const ky = (r() - 0.5) * h * 0.7;
    const kr = 1.6 + r() * Math.min(w, h) * 0.035;
    for (let j = 3; j >= 1; j--) {
      g.beginPath();
      g.ellipse(kx, ky, kr * j * 0.8, kr * j * 0.5, 0, 0, Math.PI * 2);
      g.strokeStyle = `rgba(30,14,4,${0.12 + (3 - j) * 0.1})`;
      g.lineWidth = 0.7;
      g.stroke();
    }
    g.fillStyle = rgb(shift(base, -48), 0.75);
    g.beginPath();
    g.ellipse(kx, ky, kr * 0.5, kr * 0.35, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Planker (lodrette eller vandrette) med individuel tone, årer, fuger, søm og slid. */
export function plankBoard(g: G, r: Rnd, x: number, y: number, w: number, h: number, base: RGB, count: number, o: { vertical?: boolean; nails?: boolean; wear?: number; gap?: number } = {}): void {
  const vertical = o.vertical ?? false;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  const span = vertical ? w : h;
  const t = span / count;
  for (let i = 0; i < count; i++) {
    const col = shift(base, (r() - 0.5) * 24);
    const px = vertical ? x + i * t : x;
    const py = vertical ? y : y + i * t;
    const pw = vertical ? t : w;
    const ph = vertical ? h : t;
    g.fillStyle = lin(g, px, py, vertical ? px + pw : px, vertical ? py : py + ph, [[0, rgb(shift(col, 14))], [0.55, rgb(col)], [1, rgb(shift(col, -16))]]);
    g.fillRect(px, py, pw + 0.4, ph + 0.4);
    g.save();
    g.beginPath();
    g.rect(px, py, pw, ph);
    g.clip();
    woodGrain(g, r, [px, py, px + pw, py + ph], col, { rot: vertical ? Math.PI / 2 : 0, lines: Math.max(3, Math.round(t / 2.4)), knots: r() < 0.3 ? 1 : 0 });
    // fase i fugen
    g.fillStyle = 'rgba(255,240,200,.16)';
    if (vertical) g.fillRect(px, py, Math.max(0.6, t * 0.05), ph);
    else g.fillRect(px, py, pw, Math.max(0.6, t * 0.05));
    g.restore();
    g.fillStyle = `rgba(10,4,0,${o.gap ?? 0.55})`;
    if (vertical) g.fillRect(px + pw - Math.max(0.6, t * 0.045), py, Math.max(0.9, t * 0.07), ph);
    else g.fillRect(px, py + ph - Math.max(0.6, t * 0.045), pw, Math.max(0.9, t * 0.07));
    if (o.nails) {
      for (const e of [0.08, 0.92]) {
        const nx = vertical ? px + pw / 2 : x + w * e;
        const ny = vertical ? y + h * e : py + ph / 2;
        g.fillStyle = 'rgba(10,4,0,.6)';
        g.beginPath();
        g.arc(nx + 0.4, ny + 0.5, Math.max(0.7, t * 0.09), 0, 7);
        g.fill();
        g.fillStyle = 'rgba(210,190,150,.8)';
        g.beginPath();
        g.arc(nx, ny, Math.max(0.5, t * 0.06), 0, 7);
        g.fill();
      }
    }
  }
  const wear = o.wear ?? 0;
  for (let i = 0; i < wear * 14; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '20,10,4' : '230,215,180'},${0.05 + r() * 0.08})`;
    g.beginPath();
    g.ellipse(x + r() * w, y + r() * h, 2 + r() * w * 0.05, 1 + r() * 3, r() * 3, 0, 7);
    g.fill();
  }
  g.restore();
}

/** Pletter af tilfældig tone (struktur på sten, jord, læder). Kaldes inden for en clip. */
export function mottle(g: G, r: Rnd, box: Box, base: RGB, n: number, size: number, spread = 36, a = 0.35): void {
  const [x0, y0, x1, y1] = box;
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    g.fillStyle = rgb(shift(base, (r() - 0.5) * spread * 2), a * (0.4 + r() * 0.6));
    g.beginPath();
    g.ellipse(x, y, size * (0.4 + r()), size * (0.3 + r() * 0.8), r() * 3.2, 0, 7);
    g.fill();
  }
}

/** Tynde, takkede revner med en lys kant. */
export function crack(g: G, r: Rnd, x: number, y: number, len: number, ang: number, lw = 1, branch = true): void {
  const pts: [number, number][] = [[x, y]];
  let cx = x;
  let cy = y;
  let a = ang;
  const steps = 4 + Math.floor(r() * 4);
  for (let i = 0; i < steps; i++) {
    a += (r() - 0.5) * 1.1;
    cx += Math.cos(a) * (len / steps);
    cy += Math.sin(a) * (len / steps);
    pts.push([cx, cy]);
  }
  for (const [pass, col, off] of [[0, 'rgba(255,245,220,.22)', 0.7], [1, 'rgba(12,6,2,.78)', 0]] as const) {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0] + off, p[1] + off) : g.moveTo(p[0] + off, p[1] + off)));
    g.strokeStyle = col;
    g.lineWidth = pass ? lw : lw * 0.8;
    g.lineJoin = 'round';
    g.stroke();
  }
  if (branch && pts.length > 3 && r() < 0.6) crack(g, r, pts[2]![0], pts[2]![1], len * 0.45, a + (r() - 0.5) * 2, lw * 0.7, false);
}

/** Mos og lav: små grønne klatter i flere nuancer. */
export function mossPatch(g: G, r: Rnd, cx: number, cy: number, rad: number, n: number, col: RGB = [88, 122, 44]): void {
  for (let i = 0; i < n; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * rad;
    const s = rad * (0.06 + r() * 0.12);
    g.fillStyle = rgb(shift(col, (r() - 0.5) * 50), 0.5 + r() * 0.4);
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, s * 0.8, r() * 3, 0, 7);
    g.fill();
  }
}

/** Metal: stribe af glans på en sti (kaldes inden for clip af stien). */
export function metalSheen(g: G, box: Box, a = 0.5, angle = Math.PI / 4): void {
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const L = Math.hypot(x1 - x0, y1 - y0) / 2;
  const dx = Math.cos(angle) * L;
  const dy = Math.sin(angle) * L;
  g.fillStyle = lin(g, cx - dx, cy - dy, cx + dx, cy + dy, [
    [0, 'rgba(255,255,255,0)'],
    [0.28, `rgba(255,255,255,${a})`],
    [0.34, 'rgba(255,255,255,0)'],
    [0.62, 'rgba(0,0,0,0)'],
    [0.8, `rgba(0,0,0,${a * 0.5})`],
    [1, 'rgba(0,0,0,0)'],
  ]);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
}

/** Rebstykke langs en sti af punkter (snoede tråde). */
export function rope(g: G, pts: [number, number][], thick: number, col: RGB = [176, 144, 88]): void {
  const trace = () => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  };
  g.lineJoin = 'round';
  g.lineCap = 'round';
  trace();
  g.strokeStyle = 'rgba(14,8,3,.75)';
  g.lineWidth = thick + 1.6;
  g.stroke();
  trace();
  g.strokeStyle = rgb(shift(col, -24));
  g.lineWidth = thick;
  g.stroke();
  g.lineCap = 'butt';
  trace();
  g.setLineDash([thick * 0.32, thick * 0.52]);
  g.strokeStyle = rgb(shift(col, 16));
  g.lineWidth = thick * 0.78;
  g.stroke();
  g.setLineDash([thick * 0.12, thick * 0.72]);
  g.strokeStyle = 'rgba(20,10,3,.4)';
  g.stroke();
  g.setLineDash([]);
  trace();
  g.strokeStyle = 'rgba(255,240,200,.22)';
  g.lineWidth = thick * 0.22;
  g.translate(-thick * 0.18, -thick * 0.18);
  g.stroke();
  g.translate(thick * 0.18, thick * 0.18);
  g.lineCap = 'round';
}

/** Nitte/søm med lille skygge og glans. */
export function rivet(g: G, x: number, y: number, s: number, col: RGB = [150, 140, 128]): void {
  g.fillStyle = 'rgba(8,4,0,.55)';
  g.beginPath();
  g.arc(x + s * 0.3, y + s * 0.35, s, 0, 7);
  g.fill();
  g.fillStyle = radial(g, x, y, s, [[0, rgb(shift(col, 60))], [1, rgb(shift(col, -30))]], x - s * 0.35, y - s * 0.35, 0.1);
  g.beginPath();
  g.arc(x, y, s, 0, 7);
  g.fill();
}

/** Græsstrå/blade rundt om en kant (kaldes uden clip). */
export function blade(g: G, x: number, y: number, ang: number, len: number, wid: number, col: RGB): void {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  g.beginPath();
  g.moveTo(x + nx * wid, y + ny * wid);
  g.quadraticCurveTo(x + dx * len * 0.55 + nx * wid * 0.8, y + dy * len * 0.55 + ny * wid * 0.8, x + dx * len, y + dy * len);
  g.quadraticCurveTo(x + dx * len * 0.5 - nx * wid * 0.6, y + dy * len * 0.5 - ny * wid * 0.6, x - nx * wid, y - ny * wid);
  g.closePath();
  g.fillStyle = rgb(col);
  g.fill();
}

/** Et blad (løvblad/palmeblad) med midterribbe. */
export function leaf(g: G, x: number, y: number, ang: number, len: number, wid: number, col: RGB, vein = true): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.45, -wid, len, 0);
  g.quadraticCurveTo(len * 0.45, wid, 0, 0);
  g.fillStyle = wid < 5 ? rgb(shift(col, 4)) : lin(g, 0, -wid, 0, wid, [[0, rgb(shift(col, 22))], [1, rgb(shift(col, -26))]]);
  g.fill();
  if (vein && wid >= 3) {
    g.beginPath();
    g.moveTo(len * 0.04, 0);
    g.lineTo(len * 0.96, 0);
    g.strokeStyle = rgb(shift(col, -44), 0.7);
    g.lineWidth = Math.max(0.4, wid * 0.08);
    g.stroke();
  }
  g.restore();
}

export const lerp = mix;
export { mix, rgb, shift };
export type { RGB };

/** Rør/stang langs en sti (rustning, rør, grene): kontur, grundfarve, lys øverst til venstre og skygge nederst til højre. */
export function tube(g: G, trace: () => void, width: number, col: RGB, o: { outline?: number; round?: boolean } = {}): void {
  g.lineJoin = 'round';
  g.lineCap = o.round === false ? 'butt' : 'round';
  trace();
  g.strokeStyle = OUT;
  g.lineWidth = width + (o.outline ?? 2.2);
  g.stroke();
  trace();
  g.strokeStyle = rgb(shift(col, -26));
  g.lineWidth = width;
  g.stroke();
  g.save();
  g.translate(width * 0.12, width * 0.14);
  trace();
  g.strokeStyle = rgb(shift(col, -44), 0.55);
  g.lineWidth = width * 0.42;
  g.stroke();
  g.restore();
  g.save();
  g.translate(-width * 0.16, -width * 0.16);
  trace();
  g.strokeStyle = rgb(shift(col, 12));
  g.lineWidth = width * 0.62;
  g.stroke();
  trace();
  g.strokeStyle = rgb(shift(col, 54), 0.8);
  g.lineWidth = width * 0.2;
  g.stroke();
  g.restore();
}
