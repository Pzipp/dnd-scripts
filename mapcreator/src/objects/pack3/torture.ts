import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { blobPath, body, crack, ellBody, lin, mottle, OUT, polyBody, radial, rectBody, rectPath, rgb, rivet, rope, shift, tube, wobble, type G, type RGB, type Rnd } from '../pack2/helpers';
import { IRON } from './arms';
import { coin, ironRect, vary, woodDisc, woodRect } from './common';

/** Tortur- og fangekamre: gabestok, skampæl, jomfru af jern, hjul, bure, jernstol, glødekar, bord, tank, galge, fald-økse. */

const BLOOD: RGB = [110, 14, 14];

function bloodSmear(g: G, r: Rnd, x: number, y: number, w: number, h: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const bx = x + r() * w;
    const by = y + r() * h;
    g.fillStyle = `rgba(${90 + r() * 40},8,8,${0.35 + r() * 0.35})`;
    g.beginPath();
    g.ellipse(bx, by, 1.5 + r() * 4, 1 + r() * 2.5, r() * 3, 0, 7);
    g.fill();
  }
}

function chainLine(g: G, a: [number, number], b: [number, number], sag = 0): void {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2 + sag;
  const n = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4.2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * mx + t * t * b[0];
    const y = (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * my + t * t * b[1];
    g.save();
    g.translate(x, y);
    g.rotate(i % 2 ? 0.9 : -0.2 + Math.atan2(b[1] - a[1], b[0] - a[0]));
    g.beginPath();
    g.ellipse(0, 0, i % 2 ? 1.6 : 2.7, 1.6, 0, 0, 7);
    g.strokeStyle = 'rgba(10,6,4,.85)';
    g.lineWidth = 2.4;
    g.stroke();
    g.strokeStyle = 'rgb(130,132,140)';
    g.lineWidth = 1.3;
    g.stroke();
    g.restore();
  }
}

function manacle(g: G, x: number, y: number, rad: number, open = false): void {
  g.beginPath();
  g.arc(x, y, rad, open ? 0.5 : 0, open ? 5.8 : 7);
  g.strokeStyle = 'rgba(10,6,4,.88)';
  g.lineWidth = rad * 0.7 + 1.4;
  g.stroke();
  g.strokeStyle = 'rgb(112,114,122)';
  g.lineWidth = rad * 0.7;
  g.stroke();
  g.beginPath();
  g.arc(x - 0.5, y - 0.5, rad, 3.4, 4.9);
  g.strokeStyle = 'rgba(255,255,255,.5)';
  g.lineWidth = rad * 0.18;
  g.stroke();
}

/** Gabestok: to tykke planker med hulrum til hoved og hænder. Åben eller lukket. */
function stocks(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const open = param(o, 'open', false);
  // understøtninger
  for (const s of [-1, 1]) woodRect(g, r, s * W * 0.43 - 5, -H * 0.5, 10, H, [96, 64, 38], { vertical: true, count: 2 });
  const bh = H * 0.36;
  const lowerY = H * 0.5 - bh - 2;
  woodRect(g, r, -W * 0.46, lowerY, W * 0.92, bh, [128, 88, 52], { count: 2, nails: true });
  const upperY = open ? -H * 0.5 + 2 : lowerY - bh * 0.6;
  const pathUp = rectPath(g, -W * 0.46, upperY - (open ? 0 : 0), W * 0.92, bh, 2);
  if (open) {
    g.save();
    g.translate(-W * 0.08, -H * 0.02);
    g.rotate(-0.08);
  }
  woodRect(g, r, -W * 0.46, upperY, W * 0.92, bh, [140, 98, 58], { count: 2, nails: true });
  void pathUp;
  // huller (hoved i midten, hænder ved siden af)
  const hy = upperY + bh;
  for (const [hx, rad] of [[0, H * 0.2], [-W * 0.26, H * 0.12], [W * 0.26, H * 0.12]] as [number, number][]) {
    g.fillStyle = 'rgb(18,10,6)';
    g.beginPath();
    g.ellipse(hx, hy, rad, rad * (open ? 0.7 : 1), 0, 0, 7);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.5;
    g.stroke();
  }
  if (open) g.restore();
  else {
    // hængelås
    ellBody(g, W * 0.38, hy - 2, 4, 4, [84, 86, 92], { lw: 1.1 });
    rectBody(g, W * 0.38 - 2.5, hy + 1, 5, 5, 1, [200, 160, 60], { lw: 0.9 });
  }
  void bloodSmear;
}

