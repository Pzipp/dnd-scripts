import type { ObjectKind } from '../registry';
import { ruinKinds } from './ruins';
import { shrineKinds } from './shrines';
import { campKinds } from './camps';
import { siegeKinds } from './siege';
import { fantasyKinds } from './fantasy';
import { sacredKinds } from './sacred';
import { wildKinds } from './wild';
import { campMoreKinds } from './campmore';

/** Ekstra genstande (pack6). Hver fil i mappen eksporterer en liste af varianter; samles her. */
export const pack6Kinds: ObjectKind[] = [...ruinKinds, ...shrineKinds, ...campKinds, ...siegeKinds, ...fantasyKinds, ...sacredKinds, ...wildKinds, ...campMoreKinds];
