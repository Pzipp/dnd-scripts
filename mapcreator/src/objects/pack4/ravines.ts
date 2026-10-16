import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rgb, type RGB } from '../util';
import { shift, wobble } from '../pack2/helpers';
import { clamp, lerp, makeNoise, mixc, pebble, rf, rng, type G } from './common';
import { PAL } from './peaks';

/** Kløfter, afgrundskanter, sænkehuller og kratere: mørk dybde, lyse klippekanter og små sten på kanten. */

type P = [number, number];
type Rnd = () => number;

interface Style {
  /** Bundens farver fra kanten og ind. */
  deep: RGB;
  mid: RGB;
  /** Væggens farve (den oplyste side). */
  wall: RGB;
  /** Kanten (klippeløbet) lys og mørk. */
  rimHi: RGB;
  rimLo: RGB;
  glow: boolean;
}

function styleOf(name: string, tone: string): Style {
  const pal = PAL[tone] ?? PAL.grey!;
  if (name === 'lava') {
    return { deep: [18, 6, 4], mid: [210, 70, 14], wall: [96, 40, 28], rimHi: [118, 84, 64], rimLo: [38, 26, 24], glow: true };
  }
  if (name === 'ice') {
    return { deep: [6, 26, 56], mid: [44, 120, 176], wall: [150, 200, 232], rimHi: [244, 250, 255], rimLo: [140, 170, 208], glow: false };
  }
  return { deep: [8, 7, 10], mid: [64, 58, 62], wall: mixc(pal.mid, pal.lo, 0.35), rimHi: mixc(pal.hi, pal.mid, 0.2), rimLo: pal.lo, glow: false };
}

const styleP = (d: string): ParamDef => ({ key: 'style', label: 'Slags', type: 'select', default: d, options: [{ value: 'stone', label: 'Sten' }, { value: 'lava', label: 'Lava' }, { value: 'ice', label: 'Is' }] });
const toneP = (d: string): ParamDef => ({
  key: 'tone', label: 'Sten', type: 'select', default: d,
  options: [['grey', 'Grå'], ['brown', 'Brun'], ['red', 'Rød'], ['dark', 'Mørk'], ['sand', 'Sand']].map(([value, label]) => ({ value: value!, label: label! })),
});

/** Sti gennem punkterne (lukket polygon). */
const poly = (g: G, pts: P[]): void => {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
};

