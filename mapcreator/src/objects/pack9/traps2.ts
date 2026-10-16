import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { ellBody, polyBody, rectBody, rope, rivet } from '../pack2/helpers';
import { blobPath, clipped, FLOOR, glow, holePts, lin, mottle, OUT, radial, rgb, shift, slab, stateParam, type G, type RGB } from './common';

/** Et lille fjederbeslag/dart: skaft, fjer og spids set oppefra; (x,y) = spidsen, `ang` = retning, den peger hen mod spidsen. */
function dart(g: G, x: number, y: number, ang: number, len: number, fletch: RGB = [176, 40, 36]): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(10,5,2,.7)';
  g.lineWidth = len * 0.1 + 1.4;
  g.beginPath();
  g.moveTo(-len, 0);
  g.lineTo(0, 0);
  g.stroke();
  g.strokeStyle = 'rgb(150,112,66)';
  g.lineWidth = len * 0.1;
  g.stroke();
  // fjer
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(-len, 0);
    g.lineTo(-len * 0.72, s * len * 0.17);
    g.lineTo(-len * 0.6, 0);
    g.closePath();
    g.fillStyle = rgb(fletch);
    g.fill();
    g.strokeStyle = 'rgba(10,5,2,.6)';
    g.lineWidth = 0.6;
    g.stroke();
  }
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(len * 0.16, 0);
  g.strokeStyle = 'rgb(190,194,204)';
  g.lineWidth = len * 0.12;
  g.stroke();
  g.restore();
}

/** Murstenstop (vægkrone set oppefra) med fuger. */
function wallTop(g: G, r: () => number, x: number, y: number, w: number, h: number, base: RGB): void {
  rectBody(g, x, y, w, h, h * 0.06, base, { lw: Math.max(1.4, h * 0.04), ao: h * 0.07 });
  clipped(g, () => { g.beginPath(); g.rect(x, y, w, h); }, () => {
    const bw = h * 0.9;
    g.strokeStyle = 'rgba(14,8,4,.5)';
    g.lineWidth = Math.max(0.8, h * 0.025);
    g.beginPath();
    g.moveTo(x, y + h / 2);
    g.lineTo(x + w, y + h / 2);
    for (let bx = x + bw * (0.3 + r() * 0.4); bx < x + w; bx += bw * (0.8 + r() * 0.5)) {
      g.moveTo(bx, y);
      g.lineTo(bx, y + h / 2);
    }
    for (let bx = x + bw * (0.5 + r() * 0.5); bx < x + w; bx += bw * (0.8 + r() * 0.5)) {
      g.moveTo(bx, y + h / 2);
      g.lineTo(bx, y + h);
    }
    g.stroke();
    mottle(g, r, [x, y, x + w, y + h], base, 24, h * 0.1, 22, 0.32);
  });
}

function dartWall(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const n = Math.round(Math.max(2, w / 55));
  const fired = param(o, 'state', 'fired') === 'fired';
  slab(g, r, -w * 0.49, -h * 0.05, w * 0.98, h * 0.53, [112, 106, 98], { cracks: 2, rad: h * 0.03 });
  wallTop(g, r, -w / 2, -h / 2, w, h * 0.46, [118, 112, 104]);
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + ((i + 0.5) * w) / n;
    // lille åbning i vægkronens nederste kant (skydespalte)
    g.fillStyle = 'rgb(8,5,4)';
    g.beginPath();
    g.rect(cx - h * 0.055, -h * 0.07, h * 0.11, h * 0.07);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.9)';
    g.lineWidth = 1.3;
    g.stroke();
    if (fired) {
      for (let k = 0; k < 2; k++) {
        const a = Math.PI / 2 + (r() - 0.5) * 0.5;
        dart(g, cx + (r() - 0.5) * h * 0.25, h * (0.12 + r() * 0.3), a, h * 0.22);
      }
    }
  }
}

