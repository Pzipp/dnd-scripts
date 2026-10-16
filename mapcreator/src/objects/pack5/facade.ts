import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { clipped, ellBody, lin, mottle, OUT, plankBoard, polyBody, polyPath, radial, rectBody, rectPath, rgb, rivet, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { glassPane, IRON, innerShade, masonry, openingPath, STONE, woodOf, woodParam, wearParam } from './doors';

/** Facade og bygningsdele (pakke 5): skorstene, markiser, skilte, verandaer, altaner, vinduer, tagrender, regntønder, vejrhaner og flag. */

const BRICK: RGB = [158, 82, 60];

const CLOTH: { label: string; a: RGB; b: RGB }[] = [
  { label: 'Rød og hvid', a: [176, 48, 44], b: [236, 228, 208] },
  { label: 'Blå og hvid', a: [52, 86, 156], b: [236, 228, 208] },
  { label: 'Grøn og creme', a: [60, 120, 70], b: [232, 222, 188] },
  { label: 'Gul og hvid', a: [216, 168, 52], b: [238, 230, 210] },
  { label: 'Lilla og creme', a: [110, 64, 140], b: [232, 222, 196] },
];
const clothParam: ParamDef = { key: 'cloth', label: 'Stof', type: 'select', default: '0', options: CLOTH.map((c, i) => ({ value: String(i), label: c.label })) };
const clothOf = (o: DrawInput): { a: RGB; b: RGB } => CLOTH[Math.min(CLOTH.length - 1, Math.max(0, parseInt(param(o, 'cloth', '0'), 10) || 0))]!;

const rr = (r: Rnd, a: number, b: number): number => a + r() * (b - a);

// ------------------------------------------------------------------ skorstene (set oppefra)

function chimneyTop(g: G, r: Rnd, x: number, y: number, w: number, h: number, mat: 'stone' | 'brick', flues: number, pot: boolean): void {
  const base = mat === 'stone' ? ([150, 132, 114] as RGB) : BRICK;
  rectBody(g, x, y, w, h, Math.min(w, h) * 0.06, base, { lw: 1.8, ao: Math.min(w, h) * 0.08 });
  clipped(g, rectPath(g, x, y, w, h), () => {
    if (mat === 'stone') masonry(g, r, x, y, w, h, base, Math.max(6, h * 0.14));
    else {
      const rh = Math.max(4, h * 0.075);
      for (let yy = y, j = 0; yy < y + h; yy += rh, j++) {
        for (let xx = x - (j % 2) * rh; xx < x + w; xx += rh * 2.1) {
          g.fillStyle = rgb(shift(base, (r() - 0.5) * 34));
          g.fillRect(xx + 0.5, yy + 0.5, rh * 2.1 - 1, rh - 1);
        }
      }
      g.fillStyle = 'rgba(255,240,215,.14)';
      g.fillRect(x, y, w, 1.6);
    }
  });
  // krone: lys kant, mørk åbning med sod
  const m = Math.min(w, h) * 0.16;
  rectBody(g, x + m * 0.4, y + m * 0.4, w - m * 0.8, h - m * 0.8, 1.5, shift(base, 16), { lw: 1.3, ao: 1.4 });
  const fw = (w - m * 2 - (flues - 1) * m * 0.7) / flues;
  for (let i = 0; i < flues; i++) {
    const fx = x + m + i * (fw + m * 0.7);
    const fy = y + m;
    const fh = h - m * 2;
    if (pot) {
      const cx = fx + fw / 2;
      const cy = fy + fh / 2;
      const rad = Math.min(fw, fh) / 2;
      ellBody(g, cx, cy, rad, rad, [176, 96, 62], { lw: 1.4, ao: rad * 0.12 });
      g.fillStyle = 'rgb(16,10,8)';
      g.beginPath(); g.arc(cx, cy, rad * 0.62, 0, 7); g.fill();
      g.fillStyle = radial(g, cx, cy, rad * 0.62, [[0, 'rgba(70,50,40,.5)'], [1, 'rgba(0,0,0,0)']]);
      g.beginPath(); g.arc(cx, cy, rad * 0.62, 0, 7); g.fill();
    } else {
      g.fillStyle = 'rgb(16,10,8)';
      g.fillRect(fx, fy, fw, fh);
      g.fillStyle = lin(g, fx, fy, fx + fw, fy + fh, [[0, 'rgba(0,0,0,.3)'], [1, 'rgba(90,64,50,.45)']]);
      g.fillRect(fx, fy, fw, fh);
      g.strokeStyle = 'rgba(8,4,0,.85)'; g.lineWidth = 1.2; g.strokeRect(fx, fy, fw, fh);
    }
  }
}

const chimneyKinds: ObjectKind[] = [
  kind({ key: 'facade_chimney_stone', family: 'facade', name: 'Skorsten, sten', w: 0.9, h: 0.9, shadow: 14, bleed: 0.02, tags: ['house', 'village', 'city', 'poor'], draw: (g, o) => chimneyTop(g, rng(o.seed), -o.w / 2, -o.h / 2, o.w, o.h, 'stone', 1, false) }),
  kind({ key: 'facade_chimney_brick', family: 'facade', name: 'Skorsten, mursten', w: 1, h: 1, shadow: 14, bleed: 0.02, tags: ['house', 'city', 'rich'], draw: (g, o) => chimneyTop(g, rng(o.seed), -o.w / 2, -o.h / 2, o.w, o.h, 'brick', 1, false) }),
  kind({ key: 'facade_chimney_pot', family: 'facade', name: 'Skorsten med pibe', w: 0.9, h: 0.9, shadow: 14, bleed: 0.02, tags: ['house', 'city', 'village'], draw: (g, o) => chimneyTop(g, rng(o.seed), -o.w / 2, -o.h / 2, o.w, o.h, 'brick', 1, true) }),
  kind({ key: 'facade_chimney_double', family: 'facade', name: 'Dobbelt skorsten', w: 1.8, h: 0.9, shadow: 14, bleed: 0.02, tags: ['house', 'city', 'rich', 'tavern'], draw: (g, o) => chimneyTop(g, rng(o.seed), -o.w / 2, -o.h / 2, o.w, o.h, 'brick', 2, true) }),
  kind({ key: 'facade_chimney_big', family: 'facade', name: 'Bred skorsten, hal', w: 2.4, h: 1.2, shadow: 14, bleed: 0.02, tags: ['tavern', 'city', 'rich', 'military'], draw: (g, o) => chimneyTop(g, rng(o.seed), -o.w / 2, -o.h / 2, o.w, o.h, 'stone', 3, false) }),
];

// ------------------------------------------------------------------ markiser og baldakiner

/** Stribet stof set oppefra: striber ned ad hældningen, buet skærm og kantfrynse forneden. */
function awning(g: G, o: DrawInput, o2: { scallop: boolean; plain: boolean; fan: boolean }): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const { a, b } = clothOf(o);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const n = Math.max(4, Math.round(w / 15));
  const sw = w / n;
  const edge = Math.min(10, h * 0.16);
  const body = () => {
    g.beginPath();
    if (o2.fan) {
      g.moveTo(x0, y0);
      g.lineTo(x0 + w, y0);
      g.arc(0, y0, h - 2, 0.1, Math.PI - 0.1);
    } else {
      g.rect(x0, y0, w, h - edge);
      for (let i = 0; i < n; i++) {
        g.moveTo(x0 + i * sw, y0 + h - edge);
        if (o2.scallop) g.arc(x0 + (i + 0.5) * sw, y0 + h - edge, sw / 2, Math.PI, 0, true);
      }
    }
  };
  // skygge-underlag
  g.save();
  body();
  g.clip();
  if (o2.fan) {
    const spokes = 9;
    for (let i = 0; i < spokes; i++) {
      const a0 = 0.1 + (i / spokes) * (Math.PI - 0.2);
      const a1 = 0.1 + ((i + 1) / spokes) * (Math.PI - 0.2);
      g.beginPath();
      g.moveTo(0, y0);
      g.arc(0, y0, h * 1.2, a0, a1);
      g.closePath();
      const col = o2.plain || i % 2 === 0 ? a : b;
      const lit = Math.cos((a0 + a1) / 2 - Math.PI * 1.25) * 0.5 + 0.1;
      g.fillStyle = rgb(shift(col, lit * 30 - 6));
      g.fill();
    }
  } else {
    for (let i = 0; i < n; i++) {
      const col = o2.plain || i % 2 === 0 ? a : b;
      const x = x0 + i * sw;
      g.fillStyle = lin(g, x, 0, x + sw, 0, [[0, rgb(shift(col, 20))], [0.5, rgb(col)], [1, rgb(shift(col, -28))]]);
      g.fillRect(x, y0, sw + 0.5, h);
    }
    // hældning: lysere foroven (op mod muren er mørkere), folder
    g.fillStyle = lin(g, 0, y0, 0, y0 + h, [[0, 'rgba(10,6,0,.35)'], [0.25, 'rgba(10,6,0,.05)'], [0.8, 'rgba(255,250,235,.08)'], [1, 'rgba(10,6,0,.12)']]);
    g.fillRect(x0, y0, w, h);
  }
  // sømme og skæve folder
  g.strokeStyle = 'rgba(20,10,4,.28)';
  g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const yy = y0 + h * (0.2 + 0.2 * i) + (r() - 0.5) * 3;
    g.beginPath(); g.moveTo(x0, yy); g.quadraticCurveTo(0, yy + 2 + r() * 2, x0 + w, yy); g.stroke();
  }
  g.restore();
  body();
  g.strokeStyle = OUT; g.lineWidth = 1.8; g.lineJoin = 'round'; g.stroke();
  // frynser
  if (!o2.fan && !o2.scallop) {
    for (let i = 0; i < n * 2; i++) {
      const fx = x0 + (i / (n * 2)) * w + 1;
      g.fillStyle = rgb(i % 4 < 2 && !o2.plain ? b : a);
      g.fillRect(fx, y0 + h - edge, w / (n * 2) - 1, edge * 0.75);
      g.strokeStyle = 'rgba(20,8,4,.6)'; g.lineWidth = 0.8; g.strokeRect(fx, y0 + h - edge, w / (n * 2) - 1, edge * 0.75);
    }
  }
  // stænger langs kanterne og indfatning ved muren
  if (!o2.fan) {
    for (const s of [-1, 1]) tube(g, () => { g.beginPath(); g.moveTo(s * (w / 2 - 2), y0 + 1); g.lineTo(s * (w / 2 - 2), y0 + h - edge); }, 3, IRON, { outline: 1 });
    rectBody(g, x0 - 2, y0 - 3, w + 4, 6, 2, [86, 62, 40], { lw: 1.4 });
  } else rectBody(g, x0 - 2, y0 - 3, w + 4, 6, 2, [86, 62, 40], { lw: 1.4 });
  for (const s of [-1, 1]) rivet(g, s * (w / 2 - 6), y0, 2.2, [160, 150, 130]);
}

