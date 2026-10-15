import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  blade, blobPath, body, castShadow, clipped, crack, ellBody, groundShadow, lin, mix, mossPatch, mottle, OUT, polyBody, polyPath, radial,
  rectBody, rectPath, rgb, rivet, shift, tube, wobble, woodGrain, type G, type RGB, type Rnd,
} from './helpers';

// ------------------------------------------------------------------ fugleskræmsel

function scarecrow(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const cloth: RGB = [[70, 98, 150], [150, 70, 56], [96, 124, 70], [150, 126, 70]][Math.floor(r() * 4)] as RGB;
  const straw: RGB = [212, 178, 84];
  groundShadow(g, w * 0.06, h * 0.08, w * 0.42, h * 0.3, 0.3);
  // vandret stang med strå i enderne
  const armY = -h * 0.02;
  const armL = w * 0.47;
  const bar = () => {
    g.beginPath();
    g.moveTo(-armL, armY);
    g.lineTo(armL, armY);
  };
  castShadow(g, bar, 3, 5, 5, 0.0);
  // lodret stolpe synlig bag hovedet (ned mod syd)
  const post = () => {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, h * 0.44);
  };
  tube(g, post, w * 0.06, [112, 82, 50]);
  tube(g, bar, w * 0.05, [124, 90, 54]);
  // ærmer: to ruller stof med syninger og lapper
  for (const side of [-1, 1]) {
    const x0 = side * w * 0.1;
    const x1 = side * w * 0.38;
    const sx = Math.min(x0, x1);
    const sw = Math.abs(x1 - x0);
    const sp = rectPath(g, sx, armY - h * 0.075, sw, h * 0.15, h * 0.05);
    castShadow(g, sp, 3, 4, 4, 0.4);
    body(g, sp, shift(cloth, side * -8), [sx, armY - h * 0.075, sx + sw, armY + h * 0.075], { lw: 1.7, ao: h * 0.03, rim: 1.2 });
    clipped(g, sp, () => {
      // folder
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = 'rgba(10,6,4,.22)';
        g.lineWidth = 1.2;
        g.beginPath();
        const fx = sx + sw * (0.15 + i * 0.22);
        g.moveTo(fx, armY - h * 0.08);
        g.quadraticCurveTo(fx + (r() - 0.5) * 6, armY, fx + (r() - 0.5) * 3, armY + h * 0.08);
        g.stroke();
      }
      // lap
      const lx = sx + sw * (0.35 + r() * 0.3);
      g.fillStyle = rgb(shift(cloth, 40 - r() * 80));
      g.fillRect(lx, armY - h * 0.03, sw * 0.2, h * 0.06);
      g.strokeStyle = 'rgba(240,230,200,.7)';
      g.setLineDash([2, 2]);
      g.lineWidth = 0.8;
      g.strokeRect(lx, armY - h * 0.03, sw * 0.2, h * 0.06);
      g.setLineDash([]);
    });
    // strå, der stikker ud af manchetten
    for (let i = 0; i < 28; i++) {
      const a = (r() - 0.5) * 1.5 + (side < 0 ? Math.PI : 0);
      const l = w * (0.09 + r() * 0.1);
      const x = x1 + side * 1;
      const y = armY + (r() - 0.5) * h * 0.1;
      g.strokeStyle = rgb(shift(straw, (r() - 0.5) * 56));
      g.lineWidth = 1.1 + r() * 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.8);
      g.stroke();
    }
    // reb om manchetten
    g.strokeStyle = 'rgba(150,118,70,1)';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(x1, armY - h * 0.075);
    g.lineTo(x1, armY + h * 0.075);
    g.stroke();
  }
  // skuldre/overkrop
  const body0 = rectPath(g, -w * 0.16, -h * 0.1, w * 0.32, h * 0.28, w * 0.08);
  castShadow(g, body0, 3, 4, 4, 0.4);
  body(g, body0, cloth, [-w * 0.16, -h * 0.1, w * 0.16, h * 0.18], { lw: 1.8, ao: h * 0.03, rim: 1.2 });
  clipped(g, body0, () => {
    mottle(g, r, [-w * 0.16, -h * 0.1, w * 0.16, h * 0.18], cloth, 30, 2.4, 20, 0.3);
    // knapper
    for (let i = 0; i < 3; i++) {
      ellBody(g, 0, h * 0.02 + i * h * 0.05, 1.7, 1.7, [200, 190, 160], { lw: 0.8, ao: 0 });
    }
    g.strokeStyle = 'rgba(10,6,4,.3)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, -h * 0.1);
    g.lineTo(0, h * 0.18);
    g.stroke();
  });
  // hoved: sæk med stoppet strå, derover en bredskygget hat
  const head = ellBody;
  head(g, 0, -h * 0.1, w * 0.1, w * 0.1, [196, 168, 118], { lw: 1.6, ao: 2, rim: 1.2, light: 30 });
  g.strokeStyle = 'rgba(60,40,20,.7)';
  g.lineWidth = 1;
  g.setLineDash([2.5, 2]);
  g.beginPath();
  g.arc(0, -h * 0.1, w * 0.07, 0.4, 2.6);
  g.stroke();
  g.setLineDash([]);
  // hat
  const hatC: RGB = [128, 96, 52];
  castShadow(g, () => { g.beginPath(); g.arc(0, -h * 0.13, w * 0.17, 0, 7); }, 3, 5, 5, 0.4);
  g.beginPath();
  g.ellipse(0, -h * 0.13, w * 0.19, w * 0.17, 0, 0, 7);
  g.fillStyle = radial(g, 0, -h * 0.13, w * 0.2, [[0, rgb(shift(hatC, 28))], [0.7, rgb(hatC)], [1, rgb(shift(hatC, -40))]], -w * 0.06, -h * 0.16, 2);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.8;
  g.stroke();
  // fligernes strå-flet
  g.strokeStyle = 'rgba(60,36,12,.35)';
  g.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.ellipse(0, -h * 0.13, w * (0.04 + i * 0.045), w * (0.037 + i * 0.04), 0, 0, 7);
    g.stroke();
  }
  // skal (kronen) med bånd
  ellBody(g, -w * 0.005, -h * 0.14, w * 0.075, w * 0.066, shift(hatC, 10), { lw: 1.5, ao: 1.5, rim: 1.2, light: 40 });
  g.strokeStyle = 'rgba(46,30,18,.95)';
  g.lineWidth = 2.2;
  g.beginPath();
  g.ellipse(-w * 0.005, -h * 0.14, w * 0.072, w * 0.064, 0, 0.3, 5.8);
  g.stroke();
  g.strokeStyle = 'rgba(210,180,100,.8)';
  g.lineWidth = 1;
  g.strokeRect(w * 0.048, -h * 0.15, 3, 4);
  // blomst eller fjer i hatten
  
  // kragen
  if (param(o, 'crow', true)) {
    const cx = -w * 0.3;
    const cy = armY - h * 0.02;
    g.save();
    g.translate(cx, cy);
    g.rotate(-0.4);
    castShadow(g, () => { g.beginPath(); g.ellipse(0, 0, w * 0.045, w * 0.09, 0, 0, 7); }, 2, 3, 3, 0.4);
    // vinger
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * w * 0.03, -w * 0.02);
      g.quadraticCurveTo(s * w * 0.08, w * 0.02, s * w * 0.045, w * 0.1);
      g.quadraticCurveTo(s * w * 0.03, w * 0.04, s * w * 0.03, -w * 0.02);
      g.fillStyle = 'rgb(26,26,32)';
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.9)';
      g.lineWidth = 1;
      g.stroke();
    }
    ellBody(g, 0, 0, w * 0.045, w * 0.085, [30, 30, 38], { lw: 1.3, ao: 1, rim: 0.8, light: 40 });
    ellBody(g, 0, -w * 0.08, w * 0.03, w * 0.032, [34, 34, 42], { lw: 1.2, ao: 0.6, rim: 0.6, light: 44 });
    g.fillStyle = 'rgb(210,150,40)';
    g.beginPath();
    g.moveTo(-w * 0.008, -w * 0.105);
    g.lineTo(0, -w * 0.14);
    g.lineTo(w * 0.01, -w * 0.105);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)';
    g.beginPath();
    g.arc(-w * 0.012, -w * 0.09, 1, 0, 7);
    g.fill();
    g.restore();
  }
}

