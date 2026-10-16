import { rgb, shift, type RGB } from '../util';
import {
  body, clipped, crack, ellBody, ellipsePath, lin, mottle, mossPatch, OUT, polyBody, rectBody, rectPath, rivet, woodGrain, radial,
  type G, type Path, type Rnd,
} from '../pack2/helpers';

/** Fælles hjælp til pack10: skibsskrog, dæk, sten, brosten og små detaljer. Alt tegnes set straks oppefra, lys fra øverst til venstre. */
export type { G, Path, Rnd, RGB };
export { body, clipped, crack, ellBody, ellipsePath, lin, mottle, mossPatch, OUT, polyBody, rectBody, rectPath, rivet, woodGrain, radial, rgb, shift };

export const WOOD: RGB = [150, 108, 64];
export const WOOD_DARK: RGB = [102, 70, 42];
export const WOOD_PALE: RGB = [182, 144, 96];
export const IRON: RGB = [110, 112, 120];
export const BRONZE: RGB = [168, 124, 56];
export const CANVAS: RGB = [226, 212, 176];
export const STONE: RGB = [152, 148, 140];
export const STONE_DARK: RGB = [112, 108, 104];
export const MOSS: RGB = [84, 120, 46];

export const rf = (r: Rnd, a: number, b: number): number => a + r() * (b - a);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Enkel sti fra en liste af punkter (lukket). */
export function trace(g: G, pts: [number, number][], close = true): void {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  if (close) g.closePath();
}

/** Prik med mørk kant (hoved på søm, bolt, perle). */
export function dot(g: G, x: number, y: number, rad: number, col: RGB): void {
  g.fillStyle = 'rgba(10,5,0,.55)';
  g.beginPath();
  g.arc(x + rad * 0.25, y + rad * 0.3, rad, 0, 7);
  g.fill();
  g.fillStyle = rgb(col);
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.fill();
  g.fillStyle = 'rgba(255,248,225,.45)';
  g.beginPath();
  g.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.4, 0, 7);
  g.fill();
}

/** Blød skygge ("ambient occlusion") under en kant, så en flade virker løftet; kaldes inden for clip af fladen. */
export function innerShade(g: G, path: Path, w: number, a = 0.3): void {
  g.save();
  path();
  g.clip();
  g.translate(-w * 0.35, -w * 0.35);
  path();
  g.strokeStyle = `rgba(8,4,0,${a})`;
  g.lineWidth = w * 1.4;
  g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ skrog

/** Halvbredde (0..1) som funktion af t (0 = stævn øverst, 1 = hæk nederst). */
export type Profile = (t: number) => number;

export function profile(bow = 1, stern = 0.62, turn = 0.55): Profile {
  return (t) => {
    if (t < turn) return Math.pow(Math.sin((t / turn) * Math.PI * 0.5), bow);
    const u = (t - turn) / (1 - turn);
    return 1 - (1 - stern) * Math.pow(u, 2.2);
  };
}

/** Skrogets omrids som punktliste. `cx`, `cy` er midten. */
export function hullPoints(L: number, W: number, prof: Profile, cx = 0, cy = 0, n = 26): [number, number][] {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = cy - L / 2 + t * L;
    const hw = (W / 2) * prof(t);
    left.push([cx - hw, y]);
    right.push([cx + hw, y]);
  }
  return [...left, ...right.reverse().slice(1, -1)];
}

export function hullPath(g: G, L: number, W: number, prof: Profile, cx = 0, cy = 0, n = 26): Path {
  const pts = hullPoints(L, W, prof, cx, cy, n);
  return () => trace(g, pts);
}

/** Halvbredde i y (verdenskoordinat) for et skrog: bruges til at placere ting på dækket. */
export function halfWidthAt(L: number, W: number, prof: Profile, y: number, cy = 0): number {
  const t = clamp((y - (cy - L / 2)) / L, 0, 1);
  return (W / 2) * prof(t);
}

