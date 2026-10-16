import { ellBody, polyBody, rectBody, lin, radial, rgb, shift, mottle, tube, body, rectPath, OUT, type G, type RGB, type Rnd } from '../pack2/helpers';
import { softDot } from '../util';

/** Små rekvisitter set oppefra til bordplader, hylder og værelser (pakke 7). Alle tegnes med lys øverst til venstre. */

export const WOOD: RGB = [128, 88, 52];
export const WOOD_DARK: RGB = [92, 60, 34];
export const WOOD_LIGHT: RGB = [168, 124, 76];
export const PEWTER: RGB = [156, 156, 164];
export const COPPER: RGB = [184, 108, 58];
export const CLAY: RGB = [168, 98, 60];
export const BRASS: RGB = [206, 170, 70];
export const CLOTH_RED: RGB = [150, 40, 40];
export const PARCHMENT: RGB = [226, 210, 168];

/** Blank rund genstand (kugle/skål-kant): radial gradient + spejling. */
export function dome(g: G, x: number, y: number, rx: number, ry: number, col: RGB, lw = 1): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, 7);
  g.fillStyle = radial(g, x, y, Math.max(rx, ry) * 1.1, [[0, rgb(shift(col, 50))], [0.5, rgb(col)], [1, rgb(shift(col, -55))]], x - rx * 0.35, y - ry * 0.4, Math.min(rx, ry) * 0.05);
  g.fill();
  g.strokeStyle = 'rgba(20,10,5,.8)';
  g.lineWidth = lw;
  g.stroke();
}

export function glow(g: G, x: number, y: number, r: number, col: RGB = [255, 190, 90], a = 0.5): void {
  softDot(g, x, y, r, col, a);
}

export function flame(g: G, x: number, y: number, s: number): void {
  glow(g, x, y, s * 3, [255, 170, 60], 0.45);
  g.beginPath();
  g.moveTo(x, y - s * 1.3);
  g.quadraticCurveTo(x + s * 0.95, y - s * 0.1, x, y + s * 0.8);
  g.quadraticCurveTo(x - s * 0.95, y - s * 0.1, x, y - s * 1.3);
  g.fillStyle = 'rgba(255,150,40,.95)';
  g.fill();
  g.beginPath();
  g.ellipse(x, y + s * 0.15, s * 0.42, s * 0.62, 0, 0, 7);
  g.fillStyle = 'rgba(255,238,150,.95)';
  g.fill();
}

export function candle(g: G, x: number, y: number, s: number, lit = true, col: RGB = [240, 230, 200]): void {
  dome(g, x, y, s, s, shift(col, 0), 0.9);
  g.fillStyle = 'rgba(30,20,10,.6)';
  g.beginPath();
  g.arc(x, y, s * 0.2, 0, 7);
  g.fill();
  if (lit) flame(g, x, y, s * 0.55);
}

export function steam(g: G, r: Rnd, x: number, y: number, rad: number, n = 5, a = 0.2): void {
  for (let i = 0; i < n; i++) softDot(g, x + (r() - 0.5) * rad, y + (r() - 0.5) * rad, rad * (0.5 + r() * 0.5), [240, 244, 250], a);
}

