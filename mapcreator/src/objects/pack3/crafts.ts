import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { blobPath, body, crack, ellBody, leaf, lin, mottle, OUT, polyBody, radial, rectBody, rectPath, rgb, rope, shift, tube, wobble, type G, type RGB, type Rnd } from '../pack2/helpers';
import { axe, sword, IRON, WOOD } from './arms';
import { bead, coin, ironRect, sack, vary, woodDisc, woodRect } from './common';

/** Værksteder: smedje, tømrer, garver, væver, pottemager, bager, brygger, apoteker, juveler, kartograf, boghandler. */

const glow = (g: G, x: number, y: number, rad: number, a = 0.6): void => {
  g.fillStyle = radial(g, x, y, rad, [[0, `rgba(255,200,80,${a})`], [0.5, `rgba(255,110,20,${a * 0.5})`], [1, 'rgba(255,60,0,0)']]);
  g.beginPath();
  g.arc(x, y, rad, 0, 7);
  g.fill();
};

function embers(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number): void {
  const pts = wobble(r, cx, cy, rx, ry, 14, 0.15);
  g.fillStyle = radial(g, cx, cy, Math.max(rx, ry), [[0, 'rgb(255,226,120)'], [0.35, 'rgb(255,140,30)'], [0.8, 'rgb(150,40,10)'], [1, 'rgb(50,20,12)']]);
  blobPath(g, pts)();
  g.fill();
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r());
    g.fillStyle = r() < 0.4 ? 'rgba(255,230,140,.9)' : r() < 0.5 ? 'rgba(40,24,20,.6)' : 'rgba(255,120,30,.8)';
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * rx * d * 0.9, cy + Math.sin(a) * ry * d * 0.9, 1 + r() * 2.2, 0.8 + r() * 1.4, r() * 3, 0, 7);
    g.fill();
  }
}

function anvil(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // træblok under
  woodDisc(g, r, 0, 0, Math.min(W, H) * 0.47, [112, 76, 44], 3);
  // ambolt: lang bigorne mod venstre, flade, hals
  const ax = -W * 0.4;
  const bx = W * 0.4;
  const t = H * 0.2;
  const path = () => {
    g.beginPath();
    g.moveTo(ax, -t * 0.1);
    g.quadraticCurveTo(ax + W * 0.12, -t * 0.7, -W * 0.2, -t);
    g.lineTo(bx, -t);
    g.lineTo(bx, t);
    g.lineTo(-W * 0.2, t);
    g.quadraticCurveTo(ax + W * 0.12, t * 0.7, ax, t * 0.1);
    g.closePath();
  };
  body(g, path, [86, 88, 96], [ax, -t, bx, t], { lw: 1.7, ao: 3 });
  g.save();
  path();
  g.clip();
  mottle(g, r, [ax, -t, bx, t], [86, 88, 96], 40, 2, 16, 0.5);
  g.fillStyle = 'rgba(255,255,255,.22)';
  g.fillRect(-W * 0.2, -t, W * 0.6, t * 0.4);
  g.restore();
  // hul og firkanthul
  ellBody(g, W * 0.3, 0, 3, 3, [20, 16, 14], { lw: 0.8, ao: 1 });
  rectBody(g, W * 0.17, -2.4, 4.8, 4.8, 0.5, [20, 16, 14], { lw: 0.8, ao: 1 });
  // glødende emne og hammer
  if (param(o, 'hot', true)) {
    glow(g, -W * 0.02, -t * 0.1, 18, 0.5);
    polyBody(g, [[-W * 0.12, -4], [W * 0.1, -3], [W * 0.1, 3.5], [-W * 0.12, 4]], [240, 120, 40], { lw: 1, ao: 0.4, rim: 0.4 });
    g.fillStyle = 'rgba(255,230,160,.7)';
    g.fillRect(-W * 0.1, -2, W * 0.16, 2);
  }
  axe(g, -W * 0.22, H * 0.38, -0.2, W * 0.35, { double: false, big: 0.7, head: [90, 92, 98] });
}

function forge(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  rectBody(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, 4, [110, 104, 98], { lw: 2 });
  g.save();
  g.beginPath();
  g.rect(-W / 2 + 2, -H / 2 + 2, W - 4, H - 4);
  g.clip();
  // murstensmønster
  for (let y = -H / 2; y < H / 2; y += 8) {
    for (let x = -W / 2 + ((Math.round(y / 8) % 2) * 6); x < W / 2; x += 12) {
      g.strokeStyle = 'rgba(20,12,8,.35)';
      g.lineWidth = 0.8;
      g.strokeRect(x, y, 12, 8);
      g.fillStyle = `rgba(${r() < 0.5 ? '255,240,220' : '20,10,5'},${0.04 + r() * 0.07})`;
      g.fillRect(x + 0.5, y + 0.5, 11, 7);
    }
  }
  g.restore();
  const bw = W * 0.58;
  const bh = H * 0.6;
  rectBody(g, -bw / 2, -bh / 2, bw, bh, 5, [38, 30, 28], { lw: 1.8, ao: 4 });
  embers(g, r, 0, 0, bw * 0.4, bh * 0.38);
  glow(g, 0, 0, Math.min(W, H) * 0.55, 0.28);
  // smedejernsemner i gløden
  for (let i = 0; i < 2; i++) polyBody(g, [[-bw * 0.3 + i * 12, -bh * 0.2], [bw * 0.3 + i * 12, -bh * 0.1 + i * 8], [bw * 0.3 + i * 12, -bh * 0.1 + i * 8 + 3], [-bw * 0.3 + i * 12, -bh * 0.2 + 3]], [210, 90, 30], { lw: 0.8, ao: 0.2, rim: 0.2 });
  // tang
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.1, H * 0.46);
    g.lineTo(W * 0.4, H * 0.44);
  }, 3, [90, 90, 96]);
}

