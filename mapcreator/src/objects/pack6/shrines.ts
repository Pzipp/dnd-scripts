import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng, softDot } from '../util';
import { tube } from '../pack2/helpers';
import { base, box, candle, contact, crack, drum, flame, lerp, mixc, mossPatch, mottle, OUT, polyBody, polyPath, radial, lin, rf, rgb, rubble, shift, stoneOf, stoneOptions, tufts, water, type G, type P, type RGB } from './common';

/** Helligdomme og monumenter: altre for flere guder, obelisker, sarkofager, statuer, springvand og offerskåle. Set straks oppefra, lys øverst til venstre. */

const stoneP = (d: string): ParamDef => ({ key: 'stone', label: 'Sten', type: 'select', default: d, options: stoneOptions });
const litP: ParamDef = { key: 'lit', label: 'Tændt', type: 'toggle', default: true };
const mossP = (d: number): ParamDef => ({ key: 'moss', label: 'Bevoksning', type: 'range', min: 0, max: 1, step: 0.05, default: d });

type God = 'sun' | 'moon' | 'nature' | 'death' | 'war' | 'storm';

/** Altre: trin, blok med forside og et symbol i toppen, lys og tilbehør efter guden. */
function altar(g: G, o: DrawInput, god: God): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', god === 'death' ? 'dark' : god === 'sun' ? 'sand' : god === 'moon' ? 'white' : 'grey'));
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  const cx = 0;
  // trin: tre indlejrede rektangler set oppefra (kantskygge antyder højden)
  box(g, r, -w * 0.48, -h * 0.46, w * 0.96, h * 0.92, h * 0.14, shift(col, -8), { courses: 0, wear: 0.6 });
  box(g, r, -w * 0.4, -h * 0.37, w * 0.8, h * 0.74, h * 0.12, shift(col, -2), { courses: 0, wear: 0.6 });
  const aw = w * 0.62;
  const ad = h * 0.52;
  const ax = -aw / 2;
  const ay = -ad / 2;
  box(g, r, ax, ay, aw, ad, h * 0.16, col, { courses: 0, wear: 0.8 });
  g.strokeStyle = 'rgba(255,246,224,.22)';
  g.lineWidth = 1.2;
  g.strokeRect(ax + 3, ay + 3, aw - 6, ad - 6);
  const tcx = cx;
  const tcy = ay + ad / 2;
  // symbol i toppen
  g.save();
  g.beginPath();
  g.rect(ax, ay, aw, ad);
  g.clip();
  const sz = Math.min(aw, ad) * 0.5;
  if (god === 'sun') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283;
      g.beginPath();
      g.moveTo(tcx + Math.cos(a) * sz * 0.6, tcy + Math.sin(a) * sz * 0.4);
      g.lineTo(tcx + Math.cos(a) * sz * 1.5, tcy + Math.sin(a) * sz * 1.0);
      g.strokeStyle = 'rgba(232,184,64,.95)';
      g.lineWidth = 1.8;
      g.stroke();
    }
    g.beginPath();
    g.ellipse(tcx, tcy, sz * 0.6, sz * 0.42, 0, 0, 7);
    g.fillStyle = radial(g, tcx, tcy, sz * 0.7, [[0, 'rgb(255,236,150)'], [1, 'rgb(214,160,40)']], tcx - 3, tcy - 2, 1);
    g.fill();
    g.strokeStyle = 'rgba(80,50,10,.8)';
    g.lineWidth = 1;
    g.stroke();
  } else if (god === 'moon') {
    softDot(g, tcx, tcy, sz * 1.8, [150, 190, 255], 0.35);
    g.beginPath();
    g.arc(tcx, tcy, sz * 0.7, 0, 7);
    g.fillStyle = 'rgb(214,226,246)';
    g.fill();
    g.beginPath();
    g.arc(tcx + sz * 0.3, tcy - sz * 0.1, sz * 0.62, 0, 7);
    g.fillStyle = rgb(shift(col, 14));
    g.fill();
    g.strokeStyle = 'rgba(40,50,90,.6)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(tcx, tcy, sz * 0.7, 0.6, 5.7);
    g.stroke();
  } else if (god === 'nature') {
    for (let i = 0; i < 9; i++) {
      const lx = ax + r() * aw;
      const ly = ay + r() * ad;
      g.beginPath();
      g.ellipse(lx, ly, rf(r, 3, 6), rf(r, 1.6, 3), r() * 3, 0, 7);
      g.fillStyle = rgb(mixc([66, 128, 54], [150, 180, 84], r()), 0.95);
      g.fill();
    }
    g.beginPath();
    g.moveTo(ax, ay + ad * 0.6);
    g.bezierCurveTo(ax + aw * 0.3, ay, ax + aw * 0.6, ay + ad, ax + aw, ay + ad * 0.4);
    g.strokeStyle = 'rgba(52,96,40,.9)';
    g.lineWidth = 1.8;
    g.stroke();
    for (const [fx, c] of [[0.2, '#e8d070'], [0.55, '#e88aa0'], [0.8, '#f0f0e0']] as const) {
      g.fillStyle = c;
      g.beginPath();
      g.arc(ax + aw * fx, ay + ad * rf(r, 0.3, 0.7), 2.2, 0, 7);
      g.fill();
    }
  } else if (god === 'death') {
    g.beginPath();
    g.ellipse(tcx, tcy - 1, sz * 0.6, sz * 0.5, 0, 0, 7);
    g.fillStyle = 'rgb(214,208,190)';
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = 'rgba(14,8,10,.9)';
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.ellipse(tcx + sx * sz * 0.22, tcy - 2, sz * 0.14, sz * 0.17, 0, 0, 7);
      g.fill();
    }
    g.fillRect(tcx - sz * 0.1, tcy + sz * 0.15, sz * 0.2, sz * 0.2);
  } else if (god === 'war') {
    // sværd (set oppefra: gard og klinge) og skjold
    g.beginPath();
    g.moveTo(tcx - sz * 1.4, tcy + 1);
    g.lineTo(tcx + sz * 1.0, tcy - 1);
    g.strokeStyle = 'rgba(14,8,4,.8)';
    g.lineWidth = 5.4;
    g.stroke();
    g.strokeStyle = 'rgb(206,210,218)';
    g.lineWidth = 3.4;
    g.stroke();
    g.fillStyle = 'rgb(150,112,50)';
    g.fillRect(tcx + sz * 0.5, tcy - sz * 0.5, 3.4, sz);
    g.beginPath();
    g.arc(tcx - sz * 1.5, tcy, 2.6, 0, 7);
    g.fillStyle = 'rgb(170,130,56)';
    g.fill();
  } else {
    // storm: zigzag lyn
    g.beginPath();
    g.moveTo(tcx - sz * 0.2, tcy - sz * 0.7);
    g.lineTo(tcx + sz * 0.3, tcy - sz * 0.1);
    g.lineTo(tcx - sz * 0.1, tcy - sz * 0.05);
    g.lineTo(tcx + sz * 0.2, tcy + sz * 0.7);
    g.strokeStyle = 'rgba(120,190,255,.95)';
    g.lineWidth = 2.6;
    g.lineJoin = 'miter';
    g.stroke();
    softDot(g, tcx, tcy, sz * 1.6, [120, 180, 255], 0.28);
  }
  g.restore();
  // tilbehør
  const flameCol: RGB = god === 'death' ? [170, 110, 255] : god === 'moon' ? [150, 200, 255] : god === 'storm' ? [140, 200, 255] : [255, 186, 70];
  const wax: RGB = god === 'death' ? [40, 36, 44] : [236, 226, 196];
  if (god !== 'nature' && god !== 'war') {
    for (const [fx, fy] of [[0.1, 0.16], [0.9, 0.16], [0.1, 0.84], [0.9, 0.84]] as const) candle(g, ax + aw * fx, ay + ad * fy, 4.4, wax, flameCol, lit);
  } else if (god === 'nature') {
    mossPatch(g, r, ax + aw * 0.25, ay + ad * 0.4, aw * 0.2, 10);
    tufts(g, r, 0, h * 0.4, w * 0.4, h * 0.05, 14);
  } else {
    for (const [fx, fy] of [[0.1, 0.16], [0.9, 0.84]] as const) candle(g, ax + aw * fx, ay + ad * fy, 4.4, wax, flameCol, lit);
  }
  void flame;
  void polyBody;
}

