import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { blob, mix, rgb, rng, shift, smooth, softDot, type RGB } from '../util';
import { blobP, contact, ellP, facetStone, OUT, sphere, speckle } from './helpers';

type G = CanvasRenderingContext2D;

// ---------------------------------------------------------------- svampe

function cap(g: G, x: number, y: number, rad: number, base: RGB, spot: RGB | null, r: () => number, gills = false): void {
  contact(g, x + rad * 0.12, y + rad * 0.15, rad * 1.05, rad * 1.0, 0.4);
  sphere(g, x, y, rad, base, Math.max(1, rad * 0.1), rad * 0.94);
  g.beginPath();
  g.ellipse(x, y, rad * 0.86, rad * 0.8, 0, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(0,0,0,.16)';
  g.lineWidth = rad * 0.12;
  g.stroke();
  if (gills) {
    g.strokeStyle = 'rgba(60,35,15,.22)';
    g.lineWidth = Math.max(0.5, rad * 0.03);
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.28;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * rad * 0.25, y + Math.sin(a) * rad * 0.25);
      g.lineTo(x + Math.cos(a) * rad * 0.8, y + Math.sin(a) * rad * 0.75);
      g.stroke();
    }
  }
  if (spot) {
    const n = 4 + ((r() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28;
      const d = Math.sqrt(r()) * rad * 0.62;
      const s = rad * (0.07 + r() * 0.1);
      g.beginPath();
      g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.92, s, s * 0.85, 0, 0, Math.PI * 2);
      g.fillStyle = rgb(spot, 0.92);
      g.fill();
    }
  }
  g.beginPath();
  g.ellipse(x - rad * 0.3, y - rad * 0.38, rad * 0.32, rad * 0.16, -0.7, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,240,.38)';
  g.fill();
}

function mushrooms(g: G, o: DrawInput, base: RGB, spot: RGB | null, glow: RGB | null, gills: boolean): void {
  const r = rng(o.seed);
  const R = (Math.min(o.w, o.h) / 2) * 1.2;
  if (glow) softDot(g, 0, 0, R * 1.35, glow, 0.5);
  const n = 3 + ((r() * 3) | 0);
  const caps: { x: number; y: number; s: number }[] = [{ x: -R * 0.08, y: -R * 0.04, s: R * (0.4 + r() * 0.08) }];
  const a0 = r() * 6.28;
  for (let i = 1; i < n; i++) {
    const a = a0 + (i / (n - 1)) * 6.28 + (r() - 0.5) * 0.6;
    const s = R * (0.17 + r() * 0.13);
    const d = R * 0.5 + s * 0.45 + r() * R * 0.1;
    caps.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.92, s });
  }
  caps.sort((p, q) => p.y - q.y);
  for (const c of caps) cap(g, c.x, c.y, c.s, mix(base, shift(base, r() > 0.5 ? 18 : -18), 0.6), spot, r, gills);
}

const GLOW: Record<string, RGB> = { blue: [90, 190, 255], green: [110, 255, 150], purple: [200, 120, 255] };

const mushroomKinds: ObjectKind[] = [
  kind({ key: 'mush_red', family: 'mushroom', name: 'Fluesvampe', w: 1, h: 1, randomRotation: true, sizeJitter: 0.25, shadow: 3, bleed: 0.06, draw: (g, o) => mushrooms(g, o, [196, 48, 40], [250, 244, 230], null, false) }),
  kind({
    key: 'mush_brown', family: 'mushroom', name: 'Brune svampe', w: 1, h: 1, randomRotation: true, sizeJitter: 0.25, shadow: 3, bleed: 0.06,
    params: [{ key: 'tone', label: 'Farve', type: 'select', default: 'brown', options: [{ value: 'brown', label: 'Brun' }, { value: 'pale', label: 'Bleg' }] }],
    draw: (g, o) => mushrooms(g, o, param(o, 'tone', 'brown') === 'pale' ? [214, 192, 150] : [146, 96, 56], null, null, true),
  }),
  kind({
    key: 'mush_glow', family: 'mushroom', name: 'Lysende svampe', w: 1, h: 1, randomRotation: true, sizeJitter: 0.25, shadow: 0, bleed: 0.4, layers: ['objects', 'effects'],
    params: [{ key: 'color', label: 'Glød', type: 'select', default: 'blue', options: [{ value: 'blue', label: 'Blå' }, { value: 'green', label: 'Grøn' }, { value: 'purple', label: 'Lilla' }] }],
    draw: (g, o) => {
      const c = GLOW[param(o, 'color', 'blue')] ?? GLOW.blue!;
      mushrooms(g, o, mix(c, [40, 60, 90], 0.35), mix(c, [255, 255, 255], 0.7), c, false);
    },
  }),
];

