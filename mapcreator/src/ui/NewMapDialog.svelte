<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { MAX_CELLS } from '../model/types';

  let { onclose }: { onclose: () => void } = $props();
  let name = $state('Nyt kort');
  let widthCells = $state(80);
  let heightCells = $state(55);

  function create() {
    if (editor.dirty && !confirm('Du har ugemte ændringer. Opret nyt kort alligevel?')) return;
    editor.newMap({ name, widthCells, heightCells });
    onclose();
  }
</script>

<div class="backdrop" role="presentation" onclick={onclose}></div>
<div class="dlg" role="dialog" aria-modal="true" aria-label="Nyt kort">
  <h2>Nyt kort</h2>
  <label>Navn <input type="text" bind:value={name} /></label>
  <div class="two">
    <label>Bredde (felter) <input type="number" min="1" max={MAX_CELLS} bind:value={widthCells} /></label>
    <label>Højde (felter) <input type="number" min="1" max={MAX_CELLS} bind:value={heightCells} /></label>
  </div>
  <p class="hint">1 felt = 5 ft = {50} px. {widthCells * 50} × {heightCells * 50} px.</p>
  <div class="btns">
    <button onclick={onclose}>Annullér</button>
    <button class="primary" onclick={create}>Opret</button>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); }
  .dlg {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(420px, 92vw);
    background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px;
  }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; color: var(--muted); }
  .two { display: flex; gap: 10px; } .two label { flex: 1; }
  .hint { color: var(--muted); margin: 0 0 12px; }
  .btns { display: flex; justify-content: flex-end; gap: 8px; }
</style>
