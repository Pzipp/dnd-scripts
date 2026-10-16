/**
 * Frisætning af genstande fra et billede (importen af egne genstande): finder baggrunden, gør den gennemsigtig og skærer
 * hver genstand ud. Ren pixelregning uden DOM, så det kan testes. Billedet er `{ width, height, data }` med RGBA.
 *
 * Baggrunden findes ud fra billedets kant og fjernes kun, hvor den hænger sammen med kanten. Hvid i en genstand
 * (sne, knogler, en lys sten) bliver derfor stående. Et ternet "gennemsigtigt" mønster, som billedgeneratorer tegner ind,
 * behandles som baggrund med to toner.
 */
export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export type Rgb = [number, number, number];

export interface CutoutOptions {
  /** Hvor langt en pixel må være fra baggrundsfarven (RGB-afstand) og stadig være baggrund. */
  tolerance: number;
  /** Dele af en genstand, der ligger nærmere end dette (pixels), regnes for samme genstand. */
  mergeGap: number;
  /** Fjern også baggrund inde i genstanden (huller, fx mellem stolens ben). */
  fillHoles: boolean;
  /** Mindste areal (pixels) for en genstand; mindre pletter ignoreres. */
  minArea?: number;
}

export interface Background {
  /** Én eller flere baggrundsfarver (to ved et ternet mønster). */
  colors: Rgb[];
  /** Billedet er allerede gennemsigtigt langs kanten. */
  transparent: boolean;
}

export interface Cutout {
  /** Udsnittets placering i kildebilledet. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Udskåret billede (RGBA) med gennemsigtig baggrund. */
  raster: Raster;
  /** Antal ikke-gennemsigtige pixels. */
  area: number;
}

export const DEFAULT_TOLERANCE = 30;
const EDGE_ALPHA = 24;

export function defaultOptions(r: Pick<Raster, 'width' | 'height'>): CutoutOptions {
  return { tolerance: DEFAULT_TOLERANCE, mergeGap: Math.max(4, Math.round(0.012 * Math.max(r.width, r.height))), fillHoles: false };
}

/** Finder baggrunden ud fra de yderste pixels. */
export function findBackground(r: Raster): Background {
  const { width: w, height: h, data } = r;
  const ring = Math.min(2, Math.floor(Math.min(w, h) / 2));
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  let clear = 0;
  const visit = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    total++;
    if (data[i + 3]! < 128) {
      clear++;
      return;
    }
    const key = ((data[i]! >> 4) << 8) | ((data[i + 1]! >> 4) << 4) | (data[i + 2]! >> 4);
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n++;
    b.r += data[i]!;
    b.g += data[i + 1]!;
    b.b += data[i + 2]!;
    buckets.set(key, b);
  };
  for (let d = 0; d < ring; d++) {
    for (let x = 0; x < w; x++) {
      visit(x, d);
      visit(x, h - 1 - d);
    }
    for (let y = ring; y < h - ring; y++) {
      visit(d, y);
      visit(w - 1 - d, y);
    }
  }
  if (clear >= total * 0.5) return { colors: [], transparent: true };
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  const colors: Rgb[] = [];
  for (const b of sorted) {
    if (colors.length >= 3) break;
    if (colors.length > 0 && b.n < total * 0.1) break;
    colors.push([Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)]);
  }
  return { colors, transparent: false };
}

const dist2 = (r: number, g: number, b: number, c: Rgb) => (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;

/** Pixels, der ligner baggrunden (uden at spørge, om de hænger sammen med kanten). */
function lookalike(r: Raster, bg: Background, tol: number): Uint8Array {
  const { width: w, height: h, data } = r;
  const out = new Uint8Array(w * h);
  const t2 = tol * tol;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    if (data[i + 3]! < 128) {
      out[p] = 1;
      continue;
    }
    for (const c of bg.colors) {
      if (dist2(data[i]!, data[i + 1]!, data[i + 2]!, c) <= t2) {
        out[p] = 1;
        break;
      }
    }
  }
  return out;
}

