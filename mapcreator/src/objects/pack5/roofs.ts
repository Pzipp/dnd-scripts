import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { rng } from '../util';
import { clipped, lin, mix, mossPatch, mottle, OUT, polyPath, radial, rectBody, rgb, rivet, shift, tube, wobble, type G, type Path, type RGB, type Rnd } from '../pack2/helpers';

/** Tage set oppefra (pakke 5): materialer i rækker, lys fra øverst til venstre, taglister, skorstene, kviste, huller og glas. */

type Pt = [number, number];
export type Mat = 'tile' | 'slate' | 'shingle' | 'thatch' | 'glass';

/** Tre toner pr. materiale (valgt med parameteren `tone`). */
const TONES: Record<Mat, { label: string; col: RGB }[]> = {
  tile: [{ label: 'Rød tegl', col: [176, 84, 54] }, { label: 'Brun tegl', col: [134, 90, 64] }, { label: 'Patina', col: [88, 118, 98] }],
  slate: [{ label: 'Grå skifer', col: [86, 94, 108] }, { label: 'Blågrå skifer', col: [70, 88, 116] }, { label: 'Sort skifer', col: [52, 54, 62] }],
  shingle: [{ label: 'Brune spåner', col: [124, 90, 58] }, { label: 'Gråvejrede', col: [132, 126, 116] }, { label: 'Rødbrune', col: [120, 68, 46] }],
  thatch: [{ label: 'Gyldent strå', col: [198, 166, 98] }, { label: 'Gråbrunt strå', col: [152, 130, 94] }, { label: 'Mørkt rør', col: [122, 100, 68] }],
  glass: [{ label: 'Klart glas', col: [120, 180, 192] }, { label: 'Grønligt glas', col: [100, 170, 150] }, { label: 'Blåt glas', col: [90, 130, 200] }],
};

const toneParam = (mat: Mat): ParamDef => ({
  key: 'tone', label: 'Farve', type: 'select', default: '0',
  options: TONES[mat].map((t, i) => ({ value: String(i), label: t.label })),
});
const wearParam = (d: number): ParamDef => ({ key: 'wear', label: 'Slid', type: 'range', min: 0, max: 1, step: 0.05, default: d });
const mossParam = (d: number): ParamDef => ({ key: 'moss', label: 'Mos', type: 'range', min: 0, max: 1, step: 0.05, default: d });
const chimneyParam = (d: boolean): ParamDef => ({ key: 'chimney', label: 'Skorsten', type: 'toggle', default: d });

const baseOf = (mat: Mat, o: DrawInput): RGB => TONES[mat][Math.min(2, Math.max(0, parseInt(param(o, 'tone', '0'), 10) || 0))]!.col;

// ------------------------------------------------------------------ flader med tagmateriale

/** Maler et tagfald (polygon) i rækker; `dir` er retningen ned ad taget (mod tagskægget). Lys i [-1..1]. */
function paintFace(g: G, r: Rnd, poly: Pt[], dir: Pt, mat: Mat, lit: number, rh: number, base: RGB, wear: number): void {
  const [dx, dy] = dir;
  const ex = dy;
  const ey = -dx;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const [x, y] of poly) {
    const lx = x * ex + y * ey;
    const ly = x * dx + y * dy;
    minX = Math.min(minX, lx); maxX = Math.max(maxX, lx); minY = Math.min(minY, ly); maxY = Math.max(maxY, ly);
  }
  g.save();
  polyPath(g, poly)();
  g.clip();
  g.transform(ex, ey, dx, dy, 0, 0);
  g.fillStyle = mat === 'thatch' ? rgb(shift(base, -50)) : 'rgb(30,20,14)';
  g.fillRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
  const len = rh * (mat === 'thatch' ? 2.6 : 1.7);
  if (mat === 'thatch') {
    const pal: RGB[] = [shift(base, 20 + lit * 12), shift(base, lit * 12), shift(base, -20 + lit * 12), shift(base, 36 + lit * 12), shift(base, -38 + lit * 12)];
    for (let y = maxY + rh * 0.4; y - len > minY - rh; y -= rh) {
      const ps: number[][] = pal.map(() => []);
      let bundle = 2;
      let bleft = 0;
      for (let x = minX - 4; x < maxX + 4; x += 1.9) {
        // et bundt strå ad gangen har sin egen grundtone
        if (bleft <= 0) { bundle = (r() * 5) | 0; bleft = rh * (0.9 + r() * 1.2); }
        bleft -= 1.9;
        const p = ps[r() < 0.7 ? bundle : (r() * 5) | 0]!;
        const l = len * (0.8 + r() * 0.4);
        p.push(x, y - l, x + (r() - 0.5) * 2.2, y + (r() - 0.5) * 3.4);
      }
      g.lineWidth = 1.7;
      g.lineCap = 'round';
      pal.forEach((c, i) => {
        g.strokeStyle = rgb(c, 0.95);
        g.beginPath();
        const q = ps[i]!;
        for (let j = 0; j < q.length; j += 4) { g.moveTo(q[j]!, q[j + 1]!); g.lineTo(q[j + 2]!, q[j + 3]!); }
        g.stroke();
      });
      // bundtets bånd og skygge under rækkens kant
      g.fillStyle = 'rgba(40,26,8,.28)';
      g.fillRect(minX - 4, y + rh * 0.26, maxX - minX + 8, rh * 0.34);
      g.fillStyle = 'rgba(255,236,170,.12)';
      g.fillRect(minX - 4, y - rh * 0.05, maxX - minX + 8, 1);
    }
    g.lineCap = 'butt';
    mottle(g, r, [minX, minY, maxX, maxY], base, 16, rh * 2.4, 28, 0.16);
  } else {
    const tw = rh * (mat === 'slate' ? 1.55 : mat === 'shingle' ? 0.95 : 1.25);
    for (let k = 0, y = maxY + rh * 0.25; y - len > minY - rh; k++, y -= rh) {
      const off = (k % 2) * tw * 0.5 - r() * 2;
      for (let x = minX - tw + off; x < maxX + tw * 0.3; ) {
        const w = mat === 'shingle' ? tw * (0.78 + r() * 0.5) : tw;
        const roll = r();
        if (roll < wear * 0.03) {
          // manglende tagsten: mørke lægter
          g.fillStyle = 'rgb(52,36,24)';
          g.fillRect(x + 0.5, y - len * 0.7, w - 1, len * 0.7);
          g.fillStyle = rgb(shift(base, -60), 0.7);
          g.fillRect(x, y - rh * 0.55, w, 1.6);
          x += w;
          continue;
        }
        const slip = roll < wear * 0.06 ? rh * 0.28 : 0;
        const tone = (r() - 0.5) * 24 + lit * 18 + (r() < 0.07 ? (r() < 0.5 ? 14 : -14) : 0);
        const col = mat === 'tile' ? mix(shift(base, tone), [208, 120, 74], r() * 0.14) : shift(base, tone + (mat === 'slate' && r() < 0.15 ? 12 : 0));
        const yf = y + slip;
        g.beginPath();
        if (mat === 'tile') {
          g.moveTo(x, yf - len);
          g.lineTo(x + w, yf - len);
          g.lineTo(x + w, yf - w * 0.32);
          g.quadraticCurveTo(x + w, yf, x + w / 2, yf);
          g.quadraticCurveTo(x, yf, x, yf - w * 0.32);
        } else if (mat === 'shingle') {
          g.moveTo(x, yf - len);
          g.lineTo(x + w, yf - len);
          g.lineTo(x + w, yf - 2);
          g.lineTo(x + w * 0.5, yf + 1.2);
          g.lineTo(x, yf - 2);
        } else {
          const c = rh * 0.12;
          g.moveTo(x, yf - len);
          g.lineTo(x + w, yf - len);
          g.lineTo(x + w, yf - c);
          g.lineTo(x + w - c, yf);
          g.lineTo(x + c, yf);
          g.lineTo(x, yf - c);
        }
        g.closePath();
        g.fillStyle = rgb(col);
        g.fill();
        g.strokeStyle = mat === 'tile' ? 'rgba(40,12,4,.6)' : 'rgba(14,10,8,.7)';
        g.lineWidth = 0.8;
        g.stroke();
        // overfladens detaljer
        if (mat === 'tile') {
          g.strokeStyle = rgb(shift(col, -26), 0.55);
          g.beginPath();
          g.moveTo(x + w * 0.33, yf - len * 0.5); g.lineTo(x + w * 0.33, yf - 1.5);
          g.moveTo(x + w * 0.66, yf - len * 0.5); g.lineTo(x + w * 0.66, yf - 1.5);
          g.stroke();
          g.strokeStyle = rgb(shift(col, 30), 0.45);
          g.beginPath();
          g.moveTo(x + w * 0.38, yf - len * 0.5); g.lineTo(x + w * 0.38, yf - 2);
          g.stroke();
        } else if (mat === 'slate') {
          g.fillStyle = rgb(shift(col, 26), 0.5);
          g.fillRect(x + 1, yf - rh * 0.22, w - 2, 1);
          if (r() < 0.07) {
            g.strokeStyle = 'rgba(8,6,6,.6)';
            g.beginPath(); g.moveTo(x + w * 0.3, yf - rh * 0.9); g.lineTo(x + w * 0.5, yf - rh * 0.4); g.lineTo(x + w * 0.42, yf - 1); g.stroke();
          }
        } else {
          g.strokeStyle = rgb(shift(col, -30), 0.4);
          g.beginPath();
          const n = 2 + ((r() * 2) | 0);
          for (let i = 0; i < n; i++) {
            const gx = x + w * (0.2 + 0.6 * r());
            g.moveTo(gx, yf - len * 0.7); g.lineTo(gx + (r() - 0.5) * 2, yf - 2);
          }
          g.stroke();
        }
        // skygge under rækken ovenfor og mørk kant forneden
        g.fillStyle = 'rgba(10,4,0,.3)';
        g.fillRect(x, yf - rh, w, rh * 0.13);
        g.fillStyle = 'rgba(10,4,0,.16)';
        g.fillRect(x, yf - rh + rh * 0.13, w, rh * 0.16);
        g.fillStyle = 'rgba(255,240,205,.16)';
        g.fillRect(x + 0.6, yf - rh * 0.1, w - 1.2, 1);
        x += w;
      }
    }
    mottle(g, r, [minX, minY, maxX, maxY], base, 12, rh * 2.6, 18, 0.14);
  }
  // fladens lys: oplyst fald lysere, fald i skygge køligere og mørkere
  g.fillStyle = lit >= 0 ? `rgba(255,236,190,${lit * 0.13})` : `rgba(6,8,34,${-lit * 0.3})`;
  g.fillRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
  g.fillStyle = lin(g, 0, minY, 0, maxY, [[0, 'rgba(10,6,0,.16)'], [0.25, 'rgba(10,6,0,0)']]);
  g.fillRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
  g.restore();
}