/** Obelisk set oppefra: firkantet sokkel i to trin og pyramidespidsen som fire trekantsflader (lys nordvest, skygge sydøst); brudt udgave med faldet skaft. */
function obelisk(g: G, o: DrawInput, style: 'plain' | 'runed' | 'broken'): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', style === 'runed' ? 'dark' : 'grey'));
  const lit = param(o, 'lit', true);
  const { w, h } = o;
  const S = Math.min(w, h) * (style === 'broken' ? 0.56 : 0.92);
  const cx = style === 'broken' ? -w * 0.24 : 0;
  const cy = style === 'broken' ? -h * 0.24 : 0;
  box(g, r, cx - S / 2, cy - S / 2, S, S, 10, shift(col, -8), { wear: 0.5 });
  const s2 = S * 0.74;
  box(g, r, cx - s2 / 2, cy - s2 / 2, s2, s2, 10, col, { wear: 0.4 });
  const s3 = S * 0.5;
  const x0 = cx - s3 / 2;
  const y0 = cy - s3 / 2;
  if (style === 'broken') {
    // stump: ujævn top med lysere brudflade
    const pts: P[] = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * 6.283;
      const sq = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      pts.push([cx + Math.cos(a) * s3 * 0.5 * sq * rf(r, 0.82, 1), cy + Math.sin(a) * s3 * 0.5 * sq * rf(r, 0.82, 1)]);
    }
    polyBody(g, pts, shift(col, 22), { lw: 1.5, light: 28, dark: 26, ao: 2 });
    crack(g, r, cx - 4, cy - 6, s3 * 0.6, 1.2, 0.9, false);
    // det faldne skaft med spids ligger på skrå
    g.save();
    g.translate(w * 0.12, h * 0.2);
    g.rotate(0.62);
    const L = Math.min(w, h) * 0.66;
    const W = s3 * 0.8;
    g.fillStyle = 'rgba(10,5,2,.4)';
    g.fillRect(-L / 2 + 2, -W / 2 + 3, L, W);
    polyBody(g, [[-L / 2, -W / 2], [L * 0.28, -W / 2 * 0.8], [L * 0.28, W / 2 * 0.8], [-L / 2, W / 2]], shift(col, 10), { lw: 1.5, light: 30, dark: 32, ao: 2 });
    polyBody(g, [[L * 0.28, -W / 2 * 0.8], [L * 0.5, 0], [L * 0.28, W / 2 * 0.8]], shift(col, 30), { lw: 1.5, light: 20, dark: 20, ao: 1 });
    for (let i = 1; i < 6; i++) {
      g.fillStyle = 'rgba(14,8,4,.2)';
      g.fillRect(-L / 2 + (i / 6) * L * 0.78, -W / 2, 1, W);
    }
    g.restore();
    rubble(g, r, cx, cy + S * 0.5, S * 0.6, S * 0.1, col, 6, 4);
    return;
  }
  // pyramidespids: fire trekanter mod midten
  const c: P = [cx - s3 * 0.04, cy - s3 * 0.04];
  const tri = (pts: P[], tone: number): void => polyBody(g, pts, shift(col, tone), { lw: 1.3, light: 14, dark: 12, ao: 0.5, rim: 0.4 });
  tri([[x0, y0], [x0 + s3, y0], c], 40);
  tri([[x0, y0], c, [x0, y0 + s3]], 26);
  tri([[x0 + s3, y0], [x0 + s3, y0 + s3], c], -28);
  tri([[x0, y0 + s3], c, [x0 + s3, y0 + s3]], -44);
  g.strokeStyle = 'rgba(255,240,210,.35)';
  g.lineWidth = 1.1;
  for (const [ex, ey] of [[x0, y0], [x0, y0 + s3]] as const) {
    g.beginPath();
    g.moveTo(c[0], c[1]);
    g.lineTo(ex, ey);
    g.stroke();
  }
  if (style === 'runed') {
    // lysende runer på den øverste sokkel
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      g.strokeStyle = lit ? 'rgba(120,220,255,.95)' : 'rgba(30,26,34,.8)';
      g.lineWidth = 1.5;
      const x = cx + sx * (s2 / 2 - 6);
      const y = cy + sy * (s2 / 2 - 6);
      g.beginPath();
      g.moveTo(x - 3, y + 3);
      g.lineTo(x, y - 4);
      g.lineTo(x + 3, y + 3);
      g.moveTo(x, y - 4);
      g.lineTo(x, y + 4);
      g.stroke();
    }
    if (lit) softDot(g, c[0], c[1], s3 * 0.9, [120, 220, 255], 0.5);
  }
  mossPatch(g, r, cx - S * 0.35, cy + S * 0.35, S * 0.15, 5);
}

