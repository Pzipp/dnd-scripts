import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { blob, rng } from '../util';
import { blobBody, blobPath, clipped, ellBody, lin, mottle, OUT, polyBody, polyPath, radial, rectBody, rectPath, rgb, rivet, shift, tube, type G, type RGB, type Rnd } from '../pack2/helpers';
import { glowDot, glowLine, glowOf, glowParam, runeMarks } from './mystery';

/** Mystik 2 (pakke 5): lyskugler, uforklarlige maskiner, glaskrukker med mærkelige kroppe, artefakter, revner i virkeligheden og et styrtet kapsel. */

const BRASS: RGB = [176, 138, 62];
const COPPER: RGB = [184, 98, 56];

// ------------------------------------------------------------------ lyskugler

function sphere(g: G, x: number, y: number, rad: number, col: RGB, a = 1): void {
  glowDot(g, x, y, rad * 2.6, col, 0.5 * a);
  g.fillStyle = radial(g, x, y, rad, [[0, rgb(shift(col, 120), a)], [0.35, rgb(shift(col, 30), a)], [0.85, rgb(shift(col, -60), a)], [1, rgb(shift(col, -100), a)]], x - rad * 0.3, y - rad * 0.3, rad * 0.05);
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.fill();
  g.strokeStyle = rgb(shift(col, -120), 0.85 * a);
  g.lineWidth = 1.1;
  g.stroke();
  g.fillStyle = `rgba(255,255,255,${0.75 * a})`;
  g.beginPath();
  g.ellipse(x - rad * 0.38, y - rad * 0.42, rad * 0.22, rad * 0.12, -0.7, 0, 7);
  g.fill();
}

const orbCradle = kind({
  key: 'myst_orb_cradle', family: 'mystery', name: 'Lyskugle i messingholder', w: 1, h: 1, shadow: 12, bleed: 0.4, tags: ['magic', 'rich', 'temple', 'indoor'], params: [glowParam],
  draw: (g, o) => {
    const glow = glowOf(o, 3);
    const R = Math.min(o.w, o.h) / 2;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.28 + 0.5;
      tube(g, () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); }, R * 0.12, BRASS, { outline: 1.4 });
      ellBody(g, Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, R * 0.1, R * 0.1, shift(BRASS, 10), { lw: 1.2 });
    }
    g.beginPath(); g.arc(0, 0, R * 0.58, 0, 7); g.arc(0, 0, R * 0.46, 0, 7, true);
    g.fillStyle = lin(g, -R, -R, R, R, [[0, rgb(shift(BRASS, 40))], [1, rgb(shift(BRASS, -50))]]);
    g.fill('evenodd');
    g.strokeStyle = OUT; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, R * 0.58, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, R * 0.46, 0, 7); g.stroke();
    sphere(g, 0, 0, R * 0.44, glow);
  },
});

const orbCluster = kind({
  key: 'myst_orb_cluster', family: 'mystery', name: 'Svævende lyskugler', w: 2, h: 2, shadow: 24, randomRotation: true, bleed: 0.12, tags: ['magic', 'ruin', 'temple', 'dungeon'], params: [glowParam, { key: 'count', label: 'Antal', type: 'range', min: 2, max: 6, step: 1, default: 4 } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const base = glowOf(o, 0);
    const R = Math.min(o.w, o.h) / 2;
    const n = param(o, 'count', 4);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + r() * 0.8;
      pts.push([Math.cos(a) * R * (0.25 + r() * 0.35), Math.sin(a) * R * (0.25 + r() * 0.35), R * (0.1 + r() * 0.1)]);
    }
    // tråde af lys mellem kuglerne
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % n]!;
      glowLine(g, () => { g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo((p[0] + q[0]) / 2 + (r() - 0.5) * 20, (p[1] + q[1]) / 2 + (r() - 0.5) * 20, q[0], q[1]); }, base, 0.7, 0.45);
    }
    for (const [x, y, rad] of pts) sphere(g, x, y, rad, shift(base, (r() - 0.5) * 30));
    for (let i = 0; i < 10; i++) { g.fillStyle = rgb(base, 0.6); g.beginPath(); g.arc((r() - 0.5) * R * 1.8, (r() - 0.5) * R * 1.8, 0.8 + r(), 0, 7); g.fill(); }
  },
});