function bellows(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // to træplader med læderfolder imellem, snude mod højre
  const bx = -W * 0.45;
  const path = () => {
    g.beginPath();
    g.moveTo(bx, -H * 0.4);
    g.quadraticCurveTo(-W * 0.05, -H * 0.5, W * 0.2, -H * 0.1);
    g.lineTo(W * 0.2, H * 0.1);
    g.quadraticCurveTo(-W * 0.05, H * 0.5, bx, H * 0.4);
    g.closePath();
  };
  body(g, path, [118, 74, 40], [bx, -H * 0.5, W * 0.2, H * 0.5], { lw: 1.6 });
  g.save();
  path();
  g.clip();
  for (let i = 0; i < 6; i++) {
    const x = bx + 6 + i * (W * 0.1);
    g.strokeStyle = 'rgba(30,14,4,.5)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, -H);
    g.lineTo(x + 3, H);
    g.stroke();
    g.strokeStyle = 'rgba(255,220,170,.18)';
    g.beginPath();
    g.moveTo(x + 1.6, -H);
    g.lineTo(x + 4.6, H);
    g.stroke();
  }
  g.restore();
  woodRect(g, r, bx - 3, -H * 0.42, 8, H * 0.84, [120, 80, 46], { vertical: true, count: 2 });
  // håndtag
  tube(g, () => {
    g.beginPath();
    g.moveTo(bx, 0);
    g.lineTo(bx - W * 0.05, 0);
  }, 4, WOOD);
  // jerndyse
  polyBody(g, [[W * 0.2, -H * 0.1], [W * 0.5, -H * 0.04], [W * 0.5, H * 0.04], [W * 0.2, H * 0.1]], [80, 80, 86], { lw: 1.3 });
  rectBody(g, W * 0.46, -H * 0.07, W * 0.04, H * 0.14, 1, [60, 60, 66], { lw: 1 });
}

function quenchTrough(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [96, 64, 38], { count: 3, rad: 4 });
  const ix = -W / 2 + 7;
  const iy = -H / 2 + 7;
  const path = rectPath(g, ix, iy, W - 14, H - 14, 3);
  path();
  g.fillStyle = lin(g, ix, iy, ix + W, iy + H, [[0, 'rgb(40,56,70)'], [1, 'rgb(14,22,34)']]);
  g.fill();
  g.save();
  path();
  g.clip();
  g.strokeStyle = 'rgba(160,200,230,.35)';
  g.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.ellipse(ix + r() * (W - 14), iy + r() * (H - 14), 6 + r() * 8, 2 + r() * 3, 0, 0, 7);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,.1)';
  g.fillRect(ix, iy, W - 14, 4);
  // damp
  for (let i = 0; i < 4; i++) {
    g.fillStyle = radial(g, ix + (W - 14) * (0.2 + 0.2 * i), iy + (H - 14) * 0.5, 14, [[0, 'rgba(230,230,230,.28)'], [1, 'rgba(230,230,230,0)']]);
    g.beginPath();
    g.arc(ix + (W - 14) * (0.2 + 0.2 * i), iy + (H - 14) * 0.5, 14, 0, 7);
    g.fill();
  }
  // nedsænket tang
  g.restore();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.stroke();
  sword(g, W * 0.1, H * 0.35, -0.05, W * 0.35, { blade: [90, 100, 112] });
}

function grindstone(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // træstativ
  woodRect(g, r, -W / 2, -H * 0.16, W, H * 0.32, [112, 78, 44], { count: 2, vertical: false });
  for (const s of [-1, 1]) woodRect(g, r, s * W * 0.36 - 5, -H * 0.5, 10, H, [122, 84, 48], { vertical: true, count: 2 });
  // sten set fra siden (rulle): rektangel med skrå skyggebånd
  const sx = -W * 0.28;
  const sw = W * 0.56;
  const sh = H * 0.74;
  const path = rectPath(g, sx, -sh / 2, sw, sh, sh * 0.22);
  body(g, path, [156, 150, 140], [sx, -sh / 2, sx + sw, sh / 2], { lw: 1.6, angle: 90 });
  g.save();
  path();
  g.clip();
  mottle(g, r, [sx, -sh / 2, sx + sw, sh / 2], [156, 150, 140], 70, 2.2, 24, 0.5);
  g.fillStyle = 'rgba(255,255,255,.28)';
  g.fillRect(sx, -sh / 2, sw, sh * 0.18);
  g.restore();
  // aksel og håndsving
  rectBody(g, sx - 6, -2, sw + 12, 4, 1, [70, 70, 76], { lw: 1 });
  tube(g, () => {
    g.beginPath();
    g.moveTo(sx + sw + 6, 0);
    g.lineTo(sx + sw + 12, 0);
    g.lineTo(sx + sw + 12, H * 0.4);
  }, 3.4, [90, 90, 96]);
  ellBody(g, sx + sw + 12, H * 0.42, 3, 3, WOOD, { lw: 0.9 });
  // slibet klinge og gnister
  sword(g, -W * 0.1, H * 0.42, 0, W * 0.3, { blade: [196, 200, 210] });
}

function carpenter(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [172, 128, 78], { count: 3, nails: true, rad: 3 });
  // skruestik
  rectBody(g, -W / 2 + 6, -H / 2 + 4, 10, H * 0.5, 1, [118, 82, 46], { lw: 1.2 });
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W / 2 + 11, -H / 2 + 4);
    g.lineTo(-W / 2 + 11, -H / 2 - 3);
  }, 2.4, [80, 80, 86]);
  // planke under bearbejdning med savsnit
  woodRect(g, r, -W * 0.28, -H * 0.2, W * 0.5, H * 0.26, [208, 168, 110], { count: 1, vertical: false, rad: 1, wear: 0 });
  g.strokeStyle = 'rgba(40,20,6,.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(W * 0.1, -H * 0.2);
  g.lineTo(W * 0.1, H * 0.06);
  g.stroke();
  // sav
  polyBody(g, [[W * 0.04, H * 0.2], [W * 0.38, H * 0.14], [W * 0.38, H * 0.3], [W * 0.04, H * 0.26]], [150, 154, 164], { lw: 1.1 });
  for (let i = 0; i < 12; i++) {
    g.fillStyle = 'rgba(30,20,10,.55)';
    g.fillRect(W * 0.05 + i * (W * 0.027), H * 0.265 - i * 0.2, 1.4, 2);
  }
  rectBody(g, W * 0.34, H * 0.12, 9, 10, 2, WOOD, { lw: 1 });
  // høvl
  rectBody(g, -W * 0.38, H * 0.22, 26, 11, 2, [140, 96, 52], { lw: 1.2 });
  rectBody(g, -W * 0.38 + 4, H * 0.22 + 3, 12, 5, 1, [30, 20, 14], { lw: 0.6 });
  // spåner
  for (let i = 0; i < 18; i++) {
    g.strokeStyle = `rgba(${230 + r() * 20},${200 + r() * 20},${140 + r() * 20},.85)`;
    g.lineWidth = 1.4;
    g.beginPath();
    const x = -W * 0.3 + r() * W * 0.7;
    const y = H * 0.05 + r() * H * 0.4;
    g.arc(x, y, 1.5 + r() * 2, 0, 3.8 + r());
    g.stroke();
  }
  // hammer og søm
  axe(g, -W * 0.05, -H * 0.38, 0.2, W * 0.26, { big: 0.5, head: [82, 84, 90] });
  for (let i = 0; i < 6; i++) coin(g, -W * 0.42 + i * 3.5, -H * 0.34 + (i % 2) * 2, 1.1, [150, 150, 156]);
}