// ---------------------------------------------------------------- høje græstotter

function blade(g: G, x: number, y: number, ang: number, len: number, wid: number, base: RGB, bend: number): void {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const tx = x + dx * len + nx * bend, ty = y + dy * len + ny * bend;
  const mxp = x + dx * len * 0.55 + nx * (bend * 0.5);
  const myp = y + dy * len * 0.55 + ny * (bend * 0.5);
  g.beginPath();
  g.moveTo(x + nx * wid, y + ny * wid);
  g.quadraticCurveTo(mxp + nx * wid * 0.7, myp + ny * wid * 0.7, tx, ty);
  g.quadraticCurveTo(mxp - nx * wid * 0.7, myp - ny * wid * 0.7, x - nx * wid, y - ny * wid);
  g.closePath();
  const gr = g.createLinearGradient(x, y, tx, ty);
  gr.addColorStop(0, rgb(shift(base, -42)));
  gr.addColorStop(1, rgb(shift(base, 26)));
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(15,28,6,.5)';
  g.lineWidth = 0.6;
  g.stroke();
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(mxp, myp, tx, ty);
  g.strokeStyle = 'rgba(255,255,200,.16)';
  g.stroke();
}

const GRASS: Record<string, RGB> = { green: [98, 142, 54], gold: [196, 168, 82], dry: [148, 128, 80] };

function tuft(g: G, x: number, y: number, R: number, base: RGB, r: () => number): void {
  softDot(g, x + R * 0.1, y + R * 0.12, R * 1.0, [12, 20, 6], 0.38);
  const n = 16 + ((r() * 6) | 0);
  const a0 = r() * 6.28;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * 6.28 + (r() - 0.5) * 0.3;
    blade(g, x, y, a, R * (0.7 + r() * 0.3), R * 0.07, shift(base, (r() - 0.5) * 24), (r() - 0.5) * R * 0.55);
  }
  for (let i = 0; i < 9; i++) {
    const a = a0 + 0.3 + (i / 9) * 6.28 + (r() - 0.5) * 0.5;
    blade(g, x, y, a, R * (0.38 + r() * 0.22), R * 0.06, shift(base, 12 + (r() - 0.5) * 20), (r() - 0.5) * R * 0.3);
  }
}

const grassParam = [{ key: 'tone', label: 'Farve', type: 'select' as const, default: 'green', options: [{ value: 'green', label: 'Grøn' }, { value: 'gold', label: 'Gylden' }, { value: 'dry', label: 'Tør' }] }];

const grassKinds: ObjectKind[] = [
  kind({
    key: 'grass_tuft', family: 'tallgrass', name: 'Høj græstot', w: 1, h: 1, randomRotation: true, sizeJitter: 0.25, shadow: 0, bleed: 0.1, params: grassParam,
    draw: (g, o) => tuft(g, 0, 0, Math.min(o.w, o.h) / 2, GRASS[param(o, 'tone', 'green')] ?? GRASS.green!, rng(o.seed)),
  }),
  kind({
    key: 'grass_dense', family: 'tallgrass', name: 'Tæt græs', w: 2, h: 2, randomRotation: true, sizeJitter: 0.15, shadow: 0, bleed: 0.08, params: grassParam,
    draw: (g, o) => {
      const r = rng(o.seed);
      const R = Math.min(o.w, o.h) / 2;
      const base = GRASS[param(o, 'tone', 'green')] ?? GRASS.green!;
      softDot(g, 0, 0, R * 1.0, [20, 34, 8], 0.22);
      const ts: { x: number; y: number; s: number }[] = [];
      for (let i = 0; i < 9; i++) {
        const a = r() * 6.28;
        const d = Math.sqrt(r()) * R * 0.55;
        ts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: R * (0.32 + r() * 0.2) });
      }
      ts.sort((p, q) => p.y - q.y);
      for (const t of ts) tuft(g, t.x, t.y, t.s, base, r);
    },
  }),
];

