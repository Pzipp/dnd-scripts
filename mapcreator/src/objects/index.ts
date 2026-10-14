import { architectureKinds } from './architecture';
import { effectKinds } from './effects';
import { interiorKinds } from './interior';
import { natureKinds } from './nature';
import { extraFamilies, extraKinds } from './extra';
import { FAMILIES, registerKinds } from './registry';
import { remainsKinds } from './remains';

FAMILIES.push(...extraFamilies);
registerKinds([...natureKinds, ...interiorKinds, ...remainsKinds, ...architectureKinds, ...effectKinds, ...extraKinds]);

export * from './registry';