/** Skampæl: pæl med jernhalsbånd og kæder, set oppefra med podium. */
function pillory(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 - 1;
  // podium med ringe
  ellBody(g, 0, 0, R, R, [116, 80, 46], { lw: 2 });
  g.save();
  g.beginPath();
  g.arc(0, 0, R - 1, 0, 7);
  g.clip();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.283;
    g.strokeStyle = 'rgba(30,14,4,.45)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    g.stroke();
  }
  mottle(g, r, [-R, -R, R, R], [116, 80, 46], 40, 4, 22, 0.4);
  if (param(o, 'bloody', true)) bloodSmear(g, r, -R * 0.6, -R * 0.2, R * 1.2, R * 0.8, 10);
  g.restore();
  // kæder i jernringe
  const n = 3;
  for (let i = 0; i < n; i++) {
    const a = 1.2 + (i - 1) * 0.9;
    const p: [number, number] = [Math.cos(a) * R * 0.28, Math.sin(a) * R * 0.28];
    const q: [number, number] = [Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78];
    chainLine(g, p, q, 3);
    manacle(g, q[0], q[1], 4, i === 0);
  }
  // pælen
  ellBody(g, 0, 0, R * 0.2, R * 0.2, [92, 62, 36], { lw: 1.6 });
  g.save();
  g.beginPath();
  g.arc(0, 0, R * 0.19, 0, 7);
  g.clip();
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(0, 0, R * 0.04 + i * R * 0.035, 0, 7);
    g.strokeStyle = 'rgba(20,8,0,.3)';
    g.lineWidth = 0.7;
    g.stroke();
  }
  g.restore();
  g.beginPath();
  g.arc(0, 0, R * 0.2, 0, 7);
  g.strokeStyle = 'rgb(100,102,110)';
  g.lineWidth = 2;
  g.stroke();
}

/** Jomfru af jern: sarkofaglignende skab, set oppefra som liggende, med låg og pigge. */
function ironMaiden(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const open = param(o, 'open', false);
  const base: RGB = [92, 94, 102];
  const path = () => {
    g.beginPath();
    g.moveTo(-W * 0.3, -H * 0.5 + 6);
    g.quadraticCurveTo(0, -H * 0.5 - 4, W * 0.3, -H * 0.5 + 6);
    g.lineTo(W * 0.46, -H * 0.2);
    g.lineTo(W * 0.4, H * 0.5 - 4);
    g.lineTo(-W * 0.4, H * 0.5 - 4);
    g.lineTo(-W * 0.46, -H * 0.2);
    g.closePath();
  };
  body(g, path, shift(base, -8), [-W / 2, -H / 2, W / 2, H / 2], { lw: 1.8, ao: 4 });
  if (open) {
    // indersiden med pigge
    g.save();
    path();
    g.clip();
    g.fillStyle = 'rgb(34,22,20)';
    g.fillRect(-W / 2, -H / 2, W, H);
    for (let y = -H * 0.4; y < H * 0.42; y += 8) {
      for (let x = -W * 0.28; x < W * 0.3; x += 8) {
        polyBody(g, [[x, y - 3], [x + 3, y + 2.5], [x - 3, y + 2.5]], [150, 150, 158], { lw: 0.6, ao: 0.2, rim: 0.2 });
      }
    }
    bloodSmear(g, r, -W * 0.3, -H * 0.4, W * 0.6, H * 0.8, 18);
    g.restore();
    path();
    g.strokeStyle = OUT;
    g.lineWidth = 1.8;
    g.stroke();
    // åben dør ved siden
    g.save();
    g.translate(W * 0.5, 0);
    ironRect(g, r, 2, -H * 0.42, W * 0.32, H * 0.84, base, { rivets: true, rust: 0.7 });
    g.restore();
  } else {
    g.save();
    path();
    g.clip();
    // låge i to halvdele med hængsler og et skrækindjagende ansigt (relief)
    g.strokeStyle = 'rgba(10,6,4,.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -H / 2);
    g.lineTo(0, H / 2);
    g.stroke();
    mottle(g, r, [-W / 2, -H / 2, W / 2, H / 2], base, 100, 3, 18, 0.4);
    mottle(g, r, [-W / 2, -H / 2, W / 2, H / 2], [140, 76, 34], 28, 3, 14, 0.4);
    // ansigt
    g.fillStyle = 'rgba(0,0,0,.4)';
    g.beginPath();
    g.ellipse(0, -H * 0.3, W * 0.2, H * 0.13, 0, 0, 7);
    g.fill();
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(s * W * 0.08, -H * 0.31, W * 0.05, H * 0.025, s * 0.2, 0, 7);
      g.fillStyle = 'rgba(10,6,4,.8)';
      g.fill();
    }
    // bånd
    for (const y of [-H * 0.12, H * 0.18, H * 0.38]) {
      g.fillStyle = 'rgba(40,40,46,.7)';
      g.fillRect(-W / 2, y, W, 5);
      g.fillStyle = 'rgba(255,255,255,.2)';
      g.fillRect(-W / 2, y, W, 1.2);
      for (let i = -3; i <= 3; i++) rivet(g, i * W * 0.14, y + 2.5, 1.5, base);
    }
    // blod der sipper
    g.fillStyle = rgb(BLOOD, 0.7);
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.ellipse((r() - 0.5) * W * 0.5, H * 0.46, 1.6, 6 + r() * 8, 0, 0, 7);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.fillRect(-W / 2, -H / 2, W * 0.24, H);
    g.restore();
    path();
    g.strokeStyle = OUT;
    g.lineWidth = 1.8;
    g.stroke();
  }
}

