import { resolveKind, type ObjectKind } from '../objects';
import type { Layer, MapDoc, MapElement } from '../model/types';
import { FULL_PROFILE, type QualityProfile } from './quality';

/** Tegner hver genstand én gang til et lille lærred og genbruger det, så mange genstande kan tegnes hurtigt. */
interface Sprite {
  canvas: HTMLCanvasElement;
  ox: number;
  oy: number;
  ww: number;
  hh: number;
}

const MAX_SPRITES = 400;
const MAX_PIXELS = 6_000_000;
const cache = new Map<string, Sprite>();

/** Sprite-opløsning (pixels pr. verdenspixel) ud fra det samlede zoom: potens af 2, så cachen genbruges. */
export function spriteScale(deviceScale: number, cap = 2): number {
  return Math.min(cap, Math.max(0.125, 2 ** Math.ceil(Math.log2(Math.max(deviceScale, 1e-6)))));
}

function paramsKey(p: MapElement['params']): string {
  return Object.keys(p).sort().map((k) => `${k}=${String(p[k])}`).join(',');
}

export function getSprite(el: Pick<MapElement, 'seed' | 'w' | 'h' | 'params'>, kind: ObjectKind, scale: number): Sprite {
  const key = `${kind.key}|${el.seed}|${Math.round(el.w)}|${Math.round(el.h)}|${scale}|${paramsKey(el.params)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const padX = kind.bleed * el.w;
  const padY = kind.bleed * el.h;
  const ww = el.w + 2 * padX;
  const hh = el.h + 2 * padY;
  let s = scale;
  while (ww * s * hh * s > MAX_PIXELS) s /= 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(ww * s));
  canvas.height = Math.max(1, Math.ceil(hh * s));
  const g = canvas.getContext('2d')!;
  g.scale(canvas.width / ww, canvas.height / hh);
  g.translate(ww / 2, hh / 2);
  kind.draw(g, { w: el.w, h: el.h, seed: el.seed, params: el.params });
  const sprite: Sprite = { canvas, ox: -ww / 2, oy: -hh / 2, ww, hh };
  cache.set(key, sprite);
  if (cache.size > MAX_SPRITES) cache.delete(cache.keys().next().value!);
  return sprite;
}

/** Genstande i tegnerækkefølge: lav z først, derefter rækkefølgen i laget. */
export function sortedElements(layer: Layer): MapElement[] {
  const els = layer.elements ?? [];
  return els.map((e, i) => [e, i] as const).sort((a, b) => a[0].z - b[0].z || a[1] - b[1]).map((p) => p[0]);
}

/**
 * Tegner én genstand med skygge. `deviceScale` er den samlede skalering på lærredet (zoom i forhåndsvisningen,
 * pixels pr. verdenspixel i eksporten); skyggens forskydning og sløring regnes i lærredets pixels.
 */
export function drawElement(ctx: CanvasRenderingContext2D, el: MapElement, layer: Layer, doc: Pick<MapDoc, 'lightAngle'>, deviceScale: number, q: QualityProfile = FULL_PROFILE): void {
  const kind = resolveKind(el.kind);
  ctx.save();
  ctx.translate(el.x, el.y);
  ctx.rotate(el.rot);
  if (!kind) {
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#e05a4a';
    ctx.lineWidth = 2 / deviceScale;
    ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
    ctx.restore();
    return;
  }
  const spr = getSprite(el, kind, spriteScale(deviceScale, q.sprite));
  if (kind.shadow > 0) {
    const dist = kind.shadow + (layer.height + el.z) * 6;
    const a = (doc.lightAngle * Math.PI) / 180;
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = dist * 0.55 * q.shadow * deviceScale;
    ctx.shadowOffsetX = -Math.cos(a) * dist * deviceScale;
    ctx.shadowOffsetY = -Math.sin(a) * dist * deviceScale;
  }
  ctx.drawImage(spr.canvas, spr.ox, spr.oy, spr.ww, spr.hh);
  ctx.restore();
}

export function drawElementsLayer(ctx: CanvasRenderingContext2D, layer: Layer, doc: Pick<MapDoc, 'lightAngle'>, deviceScale: number, q: QualityProfile = FULL_PROFILE): void {
  for (const el of sortedElements(layer)) drawElement(ctx, el, layer, doc, deviceScale, q);
}
