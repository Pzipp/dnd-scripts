import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { polyBody, rope } from '../pack2/helpers';
import { blobPath, clipped, crack, FLOOR, FX, glow, holePts, mix, mottle, OUT, radial, rgb, shift, slab, stateParam, type G, type ParamDef, type RGB } from './common';

const LIGHT_ANG = -Math.PI * 0.75;

/** En krystalsplint set oppefra: to flader, hvor den mod lyset vendte er lysest. */
export function shard(g: G, bx: number, by: number, ang: number, L: number, wd: number, col: RGB, glowA = 0): void {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const nx = -dy;
  const ny = dx;
  const mx = bx + dx * L * 0.78;
  const my = by + dy * L * 0.78;
  const tip: [number, number] = [bx + dx * L, by + dy * L];
  const left: [number, number][] = [[bx + nx * wd, by + ny * wd], [mx + nx * wd * 0.8, my + ny * wd * 0.8], tip, [bx + dx * L * 0.3, by + dy * L * 0.3]];
  const right: [number, number][] = [[bx - nx * wd, by - ny * wd], [mx - nx * wd * 0.8, my - ny * wd * 0.8], tip, [bx + dx * L * 0.3, by + dy * L * 0.3]];
  const litLeft = Math.cos(ang - Math.PI / 2 - LIGHT_ANG);
  if (glowA > 0) glow(g, bx + dx * L * 0.5, by + dy * L * 0.5, L * 0.9, col, glowA);
  polyBody(g, left, shift(col, litLeft * 46 - 6), { lw: Math.max(0.9, wd * 0.12), ao: 0, light: 10, dark: 12 });
  polyBody(g, right, shift(col, -litLeft * 46 - 6), { lw: Math.max(0.9, wd * 0.12), ao: 0, light: 10, dark: 12 });
  g.beginPath();
  g.moveTo(bx + dx * L * 0.1, by + dy * L * 0.1);
  g.lineTo(tip[0], tip[1]);
  g.strokeStyle = 'rgba(255,255,255,.5)';
  g.lineWidth = Math.max(0.6, wd * 0.1);
  g.stroke();
}

// ---------------------------------------------------------------- pytter

type Puddle = { base: RGB; deep: RGB; sheen: number; bubbles: boolean; glow: number; rim: RGB };
const PUDDLES: Record<string, Puddle> = {
  acid: { base: [140, 214, 60], deep: [60, 120, 30], sheen: 0.3, bubbles: true, glow: 0.3, rim: [70, 90, 40] },
  poison: { base: [150, 90, 190], deep: [60, 28, 96], sheen: 0.3, bubbles: true, glow: 0.2, rim: [60, 44, 70] },
  oil: { base: [36, 34, 38], deep: [10, 10, 12], sheen: 0.7, bubbles: false, glow: 0, rim: [30, 26, 24] },
  tar: { base: [28, 24, 22], deep: [6, 6, 6], sheen: 0.18, bubbles: true, glow: 0, rim: [30, 24, 20] },
  water: { base: [96, 138, 160], deep: [40, 76, 104], sheen: 0.6, bubbles: false, glow: 0, rim: [70, 62, 52] },
  slime: { base: [130, 170, 70], deep: [70, 110, 40], sheen: 0.55, bubbles: true, glow: 0.12, rim: [74, 88, 44] },
};