/** Tagryg eller grat: afsluttende lister (tegl), blyskinne (skifer), strårulle (stråtag), brædder. */
function ridgeLine(g: G, r: Rnd, a: Pt, b: Pt, mat: Mat, base: RGB, wd: number): void {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L < 2) return;
  const col: RGB = mat === 'tile' ? shift(base, -16) : mat === 'slate' ? [74, 78, 90] : mat === 'thatch' ? shift(base, -10) : mat === 'glass' ? [66, 70, 78] : shift(base, -18);
  tube(g, () => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }, wd, col, { outline: 1.8 });
  const nx = (b[1] - a[1]) / L;
  const ny = -(b[0] - a[0]) / L;
  const ux = (b[0] - a[0]) / L;
  const uy = (b[1] - a[1]) / L;
  const step = mat === 'thatch' ? wd * 0.7 : wd * 0.95;
  g.beginPath();
  for (let t = step * 0.5; t < L; t += step) {
    const px = a[0] + ux * t;
    const py = a[1] + uy * t;
    if (mat === 'thatch') {
      g.moveTo(px - nx * wd * 0.5 + ux * 2, py - ny * wd * 0.5 + uy * 2);
      g.lineTo(px + nx * wd * 0.5 - ux * 2, py + ny * wd * 0.5 - uy * 2);
    } else {
      g.moveTo(px - nx * wd * 0.5, py - ny * wd * 0.5);
      g.lineTo(px + nx * wd * 0.5, py + ny * wd * 0.5);
    }
  }
  g.strokeStyle = mat === 'thatch' ? 'rgba(60,40,10,.55)' : 'rgba(10,4,0,.5)';
  g.lineWidth = mat === 'thatch' ? 1.4 : 1;
  g.stroke();
  if (mat === 'thatch') {
    for (let i = 0; i < L / 3; i++) {
      const t = r() * L;
      g.strokeStyle = rgb(shift(base, 20 + r() * 30), 0.6);
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(a[0] + ux * t - nx * wd * 0.3, a[1] + uy * t - ny * wd * 0.3);
      g.lineTo(a[0] + ux * (t + 5) + nx * wd * 0.3, a[1] + uy * (t + 5) + ny * wd * 0.3);
      g.stroke();
    }
  }
}

/** Kant på hele taget: mørk kontur, lys kant øverst til venstre og et blødt mørkt bånd indenfor. */
function eave(g: G, outline: Path): void {
  g.save();
  outline();
  g.clip();
  outline();
  g.strokeStyle = 'rgba(12,6,0,.3)';
  g.lineWidth = 7;
  g.lineJoin = 'round';
  g.stroke();
  g.translate(1.6, 1.6);
  outline();
  g.strokeStyle = 'rgba(255,238,200,.28)';
  g.lineWidth = 1.2;
  g.stroke();
  g.restore();
  outline();
  g.strokeStyle = OUT;
  g.lineWidth = 2.4;
  g.lineJoin = 'round';
  g.stroke();
}