// ---------------------------------------------------------------- vandplanter

function pad(g: G, x: number, y: number, rad: number, rot: number, base: RGB, r: () => number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.ellipse(0, 0, rad * 1.2, rad * 1.2, 0, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(255,255,255,.13)';
  g.lineWidth = rad * 0.1;
  g.stroke();
  const notch = 0.22;
  const path = () => {
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, rad, notch, Math.PI * 2 - notch);
    g.closePath();
  };
  contact(g, rad * 0.1, rad * 0.12, rad * 1.05, rad * 1.0, 0.35);
  path();
  const gr = g.createRadialGradient(-rad * 0.3, -rad * 0.3, rad * 0.1, 0, 0, rad);
  gr.addColorStop(0, rgb(shift(base, 38)));
  gr.addColorStop(1, rgb(shift(base, -30)));
  g.fillStyle = gr;
  g.fill();
  g.save();
  path();
  g.clip();
  g.strokeStyle = 'rgba(20,50,20,.35)';
  g.lineWidth = Math.max(0.6, rad * 0.03);
  for (let i = 0; i < 9; i++) {
    const a = notch + 0.15 + (i / 8) * (Math.PI * 2 - 2 * notch - 0.3);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    g.stroke();
  }
  speckle(g, r, [-rad, -rad, rad, rad], 6, shift(base, 20), 0.35, rad * 0.05);
  g.restore();
  path();
  g.strokeStyle = 'rgba(10,30,10,.8)';
  g.lineWidth = Math.max(1, rad * 0.06);
  g.stroke();
  g.restore();
}

function lily(g: G, x: number, y: number, rad: number, col: RGB): void {
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28 + ring * 0.45;
      const rr = rad * (ring ? 0.55 : 0.85);
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(rr * 0.5, -rr * 0.38, rr, 0);
      g.quadraticCurveTo(rr * 0.5, rr * 0.38, 0, 0);
      g.fillStyle = rgb(shift(col, ring ? 22 : -4));
      g.fill();
      g.strokeStyle = 'rgba(90,20,50,.5)';
      g.lineWidth = 0.6;
      g.stroke();
      g.restore();
    }
  }
  sphere(g, x, y, rad * 0.2, [240, 200, 60], 0.6);
}

