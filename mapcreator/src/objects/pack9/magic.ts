import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { ellBody } from '../pack2/helpers';
import { FX, glow, glowOf, glowParam, glowStroke, holePts, mix, polyRing, radial, rgb, rune, runeRing, shift, starPath, stateParam, type G, type RGB } from './common';

/** Magiske cirkler og seglrunner i flere traditioner. Lyset er selvlysende streger; ingen skygge. */

const ringPath = (g: G, rad: number) => () => { g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); };

/** Mørk "blæk"-skive under seglet, så det også læses på lyse gulve. */
function underlay(g: G, R: number, col: RGB, a: number): void {
  g.beginPath();
  g.arc(0, 0, R * 0.98, 0, Math.PI * 2);
  g.fillStyle = radial(g, 0, 0, R, [[0, 'rgba(10,6,16,0)'], [0.75, `rgba(10,6,16,${a * 0.5})`], [1, `rgba(10,6,16,${a})`]]);
  g.fill();
  glow(g, 0, 0, R * 1.18, col, 0.3);
}

function sealArcane(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 * 0.92;
  const gl = glowOf(o, 'arcane');
  const L = (p: () => void, w = 1) => glowStroke(g, p, Math.max(1, R * 0.018 * w), gl.edge, gl.core, 0.95);
  underlay(g, R, gl.edge, 0.4);
  L(ringPath(g, R * 0.97));
  L(ringPath(g, R * 0.9), 0.6);
  L(ringPath(g, R * 0.7), 0.8);
  runeRing(g, R * 0.8, 20, R * 0.09, r, gl.edge, 0.9);
  L(starPath(g, R * 0.7, 5, 2));
  L(polyRing(g, R * 0.28, 5), 0.8);
  L(ringPath(g, R * 0.18), 0.7);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    const x = Math.cos(a) * R * 0.7;
    const y = Math.sin(a) * R * 0.7;
    g.save();
    g.translate(x, y);
    L(() => { g.beginPath(); g.arc(0, 0, R * 0.075, 0, 7); }, 0.7);
    g.restore();
    g.beginPath();
    g.arc(x, y, R * 0.025, 0, 7);
    g.fillStyle = rgb(gl.core);
    g.fill();
  }
  rune(g, 0, 0, R * 0.2, r, gl.core, 0.9);
}

function sealHoly(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 * 0.92;
  const gl = glowOf(o, 'holy');
  const L = (p: () => void, w = 1) => glowStroke(g, p, Math.max(1, R * 0.018 * w), gl.edge, gl.core, 0.95);
  glow(g, 0, 0, R * 1.25, gl.edge, 0.4);
  glow(g, 0, 0, R * 0.7, gl.core, 0.35);
  L(ringPath(g, R * 0.97));
  L(ringPath(g, R * 0.9), 0.6);
  // stråler
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const l0 = R * 0.9;
    const l1 = R * (i % 2 ? 0.8 : 0.72);
    L(() => { g.beginPath(); g.moveTo(Math.cos(a) * l0, Math.sin(a) * l0); g.lineTo(Math.cos(a) * l1, Math.sin(a) * l1); }, 0.5);
  }
  L(ringPath(g, R * 0.62), 0.8);
  L(starPath(g, R * 0.6, 8, 3));
  L(polyRing(g, R * 0.3, 4), 0.8);
  L(polyRing(g, R * 0.3, 4, 0), 0.8);
  // kors i midten
  L(() => { g.beginPath(); g.moveTo(0, -R * 0.2); g.lineTo(0, R * 0.2); g.moveTo(-R * 0.14, -R * 0.06); g.lineTo(R * 0.14, -R * 0.06); }, 1.3);
  for (let i = 0; i < 12; i++) {
    const a = r() * 6.3;
    const d = R * (0.15 + r() * 0.8);
    glow(g, Math.cos(a) * d, Math.sin(a) * d, R * 0.05, gl.core, 0.9);
  }
}

