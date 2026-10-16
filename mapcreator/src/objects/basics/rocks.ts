import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { blob, rgb, rng, smooth, type RGB } from '../util';
import { rockBody, ROCK_PALS, type RockPal } from './helpers';

type G = CanvasRenderingContext2D;

const rockParam: ParamDef = { key: 'rock', label: 'Type', type: 'select', default: 'grey', options: [{ value: 'grey', label: 'Grå' }, { value: 'dark', label: 'Mørk' }, { value: 'sandstone', label: 'Sandsten' }] };
const palOf = (o: DrawInput, def = 'grey'): RockPal => ROCK_PALS[param(o, 'rock', def)] ?? ROCK_PALS.grey!;

/** Tuer af græs ved foden af en sten. */
function grassTufts(g: G, r: () => number, cx: number, cy: number, rx: number, ry: number, n: number, size: number): void {
  const cols: RGB[] = [[48, 94, 36], [82, 130, 48], [128, 168, 66]];
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const x = cx + Math.cos(a) * rx * (0.85 + r() * 0.35);
    const y = cy + Math.sin(a) * ry * (0.85 + r() * 0.35);
    for (let b = 0; b < 6; b++) {
      const aa = a + (r() - 0.5) * 2.2;
      const l = size * (0.6 + r() * 0.7);
      g.strokeStyle = rgb(cols[b % 3]!, 0.95);
      g.lineWidth = Math.max(0.8, size * 0.13);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(aa) * l * 0.5 + (r() - 0.5) * l * 0.3, y + Math.sin(aa) * l * 0.5, x + Math.cos(aa) * l, y + Math.sin(aa) * l);
      g.stroke();
    }
  }
}

// ------------------------------------------------------------------ eksisterende

export function drawRockSmall(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  rockBody(g, r, 0, 0, o.w * 0.46, o.h * 0.46, palOf(o), { n: 9, rough: 0.2, cracks: 1, grain: 16, lichen: r() < 0.25 ? 0.5 : 0 });
}

export function drawBoulder(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const moss = param(o, 'moss', true);
  rockBody(g, r, 0, 0, o.w * 0.45, o.h * 0.45, palOf(o), { n: 11, rough: 0.2, cracks: 3, grain: 40, moss: moss ? 0.5 + r() * 0.4 : 0, lichen: 0.7 });
}

export function drawCluster(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const pal = palOf(o);
  const R = Math.min(o.w, o.h) / 2;
  const n = 5 + Math.floor(r() * 3);
  const stones: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.5;
    stones.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: R * (0.2 + r() * r() * 0.34) });
  }
  stones.sort((p, q) => p.x + p.y - (q.x + q.y));
  for (const s of stones) rockBody(g, r, s.x, s.y, s.s, s.s * (0.75 + r() * 0.3), pal, { n: 8, rough: 0.22, cracks: 1, grain: 10, moss: r() < 0.2 ? 0.3 : 0 });
}

export function drawSlab(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const pal = palOf(o);
  rockBody(g, r, 0, 0, o.w * 0.46, o.h * 0.44, pal, { n: 9, rough: 0.1, strata: 4, cracks: 2, grain: 30, relief: 0.8, lichen: 0.5 });
}

// ------------------------------------------------------------------ nye

function drawPebbles(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const base = palOf(o);
  const tones: RockPal[] = [base, ROCK_PALS.sandstone!, ROCK_PALS.dark!, ROCK_PALS.limestone!];
  const n = 12 + Math.floor(r() * 6);
  const st: { x: number; y: number; s: number; p: RockPal }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.78;
    const pk = r() < 0.65 ? base : tones[Math.floor(r() * tones.length)]!;
    st.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: R * (0.06 + r() * r() * 0.16), p: pk });
  }
  st.sort((p, q) => p.x + p.y - (q.x + q.y));
  for (const s of st) rockBody(g, r, s.x, s.y, s.s, s.s * (0.7 + r() * 0.3), s.p, { n: 7, rough: 0.14, round: true, cracks: 0, grain: 3, relief: 0.8 });
}