const lilyKinds: ObjectKind[] = [
  kind({
    key: 'lilypads', family: 'waterplant', name: 'Åkander', w: 2, h: 2, randomRotation: true, sizeJitter: 0.2, shadow: 2, bleed: 0.12,
    params: [
      { key: 'flower', label: 'Blomster', type: 'toggle', default: true },
      { key: 'tone', label: 'Farve', type: 'select', default: 'pink', options: [{ value: 'pink', label: 'Lyserød' }, { value: 'white', label: 'Hvid' }] },
    ],
    draw: (g, o) => {
      const r = rng(o.seed);
      const R = Math.min(o.w, o.h) / 2;
      const pads: { x: number; y: number; s: number }[] = [];
      for (let t = 0; t < 40 && pads.length < 6; t++) {
        const a = r() * 6.28;
        const d = Math.sqrt(r()) * R * 0.6;
        const s = R * (0.22 + r() * 0.2);
        const x = Math.cos(a) * d, y = Math.sin(a) * d;
        if (pads.every((p) => Math.hypot(p.x - x, p.y - y) > (p.s + s) * 0.9)) pads.push({ x, y, s });
      }
      for (const p of pads) pad(g, p.x, p.y, p.s, r() * 6.28, mix([62, 128, 66], [96, 150, 60], r()), r);
      if (param(o, 'flower', true)) {
        const col: RGB = param(o, 'tone', 'pink') === 'white' ? [248, 244, 240] : [238, 138, 176];
        const p = pads[0];
        if (p) lily(g, p.x, p.y, p.s * 0.55, col);
        const q = pads[3];
        if (q) lily(g, q.x, q.y, q.s * 0.4, col);
      }
    },
  }),
  kind({
    key: 'stepping_stones', family: 'waterplant', name: 'Vadesten', w: 3, h: 1, keepAspect: false, randomRotation: false, shadow: 3, bleed: 0.1,
    params: [{ key: 'water', label: 'Vandkrusninger', type: 'toggle', default: true }],
    draw: (g, o) => {
      const r = rng(o.seed);
      const { w, h } = o;
      const n = 5;
      const st: { x: number; y: number; rx: number; ry: number }[] = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        st.push({ x: -w * 0.4 + t * w * 0.8, y: Math.sin(t * 3.4 + r()) * h * 0.2, rx: h * (0.26 + r() * 0.1), ry: h * (0.2 + r() * 0.1) });
      }
      for (const s of st) {
        if (param(o, 'water', true)) {
          for (const k of [1.5, 1.28]) {
            g.beginPath();
            g.ellipse(s.x, s.y, s.rx * k, s.ry * k, 0, 0, Math.PI * 2);
            g.strokeStyle = `rgba(255,255,255,${k > 1.4 ? 0.14 : 0.24})`;
            g.lineWidth = 1.2;
            g.stroke();
          }
        }
        softDot(g, s.x, s.y, s.rx * 1.3, [10, 20, 30], 0.28);
        const pts = blob(s.rx, s.ry, 0.12, 10, r, s.x, s.y, r() * 3);
        blobP(g, pts, mix([128, 126, 118], [108, 112, 104], r()), { lw: 1.8 });
        g.save();
        smooth(g, pts);
        g.clip();
        speckle(g, r, [s.x - s.rx, s.y - s.ry, s.x + s.rx, s.y + s.ry], 14, [120, 118, 110], 0.5, 1.2);
        g.beginPath();
        g.ellipse(s.x + s.rx * 0.2, s.y + s.ry * 0.5, s.rx, s.ry * 0.5, 0, 0, Math.PI * 2);
        g.fillStyle = 'rgba(30,50,60,.22)'; // våd kant
        g.fill();
        g.restore();
      }
    },
  }),
];

// ---------------------------------------------------------------- blade, rødder, blomsterbed

const LEAF: Record<string, RGB[]> = {
  autumn: [[206, 96, 34], [226, 160, 40], [170, 52, 30], [200, 124, 36]],
  green: [[82, 134, 52], [108, 156, 60], [64, 112, 48]],
  brown: [[130, 92, 52], [106, 74, 42], [150, 112, 66]],
};

function leaf(g: G, x: number, y: number, len: number, ang: number, base: RGB): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const w = len * 0.42;
  const path = () => {
    g.beginPath();
    g.moveTo(-len, 0);
    g.quadraticCurveTo(-len * 0.1, -w * 1.5, len, 0);
    g.quadraticCurveTo(-len * 0.1, w * 1.5, -len, 0);
    g.closePath();
  };
  path();
  const gr = g.createLinearGradient(0, -w, 0, w);
  gr.addColorStop(0, rgb(shift(base, 24)));
  gr.addColorStop(1, rgb(shift(base, -26)));
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(30,14,6,.6)';
  g.lineWidth = Math.max(0.6, len * 0.07);
  g.stroke();
  g.beginPath();
  g.moveTo(-len * 1.05, 0);
  g.lineTo(len * 0.8, 0);
  g.strokeStyle = 'rgba(40,20,8,.5)';
  g.lineWidth = Math.max(0.5, len * 0.06);
  g.stroke();
  g.restore();
}

const leafParam = [{ key: 'tone', label: 'Årstid', type: 'select' as const, default: 'autumn', options: [{ value: 'autumn', label: 'Efterår' }, { value: 'green', label: 'Grøn' }, { value: 'brown', label: 'Visne' }] }];

