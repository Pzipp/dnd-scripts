import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { blob, rng } from '../util';
import { blobBody, blobPath, clipped, ellBody, lin, mottle, mossPatch, OUT, polyBody, polyPath, radial, rectBody, rgb, rivet, shift, tube, type G, type Path, type RGB, type Rnd } from '../pack2/helpers';

/** Mystik og ukendte ting (pakke 5): fremmede obelisker, runesten, tentakler, levende væv, æg, inaktive portaler og flydende sten. */

export const GLOWS: { label: string; col: RGB }[] = [
  { label: 'Cyan', col: [90, 230, 240] },
  { label: 'Violet', col: [180, 110, 255] },
  { label: 'Grøn', col: [120, 255, 140] },
  { label: 'Rav', col: [255, 190, 80] },
  { label: 'Blodrød', col: [255, 80, 80] },
];
export const glowParam: ParamDef = { key: 'glow', label: 'Glød', type: 'select', default: '0', options: GLOWS.map((c, i) => ({ value: String(i), label: c.label })) };
export const glowOf = (o: DrawInput, def = 0): RGB => GLOWS[Math.min(GLOWS.length - 1, Math.max(0, parseInt(param(o, 'glow', String(def)), 10) || 0))]!.col;

export function glowDot(g: G, x: number, y: number, rad: number, col: RGB, a: number): void {
  g.fillStyle = radial(g, x, y, rad, [[0, rgb(shift(col, 40), a)], [0.35, rgb(col, a * 0.55)], [1, rgb(col, 0)]]);
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.fill();
}

/** Lysende streg (først blød glød, så skarp kerne). */
export function glowLine(g: G, trace: () => void, col: RGB, w: number, a = 1): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  trace();
  g.strokeStyle = rgb(col, 0.22 * a);
  g.lineWidth = w * 4.5;
  g.stroke();
  trace();
  g.strokeStyle = rgb(col, 0.5 * a);
  g.lineWidth = w * 2.2;
  g.stroke();
  trace();
  g.strokeStyle = rgb(shift(col, 110), 0.95 * a);
  g.lineWidth = w;
  g.stroke();
  g.lineCap = 'butt';
}

/** Rune-lignende tegn: korte streger i tilfældige retninger. */
export function runeMarks(g: G, r: Rnd, cx: number, cy: number, s: number): () => void {
  return () => {
    g.beginPath();
    const n = 2 + ((r() * 3) | 0);
    let x = cx - s * 0.4;
    let y = cy - s * 0.5;
    g.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      x = cx + (r() - 0.5) * s;
      y = cy + (r() - 0.5) * s;
      g.lineTo(x, y);
    }
    if (r() < 0.5) { g.moveTo(cx - s * 0.4, cy); g.lineTo(cx + s * 0.4, cy + (r() - 0.5) * s * 0.4); }
  };
}

const STONEDARK: RGB = [64, 62, 72];

// ------------------------------------------------------------------ obelisker og sten

function pyramidTop(g: G, cx: number, cy: number, half: number, base: RGB, apex = 0): void {
  const ax = cx - apex;
  const ay = cy - apex;
  const C: [number, number][] = [[cx - half, cy - half], [cx + half, cy - half], [cx + half, cy + half], [cx - half, cy + half]];
  const lits = [34, -10, -26, 18];
  for (let i = 0; i < 4; i++) {
    const a = C[i]!;
    const b = C[(i + 1) % 4]!;
    polyBody(g, [a, b, [ax, ay]], shift(base, lits[i]!), { lw: 1.6, ao: 0, rim: 0 });
  }
}

