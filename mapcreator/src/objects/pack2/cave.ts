import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  blobPath, body, castShadow, clipped, crack, groundShadow, lin, mix, mottle, OUT, radial, rgb, shift, wobble, type G, type RGB, type Rnd,
} from './helpers';

const LIME: Record<string, RGB> = { limestone: [196, 184, 156], umber: [140, 108, 76], slate: [104, 108, 118] };

// ------------------------------------------------------------------ drypsten

function stalagmite(g: G, r: Rnd, x: number, y: number, rad: number, col: RGB, wet: boolean): void {
  const p = blobPath(g, wobble(r, x, y, rad, rad, 10, 0.08));
  castShadow(g, p, rad * 0.28, rad * 0.34, rad * 0.35, 0.45);
  // kegle set oppefra: mørk fod og lys spids forskudt mod lyset
  g.fillStyle = radial(g, x, y, rad * 1.05, [[0, rgb(shift(col, 44))], [0.45, rgb(col)], [1, rgb(shift(col, -64))]], x - rad * 0.3, y - rad * 0.32, rad * 0.04);
  p();
  g.fill();
  clipped(g, p, () => {
    // vækstringe: koncentriske, let forskudte
    for (let i = 1; i < 6; i++) {
      const k = 1 - i / 6.5;
      g.strokeStyle = `rgba(30,18,8,${0.05 + i * 0.012})`;
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(x - rad * 0.12 * (1 - k), y - rad * 0.12 * (1 - k), rad * k, rad * k * 0.97, 0, 0, 7);
      g.stroke();
      g.strokeStyle = 'rgba(255,246,220,.18)';
      g.beginPath();
      g.ellipse(x - rad * 0.12 * (1 - k) - 0.7, y - rad * 0.12 * (1 - k) - 0.7, rad * k, rad * k * 0.97, 0, 3.4, 5.4);
      g.stroke();
    }
    mottle(g, r, [x - rad, y - rad, x + rad, y + rad], col, 14, rad * 0.07, 20, 0.35);
    // dryp-linjer ned ad siderne
    g.strokeStyle = 'rgba(20,12,4,.28)';
    g.lineWidth = 0.7;
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = r() * 6.28;
      g.moveTo(x + Math.cos(a) * rad * 0.25, y + Math.sin(a) * rad * 0.25);
      g.lineTo(x + Math.cos(a) * rad * 0.98, y + Math.sin(a) * rad * 0.98);
    }
    g.stroke();
  });
  p();
  g.strokeStyle = 'rgba(22,12,6,.85)';
  g.lineWidth = 1.5;
  g.stroke();
  if (wet) {
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath();
    g.ellipse(x - rad * 0.32, y - rad * 0.36, rad * 0.2, rad * 0.1, -0.7, 0, 7);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath();
    g.arc(x + rad * 0.1, y + rad * 0.1, rad * 0.05, 0, 7);
    g.fill();
  }
}

function stalagmites(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const col = LIME[param(o, 'tone', 'limestone')] ?? LIME.limestone!;
  const wet = param(o, 'wet', true);
  const n = 6 + Math.floor(r() * 4);
  // sten og smulder ved foden
  for (let i = 0; i < 16; i++) {
    const a = r() * 6.28;
    const d = R * (0.2 + r() * 0.75);
    const pr = R * (0.03 + r() * 0.04);
    g.fillStyle = rgb(shift([96, 90, 84] as RGB, (r() - 0.5) * 40));
    g.beginPath();
    g.ellipse(Math.cos(a) * d, Math.sin(a) * d, pr * 1.3, pr, r() * 3, 0, 7);
    g.fill();
    g.strokeStyle = 'rgba(20,12,6,.7)';
    g.lineWidth = 0.9;
    g.stroke();
  }
  const list: { x: number; y: number; rad: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 0.62;
    list.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, rad: R * (i === 0 ? 0.32 : 0.1 + r() * 0.17) });
  }
  list.sort((a, b) => a.y - b.y);
  for (const s of list) stalagmite(g, r, s.x, s.y, s.rad, shift(col, (r() - 0.5) * 24), wet);
}

// ------------------------------------------------------------------ grottedam