function root(g: G, x0: number, y0: number, ang: number, len: number, wid: number, base: RGB, r: () => number): void {
  const pts: [number, number][] = [[x0, y0]];
  let a = ang;
  let x = x0, y = y0;
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    a += (r() - 0.5) * 0.7;
    x += Math.cos(a) * (len / steps);
    y += Math.sin(a) * (len / steps);
    pts.push([x, y]);
  }
  const pass = (wMul: number, col: string, dx: number, dy: number, grow: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const t = i / (pts.length - 1);
      g.beginPath();
      g.moveTo(pts[i]![0] + dx, pts[i]![1] + dy);
      g.lineTo(pts[i + 1]![0] + dx, pts[i + 1]![1] + dy);
      g.lineCap = 'round';
      g.lineWidth = Math.max(0.8, (wid * (1 - t * 0.85) + grow) * wMul);
      g.strokeStyle = col;
      g.stroke();
    }
  };
  pass(1, OUT, 0, 0, 2);
  pass(1, rgb(base), 0, 0, 0);
  pass(0.45, rgb(shift(base, 26), 0.7), -wid * 0.12, -wid * 0.12, 0);
  pass(0.3, 'rgba(0,0,0,.25)', wid * 0.15, wid * 0.15, 0);
  g.lineCap = 'butt';
}

