import { describe, expect, it } from 'vitest';
import { elementsInCircle, radiusOf, ScatterStroke, type ScatterOptions } from '../model/scatter';
import { materialAt, createGround } from '../model/ground';
import { getKind } from '../objects';

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

const kind = getKind('tree_broad')!;
let n = 0;
const opts = (over: Partial<ScatterOptions> = {}): ScatterOptions => ({
  density: 0.6,
  radius: 250,
  avoidWater: true,
  materialAt: () => 1,
  pickKind: () => kind,
  newId: () => `id${n++}`,
  newSeed: () => n,
  bounds: { w: 4000, h: 2750 },
  rand: seeded(7),
  ...over,
});

describe('scatter', () => {
  it('sætter genstande ud i cirklen og ikke oven i hinanden', () => {
    const s = new ScatterStroke();
    for (let i = 0; i < 6; i++) s.stamp(1000, 1000, opts());
    expect(s.placed.length).toBeGreaterThan(3);
    for (const e of s.placed) expect(Math.hypot(e.x - 1000, e.y - 1000)).toBeLessThanOrEqual(250.001);
    // ingen midtpunkter tættere end de to radier, der er tilladt ved denne tæthed (spacing 0.78)
    for (let i = 0; i < s.placed.length; i++) {
      for (let j = i + 1; j < s.placed.length; j++) {
        const a = s.placed[i]!;
        const b = s.placed[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual((radiusOf(a) + radiusOf(b)) * (1.2 - 0.6 * 0.7) - 0.001);
      }
    }
  });

  it('tæthed styrer antallet', () => {
    const count = (d: number) => {
      const s = new ScatterStroke();
      for (let i = 0; i < 20; i++) s.stamp(1200, 1200, opts({ density: d, rand: seeded(3 + i) }));
      return s.placed.length;
    };
    expect(count(1)).toBeGreaterThan(count(0.15));
  });

  it('undgår vand og kanten af kortet', () => {
    const s = new ScatterStroke();
    s.stamp(1000, 1000, opts({ materialAt: () => 6 }));
    expect(s.placed).toHaveLength(0);
    const t = new ScatterStroke();
    for (let i = 0; i < 10; i++) t.stamp(0, 0, opts({ rand: seeded(i) }));
    for (const e of t.placed) {
      expect(e.x).toBeGreaterThanOrEqual(0);
      expect(e.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('tager hensyn til genstande, der allerede findes', () => {
    const existing = Array.from({ length: 40 }, (_, i) => ({ x: 1000 + (i % 8) * 60 - 200, y: 1000 + Math.floor(i / 8) * 60 - 120, w: 200, h: 200 }));
    const s = new ScatterStroke(existing);
    for (let i = 0; i < 4; i++) s.stamp(1000, 1000, opts({ density: 0.3, radius: 150 }));
    expect(s.placed.length).toBe(0);
  });

  it('undgår steder, der er optaget (fx mure)', () => {
    const s = new ScatterStroke();
    const blockedLeft = (x: number) => x < 1000;
    for (let i = 0; i < 8; i++) s.stamp(1000, 1000, opts({ blocked: (x) => blockedLeft(x), rand: seeded(i + 1) }));
    expect(s.placed.length).toBeGreaterThan(0);
    expect(s.placed.every((e) => e.x >= 1000)).toBe(true);
  });

  it('linje og fjern-tilstand', () => {
    const s = new ScatterStroke();
    s.line(500, 500, 1500, 500, opts({ radius: 150 }));
    expect(s.placed.length).toBeGreaterThan(5);
    const inside = elementsInCircle(s.placed, 1000, 500, 100);
    expect(inside.every((e) => Math.hypot(e.x - 1000, e.y - 500) <= 100)).toBe(true);
  });

  it('materialAt finder øverste lag med terræn', () => {
    const lower = createGround(4, 4, 1);
    const upper = createGround(4, 4, 0);
    upper.data[0] = 6;
    const doc = { layers: [{ visible: true, ground: lower }, { visible: true, ground: upper }] };
    expect(materialAt(doc, 5, 5)).toBe(6);
    expect(materialAt(doc, 100, 100)).toBe(1);
    expect(materialAt({ layers: [{ visible: false, ground: lower }] }, 5, 5)).toBe(0);
  });
});
