import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng, softDot } from '../util';
import { plankBoard, rope, tube, woodGrain, ellBody, rectBody } from '../pack2/helpers';
import { base, contact, crack, flame, lerp, mixc, mottle, OUT, polyBody, polyPath, radial, lin, rf, rgb, rubble, shift, tufts, clamp, type G, type P, type RGB, type Rnd } from './common';

/** Lejre og militær: telte, bål, palisader, skyttegrave, vagtposter, vogne, flag og senge. Set oppefra, lys øverst til venstre. */

const CLOTH: Record<string, RGB> = {
  canvas: [206, 192, 156],
  red: [170, 62, 52],
  blue: [64, 94, 160],
  green: [80, 120, 70],
  brown: [140, 100, 62],
  white: [226, 222, 208],
  purple: [112, 74, 140],
};
const clothOptions = [
  { value: 'canvas', label: 'Lærred' },
  { value: 'red', label: 'Rød' },
  { value: 'blue', label: 'Blå' },
  { value: 'green', label: 'Grøn' },
  { value: 'brown', label: 'Brun' },
  { value: 'white', label: 'Hvid' },
  { value: 'purple', label: 'Lilla' },
];
const clothP = (d: string): ParamDef => ({ key: 'cloth', label: 'Stof', type: 'select', default: d, options: clothOptions });
const litP: ParamDef = { key: 'lit', label: 'Tændt', type: 'toggle', default: true };
const WOOD: RGB = [138, 98, 58];
const clothOf = (o: DrawInput, d: string): RGB => CLOTH[param(o, 'cloth', d)] ?? CLOTH.canvas!;

/** Træpæl/stang (rør) mellem to punkter. */
const pole = (g: G, a: P, b: P, th: number, col: RGB = WOOD): void => tube(g, () => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }, th, col);

/** Stofflade med gradient og folder (path allerede lagt som sti-funktion). */
function clothFill(g: G, path: () => void, col: RGB, x0: number, y0: number, x1: number, y1: number, light = 26, dark = 40): void {
  path();
  g.fillStyle = lin(g, x0, y0, x1, y1, [[0, rgb(shift(col, light))], [0.5, rgb(col)], [1, rgb(shift(col, -dark))]]);
  g.fill();
}

/** Soldatertelt (A-telt): to taghalvdele, rygning, åbning forneden og barduner med pløkke. */
function tentSoldier(g: G, o: DrawInput, wide: boolean): void {
  const r = rng(o.seed);
  const col = clothOf(o, 'canvas');
  const { w, h } = o;
  const hw = w * (wide ? 0.4 : 0.34);
  const y0 = -h * 0.44;
  const y1 = h * 0.4;
  // barduner og pløkke
  const pegs: P[] = [[-w * 0.48, y0 - 2], [w * 0.48, y0 - 2], [-w * 0.48, y1 + 2], [w * 0.48, y1 + 2]];
  for (const [px, py] of pegs) {
    g.beginPath();
    g.moveTo(Math.sign(px) * hw * 0.2, py < 0 ? y0 : y1);
    g.lineTo(px, py);
    g.strokeStyle = 'rgba(70,50,30,.9)';
    g.lineWidth = 1.2;
    g.stroke();
    g.fillStyle = rgb(WOOD);
    g.fillRect(px - 1.6, py - 1.6, 3.2, 3.2);
  }
  contact(g, 0, 0, hw * 0.95, (y1 - y0) / 2, 0.1);
  const left = (): void => polyPath(g, [[0, y0 + 2], [-hw, y0 + 8], [-hw, y1 - 2], [0, y1]])();
  const right = (): void => polyPath(g, [[0, y0 + 2], [hw, y0 + 8], [hw, y1 - 2], [0, y1]])();
  clothFill(g, left, shift(col, 20), -hw, 0, 0, 0, 24, 12);
  clothFill(g, right, shift(col, -40), 0, 0, hw, 0, 4, 50);
  for (const side of [left, right]) {
    g.save();
    side();
    g.clip();
    // sømme parallelt med tagfladen og folder
    for (let i = 1; i < 7; i++) {
      const y = lerp(y0, y1, i / 7);
      g.beginPath();
      g.moveTo(0, y + 2);
      g.lineTo(side === left ? -hw : hw, y + 8 - i * 0.2);
      g.strokeStyle = 'rgba(40,26,14,.2)';
      g.lineWidth = 1;
      g.stroke();
    }
    mottle(g, r, [-hw, y0, hw, y1], col, 12, 7, 18, 0.2);
    g.restore();
    side();
    g.strokeStyle = OUT;
    g.lineWidth = 1.6;
    g.lineJoin = 'round';
    g.stroke();
  }
  // rygning
  g.beginPath();
  g.moveTo(0, y0 + 2);
  g.lineTo(0, y1);
  g.strokeStyle = 'rgba(255,246,224,.45)';
  g.lineWidth = 1.4;
  g.stroke();
  // åbning (forneden): mørk trekant med klap
  polyBody(g, [[-hw * 0.3, y1 + 1], [0, y1 - h * 0.2], [hw * 0.3, y1 + 1]], [36, 26, 20], { lw: 1.3, ao: 0, rim: 0, light: 4, dark: 4 });
  g.beginPath();
  g.moveTo(0, y1 - h * 0.2);
  g.lineTo(-hw * 0.34, y1 + 2);
  g.moveTo(0, y1 - h * 0.2);
  g.lineTo(hw * 0.34, y1 + 2);
  g.strokeStyle = rgb(shift(col, -26));
  g.lineWidth = 2.4;
  g.stroke();
  // stolper foran og bagved
  for (const y of [y0 + 1, y1]) {
    g.beginPath();
    g.arc(0, y, 2.2, 0, 7);
    g.fillStyle = rgb(WOOD);
    g.fill();
    g.stroke();
  }
}

