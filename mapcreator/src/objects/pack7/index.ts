import type { ObjectKind } from '../registry';
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

/** Ekstra genstande (pack7): rumindretning, dyr og levende væsner, madvarer. Hver fil i mappen eksporterer en liste af varianter; samles her. */
export const pack7Kinds: ObjectKind[] = [...animalKinds, ...critterKinds, ...kitchenKinds, ...studyKinds, ...bedroomKinds, ...bathKinds, ...alchemyKinds, ...throneKinds, ...feastKinds, ...chapelKinds, ...toyKinds, ...musicKinds, ...provisionKinds];