/** Tortur-hjul: stort vognhjul med lænker, liggende på bukke. */
function breakingWheel(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 - 2;
  const hubR = R * 0.14;
  // fælg
  g.beginPath();
  g.arc(0, 0, R * 0.92, 0, 7);
  g.strokeStyle = 'rgba(12,6,2,.88)';
  g.lineWidth = R * 0.16 + 2;
  g.stroke();
  g.strokeStyle = rgb([112, 76, 42]);
  g.lineWidth = R * 0.16;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, R * 0.92, 3.3, 4.8);
  g.strokeStyle = 'rgba(255,230,180,.35)';
  g.lineWidth = R * 0.05;
  g.stroke();
  // jernbånd
  g.beginPath();
  g.arc(0, 0, R * 0.99, 0, 7);
  g.strokeStyle = 'rgb(88,90,96)';
  g.lineWidth = 2.4;
  g.stroke();
  // egere
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283 + 0.2;
    tube(g, () => {
      g.beginPath();
      g.moveTo(Math.cos(a) * hubR, Math.sin(a) * hubR);
      g.lineTo(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88);
    }, R * 0.07, [122, 84, 48], { outline: 1.5 });
  }
  // lænker og pigge
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.283 + 0.85;
    const p: [number, number] = [Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.45];
    const q: [number, number] = [Math.cos(a + 0.12) * R * 0.78, Math.sin(a + 0.12) * R * 0.78];
    chainLine(g, p, q, 0);
    manacle(g, q[0], q[1], 3.6);
  }
  bloodSmear(g, r, -R * 0.5, -R * 0.5, R, R, 14);
  ellBody(g, 0, 0, hubR, hubR, [96, 98, 104], { lw: 1.4 });
  ellBody(g, 0, 0, hubR * 0.4, hubR * 0.4, [40, 40, 44], { lw: 0.8 });
}

