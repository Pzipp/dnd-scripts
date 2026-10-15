import type { GroundData } from '../model/ground';
import { CELL_PX } from '../model/types';
import { isVoid, materialById, MATERIAL_WATER, rimShade, shade, shadeOut } from './materials';
import { fbm, smoothstep, valueNoise } from './noise';
import { isStoneMaterial, stone, stoneAt, stoneColor } from './stones';

/** Det, vi skriver pixels i (ImageData passer; i tests bruges et simpelt objekt). */
export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Afstanden (verdenspixels) mellem punkterne i vægtgitteret. Gitteret ligger fast i verdenen, så fliser passer sammen. */
const STEP = CELL_PX / 8;
/** Hvor langt en maskecelle rækker, når materialerne blandes (verdenspixels). Bestemmer, hvor blød en overgang er. */
const RADIUS = 22;
const PATH_RADIUS = 17;

/**
 * Glattede vægte: for hvert punkt i gitteret hvor stor en del af omgivelserne (inden for `radius`) der har hvert materiale.
 * Vægtene mellem punkterne findes ved bilineær interpolation pr. pixel, så en overgang bliver blød og følger malingen,
 * uden at hver pixel skal slå mange maskeceller op.
 */
interface Weights {
  /** Gitterpunktets indeks for første kolonne og række. */
  gx0: number;
  gy0: number;
  nx: number;
  ny: number;
  ids: number[];
  w: Float32Array[];
}

function buildWeights(mask: Uint8Array, mw: number, mh: number, cell: number, wx0: number, wy0: number, wx1: number, wy1: number, radius: number): Weights {
  const gx0 = Math.floor(wx0 / STEP) - 1;
  const gy0 = Math.floor(wy0 / STEP) - 1;
  const nx = Math.ceil(wx1 / STEP) + 2 - gx0;
  const ny = Math.ceil(wy1 / STEP) + 2 - gy0;
  // hvilke materialer findes i området (med margen)?
  const cx0 = Math.max(0, Math.floor((gx0 * STEP - radius) / cell));
  const cy0 = Math.max(0, Math.floor((gy0 * STEP - radius) / cell));
  const cx1 = Math.min(mw - 1, Math.floor(((gx0 + nx) * STEP + radius) / cell));
  const cy1 = Math.min(mh - 1, Math.floor(((gy0 + ny) * STEP + radius) / cell));
  const slot = new Int16Array(256).fill(-1);
  const ids: number[] = [];
  for (let y = cy0; y <= cy1; y++) {
    for (let x = cx0; x <= cx1; x++) {
      const id = mask[y * mw + x]!;
      if (slot[id]! < 0) {
        slot[id] = ids.length;
        ids.push(id);
      }
    }
  }
  const w = ids.map(() => new Float32Array(nx * ny));
  if (ids.length === 1) {
    w[0]!.fill(1);
    return { gx0, gy0, nx, ny, ids, w };
  }
  const r2 = radius * radius;
  const span = Math.ceil(radius / cell) + 1;
  const acc = new Float64Array(ids.length);
  for (let j = 0; j < ny; j++) {
    const py = (gy0 + j) * STEP;
    const cyc = Math.floor(py / cell);
    for (let i = 0; i < nx; i++) {
      const px = (gx0 + i) * STEP;
      const cxc = Math.floor(px / cell);
      acc.fill(0);
      let total = 0;
      for (let cy = cyc - span; cy <= cyc + span; cy++) {
        const dy = (cy + 0.5) * cell - py;
        const my = Math.min(mh - 1, Math.max(0, cy));
        for (let cx = cxc - span; cx <= cxc + span; cx++) {
          const dx = (cx + 0.5) * cell - px;
          const d2 = dx * dx + dy * dy;
          if (d2 >= r2) continue;
          const k = 1 - d2 / r2;
          const wgt = k * k;
          const mx = Math.min(mw - 1, Math.max(0, cx));
          const s = slot[mask[my * mw + mx]!]!;
          if (s < 0) continue; // uden for det område, vi har set på (kun ved kanten af laget)
          acc[s] = acc[s]! + wgt;
          total += wgt;
        }
      }
      const at = j * nx + i;
      if (total > 0) for (let s = 0; s < ids.length; s++) w[s]![at] = acc[s]! / total;
    }
  }
  return { gx0, gy0, nx, ny, ids, w };
}

/** Sandsynligheden for materiale nr. `s` i verdenspunktet, fra vægtgitteret (fx, fy er gitterets brøkdel). */
function weightAt(wt: Weights, s: number, base: number, nx: number, fx: number, fy: number): number {
  const a = wt.w[s]!;
  const top = a[base]! * (1 - fx) + a[base + 1]! * fx;
  const bot = a[base + nx]! * (1 - fx) + a[base + nx + 1]! * fx;
  return top * (1 - fy) + bot * fy;
}

