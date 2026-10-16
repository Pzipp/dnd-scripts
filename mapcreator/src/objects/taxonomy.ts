import type { CategoryKey, Family, ObjectKind } from './registry';

/**
 * Den samlede ordning af genstandene: hvilke familier der findes, og hvilken kategori de ligger i. Genstandene er skrevet i
 * mange filer (`pack2` … `pack11`, `extra`, `basics`, `dungeon`) med de familier, de blev lavet med; `applyTaxonomy` samler dem her,
 * så vælgeren viser én ordnet liste. Ret ordningen her, ikke i pakkerne.
 *
 * Genstandens egen nøgle ændres aldrig (gamle kort peger på den). `origin` husker den oprindelige familie, så generatorens temaer
 * (`families:`) og tags (`tags.ts`) virker uændret, selvom en genstand er flyttet.
 */
export const FINAL_FAMILIES: Family[] = [
  { key: 'tree', label: 'Træer', category: 'nature', randomDefault: true },
  { key: 'plant', label: 'Planter og blomster', category: 'nature', randomDefault: true },
  { key: 'tallgrass', label: 'Høje græstotter', category: 'nature', randomDefault: true },
  { key: 'mushroom', label: 'Svampe', category: 'nature', randomDefault: false },
  { key: 'rock', label: 'Sten', category: 'nature', randomDefault: true },
  { key: 'mountain', label: 'Bjerge, klipper og grotter', category: 'nature', randomDefault: false },
  { key: 'ravine', label: 'Kløfter og afgrunde', category: 'nature', randomDefault: false },
  { key: 'arctic', label: 'Is og sne', category: 'nature', randomDefault: false },
  { key: 'wood', label: 'Træstammer', category: 'nature', randomDefault: false },
  { key: 'waterx', label: 'Vand, kyst og sump', category: 'nature', randomDefault: false },
  { key: 'farmx', label: 'Landbrug og have', category: 'nature', randomDefault: false },
  { key: 'creature', label: 'Husdyr og vildt', category: 'animals', randomDefault: false },
  { key: 'critter', label: 'Smådyr, fugle og kryb', category: 'animals', randomDefault: false },
  { key: 'table', label: 'Borde', category: 'interior', randomDefault: false },
  { key: 'seat', label: 'Siddepladser', category: 'interior', randomDefault: false },
  { key: 'bed', label: 'Senge og soveværelse', category: 'interior', randomDefault: false },
  { key: 'barrel', label: 'Tønder', category: 'interior', randomDefault: false },
  { key: 'crate', label: 'Kasser, sække og baller', category: 'interior', randomDefault: false },
  { key: 'chest', label: 'Kister og skatte', category: 'interior', randomDefault: false },
  { key: 'storage', label: 'Reoler og stativer', category: 'interior', randomDefault: false },
  { key: 'study', label: 'Bibliotek og studerekammer', category: 'interior', randomDefault: false },
  { key: 'alchemy', label: 'Alkymi og spådom', category: 'interior', randomDefault: false },
  { key: 'kitchen', label: 'Køkken og ildsteder', category: 'interior', randomDefault: false },
  { key: 'provisions', label: 'Madvarer og forråd', category: 'interior', randomDefault: false },
  { key: 'craft', label: 'Værksteder og smedje', category: 'interior', randomDefault: false },
  { key: 'armory', label: 'Våben og rustning', category: 'interior', randomDefault: false },
  { key: 'shop', label: 'Butikker og markedsboder', category: 'interior', randomDefault: false },
  { key: 'tavern', label: 'Taverna', category: 'interior', randomDefault: false },
  { key: 'chapel', label: 'Kirke og tempelindretning', category: 'interior', randomDefault: false },
  { key: 'throne', label: 'Trone- og audienssal', category: 'interior', randomDefault: false },
  { key: 'bath', label: 'Badehus', category: 'interior', randomDefault: false },
  { key: 'toys', label: 'Børneværelse og legetøj', category: 'interior', randomDefault: false },
  { key: 'music', label: 'Musikinstrumenter', category: 'interior', randomDefault: false },
  { key: 'prison', label: 'Fængsel og tortur', category: 'interior', randomDefault: false },
  { key: 'rug', label: 'Tæpper', category: 'interior', randomDefault: false },
  { key: 'fieldcamp', label: 'Lejr og felt', category: 'interior', randomDefault: false },
  { key: 'tent', label: 'Telte', category: 'interior', randomDefault: false },
  { key: 'dockside', label: 'Havn og kaj', category: 'interior', randomDefault: false },
  { key: 'cart', label: 'Vogne', category: 'interior', randomDefault: false },
  { key: 'door', label: 'Døre, porte og gitre', category: 'architecture', randomDefault: false },
  { key: 'facade', label: 'Facade og bygningsdele', category: 'architecture', randomDefault: false },
  { key: 'roof', label: 'Tage', category: 'architecture', randomDefault: false },
  { key: 'stairs', label: 'Trapper', category: 'architecture', randomDefault: false },
  { key: 'bridge', label: 'Broer', category: 'architecture', randomDefault: false },
  { key: 'pillar', label: 'Piller', category: 'architecture', randomDefault: false },
  { key: 'ruins', label: 'Ruiner', category: 'architecture', randomDefault: false },
  { key: 'rubble', label: 'Murbrokker og nedfald', category: 'architecture', randomDefault: true },
  { key: 'tower', label: 'Tårne', category: 'architecture', randomDefault: false },
  { key: 'siege', label: 'Befæstning og belejring', category: 'architecture', randomDefault: false },
  { key: 'fence', label: 'Hegn og gærder', category: 'architecture', randomDefault: false },
  { key: 'sign', label: 'Skilte og vejvisere', category: 'architecture', randomDefault: false },
  { key: 'city', label: 'By og gade', category: 'architecture', randomDefault: false },
  { key: 'well', label: 'Brønde og springvand', category: 'architecture', randomDefault: false },
  { key: 'shrines', label: 'Helligdomme og monumenter', category: 'architecture', randomDefault: false },
  { key: 'sacred', label: 'Stenkredse og megalitter', category: 'architecture', randomDefault: false },
  { key: 'boats', label: 'Både og skibe', category: 'architecture', randomDefault: false },
  { key: 'minex', label: 'Miner og skinner', category: 'architecture', randomDefault: false },
  { key: 'wallmount', label: 'Vægdetaljer', category: 'architecture', randomDefault: false },
  { key: 'trapx', label: 'Fælder', category: 'hazards', randomDefault: false },
  { key: 'hazardx', label: 'Farer og miljø', category: 'hazards', randomDefault: false },
  { key: 'corpse', label: 'Lig og dyrelig', category: 'remains', randomDefault: false },
  { key: 'bones', label: 'Knogler og skeletter', category: 'remains', randomDefault: true },
  { key: 'tracks', label: 'Spor og blod', category: 'remains', randomDefault: false },
  { key: 'graveyard', label: 'Kirkegård og gravsteder', category: 'remains', randomDefault: false },
  { key: 'light', label: 'Lys og bål', category: 'effects', randomDefault: false },
  { key: 'fog', label: 'Tåge', category: 'effects', randomDefault: false },
  { key: 'magic', label: 'Magiske cirkler og segl', category: 'effects', randomDefault: false },
  { key: 'fantasy', label: 'Fantasy og magi', category: 'effects', randomDefault: false },
  { key: 'mystery', label: 'Mystik og ukendte ting', category: 'effects', randomDefault: false },
];