export function goblet(g: G, x: number, y: number, s: number, wine: RGB | null = [120, 24, 40], metal: RGB = [200, 170, 70]): void {
  dome(g, x, y, s, s, metal, 0.9);
  if (wine) {
    g.beginPath();
    g.arc(x, y, s * 0.72, 0, 7);
    g.fillStyle = radial(g, x, y, s * 0.72, [[0, rgb(shift(wine, 20))], [1, rgb(shift(wine, -40))]], x - s * 0.2, y - s * 0.2, 0.2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath();
    g.ellipse(x - s * 0.3, y - s * 0.32, s * 0.2, s * 0.1, -0.6, 0, 7);
    g.fill();
  } else {
    g.beginPath();
    g.arc(x, y, s * 0.7, 0, 7);
    g.fillStyle = 'rgba(20,10,5,.5)';
    g.fill();
  }
}

export function plate(g: G, x: number, y: number, s: number, col: RGB = [206, 202, 196]): void {
  ellBody(g, x, y, s, s, col, { lw: 1, ao: s * 0.12, rim: 0.8, light: 28, dark: 30 });
  g.beginPath();
  g.arc(x, y, s * 0.68, 0, 7);
  g.strokeStyle = 'rgba(0,0,0,.18)';
  g.lineWidth = 0.7;
  g.stroke();
}

export function loaf(g: G, r: Rnd, x: number, y: number, w: number, h: number, rot = 0, col: RGB = [196, 140, 74]): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  ellBody(g, 0, 0, w / 2, h / 2, col, { lw: 1.1, ao: Math.min(w, h) * 0.12, rim: 0.8, light: 30, dark: 40 });
  g.save();
  g.beginPath();
  g.ellipse(0, 0, w / 2 - 1, h / 2 - 1, 0, 0, 7);
  g.clip();
  g.strokeStyle = 'rgba(250,226,170,.7)';
  g.lineWidth = Math.max(1, h * 0.09);
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.moveTo(i * w * 0.2 - w * 0.06, -h * 0.34);
    g.lineTo(i * w * 0.2 + w * 0.06, h * 0.34);
    g.stroke();
  }
  mottle(g, r, [-w / 2, -h / 2, w / 2, h / 2], col, 6, Math.min(w, h) * 0.06, 20, 0.5);
  g.restore();
  g.restore();
}

export function cheeseWheel(g: G, x: number, y: number, rad: number, col: RGB = [226, 190, 90], cut = false): void {
  ellBody(g, x, y, rad, rad, col, { lw: 1.2, ao: rad * 0.1, rim: 0.9, light: 30, dark: 36 });
  g.save();
  g.beginPath();
  g.arc(x, y, rad - 1, 0, 7);
  g.clip();
  g.fillStyle = 'rgba(150,100,30,.28)';
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(x + Math.cos(i * 2.2) * rad * 0.45, y + Math.sin(i * 2.2) * rad * 0.45, rad * 0.09, 0, 7);
    g.fill();
  }
  if (cut) {
    g.fillStyle = 'rgba(30,20,6,.55)';
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, rad + 2, -0.5, 0.5);
    g.closePath();
    g.fill();
  }
  g.restore();
  g.beginPath();
  g.arc(x, y, rad * 0.9, 0, 7);
  g.strokeStyle = 'rgba(255,240,170,.28)';
  g.lineWidth = 0.8;
  g.stroke();
}

export function apple(g: G, x: number, y: number, s: number, col: RGB = [186, 36, 32]): void {
  dome(g, x, y, s, s * 0.95, col, Math.max(0.6, s * 0.12));
  g.strokeStyle = 'rgba(40,24,10,.9)';
  g.lineWidth = Math.max(0.6, s * 0.14);
  g.beginPath();
  g.moveTo(x, y - s * 0.1);
  g.lineTo(x + s * 0.12, y - s * 0.5);
  g.stroke();
}

export function bottle(g: G, x: number, y: number, len: number, rot: number, col: RGB, label = true): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const w = len * 0.26;
  const p = () => {
    g.beginPath();
    g.moveTo(-w / 2, -len * 0.18);
    g.lineTo(-w / 2, len * 0.45);
    g.quadraticCurveTo(0, len * 0.5, w / 2, len * 0.45);
    g.lineTo(w / 2, -len * 0.18);
    g.quadraticCurveTo(w * 0.22, -len * 0.26, w * 0.2, -len * 0.5);
    g.lineTo(-w * 0.2, -len * 0.5);
    g.quadraticCurveTo(-w * 0.22, -len * 0.26, -w / 2, -len * 0.18);
    g.closePath();
  };
  body(g, p, col, [-w / 2, -len / 2, w / 2, len / 2], { lw: 1, ao: 0.7, rim: 0.5 });
  if (label) {
    g.fillStyle = 'rgba(232,218,180,.85)';
    g.fillRect(-w / 2 + 0.5, len * 0.05, w - 1, len * 0.2);
  }
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.fillRect(-w * 0.32, len * 0.0, w * 0.1, len * 0.4);
  g.fillStyle = 'rgba(80,44,20,.95)';
  g.fillRect(-w * 0.2, -len * 0.5, w * 0.4, len * 0.07);
  g.restore();
}

