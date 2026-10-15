import { kind, param, type DrawInput, type ObjectKind } from './registry';
import { blob, mix, polygon, rgb, rng, smooth, type RGB } from './util';
import { drawBloodPool, drawBonesScatter, drawRibs, drawSkull, drawSplatter, drawTrail } from './basics/remains';

const CLOTH: Record<string, RGB> = { brown: [112, 84, 56], green: [64, 100, 60], blue: [60, 86, 140], grey: [110, 110, 112], red: [140, 48, 44] };

function bloodPool(g: CanvasRenderingContext2D, r: () => number, rx: number, ry: number, fresh: boolean): void {
  const dark: RGB = fresh ? [120, 12, 14] : [66, 22, 20];
  const light: RGB = fresh ? [176, 28, 28] : [96, 36, 30];
  smooth(g, blob(rx, ry, 0.3, 11, r));
  g.fillStyle = rgb(dark, 0.92);
  g.fill();
  smooth(g, blob(rx * 0.66, ry * 0.62, 0.3, 9, r, -rx * 0.08, -ry * 0.1));
  g.fillStyle = rgb(mix(dark, light, 0.6), 0.9);
  g.fill();
  if (fresh) {
    smooth(g, blob(rx * 0.22, ry * 0.18, 0.3, 7, r, -rx * 0.25, -ry * 0.25));
    g.fillStyle = 'rgba(255,170,160,.35)';
    g.fill();
  }
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    const d = (1.05 + r() * 0.5) * Math.max(rx, ry);
    g.fillStyle = rgb(dark, 0.9);
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(rx, ry) * (0.04 + r() * 0.06), 0, Math.PI * 2);
    g.fill();
  }
}

interface Body {
  skin: RGB;
  hair: RGB;
}

