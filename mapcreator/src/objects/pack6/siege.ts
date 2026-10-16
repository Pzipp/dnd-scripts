import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { plankBoard, rope, tube, woodGrain, ellBody, rectBody } from '../pack2/helpers';
import { base, contact, crack, lerp, mixc, mottle, OUT, polyBody, polyPath, radial, lin, rf, rgb, shift, type G, type P, type RGB, type Rnd } from './common';

/** Belejringsmaskiner og både set oppefra: katapult, ballista, rambuk, trebuchet, belejringstårn, robåde, skibe og kaj-ting. */

const WOOD: RGB = [140, 100, 60];
const DARK: RGB = [96, 66, 40];
const IRON: RGB = [120, 122, 130];
const armedP: ParamDef = { key: 'armed', label: 'Ladet', type: 'toggle', default: true };

const beam = (g: G, x: number, y: number, w: number, h: number, col: RGB = WOOD, r?: Rnd): void => {
  rectBody(g, x, y, w, h, 1.5, col, { lw: 1.3, light: 20, dark: 26 });
  if (r) {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    woodGrain(g, r, [x, y, x + w, y + h], col, { rot: w > h ? 0 : Math.PI / 2, lines: 4 });
    g.restore();
  }
};

const wheel = (g: G, x: number, y: number, rw: number, rh: number): void => {
  // hjul set fra oven: smal mørk skive med ribber
  rectBody(g, x - rw / 2, y - rh / 2, rw, rh, 2, [86, 60, 36], { lw: 1.3, light: 12, dark: 20 });
  g.fillStyle = 'rgba(0,0,0,.25)';
  for (let i = 1; i < 5; i++) g.fillRect(x - rw / 2, y - rh / 2 + (i / 5) * rh, rw, 1);
};

function catapult(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const armed = param(o, 'armed', true);
  const { w, h } = o;
  const fx = w * 0.3;
  // hjul
  for (const sx of [-1, 1]) for (const y of [-h * 0.24, h * 0.3]) wheel(g, sx * (fx + w * 0.1), y, w * 0.12, h * 0.16);
  // sidebjælker og tværbjælker
  for (const sx of [-1, 1]) beam(g, sx * fx - w * 0.04, -h * 0.4, w * 0.08, h * 0.84, WOOD, r);
  for (const y of [-h * 0.34, h * 0.0, h * 0.38]) beam(g, -fx, y - h * 0.025, fx * 2, h * 0.05, DARK, r);
  // sidestøtter (skrå)
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.moveTo(sx * fx, -h * 0.06);
    g.lineTo(sx * fx * 0.5, h * 0.18);
    g.strokeStyle = OUT;
    g.lineWidth = 6;
    g.stroke();
    g.strokeStyle = rgb(shift(WOOD, 4));
    g.lineWidth = 4;
    g.stroke();
  }
  // vrid: to rebspoler
  for (const sx of [-1, 1]) {
    const cx = sx * fx * 0.6;
    ellBody(g, cx, -h * 0.02, w * 0.1, h * 0.07, [186, 158, 100], { lw: 1.4 });
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.ellipse(cx, -h * 0.02, w * 0.1 * (1 - i * 0.18), h * 0.07 * (1 - i * 0.18), 0, 0, 7);
      g.strokeStyle = 'rgba(60,40,18,.5)';
      g.lineWidth = 1;
      g.stroke();
    }
  }
  // armen (langs y): lang del op mod toppen, kort bagved med modvægt
  tube(g, () => { g.beginPath(); g.moveTo(0, h * 0.26); g.lineTo(rf(r, -1, 1), -h * 0.38); }, w * 0.09, [152, 112, 68]);
  rectBody(g, -w * 0.1, h * 0.2, w * 0.2, h * 0.1, 2, [110, 112, 120], { lw: 1.3 });
  // skeen
  ellBody(g, 0, -h * 0.42, w * 0.13, h * 0.07, DARK, { lw: 1.4 });
  g.beginPath();
  g.ellipse(0, -h * 0.42, w * 0.08, h * 0.04, 0, 0, 7);
  g.fillStyle = 'rgba(20,10,4,.55)';
  g.fill();
  if (armed) {
    ellBody(g, 0, -h * 0.425, w * 0.07, w * 0.07, [130, 126, 120], { lw: 1.3 });
  }
  // akselstift og reb
  g.beginPath();
  g.arc(0, -h * 0.02, 3.4, 0, 7);
  g.fillStyle = rgb(IRON);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.2;
  g.stroke();
  rope(g, [[-fx * 0.4, h * 0.38], [0, h * 0.28], [fx * 0.4, h * 0.38]], 2, [176, 144, 88]);
}