export interface ShipCfg {
  L: number;
  W: number;
  prof: Profile;
  hullCol: RGB;
  deckCol: RGB;
  /** Slid 0..1: pletter, mos, manglende planker. */
  wear?: number;
  /** Bredde af rælingen (andel af W). */
  rail?: number;
  /** Mørk vandlinje/bundmaling synlig yderst. */
  stripe?: RGB;
  /** Tom, mørk indre (robåd) i stedet for dæk. */
  open?: boolean;
}

/** Tegner skrog med klinkbyggede planker, ræling og dæk. Returnerer stierne til dækket, så der kan klippes og placeres. */
export function drawHull(g: G, r: Rnd, c: ShipCfg): { deck: Path; outer: Path; DL: number; DW: number; dcy: number } {
  const { L, W, prof } = c;
  const rail = c.rail ?? 0.075;
  const outer = hullPath(g, L, W, prof);
  const DW = W * (1 - rail * 2);
  const DL = L * (1 - rail * 1.9);
  const dcy = L * 0.004;
  const deck = hullPath(g, DL, DW, prof, 0, dcy);
  // ydre skrog
  body(g, outer, c.hullCol, [-W / 2, -L / 2, W / 2, L / 2], { lw: 2.4, ao: W * 0.025, rim: 1.6, light: 26, dark: 44 });
  clipped(g, outer, () => {
    // strakes (klinkbyggede planker) langs skroget
    const strakes = Math.max(3, Math.round(W / 9));
    for (let i = 1; i < strakes; i++) {
      const s = 1 - (i / strakes) * rail * 2.2 * 1.05;
      const pts = hullPoints(L * (1 - (1 - s) * 0.6), W * s, prof);
      trace(g, pts);
      g.strokeStyle = 'rgba(14,7,2,.4)';
      g.lineWidth = 0.9;
      g.stroke();
      g.translate(0.8, 0.8);
      trace(g, pts);
      g.strokeStyle = 'rgba(255,238,200,.12)';
      g.stroke();
      g.translate(-0.8, -0.8);
    }
    woodGrain(g, r, [-W / 2, -L / 2, W / 2, L / 2], c.hullCol, { rot: Math.PI / 2, lines: Math.round(L / 9), contrast: 0.9 });
  });
  // rælingens lyse overkant
  g.save();
  outer();
  g.clip();
  g.translate(1.1, 1.1);
  outer();
  g.strokeStyle = 'rgba(255,244,214,.26)';
  g.lineWidth = 1.7;
  g.stroke();
  g.restore();
  // dæk
  if (c.open) {
    deck();
    g.fillStyle = lin(g, -DW / 2, 0, DW / 2, 0, [[0, 'rgb(50,32,18)'], [0.35, 'rgb(104,72,44)'], [0.7, 'rgb(92,64,38)'], [1, 'rgb(40,26,14)']]);
    g.fill();
  } else {
    deckPlanks(g, r, deck, DL, DW, dcy, c.deckCol, c.wear ?? 0.2);
  }
  innerShade(g, deck, W * 0.05, 0.42);
  deck();
  g.strokeStyle = 'rgba(16,8,3,.85)';
  g.lineWidth = 1.5;
  g.stroke();
  return { deck, outer, DL, DW, dcy };
}

