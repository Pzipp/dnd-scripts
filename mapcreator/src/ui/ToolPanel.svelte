<script lang="ts">
  import { MATERIALS } from '../render/materials';
  import { editor, type Tool } from '../model/store.svelte';

  const tools: { id: Tool; label: string; hint: string }[] = [
    { id: 'hand', label: 'Hånd', hint: 'Flyt kortet (træk)' },
    { id: 'paint', label: 'Pensel', hint: 'Mal terræn på et grundlag' },
    { id: 'erase', label: 'Viskelæder', hint: 'Fjern terræn (gør laget gennemsigtigt)' },
  ];
  const painting = $derived(editor.tool !== 'hand');
</script>

<h2>Værktøj</h2>
<div class="tools" role="radiogroup" aria-label="Værktøj">
  {#each tools as t}
    <button role="radio" aria-checked={editor.tool === t.id} class:on={editor.tool === t.id} title={t.hint} onclick={() => (editor.tool = t.id)}>{t.label}</button>
  {/each}
</div>

{#if painting}
  {#if !editor.paintableLayer}
    <p class="warn">Vælg et synligt, ulåst <b>Grund</b>-lag for at male.</p>
  {/if}
  {#if editor.tool === 'paint'}
    <div class="mats" role="radiogroup" aria-label="Materiale">
      {#each MATERIALS as m}
        <button role="radio" aria-checked={editor.material === m.id} class:on={editor.material === m.id} title={m.name} onclick={() => (editor.material = m.id)}>
          <span class="sw" style="background:{m.swatch}"></span>{m.name}
        </button>
      {/each}
    </div>
  {/if}
  <label>Penselstørrelse: {editor.brushCells} felter
    <input type="range" min="0.5" max="16" step="0.5" bind:value={editor.brushCells} />
  </label>
  <button disabled={!editor.paintableLayer} onclick={() => editor.fillSelected()}>
    {editor.tool === 'erase' ? 'Ryd hele laget' : 'Fyld hele laget'}
  </button>
{/if}

<style>
  .tools { display: flex; gap: 4px; margin-bottom: 10px; }
  .tools button { flex: 1; padding: 5px 4px; }
  button.on { border-color: var(--accent); background: #3a3426; }
  .mats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px; }
  .mats button { display: flex; align-items: center; gap: 6px; text-align: left; padding: 4px 6px; }
  .sw { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,.5); flex: none; }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; color: var(--muted); }
  .warn { color: var(--danger); margin: 0 0 8px; }
  h2 + .tools { margin-top: 0; }
</style>
