import { describe, expect, it } from 'vitest';
import { cutOut, defaultOptions, findBackground, removeBackground, suggestSizes, type Raster, type Rgb } from '../assets/cutout';

function sheet(w: number, h: number, bg: (x: number, y: number) => Rgb | null): Raster {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = bg(x, y);
      const i = (y * w + x) * 4;
      data[i] = c ? c[0] : 0;
      data[i + 1] = c ? c[1] : 0;
      data[i + 2] = c ? c[2] : 0;
      data[i + 3] = c ? 255 : 0;
    }
  }
  return { width: w, height: h, data };
}

const white = (): Rgb => [255, 255, 255];
const checker = (x: number, y: number): Rgb => (((x >> 3) + (y >> 3)) % 2 ? [250, 250, 250] : [228, 228, 228]);
const alphaAt = (r: Raster, x: number, y: number) => r.data[(y * r.width + x) * 4 + 3]!;

/** Lægger en udfyldt cirkel (eller ring) af en farve ind i et billede. */
function disc(r: Raster, cx: number, cy: number, rad: number, c: Rgb, hole = 0) {
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rad && d >= hole) {
        const i = (y * r.width + x) * 4;
        r.data[i] = c[0];
        r.data[i + 1] = c[1];
        r.data[i + 2] = c[2];
        r.data[i + 3] = 255;
      }
    }
  }
}

describe('findBackground', () => {
  it('finder hvid', () => {
    const bg = findBackground(sheet(40, 40, white));
    expect(bg.transparent).toBe(false);
    expect(bg.colors).toHaveLength(1);
    expect(bg.colors[0]![0]).toBe(255);
  });
  it('finder begge toner i et ternet mønster', () => {
    const bg = findBackground(sheet(64, 64, checker));
    expect(bg.colors.length).toBe(2);
  });
  it('kender en allerede gennemsigtig kant', () => {
    expect(findBackground(sheet(30, 30, () => null)).transparent).toBe(true);
  });
});

describe('cutOut', () => {
  it('skærer to genstande ud af hvid baggrund, række for række', () => {
    const r = sheet(200, 100, white);
    disc(r, 150, 50, 20, [30, 120, 30]); // højre
    disc(r, 50, 50, 20, [150, 60, 40]); // venstre
    const cuts = cutOut(r, defaultOptions(r));
    expect(cuts).toHaveLength(2);
    expect(cuts[0]!.x).toBeLessThan(cuts[1]!.x);
    expect(cuts[0]!.w).toBeGreaterThanOrEqual(40);
    expect(cuts[0]!.w).toBeLessThan(46);
    // midten er dækket, hjørnet er gennemsigtigt
    expect(alphaAt(cuts[0]!.raster, cuts[0]!.w >> 1, cuts[0]!.h >> 1)).toBe(255);
    expect(alphaAt(cuts[0]!.raster, 0, 0)).toBe(0);
  });

  it('fjerner et ternet mønster som baggrund', () => {
    const r = sheet(240, 120, checker);
    disc(r, 60, 60, 25, [40, 40, 160]);
    disc(r, 180, 60, 25, [160, 40, 40]);
    const cuts = cutOut(r, defaultOptions(r));
    expect(cuts).toHaveLength(2);
    for (const c of cuts) expect(c.w).toBeLessThan(54);
  });

  it('beholder hvidt inde i en genstand, men fjerner det med "huller"', () => {
    const r = sheet(120, 120, white);
    disc(r, 60, 60, 45, [120, 80, 40]);
    disc(r, 60, 60, 20, [255, 255, 255]); // hvid midte
    const keep = cutOut(r, { ...defaultOptions(r), fillHoles: false });
    expect(keep).toHaveLength(1);
    expect(alphaAt(keep[0]!.raster, keep[0]!.w >> 1, keep[0]!.h >> 1)).toBe(255);
    const holes = cutOut(r, { ...defaultOptions(r), fillHoles: true });
    expect(alphaAt(holes[0]!.raster, holes[0]!.w >> 1, holes[0]!.h >> 1)).toBe(0);
  });

  it('samler dele, der ligger tæt, og dropper små pletter', () => {
    const r = sheet(200, 100, white);
    disc(r, 60, 50, 20, [100, 100, 160]);
    disc(r, 95, 50, 8, [100, 100, 160]); // 7 px fra den store: samme genstand ved gap 12
    disc(r, 180, 10, 2, [0, 0, 0]); // plet
    const cuts = cutOut(r, { ...defaultOptions(r), mergeGap: 12 });
    expect(cuts).toHaveLength(1);
    const apart = cutOut(r, { ...defaultOptions(r), mergeGap: 1 });
    expect(apart).toHaveLength(2);
  });

  it('lader en blød kant fade ud i stedet for at efterlade en lys kant', () => {
    const r = sheet(80, 80, white);
    disc(r, 40, 40, 20, [20, 20, 20]);
    // en blandet kantpixel (50 % hvid, 50 % mørk), som en antialiaset kant ville give
    const i = (40 * 80 + 60) * 4;
    r.data[i] = r.data[i + 1] = r.data[i + 2] = 137;
    const out = removeBackground(r, findBackground(r), { tolerance: 30, fillHoles: false });
    const edge = out.data[(40 * 80 + 60) * 4 + 3]!;
    expect(edge).toBeGreaterThan(80);
    expect(edge).toBeLessThan(200);
    expect(out.data[(40 * 80 + 60) * 4]!).toBeLessThan(60); // farven er trukket ud af det hvide
  });

  it('bevarer en kilde, der allerede er gennemsigtig', () => {
    const r = sheet(80, 80, () => null);
    disc(r, 40, 40, 15, [200, 20, 20]);
    const cuts = cutOut(r, defaultOptions(r));
    expect(cuts).toHaveLength(1);
  });

  it('giver ingen genstande for et tomt billede', () => {
    const r = sheet(50, 50, white);
    expect(cutOut(r, defaultOptions(r))).toHaveLength(0);
  });
});

describe('suggestSizes', () => {
  it('giver den midterste genstand grundstørrelsen og skalerer resten', () => {
    expect(suggestSizes([{ w: 100, h: 90 }, { w: 200, h: 100 }, { w: 400, h: 300 }], 2)).toEqual([1, 2, 4]);
    expect(suggestSizes([])).toEqual([]);
  });
});
