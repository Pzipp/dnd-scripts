import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from '../registry';
import { clamp, lerp, rf, rng, type G } from './common';
import { drawPeak, PAL, type PeakSpec } from './peaks';
import { landformKinds } from './landforms';

/** Bjerge og klippetinder: malede tinder set skråt oppefra (lys flade mod nordvest, skyggeflade mod sydøst). */

const toneP = (d: string): ParamDef => ({
  key: 'tone', label: 'Sten', type: 'select', default: d,
  options: [['grey', 'Grå'], ['brown', 'Brun'], ['red', 'Rød'], ['dark', 'Mørk'], ['sand', 'Sand']].map(([value, label]) => ({ value: value!, label: label! })),
});
const snowP = (d: number): ParamDef => ({ key: 'snow', label: 'Sne', type: 'range', min: 0, max: 1, step: 0.05, default: d });
const peaksP = (d: number, max = 7): ParamDef => ({ key: 'peaks', label: 'Tinder', type: 'range', min: 1, max, step: 1, default: d });

const MT = { keepAspect: false as const, bleed: 0.03 };

/** Tegner tinder bagfra og frem, så de forreste dækker foden af dem bagved. */
function drawPeaks(g: G, r: () => number, list: PeakSpec[], tone: string, w: number, h: number, ratio = 2.1): void {
  const pal = PAL[tone] ?? PAL.grey!;
  for (const p of list) {
    p.hw = Math.min(p.hw, w * 0.48);
    p.cx = clamp(p.cx, -w / 2 + p.hw * 1.04, w / 2 - p.hw * 1.04);
    p.ht = Math.min(p.ht, p.baseY + h / 2 - 3, p.hw * ratio);
  }
  list.sort((a, b) => a.baseY - b.baseY);
  for (const p of list) drawPeak(g, r, p, pal);
}

/** Massiv: en hovedtinde med sidetinder og forbjerge foran. Koordinater er fordelt i boksen [-w/2..w/2] x [-h/2..h/2]. */
function massif(g: G, o: DrawInput, tone: string, snow: number, count: number, compact = 1): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const list: PeakSpec[] = [];
  const bottom = h * 0.5 - w * 0.03;
  list.push({ cx: rf(r, -0.06, 0.06) * w, baseY: bottom - h * 0.2 * compact, hw: w * rf(r, 0.34, 0.4), ht: h * rf(r, 0.62, 0.74), snow });
  for (let i = 1; i < count; i++) {
    const side = i % 2 ? -1 : 1;
    const k = Math.ceil(i / 2);
    const back = r() < 0.5;
    const hwi = w * rf(r, 0.2, 0.3) * (1 - 0.08 * k);
    list.push({
      cx: side * w * clamp(0.18 + 0.15 * k + rf(r, -0.04, 0.04), 0.1, 0.38),
      baseY: back ? h * rf(r, -0.12, 0.02) : bottom - h * rf(r, 0.12, 0.26) * compact,
      hw: hwi,
      ht: h * rf(r, 0.34, 0.6) * (1 - 0.05 * k),
      snow: snow * rf(r, 0.6, 1),
    });
  }
  const foot = count > 1 ? 2 + Math.floor(r() * 2) : 1;
  for (let i = 0; i < foot; i++) {
    list.push({
      cx: rf(r, -0.38, 0.38) * w, baseY: bottom - h * rf(r, 0, 0.05), hw: w * rf(r, 0.13, 0.2), ht: h * rf(r, 0.14, 0.26), snow: 0, foothill: true, rough: 0.22,
    });
  }
  drawPeaks(g, r, list, tone, w, h);
}

/** Kæde: tinder på række, højest i midten. */
function chain(g: G, o: DrawInput, tone: string, snow: number, count: number): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const list: PeakSpec[] = [];
  const bottom = h * 0.5 - w * 0.012;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const mid = 1 - Math.abs(t - 0.5) * 0.9;
    const back = i % 2 === 0;
    list.push({
      cx: lerp(-0.42, 0.42, t) * w + rf(r, -0.02, 0.02) * w,
      baseY: back ? bottom - h * 0.28 : bottom - h * rf(r, 0.05, 0.14),
      hw: Math.min(h * 0.9, (w / count) * rf(r, 0.95, 1.3)),
      ht: h * rf(r, 0.5, 0.7) * mid * (back ? 1.05 : 0.8),
      snow: snow * rf(r, 0.7, 1),
    });
  }
  for (let i = 0; i < Math.round(count / 2); i++) {
    list.push({ cx: rf(r, -0.45, 0.45) * w, baseY: bottom, hw: h * rf(r, 0.12, 0.2), ht: h * rf(r, 0.1, 0.2), snow: 0, foothill: true, rough: 0.22 });
  }
  drawPeaks(g, r, list, tone, w, h);
}

/** Smalle klippetinder (stensøjler og nåle). */
function spires(g: G, o: DrawInput, tone: string, count: number): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const list: PeakSpec[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : (i + rf(r, -0.2, 0.2)) / (count - 1);
    const mid = 1 - Math.abs(t - 0.5) * 0.7;
    list.push({
      cx: lerp(-0.34, 0.34, t) * w,
      baseY: h * rf(r, 0.28, 0.44),
      hw: w * rf(r, 0.09, 0.13),
      ht: h * rf(r, 0.5, 0.88) * mid,
      snow: 0, rough: 0.12, lean: rf(r, -0.25, 0.25),
    });
  }
  drawPeaks(g, r, list, tone, w, h, 5);
}

