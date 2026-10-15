import { kind, param, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { clipped, ellBody, lin, mottle, OUT, plankBoard, polyPath, radial, rectBody, rectPath, rgb, rivet, shift, tube, wobble, type G, type RGB, type Rnd } from '../pack2/helpers';
import { glassPane, IRON, innerShade, masonry, openParam, openingPath, ringHandle, steps, STONE, woodOf, woodParam, wearParam } from './doors';

/** Særlige døre og porte (pakke 5): rund dør, hemmelig bogreolsdør, gravdør, kældernedgang, låger, åbne døre set oppefra, porthus og vindebro. */

const BOOKS: RGB[] = [[140, 40, 36], [44, 76, 120], [60, 100, 56], [150, 110, 40], [96, 52, 110], [70, 50, 36], [160, 140, 110], [36, 60, 70]];

// ------------------------------------------------------------------ rund dør

const roundDoor = kind({
  key: 'door_round', family: 'door', name: 'Rund dør i bakke', w: 2, h: 2, shadow: 0, bleed: 0.02, tags: ['village', 'forest', 'farm', 'grassland'],
  params: [woodParam, openParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const R = Math.min(o.w, o.h) / 2;
    // bakken: græs og jord omkring døren
    g.fillStyle = radial(g, -R * 0.2, -R * 0.2, R * 1.2, [[0, 'rgb(128,164,70)'], [1, 'rgb(70,102,44)']]);
    g.beginPath();
    g.rect(-o.w / 2, -o.h / 2, o.w, o.h);
    g.fill();
    for (let i = 0; i < 130; i++) {
      const x = (r() - 0.5) * o.w;
      const y = (r() - 0.5) * o.h;
      g.strokeStyle = `rgba(${40 + r() * 70},${100 + r() * 70},${30 + r() * 40},.7)`;
      g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 4); g.stroke();
    }
    const wood = woodOf(o, 4);
    const rr = R * 0.72;
    // stenring
    ellBody(g, 0, 0, rr + R * 0.12, rr + R * 0.12, STONE, { lw: 1.8, ao: 3 });
    const ring = () => { g.beginPath(); g.arc(0, 0, rr + R * 0.1, 0, 7); };
    clipped(g, ring, () => masonry(g, r, -R, -R, R * 2, R * 2, STONE, Math.max(7, R * 0.14)));
    // åbning
    const hole = () => { g.beginPath(); g.arc(0, 0, rr, 0, 7); };
    hole();
    g.fillStyle = 'rgb(18,12,8)';
    g.fill();
    clipped(g, hole, () => {
      if (param(o, 'open', false)) {
        g.fillStyle = radial(g, 0, rr * 0.2, rr * 1.1, [[0, 'rgb(255,208,130)'], [0.5, 'rgb(150,98,52)'], [1, 'rgb(20,12,8)']]);
        g.fillRect(-rr, -rr, rr * 2, rr * 2);
        g.fillStyle = rgb(shift(wood, -10));
        g.beginPath(); g.moveTo(-rr, -rr); g.lineTo(-rr * 0.55, -rr * 0.8); g.lineTo(-rr * 0.55, rr * 0.8); g.lineTo(-rr, rr); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 1.4; g.stroke();
      } else {
        // bræddernes sektorer
        const n = 9;
        for (let i = 0; i < n; i++) {
          const x0 = -rr + (i / n) * rr * 2;
          g.fillStyle = rgb(shift(wood, (r() - 0.5) * 22 + (i < n / 2 ? 6 : -6)));
          g.fillRect(x0, -rr, rr * 2 / n + 0.5, rr * 2);
          g.fillStyle = 'rgba(0,0,0,.5)';
          g.fillRect(x0 + rr * 2 / n - 1, -rr, 1.2, rr * 2);
        }
        for (const ang of [Math.PI / 2 - 0.9, Math.PI / 2 + 0.9]) { void ang; }
        // hængsler
        for (const y of [-rr * 0.55, rr * 0.55]) {
          rectBody(g, -rr, y - 3.5, rr * 1.1, 7, 2, IRON, { lw: 1, ao: 1 });
          for (let k = 0; k < 3; k++) rivet(g, -rr + rr * (0.2 + 0.3 * k), y, 1.5, [150, 150, 160]);
        }
        ringHandle(g, rr * 0.05, 0, rr * 0.2);
      }
    });
    // indvendig skygge, døren sidder i en cirkel
    innerShade(g, hole, rr * 0.1);
    g.beginPath(); g.arc(0, 0, rr + R * 0.1, 0, 7);
    g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
  },
});

// ------------------------------------------------------------------ hemmelig bogreolsdør

