import type { Family, ObjectKind } from '../registry';
import { animalKinds } from './animals';
import { critterKinds } from './critters';
import { kitchenKinds } from './kitchen';
import { studyKinds } from './study';
import { bedroomKinds } from './bedroom';
import { alchemyKinds, bathKinds } from './bath';
import { throneKinds } from './throne';
import { feastKinds } from './feast';
import { chapelKinds } from './chapel';
import { toyKinds } from './toys';
import { musicKinds } from './music';
import { provisionKinds } from './provisions';

/** Ekstra genstande (pack7): rumindretning, dyr og levende væsner, madvarer. Hver fil i mappen eksporterer en liste af varianter; samles her. Nye familier lægges i `pack7Families`. */
export const pack7Families: Family[] = [
  { key: 'critter', label: 'Smådyr og kryb', category: 'nature', randomDefault: false },
  { key: 'kitchen', label: 'Køkken', category: 'interior', randomDefault: false },
  { key: 'study', label: 'Bibliotek og studerekammer', category: 'interior', randomDefault: false },
  { key: 'bedroom', label: 'Soveværelse', category: 'interior', randomDefault: false },
  { key: 'bath', label: 'Badehus', category: 'interior', randomDefault: false },
  { key: 'alchemy', label: 'Alkymilaboratorium', category: 'interior', randomDefault: false },
  { key: 'throne', label: 'Trone- og audienssal', category: 'interior', randomDefault: false },
  { key: 'feast', label: 'Banket og gæstebud', category: 'interior', randomDefault: false },
  { key: 'chapel', label: 'Kirke og tempelindretning', category: 'interior', randomDefault: false },
  { key: 'toys', label: 'Børneværelse og legetøj', category: 'interior', randomDefault: false },
  { key: 'music', label: 'Musikinstrumenter', category: 'interior', randomDefault: false },
  { key: 'provisions', label: 'Madvarer og forråd', category: 'interior', randomDefault: false },
  { key: 'creature', label: 'Husdyr og vildt', category: 'nature', randomDefault: false },
];

export const pack7Kinds: ObjectKind[] = [...animalKinds, ...critterKinds, ...kitchenKinds, ...studyKinds, ...bedroomKinds, ...bathKinds, ...alchemyKinds, ...throneKinds, ...feastKinds, ...chapelKinds, ...toyKinds, ...musicKinds, ...provisionKinds];
