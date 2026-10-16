import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng, softDot } from '../util';
import { tube, ellBody } from '../pack2/helpers';
import { base, box, contact, crack, drum, lerp, mixc, mottle, mossPatch, OUT, polyBody, polyPath, radial, lin, rf, rgb, rubble, shift, stoneBlock, stoneOf, tufts, type G, type P, type RGB, type Rnd } from './common';

/** Fantasy og magi: portaler, magiske cirkler, krystaller, kæmpesvampe, tentakler, drageskelet, kæmpeknogler og alfebuer. */

const GLOWS: Record<string, RGB> = {
  blue: [90, 170, 255],
  purple: [180, 110, 255],
  green: [90, 230, 140],
  red: [255, 90, 80],
  gold: [255, 200, 80],
  white: [235, 240, 255],
};
const glowOptions = [
  { value: 'blue', label: 'Blå' },
  { value: 'purple', label: 'Lilla' },
  { value: 'green', label: 'Grøn' },
  { value: 'red', label: 'Rød' },
  { value: 'gold', label: 'Guld' },
  { value: 'white', label: 'Hvid' },
];
const glowP = (d: string): ParamDef => ({ key: 'glow', label: 'Farve', type: 'select', default: d, options: glowOptions });
const litP: ParamDef = { key: 'lit', label: 'Aktiv', type: 'toggle', default: true };
const glowOf = (o: DrawInput, d: string): RGB => GLOWS[param(o, 'glow', d)] ?? GLOWS.blue!;

/** Lysende streg med blød glød (flere gennemgange). */
function glowStroke(g: G, trace: () => void, col: RGB, wd: number, a = 1): void {
  for (const [k, al] of [[3.4, 0.14], [2, 0.3], [1, 0.9]] as const) {
    trace();
    g.strokeStyle = rgb(k === 1 ? mixc(col, [255, 255, 255], 0.5) : col, al * a);
    g.lineWidth = wd * k;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
  }
}

/** Runetegn (små kantede mærker) langs en cirkel. */
function runes(g: G, r: Rnd, rad: number, n: number, size: number, col: RGB, a = 1, cx = 0, cy = 0, sy = 1): void {
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * 6.283;
    g.save();
    g.translate(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * sy);
    g.rotate(ang + Math.PI / 2);
    const trace = (): void => {
      g.beginPath();
      const k = 2 + Math.floor(r() * 3);
      g.moveTo(0, -size);
      for (let j = 0; j < k; j++) g.lineTo((r() - 0.5) * size * 1.6, -size + ((j + 1) / (k + 1)) * size * 2);
      g.moveTo(0, -size);
      g.lineTo(0, size);
    };
    glowStroke(g, trace, col, 0.8, a);
    g.restore();
  }
}

/** Aktiv portal set oppefra: stenring med runer og hvirvlende energi. */
function portalRing(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'blue');
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  const R = Math.min(w, h) * 0.46;
  contact(g, 0, 0, R, R, 0.15);
  // gulv-ring
  g.beginPath();
  g.arc(0, 0, R, 0, 7);
  g.fillStyle = 'rgb(88,84,92)';
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.6;
  g.stroke();
  // energiskive
  const ir = R * 0.66;
  g.beginPath();
  g.arc(0, 0, ir, 0, 7);
  g.fillStyle = lit
    ? radial(g, 0, 0, ir, [[0, rgb(mixc(col, [255, 255, 255], 0.8))], [0.35, rgb(col)], [1, rgb(shift(col, -110))]])
    : 'rgb(40,38,46)';
  g.fill();
  if (lit) {
    g.save();
    g.beginPath();
    g.arc(0, 0, ir, 0, 7);
    g.clip();
    for (let k = 0; k < 4; k++) {
      const trace = (): void => {
        g.beginPath();
        for (let i = 0; i <= 60; i++) {
          const t = i / 60;
          const a = k * 1.571 + t * 9;
          const rr = ir * (0.08 + t * 0.95);
          if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
      };
      glowStroke(g, trace, mixc(col, [255, 255, 255], 0.3), 1.6, 0.9);
    }
    g.restore();
    softDot(g, 0, 0, R * 1.5, col, 0.25);
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.28;
      const d = rf(r, 0.2, 1.1) * R;
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, rf(r, 0.8, 1.8), 0, 7);
      g.fillStyle = rgb(mixc(col, [255, 255, 255], 0.7), 0.9);
      g.fill();
    }
  }
  // stenblokke omkring
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    stoneBlock(g, r, Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82, R * 0.3, R * 0.17, [130, 126, 134], { a: a + Math.PI / 2, d: 3, moss: 0.2 });
  }
  if (lit) runes(g, r, R * 0.82, n, 3.4, col, 0.95);
}

/** Portal-bue set oppefra: to søjletoppe og spændet (stenbjælken) imellem; portalens lys breder sig som glød på jorden til begge sider. */
function portalArch(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'purple');
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  const pw = h * 0.42;
  const px = w * 0.5 - pw * 0.6;
  const col2: RGB = [128, 124, 132];
  if (lit) {
    // glød på jorden fra portalens flade (langt, smalt oval) og en lys stribe under spændet
    g.save();
    g.scale(1, 0.5);
    softDot(g, 0, 0, w * 0.5, col, 0.35);
    g.restore();
    g.beginPath();
    g.moveTo(-px, 0);
    g.lineTo(px, 0);
    g.strokeStyle = rgb(mixc(col, [255, 255, 255], 0.7), 0.9);
    g.lineWidth = 3;
    g.stroke();
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.arc(rf(r, -px, px), rf(r, -h * 0.3, h * 0.3), rf(r, 0.8, 1.8), 0, 7);
      g.fillStyle = rgb(mixc(col, [255, 255, 255], 0.7), 0.9);
      g.fill();
    }
  }
  // spændet (stenbjælke) set ovenfra
  const bw = pw * 0.62;
  g.fillStyle = 'rgba(10,5,2,.4)';
  g.fillRect(-px + 3, -bw / 2 + 4, px * 2, bw);
  polyBody(g, [[-px, -bw / 2], [px, -bw / 2], [px, bw / 2], [-px, bw / 2]], shift(col2, 14), { lw: 1.5, light: 30, dark: 26, ao: 2 });
  const m = 9;
  g.save();
  g.beginPath();
  g.rect(-px, -bw / 2, px * 2, bw);
  g.clip();
  for (let k = 1; k < m; k++) {
    g.fillStyle = 'rgba(14,8,4,.38)';
    g.fillRect(lerp(-px, px, k / m), -bw / 2, 1.3, bw);
  }
  mottle(g, r, [-px, -bw / 2, px, bw / 2], col2, 10, 5, 18, 0.25);
  g.restore();
  for (const sx of [-1, 1]) {
    const cx = sx * px;
    g.fillStyle = 'rgba(10,5,2,.4)';
    g.fillRect(cx - pw / 2 + 3, -pw / 2 + 4, pw, pw);
    polyBody(g, [[cx - pw / 2, -pw / 2], [cx + pw / 2, -pw / 2], [cx + pw / 2, pw / 2], [cx - pw / 2, pw / 2]], shift(col2, 4), { lw: 1.6, light: 30, dark: 30, ao: 3 });
    g.strokeStyle = 'rgba(14,8,4,.3)';
    g.lineWidth = 1;
    g.strokeRect(cx - pw * 0.3, -pw * 0.3, pw * 0.6, pw * 0.6);
  }
  if (lit) {
    const trace = (): void => { g.beginPath(); g.moveTo(-px, 0); g.lineTo(px, 0); };
    glowStroke(g, trace, col, 1.2, 0.9);
    runes(g, r, px * 0.5, 2, 3, col, 0.9, 0, 0, 0);
    for (const sx of [-1, 1]) runes(g, r, 0, 1, 4, col, 0.9, sx * px, 0, 0);
  }
}