const obeliskBlack = kind({
  key: 'myst_obelisk_alien', family: 'mystery', name: 'Fremmed obelisk', w: 1.8, h: 1.8, shadow: 22, randomRotation: true, bleed: 0.06,
  tags: ['magic', 'ruin', 'dungeon', 'temple'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 0);
    const half = Math.min(o.w, o.h) * 0.44;
    // sokkel
    rectBody(g, -half * 1.1, -half * 1.1, half * 2.2, half * 2.2, 3, STONEDARK, { lw: 1.8, ao: 3 });
    clipped(g, () => { g.beginPath(); g.rect(-half * 1.1, -half * 1.1, half * 2.2, half * 2.2); }, () => mottle(g, r, [-half, -half, half, half], STONEDARK, 14, half * 0.15, 14, 0.4));
    glowDot(g, 0, 0, half * 1.5, glow, 0.35);
    pyramidTop(g, 0, 0, half * 0.82, [26, 26, 40], half * 0.04);
    // lysende årer ned ad kanterne og runer på fladerne
    const C: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sy] of C) glowLine(g, () => { g.beginPath(); g.moveTo(sx * half * 0.8, sy * half * 0.8); g.lineTo(sx * half * 0.04, sy * half * 0.04); }, glow, 1.3, 0.7);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      glowLine(g, runeMarks(g, r, Math.cos(a) * half * 0.42, Math.sin(a) * half * 0.42, half * 0.22), glow, 1, 0.9);
    }
    glowDot(g, 0, 0, half * 0.35, glow, 0.95);
    // glasagtig spejling øverst til venstre
    g.fillStyle = 'rgba(255,255,255,.12)';
    polyPath(g, [[-half * 0.8, -half * 0.8], [half * 0.1, -half * 0.8], [-half * 0.04, -half * 0.04]])();
    g.fill();
  },
});

const monolith = kind({
  key: 'myst_monolith', family: 'mystery', name: 'Sort monolit', w: 1, h: 2.6, shadow: 20, bleed: 0.08,
  tags: ['magic', 'ruin', 'mountain'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 1);
    const { w, h } = o;
    // brændt cirkel i jorden omkring
    glowDot(g, 0, 0, Math.max(w, h) * 0.5, glow, 0.2);
    rectBody(g, -w * 0.3, -h * 0.46, w * 0.6, h * 0.92, 3, [24, 24, 32], { lw: 1.8, ao: 3, light: 40, dark: 20 });
    // facet: skrå flade i venstre side (lys) og højre (mørk)
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.fillRect(-w * 0.3 + 2, -h * 0.46 + 2, w * 0.09, h * 0.92 - 4);
    g.fillStyle = 'rgba(0,0,0,.4)';
    g.fillRect(w * 0.3 - w * 0.1, -h * 0.46 + 2, w * 0.09, h * 0.92 - 4);
    glowLine(g, () => { g.beginPath(); g.moveTo(0, -h * 0.42); g.lineTo(0, h * 0.42); }, glow, 1.2, 0.8);
    for (let i = 0; i < 7; i++) glowLine(g, runeMarks(g, r, (r() < 0.5 ? -1 : 1) * w * 0.12, -h * 0.36 + i * h * 0.12, w * 0.12), glow, 0.8, 0.9);
    glowDot(g, 0, 0, w * 0.4, glow, 0.5);
  },
});

const runeSpiral = kind({
  key: 'myst_rune_spiral_stone', family: 'mystery', name: 'Runesten med spiraler', w: 1.8, h: 1.8, shadow: 16, randomRotation: true, sizeJitter: 0.1, bleed: 0.05,
  tags: ['magic', 'ruin', 'forest', 'mountain', 'outdoor'], params: [glowParam, { key: 'moss', label: 'Mos', type: 'toggle', default: true } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 0);
    const R = Math.min(o.w, o.h) * 0.42;
    const pts = blob(R, R * 0.92, 0.18, 12, r);
    blobBody(g, pts, [118, 114, 106], { lw: 1.8, ao: R * 0.1 });
    clipped(g, blobPath(g, pts), () => {
      mottle(g, r, [-R, -R, R, R], [118, 114, 106], 24, R * 0.18, 26, 0.4);
      for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(20,16,12,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo((r() - 0.5) * R, (r() - 0.5) * R); g.lineTo((r() - 0.5) * R, (r() - 0.5) * R); g.stroke(); }
    });
    // indhugget spiral og små tegn
    const spiral = () => {
      g.beginPath();
      for (let t = 0; t < 4.6 * Math.PI; t += 0.2) {
        const rad = R * 0.07 + t * R * 0.038;
        const x = Math.cos(t) * rad;
        const y = Math.sin(t) * rad;
        if (t) g.lineTo(x, y); else g.moveTo(x, y);
      }
    };
    g.strokeStyle = 'rgba(10,8,6,.6)'; g.lineWidth = 3.2; g.save(); g.translate(0.9, 1); spiral(); g.stroke(); g.restore();
    glowLine(g, spiral, glow, 1.4, 0.75);
    for (let i = 0; i < 5; i++) {
      const a = r() * 6.28;
      glowLine(g, runeMarks(g, r, Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74, R * 0.14), glow, 0.9, 0.6);
    }
    if (param(o, 'moss', true)) { clipped(g, blobPath(g, pts), () => mossPatch(g, r, R * 0.3, R * 0.5, R * 0.5, 26)); }
  },
});