function dartFloor(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  const fired = param(o, 'state', 'fired') === 'fired';
  slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, [118, 112, 104], { cracks: 3, rad: S * 0.04 });
  const n = 4;
  const gap = (S * 0.7) / (n - 1);
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
    const x = -S * 0.35 + ix * gap;
    const y = -S * 0.35 + iy * gap;
    g.fillStyle = 'rgb(6,4,3)';
    g.beginPath();
    g.arc(x, y, S * 0.045, 0, 7);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.85)';
    g.lineWidth = 1.2;
    g.stroke();
    g.strokeStyle = 'rgba(210,200,180,.32)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(x, y, S * 0.055, Math.PI * 0.95, Math.PI * 1.65);
    g.stroke();
    if (fired && r() < 0.45) {
      // dart, der stikker lige op: kun fjerene og skaftet ses som en lille stjerne
      g.save();
      g.translate(x, y);
      for (let k = 0; k < 4; k++) {
        g.rotate(Math.PI / 2);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(S * 0.05, -S * 0.02);
        g.lineTo(S * 0.075, 0);
        g.lineTo(S * 0.05, S * 0.02);
        g.closePath();
        g.fillStyle = 'rgb(176,40,36)';
        g.fill();
      }
      g.beginPath();
      g.arc(0, 0, S * 0.018, 0, 7);
      g.fillStyle = 'rgb(190,194,204)';
      g.fill();
      g.restore();
    }
  }
}

// ---------------------------------------------------------------- klinger

function sawDisc(g: G, cx: number, cy: number, R: number, rot: number, teeth = 22): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  const pts: [number, number][] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? R * 0.86 : R;
    const a2 = a + (i % 2 ? 0 : 0.05);
    pts.push([Math.cos(a2) * rr, Math.sin(a2) * rr]);
  }
  polyBody(g, pts, [162, 168, 178], { lw: Math.max(1.2, R * 0.04), ao: R * 0.06, light: 50, dark: 50 });
  g.beginPath();
  g.arc(0, 0, R * 0.7, 0, 7);
  g.strokeStyle = 'rgba(20,14,10,.35)';
  g.lineWidth = R * 0.03;
  g.stroke();
  // lysglans, der ikke drejer med skiven
  g.rotate(-rot);
  g.beginPath();
  g.arc(0, 0, R * 0.8, Math.PI * 1.05, Math.PI * 1.55);
  g.strokeStyle = 'rgba(255,255,255,.5)';
  g.lineWidth = R * 0.08;
  g.stroke();
  // huller og nav
  g.rotate(rot);
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(Math.cos((i / 5) * 6.28) * R * 0.42, Math.sin((i / 5) * 6.28) * R * 0.42, R * 0.08, 0, 7);
    g.fillStyle = 'rgba(12,8,6,.8)';
    g.fill();
  }
  g.beginPath();
  g.arc(0, 0, R * 0.17, 0, 7);
  g.fillStyle = radial(g, 0, 0, R * 0.17, [[0, 'rgb(220,206,170)'], [1, 'rgb(90,74,50)']], -R * 0.05, -R * 0.05, 0.1);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}

function sawTrack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const pos = param(o, 'pos', 0.3);
  const R = h * 0.42;
  slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, [112, 106, 98], { cracks: 2, rad: h * 0.05 });
  // sporet
  rectBody(g, -w * 0.45, -h * 0.17, w * 0.9, h * 0.34, h * 0.17, [14, 11, 10], { lw: Math.max(1.4, h * 0.035), ao: h * 0.04 });
  g.fillStyle = 'rgba(160,150,130,.15)';
  g.fillRect(-w * 0.43, -h * 0.15, w * 0.86, h * 0.02);
  const cx = (-w / 2 + R + (w - R * 2) * pos) * 0.9;
  g.fillStyle = 'rgba(0,0,0,.4)';
  g.beginPath();
  g.arc(cx + R * 0.1, R * 0.1, R, 0, 7);
  g.fill();
  sawDisc(g, cx, 0, R, r() * 6);
  if (param(o, 'bloody', false)) {
    g.fillStyle = 'rgba(120,14,18,.55)';
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.ellipse(cx + (r() - 0.5) * R * 1.5, (r() - 0.5) * R * 1.5, R * 0.1, R * 0.08, r() * 3, 0, 7);
      g.fill();
    }
  }
}

function sawPit(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  ellBody(g, 0, 0, R * 0.96, R * 0.96, [112, 106, 98], { lw: R * 0.04, ao: R * 0.05 });
  g.beginPath();
  g.arc(0, 0, R * 0.8, 0, 7);
  g.fillStyle = 'rgb(10,8,7)';
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.8)';
  g.lineWidth = R * 0.05;
  g.stroke();
  g.beginPath();
  g.arc(-R * 0.02, -R * 0.02, R * 0.8, Math.PI * 0.95, Math.PI * 1.6);
  g.strokeStyle = 'rgba(190,176,150,.22)';
  g.lineWidth = R * 0.04;
  g.stroke();
  sawDisc(g, 0, 0, R * 0.74, r() * 6, 26);
}