function rowHeight(w: number, h: number, mat: Mat): number {
  const m = Math.min(w, h);
  const k = mat === 'thatch' ? 1.2 : mat === 'shingle' ? 0.9 : 1;
  return Math.max(6, Math.min(13, m / 19)) * k;
}

// ------------------------------------------------------------------ tagformer

function gableRoof(g: G, r: Rnd, w: number, h: number, mat: Mat, base: RGB, wear: number): { outline: Path; ridge: [Pt, Pt] } {
  const rh = rowHeight(w, h, mat);
  const x = w / 2;
  const y = h / 2;
  paintFace(g, r, [[-x, -y], [x, -y], [x, 0], [-x, 0]], [0, -1], mat, 0.55, rh, base, wear);
  paintFace(g, r, [[-x, 0], [x, 0], [x, y], [-x, y]], [0, 1], mat, -0.55, rh, base, wear);
  const ridge: [Pt, Pt] = [[-x + 1, 0], [x - 1, 0]];
  ridgeLine(g, r, ridge[0], ridge[1], mat, base, rh * 1.35);
  return { outline: () => { g.beginPath(); g.rect(-x, -y, w, h); }, ridge };
}

function hipRoof(g: G, r: Rnd, w: number, h: number, mat: Mat, base: RGB, wear: number): { outline: Path; ridge: [Pt, Pt] } {
  const rh = rowHeight(w, h, mat);
  const x = w / 2;
  const y = h / 2;
  const c = Math.min(x, y);
  const horiz = w >= h;
  const A: Pt = horiz ? [-(x - c), 0] : [0, -(y - c)];
  const B: Pt = horiz ? [x - c, 0] : [0, y - c];
  const TL: Pt = [-x, -y], TR: Pt = [x, -y], BR: Pt = [x, y], BL: Pt = [-x, y];
  if (horiz) {
    paintFace(g, r, [TL, TR, B, A], [0, -1], mat, 0.45, rh, base, wear);
    paintFace(g, r, [BL, BR, B, A], [0, 1], mat, -0.55, rh, base, wear);
    paintFace(g, r, [TL, BL, A], [-1, 0], mat, 0.3, rh, base, wear);
    paintFace(g, r, [TR, BR, B], [1, 0], mat, -0.35, rh, base, wear);
  } else {
    paintFace(g, r, [TL, TR, A], [0, -1], mat, 0.45, rh, base, wear);
    paintFace(g, r, [BL, BR, B], [0, 1], mat, -0.55, rh, base, wear);
    paintFace(g, r, [TL, BL, B, A], [-1, 0], mat, 0.3, rh, base, wear);
    paintFace(g, r, [TR, BR, B, A], [1, 0], mat, -0.35, rh, base, wear);
  }
  const hipW = rh * 1.1;
  const hips: [Pt, Pt][] = horiz ? [[TL, A], [BL, A], [TR, B], [BR, B]] : [[TL, A], [TR, A], [BL, B], [BR, B]];
  for (const [p, q] of hips) ridgeLine(g, r, p, q, mat, base, hipW);
  ridgeLine(g, r, A, B, mat, base, rh * 1.35);
  if (Math.hypot(B[0] - A[0], B[1] - A[1]) < 2) {
    // pyramide: spids i midten
    rivet(g, 0, 0, rh * 0.9, mat === 'thatch' ? [150, 120, 60] : [190, 160, 70]);
  }
  return { outline: () => { g.beginPath(); g.rect(-x, -y, w, h); }, ridge: [A, B] };
}

/** Kegletag til et rundt tårn: ringe af sten rundt om spidsen. */
function coneRoof(g: G, r: Rnd, w: number, h: number, mat: Mat, base: RGB, wear: number): { outline: Path } {
  const R = Math.min(w, h) / 2;
  const rh = Math.max(4.5, Math.min(9, R / 9)) * (mat === 'thatch' ? 1.2 : 1);
  const outline: Path = () => { g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); };
  g.save();
  outline();
  g.clip();
  g.fillStyle = mat === 'thatch' ? rgb(shift(base, -45)) : 'rgb(28,18,12)';
  g.fillRect(-R, -R, R * 2, R * 2);
  const len = rh * (mat === 'thatch' ? 2.4 : 1.7);
  const tw = rh * (mat === 'slate' ? 1.55 : mat === 'shingle' ? 0.95 : 1.25);
  for (let rr = R + rh * 0.25; rr > rh * 0.5; rr -= rh * 0.92) {
    const n = Math.max(7, Math.round((Math.PI * 2 * Math.max(rr - len * 0.4, 3)) / tw));
    const da = (Math.PI * 2) / n;
    const a0 = r() * 6.28;
    const rin = Math.max(0.5, rr - len);
    for (let i = 0; i < n; i++) {
      const a = a0 + i * da;
      const lit = Math.cos(a + da / 2 - (Math.PI * 5) / 4);
      const roll = r();
      if (mat !== 'thatch' && roll < wear * 0.025) {
        g.beginPath();
        g.arc(0, 0, rr, a, a + da * 1.02);
        g.arc(0, 0, rin, a + da * 1.02, a, true);
        g.closePath();
        g.fillStyle = 'rgb(26,17,11)';
        g.fill();
        continue;
      }
      const tone = (r() - 0.5) * 22 + lit * 26;
      if (mat === 'thatch') {
        const cols: RGB[] = [shift(base, 18 + lit * 16), shift(base, lit * 16), shift(base, -22 + lit * 16)];
        g.lineWidth = 1.7;
        g.lineCap = 'round';
        for (let m = 0; m < 5; m++) {
          const aa = a + (da * (m + 0.5)) / 5;
          const l = len * (0.8 + r() * 0.4);
          g.strokeStyle = rgb(cols[(r() * 3) | 0]!);
          g.beginPath();
          g.moveTo(Math.cos(aa) * (rr - l), Math.sin(aa) * (rr - l));
          g.lineTo(Math.cos(aa + (r() - 0.5) * 0.04) * (rr + 1), Math.sin(aa + (r() - 0.5) * 0.04) * (rr + 1));
          g.stroke();
        }
        g.lineCap = 'butt';
        continue;
      }
      const col = mat === 'tile' ? mix(shift(base, tone), [208, 120, 74], r() * 0.14) : shift(base, tone + (mat === 'slate' && r() < 0.15 ? 12 : 0));
      g.beginPath();
      g.moveTo(Math.cos(a) * rin, Math.sin(a) * rin);
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      g.arc(0, 0, rr, a, a + da * 1.03);
      g.lineTo(Math.cos(a + da * 1.03) * rin, Math.sin(a + da * 1.03) * rin);
      g.closePath();
      g.fillStyle = rgb(col);
      g.fill();
      g.strokeStyle = mat === 'tile' ? 'rgba(40,12,4,.6)' : 'rgba(14,10,8,.7)';
      g.lineWidth = 0.8;
      g.stroke();
      if (mat === 'tile') {
        g.strokeStyle = rgb(shift(col, -26), 0.55);
        g.beginPath();
        const am = a + da / 2;
        g.moveTo(Math.cos(am) * (rr - len * 0.5), Math.sin(am) * (rr - len * 0.5));
        g.lineTo(Math.cos(am) * (rr - 1.5), Math.sin(am) * (rr - 1.5));
        g.stroke();
      }
      // skygge fra rækken inden for (højere oppe)
      g.beginPath();
      g.arc(0, 0, Math.max(0.5, rr - rh + rh * 0.12), a, a + da * 1.03);
      g.strokeStyle = 'rgba(10,4,0,.3)';
      g.lineWidth = rh * 0.22;
      g.stroke();
    }
  }
  // fire-otte tagribber og lys over hele keglen
  g.strokeStyle = rgb(shift(base, -50), 0.75);
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    g.moveTo(0, 0);
    g.lineTo(Math.cos((i * Math.PI) / 4 + 0.39) * R, Math.sin((i * Math.PI) / 4 + 0.39) * R);
  }
  g.stroke();
  g.fillStyle = lin(g, -R * 0.8, -R * 0.8, R * 0.8, R * 0.8, [[0, 'rgba(255,236,190,.2)'], [0.5, 'rgba(255,236,190,0)'], [1, 'rgba(6,8,34,.32)']]);
  g.fillRect(-R, -R, R * 2, R * 2);
  g.restore();
  rivet(g, 0, 0, Math.max(3, R * 0.07), mat === 'thatch' ? [150, 118, 60] : [196, 164, 72]);
  return { outline };
}

