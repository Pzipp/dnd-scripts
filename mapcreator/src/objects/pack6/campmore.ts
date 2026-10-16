import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng, softDot } from '../util';
import { plankBoard, rope, tube, woodGrain, ellBody, rectBody } from '../pack2/helpers';
import { base, box, candle, crack, flame, lerp, mixc, mossPatch, mottle, OUT, polyBody, polyPath, radial, lin, rf, rgb, rubble, shift, stoneBlock, stoneOf, stoneOptions, tufts, type G, type P, type RGB } from './common';

/** Flere lejr-, kaj- og ruinting set straks oppefra: forsyninger, spyd, kort- og madborde, hø, trug, moler, fiskegrej, tårnbund, søjlehal og mosaik. */

const WOOD: RGB = [140, 100, 60];
const stoneP = (d: string): ParamDef => ({ key: 'stone', label: 'Sten', type: 'select', default: d, options: stoneOptions });

function supplies(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const s = Math.min(w, h) * 0.3;
  const crates: [number, number, number, number][] = [[-s * 0.7, -s * 0.5, s, 0.08], [s * 0.55, -s * 0.4, s * 0.85, -0.1], [-s * 0.2, s * 0.65, s * 0.9, 0.05]];
  for (const [x, y, ss, a] of crates) {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.fillRect(-ss / 2 + 3, -ss / 2 + 4, ss, ss);
    rectBody(g, -ss / 2, -ss / 2, ss, ss, 2, [150, 110, 66], { lw: 1.5 });
    g.save();
    g.beginPath();
    g.rect(-ss / 2, -ss / 2, ss, ss);
    g.clip();
    woodGrain(g, r, [-ss / 2, -ss / 2, ss / 2, ss / 2], [150, 110, 66], { lines: 8 });
    g.restore();
    g.strokeStyle = 'rgba(30,16,6,.55)';
    g.lineWidth = 1.6;
    g.strokeRect(-ss * 0.36, -ss * 0.36, ss * 0.72, ss * 0.72);
    g.restore();
  }
  for (const [x, y] of [[s * 1.05, s * 0.75], [-s * 1.1, s * 0.5]] as const) {
    g.beginPath();
    g.ellipse(x, y, s * 0.42, s * 0.3, r() * 3, 0, 7);
    g.fillStyle = radial(g, x, y, s * 0.5, [[0, 'rgb(214,196,150)'], [1, 'rgb(150,130,92)']], x - 3, y - 3, 1);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.3;
    g.stroke();
    g.beginPath();
    g.moveTo(x - s * 0.2, y);
    g.lineTo(x + s * 0.2, y);
    g.strokeStyle = 'rgba(60,40,20,.5)';
    g.stroke();
  }
}

function spears(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  for (let i = 0; i < 9; i++) {
    const y = lerp(-h * 0.36, h * 0.36, i / 8) + rf(r, -2, 2);
    const a = rf(r, -0.05, 0.05);
    const x0 = -w * 0.46;
    const x1 = w * 0.34;
    g.save();
    g.translate(0, y);
    g.rotate(a);
    tube(g, () => { g.beginPath(); g.moveTo(x0, 0); g.lineTo(x1, 0); }, 3.4, [158, 118, 70]);
    polyBody(g, [[x1, -3.4], [x1 + w * 0.12, 0], [x1, 3.4]], [190, 194, 204], { lw: 1.1, light: 24, dark: 24, ao: 0.4 });
    g.restore();
  }
  rope(g, [[-w * 0.2, -h * 0.45], [-w * 0.2, h * 0.45]], 3, [176, 144, 88]);
  rope(g, [[w * 0.1, -h * 0.45], [w * 0.1, h * 0.45]], 3, [176, 144, 88]);
}

function mapTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  g.fillStyle = 'rgba(8,4,0,.4)';
  g.fillRect(-w * 0.46 + 4, -h * 0.44 + 5, w * 0.92, h * 0.88);
  rectBody(g, -w * 0.46, -h * 0.44, w * 0.92, h * 0.88, 3, WOOD, { lw: 1.7 });
  g.save();
  g.beginPath();
  g.rect(-w * 0.46, -h * 0.44, w * 0.92, h * 0.88);
  g.clip();
  woodGrain(g, r, [-w * 0.46, -h * 0.44, w * 0.46, h * 0.44], WOOD, { lines: 9 });
  g.restore();
  // kort
  const mp = (): void => polyPath(g, [[-w * 0.34, -h * 0.3], [w * 0.3, -h * 0.32], [w * 0.34, h * 0.3], [-w * 0.3, h * 0.32]])();
  mp();
  g.fillStyle = lin(g, -w * 0.3, -h * 0.3, w * 0.3, h * 0.3, [[0, 'rgb(236,220,178)'], [1, 'rgb(202,182,134)']]);
  g.fill();
  g.save();
  mp();
  g.clip();
  g.strokeStyle = 'rgba(90,60,30,.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-w * 0.3, h * 0.1);
  g.bezierCurveTo(-w * 0.1, -h * 0.2, w * 0.05, h * 0.2, w * 0.3, -h * 0.1);
  g.stroke();
  g.fillStyle = 'rgba(90,130,170,.45)';
  g.beginPath();
  g.ellipse(w * 0.15, h * 0.12, w * 0.1, h * 0.1, 0.3, 0, 7);
  g.fill();
  g.fillStyle = 'rgba(100,140,70,.4)';
  g.beginPath();
  g.ellipse(-w * 0.18, -h * 0.1, w * 0.12, h * 0.12, 0, 0, 7);
  g.fill();
  g.restore();
  mp();
  g.strokeStyle = OUT;
  g.lineWidth = 1.2;
  g.stroke();
  // brikker og lys
  for (const [x, y, c] of [[-0.12, -0.08, [170, 62, 52]], [0.2, 0.1, [64, 94, 160]], [-0.2, 0.15, [170, 62, 52]], [0.08, -0.18, [64, 94, 160]]] as const) ellBody(g, x * w, y * h, 5, 5, c as RGB, { lw: 1.1 });
  candle(g, w * 0.4, -h * 0.34, 3.6);
  ellBody(g, w * 0.4, h * 0.3, 6, 6, [150, 150, 158], { lw: 1.1 });
}

function stewTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  g.fillStyle = 'rgba(8,4,0,.4)';
  g.fillRect(-w * 0.46 + 4, -h * 0.4 + 5, w * 0.92, h * 0.8);
  plankBoard(g, r, -w * 0.46, -h * 0.4, w * 0.92, h * 0.8, [140, 100, 60], 4, { vertical: false, nails: true, wear: 0.5 });
  g.strokeStyle = OUT;
  g.lineWidth = 1.7;
  g.strokeRect(-w * 0.46, -h * 0.4, w * 0.92, h * 0.8);
  // kedel, skåle og brød
  ellBody(g, -w * 0.3, 0, h * 0.26, h * 0.26, [64, 64, 70], { lw: 1.4 });
  g.beginPath();
  g.arc(-w * 0.3, 0, h * 0.18, 0, 7);
  g.fillStyle = 'rgb(160,92,40)';
  g.fill();
  for (let i = 0; i < 4; i++) {
    const x = lerp(-w * 0.08, w * 0.2, i / 3);
    for (const y of [-h * 0.22, h * 0.22]) {
      ellBody(g, x, y, h * 0.12, h * 0.12, [186, 150, 100], { lw: 1.1 });
      g.beginPath();
      g.arc(x, y, h * 0.07, 0, 7);
      g.fillStyle = 'rgb(150,86,40)';
      g.fill();
    }
  }
  ellBody(g, w * 0.36, -h * 0.05, w * 0.07, h * 0.12, [200, 160, 96], { lw: 1.2 });
  ellBody(g, w * 0.36, h * 0.18, w * 0.06, h * 0.1, [190, 150, 90], { lw: 1.2 });
}

