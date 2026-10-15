import { kind, param, type DrawInput, type ObjectKind } from '../registry';
import { rng } from '../util';
import { blobBody, blobPath, body, crack, ellBody, mottle, OUT, polyBody, radial, rectBody, rectPath, rgb, rope, shift, tube, wobble, woodGrain, type G, type RGB, type Rnd } from '../pack2/helpers';
import { axe, bow, roundShield, sword, STEEL } from './arms';
import { woodRect } from './common';
import { bloodPool, CLOTH, HAIR, person, SKIN_DWARF, SKIN_ELF, SKIN_HUMAN, SKIN_ORC, type PersonCfg } from './people';

/** Lig: mennesker, orker, dværge, alfer, skeletter, dyr, ligbårer og bunker. */

const BONE: RGB = [220, 210, 182];
const pick = <T>(r: Rnd, l: T[]): T => l[Math.floor(r() * l.length) % l.length]!;
const bloodAmount = (o: DrawInput): number => {
  const v = param(o, 'blood', 'some');
  return v === 'none' ? 0 : v === 'lots' ? 1.6 : 0.7;
};
const bloodParam = { key: 'blood', label: 'Blod', type: 'select' as const, default: 'some', options: [{ value: 'none', label: 'Intet' }, { value: 'some', label: 'Lidt' }, { value: 'lots', label: 'Meget' }] };

function baseCfg(r: Rnd, skin: RGB[]): PersonCfg {
  const cloth = pick(r, CLOTH);
  return { skin: pick(r, skin), hair: pick(r, HAIR), cloth, pants: [cloth[0] * 0.7 + 20, cloth[1] * 0.7 + 14, cloth[2] * 0.7 + 10], boots: [70, 46, 28] };
}

const poseOf = (r: Rnd, o: DrawInput): PersonCfg['pose'] => {
  const p = param(o, 'pose', 'auto');
  if (p !== 'auto') return p as PersonCfg['pose'];
  const t = r();
  return t < 0.45 ? 'supine' : t < 0.7 ? 'prone' : 'sprawl';
};
const poseParam = { key: 'pose', label: 'Stilling', type: 'select' as const, default: 'auto', options: [{ value: 'auto', label: 'Efter seed' }, { value: 'supine', label: 'På ryggen' }, { value: 'prone', label: 'På maven' }, { value: 'sprawl', label: 'Spredt' }] };

function human(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const c = baseCfg(r, SKIN_HUMAN);
  c.pose = poseOf(r, o);
  c.blood = bloodAmount(o);
  const L = o.h * 0.9;
  const rot = (r() - 0.5) * 0.35;
  person(g, r, 0, 0, L, rot, c);
}

function peasant(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const c = baseCfg(r, SKIN_HUMAN);
  c.cloth = pick(r, [[150, 130, 96], [110, 96, 70], [130, 110, 84]] as RGB[]);
  c.pants = [90, 76, 56];
  c.pose = poseOf(r, o);
  c.blood = bloodAmount(o);
  const L = o.h * 0.88;
  person(g, r, 0, 0, L, (r() - 0.5) * 0.4, c);
  // en halmgaffel ved siden af
  const px = o.w * 0.4;
  tube(g, () => {
    g.beginPath();
    g.moveTo(px, -L * 0.45);
    g.lineTo(px + 2, L * 0.45);
  }, 3, [130, 90, 50], { outline: 1.6 });
  for (const s of [-1, 0, 1]) tube(g, () => {
    g.beginPath();
    g.moveTo(px + 2 + s * 4, L * 0.45);
    g.lineTo(px + 2 + s * 4, L * 0.55);
  }, 1.6, [150, 150, 158], { outline: 1 });
}

function orc(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const c = baseCfg(r, SKIN_ORC);
  c.orc = true;
  c.build = 1.4;
  c.cloth = [76, 52, 32];
  c.pants = [70, 52, 34];
  c.boots = [50, 36, 24];
  c.hair = [20, 16, 14];
  c.pose = poseOf(r, o);
  c.blood = bloodAmount(o);
  const L = o.h * 0.88;
  person(g, r, -o.w * 0.06, 0, L, (r() - 0.5) * 0.3, c);
  if (param(o, 'weapon', true)) axe(g, o.w * 0.34, -L * 0.3, Math.PI / 2 + 0.2, L * 0.6, { head: [86, 88, 94], big: 1.3, haft: [90, 62, 36] });
}

function dwarf(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const c = baseCfg(r, SKIN_DWARF);
  c.build = 1.45;
  c.beard = pick(r, [[150, 60, 30], [96, 64, 34], [170, 170, 170], [40, 28, 20]] as RGB[]);
  c.hair = c.beard;
  c.helmet = r() < 0.5;
  c.armor = r() < 0.4;
  c.pose = poseOf(r, o);
  c.blood = bloodAmount(o);
  const L = o.h * 0.82;
  person(g, r, -o.w * 0.08, 0, L, (r() - 0.5) * 0.3, c);
  if (param(o, 'shield', true)) roundShield(g, r, o.w * 0.33, o.h * 0.12, o.w * 0.2, [140, 60, 36], { pattern: Math.floor(r() * 4) });
}

