import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { clipped, crack, ellipsePath, lin, mottle, orb, radial, rectBody, rivet, rope, shift, tube, wobble, polyBody, type G, type RGB } from '../pack2/helpers';

/*
 * Vægdetaljer: tegnet med væggen i TOP af boksen (y negativ); drej genstanden, så væggen vender rigtigt.
 */

const IRON: RGB = [78, 78, 86];

function glow(g: G, x: number, y: number, rad: number, col: string, a = 0.55): void {
  g.fillStyle = radial(g, x, y, rad, [[0, col.replace('A', String(a))], [0.5, col.replace('A', String(a * 0.35))], [1, col.replace('A', '0')]]);
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.fill();
}

function flame(g: G, x: number, y: number, s: number, r: () => number): void {
  for (const [k, col] of [[1, 'rgba(255,120,30,.95)'], [0.72, 'rgba(255,190,60,.95)'], [0.4, 'rgba(255,245,200,1)']] as const) {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(x + (r() - 0.5) * s * 0.1, y, s * 0.5 * k, s * 0.68 * k, 0, 0, 7);
    g.fill();
  }
}

function wallTorch(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const lit = param(o, 'lit', true);
  if (lit) glow(g, 0, h * 0.2, w * 2.6, 'rgba(255,170,70,A)', 0.5);
  // beslag på væggen og arm
  rectBody(g, -w * 0.28, -h / 2, w * 0.56, h * 0.16, 1, IRON, { lw: 1.2 });
  rivet(g, -w * 0.18, -h * 0.42, w * 0.05);
  rivet(g, w * 0.18, -h * 0.42, w * 0.05);
  tube(g, () => { g.beginPath(); g.moveTo(0, -h * 0.4); g.lineTo(0, h * 0.08); }, w * 0.12, IRON, { outline: 1.2 });
  // fakkelen (set oppefra: en træstav med sod og flamme)
  orb(g, 0, h * 0.14, w * 0.2, [92, 62, 38], 1.2);
  g.fillStyle = 'rgba(20,10,4,.7)';
  g.beginPath();
  g.arc(0, h * 0.14, w * 0.11, 0, 7);
  g.fill();
  if (lit) flame(g, 0, h * 0.12, w * 0.34, r);
}

function lantern(g: G, o: DrawInput): void {
  const { w, h } = o;
  const lit = param(o, 'lit', true);
  if (lit) glow(g, 0, h * 0.2, w * 2.4, 'rgba(255,200,110,A)', 0.5);
  tube(g, () => { g.beginPath(); g.moveTo(0, -h / 2); g.lineTo(0, -h * 0.05); }, w * 0.09, IRON, { outline: 1.1 });
  rectBody(g, -w * 0.22, -h * 0.08, w * 0.44, w * 0.44, 2, [70, 66, 62], { lw: 1.3 });
  g.fillStyle = lit ? 'rgba(255,214,120,.95)' : 'rgba(120,130,140,.5)';
  g.fillRect(-w * 0.14, h * 0.0, w * 0.28, w * 0.28);
  g.strokeStyle = 'rgba(30,24,20,.9)';
  g.lineWidth = 1.2;
  g.strokeRect(-w * 0.14, h * 0.0, w * 0.28, w * 0.28);
}

const CRYSTAL: Record<string, RGB> = { blue: [90, 150, 230], violet: [160, 104, 230], green: [90, 210, 150], red: [230, 90, 96] };

function crystals(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const col = CRYSTAL[param(o, 'color', 'blue')] ?? CRYSTAL.blue!;
  glow(g, 0, h * 0.1, w * 1.8, `rgba(${col[0]},${col[1]},${col[2]},A)`, 0.45);
  const n = 5 + Math.floor(r() * 3);
  const list: { x: number; len: number; wd: number; a: number }[] = [];
  for (let i = 0; i < n; i++) list.push({ x: (r() - 0.5) * w * 0.8, len: h * (0.3 + r() * 0.5), wd: w * (0.07 + r() * 0.06), a: (r() - 0.5) * 0.9 });
  list.sort((a, b) => b.len - a.len);
  for (const c of list) {
    g.save();
    g.translate(c.x, -h / 2);
    g.rotate(c.a);
    const pts: [number, number][] = [[-c.wd, 0], [-c.wd * 0.7, c.len * 0.72], [0, c.len], [c.wd * 0.7, c.len * 0.72], [c.wd, 0]];
    polyBody(g, pts, col, { lw: 1.2, light: 70, dark: 46, ao: c.wd * 0.3 });
    g.fillStyle = 'rgba(255,255,255,.5)';
    g.beginPath();
    g.moveTo(-c.wd * 0.3, c.len * 0.1);
    g.lineTo(-c.wd * 0.1, c.len * 0.6);
    g.lineTo(-c.wd * 0.5, c.len * 0.5);
    g.closePath();
    g.fill();
    g.restore();
  }
}

