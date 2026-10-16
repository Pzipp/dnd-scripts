import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { blob, rgb, rng, shift, smooth, type RGB } from '../util';
import { growBranches, Leaves, mossClumps, OUTLINE, paintBranches, type Seg } from './helpers';

type G = CanvasRenderingContext2D;

interface LogLook {
  bark: RGB;
  face: RGB;
  moss?: number;
  rotten?: boolean;
  birch?: boolean;
  hollow?: boolean;
  fungi?: boolean;
  stubs?: number;
  /** Kun overfladen (ingen skygge, bruges i stabler). */
  quiet?: boolean;
}

const BARK: RGB = [112, 80, 52];
const FACE: RGB = [206, 168, 118];

/** Cut-face (endeflade) set skråt: ellipse med årringe, revner og lys øverst til venstre. */
function endFace(g: G, r: () => number, x: number, y: number, rx: number, ry: number, face: RGB, hollow = false, dark = false): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = rgb(shift(face, -50));
  g.fill();
  const rings = 7;
  for (let i = rings - 1; i >= 0; i--) {
    const k = (i + 1) / rings;
    g.beginPath();
    g.ellipse(x - rx * 0.03 * (1 - k), y - ry * 0.03 * (1 - k), rx * 0.9 * k, ry * 0.9 * k, 0, 0, Math.PI * 2);
    g.fillStyle = rgb(shift(face, (i % 2 ? -16 : 6) - (dark ? 30 : 0)));
    g.fill();
  }
  const gr = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  gr.addColorStop(0, 'rgba(255,240,200,.3)');
  gr.addColorStop(1, 'rgba(30,14,4,.3)');
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(x, y, rx * 0.92, ry * 0.92, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(60,34,14,.55)';
  g.lineWidth = Math.max(0.6, ry * 0.035);
  for (let i = 0; i < 3; i++) {
    const a = r() * 6.28;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * rx * 0.85, y + Math.sin(a) * ry * 0.85);
    g.stroke();
  }
  if (hollow) {
    const hg = g.createRadialGradient(x - rx * 0.1, y - ry * 0.1, 0, x, y, ry * 0.7);
    hg.addColorStop(0, 'rgb(10,6,3)');
    hg.addColorStop(0.8, 'rgb(34,22,12)');
    hg.addColorStop(1, 'rgb(70,46,26)');
    g.fillStyle = hg;
    g.beginPath();
    g.ellipse(x, y, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(0.8, ry * 0.06);
  g.stroke();
}

/** En liggende stamme (vandret). Tegnes i (x, y) som midte, længde L og tykkelse T. */
export function logBody(g: G, r: () => number, x: number, y: number, L: number, T: number, look: LogLook): void {
  g.save();
  g.translate(x, y);
  const e = T * 0.13;
  const n = 14;
  const hw = (px: number): number => (T / 2) * (1 + 0.09 * (-px / L)) * (1 + 0.025 * Math.sin(px * 0.09));
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const px = -L / 2 + e + ((L - 2 * e) * i) / n;
    top.push([px, -hw(px) * (1 + (r() - 0.5) * 0.05)]);
    bot.push([px, hw(px) * (1 + (r() - 0.5) * 0.05)]);
  }
  const body = (): void => {
    g.beginPath();
    top.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.ellipse(L / 2 - e, 0, e, hw(L / 2), 0, -Math.PI / 2, Math.PI / 2);
    for (let i = n; i >= 0; i--) g.lineTo(bot[i]![0], bot[i]![1]);
    g.ellipse(-L / 2 + e, 0, e, hw(-L / 2), 0, Math.PI / 2, (Math.PI * 3) / 2);
    g.closePath();
  };
  // grenstubbe
  for (let i = 0; i < (look.stubs ?? 1); i++) {
    const px = (r() - 0.5) * L * 0.6;
    const sd = r() < 0.5 ? -1 : 1;
    const sw = T * (0.2 + r() * 0.1);
    const sl = T * (0.5 + r() * 0.3);
    const by = sd * hw(px) * 0.8;
    g.lineCap = 'round';
    g.strokeStyle = OUTLINE;
    g.lineWidth = sw + 2;
    g.beginPath();
    g.moveTo(px, by);
    g.lineTo(px + sl * 0.2, by + sd * sl);
    g.stroke();
    g.strokeStyle = rgb(shift(look.bark, -12));
    g.lineWidth = sw;
    g.stroke();
    g.fillStyle = rgb(look.face);
    g.beginPath();
    g.ellipse(px + sl * 0.2, by + sd * sl, sw * 0.5, sw * 0.38, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(30,18,10,.6)';
    g.lineWidth = 0.9;
    g.stroke();
  }
  // kroppen: cylinder-gradient, lys øverst
  body();
  const gr = g.createLinearGradient(0, -T / 2, 0, T / 2);
  const b = look.bark;
  gr.addColorStop(0, rgb(shift(b, 34)));
  gr.addColorStop(0.3, rgb(shift(b, 14)));
  gr.addColorStop(0.62, rgb(b));
  gr.addColorStop(1, rgb(shift(b, -44)));
  g.fillStyle = gr;
  g.fill();
  g.save();
  body();
  g.clip();
  // furer i barken: afbrudte, bølgede linjer langs stammen
  const furrows = look.birch ? 4 : 9;
  for (let k = 0; k < furrows; k++) {
    const fy = -0.9 + ((k + 0.5) / furrows) * 1.8;
    let px = -L / 2 + r() * L * 0.2;
    while (px < L / 2) {
      const len = L * (0.1 + r() * 0.22);
      const gap = L * (0.03 + r() * 0.08);
      g.beginPath();
      for (let s = 0; s <= 5; s++) {
        const xx = px + (len * s) / 5;
        const yy = fy * hw(xx) + Math.sin(xx * 0.12 + k * 2) * T * 0.025;
        s ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
      }
      g.strokeStyle = look.birch ? 'rgba(20,18,16,.55)' : 'rgba(26,14,6,.5)';
      g.lineWidth = Math.max(0.7, T * (look.birch ? 0.035 : 0.04));
      g.stroke();
      if (!look.birch) {
        g.translate(0, T * 0.03);
        g.strokeStyle = 'rgba(255,230,190,.14)';
        g.lineWidth = Math.max(0.6, T * 0.025);
        g.stroke();
        g.translate(0, -T * 0.03);
      }
      px += len + gap;
    }
  }
  if (look.birch) {
    // vandrette sorte barkpletter
    g.fillStyle = 'rgba(24,22,20,.7)';
    for (let i = 0; i < 26; i++) {
      const xx = -L / 2 + r() * L;
      const yy = (r() - 0.5) * T * 0.9;
      g.fillRect(xx, yy, T * (0.1 + r() * 0.25), Math.max(0.8, T * 0.035));
    }
  }
  // knaster
  for (let i = 0; i < 2; i++) {
    const kx = (r() - 0.5) * L * 0.7;
    const ky = (r() - 0.5) * T * 0.5;
    g.fillStyle = 'rgba(30,16,8,.6)';
    g.beginPath();
    g.ellipse(kx, ky, T * 0.1, T * 0.07, 0.3, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(20,10,4,.6)';
    g.lineWidth = Math.max(0.6, T * 0.025);
    g.beginPath();
    g.ellipse(kx, ky, T * 0.15, T * 0.11, 0.3, 0, Math.PI * 2);
    g.stroke();
  }
  if (look.rotten) {
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(${150 + r() * 40},${96 + r() * 30},${40},.25)`;
      smooth(g, blob(T * (0.18 + r() * 0.3), T * 0.12, 0.3, 7, r, (r() - 0.5) * L, (r() - 0.5) * T * 0.8));
      g.fill();
    }
  }
  if (look.moss) mossClumps(g, r, 0, -T * 0.18, L * 0.46, T * 0.3, Math.round(look.moss * 12), T * 0.17);
  // skygge og lys langs kroppen
  const sg = g.createLinearGradient(0, -T / 2, 0, T / 2);
  sg.addColorStop(0, 'rgba(255,240,200,.12)');
  sg.addColorStop(0.5, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(10,4,0,.32)');
  g.fillStyle = sg;
  g.fillRect(-L / 2, -T / 2, L, T);
  g.restore();
  body();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, T * 0.05);
  g.lineJoin = 'round';
  g.stroke();
  // svampe (hylder) på siden
  if (look.fungi) {
    for (let i = 0; i < 3; i++) {
      const px = (r() - 0.5) * L * 0.6;
      const sd = r() < 0.5 ? -1 : 1;
      const rr = T * (0.14 + r() * 0.1);
      for (let k = 2; k >= 0; k--) {
        g.beginPath();
        g.ellipse(px, sd * hw(px), rr * (1 + k * 0.4), rr * (0.55 + k * 0.2), 0, sd < 0 ? Math.PI : 0, sd < 0 ? Math.PI * 2 : Math.PI);
        g.closePath();
        g.fillStyle = rgb(k % 2 ? [226, 168, 84] : [196, 118, 52]);
        g.fill();
        g.strokeStyle = 'rgba(40,20,8,.7)';
        g.lineWidth = 0.8;
        g.stroke();
      }
    }
  }
  // endefladerne
  endFace(g, r, L / 2 - e, 0, e * 1.05, hw(L / 2), look.face, look.hollow, look.rotten);
  g.beginPath();
  g.ellipse(-L / 2 + e, 0, e * 0.9, hw(-L / 2), 0, Math.PI / 2, (Math.PI * 3) / 2);
  g.strokeStyle = 'rgba(20,10,4,.5)';
  g.lineWidth = Math.max(0.8, T * 0.04);
  g.stroke();
  g.restore();
}

function drawLog(g: G, o: DrawInput, over: Partial<LogLook> = {}): void {
  const r = rng(o.seed);
  logBody(g, r, 0, 0, o.w * 0.97, o.h * 0.92, { bark: BARK, face: FACE, moss: param(o, 'moss', false) ? 1 : 0, stubs: 1, ...over });
}

// ------------------------------------------------------------------ stubbe

function drawStump(g: G, o: DrawInput, opts: { moss?: boolean; big?: boolean; mushrooms?: boolean } = {}): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const bark: RGB = [96, 68, 44];
  // rødder
  const roots = 5 + Math.floor(r() * 3);
  const a0 = r() * 6.28;
  g.lineCap = 'round';
  for (let i = 0; i < roots; i++) {
    const a = a0 + (i / roots) * Math.PI * 2 + (r() - 0.5) * 0.5;
    const l = R * (0.95 + r() * 0.15);
    const w = R * (opts.big ? 0.5 : 0.42);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    g.beginPath();
    g.moveTo(-sa * w * 0.5, ca * w * 0.5);
    g.quadraticCurveTo(ca * l * 0.55 - sa * w * 0.6, sa * l * 0.55 + ca * w * 0.6, ca * l - sa * w * 0.12, sa * l + ca * w * 0.12);
    g.quadraticCurveTo(ca * l * 1.02 + sa * w * 0.1, sa * l * 1.02 - ca * w * 0.1, ca * l * 0.55 + sa * w * 0.6, sa * l * 0.55 - ca * w * 0.6);
    g.quadraticCurveTo(0, 0, sa * w * 0.5, -ca * w * 0.5);
    g.closePath();
    g.fillStyle = rgb(shift(bark, -10 + (r() - 0.5) * 12));
    g.fill();
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(1, R * 0.04);
    g.stroke();
  }
  // barkring
  const pts = blob(R * 0.8, R * 0.8, 0.06, 16, r);
  smooth(g, pts);
  const bg = g.createLinearGradient(-R, -R, R, R);
  bg.addColorStop(0, rgb(shift(bark, 32)));
  bg.addColorStop(1, rgb(shift(bark, -36)));
  g.fillStyle = bg;
  g.fill();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, R * 0.05);
  g.stroke();
  g.save();
  smooth(g, pts);
  g.clip();
  // furer: radiale, afbrudte streger i kanten
  g.strokeStyle = 'rgba(24,12,4,.55)';
  g.lineWidth = Math.max(0.7, R * 0.03);
  g.beginPath();
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * 6.28 + r() * 0.1;
    const r1 = R * (0.62 + r() * 0.08);
    const r2 = R * (0.8 + r() * 0.1);
    g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.lineTo(Math.cos(a + 0.03) * r2, Math.sin(a + 0.03) * r2);
  }
  g.stroke();
  if (opts.moss) mossClumps(g, r, -R * 0.2, -R * 0.2, R * 0.65, R * 0.65, 8, R * 0.2);
  g.restore();
  // snitfladen
  const fx = (r() - 0.5) * R * 0.08;
  const fy = (r() - 0.5) * R * 0.08;
  const base = blob(R * 0.62, R * 0.62, 0.05, 16, r, fx, fy);
  const rings = 8;
  for (let i = rings; i >= 1; i--) {
    const k = i / rings;
    smooth(g, base.map((p) => [fx + (p[0] - fx) * k + (r() - 0.5) * R * 0.01, fy + (p[1] - fy) * k + (r() - 0.5) * R * 0.01] as [number, number]));
    g.fillStyle = rgb(i % 2 ? [202, 164, 112] : [184, 142, 92]);
    g.fill();
  }
  smooth(g, base);
  g.strokeStyle = 'rgba(40,22,8,.7)';
  g.lineWidth = Math.max(0.8, R * 0.03);
  g.stroke();
  // lys og skygge over fladen
  const lg = g.createLinearGradient(-R * 0.6, -R * 0.6, R * 0.6, R * 0.6);
  lg.addColorStop(0, 'rgba(255,240,200,.28)');
  lg.addColorStop(1, 'rgba(40,16,4,.3)');
  smooth(g, base);
  g.fillStyle = lg;
  g.fill();
  // revner
  g.strokeStyle = 'rgba(60,32,12,.6)';
  g.lineWidth = Math.max(0.6, R * 0.02);
  for (let i = 0; i < 3; i++) {
    const a = r() * 6.28;
    g.beginPath();
    g.moveTo(fx, fy);
    g.lineTo(fx + Math.cos(a) * R * 0.55, fy + Math.sin(a) * R * 0.55);
    g.stroke();
  }
  g.fillStyle = 'rgba(70,40,16,.7)';
  g.beginPath();
  g.arc(fx, fy, R * 0.035, 0, Math.PI * 2);
  g.fill();
  if (opts.mushrooms) {
    for (let i = 0; i < 4; i++) {
      const a = r() * 6.28;
      const d = R * (0.45 + r() * 0.2);
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const s = R * (0.07 + r() * 0.05);
      g.fillStyle = 'rgba(10,5,2,.4)';
      g.beginPath();
      g.arc(x + s * 0.3, y + s * 0.3, s, 0, Math.PI * 2);
      g.fill();
      const gg = g.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s);
      gg.addColorStop(0, 'rgb(240,226,196)');
      gg.addColorStop(1, 'rgb(170,140,100)');
      g.fillStyle = gg;
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(50,30,10,.6)';
      g.lineWidth = 0.7;
      g.stroke();
    }
  }
}

// ------------------------------------------------------------------ kvas

function drawBranches(g: G, o: DrawInput, leaves = false): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const segs: Seg[] = [];
  const n = 9 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 0.5;
    const dir = r() * 6.28;
    growBranches(r, Math.cos(a) * d - Math.cos(dir) * R * 0.2, Math.sin(a) * d - Math.sin(dir) * R * 0.2, dir, R * (0.3 + r() * 0.4), Math.max(1.6, R * (0.035 + r() * 0.04)), 0, { maxDepth: 1, kids: [0, 1], spread: 1.2, shrink: 0.5, thin: 0.45, wander: 0.35, pieces: 3, minLen: R * 0.08 }, segs);
  }
  if (leaves) {
    const lv = new Leaves([[88, 52, 24], [136, 82, 30], [178, 116, 40], [208, 156, 58]]);
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28;
      const d = Math.sqrt(r()) * R * 0.85;
      lv.add(Math.floor(r() * 4), Math.cos(a) * d, Math.sin(a) * d, r() * 6.28, R * 0.08, R * 0.035);
    }
    lv.flush(g, 'leaf', 0.9);
  }
  paintBranches(g, segs, [118, 90, 62], { outline: Math.max(0.8, R * 0.014) });
}

// ------------------------------------------------------------------ stabel

function drawLogPile(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const rows = 4;
  const T = (H / rows) * 1.0;
  for (let i = 0; i < rows; i++) {
    const L = W * (0.86 + r() * 0.12);
    const y = -H / 2 + T * (i + 0.5);
    logBody(g, r, (r() - 0.5) * W * 0.08, y, L, T * 1.02, { bark: shift(BARK, (r() - 0.5) * 26), face: FACE, stubs: 0, quiet: i > 0, moss: 0 });
  }
}

const WOOD = { randomRotation: true, bleed: 0.05 };

export const woodDrawers = {
  log: (g: G, o: DrawInput) => drawLog(g, o),
  stump: (g: G, o: DrawInput) => drawStump(g, o),
};

export const woodKinds: ObjectKind[] = [
  kind({ key: 'log_birch', family: 'wood', name: 'Birkestamme', w: 3.2, h: 0.8, keepAspect: false, sizeJitter: 0.15, shadow: 6, ...WOOD, tags: ['arctic', 'village'], draw: (g, o) => drawLog(g, o, { bark: [224, 222, 212], face: [214, 184, 140], birch: true, stubs: 1 }) }),
  kind({ key: 'log_rotten', family: 'wood', name: 'Rådden stamme', w: 3.4, h: 0.9, keepAspect: false, sizeJitter: 0.15, shadow: 5, ...WOOD, tags: ['swamp', 'ruin'], draw: (g, o) => drawLog(g, o, { bark: [84, 64, 44], face: [146, 112, 76], rotten: true, fungi: true, moss: 0.8, stubs: 2 }) }),
  kind({ key: 'log_hollow', family: 'wood', name: 'Hul stamme', w: 3.4, h: 1.1, keepAspect: false, sizeJitter: 0.15, shadow: 7, ...WOOD, tags: ['cave', 'ruin'], draw: (g, o) => drawLog(g, o, { bark: [100, 74, 50], face: [186, 150, 104], hollow: true, moss: 0.4, stubs: 1 }) }),
  kind({ key: 'log_pile', family: 'wood', name: 'Stammebunke', w: 2.4, h: 1.6, keepAspect: false, sizeJitter: 0.1, shadow: 6, ...WOOD, randomRotation: false, tags: ['village', 'farm', 'camp'], draw: drawLogPile }),
  kind({ key: 'stump_big', family: 'wood', name: 'Stor stub', w: 1.8, h: 1.8, sizeJitter: 0.2, shadow: 8, ...WOOD, tags: ['forest', 'farm'], draw: (g, o) => drawStump(g, o, { big: true }) }),
  kind({ key: 'stump_mossy', family: 'wood', name: 'Gammel stub med mos', w: 1.5, h: 1.5, sizeJitter: 0.2, shadow: 6, ...WOOD, tags: ['swamp', 'forest', 'ruin'], draw: (g, o) => drawStump(g, o, { moss: true, mushrooms: true }) }),
  kind({ key: 'branches', family: 'wood', name: 'Kvas', w: 1.6, h: 1.6, sizeJitter: 0.3, shadow: 3, ...WOOD, tags: ['camp', 'farm', 'grassland'], draw: (g, o) => drawBranches(g, o) }),
  kind({ key: 'branches_leaves', family: 'wood', name: 'Grene og visne blade', w: 1.8, h: 1.8, sizeJitter: 0.3, shadow: 2, ...WOOD, tags: ['forest', 'graveyard'], draw: (g, o) => drawBranches(g, o, true) }),
];