/** Sarkofag set skråt: sokkel, kasse og låg med udskåren figur (ridder), åbent låg eller glat. */
function sarcophagus(g: G, o: DrawInput, style: 'knight' | 'plain' | 'open' | 'royal'): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', style === 'royal' ? 'white' : 'grey'));
  const { w, h } = o;
  const bx = -w * 0.46;
  const bw = w * 0.92;
  box(g, r, bx - 3, -h * 0.47, bw + 6, h * 0.94, h * 0.1, shift(col, -10), { courses: 0, wear: 0.4 });
  const lx = bx + 6;
  const ly = -h * 0.4;
  const lw = bw - 12;
  const ld = h * 0.8;
  box(g, r, lx, ly, lw, ld, h * 0.16, col, { courses: 0, wear: 0.6 });
  g.save();
  g.beginPath();
  g.rect(lx, ly, lw, ld);
  g.clip();
  if (style === 'open') {
    // låget skubbet til siden: mørkt indre og knogler
    g.fillStyle = 'rgb(24,20,22)';
    g.fillRect(lx + 4, ly + 4, lw * 0.62, ld - 8);
    g.fillStyle = 'rgb(214,206,184)';
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.ellipse(lx + 12 + i * lw * 0.1, ly + ld * 0.5 + rf(r, -4, 4), rf(r, 4, 8), 1.8, rf(r, 0, 3), 0, 7);
      g.fill();
    }
    g.beginPath();
    g.ellipse(lx + 12, ly + ld * 0.5, 5, 4.4, 0, 0, 7);
    g.fillStyle = 'rgb(224,216,194)';
    g.fill();
    g.restore();
    // skubbet låg
    g.save();
    g.translate(lw * 0.015, -3);
    g.rotate(0.05);
    box(g, r, lx + lw * 0.34, ly + 3, lw * 0.64, ld - 2, h * 0.1, shift(col, 8), { courses: 1, wear: 1 });
    g.restore();
    return;
  }
  if (style === 'knight' || style === 'royal') {
    // liggende figur: hoved, krop, hænder med sværd
    const fx = lx + lw * 0.5;
    const fy = ly + ld * 0.5;
    g.fillStyle = rgb(shift(col, -22));
    g.beginPath();
    g.ellipse(fx, fy, lw * 0.4, ld * 0.36, 0, 0, 7);
    g.fill();
    g.fillStyle = lin(g, 0, fy - ld * 0.3, 0, fy + ld * 0.3, [[0, rgb(shift(col, 30))], [1, rgb(shift(col, -10))]]);
    g.beginPath();
    g.ellipse(lx + lw * 0.2, fy, lw * 0.09, ld * 0.22, 0, 0, 7);
    g.fill();
    g.strokeStyle = 'rgba(14,8,4,.6)';
    g.lineWidth = 1;
    g.stroke();
    // krop
    polyBody(g, [[lx + lw * 0.28, fy - ld * 0.22], [lx + lw * 0.78, fy - ld * 0.16], [lx + lw * 0.82, fy + ld * 0.16], [lx + lw * 0.28, fy + ld * 0.22]], shift(col, 4), { lw: 1, light: 18, dark: 18, ao: 1 });
    // sværd
    g.beginPath();
    g.moveTo(lx + lw * 0.3, fy);
    g.lineTo(lx + lw * 0.82, fy);
    g.strokeStyle = 'rgba(14,8,4,.6)';
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = rgb(shift(col, 32));
    g.lineWidth = 2.4;
    g.stroke();
    g.fillRect(lx + lw * 0.34, fy - 6, 2, 12);
    if (style === 'royal') {
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -1.57 + i * 1.257;
        g.lineTo(lx + lw * 0.2 + Math.cos(a) * 7 * (i % 2 ? 0.6 : 1), fy - ld * 0.22 + Math.sin(a) * 7 * (i % 2 ? 0.6 : 1));
      }
      g.closePath();
      g.fillStyle = 'rgb(224,180,60)';
      g.fill();
    }
  } else {
    // glat med kantliste og et simpelt kors
    g.strokeStyle = 'rgba(14,8,4,.4)';
    g.lineWidth = 1.2;
    g.strokeRect(lx + 6, ly + 6, lw - 12, ld - 12);
    g.beginPath();
    g.moveTo(lx + lw * 0.5, ly + ld * 0.22);
    g.lineTo(lx + lw * 0.5, ly + ld * 0.78);
    g.moveTo(lx + lw * 0.38, ly + ld * 0.4);
    g.lineTo(lx + lw * 0.62, ly + ld * 0.4);
    g.strokeStyle = 'rgba(14,8,4,.5)';
    g.lineWidth = 2.2;
    g.stroke();
  }
  g.restore();
  mossPatch(g, r, lx + lw * 0.8, ly + 4, ld * 0.3, 8);
}

