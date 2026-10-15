import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  body, castShadow, clipped, crack, ellBody, ellipsePath, groundShadow, lin, mix, mottle, mossPatch, OUT, orb, polyBody, polyPath,
  rectBody, rectPath, rgb, rivet, rope, shift, tube, woodGrain, plankBoard, type G, type RGB, type Rnd,
} from './helpers';

// ------------------------------------------------------------------ robåd

const HULLS: Record<string, RGB> = {
  brown: [122, 82, 48],
  blue: [52, 96, 138],
  red: [158, 60, 46],
  weathered: [150, 140, 122],
};

function hull(g: G, L: number, W: number, sx: number, sy: number, dy = 0): () => void {
  return () => {
    const x = (v: number) => v * sx;
    const y = (v: number) => v * sy + dy;
    g.beginPath();
    g.moveTo(0, y(-L / 2));
    g.bezierCurveTo(x(W * 0.22), y(-L * 0.4), x(W * 0.5), y(-L * 0.2), x(W * 0.5), y(L * 0.04));
    g.bezierCurveTo(x(W * 0.5), y(L * 0.3), x(W * 0.44), y(L * 0.44), x(W * 0.37), y(L / 2));
    g.lineTo(x(-W * 0.37), y(L / 2));
    g.bezierCurveTo(x(-W * 0.44), y(L * 0.44), x(-W * 0.5), y(L * 0.3), x(-W * 0.5), y(L * 0.04));
    g.bezierCurveTo(x(-W * 0.5), y(-L * 0.2), x(-W * 0.22), y(-L * 0.4), 0, y(-L / 2));
    g.closePath();
  };
}

function oar(g: G, r: Rnd, x0: number, y0: number, x1: number, y1: number, bladeLen: number, bladeW: number): void {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const trace = () => {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
  };
  castShadow(g, trace, 2.5, 3, 3, 0.3);
  g.save();
  tube(g, trace, 3.6, [176, 140, 90]);
  g.restore();
  // blad
  g.save();
  g.translate(x1, y1);
  g.rotate(ang);
  const bp = () => {
    g.beginPath();
    g.moveTo(-1, -bladeW * 0.3);
    g.lineTo(bladeLen * 0.8, -bladeW * 0.5);
    g.quadraticCurveTo(bladeLen * 1.05, 0, bladeLen * 0.8, bladeW * 0.5);
    g.lineTo(-1, bladeW * 0.3);
    g.closePath();
  };
  body(g, bp, [170, 132, 84], [0, -bladeW / 2, bladeLen, bladeW / 2], { lw: 1.5, ao: 1.2, rim: 0.8 });
  clipped(g, bp, () => woodGrain(g, r, [0, -bladeW / 2, bladeLen, bladeW / 2], [170, 132, 84], { lines: 5 }));
  g.restore();
  // greb
  g.save();
  g.translate(x0, y0);
  g.rotate(ang);
  ellBody(g, 0, 0, 3.2, 2.6, [120, 84, 50], { lw: 1.2, ao: 0.8 });
  g.restore();
}

