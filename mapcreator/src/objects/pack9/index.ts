import type { Family, ObjectKind } from '../registry';
import { trapKinds } from './traps';
import { trap2Kinds } from './traps2';
import { trap3Kinds } from './traps3';
import { hazardKinds } from './hazards';
import { magicKinds } from './magic';
import { spellKinds } from './spells';
import { lightKinds } from './light';

/** Fælder, farer, magi og lys (pack9). Hver fil i mappen eksporterer en liste af varianter; samles her. */
export const pack9Families: Family[] = [
  { key: 'trapx', label: 'Fælder', category: 'architecture', randomDefault: false },
  { key: 'spellx', label: 'Magiske segl og besværgelser', category: 'effects', randomDefault: false },
  { key: 'lightx', label: 'Lys og atmosfære', category: 'effects', randomDefault: false },
  { key: 'hazardx', label: 'Farer og miljø', category: 'nature', randomDefault: false },
];

export const pack9Kinds: ObjectKind[] = [...trapKinds, ...trap2Kinds, ...trap3Kinds, ...hazardKinds, ...magicKinds, ...spellKinds, ...lightKinds];