/** Statue set oppefra: firkantet sokkel med figurens hoved og skuldre (eller dragens vinger) set ovenfra; højden ses som lys og kantskygge. */
function statue(g: G, o: DrawInput, style: 'dragon' | 'hooded' | 'king' | 'goddess'): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', style === 'goddess' ? 'white' : style === 'dragon' ? 'dark' : 'grey'));
  const { w, h } = o;
  const S = Math.min(w, h) * 0.94;
  box(g, r, -S / 2, -S / 2, S, S, 10, shift(col, -10), { wear: 0.5 });
  const s2 = S * 0.94;
  const sh = (a: number): RGB => shift(col, a);
  const cx = 0;
  const cy = 0;
  const lobe = (x: number, y: number, rx: number, ry: number, tone: number, rot = 0): void => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.fillStyle = radial(g, 0, 0, Math.max(rx, ry), [[0, rgb(sh(tone + 44))], [0.6, rgb(sh(tone))], [1, rgb(sh(tone - 40))]], -rx * 0.3, -ry * 0.3, 1);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.stroke();
    g.restore();
  };
  if (style === 'dragon') {
    // vinger: to store hudfligede fløje, set ovenfra
    for (const sx of [-1, 1]) {
      const pts: P[] = [[sx * s2 * 0.1, -s2 * 0.1], [sx * s2 * 0.48, -s2 * 0.46], [sx * s2 * 0.5, -s2 * 0.1], [sx * s2 * 0.4, s2 * 0.2], [sx * s2 * 0.12, s2 * 0.12]];
      polyBody(g, pts, sh(sx < 0 ? 6 : -14), { lw: 1.5, light: 24, dark: 24, ao: 2 });
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(sx * s2 * 0.1, -s2 * 0.08);
        g.lineTo(pts[1 + Math.min(2, i % 3)]![0] * (0.6 + i * 0.1), pts[1 + Math.min(2, i % 3)]![1] * (0.7 + i * 0.1) + i * 4);
        g.strokeStyle = 'rgba(14,8,4,.45)';
        g.lineWidth = 1.3;
        g.stroke();
      }
    }
    // hale (snoet) og krop
    tube(g, () => { g.beginPath(); g.moveTo(0, s2 * 0.1); g.bezierCurveTo(-s2 * 0.2, s2 * 0.3, s2 * 0.2, s2 * 0.4, s2 * 0.05, s2 * 0.46); }, s2 * 0.1, sh(0));
    lobe(cx, cy, s2 * 0.13, s2 * 0.24, 0);
    tube(g, () => { g.beginPath(); g.moveTo(0, -s2 * 0.18); g.lineTo(0, -s2 * 0.3); }, s2 * 0.08, sh(4));
    lobe(cx, -s2 * 0.38, s2 * 0.09, s2 * 0.12, 10);
    for (const sx of [-1, 1]) {
      polyBody(g, [[sx * s2 * 0.05, -s2 * 0.44], [sx * s2 * 0.14, -s2 * 0.52], [sx * s2 * 0.08, -s2 * 0.4]], sh(18), { lw: 1.1, light: 16, dark: 16, ao: 0.3 });
      g.fillStyle = 'rgba(255,140,40,.95)';
      g.beginPath();
      g.arc(sx * s2 * 0.04, -s2 * 0.4, 1.5, 0, 7);
      g.fill();
    }
    return;
  }
  // humanoid: skuldre (bred ellipse), arme, hoved
  const arm = (sx: number, ang: number): void => {
    g.save();
    g.translate(sx * s2 * 0.36, 0);
    g.rotate(ang);
    lobe(0, s2 * 0.1, s2 * 0.09, s2 * 0.24, -6);
    g.restore();
  };
  arm(-1, 0.12);
  arm(1, -0.12);
  lobe(cx, cy, s2 * 0.4, s2 * 0.21, 2);
  if (style === 'king') {
    // sværd lodret foran kroppen (set oppefra: lang smal stribe) og skjold
    g.beginPath();
    g.moveTo(0, s2 * 0.46);
    g.lineTo(0, s2 * 0.0);
    g.strokeStyle = 'rgba(14,8,4,.7)';
    g.lineWidth = 4.4;
    g.stroke();
    g.strokeStyle = rgb(sh(40));
    g.lineWidth = 2.6;
    g.stroke();
    g.fillStyle = 'rgb(214,170,56)';
    g.fillRect(-7, s2 * 0.02, 14, 2.6);
  }
  const hr = s2 * 0.17;
  lobe(cx, -s2 * 0.02, hr, hr, 10);
  if (style === 'hooded') {
    g.beginPath();
    g.arc(cx, -s2 * 0.02, hr * 1.3, Math.PI * 0.9, Math.PI * 2.1);
    g.lineTo(cx, s2 * 0.2);
    g.closePath();
    g.fillStyle = rgb(sh(-12));
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.4;
    g.stroke();
    g.fillStyle = 'rgba(10,6,4,.8)';
    g.beginPath();
    g.ellipse(cx, s2 * 0.04, hr * 0.5, hr * 0.7, 0, 0, 7);
    g.fill();
  } else if (style === 'king') {
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 6.283;
      const rr = hr * (i % 2 ? 0.95 : 1.28);
      g.lineTo(cx + Math.cos(a) * rr, -s2 * 0.02 + Math.sin(a) * rr);
    }
    g.closePath();
    g.strokeStyle = 'rgb(214,170,56)';
    g.lineWidth = 2.4;
    g.stroke();
  } else {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 6.283;
      g.beginPath();
      g.arc(cx + Math.cos(a) * hr * 1.1, -s2 * 0.02 + Math.sin(a) * hr * 1.1, 2.2, 0, 7);
      g.fillStyle = 'rgb(90,150,66)';
      g.fill();
    }
    lobe(-s2 * 0.34, s2 * 0.12, s2 * 0.06, s2 * 0.08, 0);
  }
  mossPatch(g, r, s2 * 0.3, s2 * 0.34, s2 * 0.15, 6);
}

