import { kind, param, type DrawInput, type ObjectKind } from './registry';
import { blob, mix, planks, rgb, rng, roundRect, shift, smooth, type RGB } from './util';

const WOOD: RGB = [150, 108, 66];
const OUTLINE = 'rgba(40,24,12,.8)';

// ---------------------------------------------------------------- borde

function table(g: CanvasRenderingContext2D, o: DrawInput, round: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const path = () => {
    if (round) {
      g.beginPath();
      g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else roundRect(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.06);
  };
  path();
  g.fillStyle = rgb(WOOD);
  g.fill();
  g.save();
  path();
  g.clip();
  planks(g, -w / 2, -h / 2, w, h, WOOD, Math.max(3, Math.round(h / 14)), r);
  g.restore();
  path();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, Math.min(w, h) * 0.05);
  g.stroke();
  g.strokeStyle = 'rgba(255,230,180,.25)';
  g.lineWidth = Math.max(0.6, Math.min(w, h) * 0.025);
  g.beginPath();
  g.moveTo(-w / 2 + 3, -h / 2 + 3);
  g.lineTo(w / 2 - 3, -h / 2 + 3);
  g.stroke();
}

const tables: ObjectKind[] = [
  kind({ key: 'table_rect', family: 'table', name: 'Bord', w: 2, h: 1, keepAspect: false, shadow: 7, bleed: 0.02, draw: (g, o) => table(g, o, false) }),
  kind({ key: 'table_long', family: 'table', name: 'Langbord', w: 4, h: 1.1, keepAspect: false, shadow: 7, bleed: 0.02, draw: (g, o) => table(g, o, false) }),
  kind({ key: 'table_round', family: 'table', name: 'Rundt bord', w: 1.6, h: 1.6, shadow: 7, bleed: 0.02, draw: (g, o) => table(g, o, true) }),
  kind({ key: 'table_small', family: 'table', name: 'Lille bord', w: 1, h: 1, keepAspect: false, shadow: 5, bleed: 0.02, draw: (g, o) => table(g, o, false) }),
];

// ---------------------------------------------------------------- siddepladser

function chair(g: CanvasRenderingContext2D, o: DrawInput): void {
  const s = Math.min(o.w, o.h);
  roundRect(g, -s * 0.4, -s * 0.36, s * 0.8, s * 0.76, s * 0.1);
  g.fillStyle = rgb(shift(WOOD, -8));
  g.fill();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, s * 0.05);
  g.stroke();
  roundRect(g, -s * 0.42, -s * 0.46, s * 0.84, s * 0.2, s * 0.06);
  g.fillStyle = rgb(shift(WOOD, -34));
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(255,230,180,.18)';
  roundRect(g, -s * 0.3, -s * 0.28, s * 0.6, s * 0.4, s * 0.08);
  g.fill();
}

function stool(g: CanvasRenderingContext2D, o: DrawInput): void {
  const R = Math.min(o.w, o.h) / 2;
  g.beginPath();
  g.arc(0, 0, R * 0.9, 0, Math.PI * 2);
  g.fillStyle = rgb(shift(WOOD, -4));
  g.fill();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, R * 0.1);
  g.stroke();
  g.strokeStyle = 'rgba(60,36,16,.35)';
  g.lineWidth = Math.max(0.6, R * 0.05);
  for (const k of [0.6, 0.3]) {
    g.beginPath();
    g.arc(0, 0, R * k, 0, Math.PI * 2);
    g.stroke();
  }
}

function bench(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  roundRect(g, -o.w / 2, -o.h / 2, o.w, o.h, o.h * 0.15);
  g.save();
  g.clip();
  planks(g, -o.w / 2, -o.h / 2, o.w, o.h, shift(WOOD, -6), 2, r);
  g.restore();
  roundRect(g, -o.w / 2, -o.h / 2, o.w, o.h, o.h * 0.15);
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, o.h * 0.08);
  g.stroke();
}

