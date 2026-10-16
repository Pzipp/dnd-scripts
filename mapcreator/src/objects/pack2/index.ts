import type { ObjectKind } from '../registry';
import { graveyardKinds } from './graveyard';
import { harborKinds } from './harbor';
import { desertKinds } from './desert';
import { arcticKinds } from './arctic';
import { swampKinds } from './swamp';
import { farmKinds } from './farm';
import { cityKinds } from './city';
import { prisonKinds } from './prison';
import { tavernKinds } from './tavern';
import { wildsKinds } from './wilds';
import { caveKinds } from './cave';
import { arcaneKinds, workshopKinds } from './magic';

/** Ekstra genstande (pakke 2). Hver fil i mappen eksporterer en liste; samles her. */
export const pack2Kinds: ObjectKind[] = [...graveyardKinds, ...harborKinds, ...desertKinds, ...arcticKinds, ...swampKinds, ...farmKinds, ...cityKinds, ...prisonKinds, ...tavernKinds, ...wildsKinds, ...caveKinds, ...arcaneKinds, ...workshopKinds];