/** Magisk cirkel på jorden: ringe, stjerne og runer, der lyser. */
function magicCircle(g: G, o: DrawInput, style: 'summon' | 'arcane' | 'elemental'): void {
  const r = rng(o.seed);
  const col = glowOf(o, style === 'summon' ? 'red' : style === 'arcane' ? 'blue' : 'gold');
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  const R = Math.min(w, h) * 0.46;
  const a = lit ? 1 : 0.35;
  const dim: RGB = lit ? col : [110, 100, 96];
  // mørk bund (indgraveret)
  g.beginPath();
  g.arc(0, 0, R * 1.02, 0, 7);
  g.fillStyle = 'rgba(20,12,10,.28)';
  g.fill();
  const ring = (rr: number, wd: number): void => glowStroke(g, () => { g.beginPath(); g.arc(0, 0, rr, 0, 7); }, dim, wd, a);
  ring(R, 1.6);
  ring(R * 0.84, 1);
  if (style === 'summon') {
    const trace = (): void => {
      g.beginPath();
      for (let i = 0; i <= 5; i++) {
        const an = -1.571 + ((i * 2) % 5) * 1.2566;
        const x = Math.cos(an) * R * 0.84;
        const y = Math.sin(an) * R * 0.84;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
    };
    glowStroke(g, trace, dim, 1.3, a);
    ring(R * 0.34, 1);
    runes(g, r, R * 0.92, 20, R * 0.045, dim, a);
    for (let i = 0; i < 5; i++) {
      const an = -1.571 + i * 1.2566;
      glowStroke(g, () => { g.beginPath(); g.arc(Math.cos(an) * R * 0.84, Math.sin(an) * R * 0.84, R * 0.07, 0, 7); }, dim, 1, a);
      if (lit) {
        const x = Math.cos(an) * R * 0.84;
        const y = Math.sin(an) * R * 0.84;
        g.fillStyle = 'rgb(236,226,196)';
        g.fillRect(x - 1.4, y - 1.4, 2.8, 2.8);
      }
    }
  } else if (style === 'arcane') {
    ring(R * 0.66, 1.2);
    ring(R * 0.3, 1);
    runes(g, r, R * 0.92, 28, R * 0.04, dim, a);
    runes(g, r, R * 0.75, 18, R * 0.04, dim, a);
    for (let k = 0; k < 2; k++) {
      glowStroke(g, () => {
        g.beginPath();
        for (let i = 0; i < 3; i++) {
          const an = k * 0.5236 + i * 2.094 - 1.571;
          const x = Math.cos(an) * R * 0.66;
          const y = Math.sin(an) * R * 0.66;
          if (i) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.closePath();
      }, dim, 1.2, a);
    }
    glowStroke(g, () => { g.beginPath(); for (let i = 0; i < 8; i++) { const an = i * 0.785; const x = Math.cos(an) * R * 0.3; const y = Math.sin(an) * R * 0.3; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); }, dim, 1, a);
  } else {
    // fire felter med symboler: flamme, bølge, kile, sky
    ring(R * 0.3, 1);
    for (let i = 0; i < 4; i++) {
      const an = i * 1.571 + 0.785;
      const cx = Math.cos(an) * R * 0.58;
      const cy = Math.sin(an) * R * 0.58;
      glowStroke(g, () => { g.beginPath(); g.arc(cx, cy, R * 0.2, 0, 7); }, dim, 1, a);
      const s = R * 0.1;
      const trace = (): void => {
        g.beginPath();
        if (i === 0) { g.moveTo(cx, cy - s * 1.2); g.quadraticCurveTo(cx + s, cy, cx, cy + s); g.quadraticCurveTo(cx - s, cy, cx, cy - s * 1.2); }
        else if (i === 1) { g.moveTo(cx - s, cy); g.quadraticCurveTo(cx - s * 0.5, cy - s, cx, cy); g.quadraticCurveTo(cx + s * 0.5, cy + s, cx + s, cy); }
        else if (i === 2) { g.moveTo(cx - s, cy + s * 0.8); g.lineTo(cx, cy - s); g.lineTo(cx + s, cy + s * 0.8); g.closePath(); }
        else { g.arc(cx - s * 0.4, cy, s * 0.6, 0, 7); g.moveTo(cx + s * 1.1, cy); g.arc(cx + s * 0.5, cy, s * 0.6, 0, 7); }
      };
      glowStroke(g, trace, dim, 1.2, a);
    }
    runes(g, r, R * 0.92, 24, R * 0.04, dim, a);
  }
  if (lit) softDot(g, 0, 0, R * 1.1, col, 0.16);
}

/** Facetfarve efter flades retning mod lyset (øverst til venstre). */
function facet(col: RGB, ang: number, k = 1): RGB {
  const lit = Math.cos(ang + 2.356);
  return lit > 0 ? mixc(col, [255, 255, 255], lit * 0.5 * k) : mixc(col, [20, 10, 50], -lit * 0.5 * k);
}

/** Stående krystal set ovenfra: sekskantet spids med seks trekantsflader. */
function hexCrystal(g: G, x: number, y: number, R: number, rot: number, col: RGB, lit: boolean): void {
  if (lit) softDot(g, x, y, R * 2.4, col, 0.2);
  const v: P[] = [];
  for (let k = 0; k < 6; k++) v.push([x + Math.cos(rot + (k * Math.PI) / 3) * R, y + Math.sin(rot + (k * Math.PI) / 3) * R]);
  const c: P = [x - R * 0.12, y - R * 0.12];
  g.fillStyle = 'rgba(8,4,16,.35)';
  g.beginPath();
  g.arc(x + R * 0.12, y + R * 0.16, R * 1.02, 0, 7);
  g.fill();
  for (let k = 0; k < 6; k++) {
    const a0 = rot + (k * Math.PI) / 3;
    const mid = a0 + Math.PI / 6;
    polyBody(g, [c, v[k]!, v[(k + 1) % 6]!], facet(col, mid), { lw: 1.1, light: 6, dark: 6, ao: 0, rim: 0 });
  }
  g.beginPath();
  g.moveTo(v[0]![0], v[0]![1]);
  for (let k = 1; k < 6; k++) g.lineTo(v[k]![0], v[k]![1]);
  g.closePath();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.stroke();
  g.beginPath();
  g.arc(c[0] - R * 0.1, c[1] - R * 0.1, R * 0.14, 0, 7);
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.fill();
}

/** Liggende krystal set ovenfra: aflang prisme med tre striber og spids i enden. */
function prismCrystal(g: G, x: number, y: number, len: number, R: number, ang: number, col: RGB, lit: boolean): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  if (lit) softDot(g, len * 0.1, 0, len * 0.7, col, 0.14);
  g.fillStyle = 'rgba(8,4,16,.35)';
  g.fillRect(-len / 2 + 2, -R + 3, len, R * 2);
  const strips: [number, number, number][] = [[-R, -R * 0.35, -1.9], [-R * 0.35, R * 0.35, -2.4], [R * 0.35, R, -0.6]];
  for (const [y0, y1, n] of strips) {
    const a = ang + (n as number);
    polyBody(g, [[-len / 2, y0], [len * 0.28, y0], [len * 0.28, y1], [-len / 2, y1]], facet(col, a), { lw: 1, light: 4, dark: 4, ao: 0, rim: 0 });
  }
  polyBody(g, [[len * 0.28, -R], [len / 2, 0], [len * 0.28, R]], facet(col, ang, 0.7), { lw: 1.1, light: 4, dark: 4, ao: 0, rim: 0 });
  g.strokeStyle = OUT;
  g.lineWidth = 1.3;
  g.strokeRect(-len / 2, -R, len * 0.78, R * 2);
  g.restore();
}

function crystals(g: G, o: DrawInput, mode: 'cluster' | 'tall' | 'field' | 'geode'): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'blue');
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  const m = Math.min(w, h);
  if (mode === 'geode') {
    const pts: P[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 6.283;
      const k = 0.86 + r() * 0.2;
      pts.push([Math.cos(a) * w * 0.46 * k, Math.sin(a) * h * 0.46 * k]);
    }
    polyBody(g, pts, [110, 104, 100], { lw: 1.6, light: 30, dark: 40, ao: 4 });
    g.beginPath();
    g.ellipse(0, 0, w * 0.3, h * 0.3, 0, 0, 7);
    g.fillStyle = rgb(shift(col, -90));
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.stroke();
    if (lit) softDot(g, 0, 0, m * 0.4, col, 0.3);
    const list = Array.from({ length: 12 }, () => ({ a: r() * 6.283, d: Math.sqrt(r()) * 0.78, s: rf(r, 0.5, 1) }));
    list.sort((p, q) => p.s - q.s);
    for (const it of list) hexCrystal(g, Math.cos(it.a) * w * 0.26 * it.d, Math.sin(it.a) * h * 0.26 * it.d, m * 0.1 * it.s, r() * 1, shift(col, (r() - 0.5) * 30), lit);
    return;
  }
  g.beginPath();
  g.ellipse(0, 0, w * 0.4, h * 0.38, 0, 0, 7);
  g.fillStyle = 'rgba(40,34,44,.35)';
  g.fill();
  if (mode !== 'field') rubble(g, r, 0, 0, w * 0.4, h * 0.38, [100, 98, 106], 10, m * 0.03);
  if (lit) softDot(g, 0, 0, m * 0.6, col, 0.2);
  const n = mode === 'cluster' ? 8 : mode === 'tall' ? 4 : 22;
  type It = { x: number; y: number; s: number; lying: boolean; a: number };
  const items: It[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = mode === 'field' ? Math.sqrt(r()) * 0.42 : r() * 0.22 + (i === 0 ? 0 : 0.08);
    const big = mode === 'tall' ? 0.9 + r() * 0.4 : mode === 'cluster' ? (i === 0 ? 1.3 : rf(r, 0.5, 0.95)) : rf(r, 0.3, 0.7);
    items.push({ x: Math.cos(a) * w * d, y: Math.sin(a) * h * d, s: big, lying: i > 1 && r() < 0.35 && mode !== 'tall', a: a + rf(r, -0.5, 0.5) });
  }
  items.sort((p, q) => p.s - q.s);
  for (const it of items) {
    const c = shift(col, (r() - 0.5) * 30);
    if (it.lying) prismCrystal(g, it.x, it.y, m * 0.3 * it.s, m * 0.05 * it.s, it.a, c, lit);
    else hexCrystal(g, it.x, it.y, m * (mode === 'tall' ? 0.15 : 0.12) * it.s, r(), c, lit);
  }
}