function elf(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const c = baseCfg(r, SKIN_ELF);
  c.elf = true;
  c.build = 0.85;
  c.hair = pick(r, [[236, 224, 180], [200, 200, 210], [60, 44, 30]] as RGB[]);
  c.cloth = pick(r, [[60, 100, 70], [90, 120, 80], [70, 90, 110]] as RGB[]);
  c.pants = [70, 80, 60];
  c.boots = [96, 70, 44];
  c.pose = poseOf(r, o);
  c.blood = bloodAmount(o);
  const L = o.h * 0.9;
  person(g, r, -o.w * 0.1, 0, L, (r() - 0.5) * 0.3, c);
  if (param(o, 'weapon', true)) bow(g, o.w * 0.4, 0, 0.2, L * 0.7, [150, 108, 60]);
}

function knight(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const c = baseCfg(r, SKIN_HUMAN);
  c.armor = true;
  c.helmet = true;
  c.pants = [80, 82, 90];
  c.boots = [96, 98, 106];
  c.build = 1.15;
  c.pose = poseOf(r, o);
  c.blood = bloodAmount(o);
  const L = o.h * 0.9;
  person(g, r, -o.w * 0.08, 0, L, (r() - 0.5) * 0.3, c);
  sword(g, o.w * 0.36, -L * 0.28, Math.PI / 2 + 0.1, L * 0.55, { guard: [200, 164, 60] });
}

/** Sammenkrøbet lig (fosterstilling). */
function curled(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const skin = pick(r, SKIN_HUMAN);
  const cloth = pick(r, CLOTH);
  if (bloodAmount(o) > 0) bloodPool(g, r, 0, S * 0.05, Math.min(S * 0.4, S * 0.26 * bloodAmount(o) + 8), Math.min(S * 0.4, S * 0.24 * bloodAmount(o) + 8));
  g.save();
  g.rotate((r() - 0.5) * 6.28);
  // ben (knæene trukket op)
  for (const s of [0, 1]) {
    const hip: [number, number] = [S * 0.1, S * (0.18 + s * 0.04)];
    const knee: [number, number] = [-S * 0.18, S * (0.24 + s * 0.06)];
    const foot: [number, number] = [S * 0.05, S * (0.38 + s * 0.02)];
    tube(g, () => {
      g.beginPath();
      g.moveTo(hip[0], hip[1]);
      g.lineTo(knee[0], knee[1]);
      g.lineTo(foot[0], foot[1]);
    }, S * 0.1, [96, 80, 60], { outline: 1.8 });
    ellBody(g, foot[0], foot[1] + 3, S * 0.05, S * 0.08, [70, 46, 28], { lw: 1.1 });
  }
  // ryg og krop (bue)
  tube(g, () => {
    g.beginPath();
    g.moveTo(S * 0.22, -S * 0.2);
    g.quadraticCurveTo(S * 0.34, S * 0.05, S * 0.12, S * 0.22);
  }, S * 0.26, cloth, { outline: 2 });
  g.save();
  g.beginPath();
  g.moveTo(S * 0.22, -S * 0.2);
  g.quadraticCurveTo(S * 0.34, S * 0.05, S * 0.12, S * 0.22);
  g.lineWidth = S * 0.26;
  g.strokeStyle = 'rgba(0,0,0,0)';
  g.stroke();
  g.restore();
  // arme omkring hovedet
  for (const s of [0, 1]) {
    const a: [number, number] = [S * 0.2, -S * 0.16 + s * S * 0.06];
    const e: [number, number] = [S * 0.0, -S * 0.1 + s * S * 0.12];
    const h: [number, number] = [-S * 0.16, -S * 0.2 + s * S * 0.04];
    tube(g, () => {
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(e[0], e[1]);
      g.lineTo(h[0], h[1]);
    }, S * 0.075, cloth, { outline: 1.7 });
    ellBody(g, h[0], h[1], S * 0.045, S * 0.04, skin, { lw: 1 });
  }
  // hoved
  const hx = -S * 0.1;
  const hy = -S * 0.12;
  ellBody(g, hx, hy, S * 0.12, S * 0.13, skin, { lw: 1.3 });
  g.save();
  g.beginPath();
  g.ellipse(hx, hy, S * 0.12, S * 0.13, 0, 0, 7);
  g.clip();
  g.fillStyle = rgb(pick(r, HAIR));
  g.beginPath();
  g.ellipse(hx + S * 0.03, hy - S * 0.02, S * 0.12, S * 0.11, 0.3, 0, 7);
  g.fill();
  g.restore();
  mottle(g, r, [S * 0.1, -S * 0.2, S * 0.3, S * 0.2], cloth, 6, 3, 14, 0.3);
  g.restore();
}

/** Halvt lig: kun overkrop, trukket med et blodspor. */
function halfBody(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const c = baseCfg(r, SKIN_HUMAN);
  c.half = true;
  c.pose = poseOf(r, o);
  c.blood = 1.6;
  const L = o.h * 0.95;
  // spor
  g.save();
  g.strokeStyle = 'rgba(100,10,10,.55)';
  g.lineWidth = o.w * 0.14;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, o.h * 0.05);
  g.bezierCurveTo(o.w * 0.1, o.h * 0.2, -o.w * 0.1, o.h * 0.35, 0, o.h * 0.48);
  g.stroke();
  g.restore();
  person(g, r, 0, -o.h * 0.02, L, (r() - 0.5) * 0.25, c);
  // revet kant
  g.fillStyle = 'rgba(100,12,12,.9)';
  g.beginPath();
  g.ellipse(0, o.h * 0.05, o.w * 0.2, o.h * 0.05, 0, 0, 7);
  g.fill();
  for (let i = 0; i < 6; i++) crack(g, r, (r() - 0.5) * o.w * 0.3, o.h * 0.04, 4, 1.57, 0.8, false);
}

