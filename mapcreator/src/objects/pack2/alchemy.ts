import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, woodGrain, rivet, shift, type RGB } from './helpers';

function alchemistTable(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const wood: RGB = [119 + r() * 16, 73 + r() * 10, 39 + r() * 8];
  // Broad work surface, top-down; legs are hinted at by corner blocks.
  rectBody(g, -w * .48, -h * .43, w * .96, h * .86, Math.min(w, h) * .055, wood, { lw: 2, light: 24, dark: 32 });
  g.save();
  g.beginPath(); g.roundRect(-w * .46, -h * .41, w * .92, h * .82, Math.min(w, h) * .05); g.clip();
  woodGrain(g, r, [-w * .46, -h * .41, w * .46, h * .41], wood, { lines: 17, knots: 2, contrast: 1.05 });
  for (let i = 1; i < 6; i++) {
    const x = -w * .46 + i * w * .92 / 6;
    g.strokeStyle = 'rgba(37,18,6,.45)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, -h * .4); g.lineTo(x + (r() - .5) * 2, h * .4); g.stroke();
  }
  g.restore();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    rectBody(g, sx * w * .39 - w * .055, sy * h * .34 - h * .055, w * .11, h * .11, 1.5, [84, 49, 25], { lw: 1, light: 12, dark: 22 });
  }
  // Mortar and pestle.
  ellBody(g, -w * .27, -h * .13, w * .12, h * .13, [102, 105, 100], { lw: 1.4, light: 18, dark: 26 });
  ellBody(g, -w * .27, -h * .15, w * .085, h * .085, [67, 72, 70], { lw: 1, light: 8, dark: 20 });
  g.save(); g.translate(-w * .23, -h * .18); g.rotate(-.55);
  rectBody(g, -w * .025, -h * .17, w * .05, h * .22, w * .025, [151, 151, 139], { lw: 1, light: 20, dark: 22 });
  g.restore();
  // Three distinct glass vessels; the liquid colors vary by seed.
  const liquid = param(o, 'væske', 'grøn') === 'blå' ? [55, 133, 180] as RGB : param(o, 'væske', 'grøn') === 'rød' ? [177, 57, 50] as RGB : [74, 151, 82] as RGB;
  ellBody(g, w * .15, -h * .16, w * .105, h * .14, [157, 190, 185], { lw: 1.2, light: 25, dark: 30, alpha: .9 });
  ellBody(g, w * .15, -h * .13, w * .073, h * .085, liquid, { lw: .6, light: 20, dark: 22 });
  rectBody(g, w * .12, -h * .34, w * .06, h * .08, 1, [155, 171, 158], { lw: .8 });
  ellBody(g, w * .32, h * .13, w * .095, h * .12, [171, 190, 178], { lw: 1.1, light: 20, dark: 25, alpha: .88 });
  ellBody(g, w * .32, h * .16, w * .066, h * .072, shift(liquid, -12), { lw: .6 });
  ellBody(g, w * .01, h * .2, w * .075, h * .09, [197, 164, 92], { lw: 1.1, light: 22, dark: 24 });
  // Copper tubing and small tools.
  g.strokeStyle = 'rgba(143,82,42,.95)'; g.lineWidth = Math.max(1.4, w * .018);
  g.beginPath(); g.moveTo(w * .21, -h * .31); g.lineTo(w * .29, -h * .31); g.lineTo(w * .29, -h * .22); g.stroke();
  rivet(g, -w * .39, -h * .34, 1.3, [171, 124, 63]);
}

export const alchemyKinds: ObjectKind[] = [
  kind({ key: 'table_alchemist', family: 'workshop', name: 'Alkymistbord', w: 2, h: 1, shadow: 5, bleed: .02,
    params: [{ key: 'væske', label: 'Væske', type: 'select', default: 'grøn', options: [{ value: 'grøn', label: 'Grøn' }, { value: 'blå', label: 'Blå' }, { value: 'rød', label: 'Rød' }] }],
    draw: alchemistTable }),
];
