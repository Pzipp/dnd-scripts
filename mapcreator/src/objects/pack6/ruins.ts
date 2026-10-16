import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { base, contact, crack, drum, lerp, mixc, mossPatch, mottle, OUT, polyBody, polyPath, radial, lin, rf, rgb, rubble, shift, stoneBlock, stoneOf, stoneOptions, tufts, clamp, type G, type P, type RGB, type Rnd } from './common';

/** Ruiner: sammenstyrtede mure, brudte buer, søjler, ruingulve og statuer. Set straks oppefra (kun toppen ses; højden antydes af lys og kantskygge), lys øverst til venstre. */

const stoneP = (d: string): ParamDef => ({ key: 'stone', label: 'Sten', type: 'select', default: d, options: stoneOptions });
const decayP = (d: number): ParamDef => ({ key: 'decay', label: 'Forfald', type: 'range', min: 0, max: 1, step: 0.05, default: d });
const mossP = (d: number): ParamDef => ({ key: 'moss', label: 'Bevoksning', type: 'range', min: 0, max: 1, step: 0.05, default: d });

/** Fuger i lag og lodrette sømme på en flade (kaldes inden for en clip). */
function coursing(g: G, r: Rnd, x0: number, y0: number, x1: number, y1: number, rowH: number, a = 0.3): void {
  const rows = Math.max(1, Math.round((y1 - y0) / rowH));
  const rh = (y1 - y0) / rows;
  for (let k = 0; k < rows; k++) {
    const y = y0 + k * rh;
    if (k) {
      g.fillStyle = `rgba(14,8,4,${a})`;
      g.fillRect(x0, y, x1 - x0, 1);
      g.fillStyle = 'rgba(255,240,210,.14)';
      g.fillRect(x0, y + 1, x1 - x0, 0.8);
    }
    let x = x0 + (k % 2 ? rh * rf(r, 0.4, 1.2) : 0);
    while (x < x1) {
      g.fillStyle = `rgba(14,8,4,${a * 0.9})`;
      g.fillRect(x, y, 1, rh);
      x += rh * rf(r, 1.3, 2.5);
    }
  }
}

interface WallOpts {
  /** Højde (px) af hvert stykke langs muren; bruges kun til lys og skygge (set oppefra). */
  heights: number[];
  thick: number;
  moss: number;
  col: RGB;
}

/** Murstykke set oppefra: rektangel af sten med ujævne, brækkede ender, fuger og kantskygge mod nederst til højre. */
function wallStrip(g: G, r: Rnd, x0: number, y0: number, x1: number, y1: number, H: number, col: RGB, moss: number): void {
  const j = (): number => rf(r, -2.2, 2.2);
  const pts: P[] = [];
  const horiz = x1 - x0 >= y1 - y0;
  const steps = Math.max(2, Math.round((horiz ? x1 - x0 : y1 - y0) / 9));
  if (horiz) {
    pts.push([x0 + Math.abs(j()) * 2, y0 + j()], [x0 + j(), (y0 + y1) / 2 + j()], [x0 + Math.abs(j()) * 2, y1 + j()]);
    for (let i = 1; i < steps; i++) pts.push([lerp(x0, x1, i / steps), y1 + j() * 0.6]);
    pts.push([x1 - Math.abs(j()) * 2, y1 + j()], [x1 + j(), (y0 + y1) / 2 + j()], [x1 - Math.abs(j()) * 2, y0 + j()]);
    for (let i = steps - 1; i > 0; i--) pts.push([lerp(x0, x1, i / steps), y0 + j() * 0.6]);
  } else {
    pts.push([x0 + j(), y0 + Math.abs(j()) * 2], [(x0 + x1) / 2 + j(), y0 + j()], [x1 + j(), y0 + Math.abs(j()) * 2]);
    for (let i = 1; i < steps; i++) pts.push([x1 + j() * 0.6, lerp(y0, y1, i / steps)]);
    pts.push([x1 + j(), y1 - Math.abs(j()) * 2], [(x0 + x1) / 2 + j(), y1 + j()], [x0 + j(), y1 - Math.abs(j()) * 2]);
    for (let i = steps - 1; i > 0; i--) pts.push([x0 + j() * 0.6, lerp(y0, y1, i / steps)]);
  }
  // kantskygge (højdens antydning)
  const e = Math.max(1.5, H * 0.16);
  g.save();
  g.translate(e * 0.7, e);
  polyPath(g, pts)();
  g.fillStyle = 'rgba(10,5,2,.42)';
  g.fill();
  g.restore();
  polyBody(g, pts, shift(col, 6 + H * 0.25 + (r() - 0.5) * 12), { lw: 1.4, light: 30, dark: 30, ao: Math.max(1.4, Math.min(x1 - x0, y1 - y0) * 0.08) });
  g.save();
  polyPath(g, pts)();
  g.clip();
  const rowH = Math.max(6, Math.min(x1 - x0, y1 - y0) * 0.5);
  coursing(g, r, x0, y0, x1, y1, rowH, 0.26);
  mottle(g, r, [x0, y0, x1, y1], col, Math.round(((x1 - x0) * (y1 - y0)) / 160), 4, 20, 0.25);
  for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 700; i++) crack(g, r, rf(r, x0, x1), rf(r, y0, y1), rf(r, 5, 11), r() * 6.28, 0.8, false);
  g.restore();
  if (r() < moss) mossPatch(g, r, (x0 + x1) / 2 + rf(r, -8, 8), (y0 + y1) / 2, Math.min(x1 - x0, y1 - y0) * 0.5, 7);
}