function bladeSlots(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const S = Math.min(w, h);
  const out = param(o, 'state', 'out');
  slab(g, r, -w * 0.49, -h * 0.49, w * 0.98, h * 0.98, [116, 110, 102], { cracks: 2, rad: S * 0.04 });
  const n = 4;
  for (let i = 0; i < n; i++) {
    const y = -h * 0.36 + ((i + 0.5) * h * 0.72) / n;
    const x0 = -w * 0.4;
    const len = w * 0.8;
    g.fillStyle = 'rgb(8,6,5)';
    g.fillRect(x0, y - S * 0.035, len, S * 0.07);
    g.strokeStyle = 'rgba(0,0,0,.85)';
    g.lineWidth = 1.2;
    g.strokeRect(x0, y - S * 0.035, len, S * 0.07);
    if (out !== 'in') {
      const bl = out === 'out' ? len * 0.96 : len * 0.5;
      const bx = x0 + (len - bl) / 2;
      // klingen set oppefra: tynd stålskinne med glans langs ryggen
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(bx + 1.5, y - S * 0.02 + 1.8, bl, S * 0.045);
      g.fillStyle = lin(g, 0, y - S * 0.03, 0, y + S * 0.03, [[0, 'rgb(226,230,238)'], [0.5, 'rgb(150,156,168)'], [1, 'rgb(70,74,84)']]);
      g.fillRect(bx, y - S * 0.025, bl, S * 0.05);
      g.strokeStyle = 'rgba(16,10,6,.8)';
      g.lineWidth = 1;
      g.strokeRect(bx, y - S * 0.025, bl, S * 0.05);
    }
  }
}

// ---------------------------------------------------------------- snubletråd og bjørnesaks

function tripwire(g: G, o: DrawInput, style: 'plain' | 'bells' | 'crossbow'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const x0 = -w * 0.44;
  const x1 = w * 0.44;
  const sag = h * 0.08 * (r() - 0.5);
  const trace = () => {
    g.beginPath();
    g.moveTo(x0, 0);
    g.quadraticCurveTo(0, sag, x1, 0);
  };
  // løv og jordpletter omkring
  for (let i = 0; i < 10; i++) {
    g.fillStyle = rgb([120 + r() * 50, 90 + r() * 30, 44], 0.7);
    g.beginPath();
    g.ellipse((r() - 0.5) * w * 0.9, (r() - 0.5) * h * 0.8, h * 0.07, h * 0.04, r() * 3, 0, 7);
    g.fill();
  }
  g.lineCap = 'round';
  trace();
  g.strokeStyle = 'rgba(8,4,2,.5)';
  g.lineWidth = Math.max(2.4, h * 0.1);
  g.translate(0.8, 1.2);
  g.stroke();
  g.translate(-0.8, -1.2);
  trace();
  g.strokeStyle = 'rgb(176,178,184)';
  g.lineWidth = Math.max(1, h * 0.04);
  g.stroke();
  trace();
  g.setLineDash([h * 0.4, h * 1.3]);
  g.strokeStyle = 'rgba(255,255,255,.9)';
  g.lineWidth = Math.max(0.8, h * 0.025);
  g.stroke();
  g.setLineDash([]);
  if (style === 'bells') {
    for (const t of [0.25, 0.5, 0.75]) {
      const bx = x0 + (x1 - x0) * t;
      const by = sag * 2 * t * (1 - t);
      g.fillStyle = 'rgba(0,0,0,.4)';
      g.beginPath();
      g.arc(bx + 1.5, by + 2, h * 0.11, 0, 7);
      g.fill();
      g.beginPath();
      g.arc(bx, by, h * 0.11, 0, 7);
      g.fillStyle = radial(g, bx, by, h * 0.11, [[0, 'rgb(255,236,150)'], [0.5, 'rgb(210,160,50)'], [1, 'rgb(110,70,16)']], bx - 2, by - 2, 0.3);
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = 1;
      g.stroke();
    }
  }
  const peg = (x: number) => {
    g.fillStyle = 'rgba(0,0,0,.4)';
    g.beginPath();
    g.arc(x + 1.5, 2, h * 0.17, 0, 7);
    g.fill();
    g.beginPath();
    g.arc(x, 0, h * 0.16, 0, 7);
    g.fillStyle = radial(g, x, 0, h * 0.16, [[0, 'rgb(166,126,80)'], [1, 'rgb(86,58,30)']], x - 2, -2, 0.3);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.2;
    g.stroke();
    g.beginPath();
    g.arc(x, 0, h * 0.065, 0, 7);
    g.strokeStyle = 'rgb(190,192,200)';
    g.lineWidth = 1.2;
    g.stroke();
  };
  peg(x0);
  if (style === 'crossbow') {
    // armbrøst monteret ved højre ende, peger mod venstre
    g.save();
    g.translate(x1 + h * 0.2, 0);
    rectBody(g, -h * 0.55, -h * 0.07, h * 0.7, h * 0.14, 2, [120, 84, 50], { lw: 1.2 });
    g.beginPath();
    g.moveTo(-h * 0.4, -h * 0.5);
    g.quadraticCurveTo(-h * 0.7, 0, -h * 0.4, h * 0.5);
    g.strokeStyle = OUT;
    g.lineWidth = h * 0.09 + 1.4;
    g.stroke();
    g.strokeStyle = 'rgb(100,70,40)';
    g.lineWidth = h * 0.09;
    g.stroke();
    g.beginPath();
    g.moveTo(-h * 0.4, -h * 0.5);
    g.lineTo(-h * 0.2, 0);
    g.lineTo(-h * 0.4, h * 0.5);
    g.strokeStyle = 'rgba(230,220,190,.85)';
    g.lineWidth = 1;
    g.stroke();
    dart(g, -h * 0.5, 0, Math.PI, h * 0.4);
    g.restore();
  } else peg(x1);
}