/** L-formet tag: lodret fløj med ryg langs y, vandret fløj i toppen med dal-linjer ned mod den lodrette ryg. */
function lRoof(g: G, r: Rnd, w: number, h: number, mat: Mat, base: RGB, wear: number): { outline: Path } {
  const rh = rowHeight(w, h, mat);
  const x0 = -w / 2;
  const y0 = -h / 2;
  const b = w * 0.46;
  const a = h * 0.5;
  // lodret fløj (ryg langs y)
  const bx = x0 + b / 2;
  paintFace(g, r, [[x0, y0], [bx, y0], [bx, h / 2], [x0, h / 2]], [-1, 0], mat, 0.3, rh, base, wear);
  paintFace(g, r, [[bx, y0], [x0 + b, y0], [x0 + b, h / 2], [bx, h / 2]], [1, 0], mat, -0.35, rh, base, wear);
  ridgeLine(g, r, [bx, y0 + 1], [bx, h / 2 - 1], mat, base, rh * 1.35);
  // vandret fløj
  const ay = y0 + a / 2;
  const topFace: Pt[] = [[w / 2, y0], [x0 + b, y0], [bx, ay], [w / 2, ay]];
  const botFace: Pt[] = [[w / 2, ay], [bx, ay], [x0 + b, y0 + a], [w / 2, y0 + a]];
  paintFace(g, r, topFace, [0, -1], mat, 0.5, rh, base, wear);
  paintFace(g, r, botFace, [0, 1], mat, -0.5, rh, base, wear);
  ridgeLine(g, r, [x0 + b, y0 + 1.5], [bx, ay], mat, base, rh * 1.05);
  ridgeLine(g, r, [bx, ay], [x0 + b, y0 + a], mat, base, rh * 1.05);
  ridgeLine(g, r, [bx, ay], [w / 2 - 1, ay], mat, base, rh * 1.35);
  ridgeLine(g, r, [bx, y0 + 1], [bx, h / 2 - 1], mat, base, rh * 1.35);
  const outline: Path = () => {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(w / 2, y0);
    g.lineTo(w / 2, y0 + a);
    g.lineTo(x0 + b, y0 + a);
    g.lineTo(x0 + b, h / 2);
    g.lineTo(x0, h / 2);
    g.closePath();
  };
  return { outline };
}

// ------------------------------------------------------------------ tilbehør

function chimney(g: G, r: Rnd, x: number, y: number, s: number): void {
  // skygge til nederst til højre
  g.fillStyle = 'rgba(8,4,12,.34)';
  g.beginPath();
  g.moveTo(x + s * 0.3, y + s * 0.4);
  g.lineTo(x + s * 1.1, y + s * 0.4 + s * 0.2);
  g.lineTo(x + s * 1.5, y + s * 1.3);
  g.lineTo(x + s * 0.4, y + s * 1.3);
  g.closePath();
  g.fill();
  rectBody(g, x, y, s, s, s * 0.06, [150, 130, 112], { lw: 1.6 });
  g.save();
  g.beginPath();
  g.rect(x, y, s, s);
  g.clip();
  const rows = 4;
  for (let j = 0; j < rows; j++) {
    const yy = y + (j / rows) * s;
    g.strokeStyle = 'rgba(30,18,10,.55)';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(x, yy); g.lineTo(x + s, yy);
    for (let i = 0; i < 3; i++) {
      const xx = x + ((i + 0.5 * (j % 2) + 0.4) / 3) * s;
      g.moveTo(xx, yy); g.lineTo(xx, yy + s / rows);
    }
    g.stroke();
    g.fillStyle = `rgba(${r() < 0.5 ? '255,240,215' : '20,10,4'},.12)`;
    g.fillRect(x + r() * s * 0.6, yy + 1, s * 0.3, s / rows - 2);
  }
  g.restore();
  // rør: mørk åbning med sod og lys kant
  const q = s * 0.2;
  g.fillStyle = 'rgb(18,12,10)';
  g.fillRect(x + q, y + q, s - q * 2, s - q * 2);
  g.fillStyle = lin(g, x, y, x + s, y + s, [[0, 'rgba(0,0,0,.2)'], [1, 'rgba(60,40,30,.4)']]);
  g.fillRect(x + q, y + q, s - q * 2, s - q * 2);
  g.strokeStyle = 'rgba(255,240,215,.4)';
  g.lineWidth = 1;
  g.strokeRect(x + 0.6, y + 0.6, s - 1.2, s - 1.2);
  g.strokeStyle = 'rgba(8,4,0,.8)';
  g.strokeRect(x + q, y + q, s - q * 2, s - q * 2);
}

function glassPane(g: G, x: number, y: number, w: number, h: number, glass: RGB, lit: number): void {
  g.fillStyle = lin(g, x, y, x + w, y + h, [[0, rgb(shift(glass, 70 + lit * 20), 0.95)], [0.5, rgb(glass, 0.95)], [1, rgb(shift(glass, -70), 0.95)]]);
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,.3)';
  g.beginPath();
  g.moveTo(x + w * 0.12, y);
  g.lineTo(x + w * 0.44, y);
  g.lineTo(x, y + h * 0.5);
  g.lineTo(x, y + h * 0.2);
  g.closePath();
  g.fill();
}

