import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from './registry';
import { blob, mix, polygon, rgb, rng, shift, smooth, type RGB } from './util';

// ---------------------------------------------------------------- træer

interface CrownLook {
  dark: RGB;
  light: RGB;
  clumps: number;
  /** Klumpernes størrelse som andel af radius. */
  clump: number;
  /** Hvor ujævn kronens rand er. */
  rough: number;
  /** Lyse pletter (fx birkens blade). */
  speck?: RGB;
}

function crown(g: CanvasRenderingContext2D, o: DrawInput, look: CrownLook): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  smooth(g, blob(R * 0.96, R * 0.96, look.rough, 14, r));
  g.fillStyle = rgb(shift(look.dark, -12));
  g.fill();
  for (let i = 0; i < look.clumps; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.68;
    const cx = Math.cos(a) * d;
    const cy = Math.sin(a) * d;
    const cr = R * look.clump * (0.8 + r() * 0.5);
    // lys fra øverst til venstre
    const lit = Math.min(1, Math.max(0, 0.5 - (cx + cy) / (R * 2.2) + (r() - 0.5) * 0.25));
    smooth(g, blob(cr, cr, 0.22, 9, r, cx, cy));
    g.fillStyle = rgb(mix(look.dark, look.light, lit * 0.7));
    g.fill();
    smooth(g, blob(cr * 0.66, cr * 0.62, 0.25, 8, r, cx - cr * 0.2, cy - cr * 0.22));
    g.fillStyle = rgb(mix(look.dark, look.light, Math.min(1, lit * 0.7 + 0.28)));
    g.fill();
  }
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.9;
    g.fillStyle = rgb(look.speck ?? mix(look.dark, look.light, r()), 0.7);
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.025, 0, Math.PI * 2);
    g.fill();
  }
}

const SEASONS: Record<string, { dark: RGB; light: RGB }> = {
  summer: { dark: [34, 84, 34], light: [128, 172, 68] },
  autumn: { dark: [120, 52, 22], light: [226, 156, 52] },
  spring: { dark: [60, 112, 48], light: [170, 204, 96] },
};

function broadTree(g: CanvasRenderingContext2D, o: DrawInput): void {
  const pal = SEASONS[param(o, 'season', 'summer')] ?? SEASONS.summer!;
  crown(g, o, { ...pal, clumps: 26, clump: 0.24, rough: 0.1 });
}

const oak = (g: CanvasRenderingContext2D, o: DrawInput) =>
  crown(g, o, { dark: [28, 70, 30], light: [104, 148, 58], clumps: 38, clump: 0.2, rough: 0.16 });
const birch = (g: CanvasRenderingContext2D, o: DrawInput) =>
  crown(g, o, { dark: [78, 126, 56], light: [190, 214, 112], clumps: 22, clump: 0.2, rough: 0.12, speck: [226, 236, 170] });