const seats: ObjectKind[] = [
  kind({ key: 'chair', family: 'seat', name: 'Stol', w: 0.8, h: 0.8, shadow: 4, bleed: 0.02, draw: chair }),
  kind({ key: 'stool', family: 'seat', name: 'Skammel', w: 0.7, h: 0.7, shadow: 4, bleed: 0.02, draw: stool }),
  kind({ key: 'bench', family: 'seat', name: 'Bænk', w: 2, h: 0.6, keepAspect: false, shadow: 4, bleed: 0.02, draw: bench }),
];

// ---------------------------------------------------------------- tønder

function barrelUpright(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fillStyle = rgb(shift(WOOD, -26));
  g.fill();
  g.save();
  g.beginPath();
  g.arc(0, 0, R * 0.82, 0, Math.PI * 2);
  g.clip();
  planks(g, -R, -R, R * 2, R * 2, shift(WOOD, 6), 6, r);
  g.restore();
  for (const [rr, w] of [[0.9, 0.09], [0.82, 0.04]] as const) {
    g.beginPath();
    g.arc(0, 0, R * rr, 0, Math.PI * 2);
    g.strokeStyle = rr > 0.85 ? 'rgb(70,66,62)' : 'rgba(30,20,10,.6)';
    g.lineWidth = Math.max(1, R * w);
    g.stroke();
  }
  g.beginPath();
  g.arc(-R * 0.25, -R * 0.25, R * 0.4, Math.PI, Math.PI * 1.6);
  g.strokeStyle = 'rgba(255,240,210,.3)';
  g.lineWidth = Math.max(1, R * 0.06);
  g.stroke();
}

function barrelFallen(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const body = () => {
    g.beginPath();
    g.moveTo(-w / 2 + w * 0.06, -h / 2 + h * 0.08);
    g.quadraticCurveTo(0, -h / 2 - h * 0.1, w / 2 - w * 0.06, -h / 2 + h * 0.08);
    g.lineTo(w / 2 - w * 0.06, h / 2 - h * 0.08);
    g.quadraticCurveTo(0, h / 2 + h * 0.1, -w / 2 + w * 0.06, h / 2 - h * 0.08);
    g.closePath();
  };
  body();
  g.fillStyle = rgb(shift(WOOD, -10));
  g.fill();
  g.save();
  body();
  g.clip();
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
  gr.addColorStop(0, 'rgba(255,230,180,.28)');
  gr.addColorStop(0.5, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = gr;
  g.fillRect(-w / 2, -h / 2, w, h);
  g.strokeStyle = 'rgba(40,24,12,.4)';
  g.lineWidth = Math.max(0.6, h * 0.025);
  for (let i = 1; i < 6; i++) {
    g.beginPath();
    g.moveTo(-w / 2, -h / 2 + (i / 6) * h);
    g.lineTo(w / 2, -h / 2 + (i / 6) * h + (r() - 0.5) * h * 0.04);
    g.stroke();
  }
  g.restore();
  for (const fx of [-0.3, 0.3]) {
    g.fillStyle = 'rgb(70,66,62)';
    g.fillRect(w * fx - w * 0.04, -h / 2 - h * 0.04, w * 0.08, h * 1.08);
  }
  body();
  g.strokeStyle = 'rgba(30,18,8,.9)';
  g.lineWidth = Math.max(1, h * 0.06);
  g.stroke();
  // låget i den ene ende
  g.beginPath();
  g.ellipse(w / 2 - w * 0.06, 0, w * 0.035, h * 0.4, 0, 0, Math.PI * 2);
  g.fillStyle = rgb(shift(WOOD, -34));
  g.fill();
  g.stroke();
}

function barrelBroken(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  // spild
  smooth(g, blob(R * 0.7, R * 0.6, 0.3, 10, r, R * 0.1, R * 0.15));
  g.fillStyle = 'rgba(40,26,16,.35)';
  g.fill();
  // bund
  g.beginPath();
  g.arc(-R * 0.1, R * 0.05, R * 0.55, 0, Math.PI * 2);
  g.fillStyle = rgb(shift(WOOD, -34));
  g.fill();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(1, R * 0.05);
  g.stroke();
  // løse stave
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (r() - 0.5) * 0.4;
    const len = R * (0.55 + r() * 0.35);
    const d = R * (0.35 + r() * 0.25);
    const cx = Math.cos(a) * d;
    const cy = Math.sin(a) * d;
    g.save();
    g.translate(cx, cy);
    g.rotate(a + (r() - 0.5) * 0.7);
    g.fillStyle = rgb(shift(WOOD, (r() - 0.5) * 30));
    g.beginPath();
    g.moveTo(-len / 2, -R * 0.09);
    g.lineTo(len / 2 - R * 0.05, -R * 0.07);
    g.lineTo(len / 2, (r() - 0.5) * R * 0.1);
    g.lineTo(len / 2 - R * 0.05, R * 0.07);
    g.lineTo(-len / 2, R * 0.09);
    g.closePath();
    g.fill();
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(0.8, R * 0.03);
    g.stroke();
    g.restore();
  }
  // jernbånd
  g.beginPath();
  g.arc(R * 0.35, -R * 0.4, R * 0.28, 0.5, 5.2);
  g.strokeStyle = 'rgb(70,66,62)';
  g.lineWidth = Math.max(1, R * 0.07);
  g.stroke();
}