function ballista(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const armed = param(o, 'armed', true);
  const { w, h } = o;
  // fødder (kryds)
  for (const [a, b] of [[[-w * 0.4, h * 0.38], [w * 0.4, h * 0.0]], [[w * 0.4, h * 0.38], [-w * 0.4, h * 0.0]]] as const) {
    tube(g, () => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }, 6, DARK);
  }
  // stok (langs y) og skinne
  beam(g, -w * 0.08, -h * 0.44, w * 0.16, h * 0.88, WOOD, r);
  g.fillStyle = 'rgba(14,8,4,.5)';
  g.fillRect(-w * 0.015, -h * 0.4, w * 0.03, h * 0.7);
  // buen: to tykke arme på tværs forrest
  const by = -h * 0.26;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.moveTo(sx * w * 0.06, by);
    g.quadraticCurveTo(sx * w * 0.3, by - h * 0.0, sx * w * 0.46, by + h * 0.1);
    g.strokeStyle = OUT;
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.stroke();
    g.strokeStyle = rgb(shift(WOOD, 6));
    g.lineWidth = 6.4;
    g.stroke();
    g.strokeStyle = 'rgba(255,230,180,.3)';
    g.lineWidth = 2;
    g.translate(-0.8, -1);
    g.stroke();
    g.translate(0.8, 1);
  }
  // snor
  g.beginPath();
  g.moveTo(-w * 0.46, by + h * 0.1);
  g.lineTo(0, by + (armed ? h * 0.2 : h * 0.1));
  g.lineTo(w * 0.46, by + h * 0.1);
  g.strokeStyle = 'rgb(214,196,150)';
  g.lineWidth = 1.6;
  g.stroke();
  g.lineCap = 'butt';
  // vindelaksel bagved
  ellBody(g, 0, h * 0.34, w * 0.14, h * 0.05, DARK, { lw: 1.3 });
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.moveTo(sx * w * 0.14, h * 0.34);
    g.lineTo(sx * w * 0.3, h * 0.34 + rf(r, -3, 3));
    g.strokeStyle = rgb(IRON);
    g.lineWidth = 2.6;
    g.stroke();
  }
  if (armed) {
    // bolt
    g.beginPath();
    g.moveTo(0, by + h * 0.2);
    g.lineTo(0, -h * 0.5);
    g.strokeStyle = 'rgba(14,8,4,.6)';
    g.lineWidth = 4.4;
    g.stroke();
    g.strokeStyle = 'rgb(170,130,84)';
    g.lineWidth = 2.6;
    g.stroke();
    polyBody(g, [[-3.6, -h * 0.5], [0, -h * 0.57], [3.6, -h * 0.5]], IRON, { lw: 1, light: 20, dark: 20, ao: 0.5 });
  }
  contact(g, 0, 0, 0, 0, 0);
}

function ram(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const rw = w * 0.74;
  // hjul
  for (const sx of [-1, 1]) for (const y of [-h * 0.22, h * 0.14]) wheel(g, sx * (rw / 2 + w * 0.05), y, w * 0.12, h * 0.15);
  // rambuk-stammen stikker frem
  tube(g, () => { g.beginPath(); g.moveTo(0, h * 0.2); g.lineTo(0, -h * 0.44); }, w * 0.2, [128, 92, 56]);
  polyBody(g, [[-w * 0.13, -h * 0.4], [0, -h * 0.5], [w * 0.13, -h * 0.4], [w * 0.1, -h * 0.34], [-w * 0.1, -h * 0.34]], IRON, { lw: 1.5, light: 28, dark: 30 });
  // taget: to halvdele
  const y0 = -h * 0.3;
  const y1 = h * 0.38;
  const left = (): void => polyPath(g, [[0, y0], [-rw / 2, y0 + 6], [-rw / 2, y1], [0, y1]])();
  const right = (): void => polyPath(g, [[0, y0], [rw / 2, y0 + 6], [rw / 2, y1], [0, y1]])();
  for (const [side, tone] of [[left, 14], [right, -34]] as const) {
    side();
    g.fillStyle = lin(g, 0, y0, 0, y1, [[0, rgb(shift([150, 108, 70], tone))], [1, rgb(shift([112, 80, 50], tone))]]);
    g.fill();
    g.save();
    side();
    g.clip();
    const sgn = side === left ? -1 : 1;
    for (let i = 1; i < 9; i++) {
      const yy = lerp(y0, y1, i / 9);
      g.fillStyle = 'rgba(20,10,4,.4)';
      g.fillRect(Math.min(0, sgn * rw / 2), yy, rw / 2, 1.4);
      for (let k = 0; k < 4; k++) g.fillRect((sgn > 0 ? 0 : -rw / 2) + ((k + (i % 2) * 0.5) / 4) * rw / 2, yy, 1, (y1 - y0) / 9);
    }
    mottle(g, r, [-rw / 2, y0, rw / 2, y1], DARK, 14, 6, 20, 0.22);
    g.restore();
    side();
    g.strokeStyle = OUT;
    g.lineWidth = 1.6;
    g.stroke();
  }
  g.beginPath();
  g.moveTo(0, y0);
  g.lineTo(0, y1);
  g.strokeStyle = 'rgba(255,230,180,.4)';
  g.lineWidth = 1.6;
  g.stroke();
  // brændskjold: hudbetræk rødlig-grå pletter i taget
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(rf(r, -rw * 0.4, rw * 0.4), rf(r, y0 + 10, y1 - 10), rf(r, 5, 9), rf(r, 3, 6), r() * 3, 0, 7);
    g.fillStyle = 'rgba(150,110,90,.4)';
    g.fill();
  }
}