function skylight(g: G, r: Rnd, x: number, y: number, w: number, h: number, glass: RGB): void {
  g.fillStyle = 'rgba(8,4,12,.3)';
  g.fillRect(x + 4, y + 5, w, h);
  rectBody(g, x - 3, y - 3, w + 6, h + 6, 2, [76, 80, 90], { lw: 1.6 });
  glassPane(g, x, y, w, h, glass, 0);
  g.strokeStyle = 'rgba(40,44,52,.9)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h);
  g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2);
  g.stroke();
  g.strokeStyle = 'rgba(8,4,0,.8)';
  g.lineWidth = 1;
  g.strokeRect(x, y, w, h);
  if (r() < 2) {
    g.strokeStyle = 'rgba(255,255,255,.45)';
    g.beginPath(); g.moveTo(x + 2, y + h - 3); g.lineTo(x + w * 0.4, y + 2); g.stroke();
  }
}

/** Kvist på nedre fald: lille sadeltag med rygning ned ad taget og en lille front med vindue. */
function dormer(g: G, r: Rnd, cx: number, y0: number, dw: number, dl: number, mat: Mat, base: RGB, wear: number): void {
  const x0 = cx - dw / 2;
  // skygge på hovedtaget
  g.fillStyle = 'rgba(8,4,12,.3)';
  g.beginPath();
  g.moveTo(x0 + dw, y0 + 3);
  g.lineTo(x0 + dw + 8, y0 + 8);
  g.lineTo(x0 + dw + 8, y0 + dl + 14);
  g.lineTo(x0 + dw * 0.3, y0 + dl + 14);
  g.lineTo(x0 + dw, y0 + dl);
  g.closePath();
  g.fill();
  // frontvæg med vindue (set skråt nedefra)
  const wallH = dw * 0.34;
  rectBody(g, x0 + 2, y0 + dl - 2, dw - 4, wallH, 1, [214, 198, 168], { lw: 1.4 });
  g.fillStyle = 'rgb(28,34,44)';
  g.fillRect(cx - dw * 0.2, y0 + dl, dw * 0.4, wallH * 0.7);
  g.strokeStyle = 'rgba(210,190,150,.9)';
  g.lineWidth = 1.2;
  g.strokeRect(cx - dw * 0.2, y0 + dl, dw * 0.4, wallH * 0.7);
  g.beginPath(); g.moveTo(cx, y0 + dl); g.lineTo(cx, y0 + dl + wallH * 0.7); g.stroke();
  const rh = Math.max(4, rowHeight(dw, dl, mat) * 0.75);
  paintFace(g, r, [[x0, y0], [cx, y0], [cx, y0 + dl], [x0, y0 + dl]], [-1, 0], mat, 0.3, rh, base, wear);
  paintFace(g, r, [[cx, y0], [x0 + dw, y0], [x0 + dw, y0 + dl], [cx, y0 + dl]], [1, 0], mat, -0.4, rh, base, wear);
  ridgeLine(g, r, [cx, y0 + 1], [cx, y0 + dl], mat, base, rh * 1.3);
  g.strokeStyle = OUT;
  g.lineWidth = 1.8;
  g.strokeRect(x0, y0, dw, dl);
}

/** Hul i taget: rodede kanter, mørk loft med planker og blotlagte spær. */
function hole(g: G, r: Rnd, cx: number, cy: number, rx: number, ry: number, base: RGB): void {
  const pts = wobble(r, cx, cy, rx, ry, 13, 0.3, r() * 3);
  const path = polyPath(g, pts);
  // aflagte tagsten rundt om
  for (let i = 0; i < 9; i++) {
    const a = r() * 6.28;
    const d = 1.05 + r() * 0.35;
    const s = 4 + r() * 4;
    g.save();
    g.translate(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d);
    g.rotate(r() * 6);
    g.fillStyle = rgb(shift(base, (r() - 0.5) * 30 - 10));
    g.fillRect(-s / 2, -s * 0.6, s, s * 1.2);
    g.strokeStyle = 'rgba(20,8,2,.7)';
    g.lineWidth = 0.9;
    g.strokeRect(-s / 2, -s * 0.6, s, s * 1.2);
    g.restore();
  }
  path();
  g.fillStyle = 'rgb(14,10,8)';
  g.fill();
  clipped(g, path, () => {
    // loftgulvet lyses op nederst til højre
    g.fillStyle = lin(g, cx - rx, cy - ry, cx + rx, cy + ry, [[0, 'rgb(10,8,6)'], [0.55, 'rgb(30,22,16)'], [1, 'rgb(86,64,42)']]);
    g.fillRect(cx - rx * 1.4, cy - ry * 1.4, rx * 2.8, ry * 2.8);
    g.strokeStyle = 'rgba(0,0,0,.55)';
    g.lineWidth = 1;
    for (let i = -6; i < 7; i++) {
      g.beginPath();
      g.moveTo(cx - rx * 1.4, cy + i * ry * 0.3);
      g.lineTo(cx + rx * 1.4, cy + i * ry * 0.3 + 3);
      g.stroke();
    }
    mottle(g, r, [cx - rx, cy - ry, cx + rx, cy + ry], [90, 70, 50], 8, rx * 0.15, 18, 0.35);
  });
  // spær på tværs
  const n = 2 + ((r() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.7) / (n + 0.4);
    const x = cx - rx + t * rx * 2;
    const tilt = (r() - 0.5) * 0.18;
    tube(g, () => {
      g.beginPath();
      g.moveTo(x - Math.sin(tilt) * ry * 1.4, cy - ry * 1.15);
      g.lineTo(x + Math.sin(tilt) * ry * 1.4, cy + ry * 1.15);
    }, 4.2, [72, 50, 32], { outline: 1.6 });
  }
  path();
  g.strokeStyle = 'rgba(255,240,200,.28)';
  g.lineWidth = 1.2;
  g.save();
  g.translate(-1, -1);
  g.stroke();
  g.restore();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.8;
  g.lineJoin = 'round';
  g.stroke();
}