function sealDark(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 * 0.92;
  const gl = glowOf(o, 'shadow');
  const edge: RGB = [190, 30, 60];
  const L = (p: () => void, w = 1, c: RGB = edge, core: RGB = [255, 150, 160]) => glowStroke(g, p, Math.max(1, R * 0.02 * w), c, core, 0.95);
  underlay(g, R, gl.edge, 0.75);
  // røg i kanten
  for (let i = 0; i < 12; i++) {
    const a = r() * 6.3;
    glow(g, Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85, R * 0.3, gl.edge, 0.3);
  }
  L(ringPath(g, R * 0.95));
  L(ringPath(g, R * 0.68), 0.7);
  // pigge udad
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = 0.1;
    L(() => {
      g.beginPath();
      g.moveTo(Math.cos(a - b) * R * 0.95, Math.sin(a - b) * R * 0.95);
      g.lineTo(Math.cos(a) * R * 1.07, Math.sin(a) * R * 1.07);
      g.lineTo(Math.cos(a + b) * R * 0.95, Math.sin(a + b) * R * 0.95);
    }, 0.7);
  }
  runeRing(g, R * 0.81, 16, R * 0.08, r, edge, 0.9);
  L(starPath(g, R * 0.68, 5, 2, Math.PI / 2));
  g.beginPath();
  g.arc(0, 0, R * 0.12, 0, 7);
  g.fillStyle = 'rgb(10,4,10)';
  g.fill();
  L(() => { g.beginPath(); g.arc(0, 0, R * 0.12, 0, 7); }, 0.8);
  rune(g, 0, 0, R * 0.14, r, [255, 120, 130], 0.9);
}

function sealNature(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 * 0.92;
  const gl = glowOf(o, 'nature');
  const L = (p: () => void, w = 1) => glowStroke(g, p, Math.max(1, R * 0.018 * w), gl.edge, gl.core, 0.9);
  glow(g, 0, 0, R * 1.2, gl.edge, 0.3);
  // ranke med blade i stedet for ring
  const vine = (rad: number, amp: number, ph: number) => () => {
    g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const rr = rad + Math.sin(a * 14 + ph) * amp;
      if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  };
  L(vine(R * 0.9, R * 0.03, 0));
  L(vine(R * 0.9, R * 0.03, Math.PI), 0.8);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    g.save();
    g.translate(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92);
    g.rotate(a + (i % 2 ? 0.7 : -0.7));
    g.beginPath();
    g.ellipse(R * 0.06, 0, R * 0.07, R * 0.028, 0, 0, 7);
    g.fillStyle = rgb(shift(gl.edge, 20 + r() * 30), 0.9);
    g.fill();
    g.strokeStyle = rgb(gl.core, 0.9);
    g.lineWidth = 0.8;
    g.stroke();
    g.restore();
  }
  L(ringPath(g, R * 0.68), 0.7);
  // spiral
  L(() => {
    g.beginPath();
    for (let i = 0; i <= 90; i++) {
      const t = i / 90;
      const a = t * Math.PI * 5;
      const rr = R * (0.05 + t * 0.55);
      if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  }, 1);
  // blomster
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28 + 0.3;
    const x = Math.cos(a) * R * 0.78;
    const y = Math.sin(a) * R * 0.78;
    for (let k = 0; k < 5; k++) {
      const b = (k / 5) * 6.28;
      g.fillStyle = 'rgba(255,230,240,.92)';
      g.beginPath();
      g.arc(x + Math.cos(b) * R * 0.035, y + Math.sin(b) * R * 0.035, R * 0.026, 0, 7);
      g.fill();
    }
    g.fillStyle = 'rgb(255,214,90)';
    g.beginPath();
    g.arc(x, y, R * 0.02, 0, 7);
    g.fill();
  }
}

