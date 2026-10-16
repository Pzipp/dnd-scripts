import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import {
  blade, blobPath, body, castShadow, clipped, lin, mix, mossPatch, mottle, OUT, polyBody, polyPath, radial, rgb, rivet, shift,
  woodGrain, wobble, type G, type RGB, type Rnd,
} from './helpers';

// ------------------------------------------------------------------ cypresstub

function knee(g: G, r: Rnd, x: number, y: number, rad: number, col: RGB): void {
  const p = () => {
    g.beginPath();
    g.moveTo(x + rad, y);
    g.ellipse(x, y, rad, rad * (0.85 + r() * 0.2), r() * 3, 0, Math.PI * 2);
  };
  castShadow(g, p, rad * 0.5, rad * 0.6, rad * 0.7, 0.4);
  g.fillStyle = radial(g, x, y, rad * 1.05, [[0, rgb(shift(col, 34))], [0.55, rgb(col)], [1, rgb(shift(col, -44))]], x - rad * 0.35, y - rad * 0.35, 0.5);
  p();
  g.fill();
  g.strokeStyle = 'rgba(24,14,6,.85)';
  g.lineWidth = 1.5;
  g.stroke();
  // barkribber
  g.strokeStyle = 'rgba(24,14,6,.4)';
  g.lineWidth = 0.8;
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = r() * 6.28;
    g.moveTo(x + Math.cos(a) * rad * 0.2, y + Math.sin(a) * rad * 0.2);
    g.lineTo(x + Math.cos(a) * rad * 0.92, y + Math.sin(a) * rad * 0.92);
  }
  g.stroke();
  g.fillStyle = 'rgba(255,240,210,.28)';
  g.beginPath();
  g.ellipse(x - rad * 0.3, y - rad * 0.35, rad * 0.3, rad * 0.18, -0.6, 0, 7);
  g.fill();
}