/** Lig i sæk, bundet med reb; støvler stikker ud. */
function sackBody(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const pts: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.283;
    const k = 1 + (r() - 0.5) * 0.08;
    // langstrakt form med afrundede ender
    pts.push([Math.cos(a) * W * 0.4 * k * (1 + 0.1 * Math.sin(a * 2)), Math.sin(a) * H * 0.4 * k]);
  }
  if (bloodAmount(o) > 0) bloodPool(g, r, W * 0.04, H * 0.14, W * 0.26, H * 0.18);
  blobBody(g, pts, [172, 146, 100], { lw: 1.6, ao: 4 });
  g.save();
  blobPath(g, pts)();
  g.clip();
  // grov væv
  g.strokeStyle = 'rgba(70,46,18,.16)';
  g.lineWidth = 0.7;
  for (let y = -H / 2; y < H / 2; y += 3) {
    g.beginPath();
    g.moveTo(-W / 2, y);
    g.lineTo(W / 2, y);
    g.stroke();
  }
  for (let x = -W / 2; x < W / 2; x += 3) {
    g.beginPath();
    g.moveTo(x, -H / 2);
    g.lineTo(x, H / 2);
    g.stroke();
  }
  mottle(g, r, [-W / 2, -H / 2, W / 2, H / 2], [172, 146, 100], 20, 5, 18, 0.4);
  // folder over figuren
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = 'rgba(40,24,6,.35)';
    g.lineWidth = 1;
    g.beginPath();
    const y = -H * 0.2 + i * H * 0.14;
    g.moveTo(-W * 0.35, y);
    g.quadraticCurveTo(0, y + (r() - 0.5) * 8, W * 0.35, y + (r() - 0.5) * 5);
    g.stroke();
  }
  bloodPool(g, r, W * 0.05, H * 0.12, W * 0.12 * bloodAmount(o), H * 0.08 * bloodAmount(o));
  g.restore();
  // reb
  for (const y of [-H * 0.3, 0, H * 0.28]) {
    rope(g, [[-W * 0.38, y], [0, y + (r() - 0.5) * 3], [W * 0.38, y]], 2.4, [176, 144, 88]);
  }
  // støvler
  for (const s of [-1, 1]) {
    ellBody(g, s * W * 0.14, H * 0.5, W * 0.1, H * 0.06, [64, 42, 26], { lw: 1.3 });
  }
  // hår i den anden ende
  g.fillStyle = rgb(pick(r, HAIR));
  g.beginPath();
  g.ellipse(0, -H * 0.5 + 2, W * 0.1, 4, 0, 0, 7);
  g.fill();
}

/** Lig i ligklæde (hvid dug med figurens former), evt. blod der siver igennem. */
function shroudBody(g: G, o: DrawInput, tied = true): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const outline: [number, number][] = [
    [0, -H * 0.5],
    [W * 0.2, -H * 0.46],
    [W * 0.24, -H * 0.36],
    [W * 0.44, -H * 0.28],
    [W * 0.42, H * 0.06],
    [W * 0.3, H * 0.14],
    [W * 0.26, H * 0.4],
    [W * 0.12, H * 0.5],
    [-W * 0.12, H * 0.5],
    [-W * 0.26, H * 0.4],
    [-W * 0.3, H * 0.14],
    [-W * 0.42, H * 0.06],
    [-W * 0.44, -H * 0.28],
    [-W * 0.24, -H * 0.36],
    [-W * 0.2, -H * 0.46],
  ];
  if (bloodAmount(o) > 0) bloodPool(g, r, W * 0.04, H * 0.0, W * 0.4, H * 0.28);
  const cloth: RGB = param(o, 'cloth', 'white') === 'grey' ? [190, 186, 176] : [236, 232, 220];
  blobBody(g, outline, cloth, { lw: 1.5, ao: 4 });
  g.save();
  blobPath(g, outline)();
  g.clip();
  // folder
  for (let i = 0; i < 12; i++) {
    const x = -W * 0.4 + r() * W * 0.8;
    g.strokeStyle = 'rgba(70,60,40,.22)';
    g.lineWidth = 1 + r();
    g.beginPath();
    g.moveTo(x, -H * 0.4);
    g.quadraticCurveTo(x + (r() - 0.5) * 12, 0, x + (r() - 0.5) * 8, H * 0.5);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x + 1.5, -H * 0.4);
    g.quadraticCurveTo(x + 1.5 + (r() - 0.5) * 12, 0, x + (r() - 0.5) * 8 + 1.5, H * 0.5);
    g.stroke();
  }
  // hovedets bule
  g.fillStyle = radial(g, 0, -H * 0.4, W * 0.2, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(0,0,0,.18)']], -W * 0.05, -H * 0.43, 0);
  g.beginPath();
  g.ellipse(0, -H * 0.4, W * 0.18, H * 0.09, 0, 0, 7);
  g.fill();
  const bl = bloodAmount(o);
  if (bl > 0) {
    for (let i = 0; i < 4 + bl * 4; i++) {
      g.fillStyle = `rgba(${130 + r() * 40},20,16,${0.35 + r() * 0.3})`;
      g.beginPath();
      g.ellipse((r() - 0.5) * W * 0.4, -H * 0.2 + r() * H * 0.5, 2 + r() * 6 * bl, 2 + r() * 8 * bl, r() * 3, 0, 7);
      g.fill();
    }
  }
  g.restore();
  if (tied) {
    for (const y of [-H * 0.34, H * 0.34]) rope(g, [[-W * 0.25, y], [0, y + 1], [W * 0.25, y]], 2.2, [150, 120, 76]);
  }
}