/** Breddesøgning fra kanten over `like`-pixels. 1 = baggrund. */
function floodFromBorder(like: Uint8Array, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const push = (p: number) => {
    if (like[p] && !mask[p]) {
      mask[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (head < tail) {
    const p = queue[head++]!;
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }
  return mask;
}

/** Fjerner lukkede baggrundsområder (huller) på mindst `minHole` pixels fra `mask` (sætter dem til 1). */
function fillEnclosed(like: Uint8Array, mask: Uint8Array, w: number, h: number, minHole: number): void {
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (!like[s] || mask[s] || seen[s]) continue;
    let head = 0;
    let tail = 0;
    seen[s] = 1;
    queue[tail++] = s;
    while (head < tail) {
      const p = queue[head++]!;
      const x = p % w;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < w * (h - 1) ? p + w : -1];
      for (const q of nb) {
        if (q >= 0 && like[q] && !mask[q] && !seen[q]) {
          seen[q] = 1;
          queue[tail++] = q;
        }
      }
    }
    if (tail >= minHole) for (let k = 0; k < tail; k++) mask[queue[k]!] = 1;
  }
}

/**
 * Gennemsigtig version af billedet: baggrunden væk, og kanten blødgjort, så der ikke er en lys kant rundt om genstanden.
 * Kantpixels (de to yderste rækker) regnes som en blanding af baggrund og genstand og får farven trukket ud af baggrunden.
 */
export function removeBackground(src: Raster, bg: Background, opt: Pick<CutoutOptions, 'tolerance' | 'fillHoles'>): Raster {
  const { width: w, height: h } = src;
  const out: Raster = { width: w, height: h, data: new Uint8ClampedArray(src.data) };
  const d = out.data;
  const like = lookalike(src, bg, opt.tolerance);
  const mask = floodFromBorder(like, w, h);
  if (opt.fillHoles) fillEnclosed(like, mask, w, h, 60);
  for (let p = 0; p < w * h; p++) if (mask[p]) d[p * 4 + 3] = 0;
  if (bg.transparent) return out; // billedet har sin egen gennemsigtighed; den bevares

  // afstand til baggrunden (1 eller 2 pixels) for de pixels, der bliver tilbage
  const depth = new Uint8Array(w * h);
  const near = (p: number, test: (q: number) => boolean) => {
    const x = p % w;
    return (x > 0 && test(p - 1)) || (x < w - 1 && test(p + 1)) || (p >= w && test(p - w)) || (p < w * (h - 1) && test(p + w));
  };
  for (let p = 0; p < w * h; p++) if (!mask[p] && near(p, (q) => mask[q] === 1)) depth[p] = 1;
  for (let p = 0; p < w * h; p++) if (!mask[p] && !depth[p] && near(p, (q) => depth[q] === 1)) depth[p] = 2;

  const edge: number[] = [];
  for (let p = 0; p < w * h; p++) if (depth[p]) edge.push(p);
  const alpha = new Map<number, number>();
  const color = new Map<number, Rgb>();
  for (const p of edge) {
    const x = p % w;
    const y = (p - x) / w;
    // lokal baggrund (gennemsnit af baggrundspixels i 5×5) og lokal genstand (pixels uden for kantbåndet i 9×9)
    let br = 0, bgc = 0, bb = 0, bn = 0;
    let fr = 0, fg = 0, fb = 0, fn = 0;
    for (let dy = -4; dy <= 4; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -4; dx <= 4; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= w) continue;
        const q = yy * w + xx;
        const i = q * 4;
        if (mask[q]) {
          if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
            br += src.data[i]!;
            bgc += src.data[i + 1]!;
            bb += src.data[i + 2]!;
            bn++;
          }
        } else if (!depth[q]) {
          fr += src.data[i]!;
          fg += src.data[i + 1]!;
          fb += src.data[i + 2]!;
          fn++;
        }
      }
    }
    if (!fn) continue; // helt smal del: lad den være
    const i = p * 4;
    const f: Rgb = [fr / fn, fg / fn, fb / fn];
    let b: Rgb;
    if (bn) b = [br / bn, bgc / bn, bb / bn];
    else {
      let best = bg.colors[0]!;
      for (const c of bg.colors) if (dist2(f[0], f[1], f[2], c) > dist2(f[0], f[1], f[2], best)) best = c;
      b = best;
    }
    const v: Rgb = [f[0] - b[0], f[1] - b[1], f[2] - b[2]];
    const vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    if (vv < 20 * 20) continue; // genstanden ligner baggrunden: ingen pålidelig blanding at trække ud
    const pr = src.data[i]! - b[0], pg = src.data[i + 1]! - b[1], pb = src.data[i + 2]! - b[2];
    const a = Math.min(1, Math.max(0, (pr * v[0] + pg * v[1] + pb * v[2]) / vv));
    if (a > 0.97) continue;
    alpha.set(p, a);
    if (a >= 0.08) color.set(p, [b[0] + pr / a, b[1] + pg / a, b[2] + pb / a]);
  }
  for (const [p, a] of alpha) {
    const i = p * 4;
    const c = color.get(p);
    if (!c) {
      d[i + 3] = 0;
      continue;
    }
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
    d[i + 3] = Math.round(a * 255);
  }
  return out;
}