/** Bur (hængende: rund, med kæde; stående: firkantet gitter). */
function cage(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const hanging = param(o, 'hanging', true);
  const R = Math.min(o.w, o.h) / 2 - 2;
  const bars = hanging ? 14 : 12;
  const fill = param(o, 'content', 'skeleton');
  const iron: RGB = [88, 90, 98];
  // bundplade og bagside
  ellBody(g, 0, 0, R, R, [30, 22, 20], { lw: 1.4, ao: 1 });
  // indhold
  if (fill === 'skeleton' || fill === 'bones') {
    const bone: RGB = [220, 210, 182];
    for (let i = 0; i < (fill === 'skeleton' ? 7 : 11); i++) {
      const a = r() * 6.283;
      const d = r() * R * 0.55;
      const bx = Math.cos(a) * d;
      const by = Math.sin(a) * d;
      const a2 = r() * 6.283;
      tube(g, () => {
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + Math.cos(a2) * R * 0.3, by + Math.sin(a2) * R * 0.3);
      }, 2.6, bone, { outline: 1.4 });
    }
    if (fill === 'skeleton') {
      ellBody(g, -R * 0.1, -R * 0.1, R * 0.17, R * 0.19, bone, { lw: 1.2 });
      for (const s of [-1, 1]) ellBody(g, -R * 0.1 + s * R * 0.06, -R * 0.13, R * 0.045, R * 0.05, [20, 12, 8], { lw: 0.5, ao: 0 });
    }
  } else if (fill === 'straw') {
    mottle(g, r, [-R * 0.7, -R * 0.7, R * 0.7, R * 0.7], [200, 170, 90], 60, 3, 28, 0.9);
  }
  // tremmer: sæt som radiale/aksiale streger for et kugleformet bur set oppefra
  g.save();
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * 3.1416;
    g.beginPath();
    g.ellipse(0, 0, Math.abs(Math.cos(a)) * R * 0.96 + 0.5, R * 0.96, 0, 0, 7);
    g.strokeStyle = 'rgba(10,6,4,.7)';
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = rgb(iron);
    g.lineWidth = 1.7;
    g.stroke();
  }
  g.restore();
  for (const rr of [R * 0.32, R * 0.64, R * 0.97]) {
    g.beginPath();
    g.arc(0, 0, rr, 0, 7);
    g.strokeStyle = 'rgba(10,6,4,.8)';
    g.lineWidth = 3.4;
    g.stroke();
    g.strokeStyle = rgb(shift(iron, 10));
    g.lineWidth = 2;
    g.stroke();
    g.beginPath();
    g.arc(-0.6, -0.6, rr, 3.4, 4.9);
    g.strokeStyle = 'rgba(255,255,255,.45)';
    g.lineWidth = 0.9;
    g.stroke();
  }
  // topring med kæde
  ellBody(g, 0, 0, R * 0.1, R * 0.1, [74, 76, 82], { lw: 1.2 });
  if (hanging) {
    g.beginPath();
    g.ellipse(0, 0, R * 0.05, R * 0.05, 0, 0, 7);
    g.strokeStyle = 'rgb(150,150,158)';
    g.lineWidth = 1.2;
    g.stroke();
  }
  if (param(o, 'rust', true)) {
    g.save();
    g.beginPath();
    g.arc(0, 0, R, 0, 7);
    g.clip();
    mottle(g, r, [-R, -R, R, R], [150, 80, 36], 20, 3, 12, 0.3);
    g.restore();
  }
}

/** Jernstol med spidser, remme og lænker. */
function spikedChair(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const wc: RGB = [96, 98, 106];
  // sæde med piggeraster
  const sx = -W * 0.38;
  rectBody(g, sx, -H * 0.18, W * 0.76, H * 0.7, 3, wc, { lw: 1.8 });
  for (let y = -H * 0.12; y < H * 0.5; y += 7) {
    for (let x = sx + 5; x < sx + W * 0.74; x += 7) {
      polyBody(g, [[x, y - 2.6], [x + 2.4, y + 1.8], [x - 2.4, y + 1.8]], [168, 170, 178], { lw: 0.5, ao: 0.2, rim: 0.2 });
    }
  }
  // ryglæn mod toppen
  ironRect(g, r, -W * 0.44, -H * 0.5, W * 0.88, H * 0.28, wc, { rivets: true, rust: 0.8 });
  for (let i = -3; i <= 3; i++) polyBody(g, [[i * W * 0.11, -H * 0.5 + 3], [i * W * 0.11 + 2.6, -H * 0.42], [i * W * 0.11 - 2.6, -H * 0.42]], [168, 170, 178], { lw: 0.5, ao: 0.2, rim: 0.2 });
  // armlæn med remme og lænker
  for (const s of [-1, 1]) {
    ironRect(g, r, s * W * 0.44 - (s > 0 ? 0 : 6), -H * 0.18, 6, H * 0.5, wc);
    g.fillStyle = 'rgb(86,52,28)';
    g.fillRect(s * W * 0.44 - 5 + (s > 0 ? 0 : 5), -H * 0.02, 16 * s > 0 ? -12 : 12, 5);
    manacle(g, s * W * 0.33, 0, 3.4, true);
  }
  chainLine(g, [-W * 0.3, H * 0.62 - 6], [W * 0.3, H * 0.62 - 6], 6);
  bloodSmear(g, r, -W * 0.3, 0, W * 0.6, H * 0.4, 9);
}