function cypress(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const water = param(o, 'water', true);
  const moss = param(o, 'moss', true);
  const bark: RGB = mix([112, 88, 66], [96, 82, 64], r());
  // mudder/vand omkring
  const pool = blobPath(g, wobble(r, 0, 0, R * 0.98, R * 0.94, 14, 0.12));
  pool();
  g.fillStyle = radial(g, 0, 0, R, [[0, water ? 'rgba(40,52,34,.9)' : 'rgba(52,40,26,.9)'], [0.75, water ? 'rgba(54,74,46,.7)' : 'rgba(66,52,34,.65)'], [1, 'rgba(60,70,40,0)']]);
  g.fill();
  clipped(g, pool, () => {
    if (water) {
      for (let i = 0; i < 18; i++) {
        const a = r() * 6.28;
        const d = R * (0.3 + r() * 0.65);
        g.fillStyle = `rgba(${96 + r() * 50},${140 + r() * 40},${50 + r() * 20},${0.35 + r() * 0.4})`;
        g.beginPath();
        g.ellipse(Math.cos(a) * d, Math.sin(a) * d, 1.5 + r() * 4, 1 + r() * 2.5, r() * 3, 0, 7);
        g.fill();
      }
      g.fillStyle = 'rgba(200,230,230,.18)';
      g.beginPath();
      g.ellipse(-R * 0.45, -R * 0.35, R * 0.25, R * 0.05, -0.5, 0, 7);
      g.fill();
    }
  });
  // rødder, der breder sig ud
  const nroot = 9;
  for (let i = 0; i < nroot; i++) {
    const a = (i / nroot) * 6.283 + r() * 0.4;
    const len = R * (0.7 + r() * 0.26);
    const wid = R * (0.14 + r() * 0.06);
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const bend = (r() - 0.5) * R * 0.5;
    const r0 = R * 0.3;
    const P = (d: number, side: number, wv: number): [number, number] => {
      const sb = bend * Math.sin((d / len) * Math.PI * 0.9);
      return [Math.cos(a) * d + nx * (sb + side * wv), Math.sin(a) * d + ny * (sb + side * wv)];
    };
    const pth = () => {
      g.beginPath();
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const d = r0 + ((len - r0) * i) / steps;
        const wv = wid * (0.3 + 0.7 * Math.pow(1 - i / steps, 0.9)) + 1;
        const [x, y] = P(d, 1, wv);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const d = r0 + ((len - r0) * i) / steps;
        const wv = wid * (0.3 + 0.7 * Math.pow(1 - i / steps, 0.9)) + 1;
        const [x, y] = P(d, -1, wv);
        g.lineTo(x, y);
      }
      g.closePath();
    };
    castShadow(g, pth, 2, 3, 3, 0.35);
    body(g, pth, shift(bark, -4), [-R, -R, R, R], { lw: 1.5, ao: wid * 0.25, rim: 1, angle: 45 });
    clipped(g, pth, () => {
      g.strokeStyle = 'rgba(24,14,6,.35)';
      g.lineWidth = 0.9;
      g.beginPath();
      for (let k = -2; k <= 2; k++) {
        const [sx0, sy0] = P(r0, 0, k * wid * 0.25);
        const [sx1, sy1] = P(len * 0.95, 0, k * wid * 0.05);
        g.moveTo(sx0, sy0);
        g.lineTo(sx1, sy1);
      }
      g.stroke();
    });
  }
  // knæ rundt om
  const nk = 6 + Math.floor(r() * 4);
  for (let i = 0; i < nk; i++) {
    const a = r() * 6.28;
    const d = R * (0.5 + r() * 0.42);
    knee(g, r, Math.cos(a) * d, Math.sin(a) * d, R * (0.06 + r() * 0.07), shift(bark, 6));
  }
  // selve stubben: furet (fluted) stamme
  const fl = 11;
  const trunk = () => {
    g.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * 6.283;
      const rad = R * 0.5 * (1 + 0.07 * Math.cos(a * fl) + 0.04 * Math.sin(a * 3 + 1));
      if (i) g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.closePath();
  };
  castShadow(g, trunk, R * 0.1, R * 0.12, R * 0.1, 0.45);
  g.fillStyle = radial(g, 0, 0, R * 0.56, [[0, rgb(shift(bark, 26))], [0.6, rgb(bark)], [1, rgb(shift(bark, -40))]], -R * 0.15, -R * 0.15, 3);
  trunk();
  g.fill();
  clipped(g, trunk, () => {
    for (let i = 0; i < fl; i++) {
      const a = ((i + 0.5) / fl) * 6.283;
      g.strokeStyle = 'rgba(20,10,4,.38)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
      g.lineTo(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56);
      g.stroke();
    }
    mottle(g, r, [-R * 0.5, -R * 0.5, R * 0.5, R * 0.5], bark, 14, 2.6, 22, 0.3);
  });
  trunk();
  g.strokeStyle = 'rgba(24,14,6,.9)';
  g.lineWidth = 2;
  g.stroke();
  // afbrudt top med årringe og hulrum
  const topR = R * 0.33;
  const tc: [number, number] = [-R * 0.02, -R * 0.02];
  g.beginPath();
  g.ellipse(tc[0], tc[1], topR, topR * 0.92, 0, 0, 7);
  g.fillStyle = radial(g, tc[0], tc[1], topR, [[0, 'rgb(176,142,98)'], [1, 'rgb(150,116,76)']], tc[0] - 3, tc[1] - 3, 1);
  g.fill();
  g.strokeStyle = 'rgba(24,14,6,.8)';
  g.lineWidth = 1.4;
  g.stroke();
  for (let i = 1; i < 8; i++) {
    g.beginPath();
    g.ellipse(tc[0] + (r() - 0.5), tc[1] + (r() - 0.5), (topR * i) / 8.2, ((topR * i) / 8.2) * 0.92, 0, 0, 7);
    g.strokeStyle = `rgba(80,52,26,${0.25 + r() * 0.25})`;
    g.lineWidth = 0.8;
    g.stroke();
  }
  // hul i midten, fyldt med mørkt vand
  const hole = blobPath(g, wobble(r, tc[0] + R * 0.02, tc[1] + R * 0.02, topR * 0.4, topR * 0.34, 9, 0.25));
  hole();
  g.fillStyle = radial(g, tc[0], tc[1], topR * 0.4, [[0, 'rgb(14,22,16)'], [1, 'rgb(36,50,34)']]);
  g.fill();
  g.strokeStyle = 'rgba(20,10,4,.9)';
  g.lineWidth = 1.4;
  g.stroke();
  g.fillStyle = 'rgba(170,200,190,.4)';
  g.beginPath();
  g.ellipse(tc[0] - topR * 0.12, tc[1] - topR * 0.08, topR * 0.1, topR * 0.04, -0.5, 0, 7);
  g.fill();
  // flækker i toppen
  for (let i = 0; i < 4; i++) {
    const a = r() * 6.28;
    g.strokeStyle = 'rgba(30,16,6,.7)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(tc[0] + Math.cos(a) * topR * 0.45, tc[1] + Math.sin(a) * topR * 0.45);
    g.lineTo(tc[0] + Math.cos(a + 0.2) * topR * 0.95, tc[1] + Math.sin(a + 0.2) * topR * 0.95);
    g.stroke();
  }
  if (moss) {
    mossPatch(g, r, -R * 0.3, -R * 0.3, R * 0.3, 36, [78, 120, 44]);
    mossPatch(g, r, R * 0.1, R * 0.4, R * 0.2, 14, [96, 130, 50]);
    for (let i = 0; i < 3; i++) {
      // konsol-svampe på siden
      const a = 0.4 + r() * 2;
      const px = Math.cos(a) * R * 0.52;
      const py = Math.sin(a) * R * 0.52;
      g.save();
      g.translate(px, py);
      g.rotate(a);
      g.beginPath();
      g.ellipse(R * 0.03, 0, R * 0.07, R * 0.045, 0, -1.6, 1.6);
      g.fillStyle = 'rgb(224,206,172)';
      g.fill();
      g.strokeStyle = 'rgba(60,40,20,.8)';
      g.lineWidth = 1;
      g.stroke();
      g.restore();
    }
  }
  for (let i = 0; i < 16; i++) {
    const a = r() * 6.28;
    const d = R * (0.35 + r() * 0.55);
    blade(g, Math.cos(a) * d, Math.sin(a) * d, -1.2 + (r() - 0.5), R * 0.12, R * 0.015, [60 + r() * 30, 110 + r() * 40, 40]);
  }
}

