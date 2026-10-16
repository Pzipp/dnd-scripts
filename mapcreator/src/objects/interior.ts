import { kind, type ObjectKind } from './registry';
import { drawBarrelBroken, drawBarrelFallen, drawBarrelUpright, drawBed, drawBedroll, drawBench, drawChair, drawChest, drawCrate, drawCrateBroken, drawStool, drawTable } from './basics/interior';

// Tegningen af indretningen ligger i basics/interior.ts.

const tables: ObjectKind[] = [
  kind({ key: 'table_rect', family: 'table', name: 'Bord', w: 2, h: 1, keepAspect: false, shadow: 7, bleed: 0.02, draw: (g, o) => drawTable(g, o, false) }),
  kind({ key: 'table_long', family: 'table', name: 'Langbord', w: 4, h: 1.1, keepAspect: false, shadow: 7, bleed: 0.02, draw: (g, o) => drawTable(g, o, false) }),
  kind({ key: 'table_round', family: 'table', name: 'Rundt bord', w: 1.6, h: 1.6, shadow: 7, bleed: 0.02, draw: (g, o) => drawTable(g, o, true) }),
  kind({ key: 'table_small', family: 'table', name: 'Lille bord', w: 1, h: 1, keepAspect: false, shadow: 5, bleed: 0.02, draw: (g, o) => drawTable(g, o, false) }),
];

const seats: ObjectKind[] = [
  kind({ key: 'chair', family: 'seat', name: 'Stol', w: 0.8, h: 0.8, shadow: 4, bleed: 0.02, draw: drawChair }),
  kind({ key: 'stool', family: 'seat', name: 'Skammel', w: 0.7, h: 0.7, shadow: 4, bleed: 0.02, draw: drawStool }),
  kind({ key: 'bench', family: 'seat', name: 'Bænk', w: 2, h: 0.6, keepAspect: false, shadow: 4, bleed: 0.02, draw: drawBench }),
];

const barrels: ObjectKind[] = [
  kind({ key: 'barrel_upright', family: 'barrel', name: 'Stående', w: 1, h: 1, randomRotation: true, sizeJitter: 0.05, shadow: 6, bleed: 0.02, draw: drawBarrelUpright }),
  kind({ key: 'barrel_fallen', family: 'barrel', name: 'Væltet', w: 1.3, h: 1, keepAspect: false, randomRotation: true, sizeJitter: 0.05, shadow: 5, bleed: 0.06, draw: drawBarrelFallen }),
  kind({ key: 'barrel_broken', family: 'barrel', name: 'Ødelagt', w: 1.4, h: 1.4, randomRotation: true, sizeJitter: 0.1, shadow: 2, bleed: 0.1, draw: drawBarrelBroken }),
];

const crates: ObjectKind[] = [
  kind({ key: 'crate_closed', family: 'crate', name: 'Kasse', w: 1, h: 1, keepAspect: false, randomRotation: true, shadow: 6, bleed: 0.02, draw: (g, o) => drawCrate(g, o, 'closed') }),
  kind({ key: 'crate_open', family: 'crate', name: 'Åben kasse', w: 1, h: 1, keepAspect: false, randomRotation: true, shadow: 5, bleed: 0.02, draw: (g, o) => drawCrate(g, o, 'open') }),
  kind({ key: 'crate_broken', family: 'crate', name: 'Smadret kasse', w: 1.4, h: 1.4, randomRotation: true, shadow: 2, bleed: 0.06, draw: drawCrateBroken }),
];

const chests: ObjectKind[] = [
  kind({ key: 'chest_closed', family: 'chest', name: 'Lukket', w: 1.4, h: 0.9, keepAspect: false, shadow: 6, bleed: 0.04, draw: (g, o) => drawChest(g, o, 'closed') }),
  kind({ key: 'chest_open', family: 'chest', name: 'Åben', w: 1.4, h: 0.9, keepAspect: false, shadow: 6, bleed: 0.12, draw: (g, o) => drawChest(g, o, 'open') }),
  kind({ key: 'chest_broken', family: 'chest', name: 'Knust', w: 1.4, h: 0.9, keepAspect: false, shadow: 5, bleed: 0.12, draw: (g, o) => drawChest(g, o, 'broken') }),
];

const blanketParam = { key: 'blanket', label: 'Tæppe', type: 'select' as const, default: 'red', options: [{ value: 'red', label: 'Rød' }, { value: 'blue', label: 'Blå' }, { value: 'green', label: 'Grøn' }, { value: 'brown', label: 'Brun' }] };

const beds: ObjectKind[] = [
  kind({ key: 'bed', family: 'bed', name: 'Seng', w: 1.2, h: 2, keepAspect: false, shadow: 5, bleed: 0.02, params: [blanketParam], draw: drawBed }),
  kind({ key: 'bedroll', family: 'bed', name: 'Sovepose', w: 0.9, h: 1.9, keepAspect: false, shadow: 2, bleed: 0.02, params: [{ ...blanketParam, default: 'green' }], draw: drawBedroll }),
];

export const interiorKinds: ObjectKind[] = [...tables, ...seats, ...barrels, ...crates, ...chests, ...beds];