function bearTrap(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const open = param(o, 'state', 'open') === 'open';
  const steel: RGB = [112, 114, 122];
  // kæde
  const chain: [number, number][] = [[0, S * 0.1], [S * 0.18, S * 0.36], [S * 0.1, S * 0.52], [S * 0.36, S * 0.6]];
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const tr = () => { g.beginPath(); chain.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
  tr();
  g.strokeStyle = 'rgba(8,4,2,.7)';
  g.lineWidth = S * 0.06;
  g.stroke();
  tr();
  g.setLineDash([S * 0.05, S * 0.025]);
  g.strokeStyle = 'rgb(138,140,148)';
  g.lineWidth = S * 0.035;
  g.stroke();
  g.setLineDash([]);
  g.beginPath();
  g.arc(S * 0.36, S * 0.6, S * 0.06, 0, 7);
  g.strokeStyle = OUT;
  g.lineWidth = S * 0.04;
  g.stroke();
  // grundramme og kæber
  const jaws = (dy: number, dir: number) => {
    const pts: [number, number][] = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (i / n);
      pts.push([Math.cos(a) * S * 0.38, dir * Math.sin(a) * S * 0.38 * (open ? 1 : 0.18) + dy]);
    }
    for (let i = n; i >= 0; i--) {
      const a = Math.PI * (i / n);
      pts.push([Math.cos(a) * S * 0.3, dir * Math.sin(a) * S * 0.3 * (open ? 1 : 0.14) + dy]);
    }
    return pts;
  };
  // grundplade
  rectBody(g, -S * 0.42, -S * 0.07, S * 0.84, S * 0.14, S * 0.04, steel, { lw: 1.4 });
  for (const dir of [-1, 1]) {
    const pts = jaws(0, dir);
    polyBody(g, pts, steel, { lw: Math.max(1.2, S * 0.025), ao: S * 0.02, light: 36 });
    // tænder langs den indre kant
    const nt = 9;
    for (let i = 0; i < nt; i++) {
      const a = Math.PI * ((i + 0.5) / nt);
      const ro = S * 0.3 * (open ? 1 : 0.14);
      const x = Math.cos(a) * S * 0.3;
      const y = dir * Math.sin(a) * ro;
      const ang = Math.atan2(-dir * Math.sin(a) * (open ? 1 : 0.2), -Math.cos(a) * 0.2) + (open ? 0 : dir * 1.2);
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.beginPath();
      g.moveTo(0, -S * 0.025);
      g.lineTo(S * 0.075, 0);
      g.lineTo(0, S * 0.025);
      g.closePath();
      g.fillStyle = 'rgb(206,208,214)';
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = 0.9;
      g.stroke();
      g.restore();
    }
  }
  // udløserplade i midten og fjedre
  ellBody(g, 0, 0, S * 0.11, S * 0.09, [150, 120, 70], { lw: 1.2 });
  for (const sx of [-1, 1]) {
    g.save();
    g.translate(sx * S * 0.4, 0);
    g.strokeStyle = 'rgba(8,4,2,.7)';
    g.lineWidth = S * 0.05;
    g.beginPath();
    g.moveTo(0, -S * 0.1);
    g.lineTo(0, S * 0.1);
    g.stroke();
    g.setLineDash([S * 0.02, S * 0.025]);
    g.strokeStyle = 'rgb(176,128,70)';
    g.lineWidth = S * 0.035;
    g.stroke();
    g.setLineDash([]);
    g.restore();
  }
  rivet(g, -S * 0.2, 0, S * 0.025);
  rivet(g, S * 0.2, 0, S * 0.025);
  if (!open && r() < 0.6) {
    g.fillStyle = 'rgba(120,14,18,.55)';
    g.beginPath();
    g.ellipse(0, 0, S * 0.12, S * 0.06, 0.3, 0, 7);
    g.fill();
  }
}