/** Hele den gamle familie flyttes til den nye (se `FINAL_FAMILIES`). */
export const FAMILY_MERGE: Record<string, string> = {
  flora: 'plant',
  groundcover: 'plant',
  desert: 'plant',
  wilds: 'hazardx',
  swamp: 'waterx',
  waterx: 'waterx',
  waterplant: 'waterx',
  cave: 'mountain',
  farm: 'farmx',
  bedroom: 'bed',
  goods: 'crate',
  treasure: 'chest',
  workshop: 'alchemy',
  hearth: 'kitchen',
  feast: 'table',
  camp: 'fieldcamp',
  stall: 'shop',
  torture: 'prison',
  harbor: 'dockside',
  gate: 'door',
  carved: 'stairs',
  rockfall: 'rubble',
  ships: 'boats',
  statue: 'shrines',
  tomb: 'shrines',
  megalith: 'sacred',
  trap: 'trapx',
  bodies: 'corpse',
  blood: 'tracks',
  gravex: 'graveyard',
  lightx: 'light',
  spellx: 'magic',
  arcane: 'fantasy',
};

/** Enkelte genstande, der flyttes til en anden familie end resten af deres gamle familie (nøgle → ny familie). */
export const KIND_MOVE: Record<string, string> = {
  anvil: 'craft', // Ambolt
  bar_counter: 'tavern', // Bardisk
  body_bone_heap: 'bones', // Knoglebunke
  body_skeleton: 'bones', // Skelet, helt
  bridge_rope: 'bridge', // Rebbro
  bridge_stone: 'bridge', // Stenbro
  cypress_stump: 'wood', // Cypresstub
  designer_robaad: 'boats', // Robåd
  fallen_tree: 'wood', // Væltet træ med rødder
  farmx_boundary_stone: 'sign', // Markskel
  farmx_cairn: 'sign', // Stenvarde
  farmx_fence_hurdle: 'fence', // Kvasgærde
  farmx_fence_iron: 'fence', // Jernhegn
  farmx_fence_picket: 'fence', // Stakit
  farmx_fence_rail: 'fence', // Hegn med liggere
  farmx_fence_stone: 'fence', // Stendige
  farmx_fence_wicker: 'fence', // Flettet gærde
  farmx_milestone: 'sign', // Mile- og vejsten
  farmx_signpost_2: 'sign', // Vejviser, to retninger
  farmx_signpost_4: 'sign', // Vejkryds-skilt, fire retninger
  feast_platter: 'provisions', // Fad med steg
  feast_wine_rack: 'provisions', // Vinhylde
  flora_baobab: 'tree', // Baobab
  flora_birch_autumn: 'tree', // Birk i efterårsfarver
  flora_charred_tree: 'tree', // Forkullet træ
  flora_cherry_blossom: 'tree', // Kirsebærtræ i blomst
  flora_fruit_tree: 'tree', // Frugttræ med frugt
  flora_mangrove: 'tree', // Mangrove
  flora_mushroom_tree: 'mushroom', // Kæmpesvamp
  flora_palm_coconut: 'tree', // Kokospalme
  flora_palm_fan: 'tree', // Vifte-palme
  flora_snow_pine: 'tree', // Fyr i sne
  forge: 'craft', // Esse
  gravesite_cross: 'graveyard', // Grav med trækors
  gravesite_headstone: 'graveyard', // Grav med gravsten
  gravesite_mound: 'graveyard', // Gravhøj, lille
  gravesite_open: 'graveyard', // Åben grav
  gravex_lamp_hanging: 'city', // Hængende lanterne
  gravex_lamp_standing: 'city', // Lygtepæl, tændt
  gravex_lamppost: 'city', // Lygtepæl
  gravex_wagon_abandoned: 'cart', // Forladt vogn
  gravex_wagon_broken: 'cart', // Vognvrag, brækket aksel
  gravex_wagon_covered: 'cart', // Dækket vogn, forladt
  gravex_waymarks_marker: 'sign', // Vejafmærkning, markører
  gravex_waymarks_posts: 'sign', // Vejafmærkning, pæle
  gravex_waymarks_stones: 'sign', // Vejafmærkning, stenvarder
  gravex_wayside_cross: 'shrines', // Vejsidekors, sten
  gravex_wayside_cross_wood: 'shrines', // Vejsidekors, træ
  milcamp_lean_to: 'tent', // Skjul af stof
  milcamp_palisade: 'siege', // Palisade
  milcamp_palisade_corner: 'siege', // Palisadehjørne
  milcamp_palisade_gate: 'siege', // Palisadeport
  milcamp_pavilion: 'tent', // Pavillon
  milcamp_spears: 'armory', // Bundt af spyd
  milcamp_tent_nomad: 'tent', // Nomadetelt
  milcamp_tent_soldier: 'tent', // Soldatertelt
  milcamp_tent_wide: 'tent', // Bredt hærtelt
  milcamp_trench: 'siege', // Skyttegrav
  milcamp_trench_bags: 'siege', // Skyttegrav med sandsække
  milcamp_trench_stakes: 'siege', // Skyttegrav med spidse pæle
  milcamp_wagon: 'cart', // Forsyningsvogn
  milcamp_watch_post: 'siege', // Vagtpost (platform)
  obelisk: 'shrines', // Obelisk
  palm_date: 'tree', // Daddelpalme
  pit_chasm: 'ravine', // Hul / afgrund
  rotten_planks: 'wood', // Rådne planker
  rowboat: 'boats', // Robåd
  weapon_rack: 'armory', // Våbenstativ
  will_o_wisp: 'light', // Lygtemand
};

/** Det gamle familienavn → det nuværende (til egne genstande og gamle gemte valg). */
export const familyAlias = (key: string): string => FAMILY_MERGE[key] ?? key;

/** Flytter genstandene til den nye ordning. Kaldes én gang, før genstandene registreres. */
export function applyTaxonomy(kinds: ObjectKind[]): ObjectKind[] {
  for (const k of kinds) {
    k.origin ??= k.family;
    k.family = KIND_MOVE[k.key] ?? familyAlias(k.family);
  }
  return kinds;
}

export type { CategoryKey };