function puddle(g: G, o: DrawInput, key: string): void {
  const r = rng(o.seed);
  const p = PUDDLES[key]!;
  const rx = o.w / 2;
  const ry = o.h / 2;
  const pts = holePts(r, rx * 0.84, ry * 0.84, 0.13, 16);
  const path = blobPath(g, pts);
  // våd kant
  glow(g, 0, 0, Math.max(rx, ry) * 1.0, p.rim, 0.5, Math.min(rx, ry) * 1.0);
  path();
  g.fillStyle = radial(g, rx * 0.1, ry * 0.1, Math.max(rx, ry) * 0.9, [[0, rgb(p.base)], [0.65, rgb(mix(p.base, p.deep, 0.6))], [1, rgb(p.deep)]], -rx * 0.2, -ry * 0.2, 0);
  g.fill();
  clipped(g, path, () => {
    if (p.sheen > 0.5 && key === 'oil') {
      // regnbuehinde
      for (let i = 0; i < 4; i++) {
        const cols = ['rgba(120,60,200,.28)', 'rgba(40,160,200,.24)', 'rgba(200,170,40,.2)', 'rgba(200,60,100,.18)'];
        g.beginPath();
        g.ellipse((r() - 0.5) * rx * 0.6, (r() - 0.5) * ry * 0.6, rx * (0.25 + r() * 0.3), ry * (0.15 + r() * 0.25), r() * 3, 0, 7);
        g.fillStyle = cols[i]!;
        g.fill();
      }
    }
    if (p.bubbles) {
      for (let i = 0; i < 9; i++) {
        const bx = (r() - 0.5) * rx * 1.2;
        const by = (r() - 0.5) * ry * 1.2;
        const br = 2 + r() * rx * 0.07;
        g.beginPath();
        g.arc(bx, by, br, 0, 7);
        g.fillStyle = rgb(shift(p.base, 40), 0.35);
        g.fill();
        g.strokeStyle = 'rgba(10,10,10,.45)';
        g.lineWidth = 0.8;
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,.8)';
        g.beginPath();
        g.arc(bx - br * 0.35, by - br * 0.35, br * 0.28, 0, 7);
        g.fill();
      }
    }
    // inderkant: skygge øverst til venstre (hul), lys nederst til højre
    g.save();
    g.translate(rx * 0.04, ry * 0.05);
    path();
    g.strokeStyle = 'rgba(0,0,0,.28)';
    g.lineWidth = rx * 0.16;
    g.stroke();
    g.restore();
    // spejling af lyset
    g.fillStyle = `rgba(255,255,255,${p.sheen})`;
    g.beginPath();
    g.ellipse(-rx * 0.28, -ry * 0.3, rx * 0.2, ry * 0.07, -0.5, 0, 7);
    g.fill();
    g.fillStyle = `rgba(255,255,255,${p.sheen * 0.5})`;
    g.beginPath();
    g.ellipse(rx * 0.12, ry * 0.22, rx * 0.1, ry * 0.035, -0.4, 0, 7);
    g.fill();
  });
  path();
  g.strokeStyle = 'rgba(16,10,6,.6)';
  g.lineWidth = Math.max(1, rx * 0.035);
  g.stroke();
  if (p.glow) glow(g, 0, 0, Math.max(rx, ry) * 1.2, p.base, p.glow);
}

function iceSlick(g: G, o: DrawInput, thick: boolean): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  const path = blobPath(g, holePts(r, rx * 0.86, ry * 0.86, 0.12, 14));
  path();
  g.fillStyle = radial(g, 0, 0, Math.max(rx, ry), [[0, thick ? 'rgba(236,250,255,.92)' : 'rgba(210,236,250,.5)'], [0.7, thick ? 'rgba(170,214,240,.9)' : 'rgba(190,224,244,.4)'], [1, thick ? 'rgba(130,184,222,.85)' : 'rgba(170,210,235,.18)']]);
  g.fill();
  clipped(g, path, () => {
    for (let i = 0; i < 7; i++) crack(g, r, (r() - 0.5) * rx * 1.2, (r() - 0.5) * ry * 1.2, rx * 0.7, r() * 6.3, 1);
    g.fillStyle = 'rgba(255,255,255,.8)';
    g.beginPath();
    g.ellipse(-rx * 0.3, -ry * 0.3, rx * 0.25, ry * 0.07, -0.5, 0, 7);
    g.fill();
    mottle(g, r, [-rx, -ry, rx, ry], [210, 236, 250], 14, rx * 0.08, 20, 0.4);
  });
  path();
  g.strokeStyle = 'rgba(40,80,120,.5)';
  g.lineWidth = Math.max(1, rx * 0.03);
  g.stroke();
}

// ---------------------------------------------------------------- lava

function lavaCracks(g: G, o: DrawInput, pool: boolean): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  const S = Math.min(rx, ry);
  const rock: RGB = [52, 44, 42];
  const path = blobPath(g, holePts(r, rx * 0.92, ry * 0.92, 0.1, 16));
  glow(g, 0, 0, Math.max(rx, ry), [255, 90, 20], 0.3);
  path();
  g.fillStyle = radial(g, 0, 0, Math.max(rx, ry), [[0, rgb(shift(rock, 10))], [1, rgb(shift(rock, -12))]]);
  g.fill();
  clipped(g, path, () => {
    mottle(g, r, [-rx, -ry, rx, ry], rock, 30, S * 0.12, 16, 0.5);
    const segs: [number, number][][] = [];
    const nCr = pool ? 0 : 6;
    for (let i = 0; i < nCr; i++) {
      let x = (r() - 0.5) * rx * 0.5;
      let y = (r() - 0.5) * ry * 0.5;
      let a = r() * 6.3;
      const pts: [number, number][] = [[x, y]];
      for (let k = 0; k < 6; k++) {
        a += (r() - 0.5) * 1.2;
        x += Math.cos(a) * S * 0.28;
        y += Math.sin(a) * S * 0.28;
        pts.push([x, y]);
      }
      segs.push(pts);
    }
    if (pool) {
      // flydende lava med mørk skorpe i plader
      const inner = blobPath(g, holePts(r, rx * 0.66, ry * 0.66, 0.15, 14));
      inner();
      g.fillStyle = radial(g, 0, 0, S * 0.8, [[0, 'rgb(255,236,140)'], [0.4, 'rgb(255,150,30)'], [1, 'rgb(200,50,10)']]);
      g.fill();
      for (let i = 0; i < 7; i++) {
        const a = r() * 6.3;
        const d = S * (0.15 + r() * 0.5);
        const pl = Array.from({ length: 6 }, (_, k): [number, number] => [Math.cos(a) * d + Math.cos(k * 1.05 + r() * 0.6) * S * (0.05 + r() * 0.07), Math.sin(a) * d + Math.sin(k * 1.05 + r() * 0.6) * S * (0.1 + r() * 0.1)]);
        polyBody(g, pl, [58, 44, 40], { lw: 1, ao: 1.5, rim: 0 });
      }
    }
    for (const pts of segs) {
      const trace = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
      g.lineJoin = 'round';
      g.lineCap = 'round';
      trace();
      g.strokeStyle = 'rgba(255,70,10,.28)';
      g.lineWidth = S * 0.2;
      g.stroke();
      trace();
      g.strokeStyle = 'rgb(240,100,24)';
      g.lineWidth = S * 0.08;
      g.stroke();
      trace();
      g.strokeStyle = 'rgb(255,226,130)';
      g.lineWidth = S * 0.032;
      g.stroke();
    }
  });
  path();
  g.strokeStyle = 'rgba(14,6,2,.85)';
  g.lineWidth = Math.max(1.4, S * 0.04);
  g.stroke();
}