function conifer(g: CanvasRenderingContext2D, o: DrawInput, spikes: number, layers: number, long: number, look: { dark: RGB; light: RGB }): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const snow = param(o, 'snow', false);
  const dark: RGB = snow ? [70, 100, 92] : look.dark;
  const light: RGB = snow ? [226, 236, 240] : look.light;
  const n = spikes + Math.floor(r() * 3);
  for (let k = 0; k < layers; k++) {
    const t = k / (layers - 1);
    const rad = R * (0.98 - t * 0.7);
    const pts: [number, number][] = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 + k * 0.2;
      const rr = i % 2 === 0 ? rad : rad * (long + r() * 0.1);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    polygon(g, pts);
    g.fillStyle = rgb(mix(dark, light, t * 0.85));
    g.fill();
    g.strokeStyle = rgb(shift(dark, -14), 0.7);
    g.lineWidth = Math.max(0.6, R * 0.012);
    g.stroke();
    g.save();
    polygon(g, pts);
    g.clip();
    g.fillStyle = rgb(light, 0.14);
    g.beginPath();
    g.ellipse(-rad * 0.3, -rad * 0.3, rad * 0.7, rad * 0.55, -0.7, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

function deadTree(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  g.lineCap = 'round';
  const grow = (x: number, y: number, a: number, len: number, wd: number, depth: number) => {
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    g.strokeStyle = rgb(shift([78, 60, 44], depth * 8));
    g.lineWidth = wd;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x2, y2);
    g.stroke();
    if (depth < 3 && len > R * 0.08) {
      const n = 2 + (r() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) grow(x2, y2, a + (r() - 0.5) * 1.3, len * (0.6 + r() * 0.2), wd * 0.65, depth + 1);
    }
  };
  const arms = 6 + Math.floor(r() * 3);
  for (let i = 0; i < arms; i++) grow(0, 0, (i / arms) * Math.PI * 2 + r() * 0.5, R * 0.42, Math.max(1.5, R * 0.05), 0);
  g.fillStyle = rgb([70, 52, 38]);
  g.beginPath();
  g.arc(0, 0, R * 0.07, 0, Math.PI * 2);
  g.fill();
}

const snowParam: ParamDef = { key: 'snow', label: 'Sne', type: 'toggle', default: false };
const TREE = { randomRotation: true, sizeJitter: 0.2, bleed: 0.08 };

const trees: ObjectKind[] = [
  kind({
    key: 'tree_broad', family: 'tree', name: 'Løvtræ', w: 4, h: 4, shadow: 30, ...TREE, draw: broadTree,
    params: [{ key: 'season', label: 'Årstid', type: 'select', default: 'summer', options: [{ value: 'summer', label: 'Sommer' }, { value: 'spring', label: 'Forår' }, { value: 'autumn', label: 'Efterår' }] }],
  }),
  kind({ key: 'tree_oak', family: 'tree', name: 'Eg', w: 5, h: 5, shadow: 36, ...TREE, draw: oak }),
  kind({ key: 'tree_birch', family: 'tree', name: 'Birk', w: 3, h: 3, shadow: 22, ...TREE, draw: birch }),
  kind({ key: 'tree_spruce', family: 'tree', name: 'Gran', w: 3, h: 3, shadow: 26, ...TREE, params: [snowParam], draw: (g, o) => conifer(g, o, 11, 5, 0.62, { dark: [24, 64, 42], light: [86, 140, 80] }) }),
  kind({ key: 'tree_pine', family: 'tree', name: 'Fyr', w: 3.5, h: 3.5, shadow: 28, ...TREE, params: [snowParam], draw: (g, o) => conifer(g, o, 7, 4, 0.5, { dark: [52, 82, 40], light: [138, 160, 82] }) }),
  kind({ key: 'tree_dead', family: 'tree', name: 'Dødt træ', w: 3.5, h: 3.5, shadow: 10, ...TREE, draw: deadTree }),
];

// ---------------------------------------------------------------- sten

const ROCK: Record<string, { base: RGB; hi: RGB }> = {
  grey: { base: [128, 128, 122], hi: [186, 186, 176] },
  dark: { base: [84, 84, 86], hi: [138, 138, 142] },
  sandstone: { base: [172, 142, 104], hi: [226, 198, 152] },
};

function rockShape(g: CanvasRenderingContext2D, r: () => number, cx: number, cy: number, rx: number, ry: number, pal: { base: RGB; hi: RGB }, rot = 0): void {
  const pts = blob(rx * 0.95, ry * 0.95, 0.16, 9, r, cx, cy, rot);
  polygon(g, pts);
  g.fillStyle = rgb(pal.base);
  g.fill();
  g.save();
  polygon(g, pts);
  g.clip();
  g.fillStyle = rgb(pal.hi, 0.55);
  g.beginPath();
  g.ellipse(cx - rx * 0.25, cy - ry * 0.28, rx * 0.7, ry * 0.55, -0.6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,.28)';
  g.beginPath();
  g.ellipse(cx + rx * 0.35, cy + ry * 0.4, rx * 0.75, ry * 0.5, -0.6, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.lineWidth = Math.max(0.6, rx * 0.03);
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(cx + (r() - 0.5) * rx, cy + (r() - 0.5) * ry);
    g.lineTo(cx + (r() - 0.5) * rx * 1.4, cy + (r() - 0.5) * ry * 1.4);
    g.stroke();
  }
  g.restore();
  polygon(g, pts);
  g.strokeStyle = 'rgba(0,0,0,.55)';
  g.lineWidth = Math.max(0.8, rx * 0.04);
  g.lineJoin = 'round';
  g.stroke();
}

const rockParam: ParamDef = { key: 'rock', label: 'Type', type: 'select', default: 'grey', options: [{ value: 'grey', label: 'Grå' }, { value: 'dark', label: 'Mørk' }, { value: 'sandstone', label: 'Sandsten' }] };
const palOf = (o: DrawInput) => ROCK[param(o, 'rock', 'grey')] ?? ROCK.grey!;

function moss(g: CanvasRenderingContext2D, r: () => number, rx: number, ry: number): void {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `rgba(${70 + r() * 30},${120 + r() * 40},40,.7)`;
    smooth(g, blob(rx * (0.2 + r() * 0.25), ry * 0.16, 0.3, 7, r, (r() - 0.5) * rx * 1.1, (r() - 0.5) * ry * 1.1));
    g.fill();
  }
}