/** Nomadetelt: rundt kuppelformet telt med bånd af mønster og røghul. */
function tentNomad(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = clothOf(o, 'white');
  const accent = col[0] > 190 && col[1] > 180 ? [170, 62, 52] as RGB : [226, 214, 180] as RGB;
  const { w, h } = o;
  const R = Math.min(w, h) * 0.47;
  contact(g, 0, 0, R, R, 0.1);
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.fillStyle = radial(g, 0, 0, R, [[0, rgb(shift(col, 36))], [0.7, rgb(col)], [1, rgb(shift(col, -50))]], -R * 0.3, -R * 0.3, R * 0.05);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.clip();
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    g.beginPath();
    g.moveTo(Math.cos(a) * R * 0.18, Math.sin(a) * R * 0.18);
    g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    g.strokeStyle = 'rgba(40,26,14,.22)';
    g.lineWidth = 1;
    g.stroke();
  }
  // mønsterbånd (trekanter) omkring på 62% radius
  for (let i = 0; i < n * 2; i++) {
    const a0 = (i / (n * 2)) * 6.283;
    const a1 = ((i + 1) / (n * 2)) * 6.283;
    g.beginPath();
    g.moveTo(Math.cos(a0) * R * 0.6, Math.sin(a0) * R * 0.6);
    g.lineTo(Math.cos((a0 + a1) / 2) * R * 0.72, Math.sin((a0 + a1) / 2) * R * 0.72);
    g.lineTo(Math.cos(a1) * R * 0.6, Math.sin(a1) * R * 0.6);
    g.closePath();
    g.fillStyle = rgb(accent, 0.85);
    g.fill();
  }
  g.beginPath();
  g.arc(0, 0, R * 0.6, 0, 7);
  g.strokeStyle = rgb(accent, 0.9);
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, R * 0.78, 0, 7);
  g.strokeStyle = rgb(accent, 0.9);
  g.lineWidth = 3;
  g.stroke();
  // skygge nederst til højre
  g.fillStyle = lin(g, -R, -R, R, R, [[0, 'rgba(255,240,210,.1)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(10,6,16,.35)']]);
  g.fillRect(-R, -R, R * 2, R * 2);
  mottle(g, r, [-R, -R, R, R], col, 12, R * 0.1, 16, 0.14);
  g.restore();
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.strokeStyle = OUT;
  g.lineWidth = 1.7;
  g.stroke();
  // røghul i midten
  g.beginPath();
  g.arc(0, 0, R * 0.14, 0, 7);
  g.fillStyle = 'rgb(34,24,18)';
  g.fill();
  g.strokeStyle = rgb(WOOD);
  g.lineWidth = 2;
  g.stroke();
  // dør nederst
  polyBody(g, [[-R * 0.16, R * 0.98], [-R * 0.12, R * 0.62], [R * 0.12, R * 0.62], [R * 0.16, R * 0.98]], [38, 28, 22], { lw: 1.3, ao: 0, rim: 0, light: 4, dark: 4 });
  // barduner
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283 + 0.4;
    g.beginPath();
    g.moveTo(Math.cos(a) * R, Math.sin(a) * R);
    g.lineTo(Math.cos(a) * R * 1.07, Math.sin(a) * R * 1.07);
    g.strokeStyle = 'rgba(70,50,30,.9)';
    g.lineWidth = 1.2;
    g.stroke();
  }
}

