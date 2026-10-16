import type { ObjectKind } from '../objects';
import { CELL_PX, type MapElement } from './types';

const HASH = 100;

/** Genstandens "radius" til afstandstjek: lidt mindre end halve størrelsen, så kroner må overlappe lidt. */
export const radiusOf = (el: Pick<MapElement, 'w' | 'h'>): number => ((el.w + el.h) / 4) * 0.85;

export interface ScatterOptions {
  /** 0..1 */
  density: number;
  /** Penselens radius i verdenspixels. */
  radius: number;
  avoidWater: boolean;
  /** Materiale i et punkt (se `materialAt`). */
  materialAt: (x: number, y: number) => number;
  /** Næste variant, der skal sættes ud (tilfældig eller fast). */
  pickKind: () => ObjectKind | undefined;
  newId: () => string;
  newSeed: () => number;
  /** Kortets størrelse i verdenspixels; ingenting sættes uden for. */
  bounds: { w: number; h: number };
  /** Er punktet (med radius) optaget af noget andet end genstande, fx en mur? */
  blocked?: (x: number, y: number, r: number) => boolean;
  rand?: () => number;
}

export const WATER = 6;

/** Halv genstandsradius (til tjek mod mure: kroner må gerne række lidt ind over). */
const radiusOfKind = (kind: ObjectKind): number => (((kind.w + kind.h) * CELL_PX) / 4) * 0.5;

/** Et scatter-strøg: spreder genstande uden at lægge dem oven i hinanden, og husker det, der er sat ud. */
export class ScatterStroke {
  readonly placed: MapElement[] = [];
  private grid = new Map<string, { x: number; y: number; r: number }[]>();

  constructor(existing: Pick<MapElement, 'x' | 'y' | 'w' | 'h'>[] = []) {
    for (const e of existing) this.add(e.x, e.y, radiusOf(e));
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private add(x: number, y: number, r: number): void {
    const k = this.key(Math.floor(x / HASH), Math.floor(y / HASH));
    const cell = this.grid.get(k);
    if (cell) cell.push({ x, y, r });
    else this.grid.set(k, [{ x, y, r }]);
  }

  private blocked(x: number, y: number, r: number, spacing: number): boolean {
    const reach = Math.ceil((r + 400) / HASH);
    const cx = Math.floor(x / HASH);
    const cy = Math.floor(y / HASH);
    for (let i = -reach; i <= reach; i++) {
      for (let j = -reach; j <= reach; j++) {
        const cell = this.grid.get(this.key(cx + i, cy + j));
        if (!cell) continue;
        for (const o of cell) if (Math.hypot(o.x - x, o.y - y) < (o.r + r) * spacing) return true;
      }
    }
    return false;
  }

  /** Forsøger at sætte genstande ud omkring (cx, cy). Returnerer de nye. */
  stamp(cx: number, cy: number, o: ScatterOptions): MapElement[] {
    const rand = o.rand ?? Math.random;
    const added: MapElement[] = [];
    // tæt = små afstande (kroner overlapper), tyndt = god plads
    const spacing = 1.2 - o.density * 0.7;
    const probe = o.pickKind();
    if (!probe) return added;
    const avg = (probe.w + probe.h) * 0.5 * CELL_PX;
    const attempts = Math.min(60, Math.max(3, Math.ceil(o.density * 12 * (o.radius / avg) ** 2)));
    for (let n = 0; n < attempts; n++) {
      const kind = o.pickKind();
      if (!kind) continue;
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * o.radius;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      if (x < 0 || y < 0 || x > o.bounds.w || y > o.bounds.h) continue;
      if (o.avoidWater && o.materialAt(x, y) === WATER) continue;
      if (o.blocked?.(x, y, radiusOfKind(kind))) continue;
      const k = 1 + (rand() * 2 - 1) * kind.sizeJitter;
      const el: MapElement = {
        id: o.newId(),
        kind: kind.key,
        x,
        y,
        w: kind.w * CELL_PX * k,
        h: kind.h * CELL_PX * k,
        rot: kind.randomRotation ? rand() * Math.PI * 2 : 0,
        seed: o.newSeed(),
        z: 0,
        params: Object.fromEntries(kind.params.map((p) => [p.key, p.default])),
      };
      const r = radiusOf(el);
      if (this.blocked(x, y, r, spacing)) continue;
      this.add(x, y, r);
      this.placed.push(el);
      added.push(el);
    }
    return added;
  }

  /** Samme som `stamp` langs en linje (så hurtige træk ikke efterlader huller). */
  line(ax: number, ay: number, bx: number, by: number, o: ScatterOptions): MapElement[] {
    const step = Math.max(10, o.radius * 0.6);
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    const out: MapElement[] = [];
    for (let k = 0; k <= n; k++) out.push(...this.stamp(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, o));
    return out;
  }
}

/** Genstande, hvis midtpunkt ligger inden for cirklen (til "fjern"-tilstand). */
export function elementsInCircle(els: MapElement[], cx: number, cy: number, radius: number): MapElement[] {
  return els.filter((e) => Math.hypot(e.x - cx, e.y - cy) <= radius);
}