/** Baldakin: lille sadeltag af planker over en dør, set oppefra med to konsoller. */
function porchRoof(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const wood = woodOf(o);
  const x0 = -w / 2;
  const y0 = -h / 2;
  rectBody(g, x0 - 3, y0 - 4, w + 6, 8, 2, STONE, { lw: 1.5 });
  const half = (x: number, ww: number, lit: number): void => {
    clipped(g, rectPath(g, x, y0, ww, h), () => {
      g.fillStyle = rgb(shift(wood, lit));
      g.fillRect(x, y0, ww, h);
      for (let yy = y0; yy < y0 + h; yy += 7) {
        g.fillStyle = rgb(shift(wood, lit + (r() - 0.5) * 14));
        g.fillRect(x, yy, ww, 6.4);
        g.fillStyle = 'rgba(10,4,0,.4)';
        g.fillRect(x, yy + 6, ww, 1.3);
        g.fillStyle = 'rgba(255,240,200,.18)';
        g.fillRect(x, yy, ww, 0.9);
      }
    });
  };
  half(x0, w / 2, 14);
  half(0, w / 2, -22);
  g.strokeStyle = OUT; g.lineWidth = 1.8; g.strokeRect(x0, y0, w, h);
  tube(g, () => { g.beginPath(); g.moveTo(0, y0); g.lineTo(0, y0 + h); }, 5, shift(wood, -10), { outline: 1.6 });
  for (const s of [-1, 1]) {
    rectBody(g, s * (w / 2 - 6) - 4, y0 + h - 4, 8, 12, 2, [92, 66, 44], { lw: 1.3 });
  }
}

const awningKinds: ObjectKind[] = [
  kind({ key: 'facade_awning_long', family: 'facade', name: 'Markise, stribet', w: 3, h: 1.4, shadow: 8, bleed: 0.03, tags: ['city', 'village', 'tavern', 'rich'], params: [clothParam], draw: (g, o) => awning(g, o, { scallop: false, plain: false, fan: false }) }),
  kind({ key: 'facade_awning_scallop', family: 'facade', name: 'Markise, buet kant', w: 2, h: 1.2, shadow: 8, bleed: 0.03, tags: ['city', 'village', 'tavern', 'rich'], params: [clothParam], draw: (g, o) => awning(g, o, { scallop: true, plain: false, fan: false }) }),
  kind({ key: 'facade_awning_plain', family: 'facade', name: 'Markise, ensfarvet', w: 2.4, h: 1.2, shadow: 8, bleed: 0.03, tags: ['city', 'village', 'camp', 'poor'], params: [clothParam], draw: (g, o) => awning(g, o, { scallop: true, plain: true, fan: false }) }),
  kind({ key: 'facade_awning_fan', family: 'facade', name: 'Markise, halvrund', w: 2, h: 1.2, shadow: 8, bleed: 0.03, tags: ['city', 'rich', 'tavern'], params: [clothParam], draw: (g, o) => awning(g, o, { scallop: false, plain: false, fan: true }) }),
  kind({ key: 'facade_porch_roof', family: 'facade', name: 'Baldakin over dør', w: 2, h: 1.2, shadow: 10, bleed: 0.03, tags: ['house', 'village', 'city'], params: [woodParam], draw: (g, o) => porchRoof(g, o) }),
];