/** Er punktet inde i polygonen? (stråle-test) */
function inside(shape: P[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i]!;
    const b = shape[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

interface Fissure {
  up: P[];
  lo: P[];
}

/** Bugtet spalte langs x: midterlinje med bølger, bredde der smalner mod enderne, ujævne kanter. */
function fissure(r: Rnd, w: number, h: number, wind: number, width: number, n = 46): Fissure {
  const nz = makeNoise(Math.floor(r() * 1e6));
  const ph1 = r() * 6.28;
  const ph2 = r() * 6.28;
  const f1 = rf(r, 1.2, 2.2);
  const f2 = rf(r, 3, 5);
  const up: P[] = [];
  const lo: P[] = [];
  const amp = h * 0.5 * wind;
  const maxHalf = h * 0.5 * width;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (t - 0.5) * w * 0.98;
    const cy = amp * (Math.sin(t * f1 * Math.PI + ph1) * 0.7 + Math.sin(t * f2 * Math.PI + ph2) * 0.3) * (0.4 + Math.sin(t * Math.PI) * 0.6);
    const taper = Math.pow(Math.sin(Math.PI * clamp(t, 0.015, 0.985)), 0.55);
    const wd = maxHalf * taper * (0.62 + 0.55 * nz(t * 7, 3));
    up.push([x + (r() - 0.5) * 3, cy - wd * (0.85 + r() * 0.3)]);
    lo.push([x + (r() - 0.5) * 3, cy + wd * (0.85 + r() * 0.3)]);
  }
  return { up, lo };
}

const shapeOf = (f: Fissure): P[] => [...f.up, ...[...f.lo].reverse()];

/** Maler selve kløften i den givne form (stien lukket polygon). `thick` er kantens bredde. */
function paintChasm(g: G, r: Rnd, shape: P[], st: Style, bounds: [number, number, number, number], thick: number, lowEdge: P[] | null): void {
  const [x0, y0, x1, y1] = bounds;
  const path = (): void => poly(g, shape);
  g.lineJoin = 'round';
  // udenfor: lys kant (klippeløb) bredere mod øverst til venstre via forskydning
  if (st.glow) {
    path();
    g.strokeStyle = 'rgba(255,110,30,.22)';
    g.lineWidth = thick * 4;
    g.stroke();
  }
  path();
  g.strokeStyle = 'rgba(14,8,6,.7)';
  g.lineWidth = thick * 2 + 3;
  g.stroke();
  const rg = g.createLinearGradient(x0, y0, x1, y1);
  rg.addColorStop(0, rgb(st.rimHi));
  rg.addColorStop(1, rgb(mixc(st.rimLo, st.rimHi, 0.25)));
  path();
  g.strokeStyle = rg;
  g.lineWidth = thick * 2;
  g.stroke();
  // lys kant
  g.save();
  g.translate(-0.8, -1);
  path();
  g.strokeStyle = 'rgba(255,250,236,.28)';
  g.lineWidth = Math.max(1, thick * 0.35);
  g.stroke();
  g.restore();
  // dybden
  path();
  const dg = g.createLinearGradient(0, y0, 0, y1);
  dg.addColorStop(0, rgb(st.deep));
  dg.addColorStop(0.5, rgb(mixc(st.deep, st.mid, st.glow ? 0.75 : 0.3)));
  dg.addColorStop(1, rgb(mixc(st.deep, st.mid, st.glow ? 0.4 : 0.15)));
  g.fillStyle = dg;
  g.fill();
  g.save();
  path();
  g.clip();
  if (st.glow) {
    // lavaens glød og skorper
    for (let i = 0; i < 26; i++) {
      const x = lerp(x0, x1, r());
      const y = lerp(y0, y1, r());
      const rad = thick * rf(r, 1.2, 2.8);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(255,226,110,.55)');
      grd.addColorStop(1, 'rgba(255,110,24,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 34; i++) {
      g.fillStyle = `rgba(30,10,6,${0.45 + r() * 0.35})`;
      g.beginPath();
      g.ellipse(lerp(x0, x1, r()), lerp(y0, y1, r()), thick * rf(r, 0.5, 1.6), thick * rf(r, 0.3, 0.8), r() * 3, 0, 7);
      g.fill();
    }
  } else if (lowEdge) {
    // den oplyste sydvæg: bånd af klippe med lag, der forsvinder i mørket
    const wallH = thick * 3.6;
    g.beginPath();
    lowEdge.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    for (let i = lowEdge.length - 1; i >= 0; i--) g.lineTo(lowEdge[i]![0] + (r() - 0.5) * 1.5, lowEdge[i]![1] - wallH * (0.6 + 0.6 * Math.sin(i * 0.8 + 1)));
    g.closePath();
    const wg = g.createLinearGradient(0, y1 - wallH * 2, 0, y1);
    wg.addColorStop(0, rgb(mixc(st.wall, st.deep, 0.85), 0));
    wg.addColorStop(0.45, rgb(mixc(st.wall, st.deep, 0.35), 0.8));
    wg.addColorStop(1, rgb(shift(st.wall, 22), 1));
    g.fillStyle = wg;
    g.fill();
    for (let i = 0; i < lowEdge.length - 1; i += 1) {
      const p = lowEdge[i]!;
      g.beginPath();
      g.moveTo(p[0], p[1] - 1);
      g.lineTo(p[0] + (r() - 0.5) * 3, p[1] - wallH * rf(r, 0.4, 1.1));
      g.strokeStyle = `rgba(10,6,6,${0.25 + r() * 0.3})`;
      g.lineWidth = 0.8 + r() * 1.2;
      g.stroke();
    }
  }
  if (st.mid[2] > 100 && !st.glow) {
    // isens blå dybde og lyse skær
    for (let i = 0; i < 14; i++) {
      const x = lerp(x0, x1, r());
      const y = lerp(y0, y1, r());
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + thick * rf(r, 1, 3), y + (r() - 0.5) * thick);
      g.strokeStyle = `rgba(190,230,255,${0.2 + r() * 0.3})`;
      g.lineWidth = 1;
      g.stroke();
    }
  }
  // skygge fra den øverste kant (nordvæg i skygge)
  path();
  g.strokeStyle = 'rgba(0,0,0,.5)';
  g.lineWidth = thick * 1.8;
  g.translate(thick * 0.5, thick * 0.9);
  g.stroke();
  g.restore();
  path();
  g.strokeStyle = 'rgba(8,4,4,.9)';
  g.lineWidth = 1.5;
  g.stroke();
}

/** Sten, sprækker og grus langs kanten. */
function rimDetail(g: G, r: Rnd, shape: P[], st: Style, tone: string, density: number, size: number): void {
  const pal = PAL[tone] ?? PAL.grey!;
  const base: RGB = st.glow ? [88, 66, 56] : st.rimHi[2] > 200 ? [226, 238, 250] : pal.mid;
  const n = Math.round(shape.length * density);
  for (let i = 0; i < n; i++) {
    const ix = Math.floor(r() * shape.length);
    const p = shape[ix]!;
    const q = shape[(ix + 1) % shape.length]!;
    // udad fra kanten (centroiden er ikke kendt: brug normalen af linjestykket)
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    const side = r() < 0.5 ? 1 : -1;
    const off = size * rf(r, 1.3, 3.6);
    const x = p[0] + (-dy / len) * off * side;
    const y = p[1] + (dx / len) * off * side;
    const s = size * rf(r, 0.35, 1);
    if (inside(shape, x, y)) continue;
    pebble(g, r, x, y, s, shift(base, (r() - 0.5) * 34));
  }
  // sprækker ud fra kanten
  for (let i = 0; i < Math.round(shape.length * density * 0.5); i++) {
    const ix = Math.floor(r() * shape.length);
    const p = shape[ix]!;
    const q = shape[(ix + 1) % shape.length]!;
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    const side = r() < 0.5 ? 1 : -1;
    g.beginPath();
    g.moveTo(p[0] + (-dy / len) * size * 1.2 * side, p[1] + (dx / len) * size * 1.2 * side);
    g.lineTo(p[0] + (-dy / len) * size * rf(r, 3, 6) * side + (r() - 0.5) * size * 2, p[1] + (dx / len) * size * rf(r, 3, 6) * side);
    g.strokeStyle = 'rgba(14,8,6,.5)';
    g.lineWidth = 0.9;
    g.stroke();
  }
}

function ravine(g: G, o: DrawInput, wind: number, width: number, branch: boolean, defStyle: string): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const st = styleOf(param(o, 'style', defStyle), param(o, 'tone', 'grey'));
  const tone = param(o, 'tone', 'grey');
  const thick = Math.max(3, Math.min(w, h) * 0.07);
  const f = fissure(r, w, h, wind, width);
  const shapes: Fissure[] = [f];
  if (branch) {
    // sidegren: en kortere spalte, der drejes ind fra hovedløbet
    const bw = w * 0.5;
    const b = fissure(r, bw, h * 0.7, 0.4, 0.45, 26);
    const at = f.up[Math.floor(f.up.length * rf(r, 0.35, 0.6))]!;
    // grenen drejer væk fra den kant, hovedløbet ligger nærmest, så der er plads i boksen
    const ang = rf(r, 0.5, 0.9) * (at[1] > 0 ? -1 : 1);
    const rot = (p: P): P => [at[0] + (p[0] + bw / 2) * Math.cos(ang) - p[1] * Math.sin(ang), at[1] + (p[0] + bw / 2) * Math.sin(ang) + p[1] * Math.cos(ang)];
    const up = b.up.map(rot);
    const lo = b.lo.map(rot);
    // skalér grenen ind mod forgreningspunktet, til hele grenen (med kantens bredde) ligger i boksen
    const mx = w / 2 - thick * 2.6;
    const my = h / 2 - thick * 2.6;
    let k = 1;
    for (const p of [...up, ...lo]) {
      const dx = p[0] - at[0];
      const dy = p[1] - at[1];
      if (dx > 0 && p[0] > mx) k = Math.min(k, (mx - at[0]) / dx);
      if (dx < 0 && p[0] < -mx) k = Math.min(k, (-mx - at[0]) / dx);
      if (dy > 0 && p[1] > my) k = Math.min(k, (my - at[1]) / dy);
      if (dy < 0 && p[1] < -my) k = Math.min(k, (-my - at[1]) / dy);
    }
    k = clamp(k, 0.3, 1);
    const sc = (p: P): P => [at[0] + (p[0] - at[0]) * k, at[1] + (p[1] - at[1]) * k];
    shapes.push({ up: up.map(sc), lo: lo.map(sc) });
  }
  // brede kanter tegnes først (under), så sammenstød mellem grene hænger sammen
  const all = shapes.map(shapeOf);
  const bounds: [number, number, number, number] = [-w / 2, -h / 2, w / 2, h / 2];
  for (let i = 0; i < all.length; i++) {
    g.save();
    paintChasm(g, r, all[i]!, st, bounds, thick, shapes[i]!.lo);
    g.restore();
  }
  for (const s of all) rimDetail(g, r, s, st, tone, 0.9, Math.max(2.5, thick * 0.75));
}