/** Garverramme med spændte skind. */
function tannery(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const fx = -W / 2 + 4;
  const fy = -H / 2 + 4;
  const fw = W - 8;
  const fh = H - 8;
  // ramme
  const pad = 9;
  const skinPts = wobble(r, 0, 0, fw / 2 - pad, fh / 2 - pad, 14, 0.12);
  // skindets lemmer: tegnes som blob med 4 flige
  const hide = () => {
    g.beginPath();
    const ix = fx + pad;
    const iy = fy + pad;
    const iw = fw - pad * 2;
    const ih = fh - pad * 2;
    g.moveTo(ix + iw * 0.14, iy);
    g.quadraticCurveTo(ix + iw * 0.5, iy + ih * 0.08, ix + iw * 0.86, iy);
    g.quadraticCurveTo(ix + iw * 0.94, iy + ih * 0.3, ix + iw, iy + ih * 0.3);
    g.quadraticCurveTo(ix + iw * 0.9, iy + ih * 0.5, ix + iw, iy + ih * 0.8);
    g.quadraticCurveTo(ix + iw * 0.88, iy + ih * 0.96, ix + iw * 0.8, ih + iy);
    g.quadraticCurveTo(ix + iw * 0.5, iy + ih * 0.92, ix + iw * 0.2, ih + iy);
    g.quadraticCurveTo(ix + iw * 0.1, iy + ih * 0.8, ix, iy + ih * 0.85);
    g.quadraticCurveTo(ix + iw * 0.12, iy + ih * 0.5, ix, iy + ih * 0.2);
    g.quadraticCurveTo(ix + iw * 0.1, iy + ih * 0.1, ix + iw * 0.14, iy);
    g.closePath();
  };
  void skinPts;
  const tone: RGB = param(o, 'hide', 'brown') === 'pale' ? [214, 186, 148] : param(o, 'hide', 'brown') === 'dark' ? [88, 58, 38] : [160, 110, 66];
  woodRect(g, r, fx, fy, fw, 5, [112, 76, 42], { count: 1, rad: 1 });
  woodRect(g, r, fx, fy + fh - 5, fw, 5, [112, 76, 42], { count: 1, rad: 1 });
  woodRect(g, r, fx, fy, 5, fh, [112, 76, 42], { count: 1, rad: 1 });
  woodRect(g, r, fx + fw - 5, fy, 5, fh, [112, 76, 42], { count: 1, rad: 1 });
  body(g, hide, tone, [fx, fy, fx + fw, fy + fh], { lw: 1.4, ao: 3 });
  g.save();
  hide();
  g.clip();
  mottle(g, r, [fx, fy, fx + fw, fy + fh], tone, 60, 6, 24, 0.5);
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = 'rgba(60,34,14,.22)';
    g.lineWidth = 1;
    g.beginPath();
    const y = fy + fh * (0.2 + r() * 0.6);
    g.moveTo(fx, y);
    g.quadraticCurveTo(fx + fw / 2, y + (r() - 0.5) * 10, fx + fw, y + (r() - 0.5) * 6);
    g.stroke();
  }
  g.restore();
  // snore fra ramme til skind
  const n = Math.round(fw / 14);
  for (let i = 0; i <= n; i++) {
    const x = fx + 6 + ((fw - 12) * i) / n;
    for (const y of [fy + 5, fy + fh - 5]) {
      const ty = y < 0 ? fy + pad : fy + fh - pad;
      g.strokeStyle = 'rgba(220,200,150,.9)';
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 3, ty);
      g.stroke();
    }
  }
  const m = Math.round(fh / 14);
  for (let i = 1; i < m; i++) {
    const y = fy + 6 + ((fh - 12) * i) / m;
    for (const x of [fx + 5, fx + fw - 5]) {
      g.strokeStyle = 'rgba(220,200,150,.9)';
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x < 0 ? fx + pad : fx + fw - pad, y + (r() - 0.5) * 3);
      g.stroke();
    }
  }
}