/** Pavillon: firkantet tag med fire trekantsflader, kvaster og flag på toppen. */
function pavilion(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = clothOf(o, 'red');
  const alt = shift(CLOTH.white!, -8);
  const { w, h } = o;
  const S = Math.min(w, h) * 0.48;
  const apex: P = [-S * 0.03, -S * 0.12];
  const corners: P[] = [[-S, -S], [S, -S], [S, S], [-S, S]];
  contact(g, 0, 0, S, S, 0.12);
  const tone = [0.8, -0.35, -0.55, 0.5];
  for (let i = 0; i < 4; i++) {
    const a = corners[i]!;
    const b = corners[(i + 1) % 4]!;
    const path = (): void => polyPath(g, [apex, a, b])();
    const l = tone[i]!;
    clothFill(g, path, mixc(col, l > 0 ? [255, 246, 226] : [10, 6, 16], Math.abs(l) * (l > 0 ? 0.32 : 0.5)), apex[0], apex[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 18, 20);
    g.save();
    path();
    g.clip();
    // striber
    const stripes = 6;
    for (let k = 0; k < stripes; k++) {
      if (k % 2) continue;
      const t0 = k / stripes;
      const t1 = (k + 1) / stripes;
      g.beginPath();
      g.moveTo(apex[0], apex[1]);
      g.lineTo(lerp(a[0], b[0], t0), lerp(a[1], b[1], t0));
      g.lineTo(lerp(a[0], b[0], t1), lerp(a[1], b[1], t1));
      g.closePath();
      g.fillStyle = rgb(mixc(alt, [10, 6, 16], l < 0 ? Math.abs(l) * 0.4 : 0), 0.9);
      g.fill();
    }
    g.restore();
    path();
    g.strokeStyle = OUT;
    g.lineWidth = 1.5;
    g.lineJoin = 'round';
    g.stroke();
    // flæsekant (valance) langs kanten
    const n = 9;
    for (let k = 0; k < n; k++) {
      const p0: P = [lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)];
      const p1: P = [lerp(a[0], b[0], (k + 1) / n), lerp(a[1], b[1], (k + 1) / n)];
      const nx = (b[1] - a[1]) / (S * 2) * -1;
      const ny = (b[0] - a[0]) / (S * 2);
      const d = S * 0.09;
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.lineTo(p1[0], p1[1]);
      g.lineTo((p0[0] + p1[0]) / 2 + nx * d * -1, (p0[1] + p1[1]) / 2 + ny * d * -1);
      g.closePath();
      g.fillStyle = rgb(k % 2 ? mixc(alt, [10, 6, 16], l < 0 ? 0.3 : 0) : shift(col, l < 0 ? -26 : 8));
      g.fill();
      g.strokeStyle = 'rgba(20,10,6,.6)';
      g.lineWidth = 0.8;
      g.stroke();
    }
  }
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(apex[0], apex[1]);
    g.lineTo(corners[i]![0], corners[i]![1]);
    g.strokeStyle = i === 0 || i === 3 ? 'rgba(255,240,215,.35)' : 'rgba(8,4,12,.4)';
    g.lineWidth = 1.6;
    g.stroke();
  }
  // flag og knop
  pole(g, apex, [apex[0], apex[1] - S * 0.45], 2);
  g.beginPath();
  g.moveTo(apex[0], apex[1] - S * 0.45);
  g.quadraticCurveTo(apex[0] + S * 0.3, apex[1] - S * 0.5 + rf(r, -3, 3), apex[0] + S * 0.55, apex[1] - S * 0.42);
  g.lineTo(apex[0] + S * 0.4, apex[1] - S * 0.32);
  g.lineTo(apex[0], apex[1] - S * 0.3);
  g.closePath();
  g.fillStyle = rgb(mixc(col, [255, 220, 120], 0.35));
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1;
  g.stroke();
  // pæle i hjørnerne
  for (const [x, y] of corners) {
    g.beginPath();
    g.arc(x, y, 2.6, 0, 7);
    g.fillStyle = rgb(WOOD);
    g.fill();
    g.stroke();
  }
}

/** Åbent halvtag: skråt stykke stof på to stænger over halm, til skjul. */
function leanTo(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = clothOf(o, 'brown');
  const { w, h } = o;
  // halmleje
  g.fillStyle = 'rgba(190,160,80,.85)';
  g.beginPath();
  g.ellipse(0, h * 0.15, w * 0.4, h * 0.25, 0, 0, 7);
  g.fill();
  for (let i = 0; i < 60; i++) {
    g.beginPath();
    const x = rf(r, -w * 0.38, w * 0.38);
    const y = h * 0.15 + rf(r, -h * 0.22, h * 0.22);
    g.moveTo(x, y);
    g.lineTo(x + rf(r, -6, 6), y + rf(r, -3, 3));
    g.strokeStyle = `rgba(${r() < 0.5 ? '230,200,110' : '140,110,50'},.8)`;
    g.lineWidth = 0.9;
    g.stroke();
  }
  const p = (): void => polyPath(g, [[-w * 0.46, -h * 0.46], [w * 0.46, -h * 0.46], [w * 0.4, h * 0.0], [-w * 0.4, h * 0.0]])();
  clothFill(g, p, col, -w / 2, -h / 2, w / 2, h * 0.1, 22, 40);
  g.save();
  p();
  g.clip();
  for (let i = 1; i < 8; i++) {
    g.beginPath();
    g.moveTo(lerp(-w * 0.46, w * 0.46, i / 8), -h * 0.46);
    g.lineTo(lerp(-w * 0.4, w * 0.4, i / 8), 0);
    g.strokeStyle = 'rgba(30,18,8,.22)';
    g.lineWidth = 1;
    g.stroke();
  }
  mottle(g, r, [-w / 2, -h / 2, w / 2, 0], col, 12, 7, 18, 0.2);
  g.restore();
  p();
  g.strokeStyle = OUT;
  g.lineWidth = 1.6;
  g.stroke();
  for (const sx of [-1, 1]) pole(g, [sx * w * 0.44, -h * 0.46], [sx * w * 0.4, h * 0.34], 3.4);
  rope(g, [[-w * 0.4, 0], [-w * 0.46, h * 0.3]], 1.6);
  rope(g, [[w * 0.4, 0], [w * 0.46, h * 0.3]], 1.6);
}

