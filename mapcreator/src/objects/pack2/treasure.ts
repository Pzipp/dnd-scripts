import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, ellBody, woodGrain, rivet, shift, type RGB } from './helpers';

function goldChest(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const x = -w * 0.43, y = -h * 0.4, cw = w * 0.86, ch = h * 0.8;
  const wood: RGB = [126 + r() * 18, 72 + r() * 12, 34 + r() * 8];
  rectBody(g, x, y, cw, ch, Math.min(w, h) * 0.07, wood, { lw: 2, light: 24, dark: 34 });
  // Plank seams and grain stay inside the chest silhouette.
  g.save();
  g.beginPath(); g.roundRect(x + 1, y + 1, cw - 2, ch - 2, Math.min(w, h) * 0.06); g.clip();
  woodGrain(g, r, [x + 2, y + 2, x + cw - 2, y + ch - 2], wood, { lines: 13, knots: 2, contrast: 1.15 });
  for (let i = 1; i < 5; i++) {
    const px = x + (cw * i) / 5;
    g.strokeStyle = 'rgba(35,17,5,.58)'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(px, y + 2); g.lineTo(px + (r() - .5) * 2, y + ch - 2); g.stroke();
  }
  g.restore();
  // Brass bands and lock plate.
  for (const bx of [x + cw * .18, x + cw * .82]) {
    rectBody(g, bx - cw * .045, y + 1, cw * .09, ch - 2, 1.5, [174, 126, 45], { lw: 1.1, light: 24, dark: 28 });
    rivet(g, bx, y + ch * .18, 1.6, [205, 166, 75]);
    rivet(g, bx, y + ch * .82, 1.6, [205, 166, 75]);
  }
  rectBody(g, -cw * .13, -ch * .14, cw * .26, ch * .3, 2, [190, 145, 53], { lw: 1.3, light: 28, dark: 30 });
  ellBody(g, 0, -ch * .01, cw * .035, ch * .05, [67, 43, 18], { lw: .8 });
  // Loose coins visible from above, deliberately contained within the chest.
  for (let i = 0, n = 9 + Math.floor(r() * 9); i < n; i++) {
    const px = (r() - .5) * cw * .68, py = (r() - .5) * ch * .5;
    ellBody(g, px, py, cw * (.035 + r() * .012), ch * (.045 + r() * .012), shift([218, 169, 49], (r() - .5) * 24), { lw: .65, light: 32, dark: 26, ao: .4, rim: .5 });
    g.beginPath(); g.arc(px - 1, py - 1, Math.max(.5, cw * .012), 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,235,143,.75)'; g.fill();
  }
}

export const treasureKinds: ObjectKind[] = [
  kind({ key: 'chest_gold_coins', family: 'chest', name: 'Kiste med guld', w: 1, h: 0.7, shadow: 5, bleed: 0.02, tags: ['treasure', 'rich'], draw: goldChest }),
];
