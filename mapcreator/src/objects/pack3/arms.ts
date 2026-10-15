import { blobPath, body, ellBody, OUT, polyBody, polyPath, radial, rgb, shift, tube, lin, rivet, mottle, type G, type RGB, type Rnd } from '../pack2/helpers';

/** Våben og rustning til tegning (set ovenfra eller forfra). Alle tegnes med skaftets/fæstets start i (x, y) og peger langs vinklen `ang`. */

export const STEEL: RGB = [168, 174, 184];
export const IRON: RGB = [104, 106, 112];
export const BRONZE: RGB = [176, 128, 62];
export const LEATHER: RGB = [112, 70, 38];
export const WOOD: RGB = [128, 86, 48];

function at(g: G, x: number, y: number, ang: number, fn: () => void): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  fn();
  g.restore();
}

/** Sværd (hilt ved origo, klinge langs +x). */
export function sword(g: G, x: number, y: number, ang: number, len: number, o: { blade?: RGB; wide?: number; curved?: number; guard?: RGB; grip?: RGB } = {}): void {
  const bc = o.blade ?? STEEL;
  const w = (o.wide ?? 1) * len * 0.045;
  const curve = (o.curved ?? 0) * len;
  at(g, x, y, ang, () => {
    const hilt = len * 0.2;
    // klinge
    const tip = len;
    const trace = () => {
      g.beginPath();
      g.moveTo(hilt, -w);
      g.quadraticCurveTo(hilt + (tip - hilt) * 0.5, -w + curve * 0.5, tip - w * 2.2, curve - w * 0.4);
      g.lineTo(tip, curve);
      g.quadraticCurveTo(hilt + (tip - hilt) * 0.5, w + curve * 0.5, hilt, w);
      g.closePath();
    };
    trace();
    g.fillStyle = lin(g, 0, -w, 0, w, [[0, rgb(shift(bc, 46))], [0.5, rgb(bc)], [1, rgb(shift(bc, -48))]]);
    g.fill();
    // kanten (blodrille)
    g.beginPath();
    g.moveTo(hilt + len * 0.04, curve * 0.1);
    g.quadraticCurveTo(hilt + (tip - hilt) * 0.5, curve * 0.5, tip - len * 0.14, curve * 0.9);
    g.strokeStyle = 'rgba(40,44,52,.55)';
    g.lineWidth = Math.max(0.6, w * 0.36);
    g.stroke();
    g.beginPath();
    g.moveTo(hilt + len * 0.04, -w * 0.45 + curve * 0.05);
    g.quadraticCurveTo(hilt + (tip - hilt) * 0.5, -w * 0.45 + curve * 0.5, tip - len * 0.1, curve * 0.9 - w * 0.2);
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = Math.max(0.5, w * 0.22);
    g.stroke();
    trace();
    g.strokeStyle = OUT;
    g.lineWidth = 1.1;
    g.lineJoin = 'round';
    g.stroke();
    // fæste
    g.beginPath();
    g.moveTo(len * 0.02, 0);
    g.lineTo(hilt, 0);
    tubeLine(g, 0, hilt - 1, w * 1.1, o.grip ?? LEATHER);
    // parerstang
    const gc = o.guard ?? BRONZE;
    const gx = hilt - w * 0.4;
    polyBody(g, [[gx - w * 0.8, -w * 3.4], [gx + w * 0.9, -w * 3.0], [gx + w * 0.9, w * 3.0], [gx - w * 0.8, w * 3.4]], gc, { lw: 1, ao: 0.8, rim: 0.6 });
    // knop
    ellBody(g, -w * 0.1, 0, w * 1.5, w * 1.5, gc, { lw: 1, ao: 0.8, rim: 0.6 });
  });
}

function tubeLine(g: G, x0: number, x1: number, wd: number, col: RGB): void {
  tube(g, () => {
    g.beginPath();
    g.moveTo(x0, 0);
    g.lineTo(x1, 0);
  }, wd, col, { outline: 1.4, round: false });
}