function magmaBubbles(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  const S = Math.min(rx, ry);
  lavaCracks(g, { ...o, seed: o.seed }, true);
  for (let i = 0; i < 6; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * S * 0.45;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const br = S * (0.06 + r() * 0.1);
    g.beginPath();
    g.arc(x, y, br, 0, 7);
    g.fillStyle = radial(g, x, y, br, [[0, 'rgb(255,214,100)'], [0.6, 'rgb(250,130,28)'], [1, 'rgb(150,30,8)']], x - br * 0.3, y - br * 0.3, 0.1);
    g.fill();
    g.strokeStyle = 'rgba(70,16,4,.8)';
    g.lineWidth = 1.1;
    g.stroke();
    g.fillStyle = 'rgba(255,255,230,.9)';
    g.beginPath();
    g.arc(x - br * 0.35, y - br * 0.35, br * 0.25, 0, 7);
    g.fill();
  }
}

// ---------------------------------------------------------------- gas og sporer

function mistBlobs(g: G, r: () => number, rx: number, ry: number, col: RGB, a: number, n: number, bubbles = false): void {
  for (let i = 0; i < n; i++) {
    const an = r() * 6.3;
    const d = Math.sqrt(r());
    const x = Math.cos(an) * d * rx * 0.55;
    const y = Math.sin(an) * d * ry * 0.55;
    glow(g, x, y, Math.max(rx, ry) * (0.3 + r() * 0.35), mix(col, [255, 255, 255], r() * 0.25), a * (0.45 + r() * 0.6), Math.min(rx, ry) * (0.3 + r() * 0.3));
  }
  if (bubbles) {
    for (let i = 0; i < 12; i++) {
      const x = (r() - 0.5) * rx * 1.1;
      const y = (r() - 0.5) * ry * 1.1;
      g.beginPath();
      g.arc(x, y, 1.5 + r() * 3.5, 0, 7);
      g.strokeStyle = rgb(shift(col, 60), 0.5);
      g.lineWidth = 1;
      g.stroke();
    }
  }
}

function sporeCloud(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  const col: RGB = [180, 200, 120];
  mistBlobs(g, r, rx, ry, col, 0.3, 9);
  for (let i = 0; i < 90; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * 0.9;
    g.fillStyle = rgb(shift(col, 40 + r() * 50), 0.5 + r() * 0.45);
    g.beginPath();
    g.arc(Math.cos(a) * d * rx, Math.sin(a) * d * ry, 0.7 + r() * 1.7, 0, 7);
    g.fill();
  }
  // små svampe i midten
  for (let i = 0; i < 4; i++) {
    const x = (r() - 0.5) * rx * 0.4;
    const y = (r() - 0.5) * ry * 0.4;
    const s = rx * (0.06 + r() * 0.05);
    g.beginPath();
    g.arc(x, y, s, 0, 7);
    g.fillStyle = radial(g, x, y, s, [[0, 'rgb(220,190,130)'], [1, 'rgb(130,92,56)']], x - s * 0.3, y - s * 0.3, 0.1);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1;
    g.stroke();
  }
}

// ---------------------------------------------------------------- spindler

