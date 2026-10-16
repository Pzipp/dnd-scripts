import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { polyBody } from '../pack2/helpers';
import { FX, glow, glowOf, glowParam, glowStroke, mix, radial, rgb, runeRing, shift, stateParam, type G, type ParamDef, type RGB } from './common';

/** Besværgelsesskabeloner: bløde, farvede områder, der fader ud mod kanten (aldrig hård afskæring ved boksen). */

type Style = 'fire' | 'frost' | 'poison' | 'holy' | 'shadow' | 'lightning' | 'arcane' | 'thunder' | 'gravity' | 'nature';
const PAL: Record<Style, { core: RGB; edge: RGB }> = {
  fire: { core: [255, 232, 150], edge: [236, 72, 20] },
  frost: { core: [238, 252, 255], edge: [88, 172, 240] },
  poison: { core: [214, 255, 150], edge: [84, 168, 40] },
  holy: { core: [255, 252, 220], edge: [250, 204, 88] },
  shadow: { core: [90, 60, 130], edge: [40, 20, 70] },
  lightning: { core: [255, 255, 240], edge: [110, 160, 255] },
  arcane: { core: [232, 214, 255], edge: [136, 90, 236] },
  thunder: { core: [236, 236, 244], edge: [120, 126, 150] },
  gravity: { core: [30, 14, 50], edge: [120, 70, 200] },
  nature: { core: [226, 255, 200], edge: [70, 170, 80] },
};