const barrels: ObjectKind[] = [
  kind({ key: 'barrel_upright', family: 'barrel', name: 'Stående', w: 1, h: 1, randomRotation: true, sizeJitter: 0.05, shadow: 6, bleed: 0.02, draw: barrelUpright }),
  kind({ key: 'barrel_fallen', family: 'barrel', name: 'Væltet', w: 1.3, h: 1, keepAspect: false, randomRotation: true, sizeJitter: 0.05, shadow: 5, bleed: 0.06, draw: barrelFallen }),
  kind({ key: 'barrel_broken', family: 'barrel', name: 'Ødelagt', w: 1.4, h: 1.4, randomRotation: true, sizeJitter: 0.1, shadow: 2, bleed: 0.1, draw: barrelBroken }),
];

// ---------------------------------------------------------------- kasser

function crate(g: CanvasRenderingContext2D, o: DrawInput, mode: 'closed' | 'open'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  roundRect(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.04);
  g.save();
  g.clip();
  planks(g, -w / 2, -h / 2, w, h, shift(WOOD, -6), 5, r);
  const b = Math.min(w, h) * 0.12;
  g.fillStyle = rgb(shift(WOOD, -38));
  g.fillRect(-w / 2, -h / 2, w, b);
  g.fillRect(-w / 2, h / 2 - b, w, b);
  g.fillRect(-w / 2, -h / 2, b, h);
  g.fillRect(w / 2 - b, -h / 2, b, h);
  if (mode === 'closed') {
    g.strokeStyle = rgb(shift(WOOD, -46));
    g.lineWidth = b * 0.9;
    g.beginPath();
    g.moveTo(-w / 2, -h / 2);
    g.lineTo(w / 2, h / 2);
    g.moveTo(w / 2, -h / 2);
    g.lineTo(-w / 2, h / 2);
    g.stroke();
  } else {
    // åben: mørkt indre med strå
    g.fillStyle = 'rgb(36,24,14)';
    g.fillRect(-w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b);
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = rgb(mix([196, 170, 90], [230, 210, 130], r()));
      g.lineWidth = Math.max(0.6, w * 0.015);
      const x = (r() - 0.5) * (w - 3 * b);
      const y = (r() - 0.5) * (h - 3 * b);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * w * 0.3, y + (r() - 0.5) * h * 0.3);
      g.stroke();
    }
  }
  g.restore();
  roundRect(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.04);
  g.strokeStyle = 'rgba(30,18,8,.85)';
  g.lineWidth = Math.max(1, Math.min(w, h) * 0.04);
  g.stroke();
}

function crateBroken(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * S * 0.4;
    const len = S * (0.35 + r() * 0.35);
    g.save();
    g.translate(Math.cos(a) * d, Math.sin(a) * d);
    g.rotate(r() * Math.PI);
    g.fillStyle = rgb(shift(WOOD, (r() - 0.5) * 36 - 6));
    g.beginPath();
    g.moveTo(-len / 2, -S * 0.055);
    g.lineTo(len / 2 - S * 0.05, -S * 0.05);
    g.lineTo(len / 2, (r() - 0.5) * S * 0.06);
    g.lineTo(len / 2 - S * 0.04, S * 0.055);
    g.lineTo(-len / 2, S * 0.05);
    g.closePath();
    g.fill();
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(0.8, S * 0.025);
    g.stroke();
    g.restore();
  }
}