function webCorner(g: G, o: DrawInput, hang: boolean): void {
  const r = rng(o.seed);
  const L = Math.min(o.w, o.h);
  // forankret i øverste venstre hjørne
  const ox = -o.w / 2;
  const oy = -o.h / 2;
  const nr = 9;
  const na = 8;
  const rays: number[] = [];
  for (let i = 0; i < na; i++) rays.push((i / (na - 1)) * Math.PI / 2 + (r() - 0.5) * 0.12);
  g.save();
  g.translate(ox, oy);
  g.lineCap = 'round';
  const col = 'rgba(244,244,240,';
  for (const [lw, a] of [[2.6, 0.18], [1.1, 0.8]] as const) {
    g.strokeStyle = col + a + ')';
    g.lineWidth = lw * Math.max(0.6, L / 120);
    g.beginPath();
    for (const an of rays) {
      g.moveTo(0, 0);
      g.lineTo(Math.cos(an) * L * 1.05, Math.sin(an) * L * 1.05);
    }
    g.stroke();
    g.beginPath();
    for (let k = 1; k <= nr; k++) {
      const rr = L * 0.11 * k * (0.7 + 0.04 * k);
      for (let i = 0; i < na - 1; i++) {
        const a0 = rays[i]!;
        const a1 = rays[i + 1]!;
        const sag = 0.82 - 0.012 * k;
        const x0 = Math.cos(a0) * rr * (1 + (r() - 0.5) * 0.05);
        const y0 = Math.sin(a0) * rr;
        const x1 = Math.cos(a1) * rr;
        const y1 = Math.sin(a1) * rr * (1 + (r() - 0.5) * 0.05);
        const am = (a0 + a1) / 2;
        g.moveTo(x0, y0);
        g.quadraticCurveTo(Math.cos(am) * rr * sag, Math.sin(am) * rr * sag, x1, y1);
      }
    }
    g.stroke();
  }
  if (hang) {
    // indsvøbt bytte
    g.save();
    g.translate(L * 0.4, L * 0.4);
    g.rotate(0.7);
    g.beginPath();
    g.ellipse(0, 0, L * 0.12, L * 0.06, 0, 0, 7);
    g.fillStyle = 'rgba(230,228,220,.92)';
    g.fill();
    g.strokeStyle = 'rgba(60,56,48,.6)';
    g.lineWidth = 1;
    g.stroke();
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * L * 0.04, -L * 0.055);
      g.lineTo(i * L * 0.04 + L * 0.02, L * 0.055);
      g.strokeStyle = 'rgba(70,64,56,.4)';
      g.stroke();
    }
    g.restore();
  }
  g.restore();
}

function spiderEggs(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  // spind som underlag
  g.fillStyle = 'rgba(240,238,230,.5)';
  glow(g, 0, 0, R * 1.0, [236, 234, 224], 0.5);
  g.strokeStyle = 'rgba(240,240,236,.6)';
  g.lineWidth = 1;
  for (let i = 0; i < 22; i++) {
    const a = r() * 6.3;
    const b = r() * 6.3;
    g.beginPath();
    g.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9);
    g.quadraticCurveTo((r() - 0.5) * R * 0.5, (r() - 0.5) * R * 0.5, Math.cos(b) * R * 0.9, Math.sin(b) * R * 0.9);
    g.stroke();
  }
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * R * 0.5;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const s = R * (0.14 + r() * 0.12);
    g.beginPath();
    g.arc(x, y, s, 0, 7);
    g.fillStyle = radial(g, x, y, s, [[0, 'rgb(250,248,238)'], [0.7, 'rgb(212,208,192)'], [1, 'rgb(130,124,108)']], x - s * 0.35, y - s * 0.35, 0.1);
    g.fill();
    g.strokeStyle = 'rgba(40,36,28,.7)';
    g.lineWidth = 1.2;
    g.stroke();
    // ægs mørke prikker skinner svagt igennem
    for (let k = 0; k < 6; k++) {
      g.fillStyle = 'rgba(70,56,40,.35)';
      g.beginPath();
      g.arc(x + (r() - 0.5) * s * 1.1, y + (r() - 0.5) * s * 1.1, s * 0.11, 0, 7);
      g.fill();
    }
  }
}

// ---------------------------------------------------------------- krystaller, glas, torne, råd

function dangerCrystals(g: G, o: DrawInput, col: RGB, gl: number): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  glow(g, 0, 0, R * 1.2, col, gl);
  const n = 8 + Math.floor(r() * 4);
  const items: { x: number; y: number; a: number; L: number; w: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.3;
    const d = r() * R * 0.35;
    const big = i < 2;
    items.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, a: a + (r() - 0.5) * 0.8, L: R * (big ? 0.78 : 0.35 + r() * 0.35), w: R * (big ? 0.2 : 0.09 + r() * 0.07) });
  }
  items.sort((p, q) => p.L - q.L);
  for (const it of items) shard(g, it.x, it.y, it.a, it.L, it.w, shift(col, (r() - 0.5) * 24), 0.22);
}