function hayBales(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const R = Math.min(w, h) * 0.3;
  for (const [x, y] of [[-w * 0.2, -h * 0.12], [w * 0.2, h * 0.14]] as const) {
    g.beginPath();
    g.arc(x + 3, y + 4, R, 0, 7);
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.fill();
    g.beginPath();
    g.arc(x, y, R, 0, 7);
    g.fillStyle = radial(g, x, y, R, [[0, 'rgb(236,206,110)'], [1, 'rgb(170,134,60)']], x - R * 0.3, y - R * 0.3, 1);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.stroke();
    for (let k = 0; k < 40; k++) {
      const a = r() * 6.28;
      const d = r() * R * 0.9;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      g.lineTo(x + Math.cos(a + 1.2) * (d + 5), y + Math.sin(a + 1.2) * (d + 5));
      g.strokeStyle = `rgba(${r() < 0.5 ? '120,90,30' : '250,226,150'},.6)`;
      g.lineWidth = 0.9;
      g.stroke();
    }
    g.beginPath();
    g.arc(x, y, R * 0.6, 0, 7);
    g.strokeStyle = 'rgba(100,70,20,.4)';
    g.stroke();
  }
}

function trough(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  g.fillStyle = 'rgba(8,4,0,.4)';
  g.fillRect(-w * 0.46 + 3, -h * 0.4 + 4, w * 0.92, h * 0.8);
  rectBody(g, -w * 0.46, -h * 0.4, w * 0.92, h * 0.8, 4, [128, 92, 56], { lw: 1.6 });
  g.save();
  g.beginPath();
  g.rect(-w * 0.4, -h * 0.28, w * 0.8, h * 0.56);
  g.clip();
  g.fillStyle = lin(g, 0, -h * 0.28, 0, h * 0.28, [[0, 'rgb(40,100,130)'], [1, 'rgb(80,150,176)']]);
  g.fillRect(-w * 0.4, -h * 0.28, w * 0.8, h * 0.56);
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.ellipse(rf(r, -w * 0.35, w * 0.35), rf(r, -h * 0.2, h * 0.2), rf(r, 4, 9), rf(r, 1, 2.4), 0, 0, 7);
    g.strokeStyle = 'rgba(230,248,255,.5)';
    g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(14,8,4,.7)';
  g.lineWidth = 1.3;
  g.strokeRect(-w * 0.4, -h * 0.28, w * 0.8, h * 0.56);
}

/** Træmole set oppefra: planker på tværs, pæle i siderne og tov. `tee` giver en tværbom i enden. */
function pier(g: G, o: DrawInput, tee: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const pw = tee ? w * 0.24 : w * 0.7;
  const ph = tee ? h * 0.92 : h * 0.96;
  const x0 = -pw / 2;
  g.fillStyle = 'rgba(8,4,0,.4)';
  g.fillRect(x0 + 4, -ph / 2 + 5, pw, ph);
  plankBoard(g, r, x0, -ph / 2, pw, ph, [150, 108, 64], Math.round(ph / 9), { vertical: false, nails: true, wear: 0.7 });
  g.strokeStyle = OUT;
  g.lineWidth = 1.6;
  g.strokeRect(x0, -ph / 2, pw, ph);
  if (tee) {
    const bh = h * 0.2;
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.fillRect(-w * 0.46 + 4, -ph / 2 + 5, w * 0.92, bh);
    plankBoard(g, r, -w * 0.46, -ph / 2, w * 0.92, bh, [150, 108, 64], 3, { vertical: true, nails: true, wear: 0.7 });
    g.strokeRect(-w * 0.46, -ph / 2, w * 0.92, bh);
  }
  const n = Math.round(ph / 40);
  for (let i = 0; i <= n; i++) {
    const y = lerp(-ph / 2 + 4, ph / 2 - 4, i / n);
    for (const sx of [-1, 1]) {
      const x = sx * (pw / 2 + 1);
      ellBody(g, x, y, 4.2, 4.2, [100, 72, 44], { lw: 1.3 });
    }
  }
  rope(g, [[x0 - 1, -ph * 0.2], [x0 - 1, -ph * 0.2 + 30]], 2.4, [176, 144, 88]);
}