const secretShelf = kind({
  key: 'door_secret_bookcase', family: 'door', name: 'Hemmelig dør, bogreol', w: 2.2, h: 2.4, shadow: 0, bleed: 0.02, tags: ['house', 'rich', 'dungeon', 'magic', 'indoor'],
  params: [woodParam, openParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const { w, h } = o;
    const wood = woodOf(o, 1);
    const x0 = -w / 2;
    const y0 = -h / 2;
    const open = param(o, 'open', false);
    // væg
    g.fillStyle = 'rgb(46,34,28)';
    g.fillRect(x0, y0, w, h);
    const t = w * 0.07;
    const sx = x0 + t;
    const sw = w - t * 2;
    const rows = 5;
    const rh = (h - t * 2) / rows;
    const paintShelf = (x: number, y: number, sw2: number, shear: number): void => {
      // bagpanel
      g.fillStyle = rgb(shift(wood, -34));
      g.fillRect(x, y, sw2, h - t * 2);
      for (let j = 0; j < rows; j++) {
        const by = y + j * rh;
        // bøger
        let bx = x + 3;
        while (bx < x + sw2 - 8) {
          const bw = 4 + r() * 6;
          const bh = rh * (0.5 + r() * 0.38);
          const col = BOOKS[(r() * BOOKS.length) | 0]!;
          g.fillStyle = rgb(shift(col, (r() - 0.5) * 24));
          const lean = r() < 0.06 ? 0.2 : 0;
          g.save();
          g.translate(bx, by + rh - 4);
          g.rotate(lean);
          g.fillRect(0, -bh, bw, bh);
          g.fillStyle = 'rgba(255,240,200,.22)';
          g.fillRect(0, -bh, 1.2, bh);
          g.fillStyle = 'rgba(0,0,0,.28)';
          g.fillRect(bw - 1.4, -bh, 1.4, bh);
          g.fillStyle = 'rgba(255,220,120,.7)';
          g.fillRect(1.5, -bh * 0.7, bw - 3, 1);
          g.strokeStyle = 'rgba(14,8,4,.7)'; g.lineWidth = 0.7;
          g.strokeRect(0, -bh, bw, bh);
          g.restore();
          bx += bw + 0.6;
          if (r() < 0.07) bx += 8 + r() * 10;
        }
        // hylde
        rectBody(g, x - 1, by + rh - 5, sw2 + 2, 6, 1, wood, { lw: 1.2, ao: 1.4 });
      }
      void shear;
    };
    if (open) {
      // mørk gang bag; reolen svinger ud som smal skråflade på højre side
      g.fillStyle = radial(g, 0, 0, w * 0.6, [[0, 'rgb(120,86,52)'], [1, 'rgb(10,6,4)']]);
      g.fillRect(sx, y0 + t, sw, h - t * 2);
      g.fillStyle = 'rgb(8,6,6)';
      g.fillRect(sx + sw * 0.1, y0 + t, sw * 0.45, h - t * 2);
      g.save();
      g.beginPath();
      g.moveTo(sx + sw * 0.55, y0 + t * 0.6); g.lineTo(sx + sw, y0 + t); g.lineTo(sx + sw, y0 + h - t); g.lineTo(sx + sw * 0.55, y0 + h - t * 0.6); g.closePath();
      g.clip();
      g.transform(0.45, 0, 0, 1, sx + sw * 0.55, 0);
      paintShelf(0, y0 + t, sw / 0.45 * 0.45 * 1, 0);
      g.restore();
    } else {
      paintShelf(sx, y0 + t, sw, 0);
      // knap mærke: ét lidt fremtrædende bind og lysstreg ved fugen
      g.strokeStyle = 'rgba(0,0,0,.4)';
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, y0 + t); g.lineTo(0, y0 + h - t); g.stroke();
      g.strokeStyle = 'rgba(255,230,150,.45)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(1, y0 + t); g.lineTo(1, y0 + h - t); g.stroke();
    }
    // reolens karm
    rectBody(g, x0, y0, t, h, 2, wood, { lw: 1.4, ao: 1.4 });
    rectBody(g, x0 + w - t, y0, t, h, 2, wood, { lw: 1.4, ao: 1.4 });
    rectBody(g, x0, y0, w, t, 2, shift(wood, 8), { lw: 1.4, ao: 1.4 });
    rectBody(g, x0, y0 + h - t, w, t, 2, shift(wood, -6), { lw: 1.4, ao: 1.4 });
    // gesims
    rectBody(g, x0 - 2, y0 - 2, w + 4, 6, 1.5, shift(wood, 14), { lw: 1.4 });
  },
});

// ------------------------------------------------------------------ gravdør af sten