function rowboat(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const L = h * 0.96;
  const W = w * 0.96;
  const col = HULLS[param(o, 'tone', 'brown')] ?? HULLS.brown!;
  const cargo = param(o, 'cargo', 'none');
  const outer = hull(g, L, W, 1, 1);
  const inner = hull(g, L, W, 0.8, 0.95, L * 0.012);
  castShadow(g, outer, 0, 0, 1, 0);
  body(g, outer, col, [-W / 2, -L / 2, W / 2, L / 2], { lw: 2.2, ao: W * 0.03, rim: 1.4, light: 24, dark: 40 });
  clipped(g, outer, () => {
    woodGrain(g, r, [-W / 2, -L / 2, W / 2, L / 2], col, { rot: Math.PI / 2, lines: 14, contrast: 1.2 });
    // klinkbyggede planker som kurver parallelt med skroget
    for (let i = 1; i < 4; i++) {
      const s = 1 - i * 0.045;
      hull(g, L, W, s, s * 0.995)();
      g.strokeStyle = 'rgba(10,5,2,.4)';
      g.lineWidth = 1;
      g.stroke();
      g.translate(0.8, 0.8);
      hull(g, L, W, s, s * 0.995)();
      g.strokeStyle = 'rgba(255,240,205,.14)';
      g.stroke();
      g.translate(-0.8, -0.8);
    }
  });
  // indre
  inner();
  g.fillStyle = lin(g, -W / 2, 0, W / 2, 0, [[0, 'rgb(58,36,20)'], [0.3, 'rgb(112,78,46)'], [0.7, 'rgb(98,68,40)'], [1, 'rgb(48,30,16)']]);
  g.fill();
  clipped(g, inner, () => {
    const iw = W * 0.8;
    // bundplanker langs med
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = -iw / 2 + (i + 0.5) * (iw / n);
      g.strokeStyle = 'rgba(12,6,2,.5)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, -L / 2);
      g.lineTo(x, L / 2);
      g.stroke();
      g.strokeStyle = 'rgba(255,225,170,.12)';
      g.beginPath();
      g.moveTo(x + 1, -L / 2);
      g.lineTo(x + 1, L / 2);
      g.stroke();
    }
    woodGrain(g, r, [-iw / 2, -L / 2, iw / 2, L / 2], [112, 78, 46], { rot: Math.PI / 2, lines: 18, contrast: 0.8, knots: 2 });
    // spanter (ribber)
    for (let i = 0; i < 9; i++) {
      const y = -L * 0.38 + i * L * 0.09;
      g.beginPath();
      g.moveTo(-iw / 2, y);
      g.quadraticCurveTo(0, y + L * 0.012, iw / 2, y);
      g.strokeStyle = 'rgba(30,16,6,.65)';
      g.lineWidth = 3.2;
      g.stroke();
      g.strokeStyle = 'rgba(190,150,98,.5)';
      g.lineWidth = 1.2;
      g.translate(0, -1);
      g.stroke();
      g.translate(0, 1);
    }
    // lænsevand og snavs i bunden
    g.fillStyle = lin(g, 0, L * 0.22, 0, L * 0.5, [[0, 'rgba(40,70,86,0)'], [0.6, 'rgba(46,82,100,.7)'], [1, 'rgba(36,60,76,.8)']]);
    g.beginPath();
    g.ellipse(0, L * 0.36, iw * 0.3, L * 0.1, 0, 0, 7);
    g.fill();
    g.fillStyle = 'rgba(200,230,240,.35)';
    g.beginPath();
    g.ellipse(-iw * 0.08, L * 0.34, iw * 0.12, L * 0.018, 0, 0, 7);
    g.fill();
    mottle(g, r, [-iw / 2, -L / 2, iw / 2, L / 2], [100, 70, 44], 40, 2.6, 24, 0.3);
    // indre skygge mod øverste højre kant
    g.fillStyle = lin(g, -W / 2, -L / 2, W / 2, L / 2, [[0, 'rgba(0,0,0,.34)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.1)']]);
    g.fillRect(-W / 2, -L / 2, W, L);
  });
  // indre kontur og sønk
  inner();
  g.strokeStyle = 'rgba(12,6,2,.9)';
  g.lineWidth = 2;
  g.stroke();
  // lastning
  if (cargo === 'fish') {
    for (let i = 0; i < 9; i++) {
      const fx = (r() - 0.5) * W * 0.4;
      const fy = L * (0.2 + r() * 0.2);
      g.save();
      g.translate(fx, fy);
      g.rotate((r() - 0.5) * 2.6 + 1.57);
      const fl = W * (0.17 + r() * 0.05);
      const fp = () => {
        g.beginPath();
        g.moveTo(-fl, 0);
        g.quadraticCurveTo(-fl * 0.2, -fl * 0.36, fl * 0.6, -fl * 0.04);
        g.lineTo(fl, -fl * 0.26);
        g.lineTo(fl, fl * 0.26);
        g.lineTo(fl * 0.6, fl * 0.04);
        g.quadraticCurveTo(-fl * 0.2, fl * 0.36, -fl, 0);
        g.closePath();
      };
      const c: RGB = [146 + r() * 40, 160 + r() * 30, 170 + r() * 26];
      body(g, fp, c, [-fl, -fl * 0.36, fl, fl * 0.36], { lw: 1, ao: 0.7, rim: 0.5 });
      g.fillStyle = 'rgba(20,10,5,.8)';
      g.beginPath();
      g.arc(-fl * 0.7, -fl * 0.06, 1, 0, 7);
      g.fill();
      g.restore();
    }
  } else if (cargo === 'sacks') {
    for (let i = 0; i < 3; i++) {
      const sx = (i - 1) * W * 0.22 + (r() - 0.5) * 4;
      const sy = L * 0.3 + (r() - 0.5) * L * 0.08;
      g.save();
      g.translate(sx, sy);
      g.rotate((r() - 0.5) * 0.6);
      const sp = () => {
        g.beginPath();
        g.ellipse(0, 0, W * 0.1, W * 0.14, 0, 0, 7);
      };
      body(g, sp, [188, 160, 110], [-W * 0.1, -W * 0.14, W * 0.1, W * 0.14], { lw: 1.4, ao: 1.5 });
      g.strokeStyle = 'rgba(80,56,30,.5)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-W * 0.05, -W * 0.1);
      g.quadraticCurveTo(0, 0, W * 0.04, W * 0.1);
      g.stroke();
      g.restore();
    }
  }
  // tofter
  const bench: [number, number][] = [[-0.26, 0.74], [0.06, 0.9], [0.3, 0.7]];
  for (const [by, wf] of bench) {
    const bw = W * wf * 0.78;
    const bh = L * 0.058;
    const y = L * by;
    castShadow(g, rectPath(g, -bw / 2, y - bh / 2, bw, bh, 2), 1.5, 3, 3, 0.45);
    rectBody(g, -bw / 2, y - bh / 2, bw, bh, 2, [138, 98, 58], { lw: 1.6, ao: 1.4, rim: 1 });
    clipped(g, rectPath(g, -bw / 2, y - bh / 2, bw, bh, 2), () => woodGrain(g, r, [-bw / 2, y - bh / 2, bw / 2, y + bh / 2], [138, 98, 58], { lines: 5, knots: 1 }));
    for (const sx of [-1, 1]) rivet(g, sx * bw * 0.4, y, 1.3, [170, 150, 120]);
  }
  // rælingens beslag og dollbord
  for (const [by, sx] of [[-0.26, 0.4], [0.06, 0.45], [0.3, 0.4]] as const) {
    for (const s of [-1, 1]) {
      const ox = s * W * sx * 1.07;
      const oy = L * (by + 0.0);
      ellBody(g, ox * 0.98, oy, 2.8, 3.4, [76, 70, 66], { lw: 1.2, ao: 0.5 });
      g.fillStyle = 'rgba(0,0,0,.7)';
      g.beginPath();
      g.arc(ox * 0.98, oy, 1.1, 0, 7);
      g.fill();
    }
  }
  // stævn og agterspejl
  g.beginPath();
  g.moveTo(0, -L / 2);
  g.lineTo(0, -L * 0.34);
  g.strokeStyle = 'rgba(30,14,6,.85)';
  g.lineWidth = 3.6;
  g.stroke();
  g.strokeStyle = rgb(shift(col, 22));
  g.lineWidth = 2;
  g.stroke();
  rectBody(g, -W * 0.34, L * 0.43, W * 0.68, L * 0.04, 2, shift(col, 6), { lw: 1.4, ao: 1, rim: 1 });
  // årer
  if (param(o, 'oars', true)) {
    const a = r() < 0.5 ? 1 : -1;
    oar(g, r, -W * 0.38 * a, L * 0.0, W * 0.6 * a, L * 0.12, W * 0.38, W * 0.17);
    oar(g, r, W * 0.34 * a, L * 0.02, -W * 0.62 * a, L * 0.26, W * 0.38, W * 0.17);
  }
  // reb i stævnen
  const rp: [number, number][] = [];
  for (let t = 0; t < 14; t++) rp.push([Math.cos(t * 0.5 + 1) * W * 0.12 * (1 - t / 22), -L * 0.4 + Math.sin(t * 0.5 + 1) * W * 0.08 * (1 - t / 22) + t * 0.2]);
  rope(g, rp, 3.6, [170, 138, 86]);
}