/** Brudt mur set oppefra: stykker langs x med huller (murbrokker i hullerne). `yc` er midten. */
function brokenWall(g: G, r: Rnd, x0: number, x1: number, yc: number, o: WallOpts): void {
  const n = o.heights.length;
  const len = x1 - x0;
  for (let i = 0; i < n; i++) {
    const H = o.heights[i]!;
    const xa = x0 + (len * i) / n;
    const xb = x0 + (len * (i + 1)) / n - 1.5;
    if (H < 4) {
      rubble(g, r, (xa + xb) / 2, yc, (xb - xa) * 0.5, o.thick * 0.45, o.col, 4, o.thick * 0.2);
      continue;
    }
    wallStrip(g, r, xa, yc - o.thick / 2, xb, yc + o.thick / 2, H, o.col, o.moss);
  }
  rubble(g, r, (x0 + x1) / 2, yc + o.thick * 0.7, len * 0.4, o.thick * 0.3, o.col, Math.round(len / 18), o.thick * 0.13);
}

/** Murbrokker og græs omkring ruinen. */
function overgrowth(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, moss: number, col: RGB, rub: number): void {
  rubble(g, r, cx, cy, rx, ry, col, Math.round(rub), Math.min(rx, ry) * 0.12 + 2);
  tufts(g, r, cx, cy, rx, ry, Math.round(moss * 30));
}

function wallStraight(g: G, o: DrawInput, nSeg: number, corner: boolean): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const decay = param(o, 'decay', 0.5);
  const moss = param(o, 'moss', 0.5);
  const { w, h } = o;
  const thick = Math.min(h * (corner ? 0.2 : 0.62), corner ? 26 : 36);
  const maxH = 30;
  const heights: number[] = [];
  let hh = maxH * rf(r, 0.5, 1);
  for (let i = 0; i < nSeg; i++) {
    hh = clamp(hh + (r() - 0.55) * maxH * (0.5 + decay), 0, maxH);
    heights.push(r() < decay * 0.3 ? 0 : hh);
  }
  const yc = corner ? h * 0.36 : 0;
  overgrowth(g, r, 0, yc, w * 0.46, thick * 1.2, moss, col, w / 20);
  brokenWall(g, r, -w * 0.47, w * 0.47, yc, { heights, thick, moss, col });
  if (corner) {
    // den vinkelrette mur langs venstre side, set oppefra
    const vx = -w * 0.47 + thick / 2;
    let y = yc - thick / 2 - 2;
    const top = -h * 0.46;
    const segs = 4;
    for (let i = 0; i < segs; i++) {
      const ya = lerp(y, top, (i + 1) / segs);
      const yb = lerp(y, top, i / segs) - 1.5;
      if (r() < decay * 0.3 && i > 0) {
        rubble(g, r, vx, (ya + yb) / 2, thick * 0.9, Math.abs(yb - ya) * 0.4, col, 3, thick * 0.2);
        continue;
      }
      wallStrip(g, r, vx - thick / 2, ya, vx + thick / 2, yb, rf(r, 6, 26), col, moss);
    }
    y = top;
  }
}

/** Faldne søjletromler på række. */
function columnFallen(g: G, o: DrawInput, count: number, standing: number): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'white'));
  const { w, h } = o;
  const rad = Math.min(h * 0.3, w / (count * 2.4));
  const len = rad * 2.6;
  let x = -w * 0.46 + len / 2;
  const step = (w * 0.92 - len) / Math.max(1, count - 1);
  for (let i = 0; i < count; i++) {
    const cy = rf(r, -0.12, 0.12) * h;
    const a = rf(r, -0.18, 0.18);
    g.save();
    g.translate(x, cy);
    g.rotate(a);
    // liggende tromle: cylinder med akse langs x
    const rr = rad;
    const body = (): void => {
      g.beginPath();
      g.rect(-len / 2, -rr, len, rr * 2);
    };
    contact(g, 0, rr * 0.4, len * 0.55, rr * 0.5, 0.2);
    g.fillStyle = lin(g, 0, -rr, 0, rr, [[0, rgb(shift(col, 38))], [0.35, rgb(col)], [1, rgb(shift(col, -56))]]);
    body();
    g.fill();
    g.save();
    body();
    g.clip();
    for (let k = 0; k < 7; k++) {
      const yy = -rr + (k / 6) * rr * 2;
      g.fillStyle = 'rgba(20,12,6,.14)';
      g.fillRect(-len / 2, yy, len, 0.9);
    }
    mottle(g, r, [-len / 2, -rr, len / 2, rr], col, 6, rr * 0.3, 18, 0.25);
    if (r() < 0.6) crack(g, r, rf(r, -len / 3, len / 3), -rr, rr * 1.4, Math.PI / 2, 0.8, false);
    g.restore();
    body();
    g.strokeStyle = OUT;
    g.lineWidth = 1.3;
    g.stroke();
    // endeflade (ellipse) til højre, brudt venstre ende
    g.beginPath();
    g.ellipse(len / 2, 0, rr * 0.32, rr, 0, 0, Math.PI * 2);
    g.fillStyle = rgb(shift(col, 6));
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(-len / 2, -rr);
    for (let k = 1; k < 6; k++) g.lineTo(-len / 2 + (k % 2 ? 4 : -2), -rr + (k / 5) * rr * 2);
    g.strokeStyle = 'rgba(10,6,4,.7)';
    g.stroke();
    g.restore();
    x += step;
  }
  void standing;
}

