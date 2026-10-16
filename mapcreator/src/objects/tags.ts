import type { ObjectKind } from './registry';

/**
 * Tags beskriver, hvor og hvordan en genstand hører hjemme, så en generator (eller en filtrering i vælgeren) kan bede om
 * "alt til en sump" i stedet for at nævne bestemte genstande. Nye varianter dukker så op i temaerne af sig selv.
 *
 * Tags kommer fra tre steder, der lægges sammen: familiens tags (`FAMILY_TAGS`), enkelte varianters ekstra tags
 * (`KIND_TAGS`) og `tags` på selve varianten (til nye varianter og familier).
 */
export const TAGS = {
  // steder og stemning
  outdoor: 'Udendørs',
  indoor: 'Indendørs',
  forest: 'Skov',
  grassland: 'Eng og slette',
  swamp: 'Sump',
  desert: 'Ørken',
  arctic: 'Arktisk',
  mountain: 'Bjerg',
  cave: 'Grotte',
  water: 'Vand og kyst',
  farm: 'Gård',
  village: 'Landsby',
  city: 'By',
  harbor: 'Havn og skib',
  tavern: 'Kro',
  house: 'Hjem',
  camp: 'Lejr',
  dungeon: 'Dungeon',
  crypt: 'Krypt og grav',
  graveyard: 'Kirkegård',
  ruin: 'Ruin',
  temple: 'Tempel og kirke',
  military: 'Militær',
  battlefield: 'Slagmark',
  magic: 'Magi',
  // karakter
  rich: 'Rig',
  poor: 'Fattig',
} as const;

export type Tag = keyof typeof TAGS;

export const FAMILY_TAGS: Record<string, Tag[]> = {
  tree: ['outdoor', 'forest', 'grassland'],
  rock: ['outdoor', 'mountain', 'cave', 'desert', 'grassland'],
  plant: ['outdoor', 'forest', 'grassland', 'swamp'],
  wood: ['outdoor', 'forest', 'camp'],
  table: ['indoor', 'tavern', 'house'],
  seat: ['indoor', 'tavern', 'house'],
  barrel: ['indoor', 'tavern', 'harbor', 'dungeon', 'village'],
  crate: ['indoor', 'harbor', 'dungeon', 'city', 'farm'],
  chest: ['indoor', 'dungeon', 'house', 'rich'],
  bed: ['indoor', 'house', 'tavern', 'camp'],
  corpse: ['dungeon', 'battlefield', 'crypt', 'outdoor'],
  blood: ['dungeon', 'battlefield', 'crypt', 'outdoor'],
  bones: ['dungeon', 'crypt', 'cave', 'desert', 'battlefield'],
  pillar: ['indoor', 'dungeon', 'ruin', 'temple'],
  stairs: ['indoor', 'dungeon', 'house', 'city'],
  rubble: ['ruin', 'dungeon', 'city', 'battlefield', 'cave'],
  light: ['indoor', 'outdoor', 'dungeon', 'camp'],
  fog: ['outdoor', 'swamp', 'graveyard', 'cave'],
  // pakke 1
  mushroom: ['forest', 'cave', 'swamp'],
  tallgrass: ['outdoor', 'grassland', 'farm'],
  waterplant: ['swamp', 'water'],
  groundcover: ['outdoor', 'forest'],
  megalith: ['outdoor', 'magic', 'ruin', 'mountain'],
  stall: ['city', 'village', 'outdoor'],
  well: ['city', 'village', 'outdoor'],
  cart: ['city', 'village', 'farm', 'harbor', 'outdoor'],
  goods: ['farm', 'village', 'harbor', 'tavern'],
  hearth: ['indoor', 'house', 'tavern', 'village'],
  rug: ['indoor', 'house', 'rich', 'tavern'],
  storage: ['indoor', 'house', 'military'],
  treasure: ['dungeon', 'rich', 'crypt'],
  tent: ['camp', 'outdoor', 'military'],
  camp: ['camp', 'outdoor'],
  tomb: ['crypt', 'dungeon', 'temple'],
  magic: ['magic', 'dungeon', 'temple'],
  trap: ['dungeon'],
  statue: ['city', 'ruin', 'temple', 'rich', 'crypt', 'graveyard'],
  // pakke 2
  graveyard: ['graveyard', 'crypt', 'outdoor', 'temple'],
  harbor: ['harbor', 'water', 'city', 'outdoor'],
  desert: ['desert', 'outdoor'],
  arctic: ['arctic', 'outdoor', 'mountain'],
  swamp: ['swamp', 'outdoor', 'water'],
  farm: ['farm', 'village', 'outdoor'],
  arcane: ['magic', 'dungeon', 'temple'],
  workshop: ['magic', 'indoor', 'house', 'rich'],
  city: ['city', 'village', 'outdoor'],
  prison: ['dungeon', 'military', 'indoor'],
  tavern: ['tavern', 'indoor', 'house'],
  wilds: ['outdoor', 'forest', 'swamp', 'desert'],
  cave: ['cave', 'dungeon', 'mountain'],
  // dungeon
  gate: ['dungeon', 'ruin', 'city', 'military', 'crypt'],
  rockfall: ['cave', 'dungeon', 'ruin', 'mountain'],
  carved: ['cave', 'dungeon', 'mountain', 'crypt'],
  wallmount: ['dungeon', 'cave', 'crypt', 'indoor'],
};

/** Ekstra tags til enkelte varianter (oven i familiens). */
export const KIND_TAGS: Record<string, Tag[]> = {
  tree_spruce: ['arctic', 'mountain'],
  tree_pine: ['arctic', 'mountain'],
  tree_dead: ['swamp', 'ruin', 'graveyard', 'battlefield'],
  rock_boulder: ['mountain'],
  reeds: ['water'],
  fern: ['swamp'],
  flowers: ['village', 'farm'],
  log: ['camp'],
  table_long: ['military'],
  barrel_broken: ['battlefield', 'ruin'],
  crate_broken: ['battlefield', 'ruin'],
  chest_broken: ['ruin', 'battlefield'],
  bedroll: ['camp', 'military'],
  torch: ['dungeon', 'crypt'],
  campfire: ['camp', 'outdoor'],
  corpse_goblin: ['cave'],
  corpse_orc: ['battlefield'],
  pillar_broken: ['ruin'],
  stairs_wood: ['house', 'village'],
};

/** Alle tags for en variant: familiens + variantens egne. */
export function tagsOf(kind: Pick<ObjectKind, 'key' | 'family'> & { origin?: string; tags?: string[] }): Tag[] {
  const out = new Set<Tag>([...(FAMILY_TAGS[kind.origin ?? kind.family] ?? []), ...(KIND_TAGS[kind.key] ?? []), ...((kind.tags ?? []) as Tag[])]);
  return [...out];
}

export const isTag = (t: string): t is Tag => t in TAGS;