function sealBlood(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 * 0.92;
  const col: RGB = [138, 14, 22];
  const L = (path: () => void, w = 1) => {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    path();
    g.strokeStyle = 'rgba(60,4,8,.55)';
    g.lineWidth = R * 0.05 * w;
    g.stroke();
    path();
    g.strokeStyle = rgb(col, 0.95);
    g.lineWidth = R * 0.034 * w;
    g.stroke();
    path();
    g.strokeStyle = 'rgba(230,80,80,.35)';
    g.lineWidth = R * 0.01 * w;
    g.translate(-0.6, -0.8);
    g.stroke();
    g.translate(0.6, 0.8);
  };
  glow(g, 0, 0, R * 1.0, [90, 6, 12], 0.25);
  const wob = (rad: number, amp: number) => () => {
    g.beginPath();
    const ph = r() * 6;
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2.04;
      const rr = rad + Math.sin(a * 5 + ph) * amp + (r() - 0.5) * amp * 0.5;
      if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  };
  L(wob(R * 0.93, R * 0.015));
  L(wob(R * 0.8, R * 0.015), 0.7);
  runeRing(g, R * 0.865, 18, R * 0.07, r, [150, 20, 26], 0.9);
  const pts: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + ((i * 2) / 5) * Math.PI * 2;
    pts.push([Math.cos(a) * R * 0.78 + (r() - 0.5) * R * 0.03, Math.sin(a) * R * 0.78 + (r() - 0.5) * R * 0.03]);
  }
  pts.push(pts[0]!);
  L(() => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); });
  // dryp og pøl
  for (let i = 0; i < 9; i++) {
    const p = pts[i % 5]!;
    const len = R * (0.05 + r() * 0.12);
    g.strokeStyle = rgb(col, 0.9);
    g.lineWidth = R * 0.02;
    g.beginPath();
    g.moveTo(p[0], p[1]);
    g.lineTo(p[0] + (r() - 0.5) * 3, p[1] + len);
    g.stroke();
    g.beginPath();
    g.arc(p[0], p[1] + len, R * 0.017, 0, 7);
    g.fillStyle = rgb(col);
    g.fill();
  }
  for (let i = 0; i < 22; i++) {
    const a = r() * 6.3;
    const d = Math.sqrt(r()) * R;
    g.fillStyle = rgb(col, 0.5 + r() * 0.4);
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, 0.8 + r() * 2.2, 0, 7);
    g.fill();
  }
  g.beginPath();
  g.ellipse(0, 0, R * 0.12, R * 0.1, 0.4, 0, 7);
  g.fillStyle = rgb(col, 0.9);
  g.fill();
  g.fillStyle = 'rgba(255,180,170,.5)';
  g.beginPath();
  g.ellipse(-R * 0.04, -R * 0.04, R * 0.04, R * 0.02, -0.5, 0, 7);
  g.fill();
}

/** Manings-cirkel af kridt med stearinlys i punkterne. */
function sealChalk(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 * 0.92;
  const flames = param(o, 'lit', true);
  const chalk = (path: () => void, w = 1) => {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [lw, a] of [[R * 0.03 * w, 0.18], [R * 0.016 * w, 0.85]] as const) {
      path();
      g.strokeStyle = `rgba(240,236,224,${a})`;
      g.lineWidth = lw;
      g.setLineDash([R * 0.2, R * 0.012]);
      g.stroke();
      g.setLineDash([]);
    }
  };
  chalk(ringPath(g, R * 0.9));
  chalk(ringPath(g, R * 0.82), 0.7);
  chalk(starPath(g, R * 0.82, 5, 2));
  chalk(ringPath(g, R * 0.34), 0.8);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.28;
    g.save();
    g.translate(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
    g.rotate(a + Math.PI / 2);
    for (let k = 0; k < 2; k++) {
      g.strokeStyle = 'rgba(240,236,224,.8)';
      g.lineWidth = Math.max(0.8, R * 0.012);
      g.beginPath();
      const x = (r() - 0.5) * R * 0.06;
      g.moveTo(x, -R * 0.03);
      g.lineTo(x + (r() - 0.5) * R * 0.06, R * 0.03);
      g.stroke();
    }
    g.restore();
  }
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * 6.28;
    const x = Math.cos(a) * R * 0.82;
    const y = Math.sin(a) * R * 0.82;
    if (flames) glow(g, x, y, R * 0.33, [255, 170, 70], 0.55);
    ellBody(g, x, y, R * 0.055, R * 0.055, [236, 226, 196], { lw: 1.1, light: 30 });
    g.beginPath();
    g.arc(x, y, R * 0.02, 0, 7);
    g.fillStyle = 'rgb(70,50,30)';
    g.fill();
    if (flames) {
      glow(g, x - R * 0.005, y - R * 0.005, R * 0.045, [255, 240, 180], 1);
    }
  }
}

function portalSwirl(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 * 0.92;
  const gl = glowOf(o, 'arcane');
  const active = param(o, 'state', 'open') === 'open';
  glow(g, 0, 0, R * 1.25, gl.edge, active ? 0.5 : 0.18);
  g.beginPath();
  g.arc(0, 0, R * 0.8, 0, 7);
  g.fillStyle = radial(g, 0, 0, R * 0.8, [[0, active ? rgb(gl.core, 0.95) : 'rgba(10,6,16,.9)'], [0.4, active ? rgb(gl.edge, 0.85) : 'rgba(10,6,16,.85)'], [1, rgb(shift(gl.edge, -80), 0.9)]]);
  g.fill();
  const arms = 4;
  if (active) {
    for (let k = 0; k < arms; k++) {
      glowStrokeSpiral(g, R * 0.8, k / arms, gl);
    }
  }
  const L = (p: () => void, w = 1) => glowStroke(g, p, Math.max(1, R * 0.02 * w), gl.edge, gl.core, 0.95);
  L(ringPath(g, R * 0.88));
  L(ringPath(g, R * 0.96), 0.6);
  runeRing(g, R * 0.92, 18, R * 0.06, r, gl.core, 0.9);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.28 + Math.PI / 4;
    L(() => { g.beginPath(); g.moveTo(Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96); g.lineTo(Math.cos(a) * R * 1.08, Math.sin(a) * R * 1.08); }, 1.2);
  }
}