/** Ligbåre: to stænger, lærred og et indsvøbt lig. */
function bier(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  // stænger
  for (const s of [-1, 1]) {
    tube(g, () => {
      g.beginPath();
      g.moveTo(s * W * 0.4, -H * 0.5);
      g.lineTo(s * W * 0.4, H * 0.5);
    }, W * 0.07, [124, 86, 48], { outline: 1.8 });
  }
  // tværstykker
  for (const y of [-H * 0.36, H * 0.36]) rectBody(g, -W * 0.46, y - 2, W * 0.92, 5, 1, [110, 76, 44], { lw: 1.1 });
  // lærred
  const cv = rectPath(g, -W * 0.38, -H * 0.4, W * 0.76, H * 0.8, 2);
  body(g, cv, [150, 124, 84], [-W * 0.38, -H * 0.4, W * 0.38, H * 0.4], { lw: 1.2 });
  g.save();
  cv();
  g.clip();
  g.strokeStyle = 'rgba(70,46,18,.2)';
  g.lineWidth = 0.7;
  for (let y = -H * 0.4; y < H * 0.4; y += 3) {
    g.beginPath();
    g.moveTo(-W, y);
    g.lineTo(W, y);
    g.stroke();
  }
  g.restore();
  // liget i klæde (indskrænket)
  g.save();
  g.scale(0.78, 0.82);
  shroudBody(g, { ...o, w: W * 0.8, h: H * 0.92, params: { ...o.params, blood: o.params.blood ?? 'some' } }, true);
  g.restore();
  // håndtag (grebsender)
  for (const s of [-1, 1]) {
    ellBody(g, s * W * 0.4, -H * 0.5, W * 0.05, W * 0.05, [100, 68, 38], { lw: 1.2 });
    ellBody(g, s * W * 0.4, H * 0.5, W * 0.05, W * 0.05, [100, 68, 38], { lw: 1.2 });
  }
  void woodRect;
  void r;
}

/** Hel skelet liggende. */
function boneLine(g: G, a: [number, number], b: [number, number], w: number): void {
  tube(g, () => {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
  }, w, BONE, { outline: 1.6 });
  for (const p of [a, b]) {
    ellBody(g, p[0], p[1], w * 0.72, w * 0.66, shift(BONE, 4), { lw: 1, ao: 0.4, rim: 0.4 });
  }
}

function skull(g: G, x: number, y: number, rad: number, rot: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  ellBody(g, 0, 0, rad, rad * 1.05, BONE, { lw: 1.3, ao: rad * 0.12 });
  // kæbe
  polyBody(g, [[-rad * 0.5, rad * 0.7], [rad * 0.5, rad * 0.7], [rad * 0.35, rad * 1.2], [-rad * 0.35, rad * 1.2]], shift(BONE, -8), { lw: 1, ao: 0.4, rim: 0.3 });
  g.fillStyle = 'rgba(16,10,6,.9)';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * rad * 0.38, -rad * 0.05, rad * 0.26, rad * 0.3, 0, 0, 7);
    g.fill();
  }
  g.beginPath();
  g.moveTo(0, rad * 0.18);
  g.lineTo(rad * 0.1, rad * 0.5);
  g.lineTo(-rad * 0.1, rad * 0.5);
  g.fill();
  g.strokeStyle = 'rgba(30,20,10,.6)';
  g.lineWidth = 0.7;
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * rad * 0.15, rad * 0.78);
    g.lineTo(i * rad * 0.15, rad * 0.98);
    g.stroke();
  }
  g.restore();
}

function ribcage(g: G, r: Rnd, cx: number, cy: number, s: number): void {
  for (let i = 0; i < 6; i++) {
    const y = cy - s * 0.18 + i * s * 0.07;
    const wd = s * (0.2 - Math.abs(i - 1.5) * 0.012);
    for (const sg of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + sg * s * 0.02, y);
      g.bezierCurveTo(cx + sg * wd * 0.9, y - s * 0.05, cx + sg * wd * 1.05, y + s * 0.07, cx + sg * s * 0.04, y + s * 0.11);
      g.strokeStyle = 'rgba(40,28,12,.85)';
      g.lineWidth = s * 0.03 + 1.3;
      g.stroke();
      g.strokeStyle = rgb(BONE);
      g.lineWidth = s * 0.03;
      g.stroke();
    }
  }
  tube(g, () => {
    g.beginPath();
    g.moveTo(cx, cy - s * 0.2);
    g.lineTo(cx, cy + s * 0.25);
  }, s * 0.035, [206, 196, 168], { outline: 1.3 });
  void r;
}