/** Søjlestumper set oppefra: runde tromler med fuger og riller på en firkantet sokkel; brudt kant, mos og sten omkring. Højden ses kun som lys. */
function columnStump(g: G, o: DrawInput, heights: number[]): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'white'));
  const moss = param(o, 'moss', 0.3);
  const { w, h } = o;
  const n = heights.length;
  const rad = Math.min((w / n) * 0.27, h * 0.3);
  for (let i = 0; i < n; i++) {
    const cx = n === 1 ? 0 : lerp(-w / 2 + rad * 1.6, w / 2 - rad * 1.6, i / (n - 1));
    const cy = n === 1 ? 0 : (i % 2 ? h * 0.08 : -h * 0.08);
    const sq = rad * 1.32;
    // sokkel (firkantet) med kantskygge
    g.fillStyle = 'rgba(10,5,2,.4)';
    g.fillRect(cx - sq + 2, cy - sq + 3, sq * 2, sq * 2);
    polyBody(g, [[cx - sq, cy - sq], [cx + sq, cy - sq], [cx + sq, cy + sq], [cx - sq, cy + sq]], shift(col, -6), { lw: 1.4, light: 26, dark: 28, ao: 2 });
    // tromlen med brudt kant (højere = lysere)
    const pts: P[] = [];
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * 6.283;
      const f = heights[i]! > 0.6 ? 1 : 0.9 + r() * 0.1 - (Math.cos(a - 0.8) > 0.4 ? r() * 0.18 : 0);
      pts.push([cx + Math.cos(a) * rad * f, cy + Math.sin(a) * rad * f]);
    }
    polyBody(g, pts, shift(col, 8 + heights[i]! * 22), { lw: 1.5, light: 30, dark: 30, ao: rad * 0.12 });
    g.save();
    polyPath(g, pts)();
    g.clip();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * 6.283;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * rad * 0.7, cy + Math.sin(a) * rad * 0.7);
      g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      g.strokeStyle = 'rgba(20,12,6,.28)';
      g.lineWidth = 1;
      g.stroke();
    }
    g.beginPath();
    g.arc(cx, cy, rad * 0.7, 0, 7);
    g.strokeStyle = 'rgba(20,12,6,.22)';
    g.stroke();
    mottle(g, r, [cx - rad, cy - rad, cx + rad, cy + rad], col, 6, rad * 0.25, 16, 0.3);
    crack(g, r, cx - rad * 0.3, cy - rad * 0.3, rad * 0.9, r() * 6, 0.9, false);
    g.restore();
    if (r() < moss + 0.2) mossPatch(g, r, cx, cy, rad * 0.8, 6);
    rubble(g, r, cx + rad * rf(r, -0.3, 1.1), cy + rad * 1.35, rad * 1.4, rad * 0.25, col, 4, rad * 0.2);
  }
  tufts(g, r, 0, 0, w * 0.45, h * 0.45, Math.round(moss * 14));
}

