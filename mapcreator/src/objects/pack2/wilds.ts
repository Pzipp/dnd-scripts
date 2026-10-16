import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  blade, blobPath, body, castShadow, clipped, crack, ellBody, groundShadow, leaf, lin, mix, mossPatch, mottle, OUT, polyBody, polyPath, radial,
  rgb, shift, tube, wobble, woodGrain, type G, type RGB, type Rnd,
} from './helpers';

// ------------------------------------------------------------------ væltet træ

function fallenTree(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const foliage = param(o, 'foliage', 'leafy');
  const moss = param(o, 'moss', true);
  const bark: RGB = foliage === 'birch' ? [196, 190, 176] : [92, 68, 46];
  const rootX = -w * 0.2;
  const tipX = w * 0.45;
  const R0 = h * 0.17;
  const R1 = h * 0.09;
  const ys = (x: number) => (r() * 0 + Math.sin((x / w) * 3) * h * 0.03);
  // rodklump: jordklump med et net af rødder
  const rc: [number, number] = [rootX - w * 0.02, 0];
  const plate = blobPath(g, wobble(r, rc[0], rc[1], h * 0.34, h * 0.38, 12, 0.16));
  castShadow(g, plate, 3, 4, 5, 0.3);
  plate();
  g.fillStyle = radial(g, rc[0], rc[1], h * 0.46, [[0, 'rgb(86,62,38)'], [0.7, 'rgb(70,50,30)'], [1, 'rgb(54,40,24)']], rc[0] - 6, rc[1] - 6, 3);
  g.fill();
  clipped(g, plate, () => {
    mottle(g, r, [rc[0] - h * 0.4, -h * 0.45, rc[0] + h * 0.4, h * 0.45], [86, 62, 38], 70, 3.4, 26, 0.5);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(255,230,190,.14)';
      g.beginPath();
      g.arc(rc[0] + (r() - 0.5) * h * 0.7, (r() - 0.5) * h * 0.7, 1 + r() * 2, 0, 7);
      g.fill();
    }
  });
  plate();
  g.strokeStyle = 'rgba(20,10,4,.7)';
  g.lineWidth = 1.4;
  g.stroke();
  // rødder, der stritter ud
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283 + r() * 0.4;
    const len = h * (0.22 + r() * 0.12);
    const bx = rc[0] + Math.cos(a) * h * 0.2;
    const by = rc[1] + Math.sin(a) * h * 0.2;
    const ex = rc[0] + Math.cos(a) * (h * 0.2 + len);
    const ey = rc[1] + Math.sin(a) * (h * 0.2 + len);
    const rp = () => {
      g.beginPath();
      g.moveTo(bx, by);
      g.quadraticCurveTo((bx + ex) / 2 + (r() - 0.5) * 10, (by + ey) / 2 + (r() - 0.5) * 10, ex, ey);
    };
    tube(g, rp, h * (0.045 + r() * 0.035), [100, 76, 52], { outline: 1.8 });
  }
  // stammen
  const L = tipX - rootX;
  const trunk: [number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = rootX + L * t;
    const rad = R0 + (R1 - R0) * t + Math.sin(t * 9 + 1) * h * 0.012;
    trunk.push([x, ys(x) - rad]);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const x = rootX + L * t;
    const rad = R0 + (R1 - R0) * t + Math.sin(t * 7 + 4) * h * 0.012;
    trunk.push([x, ys(x) + rad]);
  }
  const tp = polyPath(g, trunk);
  castShadow(g, tp, 4, 6, 6, 0.35);
  g.fillStyle = lin(g, 0, -R0, 0, R0, [[0, rgb(shift(bark, 34))], [0.4, rgb(bark)], [1, rgb(shift(bark, -50))]]);
  tp();
  g.fill();
  clipped(g, tp, () => {
    // barkens lange furer
    for (let i = 0; i < 40; i++) {
      const yy = (r() - 0.5) * R0 * 2;
      const x0 = rootX + r() * L * 0.7;
      g.strokeStyle = r() < 0.7 ? 'rgba(14,6,2,.45)' : 'rgba(255,236,200,.18)';
      g.lineWidth = 0.8 + r() * 1.4;
      g.beginPath();
      g.moveTo(x0, yy);
      g.lineTo(x0 + L * (0.12 + r() * 0.3), yy + (r() - 0.5) * 3);
      g.stroke();
    }
    if (foliage === 'birch') {
      for (let i = 0; i < 20; i++) {
        g.fillStyle = 'rgba(30,26,22,.8)';
        g.beginPath();
        g.ellipse(rootX + r() * L, (r() - 0.5) * R0 * 1.7, 2 + r() * 4, 0.8 + r() * 0.8, 0, 0, 7);
        g.fill();
      }
    }
    if (moss) {
      for (let i = 0; i < 5; i++) mossPatch(g, r, rootX + r() * L, (r() - 0.7) * R0, h * (0.1 + r() * 0.14), 30);
    }
    // svampe
    for (let i = 0; i < 3; i++) {
      const x = rootX + L * (0.2 + r() * 0.6);
      const y = (r() < 0.5 ? -1 : 1) * R0 * 0.5;
      g.fillStyle = 'rgb(226,208,176)';
      g.beginPath();
      g.ellipse(x, y, 4 + r() * 3, 2.4, 0, 0, 7);
      g.fill();
      g.strokeStyle = 'rgba(60,40,20,.8)';
      g.lineWidth = 0.9;
      g.stroke();
    }
    // dyb skygge nedenunder
    g.fillStyle = lin(g, 0, -R0, 0, R0, [[0, 'rgba(255,240,200,.1)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.38)']]);
    g.fillRect(rootX, -R0 * 1.2, L, R0 * 2.4);
  });
  tp();
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.stroke();
  // grene med blade eller bare
  const branches = 5 + Math.floor(r() * 3);
  const lc: RGB = foliage === 'dead' ? [92, 80, 62] : foliage === 'birch' ? [150, 190, 80] : [70, 120, 50];
  for (let i = 0; i < branches; i++) {
    const t = 0.18 + (i / branches) * 0.75;
    const x = rootX + L * t;
    const side = i % 2 ? 1 : -1;
    const rad = R0 + (R1 - R0) * t;
    const by = side * rad * 0.7;
    const len = h * (0.25 + r() * 0.3) * (1 - t * 0.35);
    const a = side * (0.6 + r() * 0.5) + (r() - 0.5) * 0.3;
    const ex = x + Math.cos(a - Math.PI / 2 * 0) * len * 0.8;
    const ey = by + side * Math.abs(Math.sin(a)) * len;
    const brp = () => {
      g.beginPath();
      g.moveTo(x, by);
      g.quadraticCurveTo((x + ex) / 2 + 4, (by + ey) / 2, ex, ey);
    };
    tube(g, brp, h * 0.04, shift(bark, 6), { outline: 1.6 });
    if (foliage !== 'dead') {
      for (let k = 0; k < 9; k++) {
        const tt = 0.3 + r() * 0.75;
        const px = x + (ex - x) * tt + (r() - 0.5) * h * 0.14;
        const py = by + (ey - by) * tt + (r() - 0.5) * h * 0.12;
        leaf(g, px, py, r() * 6.28, h * (0.08 + r() * 0.05), h * 0.035, shift(lc, (r() - 0.5) * 50));
      }
    } else {
      for (let k = 0; k < 4; k++) {
        const tt = 0.4 + r() * 0.5;
        const px = x + (ex - x) * tt;
        const py = by + (ey - by) * tt;
        const tw = () => { g.beginPath(); g.moveTo(px, py); g.lineTo(px + (r() - 0.5) * 14, py + side * (4 + r() * 8)); };
        tube(g, tw, h * 0.02, shift(bark, 4), { outline: 1.2 });
      }
    }
  }
  // afbrudt ende med årringe
  const ex = tipX;
  const tipP = () => { g.beginPath(); g.ellipse(ex, 0, R1 * 0.5, R1, 0, 0, 7); };
  body(g, tipP, [186, 148, 98], [ex - R1, -R1, ex + R1, R1], { lw: 1.6, ao: 1, rim: 0.6 });
  g.strokeStyle = 'rgba(100,66,30,.6)';
  g.lineWidth = 0.7;
  for (let i = 1; i < 5; i++) {
    g.beginPath();
    g.ellipse(ex, 0, (R1 * 0.5 * i) / 5, (R1 * i) / 5, 0, 0, 7);
    g.stroke();
  }
  // splinter
  g.strokeStyle = 'rgba(210,170,110,.9)';
  g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    g.moveTo(ex - 2, (i - 2) * R1 * 0.5);
    g.lineTo(ex + 6 + r() * 6, (i - 2) * R1 * 0.5 + (r() - 0.5) * 6);
  }
  g.stroke();
  void blade;
  void crack;
}