/** Økse: skaft langs +x, hoved nær enden. */
export function axe(g: G, x: number, y: number, ang: number, len: number, o: { head?: RGB; double?: boolean; haft?: RGB; big?: number } = {}): void {
  const hc = o.head ?? IRON;
  const hw = len * 0.045 * (o.big ?? 1);
  at(g, x, y, ang, () => {
    tubeLine(g, 0, len, hw * 1.2, o.haft ?? WOOD);
    const hx = len * 0.82;
    const bladeR = len * 0.2 * (o.big ?? 1);
    const sides = o.double ? [-1, 1] : [-1];
    for (const s of sides) {
      polyBody(g, [[hx - hw * 1.2, 0], [hx - bladeR * 0.15, s * bladeR * 0.5], [hx - bladeR * 0.35, s * bladeR * 1.0], [hx + bladeR * 0.45, s * bladeR * 0.88], [hx + bladeR * 0.15, s * bladeR * 0.25], [hx + hw * 1.2, 0]], hc, { lw: 1.1, ao: 1, rim: 0.8 });
      g.beginPath();
      g.moveTo(hx - bladeR * 0.35, s * bladeR);
      g.lineTo(hx + bladeR * 0.45, s * bladeR * 0.88);
      g.strokeStyle = 'rgba(255,255,255,.75)';
      g.lineWidth = 1;
      g.stroke();
    }
    if (!o.double) polyBody(g, [[hx - hw * 1.3, -hw * 0.2], [hx + hw * 1.6, -hw * 0.2], [hx + hw * 1.6, hw * 1.7], [hx - hw * 1.3, hw * 1.7]], hc, { lw: 1, ao: 0.6, rim: 0.5 });
    // metalbeslag
    rivet(g, hx, 0, hw * 0.7, hc);
  });
}

/** Stridshammer/stridskølle. */
export function mace(g: G, x: number, y: number, ang: number, len: number, head: RGB = IRON): void {
  at(g, x, y, ang, () => {
    tubeLine(g, 0, len, len * 0.05, WOOD);
    const hx = len * 0.86;
    const R = len * 0.12;
    ellBody(g, hx, 0, R, R, head, { lw: 1.2 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283;
      const px = hx + Math.cos(a) * R * 0.95;
      const py = Math.sin(a) * R * 0.95;
      polyBody(g, [[px + Math.cos(a) * R * 0.45, py + Math.sin(a) * R * 0.45], [px + Math.cos(a + 1.9) * R * 0.22, py + Math.sin(a + 1.9) * R * 0.22], [px + Math.cos(a - 1.9) * R * 0.22, py + Math.sin(a - 1.9) * R * 0.22]], head, { lw: 0.8, ao: 0.4, rim: 0.4 });
    }
    ellBody(g, hx, 0, R * 0.55, R * 0.55, shift(head, 14), { lw: 0.8, ao: 0.5, rim: 0.5 });
  });
}

/** Spyd/glaive: skaft og spids. */
export function spear(g: G, x: number, y: number, ang: number, len: number, head: RGB = STEEL): void {
  at(g, x, y, ang, () => {
    tubeLine(g, 0, len * 0.9, len * 0.022, WOOD);
    const hl = len * 0.18;
    const hw = len * 0.04;
    polyBody(g, [[len - hl, 0], [len - hl * 0.55, -hw], [len, 0], [len - hl * 0.55, hw]], head, { lw: 1, ao: 0.6, rim: 0.5 });
    g.beginPath();
    g.moveTo(len - hl * 0.95, 0);
    g.lineTo(len - hl * 0.15, 0);
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = 0.7;
    g.stroke();
    polyBody(g, [[len * 0.82, -hw * 0.35], [len - hl, -hw * 0.35], [len - hl, hw * 0.35], [len * 0.82, hw * 0.35]], shift(head, -30), { lw: 0.7, ao: 0.3, rim: 0.3 });
  });
}

/** Bue (spændt med snor eller slap). */
export function bow(g: G, x: number, y: number, ang: number, len: number, wood: RGB = [136, 92, 50]): void {
  at(g, x, y, ang, () => {
    const trace = () => {
      g.beginPath();
      g.moveTo(0, -len / 2);
      g.quadraticCurveTo(len * 0.4, -len * 0.1, len * 0.18, 0);
      g.quadraticCurveTo(len * 0.4, len * 0.1, 0, len / 2);
    };
    // snor
    g.beginPath();
    g.moveTo(0, -len / 2);
    g.lineTo(0, len / 2);
    g.strokeStyle = 'rgba(230,220,190,.85)';
    g.lineWidth = 0.9;
    g.stroke();
    tube(g, trace, len * 0.045, wood, { outline: 1.6 });
    // grebets læderbinding
    g.beginPath();
    g.rect(len * 0.12, -len * 0.05, len * 0.07, len * 0.1);
    g.fillStyle = rgb(LEATHER);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 0.9;
    g.stroke();
  });
}

/** Rundt skjold forfra: bule, kant og mønster. */
export function roundShield(g: G, r: Rnd, cx: number, cy: number, rad: number, col: RGB, o: { pattern?: number; rim?: RGB; plain?: boolean } = {}): void {
  const rim = o.rim ?? IRON;
  ellBody(g, cx, cy, rad, rad, shift(WOOD, -4), { lw: 1.6 });
  g.save();
  g.beginPath();
  g.arc(cx, cy, rad - 1, 0, 7);
  g.clip();
  const pat = o.pattern ?? 0;
  if (pat === 0) {
    // kvarte felter
    for (let i = 0; i < 4; i += 1) {
      if (i % 2) continue;
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, rad, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
      g.fillStyle = rgb(col);
      g.fill();
    }
    g.fillStyle = rgb(shift(col, 90), 0.55);
    for (let i = 1; i < 4; i += 2) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, rad, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
      g.fill();
    }
  } else if (pat === 1) {
    g.fillStyle = rgb(col);
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    g.fillStyle = rgb(shift(col, 100), 0.85);
    g.fillRect(cx - rad * 0.14, cy - rad, rad * 0.28, rad * 2);
    g.fillRect(cx - rad, cy - rad * 0.14, rad * 2, rad * 0.28);
  } else if (pat === 2) {
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, rad, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3);
      g.fillStyle = i % 2 ? rgb(shift(col, 90), 0.9) : rgb(col);
      g.fill();
    }
  } else {
    g.fillStyle = rgb(col);
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    g.beginPath();
    g.moveTo(cx - rad, cy - rad * 0.2);
    g.lineTo(cx, cy + rad * 0.4);
    g.lineTo(cx + rad, cy - rad * 0.2);
    g.lineTo(cx + rad, cy + rad * 0.15);
    g.lineTo(cx, cy + rad * 0.75);
    g.lineTo(cx - rad, cy + rad * 0.15);
    g.fillStyle = rgb(shift(col, 100), 0.8);
    g.fill();
  }
  // slid
  mottle(g, r, [cx - rad, cy - rad, cx + rad, cy + rad], [60, 40, 20], 14, rad * 0.12, 30, 0.22);
  g.restore();
  // glans
  const gr = radial(g, cx, cy, rad, [[0, 'rgba(255,255,255,0)'], [0.7, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.28)']], cx - rad * 0.25, cy - rad * 0.25, 0);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(cx, cy, rad, 0, 7);
  g.fill();
  // metalkant
  g.beginPath();
  g.arc(cx, cy, rad - rad * 0.045, 0, 7);
  g.strokeStyle = rgb(rim);
  g.lineWidth = rad * 0.09;
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, rad - rad * 0.09, Math.PI * 0.9, Math.PI * 1.7);
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.lineWidth = rad * 0.03;
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.283;
    rivet(g, cx + Math.cos(a) * rad * 0.8, cy + Math.sin(a) * rad * 0.8, Math.max(0.8, rad * 0.035), rim);
  }
  // bule
  ellBody(g, cx, cy, rad * 0.24, rad * 0.24, rim, { lw: 1.2 });
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.beginPath();
  g.ellipse(cx - rad * 0.08, cy - rad * 0.09, rad * 0.07, rad * 0.04, -0.7, 0, 7);
  g.fill();
}

