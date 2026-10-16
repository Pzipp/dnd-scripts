import { kind, param, type DrawInput, type ObjectKind, type ParamDef } from './registry';
import { blob, mix, polygon, rgb, rng, shift, smooth, type RGB } from './util';
import { treeDrawers } from './basics/trees';
import { rockDrawers } from './basics/rocks';
import { plantDrawers } from './basics/plants';
import { woodDrawers } from './basics/wood';

// ---------------------------------------------------------------- træer (tegningen ligger i basics/trees.ts)

const snowParam: ParamDef = { key: 'snow', label: 'Sne', type: 'toggle', default: false };
const TREE = { randomRotation: true, sizeJitter: 0.2, bleed: 0.08 };

const trees: ObjectKind[] = [
  kind({
    key: 'tree_broad', family: 'tree', name: 'Løvtræ', w: 4, h: 4, shadow: 30, ...TREE, draw: treeDrawers.tree_broad,
    params: [{ key: 'season', label: 'Årstid', type: 'select', default: 'summer', options: [{ value: 'summer', label: 'Sommer' }, { value: 'spring', label: 'Forår' }, { value: 'autumn', label: 'Efterår' }] }],
  }),
  kind({ key: 'tree_oak', family: 'tree', name: 'Eg', w: 5, h: 5, shadow: 36, ...TREE, draw: treeDrawers.tree_oak }),
  kind({ key: 'tree_birch', family: 'tree', name: 'Birk', w: 3, h: 3, shadow: 22, ...TREE, draw: treeDrawers.tree_birch }),
  kind({ key: 'tree_spruce', family: 'tree', name: 'Gran', w: 3, h: 3, shadow: 26, ...TREE, params: [snowParam], draw: treeDrawers.tree_spruce }),
  kind({ key: 'tree_pine', family: 'tree', name: 'Fyr', w: 3.5, h: 3.5, shadow: 28, ...TREE, params: [snowParam], draw: treeDrawers.tree_pine }),
  kind({ key: 'tree_dead', family: 'tree', name: 'Dødt træ', w: 3.5, h: 3.5, shadow: 10, ...TREE, draw: treeDrawers.tree_dead }),
];

// ---------------------------------------------------------------- sten (tegningen ligger i basics/rocks.ts)

const rockParam: ParamDef = { key: 'rock', label: 'Type', type: 'select', default: 'grey', options: [{ value: 'grey', label: 'Grå' }, { value: 'dark', label: 'Mørk' }, { value: 'sandstone', label: 'Sandsten' }] };

const rocks: ObjectKind[] = [
  kind({ key: 'rock_small', family: 'rock', name: 'Sten', w: 1, h: 1, keepAspect: false, randomRotation: true, sizeJitter: 0.3, shadow: 7, bleed: 0.06, params: [rockParam], draw: rockDrawers.rock_small }),
  kind({
    key: 'rock_boulder', family: 'rock', name: 'Kampesten', w: 2.2, h: 2, keepAspect: false, randomRotation: true, sizeJitter: 0.25, shadow: 12, bleed: 0.06,
    params: [rockParam, { key: 'moss', label: 'Mos', type: 'toggle', default: true }],
    draw: rockDrawers.rock_boulder,
  }),
  kind({ key: 'rock_cluster', family: 'rock', name: 'Stenbunke', w: 2, h: 2, randomRotation: true, sizeJitter: 0.3, shadow: 6, bleed: 0.06, params: [rockParam], draw: rockDrawers.rock_cluster }),
  kind({ key: 'rock_slab', family: 'rock', name: 'Flad sten', w: 2, h: 1.2, keepAspect: false, randomRotation: true, sizeJitter: 0.2, shadow: 4, bleed: 0.06, params: [rockParam], draw: rockDrawers.rock_slab }),
];

// ---------------------------------------------------------------- planter

const PLANT = { randomRotation: true, sizeJitter: 0.25, bleed: 0.06 };
const plants: ObjectKind[] = [
  kind({ key: 'bush', family: 'plant', name: 'Busk', w: 1.5, h: 1.5, shadow: 8, ...PLANT, draw: plantDrawers.bush }),
  kind({
    key: 'bush_berry', family: 'plant', name: 'Bærbusk', w: 1.5, h: 1.5, shadow: 8, ...PLANT, draw: plantDrawers.bush_berry,
    params: [{ key: 'berry', label: 'Bær', type: 'select', default: 'red', options: [{ value: 'red', label: 'Røde' }, { value: 'blue', label: 'Blå' }] }],
  }),
  kind({ key: 'fern', family: 'plant', name: 'Bregne', w: 1.2, h: 1.2, shadow: 2, ...PLANT, draw: plantDrawers.fern }),
  kind({ key: 'reeds', family: 'plant', name: 'Siv', w: 1.5, h: 1.5, ...PLANT, bleed: 0.1, draw: plantDrawers.reeds }),
  kind({
    key: 'flowers', family: 'plant', name: 'Blomster', w: 1.5, h: 1.5, ...PLANT, draw: plantDrawers.flowers,
    params: [{ key: 'color', label: 'Farve', type: 'select', default: 'yellow', options: [{ value: 'yellow', label: 'Gul' }, { value: 'white', label: 'Hvid' }, { value: 'purple', label: 'Lilla' }, { value: 'red', label: 'Rød' }] }],
  }),
];

// ---------------------------------------------------------------- træstammer

const woods: ObjectKind[] = [
  kind({ key: 'log', family: 'wood', name: 'Væltet stamme', w: 3.5, h: 0.9, keepAspect: false, randomRotation: true, sizeJitter: 0.15, shadow: 6, bleed: 0.03, params: [{ key: 'moss', label: 'Mos', type: 'toggle', default: false }], draw: woodDrawers.log }),
  kind({ key: 'stump', family: 'wood', name: 'Stub', w: 1.1, h: 1.1, randomRotation: true, sizeJitter: 0.2, shadow: 5, draw: woodDrawers.stump }),
];

export const natureKinds: ObjectKind[] = [...trees, ...rocks, ...plants, ...woods];