/** Brudt buegang set oppefra: to piller og spændet imellem som en stenplade med fuger på tværs; højre halvdel er faldet ned. */
function brokenArch(g: G, o: DrawInput, side: 'left' | 'both'): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const moss = param(o, 'moss', 0.4);
  const { w, h } = o;
  const pw = h * 0.6;
  const px = w * 0.5 - pw * 0.55;
  const span = (x0: number, x1: number, jag: boolean): void => {
    const thick = pw * 0.62;
    const pts: P[] = [[x0, -thick / 2], [x1, -thick / 2 + (jag ? rf(r, -2, 3) : 0)], [x1 + (jag ? rf(r, -6, 0) : 0), 0], [x1, thick / 2], [x0, thick / 2]];
    g.save();
    g.translate(2, 3);
    polyPath(g, pts)();
    g.fillStyle = 'rgba(10,5,2,.4)';
    g.fill();
    g.restore();
    polyBody(g, pts, shift(col, 16), { lw: 1.5, light: 30, dark: 24, ao: 2 });
    g.save();
    polyPath(g, pts)();
    g.clip();
    // kileblokkenes fuger på tværs
    const m = Math.max(3, Math.round((x1 - x0) / (pw * 0.5)));
    for (let k = 1; k < m; k++) {
      const x = lerp(x0, x1, k / m);
      g.fillStyle = 'rgba(14,8,4,.4)';
      g.fillRect(x, -thick / 2, 1.3, thick);
      g.fillStyle = 'rgba(255,240,210,.2)';
      g.fillRect(x + 1.3, -thick / 2, 0.8, thick);
    }
    g.fillStyle = 'rgba(14,8,4,.2)';
    g.fillRect(x0, -1, x1 - x0, 1.4);
    mottle(g, r, [x0, -thick / 2, x1, thick / 2], col, 10, 5, 18, 0.25);
    g.restore();
  };
  const pier = (cx: number, broken: boolean): void => {
    g.fillStyle = 'rgba(10,5,2,.4)';
    g.fillRect(cx - pw / 2 + 2, -pw / 2 + 3, pw, pw);
    const pts: P[] = [[cx - pw / 2, -pw / 2], [cx + pw / 2, -pw / 2], [cx + pw / 2, pw / 2], [cx - pw / 2, pw / 2]];
    if (broken) pts[1] = [cx + pw / 2 - rf(r, 3, 9), -pw / 2 + rf(r, 0, 6)];
    polyBody(g, pts, shift(col, 6), { lw: 1.6, light: 30, dark: 30, ao: 3 });
    g.save();
    polyPath(g, pts)();
    g.clip();
    coursing(g, r, cx - pw / 2, -pw / 2, cx + pw / 2, pw / 2, pw * 0.34, 0.26);
    mottle(g, r, [cx - pw / 2, -pw / 2, cx + pw / 2, pw / 2], col, 8, 5, 20, 0.25);
    g.restore();
    if (r() < moss) mossPatch(g, r, cx, 0, pw * 0.35, 6);
  };
  span(-px + pw * 0.2, side === 'both' ? px - pw * 0.2 : -px + (px * 2 - pw * 0.4) * 0.46, side !== 'both');
  pier(-px, false);
  pier(px, side !== 'both');
  if (side !== 'both') {
    for (let i = 0; i < 4; i++) stoneBlock(g, r, rf(r, -px * 0.1, px * 0.8), rf(r, -pw * 0.5, pw * 0.5), pw * 0.4, pw * 0.3, shift(col, 8), { a: rf(r, -1, 1), moss: 0.4 });
    rubble(g, r, px * 0.35, 0, px * 0.5, pw * 0.45, col, 8, pw * 0.07);
  } else {
    stoneBlock(g, r, 0, pw * 0.7, pw * 0.4, pw * 0.3, shift(col, 8), { a: 0.5, moss: 0.3 });
  }
  tufts(g, r, 0, 0, w * 0.4, h * 0.4, Math.round(moss * 12));
}

/** Døråbning set oppefra: to karmsten, tærskel og overliggeren, der enten ligger over eller er faldet ned. */
function doorway(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const { w, h } = o;
  const pw = w * 0.2;
  const ph = h * 0.42;
  const gap = w * 0.38;
  // tærskel og trin
  for (let k = 0; k < 3; k++) {
    polyBody(g, [[-gap / 2 - pw * 0.2, h * 0.1 + k * h * 0.11], [gap / 2 + pw * 0.2, h * 0.1 + k * h * 0.11], [gap / 2 + pw * 0.2, h * 0.19 + k * h * 0.11], [-gap / 2 - pw * 0.2, h * 0.19 + k * h * 0.11]], shift(col, -8 + k * 6), { lw: 1.3, light: 22, dark: 20 });
  }
  g.fillStyle = 'rgba(16,10,6,.35)';
  g.fillRect(-gap / 2, -ph * 0.5, gap, ph + h * 0.1);
  for (const sx of [-1, 1]) {
    const cx = sx * (gap / 2 + pw / 2);
    g.fillStyle = 'rgba(10,5,2,.4)';
    g.fillRect(cx - pw / 2 + 2, -ph / 2 + 3, pw, ph);
    polyBody(g, [[cx - pw / 2, -ph / 2], [cx + pw / 2, -ph / 2], [cx + pw / 2, ph / 2], [cx - pw / 2, ph / 2]], shift(col, 4), { lw: 1.6, light: 30, dark: 30, ao: 2.4 });
    g.save();
    g.beginPath();
    g.rect(cx - pw / 2, -ph / 2, pw, ph);
    g.clip();
    coursing(g, r, cx - pw / 2, -ph / 2, cx + pw / 2, ph / 2, pw * 0.5, 0.26);
    g.restore();
  }
  // overligger: en tyk plade, brækket og skråt, over venstre karm og delvis over åbningen
  g.save();
  g.translate(-gap * 0.3, -ph * 0.06);
  g.rotate(rf(r, -0.12, 0.12));
  const lw = gap + pw * 2.2;
  g.fillStyle = 'rgba(10,5,2,.42)';
  g.fillRect(-lw * 0.5 + 2, -ph * 0.17 + 3, lw * 0.72, ph * 0.34);
  polyBody(g, [[-lw * 0.5, -ph * 0.17], [lw * 0.22, -ph * 0.17], [lw * 0.26, -ph * 0.02], [lw * 0.18, ph * 0.17], [-lw * 0.5, ph * 0.17]], shift(col, 20), { lw: 1.6, light: 30, dark: 26, ao: 2.4 });
  crack(g, r, -lw * 0.1, -ph * 0.17, ph * 0.34, Math.PI / 2, 1, false);
  mossPatch(g, r, -lw * 0.3, 0, ph * 0.12, 6);
  g.restore();
  rubble(g, r, gap * 0.4, h * 0.38, w * 0.2, h * 0.07, col, 6, 3);
  tufts(g, r, 0, h * 0.3, w * 0.4, h * 0.1, 12);
}

