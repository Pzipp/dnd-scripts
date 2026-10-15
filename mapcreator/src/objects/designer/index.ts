import { kind, type ObjectKind } from '../registry';
import items from './items.json';

/**
 * Malede genstande (billeder, lavet med Microsoft Designer og friklippet med importværktøjet). De ligger som
 * `<key>.webp` ved siden af `items.json` og bygges ind i appen. Se docs/mapcreator-objects.md for at tilføje flere.
 */
interface Item {
  key: string;
  name: string;
  family: string;
  w: number;
  h: number;
  shadow: boolean;
  randomRotation: boolean;
  tags?: string[];
}

const urls = import.meta.glob('./*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const SHADOW = 8;
export const DESIGNER_PREFIX = 'designer_';
const images = new Map<string, HTMLImageElement>();

/** Indlæser billederne, så de kan tegnes synkront. Et billede, der ikke kan indlæses, tegnes bare ikke. */
export async function loadDesignerImages(): Promise<void> {
  if (typeof Image === 'undefined') return;
  await Promise.allSettled(
    (items as Item[]).map(async (it) => {
      const url = urls[`./${it.key}.webp`];
      if (!url || images.has(it.key)) return;
      const img = new Image();
      img.src = url;
      await img.decode();
      images.set(it.key, img);
    }),
  );
}

export const designerKinds: ObjectKind[] = (items as Item[]).map((it) =>
  kind({
    key: DESIGNER_PREFIX + it.key,
    family: it.family,
    name: it.name,
    w: it.w,
    h: it.h,
    keepAspect: true,
    randomRotation: it.randomRotation,
    sizeJitter: it.randomRotation ? 0.15 : 0,
    shadow: it.shadow ? SHADOW : 0,
    bleed: 0.02,
    tags: it.tags,
    draw(g, o) {
      const img = images.get(it.key);
      if (!img) return;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
    },
  }),
);