const crates: ObjectKind[] = [
  kind({ key: 'crate_closed', family: 'crate', name: 'Kasse', w: 1, h: 1, keepAspect: false, randomRotation: true, shadow: 6, bleed: 0.02, draw: (g, o) => crate(g, o, 'closed') }),
  kind({ key: 'crate_open', family: 'crate', name: 'Åben kasse', w: 1, h: 1, keepAspect: false, randomRotation: true, shadow: 5, bleed: 0.02, draw: (g, o) => crate(g, o, 'open') }),
  kind({ key: 'crate_broken', family: 'crate', name: 'Smadret kasse', w: 1.4, h: 1.4, randomRotation: true, shadow: 2, bleed: 0.06, draw: crateBroken }),
];

// ---------------------------------------------------------------- kister

function chest(g: CanvasRenderingContext2D, o: DrawInput, mode: 'closed' | 'open' | 'broken'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const body = (inset = 0) => roundRect(g, -w / 2 + inset, -h / 2 + inset, w - 2 * inset, h - 2 * inset, h * 0.12);
  body();
  g.fillStyle = rgb(shift(WOOD, -30));
  g.fill();
  if (mode === 'closed') {
    g.save();
    body();
    g.clip();
    planks(g, -w / 2, -h / 2, w, h, shift(WOOD, -18), 4, r);
    g.fillStyle = 'rgba(255,230,180,.14)';
    g.fillRect(-w / 2, -h / 2, w, h * 0.3);
    g.restore();
  } else {
    body(h * 0.12);
    g.fillStyle = 'rgb(28,18,12)';
    g.fill();
    if (mode === 'open') {
      for (let i = 0; i < 26; i++) {
        g.fillStyle = rgb(mix([196, 150, 40], [250, 222, 110], r()));
        g.beginPath();
        g.arc((r() - 0.5) * w * 0.7, (r() - 0.5) * h * 0.5 + h * 0.05, Math.min(w, h) * 0.05, 0, Math.PI * 2);
        g.fill();
      }
      roundRect(g, -w / 2, -h / 2 - h * 0.08, w, h * 0.22, h * 0.08);
      g.fillStyle = rgb(shift(WOOD, -40));
      g.fill();
    } else {
      // knust: tom, med splinter og løsrevet lås
      for (let i = 0; i < 5; i++) {
        g.save();
        g.translate((r() - 0.5) * w * 0.9, (r() - 0.5) * h * 1.1);
        g.rotate(r() * Math.PI);
        g.fillStyle = rgb(shift(WOOD, (r() - 0.5) * 30));
        g.fillRect(-w * 0.14, -h * 0.04, w * 0.28, h * 0.08);
        g.restore();
      }
    }
  }
  g.fillStyle = 'rgb(66,64,62)';
  for (const fx of [-0.3, 0.3]) g.fillRect(w * fx - w * 0.04, -h / 2, w * 0.08, h);
  if (mode === 'closed') {
    g.fillStyle = 'rgb(214,170,60)';
    roundRect(g, -w * 0.05, -h * 0.12, w * 0.1, h * 0.24, 2);
    g.fill();
  }
  body();
  g.strokeStyle = 'rgba(20,10,4,.9)';
  g.lineWidth = Math.max(1, h * 0.06);
  g.stroke();
}

const chests: ObjectKind[] = [
  kind({ key: 'chest_closed', family: 'chest', name: 'Lukket', w: 1.4, h: 0.9, keepAspect: false, shadow: 6, bleed: 0.04, draw: (g, o) => chest(g, o, 'closed') }),
  kind({ key: 'chest_open', family: 'chest', name: 'Åben', w: 1.4, h: 0.9, keepAspect: false, shadow: 6, bleed: 0.12, draw: (g, o) => chest(g, o, 'open') }),
  kind({ key: 'chest_broken', family: 'chest', name: 'Knust', w: 1.4, h: 0.9, keepAspect: false, shadow: 5, bleed: 0.12, draw: (g, o) => chest(g, o, 'broken') }),
];

