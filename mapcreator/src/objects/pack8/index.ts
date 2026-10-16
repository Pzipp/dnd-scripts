import type { Family, ObjectKind } from '../registry';
import { treeKinds } from './trees';
import { waterKinds } from './water';

/** Ekstra genstande (pack8): natur, vand, miner og landbrug. Hver fil eksporterer en liste af varianter; samles her. Nye familier lægges i `pack8Families`. */
export const pack8Families: Family[] = [
  { key: 'flora', label: 'Flora: nye træer og planter', category: 'nature', randomDefault: true },
  { key: 'waterx', label: 'Vand og kyst', category: 'nature', randomDefault: false },
];

export const pack8Kinds: ObjectKind[] = [...treeKinds, ...waterKinds];
