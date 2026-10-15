import type { Family, ObjectKind } from '../registry';
import { animalKinds } from './animals';
import { critterKinds } from './critters';

/** Ekstra genstande (pack7): rumindretning, dyr og levende væsner, madvarer. Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack7Families`. */
export const pack7Families: Family[] = [
  { key: 'critter', label: 'Smådyr og kryb', category: 'nature', randomDefault: false },
  { key: 'creature', label: 'Husdyr og vildt', category: 'nature', randomDefault: false },
];

export const pack7Kinds: ObjectKind[] = [...animalKinds, ...critterKinds];