/** Kæmpesvamp: hat set skråt oppefra med skiver, pletter, stok og små svampe omkring. */
function giantMushroom(g: G, o: DrawInput, style: 'red' | 'purple' | 'brown' | 'glow', count: number): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const PAL: Record<string, { cap: RGB; spot: RGB; stem: RGB }> = {
    red: { cap: [196, 54, 48], spot: [248, 240, 220], stem: [226, 214, 190] },
    purple: { cap: [118, 70, 150], spot: [214, 190, 240], stem: [200, 190, 210] },
    brown: { cap: [150, 104, 66], spot: [214, 190, 150], stem: [216, 200, 170] },
    glow: { cap: [60, 150, 190], spot: [160, 255, 240], stem: [180, 220, 230] },
  };
  const p = PAL[style]!;
  const items: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * 6.283 + rf(r, -0.3, 0.3);
    const d = count === 1 ? 0 : 0.28;
    items.push({ x: Math.cos(a) * w * d, y: Math.sin(a) * h * d * 0.8, s: count === 1 ? 1 : rf(r, 0.6, 0.9) });
  }
  items.sort((a, b) => a.y - b.y);
  if (style === 'glow') softDot(g, 0, 0, w * 0.55, p.cap, 0.22);
  for (const it of items) {
    const R = Math.min(w, h) * 0.34 * it.s * (count === 1 ? 1.3 : 1);
    // hat (kuppel som ellipse + lys)
    const cy = it.y - R * 0.1;
    g.beginPath();
    g.ellipse(it.x + 2, cy + 3, R, R, 0, 0, 7);
    g.fillStyle = 'rgba(10,5,2,.35)';
    g.fill();
    g.beginPath();
    g.ellipse(it.x, cy, R, R, 0, 0, 7);
    g.fillStyle = radial(g, it.x, cy, R, [[0, rgb(shift(p.cap, 52))], [0.5, rgb(p.cap)], [1, rgb(shift(p.cap, -50))]], it.x - R * 0.3, cy - R * 0.3, R * 0.05);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.6;
    g.stroke();
    // pletter
    g.save();
    g.beginPath();
    g.ellipse(it.x, cy, R, R, 0, 0, 7);
    g.clip();
    for (let i = 0; i < 9; i++) {
      const a = r() * 6.283;
      const d = Math.sqrt(r()) * 0.78;
      const sx = it.x + Math.cos(a) * R * d;
      const sy2 = cy + Math.sin(a) * R * d;
      g.beginPath();
      g.ellipse(sx, sy2, R * rf(r, 0.06, 0.13), R * rf(r, 0.05, 0.1), 0, 0, 7);
      g.fillStyle = rgb(p.spot, 0.95);
      g.fill();
    }
    // radiale ribber
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 6.283;
      g.beginPath();
      g.moveTo(it.x + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.16);
      g.lineTo(it.x + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.strokeStyle = 'rgba(20,6,10,.16)';
      g.lineWidth = 1;
      g.stroke();
    }
    g.restore();
  }
}