/** Afgrundskant: kantstykke med jagede klipper foroven og dyb afgrund nedenunder. */
function abyssEdge(g: G, o: DrawInput, defStyle: string): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const st = styleOf(param(o, 'style', defStyle), param(o, 'tone', 'grey'));
  const tone = param(o, 'tone', 'grey');
  const thick = Math.max(3, h * 0.07);
  const n = 40;
  const edge: P[] = [];
  const nz = makeNoise(Math.floor(r() * 1e6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    edge.push([(t - 0.5) * w, -h * 0.1 + (nz(t * 6, 1) - 0.5) * h * 0.4 + (r() - 0.5) * 4]);
  }
  const shape: P[] = [...edge, [w / 2 + thick, h / 2 + thick], [-w / 2 - thick, h / 2 + thick]];
  // clip til boksen (kanterne i siderne ligger uden for)
  g.save();
  g.beginPath();
  g.rect(-w / 2, -h / 2, w, h);
  g.clip();
  paintChasm(g, r, shape, st, [-w / 2, -h / 2, w / 2, h / 2], thick, null);
  // oplyst væg lige under kanten
  g.beginPath();
  edge.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 0) : g.moveTo(p[0], p[1])));
  for (let i = n; i >= 0; i--) g.lineTo(edge[i]![0], edge[i]![1] + h * (0.12 + 0.1 * nz(i * 0.4, 9)));
  g.closePath();
  const wg = g.createLinearGradient(0, -h * 0.4, 0, h * 0.3);
  wg.addColorStop(0, rgb(st.wall, 0.95));
  wg.addColorStop(1, rgb(mixc(st.wall, st.deep, 0.9), 0));
  g.fillStyle = wg;
  g.fill();
  for (let i = 0; i < 40; i++) {
    const p = edge[Math.floor(r() * n)]!;
    g.beginPath();
    g.moveTo(p[0], p[1] + 2);
    g.lineTo(p[0] + (r() - 0.5) * 4, p[1] + h * rf(r, 0.05, 0.22));
    g.strokeStyle = `rgba(10,6,6,${0.25 + r() * 0.3})`;
    g.lineWidth = 0.8 + r();
    g.stroke();
  }
  g.restore();
  g.save();
  g.beginPath();
  g.rect(-w / 2, -h / 2, w, h * 0.7);
  g.clip();
  rimDetail(g, r, edge, st, tone, 0.8, Math.max(2, thick * 0.6));
  g.restore();
}