// ------------------------------------------------------------------ tovrulle

function ropeCoil(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const tone = param(o, 'tone', 'hemp');
  const col: RGB = tone === 'tarred' ? [66, 52, 40] : tone === 'white' ? [214, 206, 184] : tone === 'manila' ? [196, 164, 100] : [170, 140, 88];
  const turns = 3.6;
  const th = R * 0.2;
  const steps = 120;
  groundShadow(g, R * 0.1, R * 0.12, R * 0.95, R * 0.9, 0.5);
  const tailAng = r() * 6.28;
  const spiral: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = tailAng + t * turns * 6.283;
    const rad = (R - th * 0.6) * (1 - 0.72 * t) + th * 0.2;
    spiral.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }
  // hale, der ligger ud af rullen
  const sp = spiral[0]!;
  const dirx = Math.cos(tailAng);
  const diry = Math.sin(tailAng);
  const tail: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const bend = Math.sin(t * 2.4) * th * 1.1 * (r() < 0.5 ? 1 : 1);
    tail.push([sp[0] + dirx * t * R * 0.55 - diry * bend, sp[1] + diry * t * R * 0.55 + dirx * bend]);
  }
  const rev = [...tail].reverse();
  const full = [...rev, ...spiral];
  void full;
  rope(g, rev.concat([sp]), th * 0.92, col);
  // sløjfer, hvor rullen er stoppet i midten
  // selve rullen: tegn fra yderst og ind, så hver omgang får sin egen skygge
  const seg = 14;
  for (let i = 0; i < spiral.length - seg; i += seg - 2) {
    const piece = spiral.slice(i, i + seg + 1);
    const trace = () => {
      g.beginPath();
      piece.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    };
    // blød skygge på ydersiden af omgangen
    g.save();
    g.translate(th * 0.12, th * 0.16);
    trace();
    g.strokeStyle = 'rgba(8,4,0,.38)';
    g.lineWidth = th * 1.05;
    g.lineCap = 'round';
    g.stroke();
    g.restore();
    rope(g, piece, th, shift(col, (r() - 0.5) * 8));
  }
  // hul i midten
  g.fillStyle = 'rgba(14,8,3,.72)';
  g.beginPath();
  g.arc(0, 0, th * 0.34, 0, 7);
  g.fill();
  // lys fra øverst til venstre
  g.save();
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.clip();
  g.fillStyle = lin(g, -R, -R, R, R, [[0, 'rgba(255,240,205,.16)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.26)']]);
  g.fillRect(-R, -R, R * 2, R * 2);
  g.restore();
}