function trebuchet(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const armed = param(o, 'armed', true);
  const { w, h } = o;
  const fx = w * 0.3;
  for (const sx of [-1, 1]) for (const y of [-h * 0.3, h * 0.0, h * 0.3]) wheel(g, sx * (fx + w * 0.08), y, w * 0.08, h * 0.1);
  // bundramme
  for (const sx of [-1, 1]) beam(g, sx * fx - w * 0.035, -h * 0.4, w * 0.07, h * 0.8, WOOD, r);
  for (const y of [-h * 0.36, -h * 0.12, h * 0.12, h * 0.36]) beam(g, -fx, y - h * 0.018, fx * 2, h * 0.036, DARK, r);
  // A-stativer (set oppefra som tykke bjælker mod midten)
  for (const sx of [-1, 1]) {
    tube(g, () => { g.beginPath(); g.moveTo(sx * fx, -h * 0.16); g.lineTo(sx * w * 0.06, -h * 0.04); }, 7, WOOD);
    tube(g, () => { g.beginPath(); g.moveTo(sx * fx, h * 0.08); g.lineTo(sx * w * 0.06, -h * 0.04); }, 7, WOOD);
  }
  // aksel og arm
  tube(g, () => { g.beginPath(); g.moveTo(-fx * 1.1, -h * 0.04); g.lineTo(fx * 1.1, -h * 0.04); }, 5, IRON);
  tube(g, () => { g.beginPath(); g.moveTo(0, h * 0.22); g.lineTo(0, -h * 0.46); }, w * 0.07, [158, 116, 72]);
  // modvægt (kasse) i den korte ende
  rectBody(g, -w * 0.2, h * 0.16, w * 0.4, h * 0.13, 2, [100, 80, 60], { lw: 1.5, light: 18, dark: 28 });
  g.save();
  g.beginPath();
  g.rect(-w * 0.2, h * 0.16, w * 0.4, h * 0.13);
  g.clip();
  for (let i = 0; i < 24; i++) {
    g.beginPath();
    g.ellipse(-w * 0.2 + r() * w * 0.4, h * 0.16 + r() * h * 0.13, rf(r, 3, 6), rf(r, 2, 4), r() * 3, 0, 7);
    g.fillStyle = rgb(shift([130, 126, 120], (r() - 0.5) * 40));
    g.fill();
  }
  g.restore();
  // slynge
  rope(g, [[0, -h * 0.46], [-w * 0.1, -h * 0.5], [w * 0.1, -h * 0.5], [0, -h * 0.46]], 1.6);
  if (armed) ellBody(g, 0, -h * 0.5, w * 0.06, w * 0.06, [130, 126, 120], { lw: 1.2 });
}