/** Glødekar med tortur-jern i. */
function brazierIrons(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 - 2;
  // tre ben
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.283 - 1.57;
    tube(g, () => {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * R * 1.0, Math.sin(a) * R * 1.0);
    }, 3.4, [70, 70, 76]);
  }
  ellBody(g, 0, 0, R * 0.82, R * 0.82, [64, 62, 66], { lw: 2 });
  ellBody(g, 0, 0, R * 0.7, R * 0.7, [24, 18, 16], { lw: 1, ao: 5 });
  g.save();
  g.beginPath();
  g.arc(0, 0, R * 0.68, 0, 7);
  g.clip();
  g.fillStyle = radial(g, 0, 0, R * 0.7, [[0, 'rgb(255,220,110)'], [0.4, 'rgb(240,110,28)'], [1, 'rgb(90,24,10)']]);
  g.fillRect(-R, -R, R * 2, R * 2);
  for (let i = 0; i < 22; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * R * 0.6;
    g.fillStyle = r() < 0.5 ? 'rgba(40,24,20,.6)' : 'rgba(255,230,150,.8)';
    g.beginPath();
    g.ellipse(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 3, 0.8 + r() * 1.6, r() * 3, 0, 7);
    g.fill();
  }
  g.restore();
  // glødende jern
  for (let i = 0; i < 3; i++) {
    const a = -0.6 + i * 0.6;
    tube(g, () => {
      g.beginPath();
      g.moveTo(-R * 0.1, R * 0.05 * i);
      g.lineTo(Math.cos(a) * R * 0.95 + R * 0.1, Math.sin(a) * R * 0.6 + R * 0.1 * i);
    }, 2.6, [220, 90, 34], { outline: 1.2 });
    g.fillStyle = 'rgba(255,230,160,.85)';
    g.beginPath();
    g.arc(-R * 0.1, R * 0.05 * i, 2, 0, 7);
    g.fill();
  }
  const gl = radial(g, 0, 0, R * 1.1, [[0, 'rgba(255,170,50,.4)'], [1, 'rgba(255,100,20,0)']]);
  g.fillStyle = gl;
  g.beginPath();
  g.arc(0, 0, R * 1.1, 0, 7);
  g.fill();
}

/** Blodigt bord med remme og værktøj. */
function bloodyTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [100, 68, 40], { count: 5, vertical: true, nails: true, rad: 3, wear: 1 });
  g.save();
  g.beginPath();
  g.rect(-W / 2 + 2, -H / 2 + 2, W - 4, H - 4);
  g.clip();
  // stor blodpøl og striber
  const pts = wobble(r, -W * 0.05, 0, W * 0.28, H * 0.3, 12, 0.3);
  g.fillStyle = 'rgba(100,10,10,.7)';
  blobPath(g, pts)();
  g.fill();
  g.fillStyle = 'rgba(160,30,24,.35)';
  g.beginPath();
  g.ellipse(-W * 0.12, -H * 0.06, W * 0.1, H * 0.1, 0.4, 0, 7);
  g.fill();
  bloodSmear(g, r, -W * 0.45, -H * 0.45, W * 0.9, H * 0.9, 26);
  g.restore();
  // remme
  for (const y of [-H * 0.3, H * 0.28]) {
    rectBody(g, -W / 2 - 1, y, W + 2, 4.5, 1, [86, 52, 28], { lw: 1 });
    rivet(g, -W * 0.3, y + 2.2, 1.4, [140, 140, 148]);
    rivet(g, W * 0.3, y + 2.2, 1.4, [140, 140, 148]);
  }
  // værktøj: tænger, sav, kniv, hammer
  const tools: [number, number, number][] = [[W * 0.32, -H * 0.2, 0.3], [W * 0.34, H * 0.05, -0.2], [W * 0.3, H * 0.3, 0.1]];
  tools.forEach(([x, y, a], i) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    const hand = rgb([100, 64, 34]);
    g.fillStyle = hand;
    g.fillRect(-11, -1.4, 10, 2.8);
    g.strokeStyle = OUT;
    g.lineWidth = 0.8;
    g.strokeRect(-11, -1.4, 10, 2.8);
    if (i === 0) {
      polyBody(g, [[-1, -2], [10, -4.5], [12, -3], [3, 0], [12, 3], [10, 4.5], [-1, 2]], [150, 152, 160], { lw: 0.8, ao: 0.3, rim: 0.3 });
    } else if (i === 1) {
      polyBody(g, [[-1, -1.5], [14, -1.5], [14, 3], [-1, 1.5]], [170, 174, 184], { lw: 0.8, ao: 0.3, rim: 0.3 });
      g.fillStyle = 'rgba(120,10,10,.75)';
      g.fillRect(5, -1, 8, 2);
    } else {
      polyBody(g, [[-1, -2], [11, -1], [11, 1.5], [-1, 2]], [160, 164, 174], { lw: 0.8, ao: 0.3, rim: 0.3 });
    }
    g.restore();
  });
}