// ------------------------------------------------------------------ lygtemand

const GLOW: Record<string, [RGB, RGB]> = {
  cyan: [[150, 240, 255], [30, 160, 220]],
  green: [[190, 255, 170], [40, 190, 80]],
  amber: [[255, 232, 150], [240, 140, 30]],
  violet: [[236, 200, 255], [150, 70, 230]],
};

function wisp(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2;
  const [core, edge] = GLOW[param(o, 'color', 'cyan')] ?? GLOW.cyan!;
  const ox = -R * 0.08;
  const oy = -R * 0.1;
  // glød på jorden
  g.fillStyle = radial(g, 0, R * 0.12, R, [[0, rgb(edge, 0.34)], [0.5, rgb(edge, 0.14)], [1, rgb(edge, 0)]]);
  g.beginPath();
  g.arc(0, R * 0.12, R, 0, 7);
  g.fill();
  // hale af svævende flammer
  for (let t = 0; t < 4; t++) {
    const a = 0.9 + r() * 1.3 + t * 0.35;
    const len = R * (0.5 + r() * 0.35);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 18; i++) {
      const k = i / 18;
      pts.push([ox + Math.cos(a) * len * k + Math.sin(k * 7 + t) * R * 0.07 * k, oy + Math.sin(a) * len * k + Math.cos(k * 6 + t * 2) * R * 0.06 * k]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const k = i / pts.length;
      g.strokeStyle = rgb(mix(core, edge, k), 0.55 * (1 - k));
      g.lineWidth = R * 0.22 * (1 - k) + 0.8;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(pts[i]![0], pts[i]![1]);
      g.lineTo(pts[i + 1]![0], pts[i + 1]![1]);
      g.stroke();
    }
  }
  // flere lag glød omkring kernen
  for (const [rad, a] of [[R * 0.62, 0.22], [R * 0.4, 0.4], [R * 0.24, 0.7]] as const) {
    g.fillStyle = radial(g, ox, oy, rad, [[0, rgb(core, a)], [0.5, rgb(edge, a * 0.55)], [1, rgb(edge, 0)]]);
    g.beginPath();
    g.arc(ox, oy, rad, 0, 7);
    g.fill();
  }
  // kerne
  g.fillStyle = radial(g, ox, oy, R * 0.15, [[0, 'rgba(255,255,255,1)'], [0.5, rgb(core, 0.98)], [1, rgb(edge, 0.7)]]);
  g.beginPath();
  g.arc(ox, oy, R * 0.15, 0, 7);
  g.fill();
  // stråler
  g.strokeStyle = 'rgba(255,255,255,.7)';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = i * 1.5708 + 0.4;
    g.moveTo(ox + Math.cos(a) * R * 0.12, oy + Math.sin(a) * R * 0.12);
    g.lineTo(ox + Math.cos(a) * R * (i % 2 ? 0.34 : 0.48), oy + Math.sin(a) * R * (i % 2 ? 0.34 : 0.48));
  }
  g.stroke();
  // gnister
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.28;
    const d = R * (0.2 + r() * 0.75);
    const s = 0.8 + r() * 1.8;
    const x = ox + Math.cos(a) * d;
    const y = oy + Math.sin(a) * d;
    g.fillStyle = radial(g, x, y, s * 2.4, [[0, rgb(core, 0.95)], [1, rgb(edge, 0)]]);
    g.beginPath();
    g.arc(x, y, s * 2.4, 0, 7);
    g.fill();
  }
}