function glowStrokeSpiral(g: G, R: number, off: number, gl: { core: RGB; edge: RGB }): void {
  const trace = () => {
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a = off * Math.PI * 2 + t * Math.PI * 2.2;
      const rr = R * (0.04 + t * 0.94);
      if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  };
  glowStroke(g, trace, R * 0.03, mix(gl.edge, [255, 255, 255], 0.2), gl.core, 0.9);
}

/** Ru, uregelmæssig brændemærke-rune (en cirkel brændt ind i gulvet, glødende i kanten). */
function sealBurned(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 * 0.92;
  const gl = glowOf(o, 'fire');
  underlay(g, R, [40, 20, 10], 0.6);
  const L = (p: () => void, w = 1) => glowStroke(g, p, Math.max(1, R * 0.02 * w), gl.edge, gl.core, 0.9);
  const wobRing = (rad: number) => () => {
    g.beginPath();
    const ph = r() * 6;
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const rr = rad + Math.sin(a * 7 + ph) * R * 0.01;
      if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  };
  L(wobRing(R * 0.94));
  L(wobRing(R * 0.74), 0.7);
  runeRing(g, R * 0.84, 16, R * 0.09, r, gl.edge, 0.95);
  L(polyRing(g, R * 0.7, 4));
  L(polyRing(g, R * 0.7, 4, 0), 0.8);
  L(ringPath(g, R * 0.3), 0.8);
  glow(g, 0, 0, R * 0.3, gl.core, 0.5);
  const pts = holePts(r, R * 0.15, R * 0.15, 0.3, 8);
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.fillStyle = 'rgba(20,8,4,.85)';
  g.fill();
}

const common = { shadow: 0, bleed: 0.3, randomRotation: true, layers: FX } as const;

export const magicKinds: ObjectKind[] = [
  kind({ key: 'spellx_seal_arcane', family: 'spellx', name: 'Arkan segl', w: 4, h: 4, ...common, params: [glowParam('arcane')], tags: ['magic', 'dungeon', 'temple'], draw: sealArcane }),
  kind({ key: 'spellx_seal_holy', family: 'spellx', name: 'Hellig cirkel', w: 4, h: 4, ...common, params: [glowParam('holy')], tags: ['magic', 'temple', 'crypt'], draw: sealHoly }),
  kind({ key: 'spellx_seal_dark', family: 'spellx', name: 'Mørk cirkel', w: 4, h: 4, ...common, params: [glowParam('shadow')], tags: ['magic', 'dungeon', 'crypt'], draw: sealDark }),
  kind({ key: 'spellx_seal_nature', family: 'spellx', name: 'Naturcirkel', w: 4, h: 4, ...common, params: [glowParam('nature')], tags: ['magic', 'forest', 'outdoor'], draw: sealNature }),
  kind({ key: 'spellx_seal_blood', family: 'spellx', name: 'Blodcirkel', w: 4, h: 4, ...common, tags: ['magic', 'dungeon', 'crypt'], draw: sealBlood }),
  kind({ key: 'spellx_seal_burned', family: 'spellx', name: 'Brændt segl', w: 3, h: 3, ...common, params: [glowParam('fire')], tags: ['magic', 'dungeon', 'ruin'], draw: sealBurned }),
  kind({ key: 'spellx_summon_chalk', family: 'spellx', name: 'Maningscirkel af kridt', w: 3.4, h: 3.4, ...common, params: [{ key: 'lit', label: 'Tændte lys', type: 'toggle', default: true }], tags: ['magic', 'dungeon', 'house'], draw: sealChalk }),
  kind({ key: 'spellx_portal_swirl', family: 'spellx', name: 'Portal, hvirvel', w: 3, h: 3, ...common, params: [stateParam('open', [['open', 'Åben'], ['closed', 'Lukket']]), glowParam('arcane')], tags: ['magic', 'dungeon', 'temple'], draw: portalSwirl }),
];