/** Vævestol (lodret kæde med skyttelvæv). */
function loom(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const frameC: RGB = [128, 88, 48];
  // stativ
  woodRect(g, r, -W / 2, -H / 2, 8, H, frameC, { vertical: true, count: 2 });
  woodRect(g, r, W / 2 - 8, -H / 2, 8, H, frameC, { vertical: true, count: 2 });
  const x0 = -W / 2 + 8;
  const x1 = W / 2 - 8;
  // kædetråde
  const n = Math.round((x1 - x0) / 2.6);
  const col: RGB = param(o, 'color', 'red') === 'blue' ? [50, 80, 160] : param(o, 'color', 'red') === 'green' ? [60, 130, 70] : [170, 50, 50];
  const woven = H * 0.55;
  // færdigt væv
  const wp = rectPath(g, x0, -H / 2 + 6, x1 - x0, woven, 1);
  wp();
  g.fillStyle = rgb(col);
  g.fill();
  g.save();
  wp();
  g.clip();
  for (let y = -H / 2 + 6; y < -H / 2 + 6 + woven; y += 3.2) {
    g.fillStyle = rgb(shift(col, (r() - 0.5) * 30), 0.9);
    g.fillRect(x0, y, x1 - x0, 1.6);
    if (Math.round((y + H / 2) / 3.2) % 9 === 0) {
      g.fillStyle = 'rgba(240,210,120,.85)';
      g.fillRect(x0, y, x1 - x0, 2.4);
    }
  }
  g.restore();
  g.strokeStyle = OUT;
  g.lineWidth = 1.2;
  g.strokeRect(x0, -H / 2 + 6, x1 - x0, woven);
  // løse kædetråde
  g.lineWidth = 0.7;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    g.strokeStyle = i % 2 ? 'rgba(236,226,200,.95)' : 'rgba(190,176,146,.95)';
    g.beginPath();
    g.moveTo(x, -H / 2 + 6 + woven);
    g.lineTo(x, H / 2 - 6);
    g.stroke();
  }
  // lisser/bom
  woodRect(g, r, x0, -H / 2 + 6 + woven - 2, x1 - x0, 6, [150, 104, 60], { count: 1, rad: 1 });
  woodRect(g, r, x0, H / 2 - 12, x1 - x0, 7, [132, 90, 52], { count: 1, rad: 1 });
  woodRect(g, r, x0, -H / 2, x1 - x0, 6, [132, 90, 52], { count: 1, rad: 1 });
  // skyttel
  polyBody(g, [[-10, 3], [-6, 0], [6, 0], [10, 3], [6, 6], [-6, 6]], [168, 118, 62], { lw: 1, ao: 0.5, rim: 0.4 });
  g.strokeStyle = 'rgba(240,210,120,.9)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(10, 3);
  g.lineTo(x1, 3);
  g.stroke();
}

/** Spinderok og garnkurv set oppefra. */
function spinning(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // hjul
  const R = Math.min(W, H) * 0.42;
  const cx = -W * 0.12;
  const cy = 0;
  g.beginPath();
  g.arc(cx, cy, R, 0, 7);
  g.strokeStyle = 'rgba(12,6,2,.8)';
  g.lineWidth = 6.5;
  g.stroke();
  g.strokeStyle = rgb([150, 104, 60]);
  g.lineWidth = 4.8;
  g.stroke();
  g.strokeStyle = 'rgba(255,230,180,.4)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(cx - 1, cy - 1, R, 3.3, 4.8);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283;
    tube(g, () => {
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    }, 2, [140, 96, 54], { outline: 1.2 });
  }
  ellBody(g, cx, cy, 5, 5, [120, 82, 46], { lw: 1.1 });
  // bænk og spindel
  woodRect(g, r, W * 0.2, -H * 0.38, W * 0.26, H * 0.76, [128, 88, 50], { vertical: true, count: 2 });
  rectBody(g, W * 0.24, -H * 0.2, 8, H * 0.4, 1, [118, 80, 46], { lw: 1 });
  // drivsnor
  g.strokeStyle = 'rgba(236,224,190,.9)';
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(cx + R, cy);
  g.lineTo(W * 0.26, -H * 0.1);
  g.stroke();
  // uld/garn
  const wool: RGB = vary(r, [236, 230, 214], 8);
  ellBody(g, W * 0.34, -H * 0.2, 7, 7, wool, { lw: 1 });
  g.strokeStyle = 'rgba(180,170,150,.7)';
  g.lineWidth = 0.7;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(W * 0.34, -H * 0.2, 2 + i * 1.1, i, i + 3);
    g.stroke();
  }
  const yarnCols: RGB[] = [[170, 50, 50], [50, 90, 150], [210, 170, 60]];
  for (let i = 0; i < 3; i++) {
    const y = H * (0.1 + 0.1 * i);
    ellBody(g, W * 0.33, y, 5.5, 5.5, yarnCols[i]!, { lw: 1 });
    g.strokeStyle = 'rgba(0,0,0,.28)';
    g.lineWidth = 0.7;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(W * 0.33, y, 1.5 + k, k * 1.3, k * 1.3 + 2.2);
      g.stroke();
    }
  }
}

function potterWheel(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2, -H / 2, W, H, [120, 84, 48], { count: 3, nails: true, rad: 4 });
  // skive med ler
  const R = Math.min(W, H) * 0.3;
  const cx = -W * 0.08;
  ellBody(g, cx, 0, R, R, [150, 148, 144], { lw: 1.6 });
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.arc(cx, 0, (R * i) / 4, 0, 7);
    g.strokeStyle = 'rgba(0,0,0,.14)';
    g.lineWidth = 0.7;
    g.stroke();
  }
  const clay: RGB = [170, 100, 66];
  ellBody(g, cx, 0, R * 0.62, R * 0.62, clay, { lw: 1.3 });
  ellBody(g, cx, 0, R * 0.34, R * 0.34, [60, 34, 22], { lw: 1, ao: 3 });
  g.fillStyle = 'rgba(255,230,200,.3)';
  g.beginPath();
  g.ellipse(cx - R * 0.2, -R * 0.26, R * 0.15, R * 0.07, -0.6, 0, 7);
  g.fill();
  // vandspand og færdige potter
  ellBody(g, W * 0.3, -H * 0.24, 8, 8, [70, 100, 130], { lw: 1.1 });
  ellBody(g, W * 0.3, -H * 0.24, 5.4, 5.4, [40, 60, 90], { lw: 0.8, ao: 2 });
  const pots: RGB[] = [[190, 110, 70], [120, 70, 50], [210, 180, 120]];
  for (let i = 0; i < 3; i++) {
    const px = W * 0.3 + (i % 2) * 11 - 4;
    const py = H * (0.0 + 0.2 * i) + 4;
    ellBody(g, px, py, 7 - i * 0.6, 7 - i * 0.6, pots[i]!, { lw: 1.2 });
    ellBody(g, px, py, 4 - i * 0.4, 4 - i * 0.4, [34, 18, 10], { lw: 0.7, ao: 2 });
  }
  // svamp og værktøj
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.45, H * 0.38);
    g.lineTo(-W * 0.2, H * 0.4);
  }, 3, [190, 160, 110]);
}