// ------------------------------------------------------------------ rådne planker

function rottenPlanks(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const state = param(o, 'state', 'rotten');
  const miss = state === 'intact' ? 0.04 : state === 'rotten' ? 0.18 : 0.4;
  const rot = state === 'intact' ? 0 : 1;
  // mudder under
  const mud = blobPath(g, wobble(r, 0, 0, w * 0.5, h * 0.5, 12, 0.05));
  mud();
  g.fillStyle = radial(g, 0, 0, h * 0.55, [[0, 'rgba(32,26,16,.95)'], [0.8, 'rgba(44,36,22,.85)'], [1, 'rgba(50,42,26,0)']]);
  g.fill();
  clipped(g, mud, () => {
    for (let i = 0; i < 22; i++) {
      g.fillStyle = `rgba(${70 + r() * 40},${100 + r() * 40},${40 + r() * 20},${0.2 + r() * 0.3})`;
      g.beginPath();
      g.ellipse((r() - 0.5) * w, (r() - 0.5) * h, 2 + r() * 5, 1 + r() * 3, r() * 3, 0, 7);
      g.fill();
    }
    g.fillStyle = 'rgba(130,160,150,.2)';
    g.beginPath();
    g.ellipse(-w * 0.12, h * 0.15, w * 0.2, h * 0.02, 0.1, 0, 7);
    g.fill();
  });
  // længdebjælker
  const bx = w * 0.3;
  for (const sx of [-1, 1]) {
    const x = sx * bx - w * 0.045;
    const bp = polyPath(g, [[x, -h * 0.47], [x + w * 0.09, -h * 0.47], [x + w * 0.09 + (r() - 0.5) * 3, h * 0.47], [x + (r() - 0.5) * 3, h * 0.47]]);
    castShadow(g, bp, 2, 3, 3, 0.4);
    polyBody(g, [[x, -h * 0.47], [x + w * 0.09, -h * 0.47], [x + w * 0.09, h * 0.47], [x, h * 0.47]], [84, 70, 52], { lw: 1.5, ao: 1.4, rim: 0.8 });
  }
  const n = 12;
  const ph = (h * 0.92) / n;
  for (let i = 0; i < n; i++) {
    const y = -h * 0.46 + i * ph;
    if (r() < miss) continue;
    const half = rot && r() < miss * 1.4;
    const pw = w * (0.8 + (r() - 0.5) * 0.06);
    const px0 = -pw / 2 + (r() - 0.5) * w * 0.05;
    const tilt = (r() - 0.5) * (rot ? 0.09 : 0.02);
    const tone = shift([128, 108, 78] as RGB, (r() - 0.5) * 30 - (rot ? 14 : 0));
    g.save();
    g.translate(0, y + ph / 2);
    g.rotate(tilt);
    const x0 = px0;
    const x1 = half ? px0 + pw * (0.35 + r() * 0.3) : px0 + pw;
    const y0 = -ph * 0.46;
    const y1 = ph * 0.46;
    const pts: [number, number][] = [[x0, y0], [x1, y0]];
    if (half) {
      // takket brud
      const k = 5;
      for (let j = 0; j <= k; j++) pts.push([x1 - (j % 2 ? 4 : 0) - r() * 3, y0 + (y1 - y0) * (j / k)]);
    } else {
      pts.push([x1, y1]);
    }
    pts.push([x0, y1]);
    castShadow(g, polyPath(g, pts), 1.5, 3, 2.5, 0.5);
    polyBody(g, pts, tone, { lw: 1.4, ao: 1.5, rim: 0.9 });
    clipped(g, polyPath(g, pts), () => {
      woodGrain(g, r, [x0, y0, x1, y1], tone, { lines: 6, knots: r() < 0.4 ? 1 : 0 });
      if (rot) {
        mottle(g, r, [x0, y0, x1, y1], [90, 90, 60], 6, 3, 22, 0.35);
        if (r() < 0.5) mossPatch(g, r, x0 + r() * (x1 - x0), 0, ph * 1.6, 7);
        if (r() < 0.25) {
          g.fillStyle = 'rgb(226,210,176)';
          g.beginPath();
          g.ellipse(x0 + r() * (x1 - x0), 0, 3, 2, 0, 0, 7);
          g.fill();
        }
      }
      // revner og huller
      if (r() < 0.4) {
        g.strokeStyle = 'rgba(14,8,2,.7)';
        g.lineWidth = 1;
        g.beginPath();
        const cx = x0 + r() * (x1 - x0);
        g.moveTo(cx, y0);
        g.lineTo(cx + (r() - 0.5) * 5, y1);
        g.stroke();
      }
    });
    // rustne søm
    if (!half) for (const sx of [-1, 1]) rivet(g, sx * bx, 0, 1.3, [134, 82, 52]);
    g.restore();
  }
  // pæle
  for (const [sx, sy] of [[-1, -0.4], [1, -0.4], [-1, 0.1], [1, 0.38]] as const) {
    if (state === 'intact' || r() < 0.85) {
      const x = sx * (w * 0.46);
      const y = sy * h;
      const pr = w * 0.05;
      castShadow(g, () => { g.beginPath(); g.arc(x, y, pr, 0, 7); }, 2.5, 3, 3, 0.45);
      g.fillStyle = radial(g, x, y, pr, [[0, 'rgb(120,96,66)'], [1, 'rgb(62,46,30)']], x - pr * 0.4, y - pr * 0.4, 0.5);
      g.beginPath();
      g.arc(x, y, pr, 0, 7);
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = 1.5;
      g.stroke();
      g.strokeStyle = 'rgba(60,40,20,.7)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(x, y, pr * 0.55, 0, 7);
      g.stroke();
      mossPatch(g, r, x, y, pr, 6);
    }
  }
}