function glassShards(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  const n = Math.round(Math.max(14, rx * ry * 0.012));
  for (let i = 0; i < n; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * 0.9;
    const x = Math.cos(a) * d * rx;
    const y = Math.sin(a) * d * ry;
    const s = Math.min(rx, ry) * (0.07 + r() * 0.14) * (1 - d * 0.4);
    const rot = r() * 6.3;
    const pts: [number, number][] = [[0, -s], [s * (0.3 + r() * 0.4), s * (0.2 + r() * 0.4)], [-s * (0.3 + r() * 0.5), s * (0.4 + r() * 0.3)]];
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    const col: RGB = r() < 0.15 ? [170, 220, 170] : [200, 230, 240];
    g.fillStyle = 'rgba(0,0,0,.18)';
    g.beginPath();
    pts.forEach((p, k) => (k ? g.lineTo(p[0] + 1, p[1] + 1.4) : g.moveTo(p[0] + 1, p[1] + 1.4)));
    g.fill();
    g.beginPath();
    pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.fillStyle = radial(g, 0, 0, s * 1.3, [[0, rgb(shift(col, 30), 0.82)], [1, rgb(shift(col, -50), 0.7)]], -s * 0.4, -s * 0.5, 0);
    g.fill();
    g.strokeStyle = 'rgba(230,250,255,.9)';
    g.lineWidth = 0.9;
    g.stroke();
    g.beginPath();
    g.moveTo(pts[0]![0] * 0.7, pts[0]![1] * 0.7);
    g.lineTo(pts[1]![0] * 0.5, pts[1]![1] * 0.5);
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.stroke();
    g.restore();
  }
}

function thornVines(g: G, o: DrawInput, poison: boolean): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  const stem: RGB = poison ? [66, 52, 84] : [70, 52, 36];
  glow(g, 0, 0, Math.max(rx, ry), [20, 24, 10], 0.3, Math.min(rx, ry));
  const n = 5;
  for (let i = 0; i < n; i++) {
    const pts: [number, number][] = [];
    let x = -rx * 0.9;
    let y = (r() - 0.5) * ry * 1.2;
    for (let k = 0; k < 8; k++) {
      pts.push([x, y]);
      x += (rx * 1.8) / 7;
      y += (r() - 0.5) * ry * 0.7;
      y = Math.max(-ry * 0.9, Math.min(ry * 0.9, y));
    }
    const trace = () => { g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
    g.lineJoin = 'round';
    g.lineCap = 'round';
    trace();
    g.strokeStyle = 'rgba(10,6,2,.8)';
    g.lineWidth = Math.max(3, ry * 0.2);
    g.stroke();
    trace();
    g.strokeStyle = rgb(shift(stem, 10));
    g.lineWidth = Math.max(2, ry * 0.14);
    g.stroke();
    trace();
    g.strokeStyle = rgb(shift(stem, 50), 0.6);
    g.lineWidth = Math.max(0.8, ry * 0.04);
    g.translate(-0.8, -0.8);
    g.stroke();
    g.translate(0.8, 0.8);
    for (let k = 0; k < pts.length - 1; k++) {
      for (let t = 0; t < 2; t++) {
        const px = pts[k]![0] + (pts[k + 1]![0] - pts[k]![0]) * (0.25 + t * 0.5);
        const py = pts[k]![1] + (pts[k + 1]![1] - pts[k]![1]) * (0.25 + t * 0.5);
        const a = r() * 6.3;
        const L = ry * (0.22 + r() * 0.22);
        g.beginPath();
        g.moveTo(px - Math.sin(a) * ry * 0.04, py + Math.cos(a) * ry * 0.04);
        g.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L);
        g.lineTo(px + Math.sin(a) * ry * 0.04, py - Math.cos(a) * ry * 0.04);
        g.fillStyle = 'rgb(150,140,120)';
        g.fill();
        g.strokeStyle = 'rgba(12,6,2,.8)';
        g.lineWidth = 0.8;
        g.stroke();
      }
      if (poison && r() < 0.6) {
        g.beginPath();
        g.arc(pts[k]![0], pts[k]![1] + ry * 0.12, ry * 0.1, 0, 7);
        g.fillStyle = 'rgb(120,40,150)';
        g.fill();
        g.strokeStyle = OUT;
        g.lineWidth = 0.9;
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,.6)';
        g.beginPath();
        g.arc(pts[k]![0] - ry * 0.03, pts[k]![1] + ry * 0.08, ry * 0.025, 0, 7);
        g.fill();
      }
    }
  }
  for (let i = 0; i < 18; i++) {
    g.save();
    g.translate((r() - 0.5) * rx * 1.7, (r() - 0.5) * ry * 1.5);
    g.rotate(r() * 6.3);
    const s = ry * 0.14;
    g.beginPath();
    g.ellipse(0, 0, s, s * 0.5, 0, 0, 7);
    g.fillStyle = rgb(poison ? [70 + r() * 30, 100 + r() * 40, 70] : [60 + r() * 30, 100 + r() * 40, 40], 0.95);
    g.fill();
    g.strokeStyle = 'rgba(10,20,6,.6)';
    g.lineWidth = 0.7;
    g.stroke();
    g.restore();
  }
}