export function jar(g: G, x: number, y: number, rad: number, col: RGB, lid: RGB = [120, 84, 50], content?: RGB): void {
  dome(g, x, y, rad, rad, col, 0.9);
  if (content) {
    g.beginPath();
    g.arc(x, y, rad * 0.74, 0, 7);
    g.fillStyle = rgb(content, 0.9);
    g.fill();
  }
  ellBody(g, x, y, rad * 0.62, rad * 0.62, lid, { lw: 0.8, ao: rad * 0.1, rim: 0.5 });
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.beginPath();
  g.ellipse(x - rad * 0.25, y - rad * 0.25, rad * 0.18, rad * 0.1, -0.7, 0, 7);
  g.fill();
}

export function bowl(g: G, x: number, y: number, rad: number, col: RGB, content?: RGB): void {
  ellBody(g, x, y, rad, rad, col, { lw: 1, ao: rad * 0.1, rim: 0.7 });
  g.beginPath();
  g.arc(x, y, rad * 0.78, 0, 7);
  g.fillStyle = content ? rgb(content) : rgb(shift(col, -36));
  g.fill();
  g.beginPath();
  g.arc(x, y, rad * 0.78, Math.PI * 0.9, Math.PI * 1.9);
  g.strokeStyle = 'rgba(0,0,0,.35)';
  g.lineWidth = rad * 0.1;
  g.stroke();
}

export function pot(g: G, r: Rnd, x: number, y: number, rad: number, col: RGB, o: { lid?: boolean; soup?: RGB; handles?: boolean } = {}): void {
  if (o.handles !== false) {
    for (const s of [-1, 1]) ellBody(g, x + s * rad * 1.05, y, rad * 0.22, rad * 0.16, shift(col, -20), { lw: 1, ao: 0.4, rim: 0.3 });
  }
  dome(g, x, y, rad, rad, col, Math.max(1, rad * 0.1));
  if (o.lid) {
    ellBody(g, x, y, rad * 0.82, rad * 0.82, shift(col, 6), { lw: 0.9, ao: rad * 0.1, rim: 0.7 });
    ellBody(g, x, y, rad * 0.16, rad * 0.16, shift(col, -20), { lw: 0.8, ao: 0.2 });
  } else {
    g.beginPath();
    g.arc(x, y, rad * 0.82, 0, 7);
    g.fillStyle = 'rgba(14,8,4,.8)';
    g.fill();
    if (o.soup) {
      g.beginPath();
      g.arc(x, y, rad * 0.74, 0, 7);
      g.fillStyle = radial(g, x, y, rad * 0.74, [[0, rgb(shift(o.soup, 22))], [1, rgb(shift(o.soup, -34))]], x - rad * 0.2, y - rad * 0.2, 0.3);
      g.fill();
      mottle(g, r, [x - rad * 0.5, y - rad * 0.5, x + rad * 0.5, y + rad * 0.5], shift(o.soup, 20), 8, rad * 0.08, 22, 0.7);
    }
  }
}

