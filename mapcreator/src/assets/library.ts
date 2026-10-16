import { assetUrl, listAssets, type AssetItem } from '../api';
import { familyAlias, FAMILIES, kind, registerFamily, replaceKindsWithPrefix, type ObjectKind } from '../objects';

/** Egne genstande: billeder, brugeren har importeret. De registreres som almindelige varianter med nøglen `custom-<id>`. */
export const ASSET_PREFIX = 'custom-';
export const OWN_FAMILY = 'own';
const SHADOW = 8;

export const assetKey = (id: string) => `${ASSET_PREFIX}${id}`;

const images = new Map<string, HTMLImageElement>();

async function loadImage(id: string): Promise<HTMLImageElement> {
  const hit = images.get(id);
  if (hit) return hit;
  const img = new Image();
  img.src = assetUrl(id);
  await img.decode();
  images.set(id, img);
  return img;
}

function toKind(item: AssetItem): ObjectKind {
  const wanted = familyAlias(item.family);
  const family = FAMILIES.some((f) => f.key === wanted) ? wanted : OWN_FAMILY;
  return kind({
    key: assetKey(item.id),
    family,
    name: item.name,
    w: item.w,
    h: item.h,
    keepAspect: true,
    randomRotation: item.randomRotation,
    sizeJitter: item.randomRotation ? 0.15 : 0,
    shadow: item.shadow ? SHADOW : 0,
    bleed: 0.02,
    tags: item.tags,
    draw(g, o) {
      const img = images.get(item.id);
      if (!img) return;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, -o.w / 2, -o.h / 2, o.w, o.h);
    },
  });
}

/** Henter biblioteket, indlæser billederne og registrerer genstandene. Mislykkes det, er der blot ingen egne genstande. */
export async function refreshLibrary(): Promise<AssetItem[]> {
  let items: AssetItem[] = [];
  try {
    items = await listAssets();
  } catch {
    items = [];
  }
  const loaded = await Promise.allSettled(items.map((i) => loadImage(i.id)));
  const usable = items.filter((_, n) => loaded[n]!.status === 'fulfilled');
  registerFamily({ key: OWN_FAMILY, label: 'Egne genstande', category: 'own', randomDefault: false });
  replaceKindsWithPrefix(ASSET_PREFIX, usable.map(toKind));
  return items;
}