function mold(g: G, o: DrawInput, rot: boolean): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  const cols: RGB[] = rot ? [[96, 68, 40], [66, 50, 34], [110, 120, 60]] : [[84, 120, 66], [52, 84, 54], [140, 160, 90], [36, 50, 40]];
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 10; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * 0.75;
      const s = Math.min(rx, ry) * (0.1 + r() * 0.2) * (1.1 - k * 0.25);
      const path = blobPath(g, holePts(r, s, s * 0.85, 0.3, 9).map(([x, y]): [number, number] => [x + Math.cos(a) * d * rx, y + Math.sin(a) * d * ry]));
      path();
      g.fillStyle = rgb(shift(cols[Math.floor(r() * cols.length)]!, (r() - 0.5) * 24), 0.5 + k * 0.15);
      g.fill();
    }
  }
  for (let i = 0; i < 70; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * 0.85;
    g.fillStyle = rgb(shift(cols[Math.floor(r() * cols.length)]!, 40), 0.55);
    g.beginPath();
    g.arc(Math.cos(a) * d * rx, Math.sin(a) * d * ry, 0.6 + r() * 1.5, 0, 7);
    g.fill();
  }
  if (rot) {
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = 'rgba(30,18,8,.55)';
      g.lineWidth = 1.2;
      g.beginPath();
      const x = (r() - 0.5) * rx * 1.2;
      const y = (r() - 0.5) * ry * 1.2;
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * rx * 0.5, y + (r() - 0.5) * ry * 0.5);
      g.stroke();
    }
  }
}

function slimeTrail(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const w = o.w;
  const h = o.h;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 7; i++) pts.push([-w * 0.46 + (w * 0.92 * i) / 7, Math.sin(i * 0.9 + r() * 2) * h * 0.28]);
  const trace = () => {
    g.beginPath();
    g.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i]![0], pts[i]![1], (pts[i]![0] + pts[i + 1]![0]) / 2, (pts[i]![1] + pts[i + 1]![1]) / 2);
    g.lineTo(pts[pts.length - 1]![0], pts[pts.length - 1]![1]);
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [lw, col] of [[h * 0.62, 'rgba(90,130,40,.25)'], [h * 0.44, 'rgba(120,170,60,.55)'], [h * 0.26, 'rgba(170,220,90,.85)']] as const) {
    trace();
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.stroke();
  }
  trace();
  g.strokeStyle = 'rgba(255,255,230,.7)';
  g.lineWidth = Math.max(1, h * 0.04);
  g.translate(-1, -1.4);
  g.stroke();
  g.translate(1, 1.4);
  for (let i = 0; i < 6; i++) {
    const p = pts[Math.floor(r() * pts.length)]!;
    g.fillStyle = 'rgba(150,200,80,.65)';
    g.beginPath();
    g.ellipse(p[0] + (r() - 0.5) * 6, p[1] + (r() - 0.5) * h * 0.5, 2 + r() * 3, 1.5 + r() * 2, 0, 0, 7);
    g.fill();
  }
}

function scorch(g: G, o: DrawInput, kind2: 'burn' | 'embers'): void {
  const r = rng(o.seed);
  const rx = o.w / 2;
  const ry = o.h / 2;
  for (let k = 0; k < 3; k++) {
    const path = blobPath(g, holePts(r, rx * (0.85 - k * 0.2), ry * (0.85 - k * 0.2), 0.16, 14));
    path();
    g.fillStyle = `rgba(${14 + k * 6},${10 + k * 4},8,${0.3 + k * 0.2})`;
    g.fill();
  }
  glow(g, 0, 0, Math.max(rx, ry) * 0.9, [8, 4, 2], 0.45, Math.min(rx, ry) * 0.9);
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * 0.9;
    g.fillStyle = `rgba(${r() < 0.5 ? '30,24,20' : '70,60,52'},${0.3 + r() * 0.4})`;
    g.beginPath();
    g.ellipse(Math.cos(a) * d * rx, Math.sin(a) * d * ry, 1 + r() * rx * 0.05, 1 + r() * ry * 0.03, r() * 3, 0, 7);
    g.fill();
  }
  if (kind2 === 'embers') {
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * 0.7;
      const x = Math.cos(a) * d * rx;
      const y = Math.sin(a) * d * ry;
      glow(g, x, y, 5 + r() * 7, [255, 110, 30], 0.7);
      g.fillStyle = 'rgb(255,220,120)';
      g.beginPath();
      g.arc(x, y, 1 + r() * 1.5, 0, 7);
      g.fill();
    }
  }
}