export function pan(g: G, x: number, y: number, rad: number, rot: number, col: RGB = [64, 60, 60]): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  tube(g, () => {
    g.beginPath();
    g.moveTo(0, rad * 0.8);
    g.lineTo(0, rad * 2.4);
  }, rad * 0.22, shift(col, 14), { outline: 1.2 });
  ellBody(g, 0, 0, rad, rad, col, { lw: 1.1, ao: rad * 0.1, rim: 0.6 });
  g.beginPath();
  g.arc(0, 0, rad * 0.78, 0, 7);
  g.fillStyle = 'rgba(0,0,0,.45)';
  g.fill();
  g.restore();
}

export function book(g: G, r: Rnd, x: number, y: number, w: number, h: number, rot: number, col: RGB): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  // sidekant (blade)
  g.fillStyle = 'rgba(20,10,5,.55)';
  g.fillRect(-w / 2 + 1.2, -h / 2 + 1.2, w, h);
  rectBody(g, -w / 2, -h / 2, w, h, 1.2, col, { lw: 1.1, ao: 0.8, rim: 0.6 });
  g.fillStyle = rgb(shift(col, -32), 0.85);
  g.fillRect(-w / 2, -h / 2, w * 0.14, h);
  g.strokeStyle = rgb(BRASS, 0.9);
  g.lineWidth = Math.max(0.6, w * 0.03);
  g.strokeRect(-w * 0.32, -h * 0.36, w * 0.6, h * 0.72);
  g.beginPath();
  g.arc(w * 0.0 + w * 0.0, 0, Math.min(w, h) * 0.12, 0, 7);
  g.stroke();
  void r;
  g.restore();
}

export function openBook(g: G, r: Rnd, x: number, y: number, w: number, h: number, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  rectBody(g, -w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, 1.5, [96, 56, 34], { lw: 1.1, ao: 0.8, rim: 0.4 });
  for (const s of [-1, 1]) {
    rectBody(g, s > 0 ? 0.4 : -w / 2 + 0.5, -h / 2 + 0.5, w / 2 - 1, h - 1, 0.8, PARCHMENT, { lw: 0.7, ao: 0.9, rim: 0.2 });
    g.strokeStyle = 'rgba(60,40,24,.5)';
    g.lineWidth = 0.6;
    const rows = Math.max(3, Math.floor(h / 3.4));
    for (let i = 0; i < rows; i++) {
      const yy = -h / 2 + 3 + (i * (h - 6)) / rows;
      g.beginPath();
      g.moveTo(s * (w * 0.06), yy);
      g.lineTo(s * (w * 0.06) + s * (w * 0.4 - (r() < 0.2 ? 5 : 0)), yy);
      g.stroke();
    }
  }
  g.strokeStyle = 'rgba(30,16,8,.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, -h / 2);
  g.lineTo(0, h / 2);
  g.stroke();
  g.restore();
}

export function scroll(g: G, r: Rnd, x: number, y: number, len: number, wd: number, rot: number, open = false): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  if (open) {
    rectBody(g, -len / 2, -wd / 2, len, wd, 1, PARCHMENT, { lw: 0.9, ao: 1, rim: 0.4 });
    g.strokeStyle = 'rgba(60,40,24,.55)';
    g.lineWidth = 0.6;
    for (let i = 0; i < Math.floor(wd / 3); i++) {
      g.beginPath();
      g.moveTo(-len * 0.42, -wd / 2 + 3 + i * 3);
      g.lineTo(len * (0.1 + r() * 0.3), -wd / 2 + 3 + i * 3);
      g.stroke();
    }
    ellBody(g, -len / 2, 0, wd * 0.14, wd / 2 + 1, [196, 176, 130], { lw: 0.9, ao: 0.3 });
  } else {
    ellBody(g, 0, 0, len / 2, wd * 0.3, PARCHMENT, { lw: 1, ao: 0.6, rim: 0.4 });
    g.fillStyle = rgb(CLOTH_RED, 0.9);
    g.fillRect(-len * 0.08, -wd * 0.3, len * 0.1, wd * 0.6);
  }
  g.restore();
}

