import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  blobPath, body, castShadow, clipped, lin, mix, mottle, OUT, polyPath, radial, rgb, shift, wobble, type G, type RGB, type Rnd,
} from './helpers';

// ------------------------------------------------------------------ isskår

const ICE: Record<string, { lit: RGB; mid: RGB; dark: RGB; glow: RGB }> = {
  ice: { lit: [226, 244, 252], mid: [160, 208, 232], dark: [82, 140, 190], glow: [210, 245, 255] },
  deep: { lit: [170, 214, 240], mid: [86, 150, 210], dark: [34, 76, 150], glow: [140, 200, 255] },
  arcane: { lit: [226, 206, 255], mid: [160, 120, 230], dark: [78, 44, 160], glow: [210, 170, 255] },
};

function shard(g: G, r: Rnd, bx: number, by: number, ang: number, L: number, W: number, pal: { lit: RGB; mid: RGB; dark: RGB; glow: RGB }): void {
  g.save();
  g.translate(bx, by);
  g.rotate(ang);
  // lokal retning: spidsen peger mod -y
  const pts: [number, number][] = [[-W / 2, 0], [-W * 0.56, -L * 0.42], [-W * 0.1, -L * 0.9], [W * 0.06, -L], [W * 0.5, -L * 0.45], [W / 2, 0]];
  // lys fra øverst til venstre: find, hvor meget skårets venstre side vender mod lyset
  const world = -ang; // ikke brugt direkte, men holder retningen i ro
  void world;
  const toLight = Math.cos(ang - Math.PI * 1.25 + Math.PI / 2); // -1..1
  const flip = toLight > 0 ? 1 : -1;
  const path = polyPath(g, pts);
  castShadow(g, path, 5, 6, 6, 0.3);
  // venstre og højre facet
  const left = polyPath(g, [pts[0]!, pts[1]!, pts[2]!, pts[3]!, [0, -L * 0.2], [0, 0]]);
  const right = polyPath(g, [[0, 0], [0, -L * 0.2], pts[3]!, pts[4]!, pts[5]!]);
  for (const [p, c, x0, x1] of [[left, flip > 0 ? pal.lit : pal.mid, -W / 2, 0], [right, flip > 0 ? pal.mid : pal.lit, 0, W / 2]] as const) {
    p();
    g.fillStyle = lin(g, x0, 0, x1, -L, [[0, rgb(shift(c, 8), 0.96)], [1, rgb(shift(c, -14), 0.9)]]);
    g.fill();
  }
  clipped(g, path, () => {
    // indre brydning
    g.strokeStyle = rgb(pal.glow, 0.35);
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const y = -L * (0.1 + r() * 0.7);
      g.moveTo(-W * 0.45 * (1 - (-y) / L * 0.7), y);
      g.lineTo(W * 0.45 * (1 - (-y) / L * 0.7), y + (r() - 0.5) * L * 0.2);
    }
    g.stroke();
    g.fillStyle = lin(g, 0, 0, 0, -L, [[0, rgb(pal.dark, 0.5)], [0.5, rgb(pal.dark, 0.0)], [1, rgb(pal.glow, 0.0)]]);
    g.fillRect(-W, -L, W * 2, L);
    // lys indre kerne giver dybde
    g.fillStyle = rgb(pal.glow, 0.35);
    g.beginPath();
    g.moveTo(-W * 0.12, -L * 0.05);
    g.lineTo(-W * 0.2, -L * 0.45);
    g.lineTo(-W * 0.04, -L * 0.8);
    g.lineTo(W * 0.1, -L * 0.45);
    g.lineTo(W * 0.08, -L * 0.05);
    g.closePath();
    g.fill();
    // dybt blå kerne
    g.fillStyle = radial(g, 0, -L * 0.15, W * 0.5, [[0, rgb(pal.dark, 0.5)], [1, rgb(pal.dark, 0)]]);
    g.fillRect(-W, -L * 0.7, W * 2, L * 0.7);
  });
  // ryg og kanter
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -L * 0.2);
  g.lineTo(pts[3]![0], pts[3]![1]);
  g.strokeStyle = 'rgba(255,255,255,.7)';
  g.lineWidth = 1.2;
  g.stroke();
  g.beginPath();
  g.moveTo(0, -L * 0.2);
  g.lineTo(pts[1]![0], pts[1]![1]);
  g.moveTo(0, -L * 0.2);
  g.lineTo(pts[4]![0], pts[4]![1]);
  g.strokeStyle = rgb(pal.dark, 0.5);
  g.lineWidth = 1;
  g.stroke();
  path();
  g.strokeStyle = rgb(shift(pal.dark, -50), 0.9);
  g.lineWidth = 1.6;
  g.lineJoin = 'round';
  g.stroke();
  // lys kant mod nordvest
  g.save();
  g.translate(-0.8 * flip, -0.8);
  path();
  g.strokeStyle = 'rgba(255,255,255,.5)';
  g.lineWidth = 0.9;
  g.stroke();
  g.restore();
  // glimt
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath();
  g.arc(-W * 0.18 * flip, -L * 0.7, Math.max(1, W * 0.06), 0, 7);
  g.fill();
  g.restore();
}