/** Sammenstyrtet område med sorte, forkullede bjælker, der stikker ud. */
function collapse(g: G, r: Rnd, w: number, h: number, base: RGB, left: boolean): void {
  const cx = (left ? -1 : 1) * w * 0.17;
  const rx = w * 0.26;
  const pts: Pt[] = [];
  const N = 18;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = 0.75 + r() * 0.5;
    pts.push([cx + Math.cos(a) * rx * k, Math.sin(a) * h * 0.46 * k * (0.9 + 0.1 * r())]);
  }
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i]!;
    pts[i] = [p[0] + (r() - 0.5) * 10, p[1] + (r() - 0.5) * 10];
  }
  const path = polyPath(g, pts);
  path();
  g.fillStyle = 'rgb(12,9,8)';
  g.fill();
  clipped(g, path, () => {
    g.fillStyle = lin(g, cx - rx, -h / 2, cx + rx, h / 2, [[0, 'rgb(8,6,5)'], [1, 'rgb(46,34,24)']]);
    g.fillRect(cx - rx * 1.5, -h / 2, rx * 3, h);
    mottle(g, r, [cx - rx, -h * 0.4, cx + rx, h * 0.4], [60, 44, 32], 18, 7, 16, 0.4);
  });
  // spær: tæt række sorte bjælker, nogle knækkede
  const spacing = 17;
  for (let x = cx - rx * 1.25; x < cx + rx * 1.25; x += spacing * (0.8 + r() * 0.4)) {
    const y0 = -h * 0.5 + r() * h * 0.15;
    const y1 = h * 0.5 - r() * h * 0.15;
    const tilt = (r() - 0.5) * 0.12;
    const brokenAt = r() < 0.4 ? 0.3 + r() * 0.4 : 1;
    tube(g, () => {
      g.beginPath();
      g.moveTo(x - tilt * h * 0.5, y0);
      g.lineTo(x + tilt * h * 0.5, y0 + (y1 - y0) * brokenAt);
    }, 3.6 + r() * 1.6, [30, 24, 22], { outline: 1.4 });
  }
  // rygbjælke langs midten
  tube(g, () => { g.beginPath(); g.moveTo(cx - rx * 1.2, 0); g.lineTo(cx + rx * 1.1, r() * 4 - 2); }, 6, [36, 28, 24], { outline: 1.6 });
  // lægter
  g.strokeStyle = 'rgba(70,50,36,.8)';
  g.lineWidth = 1.5;
  for (let y = -h * 0.4; y < h * 0.45; y += 14) {
    g.beginPath();
    g.moveTo(cx - rx * 1.1, y + (r() - 0.5) * 3);
    g.lineTo(cx + rx * 1.1, y + (r() - 0.5) * 3);
    g.stroke();
  }
  path();
  g.strokeStyle = 'rgba(255,238,200,.25)';
  g.lineWidth = 1.2;
  g.save();
  g.translate(-1, -1);
  g.stroke();
  g.restore();
  path();
  g.strokeStyle = OUT;
  g.lineWidth = 1.8;
  g.lineJoin = 'round';
  g.stroke();
  // tagsten og brokker rundt om
  for (let i = 0; i < 16; i++) {
    const p = pts[(r() * pts.length) | 0]!;
    const s = 3 + r() * 5;
    g.save();
    g.translate(p[0] + (r() - 0.5) * 24, p[1] + (r() - 0.5) * 24);
    g.rotate(r() * 6);
    g.fillStyle = rgb(shift(base, (r() - 0.5) * 36 - 6));
    g.fillRect(-s / 2, -s * 0.6, s, s * 1.2);
    g.strokeStyle = 'rgba(20,8,2,.7)';
    g.lineWidth = 0.9;
    g.strokeRect(-s / 2, -s * 0.6, s, s * 1.2);
    g.restore();
  }
}

function snowCover(g: G, r: Rnd, outline: Path, w: number, h: number, amount: number): void {
  g.save();
  outline();
  g.clip();
  const n = Math.round((w * h) / 150 * amount);
  const blobs: [number, number, number, number, number][] = [];
  for (let i = 0; i < n; i++) blobs.push([(r() - 0.5) * (w + 20), (r() - 0.5) * (h + 20), 6 + r() * 8, 0.55 + r() * 0.3, r() * 3]);
  for (const [dx, dy, col] of [[1.6, 2.4, 'rgba(112,134,176,.85)'], [0, 0, 'rgba(244,248,255,.97)']] as const) {
    g.fillStyle = col;
    g.beginPath();
    for (const [x, y, s, k, rot] of blobs) {
      g.moveTo(x + dx + s, y + dy);
      g.ellipse(x + dx, y + dy, s, s * k, rot, 0, 7);
    }
    g.fill();
  }
  // lysere glans øverst til venstre og kold skygge nederst til højre
  g.fillStyle = lin(g, -w / 2, -h / 2, w / 2, h / 2, [[0, 'rgba(255,255,255,.28)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(90,112,170,.3)']]);
  g.fillRect(-w / 2, -h / 2, w, h);
  g.restore();
}

function mossOver(g: G, r: Rnd, outline: Path, w: number, h: number, amount: number): void {
  if (amount <= 0.02) return;
  g.save();
  outline();
  g.clip();
  const n = Math.round(amount * 34);
  for (let i = 0; i < n; i++) {
    // mere mos i skyggen (nederst) og langs kanterne
    const x = (r() - 0.5) * w;
    const y = (Math.pow(r(), 0.7) - 0.4) * h * 1.0;
    mossPatch(g, r, x, y, 10 + r() * 22 * (0.5 + amount), 10 + ((r() * 8) | 0));
  }
  g.restore();
}

// ------------------------------------------------------------------ glastage

function glassGable(g: G, r: Rnd, w: number, h: number, glass: RGB, cracked: boolean): { outline: Path } {
  const x = w / 2;
  const y = h / 2;
  const ps = Math.max(16, Math.min(26, Math.min(w, h) / 6));
  const faces: [number, number, number][] = [[-y, 0, 0.5], [0, y, -0.5]];
  const frame: RGB = [64, 68, 76];
  g.fillStyle = 'rgb(30,32,36)';
  g.fillRect(-x, -y, w, h);
  for (const [ya, yb, lit] of faces) {
    const cols = Math.max(3, Math.round(w / ps));
    const rows = Math.max(2, Math.round((yb - ya) / (ps * 1.1)));
    const cw = w / cols;
    const ch = (yb - ya) / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        glassPane(g, -x + i * cw + 1, ya + j * ch + 1, cw - 2, ch - 2, glass, lit);
        if (cracked && r() < 0.12) {
          g.strokeStyle = 'rgba(20,30,36,.75)';
          g.lineWidth = 0.9;
          const px = -x + i * cw + cw / 2;
          const py = ya + j * ch + ch / 2;
          g.beginPath();
          g.moveTo(px - cw * 0.4, py - ch * 0.3); g.lineTo(px, py); g.lineTo(px + cw * 0.3, py - ch * 0.4);
          g.moveTo(px, py); g.lineTo(px + cw * 0.2, py + ch * 0.4);
          g.stroke();
        }
      }
    }
    g.fillStyle = lit > 0 ? 'rgba(255,255,255,.04)' : 'rgba(6,10,40,.22)';
    g.fillRect(-x, ya, w, yb - ya);
    // sprosser
    g.strokeStyle = rgb(frame);
    g.lineWidth = 2.2;
    g.beginPath();
    for (let i = 0; i <= cols; i++) { g.moveTo(-x + i * cw, ya); g.lineTo(-x + i * cw, yb); }
    for (let j = 0; j <= rows; j++) { g.moveTo(-x, ya + j * ch); g.lineTo(x, ya + j * ch); }
    g.stroke();
    g.strokeStyle = 'rgba(190,200,215,.4)';
    g.lineWidth = 0.8;
    g.beginPath();
    for (let i = 0; i <= cols; i++) { g.moveTo(-x + i * cw - 0.8, ya); g.lineTo(-x + i * cw - 0.8, yb); }
    g.stroke();
  }
  ridgeLine(g, r, [-x + 1, 0], [x - 1, 0], 'glass', glass, Math.max(6, ps * 0.4));
  // kroner på ryggen
  for (let i = 0; i <= 6; i++) rivet(g, -x + 4 + (i / 6) * (w - 8), 0, 2.4, [150, 154, 164]);
  return { outline: () => { g.beginPath(); g.rect(-x, -y, w, h); } };
}