function corpse(g: CanvasRenderingContext2D, o: DrawInput, body: Body, pose: 'back' | 'face'): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  if (param(o, 'blood', true)) {
    g.save();
    g.translate(0, H * 0.02);
    bloodPool(g, r, W * 0.46, H * 0.3, true);
    g.restore();
  }
  const cloth = CLOTH[param(o, 'cloth', 'brown')] ?? CLOTH.brown!;
  const stroke = 'rgba(20,10,6,.75)';
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const limb = (x1: number, y1: number, x2: number, y2: number, wd: number, col: RGB) => {
    g.strokeStyle = stroke;
    g.lineWidth = wd + Math.max(1, W * 0.04);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    g.strokeStyle = rgb(col);
    g.lineWidth = wd;
    g.stroke();
  };
  const sp = () => (r() - 0.5) * 0.5;
  limb(-W * 0.08, H * 0.06, -W * (0.18 + sp() * 0.3), H * 0.42, W * 0.13, mix(cloth, [40, 36, 34], 0.35));
  limb(W * 0.08, H * 0.06, W * (0.2 + sp() * 0.3), H * 0.4, W * 0.13, mix(cloth, [40, 36, 34], 0.35));
  limb(-W * 0.14, -H * 0.18, -W * (0.4 + sp() * 0.2), -H * (0.02 + sp() * 0.2), W * 0.1, cloth);
  limb(W * 0.14, -H * 0.18, W * (0.38 + sp() * 0.2), H * (0.08 + sp() * 0.2), W * 0.1, cloth);
  g.fillStyle = rgb(body.skin);
  for (const [hx, hy] of [[-W * 0.42, -H * 0.1], [W * 0.4, H * 0.1]] as const) {
    g.beginPath();
    g.arc(hx, hy, W * 0.06, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.ellipse(0, -H * 0.06, W * 0.2, H * 0.22, 0, 0, Math.PI * 2);
  g.fillStyle = rgb(cloth);
  g.fill();
  g.strokeStyle = stroke;
  g.lineWidth = Math.max(1, W * 0.04);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.12)';
  g.beginPath();
  g.ellipse(-W * 0.05, -H * 0.12, W * 0.09, H * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  const hx = (r() - 0.5) * W * 0.1;
  g.beginPath();
  g.arc(hx, -H * 0.36, W * 0.13, 0, Math.PI * 2);
  g.fillStyle = rgb(body.skin);
  g.fill();
  g.stroke();
  // på maven ses kun hår; på ryggen kun en hårkant
  g.fillStyle = rgb(mix(body.hair, [150, 110, 60], r() * 0.3));
  g.beginPath();
  if (pose === 'face') g.arc(hx, -H * 0.36, W * 0.125, 0, Math.PI * 2);
  else g.arc(hx, -H * 0.375, W * 0.125, Math.PI * 1.05, Math.PI * 1.95);
  g.fill();
}

const REMAINS = { randomRotation: true, bleed: 0.08 };
const bodyParams = [
  { key: 'cloth', label: 'Tøj', type: 'select' as const, default: 'brown', options: [{ value: 'brown', label: 'Brun' }, { value: 'green', label: 'Grøn' }, { value: 'blue', label: 'Blå' }, { value: 'grey', label: 'Grå' }, { value: 'red', label: 'Rød' }] },
  { key: 'blood', label: 'Blod', type: 'toggle' as const, default: true },
];
const freshParam = { key: 'fresh', label: 'Frisk', type: 'toggle' as const, default: true };

export const remainsKinds: ObjectKind[] = [
  kind({ key: 'corpse_human', family: 'corpse', name: 'Menneske (ryg)', w: 1.2, h: 1.6, shadow: 3, ...REMAINS, bleed: 0.12, params: bodyParams, draw: (g, o) => corpse(g, o, { skin: [214, 176, 140], hair: [70, 46, 28] }, 'back') }),
  kind({ key: 'corpse_human_face', family: 'corpse', name: 'Menneske (mave)', w: 1.2, h: 1.6, shadow: 3, ...REMAINS, bleed: 0.12, params: bodyParams, draw: (g, o) => corpse(g, o, { skin: [196, 156, 120], hair: [52, 36, 24] }, 'face') }),
  kind({ key: 'corpse_goblin', family: 'corpse', name: 'Goblin', w: 0.8, h: 1.05, shadow: 2, ...REMAINS, bleed: 0.12, params: bodyParams, draw: (g, o) => corpse(g, o, { skin: [112, 150, 76], hair: [40, 52, 30] }, 'back') }),
  kind({ key: 'corpse_orc', family: 'corpse', name: 'Ork', w: 1.5, h: 1.9, shadow: 3, ...REMAINS, bleed: 0.12, params: bodyParams, draw: (g, o) => corpse(g, o, { skin: [92, 124, 78], hair: [30, 30, 28] }, 'back') }),
  kind({ key: 'blood_pool', family: 'blood', name: 'Pøl', w: 1.2, h: 1.2, keepAspect: false, ...REMAINS, sizeJitter: 0.3, bleed: 0.4, params: [freshParam], draw: drawBloodPool }),
  kind({ key: 'blood_splatter', family: 'blood', name: 'Sprøjt', w: 1.6, h: 1.6, ...REMAINS, sizeJitter: 0.3, bleed: 0.1, params: [freshParam], draw: drawSplatter }),
  kind({ key: 'blood_trail', family: 'blood', name: 'Slæbespor', w: 3, h: 0.7, keepAspect: false, ...REMAINS, sizeJitter: 0.2, bleed: 0.1, params: [freshParam], draw: drawTrail }),
  kind({ key: 'bones_scatter', family: 'bones', name: 'Knogler', w: 1.2, h: 1.2, shadow: 2, ...REMAINS, sizeJitter: 0.2, draw: drawBonesScatter }),
  kind({ key: 'bones_skull', family: 'bones', name: 'Kranie', w: 0.5, h: 0.5, shadow: 2, ...REMAINS, draw: (g, o) => drawSkull(g, 0, 0, Math.min(o.w, o.h) * 3.4) }),
  kind({ key: 'bones_ribs', family: 'bones', name: 'Ribben', w: 1, h: 1, shadow: 2, ...REMAINS, draw: (g, o) => drawRibs(g, 0, 0, Math.min(o.w, o.h)) }),
];