export function inkwell(g: G, x: number, y: number, s: number, withQuill = true): void {
  if (withQuill) {
    g.save();
    g.translate(x, y);
    g.rotate(-0.9);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(s * 1.8, -s * 0.9, s * 4.6, -s * 0.1);
    g.quadraticCurveTo(s * 2.2, s * 0.9, 0, 0);
    g.fillStyle = 'rgba(236,230,214,.96)';
    g.fill();
    g.strokeStyle = 'rgba(30,20,10,.8)';
    g.lineWidth = 0.8;
    g.stroke();
    g.restore();
  }
  dome(g, x, y, s, s, [34, 30, 40], 0.9);
  g.fillStyle = 'rgba(8,6,14,.95)';
  g.beginPath();
  g.arc(x, y, s * 0.55, 0, 7);
  g.fill();
}

/** Planke af træ med årer (ikke hele bordet; bruges til hylder, brædder, kasser). */
export function board(g: G, r: Rnd, x: number, y: number, w: number, h: number, base: RGB, vertical = false): void {
  const path = rectPath(g, x, y, w, h, 1.5);
  g.save();
  path();
  g.clip();
  g.fillStyle = lin(g, x, y, vertical ? x + w : x, vertical ? y : y + h, [[0, rgb(shift(base, 16))], [0.55, rgb(base)], [1, rgb(shift(base, -22))]]);
  g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(30,14,4,.2)';
  g.lineWidth = 0.7;
  const n = Math.max(3, Math.round((vertical ? w : h) / 3));
  for (let i = 0; i < n; i++) {
    const t = (i + r()) / n;
    g.beginPath();
    if (vertical) {
      g.moveTo(x + t * w, y);
      g.lineTo(x + t * w + (r() - 0.5) * 2, y + h);
    } else {
      g.moveTo(x, y + t * h);
      g.lineTo(x + w, y + t * h + (r() - 0.5) * 2);
    }
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,236,190,.34)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x + 1, y + h - 1);
  g.lineTo(x + 1, y + 1);
  g.lineTo(x + w - 1, y + 1);
  g.stroke();
  g.restore();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.stroke();
}

export function lampPoly(g: G, pts: [number, number][], col: RGB): void {
  polyBody(g, pts, col, { lw: 1 });
}

/** Tykt stof med folder (tæppe, dyne, telt): fyldt sti med bløde skyggestriber. */
export function foldCloth(g: G, r: Rnd, x: number, y: number, w: number, h: number, col: RGB, folds = 4, vertical = false): void {
  const path = rectPath(g, x, y, w, h, Math.min(w, h) * 0.1);
  body(g, path, col, [x, y, x + w, y + h], { lw: 1.3, ao: Math.min(w, h) * 0.07 });
  g.save();
  path();
  g.clip();
  for (let i = 0; i < folds; i++) {
    const t = (i + 0.5 + (r() - 0.5) * 0.4) / folds;
    g.beginPath();
    if (vertical) {
      g.moveTo(x + w * t, y);
      g.bezierCurveTo(x + w * t + w * 0.06, y + h * 0.33, x + w * t - w * 0.06, y + h * 0.66, x + w * t, y + h);
    } else {
      g.moveTo(x, y + h * t);
      g.bezierCurveTo(x + w * 0.33, y + h * t + h * 0.06, x + w * 0.66, y + h * t - h * 0.06, x + w, y + h * t);
    }
    g.strokeStyle = rgb(shift(col, -40), 0.35);
    g.lineWidth = Math.min(w, h) * 0.05 + 1;
    g.stroke();
    g.strokeStyle = rgb(shift(col, 36), 0.28);
    g.lineWidth = Math.min(w, h) * 0.025 + 0.6;
    g.translate(-0.8, -0.8);
    g.stroke();
    g.translate(0.8, 0.8);
  }
  g.restore();
}