/** Bålplads: stenring, brænde og flammer; med gryde, spid eller gløder (udbrændt). */
function campfire(g: G, o: DrawInput, mode: 'pot' | 'spit' | 'logs' | 'out'): void {
  const r = rng(o.seed);
  const lit = param(o, 'lit', true) && mode !== 'out';
  const { w, h } = o;
  const R = Math.min(w, h) * 0.3;
  // jordplet
  g.fillStyle = 'rgba(40,28,18,.4)';
  g.beginPath();
  g.ellipse(0, 0, R * 1.5, R * 1.4, 0, 0, 7);
  g.fill();
  // sten
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rf(r, -0.1, 0.1);
    const x = Math.cos(a) * R * 1.12;
    const y = Math.sin(a) * R * 1.12;
    const s = R * rf(r, 0.2, 0.3);
    const pts: P[] = [];
    for (let k = 0; k < 6; k++) pts.push([x + Math.cos(k * 1.047 + a) * s * rf(r, 0.8, 1.2), y + Math.sin(k * 1.047 + a) * s * 0.8 * rf(r, 0.8, 1.2)]);
    polyBody(g, pts, shift([128, 124, 116], (r() - 0.5) * 40), { lw: 1, light: 30, dark: 30, ao: 1 });
  }
  g.beginPath();
  g.arc(0, 0, R * 0.95, 0, 7);
  g.fillStyle = mode === 'out' ? 'rgb(54,48,44)' : 'rgb(36,24,16)';
  g.fill();
  // brænde
  const logs = mode === 'out' ? 3 : 5;
  for (let i = 0; i < logs; i++) {
    const a = (i / logs) * 6.283 + rf(r, -0.3, 0.3);
    g.save();
    g.rotate(a);
    tube(g, () => { g.beginPath(); g.moveTo(R * 0.1, 0); g.lineTo(R * 0.85, rf(r, -3, 3)); }, R * 0.2, mode === 'out' ? [50, 44, 40] : [112, 78, 46]);
    g.restore();
  }
  if (mode === 'out') {
    for (let i = 0; i < 30; i++) {
      g.beginPath();
      g.ellipse(rf(r, -R, R) * 0.8, rf(r, -R, R) * 0.8, rf(r, 2, 6), rf(r, 1, 3), r() * 3, 0, 7);
      g.fillStyle = `rgba(${r() < 0.5 ? '120,114,108' : '70,66,62'},.7)`;
      g.fill();
    }
  }
  if (lit) {
    softDot(g, 0, 0, R * 2.2, [255, 150, 50], 0.2);
    for (const [fx, fy, s] of [[-R * 0.3, R * 0.1, R * 0.22], [R * 0.3, 0, R * 0.26], [0, -R * 0.15, R * 0.34], [R * 0.1, R * 0.25, R * 0.2]] as const) flame(g, fx, fy, s);
  }
  if (mode === 'pot') {
    // trebenet med gryde
    for (const a of [-2.2, -0.6, 1.5]) pole(g, [Math.cos(a) * R * 1.35, Math.sin(a) * R * 1.35], [0, -R * 0.1], 3);
    const py = -R * 0.12;
    g.beginPath();
    g.arc(0, py, R * 0.52, 0, 7);
    g.fillStyle = radial(g, 0, py, R * 0.52, [[0, 'rgb(86,86,92)'], [0.7, 'rgb(46,46,52)'], [1, 'rgb(20,20,24)']], -R * 0.2, py - R * 0.2, 2);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.6;
    g.stroke();
    g.beginPath();
    g.arc(0, py, R * 0.38, 0, 7);
    g.fillStyle = 'rgb(150,86,36)';
    g.fill();
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(rf(r, -R * 0.25, R * 0.25), py + rf(r, -R * 0.25, R * 0.25), rf(r, 1.4, 3), 0, 7);
      g.fillStyle = `rgba(${r() < 0.5 ? '210,170,90' : '110,150,60'},.9)`;
      g.fill();
    }
  } else if (mode === 'spit') {
    for (const sx of [-1, 1]) pole(g, [sx * R * 1.4, R * 0.1], [sx * R * 1.2, -R * 0.15], 3);
    pole(g, [-R * 1.45, -R * 0.14], [R * 1.45, -R * 0.14], 2.6, [150, 150, 154]);
    // stegt kød
    ellBody(g, 0, -R * 0.16, R * 0.5, R * 0.3, [150, 80, 40], { lw: 1.4 });
    g.beginPath();
    g.ellipse(-R * 0.15, -R * 0.26, R * 0.2, R * 0.08, -0.3, 0, 7);
    g.fillStyle = 'rgba(255,214,150,.5)';
    g.fill();
  } else if (mode === 'logs') {
    // fire siddestokke
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.283 + 0.78;
      g.save();
      g.translate(Math.cos(a) * R * 1.55, Math.sin(a) * R * 1.55);
      g.rotate(a + Math.PI / 2);
      tube(g, () => { g.beginPath(); g.moveTo(-R * 0.42, 0); g.lineTo(R * 0.42, 0); }, R * 0.28, [124, 88, 52]);
      g.restore();
    }
  }
}