const colorParam = (def: string): ParamDef => ({
  key: 'tone', label: 'Farve', type: 'select', default: def,
  options: [{ value: 'red', label: 'Rød' }, { value: 'violet', label: 'Violet' }, { value: 'green', label: 'Grøn' }, { value: 'blue', label: 'Blå' }],
});
const CRYSTAL: Record<string, RGB> = { red: [220, 60, 70], violet: [150, 90, 220], green: [90, 200, 110], blue: [90, 150, 230] };

export const hazardKinds: ObjectKind[] = [
  kind({ key: 'hazx_puddle_acid', family: 'hazardx', name: 'Syrepyt', w: 1.6, h: 1.4, randomRotation: true, sizeJitter: 0.3, bleed: 0.3, layers: FLOOR, tags: ['dungeon', 'cave', 'swamp'], draw: (g, o) => puddle(g, o, 'acid') }),
  kind({ key: 'hazx_puddle_poison', family: 'hazardx', name: 'Giftpyt', w: 1.6, h: 1.4, randomRotation: true, sizeJitter: 0.3, bleed: 0.3, layers: FLOOR, tags: ['dungeon', 'cave', 'swamp'], draw: (g, o) => puddle(g, o, 'poison') }),
  kind({ key: 'hazx_puddle_oil', family: 'hazardx', name: 'Oliepøl', w: 1.6, h: 1.3, randomRotation: true, sizeJitter: 0.3, bleed: 0.2, layers: FLOOR, tags: ['dungeon', 'city', 'house'], draw: (g, o) => puddle(g, o, 'oil') }),
  kind({ key: 'hazx_puddle_tar', family: 'hazardx', name: 'Tjærepøl', w: 1.8, h: 1.5, randomRotation: true, sizeJitter: 0.3, bleed: 0.2, layers: FLOOR, tags: ['cave', 'swamp', 'harbor'], draw: (g, o) => puddle(g, o, 'tar') }),
  kind({ key: 'hazx_puddle_water', family: 'hazardx', name: 'Vandpyt', w: 1.6, h: 1.3, randomRotation: true, sizeJitter: 0.3, bleed: 0.2, layers: FLOOR, tags: ['outdoor', 'dungeon', 'cave'], draw: (g, o) => puddle(g, o, 'water') }),
  kind({ key: 'hazx_slime_puddle', family: 'hazardx', name: 'Slimpøl', w: 1.6, h: 1.4, randomRotation: true, sizeJitter: 0.3, bleed: 0.3, layers: FLOOR, tags: ['dungeon', 'cave', 'swamp'], draw: (g, o) => puddle(g, o, 'slime') }),
  kind({ key: 'hazx_slime_trail', family: 'hazardx', name: 'Slimspor', w: 3.5, h: 1, keepAspect: false, randomRotation: true, sizeJitter: 0.2, bleed: 0.1, layers: FLOOR, tags: ['dungeon', 'cave', 'swamp'], draw: slimeTrail }),
  kind({ key: 'hazx_ice_patch', family: 'hazardx', name: 'Isplet', w: 1.8, h: 1.5, randomRotation: true, sizeJitter: 0.3, bleed: 0.1, layers: FLOOR, tags: ['arctic', 'outdoor', 'cave'], draw: (g, o) => iceSlick(g, o, true) }),
  kind({ key: 'hazx_slick', family: 'hazardx', name: 'Glat flade', w: 2.4, h: 2, randomRotation: true, sizeJitter: 0.3, bleed: 0.1, layers: FLOOR, tags: ['arctic', 'dungeon', 'cave'], draw: (g, o) => iceSlick(g, o, false) }),
  kind({ key: 'hazx_lava_cracks', family: 'hazardx', name: 'Lavasprækker', w: 2, h: 2, randomRotation: true, sizeJitter: 0.25, bleed: 0.4, layers: FX, tags: ['cave', 'mountain', 'dungeon'], draw: (g, o) => lavaCracks(g, o, false) }),
  kind({ key: 'hazx_lava_pool', family: 'hazardx', name: 'Lavapøl', w: 2, h: 1.8, randomRotation: true, sizeJitter: 0.25, bleed: 0.4, layers: FX, tags: ['cave', 'mountain', 'dungeon'], draw: (g, o) => lavaCracks(g, o, true) }),
  kind({ key: 'hazx_magma_bubbles', family: 'hazardx', name: 'Boblende magma', w: 2.2, h: 2.2, randomRotation: true, sizeJitter: 0.25, bleed: 0.4, layers: FX, tags: ['cave', 'mountain', 'dungeon'], draw: magmaBubbles }),
  kind({ key: 'hazx_swamp_gas', family: 'hazardx', name: 'Sumpgas', w: 3, h: 3, randomRotation: true, bleed: 0.4, layers: FX, tags: ['swamp', 'cave', 'graveyard'], draw: (g, o) => { const r = rng(o.seed); mistBlobs(g, r, o.w / 2, o.h / 2, [150, 190, 80], 0.26, 11, true); } }),
  kind({ key: 'hazx_spores', family: 'hazardx', name: 'Svampesporer', w: 2.4, h: 2.4, randomRotation: true, bleed: 0.4, layers: FX, tags: ['cave', 'forest', 'swamp'], draw: sporeCloud }),
  kind({ key: 'hazx_web_corner', family: 'hazardx', name: 'Spindelvæv i hjørne', w: 2.2, h: 2.2, keepAspect: false, bleed: 0.1, layers: FX, tags: ['dungeon', 'cave', 'ruin', 'crypt'], draw: (g, o) => webCorner(g, o, false) }),
  kind({ key: 'hazx_web_prey', family: 'hazardx', name: 'Spindelvæv med bytte', w: 2.6, h: 2.6, keepAspect: false, bleed: 0.1, layers: FX, tags: ['dungeon', 'cave', 'forest'], draw: (g, o) => webCorner(g, o, true) }),
  kind({ key: 'hazx_spider_eggs', family: 'hazardx', name: 'Edderkoppeæg', w: 1.6, h: 1.6, randomRotation: true, sizeJitter: 0.2, bleed: 0.15, layers: FX, shadow: 2, tags: ['dungeon', 'cave', 'forest'], draw: spiderEggs }),
  kind({ key: 'hazx_crystals', family: 'hazardx', name: 'Farlige krystaller', w: 1.8, h: 1.8, randomRotation: true, sizeJitter: 0.2, shadow: 4, bleed: 0.2, layers: FX, params: [colorParam('red')], tags: ['cave', 'dungeon', 'mountain'], draw: (g, o) => dangerCrystals(g, o, CRYSTAL[param(o, 'tone', 'red')] ?? CRYSTAL.red!, 0.28) }),
  kind({ key: 'hazx_crystals_violet', family: 'hazardx', name: 'Farlige krystaller, violette', w: 1.8, h: 1.8, randomRotation: true, sizeJitter: 0.2, shadow: 4, bleed: 0.2, layers: FX, tags: ['cave', 'dungeon', 'magic'], draw: (g, o) => dangerCrystals(g, o, CRYSTAL.violet!, 0.3) }),
  kind({ key: 'hazx_glass', family: 'hazardx', name: 'Glasskår', w: 2, h: 1.6, randomRotation: true, sizeJitter: 0.3, bleed: 0.1, layers: FLOOR, tags: ['city', 'house', 'tavern', 'battlefield'], draw: glassShards }),
  kind({ key: 'hazx_thorns', family: 'hazardx', name: 'Tornede ranker', w: 3, h: 1.5, keepAspect: false, randomRotation: true, sizeJitter: 0.2, bleed: 0.1, layers: FLOOR, tags: ['forest', 'swamp', 'ruin'], draw: (g, o) => thornVines(g, o, false) }),
  kind({ key: 'hazx_poison_vines', family: 'hazardx', name: 'Giftige ranker', w: 3, h: 1.5, keepAspect: false, randomRotation: true, sizeJitter: 0.2, bleed: 0.1, layers: FLOOR, tags: ['forest', 'swamp', 'cave'], draw: (g, o) => thornVines(g, o, true) }),
  kind({ key: 'hazx_mold', family: 'hazardx', name: 'Skimmel', w: 2, h: 2, randomRotation: true, sizeJitter: 0.3, bleed: 0.1, layers: FLOOR, tags: ['dungeon', 'cave', 'ruin', 'house'], draw: (g, o) => mold(g, o, false) }),
  kind({ key: 'hazx_rot', family: 'hazardx', name: 'Råd og svamp', w: 2, h: 2, randomRotation: true, sizeJitter: 0.3, bleed: 0.1, layers: FLOOR, tags: ['dungeon', 'cave', 'ruin', 'swamp'], draw: (g, o) => mold(g, o, true) }),
  kind({ key: 'hazx_scorch', family: 'hazardx', name: 'Brandplet', w: 2, h: 2, randomRotation: true, sizeJitter: 0.3, bleed: 0.2, layers: FLOOR, tags: ['battlefield', 'ruin', 'dungeon', 'camp'], draw: (g, o) => scorch(g, o, 'burn') }),
  kind({ key: 'hazx_embers', family: 'hazardx', name: 'Gløder i aske', w: 2, h: 2, randomRotation: true, sizeJitter: 0.3, bleed: 0.3, layers: FX, tags: ['battlefield', 'ruin', 'camp', 'village'], draw: (g, o) => scorch(g, o, 'embers') }),
];

export { rope, stateParam };