/** Ruingulv: store fliser med revner, forskudte og med græs i fugerne. */
function floor(g: G, o: DrawInput, round: boolean): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const decay = param(o, 'decay', 0.5);
  const { w, h } = o;
  const path = (): void => {
    g.beginPath();
    if (round) g.ellipse(0, 0, w * 0.48, h * 0.48, 0, 0, Math.PI * 2);
    else {
      const pts: P[] = [];
      const n = 20;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const x = t < 0.25 ? lerp(-0.48, 0.48, t * 4) : t < 0.5 ? 0.48 : t < 0.75 ? lerp(0.48, -0.48, (t - 0.5) * 4) : -0.48;
        const y = t < 0.25 ? -0.48 : t < 0.5 ? lerp(-0.48, 0.48, (t - 0.25) * 4) : t < 0.75 ? 0.48 : lerp(0.48, -0.48, (t - 0.75) * 4);
        pts.push([x * w + (r() - 0.5) * decay * w * 0.06, y * h + (r() - 0.5) * decay * h * 0.06]);
      }
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
    }
  };
  path();
  g.fillStyle = rgb(shift(col, -40));
  g.fill();
  g.save();
  path();
  g.clip();
  const T = Math.min(w, h) / 4.2;
  for (let y = -h / 2; y < h / 2; y += T) {
    for (let x = -w / 2; x < w / 2; x += T) {
      if (r() < decay * 0.22) continue;
      const jx = (r() - 0.5) * 2;
      const jy = (r() - 0.5) * 2;
      const c = shift(col, (r() - 0.5) * 30);
      polyBody(g, [[x + 1 + jx, y + 1 + jy], [x + T - 1 + jx, y + 1 + jy], [x + T - 1 + jx, y + T - 1 + jy], [x + 1 + jx, y + T - 1 + jy]], c, { lw: 0.9, light: 18, dark: 20, ao: 1.4, rim: 0.8 });
      if (r() < decay * 0.8) crack(g, r, x + T * rf(r, 0.2, 0.8), y + T * rf(r, 0.2, 0.8), T * rf(r, 0.4, 0.9), r() * 6.28, 0.8, true);
      if (r() < 0.25) mottle(g, r, [x, y, x + T, y + T], c, 2, T * 0.2, 14, 0.25);
    }
  }
  if (round) {
    g.beginPath();
    g.arc(0, 0, Math.min(w, h) * 0.2, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(30,18,10,.4)';
    g.lineWidth = 2;
    g.stroke();
  }
  for (let i = 0; i < 4; i++) mossPatch(g, r, rf(r, -w / 2, w / 2), rf(r, -h / 2, h / 2), Math.min(w, h) * 0.12, 8);
  tufts(g, r, 0, 0, w * 0.45, h * 0.45, Math.round(14 + decay * 24));
  g.restore();
  path();
  g.strokeStyle = 'rgba(14,8,4,.7)';
  g.lineWidth = 1.6;
  g.stroke();
}