function kiln(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const R = Math.min(W, H) / 2 - 2;
  ellBody(g, 0, 0, R, R, [158, 106, 74], { lw: 2 });
  g.save();
  g.beginPath();
  g.arc(0, 0, R - 1, 0, 7);
  g.clip();
  for (let ring = 1; ring < 6; ring++) {
    g.beginPath();
    g.arc(0, 0, (R * ring) / 6, 0, 7);
    g.strokeStyle = 'rgba(40,16,6,.3)';
    g.lineWidth = 1;
    g.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * 6.283;
    g.strokeStyle = 'rgba(40,16,6,.2)';
    g.beginPath();
    g.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
    g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    g.stroke();
  }
  mottle(g, r, [-R, -R, R, R], [158, 106, 74], 60, 4, 24, 0.4);
  g.fillStyle = 'rgba(0,0,0,.45)';
  g.beginPath();
  g.arc(R * 0.15, R * 0.25, R * 0.4, 0, 7);
  g.fill();
  g.restore();
  // skorsten
  ellBody(g, 0, 0, R * 0.3, R * 0.3, [60, 50, 46], { lw: 1.4, ao: 3 });
  ellBody(g, 0, 0, R * 0.17, R * 0.17, [18, 12, 10], { lw: 1, ao: 2 });
  // ildkammeråbning (nederst)
  polyBody(g, [[-R * 0.34, R * 0.78], [R * 0.34, R * 0.78], [R * 0.34, R * 1.0], [-R * 0.34, R * 1.0]], [30, 22, 20], { lw: 1.2 });
  glow(g, 0, R * 0.92, R * 0.3, 0.55);
  // revner
  crack(g, r, -R * 0.6, -R * 0.4, 14, 0.5, 0.8, false);
}

function bakeryOven(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  rectBody(g, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, 6, [170, 120, 84], { lw: 2 });
  g.save();
  g.beginPath();
  g.rect(-W / 2 + 2, -H / 2 + 2, W - 4, H - 4);
  g.clip();
  mottle(g, r, [-W / 2, -H / 2, W / 2, H / 2], [170, 120, 84], 90, 4, 24, 0.4);
  for (let y = -H / 2; y < H / 2; y += 9) {
    g.strokeStyle = 'rgba(60,24,8,.25)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(-W / 2, y);
    g.lineTo(W / 2, y);
    g.stroke();
  }
  g.restore();
  // ildkammer: åben bue mod fronten (nederst)
  const mx = W * 0.5;
  const my = H * 0.3;
  const path = () => {
    g.beginPath();
    g.moveTo(-mx / 2, H / 2 - 1);
    g.lineTo(-mx / 2, H / 2 - my * 0.5);
    g.quadraticCurveTo(0, H / 2 - my * 1.5, mx / 2, H / 2 - my * 0.5);
    g.lineTo(mx / 2, H / 2 - 1);
    g.closePath();
  };
  path();
  g.fillStyle = 'rgb(24,14,10)';
  g.fill();
  glow(g, 0, H * 0.4, W * 0.28, 0.5);
  // brød på bagepladen og skovl
  const bread: RGB[] = [[208, 150, 80], [190, 130, 64], [222, 168, 96]];
  for (let i = 0; i < 4; i++) {
    const bx = -W * 0.3 + i * W * 0.2;
    const by = -H * 0.18 + (i % 2) * H * 0.04;
    ellBody(g, bx, by, 10, 7, bread[i % 3]!, { lw: 1.2 });
    g.strokeStyle = 'rgba(100,50,10,.55)';
    g.lineWidth = 1;
    for (let k = -1; k <= 1; k++) {
      g.beginPath();
      g.moveTo(bx + k * 4 - 2, by - 4);
      g.lineTo(bx + k * 4 + 2, by + 4);
      g.stroke();
    }
  }
  // skorsten
  ellBody(g, W * 0.34, -H * 0.4, 6, 6, [50, 40, 36], { lw: 1.2, ao: 2 });
}

function doughTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [182, 138, 88], { count: 4, vertical: false, rad: 3 });
  // mel
  g.save();
  g.beginPath();
  g.rect(-W / 2 + 2, -H / 2 + 2, W - 4, H - 4);
  g.clip();
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(250,246,236,${0.12 + r() * 0.2})`;
    g.beginPath();
    g.ellipse((r() - 0.5) * W, (r() - 0.5) * H, 3 + r() * 9, 2 + r() * 5, r() * 3, 0, 7);
    g.fill();
  }
  g.restore();
  // dejklumper
  const pts = wobble(r, -W * 0.18, 0, W * 0.2, H * 0.34, 12, 0.1);
  body(g, blobPath(g, pts), [236, 220, 180], [-W * 0.4, -H * 0.34, W * 0.04, H * 0.34], { lw: 1.2, ao: 3 });
  for (let i = 0; i < 3; i++) {
    const bx = W * 0.18 + (i % 2) * 13;
    const by = -H * 0.24 + i * H * 0.24;
    ellBody(g, bx, by, 8, 7, [236, 220, 180], { lw: 1.1, ao: 2 });
  }
  // kagerulle
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.38, H * 0.38);
    g.lineTo(W * 0.0, H * 0.34);
  }, 5, [200, 150, 90]);
  ellBody(g, W * 0.36, H * 0.3, 7, 7, [150, 100, 60], { lw: 1.2 });
  ellBody(g, W * 0.36, H * 0.3, 4.4, 4.4, [240, 236, 220], { lw: 0.6, ao: 1 });
}

function brewVat(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const R = Math.min(o.w, o.h) / 2 - 1;
  ellBody(g, 0, 0, R, R, [124, 82, 46], { lw: 2 });
  // staver og jernbånd
  g.save();
  g.beginPath();
  g.arc(0, 0, R - 1, 0, 7);
  g.clip();
  woodGrainRing(g, r, R);
  g.restore();
  g.beginPath();
  g.arc(0, 0, R * 0.9, 0, 7);
  g.strokeStyle = 'rgba(10,6,4,.8)';
  g.lineWidth = 3.2;
  g.stroke();
  g.strokeStyle = 'rgb(96,98,104)';
  g.lineWidth = 2;
  g.stroke();
  const lq = param(o, 'brew', 'ale');
  const lc: RGB = lq === 'wine' ? [110, 24, 50] : lq === 'mash' ? [170, 130, 60] : [196, 126, 30];
  const ip = R * 0.78;
  ellBody(g, 0, 0, ip, ip, shift(lc, -70), { lw: 1.2, ao: 4 });
  g.fillStyle = radial(g, 0, 0, ip * 0.95, [[0, rgb(shift(lc, 20))], [1, rgb(shift(lc, -30))]]);
  g.beginPath();
  g.arc(0, 0, ip * 0.92, 0, 7);
  g.fill();
  // skum
  for (let i = 0; i < 40; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r()) * ip * 0.85;
    g.fillStyle = `rgba(255,248,225,${0.22 + r() * 0.35})`;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, 1.2 + r() * 3, 0, 7);
    g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(0, 0, ip * 0.88, 3.4, 4.7);
  g.stroke();
  // ske hvilende over kanten
  tube(g, () => {
    g.beginPath();
    g.moveTo(-R * 0.1, -R * 0.1);
    g.lineTo(R * 0.95, R * 0.55);
  }, 3.6, [150, 106, 60]);
}

function woodGrainRing(g: G, r: Rnd, R: number): void {
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * 6.283;
    g.strokeStyle = `rgba(20,8,0,${0.2 + r() * 0.15})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72);
    g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    g.stroke();
  }
}