const rocks: ObjectKind[] = [
  kind({ key: 'rock_small', family: 'rock', name: 'Sten', w: 1, h: 1, keepAspect: false, randomRotation: true, sizeJitter: 0.3, shadow: 7, params: [rockParam], draw: (g, o) => rockShape(g, rng(o.seed), 0, 0, o.w / 2, o.h / 2, palOf(o)) }),
  kind({
    key: 'rock_boulder', family: 'rock', name: 'Kampesten', w: 2.2, h: 2, keepAspect: false, randomRotation: true, sizeJitter: 0.25, shadow: 12,
    params: [rockParam, { key: 'moss', label: 'Mos', type: 'toggle', default: true }],
    draw: (g, o) => {
      const r = rng(o.seed);
      rockShape(g, r, 0, 0, o.w / 2, o.h / 2, palOf(o));
      if (param(o, 'moss', true)) {
        g.save();
        g.beginPath();
        g.ellipse(0, 0, o.w * 0.45, o.h * 0.45, 0, 0, Math.PI * 2);
        g.clip();
        moss(g, r, o.w / 2, o.h / 2);
        g.restore();
      }
    },
  }),
  kind({
    key: 'rock_cluster', family: 'rock', name: 'Stenbunke', w: 2, h: 2, randomRotation: true, sizeJitter: 0.3, shadow: 6, bleed: 0.06, params: [rockParam],
    draw: (g, o) => {
      const r = rng(o.seed);
      const R = Math.min(o.w, o.h) / 2;
      const n = 5 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * R * 0.55;
        const s = R * (0.18 + r() * 0.22);
        rockShape(g, r, Math.cos(a) * d, Math.sin(a) * d, s, s * (0.75 + r() * 0.3), palOf(o), r() * 3);
      }
    },
  }),
  kind({
    key: 'rock_slab', family: 'rock', name: 'Flad sten', w: 2, h: 1.2, keepAspect: false, randomRotation: true, sizeJitter: 0.2, shadow: 4, params: [rockParam],
    draw: (g, o) => {
      const r = rng(o.seed);
      const pal = palOf(o);
      rockShape(g, r, 0, 0, o.w / 2, o.h / 2, { base: shift(pal.base, 10), hi: pal.hi });
      g.strokeStyle = 'rgba(0,0,0,.22)';
      g.lineWidth = Math.max(0.6, o.h * 0.02);
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(-o.w * 0.4, i * o.h * 0.13);
        g.lineTo(o.w * 0.4, i * o.h * 0.13 + (r() - 0.5) * o.h * 0.08);
        g.stroke();
      }
    },
  }),
];

// ---------------------------------------------------------------- planter