function skeleton(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const L = o.h * 0.9;
  const spread = 0.15 + r() * 0.5;
  g.save();
  g.rotate((r() - 0.5) * 0.4);
  const bw = L * 0.03;
  if (bloodAmount(o) > 0 && param(o, 'blood', 'none') !== 'none') bloodPool(g, r, 0, 0, L * 0.1, L * 0.12);
  const top = -L / 2;
  const hipY = top + L * 0.5;
  for (const s of [-1, 1]) {
    boneLine(g, [s * L * 0.05, hipY], [s * (L * 0.08 + spread * L * 0.06), hipY + L * 0.22], bw * 1.3);
    boneLine(g, [s * (L * 0.08 + spread * L * 0.06), hipY + L * 0.22], [s * (L * 0.1 + spread * L * 0.18), top + L * 0.96], bw);
    ellBody(g, s * (L * 0.1 + spread * L * 0.18), top + L * 0.985, L * 0.03, L * 0.05, shift(BONE, -6), { lw: 1 });
  }
  const armSpread = 0.3 + r() * 0.8;
  for (const s of [-1, 1]) {
    const sh: [number, number] = [s * L * 0.1, top + L * 0.2];
    const el: [number, number] = [s * (L * 0.1 + armSpread * L * 0.1), top + L * 0.36];
    const ha: [number, number] = [s * (L * 0.1 + armSpread * L * 0.2 + r() * L * 0.04), top + L * 0.5];
    boneLine(g, sh, el, bw * 1.1);
    boneLine(g, el, ha, bw);
    ellBody(g, ha[0], ha[1] + 2, L * 0.03, L * 0.035, shift(BONE, -4), { lw: 1 });
  }
  // bækken
  for (const s of [-1, 1]) {
    ellBody(g, s * L * 0.07, hipY - L * 0.02, L * 0.08, L * 0.055, shift(BONE, -6), { lw: 1.2 });
    ellBody(g, s * L * 0.06, hipY, L * 0.03, L * 0.025, [34, 22, 14], { lw: 0.5, ao: 0 });
  }
  ribcage(g, r, 0, top + L * 0.32, L * 1.0);
  // kraveben
  for (const s of [-1, 1]) boneLine(g, [s * L * 0.02, top + L * 0.17], [s * L * 0.11, top + L * 0.19], bw * 0.7);
  skull(g, (r() - 0.5) * L * 0.04, top + L * 0.085, L * 0.062, (r() - 0.5) * 0.7);
  g.restore();
}

function boneHeap(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const W = o.w;
  const H = o.h;
  const n = Math.round(param(o, 'amount', 14));
  const items: (() => void)[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283;
    const d = Math.sqrt(r());
    const x = Math.cos(a) * W * 0.36 * d;
    const y = Math.sin(a) * H * 0.36 * d;
    const t = r();
    if (t < 0.17) items.push(() => skull(g, x, y, Math.min(W, H) * 0.075, r() * 6.28));
    else if (t < 0.3) items.push(() => ribcage(g, r, x, y, Math.min(W, H) * 0.36));
    else {
      const a2 = r() * 6.283;
      const len = Math.min(W, H) * (0.18 + r() * 0.18);
      items.push(() => boneLine(g, [x, y], [x + Math.cos(a2) * len, y + Math.sin(a2) * len], Math.min(W, H) * 0.028));
    }
  }
  // gulv-støv
  mottle(g, r, [-W * 0.4, -H * 0.4, W * 0.4, H * 0.4], [60, 50, 40], 14, 6, 10, 0.16);
  for (const f of items) f();
}

/** Bunke af lig: flere mennesker oven på hinanden. */
function corpsePile(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const n = Math.round(param(o, 'count', 4));
  const L = Math.min(o.w, o.h) * 0.68;
  bloodPool(g, r, 0, 0, o.w * 0.32, o.h * 0.32);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + r();
    const c = baseCfg(r, r() < 0.3 ? SKIN_ORC : SKIN_HUMAN);
    c.pose = r() < 0.5 ? 'sprawl' : 'prone';
    c.blood = 0.7;
    if (r() < 0.25) {
      c.armor = true;
      c.helmet = r() < 0.5;
    }
    person(g, r, Math.cos(a) * L * 0.18, Math.sin(a) * L * 0.18, L, a + 1.57 + (r() - 0.5) * 1.3, c);
  }
}