/** Tentakel set oppefra: krummet rør, der smalner af, med sugekopper. */
function tentacle(g: G, r: Rnd, bx: number, by: number, ang: number, len: number, wd: number, col: RGB, curl: number): void {
  const pts: P[] = [];
  let x = bx;
  let y = by;
  let a = ang;
  const N = 26;
  for (let i = 0; i <= N; i++) {
    pts.push([x, y]);
    a += curl * (0.04 + (i / N) * 0.1);
    x += Math.cos(a) * (len / N);
    y += Math.sin(a) * (len / N);
  }
  // krop: afsmalnende bredde ved flere gennemgange
  for (let i = N - 1; i >= 0; i--) {
    const t = i / N;
    const wdt = wd * (1 - t * 0.85);
    g.beginPath();
    g.moveTo(pts[i]![0], pts[i]![1]);
    g.lineTo(pts[i + 1]![0], pts[i + 1]![1]);
    g.strokeStyle = OUT;
    g.lineWidth = wdt + 2;
    g.lineCap = 'round';
    g.stroke();
  }
  for (let i = N - 1; i >= 0; i--) {
    const t = i / N;
    const wdt = wd * (1 - t * 0.85);
    g.beginPath();
    g.moveTo(pts[i]![0], pts[i]![1]);
    g.lineTo(pts[i + 1]![0], pts[i + 1]![1]);
    g.strokeStyle = rgb(shift(col, -30 + t * 20));
    g.lineWidth = wdt;
    g.stroke();
    g.beginPath();
    g.moveTo(pts[i]![0] - wdt * 0.15, pts[i]![1] - wdt * 0.15);
    g.lineTo(pts[i + 1]![0] - wdt * 0.15, pts[i + 1]![1] - wdt * 0.15);
    g.strokeStyle = rgb(shift(col, 26), 0.8);
    g.lineWidth = wdt * 0.4;
    g.stroke();
  }
  // sugekopper
  for (let i = 3; i < N - 2; i += 2) {
    const t = i / N;
    const wdt = wd * (1 - t * 0.85);
    g.beginPath();
    g.arc(pts[i]![0], pts[i]![1], wdt * 0.22, 0, 7);
    g.fillStyle = rgb(mixc(col, [240, 200, 210], 0.55));
    g.fill();
    g.strokeStyle = 'rgba(30,10,20,.5)';
    g.lineWidth = 0.8;
    g.stroke();
  }
  void r;
}

function tentacles(g: G, o: DrawInput, pit: boolean): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const col: RGB = pit ? [86, 120, 96] : [150, 84, 120];
  if (pit) {
    g.beginPath();
    g.ellipse(0, 0, w * 0.32, h * 0.3, 0, 0, 7);
    g.fillStyle = radial(g, 0, 0, w * 0.32, [[0, 'rgb(10,6,12)'], [0.7, 'rgb(36,24,28)'], [1, 'rgb(80,60,50)']]);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.6;
    g.stroke();
    rubble(g, r, 0, 0, w * 0.4, h * 0.38, [110, 100, 94], 12, w * 0.03);
  } else {
    g.beginPath();
    g.ellipse(0, 0, w * 0.18, h * 0.16, 0, 0, 7);
    g.fillStyle = 'rgb(54,30,40)';
    g.fill();
  }
  const n = pit ? 5 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rf(r, -0.3, 0.3);
    tentacle(g, r, Math.cos(a) * w * 0.12, Math.sin(a) * h * 0.1, a, Math.min(w, h) * rf(r, 0.3, 0.46), w * 0.09, col, (r() < 0.5 ? -1 : 1) * rf(r, 0.5, 1.2));
  }
}