const tombDoor = kind({
  key: 'door_tomb', family: 'door', name: 'Forseglet gravdør', w: 2.2, h: 2.6, shadow: 0, bleed: 0.02, tags: ['crypt', 'dungeon', 'temple', 'ruin', 'magic'],
  params: [openParam, { key: 'glow', label: 'Glødende segl', type: 'toggle', default: true } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const { w, h } = o;
    const x0 = -w / 2;
    const y0 = -h / 2;
    const dark: RGB = [104, 100, 96];
    rectBody(g, x0, y0, w, h, 4, dark, { lw: 1.8, ao: 3 });
    clipped(g, rectPath(g, x0, y0, w, h, 4), () => masonry(g, r, x0, y0, w, h, dark, Math.max(8, w * 0.1), 0.6));
    // søjler
    const pw = w * 0.15;
    for (const px of [x0 + w * 0.02, x0 + w - pw - w * 0.02]) {
      rectBody(g, px, y0 + h * 0.06, pw, h * 0.92, 3, shift(dark, 14), { lw: 1.4, ao: 2 });
      for (let k = 1; k < 4; k++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px + (pw * k) / 4 - 0.8, y0 + h * 0.1, 1.6, h * 0.84); }
    }
    // overligger med frise
    rectBody(g, x0 + w * 0.04, y0 + h * 0.02, w * 0.92, h * 0.1, 2, shift(dark, 20), { lw: 1.4, ao: 2 });
    const ox = x0 + w * 0.24;
    const ow = w * 0.52;
    const oy = y0 + h * 0.16;
    const oh = h * 0.78;
    const path = openingPath(g, ox, oy, ow, oh, false);
    path();
    g.fillStyle = 'rgb(10,8,8)';
    g.fill();
    const open = param(o, 'open', false);
    clipped(g, path, () => {
      if (open) {
        g.fillStyle = radial(g, 0, oy + oh * 0.7, ow, [[0, 'rgb(90,120,110)'], [1, 'rgb(6,6,8)']]);
        g.fillRect(ox, oy, ow, oh);
        // pladen skubbet til siden
        rectBody(g, ox + ow * 0.62, oy + 3, ow * 0.5, oh - 3, 2, shift(dark, 6), { lw: 1.5, ao: 2 });
      } else {
        rectBody(g, ox + 1, oy + 1, ow - 2, oh - 1, 2, shift(dark, 10), { lw: 1.4, ao: 3 });
        // indridsede runer og segl i midten
        const glow = param(o, 'glow', true);
        const cx = 0;
        const cy = oy + oh * 0.38;
        g.strokeStyle = 'rgba(14,10,8,.8)';
        g.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const ry = oy + oh * 0.08 + i * oh * 0.045;
          g.beginPath();
          for (let k = 0; k < 7; k++) {
            const rx = ox + ow * 0.12 + k * ow * 0.11;
            g.moveTo(rx, ry); g.lineTo(rx + (r() < 0.5 ? 3 : 0), ry + 4 + r() * 2);
            if (r() < 0.5) { g.moveTo(rx - 2, ry + 2); g.lineTo(rx + 3, ry + 2); }
          }
          g.stroke();
        }
        if (glow) {
          g.fillStyle = radial(g, cx, cy + oh * 0.12, ow * 0.5, [[0, 'rgba(120,255,210,.55)'], [1, 'rgba(120,255,210,0)']]);
          g.fillRect(ox, cy - ow * 0.4, ow, ow);
        }
        const seg = glow ? 'rgb(120,240,210)' : 'rgb(36,30,28)';
        g.strokeStyle = seg;
        g.lineWidth = 2.2;
        g.beginPath(); g.arc(cx, cy + oh * 0.12, ow * 0.2, 0, 7); g.stroke();
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          g.lineTo(cx + Math.cos(a) * ow * 0.2, cy + oh * 0.12 + Math.sin(a) * ow * 0.2);
          g.lineTo(cx + Math.cos(a + Math.PI / 6) * ow * 0.09, cy + oh * 0.12 + Math.sin(a + Math.PI / 6) * ow * 0.09);
        }
        g.closePath(); g.stroke();
        // dødningehoved-agtig fordybning nederst: to huller og en kæbe
        g.fillStyle = 'rgba(8,6,6,.8)';
        g.beginPath(); g.ellipse(cx - ow * 0.08, oy + oh * 0.72, 5, 6, 0, 0, 7); g.ellipse(cx + ow * 0.08, oy + oh * 0.72, 5, 6, 0, 0, 7); g.fill();
        // revner
        g.strokeStyle = 'rgba(10,6,6,.7)';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(ox + ow * 0.8, oy); g.lineTo(ox + ow * 0.7, oy + oh * 0.2); g.lineTo(ox + ow * 0.78, oy + oh * 0.34); g.stroke();
      }
    });
    innerShade(g, path, ow * 0.06);
    steps(g, r, 0, y0 + h - h * 0.07, w * 0.84, h * 0.07, 1, shift(dark, 6));
  },
});

// ------------------------------------------------------------------ kældernedgang