// ------------------------------------------------------------------ termitrede

function termiteMound(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const clay: RGB = mix([168, 92, 56], [188, 124, 70], r());
  groundShadow(g, R * 0.12, R * 0.16, R * 0.95, R * 0.9, 0.4);
  // fod
  const base = blobPath(g, wobble(r, 0, 0, R * 0.9, R * 0.88, 16, 0.1));
  castShadow(g, base, 4, 6, 6, 0.3);
  body(g, base, shift(clay, -24), [-R, -R, R, R], { lw: 2, ao: R * 0.08, rim: 1.2 });
  // lag af kegleformede tårne, hvert med ribber
  type T = { x: number; y: number; rad: number };
  const towers: T[] = [];
  towers.push({ x: -R * 0.05, y: -R * 0.03, rad: R * 0.46 });
  const nt = 6 + Math.floor(r() * 3);
  for (let i = 0; i < nt; i++) {
    const a = (i / nt) * 6.283 + r() * 0.6;
    const d = R * (0.42 + r() * 0.2);
    towers.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, rad: R * (0.16 + r() * 0.14) });
  }
  towers.sort((a, b) => b.rad - a.rad < 0 ? 1 : -1);
  towers.sort((a, b) => a.rad - b.rad);
  towers.reverse();
  for (const t of towers) {
    const p = blobPath(g, wobble(r, t.x, t.y, t.rad, t.rad, 11, 0.12));
    castShadow(g, p, 3, 4, 4, 0.35);
    g.fillStyle = radial(g, t.x, t.y, t.rad * 1.1, [[0, rgb(shift(clay, 40))], [0.55, rgb(clay)], [1, rgb(shift(clay, -50))]], t.x - t.rad * 0.35, t.y - t.rad * 0.35, 1);
    p();
    g.fill();
    clipped(g, p, () => {
      // ujævne lerringe (strata) og klumper i stedet for regelmæssige ribber
      g.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const a0 = r() * 6.28;
        const rr = t.rad * (0.35 + k * 0.17);
        g.strokeStyle = `rgba(40,16,6,${0.16 + r() * 0.12})`;
        g.lineWidth = Math.max(1, t.rad * 0.07);
        g.beginPath();
        g.arc(t.x - t.rad * 0.05 * k, t.y - t.rad * 0.05 * k, rr, a0, a0 + 1.2 + r() * 1.4);
        g.stroke();
        g.strokeStyle = 'rgba(255,214,170,.16)';
        g.lineWidth = Math.max(0.8, t.rad * 0.04);
        g.beginPath();
        g.arc(t.x - t.rad * 0.05 * k - 1, t.y - t.rad * 0.05 * k - 1, rr, a0 + 3.3, a0 + 4.4);
        g.stroke();
      }
      g.fillStyle = radial(g, t.x, t.y, t.rad, [[0, 'rgba(255,214,170,0)'], [1, 'rgba(30,10,2,.38)']], t.x - t.rad * 0.25, t.y - t.rad * 0.25, t.rad * 0.1);
      g.fillRect(t.x - t.rad, t.y - t.rad, t.rad * 2, t.rad * 2);
      mottle(g, r, [t.x - t.rad, t.y - t.rad, t.x + t.rad, t.y + t.rad], clay, 18, 1.8, 30, 0.45);
    });
    p();
    g.strokeStyle = 'rgba(40,16,6,.5)';
    g.lineWidth = 1.1;
    g.stroke();
  }
  // revner
  clipped(g, base, () => {
    for (let i = 0; i < 3; i++) crack(g, r, (r() - 0.5) * R, (r() - 0.5) * R, R * 0.3, r() * 6, 0.9);
  });
  // termitter og krummer
  for (let i = 0; i < 22; i++) {
    const a = r() * 6.28;
    const d = R * (0.8 + r() * 0.3);
    g.fillStyle = r() < 0.5 ? 'rgba(236,224,196,.85)' : 'rgba(44,28,16,.7)';
    g.beginPath();
    g.ellipse(Math.cos(a) * d, Math.sin(a) * d, 0.9, 1.6, a, 0, 7);
    g.fill();
  }
}