function bush(g: CanvasRenderingContext2D, o: DrawInput, berries: boolean): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const dark: RGB = [40, 92, 40];
  const light: RGB = [120, 170, 66];
  smooth(g, blob(R * 0.95, R * 0.95, 0.12, 11, r));
  g.fillStyle = rgb(shift(dark, -10));
  g.fill();
  for (let i = 0; i < 12; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.5;
    const cx = Math.cos(a) * d;
    const cy = Math.sin(a) * d;
    const cr = R * (0.3 + r() * 0.15);
    smooth(g, blob(cr, cr, 0.2, 8, r, cx, cy));
    g.fillStyle = rgb(mix(dark, light, Math.min(1, Math.max(0, 0.45 - (cx + cy) / (R * 2.5) + r() * 0.2))));
    g.fill();
  }
  if (berries) {
    const col: RGB = param(o, 'berry', 'red') === 'blue' ? [60, 70, 170] : [188, 36, 52];
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R * 0.75;
      g.fillStyle = rgb(col);
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.05, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function fern(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  g.lineCap = 'round';
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + r() * 0.3;
    const len = R * (0.7 + r() * 0.3);
    const col = mix([52, 104, 40], [130, 176, 76], r());
    g.strokeStyle = rgb(col);
    g.lineWidth = Math.max(1, R * 0.04);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(Math.cos(a + 0.25) * len * 0.5, Math.sin(a + 0.25) * len * 0.5, Math.cos(a) * len, Math.sin(a) * len);
    g.stroke();
    for (let k = 1; k <= 7; k++) {
      const t = k / 8;
      const px = Math.cos(a) * len * t + Math.cos(a + 0.25) * len * 0.06 * Math.sin(t * Math.PI);
      const py = Math.sin(a) * len * t + Math.sin(a + 0.25) * len * 0.06 * Math.sin(t * Math.PI);
      const ll = R * 0.22 * (1 - t * 0.7);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + Math.cos(a + s * 1.1) * ll, py + Math.sin(a + s * 1.1) * ll);
        g.lineWidth = Math.max(0.8, R * 0.025);
        g.stroke();
      }
    }
  }
}

function reeds(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.5;
    const bx = Math.cos(a) * d;
    const by = Math.sin(a) * d;
    const ang = a + (r() - 0.5) * 1.2;
    const len = R * (0.35 + r() * 0.4);
    g.strokeStyle = rgb(mix([60, 104, 40], [150, 176, 80], r()));
    g.lineWidth = Math.max(0.8, R * 0.03);
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(bx + Math.cos(ang) * len * 0.6 + (r() - 0.5) * R * 0.2, by + Math.sin(ang) * len * 0.6, bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
    g.stroke();
  }
}

const FLOWER: Record<string, RGB> = { white: [244, 244, 232], yellow: [244, 206, 60], purple: [150, 90, 190], red: [214, 60, 60] };

function flowers(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  for (let i = 0; i < 12; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.7;
    g.fillStyle = rgb(mix([60, 110, 44], [110, 160, 66], r()), 0.9);
    smooth(g, blob(R * 0.2, R * 0.2, 0.25, 7, r, Math.cos(a) * d, Math.sin(a) * d));
    g.fill();
  }
  const col = FLOWER[param(o, 'color', 'yellow')] ?? FLOWER.yellow!;
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.8;
    g.fillStyle = rgb(mix(col, [255, 255, 255], r() * 0.25));
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.05, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(80,50,10,.8)';
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.018, 0, Math.PI * 2);
    g.fill();
  }
}

const PLANT = { randomRotation: true, sizeJitter: 0.25, bleed: 0.06 };
const plants: ObjectKind[] = [
  kind({ key: 'bush', family: 'plant', name: 'Busk', w: 1.5, h: 1.5, shadow: 8, ...PLANT, draw: (g, o) => bush(g, o, false) }),
  kind({
    key: 'bush_berry', family: 'plant', name: 'Bærbusk', w: 1.5, h: 1.5, shadow: 8, ...PLANT, draw: (g, o) => bush(g, o, true),
    params: [{ key: 'berry', label: 'Bær', type: 'select', default: 'red', options: [{ value: 'red', label: 'Røde' }, { value: 'blue', label: 'Blå' }] }],
  }),
  kind({ key: 'fern', family: 'plant', name: 'Bregne', w: 1.2, h: 1.2, shadow: 2, ...PLANT, draw: fern }),
  kind({ key: 'reeds', family: 'plant', name: 'Siv', w: 1.5, h: 1.5, ...PLANT, bleed: 0.1, draw: reeds }),
  kind({
    key: 'flowers', family: 'plant', name: 'Blomster', w: 1.5, h: 1.5, ...PLANT, draw: flowers,
    params: [{ key: 'color', label: 'Farve', type: 'select', default: 'yellow', options: [{ value: 'yellow', label: 'Gul' }, { value: 'white', label: 'Hvid' }, { value: 'purple', label: 'Lilla' }, { value: 'red', label: 'Rød' }] }],
  }),
];