const cellarDoors = kind({
  key: 'door_cellar', family: 'door', name: 'Kældernedgang, skrå lemme', w: 2.4, h: 2, shadow: 6, bleed: 0.02, randomRotation: false, tags: ['house', 'village', 'farm', 'city', 'tavern'],
  params: [woodParam, openParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const { w, h } = o;
    const wood = woodOf(o);
    const open = param(o, 'open', false);
    // stenkarm som skrå trapez: smal foroven (bagved), bred forneden (mod beskueren)
    const topW = w * 0.7;
    const botW = w * 0.98;
    const y0 = -h / 2;
    const yb = h / 2;
    const outer = polyPath(g, [[-topW / 2, y0], [topW / 2, y0], [botW / 2, yb], [-botW / 2, yb]]);
    outer();
    g.fillStyle = rgb(STONE);
    g.fill();
    clipped(g, outer, () => masonry(g, r, -w / 2, y0, w, h, STONE, 9, 0.4));
    outer();
    g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
    // lemme i perspektiv
    const m = w * 0.06;
    const ty = y0 + h * 0.08;
    const by = yb - h * 0.1;
    const tw2 = topW / 2 - m;
    const bw2 = botW / 2 - m * 1.2;
    const leafPoly = (side: 1 | -1): [number, number][] => [[side * 1, ty], [side * tw2, ty], [side * bw2, by], [side * 1, by]];
    if (open) {
      // åbne: mørkt hul med trappetrin, lemmene lagt ud til siderne som smalle flader
      g.beginPath();
      g.moveTo(-tw2, ty); g.lineTo(tw2, ty); g.lineTo(bw2, by); g.lineTo(-bw2, by); g.closePath();
      g.fillStyle = 'rgb(10,8,8)'; g.fill();
      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        const yy = ty + (by - ty) * (0.1 + t * 0.85);
        const hw = tw2 + (bw2 - tw2) * (0.1 + t * 0.85);
        g.fillStyle = `rgb(${60 + i * 12},${52 + i * 10},${46 + i * 8})`;
        g.fillRect(-hw + 6, yy, (hw - 6) * 2, (by - ty) * 0.08);
      }
      for (const s of [-1, 1] as const) {
        g.beginPath();
        g.moveTo(s * bw2, by); g.lineTo(s * (bw2 + w * 0.0), by);
        g.fillStyle = rgb(shift(wood, s < 0 ? 6 : -14));
        polyPath(g, [[s * (tw2 + 1), ty], [s * (tw2 + m * 2.3), ty + h * 0.03], [s * (bw2 + m * 2.5), by - h * 0.03], [s * (bw2 + 1), by]])();
        g.fill();
        g.strokeStyle = OUT; g.lineWidth = 1.4; g.stroke();
      }
    } else {
      for (const s of [-1, 1] as const) {
        const poly = polyPath(g, leafPoly(s));
        clipped(g, poly, () => {
          const hl = lin(g, 0, ty, 0, by, [[0, rgb(shift(wood, -14))], [1, rgb(shift(wood, 18))]]);
          g.fillStyle = hl;
          g.fillRect(-w, ty, w * 2, by - ty);
          // brædder i perspektiv (stråler mod fjernpunkt foroven)
          const n = 6;
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            g.strokeStyle = 'rgba(14,8,4,.62)';
            g.lineWidth = 1.2;
            g.beginPath();
            g.moveTo(s * (1 + t * (tw2 - 1)), ty);
            g.lineTo(s * (1 + t * (bw2 - 1)), by);
            g.stroke();
          }
          mottle(g, r, [-w / 2, ty, w / 2, by], wood, 10, 6, 14, 0.3);
          // tværbånd i jern
          for (const f of [0.2, 0.78]) {
            const yy = ty + (by - ty) * f;
            const ww = tw2 + (bw2 - tw2) * f;
            g.fillStyle = rgb(IRON);
            g.fillRect(Math.min(s, s * ww), yy - 3, Math.abs(ww - 1), 6 + f * 3);
            g.strokeStyle = 'rgba(10,6,2,.7)'; g.lineWidth = 1;
            g.strokeRect(Math.min(s, s * ww), yy - 3, Math.abs(ww - 1), 6 + f * 3);
          }
        });
        poly();
        g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,.7)';
      g.fillRect(-1.2, ty, 2.4, by - ty);
      ringHandle(g, -w * 0.07, by - h * 0.18, 6);
      ringHandle(g, w * 0.07, by - h * 0.18, 6);
    }
  },
});

// ------------------------------------------------------------------ havelåge og smedejernsport

const gardenGate = kind({
  key: 'door_garden_gate', family: 'door', name: 'Havelåge', w: 1.8, h: 1.4, shadow: 0, bleed: 0.03, tags: ['village', 'farm', 'house', 'outdoor', 'grassland'],
  params: [woodParam, openParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const { w, h } = o;
    const wood = woodOf(o, 2);
    const x0 = -w / 2;
    const y0 = -h / 2;
    const pw = w * 0.1;
    const open = param(o, 'open', false);
    // græs-stribe
    g.fillStyle = 'rgba(60,96,34,.9)';
    g.fillRect(x0, y0 + h * 0.84, w, h * 0.16);
    const gate = (x: number, gw: number, skew: number): void => {
      const n = Math.max(4, Math.round(gw / 11));
      const pickW = gw / n - 2.4;
      for (let i = 0; i < n; i++) {
        const px = x + (i / n) * gw + 1.2;
        const ph = h * (0.62 + 0.04 * Math.sin(i * 0.9 + skew) + (open ? 0 : 0));
        g.fillStyle = rgb(shift(wood, (r() - 0.5) * 16));
        g.beginPath();
        g.moveTo(px, y0 + h * 0.84); g.lineTo(px, y0 + h * 0.84 - ph + pickW * 0.5); g.lineTo(px + pickW / 2, y0 + h * 0.84 - ph); g.lineTo(px + pickW, y0 + h * 0.84 - ph + pickW * 0.5); g.lineTo(px + pickW, y0 + h * 0.84);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(20,10,4,.75)'; g.lineWidth = 1; g.stroke();
        g.fillStyle = 'rgba(255,240,200,.25)';
        g.fillRect(px + 0.8, y0 + h * 0.84 - ph + pickW * 0.7, 1.2, ph - pickW);
      }
      for (const f of [0.3, 0.62]) rectBody(g, x - 1, y0 + h * f, gw + 2, h * 0.07, 1, shift(wood, -12), { lw: 1.2, ao: 1.2 });
      // skråbånd
      g.save();
      g.beginPath(); g.rect(x, y0 + h * 0.3, gw, h * 0.4); g.clip();
      g.translate(x + gw / 2, y0 + h * 0.5);
      g.rotate(Math.atan2(h * 0.32, gw));
      rectBody(g, -gw * 0.55, -h * 0.03, gw * 1.1, h * 0.06, 1, shift(wood, -4), { lw: 1.1, ao: 1 });
      g.restore();
    };
    gate(x0 + pw * 1.0, w - pw * 2, 0);
    if (open) {
      g.fillStyle = 'rgba(0,0,0,.5)';
      g.fillRect(x0 + pw + (w - pw * 2) * 0.44, y0 + h * 0.2, (w - pw * 2) * 0.56, h * 0.66);
      g.fillStyle = 'rgb(66,102,38)';
      g.fillRect(x0 + pw + (w - pw * 2) * 0.44, y0 + h * 0.84, (w - pw * 2) * 0.56, h * 0.16);
    }
    // stolper med hætter
    for (const px of [x0, x0 + w - pw]) {
      rectBody(g, px, y0 + h * 0.08, pw, h * 0.8, 2, shift(wood, -22), { lw: 1.4, ao: 1.6 });
      rectBody(g, px - 2, y0 + h * 0.03, pw + 4, h * 0.09, 2, shift(wood, 6), { lw: 1.3 });
    }
    // lås
    rectBody(g, x0 + w * 0.7, y0 + h * 0.46, 8, 6, 1, IRON, { lw: 1 });
  },
});