/** Væltet statue: liggende figur (hoved, skuldre, torso, ben) brækket over ved knæet, med våben eller vinger og en væltet sokkel. */
function statueFallen(g: G, o: DrawInput, kindOf: 'warrior' | 'angel'): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const { w, h } = o;
  const hh = h * 0.5;
  const part = (pts: P[], tone = 0): void => polyBody(g, pts, shift(col, tone + (r() - 0.5) * 8), { lw: 1.3, light: 28, dark: 30, ao: 1.4 });
  contact(g, 0, 0, w * 0.46, h * 0.38, 0.18);
  g.save();
  g.rotate(rf(r, -0.1, 0.1));
  const sx = w * 0.2; // ben starter her (hofter)
  // sokkel (væltet bagved benene)
  part([[w * 0.1, -hh * 0.9], [w * 0.46, -hh * 0.8], [w * 0.44, -hh * 0.3], [w * 0.12, -hh * 0.38]], -14);
  // vinger/våben bag kroppen
  if (kindOf === 'angel') {
    for (const sg of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const bx = -w * 0.14 + t * w * 0.1;
        const by = sg * hh * 0.22;
        const tip: P = [bx + w * 0.06 + t * w * 0.04, by + sg * hh * (0.95 - t * 0.25)];
        part([[bx, by], [bx + w * 0.07, by + sg * hh * 0.08], tip, [bx - w * 0.02, by + sg * hh * (0.8 - t * 0.2)]], 6 + t * 8);
      }
    }
  }
  // ben (to), brækket ved knæet: nedre del drejet lidt og forskudt
  part([[sx, -hh * 0.3], [sx + w * 0.16, -hh * 0.26], [sx + w * 0.17, -hh * 0.02], [sx, -hh * 0.02]], -4);
  part([[sx, hh * 0.04], [sx + w * 0.16, hh * 0.02], [sx + w * 0.17, hh * 0.28], [sx, hh * 0.3]], -6);
  g.save();
  g.translate(w * 0.38, hh * 0.05);
  g.rotate(0.22);
  part([[0, -hh * 0.3], [w * 0.1, -hh * 0.26], [w * 0.1, -hh * 0.02], [0, -hh * 0.04]], -10);
  part([[0, hh * 0.02], [w * 0.1, hh * 0.04], [w * 0.11, hh * 0.28], [0, hh * 0.26]], -10);
  g.restore();
  crack(g, r, sx + w * 0.17, -hh * 0.3, hh * 0.6, Math.PI / 2, 1, false);
  // torso og skuldre
  part([[-w * 0.2, -hh * 0.46], [sx + w * 0.02, -hh * 0.3], [sx + w * 0.02, hh * 0.3], [-w * 0.2, hh * 0.46]], 4);
  part([[-w * 0.3, -hh * 0.52], [-w * 0.16, -hh * 0.56], [-w * 0.12, hh * 0.56], [-w * 0.3, hh * 0.5]], 10);
  // arme
  if (kindOf === 'warrior') {
    part([[-w * 0.2, hh * 0.46], [w * 0.16, hh * 0.5], [w * 0.16, hh * 0.64], [-w * 0.2, hh * 0.6]], -2);
    // sværd langs kroppen
    g.beginPath();
    g.moveTo(-w * 0.08, hh * 0.8);
    g.lineTo(w * 0.42, hh * 0.72);
    g.strokeStyle = 'rgba(14,8,4,.7)';
    g.lineWidth = 5.4;
    g.stroke();
    g.strokeStyle = rgb(shift(col, 26));
    g.lineWidth = 3.4;
    g.stroke();
    g.beginPath();
    g.moveTo(-w * 0.1, hh * 0.68);
    g.lineTo(-w * 0.1, hh * 0.92);
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    g.stroke();
  } else {
    part([[-w * 0.2, hh * 0.46], [w * 0.1, hh * 0.3], [w * 0.14, hh * 0.4], [-w * 0.18, hh * 0.6]], -2);
  }
  // hoved
  const hx = -w * 0.4;
  g.beginPath();
  g.ellipse(hx, 0, w * 0.085, hh * 0.46, 0, 0, Math.PI * 2);
  g.fillStyle = radial(g, hx, 0, w * 0.1, [[0, rgb(shift(col, 44))], [1, rgb(shift(col, -30))]], hx - w * 0.03, -hh * 0.2, 1);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.stroke();
  // næse og pande antydet
  g.beginPath();
  g.moveTo(hx - w * 0.03, -hh * 0.08);
  g.quadraticCurveTo(hx - w * 0.06, 0, hx - w * 0.03, hh * 0.08);
  g.strokeStyle = 'rgba(14,8,4,.4)';
  g.lineWidth = 1;
  g.stroke();
  g.restore();
  mossPatch(g, r, w * 0.05, 0, w * 0.2, 9);
  rubble(g, r, w * 0.3, hh * 0.9, w * 0.2, h * 0.07, col, 5, 3);
}