// ------------------------------------------------------------------ kanon

const METALS: Record<string, RGB> = { iron: [66, 68, 74], bronze: [158, 112, 52], black: [38, 38, 42] };

function cannon(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const metal = param(o, 'metal', 'iron');
  const mc = METALS[metal] ?? METALS.iron!;
  const wood: RGB = [126, 86, 50];
  groundShadow(g, w * 0.04, h * 0.05, w * 0.5, h * 0.52, 0.35);
  // hjul (set oppefra: smalle, runde bånd)
  for (const sx of [-1, 1]) {
    for (const yy of [0.02, 0.37]) {
      const x = sx * w * 0.38 - w * 0.07;
      const y = h * (yy - 0.075);
      const wp = rectPath(g, x, y, w * 0.14, h * 0.15, w * 0.04);
      castShadow(g, wp, 2, 3, 3, 0.4);
      body(g, wp, shift(wood, -6), [x, y, x + w * 0.14, y + h * 0.15], { lw: 1.6, ao: 1.5, rim: 1 });
      clipped(g, wp, () => {
        woodGrain(g, r, [x, y, x + w * 0.14, y + h * 0.15], wood, { lines: 5, rot: Math.PI / 2 });
        g.fillStyle = 'rgba(70,70,74,.85)';
        g.fillRect(x, y, w * 0.025, h * 0.15);
        g.fillRect(x + w * 0.115, y, w * 0.025, h * 0.15);
        g.fillStyle = 'rgba(255,255,255,.25)';
        g.fillRect(x, y, 1, h * 0.15);
      });
    }
    // aksler
  }
  for (const yy of [0.02, 0.37]) rectBody(g, -w * 0.4, h * yy - 2, w * 0.8, 4, 2, [70, 66, 62], { lw: 1.1, ao: 0.6, rim: 0.5 });
  // lavet: to kindbakker og tværbjælker
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -w * 0.3 : w * 0.17;
    const cheek: [number, number][] = [[x0, -h * 0.12], [x0 + w * 0.13, -h * 0.12], [x0 + w * 0.13, h * 0.5], [x0 + (sx < 0 ? 0.02 : 0) * w, h * 0.5]];
    castShadow(g, polyPath(g, cheek), 2, 3, 3, 0.4);
    polyBody(g, cheek, wood, { lw: 1.8, ao: 1.8, rim: 1.1 });
    clipped(g, polyPath(g, cheek), () => {
      woodGrain(g, r, [x0, -h * 0.12, x0 + w * 0.13, h * 0.5], wood, { rot: Math.PI / 2, lines: 6, knots: 1 });
      // trin i bakken
      g.fillStyle = 'rgba(8,4,0,.4)';
      g.fillRect(x0, h * 0.06, w * 0.13, 1.4);
      g.fillRect(x0, h * 0.3, w * 0.13, 1.4);
    });
  }
  for (const yy of [0.12, 0.28, 0.46]) {
    rectBody(g, -w * 0.18, h * yy - h * 0.018, w * 0.36, h * 0.036, 1.5, shift(wood, -12), { lw: 1.4, ao: 1, rim: 0.8 });
  }
  // kile under bagstykket
  polyBody(g, [[-w * 0.08, h * 0.26], [w * 0.08, h * 0.26], [w * 0.06, h * 0.36], [-w * 0.06, h * 0.36]], shift(wood, 18), { lw: 1.3, ao: 1 });
  // løbet (cylinder set oppefra): sampling af radius langs længden
  const y0 = -h * 0.49;
  const y1 = h * 0.33;
  const hw = (t: number): number => {
    const base = w * (0.075 + 0.07 * t * t + 0.04 * Math.sin(t * Math.PI) * 0.3);
    const lip = t < 0.045 ? w * 0.034 * Math.sin((t / 0.045) * Math.PI * 0.5) : 0;
    const lipUp = t < 0.07 && t >= 0.045 ? w * 0.034 : 0;
    return base + (t < 0.07 ? Math.max(lip, lipUp) : 0);
  };
  const barrel = () => {
    g.beginPath();
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = y0 + (y1 - y0) * t;
      if (i) g.lineTo(-hw(t), y);
      else g.moveTo(-hw(t), y);
    }
    g.arc(0, y1, hw(1), Math.PI, 0, true);
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      g.lineTo(hw(t), y0 + (y1 - y0) * t);
    }
    g.closePath();
  };
  castShadow(g, barrel, w * 0.05, w * 0.05, w * 0.04, 0.5);
  const cyl = (x0: number, x1b: number): CanvasGradient =>
    lin(g, x0, 0, x1b, 0, [[0, rgb(shift(mc, -46))], [0.22, rgb(shift(mc, 34))], [0.38, rgb(shift(mc, 66), 0.95)], [0.55, rgb(mc)], [0.85, rgb(shift(mc, -38))], [1, rgb(shift(mc, -62))]]);
  barrel();
  g.fillStyle = cyl(-w * 0.17, w * 0.17);
  g.fill();
  clipped(g, barrel, () => {
    if (metal === 'bronze') {
      mottle(g, r, [-w * 0.2, y0, w * 0.2, y1], [70, 120, 100], 24, 2.4, 20, 0.35);
      mossPatch(g, r, 0, h * 0.1, w * 0.06, 14, [82, 138, 112]);
    } else {
      mottle(g, r, [-w * 0.2, y0, w * 0.2, y1], mc, 70, 1.6, 24, 0.3);
      // rustpletter
      for (let i = 0; i < 12; i++) {
        g.fillStyle = `rgba(${130 + r() * 40},${64 + r() * 30},30,${0.14 + r() * 0.14})`;
        g.beginPath();
        g.ellipse((r() - 0.5) * w * 0.26, y0 + r() * (y1 - y0), 1 + r() * 2.5, 1 + r() * 3, r() * 3, 0, 7);
        g.fill();
      }
    }
    // bånd om løbet
    for (const t of [0.045, 0.07, 0.32, 0.35, 0.62, 0.65, 0.9]) {
      const y = y0 + (y1 - y0) * t;
      g.fillStyle = 'rgba(8,4,0,.5)';
      g.fillRect(-w * 0.2, y, w * 0.4, 1.3);
      g.fillStyle = 'rgba(255,255,255,.28)';
      g.fillRect(-w * 0.2, y - 1, w * 0.4, 1);
    }
  });
  barrel();
  g.strokeStyle = OUT;
  g.lineWidth = 1.8;
  g.stroke();
  // mundingens mørke
  g.fillStyle = 'rgba(8,4,0,.55)';
  g.fillRect(-hw(0.02) * 0.7, y0 + 0.5, hw(0.02) * 1.4, 1.6);
  // tapper
  for (const sx of [-1, 1]) {
    const tx = sx * w * 0.19;
    rectBody(g, sx < 0 ? tx - w * 0.04 : tx - w * 0.02, h * 0.0 - 4, w * 0.06, 8, 2, shift(mc, 4), { lw: 1.2, ao: 0.6, rim: 0.6 });
  }
  // lukkende bøjler over tappene
  for (const sx of [-1, 1]) {
    const bx = sx * w * 0.235 - w * 0.03;
    rectBody(g, bx, -h * 0.018, w * 0.06, h * 0.036, 2, [58, 56, 56], { lw: 1.2, ao: 0.6, rim: 0.6 });
    rivet(g, bx + w * 0.03, 0, 1.3);
  }
  // tændhul og kascabel
  ellBody(g, 0, h * 0.23, 2.2, 2.2, [24, 22, 22], { lw: 1 });
  ellBody(g, 0, h * 0.375, w * 0.045, w * 0.045, mc, { lw: 1.5, ao: 1.2, light: 48, dark: 40 });
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.beginPath();
  g.arc(-w * 0.014, h * 0.364, 1.3, 0, 7);
  g.fill();
}