/** Felt-seng/briks: træramme, strå eller lærred og tæppe. */
function cot(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = clothOf(o, 'green');
  const { w, h } = o;
  const x = -w * 0.46;
  const y = -h * 0.46;
  const ww = w * 0.92;
  const hh = h * 0.92;
  rectBody(g, x, y, ww, hh, 3, WOOD, { lw: 1.5, light: 18, dark: 22 });
  g.save();
  g.beginPath();
  g.rect(x, y, ww, hh);
  g.clip();
  woodGrain(g, r, [x, y, x + ww, y + hh], WOOD, { rot: Math.PI / 2, lines: 6 });
  g.restore();
  clothFill(g, polyPath(g, [[x + 4, y + 4], [x + ww - 4, y + 4], [x + ww - 4, y + hh - 4], [x + 4, y + hh - 4]]), [196, 180, 140], x, y, x + ww, y + hh, 14, 30);
  g.strokeStyle = 'rgba(30,18,8,.7)';
  g.lineWidth = 1.2;
  g.strokeRect(x + 4, y + 4, ww - 8, hh - 8);
  // tæppe
  const bp = polyPath(g, [[x + 4, y + hh * 0.38], [x + ww - 4, y + hh * 0.4], [x + ww - 4, y + hh - 4], [x + 4, y + hh - 4]]);
  clothFill(g, bp, col, x, y, x + ww, y + hh, 22, 36);
  g.save();
  bp();
  g.clip();
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    const yy = y + hh * (0.46 + i * 0.1);
    g.moveTo(x, yy);
    g.bezierCurveTo(x + ww * 0.3, yy + rf(r, -3, 3), x + ww * 0.7, yy + rf(r, -3, 3), x + ww, yy);
    g.strokeStyle = 'rgba(20,10,6,.2)';
    g.lineWidth = 1.4;
    g.stroke();
  }
  g.restore();
  bp();
  g.strokeStyle = OUT;
  g.lineWidth = 1.2;
  g.stroke();
  // pude
  ellBody(g, x + ww / 2, y + hh * 0.2, ww * 0.34, hh * 0.13, [226, 222, 208], { lw: 1.2 });
  // ben (hjørner)
  for (const [px, py] of [[x, y], [x + ww, y], [x, y + hh], [x + ww, y + hh]] as const) {
    g.beginPath();
    g.arc(px, py, 2.4, 0, 7);
    g.fillStyle = rgb(shift(WOOD, -24));
    g.fill();
  }
}

/** Overdækket forsyningsvogn: rundet lærredstag med ribber, hjul og trækstang (set oppefra). */
function supplyWagon(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = clothOf(o, 'canvas');
  const { w, h } = o;
  const bw = w * 0.72;
  const x = -bw / 2;
  const y0 = -h * 0.4;
  const y1 = h * 0.3;
  // trækstang (forneden)
  pole(g, [0, y1], [0, h * 0.5], 4);
  // hjul langs siderne (set ovenfra som smalle rektangler)
  for (const sx of [-1, 1]) for (const yy of [y0 + (y1 - y0) * 0.22, y0 + (y1 - y0) * 0.78]) {
    rectBody(g, sx > 0 ? bw / 2 - 1 : -bw / 2 - w * 0.12 + 1, yy - h * 0.08, w * 0.12, h * 0.16, 2, [96, 68, 40], { lw: 1.4 });
  }
  rectBody(g, x, y0, bw, y1 - y0, 4, WOOD, { lw: 1.5 });
  const roof = (): void => polyPath(g, [[x + 2, y0 + 3], [x + bw - 2, y0 + 3], [x + bw - 2, y1 - 3], [x + 2, y1 - 3]])();
  g.save();
  roof();
  g.fillStyle = lin(g, x, 0, x + bw, 0, [[0, rgb(shift(col, 34))], [0.35, rgb(shift(col, 8))], [0.7, rgb(col)], [1, rgb(shift(col, -54))]]);
  g.fill();
  g.clip();
  const ribs = 6;
  for (let i = 0; i <= ribs; i++) {
    const yy = lerp(y0 + 3, y1 - 3, i / ribs);
    g.fillStyle = 'rgba(30,18,8,.35)';
    g.fillRect(x, yy - 0.8, bw, 1.8);
    g.fillStyle = 'rgba(255,240,210,.18)';
    g.fillRect(x, yy + 1, bw, 0.9);
  }
  g.fillStyle = 'rgba(255,246,224,.16)';
  g.fillRect(-bw * 0.04, y0, bw * 0.08, y1 - y0);
  mottle(g, r, [x, y0, x + bw, y1], col, 14, 8, 16, 0.18);
  g.restore();
  roof();
  g.strokeStyle = OUT;
  g.lineWidth = 1.5;
  g.stroke();
  // bagpladen med tønde og sæk
  ellBody(g, 0, y1 + 3, bw * 0.28, h * 0.035, [120, 90, 54], { lw: 1 });
  // åben forside: kusk-bænk
  rectBody(g, -bw * 0.34, y1 - 2, bw * 0.68, h * 0.07, 2, shift(WOOD, 6), { lw: 1.3 });
}