// ------------------------------------------------------------------ skilte (uden tekst)

type Icon = 'mug' | 'hammer' | 'key' | 'bread' | 'potion' | 'boot' | 'sword' | 'bag' | 'scissors' | 'fish' | 'bell' | 'book';

function iconDraw(g: G, icon: Icon, s: number, c: RGB): void {
  const fill = rgb(c);
  const dark = 'rgba(30,16,6,.85)';
  g.fillStyle = fill;
  g.strokeStyle = dark;
  g.lineWidth = Math.max(1, s * 0.05);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const stroke = (): void => { g.fill(); g.stroke(); };
  switch (icon) {
    case 'mug': {
      g.beginPath(); g.moveTo(-s * 0.3, -s * 0.28); g.lineTo(s * 0.26, -s * 0.28); g.lineTo(s * 0.22, s * 0.34); g.lineTo(-s * 0.26, s * 0.34); g.closePath(); stroke();
      g.beginPath(); g.arc(s * 0.32, 0.02 * s, s * 0.17, -1.4, 1.4); g.lineWidth = s * 0.1; g.stroke();
      g.lineWidth = Math.max(1, s * 0.05);
      g.fillStyle = 'rgb(246,240,224)';
      g.beginPath(); g.arc(-s * 0.18, -s * 0.3, s * 0.12, 0, 7); g.arc(0, -s * 0.36, s * 0.14, 0, 7); g.arc(s * 0.18, -s * 0.3, s * 0.12, 0, 7); stroke();
      break;
    }
    case 'hammer': {
      g.save(); g.rotate(-0.6);
      g.beginPath(); g.rect(-s * 0.05, -s * 0.2, s * 0.1, s * 0.62); stroke();
      g.beginPath(); g.rect(-s * 0.26, -s * 0.34, s * 0.52, s * 0.2); stroke();
      g.restore();
      g.beginPath(); g.moveTo(-s * 0.3, s * 0.3); g.lineTo(s * 0.3, s * 0.3); g.lineTo(s * 0.24, s * 0.4); g.lineTo(-s * 0.24, s * 0.4); g.closePath(); stroke();
      break;
    }
    case 'key': {
      g.beginPath(); g.arc(-s * 0.18, -s * 0.16, s * 0.18, 0, 7); stroke();
      g.fillStyle = 'rgba(20,10,4,.7)'; g.beginPath(); g.arc(-s * 0.18, -s * 0.16, s * 0.07, 0, 7); g.fill();
      g.fillStyle = fill;
      g.save(); g.rotate(0.7);
      g.beginPath(); g.rect(-s * 0.04, -s * 0.02, s * 0.08, s * 0.64); stroke();
      g.beginPath(); g.rect(s * 0.04, s * 0.42, s * 0.14, s * 0.07); g.rect(s * 0.04, s * 0.54, s * 0.1, s * 0.07); stroke();
      g.restore();
      break;
    }
    case 'bread': {
      g.beginPath(); g.ellipse(0, 0.04 * s, s * 0.42, s * 0.24, 0, 0, 7); stroke();
      g.strokeStyle = 'rgba(80,40,10,.8)'; g.beginPath();
      for (const k of [-0.2, 0, 0.2]) { g.moveTo(s * k - s * 0.05, -s * 0.1); g.lineTo(s * k + s * 0.07, s * 0.16); }
      g.stroke();
      break;
    }
    case 'potion': {
      g.beginPath(); g.moveTo(-s * 0.08, -s * 0.38); g.lineTo(s * 0.08, -s * 0.38); g.lineTo(s * 0.08, -s * 0.14); g.quadraticCurveTo(s * 0.4, s * 0.0, s * 0.3, s * 0.3); g.quadraticCurveTo(0, s * 0.42, -s * 0.3, s * 0.3); g.quadraticCurveTo(-s * 0.4, s * 0.0, -s * 0.08, -s * 0.14); g.closePath(); stroke();
      g.fillStyle = 'rgb(150,90,50)'; g.beginPath(); g.rect(-s * 0.1, -s * 0.46, s * 0.2, s * 0.1); stroke();
      g.fillStyle = 'rgba(100,220,160,.9)'; g.beginPath(); g.ellipse(0, s * 0.18, s * 0.2, s * 0.14, 0, 0, 7); g.fill();
      break;
    }
    case 'boot': {
      g.beginPath(); g.moveTo(-s * 0.18, -s * 0.38); g.lineTo(s * 0.1, -s * 0.38); g.lineTo(s * 0.1, s * 0.06); g.lineTo(s * 0.38, s * 0.16); g.lineTo(s * 0.38, s * 0.36); g.lineTo(-s * 0.18, s * 0.36); g.closePath(); stroke();
      g.fillStyle = 'rgb(60,40,28)'; g.fillRect(-s * 0.18, s * 0.3, s * 0.56, s * 0.08);
      break;
    }
    case 'sword': {
      g.save(); g.rotate(0.7);
      g.beginPath(); g.moveTo(0, -s * 0.46); g.lineTo(s * 0.06, -s * 0.34); g.lineTo(s * 0.06, s * 0.12); g.lineTo(-s * 0.06, s * 0.12); g.lineTo(-s * 0.06, -s * 0.34); g.closePath(); g.fillStyle = 'rgb(210,214,222)'; stroke();
      g.fillStyle = fill; g.beginPath(); g.rect(-s * 0.2, s * 0.12, s * 0.4, s * 0.07); stroke();
      g.beginPath(); g.rect(-s * 0.04, s * 0.19, s * 0.08, s * 0.2); stroke();
      g.restore();
      break;
    }
    case 'bag': {
      g.beginPath(); g.moveTo(-s * 0.12, -s * 0.2); g.quadraticCurveTo(-s * 0.46, s * 0.1, -s * 0.3, s * 0.34); g.lineTo(s * 0.3, s * 0.34); g.quadraticCurveTo(s * 0.46, s * 0.1, s * 0.12, -s * 0.2); g.closePath(); stroke();
      g.fillStyle = 'rgb(120,90,50)'; g.beginPath(); g.rect(-s * 0.16, -s * 0.26, s * 0.32, s * 0.09); stroke();
      g.fillStyle = 'rgba(40,24,8,.9)'; g.font = ''; g.beginPath(); g.arc(0, s * 0.12, s * 0.09, 0, 7); g.fill();
      break;
    }
    case 'scissors': {
      for (const sgn of [-1, 1]) {
        g.save(); g.rotate(sgn * 0.32);
        g.beginPath(); g.moveTo(-s * 0.03, -s * 0.44); g.lineTo(s * 0.04, -s * 0.44); g.lineTo(s * 0.04, s * 0.12); g.lineTo(-s * 0.03, s * 0.12); g.closePath(); g.fillStyle = 'rgb(206,210,218)'; stroke();
        g.restore();
        g.fillStyle = fill; g.beginPath(); g.ellipse(sgn * s * 0.15, s * 0.28, s * 0.1, s * 0.13, 0, 0, 7); stroke();
      }
      break;
    }
    case 'fish': {
      g.beginPath(); g.moveTo(-s * 0.4, 0); g.quadraticCurveTo(-s * 0.1, -s * 0.28, s * 0.22, 0); g.lineTo(s * 0.42, -s * 0.18); g.lineTo(s * 0.42, s * 0.18); g.lineTo(s * 0.22, 0); g.quadraticCurveTo(-s * 0.1, s * 0.28, -s * 0.4, 0); g.closePath(); stroke();
      g.fillStyle = 'rgba(20,10,4,.9)'; g.beginPath(); g.arc(-s * 0.26, -s * 0.04, s * 0.03, 0, 7); g.fill();
      break;
    }
    case 'bell': {
      g.beginPath(); g.moveTo(-s * 0.34, s * 0.26); g.quadraticCurveTo(-s * 0.3, -s * 0.04, -s * 0.12, -s * 0.28); g.lineTo(s * 0.12, -s * 0.28); g.quadraticCurveTo(s * 0.3, -s * 0.04, s * 0.34, s * 0.26); g.closePath(); stroke();
      g.beginPath(); g.arc(0, s * 0.34, s * 0.07, 0, 7); stroke();
      break;
    }
    case 'book': {
      g.beginPath(); g.moveTo(-s * 0.42, -s * 0.28); g.lineTo(0, -s * 0.2); g.lineTo(s * 0.42, -s * 0.28); g.lineTo(s * 0.42, s * 0.28); g.lineTo(0, s * 0.36); g.lineTo(-s * 0.42, s * 0.28); g.closePath(); g.fillStyle = 'rgb(236,226,196)'; stroke();
      g.beginPath(); g.moveTo(0, -s * 0.2); g.lineTo(0, s * 0.36); g.stroke();
      break;
    }
  }
  g.lineCap = 'butt';
}

