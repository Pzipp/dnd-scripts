import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { blobPath, clipped, crack, mix, mottle, polyBody, radial, rgb, shift, wobble, type G, type RGB, type Rnd } from '../pack2/helpers';

const TONES: Record<string, RGB> = { grey: [124, 120, 112], brown: [120, 98, 76], dark: [76, 70, 74] };

function rockAt(g: G, r: Rnd, x: number, y: number, rad: number, base: RGB): void {
  const pts = wobble(r, x, y, rad, rad * (0.7 + r() * 0.3), 7 + Math.floor(r() * 3), 0.32, r() * 6.28);
  polyBody(g, pts, shift(base, (r() - 0.5) * 30), { lw: Math.max(1, rad * 0.07), light: 30, dark: 34, ao: rad * 0.12 });
  // lys kant og revne
  if (rad > 6) crack(g, r, x - rad * 0.2, y - rad * 0.1, rad * 0.9, r() * 6.28, 0.8, false);
}

function dust(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, n: number, a: number): void {
  for (let i = 0; i < n; i++) {
    const ang = r() * 6.28;
    const d = Math.sqrt(r());
    const x = cx + Math.cos(ang) * rx * d;
    const y = cy + Math.sin(ang) * ry * d;
    const rad = Math.min(rx, ry) * (0.12 + r() * 0.18);
    g.fillStyle = radial(g, x, y, rad, [[0, `rgba(170,160,146,${a})`], [1, 'rgba(170,160,146,0)']]);
    g.beginPath();
    g.arc(x, y, rad, 0, 7);
    g.fill();
  }
}

/** Nedfald: en bunke sten i en uregelmæssig figur, der spærrer en gang. `gap` lader en åbning stå. */
function rockfall(g: G, o: DrawInput, gap: 'none' | 'left' | 'center' | 'right'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const base = TONES[param(o, 'tone', 'grey')] ?? TONES.grey!;
  const outline = blobPath(g, wobble(r, 0, 0, w * 0.5, h * 0.5, 16, 0.12));
  const horizontal = w >= h;
  const span = horizontal ? w : h;
  const gapAt = gap === 'left' ? -0.3 : gap === 'right' ? 0.3 : 0;
  const gapW = gap === 'none' ? 0 : 0.24;
  const inGap = (x: number, y: number) => {
    if (!gapW) return false;
    const u = (horizontal ? x : y) / span - gapAt;
    return Math.abs(u) < gapW / 2;
  };
  // mørk bund, så sprækkerne mellem stenene ikke viser gulvet
  clipped(g, outline, () => {
    g.fillStyle = 'rgba(20,16,14,.55)';
    g.fillRect(-w / 2, -h / 2, w, h);
  });
  const rocks: { x: number; y: number; rad: number }[] = [];
  const minDim = Math.min(w, h);
  for (let i = 0; i < 400 && rocks.length < 70; i++) {
    const x = (r() - 0.5) * w * 0.98;
    const y = (r() - 0.5) * h * 0.98;
    if (((x / (w / 2)) ** 2 + (y / (h / 2)) ** 2) > 1.05) continue;
    if (inGap(x, y)) continue;
    const rad = minDim * (0.1 + r() * 0.17) * (1 - 0.3 * (((x / (w / 2)) ** 2 + (y / (h / 2)) ** 2)));
    if (rocks.some((k) => Math.hypot(k.x - x, k.y - y) < (k.rad + rad) * 0.7)) continue;
    rocks.push({ x, y, rad });
  }
  rocks.sort((a, b) => a.y + a.rad - (b.y + b.rad));
  for (const k of rocks) rockAt(g, r, k.x, k.y, k.rad, base);
  // enkelte sten midt i åbningen
  if (gapW) {
    for (let i = 0; i < 6; i++) {
      const u = gapAt + (r() - 0.5) * gapW;
      const x = horizontal ? u * span : (r() - 0.5) * w * 0.7;
      const y = horizontal ? (r() - 0.5) * h * 0.7 : u * span;
      rockAt(g, r, x, y, minDim * (0.04 + r() * 0.05), base);
    }
  }
  dust(g, r, 0, 0, w * 0.5, h * 0.5, 7, 0.14);
}