const crystalBall = kind({
  key: 'myst_orb_pedestal', family: 'mystery', name: 'Krystalkugle på sokkel', w: 1.4, h: 1.4, shadow: 14, bleed: 0.05, tags: ['magic', 'rich', 'temple', 'indoor'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 1);
    const R = Math.min(o.w, o.h) / 2;
    const oct: [number, number][] = [];
    for (let i = 0; i < 8; i++) oct.push([Math.cos((i / 8) * 6.28 + 0.39) * R * 0.98, Math.sin((i / 8) * 6.28 + 0.39) * R * 0.98]);
    polyBody(g, oct, [138, 132, 124], { lw: 1.8, ao: 3 });
    const oct2: [number, number][] = oct.map(([x, y]) => [x * 0.78, y * 0.78]);
    polyBody(g, oct2, [158, 152, 142], { lw: 1.4, ao: 2 });
    g.strokeStyle = 'rgba(30,20,10,.5)'; g.lineWidth = 1;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(oct[i]![0], oct[i]![1]); g.lineTo(oct2[i]![0], oct2[i]![1]); g.stroke(); }
    // kuglen: skyer indeni
    const rad = R * 0.5;
    g.fillStyle = radial(g, 0, 0, rad, [[0, 'rgb(220,230,240)'], [1, 'rgb(90,110,140)']], -rad * 0.3, -rad * 0.3, 1);
    g.beginPath(); g.arc(0, 0, rad, 0, 7); g.fill();
    clipped(g, () => { g.beginPath(); g.arc(0, 0, rad, 0, 7); }, () => {
      for (let i = 0; i < 9; i++) {
        glowDot(g, (r() - 0.5) * rad * 1.4, (r() - 0.5) * rad * 1.4, rad * (0.35 + r() * 0.4), shift(glow, (r() - 0.5) * 50), 0.55);
      }
      glowLine(g, () => { g.beginPath(); for (let t = 0; t < 10; t += 0.3) { const q = t * rad * 0.07; if (t) g.lineTo(Math.cos(t) * q, Math.sin(t) * q); else g.moveTo(0, 0); } }, glow, 0.8, 0.6);
    });
    g.strokeStyle = 'rgba(20,20,30,.8)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, rad, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-rad * 0.38, -rad * 0.42, rad * 0.24, rad * 0.12, -0.7, 0, 7); g.fill();
  },
});

// ------------------------------------------------------------------ maskiner

function gear(g: G, cx: number, cy: number, R: number, teeth: number, col: RGB, rot: number): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < teeth; i++) {
    const a = rot + (i / teeth) * 6.28;
    const da = 6.28 / teeth;
    for (const [k, rr] of [[0.0, 0.82], [0.2, 0.82], [0.28, 1.0], [0.52, 1.0], [0.6, 0.82]] as const) pts.push([cx + Math.cos(a + da * k) * R * rr, cy + Math.sin(a + da * k) * R * rr]);
  }
  polyBody(g, pts, col, { lw: 1.4, ao: R * 0.06, rim: 0.9 });
  ellBody(g, cx, cy, R * 0.62, R * 0.62, shift(col, -16), { lw: 1.1, ao: 1 });
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * 6.28;
    g.fillStyle = 'rgba(8,4,0,.7)';
    g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42, R * 0.1, 0, 7); g.fill();
  }
  rivet(g, cx, cy, R * 0.14, [200, 170, 90]);
}

