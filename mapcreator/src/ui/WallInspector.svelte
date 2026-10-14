<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { CELL_PX, type OpeningKind, type WallStyle } from '../model/types';
  import { pathLength, pathOf } from '../model/walls';
  import { OPENING_KINDS, WALL_STYLES } from '../render/walls';

  const sel = $derived(editor.selectionWall);
  const length = $derived(sel ? pathLength(pathOf(sel.wall)) : 0);
  const cells = (px: number) => Math.round((px / CELL_PX) * 100) / 100;
</script>

{#if sel}
  <h2>Valgt mur</h2>
  <label>Type
    <select value={sel.wall.style} onchange={(e) => editor.patchWall({ style: e.currentTarget.value as WallStyle })}>
      {#each WALL_STYLES as s}<option value={s.key}>{s.label}</option>{/each}
    </select>
  </label>
  <label>Tykkelse (felter)
    <input type="number" min="0.1" max="3" step="0.05" value={cells(sel.wall.thickness)} onchange={(e) => editor.patchWall({ thickness: Math.max(5, +e.currentTarget.value * CELL_PX) })} />
  </label>
  <label class="chk"><input type="checkbox" checked={sel.wall.closed} disabled={sel.wall.points.length < 3} onchange={(e) => editor.patchWall({ closed: e.currentTarget.checked })} /> Lukket mur</label>
  <p class="hint">Længde: {cells(length)} felter ({Math.round((length / CELL_PX) * 5)} ft) · {sel.wall.points.length} punkter · {sel.wall.openings.length} åbninger</p>
  <p class="hint">Træk i et firkantet punkt for at ændre form og længde; træk i en rund prik midt på et stykke for at indsætte et nyt punkt; dobbeltklik på et punkt for at fjerne det. Træk i selve muren for at flytte den.</p>
  <div class="row"><button class="danger" onclick={() => editor.removeSelectedWall()}>Slet mur</button></div>

  {#if sel.opening}
    {@const o = sel.opening}
    <h2>Valgt åbning</h2>
    <label>Type
      <select value={o.kind} onchange={(e) => editor.patchOpening({ kind: e.currentTarget.value as OpeningKind })}>
        {#each OPENING_KINDS as k}<option value={k.key}>{k.label}</option>{/each}
      </select>
    </label>
    <label>Bredde (felter)
      <input type="number" min="0.25" step="0.25" value={cells(o.width)} onchange={(e) => editor.patchOpening({ width: Math.max(12, Math.min(length, +e.currentTarget.value * CELL_PX)) })} />
    </label>
    {#if o.kind === 'door' || o.kind === 'double_door' || o.kind === 'gate'}
      <label class="chk"><input type="checkbox" checked={o.open} onchange={(e) => editor.patchOpening({ open: e.currentTarget.checked })} /> Åben</label>
      <label class="chk"><input type="checkbox" checked={o.flip} onchange={(e) => editor.patchOpening({ flip: e.currentTarget.checked })} /> Vend (svinger til den anden side)</label>
    {/if}
    <div class="row"><button class="danger" onclick={() => editor.removeSelectedOpening()}>Slet åbning</button></div>
  {/if}
{/if}

<style>
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; color: var(--muted); }
  label.chk { flex-direction: row; align-items: center; gap: 6px; }
  .row { display: flex; gap: 6px; margin-bottom: 10px; }
  .hint { color: var(--muted); font-size: 12px; margin: 0 0 10px; }
</style>