/** Brudt trappe: tre-fire trin, de nederste revet af, med sten ved foden. */
function stairsBroken(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const { w, h } = o;
  const n = 6;
  const sh = h / (n + 1);
  const x0 = -w * 0.42;
  const x1 = w * 0.42;
  for (let i = 0; i < n; i++) {
    const y = -h * 0.46 + i * sh;
    const cut = i > 3 ? r() * w * 0.35 : 0;
    const side = r() < 0.5 ? -1 : 1;
    const xa = x0 + (side < 0 ? cut : 0);
    const xb = x1 - (side > 0 ? cut : 0);
    if (i === n - 1 && r() < 0.6) continue;
    const c = shift(col, 24 - i * 7);
    polyBody(g, [[xa, y], [xb, y], [xb, y + sh * 0.92], [xa, y + sh * 0.92]], c, { lw: 1.2, light: 20, dark: 16, ao: 1 });
    g.save();
    g.beginPath();
    g.rect(xa, y, xb - xa, sh);
    g.clip();
    mottle(g, r, [xa, y, xb, y + sh], c, 4, sh * 0.35, 18, 0.3);
    if (r() < 0.5) crack(g, r, rf(r, xa, xb), y, sh, Math.PI / 2, 0.8, false);
    g.restore();
  }
  rubble(g, r, 0, h * 0.4, w * 0.4, h * 0.08, col, 9, w * 0.04);
  mossPatch(g, r, rf(r, -w * 0.3, w * 0.3), -h * 0.1, w * 0.2, 8);
  tufts(g, r, 0, h * 0.2, w * 0.4, h * 0.2, 14);
}

/** Murfundament: omridset af mure på jorden, mest sten i fire sider, med dørhul. */
function foundation(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const decay = param(o, 'decay', 0.5);
  const moss = param(o, 'moss', 0.5);
  const { w, h } = o;
  const t = Math.min(w, h) * 0.09;
  const gx = rf(r, -0.25, 0.25) * w;
  g.fillStyle = 'rgba(70,52,34,.32)';
  g.fillRect(-w * 0.45, -h * 0.45, w * 0.9, h * 0.9);
  // fire sider som rækker af blokke
  const run = (ax: number, ay: number, bx: number, by: number, door: number): void => {
    const L = Math.hypot(bx - ax, by - ay);
    const n = Math.round(L / (t * 1.5));
    const a = Math.atan2(by - ay, bx - ax);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      if (door >= 0 && Math.abs(u - door) < 0.09) continue;
      if (r() < decay * 0.4) continue;
      stoneBlock(g, r, lerp(ax, bx, u), lerp(ay, by, u), (L / n) * 0.94, t * rf(r, 0.85, 1.1), shift(col, (r() - 0.5) * 18), { a, d: t * 0.25, moss: moss * 0.6 });
    }
  };
  const hx = w * 0.43;
  const hy = h * 0.42;
  run(-hx, -hy, hx, -hy, -1);
  run(hx, -hy, hx, hy, -1);
  run(hx, hy, -hx, hy, 0.5 + gx / w);
  run(-hx, hy, -hx, -hy, -1);
  // indre skillevæg
  run(-hx * 0.1, -hy, -hx * 0.1, hy * 0.2, -1);
  rubble(g, r, 0, 0, w * 0.35, h * 0.3, col, 14, t * 0.4);
  tufts(g, r, 0, 0, w * 0.4, h * 0.4, Math.round(10 + moss * 28));
}

/** Ruinhob: sammenstyrtet mur som stor bunke med stående stykke. */
function ruinHeap(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const moss = param(o, 'moss', 0.5);
  const { w, h } = o;
  g.fillStyle = 'rgba(40,30,20,.2)';
  g.beginPath();
  g.ellipse(0, h * 0.05, w * 0.48, h * 0.44, 0, 0, 6.3);
  g.fill();
  rubble(g, r, 0, h * 0.12, w * 0.42, h * 0.3, col, 38, w * 0.05);
  // et stående stykke mur midt i
  const sx = rf(r, -0.12, 0.12) * w;
  brokenWall(g, r, sx - w * 0.2, sx + w * 0.2, -h * 0.05, { heights: [h * 0.26, h * 0.34, h * 0.2], thick: h * 0.15, moss, col });
  for (let i = 0; i < 12; i++) stoneBlock(g, r, rf(r, -w * 0.4, w * 0.4), rf(r, h * 0.1, h * 0.38), w * rf(r, 0.05, 0.09), w * rf(r, 0.04, 0.06), col, { a: r() * 3, d: 2, moss: 0.5 });
  tufts(g, r, 0, h * 0.2, w * 0.4, h * 0.2, Math.round(10 + moss * 20));
}

const R = ['outdoor', 'ruin'];
const common = { ...base, keepAspect: false as const, shadow: 12 };