function iceCrystals(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = ICE[param(o, 'tint', 'ice')] ?? ICE.ice!;
  // snedrys og frostpletter ved foden
  const base = wobble(r, 0, R * 0.05, R * 0.82, R * 0.72, 11, 0.12);
  const bp = blobPath(g, base);
  castShadow(g, bp, 4, 5, 6, 0.2);
  bp();
  g.fillStyle = radial(g, 0, 0, R, [[0, 'rgba(252,254,255,1)'], [0.7, 'rgba(232,242,252,.95)'], [1, 'rgba(210,228,246,0)']], -R * 0.2, -R * 0.2, 2);
  g.fill();
  const n = 8 + Math.floor(r() * 4);
  const list: { x: number; y: number; a: number; L: number; W: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + r() * 0.6;
    const small = i >= 5;
    const d = small ? R * (0.2 + r() * 0.35) : R * (0.02 + r() * 0.12);
    const L = R * (small ? 0.34 + r() * 0.26 : 0.7 + r() * 0.34);
    list.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, a: a + Math.PI / 2, L, W: L * (0.26 + r() * 0.1) });
  }
  // lange (bagerste) først, så de små foran
  list.sort((p, q) => q.L - p.L);
  for (const s of list) shard(g, r, s.x, s.y, s.a, s.L, s.W, pal);
  // glimtende snekrystaller
  for (let i = 0; i < 16; i++) {
    const a = r() * 6.28;
    const d = R * (0.1 + r() * 0.8);
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, 0.7 + r() * 1.2, 0, 7);
    g.fill();
  }
}

// ------------------------------------------------------------------ snedrive