/** Flagstang set oppefra: stangens top som en knop på en fod og flaget som en bølgende stofbane, der blafrer ud til siden. */
function flagPole(g: G, o: DrawInput, banner: boolean): void {
  const r = rng(o.seed);
  const col = clothOf(o, 'red');
  const { w, h } = o;
  const px = -w * 0.38;
  const py = 0;
  const L = w * 0.8;
  const Hh = banner ? h * 0.46 : h * 0.34;
  // flaget: bølger langs længden, svalehale (banner) eller lige kant
  const top: P[] = [];
  const bot: P[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wave = Math.sin(t * 7 + r() * 0.1) * h * 0.04 * (0.3 + t);
    const half = (Hh / 2) * (banner ? 1 - t * 0.92 : 1 - t * 0.06);
    top.push([px + L * t, py + wave - half]);
    bot.push([px + L * t, py + wave + half]);
  }
  const flag = (): void => {
    g.beginPath();
    top.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    for (let i = n; i >= 0; i--) g.lineTo(bot[i]![0], bot[i]![1]);
    if (!banner) {
      // svalehale
      g.lineTo(px + L - L * 0.1, py);
    }
    g.closePath();
  };
  g.save();
  g.translate(3, 4);
  flag();
  g.fillStyle = 'rgba(10,5,2,.35)';
  g.fill();
  g.restore();
  flag();
  g.fillStyle = lin(g, px, py - Hh / 2, px + L, py + Hh / 2, [[0, rgb(shift(col, 34))], [0.5, rgb(col)], [1, rgb(shift(col, -44))]]);
  g.fill();
  g.save();
  flag();
  g.clip();
  // folder på tværs og emblem
  for (let i = 1; i < 9; i++) {
    g.beginPath();
    g.moveTo(px + (L * i) / 9, py - Hh);
    g.lineTo(px + (L * i) / 9 + 3, py + Hh);
    g.strokeStyle = i % 2 ? 'rgba(10,5,6,.16)' : 'rgba(255,240,230,.14)';
    g.lineWidth = 1.6;
    g.stroke();
  }
  g.fillStyle = 'rgba(255,230,150,.9)';
  g.fillRect(px + L * 0.3, py - Hh, L * 0.1, Hh * 2);
  g.restore();
  flag();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.lineJoin = 'round';
  g.stroke();
  // stangens top med fod
  g.beginPath();
  g.arc(px, py, Math.min(w, h) * 0.1, 0, 7);
  g.fillStyle = 'rgb(110,100,90)';
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(px, py, Math.min(w, h) * 0.055, 0, 7);
  g.fillStyle = radial(g, px, py, Math.min(w, h) * 0.06, [[0, 'rgb(255,236,150)'], [1, 'rgb(190,140,50)']], px - 2, py - 2, 1);
  g.fill();
  g.stroke();
}

/** Vagtpost: lav træplatform med rækværk og stige (set ovenfra). */
function watchPost(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const s = Math.min(w, h) * 0.78;
  const x = -s / 2;
  const y = -s * 0.5;
  // stige nederst
  for (let i = 0; i < 4; i++) rectBody(g, -s * 0.16, y + s + 1 + i * 6, s * 0.32, 3, 1, [120, 84, 48], { lw: 1 });
  plankBoard(g, r, x, y, s, s, [150, 108, 64], 7, { vertical: false, nails: true, wear: 0.4 });
  g.strokeStyle = OUT;
  g.lineWidth = 1.6;
  g.strokeRect(x, y, s, s);
  // hjørnestolper og rækværk
  for (const [px, py] of [[x, y], [x + s, y], [x, y + s], [x + s, y + s]] as const) {
    g.beginPath();
    g.arc(px, py, 4.2, 0, 7);
    g.fillStyle = rgb(shift(WOOD, -10));
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.2;
    g.stroke();
  }
  for (const [a, b] of [[[x, y], [x + s, y]], [[x, y], [x, y + s]], [[x + s, y], [x + s, y + s]]] as const) pole(g, a as P, b as P, 3, [124, 88, 50]);
  // kasse, tønde og fakkel
  rectBody(g, x + s * 0.12, y + s * 0.15, s * 0.22, s * 0.18, 1.5, [116, 82, 48], { lw: 1.2 });
  ellBody(g, x + s * 0.74, y + s * 0.26, s * 0.1, s * 0.1, [110, 78, 46], { lw: 1.2 });
  flame(g, x + s * 0.2, y + s * 0.8, 4);
}

/** Palisade: række af tilspidsede stammer set fra oven (cirkler med ringe) bundet sammen. */
function palisade(g: G, o: DrawInput, shape: 'straight' | 'corner' | 'gate'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const rad = Math.min(h * 0.4, w / 18);
  const log = (x: number, y: number, rr: number, tone: number): void => {
    g.beginPath();
    g.arc(x + rr * 0.15, y + rr * 0.2, rr, 0, 7);
    g.fillStyle = 'rgba(10,6,2,.4)';
    g.fill();
    g.beginPath();
    g.arc(x, y, rr, 0, 7);
    g.fillStyle = radial(g, x, y, rr, [[0, rgb(shift([182, 140, 88], tone + 20))], [0.7, rgb(shift([140, 98, 56], tone))], [1, rgb(shift([88, 58, 34], tone))]], x - rr * 0.3, y - rr * 0.3, 1);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.3;
    g.stroke();
    g.beginPath();
    g.arc(x, y, rr * 0.6, 0, 7);
    g.strokeStyle = 'rgba(60,36,18,.4)';
    g.lineWidth = 0.9;
    g.stroke();
    g.beginPath();
    g.arc(x - rr * 0.1, y - rr * 0.1, rr * 0.28, 0, 7);
    g.stroke();
    // spids (lille ujævn kæp-top)
    g.beginPath();
    g.arc(x - rr * 0.28, y - rr * 0.3, rr * 0.22, 0, 7);
    g.fillStyle = 'rgba(255,230,180,.3)';
    g.fill();
  };
  const pts: P[] = [];
  if (shape === 'straight') {
    const n = Math.floor((w * 0.96) / (rad * 1.9));
    for (let i = 0; i < n; i++) pts.push([-w * 0.48 + rad + i * ((w * 0.96 - rad * 2) / (n - 1)), rf(r, -1, 1) * rad * 0.12]);
  } else if (shape === 'corner') {
    const n = Math.floor((w * 0.9) / (rad * 1.9));
    for (let i = 0; i < n; i++) pts.push([-w * 0.45 + rad + i * ((w * 0.9 - rad * 2) / (n - 1)), h * 0.4 - rad]);
    for (let i = 1; i < n; i++) pts.push([w * 0.45 - rad, h * 0.4 - rad - i * ((h * 0.8 - rad * 2) / (n - 1))]);
  } else {
    const n = Math.floor((w * 0.96) / (rad * 1.9));
    for (let i = 0; i < n; i++) {
      const x = -w * 0.48 + rad + i * ((w * 0.96 - rad * 2) / (n - 1));
      if (Math.abs(x) < w * 0.14) continue;
      pts.push([x, 0]);
    }
  }
  // snor mellem stammer
  rope(g, pts.map((p) => [p[0], p[1] + 1] as P), 1.8, [176, 144, 88]);
  for (const p of pts) log(p[0], p[1], rad * rf(r, 0.92, 1.05), (r() - 0.5) * 20);
  if (shape === 'gate') {
    // to dørblade + to portstolper
    for (const sx of [-1, 1]) {
      log(sx * w * 0.16, 0, rad * 1.5, -10);
      rectBody(g, sx > 0 ? w * 0.02 : -w * 0.14 + 0, -rad * 0.45, w * 0.12, rad * 0.9, 1.5, [124, 88, 50], { lw: 1.3 });
    }
  }
  tufts(g, r, 0, rad * 0.9, w * 0.4, rad * 0.4, 12);
}