const wroughtGate = kind({
  key: 'door_wrought_gate', family: 'door', name: 'Smedejernsport', w: 2.8, h: 2.4, shadow: 0, bleed: 0.03, tags: ['rich', 'city', 'temple', 'graveyard'],
  params: [openParam, { key: 'rust', label: 'Rust', type: 'toggle', default: false } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const { w, h } = o;
    const rust = param(o, 'rust', false);
    const col: RGB = rust ? [122, 76, 48] : [48, 50, 58];
    const x0 = -w / 2;
    const y0 = -h / 2;
    const pw = w * 0.13;
    const open = param(o, 'open', false);
    const gx0 = x0 + pw;
    const gw = w - pw * 2;
    const leafW = gw / 2;
    const leaf = (x: number, mirror: boolean): void => {
      g.save();
      if (mirror) { g.translate(x + leafW, 0); g.scale(-1, 1); } else g.translate(x, 0);
      const lw = open ? leafW * 0.4 : leafW;
      const bars = Math.max(3, Math.round(lw / 12));
      const top = y0 + h * 0.18;
      const bot = y0 + h * 0.96;
      for (let i = 0; i <= bars; i++) {
        const bx = (i / bars) * lw;
        tube(g, () => { g.beginPath(); g.moveTo(bx, top + (i % 2 ? 6 : 0)); g.lineTo(bx, bot); }, 3.2, col, { outline: 1.2, round: false });
        // lanse-spids
        g.fillStyle = rgb(shift(col, 22));
        g.beginPath(); g.moveTo(bx - 3.4, top + (i % 2 ? 6 : 0) + 2); g.lineTo(bx, top + (i % 2 ? 6 : 0) - 8); g.lineTo(bx + 3.4, top + (i % 2 ? 6 : 0) + 2); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
      }
      for (const f of [0.12, 0.88]) tube(g, () => { g.beginPath(); g.moveTo(0, top + (bot - top) * f); g.lineTo(lw, top + (bot - top) * f); }, 3.6, col, { outline: 1.2, round: false });
      // snirkler i midten
      g.strokeStyle = OUT; g.lineWidth = 5; g.lineCap = 'round';
      for (const pass of [0, 1]) {
        g.strokeStyle = pass ? rgb(shift(col, 16)) : OUT;
        g.lineWidth = pass ? 2.6 : 5;
        g.beginPath();
        const cy = top + (bot - top) * 0.5;
        g.moveTo(0, cy);
        g.bezierCurveTo(lw * 0.2, cy - 30, lw * 0.5, cy - 30, lw * 0.5, cy);
        g.bezierCurveTo(lw * 0.5, cy + 24, lw * 0.8, cy + 24, lw, cy);
        g.stroke();
        g.beginPath(); g.arc(lw * 0.5, cy + 4, 8, 0, 6); g.stroke();
      }
      g.lineCap = 'butt';
      g.restore();
    };
    leaf(gx0, false);
    leaf(gx0 + leafW, true);
    // stenpiller med hætter og kugler
    for (const px of [x0, x0 + w - pw]) {
      rectBody(g, px, y0 + h * 0.1, pw, h * 0.9, 2, STONE, { lw: 1.6, ao: 2.4 });
      clipped(g, rectPath(g, px, y0 + h * 0.1, pw, h * 0.9), () => masonry(g, r, px, y0 + h * 0.1, pw, h * 0.9, STONE, 8));
      rectBody(g, px - 3, y0 + h * 0.06, pw + 6, h * 0.07, 2, shift(STONE, 16), { lw: 1.4 });
      ellBody(g, px + pw / 2, y0 + h * 0.03, pw * 0.34, pw * 0.34, shift(STONE, 10), { lw: 1.3 });
    }
  },
});

// ------------------------------------------------------------------ åbne døre set oppefra

/** Murstykke set oppefra med mørk kontur, lys kant og fuger. */
function wallBlock(g: G, r: Rnd, x: number, y: number, w: number, h: number, col: RGB): void {
  rectBody(g, x, y, w, h, 2, col, { lw: 1.6, ao: 2.2 });
  clipped(g, rectPath(g, x, y, w, h), () => {
    masonry(g, r, x, y, w, h, col, Math.min(9, h * 0.5));
    g.fillStyle = 'rgba(255,246,225,.2)';
    g.fillRect(x, y, w, 1.8);
    g.fillRect(x, y, 1.8, h);
  });
}