/** Drukningstank: rund kar med vand og hejseværk. */
function dunkTank(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // kar
  const R = Math.min(W * 0.34, H * 0.42);
  const cx = -W * 0.1;
  ellBody(g, cx, 0, R, R, [116, 78, 44], { lw: 2 });
  g.save();
  g.beginPath();
  g.arc(cx, 0, R - 1, 0, 7);
  g.clip();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 6.283;
    g.strokeStyle = 'rgba(20,8,0,.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8);
    g.lineTo(cx + Math.cos(a) * R, Math.sin(a) * R);
    g.stroke();
  }
  g.restore();
  g.beginPath();
  g.arc(cx, 0, R * 0.9, 0, 7);
  g.strokeStyle = 'rgb(86,88,94)';
  g.lineWidth = 2.4;
  g.stroke();
  const ir = R * 0.78;
  ellBody(g, cx, 0, ir, ir, [26, 48, 56], { lw: 1.2, ao: 4 });
  g.fillStyle = radial(g, cx, 0, ir, [[0, 'rgb(70,110,120)'], [1, 'rgb(22,44,56)']]);
  g.beginPath();
  g.arc(cx, 0, ir * 0.94, 0, 7);
  g.fill();
  g.strokeStyle = 'rgba(190,225,235,.4)';
  g.lineWidth = 0.9;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.ellipse(cx + (r() - 0.5) * ir, (r() - 0.5) * ir, 4 + r() * 8, 2 + r() * 4, 0, 0, 7);
    g.stroke();
  }
  // en sunket hånd/ansigt
  g.fillStyle = 'rgba(210,190,160,.35)';
  g.beginPath();
  g.ellipse(cx + ir * 0.1, ir * 0.1, 6, 8, 0.4, 0, 7);
  g.fill();
  // hejseværk: stolpe og bom
  woodRect(g, r, W * 0.26, -H * 0.46, 10, H * 0.92, [108, 74, 42], { vertical: true, count: 2 });
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.31, -H * 0.2);
    g.lineTo(cx + ir * 0.1, 0);
  }, 4, [122, 84, 48]);
  chainLine(g, [cx + ir * 0.1, 0], [cx + ir * 0.1, ir * 0.3], 0);
  manacle(g, cx + ir * 0.1, ir * 0.36, 3.6);
  // vippe
  ellBody(g, W * 0.31, H * 0.36, 5, 5, [86, 88, 94], { lw: 1.1 });
}