function lobsterPots(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const R = Math.min(w, h) * 0.2;
  for (const [x, y] of [[-w * 0.24, -h * 0.14], [w * 0.2, -h * 0.2], [0, h * 0.22]] as const) {
    g.beginPath();
    g.ellipse(x + 3, y + 4, R * 1.2, R, 0, 0, 7);
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.fill();
    g.beginPath();
    g.ellipse(x, y, R * 1.2, R, 0, 0, 7);
    g.fillStyle = 'rgb(150,112,68)';
    g.fill();
    g.save();
    g.beginPath();
    g.ellipse(x, y, R * 1.2, R, 0, 0, 7);
    g.clip();
    for (let k = -4; k <= 4; k++) {
      g.beginPath();
      g.moveTo(x + k * R * 0.3 - R, y - R);
      g.lineTo(x + k * R * 0.3 + R, y + R);
      g.moveTo(x + k * R * 0.3 + R, y - R);
      g.lineTo(x + k * R * 0.3 - R, y + R);
      g.strokeStyle = 'rgba(40,24,10,.7)';
      g.lineWidth = 1;
      g.stroke();
    }
    g.restore();
    g.beginPath();
    g.ellipse(x, y, R * 1.2, R, 0, 0, 7);
    g.strokeStyle = OUT;
    g.lineWidth = 1.5;
    g.stroke();
    g.beginPath();
    g.ellipse(x, y, R * 0.5, R * 0.4, 0, 0, 7);
    g.fillStyle = 'rgba(20,10,4,.8)';
    g.fill();
  }
  rope(g, [[-w * 0.24, -h * 0.14], [0, h * 0.0], [w * 0.2, -h * 0.2]], 2, [176, 144, 88]);
  rope(g, [[0, h * 0.0], [0, h * 0.22]], 2, [176, 144, 88]);
  void r;
}

function fishRack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.fillRect(-w * 0.46 + 4, -h * 0.4 + 5, w * 0.92, h * 0.8);
  rectBody(g, -w * 0.46, -h * 0.4, w * 0.92, h * 0.8, 2, [120, 86, 52], { lw: 1.5 });
  g.fillStyle = 'rgba(30,18,8,.35)';
  g.fillRect(-w * 0.42, -h * 0.34, w * 0.84, h * 0.68);
  for (let row = 0; row < 3; row++) {
    const y = lerp(-h * 0.2, h * 0.2, row / 2);
    tube(g, () => { g.beginPath(); g.moveTo(-w * 0.44, y); g.lineTo(w * 0.44, y); }, 2.6, [150, 112, 66]);
    for (let i = 0; i < 6; i++) {
      const x = lerp(-w * 0.36, w * 0.36, i / 5) + rf(r, -3, 3);
      ellBody(g, x, y + 2, w * 0.045, h * 0.1, [160 + r() * 30, 172 + r() * 24, 180], { lw: 1 });
    }
  }
}

/** Tårnbund: ring af murværk med brudt side og indre gulv. */
function towerBase(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const { w, h } = o;
  const R = Math.min(w, h) * 0.46;
  const inner = R * 0.68;
  g.beginPath();
  g.arc(0, 0, inner, 0, 7);
  g.fillStyle = 'rgb(88,80,72)';
  g.fill();
  // gulvfliser
  g.save();
  g.beginPath();
  g.arc(0, 0, inner, 0, 7);
  g.clip();
  mottle(g, r, [-inner, -inner, inner, inner], [96, 88, 80], 40, 8, 26, 0.35);
  for (let i = 0; i < 6; i++) crack(g, r, rf(r, -inner, inner), rf(r, -inner, inner), inner * 0.4, r() * 6.28, 0.9, true);
  g.restore();
  const n = 20;
  const gapA = r() * 6.28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    const broken = Math.cos(a - gapA) > 0.55;
    if (broken && r() < 0.7) continue;
    const rr = (R + inner) / 2;
    stoneBlock(g, r, Math.cos(a) * rr, Math.sin(a) * rr, (R - inner) * 0.95, ((R * 6.283) / n) * 0.92, shift(col, (r() - 0.5) * 16), { a, moss: 0.35 });
  }
  for (let i = 0; i < 12; i++) {
    const a = gapA + rf(r, -0.6, 0.6);
    const d = rf(r, 0.5, 1.2) * R;
    stoneBlock(g, r, Math.cos(a) * d, Math.sin(a) * d, R * rf(r, 0.08, 0.16), R * rf(r, 0.06, 0.12), shift(col, 6), { a: r() * 3, moss: 0.4 });
  }
  tufts(g, r, 0, 0, inner * 0.9, inner * 0.9, 14);
}