// ---------------------------------------------------------------- senge

const BLANKET: Record<string, RGB> = { red: [150, 42, 42], blue: [52, 84, 150], green: [56, 112, 68], brown: [122, 90, 56] };
const blanketParam = { key: 'blanket', label: 'Tæppe', type: 'select' as const, default: 'red', options: [{ value: 'red', label: 'Rød' }, { value: 'blue', label: 'Blå' }, { value: 'green', label: 'Grøn' }, { value: 'brown', label: 'Brun' }] };

function bed(g: CanvasRenderingContext2D, o: DrawInput): void {
  const { w, h } = o;
  roundRect(g, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.06);
  g.fillStyle = rgb(shift(WOOD, -34));
  g.fill();
  g.strokeStyle = 'rgba(30,18,8,.9)';
  g.lineWidth = Math.max(1, w * 0.04);
  g.stroke();
  const m = w * 0.07;
  roundRect(g, -w / 2 + m, -h / 2 + m, w - 2 * m, h - 2 * m, w * 0.05);
  g.fillStyle = 'rgb(232,226,212)';
  g.fill();
  const col = BLANKET[param(o, 'blanket', 'red')] ?? BLANKET.red!;
  roundRect(g, -w / 2 + m, -h / 2 + h * 0.36, w - 2 * m, h * 0.64 - m, w * 0.05);
  g.fillStyle = rgb(col);
  g.fill();
  g.strokeStyle = rgb(shift(col, -40), 0.7);
  g.lineWidth = Math.max(0.8, w * 0.02);
  g.stroke();
  g.fillStyle = rgb(shift(col, 22), 0.5);
  g.fillRect(-w / 2 + m, -h / 2 + h * 0.36, w - 2 * m, h * 0.05);
  roundRect(g, -w / 2 + m * 1.6, -h / 2 + m * 1.4, w - 3.2 * m, h * 0.22, w * 0.1);
  g.fillStyle = 'rgb(250,248,240)';
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.stroke();
}

function bedroll(g: CanvasRenderingContext2D, o: DrawInput): void {
  const { w, h } = o;
  const col = BLANKET[param(o, 'blanket', 'green')] ?? BLANKET.green!;
  roundRect(g, -w / 2, -h / 2, w, h, w * 0.3);
  g.fillStyle = rgb(shift(col, -10));
  g.fill();
  g.strokeStyle = rgb(shift(col, -60), 0.9);
  g.lineWidth = Math.max(1, w * 0.04);
  g.stroke();
  g.strokeStyle = rgb(shift(col, 30), 0.5);
  g.lineWidth = Math.max(0.8, w * 0.03);
  g.beginPath();
  g.moveTo(-w * 0.2, -h * 0.2);
  g.lineTo(-w * 0.2, h * 0.45);
  g.moveTo(w * 0.2, -h * 0.2);
  g.lineTo(w * 0.2, h * 0.45);
  g.stroke();
  // sammenrullet hovedpude
  roundRect(g, -w * 0.38, -h * 0.46, w * 0.76, h * 0.2, w * 0.1);
  g.fillStyle = 'rgb(236,226,200)';
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)';
  g.stroke();
}

const beds: ObjectKind[] = [
  kind({ key: 'bed', family: 'bed', name: 'Seng', w: 1.2, h: 2, keepAspect: false, shadow: 5, bleed: 0.02, params: [blanketParam], draw: bed }),
  kind({ key: 'bedroll', family: 'bed', name: 'Sovepose', w: 0.9, h: 1.9, keepAspect: false, shadow: 2, bleed: 0.02, params: [{ ...blanketParam, default: 'green' }], draw: bedroll }),
];

export const interiorKinds: ObjectKind[] = [...tables, ...seats, ...barrels, ...crates, ...chests, ...beds];