function disc(g: G, R: number, c: { core: RGB; edge: RGB }, a0: number, a1: number, ry = R): void {
  g.save();
  g.scale(1, ry / R);
  g.fillStyle = radial(g, 0, 0, R, [[0, rgb(c.core, a0)], [0.45, rgb(mix(c.core, c.edge, 0.5), (a0 + a1) / 2)], [0.88, rgb(c.edge, a1)], [1, rgb(c.edge, 0)]]);
  g.beginPath();
  g.arc(0, 0, R, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function softRing(g: G, R: number, col: RGB, a: number, lw: number): void {
  for (const [k, al] of [[3.2, 0.2], [1.8, 0.4], [1, 1]] as const) {
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.strokeStyle = rgb(col, a * al);
    g.lineWidth = lw * k;
    g.stroke();
  }
}

function area(g: G, o: DrawInput, style: Style): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const c = PAL[style];
  const dim = param(o, 'strength', 0.8);
  g.save();
  g.globalAlpha = dim;
  if (style === 'shadow' || style === 'gravity') {
    // mørkt: kernen er mørk, kanten fader til violet
    g.fillStyle = radial(g, 0, 0, R, [[0, 'rgba(6,2,12,.96)'], [0.6, 'rgba(14,6,26,.82)'], [0.9, rgb(c.edge, 0.4)], [1, rgb(c.edge, 0)]]);
    g.beginPath();
    g.arc(0, 0, R, 0, 7);
    g.fill();
  } else {
    disc(g, R, c, 0.5, 0.4);
  }
  const rim = Math.max(1.4, R * 0.018);
  softRing(g, R * 0.9, style === 'shadow' || style === 'gravity' ? c.edge : mix(c.edge, c.core, 0.3), 0.8, rim);
  const lw = Math.max(1, R * 0.012);
  if (style === 'fire') {
    for (let i = 0; i < 46; i++) {
      const a = r() * 6.3;
      const d0 = R * (0.1 + r() * 0.7);
      const L = R * (0.1 + r() * 0.2);
      const wd = R * (0.025 + r() * 0.03);
      g.save();
      g.translate(Math.cos(a) * d0, Math.sin(a) * d0);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, -wd);
      g.quadraticCurveTo(L * 0.5, -wd * 1.4, L, (r() - 0.5) * wd);
      g.quadraticCurveTo(L * 0.5, wd * 1.4, 0, wd);
      g.fillStyle = rgb(r() < 0.5 ? c.edge : [255, 150, 40], 0.6);
      g.fill();
      g.restore();
    }
    for (let i = 0; i < 30; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * R * 0.85;
      g.fillStyle = 'rgba(255,226,140,.9)';
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, 0.8 + r() * 1.6, 0, 7);
      g.fill();
    }
    glow(g, 0, 0, R * 0.35, [255, 255, 220], 0.9);
  } else if (style === 'frost') {
    for (let i = 0; i < 24; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * R * 0.85;
      const L = R * (0.05 + r() * 0.09);
      g.save();
      g.translate(Math.cos(a) * d, Math.sin(a) * d);
      g.rotate(a + r());
      polyBody(g, [[0, -L * 0.25], [L, 0], [0, L * 0.25], [-L * 0.3, 0]], [186, 226, 248], { lw: 0.8, ao: 0, rim: 0 });
      g.restore();
    }
    for (let i = 0; i < 16; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * R * 0.85;
      g.save();
      g.translate(Math.cos(a) * d, Math.sin(a) * d);
      g.strokeStyle = 'rgba(255,255,255,.9)';
      g.lineWidth = 1;
      const s = R * 0.04;
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const b = (k / 3) * Math.PI;
        g.moveTo(Math.cos(b) * s, Math.sin(b) * s);
        g.lineTo(-Math.cos(b) * s, -Math.sin(b) * s);
      }
      g.stroke();
      g.restore();
    }
  } else if (style === 'poison') {
    for (let i = 0; i < 12; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * R * 0.65;
      glow(g, Math.cos(a) * d, Math.sin(a) * d, R * (0.2 + r() * 0.25), mix(c.core, c.edge, r()), 0.4);
    }
    for (let i = 0; i < 16; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * R * 0.8;
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, 1.5 + r() * R * 0.025, 0, 7);
      g.strokeStyle = 'rgba(220,255,170,.7)';
      g.lineWidth = 1;
      g.stroke();
    }
  } else if (style === 'holy') {
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * 6.28;
      const L0 = R * 0.12;
      const L1 = R * (0.5 + (i % 3) * 0.14);
      g.beginPath();
      g.moveTo(Math.cos(a) * L0, Math.sin(a) * L0);
      g.lineTo(Math.cos(a) * L1, Math.sin(a) * L1);
      g.strokeStyle = 'rgba(255,248,200,.55)';
      g.lineWidth = lw * 1.6;
      g.stroke();
    }
    softRing(g, R * 0.5, c.core, 0.5, lw);
    softRing(g, R * 0.25, c.core, 0.6, lw);
    for (let i = 0; i < 20; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * R * 0.85;
      glow(g, Math.cos(a) * d, Math.sin(a) * d, R * 0.04, [255, 255, 230], 0.9);
    }
    glow(g, 0, 0, R * 0.3, [255, 255, 240], 0.95);
  } else if (style === 'shadow') {
    for (let k = 0; k < 4; k++) {
      const trace = () => {
        g.beginPath();
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          const a = (k / 4) * 6.28 + t * 4;
          const d = R * (0.1 + t * 0.78);
          if (i) g.lineTo(Math.cos(a) * d, Math.sin(a) * d);
          else g.moveTo(Math.cos(a) * d, Math.sin(a) * d);
        }
      };
      g.lineCap = 'round';
      trace();
      g.strokeStyle = 'rgba(120,70,190,.22)';
      g.lineWidth = R * 0.08;
      g.stroke();
      trace();
      g.strokeStyle = 'rgba(160,110,230,.35)';
      g.lineWidth = lw * 1.4;
      g.stroke();
    }
  } else if (style === 'lightning') {
    for (let i = 0; i < 9; i++) {
      let a = (i / 9) * 6.28 + r() * 0.4;
      const trace = () => {
        g.beginPath();
        let x = 0;
        let y = 0;
        g.moveTo(0, 0);
        for (let k = 0; k < 7; k++) {
          a += (r() - 0.5) * 0.9;
          x += Math.cos(a) * R * 0.13;
          y += Math.sin(a) * R * 0.13;
          g.lineTo(x, y);
        }
      };
      glowStroke(g, trace, lw * 1.2, c.edge, c.core, 0.9);
    }
    glow(g, 0, 0, R * 0.3, [255, 255, 250], 1);
  } else if (style === 'arcane') {
    softRing(g, R * 0.7, c.edge, 0.6, lw);
    softRing(g, R * 0.45, c.core, 0.5, lw);
    runeRing(g, R * 0.8, 18, R * 0.07, r, c.core, 0.8);
    for (let i = 0; i < 18; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * R * 0.7;
      glow(g, Math.cos(a) * d, Math.sin(a) * d, R * 0.045, c.core, 0.9);
    }
  } else if (style === 'thunder') {
    for (let k = 1; k <= 4; k++) softRing(g, R * (0.2 + k * 0.17), c.core, 0.7 - k * 0.1, lw * (1.6 - k * 0.2));
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 6.28;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2);
      g.lineTo(Math.cos(a) * R * (0.5 + r() * 0.3), Math.sin(a) * R * (0.5 + r() * 0.3));
      g.strokeStyle = 'rgba(240,240,250,.3)';
      g.lineWidth = lw;
      g.stroke();
    }
  } else if (style === 'gravity') {
    for (let k = 0; k < 3; k++) {
      const trace = () => {
        g.beginPath();
        for (let i = 0; i <= 50; i++) {
          const t = i / 50;
          const a = (k / 3) * 6.28 - t * 5;
          const d = R * (0.9 - t * 0.78);
          if (i) g.lineTo(Math.cos(a) * d, Math.sin(a) * d);
          else g.moveTo(Math.cos(a) * d, Math.sin(a) * d);
        }
      };
      glowStroke(g, trace, lw, c.edge, [190, 150, 255], 0.6);
    }
    for (let k = 1; k <= 3; k++) softRing(g, R * k * 0.22, c.edge, 0.4, lw);
  } else {
    // nature: blade og spirer
    for (let i = 0; i < 36; i++) {
      const a = r() * 6.3;
      const d = Math.sqrt(r()) * R * 0.82;
      g.save();
      g.translate(Math.cos(a) * d, Math.sin(a) * d);
      g.rotate(r() * 6.3);
      g.beginPath();
      g.ellipse(0, 0, R * 0.045, R * 0.02, 0, 0, 7);
      g.fillStyle = rgb(shift(c.edge, (r() - 0.3) * 40), 0.8);
      g.fill();
      g.restore();
    }
  }
  g.restore();
}