/** Hængende skilt: jernarm fra væggen (øverst til venstre), to kæder og en malet tavle med et ikon. */
function sign(g: G, o: DrawInput, icon: Icon, shape: 'board' | 'shield' | 'round', iconCol: RGB): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const wood = woodOf(o, 4 - 4);
  const tone = rgb(shift(wood, -4));
  const x0 = -w / 2;
  const y0 = -h / 2;
  // jernarm med snirkel
  const armY = y0 + h * 0.08;
  tube(g, () => { g.beginPath(); g.moveTo(x0, armY); g.lineTo(x0 + w * 0.98, armY); }, 4, IRON, { outline: 1.3 });
  g.strokeStyle = OUT; g.lineWidth = 4.8; g.beginPath(); g.arc(x0 + w * 0.14, armY + 12, 10, -1.2, 1.7); g.stroke();
  g.strokeStyle = rgb(shift(IRON, 20)); g.lineWidth = 2.6; g.beginPath(); g.arc(x0 + w * 0.14, armY + 12, 10, -1.2, 1.7); g.stroke();
  rectBody(g, x0 - 2, armY - 12, 6, 26, 1.5, STONE, { lw: 1.2 });
  const bx = -w * 0.34;
  const bw = w * 0.68;
  const by = armY + h * 0.18;
  const bh = h * 0.7;
  for (const cx of [bx + bw * 0.12, bx + bw * 0.88]) {
    g.strokeStyle = OUT; g.lineWidth = 3.4; g.beginPath(); g.moveTo(cx, armY); g.lineTo(cx, by + 4); g.stroke();
    g.strokeStyle = 'rgb(130,130,140)'; g.lineWidth = 1.6; g.setLineDash([3, 2]); g.beginPath(); g.moveTo(cx, armY); g.lineTo(cx, by + 4); g.stroke(); g.setLineDash([]);
  }
  const path = shape === 'shield'
    ? () => { g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bw, by); g.lineTo(bx + bw, by + bh * 0.55); g.quadraticCurveTo(bx + bw, by + bh * 0.9, bx + bw / 2, by + bh); g.quadraticCurveTo(bx, by + bh * 0.9, bx, by + bh * 0.55); g.closePath(); }
    : shape === 'round'
      ? () => { g.beginPath(); g.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, 7); }
      : rectPath(g, bx, by, bw, bh, 6);
  // tavlens skygge og krop
  g.save();
  g.translate(2.5, 3.5);
  path();
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.fill();
  g.restore();
  path();
  g.fillStyle = lin(g, bx, by, bx + bw, by + bh, [[0, rgb(shift(wood, 18))], [1, rgb(shift(wood, -26))]]);
  g.fill();
  clipped(g, path, () => {
    for (let i = 1; i < 4; i++) { g.strokeStyle = 'rgba(20,10,4,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx, by + (i / 4) * bh); g.lineTo(bx + bw, by + (i / 4) * bh + (r() - 0.5) * 2); g.stroke(); }
    mottle(g, r, [bx, by, bx + bw, by + bh], wood, 8, 5, 14, 0.3);
    path();
    g.strokeStyle = rgb(shift(wood, -34), 0.9); g.lineWidth = 7; g.stroke();
    path();
    g.strokeStyle = rgb([210, 176, 90]); g.lineWidth = 1.6; g.translate(0, 0); g.stroke();
  });
  path();
  g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
  g.save();
  g.translate(bx + bw / 2, by + bh / 2);
  iconDraw(g, icon, Math.min(bw, bh) * 0.9, iconCol);
  g.restore();
  void tone;
}