/** Udvider `fg` med `g` pixels i alle retninger (kvadratisk kerne, to gennemløb). */
function dilate(fg: Uint8Array, w: number, h: number, g: number): Uint8Array {
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -1e9;
    const row = y * w;
    for (let x = 0; x < w; x++) if (fg[row + x]) last = x, tmp[row + x] = 1;
    else if (x - last <= g) tmp[row + x] = 1;
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) if (fg[row + x]) last = x;
    else if (last - x <= g) tmp[row + x] = 1;
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) if (tmp[y * w + x]) last = y, out[y * w + x] = 1;
    else if (y - last <= g) out[y * w + x] = 1;
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) if (tmp[y * w + x]) last = y;
    else if (last - y <= g) out[y * w + x] = 1;
  }
  return out;
}

/** Skærer hver genstand ud af et billede, hvor baggrunden allerede er gennemsigtig. Sorteret række for række. */
export function findObjects(r: Raster, opt: Pick<CutoutOptions, 'mergeGap' | 'minArea'>): Cutout[] {
  const { width: w, height: h, data } = r;
  const fg = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) if (data[p * 4 + 3]! >= EDGE_ALPHA) fg[p] = 1;
  const wide = dilate(fg, w, h, Math.max(0, Math.round(opt.mergeGap)));
  // sammenhængende områder i den udvidede maske = én genstand
  const label = new Int32Array(w * h);
  const queue = new Int32Array(w * h);
  const groups: { minx: number; miny: number; maxx: number; maxy: number; area: number }[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!wide[s] || label[s]) continue;
    const id = groups.length + 1;
    const gr = { minx: w, miny: h, maxx: -1, maxy: -1, area: 0 };
    let head = 0;
    let tail = 0;
    label[s] = id;
    queue[tail++] = s;
    while (head < tail) {
      const p = queue[head++]!;
      const x = p % w;
      const y = (p - x) / w;
      if (fg[p]) {
        gr.area++;
        if (x < gr.minx) gr.minx = x;
        if (x > gr.maxx) gr.maxx = x;
        if (y < gr.miny) gr.miny = y;
        if (y > gr.maxy) gr.maxy = y;
      }
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx;
          if (wide[q] && !label[q]) {
            label[q] = id;
            queue[tail++] = q;
          }
        }
      }
    }
    groups.push(gr);
  }
  const minArea = opt.minArea ?? Math.max(60, Math.round(0.0003 * w * h));
  const found: (Cutout & { id: number })[] = [];
  groups.forEach((gr, k) => {
    if (gr.area < minArea) return;
    const x0 = Math.max(0, gr.minx - 1);
    const y0 = Math.max(0, gr.miny - 1);
    const cw = Math.min(w, gr.maxx + 2) - x0;
    const ch = Math.min(h, gr.maxy + 2) - y0;
    const out = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const p = (y0 + y) * w + (x0 + x);
        if (label[p] !== k + 1 || !fg[p]) continue;
        const i = p * 4;
        const o = (y * cw + x) * 4;
        out[o] = data[i]!;
        out[o + 1] = data[i + 1]!;
        out[o + 2] = data[i + 2]!;
        out[o + 3] = data[i + 3]!;
      }
    }
    found.push({ id: k + 1, x: x0, y: y0, w: cw, h: ch, raster: { width: cw, height: ch, data: out }, area: gr.area });
  });
  return readingOrder(found).map(({ id: _id, ...c }) => c);
}

/** Række for række, venstre mod højre: genstande med næsten samme midte (lodret) hører til samme række. */
function readingOrder<T extends { x: number; y: number; w: number; h: number }>(list: T[]): T[] {
  if (list.length < 2) return list;
  const heights = list.map((c) => c.h).sort((a, b) => a - b);
  const band = Math.max(8, heights[Math.floor(heights.length / 2)]! * 0.6);
  const byY = [...list].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const rows: T[][] = [];
  for (const c of byY) {
    const cy = c.y + c.h / 2;
    const row = rows[rows.length - 1];
    if (row && Math.abs(cy - row.reduce((s, o) => s + o.y + o.h / 2, 0) / row.length) <= band) row.push(c);
    else rows.push([c]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x));
}

/** Hele vejen: baggrund væk, og del billedet i genstande. */
export function cutOut(src: Raster, opt: CutoutOptions, bg: Background = findBackground(src)): Cutout[] {
  return findObjects(removeBackground(src, bg, opt), opt);
}

/**
 * Foreslået størrelse (i felter) ud fra, hvor store genstandene er i forhold til hinanden: den midterste genstand
 * får `base` felter på sit længste led, de andre følger forholdet. Afrundet til halve felter.
 */
export function suggestSizes(cuts: Pick<Cutout, 'w' | 'h'>[], base = 2): number[] {
  if (!cuts.length) return [];
  const dims = cuts.map((c) => Math.max(c.w, c.h));
  const sorted = [...dims].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  return dims.map((d) => Math.min(10, Math.max(0.5, Math.round(((d / median) * base) * 2) / 2)));
}