function fleshMass(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const pts: P[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.283;
    const k = 0.76 + r() * 0.3;
    pts.push([Math.cos(a) * w * 0.46 * k, Math.sin(a) * h * 0.44 * k]);
  }
  g.fillStyle = 'rgba(90,20,30,.35)';
  g.beginPath();
  g.ellipse(0, 0, w * 0.5, h * 0.48, 0, 0, 7);
  g.fill();
  const path = (): void => {
    g.beginPath();
    const n = pts.length;
    g.moveTo((pts[0]![0] + pts[n - 1]![0]) / 2, (pts[0]![1] + pts[n - 1]![1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const q = pts[(i + 1) % n]!;
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
  };
  path();
  g.fillStyle = radial(g, 0, 0, w * 0.5, [[0, 'rgb(210,110,120)'], [0.6, 'rgb(160,60,76)'], [1, 'rgb(84,24,40)']], -w * 0.15, -h * 0.15, 2);
  g.fill();
  g.save();
  path();
  g.clip();
  // årer
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    const a = r() * 6.28;
    g.moveTo(0, 0);
    g.bezierCurveTo(Math.cos(a) * w * 0.15, Math.sin(a) * h * 0.1 + 6, Math.cos(a + 0.5) * w * 0.3, Math.sin(a + 0.5) * h * 0.3, Math.cos(a) * w * 0.5, Math.sin(a) * h * 0.5);
    g.strokeStyle = 'rgba(60,10,30,.45)';
    g.lineWidth = rf(r, 1, 2.6);
    g.stroke();
  }
  // slimglans
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.ellipse(rf(r, -w * 0.3, w * 0.2), rf(r, -h * 0.3, h * 0.2), rf(r, 4, 12), rf(r, 2, 5), r() * 3, 0, 7);
    g.fillStyle = 'rgba(255,220,220,.35)';
    g.fill();
  }
  g.restore();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.7;
  g.stroke();
  // øjne
  for (let i = 0; i < 4; i++) {
    const x = rf(r, -w * 0.25, w * 0.25);
    const y = rf(r, -h * 0.22, h * 0.22);
    const s = rf(r, 5, 9);
    g.beginPath();
    g.ellipse(x, y, s, s * 0.8, 0, 0, 7);
    g.fillStyle = 'rgb(236,226,200)';
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.2;
    g.stroke();
    g.beginPath();
    g.arc(x + rf(r, -1.5, 1.5), y + rf(r, -1.5, 1.5), s * 0.4, 0, 7);
    g.fillStyle = 'rgb(200,160,30)';
    g.fill();
    g.beginPath();
    g.arc(x, y, s * 0.2, 0, 7);
    g.fillStyle = 'rgb(10,6,6)';
    g.fill();
  }
}

const BONE: RGB = [226, 216, 190];

/** Ét knogleled: lang cylinder med knopper i enderne. */
function bone(g: G, a: P, b: P, th: number, col: RGB = BONE): void {
  tube(g, () => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }, th, col);
  for (const e of [a, b]) {
    g.beginPath();
    g.arc(e[0], e[1], th * 0.8, 0, 7);
    g.fillStyle = rgb(shift(col, 10));
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.1;
    g.stroke();
  }
}

function skull(g: G, x: number, y: number, s: number, ang: number, dragon: boolean): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  // kranie (set oppefra): oval bagtil, snude fremad (+x)
  g.beginPath();
  if (dragon) {
    g.moveTo(-s * 0.5, 0);
    g.bezierCurveTo(-s * 0.5, -s * 0.5, s * 0.2, -s * 0.4, s * 0.9, -s * 0.16);
    g.lineTo(s * 1.05, -s * 0.06);
    g.lineTo(s * 1.05, s * 0.06);
    g.lineTo(s * 0.9, s * 0.16);
    g.bezierCurveTo(s * 0.2, s * 0.4, -s * 0.5, s * 0.5, -s * 0.5, 0);
  } else {
    g.ellipse(0, 0, s * 0.6, s * 0.5, 0, 0, 7);
  }
  g.closePath();
  g.fillStyle = lin(g, 0, -s * 0.5, 0, s * 0.5, [[0, rgb(shift(BONE, 24))], [1, rgb(shift(BONE, -36))]]);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.6;
  g.stroke();
  // øjenhuler, næsebor, tænder
  g.fillStyle = 'rgb(24,18,16)';
  for (const sy of [-1, 1]) {
    g.beginPath();
    g.ellipse(dragon ? s * 0.12 : s * 0.12, sy * s * 0.26, s * 0.13, s * 0.1, 0, 0, 7);
    g.fill();
  }
  if (dragon) {
    for (const sy of [-1, 1]) {
      g.beginPath();
      g.arc(s * 0.96, sy * s * 0.05, s * 0.025, 0, 7);
      g.fill();
      polyBody(g, [[-s * 0.2, sy * s * 0.4], [-s * 0.5, sy * s * 0.9], [-s * 0.4, sy * s * 0.34]], BONE, { lw: 1.2, light: 12, dark: 12, ao: 0.4 });
    }
    for (let i = 0; i < 8; i++) {
      for (const sy of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * (0.4 + i * 0.07), sy * s * 0.13);
        g.lineTo(s * (0.42 + i * 0.07), sy * s * 0.2);
        g.strokeStyle = 'rgb(246,240,226)';
        g.lineWidth = 1.3;
        g.stroke();
      }
    }
  } else {
    g.beginPath();
    g.moveTo(s * 0.5, -s * 0.12);
    g.lineTo(s * 0.5, s * 0.12);
    g.strokeStyle = 'rgb(24,18,16)';
    g.lineWidth = 3;
    g.stroke();
  }
  g.restore();
}

/** Drageskelet set oppefra: kranie, hvirvelsøjle, ribben, vingeknogler og hale. */
function dragonSkeleton(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const spine = (t: number): P => [lerp(-w * 0.34, w * 0.46, t), Math.sin(t * 5 + o.seed) * h * 0.07 * (0.3 + t)];
  // vinger: to arme af knogler, fingre
  for (const sy of [-1, 1]) {
    const sh: P = [spine(0.28)[0], spine(0.28)[1] + sy * h * 0.06];
    const el: P = [sh[0] - w * 0.04, sy * h * 0.3];
    const wr: P = [sh[0] + w * 0.12, sy * h * 0.48];
    bone(g, sh, el, 6);
    bone(g, el, wr, 5);
    for (let i = 0; i < 4; i++) {
      const tip: P = [wr[0] + w * (0.04 + i * 0.07), sy * h * (0.42 - i * 0.04) + (i - 1.5) * 0 + 0];
      bone(g, wr, [tip[0], sy * Math.min(h * 0.48, Math.abs(tip[1]) + h * 0.02) * 1], 2.8);
    }
  }
  // hale
  for (let i = 14; i >= 0; i--) {
    const t = 0.55 + (i / 14) * 0.45;
    const p = spine(t);
    const s = 5.5 * (1 - (i / 14) * 0.75);
    ellBody(g, p[0], p[1], s, s * 0.85, BONE, { lw: 1.1 });
  }
  // ryg og ribben
  for (let i = 0; i < 26; i++) {
    const t = (i / 26) * 0.56 + 0.1;
    const p = spine(t);
    if (i > 2 && i < 22 && i % 2 === 0) {
      const L = h * 0.2 * Math.sin(((i - 2) / 20) * Math.PI) + h * 0.06;
      for (const sy of [-1, 1]) {
        g.beginPath();
        g.moveTo(p[0], p[1]);
        g.quadraticCurveTo(p[0] + 4, p[1] + sy * L * 0.9, p[0] + 12, p[1] + sy * L);
        g.strokeStyle = OUT;
        g.lineWidth = 4.2;
        g.lineCap = 'round';
        g.stroke();
        g.strokeStyle = rgb(BONE);
        g.lineWidth = 2.6;
        g.stroke();
      }
    }
    ellBody(g, p[0], p[1], 5.4, 4.8, BONE, { lw: 1.1 });
  }
  // ben (to par) og hoved
  for (const [t, sgn] of [[0.2, -1], [0.2, 1], [0.58, -1], [0.58, 1]] as const) {
    const p = spine(t);
    const k: P = [p[0] + 6, p[1] + sgn * h * 0.14];
    bone(g, p, k, 4.4);
    bone(g, k, [k[0] + 10, k[1] + sgn * h * 0.1], 3.6);
    for (let c = -1; c <= 1; c++) {
      g.beginPath();
      g.moveTo(k[0] + 10, k[1] + sgn * h * 0.1);
      g.lineTo(k[0] + 18, k[1] + sgn * h * 0.1 + c * 4);
      g.strokeStyle = 'rgb(236,230,214)';
      g.lineWidth = 2;
      g.stroke();
    }
  }
  skull(g, spine(0.02)[0] - w * 0.04, spine(0.02)[1], h * 0.2, Math.PI + 0.1, true);
  void r;
}