// ------------------------------------------------------------------ varianter

type Shape = 'gable' | 'hip' | 'cone' | 'l';
interface Def {
  key: string;
  name: string;
  shape: Shape;
  mat: Mat;
  w: number;
  h: number;
  chimney?: boolean;
  dormer?: boolean;
  skylight?: boolean;
  hole?: boolean;
  collapse?: boolean;
  snow?: boolean;
  moss?: number;
  wear?: number;
  tags?: string[];
}

function drawRoof(g: G, o: DrawInput, d: Def): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const base = baseOf(d.mat, o);
  const wear = param(o, 'wear', d.wear ?? 0.3);
  let outline: Path;
  let ridge: [Pt, Pt] | undefined;
  if (d.shape === 'gable') ({ outline, ridge } = gableRoof(g, r, w, h, d.mat, base, wear));
  else if (d.shape === 'hip') ({ outline, ridge } = hipRoof(g, r, w, h, d.mat, base, wear));
  else if (d.shape === 'cone') ({ outline } = coneRoof(g, r, w, h, d.mat, base, wear));
  else ({ outline } = lRoof(g, r, w, h, d.mat, base, wear));
  void ridge;
  const rh = rowHeight(w, h, d.mat);
  if (d.dormer && (d.shape === 'gable')) {
    const dw = Math.max(34, Math.min(64, w * 0.17));
    for (const px of [-w * 0.24, w * 0.24]) {
      dormer(g, r, px + (r() - 0.5) * w * 0.05, h * 0.06, dw, h * 0.26, d.mat, base, wear);
    }
  }
  if (d.skylight && d.shape !== 'cone') {
    const sw = Math.max(26, Math.min(44, w * 0.11));
    skylight(g, r, w * 0.12, -h * 0.34, sw, sw * 1.2, TONES.glass[0]!.col);
  }
  if (d.hole) hole(g, r, (r() - 0.5) * w * 0.2, h * 0.04 + (r() - 0.5) * h * 0.1, w * 0.17, Math.min(h * 0.24, w * 0.14), base);
  if (d.collapse) collapse(g, r, w, h, base, r() < 0.5);
  mossOver(g, r, outline, w, h, param(o, 'moss', d.moss ?? 0));
  if (d.snow) snowCover(g, r, outline, w, h, 1);
  eave(g, outline);
  if (param(o, 'chimney', !!d.chimney) && d.shape !== 'cone') {
    const s = Math.max(24, Math.min(40, Math.min(w, h) * 0.12));
    const hx = d.shape === 'l' ? w * 0.18 : (r() < 0.5 ? -1 : 1) * w * (0.18 + r() * 0.18);
    chimney(g, r, hx - s / 2, d.shape === 'l' ? -h * 0.4 : -h * 0.22, s);
  }
  void rh;
}

const DEFS: Def[] = [
  // saddeltage
  { key: 'roof_thatch_cottage', name: 'Stråtag, sadeltag', shape: 'gable', mat: 'thatch', w: 5, h: 4, tags: ['village', 'poor', 'farm'] },
  { key: 'roof_thatch_long', name: 'Stråtag, langhus', shape: 'gable', mat: 'thatch', w: 8, h: 4, chimney: true, tags: ['village', 'farm', 'poor'] },
  { key: 'roof_tile_small', name: 'Teglsten, lille hus', shape: 'gable', mat: 'tile', w: 3, h: 3, tags: ['village', 'city'] },
  { key: 'roof_tile_house', name: 'Teglsten, hus', shape: 'gable', mat: 'tile', w: 6, h: 4, chimney: true, tags: ['village', 'city', 'tavern'] },
  { key: 'roof_tile_large', name: 'Teglsten, stort hus', shape: 'gable', mat: 'tile', w: 8, h: 6, chimney: true, tags: ['city', 'rich', 'tavern'] },
  { key: 'roof_tile_dormers', name: 'Teglsten med kviste', shape: 'gable', mat: 'tile', w: 8, h: 6, dormer: true, chimney: true, tags: ['city', 'rich'] },
  { key: 'roof_slate_house', name: 'Skifer, hus', shape: 'gable', mat: 'slate', w: 6, h: 4, chimney: true, tags: ['city', 'rich'] },
  { key: 'roof_slate_hall', name: 'Skifer, hal', shape: 'gable', mat: 'slate', w: 8, h: 6, skylight: true, tags: ['city', 'rich', 'temple', 'military'] },
  { key: 'roof_shingle_cabin', name: 'Træspåner, hytte', shape: 'gable', mat: 'shingle', w: 4, h: 3, chimney: true, tags: ['village', 'forest', 'poor'] },
  { key: 'roof_shingle_barn', name: 'Træspåner, lade', shape: 'gable', mat: 'shingle', w: 8, h: 6, tags: ['farm', 'village'] },
  { key: 'roof_mossy_tile', name: 'Mosbevokset teglsten', shape: 'gable', mat: 'tile', w: 5, h: 4, moss: 0.8, wear: 0.6, tags: ['forest', 'swamp', 'ruin', 'village'] },
  { key: 'roof_mossy_shingle', name: 'Mosbevoksede spåner', shape: 'gable', mat: 'shingle', w: 4, h: 3, moss: 0.9, wear: 0.6, tags: ['forest', 'swamp', 'poor'] },
  { key: 'roof_snow_house', name: 'Snedækt tag', shape: 'gable', mat: 'slate', w: 6, h: 4, snow: true, chimney: true, tags: ['arctic', 'mountain', 'village'] },
  { key: 'roof_snow_thatch', name: 'Snedækt stråtag', shape: 'gable', mat: 'thatch', w: 5, h: 4, snow: true, tags: ['arctic', 'village', 'poor'] },
  // valmtage og pyramide
  { key: 'roof_tile_hip', name: 'Valmtag, teglsten', shape: 'hip', mat: 'tile', w: 6, h: 4, chimney: true, tags: ['city', 'rich', 'village'] },
  { key: 'roof_tile_hip_sq', name: 'Valmtag, kvadratisk', shape: 'hip', mat: 'tile', w: 6, h: 6, tags: ['city', 'rich', 'village'] },
  { key: 'roof_slate_hip', name: 'Valmtag, skifer', shape: 'hip', mat: 'slate', w: 8, h: 6, chimney: true, tags: ['city', 'rich', 'military'] },
  { key: 'roof_thatch_hip', name: 'Valmtag, stråtag', shape: 'hip', mat: 'thatch', w: 5, h: 5, tags: ['village', 'farm', 'poor'] },
  { key: 'roof_slate_pyramid', name: 'Pyramidetag, skifer', shape: 'hip', mat: 'slate', w: 3, h: 3, tags: ['military', 'city', 'rich'] },
  { key: 'roof_tile_pyramid', name: 'Pyramidetag, teglsten', shape: 'hip', mat: 'tile', w: 4, h: 4, tags: ['village', 'city'] },
  // kegletage
  { key: 'roof_tile_cone', name: 'Kegletag, teglsten', shape: 'cone', mat: 'tile', w: 4, h: 4, tags: ['city', 'military', 'rich'] },
  { key: 'roof_slate_cone', name: 'Kegletag, skifer', shape: 'cone', mat: 'slate', w: 3, h: 3, tags: ['military', 'rich', 'city'] },
  { key: 'roof_thatch_cone', name: 'Kegletag, stråtag', shape: 'cone', mat: 'thatch', w: 4, h: 4, tags: ['village', 'farm', 'poor'] },
  { key: 'roof_shingle_cone', name: 'Kegletag, træspåner', shape: 'cone', mat: 'shingle', w: 3, h: 3, tags: ['forest', 'village', 'military'] },
  { key: 'roof_snow_cone', name: 'Snedækt kegletag', shape: 'cone', mat: 'slate', w: 3, h: 3, snow: true, tags: ['arctic', 'mountain', 'military'] },
  // L-form
  { key: 'roof_tile_l', name: 'L-formet tag, teglsten', shape: 'l', mat: 'tile', w: 6, h: 6, chimney: true, tags: ['city', 'rich', 'village'] },
  { key: 'roof_slate_l', name: 'L-formet tag, skifer', shape: 'l', mat: 'slate', w: 8, h: 6, chimney: true, tags: ['city', 'rich'] },
  { key: 'roof_thatch_l', name: 'L-formet stråtag', shape: 'l', mat: 'thatch', w: 6, h: 6, tags: ['village', 'farm'] },
  // ruin
  { key: 'roof_hole_tile', name: 'Tag med hul, teglsten', shape: 'gable', mat: 'tile', w: 5, h: 4, hole: true, wear: 0.8, moss: 0.2, tags: ['ruin', 'village'] },
  { key: 'roof_hole_thatch', name: 'Tag med hul, stråtag', shape: 'gable', mat: 'thatch', w: 5, h: 4, hole: true, wear: 0.8, tags: ['ruin', 'village', 'poor'] },
  { key: 'roof_collapsed', name: 'Faldefærdigt tag', shape: 'gable', mat: 'tile', w: 6, h: 4, collapse: true, wear: 0.9, moss: 0.15, tags: ['ruin', 'battlefield'] },
  { key: 'roof_collapsed_slate', name: 'Faldefærdigt skifertag', shape: 'gable', mat: 'slate', w: 8, h: 6, collapse: true, wear: 0.9, tags: ['ruin', 'battlefield'] },
];