// ------------------------------------------------------------------ plov

function plough(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const old = param(o, 'wear', 'used') === 'old';
  const wood: RGB = old ? [112, 94, 70] : [146, 104, 62];
  const iron: RGB = old ? [124, 84, 58] : [92, 94, 100];
  // omvendt jord bag skæret (højre side)
  if (param(o, 'soil', true)) {
    const fur = polyPath(g, [[w * 0.1, h * 0.12], [w * 0.2, h * 0.1], [w * 0.4, h * 0.5], [w * 0.2, h * 0.5]]);
    g.save();
    fur();
    g.fillStyle = 'rgba(60,40,22,.75)';
    g.fill();
    g.clip();
    for (let i = 0; i < 70; i++) {
      const t = r();
      const x = w * (0.12 + t * 0.2) + (r() - 0.3) * w * 0.12;
      const y = h * (0.1 + t * 0.4) + (r() - 0.5) * h * 0.04;
      const sz = w * (0.018 + r() * 0.03);
      g.fillStyle = 'rgba(14,8,2,.4)';
      g.beginPath();
      g.ellipse(x + sz * 0.4, y + sz * 0.5, sz, sz * 0.8, 0, 0, 7);
      g.fill();
      g.fillStyle = rgb(shift([92, 64, 38], (r() - 0.5) * 36));
      g.beginPath();
      g.ellipse(x, y, sz, sz * 0.8, r() * 3, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(255,230,190,.2)';
      g.beginPath();
      g.ellipse(x - sz * 0.3, y - sz * 0.3, sz * 0.4, sz * 0.25, 0, 0, 7);
      g.fill();
    }
    g.restore();
  }
  // forhjul på en lille aksel (set oppefra: smalt rundt bånd)
  const wx = -w * 0.2;
  const wy = -h * 0.14;
  castShadow(g, rectPath(g, wx - w * 0.025, wy - h * 0.08, w * 0.05, h * 0.16, 2), 2, 3, 3, 0.4);
  const axl = () => { g.beginPath(); g.moveTo(wx, wy); g.lineTo(-w * 0.04, wy); };
  tube(g, axl, w * 0.025, iron);
  body(g, rectPath(g, wx - w * 0.028, wy - h * 0.08, w * 0.056, h * 0.16, 2), shift(wood, -10), [wx - 3, wy - h * 0.08, wx + 3, wy + h * 0.08], { lw: 1.5, ao: 1, rim: 0.8 });
  g.fillStyle = 'rgba(70,70,76,.9)';
  g.fillRect(wx - w * 0.028, wy - h * 0.08, w * 0.056, 2);
  g.fillRect(wx - w * 0.028, wy + h * 0.08 - 2, w * 0.056, 2);
  // bjælke
  const beam: [number, number][] = [[-w * 0.05, -h * 0.48], [w * 0.05, -h * 0.48], [w * 0.075, h * 0.28], [-w * 0.075, h * 0.28]];
  castShadow(g, polyPath(g, beam), 3, 4, 4, 0.45);
  polyBody(g, beam, wood, { lw: 1.8, ao: 1.8, rim: 1.1 });
  clipped(g, polyPath(g, beam), () => {
    woodGrain(g, r, [-w * 0.075, -h * 0.48, w * 0.075, h * 0.28], wood, { rot: Math.PI / 2, lines: 8, knots: 2 });
  });
  for (const yy of [-h * 0.3, -h * 0.05, h * 0.18]) rectBody(g, -w * 0.07, yy, w * 0.14, h * 0.018, 1, iron, { lw: 1.1, ao: 0.6, rim: 0.6 });
  // svingle (vognstang) og kæder foran
  const swy = -h * 0.4;
  const sw = () => { g.beginPath(); g.moveTo(-w * 0.36, swy); g.lineTo(w * 0.36, swy); };
  castShadow(g, sw, 3, 4, 4, 0.0);
  tube(g, sw, w * 0.05, shift(wood, -6));
  for (const sx of [-1, 1]) {
    const hook = () => { g.beginPath(); g.arc(sx * w * 0.38, swy, w * 0.03, 0, 6.3); };
    tube(g, hook, w * 0.014, iron, { outline: 1.4 });
  }
  const chain = () => { g.beginPath(); g.moveTo(-w * 0.32, swy); g.lineTo(0, swy - h * 0.08); g.lineTo(w * 0.32, swy); };
  tube(g, chain, w * 0.016, iron, { outline: 1.4 });
  // muldfjæl: krum plade til højre for bjælken
  const mp = () => {
    g.beginPath();
    g.moveTo(w * 0.07, -h * 0.04);
    g.bezierCurveTo(w * 0.3, -h * 0.0, w * 0.42, h * 0.12, w * 0.4, h * 0.34);
    g.lineTo(w * 0.07, h * 0.28);
    g.bezierCurveTo(w * 0.2, h * 0.2, w * 0.17, h * 0.08, w * 0.07, -h * 0.04);
    g.closePath();
  };
  castShadow(g, mp, 3, 4, 4, 0.45);
  body(g, mp, iron, [w * 0.07, -h * 0.04, w * 0.42, h * 0.34], { lw: 1.9, ao: 2, rim: 1.2, light: 42, dark: 34, angle: 20 });
  clipped(g, mp, () => {
    mottle(g, r, [w * 0.07, -h * 0.04, w * 0.42, h * 0.34], iron, 36, 2, 22, 0.35);
    if (old) {
      for (let i = 0; i < 18; i++) {
        g.fillStyle = `rgba(${150 + r() * 40},${70 + r() * 30},30,${0.2 + r() * 0.2})`;
        g.beginPath();
        g.ellipse(w * (0.1 + r() * 0.3), h * (r() * 0.35), 1 + r() * 3, 1 + r() * 3, r() * 3, 0, 7);
        g.fill();
      }
    }
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(w * 0.12, -h * 0.02);
    g.bezierCurveTo(w * 0.34, h * 0.03, w * 0.4, h * 0.14, w * 0.38, h * 0.3);
    g.stroke();
    for (const [px, py] of [[0.14, 0.02], [0.2, 0.2], [0.34, 0.26]] as const) rivet(g, w * px, h * py, 1.6, [60, 60, 66]);
  });
  // plovjern/skær (jern) under bjælken, kolter foran
  const sh: [number, number][] = [[-w * 0.07, -h * 0.02], [w * 0.075, -h * 0.02], [w * 0.1, h * 0.22], [-w * 0.1, h * 0.22]];
  void sh;
  const shr: [number, number][] = [[-w * 0.07, -h * 0.12], [w * 0.075, -h * 0.12], [w * 0.1, h * 0.12], [0, h * 0.2], [-w * 0.1, h * 0.12]];
  castShadow(g, polyPath(g, shr), 2, 3, 3, 0.45);
  polyBody(g, shr, iron, { lw: 1.9, ao: 1.4, rim: 1.2, light: 44, dark: 36 });
  const col = () => { g.beginPath(); g.moveTo(0, -h * 0.34); g.lineTo(0, -h * 0.1); };
  tube(g, col, w * 0.032, iron);
  // håndtag: to buede stænger
  for (const s of [-1, 1]) {
    const hp = () => {
      g.beginPath();
      g.moveTo(s * w * 0.06, h * 0.18);
      g.bezierCurveTo(s * w * 0.1, h * 0.3, s * w * 0.24, h * 0.3, s * w * 0.34, h * 0.42);
    };
    castShadow(g, hp, 3, 4, 4, 0.0);
    tube(g, hp, w * 0.07, wood);
    ellBody(g, s * w * 0.34, h * 0.42, w * 0.05, w * 0.05, shift(wood, -8), { lw: 1.5, ao: 1, rim: 0.8 });
  }
  rectBody(g, -w * 0.22, h * 0.31, w * 0.44, h * 0.026, 2, shift(wood, -6), { lw: 1.4, ao: 1, rim: 0.8 });
  for (const s of [-1, 1]) rivet(g, s * w * 0.19, h * 0.323, 1.4);
}

// ------------------------------------------------------------------ afgrøder

function cropRows(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const crop = param(o, 'crop', 'wheat');
  // jordfladen med uregelmæssig kant
  const pp: [number, number][] = [];
  const jit = () => (r() - 0.5) * 3;
  const nx = 16;
  for (let i = 0; i < nx; i++) pp.push([-w * 0.49 + (i / nx) * w * 0.98 + jit(), -h * 0.49 + jit()]);
  for (let i = 0; i < nx; i++) pp.push([w * 0.49 + jit(), -h * 0.49 + (i / nx) * h * 0.98 + jit()]);
  for (let i = 0; i < nx; i++) pp.push([w * 0.49 - (i / nx) * w * 0.98 + jit(), h * 0.49 + jit()]);
  for (let i = 0; i < nx; i++) pp.push([-w * 0.49 + jit(), h * 0.49 - (i / nx) * h * 0.98 + jit()]);
  const patch = polyPath(g, pp);
  patch();
  g.fillStyle = 'rgb(78,56,34)';
  g.fill();
  clipped(g, patch, () => {
    const rows = crop === 'cabbage' ? 6 : crop === 'pumpkin' ? 4 : crop === 'corn' ? 5 : 8;
    const rw = (w * 0.98) / rows;
    // furer
    for (let i = 0; i < rows; i++) {
      const x = -w * 0.49 + i * rw;
      g.fillStyle = lin(g, x, 0, x + rw, 0, [[0, 'rgb(64,44,26)'], [0.3, 'rgb(104,76,46)'], [0.7, 'rgb(112,82,50)'], [1, 'rgb(60,42,24)']]);
      g.fillRect(x, -h / 2, rw, h);
      for (let k = 0; k < 28; k++) {
        const cx = x + rw * (0.2 + r() * 0.6);
        const cy = (r() - 0.5) * h;
        g.fillStyle = `rgba(${40 + r() * 30},${26 + r() * 16},12,.4)`;
        g.beginPath();
        g.ellipse(cx, cy, 1 + r() * 2.2, 0.8 + r() * 1.4, r() * 3, 0, 7);
        g.fill();
      }
    }
    // planter
    for (let i = 0; i < rows; i++) {
      const cx = -w * 0.49 + (i + 0.5) * rw;
      if (crop === 'wheat') {
        const n = Math.floor(h / 5);
        g.fillStyle = 'rgba(40,28,8,.35)';
        g.fillRect(cx - rw * 0.36 + 1.5, -h / 2, rw * 0.74, h);
        const tones: RGB[] = [[196, 156, 58], [216, 178, 76], [232, 200, 104]];
        const stems: [number, number, number, number][] = [];
        const ears: [number, number, number][][] = [[], [], []];
        for (let k = 0; k < n; k++) {
          const y = -h / 2 + (k + 0.5) * (h / n);
          for (let s2 = -1; s2 <= 1; s2++) {
            const px = cx + s2 * rw * 0.2 + (r() - 0.5) * 3;
            const py = y + (r() - 0.5) * 3;
            const a = s2 * 0.5 + (r() - 0.5) * 0.9;
            const ex = px + Math.sin(a) * 6;
            const ey = py - Math.cos(a) * 6;
            stems.push([px, py + 2, ex, ey]);
            ears[Math.floor(r() * 3)]!.push([ex, ey - 1, a]);
          }
        }
        g.strokeStyle = 'rgba(120,90,30,.9)';
        g.lineWidth = 1;
        g.beginPath();
        for (const [x0, y0, x1, y1] of stems) {
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
        }
        g.stroke();
        ears.forEach((list, ti) => {
          g.fillStyle = rgb(tones[ti]!);
          g.beginPath();
          for (const [ex, ey, a] of list) {
            g.moveTo(ex + 1.5, ey);
            g.ellipse(ex, ey, 1.6, 4, a, 0, 7);
          }
          g.fill();
          g.strokeStyle = 'rgba(70,46,10,.55)';
          g.lineWidth = 0.6;
          g.stroke();
        });
      } else if (crop === 'cabbage') {
        const n = Math.floor(h / (rw * 0.95));
        for (let k = 0; k < n; k++) {
          const y = -h / 2 + (k + 0.5) * (h / n) + (r() - 0.5) * 3;
          const x = cx + (r() - 0.5) * 3;
          const R = rw * (0.4 + r() * 0.06);
          const green: RGB = mix([86, 140, 70], [120, 164, 92], r());
          const sp = () => { g.beginPath(); g.arc(x, y, R, 0, 7); };
          castShadow(g, sp, 2, 3, 3, 0.45);
          // ydre blade (flade), derefter indre hoved
          for (let b = 0; b < 7; b++) {
            const a = (b / 7) * 6.283 + r();
            g.fillStyle = rgb(shift(green, -14 + (b % 2) * 12));
            g.beginPath();
            g.ellipse(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5, R * 0.55, R * 0.4, a, 0, 7);
            g.fill();
            g.strokeStyle = 'rgba(14,30,10,.6)';
            g.lineWidth = 0.9;
            g.stroke();
          }
          g.beginPath();
          g.arc(x - 0.5, y - 0.5, R * 0.46, 0, 7);
          g.fillStyle = radial(g, x, y, R * 0.5, [[0, rgb(shift(green, 52))], [1, rgb(shift(green, 4))]], x - R * 0.2, y - R * 0.2, 1);
          g.fill();
          g.strokeStyle = 'rgba(14,30,10,.55)';
          g.lineWidth = 1;
          g.stroke();
          g.strokeStyle = 'rgba(220,240,190,.7)';
          g.lineWidth = 0.7;
          g.beginPath();
          g.arc(x, y, R * 0.28, 3.4, 5.4);
          g.stroke();
        }
      } else if (crop === 'corn') {
        const n = Math.floor(h / (rw * 1.15));
        for (let k = 0; k < n; k++) {
          const y = -h / 2 + (k + 0.5) * (h / n) + (r() - 0.5) * 3;
          const x = cx + (r() - 0.5) * 3;
          const R = rw * 0.86;
          const sh = () => { g.beginPath(); g.arc(x, y, R * 0.5, 0, 7); };
          castShadow(g, sh, 3, 4, 4, 0.35);
          for (let b = 0; b < 8; b++) {
            const a = (b / 8) * 6.283 + r() * 0.3;
            const c: RGB = mix([70, 128, 56], [130, 170, 70], r());
            const ll = R * (0.5 + r() * 0.18);
            g.save();
            g.translate(x, y);
            g.rotate(a);
            g.beginPath();
            g.moveTo(0, 0);
            g.quadraticCurveTo(ll * 0.5, -ll * 0.2, ll, ll * 0.08);
            g.quadraticCurveTo(ll * 0.5, ll * 0.18, 0, 0);
            g.fillStyle = rgb(shift(c, Math.cos(a - 3.9) * 24));
            g.fill();
            g.strokeStyle = 'rgba(14,34,10,.7)';
            g.lineWidth = 0.9;
            g.stroke();
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(ll * 0.95, 0.5);
            g.strokeStyle = 'rgba(200,226,150,.5)';
            g.stroke();
            g.restore();
          }
          g.fillStyle = 'rgb(222,190,86)';
          g.beginPath();
          g.arc(x, y, R * 0.12, 0, 7);
          g.fill();
          g.strokeStyle = 'rgba(80,50,10,.8)';
          g.lineWidth = 0.8;
          g.stroke();
        }
      } else {
        const n = Math.floor(h / (rw * 1.1));
        for (let k = 0; k < n; k++) {
          const y = -h / 2 + (k + 0.5) * (h / n) + (r() - 0.5) * 4;
          const x = cx + (r() - 0.5) * 4;
          const R = rw * (0.34 + r() * 0.08);
          // ranker og blade
          for (let b = 0; b < 4; b++) {
            const a = r() * 6.28;
            g.strokeStyle = 'rgba(66,110,44,.9)';
            g.lineWidth = 1.2;
            g.beginPath();
            g.moveTo(x, y);
            g.quadraticCurveTo(x + Math.cos(a) * R * 1.5, y + Math.sin(a) * R * 1.5, x + Math.cos(a + 0.5) * R * 2.2, y + Math.sin(a + 0.5) * R * 2.2);
            g.stroke();
            blade(g, x + Math.cos(a) * R * 1.5, y + Math.sin(a) * R * 1.5, a, R * 1.0, R * 0.55, [86, 136, 56]);
          }
          const tone: RGB = mix([226, 120, 34], [210, 90, 24], r());
          const sp = () => { g.beginPath(); g.ellipse(x, y, R * 1.05, R, 0, 0, 7); };
          castShadow(g, sp, 2.5, 3.5, 3, 0.5);
          g.fillStyle = radial(g, x, y, R * 1.1, [[0, rgb(shift(tone, 36))], [0.6, rgb(tone)], [1, rgb(shift(tone, -50))]], x - R * 0.35, y - R * 0.35, 1);
          sp();
          g.fill();
          g.strokeStyle = 'rgba(80,28,6,.9)';
          g.lineWidth = 1.2;
          g.stroke();
          g.strokeStyle = 'rgba(100,34,8,.5)';
          g.lineWidth = 0.9;
          for (let b = -2; b <= 2; b++) {
            g.beginPath();
            g.ellipse(x, y, R * (0.1 + Math.abs(b) * 0.28), R * 0.95, 0, -1.4, 1.4);
            g.stroke();
          }
          ellBody(g, x, y, R * 0.12, R * 0.12, [90, 110, 40], { lw: 0.9, ao: 0 });
        }
      }
    }
    g.fillStyle = lin(g, -w / 2, -h / 2, w / 2, h / 2, [[0, 'rgba(255,240,200,.08)'], [1, 'rgba(0,0,0,.28)']]);
    g.fillRect(-w / 2, -h / 2, w, h);
  });
  patch();
  g.strokeStyle = 'rgba(30,18,8,.6)';
  g.lineWidth = 1.5;
  g.stroke();
}

// ------------------------------------------------------------------ høstak

function haystack(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const old = param(o, 'tone', 'fresh') === 'old';
  const base: RGB = old ? [168, 148, 96] : [216, 184, 92];
  const cx = 0;
  const cy = 0;
  const Rm = R * 0.84;
  groundShadow(g, R * 0.1, R * 0.12, R * 0.9, R * 0.86, 0.45);
  // løse strå uden for stakken
  g.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const a = r() * 6.283;
    const d = Rm * (0.95 + r() * 0.2);
    const l = R * (0.08 + r() * 0.14);
    const ta = a + (r() - 0.5) * 1.8;
    g.strokeStyle = rgb(shift(base, (r() - 0.5) * 60 - 20), 0.9);
    g.lineWidth = 1 + r() * 1;
    g.beginPath();
    g.moveTo(Math.cos(a) * d, Math.sin(a) * d);
    g.lineTo(Math.cos(a) * d + Math.cos(ta) * l, Math.sin(a) * d + Math.sin(ta) * l);
    g.stroke();
  }
  const rim = wobble(r, cx, cy, Rm, Rm, 22, 0.04);
  const path = blobPath(g, rim);
  path();
  g.fillStyle = radial(g, cx, cy, Rm * 1.05, [[0, rgb(shift(base, 30))], [0.55, rgb(base)], [1, rgb(shift(base, -52))]], -Rm * 0.3, -Rm * 0.34, 3);
  g.fill();
  clipped(g, path, () => {
    // strå i en spiral ud fra midten
    const batches: [string, number, number][] = [
      [rgb(shift(base, -48), 0.6), 1.6, 0],
      [rgb(shift(base, -16), 0.8), 1.3, 1],
      [rgb(shift(base, 22), 0.85), 1.1, 2],
      [rgb(shift(base, 56), 0.8), 0.8, 3],
    ];
    for (const [col, lw, bi] of batches) {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      const n = bi === 0 ? 200 : 260;
      for (let i = 0; i < n; i++) {
        const a = r() * 6.283;
        const d0 = Rm * (0.04 + Math.sqrt(r()) * 0.98);
        const l = Rm * (0.12 + r() * 0.22);
        const sw = 0.3 + r() * 0.3; // spiral
        const a2 = a + sw * (l / Rm);
        const lit = Math.cos(a - 3.93) * 0.5 + 0.5;
        if (bi === 3 && lit < 0.45) continue;
        if (bi === 0 && lit > 0.65) continue;
        g.moveTo(Math.cos(a) * d0, Math.sin(a) * d0);
        g.lineTo(Math.cos(a2) * (d0 + l), Math.sin(a2) * (d0 + l));
      }
      g.stroke();
    }
    // hvirvel i midten
    g.fillStyle = radial(g, 0, 0, Rm * 0.3, [[0, rgb(shift(base, -40), 0.7)], [1, rgb(shift(base, -40), 0)]]);
    g.beginPath();
    g.arc(0, 0, Rm * 0.3, 0, 7);
    g.fill();
    // lysfald
    g.fillStyle = lin(g, -Rm, -Rm, Rm, Rm, [[0, 'rgba(255,244,200,.18)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(30,14,0,.36)']]);
    g.fillRect(-Rm, -Rm, Rm * 2, Rm * 2);
  });
  path();
  g.strokeStyle = 'rgba(70,46,10,.6)';
  g.lineWidth = 1.4;
  g.stroke();
  // bånd/sno
  g.strokeStyle = 'rgba(60,36,10,.65)';
  g.lineWidth = 3.4;
  g.beginPath();
  g.arc(0, 0, Rm * 0.62, 0, 7);
  g.stroke();
  g.strokeStyle = 'rgb(160,122,66)';
  g.lineWidth = 2;
  g.stroke();
  // højgaffel stukket i
  if (param(o, 'fork', true)) {
    g.save();
    g.translate(R * 0.12, R * 0.05);
    g.rotate(-0.9);
    const shaft = () => {
      g.beginPath();
      g.moveTo(-R * 0.6, 0);
      g.lineTo(R * 0.4, 0);
    };
    castShadow(g, shaft, 3, 5, 4, 0.0);
    tube(g, shaft, R * 0.05, [128, 98, 60]);
    // tænder
    for (const s of [-1, 0, 1]) {
      const tp = () => {
        g.beginPath();
        g.moveTo(R * 0.4, s * R * 0.06);
        g.lineTo(R * 0.72, s * R * 0.06);
      };
      tube(g, tp, R * 0.018, [100, 100, 108], { outline: 1.4 });
    }
    rectBody(g, R * 0.36, -R * 0.08, R * 0.05, R * 0.16, 1, [90, 90, 96], { lw: 1.1, ao: 0.5, rim: 0.5 });
    g.restore();
  }
}