/** Kæmpeknogler: ribbensbue, lårben-bunke eller stort kranie. */
function giantBones(g: G, o: DrawInput, mode: 'ribs' | 'pile' | 'skull'): void {
  const r = rng(o.seed);
  const { w, h } = o;
  if (mode === 'skull') {
    skull(g, -w * 0.1, 0, Math.min(w, h) * 0.8, 0.1, false);
    // knogler nedenunder
    bone(g, [-w * 0.3, h * 0.4], [w * 0.4, h * 0.3], 7);
    return;
  }
  if (mode === 'ribs') {
    bone(g, [-w * 0.45, 0], [w * 0.45, 0], 9);
    for (let i = 0; i < 6; i++) {
      const x = lerp(-w * 0.36, w * 0.36, i / 5);
      const L = h * 0.42 * Math.sin((i / 5) * 2.4 + 0.4);
      for (const sy of [-1, 1]) {
        g.beginPath();
        g.moveTo(x, 0);
        g.bezierCurveTo(x + 6, sy * L * 0.5, x + 14, sy * L * 0.9, x + 6, sy * L);
        g.strokeStyle = OUT;
        g.lineWidth = 9;
        g.lineCap = 'round';
        g.stroke();
        g.strokeStyle = rgb(shift(BONE, -4));
        g.lineWidth = 6.2;
        g.stroke();
        g.strokeStyle = 'rgba(255,250,230,.45)';
        g.lineWidth = 2;
        g.translate(-1, -1);
        g.stroke();
        g.translate(1, 1);
      }
    }
    for (let i = 0; i < 6; i++) ellBody(g, lerp(-w * 0.4, w * 0.4, i / 5), 0, 8, 7, BONE, { lw: 1.3 });
    return;
  }
  for (let i = 0; i < 7; i++) {
    const a = rf(r, 0, 3.14);
    const L = w * rf(r, 0.25, 0.4);
    const cx = rf(r, -w * 0.2, w * 0.2);
    const cy = rf(r, -h * 0.22, h * 0.22);
    bone(g, [cx - Math.cos(a) * L / 2, cy - Math.sin(a) * L / 2], [cx + Math.cos(a) * L / 2, cy + Math.sin(a) * L / 2], rf(r, 6, 9));
  }
  skull(g, w * 0.12, h * 0.1, h * 0.42, 0.4, false);
}

/** Faldet runesten med lysende runer. */
function runeStone(g: G, o: DrawInput, count: number): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'blue');
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  for (let n = 0; n < count; n++) {
    const cx = count === 1 ? 0 : lerp(-w * 0.28, w * 0.28, n / (count - 1));
    const cy = count === 1 ? 0 : (n % 2 ? h * 0.16 : -h * 0.14);
    const sw = (count === 1 ? w * 0.84 : w * 0.34);
    const sh = (count === 1 ? h * 0.5 : h * 0.3);
    g.save();
    g.translate(cx, cy);
    g.rotate(rf(r, -0.5, 0.5));
    const pts: P[] = [[-sw / 2, -sh / 2 + rf(r, 0, 4)], [sw / 2 - rf(r, 0, 6), -sh / 2], [sw / 2, sh / 2 - rf(r, 0, 5)], [-sw / 2 + rf(r, 0, 6), sh / 2]];
    contact(g, 0, sh * 0.2, sw / 2, sh / 2, 0.15);
    polyBody(g, pts, [104, 102, 110], { lw: 1.6, light: 28, dark: 32, ao: 3 });
    g.save();
    polyPath(g, pts)();
    g.clip();
    mottle(g, r, [-sw / 2, -sh / 2, sw / 2, sh / 2], [104, 102, 110], 8, sh * 0.2, 16, 0.25);
    g.restore();
    const k = Math.max(2, Math.round(sw / 20));
    for (let i = 0; i < k; i++) {
      const x = lerp(-sw * 0.36, sw * 0.36, k === 1 ? 0.5 : i / (k - 1));
      const trace = (): void => {
        g.beginPath();
        g.moveTo(x, -sh * 0.25);
        g.lineTo(x + 3, -sh * 0.05);
        g.lineTo(x - 3, sh * 0.1);
        g.moveTo(x, -sh * 0.25);
        g.lineTo(x, sh * 0.26);
      };
      if (lit) glowStroke(g, trace, col, 0.9, 0.95);
      else {
        trace();
        g.strokeStyle = 'rgba(20,16,24,.6)';
        g.lineWidth = 1.4;
        g.stroke();
      }
    }
    if (lit) softDot(g, 0, 0, sw * 0.7, col, 0.2);
    mossPatch(g, r, -sw * 0.3, sh * 0.2, sw * 0.2, 6);
    g.restore();
  }
}