/** Skyttegrav: udgravet rende med jordvold, sandsække og pæle. */
function trench(g: G, o: DrawInput, kind: 'plain' | 'bags' | 'stakes'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const th = h * 0.21;
  const len = w * 0.46;
  const env = (t: number): number => Math.pow(Math.max(0.02, Math.sin(Math.PI * t)), 0.45);
  const wob = (t: number): number => Math.sin(t * 5 + o.seed) * h * 0.04;
  const edge = (dy: number, k: number): P[] => {
    const out: P[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      out.push([lerp(-len, len, t), wob(t) + dy * env(t) + (r() - 0.5) * k]);
    }
    return out;
  };
  const up = edge(-th, 2.2);
  const lo = edge(th, 2.2);
  // jordvold (rundt)
  const berm = (): void => {
    g.beginPath();
    up.forEach((p, i) => (i ? g.lineTo(p[0], p[1] - th * 0.9 * env(i / 24)) : g.moveTo(p[0], p[1] - th * 0.9 * env(i / 24))));
    [...lo].reverse().forEach((p, i) => g.lineTo(p[0], p[1] + th * 0.9 * env(1 - i / 24)));
    g.closePath();
  };
  berm();
  g.fillStyle = lin(g, 0, -h / 2, 0, h / 2, [[0, 'rgb(142,106,66)'], [1, 'rgb(104,74,44)']]);
  g.fill();
  g.save();
  berm();
  g.clip();
  mottle(g, r, [-len, -h / 2, len, h / 2], [124, 90, 56], 40, 6, 24, 0.35);
  g.restore();
  g.strokeStyle = 'rgba(30,18,8,.5)';
  g.lineWidth = 1.2;
  berm();
  g.stroke();
  const pit = (): void => {
    g.beginPath();
    up.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    [...lo].reverse().forEach((p) => g.lineTo(p[0], p[1]));
    g.closePath();
  };
  pit();
  g.fillStyle = lin(g, 0, -th, 0, th, [[0, 'rgb(34,22,14)'], [0.5, 'rgb(62,44,28)'], [1, 'rgb(82,60,38)']]);
  g.fill();
  g.save();
  pit();
  g.clip();
  // brædder i bunden og mørk skygge fra nordvæggen
  g.fillStyle = 'rgba(20,10,4,.5)';
  g.fillRect(-len, -th * 1.2, len * 2, th * 0.9);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = 'rgba(150,110,64,.5)';
    g.fillRect(-len + i * len * 0.26, th * 0.2, len * 0.2, th * 0.5);
  }
  g.restore();
  pit();
  g.strokeStyle = OUT;
  g.lineWidth = 1.6;
  g.stroke();
  if (kind === 'bags') {
    for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) {
      const x = lerp(-len * 0.96, len * 0.96, i / 11) + (row ? len * 0.04 : 0);
      const y = lo[Math.min(24, Math.round((i / 11) * 24))]![1] + th * (0.25 + row * 0.12);
      ellBody(g, x, y, len * 0.07, th * 0.2, [186, 160, 104], { lw: 1 });
    }
  } else if (kind === 'stakes') {
    for (let i = 0; i < 10; i++) {
      const x = lerp(-len * 0.9, len * 0.9, i / 9);
      const y = lo[Math.min(24, Math.round((i / 9) * 24))]![1] + th * 0.4;
      pole(g, [x - 3, y + 10], [x + 2, y - 8], 3, [130, 96, 56]);
      g.beginPath();
      g.arc(x + 2, y - 8, 2, 0, 7);
      g.fillStyle = 'rgb(230,214,170)';
      g.fill();
    }
  } else {
    rubble(g, r, 0, th * 1.25, len * 0.8, th * 0.2, [120, 100, 80], 8, 4);
  }
}

const common = { ...base, keepAspect: true as const, shadow: 14 };
const C = ['camp', 'outdoor', 'military'];