function drawOutcrop(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const pal = palOf(o);
  const R = Math.min(o.w, o.h) / 2;
  // løse sten ved foden
  for (let i = 0; i < 5; i++) {
    const a = r() * 6.28;
    rockBody(g, r, Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.65, R * (0.08 + r() * 0.1), R * (0.07 + r() * 0.08), pal, { n: 7, rough: 0.25, cracks: 0, grain: 4 });
  }
  const parts = [
    { x: -R * 0.2, y: R * 0.15, rx: R * 0.78, ry: R * 0.62 },
    { x: R * 0.34, y: -R * 0.14, rx: R * 0.62, ry: R * 0.54 },
    { x: -R * 0.32, y: -R * 0.36, rx: R * 0.52, ry: R * 0.42 },
  ];
  parts.sort((p, q) => q.x + q.y - (p.x + p.y));
  parts.forEach((p, i) => rockBody(g, r, p.x, p.y, p.rx, p.ry, pal, { n: 9, rough: 0.3, cracks: 4, strata: i === 0 ? 3 : 0, grain: 40, lichen: 0.8, moss: i === 2 ? 0.35 : 0, relief: 1.2, noShadow: true }));
}

function drawMossy(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = palOf(o);
  grassTufts(g, r, 0, 0, R * 0.6, R * 0.5, 5, R * 0.22);
  rockBody(g, r, 0, 0, R * 0.62, R * 0.55, pal, { n: 10, rough: 0.2, cracks: 2, grain: 30, moss: 1, lichen: 0.3, noShadow: true });
  grassTufts(g, r, 0, 0, R * 0.6, R * 0.5, 3, R * 0.16);
}

function drawSnowRock(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = ROCK_PALS[param(o, 'rock', 'dark')] ?? ROCK_PALS.dark!;
  // snedrive i læ af stenen (nederst til højre) og en lille på den lyse side
  for (const d of [{ x: R * 0.22, y: R * 0.2, s: 0.78 }, { x: -R * 0.3, y: -R * 0.22, s: 0.4 }]) {
    const gr = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, R * d.s);
    gr.addColorStop(0, 'rgba(246,250,254,.98)');
    gr.addColorStop(0.7, 'rgba(236,244,250,.9)');
    gr.addColorStop(1, 'rgba(236,244,250,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(d.x, d.y, R * d.s, R * d.s * 0.85, 0.5, 0, Math.PI * 2);
    g.fill();
  }
  rockBody(g, r, 0, 0, R * 0.64, R * 0.55, pal, { n: 9, rough: 0.24, cracks: 2, grain: 20, snow: 0.6 });
  if (r() < 0.8) rockBody(g, r, R * 0.6, R * 0.34, R * 0.22, R * 0.18, pal, { n: 7, rough: 0.2, cracks: 0, grain: 6, snow: 0.5 });
}

function drawFlint(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = ROCK_PALS.flint!;
  const n = 3 + Math.floor(r() * 2);
  const st: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 0.4;
    st.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: R * (0.32 + r() * 0.22) });
  }
  st.sort((p, q) => p.x + p.y - (q.x + q.y));
  for (const s of st) {
    rockBody(g, r, s.x, s.y, s.s, s.s * (0.7 + r() * 0.3), pal, { n: 7, rough: 0.34, cracks: 3, grain: 12, relief: 1.4 });
    // hvid skorpe
    g.fillStyle = 'rgba(232,228,214,.7)';
    for (let k = 0; k < 4; k++) {
      const a = r() * 6.28;
      g.beginPath();
      g.arc(s.x + Math.cos(a) * s.s * 0.55, s.y + Math.sin(a) * s.s * 0.5, Math.max(0.8, s.s * (0.05 + r() * 0.07)), 0, Math.PI * 2);
      g.fill();
    }
  }
}