/** Dyrelig: fælles tegnemetode for firbenede dyr (vandret, hoved mod venstre). */
function quadruped(g: G, r: Rnd, W: number, H: number, c: { fur: RGB; belly?: RGB; spots?: RGB; mane?: RGB; legW: number; neck: number; snout: number; ear: number; tail: number; hoof?: boolean; horns?: boolean }, blood: number): void {
  if (blood > 0) bloodPool(g, r, W * 0.04, H * 0.1, W * 0.18 * blood + 6, H * 0.16 * blood + 6);
  const bodyL = W * 0.34;
  const bodyH = H * 0.31;
  const bx = W * 0.1;
  // ben: strakt ud
  const legX = [bx - bodyL * 0.72, bx - bodyL * 0.4, bx + bodyL * 0.45, bx + bodyL * 0.72];
  legX.forEach((x, i) => {
    const front = i < 2;
    const out = H * (0.28 + r() * 0.1);
    tube(g, () => {
      g.beginPath();
      g.moveTo(x, bodyH * 0.35);
      g.lineTo(x + (front ? -1 : 1) * (r() - 0.3) * 12, bodyH * 0.35 + out * 0.6);
      g.lineTo(x + (r() - 0.5) * 8, bodyH * 0.35 + out);
    }, c.legW, shift(c.fur, -16), { outline: 1.6 });
    ellBody(g, x, bodyH * 0.35 + out + 1, c.legW * 0.75, c.legW * 0.6, c.hoof ? [50, 40, 34] : shift(c.fur, -30), { lw: 1 });
  });
  // hale
  tube(g, () => {
    g.beginPath();
    g.moveTo(bx + bodyL * 0.95, -bodyH * 0.1);
    g.quadraticCurveTo(bx + bodyL * 1.2, -bodyH * 0.6, bx + bodyL * (0.95 + c.tail * 0.4), -bodyH * 0.2);
  }, c.legW * 0.7, c.mane ?? shift(c.fur, -20), { outline: 1.4 });
  // hals og hoved
  tube(g, () => {
    g.beginPath();
    g.moveTo(bx - bodyL * 0.7, -bodyH * 0.1);
    g.lineTo(bx - bodyL * (0.7 + c.neck), -bodyH * 0.4);
  }, bodyH * 0.6, c.fur, { outline: 2 });
  // krop
  const pts = wobble(r, bx, 0, bodyL, bodyH, 14, 0.06);
  blobBody(g, pts, c.fur, { lw: 1.7, ao: 5 });
  g.save();
  blobPath(g, pts)();
  g.clip();
  // pels
  for (let i = 0; i < 120; i++) {
    const x = bx + (r() - 0.5) * bodyL * 2;
    const y = (r() - 0.5) * bodyH * 2;
    g.strokeStyle = r() < 0.5 ? rgb(shift(c.fur, -30), 0.5) : rgb(shift(c.fur, 28), 0.45);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 3 + r() * 3, y + (r() - 0.5) * 2);
    g.stroke();
  }
  if (c.spots) {
    for (let i = 0; i < 6; i++) {
      const sp = wobble(r, bx + (r() - 0.5) * bodyL * 1.5, (r() - 0.5) * bodyH, 5 + r() * 9, 4 + r() * 7, 9, 0.35);
      g.fillStyle = rgb(c.spots);
      blobPath(g, sp)();
      g.fill();
    }
  }
  if (c.belly) {
    g.fillStyle = rgb(c.belly, 0.7);
    g.beginPath();
    g.ellipse(bx, bodyH * 0.8, bodyL * 0.9, bodyH * 0.3, 0, 0, 7);
    g.fill();
  }
  // rygmanke
  if (c.mane) {
    g.strokeStyle = rgb(c.mane);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(bx - bodyL * 0.7, -bodyH * 0.7);
    g.lineTo(bx + bodyL * 0.6, -bodyH * 0.8);
    g.stroke();
  }
  // sårtegn
  if (blood > 0) {
    for (let i = 0; i < 6; i++) {
      g.fillStyle = `rgba(110,12,12,${0.4 + r() * 0.3})`;
      g.beginPath();
      g.ellipse(bx + (r() - 0.5) * bodyL, (r() - 0.5) * bodyH, 2 + r() * 3 * blood, 2 + r() * 2 * blood, r() * 3, 0, 7);
      g.fill();
    }
  }
  g.restore();
  // hoved
  const hx = bx - bodyL * (0.7 + c.neck) - W * 0.02;
  const hy = -bodyH * 0.4;
  const hr = bodyH * 0.46;
  ellBody(g, hx, hy, hr * (0.9 + c.snout * 0.3), hr, shift(c.fur, 4), { lw: 1.5 });
  // snude
  ellBody(g, hx - hr * (0.7 + c.snout), hy + hr * 0.1, hr * (0.4 + c.snout * 0.4), hr * 0.5, shift(c.fur, -6), { lw: 1.3 });
  ellBody(g, hx - hr * (1.1 + c.snout), hy + hr * 0.1, hr * 0.14, hr * 0.12, [30, 20, 18], { lw: 0.7, ao: 0 });
  // ører
  for (const s of [-1, 1]) polyBody(g, [[hx + hr * 0.2, hy + s * hr * 0.7], [hx + hr * 0.8, hy + s * hr * (0.9 + c.ear)], [hx + hr * 0.7, hy + s * hr * 0.4]], shift(c.fur, -12), { lw: 1, ao: 0.4, rim: 0.3 });
  if (c.horns) for (const s of [-1, 1]) tube(g, () => {
    g.beginPath();
    g.moveTo(hx + hr * 0.4, hy + s * hr * 0.8);
    g.quadraticCurveTo(hx + hr * 0.5, hy + s * hr * 1.6, hx - hr * 0.4, hy + s * hr * 1.7);
  }, hr * 0.2, [226, 214, 180], { outline: 1.4 });
  // livløse øjne
  g.strokeStyle = 'rgba(16,10,6,.85)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(hx - hr * 0.3, hy - hr * 0.45);
  g.lineTo(hx - hr * 0.05, hy - hr * 0.38);
  g.stroke();
}