/** Keglen: spids i midten af boksens top, åbner sig nedad (15 ft = 3 felter). */
function cone(g: G, o: DrawInput, style: Style): void {
  const r = rng(o.seed);
  const L = o.h * 0.98;
  const half = Math.atan(0.5);
  const c = PAL[style];
  const oy = -o.h / 2;
  g.save();
  g.translate(0, oy);
  g.rotate(Math.PI / 2);
  const wedge = (k: number) => () => {
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, L * k, -half * k, half * k);
    g.closePath();
  };
  const dark = style === 'shadow';
  for (const [k, a] of [[1, 0.15], [0.94, 0.2], [0.86, 0.26]] as const) {
    wedge(k)();
    g.fillStyle = dark ? 'rgba(14,6,26,' + a * 1.6 + ')' : rgb(c.edge, a);
    g.fill();
  }
  wedge(0.98)();
  g.save();
  g.clip();
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, L);
  gr.addColorStop(0, dark ? 'rgba(20,8,36,.9)' : rgb(c.core, 0.95));
  gr.addColorStop(0.5, dark ? 'rgba(30,12,50,.5)' : rgb(mix(c.core, c.edge, 0.5), 0.5));
  gr.addColorStop(1, rgb(c.edge, 0));
  g.fillStyle = gr;
  g.fillRect(-L, -L, L * 2, L * 2);
  // indhold
  for (let i = 0; i < 40; i++) {
    const d = Math.sqrt(r()) * L * 0.95;
    const a = (r() - 0.5) * 2 * half * 0.9;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    if (style === 'fire') {
      g.fillStyle = rgb(r() < 0.5 ? [255, 190, 60] : c.edge, 0.55);
      g.beginPath();
      g.ellipse(x, y, L * (0.04 + r() * 0.06), L * 0.018, 0, 0, 7);
      g.fill();
    } else if (style === 'frost') {
      polyBody(g, [[x, y - L * 0.012], [x + L * 0.05, y], [x, y + L * 0.012], [x - L * 0.015, y]], [196, 232, 250], { lw: 0.6, ao: 0, rim: 0 });
    } else if (style === 'lightning') {
      g.strokeStyle = 'rgba(210,230,255,.8)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + L * 0.05, y + (r() - 0.5) * L * 0.05);
      g.lineTo(x + L * 0.09, y + (r() - 0.5) * L * 0.05);
      g.stroke();
    } else {
      glow(g, x, y, L * (0.04 + r() * 0.07), mix(c.core, c.edge, r()), 0.5);
    }
  }
  g.restore();
  // kanter
  for (const sgn of [-1, 1]) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(half * sgn) * L * 0.98, Math.sin(half * sgn) * L * 0.98);
    g.strokeStyle = rgb(c.edge, 0.55);
    g.lineWidth = Math.max(1.2, L * 0.012);
    g.stroke();
  }
  g.beginPath();
  g.arc(0, 0, L * 0.98, -half, half);
  g.strokeStyle = rgb(c.edge, 0.3);
  g.lineWidth = Math.max(1.2, L * 0.014);
  g.stroke();
  if (!dark) glow(g, 0, 0, L * 0.14, c.core, 0.9);
  g.restore();
}