function mashTun(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [118, 80, 46], { count: 5, vertical: true, rad: 4 });
  for (const x of [-W * 0.34, W * 0.34]) {
    g.fillStyle = 'rgb(96,98,104)';
    g.fillRect(x - 2, -H / 2 + 1, 4, H - 2);
    g.fillStyle = 'rgba(255,255,255,.3)';
    g.fillRect(x - 2, -H / 2 + 1, 1, H - 2);
  }
  const ix = -W * 0.28;
  const ip = rectPath(g, ix, -H * 0.38, W * 0.56, H * 0.76, 6);
  body(g, ip, [92, 62, 34], [ix, -H * 0.38, ix + W * 0.56, H * 0.38], { lw: 1.3, ao: 4 });
  g.save();
  ip();
  g.clip();
  g.fillStyle = 'rgb(196,162,90)';
  g.fillRect(ix, -H * 0.38, W * 0.56, H * 0.76);
  mottle(g, r, [ix, -H * 0.38, ix + W * 0.56, H * 0.38], [196, 162, 90], 120, 2, 30, 0.7);
  for (let i = 0; i < 20; i++) {
    g.fillStyle = 'rgba(255,248,220,.5)';
    g.beginPath();
    g.arc(ix + r() * W * 0.56, -H * 0.38 + r() * H * 0.76, 1 + r() * 2, 0, 7);
    g.fill();
  }
  g.restore();
  ip();
  g.strokeStyle = OUT;
  g.lineWidth = 1.2;
  g.stroke();
  // rørepagaj
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.5, H * 0.45);
    g.lineTo(W * 0.1, -H * 0.1);
  }, 4, [150, 106, 60]);
  rectBody(g, W * 0.04, -H * 0.2, 12, 10, 1, [150, 106, 60], { lw: 1 });
}

function herbTable(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [138, 96, 56], { count: 4, vertical: false, rad: 3 });
  // tørrende bundter, krukker, morter
  const herbs: RGB[] = [[88, 140, 60], [110, 150, 70], [150, 70, 130], [200, 180, 60], [70, 110, 60]];
  const n = Math.max(3, Math.round(W / 22));
  for (let i = 0; i < n; i++) {
    const cx = -W / 2 + (W * (i + 0.5)) / n;
    const cy = (r() - 0.5) * H * 0.35 - H * 0.12;
    const a = (r() - 0.5) * 0.8;
    const c = herbs[i % herbs.length]!;
    for (let k = 0; k < 7; k++) leaf(g, cx - Math.cos(a) * 2, cy, a + (k - 3) * 0.25 + 1.57, 15 + r() * 8, 3, vary(r, c, 20));
    g.strokeStyle = 'rgba(200,170,110,.95)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - 3, cy + 3);
    g.lineTo(cx + 3, cy + 3);
    g.stroke();
  }
  // morter
  ellBody(g, W * 0.3, H * 0.26, 8, 8, [166, 164, 158], { lw: 1.4 });
  ellBody(g, W * 0.3, H * 0.26, 5, 5, [64, 80, 52], { lw: 0.8, ao: 3 });
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.3, H * 0.26);
    g.lineTo(W * 0.3 + 12, H * 0.14);
  }, 3, [196, 192, 184]);
  // flasker
  for (let i = 0; i < 4; i++) bead(g, -W * 0.38 + i * 9, H * 0.3, 3.6, vary(r, [110, 90, 60], 80));
  // kniv
  sword(g, -W * 0.05, H * 0.32, 0.1, 22, { guard: [60, 40, 24], wide: 1.8 });
}

/** Apoteker-hylde: set oppefra, med flasker og krukker i rækker. */
function apothecaryShelf(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [96, 62, 36], { count: 2, vertical: false, rad: 2 });
  const rows = 2;
  const n = Math.max(4, Math.round(W / 16));
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < n; i++) {
      const cx = -W / 2 + (W * (i + 0.5)) / n;
      const cy = -H / 2 + (H * (row + 0.5)) / rows;
      const t = r();
      const rad = Math.min(W / n, H / rows) * 0.38;
      if (t < 0.5) {
        const c: RGB = [[60, 130, 80], [150, 50, 60], [60, 90, 160], [190, 150, 50], [120, 60, 150]][Math.floor(r() * 5)] as RGB;
        bead(g, cx, cy, rad, c);
        g.fillStyle = 'rgba(200,170,110,.95)';
        g.beginPath();
        g.arc(cx, cy, rad * 0.4, 0, 7);
        g.fill();
        g.strokeStyle = 'rgba(30,18,6,.7)';
        g.lineWidth = 0.7;
        g.stroke();
      } else if (t < 0.8) {
        ellBody(g, cx, cy, rad, rad, vary(r, [190, 160, 120], 40), { lw: 1.1 });
        ellBody(g, cx, cy, rad * 0.55, rad * 0.55, [50, 30, 18], { lw: 0.7, ao: 2 });
      } else {
        rectBody(g, cx - rad, cy - rad * 0.8, rad * 2, rad * 1.6, 1.5, vary(r, [110, 60, 40], 50), { lw: 1 });
      }
    }
  }
  // kant mod rummet
  g.fillStyle = 'rgba(255,230,180,.28)';
  g.fillRect(-W / 2 + 2, -H / 2 + 2, W - 4, 1.4);
}