/** Galge set oppefra: platform med faldlem, reb og stolpe. */
function gallows(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [122, 86, 50], { count: 7, vertical: false, nails: true, rad: 3 });
  // faldlem (åben)
  const open = param(o, 'open', false);
  const tx = -W * 0.2;
  const ty = -H * 0.2;
  const tw = W * 0.4;
  const th = H * 0.4;
  if (open) {
    rectBody(g, tx, ty, tw, th, 1, [12, 8, 6], { lw: 1.3, ao: 6 });
    g.fillStyle = 'rgba(0,0,0,.6)';
    g.fillRect(tx + 1, ty + 1, tw - 2, th - 2);
    // klap hængende
    polyBody(g, [[tx, ty + th], [tx + tw, ty + th], [tx + tw, ty + th + 5], [tx, ty + th + 5]], [100, 68, 40], { lw: 1 });
  } else {
    rectBody(g, tx, ty, tw, th, 1, [112, 76, 44], { lw: 1.3 });
    g.strokeStyle = 'rgba(20,10,4,.5)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(tx, ty + th / 2);
    g.lineTo(tx + tw, ty + th / 2);
    g.stroke();
    rectBody(g, tx + tw / 2 - 4, ty + th - 5, 8, 3, 1, [76, 78, 84], { lw: 0.8 });
  }
  // gabelstolper og tværbjælke (set oppefra: kort og tyk)
  const post = (x: number) => woodRect(g, r, x - 5, -H * 0.47, 10, 10, [92, 62, 36], { count: 1, rad: 1, wear: 0 });
  post(-W * 0.38);
  woodRect(g, r, -W * 0.38, -H * 0.47 + 2, W * 0.5, 7, [100, 68, 40], { count: 1, rad: 1 });
  // reb
  rope(g, [[-W * 0.2, -H * 0.43], [-W * 0.18, -H * 0.1], [-W * 0.1, -H * 0.08]], 2.8, [186, 154, 98]);
  g.beginPath();
  g.ellipse(-W * 0.08, -H * 0.06, 6, 5, 0.2, 0, 7);
  g.strokeStyle = 'rgba(14,8,3,.8)';
  g.lineWidth = 4.4;
  g.stroke();
  g.strokeStyle = 'rgb(186,154,98)';
  g.lineWidth = 3;
  g.stroke();
  // trappe nederst
  for (let i = 0; i < 4; i++) rectBody(g, W * 0.3, H * 0.1 + i * 7, W * 0.2, 6, 0.5, [140, 98, 58], { lw: 0.9 });
  void crack;
  void vary;
  void coin;
}

/** Faldøkse (guillotine) set oppefra: ramme, blok og kurv. */
function guillotine(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H * 0.5 + 1, W - 2, H * 0.36, [126, 88, 50], { count: 3, rad: 3 });
  // to stolper, tværbjælke og kniv (skråt)
  for (const s of [-1, 1]) woodRect(g, r, s * W * 0.2 - 4.5, -H * 0.5 + 6, 9, 9, [92, 62, 36], { count: 1, rad: 1, wear: 0 });
  polyBody(g, [[-W * 0.21, -H * 0.4], [W * 0.21, -H * 0.4], [W * 0.21, -H * 0.3], [-W * 0.21, -H * 0.24]], [168, 172, 182], { lw: 1.3, ao: 1 });
  g.strokeStyle = 'rgba(255,255,255,.7)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-W * 0.2, -H * 0.25);
  g.lineTo(W * 0.2, -H * 0.3);
  g.stroke();
  // pude og blok
  woodRect(g, r, -W * 0.28, -H * 0.1, W * 0.56, H * 0.18, [96, 66, 40], { count: 1, rad: 2 });
  ellBody(g, 0, -H * 0.01, W * 0.12, H * 0.05, [70, 50, 34], { lw: 1.2, ao: 2 });
  // kurv med blod og rebet
  const bx = 0;
  const by = H * 0.32;
  ellBody(g, bx, by, W * 0.22, H * 0.15, [150, 104, 58], { lw: 1.5 });
  ellBody(g, bx, by, W * 0.18, H * 0.11, [34, 16, 10], { lw: 0.9, ao: 3 });
  g.fillStyle = rgb(BLOOD, 0.7);
  g.beginPath();
  g.ellipse(bx, by, W * 0.12, H * 0.06, 0, 0, 7);
  g.fill();
  bloodSmear(g, r, -W * 0.3, -H * 0.1, W * 0.6, H * 0.4, 12);
  rope(g, [[W * 0.3, -H * 0.4], [W * 0.38, -H * 0.1], [W * 0.34, H * 0.2]], 2, [170, 140, 90]);
}

/** Lænker i væg/gulv: manchetter med kæde. */
function wallShackles(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // jernplade
  ironRect(g, r, -W * 0.5 + 1, -H * 0.5 + 1, W - 2, H * 0.26, [86, 88, 96], { rivets: true, rust: 0.7 });
  const n = param(o, 'pairs', 2);
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : -W * 0.28 + i * W * 0.56;
    chainLine(g, [x, -H * 0.24], [x + (r() - 0.5) * 8, H * 0.2], 5);
    manacle(g, x + (r() - 0.5) * 8, H * 0.28, Math.min(W, H) * 0.14, i === 1);
  }
  g.save();
  g.restore();
}