/** Lige stråle/lyn: 100 ft lang, 5 ft bred. */
function bolt(g: G, o: DrawInput, style: Style): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const c = PAL[style];
  const x0 = -w * 0.48;
  const x1 = w * 0.48;
  // aura
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
  gr.addColorStop(0, rgb(c.edge, 0));
  gr.addColorStop(0.5, rgb(c.edge, 0.38));
  gr.addColorStop(1, rgb(c.edge, 0));
  g.fillStyle = gr;
  const ag = g.createLinearGradient(x0, 0, x1, 0);
  ag.addColorStop(0, rgb(c.edge, 0));
  ag.addColorStop(0.08, rgb(c.edge, 1));
  ag.addColorStop(0.9, rgb(c.edge, 1));
  ag.addColorStop(1, rgb(c.edge, 0));
  g.save();
  g.globalAlpha = 1;
  g.fillStyle = gr;
  g.fillRect(x0, -h / 2, x1 - x0, h);
  g.restore();
  const n = Math.max(8, Math.round(w / 22));
  const trace = (amp: number) => () => {
    g.beginPath();
    g.moveTo(x0, 0);
    for (let i = 1; i < n; i++) g.lineTo(x0 + ((x1 - x0) * i) / n, style === 'lightning' ? (r() - 0.5) * h * amp : (r() - 0.5) * h * 0.04);
    g.lineTo(x1, 0);
  };
  if (style === 'lightning') {
    // forgreninger
    for (let b = 0; b < 4; b++) {
      const sx = x0 + (x1 - x0) * (0.15 + r() * 0.7);
      const sa = (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5);
      glowStroke(g, () => { g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + Math.cos(sa) * h * 0.5, Math.sin(sa) * h * 0.5); g.lineTo(sx + Math.cos(sa) * h * 0.9, Math.sin(sa + 0.4) * h * 0.55); }, 0.8, c.edge, c.core, 0.7);
    }
    glowStroke(g, trace(0.6), Math.max(1.4, h * 0.07), c.edge, c.core, 0.95);
  } else {
    glowStroke(g, trace(0), Math.max(2, h * 0.16), c.edge, c.core, 0.95);
    for (let i = 0; i < 40; i++) glow(g, x0 + r() * (x1 - x0), (r() - 0.5) * h * 0.5, h * 0.1, c.core, 0.7);
  }
  glow(g, x0, 0, h * 0.7, c.core, 0.9);
}