export const mountainKinds: ObjectKind[] = [
  kind({ key: 'mtn_grey', family: 'mountain', name: 'Stort bjerg, gråt', w: 11, h: 9, shadow: 30, ...MT, params: [toneP('grey'), peaksP(4), snowP(0.4)], tags: ['mountain', 'outdoor'], draw: (g, o) => massif(g, o, param(o, 'tone', 'grey'), param(o, 'snow', 0.4), param(o, 'peaks', 4)) }),
  kind({ key: 'mtn_brown', family: 'mountain', name: 'Stort bjerg, brunt', w: 10, h: 8.5, shadow: 30, ...MT, params: [toneP('brown'), peaksP(4), snowP(0.12)], tags: ['mountain', 'outdoor'], draw: (g, o) => massif(g, o, param(o, 'tone', 'brown'), param(o, 'snow', 0.12), param(o, 'peaks', 4)) }),
  kind({ key: 'mtn_red', family: 'mountain', name: 'Stort bjerg, rødt', w: 10, h: 8.5, shadow: 30, ...MT, params: [toneP('red'), peaksP(3), snowP(0)], tags: ['mountain', 'desert', 'outdoor'], draw: (g, o) => massif(g, o, param(o, 'tone', 'red'), param(o, 'snow', 0), param(o, 'peaks', 3)) }),
  kind({ key: 'mtn_dark', family: 'mountain', name: 'Mørkt bjerg', w: 10, h: 9, shadow: 30, ...MT, params: [toneP('dark'), peaksP(5), snowP(0)], tags: ['mountain', 'outdoor', 'magic'], draw: (g, o) => massif(g, o, param(o, 'tone', 'dark'), param(o, 'snow', 0), param(o, 'peaks', 5)) }),
  kind({ key: 'mtn_snow', family: 'mountain', name: 'Snedækket bjerg', w: 14, h: 11, shadow: 34, ...MT, params: [toneP('grey'), peaksP(5), snowP(0.9)], tags: ['mountain', 'arctic', 'outdoor'], draw: (g, o) => massif(g, o, param(o, 'tone', 'grey'), param(o, 'snow', 0.9), param(o, 'peaks', 5)) }),
  kind({ key: 'mtn_peak', family: 'mountain', name: 'Lille bjerg', w: 5, h: 4.4, shadow: 16, ...MT, sizeJitter: 0.15, params: [toneP('grey'), peaksP(2, 4), snowP(0.2)], tags: ['mountain', 'outdoor'], draw: (g, o) => massif(g, o, param(o, 'tone', 'grey'), param(o, 'snow', 0.2), param(o, 'peaks', 2), 0.8) }),
  kind({ key: 'mtn_peak_snow', family: 'mountain', name: 'Lille snetop', w: 5, h: 4.4, shadow: 16, ...MT, sizeJitter: 0.15, params: [toneP('grey'), peaksP(2, 4), snowP(0.75)], tags: ['mountain', 'arctic', 'outdoor'], draw: (g, o) => massif(g, o, param(o, 'tone', 'grey'), param(o, 'snow', 0.75), param(o, 'peaks', 2), 0.8) }),
  kind({ key: 'mtn_range', family: 'mountain', name: 'Bjergkæde', w: 16, h: 6, shadow: 26, ...MT, params: [toneP('grey'), peaksP(6, 10), snowP(0.4)], tags: ['mountain', 'outdoor'], draw: (g, o) => chain(g, o, param(o, 'tone', 'grey'), param(o, 'snow', 0.4), param(o, 'peaks', 6)) }),
  kind({ key: 'mtn_range_snow', family: 'mountain', name: 'Snedækket bjergkæde', w: 16, h: 6, shadow: 26, ...MT, params: [toneP('grey'), peaksP(6, 10), snowP(0.9)], tags: ['mountain', 'arctic', 'outdoor'], draw: (g, o) => chain(g, o, param(o, 'tone', 'grey'), param(o, 'snow', 0.9), param(o, 'peaks', 6)) }),
  kind({ key: 'mtn_ridge', family: 'mountain', name: 'Bjergryg', w: 9, h: 3.6, shadow: 20, ...MT, params: [toneP('brown'), peaksP(4, 7), snowP(0.15)], tags: ['mountain', 'outdoor'], draw: (g, o) => chain(g, o, param(o, 'tone', 'brown'), param(o, 'snow', 0.15), param(o, 'peaks', 4)) }),
  kind({ key: 'mtn_spires', family: 'mountain', name: 'Klippetinder', w: 4, h: 4, shadow: 20, ...MT, sizeJitter: 0.2, params: [toneP('grey'), peaksP(4, 8)], tags: ['mountain', 'outdoor', 'cave'], draw: (g, o) => spires(g, o, param(o, 'tone', 'grey'), param(o, 'peaks', 4)) }),
  kind({ key: 'mtn_spires_red', family: 'mountain', name: 'Røde klippetinder', w: 3.4, h: 3.6, shadow: 20, ...MT, sizeJitter: 0.2, params: [toneP('red'), peaksP(3, 8)], tags: ['mountain', 'desert', 'outdoor'], draw: (g, o) => spires(g, o, param(o, 'tone', 'red'), param(o, 'peaks', 3)) }),
  ...landformKinds,
];