// ------------------------------------------------------------------ tentakler, væv og æg

function tentacle(g: G, r: Rnd, a0: number, len: number, w0: number, base: RGB, curl: number): void {
  const N = 16;
  const pts: [number, number][] = [];
  let ang = a0;
  let x = Math.cos(a0) * len * 0.05;
  let y = Math.sin(a0) * len * 0.05;
  for (let i = 0; i <= N; i++) {
    pts.push([x, y]);
    ang += curl * (0.4 + i / N) * 0.35 + (r() - 0.5) * 0.12;
    x += Math.cos(ang) * (len / N);
    y += Math.sin(ang) * (len / N);
  }
  for (const [pass, col, sw] of [[0, [14, 8, 18] as RGB, 3.4], [1, base, 1], [2, shift(base, 34), 0.38]] as const) {
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const wd = Math.max(2, w0 * (1 - t * 0.9)) * sw;
      g.beginPath();
      g.moveTo(pts[i]![0] + (pass === 2 ? -wd * 0.25 : 0), pts[i]![1] + (pass === 2 ? -wd * 0.25 : 0));
      g.lineTo(pts[i + 1]![0] + (pass === 2 ? -wd * 0.25 : 0), pts[i + 1]![1] + (pass === 2 ? -wd * 0.25 : 0));
      g.strokeStyle = rgb(pass === 0 ? col : shift(col, -t * 28));
      g.lineWidth = pass === 0 ? Math.max(2, w0 * (1 - t * 0.9)) + 2.4 : wd;
      g.lineCap = 'round';
      g.stroke();
    }
  }
  // sugekopper på indersiden
  for (let i = 2; i < N - 1; i += 2) {
    const t = i / N;
    const p = pts[i]!;
    const q = pts[i + 1]!;
    const nx = -(q[1] - p[1]);
    const ny = q[0] - p[0];
    const nl = Math.hypot(nx, ny) || 1;
    const wd = w0 * (1 - t * 0.9);
    g.fillStyle = rgb(shift(base, 54), 0.85);
    g.beginPath();
    g.arc(p[0] + (nx / nl) * wd * 0.2, p[1] + (ny / nl) * wd * 0.2, Math.max(1.2, wd * 0.22), 0, 7);
    g.fill();
  }
  g.lineCap = 'butt';
}

const tentacles = kind({
  key: 'myst_tentacle_pit', family: 'mystery', name: 'Tentakler fra hul', w: 3.4, h: 3.4, shadow: 6, randomRotation: true, bleed: 0.04,
  tags: ['dungeon', 'swamp', 'cave', 'magic', 'water'],
  params: [{ key: 'tone', label: 'Hud', type: 'select', default: '0', options: [{ value: '0', label: 'Lilla' }, { value: '1', label: 'Grøn' }, { value: '2', label: 'Blegrød' }] } as ParamDef,
    { key: 'count', label: 'Antal', type: 'range', min: 3, max: 10, step: 1, default: 7 } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = Math.min(o.w, o.h) / 2;
    const base: RGB = ([[104, 54, 128], [66, 112, 74], [190, 110, 118]] as RGB[])[Math.min(2, parseInt(param(o, 'tone', '0'), 10) || 0)]!;
    // hullet og slim
    const hole = blob(R * 0.3, R * 0.27, 0.16, 12, r);
    blobBody(g, blob(R * 0.4, R * 0.37, 0.14, 12, r), [58, 40, 52], { lw: 1.6, ao: 4 });
    g.fillStyle = radial(g, 0, 0, R * 0.34, [[0, 'rgb(2,0,4)'], [0.8, 'rgb(14,6,18)'], [1, 'rgb(40,22,44)']]);
    blobPath(g, hole)();
    g.fill();
    const n = param(o, 'count', 7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.4;
      tentacle(g, r, a, R * (0.9 + r() * 0.4), R * (0.13 + r() * 0.04), shift(base, (r() - 0.5) * 20), (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.5));
    }
    // slimglans
    g.fillStyle = 'rgba(255,255,255,.2)';
    for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse((r() - 0.5) * R * 1.4, (r() - 0.5) * R * 1.4, 2 + r() * 2, 1.2, r() * 3, 0, 7); g.fill(); }
  },
});