/** Mur af flammer, is eller kraft: 6 x 1 felter. */
function wall(g: G, o: DrawInput, style: 'fire' | 'ice' | 'force'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  if (style === 'fire') {
    glow(g, 0, 0, w * 0.5, [240, 80, 20], 0.35, h * 1.1);
    const n = Math.round(w / 14);
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < n; i++) {
        const x = -w * 0.47 + ((i + r()) * w * 0.94) / n;
        const y = (r() - 0.5) * h * 0.3;
        const rad = h * (0.5 - k * 0.12) * (0.7 + r() * 0.5);
        const col: RGB = [[240, 70, 20], [255, 160, 40], [255, 236, 160]][k] as RGB;
        g.save();
        g.translate(x, y);
        g.rotate(r() * 6.3);
        g.beginPath();
        g.moveTo(0, -rad * 0.3);
        g.quadraticCurveTo(rad * 0.7, -rad * 0.3, rad, 0);
        g.quadraticCurveTo(rad * 0.7, rad * 0.3, 0, rad * 0.3);
        g.fillStyle = rgb(col, 0.6 + k * 0.12);
        g.fill();
        g.restore();
      }
    }
  } else if (style === 'ice') {
    const n = Math.round(w / 22);
    for (let i = 0; i < n; i++) {
      const x = -w * 0.46 + ((i + 0.5) * w * 0.92) / n;
      const s = h * (0.34 + r() * 0.12);
      polyBody(g, Array.from({ length: 6 }, (_, k): [number, number] => [x + Math.cos(k * 1.047 + r() * 0.4) * s * 1.1, (r() - 0.5) * h * 0.1 + Math.sin(k * 1.047 + r() * 0.4) * s]), [178, 220, 244], { lw: 1.4, ao: s * 0.12, light: 40 });
      g.strokeStyle = 'rgba(255,255,255,.8)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x - s * 0.6, -s * 0.5);
      g.lineTo(x - s * 0.1, -s * 0.3);
      g.stroke();
    }
    glow(g, 0, 0, w * 0.5, [120, 190, 250], 0.2, h * 0.9);
  } else {
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, 'rgba(120,170,255,0)');
    gr.addColorStop(0.5, 'rgba(150,200,255,.5)');
    gr.addColorStop(1, 'rgba(120,170,255,0)');
    g.fillStyle = gr;
    g.fillRect(-w * 0.5, -h / 2, w, h);
    g.strokeStyle = 'rgba(210,235,255,.5)';
    g.lineWidth = 1;
    const s = h * 0.18;
    for (let x = -w / 2; x < w / 2; x += s * 1.5) {
      for (let y = -h * 0.3; y < h * 0.3; y += s * 1.73) {
        for (const oy of [0, s * 0.865]) {
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = k * 1.047;
            const px = x + (oy ? s * 0.75 : 0) + Math.cos(a) * s * 0.5;
            const py = y + oy + Math.sin(a) * s * 0.5;
            if (k) g.lineTo(px, py);
            else g.moveTo(px, py);
          }
          g.closePath();
          g.stroke();
        }
      }
    }
    glowStroke(g, () => { g.beginPath(); g.moveTo(-w * 0.5, 0); g.lineTo(w * 0.5, 0); }, 1.5, [110, 160, 255], [230, 245, 255], 0.9);
  }
}

const strength: ParamDef = { key: 'strength', label: 'Styrke', type: 'range', min: 0.3, max: 1, step: 0.05, default: 0.8 };
const spell = { shadow: 0, bleed: 0.12, layers: FX, randomRotation: true } as const;

const mkArea = (style: Style, key: string, name: string, size: number, tag: string[]): ObjectKind =>
  kind({ key: `spellx_area_${key}`, family: 'spellx', name, w: size, h: size, ...spell, params: [strength], tags: ['magic', ...tag], draw: (g, o) => area(g, o, style) });
const mkCone = (style: Style, key: string, name: string): ObjectKind =>
  kind({ key: `spellx_cone_${key}`, family: 'spellx', name, w: 3, h: 3, keepAspect: true, shadow: 0, bleed: 0.12, layers: FX, tags: ['magic', 'battlefield'], draw: (g, o) => cone(g, o, style) });

