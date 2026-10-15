import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { body, clipped, ellipsePath, mottle, orb, rectBody, rectPath, rivet, shift, tube, type G, type RGB } from '../pack2/helpers';

const STONE: RGB = [132, 128, 120];
const IRON: RGB = [88, 90, 98];
const RUST: RGB = [128, 78, 46];
const WOOD: RGB = [128, 90, 54];

function stonePost(g: G, r: () => number, x: number, y: number, w: number, h: number): void {
  rectBody(g, x, y, w, h, Math.min(w, h) * 0.12, STONE, { lw: 1.5 });
  const p = rectPath(g, x, y, w, h);
  clipped(g, p, () => mottle(g, r, [x, y, x + w, y + h], STONE, 10, Math.min(w, h) * 0.18, 18, 0.35));
}

function rust(g: G, r: () => number, x: number, y: number, w: number, h: number): void {
  clipped(g, rectPath(g, x, y, w, h), () => mottle(g, r, [x, y, x + w, y + h], RUST, 16, Math.min(w, h) * 0.2, 30, 0.55));
}

/** Jerngitter set oppefra: stolper i enderne, en skinne med stangspidser; åbent = trukket op i muren. */
function gate(g: G, o: DrawInput, dense: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const open = param(o, 'open', false);
  const rusty = param(o, 'rust', false);
  const pw = Math.min(w * 0.18, h * 1.3);
  const x0 = -w / 2 + pw;
  const x1 = w / 2 - pw;
  stonePost(g, r, -w / 2, -h / 2, pw, h);
  stonePost(g, r, x1, -h / 2, pw, h);
  // slidsen, gitteret kører i
  g.fillStyle = 'rgb(30,28,30)';
  g.fillRect(x0, -h * 0.34, x1 - x0, h * 0.68);
  g.strokeStyle = 'rgba(0,0,0,.6)';
  g.lineWidth = 1;
  g.strokeRect(x0, -h * 0.34, x1 - x0, h * 0.68);
  const bar = h * 0.17;
  if (!open) {
    const n = Math.max(3, Math.round((x1 - x0) / (dense ? bar * 2.4 : bar * 3.4)));
    const rail = () => {
      g.beginPath();
      g.moveTo(x0, 0);
      g.lineTo(x1, 0);
    };
    tube(g, rail, h * 0.3, rusty ? RUST : IRON, { outline: 1.4 });
    if (dense) {
      for (const dy of [-h * 0.22, h * 0.22]) {
        tube(g, () => { g.beginPath(); g.moveTo(x0, dy); g.lineTo(x1, dy); }, h * 0.14, rusty ? RUST : IRON, { outline: 1.2 });
      }
    }
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.5) / n) * (x1 - x0);
      orb(g, x, 0, bar, rusty ? shift(RUST, 8) : shift(IRON, 12), 1.1);
      // spids
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.beginPath();
      g.arc(x - bar * 0.3, -bar * 0.3, bar * 0.25, 0, 7);
      g.fill();
    }
    if (rusty) rust(g, r, x0, -h * 0.17, x1 - x0, h * 0.34);
    // kæde og hjul i den ene ende
    rivet(g, x0 + 3, 0, h * 0.1);
    rivet(g, x1 - 3, 0, h * 0.1);
  } else {
    // opdraget: kun to stumper i hver ende og den tomme slids
    for (const sx of [x0, x1 - bar * 2.2]) {
      rectBody(g, sx, -h * 0.17, bar * 2.2, h * 0.34, 2, rusty ? RUST : IRON, { lw: 1.2 });
    }
    g.strokeStyle = 'rgba(180,180,190,.18)';
    g.setLineDash([4, 5]);
    g.beginPath();
    g.moveTo(x0, 0);
    g.lineTo(x1, 0);
    g.stroke();
    g.setLineDash([]);
  }
}

/** Celledør af jern, hængslet i den ene side. */
function cellDoor(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const open = param(o, 'open', false);
  const post = Math.min(h * 0.9, w * 0.14);
  stonePost(g, r, -w / 2, -h / 2, post, h);
  stonePost(g, r, w / 2 - post, -h / 2, post, h);
  const len = w - post * 2;
  const leaf = () => {
    const t = h * 0.34;
    const bars = Math.max(3, Math.round(len / (t * 1.6)));
    tube(g, () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(len, 0); }, t * 0.7, IRON, { outline: 1.3 });
    for (let i = 0; i < bars; i++) orb(g, ((i + 0.5) / bars) * len, 0, t * 0.5, shift(IRON, 12), 1);
    rivet(g, len - 3, 0, t * 0.25, [190, 150, 70]);
  };
  g.save();
  if (!open) {
    g.translate(-w / 2 + post, 0);
    leaf();
  } else {
    g.translate(-w / 2 + post, 0);
    g.rotate(Math.PI / 2 - 0.25);
    leaf();
  }
  g.restore();
}