// ---------------------------------------------------------------- træstammer

function trunk(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const L = o.w;
  const T = o.h;
  const x0 = -L / 2;
  const body = (g2: CanvasRenderingContext2D) => {
    g2.beginPath();
    g2.moveTo(x0 + T / 2, -T / 2);
    g2.lineTo(L / 2 - T / 2, -T / 2);
    g2.ellipse(L / 2 - T / 2, 0, T / 2, T / 2, 0, -Math.PI / 2, Math.PI / 2);
    g2.lineTo(x0 + T / 2, T / 2);
    g2.ellipse(x0 + T / 2, 0, T / 2, T / 2, 0, Math.PI / 2, (Math.PI * 3) / 2);
    g2.closePath();
  };
  body(g);
  const gr = g.createLinearGradient(0, -T / 2, 0, T / 2);
  gr.addColorStop(0, 'rgb(142,104,70)');
  gr.addColorStop(0.5, 'rgb(112,80,52)');
  gr.addColorStop(1, 'rgb(70,48,32)');
  g.fillStyle = gr;
  g.fill();
  g.save();
  body(g);
  g.clip();
  g.strokeStyle = 'rgba(30,18,10,.35)';
  g.lineWidth = Math.max(0.7, T * 0.04);
  for (let i = 0; i < 7; i++) {
    const y = -T / 2 + ((i + 0.5) / 7) * T;
    g.beginPath();
    g.moveTo(x0, y);
    for (let x = x0; x <= L / 2; x += L / 12) g.lineTo(x, y + (r() - 0.5) * T * 0.08);
    g.stroke();
  }
  if (param(o, 'moss', false)) {
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(${70 + r() * 30},${120 + r() * 40},40,.75)`;
      smooth(g, blob(T * (0.3 + r() * 0.3), T * 0.18, 0.3, 7, r, x0 + r() * L, (r() - 0.5) * T * 0.7));
      g.fill();
    }
  }
  g.restore();
  body(g);
  g.strokeStyle = 'rgba(0,0,0,.55)';
  g.lineWidth = Math.max(0.8, T * 0.05);
  g.stroke();
  const cx = L / 2 - T / 2;
  for (let i = 3; i >= 0; i--) {
    g.fillStyle = i % 2 ? 'rgb(206,168,118)' : 'rgb(180,138,90)';
    g.beginPath();
    g.arc(cx, 0, (T / 2) * 0.225 * (i + 1) * 1.8 * 0.5, 0, Math.PI * 2);
    g.fill();
  }
}

function stump(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  smooth(g, blob(R, R, 0.06, 14, r));
  g.fillStyle = 'rgb(86,60,40)';
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)';
  g.lineWidth = Math.max(1, R * 0.05);
  g.stroke();
  for (let i = 5; i >= 0; i--) {
    g.fillStyle = i % 2 ? 'rgb(206,168,118)' : 'rgb(184,142,94)';
    g.beginPath();
    g.arc(0, 0, R * 0.82 * ((i + 1) / 6), 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgba(60,36,16,.5)';
  g.lineWidth = Math.max(0.6, R * 0.03);
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(R * 0.6, -R * 0.3);
  g.stroke();
}

const woods: ObjectKind[] = [
  kind({ key: 'log', family: 'wood', name: 'Væltet stamme', w: 3.5, h: 0.9, keepAspect: false, randomRotation: true, sizeJitter: 0.15, shadow: 6, bleed: 0.03, params: [{ key: 'moss', label: 'Mos', type: 'toggle', default: false }], draw: trunk }),
  kind({ key: 'stump', family: 'wood', name: 'Stub', w: 1.1, h: 1.1, randomRotation: true, sizeJitter: 0.2, shadow: 5, draw: stump }),
];

export const natureKinds: ObjectKind[] = [...trees, ...rocks, ...plants, ...woods];