const roofKinds: ObjectKind[] = DEFS.map((d) =>
  kind({
    key: d.key,
    family: 'roof',
    name: d.name,
    w: d.w,
    h: d.h,
    keepAspect: true,
    randomRotation: false,
    shadow: 0,
    bleed: 0.01,
    tags: d.tags ?? ['village'],
    params: [toneParam(d.mat), wearParam(d.wear ?? 0.3), ...(d.snow ? [] : [mossParam(d.moss ?? 0)]), ...(d.shape === 'cone' ? [] : [chimneyParam(!!d.chimney)])],
    draw: (g, o) => drawRoof(g, o, d),
  }),
);

// glastage
const glassKinds: ObjectKind[] = [
  kind({
    key: 'roof_glass_skylight', family: 'roof', name: 'Glasoverlys', w: 3, h: 3, shadow: 0, bleed: 0.01,
    tags: ['rich', 'city', 'temple'],
    params: [toneParam('glass'), { key: 'cracked', label: 'Revnet', type: 'toggle', default: false }],
    draw: (g, o) => {
      const r = rng(o.seed);
      const { outline } = glassGable(g, r, o.w, o.h, baseOf('glass', o), param(o, 'cracked', false));
      eave(g, outline);
    },
  }),
  kind({
    key: 'roof_glass_hall', family: 'roof', name: 'Glastag, orangeri', w: 6, h: 4, shadow: 0, bleed: 0.01,
    tags: ['rich', 'city', 'temple', 'house'],
    params: [toneParam('glass'), { key: 'cracked', label: 'Revnet', type: 'toggle', default: false }],
    draw: (g, o) => {
      const r = rng(o.seed);
      const { outline } = glassGable(g, r, o.w, o.h, baseOf('glass', o), param(o, 'cracked', false));
      eave(g, outline);
    },
  }),
  kind({
    key: 'roof_glass_dome', family: 'roof', name: 'Glaskuppel', w: 4, h: 4, shadow: 0, bleed: 0.01,
    tags: ['rich', 'temple', 'magic'],
    params: [toneParam('glass')],
    draw: (g, o) => {
      const r = rng(o.seed);
      const R = Math.min(o.w, o.h) / 2;
      const glass = baseOf('glass', o);
      g.beginPath();
      g.arc(0, 0, R, 0, 7);
      g.fillStyle = 'rgb(30,32,36)';
      g.fill();
      const sectors = 12;
      const rings = 4;
      for (let i = 0; i < sectors; i++) {
        for (let j = 0; j < rings; j++) {
          const a0 = (i / sectors) * Math.PI * 2;
          const a1 = ((i + 1) / sectors) * Math.PI * 2;
          const r0 = (j / rings) * R + 1;
          const r1 = ((j + 1) / rings) * R - 1;
          g.beginPath();
          g.arc(0, 0, r1, a0 + 0.02, a1 - 0.02);
          g.arc(0, 0, r0, a1 - 0.02, a0 + 0.02, true);
          g.closePath();
          const lit = Math.cos((a0 + a1) / 2 - (Math.PI * 5) / 4);
          g.fillStyle = rgb(shift(glass, lit * 36 - 4 + (r() - 0.5) * 12), 0.96);
          g.fill();
        }
      }
      g.strokeStyle = 'rgb(62,66,74)';
      g.lineWidth = 2.2;
      g.beginPath();
      for (let i = 0; i < sectors; i++) { g.moveTo(0, 0); g.lineTo(Math.cos((i / sectors) * 6.2832) * R, Math.sin((i / sectors) * 6.2832) * R); }
      g.stroke();
      for (let j = 1; j <= rings; j++) { g.beginPath(); g.arc(0, 0, (j / rings) * R, 0, 7); g.stroke(); }
      g.fillStyle = radial(g, -R * 0.3, -R * 0.35, R * 0.7, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]);
      g.beginPath();
      g.arc(0, 0, R, 0, 7);
      g.fill();
      rivet(g, 0, 0, R * 0.09, [176, 150, 80]);
      g.beginPath();
      g.arc(0, 0, R, 0, 7);
      g.strokeStyle = OUT;
      g.lineWidth = 2.4;
      g.stroke();
    },
  }),
];

export const roofsKinds: ObjectKind[] = [...roofKinds, ...glassKinds];