function veins(g: G, r: Rnd, cx: number, cy: number, len: number, ang: number, w: number, depth: number, col: string): void {
  const x1 = cx + Math.cos(ang) * len;
  const y1 = cy + Math.sin(ang) * len;
  g.strokeStyle = col;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo((cx + x1) / 2 + (r() - 0.5) * len * 0.4, (cy + y1) / 2 + (r() - 0.5) * len * 0.4, x1, y1); g.stroke();
  if (depth > 0) {
    veins(g, r, x1, y1, len * 0.6, ang + 0.6 + r() * 0.3, w * 0.7, depth - 1, col);
    veins(g, r, x1, y1, len * 0.6, ang - 0.6 - r() * 0.3, w * 0.7, depth - 1, col);
  }
}

const fleshMound = kind({
  key: 'myst_flesh_mound', family: 'mystery', name: 'Levende kødhob', w: 2.4, h: 2.2, shadow: 10, randomRotation: true, bleed: 0.05,
  tags: ['dungeon', 'cave', 'magic', 'ruin'],
  params: [{ key: 'eye', label: 'Øje', type: 'toggle', default: true } as ParamDef, { key: 'tone', label: 'Farve', type: 'select', default: '0', options: [{ value: '0', label: 'Rosa kød' }, { value: '1', label: 'Gråligt' }, { value: '2', label: 'Mørkerødt' }] } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = Math.min(o.w, o.h) / 2;
    const base: RGB = ([[196, 104, 112], [150, 140, 138], [130, 40, 52]] as RGB[])[Math.min(2, parseInt(param(o, 'tone', '0'), 10) || 0)]!;
    const pts = blob(R * 0.9, R * 0.84, 0.2, 14, r);
    // slim rundt om
    g.fillStyle = 'rgba(90,30,40,.35)';
    blobPath(g, blob(R * 1.0, R * 0.95, 0.2, 14, r))();
    g.fill();
    blobBody(g, pts, base, { lw: 2, ao: R * 0.16, light: 36 });
    clipped(g, blobPath(g, pts), () => {
      for (let i = 0; i < 6; i++) veins(g, r, (r() - 0.5) * R * 0.4, (r() - 0.5) * R * 0.4, R * (0.3 + r() * 0.3), r() * 6.28, 2.2, 2, rgba(shift(base, -88), 0.65));
      for (let i = 0; i < 14; i++) {
        g.fillStyle = rgba(shift(base, -50), 0.5);
        g.beginPath(); g.ellipse((r() - 0.5) * R * 1.5, (r() - 0.5) * R * 1.4, 2 + r() * 4, 1.5 + r() * 3, r() * 3, 0, 7); g.fill();
      }
      // blærer
      for (let i = 0; i < 6; i++) {
        const x = (r() - 0.5) * R * 1.4;
        const y = (r() - 0.5) * R * 1.3;
        const s = 3 + r() * 6;
        g.fillStyle = radial(g, x, y, s, [[0, rgba(shift(base, 44), 0.9)], [1, rgba(shift(base, -30), 0.9)]], x - s * 0.3, y - s * 0.3, 0.5);
        g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
        g.strokeStyle = 'rgba(40,10,16,.6)'; g.lineWidth = 0.8; g.stroke();
      }
    });
    if (param(o, 'eye', true)) {
      const ew = R * 0.3;
      g.fillStyle = 'rgb(236,214,120)';
      g.beginPath(); g.ellipse(0, 0, ew, ew * 0.62, 0, 0, 7); g.fill();
      g.fillStyle = radial(g, 0, 0, ew, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(0,0,0,.4)']], -ew * 0.3, -ew * 0.3, 1);
      g.fill();
      g.fillStyle = 'rgb(14,6,8)';
      g.beginPath(); g.ellipse(0, 0, ew * 0.14, ew * 0.55, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(40,10,16,.9)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, ew, ew * 0.62, 0, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-ew * 0.4, -ew * 0.22, ew * 0.1, 0, 7); g.fill();
    }
    blobPath(g, pts)();
    g.fillStyle = 'rgba(255,255,255,.06)';
    g.fill();
  },
});

function rgba(c: RGB, a: number): string {
  return rgb(c, a);
}

function egg(g: G, r: Rnd, x: number, y: number, rx: number, ry: number, tint: RGB, embryo: boolean, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.ellipse(0, 0, rx, ry, 0, 0, 7);
  g.fillStyle = radial(g, 0, 0, Math.max(rx, ry) * 1.1, [[0, rgb(shift(tint, 50), 0.95)], [0.6, rgb(tint, 0.95)], [1, rgb(shift(tint, -60), 0.98)]], -rx * 0.3, -ry * 0.3, 1);
  g.fill();
  if (embryo) {
    // sammenkrøllet skygge af et væsen indeni
    g.fillStyle = rgb(shift(tint, -90), 0.55);
    g.beginPath();
    g.ellipse(0, ry * 0.08, rx * 0.5, ry * 0.4, 0.3, 0, 7);
    g.fill();
    g.beginPath(); g.arc(-rx * 0.1, -ry * 0.2, rx * 0.2, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,240,160,.8)';
    g.beginPath(); g.arc(-rx * 0.17, -ry * 0.22, 1.3, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(20,24,10,.75)';
  g.lineWidth = 1.6;
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.beginPath(); g.ellipse(-rx * 0.4, -ry * 0.45, rx * 0.2, ry * 0.12, -0.6, 0, 7); g.fill();
  g.restore();
  void r;
}

const eggs = kind({
  key: 'myst_egg_nest', family: 'mystery', name: 'Rede med livlige æg', w: 2, h: 2, shadow: 8, randomRotation: true, bleed: 0.05,
  tags: ['cave', 'dungeon', 'swamp', 'magic'], params: [{ key: 'tone', label: 'Æg', type: 'select', default: '0', options: [{ value: '0', label: 'Grønlige' }, { value: '1', label: 'Lyserøde' }, { value: '2', label: 'Gyldne' }, { value: '3', label: 'Sorte' }] } as ParamDef, { key: 'count', label: 'Antal', type: 'range', min: 2, max: 8, step: 1, default: 5 } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = Math.min(o.w, o.h) / 2;
    const tint: RGB = ([[130, 190, 110], [220, 140, 160], [220, 180, 80], [60, 50, 76]] as RGB[])[Math.min(3, parseInt(param(o, 'tone', '0'), 10) || 0)]!;
    // slimet rede
    blobBody(g, blob(R * 0.94, R * 0.9, 0.16, 14, r), [78, 66, 44], { lw: 1.8, ao: R * 0.12 });
    clipped(g, blobPath(g, blob(R * 0.9, R * 0.86, 0.14, 14, r)), () => {
      for (let i = 0; i < 40; i++) { g.strokeStyle = rgb(shift([96, 80, 52], (r() - 0.5) * 40), 0.8); g.lineWidth = 1.4; g.beginPath(); const x = (r() - 0.5) * R * 1.8, y = (r() - 0.5) * R * 1.8; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 16, y + (r() - 0.5) * 16); g.stroke(); }
      g.fillStyle = rgb(tint, 0.18);
      for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse((r() - 0.5) * R, (r() - 0.5) * R, 8 + r() * 10, 5 + r() * 6, r() * 3, 0, 7); g.fill(); }
    });
    const n = param(o, 'count', 5);
    const placed: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 20; tries++) {
        const a = r() * 6.28;
        const d = Math.sqrt(r()) * R * 0.6;
        const rad = R * (0.18 + r() * 0.07);
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        if (placed.every(([px, py, pr]) => Math.hypot(px - x, py - y) > (pr + rad) * 0.9)) {
          placed.push([x, y, rad]);
          egg(g, r, x, y, rad * 0.82, rad, shift(tint, (r() - 0.5) * 24), r() < 0.7, r() * 6.28);
          break;
        }
      }
    }
  },
});

