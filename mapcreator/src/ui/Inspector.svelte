<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { CELL_PX, LAYER_TYPE_LABEL } from '../model/types';

  const l = $derived(editor.selectedLayer);
</script>

<h2>Kort</h2>
<p class="info">
  {editor.doc.widthCells} × {editor.doc.heightCells} felter<br />
  {editor.doc.widthCells * CELL_PX} × {editor.doc.heightCells * CELL_PX} px
</p>

<h2>Valgt lag</h2>
{#if l}
  <label>Navn
    <input type="text" value={l.name} onchange={(e) => editor.patchLayer(l.id, { name: e.currentTarget.value.trim() || l.name })} />
  </label>
  <p class="info">{LAYER_TYPE_LABEL[l.type]}</p>
  <label>Opacitet: {Math.round(l.opacity * 100)} %
    <input type="range" min="0" max="1" step="0.01" value={l.opacity} oninput={(e) => editor.patchLayer(l.id, { opacity: +e.currentTarget.value })} />
  </label>
  <label>Højde
    <input type="number" min="0" max="100" step="1" value={l.height} onchange={(e) => editor.patchLayer(l.id, { height: Math.max(0, +e.currentTarget.value || 0) })} />
  </label>
{:else}
  <p class="info">Intet lag valgt.</p>
{/if}

<style>
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; color: var(--muted); }
  .info { color: var(--muted); margin: 0 0 12px; }
</style>
