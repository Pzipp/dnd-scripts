import type { Family, ObjectKind } from '../registry';
import { treeKinds } from './trees';
import { waterKinds } from './water';
import { farmKinds } from './farm';
import { mineKinds } from './mines';
import { graveKinds } from './graveyard';

/** Ekstra genstande (pack8): natur, vand, miner og landbrug. Hver fil eksporterer en liste af varianter; samles her. Nye familier lægges i `pack8Families`. */
export const pack8Families: Family[] = [
  { key: 'flora', label: 'Flora: nye træer og planter', category: 'nature', randomDefault: true },
  { key: 'waterx', label: 'Vand og kyst', category: 'nature', randomDefault: false },
  { key: 'farmx', label: 'Landbrug og have', category: 'nature', randomDefault: false },
  { key: 'minex', label: 'Miner', category: 'architecture', randomDefault: false },
  { key: 'gravex', label: 'Kirkegård og afsides steder', category: 'remains', randomDefault: false },
];

export const pack8Kinds: ObjectKind[] = [...treeKinds, ...waterKinds, ...farmKinds, ...mineKinds, ...graveKinds];