// ------------------------------------------------------------------ inaktive portaler

const portalStones = kind({
  key: 'myst_portal_stones', family: 'mystery', name: 'Inaktiv portal, stencirkel', w: 3.6, h: 3.6, shadow: 14, randomRotation: true, bleed: 0.04,
  tags: ['magic', 'ruin', 'temple', 'outdoor', 'dungeon'], params: [glowParam, { key: 'cracked', label: 'Revnet', type: 'toggle', default: true } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 0);
    const R = Math.min(o.w, o.h) / 2;
    const disc = R * 0.62;
    // runefyldt gulv
    ellBody(g, 0, 0, disc * 1.14, disc * 1.14, [84, 82, 92], { lw: 1.8, ao: disc * 0.08 });
    g.fillStyle = radial(g, -disc * 0.2, -disc * 0.2, disc, [[0, 'rgb(40,46,64)'], [1, 'rgb(14,16,26)']]);
    g.beginPath(); g.arc(0, 0, disc, 0, 7); g.fill();
    g.strokeStyle = rgb(glow, 0.3); g.lineWidth = 1.4;
    for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(0, 0, disc * i * 0.28, 0, 7); g.stroke(); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; g.beginPath(); g.moveTo(Math.cos(a) * disc * 0.28, Math.sin(a) * disc * 0.28); g.lineTo(Math.cos(a) * disc * 0.84, Math.sin(a) * disc * 0.84); g.stroke(); }
    glowDot(g, 0, 0, disc * 0.4, glow, 0.2);
    if (param(o, 'cracked', true)) { g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-disc * 0.6, -disc * 0.5); g.lineTo(-disc * 0.1, -disc * 0.1); g.lineTo(disc * 0.2, -disc * 0.3); g.moveTo(-disc * 0.1, -disc * 0.1); g.lineTo(disc * 0.1, disc * 0.5); g.stroke(); }
    // stående sten rundt
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + 0.2;
      const x = Math.cos(a) * R * 0.84;
      const y = Math.sin(a) * R * 0.84;
      g.save();
      g.translate(x, y);
      g.rotate(a + Math.PI / 2);
      const hw = R * 0.1 * (0.9 + r() * 0.3);
      const hh = R * 0.17 * (0.9 + r() * 0.3);
      polyBody(g, [[-hw, -hh], [hw * 0.6, -hh * 1.04], [hw, hh * 0.9], [-hw * 0.8, hh]], [118, 114, 108], { lw: 1.6, ao: 2 });
      glowLine(g, runeMarks(g, r, 0, 0, hw * 1.2), glow, 0.8, 0.45);
      g.restore();
    }
  },
});