/** Dækplanker: lange planker langs skibet med forskudte stød, kalfatring, søm og slid. */
export function deckPlanks(g: G, r: Rnd, deck: Path, DL: number, DW: number, dcy: number, col: RGB, wear: number): void {
  g.save();
  deck();
  g.clip();
  const n = Math.max(6, Math.round(DW / 4.4));
  const pw = DW / n;
  for (let i = 0; i < n; i++) {
    const x = -DW / 2 + i * pw;
    const tone = shift(col, (r() - 0.5) * 22);
    // stykker af en planke
    let y = dcy - DL / 2 - r() * 30;
    while (y < dcy + DL / 2) {
      const len = 26 + r() * 40;
      const t2 = shift(tone, (r() - 0.5) * 14);
      g.fillStyle = lin(g, x, 0, x + pw, 0, [[0, rgb(shift(t2, 12))], [0.6, rgb(t2)], [1, rgb(shift(t2, -14))]]);
      g.fillRect(x, y, pw + 0.4, len + 0.4);
      g.fillStyle = 'rgba(12,6,2,.5)';
      g.fillRect(x, y + len - 0.5, pw, 1);
      // søm i enderne
      g.fillStyle = 'rgba(24,12,4,.55)';
      g.fillRect(x + pw * 0.3, y + 2.5, 1, 1);
      g.fillRect(x + pw * 0.6, y + len - 3.5, 1, 1);
      y += len;
    }
    g.fillStyle = 'rgba(12,6,2,.5)';
    g.fillRect(x + pw - 0.5, dcy - DL / 2, 1, DL);
    g.fillStyle = 'rgba(255,236,196,.1)';
    g.fillRect(x, dcy - DL / 2, 0.8, DL);
  }
  woodGrain(g, r, [-DW / 2, dcy - DL / 2, DW / 2, dcy + DL / 2], col, { rot: Math.PI / 2, lines: Math.round(DW / 2.2), contrast: 0.7 });
  // slid: lyse og mørke pletter, mos i hjørnerne
  for (let i = 0; i < wear * 40; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(18,9,3,${0.05 + r() * 0.1})` : `rgba(235,222,188,${0.05 + r() * 0.08})`;
    g.beginPath();
    g.ellipse(rf(r, -DW / 2, DW / 2), dcy + rf(r, -DL / 2, DL / 2), 2 + r() * 8, 1 + r() * 4, r() * 3, 0, 7);
    g.fill();
  }
  if (wear > 0.55) mossPatch(g, r, rf(r, -DW * 0.3, DW * 0.3), dcy + rf(r, -DL * 0.3, DL * 0.3), DW * 0.2, Math.round(wear * 22));
  g.restore();
}

// ------------------------------------------------------------------ skibsdele

/** Luge med trægitter set oppefra. */
export function hatch(g: G, r: Rnd, cx: number, cy: number, w: number, h: number, open = false, col: RGB = WOOD_DARK): void {
  const x = cx - w / 2;
  const y = cy - h / 2;
  // karm
  rectBody(g, x - 2, y - 2, w + 4, h + 4, 1.5, shift(col, 14), { lw: 1.5, ao: 1.4, rim: 1 });
  if (open) {
    rectBody(g, x, y, w, h, 1, [18, 12, 8], { lw: 1.1, ao: 2.4, rim: 0, light: 0, dark: 0 });
    g.fillStyle = 'rgba(120,90,56,.5)';
    g.fillRect(x + 1.5, y + h * 0.55, w - 3, 1.2);
    g.fillRect(x + 1.5, y + h * 0.82, w - 3, 1.2);
    return;
  }
  // gitter af planker
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = 'rgba(14,8,3,.9)';
  g.fillRect(x, y, w, h);
  const n = Math.max(3, Math.round(w / 3.4));
  for (let i = 0; i < n; i++) {
    g.fillStyle = rgb(shift(col, 8 + (r() - 0.5) * 20));
    g.fillRect(x + 0.6 + i * (w / n), y + 0.6, w / n - 1.2, h - 1.2);
  }
  const m = Math.max(2, Math.round(h / 5));
  for (let j = 0; j < m; j++) {
    g.fillStyle = rgb(shift(col, -12 + (r() - 0.5) * 10));
    g.fillRect(x + 0.4, y + 1 + j * (h / m), w - 0.8, h / m - 2);
    g.fillStyle = 'rgba(255,236,196,.14)';
    g.fillRect(x + 0.4, y + 1 + j * (h / m), w - 0.8, 0.8);
  }
  g.restore();
}

/** Tøndetop (set oppefra). */
export function barrelTop(g: G, r: Rnd, x: number, y: number, rad: number, col: RGB = [142, 98, 56]): void {
  g.fillStyle = 'rgba(8,4,0,.35)';
  g.beginPath();
  g.arc(x + rad * 0.12, y + rad * 0.18, rad, 0, 7);
  g.fill();
  ellBody(g, x, y, rad, rad, col, { lw: 1.4, ao: rad * 0.15, rim: 1 });
  g.save();
  g.beginPath();
  g.arc(x, y, rad * 0.86, 0, 7);
  g.clip();
  woodGrain(g, r, [x - rad, y - rad, x + rad, y + rad], col, { rot: r() * 3, lines: 6, contrast: 1 });
  g.restore();
  g.strokeStyle = 'rgba(30,18,8,.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, rad * 0.88, 0, 7);
  g.stroke();
  g.strokeStyle = 'rgba(70,72,78,.8)';
  g.lineWidth = Math.max(1, rad * 0.1);
  g.beginPath();
  g.arc(x, y, rad * 0.93, 0, 7);
  g.stroke();
  g.fillStyle = 'rgba(20,10,4,.55)';
  g.beginPath();
  g.arc(x + rad * 0.2, y - rad * 0.1, rad * 0.12, 0, 7);
  g.fill();
}

/** Kasse (set oppefra) med låg, bånd og lys kant. */
export function crateTop(g: G, r: Rnd, x: number, y: number, w: number, h: number, rot = 0, col: RGB = [156, 114, 68]): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.fillRect(-w / 2 + 1.5, -h / 2 + 2, w, h);
  rectBody(g, -w / 2, -h / 2, w, h, 1.4, col, { lw: 1.3, ao: 1.3, rim: 0.9 });
  clipped(g, rectPath(g, -w / 2, -h / 2, w, h, 1), () => {
    woodGrain(g, r, [-w / 2, -h / 2, w / 2, h / 2], col, { rot: r() < 0.5 ? 0 : Math.PI / 2, lines: 6, contrast: 1 });
    g.strokeStyle = 'rgba(28,14,6,.55)';
    g.lineWidth = 1.2;
    g.strokeRect(-w * 0.38, -h * 0.38, w * 0.76, h * 0.76);
    g.beginPath();
    g.moveTo(-w / 2, -h / 2);
    g.lineTo(w / 2, h / 2);
    g.moveTo(w / 2, -h / 2);
    g.lineTo(-w / 2, h / 2);
    g.strokeStyle = 'rgba(28,14,6,.35)';
    g.stroke();
  });
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) rivet(g, sx * w * 0.42, sy * h * 0.42, 0.9, [170, 160, 140]);
  g.restore();
}

/** Sæk (set oppefra) med bundet hals. */
export function sackTop(g: G, r: Rnd, x: number, y: number, rad: number, col: RGB = [204, 184, 140]): void {
  g.save();
  g.translate(x, y);
  g.rotate(r() * 6.28);
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.beginPath();
  g.ellipse(rad * 0.14, rad * 0.2, rad * 1.1, rad * 0.78, 0, 0, 7);
  g.fill();
  const c = shift(col, (r() - 0.5) * 24);
  g.beginPath();
  g.ellipse(0, 0, rad * 1.1, rad * 0.78, 0, 0, 7);
  g.fillStyle = radial(g, 0, 0, rad * 1.15, [[0, rgb(shift(c, 26))], [0.55, rgb(c)], [1, rgb(shift(c, -42))]], -rad * 0.4, -rad * 0.3, 1);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.2;
  g.stroke();
  // folder
  g.strokeStyle = 'rgba(60,40,18,.4)';
  g.lineWidth = 0.9;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(rad * (0.2 + i * 0.2), -rad * 0.3);
    g.quadraticCurveTo(rad * (0.4 + i * 0.1), 0, rad * (0.2 + i * 0.2), rad * 0.3);
    g.stroke();
  }
  // bundet hals
  g.fillStyle = rgb(shift(c, -20));
  g.beginPath();
  g.ellipse(rad * 0.95, 0, rad * 0.22, rad * 0.18, 0, 0, 7);
  g.fill();
  g.strokeStyle = 'rgba(80,50,24,.9)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(rad * 0.78, -rad * 0.2);
  g.lineTo(rad * 0.78, rad * 0.2);
  g.stroke();
  g.restore();
}

/** Tovsnoning (set oppefra) som spiral af tykke vindinger. */
export function coil(g: G, r: Rnd, x: number, y: number, rad: number, col: RGB = [176, 142, 88]): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.beginPath();
  g.arc(rad * 0.1, rad * 0.16, rad, 0, 7);
  g.fill();
  const turns = Math.max(3, Math.round(rad / 2.6));
  const th = rad / (turns + 0.4);
  for (let i = turns; i >= 0; i--) {
    const rr = th * (i + 0.9);
    g.beginPath();
    g.arc(0, 0, rr, 0, 7);
    g.strokeStyle = 'rgba(14,8,3,.8)';
    g.lineWidth = th * 0.95 + 1.2;
    g.stroke();
    g.strokeStyle = rgb(shift(col, -10 + (i % 2) * 14));
    g.lineWidth = th * 0.95;
    g.stroke();
    g.setLineDash([th * 0.35, th * 0.45]);
    g.strokeStyle = 'rgba(20,10,3,.35)';
    g.lineWidth = th * 0.7;
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.arc(-th * 0.15, -th * 0.15, rr, Math.PI * 0.9, Math.PI * 1.7);
    g.strokeStyle = 'rgba(255,240,205,.3)';
    g.lineWidth = th * 0.3;
    g.stroke();
  }
  g.fillStyle = 'rgba(10,5,2,.85)';
  g.beginPath();
  g.arc(0, 0, th * 0.5, 0, 7);
  g.fill();
  g.restore();
}

/** Mast set oppefra: rund træflade med bånd og taljeblok. */
export function mastTop(g: G, r: Rnd, x: number, y: number, rad: number): void {
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.beginPath();
  g.arc(x + rad * 0.15, y + rad * 0.2, rad * 1.35, 0, 7);
  g.fill();
  ellBody(g, x, y, rad * 1.35, rad * 1.35, [120, 82, 48], { lw: 1.5, ao: rad * 0.25 });
  ellBody(g, x, y, rad, rad, [162, 120, 74], { lw: 1.2, ao: rad * 0.2, rim: 1 });
  g.save();
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.clip();
  woodGrain(g, r, [x - rad, y - rad, x + rad, y + rad], [162, 120, 74], { rot: r() * 3, lines: 5, contrast: 1.1 });
  g.restore();
  g.strokeStyle = 'rgba(70,72,78,.75)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, rad * 1.18, 0, 7);
  g.stroke();
}

/** Rå tovlinje mellem to punkter (stag, fortøjning) med let slæk. */
export function line(g: G, x0: number, y0: number, x1: number, y1: number, th = 1.2, sag = 0, col: RGB = [150, 118, 72]): void {
  const mx = (x0 + x1) / 2 + sag;
  const my = (y0 + y1) / 2 + sag * 0.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0 + 0.7, y0 + 0.9);
  g.quadraticCurveTo(mx + 0.7, my + 0.9, x1 + 0.7, y1 + 0.9);
  g.strokeStyle = 'rgba(10,5,0,.4)';
  g.lineWidth = th + 0.4;
  g.stroke();
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo(mx, my, x1, y1);
  g.strokeStyle = rgb(shift(col, -6));
  g.lineWidth = th;
  g.stroke();
  g.strokeStyle = 'rgba(255,240,205,.22)';
  g.lineWidth = th * 0.35;
  g.stroke();
}

// ------------------------------------------------------------------ sejl

/** Firkantet råsejl set oppefra: halvmåneform (bugtet fremad), rå i bagkanten, syninger og refbånd. `set` = sat, ellers beslået (rullet). */
export function squareSail(g: G, r: Rnd, cx: number, cy: number, span: number, depth: number, col: RGB, set = true, stripes: RGB | null = null): void {
  const x0 = cx - span / 2;
  const x1 = cx + span / 2;
  if (!set) {
    // beslået sejl: rå med oprullet sejl
    g.fillStyle = 'rgba(8,4,0,.3)';
    g.fillRect(x0 + 1.5, cy - depth * 0.1 + 2, span, depth * 0.34);
    rectBody(g, x0, cy - depth * 0.14, span, depth * 0.3, depth * 0.14, shift(col, -14), { lw: 1.4, ao: 1.4, rim: 0.9 });
    g.strokeStyle = 'rgba(70,50,24,.45)';
    g.lineWidth = 1;
    for (let i = 1; i < 9; i++) {
      const x = lerp(x0, x1, i / 9);
      g.beginPath();
      g.moveTo(x, cy - depth * 0.1);
      g.quadraticCurveTo(x + 2, cy, x, cy + depth * 0.12);
      g.stroke();
    }
    g.fillStyle = 'rgba(90,60,30,.85)';
    for (const i of [0.18, 0.5, 0.82]) {
      g.fillRect(lerp(x0, x1, i) - 1, cy - depth * 0.15, 2, depth * 0.32);
    }
    yard(g, x0 - span * 0.04, x1 + span * 0.04, cy - depth * 0.16);
    return;
  }
  const outer = () => {
    g.beginPath();
    g.moveTo(x0, cy);
    g.quadraticCurveTo(cx, cy - depth * 2.1, x1, cy);
    g.quadraticCurveTo(cx, cy - depth * 0.55, x0, cy);
    g.closePath();
  };
  g.fillStyle = 'rgba(8,4,0,.28)';
  g.save();
  g.translate(3, 4);
  outer();
  g.fill();
  g.restore();
  outer();
  g.fillStyle = lin(g, x0, cy - depth, x1, cy + depth * 0.2, [[0, rgb(shift(col, 22))], [0.5, rgb(col)], [1, rgb(shift(col, -38))]]);
  g.fill();
  g.save();
  outer();
  g.clip();
  // lodrette bane-syninger, bugtede
  const n = Math.max(6, Math.round(span / 7));
  for (let i = 1; i < n; i++) {
    const x = lerp(x0, x1, i / n);
    g.beginPath();
    const k = 1 - Math.abs((i / n) * 2 - 1) * 0;
    g.moveTo(x, cy + 2);
    g.lineTo(x, cy - depth * 1.05 * k);
    g.strokeStyle = 'rgba(80,60,30,.28)';
    g.lineWidth = 0.8;
    g.stroke();
    g.beginPath();
    g.moveTo(x + 0.9, cy + 2);
    g.lineTo(x + 0.9, cy - depth * 1.05 * k);
    g.strokeStyle = 'rgba(255,248,225,.18)';
    g.stroke();
  }
  if (stripes) {
    for (let i = 0; i < n; i += 2) {
      g.fillStyle = rgb(stripes, 0.9);
      g.fillRect(lerp(x0, x1, i / n), cy - depth * 1.2, span / n, depth * 1.4);
    }
  }
  // bølger i sejlet: lette skyggefolder
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(x0, cy);
    g.quadraticCurveTo(cx, cy - depth * (0.8 + i * 0.28), x1, cy);
    g.strokeStyle = 'rgba(70,50,24,.15)';
    g.lineWidth = 1;
    g.stroke();
  }
  // pletter og lapper
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '120,90,50' : '250,244,224'},${0.08 + r() * 0.1})`;
    g.beginPath();
    g.ellipse(cx + rf(r, -span * 0.35, span * 0.35), cy - rf(r, 0, depth * 0.7), 3 + r() * 6, 2 + r() * 4, r() * 3, 0, 7);
    g.fill();
  }
  g.restore();
  outer();
  g.strokeStyle = 'rgba(52,36,18,.85)';
  g.lineWidth = 1.5;
  g.stroke();
  // rå forrest
  yard(g, x0 - span * 0.05, x1 + span * 0.05, cy);
  // refbånd-knuder
  g.fillStyle = 'rgba(60,40,18,.7)';
  for (let i = 1; i < 8; i++) g.fillRect(lerp(x0, x1, i / 8) - 0.5, cy - 4, 1, 4);
}