function wolf(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const fur: RGB = pick(r, [[110, 106, 100], [86, 84, 84], [140, 126, 108], [70, 66, 62]] as RGB[]);
  quadruped(g, r, o.w, o.h, { fur, belly: [200, 196, 186], legW: o.h * 0.07, neck: 0.18, snout: 0.45, ear: 0.4, tail: 0.5 }, bloodAmount(o));
}
function horse(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const fur: RGB = pick(r, [[130, 84, 50], [60, 44, 36], [200, 196, 188], [160, 110, 64]] as RGB[]);
  quadruped(g, r, o.w, o.h, { fur, mane: shift(fur, -42), legW: o.h * 0.05, neck: 0.38, snout: 0.5, ear: 0.2, tail: 0.5, hoof: true }, bloodAmount(o));
}
function cow(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const spotted = param(o, 'spots', true);
  const fur: RGB = spotted ? [236, 232, 222] : pick(r, [[120, 80, 50], [70, 54, 44]] as RGB[]);
  quadruped(g, r, o.w, o.h, { fur, spots: spotted ? [46, 38, 36] : undefined, legW: o.h * 0.07, neck: 0.12, snout: 0.3, ear: 0.5, tail: 0.5, hoof: true, horns: true }, bloodAmount(o));
}
function pig(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  quadruped(g, r, o.w, o.h, { fur: [224, 170, 160], legW: o.h * 0.07, neck: 0.05, snout: 0.3, ear: 0.5, tail: 0.15, hoof: true }, bloodAmount(o));
}

/** Død fugl med spredte vinger. */
function bird(g: G, o: DrawInput): void {
  const r = rng(o.seed);
  const S = Math.min(o.w, o.h);
  const col: RGB = param(o, 'species', 'crow') === 'hen' ? [226, 214, 190] : param(o, 'species', 'crow') === 'owl' ? [150, 120, 84] : [34, 34, 42];
  g.save();
  g.rotate((r() - 0.5) * 6.28);
  if (bloodAmount(o) > 0) bloodPool(g, r, 0, 0, S * 0.2, S * 0.15);
  // vinger
  for (const s of [-1, 1]) {
    const tipx = s * S * (0.46 + r() * 0.04);
    const path = () => {
      g.beginPath();
      g.moveTo(s * S * 0.08, -S * 0.08);
      g.quadraticCurveTo(s * S * 0.3, -S * 0.22, tipx, -S * 0.05 + r() * 0);
      g.lineTo(tipx - s * S * 0.04, S * 0.16);
      g.quadraticCurveTo(s * S * 0.3, S * 0.2, s * S * 0.08, S * 0.12);
      g.closePath();
    };
    body(g, path, shift(col, 4), [Math.min(0, tipx), -S * 0.2, Math.max(0, tipx), S * 0.2], { lw: 1.3, ao: 2 });
    g.save();
    path();
    g.clip();
    for (let i = 0; i < 10; i++) {
      g.strokeStyle = i % 2 ? rgb(shift(col, 26), 0.5) : 'rgba(0,0,0,.3)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(s * S * 0.1, -S * 0.04 + i * S * 0.014);
      g.lineTo(tipx - s * S * 0.02, -S * 0.04 + i * S * 0.02);
      g.stroke();
    }
    g.restore();
  }
  // krop og hoved
  ellBody(g, 0, S * 0.02, S * 0.13, S * 0.2, col, { lw: 1.4 });
  mottle(g, r, [-S * 0.1, -S * 0.1, S * 0.1, S * 0.16], col, 12, 2, 22, 0.4);
  ellBody(g, 0, -S * 0.24, S * 0.07, S * 0.07, shift(col, 6), { lw: 1.2 });
  polyBody(g, [[-S * 0.025, -S * 0.3], [S * 0.025, -S * 0.3], [0, -S * 0.38]], col === (col as RGB) && param(o, 'species', 'crow') === 'hen' ? [226, 150, 50] : [120, 108, 90], { lw: 0.8, ao: 0.2, rim: 0.2 });
  // hale og fødder
  polyBody(g, [[-S * 0.08, S * 0.2], [S * 0.08, S * 0.2], [S * 0.12, S * 0.38], [-S * 0.12, S * 0.38]], shift(col, -6), { lw: 1.1, ao: 0.6, rim: 0.4 });
  for (const s of [-1, 1]) tube(g, () => {
    g.beginPath();
    g.moveTo(s * S * 0.05, S * 0.18);
    g.lineTo(s * S * 0.12, S * 0.28);
  }, 1.4, [180, 140, 90], { outline: 0.8 });
  g.restore();
  void STEEL;
  void rectBody;
  void woodGrain;
  void OUT;
}

const personParams = [poseParam, bloodParam];

