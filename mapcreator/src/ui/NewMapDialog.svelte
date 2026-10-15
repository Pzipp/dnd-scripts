<script lang="ts">
  import { THEMES, themeByKey } from '../generator';
  import { newSeed } from '../model/ids';
  import { editor } from '../model/store.svelte';
  import SizeFields from './SizeFields.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let name = $state('Nyt kort');
  let widthCells = $state(80);
  let heightCells = $state(55);
  /** '' = tomt kort. */
  let themeKey = $state('');
  let seed = $state(newSeed());
  let nameTouched = false;
  let busy = $state(false);
  const theme = $derived(themeByKey(themeKey));

  function choose(key: string) {
    themeKey = key;
    const t = themeByKey(key);
    if (t) {
      [widthCells, heightCells] = t.size;
      if (!nameTouched) name = t.name;
    } else if (!nameTouched) name = 'Nyt kort';
  }

  async function create() {
    if (editor.dirty && !confirm('Du har ugemte ændringer. Opret nyt kort alligevel?')) return;
    if (!theme) {
      editor.newMap({ name, widthCells, heightCells });
      onclose();
      return;
    }
    busy = true;
    // lad knappen nå at vise "Laver kort …", før den tunge udregning låser siden
    await new Promise((r) => setTimeout(r, 30));
    try {
      editor.generateMap({ theme: theme.key, name, widthCells, heightCells, seed });
    } catch (e) {
      editor.error = (e as Error).message;
    }
    busy = false;
    onclose();
  }
</script>

<div class="backdrop" role="presentation" onclick={onclose}></div>
<div class="dlg" role="dialog" aria-modal="true" aria-label="Nyt kort">
  <h2>Nyt kort</h2>
  <label>Navn <input type="text" bind:value={name} oninput={() => (nameTouched = true)} /></label>
  <div class="themes" role="radiogroup" aria-label="Start med">
    <button type="button" role="radio" aria-checked={themeKey === ''} class:on={themeKey === ''} onclick={() => choose('')}>Tomt kort<small>Kun græs</small></button>
    {#each THEMES as t (t.key)}
      <button type="button" role="radio" aria-checked={themeKey === t.key} class:on={themeKey === t.key} onclick={() => choose(t.key)} title={t.hint}>{t.name}</button>
    {/each}
  </div>
  {#if theme}
    <p class="hint">{theme.hint} Kortet er bagefter et almindeligt kort, du kan redigere frit.</p>
    <div class="seed">
      <label>Frø <input type="number" bind:value={seed} /></label>
      <button type="button" onclick={() => (seed = newSeed())} title="Ny tilfældig variant af samme tema">Ny variant</button>
    </div>
  {/if}
  <SizeFields bind:widthCells bind:heightCells />
  <div class="btns">
    <button onclick={onclose}>Annullér</button>
    <button class="primary" disabled={busy} onclick={create}>{busy ? 'Laver kort …' : theme ? 'Generér' : 'Opret'}</button>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); }
  .dlg {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(520px, 94vw); max-height: 94vh; overflow: auto;
    background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px;
  }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; color: var(--muted); }
  .themes { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .themes button { display: flex; flex-direction: column; align-items: center; padding: 5px 11px; }
  .themes small { color: var(--muted); }
  .themes button.on { border-color: var(--accent, #6aa7ff); background: rgba(106, 167, 255, 0.15); }
  .hint { color: var(--muted); margin: 0 0 10px; }
  .seed { display: flex; align-items: flex-end; gap: 8px; } .seed label { flex: 1; }
  .seed button { margin-bottom: 10px; }
  .btns { display: flex; justify-content: flex-end; gap: 8px; }
</style>