/** Rundt hul: sænkehul (jordkant og mørk tragt), krater (ophøjet rand) eller pit. */
function hole(g: G, o: DrawInput, mode: 'sink' | 'crater', defStyle: string): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const st = styleOf(param(o, 'style', defStyle), param(o, 'tone', mode === 'sink' ? 'brown' : 'grey'));
  const tone = param(o, 'tone', mode === 'sink' ? 'brown' : 'grey');
  const R = Math.min(w, h) / 2;
  const thick = Math.max(3, R * 0.12);
  const rim = mode === 'crater' ? 0.78 : 0.82;
  const shape: P[] = wobble(r, 0, 0, R * rim, R * rim * rf(r, 0.85, 0.98), 36, 0.07, r() * 6);
  if (mode === 'crater') {
    // ophøjet rand: ring af opkastet sten med lys mod øverst til venstre
    const outer = wobble(r, 0, 0, R * 0.99, R * 0.95, 36, 0.05, r() * 6);
    g.save();
    poly(g, outer);
    const rg = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
    rg.addColorStop(0, rgb(mixc(st.rimHi, [255, 248, 230], 0.1)));
    rg.addColorStop(1, rgb(mixc(st.rimLo, st.rimHi, 0.35)));
    g.fillStyle = rg;
    g.fill();
    g.strokeStyle = 'rgba(14,8,6,.8)';
    g.lineWidth = 1.8;
    g.stroke();
    g.clip();
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28;
      const d = rf(r, 0.78, 1) * R;
      const s = R * rf(r, 0.03, 0.07);
      pebble(g, r, Math.cos(a) * d, Math.sin(a) * d, s, mixc(st.rimHi, st.rimLo, r()));
    }
    g.restore();
  }
  paintChasm(g, r, shape, st, [-R, -R, R, R], thick * 0.8, mode === 'sink' ? shape.filter((p) => p[1] > R * 0.1).sort((a, b) => a[0] - b[0]) : null);
  if (mode === 'sink') rimDetail(g, r, shape, st, tone, 0.8, Math.max(2, R * 0.07));
}