export const campKinds: ObjectKind[] = [
  kind({ key: 'milcamp_tent_soldier', family: 'fieldcamp', name: 'Soldatertelt', w: 3, h: 4, ...common, params: [clothP('canvas')], tags: C, draw: (g, o) => tentSoldier(g, o, false) }),
  kind({ key: 'milcamp_tent_wide', family: 'fieldcamp', name: 'Bredt hærtelt', w: 4, h: 4.6, ...common, params: [clothP('canvas')], tags: C, draw: (g, o) => tentSoldier(g, o, true) }),
  kind({ key: 'milcamp_tent_nomad', family: 'fieldcamp', name: 'Nomadetelt', w: 4.4, h: 4.4, ...common, randomRotation: true, params: [clothP('white')], tags: [...C, 'desert'], draw: (g, o) => tentNomad(g, o) }),
  kind({ key: 'milcamp_pavilion', family: 'fieldcamp', name: 'Pavillon', w: 5, h: 5.4, ...common, params: [clothP('red')], tags: [...C, 'rich'], draw: (g, o) => pavilion(g, o) }),
  kind({ key: 'milcamp_lean_to', family: 'fieldcamp', name: 'Skjul af stof', w: 3, h: 2.6, ...common, params: [clothP('brown')], tags: [...C, 'forest', 'poor'], draw: (g, o) => leanTo(g, o) }),
  kind({ key: 'milcamp_fire_pot', family: 'fieldcamp', name: 'Bål med gryde', w: 2.4, h: 2.4, ...common, shadow: 8, params: [litP], tags: ['camp', 'outdoor'], draw: (g, o) => campfire(g, o, 'pot') }),
  kind({ key: 'milcamp_fire_spit', family: 'fieldcamp', name: 'Bål med spid', w: 2.8, h: 2.2, ...common, shadow: 8, params: [litP], tags: ['camp', 'outdoor'], draw: (g, o) => campfire(g, o, 'spit') }),
  kind({ key: 'milcamp_fire_logs', family: 'fieldcamp', name: 'Bål med siddestokke', w: 3.4, h: 3.4, ...common, shadow: 8, params: [litP], tags: ['camp', 'outdoor'], draw: (g, o) => campfire(g, o, 'logs') }),
  kind({ key: 'milcamp_fire_out', family: 'fieldcamp', name: 'Udbrændt bål', w: 2, h: 2, ...common, shadow: 0, params: [], tags: ['camp', 'outdoor'], draw: (g, o) => campfire(g, o, 'out') }),
  kind({ key: 'milcamp_cot', family: 'fieldcamp', name: 'Feltseng', w: 1.2, h: 2.2, ...common, shadow: 8, params: [clothP('green')], tags: ['camp', 'military'], draw: (g, o) => cot(g, o) }),
  kind({ key: 'milcamp_wagon', family: 'fieldcamp', name: 'Forsyningsvogn', w: 2.6, h: 4.6, ...common, params: [clothP('canvas')], tags: ['camp', 'military', 'outdoor', 'city'], draw: (g, o) => supplyWagon(g, o) }),
  kind({ key: 'milcamp_flag', family: 'fieldcamp', name: 'Flagstang', w: 3, h: 1.4, ...common, shadow: 10, params: [clothP('red')], tags: ['camp', 'military', 'city'], draw: (g, o) => flagPole(g, o, false) }),
  kind({ key: 'milcamp_banner', family: 'fieldcamp', name: 'Banner på stang', w: 3, h: 1.4, ...common, shadow: 10, params: [clothP('blue')], tags: ['camp', 'military', 'city'], draw: (g, o) => flagPole(g, o, true) }),
  kind({ key: 'milcamp_watch_post', family: 'fieldcamp', name: 'Vagtpost (platform)', w: 2.4, h: 3, ...common, params: [], tags: ['camp', 'military', 'outdoor'], draw: (g, o) => watchPost(g, o) }),
  kind({ key: 'milcamp_palisade', family: 'fieldcamp', name: 'Palisade', w: 6, h: 1, ...common, keepAspect: false, shadow: 12, params: [], tags: ['military', 'outdoor', 'village'], draw: (g, o) => palisade(g, o, 'straight') }),
  kind({ key: 'milcamp_palisade_corner', family: 'fieldcamp', name: 'Palisadehjørne', w: 4, h: 4, ...common, keepAspect: false, shadow: 12, params: [], tags: ['military', 'outdoor', 'village'], draw: (g, o) => palisade(g, o, 'corner') }),
  kind({ key: 'milcamp_palisade_gate', family: 'fieldcamp', name: 'Palisadeport', w: 6, h: 1.4, ...common, keepAspect: false, shadow: 12, params: [], tags: ['military', 'outdoor', 'village'], draw: (g, o) => palisade(g, o, 'gate') }),
  kind({ key: 'milcamp_trench', family: 'fieldcamp', name: 'Skyttegrav', w: 6, h: 2, ...common, keepAspect: false, shadow: 0, params: [], tags: ['military', 'battlefield', 'outdoor'], draw: (g, o) => trench(g, o, 'plain') }),
  kind({ key: 'milcamp_trench_bags', family: 'fieldcamp', name: 'Skyttegrav med sandsække', w: 6, h: 2, ...common, keepAspect: false, shadow: 0, params: [], tags: ['military', 'battlefield', 'outdoor'], draw: (g, o) => trench(g, o, 'bags') }),
  kind({ key: 'milcamp_trench_stakes', family: 'fieldcamp', name: 'Skyttegrav med spidse pæle', w: 6, h: 2, ...common, keepAspect: false, shadow: 0, params: [], tags: ['military', 'battlefield', 'outdoor'], draw: (g, o) => trench(g, o, 'stakes') }),
];
void clamp;
void crack;
void contact;