function snowdrift(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  type Lobe = { x: number; y: number; rx: number; ry: number };
  const n = 4 + Math.floor(r() * 2);
  const lobes: Lobe[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const taper = Math.sin(Math.PI * (0.12 + t * 0.8));
    lobes.push({
      x: -w * 0.34 + t * w * 0.68 + (r() - 0.5) * w * 0.05,
      y: (r() - 0.5) * h * 0.18,
      rx: w * (0.13 + r() * 0.07) * (0.7 + taper * 0.4),
      ry: h * (0.2 + r() * 0.08) * (0.55 + taper * 0.55),
    });
  }
  const union = () => {
    g.beginPath();
    for (const l of lobes) {
      g.moveTo(l.x + l.rx, l.y);
      g.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
    }
  };
  // lobe for lobe, så de ligger lagvis
  lobes.forEach((l) => {
    const lp = () => {
      g.beginPath();
      g.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
    };
    lp();
    g.fillStyle = radial(g, l.x, l.y, l.rx * 1.1, [[0, 'rgb(255,255,255)'], [0.55, 'rgb(238,245,252)'], [0.9, 'rgb(198,216,238)'], [1, 'rgb(168,192,224)']], l.x - l.rx * 0.3, l.y - l.ry * 0.35, 2);
    g.fill();
    clipped(g, lp, () => {
      g.strokeStyle = 'rgba(110,140,190,.22)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const y = l.y - l.ry * 0.7 + i * l.ry * 0.35;
        g.beginPath();
        for (let t = 0; t <= 10; t++) {
          const x = l.x - l.rx + (t / 10) * l.rx * 2;
          const yy = y + Math.sin(t * 0.9 + i * 2 + l.x) * l.ry * 0.07;
          if (t) g.lineTo(x, yy);
          else g.moveTo(x, yy);
        }
        g.stroke();
        g.save();
        g.translate(0, -1.5);
        g.strokeStyle = 'rgba(255,255,255,.85)';
        g.stroke();
        g.restore();
      }
      mottle(g, r, [l.x - l.rx, l.y - l.ry, l.x + l.rx, l.y + l.ry], [232, 240, 250], 14, 2, 12, 0.4);
    });
    g.beginPath();
    g.ellipse(l.x, l.y, l.rx, l.ry, 0, -0.15, Math.PI * 0.8);
    g.strokeStyle = 'rgba(80,108,160,.55)';
    g.lineWidth = 1.4;
    g.stroke();
    g.beginPath();
    g.ellipse(l.x, l.y, l.rx, l.ry, 0, Math.PI * 1.05, Math.PI * 1.55);
    g.strokeStyle = 'rgba(255,255,255,.9)';
    g.lineWidth = 1.6;
    g.stroke();
  });
  clipped(g, union, () => {
    g.fillStyle = lin(g, -w * 0.4, -h * 0.4, w * 0.4, h * 0.4, [[0, 'rgba(255,255,255,.3)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(70,100,160,.3)']]);
    g.fillRect(-w / 2, -h / 2, w, h);
    if (param(o, 'tracks', false)) {
      for (let i = 0; i < 16; i++) {
        const x = -w * 0.38 + i * w * 0.05;
        const y = h * 0.0 + Math.sin(i * 0.7) * h * 0.08 + (i % 2 ? 3 : -3);
        g.fillStyle = 'rgba(96,126,176,.6)';
        g.beginPath();
        g.ellipse(x, y, 2.6, 1.8, 0.3, 0, 7);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.beginPath();
        g.ellipse(x - 0.8, y - 0.8, 1.4, 0.8, 0.3, 0, 7);
        g.fill();
      }
    }
  });
  if (param(o, 'rocks', true)) {
    const nr = 1 + Math.floor(r() * 3);
    for (let i = 0; i < nr; i++) {
      const l = lobes[Math.floor(r() * lobes.length)]!;
      const x = l.x + (r() - 0.5) * l.rx;
      const y = l.y + (r() - 0.5) * l.ry * 0.8;
      const rx = w * (0.025 + r() * 0.03);
      const rp = blobPath(g, wobble(r, x, y, rx, rx * 0.8, 9, 0.25));
      castShadow(g, rp, 2, 3, 3, 0.35);
      body(g, rp, [128, 124, 126], [x - rx, y - rx, x + rx, y + rx], { lw: 1.4, ao: rx * 0.25, rim: 1.2, light: 30 });
      g.save();
      g.translate(-rx * 0.1, -rx * 0.4);
      g.beginPath();
      g.ellipse(x, y - rx * 0.2, rx * 0.85, rx * 0.35, 0, 0, 7);
      g.fillStyle = 'rgba(250,252,255,.95)';
      g.fill();
      g.restore();
    }
  }
  for (let i = 0; i < 40; i++) {
    const l = lobes[Math.floor(r() * lobes.length)]!;
    const a = r() * 6.28;
    g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`;
    g.beginPath();
    g.arc(l.x + Math.cos(a) * l.rx * (1 + r() * 0.2), l.y + Math.sin(a) * l.ry * (1 + r() * 0.2), 0.7 + r() * 1.3, 0, 7);
    g.fill();
  }
}

// ------------------------------------------------------------------ frossen dam

function frozenPond(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const state = param(o, 'state', 'solid');
  const pts = wobble(r, 0, 0, w * 0.44, h * 0.42, 18, 0.1);
  const lake = blobPath(g, pts);
  // snebanke og sten uden om
  for (let i = 0; i < 60; i++) {
    const a = r() * 6.283;
    const k = 1 + (r() - 0.3) * 0.1;
    const px = Math.cos(a) * w * 0.45 * k;
    const py = Math.sin(a) * h * 0.43 * k;
    const sr = Math.min(w, h) * (0.03 + r() * 0.05);
    g.fillStyle = `rgba(${236 + r() * 18},${244 + r() * 10},255,${0.8 + r() * 0.2})`;
    g.beginPath();
    g.ellipse(px, py, sr * 1.2, sr, r() * 3, 0, 7);
    g.fill();
  }
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.283;
    const px = Math.cos(a) * w * 0.465;
    const py = Math.sin(a) * h * 0.445;
    const sr = Math.min(w, h) * (0.03 + r() * 0.03);
    const rp = blobPath(g, wobble(r, px, py, sr, sr * 0.8, 8, 0.2));
    castShadow(g, rp, 2, 3, 3, 0.4);
    body(g, rp, [100, 98, 104], [px - sr, py - sr, px + sr, py + sr], { lw: 1.3, ao: sr * 0.2, rim: 0.8 });
    g.beginPath();
    g.ellipse(px - sr * 0.15, py - sr * 0.4, sr * 0.7, sr * 0.3, 0, 0, 7);
    g.fillStyle = 'rgba(248,252,255,.92)';
    g.fill();
  }
  lake();
  g.fillStyle = radial(g, 0, 0, w * 0.46, [[0, 'rgb(46,104,138)'], [0.5, 'rgb(96,156,188)'], [0.85, 'rgb(170,214,232)'], [1, 'rgb(214,236,246)']], -w * 0.08, -h * 0.08, 3);
  g.fill();
  clipped(g, lake, () => {
    // frostede pletter
    for (let i = 0; i < 40; i++) {
      const x = (r() - 0.5) * w * 0.85;
      const y = (r() - 0.5) * h * 0.8;
      const s = Math.min(w, h) * (0.04 + r() * 0.1);
      g.fillStyle = radial(g, x, y, s, [[0, 'rgba(240,250,255,.5)'], [1, 'rgba(240,250,255,0)']]);
      g.beginPath();
      g.ellipse(x, y, s * 1.4, s, r() * 3, 0, 7);
      g.fill();
    }
    // bobler fanget i isen
    for (let i = 0; i < 30; i++) {
      const x = (r() - 0.5) * w * 0.8;
      const y = (r() - 0.5) * h * 0.75;
      const s = 1 + r() * 2.8;
      g.strokeStyle = 'rgba(230,248,255,.65)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(x, y, s, 0, 7);
      g.stroke();
      g.fillStyle = 'rgba(30,70,100,.25)';
      g.fill();
    }
    // sprækker
    const cr = state === 'cracked' ? 9 : 4;
    for (let i = 0; i < cr; i++) {
      let x = (r() - 0.5) * w * 0.6;
      let y = (r() - 0.5) * h * 0.55;
      let a = r() * 6.28;
      const segs = 6 + Math.floor(r() * 5);
      const line: [number, number][] = [[x, y]];
      for (let s = 0; s < segs; s++) {
        a += (r() - 0.5) * 1.1;
        x += Math.cos(a) * w * 0.045;
        y += Math.sin(a) * w * 0.045;
        line.push([x, y]);
      }
      for (const [c, lw, off] of [['rgba(20,50,80,.55)', 2.4, 0.8], ['rgba(250,254,255,.9)', 1.1, 0]] as const) {
        g.beginPath();
        line.forEach((p, k) => (k ? g.lineTo(p[0] + off, p[1] + off) : g.moveTo(p[0] + off, p[1] + off)));
        g.strokeStyle = c;
        g.lineWidth = lw;
        g.lineJoin = 'round';
        g.stroke();
      }
    }
    // spejlende glimt
    g.fillStyle = lin(g, -w * 0.3, -h * 0.3, w * 0.1, h * 0.1, [[0, 'rgba(255,255,255,.55)'], [0.25, 'rgba(255,255,255,.1)'], [1, 'rgba(255,255,255,0)']]);
    g.save();
    g.beginPath();
    g.ellipse(-w * 0.12, -h * 0.14, w * 0.2, h * 0.07, -0.5, 0, 7);
    g.fill();
    g.restore();
    g.fillStyle = lin(g, w * 0.4, h * 0.4, 0, 0, [[0, 'rgba(10,40,70,.4)'], [1, 'rgba(10,40,70,0)']]);
    g.fillRect(-w / 2, -h / 2, w, h);
    if (state === 'hole') {
      const hx = w * (r() * 0.2 - 0.05);
      const hy = h * (r() * 0.2 - 0.05);
      const hp = blobPath(g, wobble(r, hx, hy, w * 0.1, h * 0.09, 12, 0.22));
      hp();
      g.fillStyle = radial(g, hx, hy, w * 0.1, [[0, 'rgb(8,26,40)'], [1, 'rgb(14,46,66)']]);
      g.fill();
      g.strokeStyle = 'rgba(240,252,255,.95)';
      g.lineWidth = 2.6;
      g.stroke();
      g.strokeStyle = 'rgba(20,50,80,.8)';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = 'rgba(160,210,240,.45)';
      g.beginPath();
      g.ellipse(hx - w * 0.03, hy - h * 0.025, w * 0.03, h * 0.012, -0.4, 0, 7);
      g.fill();
    }
  });
  lake();
  g.strokeStyle = 'rgba(40,80,110,.6)';
  g.lineWidth = 1.6;
  g.stroke();
  if (param(o, 'snow', false)) {
    clipped(g, lake, () => {
      for (let i = 0; i < 18; i++) {
        const x = (r() - 0.5) * w * 0.8;
        const y = (r() - 0.5) * h * 0.76;
        const s = Math.min(w, h) * (0.05 + r() * 0.08);
        g.fillStyle = radial(g, x, y, s, [[0, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]);
        g.beginPath();
        g.ellipse(x, y, s * 1.5, s, r() * 3, 0, 7);
        g.fill();
      }
    });
  }
}

export const arcticKinds: ObjectKind[] = [
  kind({
    key: 'ice_crystals', family: 'arctic', name: 'Isskår', w: 1.4, h: 1.4, randomRotation: true, sizeJitter: 0.2, shadow: 5, bleed: 0.12,
    params: [{ key: 'tint', label: 'Farve', type: 'select', default: 'ice', options: [{ value: 'ice', label: 'Is' }, { value: 'deep', label: 'Dybblå' }, { value: 'arcane', label: 'Arkan' }] }],
    draw: iceCrystals,
  }),
  kind({
    key: 'snowdrift', family: 'arctic', name: 'Snedrive', w: 3, h: 1.6, keepAspect: false, randomRotation: false, sizeJitter: 0.12, shadow: 2, bleed: 0.08,
    params: [{ key: 'rocks', label: 'Sten', type: 'toggle', default: true }, { key: 'tracks', label: 'Spor', type: 'toggle', default: false }],
    draw: snowdrift,
  }),
  kind({
    key: 'frozen_pond', family: 'arctic', name: 'Frossen dam', w: 4, h: 3, keepAspect: false, randomRotation: false, shadow: 0, bleed: 0.06, layers: ['objects', 'effects'],
    params: [
      { key: 'state', label: 'Tilstand', type: 'select', default: 'solid', options: [{ value: 'solid', label: 'Hel is' }, { value: 'cracked', label: 'Revnet' }, { value: 'hole', label: 'Hul i isen' }] },
      { key: 'snow', label: 'Snedække', type: 'toggle', default: false },
    ],
    draw: frozenPond,
  }),
];

void mix;
void OUT;