function openDoorTop(double: boolean, style: 'wood' | 'iron' | 'gate', key: string, name: string, tags: string[]): ObjectKind {
  const dw = double ? 2.4 : 1.6;
  return kind({
    key, family: 'door', name, w: dw + (style === 'gate' ? 0.8 : 0), h: double ? 1.8 : 1.4, shadow: 5, bleed: 0.03, tags,
    params: [
      ...(style === 'iron' ? [] : [woodParam]),
      { key: 'angle', label: 'Åbningsvinkel', type: 'range', min: 20, max: 160, step: 5, default: 95 } as ParamDef,
      wearParam,
    ],
    draw: (g, o) => {
      const r = rng(o.seed);
      const { w, h } = o;
      const wood = style === 'iron' ? ([84, 88, 98] as RGB) : woodOf(o);
      const ang = (param(o, 'angle', 95) * Math.PI) / 180;
      const wear = param(o, 'wear', 0.3);
      const x0 = -w / 2;
      const y0 = -h / 2;
      const wt = Math.min(h * 0.34, 28);
      const jamb = style === 'gate' ? w * 0.18 : w * 0.2;
      // murstykkerne i top og trædetærskel i åbningen
      wallBlock(g, r, x0, y0, jamb, wt, STONE);
      wallBlock(g, r, x0 + w - jamb, y0, jamb, wt, STONE);
      const gx0 = x0 + jamb;
      const gw = w - jamb * 2;
      rectBody(g, gx0, y0 + wt * 0.25, gw, wt * 0.5, 1, shift(STONE, -14), { lw: 1.2, ao: 1 });
      g.fillStyle = 'rgba(0,0,0,.12)';
      g.fillRect(gx0, y0 + wt * 0.75, gw, 3);
      // blade: hængslet i karmen, svinger nedad (mod beskueren) med vinklen
      const leafLen = double ? gw / 2 : gw;
      const th = style === 'gate' ? 8 : style === 'iron' ? 5 : 6;
      const drawLeaf = (hx: number, hy: number, dir: 1 | -1): void => {
        g.save();
        g.translate(hx, hy);
        // dir=1: hængsel til venstre, bladet peger mod +x ved vinkel 0 og drejer ned mod +y
        const a = dir === 1 ? ang : Math.PI - ang;
        g.rotate(a);
        const len = leafLen - 1;
        g.fillStyle = 'rgba(6,3,0,.32)';
        g.fillRect(2, 2.5, len, th);
        if (style === 'iron') {
          rectBody(g, 0, -th / 2, len, th, 1.5, wood, { lw: 1.4, ao: 1.4 });
          for (let i = 0; i < len / 12; i++) rivet(g, 6 + i * 12, 0, 1.4, [150, 152, 160]);
        } else {
          rectBody(g, 0, -th / 2, len, th, 1.5, wood, { lw: 1.4, ao: 1.4 });
          clipped(g, rectPath(g, 0, -th / 2, len, th), () => {
            for (let i = 0; i < len / 7; i++) { g.fillStyle = 'rgba(20,10,4,.25)'; g.fillRect(i * 7 + r() * 2, -th / 2, 1, th); }
            mottle(g, r, [0, -th / 2, len, th / 2], wood, Math.round(wear * 14), 3, 18, 0.4);
          });
          // jernbånd
          for (const f of [0.12, 0.7]) {
            g.fillStyle = rgb(IRON);
            g.fillRect(len * f, -th / 2 - 0.5, len * 0.14, th + 1);
          }
          if (style === 'gate') for (let i = 0; i < 5; i++) rivet(g, len * (0.1 + i * 0.2), 0, 1.6, [160, 150, 130]);
        }
        rivet(g, 3, 0, 2.2, [100, 100, 110]);
        g.restore();
      };
      if (double) {
        drawLeaf(gx0, y0 + wt / 2, 1);
        drawLeaf(gx0 + gw, y0 + wt / 2, -1);
      } else drawLeaf(gx0, y0 + wt / 2, 1);
      // hængselsstifter
      rivet(g, gx0, y0 + wt / 2, 3, [90, 90, 100]);
      if (double) rivet(g, gx0 + gw, y0 + wt / 2, 3, [90, 90, 100]);
    },
  });
}

// ------------------------------------------------------------------ porthus og vindebro

function crenels(g: G, x: number, y: number, w: number, col: RGB, n: number): void {
  const mw = w / (n * 2 - 1);
  for (let i = 0; i < n; i++) rectBody(g, x + i * mw * 2, y - mw * 0.9, mw, mw * 0.95, 1, shift(col, 8), { lw: 1.2, ao: 1 });
}

function tower(g: G, r: Rnd, x: number, y: number, w: number, h: number): void {
  rectBody(g, x, y, w, h, 3, STONE, { lw: 1.8, ao: 3 });
  clipped(g, rectPath(g, x, y, w, h, 3), () => masonry(g, r, x, y, w, h, STONE, Math.max(8, w * 0.1), 0.2));
  crenels(g, x, y, w, STONE, 4);
  for (const f of [0.28, 0.58]) {
    g.fillStyle = 'rgb(12,8,6)';
    g.fillRect(x + w / 2 - 2, y + h * f, 4, h * 0.14);
    g.strokeStyle = OUT; g.lineWidth = 1; g.strokeRect(x + w / 2 - 2, y + h * f, 4, h * 0.14);
  }
}