export const farmKinds: ObjectKind[] = [
  kind({
    key: 'scarecrow', family: 'farm', name: 'Fugleskræmsel', w: 1.5, h: 1.5, shadow: 6, bleed: 0.08, randomRotation: false,
    params: [{ key: 'crow', label: 'Krage', type: 'toggle', default: true }],
    draw: scarecrow,
  }),
  kind({
    key: 'plough', family: 'farm', name: 'Plov', w: 1.5, h: 2.8, keepAspect: false, shadow: 4, bleed: 0.08,
    params: [
      { key: 'wear', label: 'Stand', type: 'select', default: 'used', options: [{ value: 'used', label: 'I brug' }, { value: 'old', label: 'Gammel og rusten' }] },
      { key: 'soil', label: 'Jord ved skæret', type: 'toggle', default: true },
    ],
    draw: plough,
  }),
  kind({
    key: 'crop_rows', family: 'farm', name: 'Afgrøderækker', w: 3, h: 3, keepAspect: false, shadow: 0, bleed: 0.02,
    params: [{ key: 'crop', label: 'Afgrøde', type: 'select', default: 'wheat', options: [{ value: 'wheat', label: 'Hvede' }, { value: 'cabbage', label: 'Kål' }, { value: 'corn', label: 'Majs' }, { value: 'pumpkin', label: 'Græskar' }] }],
    draw: cropRows,
  }),
  kind({
    key: 'haystack', family: 'farm', name: 'Høstak', w: 1.8, h: 1.8, sizeJitter: 0.1, shadow: 7, bleed: 0.12, randomRotation: true,
    params: [{ key: 'tone', label: 'Alder', type: 'select', default: 'fresh', options: [{ value: 'fresh', label: 'Frisk' }, { value: 'old', label: 'Gammel' }] }, { key: 'fork', label: 'Høtyv', type: 'toggle', default: true }],
    draw: haystack,
  }),
];