function chains(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  for (const sx of [-1, 1]) {
    const x = sx * w * 0.28;
    rivet(g, x, -h * 0.42, w * 0.08, [120, 118, 124]);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 6; i++) pts.push([x + Math.sin(i * 0.9 + r()) * w * 0.05, -h * 0.4 + (i / 6) * h * (0.5 + r() * 0.2)]);
    // led som en tyk, prikket streg
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(8,6,6,.85)';
    g.lineWidth = w * 0.1;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    g.strokeStyle = 'rgb(112,112,122)';
    g.lineWidth = w * 0.07;
    g.setLineDash([w * 0.07, w * 0.04]);
    g.stroke();
    g.setLineDash([]);
    const e = pts.at(-1)!;
    g.strokeStyle = 'rgb(96,96,104)';
    g.lineWidth = w * 0.06;
    g.beginPath();
    g.ellipse(e[0], e[1] + w * 0.1, w * 0.12, w * 0.1, 0, 0, 7);
    g.stroke();
  }
}

function cobweb(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  // spindelvæv i et hjørne øverst til venstre
  const cx = -w / 2;
  const cy = -h / 2;
  const R = Math.min(w, h) * 0.95;
  g.strokeStyle = 'rgba(236,236,240,.75)';
  g.lineWidth = 1;
  const spokes = 6;
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * (Math.PI / 2);
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    g.stroke();
  }
  for (let k = 1; k <= 5; k++) {
    const rad = (R * k) / 5.2;
    g.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * (Math.PI / 2);
      const sag = i > 0 ? (r() * 0.06 + 0.1) * rad : 0;
      const x = cx + Math.cos(a) * (rad - sag * (i > 0 && i < spokes ? 1 : 0));
      const y = cy + Math.sin(a) * (rad - sag * (i > 0 && i < spokes ? 1 : 0));
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
}

function lever(g: G, o: DrawInput): void {
  const { w, h } = o;
  const down = param(o, 'down', false);
  rectBody(g, -w * 0.3, -h / 2, w * 0.6, h * 0.3, 1.5, [96, 92, 90], { lw: 1.3 });
  rectBody(g, -w * 0.12, -h * 0.4, w * 0.24, h * 0.1, 1, IRON, { lw: 1 });
  g.save();
  g.translate(0, -h * 0.3);
  g.rotate(down ? 0.9 : -0.9);
  tube(g, () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, h * 0.6); }, w * 0.1, IRON, { outline: 1.2 });
  orb(g, 0, h * 0.62, w * 0.12, [168, 52, 44], 1.1);
  g.restore();
}

function roots(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  for (let i = 0; i < 6; i++) {
    const x = (i / 5 - 0.5) * w * 0.9 + (r() - 0.5) * w * 0.1;
    const len = h * (0.4 + r() * 0.55);
    const pts: [number, number][] = [];
    for (let k = 0; k <= 6; k++) pts.push([x + Math.sin(k * 0.8 + i) * w * 0.05, -h / 2 + (k / 6) * len]);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(20,12,6,.85)';
    g.lineWidth = w * (0.07 - i * 0.004) + 1.5;
    g.beginPath();
    pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    g.strokeStyle = 'rgb(112,82,52)';
    g.lineWidth = w * (0.07 - i * 0.004);
    g.stroke();
  }
  void rope;
}

const lit = { key: 'lit', label: 'Tændt', type: 'toggle' as const, default: true };

export const wallmountKinds: ObjectKind[] = [
  kind({ key: 'wall_torch', family: 'wallmount', name: 'Fakkel på væg', w: 0.8, h: 1.1, bleed: 2.8, shadow: 0, params: [lit], draw: wallTorch }),
  kind({ key: 'wall_lantern', family: 'wallmount', name: 'Lanterne på væg', w: 0.8, h: 1.1, bleed: 2.6, shadow: 0, params: [lit], draw: lantern }),
  kind({
    key: 'wall_crystals', family: 'wallmount', name: 'Krystaller i væggen', w: 1.8, h: 1.3, bleed: 1.2, shadow: 0, sizeJitter: 0.2,
    params: [{ key: 'color', label: 'Farve', type: 'select', default: 'blue', options: [{ value: 'blue', label: 'Blå' }, { value: 'violet', label: 'Violet' }, { value: 'green', label: 'Grøn' }, { value: 'red', label: 'Rød' }] }],
    draw: crystals,
  }),
  kind({ key: 'wall_chains', family: 'wallmount', name: 'Lænker på væg', w: 1.2, h: 1.2, bleed: 0.1, shadow: 3, draw: chains }),
  kind({ key: 'wall_cobweb', family: 'wallmount', name: 'Spindelvæv (hjørne)', w: 1.2, h: 1.2, bleed: 0.05, shadow: 0, draw: cobweb }),
  kind({ key: 'wall_lever', family: 'wallmount', name: 'Håndtag på væg', w: 0.8, h: 1, bleed: 0.3, shadow: 3, params: [{ key: 'down', label: 'Trukket ned', type: 'toggle', default: false }], draw: lever }),
  kind({ key: 'wall_roots', family: 'wallmount', name: 'Rødder fra loftet', w: 1.5, h: 1.2, bleed: 0.08, shadow: 3, sizeJitter: 0.25, draw: roots }),
];

void clipped; void crack; void ellipsePath; void lin; void mottle; void wobble;