const natureMisc: ObjectKind[] = [
  kind({
    key: 'leaves_fallen', family: 'groundcover', name: 'Nedfaldne blade', w: 2, h: 2, layers: ['ground', 'objects', 'effects'], randomRotation: true, sizeJitter: 0.2, shadow: 0, bleed: 0.05, params: leafParam,
    draw: (g, o) => {
      const r = rng(o.seed);
      const pal = LEAF[param(o, 'tone', 'autumn')] ?? LEAF.autumn!;
      const R = Math.min(o.w, o.h) / 2;
      const n = 26;
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28;
        const d = Math.sqrt(r()) * R * 0.88;
        leaf(g, Math.cos(a) * d, Math.sin(a) * d, R * (0.08 + r() * 0.07), r() * 6.28, shift(pal[(r() * pal.length) | 0]!, (r() - 0.5) * 24));
      }
    },
  }),
  kind({
    key: 'tree_roots', family: 'groundcover', name: 'Trærødder', w: 2, h: 2, randomRotation: true, sizeJitter: 0.1, shadow: 4, bleed: 0.06,
    params: [
      { key: 'stub', label: 'Savet stub', type: 'toggle', default: true },
      { key: 'moss', label: 'Mos', type: 'toggle', default: false },
    ],
    draw: (g, o) => {
      const r = rng(o.seed);
      const R = Math.min(o.w, o.h) / 2;
      const bark: RGB = [104, 76, 50];
      const n = 6 + ((r() * 2) | 0);
      const a0 = r() * 6.28;
      for (let i = 0; i < n; i++) root(g, 0, 0, a0 + (i / n) * 6.28 + (r() - 0.5) * 0.4, R * (0.65 + r() * 0.3), R * 0.2, bark, r);
      const cr = R * 0.38;
      ellP(g, 0, 0, cr, cr * 0.96, param(o, 'stub', true) ? [196, 156, 104] : [86, 62, 40], { lw: Math.max(1.4, R * 0.06) });
      if (param(o, 'stub', true)) {
        g.strokeStyle = 'rgba(100,64,30,.5)';
        g.lineWidth = Math.max(0.6, R * 0.025);
        for (const k of [0.8, 0.6, 0.4, 0.2]) {
          g.beginPath();
          g.ellipse(R * 0.02, 0, cr * k, cr * k * 0.96, 0, 0, Math.PI * 2);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(cr * 0.85, -cr * 0.25);
        g.stroke();
      } else {
        g.save();
        g.beginPath();
        g.ellipse(0, 0, cr, cr * 0.96, 0, 0, Math.PI * 2);
        g.clip();
        speckle(g, r, [-cr, -cr, cr, cr], 30, [90, 66, 44], 0.5, 1.5);
        g.restore();
      }
      if (param(o, 'moss', false)) {
        for (let i = 0; i < 16; i++) {
          const a = r() * 6.28;
          const d = R * (0.2 + r() * 0.6);
          softDot(g, Math.cos(a) * d, Math.sin(a) * d, R * (0.07 + r() * 0.1), [84, 140, 52], 0.85);
        }
      }
    },
  }),
  kind({
    key: 'flowerbed', family: 'groundcover', name: 'Blomsterbed', w: 2, h: 1, keepAspect: false, shadow: 3, bleed: 0.03,
    params: [{ key: 'flowers', label: 'Blomster', type: 'select', default: 'mixed', options: [{ value: 'mixed', label: 'Blandede' }, { value: 'red', label: 'Røde' }, { value: 'blue', label: 'Blå' }, { value: 'yellow', label: 'Gule' }] }],
    draw: (g, o) => {
      const r = rng(o.seed);
      const { w, h } = o;
      // brædderamme
      const frame = () => {
        g.beginPath();
        g.rect(-w / 2, -h / 2, w, h);
      };
      frame();
      g.fillStyle = 'rgb(122,86,50)';
      g.fill();
      const b = Math.min(w, h) * 0.12;
      const gr = g.createLinearGradient(0, -h / 2, w * 0.3, h / 2);
      gr.addColorStop(0, 'rgb(86,58,36)');
      gr.addColorStop(1, 'rgb(52,34,22)');
      g.beginPath();
      g.rect(-w / 2 + b, -h / 2 + b, w - b * 2, h - b * 2);
      g.fillStyle = gr;
      g.fill();
      g.save();
      g.clip();
      speckle(g, r, [-w / 2, -h / 2, w / 2, h / 2], 90, [70, 48, 30], 0.6, 1.1);
      g.restore();
      g.strokeStyle = 'rgba(255,230,180,.28)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(-w / 2 + 1, h / 2 - 1);
      g.lineTo(-w / 2 + 1, -h / 2 + 1);
      g.lineTo(w / 2 - 1, -h / 2 + 1);
      g.stroke();
      frame();
      g.strokeStyle = OUT;
      g.lineWidth = 1.8;
      g.stroke();
      const pick = param(o, 'flowers', 'mixed');
      const pals: Record<string, RGB[]> = { mixed: [[220, 60, 70], [240, 200, 60], [150, 100, 210], [250, 250, 245]], red: [[214, 50, 60], [236, 90, 80]], blue: [[80, 110, 220], [130, 150, 240]], yellow: [[244, 210, 60], [250, 170, 40]] };
      const pal = pals[pick] ?? pals.mixed!;
      const items: { x: number; y: number }[] = [];
      for (let i = 0; i < 22; i++) items.push({ x: (r() - 0.5) * (w - b * 3.4), y: (r() - 0.5) * (h - b * 3.4) });
      items.sort((p, q) => p.y - q.y);
      for (const it of items) {
        const lr = h * 0.1;
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * 6.28 + r();
          leaf(g, it.x + Math.cos(a) * lr * 0.7, it.y + Math.sin(a) * lr * 0.7, lr * 0.7, a, [64, 120, 48]);
        }
        const col = pal[(r() * pal.length) | 0]!;
        const pr = h * 0.055;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * 6.28;
          sphere(g, it.x + Math.cos(a) * pr, it.y + Math.sin(a) * pr, pr * 0.85, col, 0.5);
        }
        sphere(g, it.x, it.y, pr * 0.7, [250, 214, 80], 0.4);
      }
    },
  }),
];

// ---------------------------------------------------------------- sten

function rune(g: G, x: number, y: number, s: number, r: () => number): void {
  g.beginPath();
  g.moveTo(x, y - s);
  g.lineTo(x, y + s);
  for (let i = 0; i < 3; i++) {
    const yy = y + (r() * 1.6 - 0.8) * s;
    const dir = r() > 0.5 ? 1 : -1;
    g.moveTo(x, yy);
    g.lineTo(x + dir * s * (0.4 + r() * 0.4), yy + (r() - 0.3) * s * 0.7);
  }
  g.stroke();
}