export const gatehouse = kind({
  key: 'door_gatehouse', family: 'door', name: 'Porthus med tårne', w: 6, h: 4.2, shadow: 0, bleed: 0.02, tags: ['military', 'city', 'rich'],
  params: [woodParam, { key: 'portcullis', label: 'Faldgitter', type: 'select', default: 'half', options: [{ value: 'none', label: 'Oppe' }, { value: 'half', label: 'Halvt' }, { value: 'down', label: 'Nede' }] } as ParamDef, openParam],
  draw: (g, o) => {
    const r = rng(o.seed);
    const { w, h } = o;
    const x0 = -w / 2;
    const y0 = -h / 2;
    const tw = w * 0.26;
    const wood = woodOf(o);
    // mellemstykke
    const mx = x0 + tw - 2;
    const mw = w - tw * 2 + 4;
    rectBody(g, mx, y0 + h * 0.18, mw, h * 0.82, 2, STONE, { lw: 1.8, ao: 3 });
    clipped(g, rectPath(g, mx, y0 + h * 0.18, mw, h * 0.82), () => masonry(g, r, mx, y0 + h * 0.18, mw, h * 0.82, STONE, 10, 0.3));
    crenels(g, mx, y0 + h * 0.18, mw, STONE, 7);
    // port i buen
    const gwid = mw * 0.46;
    const gx = -gwid / 2;
    const gy = y0 + h * 0.4;
    const gh = h * 0.6;
    const arch = openingPath(g, gx, gy, gwid, gh, true);
    g.strokeStyle = 'rgba(24,16,10,.8)'; g.lineWidth = 1.4;
    for (let i = 1; i < 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      g.beginPath();
      g.moveTo(Math.cos(a) * gwid / 2, gy + gwid / 2 + Math.sin(a) * gwid / 2);
      g.lineTo(Math.cos(a) * (gwid / 2 + 9), gy + gwid / 2 + Math.sin(a) * (gwid / 2 + 9));
      g.stroke();
    }
    arch();
    g.fillStyle = 'rgb(12,8,6)';
    g.fill();
    const open = param(o, 'open', false);
    clipped(g, arch, () => {
      if (open) {
        g.fillStyle = lin(g, 0, gy, 0, gy + gh, [[0, 'rgb(18,12,8)'], [1, 'rgb(110,84,56)']]);
        g.fillRect(gx, gy, gwid, gh);
        for (const s of [-1, 1]) {
          g.fillStyle = rgb(shift(wood, -12));
          polyPath(g, [[s * gwid / 2, gy], [s * gwid * 0.33, gy + gh * 0.04], [s * gwid * 0.33, gy + gh * 0.96], [s * gwid / 2, gy + gh]])();
          g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.3; g.stroke();
        }
      } else {
        plankBoard(g, r, gx, gy, gwid / 2, gh, wood, 5, { vertical: true, nails: true, wear: 0.3 });
        plankBoard(g, r, 0, gy, gwid / 2, gh, wood, 5, { vertical: true, nails: true, wear: 0.3 });
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(-1, gy, 2, gh);
        for (const f of [0.35, 0.8]) { g.fillStyle = rgb(IRON); g.fillRect(gx, gy + gh * f, gwid, gh * 0.06); }
      }
      const pc = param(o, 'portcullis', 'half');
      if (pc !== 'none') {
        const drop = pc === 'down' ? 1 : 0.38;
        const bars = 9;
        for (let i = 0; i <= bars; i++) {
          const bx = gx + (i / bars) * gwid;
          tube(g, () => { g.beginPath(); g.moveTo(bx, gy); g.lineTo(bx, gy + gh * drop); }, 3.2, IRON, { outline: 1.2, round: false });
        }
        for (let j = 0; j < 4 * drop + 1; j++) {
          const yy = gy + 6 + j * (gh * 0.14);
          if (yy > gy + gh * drop) break;
          tube(g, () => { g.beginPath(); g.moveTo(gx, yy); g.lineTo(gx + gwid, yy); }, 3.2, IRON, { outline: 1.2, round: false });
        }
        g.fillStyle = rgb(shift(IRON, 20));
        for (let i = 0; i <= bars; i++) {
          const bx = gx + (i / bars) * gwid;
          g.beginPath(); g.moveTo(bx - 2, gy + gh * drop); g.lineTo(bx, gy + gh * drop + 8); g.lineTo(bx + 2, gy + gh * drop); g.fill();
        }
      }
    });
    innerShade(g, arch, 5);
    // tårne
    tower(g, r, x0, y0 + h * 0.04, tw, h * 0.96);
    tower(g, r, x0 + w - tw, y0 + h * 0.04, tw, h * 0.96);
    // flag
    for (const s of [-1, 1]) {
      const fx = s * (w / 2 - tw / 2);
      const fy = y0 + h * 0.04 - h * 0.05;
      g.strokeStyle = 'rgb(60,40,24)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - h * 0.12); g.stroke();
      g.fillStyle = 'rgb(150,36,36)';
      g.beginPath(); g.moveTo(fx, fy - h * 0.12); g.lineTo(fx + 16, fy - h * 0.1); g.lineTo(fx + 10, fy - h * 0.08); g.lineTo(fx + 16, fy - h * 0.06); g.lineTo(fx, fy - h * 0.06); g.fill();
      g.strokeStyle = OUT; g.lineWidth = 0.9; g.stroke();
    }
  },
});