function snare(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  for (let i = 0; i < 24; i++) {
    g.fillStyle = rgb([110 + r() * 60, 84 + r() * 30, 40], 0.75);
    g.beginPath();
    g.ellipse((r() - 0.5) * R * 1.8, (r() - 0.5) * R * 1.8, R * 0.09, R * 0.05, r() * 3, 0, 7);
    g.fill();
  }
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 13) * Math.PI * 1.9 + 0.4;
    pts.push([Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5]);
  }
  pts.push([R * 0.55, R * 0.2], [R * 0.78, R * 0.1]);
  rope(g, pts, Math.max(2, R * 0.075), [168, 138, 84]);
  // pæl
  g.fillStyle = 'rgba(0,0,0,.4)';
  g.beginPath();
  g.arc(R * 0.82, R * 0.12, R * 0.12, 0, 7);
  g.fill();
  ellBody(g, R * 0.78, R * 0.1, R * 0.11, R * 0.11, [128, 92, 54], { lw: 1.2 });
}

function net(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const sprung = param(o, 'state', 'laid') === 'sprung';
  const body = blobPath(g, holePts(r, R * (sprung ? 0.75 : 0.92), R * (sprung ? 0.65 : 0.92), sprung ? 0.2 : 0.07, 18));
  const cord: RGB = [168, 140, 92];
  clipped(g, body, () => {
    g.fillStyle = 'rgba(30,18,8,.18)';
    g.fillRect(-R, -R, R * 2, R * 2);
    g.save();
    g.rotate(r() * 1.2 + Math.PI / 4);
    const step = R * 0.19;
    for (const [col, lw, a, off] of [['rgba(10,4,0,.7)', 2.4, 1, 1], [rgb(shift(cord, 6)), 1.2, 1, 0]] as const) {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      for (let i = -12; i <= 12; i++) {
        const wob = (r() - 0.5) * (sprung ? 6 : 1.4);
        g.moveTo(i * step + off + wob, -R * 1.5);
        g.quadraticCurveTo(i * step + off + wob * 3, 0, i * step + off, R * 1.5);
        g.moveTo(-R * 1.5, i * step + off + wob);
        g.quadraticCurveTo(0, i * step + off + wob * 3, R * 1.5, i * step + off);
      }
      g.stroke();
      g.globalAlpha = 1;
    }
    for (let ix = -12; ix <= 12; ix++) for (let iy = -12; iy <= 12; iy++) {
      g.fillStyle = 'rgb(120,96,60)';
      g.beginPath();
      g.arc(ix * step, iy * step, 1.3, 0, 7);
      g.fill();
    }
    g.restore();
    if (sprung) {
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = rgb(shift(cord, -20), 0.9);
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo((r() - 0.5) * R, (r() - 0.5) * R);
        g.bezierCurveTo((r() - 0.5) * R, (r() - 0.5) * R, (r() - 0.5) * R, (r() - 0.5) * R, (r() - 0.5) * R, (r() - 0.5) * R);
        g.stroke();
      }
    }
  });
  body();
  g.strokeStyle = 'rgba(14,8,2,.75)';
  g.lineWidth = Math.max(2, R * 0.045);
  g.stroke();
  // lodder langs kanten
  const nw = 9;
  for (let i = 0; i < nw; i++) {
    const a = (i / nw) * 6.28 + r() * 0.2;
    const d = R * (sprung ? 0.78 : 0.94);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    polyBody(g, Array.from({ length: 7 }, (_, k): [number, number] => [x + Math.cos(k * 0.9 + r()) * R * 0.075, y + Math.sin(k * 0.9 + r()) * R * 0.065]), [126, 120, 112], { lw: 1.1, ao: 1.5 });
  }
}