// ------------------------------------------------------------------ anker

function anchor(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const fin = param(o, 'finish', 'iron');
  const col: RGB = fin === 'rust' ? [138, 82, 50] : fin === 'sea' ? [78, 96, 88] : [70, 72, 78];
  const shank = () => {
    g.beginPath();
    g.moveTo(0, -h * 0.38);
    g.lineTo(0, h * 0.28);
  };
  const arms = () => {
    g.beginPath();
    g.moveTo(-w * 0.43, h * 0.14);
    g.bezierCurveTo(-w * 0.36, h * 0.38, -w * 0.12, h * 0.46, 0, h * 0.38);
    g.bezierCurveTo(w * 0.12, h * 0.46, w * 0.36, h * 0.38, w * 0.43, h * 0.14);
  };
  const full = () => {
    shank();
    arms();
  };
  castShadow(g, () => { shank(); }, 4, 5, 4, 0.0);
  g.save();
  g.translate(w * 0.045, h * 0.04);
  g.globalAlpha = 0.3;
  g.lineCap = 'round';
  g.lineWidth = w * 0.1;
  g.strokeStyle = '#000';
  shank();
  g.stroke();
  arms();
  g.stroke();
  g.restore();
  // stok (træ med jernbånd)
  const stockY = -h * 0.28;
  const sw = w * 0.82;
  const sk = rectPath(g, -sw / 2, stockY - 4.5, sw, 9, 3);
  castShadow(g, sk, 2, 3, 3, 0.45);
  body(g, sk, [92, 64, 40], [-sw / 2, stockY - 5, sw / 2, stockY + 5], { lw: 1.8, ao: 1.4, rim: 1 });
  clipped(g, sk, () => {
    woodGrain(g, r, [-sw / 2, stockY - 5, sw / 2, stockY + 5], [92, 64, 40], { lines: 6, knots: 2 });
    for (const bx of [-sw * 0.46, -sw * 0.18, sw * 0.18, sw * 0.46]) {
      g.fillStyle = 'rgba(52,52,56,.9)';
      g.fillRect(bx - 2, stockY - 5, 4, 10);
      g.fillStyle = 'rgba(255,255,255,.3)';
      g.fillRect(bx - 2, stockY - 5, 1, 10);
    }
  });
  // skaft og arme som jernrør
  tube(g, arms, w * 0.085, col);
  tube(g, shank, w * 0.095, col);
  // flugter (spade-formede hænder)
  for (const sx of [-1, 1]) {
    const tipx = sx * w * 0.43;
    const tipy = h * 0.14;
    const fp: [number, number][] = [
      [tipx - sx * w * 0.06, tipy + h * 0.06],
      [tipx + sx * w * 0.075, tipy - h * 0.01],
      [tipx + sx * w * 0.02, tipy - h * 0.1],
      [tipx - sx * w * 0.1, tipy - h * 0.02],
    ];
    polyBody(g, fp, col, { lw: 1.7, ao: 1.4, rim: 1, light: 30, dark: 30 });
    clipped(g, polyPath(g, fp), () => {
      mottle(g, r, [tipx - 12, tipy - 12, tipx + 12, tipy + 12], col, 10, 1.6, 20, 0.35);
      if (fin === 'sea') mossPatch(g, r, tipx, tipy, 6, 10, [64, 120, 80]);
    });
  }
  // ring
  const ringTrace = () => {
    g.beginPath();
    g.arc(0, -h * 0.43, w * 0.09, 0, Math.PI * 2);
  };
  tube(g, ringTrace, w * 0.045, col);
  // hals/krone
  ellBody(g, 0, h * 0.34, w * 0.07, w * 0.06, shift(col, 6), { lw: 1.5, ao: 1.5, light: 36 });
  // pletter af rust, havgræs og blå anløb
  g.save();
  g.lineWidth = w * 0.09;
  full();
  g.clip();
  g.restore();
  // rebvikling om skaftet
  if (param(o, 'rope', true)) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 18; i++) pts.push([Math.sin(i * 1.4) * w * 0.07, -h * 0.2 + i * h * 0.016]);
    rope(g, pts, 4.2, [170, 138, 86]);
    const tl: [number, number][] = [];
    for (let i = 0; i < 12; i++) tl.push([w * 0.04 + i * w * 0.012, -h * 0.2 + h * 0.275 + Math.sin(i * 0.6) * 4 + i * 1.4]);
    void tl;
  }
}