function menhir(g: G, o: DrawInput, runes: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const glow = runes && param(o, 'glow', true);
  const rx = w * 0.47, ry = h * 0.47;
  if (glow) softDot(g, 0, 0, Math.max(w, h) * 0.8, [110, 200, 255], 0.35);
  const base: RGB = [132, 130, 124];
  g.save();
  const pts = facetStone(g, rx, ry, r, base, 8, 0.14, Math.max(1.5, w * 0.04));
  g.restore();
  g.save();
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.clip();
  speckle(g, r, [-rx, -ry, rx, ry], 40, [120, 118, 112], 0.4, 1.1);
  // mos i nederste højre side
  for (let i = 0; i < 6; i++) softDot(g, rx * (0.2 + r() * 0.7) * (r() > 0.5 ? 1 : -0.6), ry * (0.1 + r() * 0.7), rx * (0.15 + r() * 0.15), [86, 130, 56], runes ? 0.3 : 0.55);
  if (runes) {
    g.lineWidth = Math.max(1.4, w * 0.045);
    g.lineCap = 'round';
    const cols = glow ? 'rgba(140,225,255,.95)' : 'rgba(40,36,34,.75)';
    for (const [dx, dy] of [[-0.18, -0.15], [0.12, 0.1], [-0.05, 0.28]] as const) {
      g.strokeStyle = glow ? 'rgba(80,170,255,.45)' : 'rgba(255,255,255,.12)';
      g.save();
      g.translate(0.6, 0.8);
      rune(g, rx * dx * 1.4, ry * dy * 1.4, ry * 0.3, rng(o.seed + 5 + ((dx * 100) | 0)));
      g.restore();
      g.strokeStyle = cols;
      rune(g, rx * dx * 1.4, ry * dy * 1.4, ry * 0.3, rng(o.seed + 5 + ((dx * 100) | 0)));
    }
  }
  g.restore();
}

const megalithKinds: ObjectKind[] = [
  kind({ key: 'standing_stone', family: 'megalith', name: 'Stendysse', w: 1, h: 1, randomRotation: true, sizeJitter: 0.15, shadow: 6, bleed: 0.06, draw: (g, o) => menhir(g, o, false) }),
  kind({
    key: 'rune_stone', family: 'megalith', name: 'Runesten', w: 1, h: 1, randomRotation: true, sizeJitter: 0.1, shadow: 6, bleed: 0.5,
    params: [{ key: 'glow', label: 'Lysende', type: 'toggle', default: true }],
    draw: (g, o) => menhir(g, o, true),
  }),
  kind({
    key: 'dolmen', family: 'megalith', name: 'Dolmen', w: 3, h: 2, keepAspect: false, randomRotation: false, shadow: 8, bleed: 0.05,
    draw: (g, o) => {
      const r = rng(o.seed);
      const { w, h } = o;
      const base: RGB = [128, 126, 120];
      // bærende sten (set oppefra skjules de af dækstenen; vis dem i kanten)
      for (const [x, y] of [[-0.36, -0.32], [-0.36, 0.34], [0.36, -0.3], [0.36, 0.32]] as const) {
        g.save();
        g.translate(w * x, h * y);
        facetStone(g, w * 0.1, h * 0.13, r, shift(base, -14), 7, 0.15, 1.5);
        g.restore();
      }
      // dæksten
      contact(g, w * 0.03, h * 0.05, w * 0.5, h * 0.4, 0.3);
      const pts = facetStone(g, w * 0.43, h * 0.36, r, shift(base, 10), 10, 0.1, Math.max(2, w * 0.03));
      g.save();
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath();
      g.clip();
      speckle(g, r, [-w / 2, -h / 2, w / 2, h / 2], 70, [118, 116, 108], 0.4, 1.4);
      for (let i = 0; i < 7; i++) softDot(g, (r() - 0.5) * w * 0.7, (r() - 0.3) * h * 0.5, w * 0.07, [86, 130, 56], 0.5);
      g.restore();
    },
  }),
];

export const natureExtraKinds: ObjectKind[] = [...mushroomKinds, ...grassKinds, ...lilyKinds, ...natureMisc, ...megalithKinds];