export const bodyKinds: ObjectKind[] = [
  kind({ key: 'body_human', family: 'bodies', name: 'Lig, menneske', w: 2.1, h: 2.2, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: personParams, tags: ['dungeon', 'battlefield', 'crypt', 'outdoor', 'city'], draw: human }),
  kind({ key: 'body_peasant', family: 'bodies', name: 'Lig, bonde', w: 2.3, h: 2.2, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: personParams, tags: ['village', 'farm', 'outdoor', 'battlefield', 'poor'], draw: peasant }),
  kind({ key: 'body_orc', family: 'bodies', name: 'Lig, ork', w: 2.6, h: 2.5, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: [...personParams, { key: 'weapon', label: 'Økse', type: 'toggle', default: true }], tags: ['battlefield', 'dungeon', 'cave', 'outdoor'], draw: orc }),
  kind({ key: 'body_dwarf', family: 'bodies', name: 'Lig, dværg', w: 2.5, h: 2, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: [...personParams, { key: 'shield', label: 'Skjold', type: 'toggle', default: true }], tags: ['battlefield', 'dungeon', 'cave', 'mountain'], draw: dwarf }),
  kind({ key: 'body_elf', family: 'bodies', name: 'Lig, alf', w: 2.4, h: 2.3, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: [...personParams, { key: 'weapon', label: 'Bue', type: 'toggle', default: true }], tags: ['battlefield', 'forest', 'outdoor', 'dungeon'], draw: elf }),
  kind({ key: 'body_knight', family: 'bodies', name: 'Lig i rustning', w: 2.5, h: 2.4, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: personParams, tags: ['battlefield', 'military', 'dungeon', 'crypt'], draw: knight }),
  kind({ key: 'body_curled', family: 'bodies', name: 'Sammenkrøbet lig', w: 1.4, h: 1.4, shadow: 0, bleed: 0.06, randomRotation: true, params: [bloodParam], tags: ['dungeon', 'crypt', 'cave', 'poor'], draw: curled }),
  kind({ key: 'body_half', family: 'bodies', name: 'Halvt lig', w: 1.2, h: 2, keepAspect: false, shadow: 0, bleed: 0.08, randomRotation: true, params: [poseParam], tags: ['dungeon', 'battlefield', 'cave'], draw: halfBody }),
  kind({ key: 'body_sack', family: 'bodies', name: 'Lig i sæk', w: 1, h: 2.2, keepAspect: false, shadow: 4, bleed: 0.08, randomRotation: true, params: [bloodParam], tags: ['dungeon', 'city', 'harbor', 'crypt'], draw: sackBody }),
  kind({ key: 'body_shroud', family: 'bodies', name: 'Lig i ligklæde', w: 1.4, h: 2.4, keepAspect: false, shadow: 3, bleed: 0.06, randomRotation: true, params: [bloodParam, { key: 'cloth', label: 'Klæde', type: 'select', default: 'white', options: [{ value: 'white', label: 'Hvidt' }, { value: 'grey', label: 'Gråt' }] }], tags: ['crypt', 'temple', 'graveyard', 'dungeon', 'village'], draw: (g, o) => shroudBody(g, o, true) }),
  kind({ key: 'body_bier', family: 'bodies', name: 'Ligbåre', w: 1.6, h: 2.8, keepAspect: false, shadow: 5, bleed: 0.06, params: [bloodParam], tags: ['crypt', 'temple', 'graveyard', 'village', 'battlefield'], draw: bier }),
  kind({ key: 'body_pile', family: 'bodies', name: 'Bunke af lig', w: 3, h: 3, shadow: 0, bleed: 0.06, randomRotation: true, params: [{ key: 'count', label: 'Antal', type: 'range', min: 2, max: 7, step: 1, default: 4 }], tags: ['battlefield', 'dungeon', 'crypt', 'outdoor'], draw: corpsePile }),
  kind({ key: 'body_skeleton', family: 'bodies', name: 'Skelet, helt', w: 1.5, h: 2.2, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, tags: ['dungeon', 'crypt', 'cave', 'desert', 'battlefield'], draw: skeleton }),
  kind({ key: 'body_bone_heap', family: 'bodies', name: 'Knoglebunke', w: 2.2, h: 2.2, shadow: 0, bleed: 0.06, randomRotation: true, params: [{ key: 'amount', label: 'Mængde', type: 'range', min: 6, max: 26, step: 1, default: 14 }], tags: ['dungeon', 'crypt', 'cave', 'desert', 'battlefield'], draw: boneHeap }),
  kind({ key: 'body_wolf', family: 'bodies', name: 'Dødt dyr, ulv', w: 2.2, h: 1.4, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: [bloodParam], tags: ['forest', 'mountain', 'arctic', 'outdoor', 'battlefield'], draw: wolf }),
  kind({ key: 'body_horse', family: 'bodies', name: 'Dødt dyr, hest', w: 3.4, h: 2, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: [bloodParam], tags: ['battlefield', 'outdoor', 'farm', 'village'], draw: horse }),
  kind({ key: 'body_cow', family: 'bodies', name: 'Dødt dyr, ko', w: 3, h: 1.8, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: [bloodParam, { key: 'spots', label: 'Skæmmet', type: 'toggle', default: true }], tags: ['farm', 'village', 'outdoor'], draw: cow }),
  kind({ key: 'body_pig', family: 'bodies', name: 'Dødt dyr, gris', w: 2, h: 1.3, keepAspect: false, shadow: 0, bleed: 0.06, randomRotation: true, params: [bloodParam], tags: ['farm', 'village', 'outdoor'], draw: pig }),
  kind({ key: 'body_bird', family: 'bodies', name: 'Død fugl', w: 0.8, h: 0.8, shadow: 0, bleed: 0.06, randomRotation: true, params: [bloodParam, { key: 'species', label: 'Art', type: 'select', default: 'crow', options: [{ value: 'crow', label: 'Krage' }, { value: 'hen', label: 'Høne' }, { value: 'owl', label: 'Ugle' }] }], tags: ['farm', 'village', 'outdoor', 'forest', 'graveyard'], draw: bird }),
];

void rectBody;
void rope;
void tube;
void sword;
void bow;
void roundShield;
void axe;