/** Heater-skjold (spids forneden), forfra. */
export function heaterShield(g: G, r: Rnd, cx: number, cy: number, wd: number, ht: number, col: RGB, o: { charge?: number; rim?: RGB } = {}): void {
  const rim = o.rim ?? IRON;
  const pts: [number, number][] = [[-wd, -ht * 0.5], [0, -ht * 0.56], [wd, -ht * 0.5], [wd * 1.02, ht * 0.05], [wd * 0.6, ht * 0.32], [0, ht * 0.56], [-wd * 0.6, ht * 0.32], [-wd * 1.02, ht * 0.05]];
  const path = () => {
    g.beginPath();
    g.moveTo(cx - wd, cy - ht * 0.5);
    g.quadraticCurveTo(cx, cy - ht * 0.62, cx + wd, cy - ht * 0.5);
    g.lineTo(cx + wd, cy + ht * 0.04);
    g.quadraticCurveTo(cx + wd * 0.9, cy + ht * 0.35, cx, cy + ht * 0.56);
    g.quadraticCurveTo(cx - wd * 0.9, cy + ht * 0.35, cx - wd, cy + ht * 0.04);
    g.closePath();
  };
  void pts;
  body(g, path, shift(WOOD, 0), [cx - wd, cy - ht * 0.5, cx + wd, cy + ht * 0.56], { lw: 1.6 });
  g.save();
  path();
  g.clip();
  g.fillStyle = rgb(col);
  g.fillRect(cx - wd, cy - ht, wd * 2, ht * 2);
  const ch = o.charge ?? 0;
  g.fillStyle = rgb(shift(col, 100), 0.85);
  if (ch === 0) {
    g.fillRect(cx - wd * 0.22, cy - ht, wd * 0.44, ht * 2);
  } else if (ch === 1) {
    g.beginPath();
    g.moveTo(cx - wd, cy - ht * 0.25);
    g.lineTo(cx + wd, cy - ht * 0.25 + wd * 0.8);
    g.lineTo(cx + wd, cy + wd * 0.2);
    g.lineTo(cx - wd, cy - ht * 0.5 + wd * 0.2 - wd * 0.2);
    g.fill();
  } else {
    g.fillRect(cx - wd, cy - ht * 0.1, wd * 2, ht * 0.14);
    g.beginPath();
    g.arc(cx, cy - ht * 0.22, wd * 0.28, 0, 7);
    g.fill();
  }
  mottle(g, r, [cx - wd, cy - ht * 0.5, cx + wd, cy + ht * 0.5], [60, 40, 20], 14, wd * 0.18, 30, 0.2);
  g.restore();
  path();
  g.strokeStyle = rgb(rim);
  g.lineWidth = wd * 0.12;
  g.stroke();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.3;
  g.stroke();
  rivet(g, cx, cy - ht * 0.38, wd * 0.07, rim);
  rivet(g, cx, cy + ht * 0.38, wd * 0.07, rim);
}