export const tortureKinds: ObjectKind[] = [
  kind({ key: 'torture_stocks', family: 'torture', name: 'Gabestok', w: 2.4, h: 1.5, keepAspect: false, shadow: 5, bleed: 0.06, params: [{ key: 'open', label: 'Åben', type: 'toggle', default: false }], tags: ['city', 'village', 'dungeon', 'military'], draw: stocks }),
  kind({ key: 'torture_pillory', family: 'torture', name: 'Skampæl', w: 2, h: 2, shadow: 5, bleed: 0.04, params: [{ key: 'bloody', label: 'Blod', type: 'toggle', default: true }], tags: ['city', 'village', 'dungeon'], draw: pillory }),
  kind({ key: 'torture_iron_maiden', family: 'torture', name: 'Jomfru af jern', w: 1.2, h: 2.2, keepAspect: false, shadow: 6, bleed: 0.12, params: [{ key: 'open', label: 'Åben', type: 'toggle', default: false }], tags: ['dungeon', 'military'], draw: ironMaiden }),
  kind({ key: 'torture_wheel', family: 'torture', name: 'Tortur-hjul', w: 2.4, h: 2.4, shadow: 6, bleed: 0.03, randomRotation: true, tags: ['dungeon', 'military', 'city'], draw: breakingWheel }),
  kind({
    key: 'torture_cage', family: 'torture', name: 'Rundt bur', w: 1.6, h: 1.6, shadow: 8, bleed: 0.06, randomRotation: true,
    params: [
      { key: 'hanging', label: 'Hængende', type: 'toggle', default: true },
      { key: 'content', label: 'Indhold', type: 'select', default: 'skeleton', options: [{ value: 'skeleton', label: 'Skelet' }, { value: 'bones', label: 'Knogler' }, { value: 'straw', label: 'Halm' }, { value: 'empty', label: 'Tomt' }] },
      { key: 'rust', label: 'Rust', type: 'toggle', default: true },
    ],
    tags: ['dungeon', 'city', 'military'], draw: cage,
  }),
  kind({ key: 'torture_chair', family: 'torture', name: 'Jernstol med pigge', w: 1.2, h: 1.5, keepAspect: false, shadow: 5, bleed: 0.08, tags: ['dungeon', 'military'], draw: spikedChair }),
  kind({ key: 'torture_brazier', family: 'torture', name: 'Glødekar med jern', w: 1.4, h: 1.4, shadow: 6, bleed: 0.12, randomRotation: true, tags: ['dungeon', 'military', 'indoor'], draw: brazierIrons }),
  kind({ key: 'torture_table', family: 'torture', name: 'Blodigt tortur-bord', w: 1.4, h: 2.4, keepAspect: false, shadow: 5, bleed: 0.06, tags: ['dungeon', 'military'], draw: bloodyTable }),
  kind({ key: 'torture_dunk_tank', family: 'torture', name: 'Drukningstank', w: 2.6, h: 1.8, keepAspect: false, shadow: 6, bleed: 0.04, tags: ['dungeon', 'city', 'military'], draw: dunkTank }),
  kind({ key: 'torture_gallows', family: 'torture', name: 'Galge', w: 3, h: 2, keepAspect: false, shadow: 6, bleed: 0.05, params: [{ key: 'open', label: 'Faldlem åben', type: 'toggle', default: false }], tags: ['city', 'village', 'dungeon', 'military', 'outdoor'], draw: gallows }),
  kind({ key: 'torture_guillotine', family: 'torture', name: 'Faldøkse', w: 2, h: 2.4, keepAspect: false, shadow: 6, bleed: 0.06, tags: ['city', 'dungeon', 'military'], draw: guillotine }),
  kind({ key: 'torture_shackles', family: 'torture', name: 'Lænker i væg', w: 1.6, h: 1.4, keepAspect: false, shadow: 3, bleed: 0.08, params: [{ key: 'pairs', label: 'Par', type: 'range', min: 1, max: 2, step: 1, default: 2 }], tags: ['dungeon', 'military', 'cave'], draw: wallShackles }),
];

void IRON;
void lin;
