import { createDoc, createLayer } from '../model/doc';
import { createGround, GROUND_RES, type GroundData } from '../model/ground';
import { newId } from '../model/ids';
import { radiusOf } from '../model/scatter';
import { CELL_PX, type Layer, type MapDoc, type MapElement, type Opening, type OpeningKind, type Wall } from '../model/types';
import { allKinds, defaultParams, type ObjectKind } from '../objects/registry';
import { tagsOf } from '../objects/tags';
import { fbm } from '../render/noise';
import { isStoneMaterial } from '../render/stones';
import { MATERIALS, MATERIAL_WATER } from '../render/materials';
import { defaultThickness } from '../render/walls';
import { rng } from '../objects/util';
import type { Building, Cave, Dungeon, Furnish, Mat, Rule, Theme } from './spec';
import { themeByKey } from './themes';

export interface GenOptions {
  theme: string;
  widthCells: number;
  heightCells: number;
  seed: number;
  name?: string;
}

const MAT_ID = new Map(MATERIALS.map((m) => [m.key, m.id]));
const matId = (k: Mat): number => {
  const id = MAT_ID.get(k);
  if (id === undefined) throw new Error(`Ukendt materiale ${k}`);
  return id;
};

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Gap {
  side: Side;
  pos: number;
  kind: OpeningKind;
  width: number;
}

/** Hurtigt opslag af, hvad der allerede står hvor (afstandstjek). */
class Occupancy {
  private cells = new Map<string, { x: number; y: number; r: number }[]>();
  private key = (a: number, b: number) => `${a},${b}`;
  add(x: number, y: number, r: number): void {
    const k = this.key(Math.floor(x / 200), Math.floor(y / 200));
    const c = this.cells.get(k);
    if (c) c.push({ x, y, r });
    else this.cells.set(k, [{ x, y, r }]);
  }
  hit(x: number, y: number, r: number, spacing: number): boolean {
    const cx = Math.floor(x / 200);
    const cy = Math.floor(y / 200);
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const c = this.cells.get(this.key(cx + i, cy + j));
        if (c) for (const o of c) if (Math.hypot(o.x - x, o.y - y) < (o.r + r) * spacing) return true;
      }
    }
    return false;
  }
}

type Side = 0 | 1 | 2 | 3; // top, right, bottom, left

class Generator {
  readonly doc: MapDoc;
  private g: GroundData;
  private rand: () => number;
  private W: number;
  private H: number;
  private mw: number;
  private mh: number;
  private seed: number;
  private roadMask: Uint8Array;
  private roadPts: [number, number][] = [];
  private rects: Rect[] = [];
  private objects: MapElement[] = [];
  private trees: MapElement[] = [];
  private effects: MapElement[] = [];
  private walls: Wall[] = [];
  /** Gulvlaget, når nogen bygninger eller rum har fået sten- eller plankegulv. */
  private f: GroundData | null = null;
  private occ = new Occupancy();
  private treeOcc = new Occupancy();
  private pools = new Map<string, ObjectKind[]>();

  constructor(private theme: Theme, opts: GenOptions) {
    this.doc = createDoc({ name: opts.name?.trim() || theme.name, widthCells: opts.widthCells, heightCells: opts.heightCells });
    this.doc.seed = opts.seed;
    this.W = this.doc.widthCells;
    this.H = this.doc.heightCells;
    // generatoren tegner terrænet som en maske; den bliver til malede fliser, når kortet åbnes (se `adoptLegacy`)
    const base = this.doc.layers[0]!;
    delete base.paint;
    this.g = base.ground = createGround(this.W, this.H);
    this.g.data.fill(matId(theme.base));
    this.mw = this.g.w;
    this.mh = this.g.h;
    this.seed = opts.seed;
    this.rand = rng(opts.seed ^ 0x9e3779b9);
    this.roadMask = new Uint8Array(this.mw * this.mh);
  }

  // ---------------------------------------------------------------- hjælp