function siegeTower(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  // hjul ved siderne (set ovenfra som smalle skiver)
  for (const sx of [-1, 1]) for (const y of [-h * 0.34, -h * 0.05, h * 0.26]) wheel(g, sx * (w * 0.43), y, w * 0.1, h * 0.14);
  const x = -w * 0.4;
  const tw = w * 0.8;
  const y0 = -h * 0.46;
  const th = h * 0.92;
  // taget: hudbeklædt, to halvdele med rygning og planker langs kanten
  g.fillStyle = 'rgba(10,5,2,.4)';
  g.fillRect(x + 3, y0 + 4, tw, th);
  rectBody(g, x, y0, tw, th, 4, [112, 80, 48], { lw: 1.7 });
  const half = (sx: number, tone: number): void => {
    const x0 = sx < 0 ? x + 5 : 0;
    const x1 = sx < 0 ? 0 : x + tw - 5;
    g.fillStyle = lin(g, x0, 0, x1, 0, [[0, rgb(shift([160, 122, 84], tone))], [1, rgb(shift([120, 86, 56], tone))]]);
    g.fillRect(x0, y0 + 5, x1 - x0, th - 10);
    g.save();
    g.beginPath();
    g.rect(x0, y0 + 5, x1 - x0, th - 10);
    g.clip();
    for (let i = 1; i < 12; i++) {
      g.fillStyle = 'rgba(30,16,8,.35)';
      g.fillRect(x0, y0 + 5 + (i / 12) * (th - 10), x1 - x0, 1.2);
    }
    mottle(g, r, [x0, y0, x1, y0 + th], [150, 110, 76], 16, 9, 22, 0.28);
    g.restore();
  };
  half(-1, 16);
  half(1, -30);
  g.beginPath();
  g.moveTo(0, y0 + 5);
  g.lineTo(0, y0 + th - 5);
  g.strokeStyle = 'rgba(255,230,180,.5)';
  g.lineWidth = 2;
  g.stroke();
  // brandhæmmende hudstykker og rebsurring
  for (let i = 0; i < 4; i++) rope(g, [[x + 4, y0 + th * (0.2 + i * 0.2)], [x + tw - 4, y0 + th * (0.2 + i * 0.2)]], 2, [176, 144, 88]);
  // fronten (øverst): skydeskår set ovenfra som mørke udsnit i kanten og klapbro
  for (let i = 0; i < 3; i++) rectBody(g, x + tw * (0.14 + i * 0.3), y0 - 1, tw * 0.18, 6, 1, [36, 26, 20], { lw: 1.1 });
  polyBody(g, [[-tw * 0.2, y0 - 2], [tw * 0.2, y0 - 2], [tw * 0.2, y0 - h * 0.1], [-tw * 0.2, y0 - h * 0.1]], [126, 90, 54], { lw: 1.4, light: 18, dark: 22 });
  // flag
  polyBody(g, [[0, y0 + th * 0.5], [w * 0.2, y0 + th * 0.5 - 4], [w * 0.2, y0 + th * 0.5 + 10], [0, y0 + th * 0.5 + 6]], [170, 62, 52], { lw: 1, light: 20, dark: 20, ao: 0.5 });
}

function hullPath(g: G, L: number, W: number, bow: number, stern: number): void {
  // omrids: spids bue (top), afrundet hæk (bund); L langs y, W bredde
  const hw = W / 2;
  g.beginPath();
  g.moveTo(0, -L / 2);
  g.bezierCurveTo(hw * (1.05 - bow), -L / 2 + L * (0.02 + (1 - bow) * 0.3), hw, -L * 0.3, hw, L * 0.05);
  g.bezierCurveTo(hw, L * 0.3, hw * stern, L / 2 - 1, hw * stern * 0.7, L / 2);
  g.lineTo(-hw * stern * 0.7, L / 2);
  g.bezierCurveTo(-hw * stern, L / 2 - 1, -hw, L * 0.3, -hw, L * 0.05);
  g.bezierCurveTo(-hw, -L * 0.3, -hw * (1.05 - bow), -L / 2 + L * (0.02 + (1 - bow) * 0.3), 0, -L / 2);
  g.closePath();
}