// ------------------------------------------------------------------ edderkoppespind

function spiderweb(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const R = Math.min(w, h) / 2;
  const cx = (r() - 0.5) * R * 0.14;
  const cy = (r() - 0.5) * R * 0.14;
  const spokes = 12 + Math.floor(r() * 4);
  const ends: [number, number][] = [];
  const base = param(o, 'corner', false);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * 6.283 + (r() - 0.5) * 0.18;
    const len = R * (0.84 + r() * 0.15);
    ends.push([cx + Math.cos(a) * len, cy + Math.sin(a) * len]);
  }
  // blød skygge under nettet
  g.fillStyle = radial(g, cx, cy, R, [[0, 'rgba(20,16,10,.0)'], [0.6, 'rgba(20,16,10,.1)'], [1, 'rgba(20,16,10,0)']]);
  g.beginPath();
  g.arc(cx, cy, R, 0, 7);
  g.fill();
  const strand = (pts: [number, number][], a: number, lw: number): void => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.strokeStyle = `rgba(20,14,10,${a * 0.55})`;
    g.lineWidth = lw + 1.1;
    g.stroke();
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0] - 0.4, p[1] - 0.4) : g.moveTo(p[0] - 0.4, p[1] - 0.4)));
    g.strokeStyle = `rgba(250,250,246,${a})`;
    g.lineWidth = lw;
    g.stroke();
  };
  // egerne
  for (const e of ends) strand([[cx, cy], e], 0.95, 1.2);
  // spiral af tværtråde: let nedhængende buer mellem egerne
  const rings = 11;
  const gaps: number[] = [];
  for (let k = 0; k < 3; k++) gaps.push(Math.floor(r() * spokes));
  for (let k = 1; k <= rings; k++) {
    const t = 0.08 + Math.pow(k / rings, 0.95) * 0.92;
    for (let i = 0; i < spokes; i++) {
      if (gaps.includes(i) && t > 0.45 && r() < 0.55) continue;
      const e0 = ends[i]!;
      const e1 = ends[(i + 1) % spokes]!;
      const p0: [number, number] = [cx + (e0[0] - cx) * t, cy + (e0[1] - cy) * t];
      const p1: [number, number] = [cx + (e1[0] - cx) * t, cy + (e1[1] - cy) * t];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      const cxp = mx + (cx - mx) * 0.14;
      const cyp = my + (cy - my) * 0.14;
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.quadraticCurveTo(cxp, cyp, p1[0], p1[1]);
      g.strokeStyle = 'rgba(20,14,10,.4)';
      g.lineWidth = 1.5;
      g.stroke();
      g.beginPath();
      g.moveTo(p0[0] - 0.4, p0[1] - 0.4);
      g.quadraticCurveTo(cxp - 0.4, cyp - 0.4, p1[0] - 0.4, p1[1] - 0.4);
      g.strokeStyle = 'rgba(250,250,246,.8)';
      g.lineWidth = 0.7;
      g.stroke();
    }
  }
  // dugdråber
  for (let i = 0; i < 40; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 0.9;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    g.fillStyle = 'rgba(210,236,250,.85)';
    g.beginPath();
    g.arc(x, y, 0.8 + r() * 1.3, 0, 7);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.beginPath();
    g.arc(x - 0.4, y - 0.4, 0.4, 0, 7);
    g.fill();
  }
  // indpakkede byttedyr
  const cocoons = param(o, 'cocoons', true);
  if (cocoons) {
    for (let i = 0; i < 3; i++) {
      const a = r() * 6.28;
      const d = R * (0.35 + r() * 0.35);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      g.save();
      g.translate(x, y);
      g.rotate(a + 1.57);
      const cp = () => { g.beginPath(); g.ellipse(0, 0, R * 0.05, R * 0.12, 0, 0, 7); };
      castShadow(g, cp, 2, 3, 3, 0.4);
      body(g, cp, [226, 224, 214], [-R * 0.06, -R * 0.12, R * 0.06, R * 0.12], { lw: 1.3, ao: 1.4, rim: 1, light: 20, dark: 40 });
      g.strokeStyle = 'rgba(80,76,70,.55)';
      g.lineWidth = 0.7;
      g.beginPath();
      for (let k = -4; k <= 4; k++) {
        g.moveTo(-R * 0.05, k * R * 0.025);
        g.lineTo(R * 0.05, k * R * 0.025 + (r() - 0.5) * 4);
      }
      g.stroke();
      g.restore();
    }
  }
  // edderkoppen
  if (param(o, 'spider', true)) {
    const sx = cx + R * 0.08;
    const sy = cy + R * 0.06;
    const sr = R * 0.09;
    for (const side of [-1, 1]) {
      for (let l = 0; l < 4; l++) {
        const a = side * (0.5 + l * 0.42) - Math.PI / 2 + (side < 0 ? Math.PI : 0) * 0;
        const baseA = side < 0 ? Math.PI + (l - 1.5) * 0.5 : (l - 1.5) * -0.5;
        void a;
        const k1: [number, number] = [sx + Math.cos(baseA) * sr * 1.5, sy + Math.sin(baseA) * sr * 1.5 - sr * 0.9];
        const k2: [number, number] = [sx + Math.cos(baseA) * sr * 2.8, sy + Math.sin(baseA) * sr * 2.8 + (l - 1.5) * sr * 0.4];
        const lg = () => { g.beginPath(); g.moveTo(sx, sy); g.lineTo(k1[0], k1[1]); g.lineTo(k2[0], k2[1]); };
        g.lineCap = 'round';
        lg();
        g.strokeStyle = 'rgba(10,6,4,.95)';
        g.lineWidth = sr * 0.3;
        g.stroke();
        lg();
        g.strokeStyle = 'rgb(58,40,32)';
        g.lineWidth = sr * 0.16;
        g.stroke();
      }
    }
    ellBody(g, sx, sy + sr * 0.8, sr * 1.0, sr * 1.25, [48, 34, 28], { lw: 1.4, ao: sr * 0.2, rim: 1, light: 30 });
    g.fillStyle = 'rgb(176,40,30)';
    g.beginPath();
    g.moveTo(sx, sy + sr * 0.5);
    g.lineTo(sx - sr * 0.3, sy + sr * 1.0);
    g.lineTo(sx + sr * 0.3, sy + sr * 1.0);
    g.fill();
    ellBody(g, sx, sy - sr * 0.4, sr * 0.62, sr * 0.55, [58, 42, 34], { lw: 1.3, ao: sr * 0.1, rim: 0.8, light: 34 });
    g.fillStyle = 'rgba(230,50,40,.95)';
    for (const ex of [-1, 1]) {
      g.beginPath();
      g.arc(sx + ex * sr * 0.22, sy - sr * 0.55, sr * 0.1, 0, 7);
      g.fill();
    }
  }
  void base;
}

