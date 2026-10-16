<script lang="ts">
  import { allKinds, FAMILIES, familyKinds } from '../objects';
  import { CELL_PX } from '../model/types';
  import { getSprite } from '../render/sprites';

  /** Udviklingsside (`/mapcreator?galleri=1`): alle genstande stort, med flere seeds. `&familie=tree` viser kun én familie. */
  const only = new URLSearchParams(location.search).get('familie');
  const SEEDS = [11, 222, 3333, 44444];
  /** `&size=360` viser genstandene i dobbelt størrelse (og tegner dem skarpere), til nærstudie af detaljer. */
  const SIZE = Math.min(720, Math.max(120, Number(new URLSearchParams(location.search).get('size')) || 180));
  const SCALE = SIZE >= 360 ? 2 : 1;

  function draw(node: HTMLCanvasElement, arg: { key: string; seed: number; params?: Record<string, string | number | boolean> }) {
    const kind = allKinds().find((k) => k.key === arg.key);
    if (!kind) return;
    const params = { ...Object.fromEntries(kind.params.map((p) => [p.key, p.default])), ...(arg.params ?? {}) };
    const w = kind.w * CELL_PX;
    const h = kind.h * CELL_PX;
    const spr = getSprite({ seed: arg.seed, w, h, params }, kind, SCALE);
    const g = node.getContext('2d')!;
    node.width = SIZE;
    node.height = SIZE;
    g.fillStyle = '#7fa04a';
    g.fillRect(0, 0, SIZE, SIZE);
    const k = Math.min(SIZE / spr.ww, SIZE / spr.hh, 1.6 * (SIZE / 180));
    g.save();
    g.translate(SIZE / 2, SIZE / 2);
    const dist = kind.shadow;
    if (dist > 0) {
      g.shadowColor = 'rgba(0,0,0,.38)';
      g.shadowBlur = dist * 0.55 * k;
      g.shadowOffsetX = dist * 0.7 * k;
      g.shadowOffsetY = dist * 0.7 * k;
    }
    g.drawImage(spr.canvas, (-spr.ww * k) / 2, (-spr.hh * k) / 2, spr.ww * k, spr.hh * k);
    g.restore();
  }
</script>

<div class="gal">
  <h1>Genstandsgalleri</h1>
  {#each FAMILIES.filter((f) => !only || f.key === only) as f (f.key)}
    {#if familyKinds(f.key).length}
      <h2>{f.label} <small>({f.key})</small></h2>
      {#each familyKinds(f.key) as k (k.key)}
        <h3>{k.name} <small>{k.key} · {k.w}×{k.h} felter</small></h3>
        <div class="row">
          {#each SEEDS as s}<canvas style="width:{SIZE}px;height:{SIZE}px" use:draw={{ key: k.key, seed: s }}></canvas>{/each}
          {#each k.params.filter((p) => p.type === 'select') as p}
            {#if p.type === 'select'}
              {#each p.options.filter((o) => o.value !== p.default) as o}
                <div class="v"><canvas style="width:{SIZE}px;height:{SIZE}px" use:draw={{ key: k.key, seed: SEEDS[0]!, params: { [p.key]: o.value } }}></canvas><small>{p.label}: {o.label}</small></div>
              {/each}
            {/if}
          {/each}
          {#each k.params.filter((p) => p.type === 'toggle') as p}
            <div class="v"><canvas style="width:{SIZE}px;height:{SIZE}px" use:draw={{ key: k.key, seed: SEEDS[0]!, params: { [p.key]: !p.default } }}></canvas><small>{p.label}: {p.default ? 'fra' : 'til'}</small></div>
          {/each}
        </div>
      {/each}
    {/if}
  {/each}
</div>

<style>
  .gal { padding: 16px; background: var(--bg); min-height: 100%; }
  h1, h2, h3 { margin: 10px 0 6px; }
  h2 { border-bottom: 1px solid var(--line); padding-bottom: 4px; text-transform: none; letter-spacing: 0; font-size: 18px; color: var(--fg); }
  h3 { font-size: 13px; color: var(--muted); font-weight: 500; }
  small { color: var(--muted); }
  .row { display: flex; flex-wrap: wrap; gap: 8px; }
  .v { display: flex; flex-direction: column; }
  canvas { border-radius: 6px; }
</style>