/** Bådskrog: bordgange (planker i længderetning), ribber, tofter og list. */
function drawBoat(g: G, o: DrawInput, opts: { L: number; W: number; bow: number; stern: number; col: RGB; thwarts: number; oars?: boolean; sail?: boolean; mast?: boolean; shields?: boolean; flip?: boolean; dragon?: boolean }): void {
  const r = rng(o.seed);
  const { L, W, col } = opts;
  const hw = W / 2;
  const hull = (): void => hullPath(g, L, W, opts.bow, opts.stern);
  // årer ligger bag skroget (ud til siderne)
  if (opts.oars) {
    for (const sx of [-1, 1]) {
      g.save();
      g.translate(sx * hw * 0.8, L * 0.05);
      g.rotate(sx * 0.35);
      tube(g, () => { g.beginPath(); g.moveTo(0, -L * 0.12); g.lineTo(sx * W * 0.8, L * 0.1); }, 3, [170, 130, 84]);
      polyBody(g, [[sx * W * 0.7, L * 0.08], [sx * W * 0.92, L * 0.06], [sx * W * 0.95, L * 0.16], [sx * W * 0.72, L * 0.17]], [170, 130, 84], { lw: 1.2, light: 20, dark: 20, ao: 0.6 });
      g.restore();
    }
  }
  hull();
  g.fillStyle = lin(g, -hw, 0, hw, 0, [[0, rgb(shift(col, 28))], [0.5, rgb(col)], [1, rgb(shift(col, -44))]]);
  g.fill();
  g.save();
  hull();
  g.clip();
  if (opts.flip) {
    // omvendt båd: kølen og krumme planker
    g.beginPath();
    g.moveTo(0, -L / 2);
    g.lineTo(0, L / 2);
    g.strokeStyle = 'rgba(20,10,4,.6)';
    g.lineWidth = 4;
    g.stroke();
    for (let i = 1; i < 10; i++) {
      const y = lerp(-L / 2, L / 2, i / 10);
      g.beginPath();
      g.moveTo(-hw, y + 3);
      g.quadraticCurveTo(0, y - 3, hw, y + 3);
      g.strokeStyle = 'rgba(20,10,4,.35)';
      g.lineWidth = 1.2;
      g.stroke();
    }
  } else {
    // bordgange
    for (let k = 1; k < 6; k++) {
      const s = k / 6;
      g.save();
      g.scale(1 - s * 0.8, 1 - s * 0.05);
      hull();
      g.restore();
      g.strokeStyle = 'rgba(20,10,4,.4)';
      g.lineWidth = 1.2;
      g.stroke();
    }
    // indre bund (mørkere)
    g.save();
    g.scale(0.62, 0.86);
    hull();
    g.fillStyle = rgb(shift(col, -52));
    g.fill();
    g.restore();
    // planker i bunden
    for (let k = 1; k < 5; k++) {
      g.beginPath();
      g.moveTo(-hw * 0.6, lerp(-L * 0.4, L * 0.4, k / 5));
      g.lineTo(hw * 0.6, lerp(-L * 0.4, L * 0.4, k / 5));
      g.strokeStyle = 'rgba(0,0,0,.28)';
      g.lineWidth = 1;
      g.stroke();
    }
    for (let i = 0; i < opts.thwarts; i++) {
      const y = lerp(-L * 0.28, L * 0.34, opts.thwarts === 1 ? 0.5 : i / (opts.thwarts - 1));
      const tw = Math.sqrt(Math.max(0.2, 1 - Math.pow((y - L * 0.05) / (L * 0.5), 2))) * hw * 0.88;
      rectBody(g, -tw, y - 3, tw * 2, 6, 1.5, shift(col, 18), { lw: 1.2, light: 18, dark: 18 });
    }
  }
  g.restore();
  hull();
  g.strokeStyle = OUT;
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.stroke();
  // list (højlys øverst til venstre)
  g.save();
  g.translate(-1, -1);
  hull();
  g.strokeStyle = 'rgba(255,238,200,.3)';
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();
  if (opts.shields) {
    const cols: RGB[] = [[170, 62, 52], [222, 190, 90], [64, 94, 160], [226, 222, 208]];
    for (let i = 0; i < 9; i++) {
      const y = lerp(-L * 0.3, L * 0.38, i / 8);
      for (const sx of [-1, 1]) {
        const half = Math.sqrt(Math.max(0.2, 1 - Math.pow((y - L * 0.05) / (L * 0.5), 2))) * hw;
        ellBody(g, sx * (half - 3), y, 5, 6.4, cols[(i + (sx > 0 ? 1 : 0)) % 4]!, { lw: 1.1 });
      }
    }
  }
  if (opts.mast) {
    const my = -L * 0.1;
    if (opts.sail) {
      // sejl: rekt som skrå trapez hen over skroget
      const sp = (): void => polyPath(g, [[-hw * 1.15, my - 4], [hw * 1.15, my + 6], [hw * 1.1, my + L * 0.26], [-hw * 1.1, my + L * 0.2]])();
      sp();
      g.fillStyle = lin(g, -hw, my, hw, my + L * 0.2, [[0, 'rgb(246,240,222)'], [1, 'rgb(190,182,160)']]);
      g.fill();
      g.save();
      sp();
      g.clip();
      for (let i = 1; i < 6; i++) {
        g.beginPath();
        g.moveTo(-hw * 1.2, my + i * L * 0.04);
        g.lineTo(hw * 1.2, my + 6 + i * L * 0.04);
        g.strokeStyle = 'rgba(70,50,30,.3)';
        g.lineWidth = 1;
        g.stroke();
      }
      if (opts.dragon) {
        for (let i = 0; i < 6; i++) {
          g.fillStyle = i % 2 ? 'rgba(170,62,52,.85)' : 'rgba(0,0,0,0)';
          g.fillRect(-hw * 1.2 + i * hw * 0.4, my - 4, hw * 0.4, L * 0.32);
        }
      }
      g.restore();
      sp();
      g.strokeStyle = OUT;
      g.lineWidth = 1.5;
      g.stroke();
    }
    tube(g, () => { g.beginPath(); g.moveTo(-hw * 1.15, my - 4); g.lineTo(hw * 1.15, my + 6); }, 3, [160, 120, 76]);
    g.beginPath();
    g.arc(0, my, 4.6, 0, 7);
    g.fillStyle = rgb([170, 130, 84]);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.stroke();
  }
  if (opts.dragon) {
    // drageforstavn
    tube(g, () => { g.beginPath(); g.moveTo(0, -L / 2 + 4); g.quadraticCurveTo(hw * 0.3, -L / 2 - 6, 0, -L / 2 - 14); }, 4, [150, 110, 66]);
    g.beginPath();
    g.arc(0, -L / 2 - 14, 4.2, 0, 7);
    g.fillStyle = rgb([186, 70, 56]);
    g.fill();
    g.stroke();
  }
  void r;
}