function drawSlate(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = ROCK_PALS.slate!;
  const n = 4 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const rot = r() * 6.28;
    g.save();
    g.translate((r() - 0.5) * R * 0.5, (r() - 0.5) * R * 0.5);
    g.rotate(rot);
    rockBody(g, r, 0, 0, R * (0.45 + r() * 0.25), R * (0.2 + r() * 0.12), pal, { n: 6, rough: 0.12, strata: 4, cracks: 1, grain: 14, relief: 0.8, rot: 0.3, noShadow: true });
    g.restore();
  }
}

function drawLichen(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = ROCK_PALS.limestone!;
  rockBody(g, r, 0, 0, R * 0.62, R * 0.55, pal, { n: 10, rough: 0.2, cracks: 3, grain: 36, lichen: 2.2, moss: 0.2 });
}

function drawRiverStones(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const pal = palOf(o);
  const st: { x: number; y: number; s: number }[] = [];
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 0.5;
    st.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: R * (0.22 + r() * 0.22) });
  }
  st.sort((p, q) => p.x + p.y - (q.x + q.y));
  for (const s of st) rockBody(g, r, s.x, s.y, s.s * 1.15, s.s * 0.8, pal, { n: 9, rough: 0.08, round: true, cracks: 0, grain: 14, relief: 0.75, rot: r() * 3 });
}

export const rockDrawers = { rock_small: drawRockSmall, rock_boulder: drawBoulder, rock_cluster: drawCluster, rock_slab: drawSlab };

const ROCK = { randomRotation: true, bleed: 0.06 };

export const rockKinds: ObjectKind[] = [
  kind({ key: 'rock_pebbles', family: 'rock', name: 'Småsten', w: 1.2, h: 1.2, sizeJitter: 0.3, shadow: 3, ...ROCK, tags: ['water', 'camp', 'farm', 'village'], params: [rockParam], draw: drawPebbles }),
  kind({ key: 'rock_river', family: 'rock', name: 'Flodsten', w: 1.4, h: 1.4, sizeJitter: 0.25, shadow: 5, ...ROCK, tags: ['water', 'swamp'], params: [rockParam], draw: drawRiverStones }),
  kind({ key: 'rock_outcrop', family: 'rock', name: 'Klippeblok', w: 3, h: 2.6, keepAspect: false, sizeJitter: 0.2, shadow: 14, ...ROCK, tags: ['mountain', 'cave'], params: [rockParam], draw: drawOutcrop }),
  kind({ key: 'rock_mossy', family: 'rock', name: 'Sten med mos', w: 1.8, h: 1.8, sizeJitter: 0.25, shadow: 9, ...ROCK, tags: ['forest', 'swamp', 'ruin'], params: [rockParam], draw: drawMossy }),
  kind({ key: 'rock_snow', family: 'rock', name: 'Sten med sne', w: 1.8, h: 1.8, sizeJitter: 0.25, shadow: 9, ...ROCK, tags: ['arctic', 'mountain'], params: [{ ...rockParam, default: 'dark' }], draw: drawSnowRock }),
  kind({ key: 'rock_flint', family: 'rock', name: 'Flint', w: 1.1, h: 1.1, sizeJitter: 0.25, shadow: 4, ...ROCK, tags: ['farm', 'camp', 'grassland'], draw: drawFlint }),
  kind({ key: 'rock_slate', family: 'rock', name: 'Skifer', w: 1.6, h: 1.6, sizeJitter: 0.25, shadow: 6, ...ROCK, tags: ['mountain', 'ruin', 'graveyard'], draw: drawSlate }),
  kind({ key: 'rock_lichen', family: 'rock', name: 'Lavbevokset sten', w: 1.6, h: 1.4, keepAspect: false, sizeJitter: 0.25, shadow: 8, ...ROCK, tags: ['mountain', 'forest', 'graveyard'], draw: drawLichen }),
];