const finishParam = { key: 'finish', label: 'Overflade', type: 'select' as const, default: 'iron', options: [{ value: 'iron', label: 'Jern' }, { value: 'rust', label: 'Rustent' }, { value: 'sea', label: 'Havbevokset' }] };

export const harborKinds: ObjectKind[] = [
  kind({
    key: 'rowboat', family: 'harbor', name: 'Robåd', w: 1.7, h: 3.7, keepAspect: false, shadow: 8, bleed: 0.14, randomRotation: false,
    params: [
      { key: 'tone', label: 'Farve', type: 'select', default: 'brown', options: [{ value: 'brown', label: 'Træ' }, { value: 'blue', label: 'Blå' }, { value: 'red', label: 'Rød' }, { value: 'weathered', label: 'Falmet' }] },
      { key: 'cargo', label: 'Last', type: 'select', default: 'none', options: [{ value: 'none', label: 'Ingen' }, { value: 'fish', label: 'Fisk' }, { value: 'sacks', label: 'Sække' }] },
      { key: 'oars', label: 'Årer', type: 'toggle', default: true },
    ],
    draw: rowboat,
  }),
  kind({
    key: 'rope_coil', family: 'harbor', name: 'Tovrulle', w: 0.9, h: 0.9, randomRotation: true, sizeJitter: 0.1, shadow: 3, bleed: 0.08,
    params: [{ key: 'tone', label: 'Tov', type: 'select', default: 'hemp', options: [{ value: 'hemp', label: 'Hamp' }, { value: 'manila', label: 'Manila' }, { value: 'white', label: 'Hvidt' }, { value: 'tarred', label: 'Tjæret' }] }],
    draw: ropeCoil,
  }),
  kind({
    key: 'cannon', family: 'harbor', name: 'Kanon', w: 1.6, h: 2.3, keepAspect: false, shadow: 6, bleed: 0.06,
    params: [{ key: 'metal', label: 'Metal', type: 'select', default: 'iron', options: [{ value: 'iron', label: 'Jern' }, { value: 'bronze', label: 'Bronze' }, { value: 'black', label: 'Sortmalet' }] }],
    draw: cannon,
  }),
  kind({
    key: 'anchor', family: 'harbor', name: 'Anker', w: 1.5, h: 2, keepAspect: false, shadow: 4, bleed: 0.08, randomRotation: true,
    params: [finishParam, { key: 'rope', label: 'Rebvikling', type: 'toggle', default: true }],
    draw: anchor,
  }),
];

void ellipsePath;
void mix;
void orb;
void crack;
void plankBoard;