function dockPost(g: G, o: DrawInput): void {
  const { w, h } = o;
  const R = Math.min(w, h) * 0.34;
  ellBody(g, 0, 0, R, R, [100, 74, 46], { lw: 1.5 });
  g.beginPath();
  g.arc(-R * 0.15, -R * 0.15, R * 0.6, 0, 7);
  g.fillStyle = 'rgba(255,230,180,.14)';
  g.fill();
  rope(g, Array.from({ length: 14 }, (_, i) => [Math.cos(i * 0.7) * R * (0.4 + i * 0.03), Math.sin(i * 0.7) * R * (0.4 + i * 0.03)] as P), 3.4, [176, 144, 88]);
  rope(g, [[R * 0.7, R * 0.4], [R * 1.3, R * 0.9]], 3.4, [176, 144, 88]);
}

function barrelPile(g: G, o: DrawInput, n: number): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const R = Math.min(w, h) * (n > 3 ? 0.2 : 0.27);
  const pos: P[] = n === 3 ? [[-R, -R * 0.5], [R, -R * 0.5], [0, R * 0.9]] : [[-R * 1.6, -R], [0, -R], [R * 1.6, -R], [-R * 0.8, R * 0.9], [R * 0.8, R * 0.9]];
  for (const [x, y] of pos) {
    ellBody(g, x, y, R, R, [124, 88, 52], { lw: 1.5 });
    g.save();
    g.beginPath();
    g.arc(x, y, R, 0, 7);
    g.clip();
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(x, y, R * (0.9 - i * 0.14), 0, 7);
      g.strokeStyle = i % 2 ? 'rgba(30,16,6,.4)' : 'rgba(255,230,180,.12)';
      g.lineWidth = 1.1;
      g.stroke();
    }
    g.restore();
    g.beginPath();
    g.arc(x, y, R * 0.88, 0, 7);
    g.strokeStyle = rgb(IRON);
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,.3)';
    g.beginPath();
    g.arc(x + R * 0.2, y + R * 0.2, 2.2, 0, 7);
    g.fill();
    void r;
  }
}

function crateStack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const s = Math.min(w, h) * 0.36;
  const crates: [number, number, number, number][] = [[-s * 0.6, s * 0.3, s, 0.04], [s * 0.5, s * 0.36, s * 0.9, -0.05], [-s * 0.05, -s * 0.5, s * 0.92, 0.1]];
  for (const [x, y, ss, a] of crates) {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    rectBody(g, -ss / 2, -ss / 2, ss, ss, 2, [150, 110, 66], { lw: 1.5 });
    g.save();
    g.beginPath();
    g.rect(-ss / 2, -ss / 2, ss, ss);
    g.clip();
    for (let i = 1; i < 4; i++) {
      g.fillStyle = 'rgba(30,16,6,.45)';
      g.fillRect(-ss / 2, -ss / 2 + (i / 4) * ss, ss, 1.3);
    }
    woodGrain(g, r, [-ss / 2, -ss / 2, ss / 2, ss / 2], [150, 110, 66], { lines: 8 });
    g.restore();
    g.strokeStyle = 'rgba(30,16,6,.6)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-ss / 2, -ss / 2);
    g.lineTo(ss / 2, ss / 2);
    g.moveTo(ss / 2, -ss / 2);
    g.lineTo(-ss / 2, ss / 2);
    g.stroke();
    g.restore();
  }
  rope(g, [[-s * 0.9, s * 0.8], [s * 0.1, s * 0.9], [s * 1.0, s * 0.7]], 2.2, [176, 144, 88]);
}

function fishNet(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const path = (): void => {
    g.beginPath();
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283;
      const k = 0.82 + r() * 0.18;
      const x = Math.cos(a) * w * 0.47 * k;
      const y = Math.sin(a) * h * 0.46 * k;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
  };
  g.save();
  path();
  g.clip();
  g.strokeStyle = 'rgba(40,30,18,.85)';
  g.lineWidth = 1;
  const step = Math.min(w, h) / 12;
  for (let x = -w / 2; x < w / 2; x += step) for (let y = -h / 2; y < h / 2; y += step) {
    g.beginPath();
    g.moveTo(x, y + step / 2);
    g.lineTo(x + step / 2, y);
    g.lineTo(x + step, y + step / 2);
    g.lineTo(x + step / 2, y + step);
    g.closePath();
    g.stroke();
  }
  g.fillStyle = 'rgba(190,170,120,.18)';
  g.fillRect(-w / 2, -h / 2, w, h);
  g.restore();
  path();
  g.strokeStyle = 'rgba(40,30,18,.8)';
  g.lineWidth = 2;
  g.stroke();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.283;
    ellBody(g, Math.cos(a) * w * 0.4, Math.sin(a) * h * 0.4, 4, 4, [220, 90, 60], { lw: 1 });
  }
  for (let i = 0; i < 3; i++) {
    const x = rf(r, -w * 0.2, w * 0.2);
    const y = rf(r, -h * 0.2, h * 0.2);
    ellBody(g, x, y, w * 0.05, h * 0.025, [150, 164, 176], { lw: 1 });
    polyBody(g, [[x + w * 0.04, y], [x + w * 0.08, y - 4], [x + w * 0.08, y + 4]], [140, 154, 166], { lw: 1, ao: 0.3, light: 10, dark: 10 });
  }
}