function jewelerBench(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [92, 62, 38], { count: 3, rad: 3 });
  // læderunderlag
  rectBody(g, -W * 0.36, -H * 0.36, W * 0.5, H * 0.72, 3, [74, 48, 34], { lw: 1.2, ao: 3 });
  // ringe og ædelsten
  const gems: RGB[] = [[60, 100, 220], [60, 190, 110], [220, 50, 60], [240, 240, 255]];
  for (let i = 0; i < 6; i++) {
    const gx = -W * 0.3 + r() * W * 0.38;
    const gy = -H * 0.28 + r() * H * 0.56;
    const c = gems[i % 4]!;
    polyBody(g, [[gx, gy - 3.4], [gx + 3, gy], [gx, gy + 3.4], [gx - 3, gy]], c, { lw: 0.8, ao: 0.5, rim: 0.5 });
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillRect(gx - 1.2, gy - 1.6, 1.2, 1.2);
  }
  // forstørrelsesglas
  g.beginPath();
  g.arc(W * 0.3, -H * 0.1, 10, 0, 7);
  g.strokeStyle = 'rgba(10,6,2,.85)';
  g.lineWidth = 3.6;
  g.stroke();
  g.fillStyle = 'rgba(190,225,255,.35)';
  g.fill();
  g.strokeStyle = 'rgb(190,150,60)';
  g.lineWidth = 2;
  g.stroke();
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.3 + 7, -H * 0.1 + 7);
    g.lineTo(W * 0.3 + 18, H * 0.22);
  }, 3.2, [120, 80, 44]);
  // tænger, hammer, digel
  tube(g, () => {
    g.beginPath();
    g.moveTo(-W * 0.4, H * 0.42);
    g.lineTo(-W * 0.18, H * 0.38);
  }, 2.4, [140, 140, 148]);
  ellBody(g, W * 0.18, H * 0.3, 6, 6, [60, 54, 50], { lw: 1.2 });
  ellBody(g, W * 0.18, H * 0.3, 3.6, 3.6, [250, 170, 50], { lw: 0.8, ao: 0.5 });
  for (let i = 0; i < 6; i++) coin(g, W * 0.4 + (i % 3) * 4, H * 0.18 + Math.floor(i / 3) * 4, 2.2);
}

function cartographer(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [96, 66, 40], { count: 4, vertical: false, rad: 3 });
  // kort
  const mp = rectPath(g, -W * 0.36, -H * 0.38, W * 0.62, H * 0.76, 1);
  mp();
  g.fillStyle = 'rgb(226,208,164)';
  g.fill();
  g.save();
  mp();
  g.clip();
  mottle(g, r, [-W * 0.36, -H * 0.38, W * 0.26, H * 0.38], [226, 208, 164], 60, 6, 18, 0.5);
  // kyster og bjerge
  g.strokeStyle = 'rgba(70,90,110,.55)';
  g.lineWidth = 1;
  g.fillStyle = 'rgba(170,196,196,.55)';
  const cp = wobble(r, -W * 0.05, 0, W * 0.2, H * 0.28, 11, 0.3);
  blobPath(g, cp)();
  g.fill();
  g.stroke();
  g.strokeStyle = 'rgba(90,50,24,.7)';
  g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const mx = -W * 0.25 + r() * W * 0.4;
    const my = -H * 0.25 + r() * H * 0.5;
    g.beginPath();
    g.moveTo(mx - 3, my + 2);
    g.lineTo(mx, my - 3);
    g.lineTo(mx + 3, my + 2);
    g.stroke();
  }
  g.setLineDash([2, 2]);
  g.strokeStyle = 'rgba(160,40,30,.8)';
  g.beginPath();
  g.moveTo(-W * 0.3, H * 0.3);
  g.bezierCurveTo(-W * 0.15, 0, W * 0.05, H * 0.2, W * 0.2, -H * 0.25);
  g.stroke();
  g.setLineDash([]);
  g.restore();
  mp();
  g.strokeStyle = OUT;
  g.lineWidth = 1.2;
  g.stroke();
  // passer, lineal og blækhorn med fjer
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.32, -H * 0.3);
    g.lineTo(W * 0.4, H * 0.1);
  }, 2.2, [186, 150, 70]);
  tube(g, () => {
    g.beginPath();
    g.moveTo(W * 0.4, -H * 0.3);
    g.lineTo(W * 0.4, H * 0.1);
  }, 2.2, [186, 150, 70]);
  rectBody(g, W * 0.3, H * 0.2, 20, 4.5, 1, [196, 170, 110], { lw: 0.9 });
  ellBody(g, W * 0.36, H * 0.38, 4, 4, [26, 30, 44], { lw: 1.1 });
  leaf(g, W * 0.36, H * 0.38, -2.6, 22, 3, [236, 232, 220], true);
}

function bookSeller(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  woodRect(g, r, -W / 2 + 1, -H / 2 + 1, W - 2, H - 2, [100, 68, 40], { count: 3, vertical: false, rad: 3 });
  const rows = 2;
  const cols: RGB[] = [[120, 40, 40], [40, 70, 110], [60, 100, 60], [140, 100, 40], [90, 50, 100], [160, 150, 130]];
  for (let row = 0; row < rows; row++) {
    let x = -W / 2 + 5;
    const y = -H / 2 + 4 + row * (H / rows - 1);
    const bh = H / rows - 7;
    while (x < W / 2 - 8) {
      const bw = 4 + r() * 4.5;
      const c = vary(r, cols[Math.floor(r() * cols.length)]!, 24);
      const slant = (r() < 0.1 ? 0.12 : 0) * bh;
      polyBody(g, [[x + slant, y], [x + bw + slant, y], [x + bw, y + bh], [x, y + bh]], c, { lw: 0.8, ao: 0.5, rim: 0.5 });
      g.fillStyle = 'rgba(230,200,120,.8)';
      g.fillRect(x + 1, y + bh * 0.25, bw - 2, 1);
      g.fillRect(x + 1, y + bh * 0.7, bw - 2, 1);
      x += bw + 0.6;
    }
  }
  // liggende stak og lys
  rectBody(g, W * 0.12, -H * 0.02, 20, 11, 1.5, [110, 50, 40], { lw: 1 });
  rectBody(g, W * 0.12 + 2, -H * 0.02 - 6, 17, 7, 1.5, [60, 80, 120], { lw: 1 });
  bead(g, -W * 0.38, H * 0.08, 3.4, [240, 226, 180]);
  g.fillStyle = 'rgba(255,170,40,.95)';
  g.beginPath();
  g.arc(-W * 0.38, H * 0.08, 1.2, 0, 7);
  g.fill();
  glow(g, -W * 0.38, H * 0.08, 14, 0.25);
}