/** Alfebue set oppefra: to store løvkroner, forbundet af en bue af sammenflettede grene med blade, blomster og lys. */
function feyArch(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'gold');
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  const R = h * 0.42;
  const px = w * 0.5 - R * 1.05;
  const bark: RGB = [118, 88, 62];
  if (lit) softDot(g, 0, 0, w * 0.5, col, 0.22);
  const leaf = (x: number, y: number, s: number, tone: number): void => {
    g.save();
    g.translate(x, y);
    g.rotate(r() * 6.28);
    g.beginPath();
    g.ellipse(0, 0, s, s * 0.5, 0, 0, 7);
    g.fillStyle = rgb(shift(mixc([62, 120, 56], [150, 190, 90], r()), tone));
    g.fill();
    g.strokeStyle = 'rgba(20,40,10,.5)';
    g.lineWidth = 0.7;
    g.stroke();
    g.restore();
  };
  // grene mellem kronerne (under bladene)
  for (let i = 0; i < 3; i++) {
    const trace = (): void => { g.beginPath(); g.moveTo(-px, (i - 1) * 6); g.bezierCurveTo(-px * 0.4, (i - 1) * 14 - 10 + r() * 6, px * 0.4, (i - 1) * 14 + 10 - r() * 6, px, (i - 1) * 6); };
    tube(g, trace, 5 - i * 0.8, shift(bark, i * 8));
  }
  for (let i = 0; i < 60; i++) {
    const t = r();
    leaf(lerp(-px, px, t) + rf(r, -6, 6), Math.sin(t * 6.28) * 4 + rf(r, -14, 14), rf(r, 4, 8), (r() - 0.5) * 20);
  }
  // kroner: lag af blade, lys øverst til venstre
  for (const sx of [-1, 1]) {
    const cx = sx * px;
    g.fillStyle = 'rgba(10,20,4,.4)';
    g.beginPath();
    g.arc(cx + 3, 4, R, 0, 7);
    g.fill();
    for (let layer = 0; layer < 3; layer++) {
      const rr = R * (1 - layer * 0.28);
      const n = 26 - layer * 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + layer;
        const d = rr * (0.7 + r() * 0.3);
        const lx = cx + Math.cos(a) * d * 0.9;
        const ly = Math.sin(a) * d * 0.9;
        const lt = (Math.cos(a + 2.356) > 0 ? 18 : -22) + layer * 14;
        leaf(lx, ly, rr * 0.28, lt);
      }
    }
    g.beginPath();
    g.arc(cx, 0, R * 0.22, 0, 7);
    g.fillStyle = rgb(shift(bark, -10));
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.2;
    g.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const a = r() * 6.283;
    const x = side * px + Math.cos(a) * R * rf(r, 0.4, 0.9);
    const y = Math.sin(a) * R * rf(r, 0.4, 0.9);
    g.beginPath();
    g.arc(x, y, 2.6, 0, 7);
    g.fillStyle = ['rgb(250,226,120)', 'rgb(240,150,190)', 'rgb(250,250,240)'][i % 3]!;
    g.fill();
    g.strokeStyle = 'rgba(40,20,10,.5)';
    g.lineWidth = 0.7;
    g.stroke();
    if (lit) softDot(g, x, y, 8, col, 0.5);
  }
  if (lit) for (let i = 0; i < 12; i++) {
    g.beginPath();
    g.arc(rf(r, -px, px), rf(r, -h * 0.3, h * 0.3), rf(r, 0.8, 1.6), 0, 7);
    g.fillStyle = rgb(mixc(col, [255, 255, 255], 0.6), 0.9);
    g.fill();
  }
}

/** Alfering: cirkel af små svampe med glimt. */
function feyRing(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const col = glowOf(o, 'gold');
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  const R = Math.min(w, h) * 0.38;
  g.beginPath();
  g.arc(0, 0, R * 0.95, 0, 7);
  g.fillStyle = 'rgba(70,120,50,.35)';
  g.fill();
  g.strokeStyle = 'rgba(150,190,100,.55)';
  g.lineWidth = 4;
  g.stroke();
  if (lit) softDot(g, 0, 0, R * 1.3, col, 0.14);
  const n = 16;
  const items = Array.from({ length: n }, (_, i) => ({ a: (i / n) * 6.283 + rf(r, -0.1, 0.1), s: rf(r, 0.7, 1.2) }));
  items.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
  for (const it of items) {
    const x = Math.cos(it.a) * R;
    const y = Math.sin(it.a) * R;
    const s = Math.min(w, h) * 0.06 * it.s;
    g.fillStyle = 'rgb(226,214,190)';
    g.fillRect(x - s * 0.2, y, s * 0.4, s * 0.8);
    g.beginPath();
    g.ellipse(x, y, s, s * 0.8, 0, 0, 7);
    g.fillStyle = radial(g, x, y, s, [[0, 'rgb(240,120,110)'], [1, 'rgb(150,40,50)']], x - s * 0.3, y - s * 0.3, 1);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.1;
    g.stroke();
    g.fillStyle = 'rgb(250,240,226)';
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.arc(x + rf(r, -s * 0.5, s * 0.5), y + rf(r, -s * 0.4, s * 0.4), s * 0.12, 0, 7);
      g.fill();
    }
  }
  if (lit) for (let i = 0; i < 16; i++) {
    const a = r() * 6.28;
    const d = Math.sqrt(r()) * R * 1.05;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, rf(r, 0.8, 1.8), 0, 7);
    g.fillStyle = rgb(mixc(col, [255, 255, 255], 0.6), 0.9);
    g.fill();
  }
  tufts(g, r, 0, 0, R * 0.9, R * 0.9, 12);
}

const common = { ...base, keepAspect: true as const, shadow: 14 };
const M = ['magic', 'outdoor'];

