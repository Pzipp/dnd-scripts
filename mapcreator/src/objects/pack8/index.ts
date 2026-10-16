import type { ObjectKind } from '../registry';
import { treeKinds } from './trees';
import { waterKinds } from './water';
import { farmKinds } from './farm';
import { mineKinds } from './mines';
import { graveKinds } from './graveyard';

/** Ekstra genstande (pack8): natur, vand, miner og landbrug. Hver fil eksporterer en liste af varianter; samles her. */
export const pack8Kinds: ObjectKind[] = [...treeKinds, ...waterKinds, ...farmKinds, ...mineKinds, ...graveKinds];