  private rr = (a: number, b: number) => a + this.rand() * (b - a);
  private ri = (a: number, b: number) => Math.floor(a + this.rand() * (b - a + 1));
  private range = (r: [number, number]) => this.rr(r[0], r[1]);
  private irange = (r: [number, number]) => this.ri(r[0], r[1]);
  private noise = (x: number, y: number, scale: number, off: number) => fbm(x / scale, y / scale, this.seed + off * 101, 3);
  private idx(cx: number, cy: number): number {
    const x = Math.floor(cx * GROUND_RES);
    const y = Math.floor(cy * GROUND_RES);
    return x < 0 || y < 0 || x >= this.mw || y >= this.mh ? -1 : y * this.mw + x;
  }
  private baseAt(cx: number, cy: number): number {
    const i = this.idx(cx, cy);
    return i < 0 ? 0 : this.g.data[i]!;
  }
  private onRoad(cx: number, cy: number): boolean {
    const i = this.idx(cx, cy);
    return i >= 0 && this.roadMask[i] === 1;
  }
  private isWater = (cx: number, cy: number) => this.baseAt(cx, cy) === MATERIAL_WATER;

  /** Fylder en uregelmæssig plet (centrum og radius i felter). */
  private blob(cx: number, cy: number, r: number, mat: number, off: number, guard?: (i: number) => boolean): void {
    const x0 = Math.max(0, Math.floor((cx - r * 1.5) * GROUND_RES));
    const x1 = Math.min(this.mw - 1, Math.ceil((cx + r * 1.5) * GROUND_RES));
    const y0 = Math.max(0, Math.floor((cy - r * 1.5) * GROUND_RES));
    const y1 = Math.min(this.mh - 1, Math.ceil((cy + r * 1.5) * GROUND_RES));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = (x + 0.5) / GROUND_RES;
        const py = (y + 0.5) / GROUND_RES;
        const warp = (this.noise(px, py, 3.2, off) - 0.5) * 0.9;
        if (Math.hypot(px - cx, py - cy) / r + warp >= 1) continue;
        const i = y * this.mw + x;
        if (!guard || guard(i)) this.g.data[i] = mat;
      }
    }
  }

  private disc(cx: number, cy: number, r: number, visit: (i: number) => void): void {
    const x0 = Math.max(0, Math.floor((cx - r) * GROUND_RES));
    const x1 = Math.min(this.mw - 1, Math.ceil((cx + r) * GROUND_RES));
    const y0 = Math.max(0, Math.floor((cy - r) * GROUND_RES));
    const y1 = Math.min(this.mh - 1, Math.ceil((cy + r) * GROUND_RES));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (Math.hypot((x + 0.5) / GROUND_RES - cx, (y + 0.5) / GROUND_RES - cy) <= r) visit(y * this.mw + x);
      }
    }
  }

  private fillRect(r: Rect, mat: number): void {
    const x0 = Math.max(0, Math.floor(r.x0 * GROUND_RES));
    const x1 = Math.min(this.mw, Math.ceil(r.x1 * GROUND_RES));
    const y0 = Math.max(0, Math.floor(r.y0 * GROUND_RES));
    const y1 = Math.min(this.mh, Math.ceil(r.y1 * GROUND_RES));
    if (isStoneMaterial(mat)) {
      // brosten, fliser og planker lægges på et Gulv-lag (skåret til ved kanten) oven på jord eller sten
      const under = mat === matId('planks') ? matId('earth') : matId('stone');
      const f = (this.f ??= createGround(this.W, this.H, 0));
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          f.data[y * this.mw + x] = mat;
          this.g.data[y * this.mw + x] = under;
        }
      }
      return;
    }
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) this.g.data[y * this.mw + x] = mat;
  }

  /** Slynget linje fra kant til kant: punkter (felter) med afstand ca. en halv felt. */
  private wiggle(meander: number, vertical = this.W < this.H): [number, number][] {
    const along = vertical ? this.H : this.W;
    const across = vertical ? this.W : this.H;
    const base = this.rr(0.3, 0.7) * across;
    const slope = this.rr(-0.25, 0.25) * across;
    const p1 = this.rr(0, 6.28);
    const p2 = this.rr(0, 6.28);
    const f1 = this.rr(1.2, 2.2);
    const f2 = this.rr(3, 5);
    const amp = meander * across * 0.16;
    const pts: [number, number][] = [];
    const n = Math.ceil(along * 2);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let a = base + slope * (t - 0.5) + amp * (Math.sin(t * f1 * Math.PI + p1) + 0.35 * Math.sin(t * f2 * Math.PI + p2));
      a = Math.min(across - 1, Math.max(1, a));
      pts.push(vertical ? [a, t * along] : [t * along, a]);
    }
    return pts;
  }

  // ---------------------------------------------------------------- terræn

  private patches(): void {
    for (const [n, p] of (this.theme.patches ?? []).entries()) {
      const off = 7 + n * 3;
      const mat = matId(p.material);
      const on = p.on ? new Set(p.on.map(matId)) : null;
      const samples: number[] = [];
      for (let y = 0; y < this.H; y += 2) for (let x = 0; x < this.W; x += 2) samples.push(this.noise(x, y, p.scale, off));
      samples.sort((a, b) => a - b);
      const thr = samples[Math.min(samples.length - 1, Math.floor((1 - p.amount) * samples.length))]!;
      for (let y = 0; y < this.mh; y++) {
        for (let x = 0; x < this.mw; x++) {
          const i = y * this.mw + x;
          if (on && !on.has(this.g.data[i]!)) continue;
          if (this.theme.cave && !on) continue;
          if (this.noise((x + 0.5) / GROUND_RES, (y + 0.5) / GROUND_RES, p.scale, off) > thr) this.g.data[i] = mat;
        }
      }
    }
  }

  private water(): void {
    const w = this.theme.water;
    if (!w) return;
    const water = matId(w.material ?? 'water');
    const bank = w.bank ? matId(w.bank.material) : 0;
    const bw = w.bank?.width ?? 0;
    const notWater = (i: number) => this.g.data[i] !== water;
    if (w.lakes) {
      const n = this.irange(w.lakes.count);
      for (let k = 0; k < n; k++) {
        const r = this.range(w.lakes.radius);
        const cx = this.rr(r + 3, this.W - r - 3);
        const cy = this.rr(r + 3, this.H - r - 3);
        if (bank) this.blob(cx, cy, r + bw, bank, 40 + k, notWater);
        this.blob(cx, cy, r, water, 50 + k);
      }
    }
    if (w.rivers) {
      const n = this.irange(w.rivers.count);
      for (let k = 0; k < n; k++) {
        const pts = this.wiggle(w.rivers.meander);
        const base = this.range(w.rivers.width);
        const wid = pts.map(([x, y]) => base * (0.8 + 0.4 * this.noise(x, y, 8, 60 + k)) * 0.5);
        if (bank) {
          pts.forEach(([x, y], i) =>
            this.disc(x, y, wid[i]! + bw, (j) => {
              if (notWater(j)) this.g.data[j] = bank;
            }),
          );
        }
        pts.forEach(([x, y], i) => this.disc(x, y, wid[i]!, (j) => (this.g.data[j] = water)));
      }
    }
  }

  private roads(): void {
    for (const road of this.theme.roads ?? []) {
      const n = this.irange(road.count);
      const mat = matId(road.material);
      const vertical = this.rand() < 0.35;
      for (let k = 0; k < n; k++) {
        const pts = this.wiggle(road.meander, k === 0 ? vertical : !vertical);
        const w = this.range(road.width) / 2;
        for (const [x, y] of pts) {
          this.disc(x, y, w, (i) => {
            if (this.g.data[i] === MATERIAL_WATER) return;
            if (road.layer === 'path') (this.g.path ??= new Uint8Array(this.mw * this.mh))[i] = mat;
            else this.g.data[i] = mat;
            this.roadMask[i] = 1;
          });
        }
        pts.forEach((p, i) => i % 4 === 0 && this.roadPts.push(p));
      }
    }
  }

  // ---------------------------------------------------------------- grotte

  private cave(c: Cave): void {
    const cw = this.W * 2;
    const ch = this.H * 2;
    let best: Uint8Array | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      let cur = new Uint8Array(cw * ch);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const edge = x < 2 || y < 2 || x >= cw - 2 || y >= ch - 2;
          cur[y * cw + x] = edge || this.rand() < 0.62 - c.open * 0.35 ? 1 : 0;
        }
      }
      for (let it = 0; it < 5; it++) {
        const next = new Uint8Array(cw * ch);
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            let n = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx;
                const yy = y + dy;
                n += xx < 0 || yy < 0 || xx >= cw || yy >= ch ? 1 : cur[yy * cw + xx]!;
              }
            }
            next[y * cw + x] = n >= 5 ? 1 : 0;
          }
        }
        cur = next;
      }
      // behold den største sammenhængende hule
      const label = new Int32Array(cw * ch).fill(-1);
      let bestId = -1;
      let bestSize = 0;
      let id = 0;
      for (let s = 0; s < cw * ch; s++) {
        if (cur[s] || label[s] !== -1) continue;
        const stack = [s];
        label[s] = id;
        let size = 0;
        while (stack.length) {
          const p = stack.pop()!;
          size++;
          const x = p % cw;
          const y = (p - x) / cw;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue;
            const q = yy * cw + xx;
            if (!cur[q] && label[q] === -1) {
              label[q] = id;
              stack.push(q);
            }
          }
        }
        if (size > bestSize) {
          bestSize = size;
          bestId = id;
        }
        id++;
      }
      const out = new Uint8Array(cw * ch);
      for (let s = 0; s < cw * ch; s++) out[s] = label[s] === bestId ? 1 : 0;
      best = out;
      if (bestSize / (cw * ch) > 0.22) break;
    }
    const open = best!;
    const floor = matId(c.floor);
    const rock = matId(c.rock);
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= cw || y >= ch ? 0 : open[y * cw + x]!);
    for (let y = 0; y < this.mh; y++) {
      for (let x = 0; x < this.mw; x++) {
        // mask → hulegitter (2 pr. felt), bilineært, med støj i kanten
        const fx = ((x + 0.5) / GROUND_RES) * 2 - 0.5;
        const fy = ((y + 0.5) / GROUND_RES) * 2 - 0.5;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const v = at(x0, y0) * (1 - tx) * (1 - ty) + at(x0 + 1, y0) * tx * (1 - ty) + at(x0, y0 + 1) * (1 - tx) * ty + at(x0 + 1, y0 + 1) * tx * ty;
        const warp = (this.noise((x + 0.5) / GROUND_RES, (y + 0.5) / GROUND_RES, 2.5, 90) - 0.5) * 0.5;
        this.g.data[y * this.mw + x] = v + warp > 0.5 ? floor : rock;
      }
    }
  }

  // ---------------------------------------------------------------- genstande

  private pool(spec: { families?: string[]; tags?: string[]; keys?: string[] }): ObjectKind[] {
    const k = JSON.stringify([spec.families, spec.tags, spec.keys]);
    const hit = this.pools.get(k);
    if (hit) return hit;
    let list = allKinds().filter((o) => !o.key.startsWith('custom-'));
    if (spec.keys) list = list.filter((o) => spec.keys!.includes(o.key));
    else {
      if (spec.families) list = list.filter((o) => spec.families!.includes(o.origin ?? o.family));
      if (spec.tags) {
        const tagged = list.filter((o) => tagsOf(o).some((t) => spec.tags!.includes(t)));
        if (tagged.length) list = tagged;
      }
    }
    this.pools.set(k, list);
    return list;
  }

  private element(kind: ObjectKind, x: number, y: number, scale: number, rot?: number): MapElement {
    const k = scale * (1 + (this.rand() * 2 - 1) * kind.sizeJitter);
    return {
      id: newId(),
      kind: kind.key,
      x: x * CELL_PX,
      y: y * CELL_PX,
      w: kind.w * CELL_PX * k,
      h: kind.h * CELL_PX * k,
      rot: rot ?? (kind.randomRotation ? this.rand() * Math.PI * 2 : 0),
      seed: Math.floor(this.rand() * 2 ** 31),
      z: 0,
      params: defaultParams(kind),
    };
  }

  private nearMat(cx: number, cy: number, mats: Set<number>, r: number): boolean {
    for (let a = 0; a < 8; a++) {
      for (const d of [r * 0.4, r * 0.75, r]) {
        if (mats.has(this.baseAt(cx + Math.cos(a * 0.785) * d, cy + Math.sin(a * 0.785) * d))) return true;
      }
    }
    return false;
  }

  private inStructure(x: number, y: number, m = 0.8): boolean {
    return this.rects.some((r) => x > r.x0 - m && x < r.x1 + m && y > r.y0 - m && y < r.y1 + m);
  }

  private scatter(rule: Rule): void {
    const pool = this.pool(rule);
    if (!pool.length) return;
    const layer = rule.layer ?? 'objects';
    const occ = layer === 'trees' ? this.treeOcc : layer === 'effects' ? null : this.occ;
    const into = layer === 'trees' ? this.trees : layer === 'effects' ? this.effects : this.objects;
    const spacing = layer === 'trees' ? 0.7 : 1;
    const want = Math.round((rule.density * this.W * this.H) / 100);
    const on = rule.on ? new Set(rule.on.map(matId)) : null;
    const water = new Set([MATERIAL_WATER]);
    const rock = this.theme.cave ? new Set([matId(this.theme.cave.rock)]) : null;
    let made = 0;
    for (let tries = 0; tries < want * 6 && made < want; tries++) {
      const x = this.rr(0.3, this.W - 0.3);
      const y = this.rr(0.3, this.H - 0.3);
      if (rule.clump && this.noise(x, y, rule.clump.scale, 120 + pool.length) < 1 - rule.clump.amount) continue;
      const m = this.baseAt(x, y);
      if (m === 0) continue;
      if (on ? !on.has(m) : m === MATERIAL_WATER) continue;
      if (!rule.onRoad && this.onRoad(x, y)) continue;
      if (this.inStructure(x, y)) continue;
      if (rule.nearWater && !this.nearMat(x, y, water, rule.nearWater)) continue;
      if (rule.nearRock && rock && !this.nearMat(x, y, rock, 1.6)) continue;
      const kind = pool[Math.floor(this.rand() * pool.length)]!;
      const s = rule.scale ? this.rr(rule.scale[0], rule.scale[1]) : 1;
      const el = this.element(kind, x, y, s);
      if (occ && occ.hit(el.x, el.y, radiusOf(el), spacing)) continue;
      occ?.add(el.x, el.y, radiusOf(el));
      into.push(el);
      made++;
    }
  }

  // ---------------------------------------------------------------- mure og rum

  private opening(kind: OpeningKind, at: number, width: number): Opening {
    return { id: newId(), kind, at, width, open: false, flip: this.rand() < 0.5 };
  }

  private furnish(room: Rect, items: Furnish[], keepClear: [number, number][]): void {
    for (const f of items) {
      const pool = this.pool(f);
      if (!pool.length) continue;
      const n = this.irange(f.count);
      for (let c = 0; c < n; c++) {
        for (let tries = 0; tries < 30; tries++) {
          const kind = pool[Math.floor(this.rand() * pool.length)]!;
          const hw = (kind.w * (1 + kind.sizeJitter)) / 2;
          const hh = (kind.h * (1 + kind.sizeJitter)) / 2;
          const rw = room.x1 - room.x0;
          const rh = room.y1 - room.y0;
          let x: number;
          let y: number;
          let rot: number | undefined;
          if (f.where === 'wall') {
            const side = this.ri(0, 3) as Side;
            const along = this.rr(0.15, 0.85);
            const inset = Math.max(hw, hh) + 0.45;
            if (side === 0) [x, y, rot] = [room.x0 + along * rw, room.y0 + inset, 0];
            else if (side === 1) [x, y, rot] = [room.x1 - inset, room.y0 + along * rh, Math.PI / 2];
            else if (side === 2) [x, y, rot] = [room.x0 + along * rw, room.y1 - inset, Math.PI];
            else [x, y, rot] = [room.x0 + inset, room.y0 + along * rh, -Math.PI / 2];
            if (kind.randomRotation) rot = undefined;
          } else if (f.where === 'center') {
            x = room.x0 + rw * this.rr(0.35, 0.65);
            y = room.y0 + rh * this.rr(0.35, 0.65);
            if (!kind.randomRotation) rot = this.rand() < 0.5 ? 0 : Math.PI / 2;
          } else {
            x = room.x0 + hw + 0.6 + this.rand() * Math.max(0, rw - 2 * hw - 1.2);
            y = room.y0 + hh + 0.6 + this.rand() * Math.max(0, rh - 2 * hh - 1.2);
            if (!kind.randomRotation) rot = this.rand() < 0.5 ? 0 : Math.PI / 2;
          }
          if (keepClear.some(([dx, dy]) => Math.hypot(dx - x, dy - y) < 2.2)) continue;
          const el = this.element(kind, x, y, 1, rot);
          const overlay = (kind.origin ?? kind.family) === 'light' || (kind.origin ?? kind.family) === 'fog';
          if (!overlay && this.occ.hit(el.x, el.y, radiusOf(el), 1)) continue;
          if (!overlay) this.occ.add(el.x, el.y, radiusOf(el));
          (overlay ? this.effects : this.objects).push(el);
          break;
        }
      }
    }
  }

  private sidePoint(r: Rect, side: Side, pos: number): [number, number] {
    if (side === 0) return [r.x0 + pos, r.y0];
    if (side === 1) return [r.x1, r.y0 + pos];
    if (side === 2) return [r.x1 - pos, r.y1];
    return [r.x0, r.y1 - pos];
  }
  private sideLength = (r: Rect, side: Side) => (side % 2 === 0 ? r.x1 - r.x0 : r.y1 - r.y0);

  /** Murene om et rum: én lukket mur med åbninger, eller (ruin) en mur pr. side med huller og manglende stykker. */
  private roomWalls(r: Rect, style: Building['wall'], gaps: Gap[], ruined = 0): void {
    const px = (x: number, y: number): [number, number] => [x * CELL_PX, y * CELL_PX];
    const thickness = defaultThickness(style);
    const seed = () => Math.floor(this.rand() * 2 ** 31);
    if (!ruined) {
      const w = r.x1 - r.x0;
      const h = r.y1 - r.y0;
      const start = [0, w, w + h, 2 * w + h];
      this.walls.push({
        id: newId(), style, thickness, closed: true, seed: seed(),
        points: [px(r.x0, r.y0), px(r.x1, r.y0), px(r.x1, r.y1), px(r.x0, r.y1)],
        openings: gaps.map((g) => this.opening(g.kind, (start[g.side]! + g.pos) * CELL_PX, g.width * CELL_PX)),
      });
      return;
    }
    for (const side of [0, 1, 2, 3] as Side[]) {
      const len = this.sideLength(r, side);
      const mine = gaps.filter((g) => g.side === side);
      if (!mine.length && this.rand() < ruined / 250) continue;
      const openings = mine.map((g) => this.opening(g.kind, g.pos * CELL_PX, g.width * CELL_PX));
      const breaks = this.rand() < ruined / 100 ? this.ri(1, 2) : 0;
      for (let b = 0; b < breaks; b++) {
        const width = this.rr(1.5, Math.min(6, len * 0.5));
        const pos = this.rr(width / 2 + 0.5, len - width / 2 - 0.5);
        if (openings.some((o) => Math.abs(o.at / CELL_PX - pos) < (o.width / CELL_PX + width) / 2 + 0.3)) continue;
        openings.push(this.opening('opening', pos * CELL_PX, width * CELL_PX));
      }
      const a = this.sidePoint(r, side, 0);
      const z = this.sidePoint(r, side, len);
      this.walls.push({ id: newId(), style, thickness, closed: false, points: [px(a[0], a[1]), px(z[0], z[1])], seed: seed(), openings });
    }
  }

  private pickSide(r: Rect, towards: [number, number] | null): Side {
    if (!towards) return 2;
    const dx = towards[0] - (r.x0 + r.x1) / 2;
    const dy = towards[1] - (r.y0 + r.y1) / 2;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3;
    return dy > 0 ? 2 : 0;
  }

  private buildings(b: Building): void {
    const interior = !!this.theme.interior;
    const n = this.irange(b.count);
    for (let k = 0; k < n; k++) {
      let chosen: Rect | null = null;
      for (let tries = 0; tries < 250 && !chosen; tries++) {
        const w = this.irange(b.w);
        const h = this.irange(b.h);
        const x0 = this.ri(2, Math.max(2, this.W - w - 2));
        const y0 = this.ri(2, Math.max(2, this.H - h - 2));
        const r: Rect = interior ? { x0: 1, y0: 1, x1: this.W - 1, y1: this.H - 1 } : { x0, y0, x1: x0 + w, y1: y0 + h };
        if (r.x1 > this.W - 1 || r.y1 > this.H - 1) continue;
        if (this.rects.some((o) => r.x0 < o.x1 + 2 && r.x1 > o.x0 - 2 && r.y0 < o.y1 + 2 && r.y1 > o.y0 - 2)) continue;
        let bad = false;
        for (let x = r.x0 - 1; x <= r.x1 + 1 && !bad; x++) {
          for (let y = r.y0 - 1; y <= r.y1 + 1 && !bad; y++) {
            if (this.isWater(x, y) || this.onRoad(x, y)) bad = true;
          }
        }
        if (bad) continue;
        if (this.roadPts.length && tries < 150) {
          const cx = (r.x0 + r.x1) / 2;
          const cy = (r.y0 + r.y1) / 2;
          let d = Infinity;
          for (const [x, y] of this.roadPts) d = Math.min(d, Math.hypot(x - cx, y - cy));
          if (d > 16) continue;
        }
        chosen = r;
      }
      if (!chosen) continue;
      const room = chosen;
      this.rects.push(room);
      this.fillRect(room, matId(b.floor));
      const cx = (room.x0 + room.x1) / 2;
      const cy = (room.y0 + room.y1) / 2;
      let near: [number, number] | null = null;
      for (const p of this.roadPts) if (!near || Math.hypot(p[0] - cx, p[1] - cy) < Math.hypot(near[0] - cx, near[1] - cy)) near = p;
      const doorSide = this.pickSide(room, interior ? [this.W / 2, this.H + 10] : near);
      const doorKind = b.door ?? 'door';
      const doorW = doorKind === 'double_door' ? 2 : 1;
      const len = this.sideLength(room, doorSide);
      const doorPos = this.rr(doorW + 1.5, Math.max(doorW + 1.6, len - doorW - 1.5));
      const gaps: Gap[] = [{ side: doorSide, pos: doorPos, kind: doorKind, width: doorW }];
      for (let w = 0; w < (b.windows ?? 0); w++) {
        const side = this.ri(0, 3) as Side;
        const l = this.sideLength(room, side);
        const pos = this.rr(1.5, l - 1.5);
        if (gaps.some((g) => g.side === side && Math.abs(g.pos - pos) < g.width / 2 + 1.5)) continue;
        gaps.push({ side, pos, kind: 'window', width: 1 });
      }
      this.roomWalls(room, b.wall, gaps, b.ruined ?? 0);
      this.furnish(room, b.furnish, [this.sidePoint(room, doorSide, doorPos)]);
    }
  }

  // ---------------------------------------------------------------- dungeon

  private dungeon(d: Dungeon): void {
    const floor = matId(d.floor);
    const rooms: Rect[] = [];
    const want = this.irange(d.rooms);
    for (let tries = 0; tries < 400 && rooms.length < want; tries++) {
      const w = this.irange(d.roomSize);
      const h = this.irange(d.roomSize);
      if (w > this.W - 5 || h > this.H - 5) continue;
      const x0 = this.ri(2, this.W - w - 2);
      const y0 = this.ri(2, this.H - h - 2);
      const r = { x0, y0, x1: x0 + w, y1: y0 + h };
      if (rooms.some((o) => r.x0 < o.x1 + 3 && r.x1 > o.x0 - 3 && r.y0 < o.y1 + 3 && r.y1 > o.y0 - 3)) continue;
      rooms.push(r);
    }
    rooms.sort((a, b) => a.x0 - b.x0);
    const centre = (r: Rect): [number, number] => [Math.round((r.x0 + r.x1) / 2), Math.round((r.y0 + r.y1) / 2)];
    const links: [number, number][] = [];
    for (let i = 1; i < rooms.length; i++) {
      let best = 0;
      let bd = Infinity;
      for (let j = 0; j < i; j++) {
        const dist = Math.hypot(centre(rooms[i]!)[0] - centre(rooms[j]!)[0], centre(rooms[i]!)[1] - centre(rooms[j]!)[1]);
        if (dist < bd) [bd, best] = [dist, j];
      }
      links.push([best, i]);
    }
    for (let e = 0; e < Math.floor(rooms.length / 4); e++) {
      const a = this.ri(0, rooms.length - 1);
      const b = this.ri(0, rooms.length - 1);
      if (a !== b && !links.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) links.push([a, b]);
    }
    for (const r of rooms) this.fillRect(r, floor);
    const gaps = new Map<Rect, Gap[]>(rooms.map((r) => [r, []]));
    const crossings = (path: [number, number][], skip: Rect[]) =>
      path.reduce((n, [x, y]) => n + (rooms.some((r) => !skip.includes(r) && x > r.x0 - 1 && x < r.x1 + 1 && y > r.y0 - 1 && y < r.y1 + 1) ? 1 : 0), 0);
    for (const [ai, bi] of links) {
      const A = rooms[ai]!;
      const B = rooms[bi]!;
      const [ax, ay] = centre(A);
      const [bx, by] = centre(B);
      const sample = (corner: [number, number]): [number, number][] => {
        const out: [number, number][] = [];
        const legs: [[number, number], [number, number]][] = [[[ax, ay], corner], [corner, [bx, by]]];
        for (const [p, q] of legs) {
          const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) * 2));
          for (let s = 0; s <= n; s++) out.push([p[0] + ((q[0] - p[0]) * s) / n, p[1] + ((q[1] - p[1]) * s) / n]);
        }
        return out;
      };
      const horizFirst = sample([bx, ay]);
      const vertFirst = sample([ax, by]);
      const path = crossings(horizFirst, [A, B]) <= crossings(vertFirst, [A, B]) ? horizFirst : vertFirst;
      for (const [x, y] of path) this.fillRect({ x0: x - 1, y0: y - 1, x1: x + 1, y1: y + 1 }, floor);
      const doorAt = (room: Rect, pts: [number, number][]) => {
        const inside = (p: [number, number]) => p[0] >= room.x0 && p[0] <= room.x1 && p[1] >= room.y0 && p[1] <= room.y1;
        const p = pts.find((q) => !inside(q));
        if (!p) return;
        const dl = Math.abs(p[0] - room.x0);
        const dr = Math.abs(p[0] - room.x1);
        const dt = Math.abs(p[1] - room.y0);
        const db = Math.abs(p[1] - room.y1);
        const m = Math.min(dl, dr, dt, db);
        const side: Side = m === dt ? 0 : m === dr ? 1 : m === db ? 2 : 3;
        const pos = side === 0 ? p[0] - room.x0 : side === 1 ? p[1] - room.y0 : side === 2 ? room.x1 - p[0] : room.y1 - p[1];
        const list = gaps.get(room)!;
        const len = this.sideLength(room, side);
        if (pos < 1.5 || pos > len - 1.5 || list.some((g) => g.side === side && Math.abs(g.pos - pos) < 3)) return;
        list.push({ side, pos, kind: this.rand() < 0.4 ? 'double_door' : this.rand() < 0.6 ? 'door' : 'opening', width: 2 });
      };
      doorAt(A, path);
      doorAt(B, [...path].reverse());
    }
    const total = d.types.reduce((s, t) => s + t.weight, 0);
    for (const r of rooms) {
      this.rects.push(r);
      this.roomWalls(r, d.wall, gaps.get(r)!);
      let roll = this.rand() * total;
      const type = d.types.find((t) => (roll -= t.weight) < 0) ?? d.types[0]!;
      this.furnish(r, type.furnish, gaps.get(r)!.map((g) => this.sidePoint(r, g.side, g.pos)));
    }
  }

  // ---------------------------------------------------------------- samlet

  run(): MapDoc {
    const t = this.theme;
    if (t.cave) this.cave(t.cave);
    this.patches();
    this.water();
    this.roads();
    if (t.dungeon) this.dungeon(t.dungeon);
    if (t.buildings) this.buildings(t.buildings);
    for (const rule of t.rules) this.scatter(rule);
    const layers: Layer[] = [this.doc.layers[0]!];
    if (this.f) {
      const fl = createLayer('floor', 'Gulv');
      fl.ground = this.f;
      layers.push(fl);
    }
    const add = (type: 'walls' | 'objects' | 'effects', name: string, height: number, fill: (l: Layer) => void, count: number) => {
      if (!count && name !== 'Genstande') return;
      const l = createLayer(type, name);
      l.height = height;
      fill(l);
      layers.push(l);
    };
    add('walls', 'Mure', 0, (l) => (l.walls = this.walls), this.walls.length);
    add('objects', 'Genstande', 0, (l) => (l.elements = this.objects), this.objects.length);
    add('objects', 'Træer', 3, (l) => (l.elements = this.trees), this.trees.length);
    add('effects', 'Effekter', 0, (l) => (l.elements = this.effects), this.effects.length);
    this.doc.layers = layers;
    this.doc.exports[0]!.name = this.doc.name;
    return this.doc;
  }
}

/** Laver et kort ud fra et tema. Samme tema, størrelse og seed giver samme kort. Resultatet er et almindeligt, redigerbart dokument. */
export function generateMap(opts: GenOptions): MapDoc {
  const theme = themeByKey(opts.theme);
  if (!theme) throw new Error(`Ukendt tema: ${opts.theme}`);
  return new Generator(theme, opts).run();
}
