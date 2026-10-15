import { blobPath, body, ellBody, mottle, OUT, polyBody, rectBody, rgb, shift, tube, wobble, type G, type RGB, type Rnd } from '../pack2/helpers';
import { breastplate, STEEL } from './arms';

/** Tegner et menneskeligt væsen set oppefra, liggende. Fælles for lig-genstandene (mennesker, orker, dværge, alfer). */

export interface PersonCfg {
  skin: RGB;
  hair: RGB;
  cloth: RGB;
  pants: RGB;
  boots: RGB;
  /** Bredde (1 = menneske). */
  build?: number;
  /** 'supine' på ryggen, 'prone' på maven, 'sprawl' spredt. */
  pose?: 'supine' | 'prone' | 'sprawl' | 'side';
  armor?: boolean;
  helmet?: boolean;
  beard?: RGB | null;
  orc?: boolean;
  elf?: boolean;
  bald?: boolean;
  blood?: number;
  /** Er benene nøgne (loincloth)? */
  bareLegs?: boolean;
  /** Spidserne på arme og ben bortskåret (til halve lig). */
  half?: boolean;
}

const dark = (c: RGB, d = 40): RGB => [c[0] - d, c[1] - d, c[2] - d];

export function bloodPool(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number): void {
  const pts = wobble(r, cx, cy, rx, ry, 11, 0.32);
  g.fillStyle = 'rgba(96,10,10,.72)';
  blobPath(g, pts)();
  g.fill();
  g.fillStyle = 'rgba(150,28,22,.4)';
  const p2 = wobble(r, cx - rx * 0.12, cy - ry * 0.12, rx * 0.6, ry * 0.6, 9, 0.3);
  blobPath(g, p2)();
  g.fill();
  g.fillStyle = 'rgba(255,200,190,.16)';
  g.beginPath();
  g.ellipse(cx - rx * 0.3, cy - ry * 0.3, rx * 0.18, ry * 0.1, -0.5, 0, 7);
  g.fill();
  for (let i = 0; i < 6; i++) {
    const a = r() * 6.283;
    g.fillStyle = 'rgba(100,10,10,.65)';
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * rx * (1.05 + r() * 0.3), cy + Math.sin(a) * ry * (1.05 + r() * 0.3), 1 + r() * 2.4, 1 + r() * 1.6, r() * 3, 0, 7);
    g.fill();
  }
}

function hand(g: G, x: number, y: number, rad: number, skin: RGB): void {
  ellBody(g, x, y, rad, rad * 0.9, skin, { lw: 1, ao: 0.6, rim: 0.5 });
}

function boot(g: G, x: number, y: number, rad: number, col: RGB, ang: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  ellBody(g, 0, rad * 0.3, rad * 0.85, rad * 1.5, col, { lw: 1.2 });
  g.fillStyle = 'rgba(0,0,0,.3)';
  g.beginPath();
  g.ellipse(0, rad * 1.1, rad * 0.8, rad * 0.45, 0, 0, 7);
  g.fill();
  g.restore();
}

