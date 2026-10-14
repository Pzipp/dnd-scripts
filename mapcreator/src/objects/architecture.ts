import { kind, type DrawInput, type ObjectKind } from './registry';
import { blob, planks, rgb, rng, roundRect, shift, smooth, type RGB } from './util';

const STONE: RGB = [140, 138, 130];

function pillar(g: CanvasRenderingContext2D, o: DrawInput, shape: 'round' | 'square' | 'broken'): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const path = (k: number) => {
    if (shape === 'square') roundRect(g, -R * k, -R * k, R * 2 * k, R * 2 * k, R * 0.08);
    else {
      g.beginPath();
      g.arc(0, 0, R * k, 0, Math.PI * 2);
    }
  };
  path(1);
  g.fillStyle = rgb(shift(STONE, -30));
  g.fill();
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R * 0.9);
  gr.addColorStop(0, rgb(shift(STONE, 40)));
  gr.addColorStop(1, rgb(shift(STONE, -14)));
  path(0.84);
  g.fillStyle = gr;
  g.fill();
  path(1);
  g.strokeStyle = 'rgba(0,0,0,.5)';
  g.lineWidth = Math.max(1, R * 0.06);
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.35)';
  g.lineWidth = Math.max(0.7, R * 0.03);
  for (let i = 0; i < 3; i++) {
    const a = r() * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2);
    g.lineTo(Math.cos(a + 0.3) * R * 0.78, Math.sin(a + 0.3) * R * 0.78);
    g.stroke();
  }
  if (shape === 'broken') {
    // afbrudt: mørk, takket brudflade og brokker rundt om
    g.save();
    g.beginPath();
    g.moveTo(-R * 0.2, -R);
    for (let i = 0; i <= 6; i++) g.lineTo(-R * 0.2 + (i % 2 ? 0.35 : 0.1) * R + i * R * 0.12, -R + (i / 6) * R * 2);
    g.lineTo(R * 1.2, R);
    g.lineTo(R * 1.2, -R);
    g.closePath();
    g.clip();
    g.fillStyle = 'rgba(0,0,0,.4)';
    g.fillRect(-R, -R, R * 2.4, R * 2);
    g.restore();
    for (let i = 0; i < 7; i++) {
      const a = r() * Math.PI * 2;
      const d = R * (1.05 + r() * 0.4);
      smooth(g, blob(R * (0.1 + r() * 0.12), R * 0.1, 0.3, 7, r, Math.cos(a) * d, Math.sin(a) * d));
      g.fillStyle = rgb(shift(STONE, (r() - 0.5) * 40));
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.5)';
      g.lineWidth = Math.max(0.6, R * 0.03);
      g.stroke();
    }
  }
}

function stairs(g: CanvasRenderingContext2D, o: DrawInput, wood: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const base: RGB = wood ? [150, 108, 66] : STONE;
  const n = Math.max(3, Math.round(h / 16));
  const sh = h / n;
  for (let i = 0; i < n; i++) {
    const y = -h / 2 + i * sh;
    if (wood) planks(g, -w / 2, y, w, sh, shift(base, -12 + (i / n) * 40), 1, r);
    else {
      g.fillStyle = rgb(shift(base, -12 + (i / n) * 46));
      g.fillRect(-w / 2, y, w, sh + 0.5);
    }
    g.fillStyle = 'rgba(255,255,255,.22)';
    g.fillRect(-w / 2, y, w, Math.max(0.8, sh * 0.14));
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(-w / 2, y + sh * 0.86, w, Math.max(0.8, sh * 0.14));
  }
  g.strokeStyle = 'rgba(0,0,0,.7)';
  g.lineWidth = Math.max(1, w * 0.04);
  g.strokeRect(-w / 2, -h / 2, w, h);
}

function rubble(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * S * 0.42;
    const cx = Math.cos(a) * d;
    const cy = Math.sin(a) * d;
    const rs = S * (0.05 + r() * 0.1);
    const col = shift(STONE, (r() - 0.5) * 50);
    smooth(g, blob(rs, rs * 0.85, 0.3, 7, r, cx, cy, r() * 3));
    g.fillStyle = rgb(col);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.5)';
    g.lineWidth = Math.max(0.6, S * 0.012);
    g.stroke();
    smooth(g, blob(rs * 0.5, rs * 0.4, 0.3, 6, r, cx - rs * 0.2, cy - rs * 0.25));
    g.fillStyle = rgb(shift(col, 30), 0.6);
    g.fill();
  }
}

const P = { shadow: 14, bleed: 0.4 };

export const architectureKinds: ObjectKind[] = [
  kind({ key: 'pillar_round', family: 'pillar', name: 'Rund', w: 1, h: 1, randomRotation: true, shadow: P.shadow, bleed: 0.02, draw: (g, o) => pillar(g, o, 'round') }),
  kind({ key: 'pillar_square', family: 'pillar', name: 'Firkantet', w: 1, h: 1, shadow: P.shadow, bleed: 0.02, draw: (g, o) => pillar(g, o, 'square') }),
  kind({ key: 'pillar_broken', family: 'pillar', name: 'Brækket', w: 1, h: 1, randomRotation: true, shadow: 6, bleed: P.bleed, draw: (g, o) => pillar(g, o, 'broken') }),
  kind({ key: 'stairs_stone', family: 'stairs', name: 'Stentrappe', w: 2, h: 2, keepAspect: false, bleed: 0.02, draw: (g, o) => stairs(g, o, false) }),
  kind({ key: 'stairs_wood', family: 'stairs', name: 'Trætrappe', w: 1.5, h: 2, keepAspect: false, bleed: 0.02, draw: (g, o) => stairs(g, o, true) }),
  kind({ key: 'rubble', family: 'rubble', name: 'Murbrokker', w: 1.5, h: 1.5, randomRotation: true, sizeJitter: 0.3, shadow: 3, bleed: 0.05, draw: rubble }),
];