/** Springvand og bassin: kant af sten, vand med glimt og midtersøjle med stråler. */
function fountain(g: G, o: DrawInput, style: 'tiered' | 'square' | 'pool' | 'waterfall'): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const { w, h } = o;
  const moss = param(o, 'moss', 0.3);
  const rx = w * 0.48;
  const ry = h * 0.48;
  const rim = (rad: number, rady: number, cy: number, thick: number, shape: 'round' | 'square', fill: boolean): void => {
    const path = (rr: number, ryy: number): void => {
      g.beginPath();
      if (shape === 'round') g.ellipse(0, cy, rr, ryy, 0, 0, Math.PI * 2);
      else g.roundRect(-rr, cy - ryy, rr * 2, ryy * 2, 6);
    };
    // udvendig side (dybde)
    path(rad, rady + thick);
    g.fillStyle = rgb(shift(col, -42));
    g.fill();
    path(rad, rady);
    g.fillStyle = lin(g, -rad, -rady, rad, rady, [[0, rgb(shift(col, 40))], [1, rgb(shift(col, -14))]]);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 1.5;
    g.stroke();
    // indre vand
    const ir = rad - thick * 1.1;
    const iry = Math.max(2, rady - thick * 0.8);
    g.save();
    path(ir, iry);
    g.clip();
    if (fill) water(g, r, -ir, cy - iry, ir, cy + iry);
    g.restore();
    path(ir, iry);
    g.strokeStyle = 'rgba(10,6,4,.7)';
    g.lineWidth = 1.2;
    g.stroke();
    path(rad - 1.5, rady - 1.5);
    g.strokeStyle = 'rgba(255,246,224,.3)';
    g.lineWidth = 1;
    g.stroke();
  };
  contact(g, 0, h * 0.04, rx, ry, 0.15);
  if (style === 'pool' || style === 'waterfall') {
    rim(rx, ry * (style === 'pool' ? 0.8 : 0.7), style === 'pool' ? 0 : h * 0.14, w * 0.045, 'round', true);
    for (let i = 0; i < 12; i++) {
      const a = r() * 6.28;
      g.beginPath();
      g.ellipse(Math.cos(a) * rx * 0.9, Math.sin(a) * ry * 0.7 + (style === 'pool' ? 0 : h * 0.14), rf(r, 3, 6), rf(r, 2, 4), r() * 3, 0, 7);
      g.fillStyle = rgb(shift(col, rf(r, -20, 20)));
      g.fill();
      g.stroke();
    }
    if (style === 'waterfall') {
      // klippevæg øverst med vandfald
      polyBody(g, [[-w * 0.4, -h * 0.4], [w * 0.4, -h * 0.4], [w * 0.36, -h * 0.02], [-w * 0.36, -h * 0.02]], shift(col, -6), { lw: 1.5, light: 26, dark: 30, ao: 2 });
      g.save();
      g.beginPath();
      g.rect(-w * 0.1, -h * 0.4, w * 0.2, h * 0.42);
      g.clip();
      g.fillStyle = lin(g, 0, -h * 0.4, 0, 0, [[0, 'rgb(150,206,230)'], [1, 'rgb(234,248,255)']]);
      g.fillRect(-w * 0.1, -h * 0.4, w * 0.2, h * 0.42);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`;
        g.fillRect(-w * 0.1 + r() * w * 0.19, -h * 0.4 + r() * h * 0.36, 1.4, rf(r, 8, 18));
      }
      g.restore();
      softDot(g, 0, 0, w * 0.14, [235, 248, 255], 0.7);
    } else {
      // lilje og sten i vandet
      g.beginPath();
      g.ellipse(-rx * 0.35, ry * 0.15, 6, 4.2, 0, 0, 7);
      g.fillStyle = 'rgb(84,150,70)';
      g.fill();
    }
    tufts(g, r, 0, ry * 0.8, rx, ry * 0.2, Math.round(moss * 30));
    return;
  }
  const shape = style === 'square' ? 'square' : 'round';
  rim(rx, ry * (shape === 'round' ? 0.8 : 0.76), 0, w * 0.05, shape, true);
  if (style === 'tiered') {
    // anden skål og søjle
    rim(rx * 0.5, ry * 0.4, -h * 0.07, w * 0.03, 'round', true);
    rim(rx * 0.2, ry * 0.16, -h * 0.14, w * 0.015, 'round', true);
    // stråler
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 6.283;
      g.beginPath();
      g.moveTo(0, -h * 0.2);
      g.quadraticCurveTo(Math.cos(a) * rx * 0.18, -h * 0.34, Math.cos(a) * rx * 0.3, -h * 0.17);
      g.strokeStyle = 'rgba(226,246,255,.85)';
      g.lineWidth = 1.2;
      g.stroke();
    }
    softDot(g, 0, -h * 0.2, 8, [240, 252, 255], 0.6);
  } else {
    // firkantet: figur/søjle i midten
    drum(g, r, 0, -h * 0.12, w * 0.07, h * 0.13, col, { flutes: 4 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.283 + 0.78;
      g.beginPath();
      g.moveTo(0, -h * 0.16);
      g.quadraticCurveTo(Math.cos(a) * rx * 0.2, -h * 0.3, Math.cos(a) * rx * 0.34, -h * 0.02 + Math.sin(a) * 3);
      g.strokeStyle = 'rgba(226,246,255,.85)';
      g.lineWidth = 1.2;
      g.stroke();
    }
  }
  mossPatch(g, r, rx * 0.7, ry * 0.4, rx * 0.2, Math.round(moss * 10));
}

/** Offerskål: sokkel og skål med ild, vand, blod eller guld. */
function offeringBowl(g: G, o: DrawInput, content: string): void {
  const r = rng(o.seed);
  const col = stoneOf(param(o, 'stone', 'grey'));
  const { w, h } = o;
  const lit = param(o, 'lit', true);
  const cy = 0;
  const rx = Math.min(w, h) * 0.46;
  const ry = rx;
  // skålens ydre
  g.beginPath();
  g.ellipse(2, cy + 3, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(10,5,2,.4)';
  g.fill();
  g.beginPath();
  g.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = lin(g, -rx, -ry, rx, ry, [[0, rgb(shift(col, 40))], [1, rgb(shift(col, -12))]]);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = 1.5;
  g.stroke();
  // indre
  const ir = rx * 0.82;
  const iry = ry * 0.78;
  g.save();
  g.beginPath();
  g.ellipse(0, cy + 1, ir, iry, 0, 0, Math.PI * 2);
  g.clip();
  const inner: Record<string, RGB> = { fire: [38, 24, 18], water: [66, 136, 168], blood: [118, 20, 22], gold: [222, 176, 56], ash: [90, 84, 80] };
  const ic = inner[content] ?? inner.fire!;
  g.fillStyle = lin(g, -ir, cy - iry, ir, cy + iry, [[0, rgb(shift(ic, -30))], [1, rgb(shift(ic, 12))]]);
  g.fillRect(-ir, cy - iry, ir * 2, iry * 2 + 4);
  if (content === 'water') water(g, r, -ir, cy - iry, ir, cy + iry);
  if (content === 'blood') {
    g.beginPath();
    g.ellipse(-ir * 0.3, cy - iry * 0.3, ir * 0.3, iry * 0.2, -0.3, 0, 7);
    g.fillStyle = 'rgba(255,170,160,.5)';
    g.fill();
  }
  if (content === 'gold') {
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      g.arc(rf(r, -ir * 0.8, ir * 0.8), cy + rf(r, -iry * 0.8, iry * 0.8), rf(r, 2, 3.6), 0, 7);
      g.fillStyle = rgb(mixc([226, 182, 60], [255, 240, 150], r()));
      g.fill();
      g.strokeStyle = 'rgba(100,70,10,.7)';
      g.lineWidth = 0.7;
      g.stroke();
    }
  }
  if (content === 'ash') for (let i = 0; i < 20; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '60,56,54' : '140,134,130'},.7)`;
    g.beginPath();
    g.ellipse(rf(r, -ir * 0.8, ir * 0.8), cy + rf(r, -iry * 0.7, iry * 0.7), rf(r, 2, 6), rf(r, 1, 3), r() * 3, 0, 7);
    g.fill();
  }
  g.restore();
  g.beginPath();
  g.ellipse(0, cy + 1, ir, iry, 0, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(10,6,4,.7)';
  g.lineWidth = 1.2;
  g.stroke();
  if (content === 'fire' && lit) {
    for (const [fx, s] of [[-ir * 0.3, 5], [ir * 0.25, 6], [0, 8], [-ir * 0.05, 4]] as const) flame(g, fx, cy - 2, s);
    softDot(g, 0, cy, rx * 1.4, [255, 150, 50], 0.35);
  } else if (content === 'fire') {
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.ellipse(rf(r, -ir * 0.6, ir * 0.6), cy + rf(r, -iry * 0.4, iry * 0.4), 5, 2.4, r() * 3, 0, 7);
      g.fillStyle = 'rgb(30,24,22)';
      g.fill();
    }
  }
}