export function person(g: G, r: Rnd, cx: number, cy: number, L: number, rot: number, c: PersonCfg): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  const b = c.build ?? 1;
  const pose = c.pose ?? 'supine';
  const top = -L / 2;
  const sY = top + L * 0.17; // skuldre
  const hipY = top + L * 0.52;
  const sw = L * 0.125 * b;
  const limbW = L * 0.062 * b;
  const spread = pose === 'sprawl' ? 0.6 + r() * 0.5 : 0.15 + r() * 0.35;
  const headX = (r() - 0.5) * L * 0.05;
  const bl = c.blood ?? 0;
  const bareLegs = !!c.bareLegs;
  // blodpøl under
  if (bl > 0) bloodPool(g, r, (r() - 0.5) * L * 0.1, -L * 0.06 + (r() - 0.5) * L * 0.1, Math.min(L * 0.3, L * (0.1 + bl * 0.07) * b), Math.min(L * 0.36, L * (0.16 + bl * 0.07)));
  // ben
  const legs: [number, number][][] = [];
  if (!c.half) {
    for (const s of [-1, 1]) {
      const hip: [number, number] = [s * L * 0.055 * b, hipY];
      const sp = spread * (s > 0 ? 1 + (r() - 0.5) * 0.5 : 1);
      const knee: [number, number] = [s * (L * 0.07 + sp * L * 0.07) * b, hipY + L * 0.22];
      const foot: [number, number] = [s * (L * 0.09 + sp * L * 0.2), top + L * (pose === 'sprawl' ? 0.94 - r() * 0.08 : 0.98)];
      legs.push([hip, knee, foot]);
      const trace1 = () => {
        g.beginPath();
        g.moveTo(hip[0], hip[1]);
        g.lineTo(knee[0], knee[1]);
        g.lineTo(foot[0], foot[1] - L * 0.04);
      };
      tube(g, trace1, limbW * 1.1, bareLegs ? c.skin : c.pants, { outline: 1.8 });
      boot(g, foot[0], foot[1] - L * 0.035, L * 0.04 * b + 1, bareLegs ? shift(c.skin, -20) : c.boots, Math.atan2(foot[0] - knee[0], knee[1] - foot[1]) * -0.5 + (s * 0.1));
    }
  }
  // arme
  const armPts: [number, number][] = [];
  const ang0 = pose === 'sprawl' ? 0.9 + r() * 0.9 : 0.12 + r() * 0.5;
  for (const s of [-1, 1]) {
    const sh: [number, number] = [s * sw, sY + L * 0.02];
    const a1 = s * (ang0 + (r() - 0.5) * 0.5);
    const el: [number, number] = [sh[0] + Math.sin(a1) * L * 0.17, sh[1] + Math.cos(a1) * L * 0.17];
    const a2 = a1 + s * (r() - 0.3) * 1.3 * (pose === 'prone' ? 1.4 : 1);
    const ha: [number, number] = c.half && r() < 0.5 ? [el[0], el[1]] : [el[0] + Math.sin(a2) * L * 0.16, el[1] + Math.cos(a2) * L * 0.16];
    armPts.push(ha);
    tube(g, () => {
      g.beginPath();
      g.moveTo(sh[0], sh[1]);
      g.lineTo(el[0], el[1]);
      g.lineTo(ha[0], ha[1]);
    }, limbW, c.armor ? STEEL : c.cloth, { outline: 1.7 });
    hand(g, ha[0] + Math.sin(a2) * limbW * 0.5, ha[1] + Math.cos(a2) * limbW * 0.5, limbW * 0.55, c.skin);
  }
  // overkrop
  const tw = sw * 1.05;
  const torso = () => {
    g.beginPath();
    g.moveTo(-sw, sY);
    g.quadraticCurveTo(0, sY - L * 0.03, sw, sY);
    g.quadraticCurveTo(sw * 1.05, sY + L * 0.06, tw * 0.82, hipY - L * 0.1);
    g.quadraticCurveTo(tw * 0.9, hipY, sw * 0.85, hipY + L * 0.04);
    g.lineTo(-sw * 0.85, hipY + L * 0.04);
    g.quadraticCurveTo(-tw * 0.9, hipY, -tw * 0.82, hipY - L * 0.1);
    g.quadraticCurveTo(-sw * 1.05, sY + L * 0.06, -sw, sY);
    g.closePath();
  };
  if (c.armor) {
    // skulderplader
    body(g, torso, [150, 154, 164], [-sw, sY, sw, hipY], { lw: 1.5 });
    g.save();
    torso();
    g.clip();
    g.strokeStyle = 'rgba(30,34,44,.4)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, sY);
    g.lineTo(0, hipY);
    g.stroke();
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(-sw, sY + L * (0.1 + i * 0.06));
      g.quadraticCurveTo(0, sY + L * (0.13 + i * 0.06), sw, sY + L * (0.1 + i * 0.06));
      g.stroke();
    }
    g.restore();
    for (const s of [-1, 1]) ellBody(g, s * sw * 1.02, sY + L * 0.02, L * 0.065 * b, L * 0.05, [160, 164, 176], { lw: 1.4 });
    void breastplate;
  } else if (c.orc || bareLegs) {
    body(g, torso, c.skin, [-sw, sY, sw, hipY], { lw: 1.5 });
    // læderseler
    g.save();
    torso();
    g.clip();
    g.strokeStyle = rgb(c.cloth);
    g.lineWidth = L * 0.03;
    g.beginPath();
    g.moveTo(-sw, sY);
    g.lineTo(sw * 0.8, hipY);
    g.moveTo(sw, sY);
    g.lineTo(-sw * 0.8, hipY);
    g.stroke();
    mottle(g, r, [-sw, sY, sw, hipY], c.skin, 12, L * 0.02, 14, 0.4);
    g.restore();
  } else {
    body(g, torso, c.cloth, [-sw, sY, sw, hipY], { lw: 1.5 });
    g.save();
    torso();
    g.clip();
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = 'rgba(0,0,0,.2)';
      g.lineWidth = 1;
      g.beginPath();
      const y = sY + r() * (hipY - sY);
      g.moveTo(-sw, y);
      g.quadraticCurveTo(0, y + (r() - 0.5) * 6, sw, y + (r() - 0.5) * 4);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.1)';
      g.beginPath();
      g.moveTo(-sw, y + 1);
      g.quadraticCurveTo(0, y + 1 + (r() - 0.5) * 6, sw, y + 1 + (r() - 0.5) * 4);
      g.stroke();
    }
    mottle(g, r, [-sw, sY, sw, hipY], c.cloth, 10, 3, 14, 0.4);
    g.restore();
    // snøre i halsudskæring
    g.strokeStyle = rgb(dark(c.cloth, 50));
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, sY + 1);
    g.lineTo(0, sY + L * 0.08);
    g.stroke();
  }
  // bælte
  if (!c.half) {
    rectBody(g, -sw * 0.88, hipY - L * 0.02, sw * 1.76, L * 0.035, 1, [86, 54, 30], { lw: 1 });
    rectBody(g, -L * 0.014, hipY - L * 0.018, L * 0.028, L * 0.03, 0.6, [196, 160, 70], { lw: 0.8 });
  }
  // blod på overkroppen
  if (bl > 0) {
    for (let i = 0; i < 4 + bl * 7; i++) {
      g.fillStyle = `rgba(${95 + r() * 40},8,8,${0.45 + r() * 0.4})`;
      g.beginPath();
      g.ellipse((r() - 0.5) * sw * 1.6, sY + r() * (hipY - sY), 1 + r() * 3 * bl, 1 + r() * 2 * bl, r() * 3, 0, 7);
      g.fill();
    }
  }
  // skæg (dværg)
  if (c.beard) {
    const bp = [[-L * 0.06 * b, sY - L * 0.06], [L * 0.06 * b, sY - L * 0.06], [L * 0.08 * b, sY + L * 0.04], [L * 0.04 * b, sY + L * 0.16], [0, sY + L * 0.2], [-L * 0.04 * b, sY + L * 0.16], [-L * 0.08 * b, sY + L * 0.04]] as [number, number][];
    polyBody(g, bp.map(([x, y]) => [x + headX, y] as [number, number]), c.beard, { lw: 1.2, ao: 1, rim: 0.8 });
    g.strokeStyle = rgb(dark(c.beard, 50), 0.6);
    g.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(headX + i * L * 0.014, sY - L * 0.02);
      g.lineTo(headX + i * L * 0.02, sY + L * 0.14);
      g.stroke();
    }
  }
  // hoved
  const hr = L * 0.066 * (c.orc ? 1.1 : 1) * Math.sqrt(b);
  const hy = top + L * 0.075;
  if (c.elf) {
    for (const s of [-1, 1]) polyBody(g, [[headX + s * hr * 0.9, hy - hr * 0.1], [headX + s * hr * 2.0, hy - hr * 0.4], [headX + s * hr * 1.0, hy + hr * 0.4]], c.skin, { lw: 1, ao: 0.4, rim: 0.4 });
  }
  if (c.helmet) {
    ellBody(g, headX, hy, hr * 1.1, hr * 1.18, STEEL, { lw: 1.4 });
    g.fillStyle = 'rgba(30,34,44,.45)';
    g.fillRect(headX - hr * 0.1, hy - hr * 1.18, hr * 0.2, hr * 2.4);
  } else {
    ellBody(g, headX, hy, hr, hr * 1.08, c.skin, { lw: 1.3 });
    if (!c.bald) {
      // hår: kalot over ansigtet mod toppen eller helt (ligger på maven)
      g.save();
      g.beginPath();
      g.ellipse(headX, hy, hr, hr * 1.08, 0, 0, 7);
      g.clip();
      g.fillStyle = rgb(c.hair);
      g.beginPath();
      g.ellipse(headX, hy + (pose === 'prone' ? 0 : -hr * 0.55), hr * 1.05, pose === 'prone' ? hr * 1.1 : hr * 0.78, 0, 0, 7);
      g.fill();
      g.strokeStyle = rgb(shift(c.hair, 26), 0.6);
      g.lineWidth = 0.7;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(headX + (i - 2.5) * hr * 0.3, hy - hr * 1.05);
        g.quadraticCurveTo(headX + (i - 2.5) * hr * 0.4, hy - hr * 0.5, headX + (i - 2.5) * hr * 0.32, hy + (pose === 'prone' ? hr * 0.8 : -hr * 0.1));
        g.stroke();
      }
      g.restore();
    }
    if (pose !== 'prone') {
      // lukkede/livløse øjne, næse og mund
      g.fillStyle = 'rgba(20,10,6,.85)';
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(headX + s * hr * 0.38, hy + hr * 0.02, hr * 0.17, hr * 0.07, 0, 0, 7);
        g.fill();
      }
      g.strokeStyle = 'rgba(70,30,20,.6)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(headX, hy + hr * 0.1);
      g.lineTo(headX + hr * 0.08, hy + hr * 0.45);
      g.stroke();
      g.beginPath();
      g.moveTo(headX - hr * 0.28, hy + hr * 0.72);
      g.lineTo(headX + hr * 0.28, hy + hr * 0.72);
      g.stroke();
      if (c.orc) {
        for (const s of [-1, 1]) polyBody(g, [[headX + s * hr * 0.38, hy + hr * 0.7], [headX + s * hr * 0.5, hy + hr * 0.3], [headX + s * hr * 0.26, hy + hr * 0.5]], [238, 232, 210], { lw: 0.6, ao: 0.2, rim: 0.2 });
      }
    }
  }
  void armPts;
  void legs;
  g.restore();
}

export const SKIN_HUMAN: RGB[] = [[226, 182, 146], [200, 150, 110], [150, 104, 70], [236, 196, 164]];
export const SKIN_ORC: RGB[] = [[110, 144, 78], [96, 130, 96], [128, 140, 84]];
export const SKIN_ELF: RGB[] = [[238, 214, 190], [222, 200, 176]];
export const SKIN_DWARF: RGB[] = [[214, 160, 120], [196, 140, 100]];
export const CLOTH: RGB[] = [[96, 70, 46], [60, 84, 110], [110, 50, 50], [70, 96, 64], [120, 100, 64], [84, 70, 100]];
export const HAIR: RGB[] = [[40, 28, 20], [96, 64, 34], [190, 150, 70], [150, 150, 150], [20, 16, 14], [150, 60, 30]];
export { OUT };