const portalMetal = kind({
  key: 'myst_portal_ring', family: 'mystery', name: 'Inaktiv portal, metalring', w: 3, h: 3, shadow: 14, bleed: 0.04,
  tags: ['magic', 'dungeon', 'ruin', 'temple'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 2);
    const R = Math.min(o.w, o.h) / 2;
    // ringen
    g.beginPath(); g.arc(0, 0, R * 0.96, 0, 7); g.arc(0, 0, R * 0.68, 0, 7, true);
    g.fillStyle = lin(g, -R, -R, R, R, [[0, 'rgb(156,150,138)'], [0.5, 'rgb(96,92,86)'], [1, 'rgb(48,46,44)']]);
    g.fill('evenodd');
    g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R * 0.96, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, R * 0.68, 0, 7); g.stroke();
    // tænder (gear-agtig) og nitter
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 6.28;
      rivet(g, Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82, R * 0.035, [170, 160, 140]);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.28;
      glowLine(g, runeMarks(g, r, Math.cos(a + 0.2) * R * 0.76, Math.sin(a + 0.2) * R * 0.76, R * 0.08), glow, 0.8, 0.5);
    }
    // inderflade: mørkt glas med svag hvirvel
    g.fillStyle = radial(g, 0, 0, R * 0.68, [[0, 'rgb(6,12,14)'], [1, 'rgb(14,28,30)']]);
    g.beginPath(); g.arc(0, 0, R * 0.66, 0, 7); g.fill();
    g.strokeStyle = rgb(glow, 0.22); g.lineWidth = 2;
    g.beginPath();
    for (let t = 0; t < 12; t += 0.2) { const rad = t * R * 0.05; if (t) g.lineTo(Math.cos(t) * rad, Math.sin(t) * rad); else g.moveTo(0, 0); }
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.08)';
    g.beginPath(); g.ellipse(-R * 0.25, -R * 0.3, R * 0.3, R * 0.12, -0.7, 0, 7); g.fill();
  },
});

