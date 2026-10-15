import type { Furnish, Theme } from './spec';

const torches: Furnish = { keys: ['torch'], count: [2, 5], where: 'wall' };

export const THEMES: Theme[] = [
  {
    key: 'forest', name: 'Skov', hint: 'Tæt skov med lysninger, en slingrende sti og lidt vand.', size: [80, 55], base: 'grass_forest',
    patches: [
      { material: 'grass', scale: 14, amount: 0.22 },
      { material: 'earth', scale: 9, amount: 0.1 },
      { material: 'mud', scale: 6, amount: 0.03, on: ['earth'] },
    ],
    water: { lakes: { count: [0, 1], radius: [3, 6] }, bank: { material: 'mud', width: 1.2 } },
    roads: [{ material: 'earth', layer: 'path', width: [1.6, 2.4], count: [1, 1], meander: 0.5 }],
    rules: [
      { families: ['tree'], tags: ['forest'], density: 3.6, layer: 'trees', clump: { scale: 16, amount: 0.55 } },
      { families: ['tree'], density: 0.6, layer: 'trees', scale: [0.9, 1.3] },
      { families: ['plant', 'groundcover'], density: 5, clump: { scale: 8, amount: 0.5 } },
      { families: ['mushroom'], density: 0.5, clump: { scale: 6, amount: 0.3 } },
      { families: ['rock'], density: 1 },
      { families: ['wood'], density: 0.7 },
      { families: ['tallgrass'], density: 2, on: ['grass'] },
    ],
  },
  {
    key: 'swamp', name: 'Mose', hint: 'Mudder, vandhuller, døde træer og tåge.', size: [70, 50], base: 'mud',
    patches: [
      { material: 'grass_forest', scale: 10, amount: 0.3 },
      { material: 'earth', scale: 8, amount: 0.1 },
    ],
    water: { lakes: { count: [4, 8], radius: [2, 6] }, bank: { material: 'mud', width: 1.5 } },
    roads: [{ material: 'earth', layer: 'path', width: [1.2, 1.8], count: [1, 1], meander: 0.8 }],
    rules: [
      { families: ['tree'], tags: ['swamp'], density: 3, layer: 'trees', clump: { scale: 12, amount: 0.5 } },
      { families: ['swamp'], density: 1.2 },
      { families: ['waterplant'], density: 3, nearWater: 3, on: ['water'] },
      { families: ['plant'], tags: ['swamp'], density: 4, clump: { scale: 8, amount: 0.5 } },
      { families: ['mushroom'], density: 0.6 },
      { families: ['fog'], density: 0.2, layer: 'effects', on: ['mud', 'grass_forest', 'water'] },
      { families: ['bones'], density: 0.15 },
    ],
  },
  {
    key: 'desert', name: 'Ørken', hint: 'Klitter, bart fjeld, en karavanesti og tit en oase.', size: [80, 55], base: 'desert',
    patches: [
      { material: 'sand', scale: 16, amount: 0.3 },
      { material: 'sand_red', scale: 20, amount: 0.12 },
      { material: 'sand_pale', scale: 12, amount: 0.1 },
      { material: 'stone', scale: 9, amount: 0.07 },
    ],
    water: { lakes: { count: [0, 1], radius: [2.5, 4] }, bank: { material: 'grass_dry', width: 2.5 } },
    roads: [{ material: 'gravel', layer: 'path', width: [1.4, 2], count: [1, 1], meander: 0.35 }],
    rules: [
      { families: ['desert'], density: 1.4 },
      { families: ['rock'], tags: ['desert'], density: 1.5, clump: { scale: 10, amount: 0.4 } },
      { families: ['bones'], density: 0.3 },
      { families: ['tree', 'plant'], tags: ['desert'], density: 0.8, on: ['grass_dry'] },
      { families: ['plant'], density: 1.5, on: ['grass_dry'] },
    ],
  },
  {
    key: 'snow', name: 'Snelandskab', hint: 'Sne, granskov, klipper og et frosset hul.', size: [80, 55], base: 'snow',
    patches: [
      { material: 'stone', scale: 11, amount: 0.12 },
      { material: 'grass_dry', scale: 9, amount: 0.05, on: ['stone'] },
    ],
    water: { lakes: { count: [0, 2], radius: [3, 6] }, bank: { material: 'stone', width: 1 } },
    roads: [{ material: 'earth', layer: 'path', width: [1.4, 2], count: [1, 1], meander: 0.5 }],
    rules: [
      { families: ['tree'], tags: ['arctic'], density: 3.5, layer: 'trees', clump: { scale: 16, amount: 0.6 } },
      { families: ['arctic'], density: 2 },
      { families: ['rock'], density: 1.8, clump: { scale: 9, amount: 0.4 } },
      { families: ['wood'], density: 0.3 },
    ],
  },
  {
    key: 'cave', name: 'Grotte', hint: 'Snoede hulegange med drypsten, svampe og vandpytter.', size: [70, 50], base: 'rock_dark',
    cave: { floor: 'stone', rock: 'rock_dark', open: 0.5 },
    patches: [
      { material: 'earth', scale: 7, amount: 0.2, on: ['stone'] },
      { material: 'water', scale: 6, amount: 0.07, on: ['stone', 'earth'] },
      { material: 'mud', scale: 5, amount: 0.05, on: ['earth'] },
    ],
    rules: [
      { families: ['cave'], density: 0.8, on: ['stone', 'earth'] },
      { families: ['rock'], density: 3, nearRock: true, on: ['stone', 'earth'] },
      { families: ['mushroom'], density: 0.8, on: ['stone', 'earth', 'mud'], clump: { scale: 6, amount: 0.3 } },
      { families: ['bones'], density: 0.3, on: ['stone', 'earth'] },
      { families: ['rubble'], density: 0.5, on: ['stone', 'earth'] },
      { families: ['fog'], density: 0.08, layer: 'effects', on: ['stone', 'earth', 'water'] },
    ],
  },
  {
    key: 'riverbank', name: 'Flodbred', hint: 'En bred flod med sandbred, siv og et vadested.', size: [80, 55], base: 'grass',
    patches: [
      { material: 'grass_forest', scale: 14, amount: 0.25 },
      { material: 'earth', scale: 8, amount: 0.07 },
    ],
    water: { rivers: { count: [1, 1], width: [6, 9], meander: 0.6 }, bank: { material: 'sand_pale', width: 1.8 } },
    roads: [{ material: 'gravel', layer: 'path', width: [1.6, 2.2], count: [1, 1], meander: 0.4 }],
    rules: [
      { families: ['tree'], tags: ['forest'], density: 2.5, layer: 'trees', clump: { scale: 12, amount: 0.5 }, nearWater: 14 },
      { families: ['waterplant'], density: 3, nearWater: 3, on: ['water'] },
      { families: ['plant'], tags: ['swamp'], density: 3, nearWater: 5 },
      { families: ['plant', 'tallgrass'], density: 4, clump: { scale: 9, amount: 0.5 } },
      { families: ['rock'], density: 1 },
      { families: ['harbor'], tags: ['water'], density: 0.1, nearWater: 3, on: ['sand_pale'] },
    ],
  },
  {
    key: 'mountain', name: 'Bjergsti', hint: 'Bart fjeld, grus og en smal sti mellem klippeblokke.', size: [80, 55], base: 'stone',
    patches: [
      { material: 'gravel', scale: 10, amount: 0.25 },
      { material: 'grass_dry', scale: 14, amount: 0.2 },
      { material: 'earth', scale: 8, amount: 0.12 },
      { material: 'snow', scale: 18, amount: 0.12 },
    ],
    roads: [{ material: 'earth', layer: 'path', width: [1.1, 1.6], count: [1, 1], meander: 0.9 }],
    rules: [
      { families: ['rock'], density: 6, clump: { scale: 8, amount: 0.5 } },
      { families: ['tree'], tags: ['mountain'], density: 1.2, layer: 'trees', on: ['grass_dry', 'earth', 'gravel'] },
      { families: ['plant'], density: 1.2, on: ['grass_dry', 'earth'] },
      { families: ['megalith'], density: 0.05 },
      { families: ['bones'], density: 0.1 },
    ],
  },
  {
    key: 'village', name: 'Landsby', hint: 'Huse langs en brolagt vej med brønd, vogne og marked.', size: [90, 65], base: 'grass',
    patches: [
      { material: 'grass_forest', scale: 14, amount: 0.15 },
      { material: 'earth', scale: 9, amount: 0.1 },
    ],
    roads: [
      { material: 'cobble', layer: 'path', width: [2.6, 3.2], count: [1, 1], meander: 0.15 },
      { material: 'earth', layer: 'path', width: [1.4, 2], count: [1, 2], meander: 0.4 },
    ],
    buildings: {
      w: [7, 12], h: [6, 10], count: [8, 12], wall: 'wood', floor: 'planks', windows: 2,
      furnish: [
        { families: ['table'], count: [1, 2], where: 'center' },
        { families: ['seat'], count: [2, 5], where: 'any' },
        { families: ['bed'], count: [1, 2], where: 'wall' },
        { families: ['hearth'], count: [1, 1], where: 'wall' },
        { families: ['chest', 'barrel', 'crate'], count: [1, 3], where: 'wall' },
        { families: ['rug'], count: [0, 1], where: 'center' },
      ],
    },
    rules: [
      { families: ['tree'], tags: ['village', 'grassland'], density: 1.5, layer: 'trees' },
      { families: ['plant', 'tallgrass'], density: 3, clump: { scale: 10, amount: 0.4 } },
      { families: ['well'], density: 0.04, onRoad: true },
      { families: ['cart', 'stall'], density: 0.15 },
      { families: ['farm'], density: 0.4 },
      { families: ['barrel', 'crate'], density: 0.3 },
      { families: ['rock'], density: 0.4 },
    ],
  },
  {
    key: 'tavern', name: 'Kro', hint: 'Skænkestue med borde, bar, pejs og værelser.', size: [34, 26], base: 'grass',
    interior: true,
    buildings: {
      w: [30, 30], h: [22, 22], count: [1, 1], wall: 'wood', floor: 'planks', windows: 5, door: 'double_door',
      furnish: [
        { families: ['table'], tags: ['tavern'], count: [6, 9], where: 'any' },
        { families: ['seat'], count: [14, 22], where: 'any' },
        { families: ['barrel'], count: [4, 8], where: 'wall' },
        { families: ['hearth'], count: [1, 2], where: 'wall' },
        { families: ['tavern'], count: [3, 6], where: 'wall' },
        { families: ['rug'], count: [1, 2], where: 'center' },
        { keys: ['torch'], count: [3, 6], where: 'wall' },
        { families: ['stairs'], count: [1, 1], where: 'wall' },
      ],
    },
    rules: [
      { families: ['barrel', 'crate'], density: 0.4 },
      { families: ['plant'], density: 1.5 },
    ],
  },
  {
    key: 'ruin', name: 'Ruin', hint: 'Faldne mure, brokker, statuer og overgroet sten.', size: [70, 50], base: 'grass_forest',
    patches: [
      { material: 'grass', scale: 10, amount: 0.2 },
      { material: 'earth', scale: 8, amount: 0.1 },
      { material: 'stone', scale: 10, amount: 0.08 },
    ],
    roads: [{ material: 'cobble', layer: 'path', width: [1.8, 2.4], count: [1, 1], meander: 0.2 }],
    buildings: {
      w: [8, 16], h: [7, 13], count: [3, 5], wall: 'stone', floor: 'flagstone', windows: 1, ruined: 45,
      furnish: [
        { families: ['rubble'], count: [3, 8], where: 'any' },
        { families: ['pillar'], tags: ['ruin'], count: [1, 4], where: 'any' },
        { families: ['statue'], count: [0, 1], where: 'center' },
        { families: ['chest'], tags: ['ruin'], count: [0, 1], where: 'wall' },
        { families: ['bones', 'blood'], count: [0, 2], where: 'any' },
      ],
    },
    rules: [
      { families: ['tree'], density: 2, layer: 'trees', clump: { scale: 12, amount: 0.5 } },
      { families: ['plant', 'groundcover'], density: 5, clump: { scale: 8, amount: 0.5 } },
      { families: ['rubble'], density: 1 },
      { families: ['rock'], density: 1 },
      { families: ['wood'], density: 0.4 },
    ],
  },
  {
    key: 'dungeon', name: 'Dungeon', hint: 'Rum forbundet af gange med døre, fakler, kister og fælder.', size: [64, 46], base: 'rock_dark',
    dungeon: {
      rooms: [7, 11], roomSize: [5, 12], floor: 'flagstone', rock: 'rock_dark', wall: 'stone',
      types: [
        { weight: 3, furnish: [{ families: ['crate', 'barrel'], count: [3, 7], where: 'wall' }, torches] },
        { weight: 2, furnish: [{ families: ['table'], count: [1, 2], where: 'center' }, { families: ['seat'], count: [2, 4], where: 'any' }, { families: ['bed'], count: [1, 3], where: 'wall' }, torches] },
        { weight: 2, furnish: [{ families: ['tomb'], count: [1, 4], where: 'any' }, { families: ['bones'], count: [2, 5], where: 'any' }, { families: ['pillar'], count: [2, 4], where: 'any' }, torches] },
        { weight: 1, furnish: [{ families: ['chest', 'treasure'], count: [2, 4], where: 'any' }, { families: ['statue'], count: [1, 2], where: 'wall' }, { families: ['trap'], count: [1, 2], where: 'any' }, torches] },
        { weight: 2, furnish: [{ families: ['rubble'], count: [3, 6], where: 'any' }, { families: ['blood', 'corpse'], count: [1, 3], where: 'any' }, { families: ['prison'], count: [0, 2], where: 'wall' }, torches] },
        { weight: 1, furnish: [{ families: ['magic', 'arcane'], count: [2, 4], where: 'any' }, { families: ['workshop'], count: [1, 2], where: 'wall' }, torches] },
      ],
    },
    rules: [],
  },
];

export const themeByKey = (key: string): Theme | undefined => THEMES.find((t) => t.key === key);