/** Rå (vandret stang) med tovender. */
export function yard(g: G, x0: number, x1: number, y: number): void {
  const t = () => {
    g.beginPath();
    g.moveTo(x0, y);
    g.lineTo(x1, y);
  };
  g.lineCap = 'round';
  t();
  g.strokeStyle = 'rgba(12,6,2,.85)';
  g.lineWidth = 5.4;
  g.stroke();
  t();
  g.strokeStyle = rgb([132, 92, 54]);
  g.lineWidth = 3.6;
  g.stroke();
  g.save();
  g.translate(-0.5, -0.8);
  t();
  g.strokeStyle = 'rgba(255,230,180,.45)';
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();
}

/** Langsgående sejl (gaffel/luger) set oppefra: smalt, bugtet bånd langs `ang` fra (x0,y0) til (x1,y1). */
export function longSail(g: G, r: Rnd, x0: number, y0: number, x1: number, y1: number, belly: number, col: RGB, boom = true): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const outer = () => {
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + nx * belly * 2, (y0 + y1) / 2 + ny * belly * 2, x1, y1);
    g.quadraticCurveTo((x0 + x1) / 2 + nx * belly * 0.4, (y0 + y1) / 2 + ny * belly * 0.4, x0, y0);
    g.closePath();
  };
  g.save();
  g.translate(2.5, 3);
  outer();
  g.fillStyle = 'rgba(8,4,0,.26)';
  g.fill();
  g.restore();
  outer();
  g.fillStyle = lin(g, x0, y0, x0 + nx * belly * 2, y0 + ny * belly * 2, [[0, rgb(shift(col, 20))], [1, rgb(shift(col, -34))]]);
  g.fill();
  g.save();
  outer();
  g.clip();
  const n = Math.max(4, Math.round(len / 9));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const px = lerp(x0, x1, t);
    const py = lerp(y0, y1, t);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + nx * belly * 2.4, py + ny * belly * 2.4);
    g.strokeStyle = 'rgba(80,60,30,.3)';
    g.lineWidth = 0.8;
    g.stroke();
  }
  g.restore();
  outer();
  g.strokeStyle = 'rgba(52,36,18,.85)';
  g.lineWidth = 1.4;
  g.stroke();
  if (boom) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.strokeStyle = 'rgba(12,6,2,.85)';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.stroke();
    g.strokeStyle = rgb([140, 98, 58]);
    g.lineWidth = 2.6;
    g.stroke();
    g.strokeStyle = 'rgba(255,230,180,.4)';
    g.lineWidth = 0.9;
    g.translate(-0.5, -0.6);
    g.stroke();
    g.translate(0.5, 0.6);
  }
}