export const trap2Kinds: ObjectKind[] = [
  kind({ key: 'trapx_darts_wall', family: 'trapx', name: 'Pilefælde i væg', w: 3, h: 1.4, keepAspect: false, shadow: 0, bleed: 0.04, layers: FLOOR, params: [stateParam('fired', [['fired', 'Udløst'], ['armed', 'Klar']])], tags: ['dungeon', 'ruin', 'crypt'], draw: dartWall }),
  kind({ key: 'trapx_darts_floor', family: 'trapx', name: 'Pilefælde i gulv', w: 2, h: 2, shadow: 0, bleed: 0.05, layers: FLOOR, params: [stateParam('fired', [['fired', 'Udløst'], ['armed', 'Klar']])], tags: ['dungeon', 'crypt', 'temple'], draw: dartFloor }),
  kind({ key: 'trapx_saw_track', family: 'trapx', name: 'Sav i gulvspor', w: 4, h: 1.2, keepAspect: false, shadow: 0, bleed: 0.04, layers: FLOOR, params: [{ key: 'pos', label: 'Placering i sporet', type: 'range', min: 0, max: 1, step: 0.05, default: 0.3 }, { key: 'bloody', label: 'Blodig', type: 'toggle', default: false }], tags: ['dungeon', 'military'], draw: sawTrack }),
  kind({ key: 'trapx_saw_pit', family: 'trapx', name: 'Rund sav i gulv', w: 2, h: 2, randomRotation: true, shadow: 0, bleed: 0.04, layers: FLOOR, tags: ['dungeon', 'military'], draw: sawPit }),
  kind({ key: 'trapx_blade_slots', family: 'trapx', name: 'Klinger i gulvspalter', w: 2, h: 2, shadow: 0, bleed: 0.04, layers: FLOOR, params: [stateParam('out', [['out', 'Klinger ude'], ['half', 'Halvt ude'], ['in', 'Klinger inde']])], tags: ['dungeon', 'crypt', 'temple'], draw: bladeSlots }),
  kind({ key: 'trapx_tripwire', family: 'trapx', name: 'Snubletråd', w: 3, h: 0.7, keepAspect: false, shadow: 0, bleed: 0.12, layers: FLOOR, tags: ['forest', 'dungeon', 'outdoor'], draw: (g, o) => tripwire(g, o, 'plain') }),
  kind({ key: 'trapx_tripwire_bells', family: 'trapx', name: 'Alarmtråd med klokker', w: 3, h: 0.7, keepAspect: false, shadow: 0, bleed: 0.12, layers: FLOOR, tags: ['forest', 'camp', 'outdoor'], draw: (g, o) => tripwire(g, o, 'bells') }),
  kind({ key: 'trapx_tripwire_crossbow', family: 'trapx', name: 'Snubletråd med armbrøst', w: 3.4, h: 0.9, keepAspect: false, shadow: 0, bleed: 0.12, layers: FLOOR, tags: ['forest', 'dungeon', 'outdoor'], draw: (g, o) => tripwire(g, o, 'crossbow') }),
  kind({ key: 'trapx_beartrap', family: 'trapx', name: 'Bjørnesaks', w: 1.2, h: 1.4, randomRotation: true, shadow: 1, bleed: 0.06, layers: FLOOR, params: [stateParam('open', [['open', 'Åben'], ['shut', 'Smækket']])], tags: ['forest', 'outdoor', 'camp'], draw: bearTrap }),
  kind({ key: 'trapx_snare', family: 'trapx', name: 'Rebsnare', w: 1.4, h: 1.4, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, tags: ['forest', 'outdoor', 'camp'], draw: snare }),
  kind({ key: 'trapx_net', family: 'trapx', name: 'Fangstnet', w: 2.6, h: 2.6, randomRotation: true, shadow: 0, bleed: 0.06, layers: FLOOR, params: [stateParam('laid', [['laid', 'Udlagt'], ['sprung', 'Udløst']])], tags: ['forest', 'outdoor', 'dungeon'], draw: net }),
];

export { glow, mottle, radial };
