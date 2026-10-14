<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { LAYER_TYPE_LABEL, type LayerType } from '../model/types';

  const types = Object.keys(LAYER_TYPE_LABEL) as LayerType[];
  let newType = $state<LayerType>('objects');
  // Øverste lag vises øverst i listen.
  const rows = $derived([...editor.doc.layers].reverse());
</script>

<h2>Lag</h2>
<div class="add">
  <select bind:value={newType} aria-label="Lagtype">
    {#each types as t}<option value={t}>{LAYER_TYPE_LABEL[t]}</option>{/each}
  </select>
  <button onclick={() => editor.addLayer(newType)}>+ Lag</button>
</div>

<ul>
  {#each rows as l (l.id)}
    <li class:sel={l.id === editor.selectedLayerId}>
      <button class="eye" title={l.visible ? 'Skjul' : 'Vis'} aria-pressed={l.visible} onclick={() => editor.patchLayer(l.id, { visible: !l.visible })}>
        {l.visible ? '👁' : '–'}
      </button>
      <button class="lock" title={l.locked ? 'Lås op' : 'Lås'} aria-pressed={l.locked} onclick={() => editor.patchLayer(l.id, { locked: !l.locked })}>
        {l.locked ? '🔒' : '·'}
      </button>
      <button class="name" onclick={() => (editor.selectedLayerId = l.id)}>
        <span>{l.name}</span><small>{LAYER_TYPE_LABEL[l.type]}</small>
      </button>
    </li>
  {/each}
</ul>

<div class="row">
  <button disabled={!editor.selectedLayer} onclick={() => editor.selectedLayerId && editor.moveLayer(editor.selectedLayerId, 1)} title="Flyt lag op">▲</button>
  <button disabled={!editor.selectedLayer} onclick={() => editor.selectedLayerId && editor.moveLayer(editor.selectedLayerId, -1)} title="Flyt lag ned">▼</button>
  <button
    class="danger"
    disabled={!editor.selectedLayer || editor.doc.layers.length <= 1}
    onclick={() => editor.selectedLayerId && editor.removeLayer(editor.selectedLayerId)}>Slet lag</button>
</div>

<style>
  .add, .row { display: flex; gap: 6px; margin-bottom: 8px; }
  .add select { flex: 1; }
  ul { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  li { display: flex; gap: 2px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel-2); }
  li.sel { border-color: var(--accent); }
  li button { border: 0; background: none; padding: 6px; }
  .eye, .lock { width: 30px; flex: none; }
  .name { flex: 1; display: flex; flex-direction: column; text-align: left; min-width: 0; }
  .name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .name small { color: var(--muted); }
</style>
