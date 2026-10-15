import type { Family, ObjectKind } from '../registry';
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

/** Ekstra genstande (pakke 2). Hver fil i mappen eksporterer en liste; samles her. Nye familier lægges i `pack2Families`. */
export const pack2Families: Family[] = [
  { key: 'graveyard', label: 'Kirkegård', category: 'remains', randomDefault: false },
  { key: 'desert', label: 'Ørken', category: 'nature', randomDefault: false },
  { key: 'arctic', label: 'Is og sne', category: 'nature', randomDefault: false },
  { key: 'swamp', label: 'Sump', category: 'nature', randomDefault: false },
  { key: 'farm', label: 'Gård og mark', category: 'interior', randomDefault: false },
  { key: 'arcane', label: 'Magi', category: 'effects', randomDefault: false },
  { key: 'workshop', label: 'Alkymi og spådom', category: 'interior', randomDefault: false },
  { key: 'city', label: 'By og gade', category: 'architecture', randomDefault: false },
  { key: 'prison', label: 'Fængsel og tortur', category: 'interior', randomDefault: false },
  { key: 'tavern', label: 'Taverna', category: 'interior', randomDefault: false },
  { key: 'wilds', label: 'Vildmark', category: 'nature', randomDefault: false },
  { key: 'cave', label: 'Grotte', category: 'nature', randomDefault: false },
  { key: 'harbor', label: 'Skib og havn', category: 'interior', randomDefault: false },
];

export const pack2Kinds: ObjectKind[] = [...graveyardKinds, ...harborKinds, ...desertKinds, ...arcticKinds, ...swampKinds, ...farmKinds, ...cityKinds, ...prisonKinds, ...tavernKinds, ...wildsKinds, ...caveKinds, ...arcaneKinds, ...workshopKinds];