function trapdoor(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const open = param(o, 'open', false);
  const frame = Math.min(w, h) * 0.08;
  rectBody(g, -w / 2, -h / 2, w, h, 3, [74, 56, 38], { lw: 1.6 });
  if (open) {
    g.fillStyle = 'rgb(10,8,8)';
    g.fillRect(-w / 2 + frame, -h / 2 + frame, w - frame * 2, h - frame * 2);
    // stige ned i hullet
    g.strokeStyle = 'rgb(150,112,66)';
    g.lineWidth = Math.max(1.5, w * 0.04);
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * w * 0.22, -h * 0.4);
      g.lineTo(sx * w * 0.22, h * 0.4);
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(-w * 0.22, -h * 0.32 + i * h * 0.16);
      g.lineTo(w * 0.22, -h * 0.32 + i * h * 0.16);
      g.stroke();
    }
    // lågen lænet op ad kanten
    g.save();
    g.translate(0, -h / 2);
    rectBody(g, -w / 2 * 0.9, -h * 0.55, w * 0.9, h * 0.5, 2, WOOD, { lw: 1.4 });
    g.restore();
  } else {
    const p = rectPath(g, -w / 2 + frame, -h / 2 + frame, w - frame * 2, h - frame * 2, 2);
    body(g, p, WOOD, [-w / 2, -h / 2, w / 2, h / 2], { lw: 1.4 });
    clipped(g, p, () => {
      g.strokeStyle = 'rgba(30,18,8,.6)';
      g.lineWidth = 1.2;
      const n = 5;
      for (let i = 1; i < n; i++) {
        g.beginPath();
        g.moveTo(-w / 2, -h / 2 + (i / n) * h);
        g.lineTo(w / 2, -h / 2 + (i / n) * h);
        g.stroke();
      }
      mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], WOOD, 14, w * 0.1, 20, 0.35);
    });
    for (const sy of [-0.28, 0.28]) rectBody(g, -w * 0.42, h * sy - h * 0.035, w * 0.84, h * 0.07, 1, IRON, { lw: 1 });
    // ring
    g.strokeStyle = 'rgb(40,40,44)';
    g.lineWidth = Math.max(1.5, w * 0.04);
    g.beginPath();
    g.ellipse(0, 0, w * 0.1, w * 0.1, 0, 0, 7);
    g.stroke();
    g.strokeStyle = 'rgb(150,150,160)';
    g.lineWidth = Math.max(0.8, w * 0.015);
    g.stroke();
  }
}

function secretDoor(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const shown = param(o, 'revealed', false);
  const p = rectPath(g, -w / 2, -h / 2, w, h, 1);
  body(g, p, STONE, [-w / 2, -h / 2, w / 2, h / 2], { lw: 1.6 });
  clipped(g, p, () => {
    mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], STONE, 24, h * 0.3, 20, 0.35);
    const n = Math.max(2, Math.round(w / (h * 1.6)));
    g.strokeStyle = 'rgba(30,26,24,.7)';
    g.lineWidth = 1.2;
    for (let i = 1; i < n; i++) {
      g.beginPath();
      g.moveTo(-w / 2 + (i / n) * w, -h / 2);
      g.lineTo(-w / 2 + (i / n) * w, h / 2);
      g.stroke();
    }
  });
  if (shown) {
    // sprække med lys og en dør, der er skubbet på klem
    g.fillStyle = 'rgba(255,214,120,.8)';
    g.fillRect(-w * 0.05, -h / 2, w * 0.1, h);
    g.strokeStyle = 'rgba(20,14,8,.9)';
    g.lineWidth = 1.4;
    g.strokeRect(-w * 0.2, -h / 2, w * 0.4, h);
  }
}

export const gateKinds: ObjectKind[] = [
  kind({
    key: 'gate_iron', family: 'gate', name: 'Jerngitter', w: 2, h: 0.6, keepAspect: false, bleed: 0.06, shadow: 6,
    params: [{ key: 'open', label: 'Åbent (trukket op)', type: 'toggle', default: false }, { key: 'rust', label: 'Rustent', type: 'toggle', default: false }],
    draw: (g, o) => gate(g, o, false),
  }),
  kind({
    key: 'gate_portcullis', family: 'gate', name: 'Faldgitter', w: 3, h: 0.7, keepAspect: false, bleed: 0.06, shadow: 6,
    params: [{ key: 'open', label: 'Åbent (trukket op)', type: 'toggle', default: false }, { key: 'rust', label: 'Rustent', type: 'toggle', default: true }],
    draw: (g, o) => gate(g, o, true),
  }),
  kind({
    key: 'gate_cell', family: 'gate', name: 'Celledør af jern', w: 1.2, h: 0.4, keepAspect: false, bleed: 0.9, shadow: 5,
    params: [{ key: 'open', label: 'Åben', type: 'toggle', default: false }],
    draw: cellDoor,
  }),
  kind({
    key: 'trapdoor', family: 'gate', name: 'Lem i gulvet', w: 1.1, h: 1.1, bleed: 0.5, shadow: 3,
    params: [{ key: 'open', label: 'Åben', type: 'toggle', default: false }],
    draw: trapdoor,
  }),
  kind({
    key: 'secret_door', family: 'gate', name: 'Hemmelig dør', w: 1.4, h: 0.4, keepAspect: false, bleed: 0.04, shadow: 0,
    params: [{ key: 'revealed', label: 'Afsløret', type: 'toggle', default: false }],
    draw: secretDoor,
  }),
];

void ellipsePath;