export const ruinKinds: ObjectKind[] = [
  kind({ key: 'ruins_wall_short', family: 'ruins', name: 'Ruinmur, kort', w: 4, h: 1.6, ...common, params: [stoneP('grey'), decayP(0.5), mossP(0.5)], tags: [...R, 'city'], draw: (g, o) => wallStraight(g, o, 4, false) }),
  kind({ key: 'ruins_wall_long', family: 'ruins', name: 'Ruinmur, lang', w: 8, h: 1.8, ...common, params: [stoneP('mossy'), decayP(0.6), mossP(0.6)], tags: [...R, 'city', 'forest'], draw: (g, o) => wallStraight(g, o, 8, false) }),
  kind({ key: 'ruins_wall_corner', family: 'ruins', name: 'Ruinhjørne', w: 4, h: 3.4, ...common, params: [stoneP('grey'), decayP(0.5), mossP(0.5)], tags: [...R, 'city'], draw: (g, o) => wallStraight(g, o, 5, true) }),
  kind({ key: 'ruins_wall_sandstone', family: 'ruins', name: 'Ruinmur, sandsten', w: 5, h: 1.8, ...common, params: [stoneP('sand'), decayP(0.7), mossP(0.15)], tags: [...R, 'desert'], draw: (g, o) => wallStraight(g, o, 5, false) }),
  kind({ key: 'ruins_arch_broken', family: 'ruins', name: 'Brudt buegang', w: 5, h: 1.8, ...common, params: [stoneP('grey'), mossP(0.4)], tags: [...R, 'temple'], draw: (g, o) => brokenArch(g, o, 'left') }),
  kind({ key: 'ruins_arch_standing', family: 'ruins', name: 'Ruinbue, næsten hel', w: 5, h: 1.8, ...common, params: [stoneP('white'), mossP(0.3)], tags: [...R, 'temple'], draw: (g, o) => brokenArch(g, o, 'both') }),
  kind({ key: 'ruins_doorway', family: 'ruins', name: 'Stående døråbning', w: 3, h: 2.6, ...common, params: [stoneP('grey')], tags: [...R, 'house'], draw: (g, o) => doorway(g, o) }),
  kind({ key: 'ruins_column_stump', family: 'ruins', name: 'Søjlestump', w: 1.4, h: 1.4, ...common, sizeJitter: 0.1, params: [stoneP('white'), mossP(0.3)], tags: [...R, 'temple'], draw: (g, o) => columnStump(g, o, [0.42]) }),
  kind({ key: 'ruins_column_pair', family: 'ruins', name: 'To brudte søjler', w: 3, h: 1.8, ...common, params: [stoneP('white'), mossP(0.3)], tags: [...R, 'temple'], draw: (g, o) => columnStump(g, o, [0.9, 0.45]) }),
  kind({ key: 'ruins_column_row', family: 'ruins', name: 'Søjlerække (brudt)', w: 6, h: 1.8, ...common, params: [stoneP('white'), mossP(0.3)], tags: [...R, 'temple'], draw: (g, o) => columnStump(g, o, [1, 0.5, 0.85, 0.3]) }),
  kind({ key: 'ruins_column_fallen', family: 'ruins', name: 'Væltet søjle', w: 4, h: 1.2, ...common, params: [stoneP('white')], tags: [...R, 'temple'], draw: (g, o) => columnFallen(g, o, 3, 0) }),
  kind({ key: 'ruins_column_drums', family: 'ruins', name: 'Søjletromler', w: 2.4, h: 1.2, ...common, params: [stoneP('white')], tags: [...R, 'temple'], draw: (g, o) => columnFallen(g, o, 2, 0) }),
  kind({ key: 'ruins_floor', family: 'ruins', name: 'Ruingulv, flisebelagt', w: 4, h: 4, ...common, shadow: 0, params: [stoneP('grey'), decayP(0.5)], tags: [...R, 'dungeon'], draw: (g, o) => floor(g, o, false) }),
  kind({ key: 'ruins_floor_round', family: 'ruins', name: 'Ruingulv, rundt', w: 4, h: 4, ...common, shadow: 0, params: [stoneP('sand'), decayP(0.5)], tags: [...R, 'temple'], draw: (g, o) => floor(g, o, true) }),
  kind({ key: 'ruins_statue_warrior', family: 'ruins', name: 'Væltet krigerstatue', w: 3.4, h: 1.8, ...common, randomRotation: true, params: [stoneP('grey')], tags: [...R, 'battlefield'], draw: (g, o) => statueFallen(g, o, 'warrior') }),
  kind({ key: 'ruins_statue_angel', family: 'ruins', name: 'Væltet engelstatue', w: 3.4, h: 2.4, ...common, randomRotation: true, params: [stoneP('white')], tags: [...R, 'graveyard'], draw: (g, o) => statueFallen(g, o, 'angel') }),
  kind({ key: 'ruins_stairs_broken', family: 'ruins', name: 'Brudt trappe', w: 2.6, h: 3.4, ...common, params: [stoneP('grey')], tags: [...R, 'temple'], draw: (g, o) => stairsBroken(g, o) }),
  kind({ key: 'ruins_foundation', family: 'ruins', name: 'Murfundament', w: 6, h: 5, ...common, shadow: 4, params: [stoneP('grey'), decayP(0.6), mossP(0.5)], tags: [...R, 'village'], draw: (g, o) => foundation(g, o) }),
  kind({ key: 'ruins_heap', family: 'ruins', name: 'Sammenstyrtet mur (bunke)', w: 5, h: 3.6, ...common, params: [stoneP('grey'), mossP(0.5)], tags: [...R, 'battlefield'], draw: (g, o) => ruinHeap(g, o) }),
];
void mixc;
void clamp;