function pile(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const base = TONES[param(o, 'tone', 'grey')] ?? TONES.grey!;
  const R = Math.min(w, h) / 2;
  const rocks: { x: number; y: number; rad: number }[] = [];
  for (let i = 0; i < 300 && rocks.length < 22; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 0.78;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const rad = R * (0.12 + r() * 0.18) * (1.2 - d / R * 0.6);
    if (rocks.some((k) => Math.hypot(k.x - x, k.y - y) < (k.rad + rad) * 0.72)) continue;
    rocks.push({ x, y, rad });
  }
  rocks.sort((a, b) => b.rad - a.rad);
  rocks.sort((a, b) => a.rad - b.rad);
  for (const k of rocks) rockAt(g, r, k.x, k.y, k.rad, base);
  for (let i = 0; i < 12; i++) {
    const a = r() * 6.28;
    const d = R * (0.7 + r() * 0.28);
    rockAt(g, r, Math.cos(a) * d, Math.sin(a) * d, R * (0.03 + r() * 0.03), base);
  }
  dust(g, r, 0, 0, R, R, 5, 0.1);
}

/** Loft, der er styrtet ned: store flade plader og grus omkring et mørkt hul. */
function collapse(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const base = TONES[param(o, 'tone', 'grey')] ?? TONES.grey!;
  const R = Math.min(w, h) / 2;
  dust(g, r, 0, 0, R, R, 9, 0.16);
  const hole = blobPath(g, wobble(r, 0, 0, R * 0.55, R * 0.5, 12, 0.16));
  hole();
  g.fillStyle = radial(g, 0, 0, R * 0.6, [[0, 'rgb(6,5,6)'], [0.8, 'rgb(24,20,18)'], [1, 'rgb(44,38,34)']]);
  g.fill();
  clipped(g, hole, () => mottle(g, r, [-R, -R, R, R], [30, 26, 24], 10, R * 0.08, 10, 0.4));
  g.strokeStyle = 'rgba(0,0,0,.8)';
  g.lineWidth = 2;
  hole();
  g.stroke();
  const slabs: { x: number; y: number; rad: number }[] = [];
  for (let i = 0; i < 400 && slabs.length < 26; i++) {
    const a = r() * 6.28;
    const d = R * (0.45 + r() * 0.5);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const rad = R * (0.08 + r() * 0.2);
    if (slabs.some((k) => Math.hypot(k.x - x, k.y - y) < (k.rad + rad) * 0.75)) continue;
    slabs.push({ x, y, rad });
  }
  slabs.sort((a, b) => a.y - b.y);
  for (const s of slabs) rockAt(g, r, s.x, s.y, s.rad, s.rad > R * 0.18 ? mix(base, [150, 146, 138], 0.3) : base);
  void rgb;
}

const toneParam = { key: 'tone', label: 'Sten', type: 'select' as const, default: 'grey', options: [{ value: 'grey', label: 'Grå' }, { value: 'brown', label: 'Brun' }, { value: 'dark', label: 'Mørk' }] };

export const rockfallKinds: ObjectKind[] = [
  kind({ key: 'rockfall', family: 'rockfall', name: 'Nedfald (spærrer gangen)', w: 2.2, h: 2, keepAspect: false, sizeJitter: 0, shadow: 9, bleed: 0.12, params: [toneParam], draw: (g, o) => rockfall(g, o, 'none') }),
  kind({
    key: 'rockfall_gap', family: 'rockfall', name: 'Delvist nedfald', w: 3, h: 2, keepAspect: false, shadow: 9, bleed: 0.12,
    params: [toneParam, { key: 'gap', label: 'Åbning', type: 'select', default: 'center', options: [{ value: 'left', label: 'Til venstre' }, { value: 'center', label: 'Midt' }, { value: 'right', label: 'Til højre' }] }],
    draw: (g, o) => rockfall(g, o, (param(o, 'gap', 'center') as 'left' | 'center' | 'right')),
  }),
  kind({ key: 'rock_pile', family: 'rockfall', name: 'Stenbunke', w: 1.4, h: 1.4, randomRotation: true, sizeJitter: 0.2, shadow: 7, bleed: 0.1, params: [toneParam], draw: pile }),
  kind({ key: 'ceiling_collapse', family: 'rockfall', name: 'Sammenstyrtet loft', w: 3, h: 3, randomRotation: true, shadow: 8, bleed: 0.12, params: [toneParam], draw: collapse }),
];