/** Som `buildWeights`, men kun for ét punkt og ét materiale: andelen af omgivelserne (inden for `radius`) med materialet `id`. */
function shareAt(mask: Uint8Array, mw: number, mh: number, cell: number, px: number, py: number, radius: number, id: number): number {
  const r2 = radius * radius;
  const span = Math.ceil(radius / cell) + 1;
  const cxc = Math.floor(px / cell);
  const cyc = Math.floor(py / cell);
  let acc = 0;
  let total = 0;
  for (let cy = cyc - span; cy <= cyc + span; cy++) {
    const dy = (cy + 0.5) * cell - py;
    const my = Math.min(mh - 1, Math.max(0, cy));
    for (let cx = cxc - span; cx <= cxc + span; cx++) {
      const dx = (cx + 0.5) * cell - px;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      const k = 1 - d2 / r2;
      const wgt = k * k;
      total += wgt;
      if (mask[my * mw + Math.min(mw - 1, Math.max(0, cx))] === id) acc += wgt;
    }
  }
  return total > 0 ? acc / total : 0;
}

const WATER_FOAM: [number, number, number] = [236, 246, 248];

/**
 * Tegner terrænet i et område: bufferens pixel (0, 0) ligger i verdenspunktet (x0, y0), og `scale` er pixels pr. verdenspixel.
 * Maskens celler glattes til vægte pr. materiale; to materialer blandes blødt, og overgangens kant forskydes med støj,
 * så den bliver organisk (hårde materialer som brosten og fliser får en skarpere kant). Stier ligger oven på og blandes
 * med det terræn, de ligger på.
 */