function anchor(g: G, o: DrawInput): void {
  const { w, h } = o;
  const col: RGB = [86, 88, 96];
  const L = h * 0.44;
  tube(g, () => { g.beginPath(); g.moveTo(0, -L); g.lineTo(0, L * 0.9); }, w * 0.07, col);
  tube(g, () => { g.beginPath(); g.moveTo(-w * 0.28, -L * 0.7); g.lineTo(w * 0.28, -L * 0.7); }, w * 0.055, col);
  tube(g, () => { g.beginPath(); g.moveTo(-w * 0.34, L * 0.5); g.quadraticCurveTo(0, L * 1.22, w * 0.34, L * 0.5); }, w * 0.06, col);
  for (const sx of [-1, 1]) polyBody(g, [[sx * w * 0.34, L * 0.3], [sx * w * 0.44, L * 0.58], [sx * w * 0.26, L * 0.54]], col, { lw: 1.3, light: 20, dark: 20, ao: 0.5 });
  g.beginPath();
  g.arc(0, -L, w * 0.07, 0, 7);
  g.strokeStyle = rgb(col);
  g.lineWidth = 3;
  g.stroke();
  rope(g, [[0, -L], [w * 0.2, -L - 6], [w * 0.4, -L - 2]], 3, [176, 144, 88]);
}

function fishCrate(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const x = -w * 0.44;
  const y = -h * 0.42;
  rectBody(g, x, y, w * 0.88, h * 0.84, 2, [150, 112, 66], { lw: 1.6 });
  g.save();
  g.beginPath();
  g.rect(x + 4, y + 4, w * 0.88 - 8, h * 0.84 - 8);
  g.clip();
  g.fillStyle = 'rgb(180,200,210)';
  g.fillRect(x, y, w, h);
  for (let i = 0; i < 9; i++) {
    const fx = rf(r, x + 8, x + w * 0.88 - 8);
    const fy = rf(r, y + 8, y + h * 0.84 - 8);
    g.save();
    g.translate(fx, fy);
    g.rotate(r() * 6.28);
    ellBody(g, 0, 0, w * 0.14, h * 0.06, [150 + r() * 40, 170 + r() * 30, 182 + r() * 30], { lw: 1 });
    polyBody(g, [[w * 0.12, 0], [w * 0.2, -4], [w * 0.2, 4]], [130, 146, 160], { lw: 0.8, ao: 0.2, light: 10, dark: 10 });
    g.fillStyle = 'rgba(20,10,6,.8)';
    g.beginPath();
    g.arc(-w * 0.09, -1, 1.2, 0, 7);
    g.fill();
    g.restore();
  }
  g.restore();
}

function ropeCoil(g: G, o: DrawInput): void {
  const { w, h } = o;
  const R = Math.min(w, h) * 0.44;
  const pts: P[] = [];
  for (let i = 0; i < 80; i++) {
    const a = i * 0.3;
    const rr = R * (0.2 + (i / 80) * 0.8);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.92]);
  }
  rope(g, pts, 5, [176, 144, 88]);
  rope(g, [pts[0]!, [R * 0.3, -R * 0.2], [R * 0.8, -R * 0.9]], 4, [176, 144, 88]);
}

const common = { ...base, keepAspect: true as const, shadow: 14 };
const BOAT = ['harbor', 'water', 'outdoor'];

