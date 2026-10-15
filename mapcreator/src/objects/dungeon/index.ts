import type { Family, ObjectKind } from '../registry';
import { gateKinds } from './gates';
import { rockfallKinds } from './rocks';
import { stairKinds } from './stairs';
import { wallmountKinds } from './wallmount';

/** Dungeon- og grottedetaljer: gitre og døre, nedfald, udhuggede trapper og broer, ting på væggen. */
export const dungeonFamilies: Family[] = [
  { key: 'gate', label: 'Gitre og døre', category: 'architecture', randomDefault: false },
  { key: 'rockfall', label: 'Nedfald og sten', category: 'architecture', randomDefault: false },
  { key: 'carved', label: 'Trapper, skakter og broer', category: 'architecture', randomDefault: false },
  { key: 'wallmount', label: 'Vægdetaljer', category: 'effects', randomDefault: false },
];

export const dungeonKinds: ObjectKind[] = [...gateKinds, ...rockfallKinds, ...stairKinds, ...wallmountKinds];
