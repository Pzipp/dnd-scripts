import { kind, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { rectBody, woodGrain, shift, type RGB } from './helpers';

function bookshelf(g: CanvasRenderingContext2D, o: DrawInput, style: number): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const frame: RGB = style === 0 ? [106, 65, 35] : style === 1 ? [91, 52, 29] : style === 2 ? [133, 91, 53] : style === 3 ? [76, 54, 42] : [119, 79, 43];
  rectBody(g, -w * .48, -h * .46, w * .96, h * .92, Math.min(w, h) * .035, frame, { lw: 2, light: 22, dark: 30 });
  // Dark shelf recess.
  rectBody(g, -w * .39, -h * .37, w * .78, h * .74, 1.5, [43, 28, 19], { lw: 1.1, light: 5, dark: 12 });
  const shelfCount = style === 3 ? 2 : 3;
  const rowH = h * .74 / shelfCount;
  const palettes: RGB[] = [[137, 54, 42], [49, 76, 111], [176, 129, 54], [59, 91, 59], [119, 70, 111], [186, 158, 113], [69, 47, 34]];
  for (let row = 0; row < shelfCount; row++) {
    const y = -h * .37 + row * rowH;
    const count = (style === 4 ? 5 : 6) + Math.floor(r() * 4);
    const bw = w * .7 / count;
    for (let i = 0; i < count; i++) {
      const thick = h * (.025 + r() * .018);
      const bh = rowH * (.68 + r() * .22);
      const bx = -w * .35 + i * bw + bw * .08;
      const by = y + rowH * .08 + (rowH * .7 - bh) * .5;
      const bookCol = shift(palettes[(Math.floor(r() * palettes.length))]!, (r() - .5) * 20);
      rectBody(g, bx, by, bw * .78, bh, Math.min(bw, bh) * .12, bookCol, { lw: .75, light: 18, dark: 23, ao: .7, rim: .5 });
      // Spine highlight and tiny gilt band; no text.
      g.strokeStyle = 'rgba(255,226,169,.45)'; g.lineWidth = Math.max(.45, bw * .035);
      g.beginPath(); g.moveTo(bx + bw * .18, by + bh * .08); g.lineTo(bx + bw * .18, by + bh * .88); g.stroke();
      if (r() > .45) {
        g.strokeStyle = 'rgba(218,176,91,.72)'; g.lineWidth = Math.max(.45, bw * .025);
        g.beginPath(); g.moveTo(bx + bw * .28, by + bh * .18); g.lineTo(bx + bw * .68, by + bh * .18); g.stroke();
      }
    }
    // Front lip of each shelf.
    rectBody(g, -w * .4, y + rowH * .78, w * .8, rowH * .13, 1, shift(frame, 12), { lw: .8, light: 18, dark: 20 });
  }
  // Corner joinery and subtle wood grain on exposed frame rails.
  woodGrain(g, r, [-w * .46, -h * .44, -w * .39, h * .44], frame, { lines: 4, knots: style === 2 ? 1 : 0 });
  woodGrain(g, r, [w * .39, -h * .44, w * .46, h * .44], frame, { lines: 4, knots: 0 });
}

export const bookshelfKinds: ObjectKind[] = [
  kind({ key: 'bookshelf_oak_full', family: 'bookshelf', name: 'Bogreol i eg', w: 1.5, h: .55, shadow: 5, bleed: .02, draw: (g, o) => bookshelf(g, o, 0) }),
  kind({ key: 'bookshelf_dark_wood', family: 'bookshelf', name: 'Bogreol i mørkt træ', w: 1.5, h: .55, shadow: 5, bleed: .02, draw: (g, o) => bookshelf(g, o, 1) }),
  kind({ key: 'bookshelf_tall_books', family: 'bookshelf', name: 'Høj bogreol med bøger', w: 1.5, h: .6, shadow: 5, bleed: .02, draw: (g, o) => bookshelf(g, o, 2) }),
  kind({ key: 'bookshelf_low', family: 'bookshelf', name: 'Lav bogreol', w: 1.5, h: .5, shadow: 4, bleed: .02, draw: (g, o) => bookshelf(g, o, 3) }),
  kind({ key: 'bookshelf_ornate', family: 'bookshelf', name: 'Udsmykket bogreol', w: 1.5, h: .6, shadow: 5, bleed: .02, draw: (g, o) => bookshelf(g, o, 4) }),
];