const SIGN_ICONS: [string, string, Icon, 'board' | 'shield' | 'round', RGB, string[]][] = [
  ['facade_sign_tavern', 'Skilt, kro (krus)', 'mug', 'board', [226, 184, 64], ['tavern', 'village', 'city']],
  ['facade_sign_smith', 'Skilt, smed (hammer)', 'hammer', 'shield', [196, 198, 208], ['village', 'city', 'military']],
  ['facade_sign_inn', 'Skilt, herberg (nøgle)', 'key', 'round', [226, 184, 64], ['tavern', 'village', 'city']],
  ['facade_sign_baker', 'Skilt, bager (brød)', 'bread', 'round', [214, 160, 86], ['village', 'city']],
  ['facade_sign_alchemist', 'Skilt, alkymist (flaske)', 'potion', 'board', [170, 200, 230], ['city', 'magic', 'rich']],
  ['facade_sign_cobbler', 'Skilt, skomager (støvle)', 'boot', 'shield', [150, 100, 60], ['village', 'city', 'poor']],
  ['facade_sign_weapons', 'Skilt, våbensmed (sværd)', 'sword', 'shield', [226, 184, 64], ['city', 'military']],
  ['facade_sign_trader', 'Skilt, købmand (pose)', 'bag', 'board', [200, 170, 100], ['city', 'village', 'harbor']],
  ['facade_sign_tailor', 'Skilt, skrædder (saks)', 'scissors', 'round', [226, 184, 64], ['city', 'rich']],
  ['facade_sign_fisher', 'Skilt, fiskehandler (fisk)', 'fish', 'board', [176, 200, 214], ['harbor', 'village']],
  ['facade_sign_temple', 'Skilt, tempel (klokke)', 'bell', 'shield', [226, 190, 80], ['temple', 'city']],
  ['facade_sign_scribe', 'Skilt, skriver (bog)', 'book', 'board', [236, 226, 196], ['city', 'rich']],
];

const signKinds: ObjectKind[] = SIGN_ICONS.map(([key, name, icon, shape, col, tags]) =>
  kind({
    key, family: 'sign', name, w: 1.6, h: 1.8, shadow: 0, bleed: 0.03, tags,
    params: [{ key: 'tone', label: 'Træ', type: 'select', default: '0', options: [{ value: '0', label: 'Egetræ' }, { value: '1', label: 'Mørkt træ' }, { value: '2', label: 'Lyst fyr' }, { value: '3', label: 'Rødmalet' }, { value: '4', label: 'Grønmalet' }] }],
    draw: (g, o) => sign(g, o, icon, shape, col),
  }),
);

// ------------------------------------------------------------------ veranda, trin, altan, trapper

function railing(g: G, x0: number, y0: number, x1: number, y1: number, wood: RGB, ball: boolean): void {
  tube(g, () => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); }, 4.2, shift(wood, -6), { outline: 1.4 });
  const L = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(L / 12));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    g.fillStyle = rgb(shift(wood, -16));
    g.beginPath(); g.arc(px + 0.7, py + 0.9, ball ? 2.8 : 2, 0, 7); g.fill();
    g.fillStyle = rgb(shift(wood, 22));
    g.beginPath(); g.arc(px, py, ball ? 2.2 : 1.6, 0, 7); g.fill();
  }
}

function deck(g: G, r: Rnd, o: DrawInput, kindOf: 'veranda' | 'balcony'): void {
  const { w, h } = o;
  const wood = woodOf(o, 2);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const depth = h * (kindOf === 'veranda' ? 0.82 : 0.9);
  plankBoard(g, r, x0, y0, w, depth, wood, Math.round(depth / 9), { vertical: false, nails: true, wear: param(o, 'wear', 0.3) });
  g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(x0, y0, w, depth);
  g.fillStyle = 'rgba(8,4,0,.3)';
  g.fillRect(x0 + 1, y0 + 1, w - 2, 5);
  // rækværk langs de tre fri sider
  railing(g, x0 + 3, y0 + depth - 3, x0 + w - 3, y0 + depth - 3, wood, kindOf === 'balcony');
  railing(g, x0 + 3, y0 + 4, x0 + 3, y0 + depth - 3, wood, false);
  railing(g, x0 + w - 3, y0 + 4, x0 + w - 3, y0 + depth - 3, wood, false);
  if (kindOf === 'veranda') {
    // trin i midten forneden: åbning i rækværket
    const sw = w * 0.22;
    g.fillStyle = rgb(shift(wood, 20));
    g.fillRect(-sw / 2, y0 + depth - 6, sw, 6);
    for (let i = 0; i < 2; i++) {
      rectBody(g, -sw / 2 - i * 2, y0 + depth + i * (h - depth) / 2, sw + i * 4, (h - depth) / 2 + 0.5, 1, shift(wood, 10 - i * 8), { lw: 1.2, ao: 1 });
    }
    // stolper med hætter
    for (const px of [x0 + 3, x0 + w * 0.5 - sw / 2 - 3, x0 + w * 0.5 + sw / 2 + 3, x0 + w - 3]) {
      rectBody(g, px - 4.5, y0 + depth - 7.5, 9, 9, 1.5, shift(wood, -12), { lw: 1.4, ao: 1 });
      rectBody(g, px - 3, y0 + depth - 6, 6, 6, 1, shift(wood, 18), { lw: 1 });
    }
  } else {
    // konsoller: mørke bjælkeender under altanen i forkanten
    for (const px of [x0 + w * 0.18, x0 + w * 0.5, x0 + w * 0.82]) {
      rectBody(g, px - 4, y0 + depth - 1, 8, h - depth + 2, 1.5, shift(wood, -34), { lw: 1.3, ao: 1 });
    }
    for (const px of [x0 + 3, x0 + w - 3]) rectBody(g, px - 4.5, y0 + depth - 7, 9, 9, 1.5, shift(wood, -12), { lw: 1.4 });
  }
}

function stoop(g: G, r: Rnd, o: DrawInput): void {
  const { w, h } = o;
  const x0 = -w / 2;
  const y0 = -h / 2;
  const n = 4;
  const sh = h / n;
  const sideW = w * 0.1;
  for (let i = 0; i < n; i++) {
    const y = y0 + i * sh;
    g.fillStyle = rgb(shift(STONE, 22 - i * 7 + (r() - 0.5) * 6));
    g.fillRect(x0 + sideW, y, w - sideW * 2, sh);
    g.fillStyle = 'rgba(255,248,230,.3)'; g.fillRect(x0 + sideW, y, w - sideW * 2, 1.6);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x0 + sideW, y + sh - 3.5, w - sideW * 2, 3.5);
    g.strokeStyle = 'rgba(20,12,6,.7)'; g.lineWidth = 1; g.strokeRect(x0 + sideW, y, w - sideW * 2, sh);
  }
  for (const sx of [x0, x0 + w - sideW]) {
    rectBody(g, sx, y0, sideW, h, 2, STONE, { lw: 1.6, ao: 1.6 });
    clipped(g, rectPath(g, sx, y0, sideW, h), () => masonry(g, r, sx, y0, sideW, h, STONE, 8));
  }
}