function pillarHall(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'white'));
  const { w, h } = o;
  g.fillStyle = 'rgb(96,90,84)';
  g.fillRect(-w * 0.48, -h * 0.46, w * 0.96, h * 0.92);
  mottle(g, r, [-w * 0.48, -h * 0.46, w * 0.48, h * 0.46], [100, 94, 88], 70, 8, 26, 0.35);
  const T = h * 0.23;
  for (let y = -h * 0.46; y < h * 0.46; y += T) for (let x = -w * 0.48; x < w * 0.48; x += T) {
    g.strokeStyle = 'rgba(14,8,4,.25)';
    g.lineWidth = 1;
    g.strokeRect(x, y, T, T);
  }
  g.strokeStyle = OUT;
  g.lineWidth = 1.7;
  g.strokeRect(-w * 0.48, -h * 0.46, w * 0.96, h * 0.92);
  const cols = 4;
  const rad = h * 0.12;
  for (let ix = 0; ix < cols; ix++) for (const sy of [-1, 1]) {
    const x = lerp(-w * 0.34, w * 0.34, ix / (cols - 1));
    const y = sy * h * 0.26;
    if (r() < 0.2) {
      rubble(g, r, x, y, rad * 1.5, rad * 1.2, col, 5, rad * 0.3);
      continue;
    }
    g.fillStyle = 'rgba(8,4,0,.4)';
    g.beginPath();
    g.arc(x + 3, y + 4, rad * 1.05, 0, 7);
    g.fill();
    g.beginPath();
    g.arc(x, y, rad, 0, 7);
    g.fillStyle = radial(g, x, y, rad, [[0, rgb(shift(col, 36))], [0.7, rgb(shift(col, 6))], [1, rgb(shift(col, -34))]], x - rad * 0.3, y - rad * 0.3, 1);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.stroke();
    g.beginPath();
    g.arc(x, y, rad * 0.72, 0, 7);
    g.strokeStyle = 'rgba(20,12,6,.25)';
    g.stroke();
  }
  tufts(g, r, 0, 0, w * 0.4, h * 0.4, 14);
}

function mosaic(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const R = Math.min(w, h) * 0.47;
  const C = [[196, 70, 56], [226, 190, 90], [70, 110, 170], [236, 228, 206], [60, 60, 66]] as const;
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.fillStyle = 'rgb(150,142,130)';
  g.fill();
  g.save();
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.clip();
  // ringe af tesserae
  const rings = 7;
  for (let k = 0; k < rings; k++) {
    const r0 = (R * k) / rings;
    const r1 = (R * (k + 1)) / rings;
    const n = Math.max(6, Math.round(k * 7 + 4));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 6.283;
      const a1 = ((i + 1) / n) * 6.283;
      const ci = k === rings - 1 ? 4 : (k + (i % 2 ? 2 : 0) + (k % 3 === 0 ? 1 : 0)) % 4;
      const base = C[ci]!;
      g.beginPath();
      g.arc(0, 0, r1, a0, a1);
      g.arc(0, 0, r0, a1, a0, true);
      g.closePath();
      g.fillStyle = rgb(shift(base as unknown as RGB, (r() - 0.5) * 24));
      g.fill();
      g.strokeStyle = 'rgba(30,20,12,.5)';
      g.lineWidth = 0.8;
      g.stroke();
    }
  }
  for (let i = 0; i < 6; i++) crack(g, r, rf(r, -R, R), rf(r, -R, R), R * 0.3, r() * 6.28, 0.9, true);
  mossPatch(g, r, R * 0.3, -R * 0.3, R * 0.3, 8);
  g.restore();
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.strokeStyle = OUT;
  g.lineWidth = 1.7;
  g.stroke();
}

