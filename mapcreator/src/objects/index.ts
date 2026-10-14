import { architectureKinds } from './architecture';
import { effectKinds } from './effects';
import { interiorKinds } from './interior';
import { natureKinds } from './nature';
import { registerKinds } from './registry';
import { remainsKinds } from './remains';

registerKinds([...natureKinds, ...interiorKinds, ...remainsKinds, ...architectureKinds, ...effectKinds]);

export * from './registry';
