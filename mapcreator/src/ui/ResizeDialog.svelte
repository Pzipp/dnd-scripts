<script lang="ts">
  import { editor } from '../model/store.svelte';
  import type { Anchor } from '../model/resize';
  import SizeFields from './SizeFields.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let widthCells = $state(editor.doc.widthCells);
  let heightCells = $state(editor.doc.heightCells);
  let ax = $state<0 | 0.5 | 1>(0.5);
  let ay = $state<0 | 0.5 | 1>(0.5);
  const steps = [0, 0.5, 1] as const;
  const changed = $derived(widthCells !== editor.doc.widthCells || heightCells !== editor.doc.heightCells);
  const shrinks = $derived(widthCells < editor.doc.widthCells || heightCells < editor.doc.heightCells);

  function apply() {
    const anchor: Anchor = { x: ax, y: ay };
    editor.resizeMap(widthCells, heightCells, anchor);
    onclose();
  }
</script>

<div class="backdrop" role="presentation" onclick={onclose}></div>
<div class="dlg" role="dialog" aria-modal="true" aria-label="Kortstørrelse">
  <h2>Kortstørrelse</h2>
  <p class="hint">Nu: {editor.doc.widthCells} × {editor.doc.heightCells} felter.</p>
  <SizeFields bind:widthCells bind:heightCells />
  <div class="anchor">
    <span>Det nuværende kort placeres</span>
    <div class="grid" role="radiogroup" aria-label="Placering">
      {#each steps as y (y)}
        {#each steps as x (x)}
          <button type="button" role="radio" aria-checked={ax === x && ay === y} class:on={ax === x && ay === y} aria-label="Placering {x}, {y}" onclick={() => { ax = x; ay = y; }}></button>
        {/each}
      {/each}
    </div>
  </div>
  <p class="hint">Nye områder fyldes med det terræn, der ligger ved kanten. Genstande og mure følger med.{shrinks ? ' Genstande, der havner uden for kortet, fjernes (Fortryd henter dem tilbage).' : ''}</p>
  <div class="btns">
    <button onclick={onclose}>Annullér</button>
    <button class="primary" disabled={!changed} onclick={apply}>Ændr størrelse</button>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); }
  .dlg {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(460px, 92vw);
    background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px;
  }
  .hint { color: var(--muted); margin: 0 0 12px; }
  .anchor { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; color: var(--muted); }
  .grid { display: grid; grid-template-columns: repeat(3, 22px); gap: 3px; }
  .grid button { width: 22px; height: 22px; padding: 0; }
  .grid button.on { background: var(--accent, #6aa7ff); }
  .btns { display: flex; justify-content: flex-end; gap: 8px; }
</style>