const base = { keepAspect: false as const, bleed: 0.04, layers: ['objects' as const, 'effects' as const] };

export const ravineKinds: ObjectKind[] = [
  kind({ key: 'ravine_straight', family: 'ravine', name: 'Kløft, lige', w: 8, h: 1.6, shadow: 0, ...base, params: [styleP('stone'), toneP('grey')], tags: ['mountain', 'outdoor', 'cave'], draw: (g, o) => ravine(g, o, 0.15, 0.7, false, 'stone') }),
  kind({ key: 'ravine_long', family: 'ravine', name: 'Lang kløft', w: 14, h: 2, shadow: 0, ...base, params: [styleP('stone'), toneP('grey')], tags: ['mountain', 'outdoor', 'cave'], draw: (g, o) => ravine(g, o, 0.3, 0.7, false, 'stone') }),
  kind({ key: 'ravine_winding', family: 'ravine', name: 'Bugtet kløft', w: 10, h: 3.4, shadow: 0, ...base, params: [styleP('stone'), toneP('brown')], tags: ['mountain', 'outdoor', 'cave'], draw: (g, o) => ravine(g, o, 0.85, 0.5, false, 'stone') }),
  kind({ key: 'ravine_fork', family: 'ravine', name: 'Forgrenet kløft', w: 10, h: 5, shadow: 0, ...base, params: [styleP('stone'), toneP('grey')], tags: ['mountain', 'outdoor', 'cave'], draw: (g, o) => ravine(g, o, 0.5, 0.42, true, 'stone') }),
  kind({ key: 'ravine_crack', family: 'ravine', name: 'Sprække i jorden', w: 3.6, h: 1, shadow: 0, ...base, sizeJitter: 0.25, params: [styleP('stone'), toneP('brown')], tags: ['mountain', 'outdoor', 'desert', 'dungeon'], draw: (g, o) => ravine(g, o, 0.3, 0.55, false, 'stone') }),
  kind({ key: 'ravine_lava', family: 'ravine', name: 'Lavasprække', w: 8, h: 2.4, shadow: 0, ...base, params: [styleP('lava'), toneP('dark')], tags: ['mountain', 'outdoor', 'cave', 'magic'], draw: (g, o) => ravine(g, o, 0.6, 0.55, false, 'lava') }),
  kind({ key: 'ravine_ice', family: 'ravine', name: 'Isspalte', w: 8, h: 2.2, shadow: 0, ...base, params: [styleP('ice'), toneP('grey')], tags: ['arctic', 'mountain', 'outdoor'], draw: (g, o) => ravine(g, o, 0.55, 0.55, false, 'ice') }),
  kind({ key: 'abyss_edge', family: 'ravine', name: 'Afgrundskant', w: 6, h: 3.2, shadow: 0, ...base, params: [styleP('stone'), toneP('grey')], tags: ['mountain', 'outdoor', 'cave'], draw: (g, o) => abyssEdge(g, o, 'stone') }),
  kind({ key: 'sinkhole', family: 'ravine', name: 'Sænkehul', w: 3, h: 3, shadow: 0, ...base, keepAspect: true, randomRotation: false, sizeJitter: 0.2, params: [styleP('stone'), toneP('brown')], tags: ['grassland', 'outdoor', 'cave', 'ruin'], draw: (g, o) => hole(g, o, 'sink', 'stone') }),
  kind({ key: 'crater', family: 'ravine', name: 'Krater', w: 4, h: 4, shadow: 0, ...base, keepAspect: true, sizeJitter: 0.2, params: [styleP('stone'), toneP('grey')], tags: ['outdoor', 'battlefield', 'magic', 'desert'], draw: (g, o) => hole(g, o, 'crater', 'stone') }),
  kind({ key: 'crater_lava', family: 'ravine', name: 'Lavakrater', w: 3, h: 3, shadow: 0, ...base, keepAspect: true, sizeJitter: 0.2, params: [styleP('lava'), toneP('dark')], tags: ['mountain', 'outdoor', 'magic'], draw: (g, o) => hole(g, o, 'crater', 'lava') }),
  kind({ key: 'ice_hole', family: 'ravine', name: 'Isbrud', w: 2.6, h: 2.6, shadow: 0, ...base, keepAspect: true, sizeJitter: 0.2, params: [styleP('ice'), toneP('grey')], tags: ['arctic', 'outdoor', 'water'], draw: (g, o) => hole(g, o, 'sink', 'ice') }),
];