export const swampKinds: ObjectKind[] = [
  kind({
    key: 'cypress_stump', family: 'swamp', name: 'Cypresstub', w: 2, h: 2, sizeJitter: 0.15, shadow: 5, bleed: 0.05, randomRotation: true,
    params: [{ key: 'water', label: 'Vand', type: 'toggle', default: true }, { key: 'moss', label: 'Mos og svamp', type: 'toggle', default: true }],
    draw: cypress,
  }),
  kind({
    key: 'will_o_wisp', family: 'swamp', name: 'Lygtemand', w: 1.2, h: 1.2, shadow: 0, bleed: 0.4, layers: ['effects', 'objects'],
    params: [{ key: 'color', label: 'Farve', type: 'select', default: 'cyan', options: [{ value: 'cyan', label: 'Isblå' }, { value: 'green', label: 'Grøn' }, { value: 'amber', label: 'Rav' }, { value: 'violet', label: 'Violet' }] }],
    draw: wisp,
  }),
  kind({
    key: 'rotten_planks', family: 'swamp', name: 'Rådne planker', w: 1.5, h: 3.6, keepAspect: false, shadow: 1, bleed: 0.06,
    params: [{ key: 'state', label: 'Tilstand', type: 'select', default: 'rotten', options: [{ value: 'intact', label: 'Brugbare' }, { value: 'rotten', label: 'Rådne' }, { value: 'broken', label: 'Næsten væk' }] }],
    draw: rottenPlanks,
  }),
];

void lin;