const machineGears = kind({
  key: 'myst_machine_gears', family: 'mystery', name: 'Uforklarlig maskine, tandhjul', w: 2.6, h: 2.2, shadow: 14, bleed: 0.05, tags: ['magic', 'dungeon', 'ruin', 'indoor'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 3);
    const { w, h } = o;
    rectBody(g, -w / 2, -h / 2, w, h, 6, [86, 78, 66], { lw: 2, ao: 4 });
    clipped(g, rectPath(g, -w / 2, -h / 2, w, h, 6), () => mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], [86, 78, 66], 24, 10, 20, 0.4));
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) rivet(g, sx * (w / 2 - 8), sy * (h / 2 - 8), 3, [170, 150, 110]);
    // rør
    tube(g, () => { g.beginPath(); g.moveTo(-w * 0.44, h * 0.34); g.lineTo(-w * 0.1, h * 0.34); g.lineTo(-w * 0.1, h * 0.14); }, 9, COPPER, { outline: 1.6 });
    tube(g, () => { g.beginPath(); g.moveTo(w * 0.44, -h * 0.34); g.lineTo(w * 0.14, -h * 0.34); g.lineTo(w * 0.14, -h * 0.08); }, 9, COPPER, { outline: 1.6 });
    gear(g, -w * 0.2, -h * 0.12, h * 0.3, 14, BRASS, r() * 6);
    gear(g, w * 0.16, h * 0.0, h * 0.24, 11, shift(BRASS, -14), 0.3);
    gear(g, w * 0.3, h * 0.28, h * 0.14, 8, shift(BRASS, 14), 0.1);
    // glødende kerne
    ellBody(g, -w * 0.38, h * 0.16, h * 0.15, h * 0.15, [60, 54, 50], { lw: 1.6, ao: 2 });
    glowDot(g, -w * 0.38, h * 0.16, h * 0.24, glow, 0.9);
    g.fillStyle = rgb(shift(glow, 90)); g.beginPath(); g.arc(-w * 0.38, h * 0.16, h * 0.07, 0, 7); g.fill();
    // manometer
    ellBody(g, w * 0.4, -h * 0.12, h * 0.1, h * 0.1, [200, 190, 160], { lw: 1.4, ao: 1 });
    g.strokeStyle = 'rgb(160,30,30)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(w * 0.4, -h * 0.12); g.lineTo(w * 0.4 + h * 0.07, -h * 0.17); g.stroke();
    // damp
    for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(240,240,240,${0.1 + r() * 0.12})`; g.beginPath(); g.arc(w * 0.14 + (r() - 0.5) * 14, -h * 0.06 - r() * 20, 5 + r() * 8, 0, 7); g.fill(); }
  },
});

const machineCoil = kind({
  key: 'myst_machine_coil', family: 'mystery', name: 'Spolemaskine med lyn', w: 2, h: 2, shadow: 16, randomRotation: true, bleed: 0.08, tags: ['magic', 'dungeon', 'indoor', 'ruin'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 0);
    const R = Math.min(o.w, o.h) / 2;
    ellBody(g, 0, 0, R * 0.92, R * 0.92, [76, 72, 70], { lw: 2, ao: 4 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.28 + 0.78;
      const x = Math.cos(a) * R * 0.72;
      const y = Math.sin(a) * R * 0.72;
      tube(g, () => { g.beginPath(); g.moveTo(x, y); g.lineTo(x * 0.5, y * 0.5); }, R * 0.1, [150, 150, 160], { outline: 1.2 });
      ellBody(g, x, y, R * 0.12, R * 0.12, [190, 186, 170], { lw: 1.3 });
    }
    // spolen: koncentriske kobberringe
    for (let i = 5; i >= 1; i--) ellBody(g, 0, 0, R * 0.09 * i + R * 0.05, R * 0.09 * i + R * 0.05, shift(COPPER, i % 2 ? 12 : -12), { lw: 1.2, ao: 1.4 });
    sphere(g, 0, 0, R * 0.16, glow);
    // lyn mellem spolen og stængerne
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.28 + 0.78;
      const x = Math.cos(a) * R * 0.72;
      const y = Math.sin(a) * R * 0.72;
      glowLine(g, () => {
        g.beginPath();
        g.moveTo(0, 0);
        for (let k = 1; k <= 6; k++) g.lineTo(x * (k / 6) + (r() - 0.5) * 14 * (k < 6 ? 1 : 0), y * (k / 6) + (r() - 0.5) * 14 * (k < 6 ? 1 : 0));
      }, glow, 0.9, 0.85);
    }
  },
});

const machinePrism = kind({
  key: 'myst_machine_prism', family: 'mystery', name: 'Prisme på stativ', w: 2, h: 2, shadow: 14, randomRotation: true, bleed: 0.1, tags: ['magic', 'temple', 'ruin', 'indoor'],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = Math.min(o.w, o.h) / 2;
    const beams: [number, RGB][] = [[0.3, [255, 90, 90]], [0.55, [255, 200, 80]], [0.8, [90, 230, 160]], [1.05, [100, 140, 255]], [1.3, [190, 110, 255]]];
    for (const [a, col] of beams) glowLine(g, () => { g.beginPath(); g.moveTo(Math.cos(0.2) * R * 0.1, 0); g.lineTo(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98); }, col, 1.3, 0.8);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.28 + 1.5;
      tube(g, () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5); }, R * 0.07, [80, 76, 74], { outline: 1.3 });
      ellBody(g, Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, R * 0.06, R * 0.06, [54, 50, 48], { lw: 1.2 });
    }
    const hex: [number, number][] = [];
    for (let i = 0; i < 6; i++) hex.push([Math.cos((i / 6) * 6.28 + 0.5) * R * 0.3, Math.sin((i / 6) * 6.28 + 0.5) * R * 0.3]);
    for (let i = 0; i < 6; i++) {
      const lit = Math.cos(((i + 0.5) / 6) * 6.28 + 0.5 - 3.93);
      polyBody(g, [[0, 0], hex[i]!, hex[(i + 1) % 6]!], [170 + lit * 60, 200 + lit * 40, 230], { lw: 1, ao: 0, rim: 0 });
    }
    g.fillStyle = 'rgba(255,255,255,.45)';
    polyPath(g, [[0, 0], hex[4]!, hex[5]!])();
    g.fill();
    void r;
  },
});

// ------------------------------------------------------------------ glaskrukker

function tank(g: G, o: DrawInput, content: (g: G, r: Rnd, w: number, h: number, liquid: RGB) => void, broken: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const liquid: RGB = ([[96, 200, 150], [120, 170, 230], [220, 190, 90], [200, 120, 160]] as RGB[])[Math.min(3, parseInt(param(o, 'liquid', '0'), 10) || 0)]!;
  const cap = Math.min(w, h) * 0.2;
  const x0 = -w / 2 + cap;
  const bw = w - cap * 2;
  const body = rectPath(g, x0, -h / 2 + 2, bw, h - 4, Math.min(h, bw) * 0.3);
  // metalkapper i enderne
  for (const s of [-1, 1] as const) {
    const cx = s < 0 ? -w / 2 : w / 2 - cap;
    rectBody(g, cx, -h / 2, cap, h, 4, [96, 98, 108], { lw: 1.8, ao: 2.4 });
    for (const yy of [-h * 0.34, h * 0.34]) rivet(g, cx + cap / 2, yy, cap * 0.12, [170, 170, 180]);
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(cx + 2, -h / 2 + 2, cap * 0.25, h - 4);
  }
  body();
  g.fillStyle = lin(g, 0, -h / 2, 0, h / 2, [[0, rgb(shift(liquid, 40), 0.95)], [0.6, rgb(liquid, 0.95)], [1, rgb(shift(liquid, -70), 0.97)]]);
  g.fill();
  clipped(g, body, () => {
    content(g, r, bw, h - 4, liquid);
    for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 0.9; g.beginPath(); g.arc((r() - 0.5) * bw * 0.9, (r() - 0.5) * h * 0.8, 1 + r() * 2.2, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.22)';
    g.fillRect(x0 + 6, -h / 2 + 6, bw - 12, h * 0.12);
    g.fillStyle = 'rgba(255,255,255,.1)';
    g.fillRect(x0 + 6, -h / 2 + h * 0.2, bw * 0.5, h * 0.05);
    g.fillStyle = 'rgba(0,0,0,.18)';
    g.fillRect(x0, h / 2 - h * 0.22, bw, h * 0.22);
    if (broken) {
      g.strokeStyle = 'rgba(240,250,255,.85)'; g.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        let x = x0 + bw * (0.2 + i * 0.3);
        let y = -h / 2;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 20; y += h / 6; g.lineTo(x, y); }
        g.stroke();
      }
    }
  });
  body();
  g.strokeStyle = 'rgba(30,50,60,.9)'; g.lineWidth = 2.2; g.stroke();
  body();
  g.strokeStyle = 'rgba(210,235,245,.55)'; g.lineWidth = 1; g.save(); g.translate(-1, -1); g.stroke(); g.restore();
  // slanger op fra kapperne
  tube(g, () => { g.beginPath(); g.moveTo(-w / 2 + cap / 2, -h / 2); g.quadraticCurveTo(-w / 2 + cap / 2, -h / 2 - 14, -w * 0.35, -h / 2 - 10); }, 4, [60, 56, 52], { outline: 1.2 });
}

const liquidParam: ParamDef = { key: 'liquid', label: 'Væske', type: 'select', default: '0', options: [{ value: '0', label: 'Grøn' }, { value: '1', label: 'Blå' }, { value: '2', label: 'Gylden' }, { value: '3', label: 'Lyserød' }] };

const BODY: RGB = [226, 206, 188];
const tankKinds: ObjectKind[] = [
  kind({ key: 'myst_tank_humanoid', family: 'mystery', name: 'Glaskrukke med skikkelse', w: 3, h: 1.4, shadow: 14, bleed: 0.12, tags: ['magic', 'dungeon', 'indoor', 'ruin'], params: [liquidParam],
    draw: (g, o) => tank(g, o, (g2, r, w, h) => {
      g2.save(); g2.rotate(0.06);
      g2.fillStyle = rgb(BODY, 0.9);
      g2.strokeStyle = 'rgba(60,40,30,.7)'; g2.lineWidth = 1.2;
      g2.beginPath(); g2.ellipse(-w * 0.34, 0, h * 0.17, h * 0.2, 0, 0, 7); g2.fill(); g2.stroke();
      g2.beginPath(); g2.ellipse(-w * 0.05, 0, w * 0.2, h * 0.22, 0, 0, 7); g2.fill(); g2.stroke();
      for (const s of [-1, 1]) { g2.beginPath(); g2.ellipse(-w * 0.14, s * h * 0.3, w * 0.12, h * 0.07, s * 0.3, 0, 7); g2.fill(); g2.stroke(); g2.beginPath(); g2.ellipse(w * 0.3, s * h * 0.12, w * 0.18, h * 0.07, -s * 0.1, 0, 7); g2.fill(); g2.stroke(); }
      g2.fillStyle = 'rgba(30,10,10,.8)'; g2.beginPath(); g2.arc(-w * 0.38, -h * 0.05, 1.5, 0, 7); g2.arc(-w * 0.38, h * 0.07, 1.5, 0, 7); g2.fill();
      // slanger på kroppen
      g2.strokeStyle = 'rgba(40,30,30,.6)'; g2.beginPath(); g2.moveTo(-w * 0.2, 0); g2.quadraticCurveTo(-w * 0.1, -h * 0.4, w * 0.1, -h * 0.46); g2.stroke();
      g2.restore(); void r;
    }, false) }),
  kind({ key: 'myst_tank_tentacle', family: 'mystery', name: 'Glaskrukke med tentakelvæsen', w: 3, h: 1.4, shadow: 14, bleed: 0.12, tags: ['magic', 'dungeon', 'indoor', 'ruin'], params: [liquidParam],
    draw: (g, o) => tank(g, o, (g2, r, w, h) => {
      const base: RGB = [140, 70, 150];
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (0.55 + (i / 8) * 0.9);
        const sx = Math.cos(a) * h * 0.1;
        g2.strokeStyle = rgb(shift(base, -20 + (r() - 0.5) * 20), 0.95);
        g2.lineWidth = 5 - i * 0.2;
        g2.lineCap = 'round';
        g2.beginPath(); g2.moveTo(sx, 0);
        g2.bezierCurveTo(Math.cos(a) * w * 0.2 + w * 0.1, Math.sin(a) * h * 0.5, w * 0.3 + r() * w * 0.1, Math.sin(a) * h * 0.45, w * (0.25 + r() * 0.2), Math.sin(a + 1) * h * 0.3);
        g2.stroke();
      }
      g2.fillStyle = rgb(shift(base, 20)); g2.beginPath(); g2.ellipse(-w * 0.04, 0, w * 0.15, h * 0.28, 0, 0, 7); g2.fill();
      g2.strokeStyle = 'rgba(20,6,24,.8)'; g2.lineWidth = 1.3; g2.stroke();
      for (let i = 0; i < 5; i++) { const ex = -w * 0.1 + r() * w * 0.12; const ey = (r() - 0.5) * h * 0.36; g2.fillStyle = 'rgb(240,230,160)'; g2.beginPath(); g2.arc(ex, ey, 3.2, 0, 7); g2.fill(); g2.fillStyle = 'rgb(20,6,10)'; g2.beginPath(); g2.arc(ex, ey, 1.3, 0, 7); g2.fill(); }
    }, false) }),
  kind({ key: 'myst_tank_embryo', family: 'mystery', name: 'Glaskrukke med foster', w: 2, h: 1.4, shadow: 14, bleed: 0.12, tags: ['magic', 'dungeon', 'indoor', 'ruin'], params: [liquidParam],
    draw: (g, o) => tank(g, o, (g2, r, w, h) => {
      g2.fillStyle = 'rgba(236,200,190,.95)'; g2.strokeStyle = 'rgba(80,40,40,.7)'; g2.lineWidth = 1.2;
      g2.beginPath(); g2.arc(-w * 0.08, -h * 0.06, h * 0.26, 0, 7); g2.fill(); g2.stroke();
      g2.beginPath(); g2.ellipse(w * 0.14, h * 0.1, h * 0.2, h * 0.14, 0.6, 0, 7); g2.fill(); g2.stroke();
      g2.strokeStyle = 'rgba(200,120,120,.9)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(w * 0.14, h * 0.2); g2.quadraticCurveTo(w * 0.3, h * 0.46, w * 0.42, h * 0.1); g2.stroke();
      g2.fillStyle = 'rgba(60,20,30,.9)'; g2.beginPath(); g2.arc(-w * 0.16, -h * 0.08, 1.8, 0, 7); g2.fill();
      g2.fillStyle = 'rgba(200,110,110,.45)'; g2.beginPath(); g2.arc(-w * 0.04, -h * 0.1, h * 0.12, 0, 7); g2.fill(); void r;
    }, false) }),
  kind({ key: 'myst_tank_brain', family: 'mystery', name: 'Glaskrukke med hjerne', w: 1.8, h: 1.4, shadow: 14, bleed: 0.12, tags: ['magic', 'dungeon', 'indoor', 'ruin'], params: [liquidParam],
    draw: (g, o) => tank(g, o, (g2, r, w, h) => {
      g2.fillStyle = 'rgb(222,150,164)'; g2.strokeStyle = 'rgba(100,40,60,.9)'; g2.lineWidth = 1.3;
      g2.beginPath(); g2.ellipse(0, 0, w * 0.34, h * 0.3, 0, 0, 7); g2.fill(); g2.stroke();
      g2.strokeStyle = 'rgba(120,50,70,.8)'; g2.lineWidth = 1.2;
      for (let i = 0; i < 8; i++) { g2.beginPath(); let x = -w * 0.3 + r() * w * 0.6; let y = -h * 0.22 + r() * h * 0.44; g2.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 14; y += (r() - 0.5) * 12; g2.lineTo(x, y); } g2.stroke(); }
      g2.strokeStyle = 'rgb(210,200,150)'; g2.lineWidth = 2.2;
      for (const s of [-1, 1]) { g2.beginPath(); g2.moveTo(s * w * 0.32, 0); g2.quadraticCurveTo(s * w * 0.45, h * 0.3 * s, s * w * 0.48, 0); g2.stroke(); }
      glowDot(g2, 0, -h * 0.06, w * 0.2, [255, 200, 220], 0.35);
    }, false) }),
  kind({ key: 'myst_tank_broken', family: 'mystery', name: 'Knust glaskrukke', w: 3, h: 1.4, shadow: 10, bleed: 0.12, tags: ['magic', 'dungeon', 'ruin', 'indoor'], params: [liquidParam],
    draw: (g, o) => {
      const r = rng(o.seed + 7);
      const liquid: RGB = ([[96, 200, 150], [120, 170, 230], [220, 190, 90], [200, 120, 160]] as RGB[])[Math.min(3, parseInt(param(o, 'liquid', '0'), 10) || 0)]!;
      // pøl og glasskår
      g.fillStyle = rgb(liquid, 0.4);
      blobPath(g, blob(o.w * 0.46, o.h * 0.46, 0.2, 12, r))();
      g.fill();
      tank(g, { ...o, w: o.w * 0.8, h: o.h * 0.7, seed: o.seed }, (g2, r2, w, h) => {
        g2.fillStyle = 'rgba(226,206,188,.9)'; g2.beginPath(); g2.ellipse(-w * 0.08, 0, w * 0.22, h * 0.22, 0.1, 0, 7); g2.fill();
        void r2;
      }, true);
      for (let i = 0; i < 16; i++) {
        g.save(); g.translate((r() - 0.5) * o.w * 0.95, (r() - 0.5) * o.h * 0.95); g.rotate(r() * 6);
        g.fillStyle = `rgba(190,230,240,${0.35 + r() * 0.35})`;
        g.beginPath(); g.moveTo(0, -3 - r() * 5); g.lineTo(3 + r() * 3, 3); g.lineTo(-2, 4); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.7; g.stroke();
        g.restore();
      }
    } }),
];

// ------------------------------------------------------------------ artefakter

const artifactCube = kind({
  key: 'myst_artifact_cube', family: 'mystery', name: 'Svævende puslekube', w: 1, h: 1, shadow: 20, randomRotation: true, bleed: 0.5, tags: ['magic', 'ruin', 'dungeon', 'temple'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 1);
    const s = Math.min(o.w, o.h) * 0.34;
    glowDot(g, 0, 0, s * 3, glow, 0.35);
    g.save();
    g.rotate(0.6);
    for (const [k, col] of [[1, [40, 38, 52]], [0.72, [60, 56, 76]], [0.46, [86, 80, 110]]] as const) {
      rectBody(g, -s * k, -s * k, s * k * 2, s * k * 2, 2, col as RGB, { lw: 1.4, ao: 2, light: 30 });
    }
    for (const k of [1, 0.72, 0.46]) {
      glowLine(g, () => { g.beginPath(); g.rect(-s * k * 0.9, -s * k * 0.9, s * k * 1.8, s * k * 1.8); }, glow, 0.7, 0.55);
    }
    glowLine(g, () => { g.beginPath(); g.moveTo(-s, -s); g.lineTo(-s * 0.46, -s * 0.46); g.moveTo(s, -s); g.lineTo(s * 0.46, -s * 0.46); g.moveTo(-s, s); g.lineTo(-s * 0.46, s * 0.46); g.moveTo(s, s); g.lineTo(s * 0.46, s * 0.46); }, glow, 0.7, 0.55);
    sphere(g, 0, 0, s * 0.22, glow);
    g.restore();
    for (let i = 0; i < 6; i++) { g.fillStyle = rgb(glow, 0.7); g.beginPath(); g.arc((r() - 0.5) * s * 4, (r() - 0.5) * s * 4, 1 + r() * 1.4, 0, 7); g.fill(); }
  },
});

const artifactAstro = kind({
  key: 'myst_artifact_armillary', family: 'mystery', name: 'Ukendt ringinstrument', w: 1.4, h: 1.4, shadow: 16, randomRotation: true, bleed: 0.05, tags: ['magic', 'ruin', 'rich', 'temple'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 3);
    const R = Math.min(o.w, o.h) / 2;
    for (let i = 0; i < 4; i++) {
      const rad = R * (0.96 - i * 0.2);
      g.beginPath(); g.arc(0, 0, rad, 0, 7); g.arc(0, 0, rad - R * 0.07, 0, 7, true);
      g.fillStyle = lin(g, -rad, -rad, rad, rad, [[0, rgb(shift(BRASS, 50 - i * 6))], [1, rgb(shift(BRASS, -50))]]);
      g.fill('evenodd');
      g.strokeStyle = OUT; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, rad, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, rad - R * 0.07, 0, 7); g.stroke();
      for (let t = 0; t < 36; t++) { const a = (t / 36) * 6.28 + i; g.strokeStyle = 'rgba(30,18,6,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(Math.cos(a) * (rad - R * 0.07), Math.sin(a) * (rad - R * 0.07)); g.lineTo(Math.cos(a) * (rad - R * 0.02), Math.sin(a) * (rad - R * 0.02)); g.stroke(); }
      const a = r() * 6.28;
      sphere(g, Math.cos(a) * (rad - R * 0.035), Math.sin(a) * (rad - R * 0.035), R * 0.05, shift(glow, (r() - 0.5) * 60));
    }
    glowDot(g, 0, 0, R * 0.4, glow, 0.7);
    sphere(g, 0, 0, R * 0.12, glow);
  },
});

const artifactSkull = kind({
  key: 'myst_artifact_crystal_skull', family: 'mystery', name: 'Krystalkranie', w: 1, h: 1.2, shadow: 14, bleed: 0.08, tags: ['magic', 'ruin', 'crypt', 'temple', 'rich'], params: [glowParam],
  draw: (g, o) => {
    const glow = glowOf(o, 0);
    const { w, h } = o;
    rectBody(g, -w * 0.46, h * 0.22, w * 0.92, h * 0.22, 3, [96, 92, 100], { lw: 1.6, ao: 2 });
    glowDot(g, 0, -h * 0.05, w * 0.7, glow, 0.35);
    const sk: [number, number][] = [[-w * 0.3, -h * 0.22], [-w * 0.18, -h * 0.4], [w * 0.18, -h * 0.4], [w * 0.3, -h * 0.22], [w * 0.28, h * 0.02], [w * 0.16, h * 0.12], [w * 0.12, h * 0.24], [-w * 0.12, h * 0.24], [-w * 0.16, h * 0.12], [-w * 0.28, h * 0.02]];
    polyBody(g, sk, shift(glow, 70), { lw: 1.6, ao: 2, light: 40 });
    g.save(); polyPath(g, sk)(); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, -h * 0.4); g.lineTo(-w * 0.1, h * 0.1); g.moveTo(0, -h * 0.4); g.lineTo(w * 0.14, h * 0.05); g.moveTo(-w * 0.3, -h * 0.22); g.lineTo(w * 0.3, -h * 0.22); g.moveTo(-w * 0.28, h * 0.02); g.lineTo(0, -h * 0.1); g.lineTo(w * 0.28, h * 0.02); g.stroke();
    g.restore();
    for (const s of [-1, 1]) { g.fillStyle = 'rgba(8,16,20,.85)'; g.beginPath(); g.ellipse(s * w * 0.12, -h * 0.1, w * 0.09, h * 0.08, 0, 0, 7); g.fill(); glowDot(g, s * w * 0.12, -h * 0.1, w * 0.1, glow, 0.8); }
    g.fillStyle = 'rgba(8,16,20,.8)'; g.beginPath(); g.moveTo(0, h * 0.02); g.lineTo(-w * 0.04, h * 0.1); g.lineTo(w * 0.04, h * 0.1); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-w * 0.14, -h * 0.3, w * 0.07, h * 0.03, -0.6, 0, 7); g.fill();
  },
});

const idol = kind({
  key: 'myst_artifact_idol', family: 'mystery', name: 'Mærkelig afgud med mange arme', w: 1.4, h: 1.4, shadow: 16, randomRotation: true, bleed: 0.06, tags: ['magic', 'ruin', 'temple', 'dungeon', 'crypt'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 4);
    const R = Math.min(o.w, o.h) / 2;
    const stone: RGB = [96, 90, 82];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + 0.3;
      tube(g, () => { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a + 0.5) * R * 0.5, Math.sin(a + 0.5) * R * 0.5, Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); }, R * 0.16, stone, { outline: 1.6 });
      blobBody(g, blob(R * 0.1, R * 0.08, 0.2, 7, r, Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92), shift(stone, 12), { lw: 1.3, ao: 1 });
    }
    blobBody(g, blob(R * 0.46, R * 0.42, 0.1, 10, r), shift(stone, 8), { lw: 1.8, ao: R * 0.08 });
    clipped(g, blobPath(g, blob(R * 0.44, R * 0.4, 0.1, 10, r)), () => mottle(g, r, [-R, -R, R, R], stone, 12, R * 0.12, 20, 0.4));
    // ansigt: tre øjne og en kæbe
    for (const [x, y] of [[-R * 0.15, -R * 0.1], [R * 0.15, -R * 0.1], [0, -R * 0.2]] as const) { g.fillStyle = 'rgb(10,6,6)'; g.beginPath(); g.ellipse(x, y, R * 0.07, R * 0.05, 0, 0, 7); g.fill(); glowDot(g, x, y, R * 0.12, glow, 0.8); }
    g.strokeStyle = 'rgba(10,6,6,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-R * 0.2, R * 0.12); g.quadraticCurveTo(0, R * 0.26, R * 0.2, R * 0.12); g.stroke();
    glowLine(g, runeMarks(g, r, 0, R * 0.3, R * 0.2), glow, 0.8, 0.8);
  },
});

const artifactSpiral = kind({
  key: 'myst_artifact_spiral', family: 'mystery', name: 'Spiralformet metalgenstand', w: 1.2, h: 1.2, shadow: 14, randomRotation: true, bleed: 0.05, tags: ['magic', 'ruin', 'cave', 'temple'], params: [glowParam],
  draw: (g, o) => {
    const glow = glowOf(o, 2);
    const R = Math.min(o.w, o.h) / 2;
    const pts = () => {
      g.beginPath();
      for (let t = 0; t < 7.2 * Math.PI; t += 0.12) {
        const rad = R * 0.07 + t * R * 0.04;
        const x = Math.cos(t) * rad;
        const y = Math.sin(t) * rad;
        if (t) g.lineTo(x, y); else g.moveTo(x, y);
      }
    };
    glowDot(g, 0, 0, R * 1.3, glow, 0.25);
    tube(g, pts, R * 0.17, [92, 110, 112], { outline: 2 });
    glowLine(g, pts, glow, 0.7, 0.55);
    sphere(g, 0, 0, R * 0.12, glow);
  },
});

// ------------------------------------------------------------------ revner og styrtet kapsel

const riftCrack = kind({
  key: 'myst_rift_crack', family: 'mystery', name: 'Revne i virkeligheden', w: 1.4, h: 3.2, shadow: 0, randomRotation: true, bleed: 0.3, tags: ['magic', 'dungeon', 'ruin', 'cave'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 1);
    const { w, h } = o;
    glowDot(g, 0, 0, Math.max(w, h) * 0.55, glow, 0.3);
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const y = -h * 0.46 + t * h * 0.92;
      const wid = Math.sin(t * Math.PI) * w * 0.2 * (0.7 + r() * 0.6);
      const mid = Math.sin(t * 5 + r()) * w * 0.06;
      left.push([mid - wid, y]);
      right.push([mid + wid, y]);
    }
    const poly = [...left, ...right.reverse()];
    polyPath(g, poly)();
    g.fillStyle = 'rgb(4,2,12)';
    g.fill();
    clipped(g, polyPath(g, poly), () => {
      g.fillStyle = radial(g, 0, 0, h * 0.5, [[0, rgb(shift(glow, -90), 0.9)], [1, 'rgba(4,2,12,1)']]);
      g.fillRect(-w, -h, w * 2, h * 2);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; g.beginPath(); g.arc((r() - 0.5) * w * 0.3, (r() - 0.5) * h * 0.9, 0.5 + r() * 1.1, 0, 7); g.fill(); }
    });
    glowLine(g, polyPath(g, poly), glow, 1.2, 0.85);
    // spor af revner ud fra kanten
    for (let i = 0; i < 8; i++) {
      const p = poly[(r() * poly.length) | 0]!;
      const a = r() * 6.28;
      const len = 10 + r() * 24;
      glowLine(g, () => { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + Math.cos(a) * len * 0.5 + (r() - 0.5) * 6, p[1] + Math.sin(a) * len * 0.5); g.lineTo(p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len); }, glow, 0.6, 0.6);
    }
  },
});

const voidSphere = kind({
  key: 'myst_void_sphere', family: 'mystery', name: 'Tomrum med hvirvel', w: 2.2, h: 2.2, shadow: 0, bleed: 0.06, tags: ['magic', 'dungeon', 'ruin', 'cave'], params: [glowParam],
  draw: (g, o) => {
    const glow = glowOf(o, 1);
    const R = Math.min(o.w, o.h) / 2;
    glowDot(g, 0, 0, R, glow, 0.5);
    for (let i = 0; i < 4; i++) {
      const arm = () => {
        g.beginPath();
        for (let t = 0; t < 4.2; t += 0.12) {
          const rad = R * (0.3 + t * 0.15);
          const a = t * 1.1 + (i * Math.PI) / 2;
          const x = Math.cos(a) * rad;
          const y = Math.sin(a) * rad * 0.94;
          if (t) g.lineTo(x, y); else g.moveTo(x, y);
        }
      };
      glowLine(g, arm, shift(glow, -(i % 2) * 40), 1.1, 0.5);
    }
    g.fillStyle = radial(g, 0, 0, R * 0.46, [[0, 'rgb(0,0,2)'], [0.8, 'rgb(2,0,8)'], [1, 'rgb(20,10,30)']]);
    g.beginPath(); g.arc(0, 0, R * 0.44, 0, 7); g.fill();
    g.strokeStyle = rgb(shift(glow, 100), 0.9); g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, R * 0.44, 0, 7); g.stroke();
  },
});

const crashedPod = kind({
  key: 'myst_crashed_pod', family: 'mystery', name: 'Styrtet kapsel i krater', w: 3.6, h: 3.2, shadow: 14, randomRotation: true, bleed: 0.06, tags: ['magic', 'outdoor', 'ruin', 'mountain'], params: [glowParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const glow = glowOf(o, 2);
    const R = Math.min(o.w, o.h) / 2;
    // krater
    const rim = blob(R * 0.96, R * 0.88, 0.1, 18, r);
    blobBody(g, rim, [92, 74, 58], { lw: 1.8, ao: R * 0.1 });
    clipped(g, blobPath(g, rim), () => mottle(g, r, [-R, -R, R, R], [92, 74, 58], 40, R * 0.1, 24, 0.45));
    blobBody(g, blob(R * 0.78, R * 0.7, 0.12, 18, r), [44, 34, 28], { lw: 1.6, ao: R * 0.14, light: 6, dark: 40 });
    // sodsporet jord og kasteri
    for (let i = 0; i < 22; i++) {
      g.save(); g.translate((r() - 0.5) * R * 2.0, (r() - 0.5) * R * 1.8); g.rotate(r() * 6);
      g.fillStyle = rgb(shift([92, 74, 58], (r() - 0.5) * 40));
      g.fillRect(-3, -2, 3 + r() * 4, 2 + r() * 3);
      g.restore();
    }
    // selve kapslen: metalæg med sprækket skal
    const L = R * 0.62;
    g.save();
    g.rotate(0.4 + r() * 0.6);
    g.beginPath(); g.ellipse(0, 0, L, L * 0.62, 0, 0, 7);
    g.fillStyle = lin(g, -L, -L, L, L, [[0, 'rgb(190,192,200)'], [0.5, 'rgb(104,108,120)'], [1, 'rgb(36,38,46)']]);
    g.fill();
    g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
    clipped(g, () => { g.beginPath(); g.ellipse(0, 0, L, L * 0.62, 0, 0, 7); }, () => {
      for (let i = -3; i <= 3; i++) { g.strokeStyle = 'rgba(10,10,14,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(i * L * 0.27, -L); g.lineTo(i * L * 0.27, L); g.stroke(); }
      mottle(g, r, [-L, -L, L, L], [60, 52, 48], 14, 6, 20, 0.4);
    });
    // lysende sprække midt over
    glowLine(g, () => { g.beginPath(); g.moveTo(-L * 0.8, -L * 0.1); g.lineTo(-L * 0.3, L * 0.08); g.lineTo(L * 0.05, -L * 0.1); g.lineTo(L * 0.5, L * 0.12); g.lineTo(L * 0.85, 0); }, glow, 1.5, 0.95);
    glowDot(g, 0, 0, L * 0.8, glow, 0.35);
    g.restore();
    // damp
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(230,230,230,${0.12 + r() * 0.12})`; g.beginPath(); g.arc((r() - 0.5) * R * 1.2, (r() - 0.5) * R * 1.0, 8 + r() * 12, 0, 7); g.fill(); }
  },
});

export const mysteryKinds2: ObjectKind[] = [orbCradle, orbCluster, crystalBall, machineGears, machineCoil, machinePrism, ...tankKinds, artifactCube, artifactAstro, artifactSkull, idol, artifactSpiral, riftCrack, voidSphere, crashedPod];
