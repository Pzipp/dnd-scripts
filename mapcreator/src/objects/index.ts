import { architectureKinds } from './architecture';
import { effectKinds } from './effects';
import { interiorKinds } from './interior';
import { natureKinds } from './nature';
import { extraFamilies, extraKinds } from './extra';
import { basicsFamilies, basicsKinds } from './basics';
import { pack2Families, pack2Kinds } from './pack2';
import { FAMILIES, registerKinds } from './registry';
import { remainsKinds } from './remains';

FAMILIES.push(...extraFamilies, ...pack2Families, ...basicsFamilies);
registerKinds([...natureKinds, ...interiorKinds, ...remainsKinds, ...architectureKinds, ...effectKinds, ...extraKinds, ...pack2Kinds, ...basicsKinds]);

export * from './registry';
export * from './tags';