const common = { ...base, keepAspect: true as const, shadow: 10 };

export const campMoreKinds: ObjectKind[] = [
  kind({ key: 'milcamp_supplies', family: 'fieldcamp', name: 'Forsyningsdepot', w: 2.4, h: 2.4, ...common, params: [], tags: ['camp', 'military'], draw: (g, o) => supplies(g, o) }),
  kind({ key: 'milcamp_spears', family: 'fieldcamp', name: 'Bundt af spyd', w: 2.6, h: 1.4, ...common, params: [], tags: ['camp', 'military'], draw: (g, o) => spears(g, o) }),
  kind({ key: 'milcamp_map_table', family: 'fieldcamp', name: 'Krigsbord med kort', w: 2.6, h: 1.6, ...common, params: [], tags: ['camp', 'military'], draw: (g, o) => mapTable(g, o) }),
  kind({ key: 'milcamp_mess_table', family: 'fieldcamp', name: 'Fællesbord med gryde', w: 3, h: 1.4, ...common, params: [], tags: ['camp', 'military'], draw: (g, o) => stewTable(g, o) }),
  kind({ key: 'milcamp_hay', family: 'fieldcamp', name: 'Høballer', w: 2.4, h: 2, ...common, params: [], tags: ['camp', 'farm', 'village'], draw: (g, o) => hayBales(g, o) }),
  kind({ key: 'milcamp_trough', family: 'fieldcamp', name: 'Vandtrug', w: 2.2, h: 0.9, ...common, shadow: 6, params: [], tags: ['camp', 'farm', 'village'], draw: (g, o) => trough(g, o) }),
  kind({ key: 'dock_pier', family: 'dockside', name: 'Mole', w: 1.6, h: 6, ...common, keepAspect: false, shadow: 8, params: [], tags: ['harbor', 'water', 'village'], draw: (g, o) => pier(g, o, false) }),
  kind({ key: 'dock_pier_tee', family: 'dockside', name: 'Mole med tværbom', w: 4, h: 5, ...common, keepAspect: false, shadow: 8, params: [], tags: ['harbor', 'water', 'city'], draw: (g, o) => pier(g, o, true) }),
  kind({ key: 'dock_lobster_pots', family: 'dockside', name: 'Hummerkurve', w: 2, h: 1.8, ...common, params: [], tags: ['harbor', 'village', 'water'], draw: (g, o) => lobsterPots(g, o) }),
  kind({ key: 'dock_fish_rack', family: 'dockside', name: 'Tørrestativ til fisk', w: 2.6, h: 1.6, ...common, shadow: 6, params: [], tags: ['harbor', 'village', 'water'], draw: (g, o) => fishRack(g, o) }),
  kind({ key: 'ruins_tower_base', family: 'ruins', name: 'Tårnbund (ruin)', w: 3.6, h: 3.6, ...common, params: [stoneP('grey')], tags: ['ruin', 'outdoor', 'military'], draw: (g, o) => towerBase(g, o) }),
  kind({ key: 'ruins_pillar_hall', family: 'ruins', name: 'Søjlehal', w: 6, h: 3.6, ...common, shadow: 4, params: [stoneP('white')], tags: ['ruin', 'temple', 'outdoor'], draw: (g, o) => pillarHall(g, o) }),
  kind({ key: 'ruins_mosaic', family: 'ruins', name: 'Mosaikgulv', w: 3.4, h: 3.4, ...common, shadow: 0, params: [], tags: ['ruin', 'temple', 'rich'], draw: (g, o) => mosaic(g, o) }),
];
void softDot;
void flame;
void box;
void mixc;
