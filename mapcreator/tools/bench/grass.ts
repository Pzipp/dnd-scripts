// Måler CPU-tid pr. terrænflise (græs med og uden strå-tekstur). Kør i en Node-container:
//   docker run --rm --name claude-test-bench -v "$PWD:/repo" -w /repo/mapcreator node:24-slim sh -c "npx esbuild tools/bench/grass.ts --bundle --platform=node --format=esm --outfile=/tmp/bench.mjs && node /tmp/bench.mjs"
import { createGround } from '../../src/model/ground';
import { renderGroundTile } from '../../src/render/ground';
import { setGrassTextured } from '../../src/render/materials';

const g = createGround(90, 65, 1);
const buf = () => ({ width: 256, height: 256, data: new Uint8ClampedArray(256 * 256 * 4) });
const res: Record<string, number[]> = { gammel: [], ny: [] };
for (const tex of [false, true]) { setGrassTextured(tex); renderGroundTile(buf(), g, 1, 3000, 3000, 0.5); }
for (let r = 0; r < 8; r++) {
  for (const tex of [false, true]) {
    setGrassTextured(tex);
    const t = process.cpuUsage();
    for (let i = 0; i < 4; i++) renderGroundTile(buf(), g, 1, 3000, 3000, 0.5);
    const u = process.cpuUsage(t);
    res[tex ? 'ny' : 'gammel']!.push((u.user + u.system) / 4000);
  }
}
for (const k of Object.keys(res)) console.log('CPU', k, Math.min(...res[k]!).toFixed(1), 'ms/flise');
declare const process: { cpuUsage(prev?: unknown): { user: number; system: number } };
