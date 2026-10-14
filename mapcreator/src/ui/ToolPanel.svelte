<script lang="ts">
  import { MATERIALS } from '../render/materials';
  import { OPENING_KINDS, WALL_STYLES } from '../render/walls';
  import { editor, type Tool } from '../model/store.svelte';

  const tools: { id: Tool; label: string; hint: string }[] = [
    { id: 'hand', label: 'Hånd', hint: 'Flyt kortet (træk)' },
    { id: 'select', label: 'Vælg', hint: 'Vælg, flyt, skalér og rotér genstande (V)' },
    { id: 'stamp', label: 'Genstand', hint: 'Sæt genstande ud (G)' },
    { id: 'scatter', label: 'Spred', hint: 'Mal en skov, spred sten eller planter (S)' },
    { id: 'wall', label: 'Mur', hint: 'Tegn mure punkt for punkt (M)' },
    { id: 'opening', label: 'Dør', hint: 'Sæt døre, porte og vinduer i en mur (D)' },
    { id: 'paint', label: 'Pensel', hint: 'Mal terræn på et grundlag' },
    { id: 'erase', label: 'Viskelæder', hint: 'Fjern terræn (gør laget gennemsigtigt)' },
  ];
  const painting = $derived(editor.tool === 'paint' || editor.tool === 'erase');
</script>

<h2>Værktøj</h2>
<div class="tools" role="radiogroup" aria-label="Værktøj">
  {#each tools as t}
    <button role="radio" aria-checked={editor.tool === t.id} class:on={editor.tool === t.id} title={t.hint} onclick={() => editor.setTool(t.id)}>{t.label}</button>
  {/each}
</div>

{#if editor.tool === 'stamp'}
  {#if !editor.placeableLayer}
    <p class="warn">Vælg et synligt, ulåst <b>Genstande</b>- eller <b>Effekter</b>-lag (eller opret et).</p>
  {/if}
  <label class="chk"><input type="checkbox" bind:checked={editor.snap} /> Fastgør til halve felter</label>
{:else if editor.tool === 'select'}
  <label class="chk"><input type="checkbox" bind:checked={editor.snap} /> Fastgør til halve felter</label>
{/if}

{#if editor.tool === 'scatter'}
  {#if !editor.placeableLayer}
    <p class="warn">Vælg et synligt, ulåst <b>Genstande</b>-lag (eller opret et).</p>
  {/if}
  <p class="hint">Vælg en familie nedenfor (fx Træer med <b>Tilfældig</b>) og træk over kortet.</p>
  <label>Penselstørrelse: {editor.scatterCells} felter
    <input type="range" min="1" max="30" step="0.5" bind:value={editor.scatterCells} />
  </label>
  <label>Tæthed: {Math.round(editor.scatterDensity * 100)} %
    <input type="range" min="0.05" max="1" step="0.05" bind:value={editor.scatterDensity} />
  </label>
  <label class="chk"><input type="checkbox" bind:checked={editor.scatterAvoidWater} /> Undgå vand</label>
  <label class="chk"><input type="checkbox" bind:checked={editor.scatterErase} /> Fjern i stedet for at spredes</label>
{/if}

{#if editor.tool === 'wall'}
  {#if !editor.placeableWallLayer}
    <p class="warn">Vælg et synligt, ulåst <b>Mure</b>-lag (eller opret et).</p>
  {/if}
  <div class="mats" role="radiogroup" aria-label="Murtype">
    {#each WALL_STYLES as st}
      <button role="radio" aria-checked={editor.wallStyle === st.key} class:on={editor.wallStyle === st.key} onclick={() => editor.setWallStyle(st.key)}>
        <span class="sw" style="background:rgb({st.fill.join(',')})"></span>{st.label}
      </button>
    {/each}
  </div>
  <label>Tykkelse: {editor.wallThicknessCells} felter
    <input type="range" min="0.1" max="2" step="0.05" bind:value={editor.wallThicknessCells} />
  </label>
  <label class="chk"><input type="checkbox" bind:checked={editor.snap} /> Fastgør til halve felter</label>
  <p class="hint">Klik for hvert hjørne. Klik på sidste punkt (eller tryk Enter) for at afslutte; klik på første punkt for at lukke. Shift låser vinklen til 15°. Backspace fjerner sidste punkt, Esc afbryder.</p>
  {#if editor.wallDraft}
    <div class="row">
      <button class="primary" onclick={() => editor.finishDraft(false)}>Færdig</button>
      <button onclick={() => editor.finishDraft(true)} disabled={(editor.wallDraft?.length ?? 0) < 3}>Luk mur</button>
      <button onclick={() => editor.cancelDraft()}>Annullér</button>
    </div>
  {/if}
{/if}

{#if editor.tool === 'opening'}
  <div class="mats" role="radiogroup" aria-label="Åbningstype">
    {#each OPENING_KINDS as k}
      <button role="radio" aria-checked={editor.openingKind === k.key} class:on={editor.openingKind === k.key} onclick={() => (editor.openingKind = k.key)}>{k.label}</button>
    {/each}
  </div>
  <label class="chk"><input type="checkbox" bind:checked={editor.snap} /> Fastgør til halve felter</label>
  <p class="hint">Klik på en mur for at sætte den ind. Vælg den bagefter med Vælg-værktøjet for at åbne den, vende den eller flytte den langs muren.</p>
{/if}

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
  .tools { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 10px; }
  .tools button { padding: 5px 4px; }
  button.on { border-color: var(--accent); background: #3a3426; }
  .mats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px; }
  .mats button { display: flex; align-items: center; gap: 6px; text-align: left; padding: 4px 6px; }
  .sw { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,.5); flex: none; }
  label.chk { flex-direction: row; align-items: center; gap: 6px; }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; color: var(--muted); }
  .warn { color: var(--danger); margin: 0 0 8px; }
  .hint { color: var(--muted); font-size: 12px; margin: 0 0 8px; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  h2 + .tools { margin-top: 0; }
</style>