/** Hjelm forfra/oppefra (kuppel med kam). */
export function helmet(g: G, cx: number, cy: number, rad: number, col: RGB = STEEL, o: { crest?: RGB; horns?: boolean } = {}): void {
  if (o.horns) {
    for (const s of [-1, 1]) {
      const trace = () => {
        g.beginPath();
        g.moveTo(cx + s * rad * 0.9, cy);
        g.quadraticCurveTo(cx + s * rad * 1.5, cy - rad * 0.2, cx + s * rad * 1.35, cy - rad * 0.95);
      };
      tube(g, trace, rad * 0.22, [226, 214, 180]);
    }
  }
  ellBody(g, cx, cy, rad, rad * 1.1, col, { lw: 1.4 });
  // næsebeskytter / kam
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rad - 1, rad * 1.1 - 1, 0, 0, 7);
  g.clip();
  g.fillStyle = rgb(shift(col, -22), 0.9);
  g.fillRect(cx - rad * 0.12, cy - rad * 1.2, rad * 0.24, rad * 2.4);
  g.fillStyle = 'rgba(255,255,255,.4)';
  g.fillRect(cx - rad * 0.12, cy - rad * 1.2, rad * 0.06, rad * 2.4);
  if (o.crest) {
    g.fillStyle = rgb(o.crest, 0.9);
    g.fillRect(cx - rad * 0.2, cy - rad * 1.2, rad * 0.4, rad * 2.4);
  }
  g.restore();
  g.beginPath();
  g.ellipse(cx, cy, rad * 0.78, rad * 0.85, 0, 0, 7);
  g.strokeStyle = 'rgba(20,12,6,.3)';
  g.lineWidth = 1;
  g.stroke();
}

/** Brystplade (forfra) med remme. */
export function breastplate(g: G, r: Rnd, cx: number, cy: number, s: number, col: RGB = STEEL): void {
  const path = () => {
    g.beginPath();
    g.moveTo(cx - s * 0.5, cy - s * 0.5);
    g.quadraticCurveTo(cx - s * 0.2, cy - s * 0.38, cx - s * 0.1, cy - s * 0.54);
    g.lineTo(cx + s * 0.1, cy - s * 0.54);
    g.quadraticCurveTo(cx + s * 0.2, cy - s * 0.38, cx + s * 0.5, cy - s * 0.5);
    g.quadraticCurveTo(cx + s * 0.62, cy - s * 0.1, cx + s * 0.42, cy + s * 0.5);
    g.quadraticCurveTo(cx, cy + s * 0.58, cx - s * 0.42, cy + s * 0.5);
    g.quadraticCurveTo(cx - s * 0.62, cy - s * 0.1, cx - s * 0.5, cy - s * 0.5);
    g.closePath();
  };
  body(g, path, col, [cx - s * 0.6, cy - s * 0.54, cx + s * 0.6, cy + s * 0.58], { lw: 1.5 });
  g.save();
  path();
  g.clip();
  g.strokeStyle = 'rgba(30,34,44,.4)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(cx, cy - s * 0.5);
  g.lineTo(cx, cy + s * 0.55);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.beginPath();
  g.moveTo(cx - 1, cy - s * 0.5);
  g.lineTo(cx - 1, cy + s * 0.55);
  g.stroke();
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(cx - s * 0.55, cy + s * (0.05 + i * 0.15));
    g.quadraticCurveTo(cx, cy + s * (0.14 + i * 0.15), cx + s * 0.55, cy + s * (0.05 + i * 0.15));
    g.strokeStyle = 'rgba(30,34,44,.25)';
    g.stroke();
  }
  mottle(g, r, [cx - s * 0.5, cy - s * 0.5, cx + s * 0.5, cy + s * 0.5], col, 16, s * 0.05, 20, 0.35);
  g.restore();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.4;
  g.stroke();
  for (const sx of [-1, 1]) rivet(g, cx + sx * s * 0.44, cy - s * 0.4, s * 0.025, col);
}

export { blobPath, polyPath };