export const fantasyKinds: ObjectKind[] = [
  kind({ key: 'fant_portal_ring', family: 'fantasy', name: 'Portal (stenring)', w: 3.4, h: 3.4, ...common, shadow: 0, params: [glowP('blue'), litP], tags: M, draw: (g, o) => portalRing(g, o) }),
  kind({ key: 'fant_portal_arch', family: 'fantasy', name: 'Portal (stenbue)', w: 3.4, h: 1.8, ...common, params: [glowP('purple'), litP], tags: [...M, 'ruin'], draw: (g, o) => portalArch(g, o) }),
  kind({ key: 'fant_circle_summon', family: 'fantasy', name: 'Besværgelsescirkel (pentagram)', w: 3.4, h: 3.4, ...common, shadow: 0, params: [glowP('red'), litP], tags: [...M, 'dungeon', 'crypt'], draw: (g, o) => magicCircle(g, o, 'summon') }),
  kind({ key: 'fant_circle_arcane', family: 'fantasy', name: 'Arkan cirkel', w: 3.4, h: 3.4, ...common, shadow: 0, params: [glowP('blue'), litP], tags: [...M, 'dungeon'], draw: (g, o) => magicCircle(g, o, 'arcane') }),
  kind({ key: 'fant_circle_elemental', family: 'fantasy', name: 'Elementcirkel', w: 3.4, h: 3.4, ...common, shadow: 0, params: [glowP('gold'), litP], tags: [...M, 'temple'], draw: (g, o) => magicCircle(g, o, 'elemental') }),
  kind({ key: 'fant_crystals', family: 'fantasy', name: 'Krystalklynge', w: 2.6, h: 2.6, ...common, sizeJitter: 0.15, params: [glowP('blue'), litP], tags: [...M, 'cave', 'mountain'], draw: (g, o) => crystals(g, o, 'cluster') }),
  kind({ key: 'fant_crystals_tall', family: 'fantasy', name: 'Høje krystaller', w: 2.2, h: 2.2, ...common, sizeJitter: 0.15, params: [glowP('purple'), litP], tags: [...M, 'cave'], draw: (g, o) => crystals(g, o, 'tall') }),
  kind({ key: 'fant_crystals_field', family: 'fantasy', name: 'Krystalmark', w: 4, h: 3.4, ...common, shadow: 8, params: [glowP('green'), litP], tags: [...M, 'cave'], draw: (g, o) => crystals(g, o, 'field') }),
  kind({ key: 'fant_geode', family: 'fantasy', name: 'Geode', w: 2.4, h: 2.2, ...common, randomRotation: true, params: [glowP('purple'), litP], tags: [...M, 'cave'], draw: (g, o) => crystals(g, o, 'geode') }),
  kind({ key: 'fant_mushroom_red', family: 'fantasy', name: 'Kæmpesvamp (rød)', w: 2.6, h: 2.8, ...common, sizeJitter: 0.2, params: [], tags: ['forest', 'cave', 'swamp'], draw: (g, o) => giantMushroom(g, o, 'red', 1) }),
  kind({ key: 'fant_mushroom_purple', family: 'fantasy', name: 'Kæmpesvamp (lilla)', w: 2.6, h: 2.8, ...common, sizeJitter: 0.2, params: [], tags: ['forest', 'cave', 'swamp', 'magic'], draw: (g, o) => giantMushroom(g, o, 'purple', 1) }),
  kind({ key: 'fant_mushroom_brown', family: 'fantasy', name: 'Kæmpesvamp (brun)', w: 2.6, h: 2.8, ...common, sizeJitter: 0.2, params: [], tags: ['forest', 'cave'], draw: (g, o) => giantMushroom(g, o, 'brown', 1) }),
  kind({ key: 'fant_mushroom_glow', family: 'fantasy', name: 'Lysende svampe', w: 3.4, h: 3.2, ...common, params: [], tags: ['cave', 'magic', 'swamp'], draw: (g, o) => giantMushroom(g, o, 'glow', 4) }),
  kind({ key: 'fant_mushroom_grove', family: 'fantasy', name: 'Svampelund', w: 4, h: 3.6, ...common, params: [], tags: ['forest', 'cave', 'swamp'], draw: (g, o) => giantMushroom(g, o, 'red', 5) }),
  kind({ key: 'fant_tentacles', family: 'fantasy', name: 'Tentakler', w: 3.4, h: 3.4, ...common, randomRotation: true, params: [], tags: ['dungeon', 'cave', 'water', 'magic'], draw: (g, o) => tentacles(g, o, false) }),
  kind({ key: 'fant_tentacles_pit', family: 'fantasy', name: 'Tentakler fra hul', w: 3.4, h: 3.4, ...common, randomRotation: true, params: [], tags: ['dungeon', 'cave', 'swamp', 'magic'], draw: (g, o) => tentacles(g, o, true) }),
  kind({ key: 'fant_flesh', family: 'fantasy', name: 'Levende væv', w: 3.2, h: 3, ...common, randomRotation: true, params: [], tags: ['dungeon', 'cave', 'magic'], draw: (g, o) => fleshMass(g, o) }),
  kind({ key: 'fant_dragon_skeleton', family: 'fantasy', name: 'Drageskelet', w: 9, h: 4.6, ...common, shadow: 8, params: [], tags: ['desert', 'cave', 'mountain', 'dungeon', 'battlefield'], draw: (g, o) => dragonSkeleton(g, o) }),
  kind({ key: 'fant_giant_ribs', family: 'fantasy', name: 'Kæmpe ribben', w: 4.4, h: 3, ...common, shadow: 10, params: [], tags: ['desert', 'cave', 'battlefield'], draw: (g, o) => giantBones(g, o, 'ribs') }),
  kind({ key: 'fant_giant_bones', family: 'fantasy', name: 'Kæmpeknogler', w: 4, h: 3, ...common, shadow: 8, params: [], tags: ['desert', 'cave', 'battlefield'], draw: (g, o) => giantBones(g, o, 'pile') }),
  kind({ key: 'fant_giant_skull', family: 'fantasy', name: 'Kæmpekranie', w: 3.4, h: 2.8, ...common, shadow: 8, params: [], tags: ['desert', 'cave', 'battlefield'], draw: (g, o) => giantBones(g, o, 'skull') }),
  kind({ key: 'fant_rune_fallen', family: 'fantasy', name: 'Faldet runesten', w: 2.6, h: 1.5, ...common, params: [glowP('blue'), litP], tags: [...M, 'ruin'], draw: (g, o) => runeStone(g, o, 1) }),
  kind({ key: 'fant_rune_scatter', family: 'fantasy', name: 'Spredte runesten', w: 4, h: 2.4, ...common, params: [glowP('blue'), litP], tags: [...M, 'ruin'], draw: (g, o) => runeStone(g, o, 4) }),
  kind({ key: 'fant_fey_arch', family: 'fantasy', name: 'Alfebue', w: 4.4, h: 2.4, ...common, shadow: 10, params: [glowP('gold'), litP], tags: [...M, 'forest'], draw: (g, o) => feyArch(g, o) }),
  kind({ key: 'fant_fey_ring', family: 'fantasy', name: 'Alfering', w: 3.4, h: 3.4, ...common, shadow: 4, params: [glowP('gold'), litP], tags: [...M, 'forest'], draw: (g, o) => feyRing(g, o) }),
];
void box;
void crack;
void drum;
void stoneOf;
void polyPath;