const portalShattered = kind({
  key: 'myst_portal_shattered', family: 'mystery', name: 'Sprængt portal', w: 3.2, h: 3.2, shadow: 14, randomRotation: true, bleed: 0.05,
  tags: ['magic', 'ruin', 'battlefield', 'dungeon'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 1);
    const R = Math.min(o.w, o.h) / 2;
    // svedet cirkel
    g.fillStyle = radial(g, 0, 0, R, [[0, 'rgba(10,6,14,.7)'], [0.7, 'rgba(10,6,14,.3)'], [1, 'rgba(10,6,14,0)']]);
    g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
    // ringstykker spredt langs cirklen
    const segs = 7;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * 6.28 + r() * 0.2;
      const a1 = a0 + (6.28 / segs) * (0.4 + r() * 0.35);
      const push = 1 + r() * 0.15;
      const ri = R * 0.56 * push;
      const ro = R * 0.8 * push;
      g.beginPath(); g.arc(0, 0, ro, a0, a1); g.arc(0, 0, ri, a1, a0, true); g.closePath();
      g.fillStyle = lin(g, -R, -R, R, R, [[0, 'rgb(150,144,134)'], [1, 'rgb(60,58,56)']]);
      g.fill();
      g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
      glowLine(g, runeMarks(g, r, Math.cos((a0 + a1) / 2) * (ri + ro) / 2, Math.sin((a0 + a1) / 2) * (ri + ro) / 2, R * 0.07), glow, 0.8, 0.5);
      // gnister ved brudstedet
      glowDot(g, Math.cos(a1) * (ri + ro) / 2, Math.sin(a1) * (ri + ro) / 2, R * 0.12, glow, 0.5);
    }
    // glasskår i midten
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.28;
      const d = r() * R * 0.5;
      g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d); g.rotate(r() * 6);
      g.fillStyle = rgb(shift(glow, -60), 0.5 + r() * 0.3);
      g.beginPath(); g.moveTo(0, -4 - r() * 6); g.lineTo(3 + r() * 3, 3); g.lineTo(-3, 4); g.closePath(); g.fill();
      g.strokeStyle = rgb(shift(glow, 70), 0.8); g.lineWidth = 0.8; g.stroke();
      g.restore();
    }
    glowDot(g, 0, 0, R * 0.25, glow, 0.35);
  },
});

// ------------------------------------------------------------------ flydende sten

