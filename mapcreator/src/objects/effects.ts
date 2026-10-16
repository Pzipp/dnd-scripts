import { kind, param, type DrawInput, type ObjectKind } from './registry';
import { blob, mix, rgb, rng, shift, smooth, softDot, type RGB } from './util';

const LIGHT: Record<string, RGB> = { warm: [255, 206, 120], cold: [160, 200, 255], red: [255, 110, 80] };

function lightPool(g: CanvasRenderingContext2D, o: DrawInput): void {
  const col = LIGHT[param(o, 'color', 'warm')] ?? LIGHT.warm!;
  const strength = param(o, 'strength', 0.5);
  g.save();
  g.scale(o.w / 2, o.h / 2);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${strength})`);
  gr.addColorStop(0.5, `rgba(${col[0]},${col[1]},${col[2]},${strength * 0.45})`);
  gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, 1, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function torch(g: CanvasRenderingContext2D, o: DrawInput): void {
  const S = Math.min(o.w, o.h);
  const col: RGB = param(o, 'color', 'warm') === 'cold' ? [150, 190, 255] : [255, 170, 70];
  softDot(g, 0, 0, S * 3, col, 0.38);
  softDot(g, 0, 0, S * 1.4, mix(col, [255, 255, 220], 0.4), 0.45);
  g.beginPath();
  g.arc(0, 0, S * 0.3, 0, Math.PI * 2);
  g.fillStyle = 'rgb(54,40,30)';
  g.fill();
  const fl = g.createRadialGradient(0, 0, 0, 0, 0, S * 0.26);
  fl.addColorStop(0, 'rgb(255,250,214)');
  fl.addColorStop(0.5, rgb(mix(col, [255, 240, 150], 0.5)));
  fl.addColorStop(1, rgb(col, 0.9));
  g.fillStyle = fl;
  g.beginPath();
  g.arc(0, 0, S * 0.24, 0, Math.PI * 2);
  g.fill();
}

function campfire(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const lit = param(o, 'lit', true);
  if (lit) softDot(g, 0, 0, R * 3.2, [255, 160, 70], 0.34);
  // askeplet og sten
  smooth(g, blob(R * 0.8, R * 0.8, 0.1, 12, r));
  g.fillStyle = lit ? 'rgb(52,40,32)' : 'rgb(72,66,62)';
  g.fill();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.2;
    const cx = Math.cos(a) * R * 0.88;
    const cy = Math.sin(a) * R * 0.88;
    smooth(g, blob(R * 0.2, R * 0.17, 0.2, 8, r, cx, cy, a));
    g.fillStyle = rgb(shift([130, 128, 122], (r() - 0.5) * 40));
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.55)';
    g.lineWidth = Math.max(0.8, R * 0.03);
    g.stroke();
  }
  // brændestykker
  g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + r() * 0.3;
    g.strokeStyle = 'rgb(58,38,24)';
    g.lineWidth = R * 0.16;
    g.beginPath();
    g.moveTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5);
    g.lineTo(-Math.cos(a) * R * 0.5, -Math.sin(a) * R * 0.5);
    g.stroke();
  }
  if (lit) {
    softDot(g, 0, 0, R * 0.7, [255, 130, 40], 0.9);
    softDot(g, 0, 0, R * 0.42, [255, 220, 110], 0.95);
    softDot(g, 0, -R * 0.04, R * 0.2, [255, 255, 230], 1);
  }
}

function fog(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const density = param(o, 'density', 0.5);
  const n = Math.max(6, Math.round((o.w * o.h) / 4000));
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * o.w * 0.8;
    const y = (r() - 0.5) * o.h * 0.8;
    softDot(g, x, y, Math.min(o.w, o.h) * (0.22 + r() * 0.2), [236, 240, 244], density * 0.5);
  }
}

export const effectKinds: ObjectKind[] = [
  kind({
    key: 'torch', family: 'light', name: 'Fakkel', w: 0.5, h: 0.5, bleed: 2.5,
    params: [{ key: 'color', label: 'Lys', type: 'select', default: 'warm', options: [{ value: 'warm', label: 'Varmt' }, { value: 'cold', label: 'Koldt' }] }],
    draw: torch,
  }),
  kind({ key: 'campfire', family: 'light', name: 'Bål', w: 1.2, h: 1.2, randomRotation: true, bleed: 2.2, shadow: 0, params: [{ key: 'lit', label: 'Tændt', type: 'toggle', default: true }], draw: campfire }),
  kind({
    key: 'light_pool', family: 'light', name: 'Lyspøl', w: 6, h: 6, keepAspect: false, bleed: 0,
    params: [
      { key: 'color', label: 'Farve', type: 'select', default: 'warm', options: [{ value: 'warm', label: 'Varm' }, { value: 'cold', label: 'Kold' }, { value: 'red', label: 'Rød' }] },
      { key: 'strength', label: 'Styrke', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.5 },
    ],
    draw: lightPool,
  }),
  kind({ key: 'fog', family: 'fog', name: 'Tåge', w: 8, h: 5, keepAspect: false, bleed: 0.1, params: [{ key: 'density', label: 'Tæthed', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.5 }], draw: fog }),
];