export function renderGroundTile(buf: PixelBuffer, ground: GroundData, seed: number, x0: number, y0: number, scale: number): void {
  const { w: mw, h: mh, data: mask } = ground;
  const out = buf.data;
  const wx1 = x0 + buf.width / scale;
  const wy1 = y0 + buf.height / scale;
  const cell = CELL_PX / ground.res;
  const wt = buildWeights(mask, mw, mh, cell, x0, y0, wx1, wy1, RADIUS);
  const pathMask = ground.path;
  const pt = pathMask ? buildWeights(pathMask, mw, mh, cell, x0, y0, wx1, wy1, PATH_RADIUS) : null;
  // et område uden en eneste sti (kun id 0) springes over
  const havePaths = !!pt && pt.ids.some((id) => id !== 0);
  const nIds = wt.ids.length;
  const pathStoneId = pt ? pt.ids.find(isStoneMaterial) ?? 0 : 0;
  /** Er punktet en sten i en sti af sten-materialet `id`? (Så står farven i `shadeOut`.) */
  const stoneOverPath = (id: number, wx: number, wy: number): boolean => {
    stoneAt(id, wx, wy, seed);
    if (!isStoneHere(id, pathMask!, PATH_RADIUS, true)) return false;
    stoneColor(shadeOut, id, wx, wy, seed);
    return true;
  };
  const stoneIds = wt.ids.filter(isStoneMaterial);
  /** Pixlen i et område med sten: hel sten eller fuge, hvis stenen hører til `idS`, ellers `idO`s eget terræn. */
  const stonePixel = (idS: number, idO: number, wx: number, wy: number): void => {
    for (let i = -1; i < stoneIds.length; i++) {
      const c = i < 0 ? idS : stoneIds[i]!;
      if (i >= 0 && c === idS) continue;
      stoneAt(c, wx, wy, seed);
      if (idO === 0 || isStoneHere(c, mask, RADIUS, false)) {
        stoneColor(shadeOut, c, wx, wy, seed);
        return;
      }
    }
    shade(idO, wx, wy, seed, 1);
  };
  // Sten (brosten, fliser) afgøres pr. sten ud fra terrænet ved stenens midte, og huskes, så hver sten kun regnes én gang.
  const decided = new Map<number, boolean>();
  const isStoneHere = (id: number, mask: Uint8Array, radius: number, isPath: boolean): boolean => {
    const key = (((stone.row + 32768) * 65536 + (stone.col + 32768)) * 64 + id) * 2 + (isPath ? 1 : 0);
    let v = decided.get(key);
    if (v === undefined) {
      const share = shareAt(mask, mw, mh, cell, stone.cx, stone.cy, radius, id);
      v = share > 0.5 + (stone.b - 0.5) * 0.34;
      decided.set(key, v);
    }
    return v;
  };
  let p = 0;
  for (let py = 0; py < buf.height; py++) {
    for (let px = 0; px < buf.width; px++, p += 4) {
      const wx = x0 + (px + 0.5) / scale;
      const wy = y0 + (py + 0.5) / scale;
      let r: number, g: number, b: number, a: number;

      if (nIds === 1) {
        shade(wt.ids[0]!, wx, wy, seed, 1);
        r = shadeOut[0]!; g = shadeOut[1]!; b = shadeOut[2]!; a = shadeOut[3]!;
      } else {
        const gxf = wx / STEP - wt.gx0;
        const gyf = wy / STEP - wt.gy0;
        const ix = Math.floor(gxf);
        const iy = Math.floor(gyf);
        const fx = gxf - ix;
        const fy = gyf - iy;
        const base = iy * wt.nx + ix;
        let top = -1, sec = -1, wTop = -1, wSec = -1;
        for (let s = 0; s < nIds; s++) {
          const v = weightAt(wt, s, base, wt.nx, fx, fy);
          if (v > wTop) {
            sec = top; wSec = wTop;
            top = s; wTop = v;
          } else if (v > wSec) {
            sec = s; wSec = v;
          }
        }
        const idTop = wt.ids[top]!;
        if (sec < 0 || wSec < 0.015) {
          if (stoneIds.length) {
            // en sten kan række ud over der, hvor terrænet er sten: afgøres af stenens midte
            const idS = isStoneMaterial(idTop) ? idTop : stoneIds[0]!;
            stonePixel(idS, idS === idTop ? 0 : idTop, wx, wy);
          } else shade(idTop, wx, wy, seed, Math.min(1, Math.max(0, (wTop - 0.5) * 2)));
          r = shadeOut[0]!; g = shadeOut[1]!; b = shadeOut[2]!; a = shadeOut[3]!;
        } else {
          const idSec = wt.ids[sec]!;
          const mT = materialById(idTop);
          const mS = materialById(idSec);
          const crisp = (mT?.crisp ? 1 : 0) + (mS?.crisp ? 1 : 0);
          const cliff = idTop !== 0 && idSec !== 0 && isVoid(idTop) !== isVoid(idSec);
          const stoneMix = !cliff && (isStoneMaterial(idTop) || isStoneMaterial(idSec));
          if (stoneMix) {
            // sten (brosten, fliser) mod andet: hele sten, som terrænet ved stenens midte afgør
            const idS = isStoneMaterial(idTop) ? idTop : idSec;
            stonePixel(idS, idS === idTop ? idSec : idTop, wx, wy);
            r = shadeOut[0]!; g = shadeOut[1]!; b = shadeOut[2]!; a = shadeOut[3]!;
          } else {
          const ragged = cliff ? 3.2 : crisp === 0 ? 1 : crisp === 1 ? 0.6 : 0.4;
          const soft = cliff ? 0.8 : crisp === 0 ? 0.22 : crisp === 1 ? 0.13 : 0.07;
          // Overgangen regnes med fast rækkefølge (det laveste id først), så støjen forskyder kanten ens fra begge sider
          // og der ikke opstår dobbeltkanter, hvor "øverste" materiale skifter.
          const vTop = (wTop - wSec) / (wTop + wSec);
          const topFirst = idTop < idSec;
          const v = (topFirst ? vTop : -vTop) + 2 * ((fbm(wx / 46, wy / 46, seed + 101, 2) - 0.5) * 0.36 + (valueNoise(wx / 11, wy / 11, seed + 103) - 0.5) * 0.14) * ragged;
          const tFirst = smoothstep(-2 * soft, 2 * soft, v);
          const t = topFirst ? tFirst : 1 - tFirst;
          if (cliff) {
            // klippekant: land, en skygge, en klippeflade og så sort tomrum
            const voidTop = isVoid(idTop);
            const tv = voidTop ? t : 1 - t;
            const jag = (valueNoise(wx / 7, wy / 7, seed + 121) - 0.5) * 0.16;
            const u = tv + jag;
            const landId = voidTop ? idSec : idTop;
            const voidId = voidTop ? idTop : idSec;
            shade(landId, wx, wy, seed, 1);
            const dark = 1 - 0.5 * smoothstep(0.0, 0.2, u);
            const lr = shadeOut[0]! * dark, lg = shadeOut[1]! * dark, lb = shadeOut[2]! * dark;
            rimShade(voidId, wx, wy, seed);
            const toRim = smoothstep(0.17, 0.21, u);
            const toBlack = smoothstep(0.7, 0.84, u);
            const hi = 1 + 0.3 * Math.max(0, 1 - Math.abs(u - 0.2) / 0.025);
            let cr = (lr + (shadeOut[0]! * hi - lr) * toRim);
            let cg = (lg + (shadeOut[1]! * hi - lg) * toRim);
            let cb = (lb + (shadeOut[2]! * hi - lb) * toRim);
            const k = 1 - toBlack;
            cr *= k; cg *= k; cb *= k;
            r = cr + 8 * toBlack; g = cg + 7 * toBlack; b = cb + 9 * toBlack; a = 1;
            if (havePaths) { /* sti lægges ikke ud i tomrummet, men må gerne ligge på land */ }
            out[p] = r; out[p + 1] = g; out[p + 2] = b; out[p + 3] = 255;
            continue;
          }
          const waterTop = idTop === MATERIAL_WATER;
          const waterSec = idSec === MATERIAL_WATER;
          const shore = waterTop !== waterSec;
          shade(idTop, wx, wy, seed, Math.min(1, Math.max(0, (wTop - 0.5) * 2)));
          let rT = shadeOut[0]!, gT = shadeOut[1]!, bT = shadeOut[2]!;
          const aT = shadeOut[3]!;
          shade(idSec, wx, wy, seed, Math.min(1, Math.max(0, (wSec - 0.5) * 2)));
          let rS = shadeOut[0]!, gS = shadeOut[1]!, bS = shadeOut[2]!;
          const aS = shadeOut[3]!;
          if (shore) {
            // våd kant på landsiden: mørkere nær vandet
            const landTop = !waterTop;
            const lf = landTop ? t : 1 - t;
            const wet = 1 - 0.22 * (1 - smoothstep(0.5, 0.9, lf));
            if (landTop) { rT *= wet; gT *= wet; bT *= wet; } else { rS *= wet; gS *= wet; bS *= wet; }
          }
          const wT = aT * t;
          const wS = aS * (1 - t);
          a = wT + wS;
          if (a > 0) {
            r = (rT * wT + rS * wS) / a;
            g = (gT * wT + gS * wS) / a;
            b = (bT * wT + bS * wS) / a;
            if (shore) {
              // skumkant, hvor vand og land mødes
              const foam = Math.max(0, 1 - Math.abs(t - 0.5) / 0.09) * 0.5;
              r += (WATER_FOAM[0] - r) * foam;
              g += (WATER_FOAM[1] - g) * foam;
              b += (WATER_FOAM[2] - b) * foam;
            }
          } else {
            r = g = b = 0;
          }
          }
        }
      }

      if (havePaths && a > 0) {
        const gxf = wx / STEP - pt!.gx0;
        const gyf = wy / STEP - pt!.gy0;
        const ix = Math.floor(gxf);
        const iy = Math.floor(gyf);
        const fx = gxf - ix;
        const fy = gyf - iy;
        const base = iy * pt!.nx + ix;
        if (pathStoneId && stoneOverPath(pathStoneId, wx, wy)) {
          out[p] = shadeOut[0]!; out[p + 1] = shadeOut[1]!; out[p + 2] = shadeOut[2]!; out[p + 3] = a * 255;
          continue;
        }
        let best = -1, wBest = 0, cover = 0;
        for (let s = 0; s < pt!.ids.length; s++) {
          if (pt!.ids[s] === 0) continue;
          const v = weightAt(pt!, s, base, pt!.nx, fx, fy);
          cover += v;
          if (v > wBest) { wBest = v; best = s; }
        }
        if (best >= 0 && cover > 0.02) {
          const idP = pt!.ids[best]!;
          if (isStoneMaterial(idP)) {
            // stenstier tegnes kun som sten (ovenfor); ingen blød blanding
            out[p] = r; out[p + 1] = g; out[p + 2] = b; out[p + 3] = a * 255;
            continue;
          }
          const mP = materialById(idP);
          const crisp = mP?.crisp ? 1 : 0;
          const n = ((fbm(wx / 38, wy / 38, seed + 111, 2) - 0.5) * 0.5 + (valueNoise(wx / 9, wy / 9, seed + 113) - 0.5) * 0.22) * (crisp ? 0.55 : 1);
          const u2 = cover + n;
          const soft = crisp ? 0.12 : 0.26;
          const tp = smoothstep(0.5 - soft, 0.5 + soft, u2);
          if (tp > 0.003) {
            shade(idP, wx, wy, seed, 1);
            // stien tager farve fra det, den ligger på: mest ved kanten, lidt i midten
            const edge = 1 - smoothstep(0.55, 0.98, cover);
            const own = 1 - (0.1 + edge * 0.5);
            const pr = shadeOut[0]! * own + r * (1 - own);
            const pg = shadeOut[1]! * own + g * (1 - own);
            const pb = shadeOut[2]! * own + b * (1 - own);
            r += (pr - r) * tp;
            g += (pg - g) * tp;
            b += (pb - b) * tp;
          }
        }
      }

      out[p] = r;
      out[p + 1] = g;
      out[p + 2] = b;
      out[p + 3] = a * 255;
    }
  }
}