function stairFlight(g: G, r: Rnd, o: DrawInput, wooden: boolean): void {
  const { w, h } = o;
  const wood = woodOf(o, 0);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const n = Math.max(6, Math.round(h / 14));
  const sh = h / n;
  const side = w * 0.12;
  for (let i = 0; i < n; i++) {
    const y = y0 + i * sh;
    const lit = wooden ? shift(wood, 10 - (i / n) * 8) : shift(STONE, 20 - (i / n) * 14);
    g.fillStyle = rgb(shift(lit, (r() - 0.5) * 8));
    g.fillRect(x0 + side, y, w - side * 2, sh);
    g.fillStyle = 'rgba(255,248,230,.28)'; g.fillRect(x0 + side, y, w - side * 2, 1.5);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x0 + side, y + sh - 3.2, w - side * 2, 3.2);
    g.strokeStyle = 'rgba(20,12,6,.7)'; g.lineWidth = 0.9; g.strokeRect(x0 + side, y, w - side * 2, sh);
  }
  for (const sx of [x0, x0 + w - side]) {
    rectBody(g, sx, y0, side, h, 2, wooden ? shift(wood, -18) : STONE, { lw: 1.6, ao: 1.4 });
    if (!wooden) clipped(g, rectPath(g, sx, y0, side, h), () => masonry(g, r, sx, y0, side, h, STONE, 8));
    if (wooden) railing(g, sx + side / 2, y0 + 3, sx + side / 2, y0 + h - 3, wood, false);
  }
}

const deckKinds: ObjectKind[] = [
  kind({ key: 'facade_veranda', family: 'facade', name: 'Veranda med trin', w: 4, h: 1.8, shadow: 6, bleed: 0.03, tags: ['village', 'house', 'tavern', 'outdoor'], params: [woodParam, wearParam], draw: (g, o) => deck(g, rng(o.seed), o, 'veranda') }),
  kind({ key: 'facade_balcony', family: 'facade', name: 'Altan', w: 2.6, h: 1.2, shadow: 14, bleed: 0.03, tags: ['city', 'rich', 'house', 'tavern'], params: [woodParam, wearParam], draw: (g, o) => deck(g, rng(o.seed), o, 'balcony') }),
  kind({ key: 'facade_stoop', family: 'facade', name: 'Trappesten ved dør', w: 2, h: 1.1, shadow: 4, bleed: 0.03, tags: ['city', 'house', 'village', 'rich'], draw: (g, o) => stoop(g, rng(o.seed), o) }),
  kind({ key: 'facade_stair_stone', family: 'facade', name: 'Udvendig stentrappe', w: 1.4, h: 3.2, shadow: 6, bleed: 0.03, tags: ['city', 'house', 'village', 'military'], draw: (g, o) => stairFlight(g, rng(o.seed), o, false) }),
  kind({ key: 'facade_stair_wood', family: 'facade', name: 'Udvendig trætrappe', w: 1.2, h: 3, shadow: 6, bleed: 0.03, tags: ['village', 'house', 'tavern', 'farm'], params: [woodParam], draw: (g, o) => stairFlight(g, rng(o.seed), o, true) }),
];

// ------------------------------------------------------------------ vinduer (opstalt)

function windowKind(key: string, name: string, shape: 'casement' | 'gothic' | 'round' | 'small', tags: string[]): ObjectKind {
  return kind({
    key, family: 'facade', name, w: shape === 'round' ? 1.4 : shape === 'small' ? 0.9 : 1.4, h: shape === 'round' ? 1.4 : shape === 'small' ? 1.0 : 1.9, shadow: 0, bleed: 0.03, tags,
    params: [
      woodParam,
      { key: 'shutters', label: 'Skodder', type: 'select', default: 'open', options: [{ value: 'none', label: 'Ingen' }, { value: 'open', label: 'Åbne' }, { value: 'closed', label: 'Lukkede' }] },
      { key: 'box', label: 'Blomsterkasse', type: 'toggle', default: false },
    ],
    draw: (g, o) => {
      const r = rng(o.seed);
      const { w, h } = o;
      const wood = woodOf(o, 4);
      const sh = param(o, 'shutters', 'open');
      const hasBox = param(o, 'box', false);
      const shW = sh === 'none' || shape === 'round' ? 0 : w * 0.26;
      const fx = -w / 2 + shW;
      const fw = w - shW * 2;
      const fy = -h / 2 + h * 0.04;
      const fh = h * (hasBox ? 0.76 : 0.88);
      // væg og karm
      rectBody(g, fx - 5, fy - 5, fw + 10, fh + 12, 2, STONE, { lw: 1.6, ao: 2 });
      clipped(g, rectPath(g, fx - 5, fy - 5, fw + 10, fh + 12), () => masonry(g, r, fx - 5, fy - 5, fw + 10, fh + 12, STONE, 7));
      const op = shape === 'gothic' ? openingPath(g, fx, fy, fw, fh, true) : shape === 'round' ? () => { g.beginPath(); g.arc(0, 0, Math.min(w, h) * 0.38, 0, 7); } : rectPath(g, fx, fy, fw, fh);
      op();
      g.fillStyle = 'rgb(12,10,12)';
      g.fill();
      clipped(g, op, () => {
        const bx = shape === 'round' ? -w / 2 : fx;
        const bw = shape === 'round' ? w : fw;
        const by = shape === 'round' ? -h / 2 : fy;
        const bh = shape === 'round' ? h : fh;
        glassPane(g, bx, by, bw, bh);
        if (shape === 'gothic') {
          // farvet blyindfattet glas
          const cols: RGB[] = [[190, 60, 56], [60, 100, 170], [214, 170, 60], [70, 140, 90]];
          for (let i = 0; i < 20; i++) {
            g.fillStyle = rgb(cols[(r() * 4) | 0]!, 0.45);
            g.fillRect(bx + r() * bw, by + r() * bh, bw * 0.3, bh * 0.1);
          }
        }
        g.strokeStyle = shape === 'gothic' ? 'rgba(40,40,46,.9)' : rgb(shift(wood, -30));
        g.lineWidth = shape === 'gothic' ? 1.6 : 3;
        g.beginPath();
        if (shape === 'round') {
          for (let i = 0; i < 8; i++) { g.moveTo(0, 0); g.lineTo(Math.cos((i * Math.PI) / 4) * w, Math.sin((i * Math.PI) / 4) * w); }
          g.moveTo(w * 0.2, 0); g.arc(0, 0, w * 0.2, 0, 7);
        } else if (shape === 'small') {
          g.moveTo(0, by); g.lineTo(0, by + bh);
        } else {
          g.moveTo(bx + bw / 2, by); g.lineTo(bx + bw / 2, by + bh);
          g.moveTo(bx, by + bh * 0.42); g.lineTo(bx + bw, by + bh * 0.42);
          if (shape === 'gothic') { g.moveTo(bx + bw * 0.25, by + bh * 0.1); g.lineTo(bx + bw * 0.25, by + bh * 0.42); g.moveTo(bx + bw * 0.75, by + bh * 0.1); g.lineTo(bx + bw * 0.75, by + bh * 0.42); }
        }
        g.stroke();
        g.strokeStyle = 'rgba(30,50,60,.55)';
        g.lineWidth = 0.8;
        for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(bx, by + (i / 8) * bh); g.lineTo(bx + bw, by + (i / 8) * bh); g.stroke(); }
      });
      innerShade(g, op, 4);
      // vindueskarm forneden
      rectBody(g, fx - 7, fy + fh, fw + 14, 6, 1.5, shift(STONE, 16), { lw: 1.3 });
      // skodder
      if (shW > 0) {
        for (const s of [-1, 1] as const) {
          const sx = s < 0 ? -w / 2 : fx + fw;
          if (sh === 'closed') {
            // lukkede skodder dækker glasset
            const px = s < 0 ? fx : fx + fw / 2;
            plankBoard(g, r, px, fy, fw / 2, fh, wood, 3, { vertical: true, nails: true, wear: 0.2 });
            g.strokeStyle = OUT; g.lineWidth = 1.5; g.strokeRect(px, fy, fw / 2, fh);
          } else {
            plankBoard(g, r, sx, fy - 2, shW - 3, fh + 4, wood, 3, { vertical: true, nails: true, wear: 0.2 });
            g.strokeStyle = OUT; g.lineWidth = 1.5; g.strokeRect(sx, fy - 2, shW - 3, fh + 4);
            // hjerte-udskæring
            g.fillStyle = 'rgba(10,6,4,.85)';
            g.beginPath(); g.arc(sx + (shW - 3) / 2 - 2, fy + fh * 0.2, 2.6, 0, 7); g.arc(sx + (shW - 3) / 2 + 2, fy + fh * 0.2, 2.6, 0, 7); g.moveTo(sx + (shW - 3) / 2 - 5, fy + fh * 0.2 + 1); g.lineTo(sx + (shW - 3) / 2, fy + fh * 0.2 + 6); g.lineTo(sx + (shW - 3) / 2 + 5, fy + fh * 0.2 + 1); g.fill();
          }
        }
      }
      if (hasBox) {
        const by2 = fy + fh + 4;
        rectBody(g, fx - 6, by2, fw + 12, h * 0.14, 2, shift(wood, -10), { lw: 1.4, ao: 1.4 });
        for (let i = 0; i < 18; i++) {
          const px = fx - 4 + r() * (fw + 8);
          g.fillStyle = rgb([[60, 130, 56], [84, 150, 60]][(r() * 2) | 0] as RGB);
          g.beginPath(); g.arc(px, by2 + 1 - r() * 5, 3 + r() * 3, 0, 7); g.fill();
        }
        for (let i = 0; i < 9; i++) {
          const px = fx - 4 + r() * (fw + 8);
          g.fillStyle = rgb([[220, 60, 70], [240, 200, 60], [230, 120, 170], [250, 250, 240]][(r() * 4) | 0] as RGB);
          g.beginPath(); g.arc(px, by2 - 3 - r() * 4, 2.2, 0, 7); g.fill();
        }
      }
    },
  });
}