function floatRock(g: G, r: Rnd, x: number, y: number, rad: number, glow: RGB): void {
  glowDot(g, x + rad * 0.2, y + rad * 0.3, rad * 1.5, glow, 0.35);
  const pts = blob(rad, rad * 0.86, 0.2, 10, r, x, y, r() * 3);
  blobBody(g, pts, [112, 108, 102], { lw: 1.8, ao: rad * 0.14, light: 36 });
  clipped(g, blobPath(g, pts), () => {
    mottle(g, r, [x - rad, y - rad, x + rad, y + rad], [112, 108, 102], 14, rad * 0.2, 24, 0.4);
    for (let i = 0; i < 2; i++) { g.strokeStyle = 'rgba(16,12,10,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + (r() - 0.5) * rad, y + (r() - 0.5) * rad); g.lineTo(x + (r() - 0.5) * rad * 1.4, y + (r() - 0.5) * rad * 1.4); g.stroke(); }
    // glødende sprækker
    g.beginPath(); g.moveTo(x - rad * 0.4, y + rad * 0.1); g.lineTo(x, y - rad * 0.1); g.lineTo(x + rad * 0.4, y + rad * 0.2);
    glowLine(g, () => { g.beginPath(); g.moveTo(x - rad * 0.4, y + rad * 0.1); g.lineTo(x, y - rad * 0.1); g.lineTo(x + rad * 0.4, y + rad * 0.2); }, glow, 0.8, 0.8);
  });
}

const floatingRocks = kind({
  key: 'myst_floating_rocks', family: 'mystery', name: 'Flydende sten', w: 2.6, h: 2.6, shadow: 34, randomRotation: true, bleed: 0.05,
  tags: ['magic', 'ruin', 'mountain', 'temple'], params: [glowParam, { key: 'count', label: 'Antal', type: 'range', min: 2, max: 6, step: 1, default: 3 } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 0);
    const R = Math.min(o.w, o.h) / 2;
    const n = param(o, 'count', 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + r() * 0.5;
      floatRock(g, r, Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42, R * (0.24 + r() * 0.1), glow);
    }
    for (let i = 0; i < 12; i++) { g.fillStyle = rgb(glow, 0.5 + r() * 0.4); g.beginPath(); g.arc((r() - 0.5) * R * 1.8, (r() - 0.5) * R * 1.8, 0.9 + r() * 1.2, 0, 7); g.fill(); }
  },
});

const floatingBoulder = kind({
  key: 'myst_floating_boulder', family: 'mystery', name: 'Svævende klippe med krystal', w: 2.2, h: 2.2, shadow: 36, randomRotation: true, bleed: 0.06,
  tags: ['magic', 'mountain', 'ruin'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 1);
    const R = Math.min(o.w, o.h) / 2;
    glowDot(g, 0, 0, R, glow, 0.35);
    // ring af smådele
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.28 + r() * 0.3;
      const d = R * (0.78 + r() * 0.1);
      const s = R * (0.05 + r() * 0.05);
      blobBody(g, blob(s, s * 0.85, 0.25, 7, r, Math.cos(a) * d, Math.sin(a) * d), [108, 104, 98], { lw: 1.2, ao: 1 });
    }
    const pts = blob(R * 0.62, R * 0.56, 0.18, 12, r);
    blobBody(g, pts, [104, 100, 94], { lw: 2, ao: R * 0.1, light: 40 });
    clipped(g, blobPath(g, pts), () => mottle(g, r, [-R, -R, R, R], [104, 100, 94], 26, R * 0.1, 26, 0.4));
    // krystalklynge på toppen
    for (let i = 0; i < 5; i++) {
      const a = r() * 6.28;
      const d = r() * R * 0.28;
      const len = R * (0.2 + r() * 0.2);
      g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d); g.rotate(a + 1.57);
      polyBody(g, [[-len * 0.16, 0], [0, -len], [len * 0.16, 0]], shift(glow, -50), { lw: 1.2, ao: 0, rim: 0.6 });
      g.fillStyle = rgb(shift(glow, 90), 0.55);
      g.beginPath(); g.moveTo(-len * 0.16, 0); g.lineTo(0, -len); g.lineTo(0, 0); g.fill();
      g.restore();
    }
    glowDot(g, 0, 0, R * 0.26, glow, 0.6);
  },
});

export const mysteryKinds1: ObjectKind[] = [obeliskBlack, monolith, runeSpiral, tentacles, fleshMound, eggs, portalStones, portalMetal, portalShattered, floatingRocks, floatingBoulder];
void tube; void STONEDARK;