// ------------------------------------------------------------------ sten

/** Mørtellinjer i uregelmæssige blokke; kaldes inden for clip. `size` = typisk blokhøjde. */
export function stoneCourses(g: G, r: Rnd, box: [number, number, number, number], base: RGB, size: number, o: { mortar?: string; mossy?: number; tone?: number } = {}): void {
  const [x0, y0, x1, y1] = box;
  const tone = o.tone ?? 16;
  let y = y0;
  let row = 0;
  while (y < y1) {
    const bh = size * (0.8 + r() * 0.5);
    let x = x0 - (row % 2 ? size * 0.9 : 0) - r() * size * 0.4;
    while (x < x1) {
      const bw = size * (1.2 + r() * 1.3);
      const c = shift(base, (r() - 0.5) * tone * 2);
      g.fillStyle = lin(g, x, y, x + bw, y + bh, [[0, rgb(shift(c, 12))], [1, rgb(shift(c, -14))]]);
      g.fillRect(x, y, bw, bh);
      g.fillStyle = 'rgba(255,248,230,.16)';
      g.fillRect(x, y, bw, 0.9);
      g.fillRect(x, y, 0.9, bh);
      g.fillStyle = o.mortar ?? 'rgba(20,16,12,.55)';
      g.fillRect(x + bw - 0.7, y, 1.3, bh);
      if (r() < 0.25) {
        g.fillStyle = `rgba(20,16,12,${0.06 + r() * 0.1})`;
        g.beginPath();
        g.ellipse(x + bw * r(), y + bh * r(), bw * 0.25, bh * 0.2, 0, 0, 7);
        g.fill();
      }
      x += bw;
    }
    g.fillStyle = o.mortar ?? 'rgba(20,16,12,.55)';
    g.fillRect(x0, y + bh - 0.7, x1 - x0, 1.3);
    y += bh;
    row++;
  }
  if (o.mossy) mossPatch(g, r, x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), Math.min(x1 - x0, y1 - y0) * 0.3, Math.round(o.mossy * 16), MOSS);
}