const drawbridge = kind({
  key: 'door_drawbridge', family: 'door', name: 'Vindebro-port', w: 3.2, h: 4, shadow: 0, bleed: 0.02, tags: ['military', 'city', 'rich', 'water'],
  params: [woodParam, { key: 'lowered', label: 'Sænket', type: 'toggle', default: false } as ParamDef],
  draw: (g, o) => {
    const r = rng(o.seed);
    const { w, h } = o;
    const wood = woodOf(o, 1);
    const x0 = -w / 2;
    const y0 = -h / 2;
    const wallH = h * 0.62;
    rectBody(g, x0, y0, w, wallH, 3, STONE, { lw: 1.8, ao: 3 });
    clipped(g, rectPath(g, x0, y0, w, wallH, 3), () => masonry(g, r, x0, y0, w, wallH, STONE, 10, 0.3));
    crenels(g, x0, y0, w, STONE, 6);
    const gwid = w * 0.5;
    const gx = -gwid / 2;
    const gy = y0 + wallH * 0.22;
    const gh = wallH * 0.78;
    const arch = openingPath(g, gx, gy, gwid, gh, true);
    g.strokeStyle = 'rgba(24,16,10,.8)'; g.lineWidth = 1.4;
    for (let i = 1; i < 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      g.beginPath();
      g.moveTo(Math.cos(a) * gwid / 2, gy + gwid / 2 + Math.sin(a) * gwid / 2);
      g.lineTo(Math.cos(a) * (gwid / 2 + 9), gy + gwid / 2 + Math.sin(a) * (gwid / 2 + 9));
      g.stroke();
    }
    arch();
    g.fillStyle = 'rgb(12,8,6)';
    g.fill();
    const lowered = param(o, 'lowered', false);
    clipped(g, arch, () => {
      if (lowered) {
        g.fillStyle = lin(g, 0, gy, 0, gy + gh, [[0, 'rgb(14,10,8)'], [1, 'rgb(96,74,52)']]);
        g.fillRect(gx, gy, gwid, gh);
      } else {
        plankBoard(g, r, gx, gy, gwid, gh, wood, 7, { vertical: true, nails: true, wear: 0.4 });
        for (const f of [0.3, 0.62, 0.9]) { g.fillStyle = rgb(IRON); g.fillRect(gx, gy + gh * f, gwid, gh * 0.05); }
        g.fillStyle = rgb(IRON); g.fillRect(-1.5, gy, 3, gh);
      }
    });
    innerShade(g, arch, 5);
    // vindebroens kæder fra de to huller i muren
    const holeY = y0 + wallH * 0.12;
    const botY = y0 + wallH;
    const bridgeW = gwid * 0.92;
    const bridgeTopW = lowered ? bridgeW * 0.9 : bridgeW;
    if (lowered) {
      // broen ligger ud over voldgraven: trapez i perspektiv (bredere nedad)
      const bt = botY - gh * 0.05;
      const bb = y0 + h - 2;
      const poly = polyPath(g, [[-bridgeTopW / 2, bt], [bridgeTopW / 2, bt], [bridgeW * 0.68, bb], [-bridgeW * 0.68, bb]]);
      poly();
      g.fillStyle = rgb(wood); g.fill();
      clipped(g, poly, () => {
        for (let i = 0; i < 12; i++) {
          const t = i / 12;
          const yy = bt + (bb - bt) * t;
          const hh = (bb - bt) / 12;
          g.fillStyle = rgb(shift(wood, (r() - 0.5) * 22 + t * 8));
          g.fillRect(-w / 2, yy, w, hh);
          g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(-w / 2, yy + hh - 1.2, w, 1.4);
          g.fillStyle = 'rgba(255,240,200,.2)'; g.fillRect(-w / 2, yy, w, 1);
        }
      });
      poly();
      g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
      // skrå kæder fra broens yderhjørner op til hullerne
      for (const s of [-1, 1]) {
        const sx = s * gwid * 0.46;
        tube(g, () => { g.beginPath(); g.moveTo(s * (w * 0.3), holeY); g.quadraticCurveTo(s * w * 0.4, (holeY + bb) / 2, s * bridgeW * 0.66, bb - 6); }, 3, IRON, { outline: 1.2 });
        void sx;
      }
    } else {
      for (const s of [-1, 1]) {
        const hx = s * (gwid * 0.36);
        g.fillStyle = 'rgb(10,6,4)';
        g.fillRect(hx - 5, holeY - 4, 10, 10);
        tube(g, () => { g.beginPath(); g.moveTo(hx, holeY + 2); g.lineTo(s * gwid * 0.45, y0 + wallH * 0.5); g.lineTo(s * gwid * 0.45, gy + gh * 0.4); }, 3, IRON, { outline: 1.2 });
      }
    }
    // voldgrav/vand forneden og sten-kant
    if (!lowered) {
      const wy = botY;
      g.fillStyle = lin(g, 0, wy, 0, y0 + h, [[0, 'rgb(30,60,80)'], [1, 'rgb(60,110,140)']]);
      g.fillRect(x0, wy, w, y0 + h - wy);
      g.strokeStyle = 'rgba(210,235,245,.35)'; g.lineWidth = 1.2;
      for (let i = 0; i < 10; i++) {
        const yy = wy + 8 + r() * (y0 + h - wy - 14);
        const xx = x0 + r() * w;
        g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + 8, yy - 3, xx + 16, yy); g.stroke();
      }
    } else {
      void wobble;
    }
  },
});

export const doorSpecialKinds: ObjectKind[] = [
  roundDoor, secretShelf, tombDoor, cellarDoors, gardenGate, wroughtGate,
  openDoorTop(false, 'wood', 'door_open_top', 'Åben dør, set oppefra', ['house', 'village', 'city', 'tavern', 'indoor']),
  openDoorTop(true, 'wood', 'door_open_double_top', 'Åben dobbeltdør, set oppefra', ['house', 'city', 'tavern', 'rich', 'indoor']),
  openDoorTop(false, 'iron', 'door_open_iron_top', 'Åben jerndør, set oppefra', ['dungeon', 'military', 'crypt']),
  openDoorTop(true, 'gate', 'door_open_gate_top', 'Åben port, set oppefra', ['military', 'city', 'village', 'farm']),
  gatehouse, drawbridge,
];
void glassPane; void ellBody; void radial; void OUT;
