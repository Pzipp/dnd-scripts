<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { CELL_PX, type OpeningKind, type WallStyle } from '../model/types';
  import { pathLength, pathOf } from '../model/walls';
  import { OPENING_KINDS, WALL_STYLES, wallStyle } from '../render/walls';
  import { MATERIAL_GROUPS, MATERIALS } from '../render/materials';

  const sel = $derived(editor.selectionWall);
  const length = $derived(sel ? pathLength(pathOf(sel.wall)) : 0);
  const cells = (px: number) => Math.round((px / CELL_PX) * 100) / 100;
  const groups = [...new Set(WALL_STYLES.map((s) => s.group))];
  const isShape = $derived(!!sel && !!sel.wall.shape && sel.wall.shape !== 'line');
</script>

{#if sel}
  <h2>{isShape ? 'Valgt form' : 'Valgt linje'}</h2>
  <label>Kant
    <select value={sel.wall.stroke === false ? 'none' : sel.wall.style} onchange={(e) => {
      const v = e.currentTarget.value;
      if (v === 'none') editor.patchWall({ stroke: false });
      else editor.patchWall({ style: v as WallStyle, stroke: true });
    }}>
      {#if isShape}<option value="none">Ingen kant</option>{/if}
      {#each groups as group}
        <optgroup label={group}>
          {#each WALL_STYLES.filter((s) => s.group === group) as s}<option value={s.key}>{s.label}</option>{/each}
        </optgroup>
      {/each}
    </select>
  </label>
  <label>Tykkelse (felter)
    <input type="number" min="0.1" max="4" step="0.05" value={cells(sel.wall.thickness)} onchange={(e) => editor.patchWall({ thickness: Math.max(5, +e.currentTarget.value * CELL_PX) })} />
  </label>
  {#if isShape || sel.wall.fill}
    <label>Udfyldning
      <select value={sel.wall.fill?.material ?? 0} onchange={(e) => editor.patchWall({ fill: +e.currentTarget.value ? { material: +e.currentTarget.value } : undefined })}>
        <option value="0">Ingen</option>
        {#each MATERIAL_GROUPS as group}
          <optgroup label={group}>
            {#each MATERIALS.filter((m) => m.group === group) as m}<option value={m.id}>{m.name}</option>{/each}
          </optgroup>
        {/each}
      </select>
    </label>
  {/if}
  <label class="chk"><input type="checkbox" checked={!!sel.wall.flip} onchange={(e) => editor.patchWall({ flip: e.currentTarget.checked })} /> Vend (inderside og yderside)</label>
  <label class="chk"><input type="checkbox" checked={sel.wall.closed} disabled={sel.wall.points.length < 3 || isShape} onchange={(e) => editor.patchWall({ closed: e.currentTarget.checked })} /> Lukket</label>
  <p class="hint">Længde: {cells(length)} felter ({Math.round((length / CELL_PX) * 5)} ft) · {sel.wall.points.length} punkter{wallStyle(sel.wall.style).solid ? ` · ${sel.wall.openings.length} åbninger` : ''}</p>
  <p class="hint">Træk i et firkantet punkt for at ændre formen; træk i en rund prik midt på et stykke for at indsætte et nyt punkt; dobbeltklik på et punkt for at fjerne det. Træk i selve linjen eller formen for at flytte den.</p>
  <div class="row"><button class="danger" onclick={() => editor.removeSelectedWall()}>{isShape ? 'Slet form' : 'Slet linje'}</button></div>

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