const common = { ...base, keepAspect: true as const, shadow: 14 };
const A = ['temple', 'outdoor'];

export const shrineKinds: ObjectKind[] = [
  kind({ key: 'shrine_altar_sun', family: 'shrines', name: 'Alter for solguden', w: 2.6, h: 2.2, ...common, params: [stoneP('sand'), litP], tags: [...A], draw: (g, o) => altar(g, o, 'sun') }),
  kind({ key: 'shrine_altar_moon', family: 'shrines', name: 'Alter for månegudinden', w: 2.6, h: 2.2, ...common, params: [stoneP('white'), litP], tags: [...A, 'magic'], draw: (g, o) => altar(g, o, 'moon') }),
  kind({ key: 'shrine_altar_nature', family: 'shrines', name: 'Naturalter', w: 2.6, h: 2.2, ...common, params: [stoneP('mossy'), litP], tags: [...A, 'forest'], draw: (g, o) => altar(g, o, 'nature') }),
  kind({ key: 'shrine_altar_death', family: 'shrines', name: 'Alter for dødsguden', w: 2.6, h: 2.2, ...common, params: [stoneP('dark'), litP], tags: [...A, 'crypt', 'dungeon'], draw: (g, o) => altar(g, o, 'death') }),
  kind({ key: 'shrine_altar_war', family: 'shrines', name: 'Alter for krigsguden', w: 2.6, h: 2.2, ...common, params: [stoneP('grey'), litP], tags: [...A, 'military'], draw: (g, o) => altar(g, o, 'war') }),
  kind({ key: 'shrine_altar_storm', family: 'shrines', name: 'Alter for stormguden', w: 2.6, h: 2.2, ...common, params: [stoneP('dark'), litP], tags: [...A, 'magic', 'mountain'], draw: (g, o) => altar(g, o, 'storm') }),
  kind({ key: 'monument_obelisk', family: 'shrines', name: 'Obelisk', w: 1.6, h: 1.6, ...common, params: [stoneP('grey')], tags: [...A, 'city'], draw: (g, o) => obelisk(g, o, 'plain') }),
  kind({ key: 'monument_obelisk_runed', family: 'shrines', name: 'Rune-obelisk', w: 1.6, h: 1.6, ...common, params: [stoneP('dark'), litP], tags: [...A, 'magic'], draw: (g, o) => obelisk(g, o, 'runed') }),
  kind({ key: 'monument_obelisk_broken', family: 'shrines', name: 'Brudt obelisk', w: 2.4, h: 2.4, ...common, params: [stoneP('sand')], tags: [...A, 'ruin', 'desert'], draw: (g, o) => obelisk(g, o, 'broken') }),
  kind({ key: 'monument_sarcophagus_knight', family: 'shrines', name: 'Sarkofag med ridder', w: 2.2, h: 1.2, ...common, params: [stoneP('grey')], tags: ['crypt', 'dungeon', 'indoor'], draw: (g, o) => sarcophagus(g, o, 'knight') }),
  kind({ key: 'monument_sarcophagus_royal', family: 'shrines', name: 'Kongesarkofag', w: 2.4, h: 1.3, ...common, params: [stoneP('white')], tags: ['crypt', 'dungeon', 'rich', 'indoor'], draw: (g, o) => sarcophagus(g, o, 'royal') }),
  kind({ key: 'monument_sarcophagus_plain', family: 'shrines', name: 'Simpel sarkofag', w: 2.2, h: 1.2, ...common, params: [stoneP('grey')], tags: ['crypt', 'dungeon', 'indoor'], draw: (g, o) => sarcophagus(g, o, 'plain') }),
  kind({ key: 'monument_sarcophagus_open', family: 'shrines', name: 'Åben sarkofag', w: 2.4, h: 1.3, ...common, params: [stoneP('dark')], tags: ['crypt', 'dungeon', 'indoor'], draw: (g, o) => sarcophagus(g, o, 'open') }),
  kind({ key: 'monument_statue_dragon', family: 'shrines', name: 'Drageststue', w: 2.4, h: 2.4, ...common, params: [stoneP('dark')], tags: [...A, 'magic', 'rich'], draw: (g, o) => statue(g, o, 'dragon') }),
  kind({ key: 'monument_statue_hooded', family: 'shrines', name: 'Statue af ukendt gud', w: 1.6, h: 1.6, ...common, params: [stoneP('grey')], tags: [...A, 'crypt'], draw: (g, o) => statue(g, o, 'hooded') }),
  kind({ key: 'monument_statue_king', family: 'shrines', name: 'Kongestatue', w: 1.6, h: 1.6, ...common, params: [stoneP('white')], tags: [...A, 'city', 'rich'], draw: (g, o) => statue(g, o, 'king') }),
  kind({ key: 'monument_statue_goddess', family: 'shrines', name: 'Gudindestatue', w: 1.6, h: 1.6, ...common, params: [stoneP('white')], tags: [...A, 'city', 'rich'], draw: (g, o) => statue(g, o, 'goddess') }),
  kind({ key: 'fountain_tiered', family: 'shrines', name: 'Springvand (flere skåle)', w: 3, h: 3, ...common, params: [stoneP('white'), mossP(0.2)], tags: ['city', 'village', 'outdoor', 'rich', 'water'], draw: (g, o) => fountain(g, o, 'tiered') }),
  kind({ key: 'fountain_square', family: 'shrines', name: 'Firkantet springvand', w: 3, h: 3, ...common, params: [stoneP('grey'), mossP(0.2)], tags: ['city', 'village', 'outdoor', 'water'], draw: (g, o) => fountain(g, o, 'square') }),
  kind({ key: 'fountain_pool', family: 'shrines', name: 'Bassin', w: 3.4, h: 3, ...common, shadow: 6, params: [stoneP('mossy'), mossP(0.5)], tags: ['temple', 'outdoor', 'water', 'forest'], draw: (g, o) => fountain(g, o, 'pool') }),
  kind({ key: 'fountain_waterfall', family: 'shrines', name: 'Vandfald med bassin', w: 3.6, h: 4, ...common, shadow: 6, params: [stoneP('grey'), mossP(0.5)], tags: ['mountain', 'outdoor', 'water', 'cave'], draw: (g, o) => fountain(g, o, 'waterfall') }),
  ...(['fire', 'water', 'blood', 'gold', 'ash'] as const).map((c, i) =>
    kind({ key: `shrine_bowl_${c}`, family: 'shrines', name: ['Offerskål med ild', 'Offerskål med vand', 'Offerskål med blod', 'Offerskål med guld', 'Offerskål med aske'][i]!, w: 1.4, h: 1.4, ...common, params: c === 'fire' ? [stoneP('grey'), litP] : [stoneP('grey')], tags: [...A, c === 'blood' ? 'crypt' : 'village'], draw: (g, o) => offeringBowl(g, o, c) }),
  ),
];
void lerp;
void polyPath;