export const craftKinds: ObjectKind[] = [
  kind({ key: 'craft_anvil', family: 'craft', name: 'Ambolt på blok', w: 1.6, h: 1.6, shadow: 6, bleed: 0.05, params: [{ key: 'hot', label: 'Glødende emne', type: 'toggle', default: true }], tags: ['city', 'village', 'military'], draw: anvil }),
  kind({ key: 'craft_forge', family: 'craft', name: 'Esse', w: 2.4, h: 2, keepAspect: false, shadow: 6, bleed: 0.06, tags: ['city', 'village', 'military'], draw: forge }),
  kind({ key: 'craft_bellows', family: 'craft', name: 'Blæsebælg', w: 2, h: 1.1, keepAspect: false, shadow: 5, bleed: 0.06, tags: ['city', 'village'], draw: bellows }),
  kind({ key: 'craft_quench', family: 'craft', name: 'Slukketrug', w: 2, h: 1, keepAspect: false, shadow: 5, bleed: 0.04, tags: ['city', 'village'], draw: quenchTrough }),
  kind({ key: 'craft_grindstone', family: 'craft', name: 'Slibesten', w: 1.6, h: 1.3, keepAspect: false, shadow: 5, bleed: 0.06, tags: ['city', 'village', 'military'], draw: grindstone }),
  kind({ key: 'craft_carpenter', family: 'craft', name: 'Tømrerbænk', w: 3, h: 1.4, keepAspect: false, shadow: 6, bleed: 0.06, tags: ['city', 'village', 'house', 'farm'], draw: carpenter }),
  kind({
    key: 'craft_tannery', family: 'craft', name: 'Garverramme med skind', w: 2, h: 2.4, keepAspect: false, shadow: 5, bleed: 0.04,
    params: [{ key: 'hide', label: 'Skind', type: 'select', default: 'brown', options: [{ value: 'brown', label: 'Brunt' }, { value: 'pale', label: 'Lyst' }, { value: 'dark', label: 'Mørkt' }] }],
    tags: ['city', 'village', 'poor'], draw: tannery,
  }),
  kind({
    key: 'craft_loom', family: 'craft', name: 'Væv', w: 2.4, h: 2.2, keepAspect: false, shadow: 5, bleed: 0.04,
    params: [{ key: 'color', label: 'Farve', type: 'select', default: 'red', options: [{ value: 'red', label: 'Rød' }, { value: 'blue', label: 'Blå' }, { value: 'green', label: 'Grøn' }] }],
    tags: ['city', 'village', 'house'], draw: loom,
  }),
  kind({ key: 'craft_spinning', family: 'craft', name: 'Spinderok og garn', w: 2, h: 1.6, keepAspect: false, shadow: 5, bleed: 0.05, tags: ['village', 'house', 'farm'], draw: spinning }),
  kind({ key: 'craft_potter', family: 'craft', name: 'Drejeskive', w: 2, h: 1.6, keepAspect: false, shadow: 5, bleed: 0.04, tags: ['village', 'city', 'house'], draw: potterWheel }),
  kind({ key: 'craft_kiln', family: 'craft', name: 'Lerovn', w: 2, h: 2, shadow: 6, bleed: 0.05, tags: ['village', 'city'], draw: kiln }),
  kind({ key: 'craft_bakery_oven', family: 'craft', name: 'Bageovn', w: 2.6, h: 2, keepAspect: false, shadow: 6, bleed: 0.05, tags: ['village', 'city', 'house', 'tavern'], draw: bakeryOven }),
  kind({ key: 'craft_dough_table', family: 'craft', name: 'Dejbord', w: 2.6, h: 1.4, keepAspect: false, shadow: 5, bleed: 0.04, tags: ['village', 'city', 'house', 'tavern'], draw: doughTable }),
  kind({
    key: 'craft_brew_vat', family: 'craft', name: 'Bryggekar', w: 1.6, h: 1.6, shadow: 6, bleed: 0.04,
    params: [{ key: 'brew', label: 'Indhold', type: 'select', default: 'ale', options: [{ value: 'ale', label: 'Øl' }, { value: 'wine', label: 'Vin' }, { value: 'mash', label: 'Mask' }] }],
    tags: ['tavern', 'village', 'city', 'farm'], draw: brewVat,
  }),
  kind({ key: 'craft_mash_tun', family: 'craft', name: 'Mæskekar', w: 2.4, h: 1.6, keepAspect: false, shadow: 6, bleed: 0.04, tags: ['tavern', 'village', 'city'], draw: mashTun }),
  kind({ key: 'craft_herb_table', family: 'craft', name: 'Urtebord', w: 2.4, h: 1.2, keepAspect: false, shadow: 5, bleed: 0.06, tags: ['village', 'house', 'magic', 'forest'], draw: herbTable }),
  kind({ key: 'craft_apothecary', family: 'craft', name: 'Apotekerhylde', w: 3, h: 0.9, keepAspect: false, shadow: 4, bleed: 0.04, tags: ['village', 'city', 'house', 'magic'], draw: apothecaryShelf }),
  kind({ key: 'craft_jeweler', family: 'craft', name: 'Juvelerbord', w: 2.4, h: 1.4, keepAspect: false, shadow: 5, bleed: 0.06, tags: ['city', 'rich'], draw: jewelerBench }),
  kind({ key: 'craft_cartographer', family: 'craft', name: 'Kartografbord', w: 2.4, h: 1.6, keepAspect: false, shadow: 5, bleed: 0.06, tags: ['city', 'house', 'rich'], draw: cartographer }),
  kind({ key: 'craft_bookseller', family: 'craft', name: 'Boghandlerbord', w: 3, h: 1.4, keepAspect: false, shadow: 5, bleed: 0.04, tags: ['city', 'house', 'rich'], draw: bookSeller }),
];

void IRON;
void rope;
void sack;
void lin;