const windowKinds: ObjectKind[] = [
  windowKind('facade_window_casement', 'Vindue med skodder', 'casement', ['house', 'village', 'city', 'tavern']),
  windowKind('facade_window_gothic', 'Spidsbuet glasmosaik-vindue', 'gothic', ['temple', 'city', 'rich']),
  windowKind('facade_window_round', 'Rundt vindue', 'round', ['house', 'temple', 'harbor']),
  windowKind('facade_window_small', 'Lille vindue', 'small', ['house', 'village', 'poor']),
];

// ------------------------------------------------------------------ tagrender, regntønde, vejrhane, flag

function gutter(g: G, o: DrawInput, corner: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const th = Math.min(h * 0.5, 14);
  const metal: RGB = [128, 132, 140];
  const run = (x0: number, y0: number, x1: number, y1: number): void => {
    tube(g, () => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); }, th, metal, { outline: 1.4, round: false });
    // renden: mørk indre
    g.strokeStyle = 'rgba(10,10,14,.45)'; g.lineWidth = th * 0.3;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const L = Math.hypot(x1 - x0, y1 - y0);
    for (let t = 20; t < L; t += 38) {
      const px = x0 + ((x1 - x0) * t) / L;
      const py = y0 + ((y1 - y0) * t) / L;
      g.fillStyle = 'rgb(70,60,52)';
      g.fillRect(px - 2, py - th * 0.7, 4, th * 1.4);
      g.strokeStyle = OUT; g.lineWidth = 0.9; g.strokeRect(px - 2, py - th * 0.7, 4, th * 1.4);
    }
  };
  if (!corner) {
    run(-w / 2 + 2, 0, w / 2 - 2, 0);
    // nedløbsrør i højre ende
    const cx = w / 2 - th;
    ellBody(g, cx, 0, th * 0.55, th * 0.55, [104, 108, 118], { lw: 1.4 });
    g.fillStyle = 'rgb(12,12,16)'; g.beginPath(); g.arc(cx, 0, th * 0.3, 0, 7); g.fill();
  } else {
    run(-w / 2 + 2, -h / 2 + th / 2 + 2, w / 2 - 2, -h / 2 + th / 2 + 2);
    run(w / 2 - th / 2 - 2, -h / 2 + 2, w / 2 - th / 2 - 2, h / 2 - 2);
    ellBody(g, w / 2 - th / 2 - 2, -h / 2 + th / 2 + 2, th * 0.6, th * 0.6, shift(metal, -10), { lw: 1.4 });
    void r;
  }
}

function barrelRain(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) * 0.42;
  const wood = woodOf(o, 1);
  const cx = -o.w * 0.06;
  const cy = o.h * 0.06;
  ellBody(g, cx, cy, R, R, wood, { lw: 2, ao: R * 0.1 });
  clipped(g, () => { g.beginPath(); g.arc(cx, cy, R, 0, 7); }, () => {
    for (let i = -6; i <= 6; i++) { g.strokeStyle = 'rgba(20,10,4,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + i * R * 0.17, cy - R); g.lineTo(cx + i * R * 0.17, cy + R); g.stroke(); }
  });
  ellBody(g, cx, cy, R * 0.82, R * 0.82, shift(wood, -30), { lw: 1.4, ao: 2 });
  g.fillStyle = radial(g, cx - R * 0.2, cy - R * 0.2, R * 0.78, [[0, 'rgb(130,180,206)'], [0.7, 'rgb(48,92,124)'], [1, 'rgb(24,52,76)']]);
  g.beginPath(); g.arc(cx, cy, R * 0.74, 0, 7); g.fill();
  g.strokeStyle = 'rgba(220,240,250,.55)'; g.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx + (r() - 0.5) * R * 0.3, cy + (r() - 0.5) * R * 0.3, R * (0.12 + i * 0.12), 0.4, 2.4); g.stroke(); }
  // reb-bånd
  g.strokeStyle = 'rgb(76,78,86)'; g.lineWidth = 3;
  g.beginPath(); g.arc(cx, cy, R * 0.93, 0, 7); g.stroke();
  // nedløbsrør ind fra hjørnet
  tube(g, () => { g.beginPath(); g.moveTo(o.w / 2 - 2, -o.h / 2 + 2); g.lineTo(cx + R * 0.55, cy - R * 0.55); }, 8, [112, 116, 126], { outline: 1.4 });
}