export const wildsKinds: ObjectKind[] = [
  kind({
    key: 'fallen_tree', family: 'wilds', name: 'Væltet træ med rødder', w: 4.4, h: 2.2, keepAspect: false, randomRotation: true, shadow: 5, bleed: 0.06,
    params: [
      { key: 'foliage', label: 'Udseende', type: 'select', default: 'leafy', options: [{ value: 'leafy', label: 'Løvtræ' }, { value: 'birch', label: 'Birk' }, { value: 'dead', label: 'Dødt' }] },
      { key: 'moss', label: 'Mos', type: 'toggle', default: true },
    ],
    draw: fallenTree,
  }),
  kind({
    key: 'termite_mound', family: 'wilds', name: 'Termitrede', w: 1.7, h: 1.7, sizeJitter: 0.2, randomRotation: true, shadow: 6, bleed: 0.08,
    draw: termiteMound,
  }),
  kind({
    key: 'spiderweb', family: 'wilds', name: 'Edderkoppespind', w: 3, h: 3, shadow: 0, bleed: 0.02, layers: ['effects', 'objects'],
    params: [{ key: 'spider', label: 'Edderkop', type: 'toggle', default: true }, { key: 'cocoons', label: 'Indspundne ofre', type: 'toggle', default: true }],
    draw: spiderweb,
  }),
];