function cavePool(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const tone = param(o, 'water', 'clear');
  const glow = param(o, 'glow', false);
  const deep: RGB = tone === 'murky' ? [28, 44, 28] : tone === 'acid' ? [40, 84, 20] : [12, 40, 62];
  const shallow: RGB = tone === 'murky' ? [86, 112, 70] : tone === 'acid' ? [150, 200, 60] : [74, 156, 178];
  const rimPts = wobble(r, 0, 0, w * 0.49, h * 0.47, 18, 0.1);
  const pool = blobPath(g, rimPts.map(([x, y]) => [x * 0.88 + 0.01 * w, y * 0.86 + 0.01 * h] as [number, number]));
  // klippekant
  const rimShape = blobPath(g, rimPts);
  castShadow(g, rimShape, 4, 5, 6, 0.35);
  body(g, rimShape, [94, 88, 82], [-w / 2, -h / 2, w / 2, h / 2], { lw: 2, ao: 3, rim: 1.4, light: 26, dark: 28 });
  clipped(g, rimShape, () => {
    mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], [94, 88, 82], 120, 3.2, 26, 0.35);
    for (let i = 0; i < 8; i++) crack(g, r, (r() - 0.5) * w, (r() - 0.5) * h, w * 0.1, r() * 6, 0.9);
    // våde sten med glans
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28;
      const x = Math.cos(a) * w * 0.455;
      const y = Math.sin(a) * h * 0.44;
      g.fillStyle = 'rgba(214,230,236,.3)';
      g.beginPath();
      g.ellipse(x, y, 2 + r() * 4, 1 + r() * 2, a, 0, 7);
      g.fill();
    }
  });
  // vandet
  pool();
  g.fillStyle = radial(g, 0, 0, w * 0.46, [[0, rgb(deep)], [0.5, rgb(mix(deep, shallow, 0.3))], [0.85, rgb(shallow)], [1, rgb(shift(shallow, 40))]]);
  g.fill();
  clipped(g, pool, () => {
    // bundens sten og lysbrydning i det lave vand
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28;
      const d = w * (0.3 + r() * 0.16);
      g.fillStyle = `rgba(${40 + r() * 40},${60 + r() * 40},${70 + r() * 30},.45)`;
      g.beginPath();
      g.ellipse(Math.cos(a) * d, Math.sin(a) * d * (h / w), 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, 7);
      g.fill();
    }
    // lysnet (kaustik)
    g.strokeStyle = glow ? 'rgba(170,240,255,.5)' : 'rgba(220,244,252,.25)';
    g.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const x = (r() - 0.5) * w * 0.8;
      const y = (r() - 0.5) * h * 0.7;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + 8, y - 5, x + 14, y + 6, x + 22, y);
      g.stroke();
    }
    // spejling af klippeloftet
    g.fillStyle = lin(g, -w * 0.3, -h * 0.3, w * 0.2, h * 0.1, [[0, 'rgba(210,230,240,.34)'], [0.35, 'rgba(210,230,240,.08)'], [1, 'rgba(210,230,240,0)']]);
    g.beginPath();
    g.ellipse(-w * 0.1, -h * 0.12, w * 0.3, h * 0.12, -0.4, 0, 7);
    g.fill();
    // dyb skygge mod nederst til højre
    g.fillStyle = lin(g, 0, 0, w * 0.45, h * 0.45, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,10,20,.38)']]);
    g.fillRect(-w / 2, -h / 2, w, h);
    // dryppeffekt: ringe
    const dx = (r() - 0.5) * w * 0.3;
    const dy = (r() - 0.5) * h * 0.25;
    for (let i = 1; i <= 4; i++) {
      g.strokeStyle = `rgba(230,248,255,${0.55 - i * 0.11})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(dx, dy, i * 5, i * 4, 0, 0, 7);
      g.stroke();
    }
    if (glow) {
      for (let i = 0; i < 40; i++) {
        const a = r() * 6.28;
        const d = Math.sqrt(r()) * w * 0.42;
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d * (h / w);
        g.fillStyle = radial(g, x, y, 5 + r() * 4, [[0, 'rgba(120,255,230,.95)'], [1, 'rgba(60,200,220,0)']]);
        g.beginPath();
        g.arc(x, y, 5 + r() * 4, 0, 7);
        g.fill();
      }
    }
  });
  pool();
  g.strokeStyle = 'rgba(10,20,26,.85)';
  g.lineWidth = 1.8;
  g.stroke();
  // lys kant af vådt grus langs vandlinjen
  g.save();
  g.translate(-0.8, -0.8);
  pool();
  g.strokeStyle = 'rgba(230,244,250,.3)';
  g.lineWidth = 1;
  g.stroke();
  g.restore();
  void OUT;
  void groundShadow;
}

export const caveKinds: ObjectKind[] = [
  kind({
    key: 'stalagmites', family: 'cave', name: 'Drypsten', w: 1.8, h: 1.8, sizeJitter: 0.2, randomRotation: true, shadow: 5, bleed: 0.12,
    params: [
      { key: 'tone', label: 'Sten', type: 'select', default: 'limestone', options: [{ value: 'limestone', label: 'Kalk' }, { value: 'umber', label: 'Brun' }, { value: 'slate', label: 'Grå' }] },
      { key: 'wet', label: 'Fugtige', type: 'toggle', default: true },
    ],
    draw: stalagmites,
  }),
  kind({
    key: 'cave_pool', family: 'cave', name: 'Grottedam', w: 3.2, h: 2.6, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: false,
    params: [
      { key: 'water', label: 'Vand', type: 'select', default: 'clear', options: [{ value: 'clear', label: 'Klart' }, { value: 'murky', label: 'Mudret' }, { value: 'acid', label: 'Syre' }] },
      { key: 'glow', label: 'Lysende alger', type: 'toggle', default: false },
    ],
    draw: cavePool,
  }),
];