function weathervane(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 - 2;
  const col: RGB = [150, 120, 60];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    tube(g, () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78); }, 3, col, { outline: 1.2 });
    g.save();
    g.translate(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
    g.rotate(a);
    g.fillStyle = rgb(shift(col, 20));
    g.beginPath(); g.moveTo(-3, 0); g.lineTo(0, -5); g.lineTo(5, 0); g.lineTo(0, 5); g.closePath(); g.fill();
    g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
    g.restore();
  }
  // pilen med hane
  g.save();
  g.rotate(r() * 6.28);
  tube(g, () => { g.beginPath(); g.moveTo(-R * 0.95, 0); g.lineTo(R * 0.6, 0); }, 2.6, [60, 52, 48], { outline: 1.2 });
  g.fillStyle = 'rgb(60,52,48)';
  g.beginPath(); g.moveTo(R * 0.6, -6); g.lineTo(R * 0.95, 0); g.lineTo(R * 0.6, 6); g.closePath(); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
  g.beginPath(); g.moveTo(-R * 0.95, 0); g.lineTo(-R * 0.75, -9); g.lineTo(-R * 0.58, -5); g.lineTo(-R * 0.62, 0); g.lineTo(-R * 0.58, 5); g.lineTo(-R * 0.75, 9); g.closePath();
  g.fillStyle = 'rgb(58,50,46)'; g.fill(); g.stroke();
  ellBody(g, -R * 0.15, 0, R * 0.34, R * 0.17, [168, 132, 68], { lw: 1.2 });
  ellBody(g, R * 0.12, -1, R * 0.12, R * 0.12, [190, 62, 40], { lw: 1 });
  g.restore();
  ellBody(g, 0, 0, 5, 5, [190, 160, 80], { lw: 1.3 });
}

function flag(g: G, o: DrawInput, shape: 'banner' | 'pennant' | 'swallow'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const { a, b } = clothOf(o);
  const px = -w / 2 + 8;
  const py = -h * 0.28;
  // flagstangen set oppefra: base og tværsnit, flaget vajer ud mod højre
  const fl = w * 0.84;
  const fh = h * (shape === 'pennant' ? 0.5 : 0.62);
  const pts = (side: 1 | -1): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = px + 4 + t * fl;
      const wave = Math.sin(t * 6 + r() * 0.0) * (3 + t * 5);
      const hh = shape === 'pennant' ? fh * (1 - t) : fh;
      out.push([x, py + wave + (side === 1 ? hh / 2 : -hh / 2) * 1]);
    }
    return out;
  };
  const top = pts(-1);
  const bot = pts(1);
  const poly: [number, number][] = [...top, ...bot.reverse()];
  if (shape === 'swallow') {
    const last = poly.length / 2;
    void last;
    poly.splice(13, 0, [px + 4 + fl - fl * 0.18, py]);
  }
  g.save();
  polyPath(g, poly)();
  g.clip();
  g.fillStyle = rgb(a);
  g.fillRect(px, py - fh - 10, w, fh * 2 + 20);
  g.fillStyle = rgb(b);
  g.fillRect(px, py - fh * 0.16, w, fh * 0.32);
  // folder
  for (let i = 0; i < 7; i++) {
    const x = px + 6 + i * fl / 7;
    g.fillStyle = i % 2 ? 'rgba(255,250,235,.16)' : 'rgba(10,6,20,.2)';
    g.beginPath(); g.moveTo(x, py - fh); g.lineTo(x + fl / 16, py - fh); g.lineTo(x + fl / 16 + 3, py + fh); g.lineTo(x + 3, py + fh); g.fill();
  }
  g.restore();
  polyPath(g, poly)();
  g.strokeStyle = OUT; g.lineWidth = 1.8; g.lineJoin = 'round'; g.stroke();
  // stang
  ellBody(g, px, py, 5, 5, [92, 66, 44], { lw: 1.6, ao: 1.4 });
  ellBody(g, px - 1, py - 1, 2.4, 2.4, [190, 160, 80], { lw: 1 });
  // barduner
  g.strokeStyle = 'rgba(60,50,40,.7)'; g.lineWidth = 1;
  for (const [ex, ey] of [[-w / 2 + 1, h / 2 - 2], [-w / 2 + 14, h / 2 - 4], [-w / 2 + 2, py + h * 0.28]] as const) { g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ey); g.stroke(); }
}

const smallKinds: ObjectKind[] = [
  kind({ key: 'facade_gutter', family: 'facade', name: 'Tagrende', w: 3, h: 0.4, shadow: 3, bleed: 0.03, tags: ['house', 'city', 'village'], draw: (g, o) => gutter(g, o, false) }),
  kind({ key: 'facade_gutter_corner', family: 'facade', name: 'Tagrende, hjørne', w: 2, h: 2, shadow: 3, bleed: 0.03, tags: ['house', 'city', 'village'], draw: (g, o) => gutter(g, o, true) }),
  kind({ key: 'facade_rain_barrel', family: 'facade', name: 'Regntønde med nedløb', w: 1, h: 1, shadow: 8, bleed: 0.03, randomRotation: true, tags: ['house', 'village', 'farm', 'city'], params: [woodParam], draw: (g, o) => barrelRain(g, o) }),
  kind({ key: 'facade_weathervane', family: 'facade', name: 'Vejrhane', w: 1.2, h: 1.2, shadow: 12, bleed: 0.03, randomRotation: true, tags: ['village', 'farm', 'city', 'house'], draw: (g, o) => weathervane(g, o) }),
  kind({ key: 'facade_flag', family: 'facade', name: 'Flagstang med flag', w: 2.4, h: 1.2, shadow: 10, bleed: 0.03, tags: ['city', 'military', 'village', 'rich'], params: [clothParam], draw: (g, o) => flag(g, o, 'banner') }),
  kind({ key: 'facade_pennant', family: 'facade', name: 'Vimpel', w: 2.4, h: 1, shadow: 10, bleed: 0.03, tags: ['military', 'city', 'camp', 'harbor'], params: [clothParam], draw: (g, o) => flag(g, o, 'pennant') }),
  kind({ key: 'facade_flag_swallow', family: 'facade', name: 'Svalehalet flag', w: 2.4, h: 1.2, shadow: 10, bleed: 0.03, tags: ['military', 'city', 'camp', 'harbor'], params: [clothParam], draw: (g, o) => flag(g, o, 'swallow') }),
];

export const facadeKinds: ObjectKind[] = [...chimneyKinds, ...awningKinds, ...deckKinds, ...windowKinds, ...smallKinds];
export const signKindsList: ObjectKind[] = signKinds;
void polyBody; void rivet;