export const siegeKinds: ObjectKind[] = [
  kind({ key: 'siege_catapult', family: 'siege', name: 'Katapult', w: 3, h: 4.4, ...common, params: [armedP], tags: ['military', 'battlefield', 'outdoor'], draw: (g, o) => catapult(g, o) }),
  kind({ key: 'siege_ballista', family: 'siege', name: 'Ballista', w: 2.4, h: 2.8, ...common, params: [armedP], tags: ['military', 'battlefield', 'outdoor'], draw: (g, o) => ballista(g, o) }),
  kind({ key: 'siege_ram', family: 'siege', name: 'Rambuk', w: 2.4, h: 5.4, ...common, params: [], tags: ['military', 'battlefield', 'outdoor'], draw: (g, o) => ram(g, o) }),
  kind({ key: 'siege_trebuchet', family: 'siege', name: 'Trebuchet', w: 3.6, h: 6, ...common, params: [armedP], tags: ['military', 'battlefield', 'outdoor'], draw: (g, o) => trebuchet(g, o) }),
  kind({ key: 'siege_tower', family: 'siege', name: 'Belejringstårn', w: 3.2, h: 5, ...common, params: [], tags: ['military', 'battlefield', 'outdoor'], draw: (g, o) => siegeTower(g, o) }),
  kind({ key: 'boat_rowboat', family: 'boats', name: 'Robåd', w: 1.8, h: 4, ...common, shadow: 10, params: [{ key: 'oars', label: 'Årer ude', type: 'toggle', default: true }], tags: BOAT, draw: (g, o) => drawBoat(g, o, { L: o.h * 0.94, W: o.w * 0.66, bow: 0.5, stern: 0.7, col: [150, 106, 62], thwarts: 3, oars: param(o, 'oars', true) }) }),
  kind({ key: 'boat_skiff', family: 'boats', name: 'Fiskerjolle med sejl', w: 2.6, h: 5.4, ...common, shadow: 10, params: [{ key: 'sail', label: 'Sejl sat', type: 'toggle', default: true }], tags: BOAT, draw: (g, o) => drawBoat(g, o, { L: o.h * 0.94, W: o.w * 0.62, bow: 0.5, stern: 0.78, col: [128, 96, 62], thwarts: 2, mast: true, sail: param(o, 'sail', true) }) }),
  kind({ key: 'boat_canoe', family: 'boats', name: 'Kano', w: 1.2, h: 4, ...common, shadow: 8, params: [], tags: BOAT, draw: (g, o) => drawBoat(g, o, { L: o.h * 0.96, W: o.w * 0.74, bow: 0.85, stern: 0.0, col: [170, 124, 76], thwarts: 2 }) }),
  kind({ key: 'boat_overturned', family: 'boats', name: 'Omvendt båd', w: 1.8, h: 3.8, ...common, shadow: 10, params: [], tags: [...BOAT, 'village'], draw: (g, o) => drawBoat(g, o, { L: o.h * 0.94, W: o.w * 0.66, bow: 0.5, stern: 0.7, col: [120, 86, 54], thwarts: 0, flip: true }) }),
  kind({ key: 'boat_longship', family: 'boats', name: 'Langskib', w: 3.2, h: 10, ...common, shadow: 12, params: [], tags: [...BOAT, 'arctic', 'military'], draw: (g, o) => drawBoat(g, o, { L: o.h * 0.9, W: o.w * 0.72, bow: 0.6, stern: 0.6, col: [140, 98, 58], thwarts: 6, mast: true, sail: true, shields: true, dragon: true }) }),
  kind({ key: 'dock_post', family: 'dockside', name: 'Fortøjningspæl', w: 0.9, h: 0.9, ...common, shadow: 6, params: [], tags: ['harbor', 'water', 'city'], draw: (g, o) => dockPost(g, o) }),
  kind({ key: 'dock_barrels', family: 'dockside', name: 'Tøndebunke', w: 2, h: 2, ...common, params: [], tags: ['harbor', 'city', 'tavern'], draw: (g, o) => barrelPile(g, o, 3) }),
  kind({ key: 'dock_barrels_many', family: 'dockside', name: 'Tøndestabel (fem)', w: 3, h: 2.2, ...common, params: [], tags: ['harbor', 'city', 'tavern'], draw: (g, o) => barrelPile(g, o, 5) }),
  kind({ key: 'dock_crates', family: 'dockside', name: 'Kasser på kaj', w: 2.2, h: 2.2, ...common, params: [], tags: ['harbor', 'city'], draw: (g, o) => crateStack(g, o) }),
  kind({ key: 'dock_net', family: 'dockside', name: 'Fiskenet', w: 2.6, h: 2.2, ...common, shadow: 3, randomRotation: true, params: [], tags: ['harbor', 'village', 'water'], draw: (g, o) => fishNet(g, o) }),
  kind({ key: 'dock_anchor', family: 'dockside', name: 'Anker', w: 1.8, h: 2.4, ...common, shadow: 6, randomRotation: true, params: [], tags: ['harbor', 'village', 'water'], draw: (g, o) => anchor(g, o) }),
  kind({ key: 'dock_fish_crate', family: 'dockside', name: 'Fiskekasse', w: 1.4, h: 1, ...common, shadow: 6, params: [], tags: ['harbor', 'village', 'water'], draw: (g, o) => fishCrate(g, o) }),
  kind({ key: 'dock_rope_coil', family: 'dockside', name: 'Tovsnoning', w: 1, h: 1, ...common, shadow: 4, randomRotation: true, params: [], tags: ['harbor', 'village', 'water'], draw: (g, o) => ropeCoil(g, o) }),
];
void mixc;
void crack;
void radial;