export const spellKinds: ObjectKind[] = [
  mkArea('fire', 'fireball', 'Ildkugle (radius 20 ft)', 8, ['battlefield']),
  mkArea('fire', 'fire_small', 'Ildkugle, lille (10 ft)', 4, ['battlefield']),
  mkArea('frost', 'frost', 'Isstorm (radius 20 ft)', 8, ['arctic', 'battlefield']),
  mkArea('poison', 'poison_cloud', 'Giftsky (radius 20 ft)', 8, ['battlefield', 'swamp']),
  mkArea('holy', 'holy', 'Hellig stråle (radius 10 ft)', 4, ['temple']),
  mkArea('shadow', 'darkness', 'Mørke (radius 15 ft)', 6, ['dungeon', 'crypt']),
  mkArea('lightning', 'storm', 'Lynstorm (radius 20 ft)', 8, ['battlefield', 'outdoor']),
  mkArea('arcane', 'arcane', 'Arkant område (radius 10 ft)', 4, ['dungeon']),
  mkArea('thunder', 'thunder', 'Tordenbølge (radius 15 ft)', 6, ['battlefield']),
  mkArea('gravity', 'gravity', 'Tyngdekraftssfære (radius 10 ft)', 4, ['dungeon']),
  mkArea('nature', 'entangle', 'Hæmmende ranker (20 ft)', 4, ['forest']),
  mkCone('fire', 'fire', 'Kegle af ild (15 ft)'),
  mkCone('frost', 'frost', 'Kegle af is (15 ft)'),
  mkCone('poison', 'poison', 'Kegle af gift (15 ft)'),
  mkCone('lightning', 'lightning', 'Kegle af lyn (15 ft)'),
  mkCone('holy', 'holy', 'Kegle af hellig kraft (15 ft)'),
  mkCone('shadow', 'shadow', 'Kegle af mørke (15 ft)'),
  kind({ key: 'spellx_line_lightning', family: 'spellx', name: 'Lyn (100 ft)', w: 10, h: 1, keepAspect: false, shadow: 0, bleed: 0.8, layers: FX, tags: ['magic', 'battlefield'], draw: (g, o) => bolt(g, o, 'lightning') }),
  kind({ key: 'spellx_line_beam', family: 'spellx', name: 'Stråle af ild (60 ft)', w: 6, h: 1, keepAspect: false, shadow: 0, bleed: 0.8, layers: FX, tags: ['magic', 'battlefield'], draw: (g, o) => bolt(g, o, 'fire') }),
  kind({ key: 'spellx_line_frost', family: 'spellx', name: 'Isstråle (60 ft)', w: 6, h: 1, keepAspect: false, shadow: 0, bleed: 0.8, layers: FX, tags: ['magic', 'battlefield', 'arctic'], draw: (g, o) => bolt(g, o, 'frost') }),
  kind({ key: 'spellx_line_holy', family: 'spellx', name: 'Hellig stråle (60 ft)', w: 6, h: 1, keepAspect: false, shadow: 0, bleed: 0.8, layers: FX, tags: ['magic', 'temple'], draw: (g, o) => bolt(g, o, 'holy') }),
  kind({ key: 'spellx_wall_fire', family: 'spellx', name: 'Ildmur', w: 6, h: 1, keepAspect: false, shadow: 0, bleed: 0.8, layers: FX, tags: ['magic', 'battlefield', 'dungeon'], draw: (g, o) => wall(g, o, 'fire') }),
  kind({ key: 'spellx_wall_ice', family: 'spellx', name: 'Ismur', w: 6, h: 1, keepAspect: false, shadow: 0, bleed: 0.15, layers: FX, tags: ['magic', 'arctic', 'battlefield'], draw: (g, o) => wall(g, o, 'ice') }),
  kind({ key: 'spellx_wall_force', family: 'spellx', name: 'Kraftmur', w: 6, h: 1, keepAspect: false, shadow: 0, bleed: 0.3, layers: FX, tags: ['magic', 'dungeon'], draw: (g, o) => wall(g, o, 'force') }),
];

export { glowOf, glowParam, stateParam };