/** Stenfyldt sti med blokke, kontur og kantlys. */
export function stonePiece(g: G, r: Rnd, path: Path, box: [number, number, number, number], base: RGB, size: number, o: { mossy?: number; lw?: number; ao?: number } = {}): void {
  body(g, path, base, box, { lw: o.lw ?? 1.8, ao: o.ao ?? 3, rim: 1.4, light: 22, dark: 38 });
  clipped(g, path, () => {
    stoneCourses(g, r, box, base, size, { mossy: o.mossy });
    // let skygge i bunden højre, lys øverst venstre
    const [x0, y0, x1, y1] = box;
    g.fillStyle = lin(g, x0, y0, x1, y1, [[0, 'rgba(255,248,225,.14)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.3)']]);
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  });
  innerShade(g, path, 3, 0.22);
  path();
  g.strokeStyle = OUT;
  g.lineWidth = o.lw ?? 1.8;
  g.lineJoin = 'round';
  g.stroke();
}

/** Brosten i skæve rækker; kaldes inden for clip. */
export function cobbles(g: G, r: Rnd, box: [number, number, number, number], base: RGB, size: number): void {
  const [x0, y0, x1, y1] = box;
  g.fillStyle = 'rgb(46,40,34)';
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  let row = 0;
  for (let y = y0 - size; y < y1 + size; y += size * 0.86) {
    for (let x = x0 - size + (row % 2) * size * 0.5; x < x1 + size; x += size) {
      const c = shift(base, (r() - 0.5) * 36);
      const px = x + size * 0.5 + (r() - 0.5) * size * 0.18;
      const py = y + size * 0.5 + (r() - 0.5) * size * 0.18;
      const rx = size * (0.4 + r() * 0.06);
      const ry = size * (0.34 + r() * 0.06);
      g.beginPath();
      g.ellipse(px, py, rx, ry, (r() - 0.5) * 0.5, 0, 7);
      g.fillStyle = radial(g, px, py, rx * 1.1, [[0, rgb(shift(c, 22))], [0.7, rgb(c)], [1, rgb(shift(c, -26))]], px - rx * 0.35, py - ry * 0.4, 0.5);
      g.fill();
    }
    row++;
  }
}
