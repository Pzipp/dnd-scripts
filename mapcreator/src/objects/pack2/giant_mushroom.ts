import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { blobBody, wobble, ellBody, leaf, shift, type RGB } from './helpers';

function giantMushroom(g: CanvasRenderingContext2D, o: DrawInput): void {
  const r = rng(o.seed);
  const { w, h } = o;
  const cap = param(o, 'hat', 'rød') === 'blå' ? [70, 106, 156] as RGB : param(o, 'hat', 'rød') === 'brun' ? [133, 83, 49] as RGB : [169, 59, 43] as RGB;
  const cx = (r() - .5) * w * .08, cy = -h * .04;
  // Irregular broad cap and pale underside rim.
  blobBody(g, wobble(r, cx, cy, w * (.47 + r() * .025), h * (.43 + r() * .035), 15, .12), shift(cap, -8), { lw: 2, light: 34, dark: 38, ao: 3, rim: 1.4 });
  // Gills radiate from the off-centre stem.
  g.save(); g.translate(cx, cy + h * .13);
  g.strokeStyle = 'rgba(246,220,169,.65)'; g.lineWidth = Math.max(.7, w * .009);
  for (let i = 0; i < 15; i++) {
    const a = Math.PI * (0.08 + i * .84 / 14);
    g.beginPath(); g.moveTo(Math.cos(a) * w * .06, Math.sin(a) * h * .05); g.lineTo(Math.cos(a) * w * .43, Math.sin(a) * h * .34); g.stroke();
  }
  g.restore();
  // Stem visible at the cap's lower edge, with a softly lit side.
  ellBody(g, cx + w * .02, h * .24, w * .16, h * .18, [213, 193, 151], { lw: 1.5, light: 28, dark: 28 });
  ellBody(g, cx - w * .015, h * .22, w * .09, h * .13, [235, 218, 179], { lw: .7, light: 24, dark: 18, outline: null });
  // Seed-dependent pale flecks.
  for (let i = 0, n = 7 + Math.floor(r() * 9); i < n; i++) {
    const a = r() * Math.PI * 2, rr = .12 + r() * .26;
    ellBody(g, cx + Math.cos(a) * w * rr, cy + Math.sin(a) * h * rr, w * (.012 + r() * .012), h * (.016 + r() * .014), [239, 222, 180], { lw: .45, light: 14, dark: 12, ao: 0, rim: 0 });
  }
}

export const giantMushroomKinds: ObjectKind[] = [
  kind({ key: 'mushroom_giant', family: 'mushroom', name: 'Kæmpesvamp', w: 1.5, h: 1.5, randomRotation: true, sizeJitter: .12, shadow: 8, bleed: .03,
    params: [{ key: 'hat', label: 'Hatfarve', type: 'select', default: 'rød', options: [{ value: 'rød', label: 'Rød' }, { value: 'blå', label: 'Blå' }, { value: 'brun', label: 'Brun' }] }],
    tags: ['magic', 'cave'], draw: giantMushroom }),
];
