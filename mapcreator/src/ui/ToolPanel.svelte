<script lang="ts">
  import { MATERIAL_GROUPS, MATERIALS } from '../render/materials';
  import { OPENING_KINDS, WALL_STYLES } from '../render/walls';
  import { editor, type Tool } from '../model/store.svelte';

  const tools: { id: Tool; label: string; hint: string }[] = [
    { id: 'hand', label: 'Hånd', hint: 'Flyt kortet (træk)' },
    { id: 'select', label: 'Vælg', hint: 'Vælg, flyt, skalér og rotér genstande (V)' },
    { id: 'stamp', label: 'Genstand', hint: 'Sæt genstande ud (G)' },
    { id: 'scatter', label: 'Spred', hint: 'Mal en skov, spred sten eller planter (S)' },
    { id: 'line', label: 'Linje', hint: 'Tegn mure, stier, broer, kløfter og hegn: punkt for punkt eller frihånd (L)' },
    { id: 'shape', label: 'Form', hint: 'Tegn firkanter, cirkler og frie former med kant og udfyldning, fx bygninger (F)' },
    { id: 'opening', label: 'Dør', hint: 'Sæt døre, porte og vinduer i en mur (D)' },
    { id: 'paint', label: 'Pensel', hint: 'Mal terræn på et grundlag' },
    { id: 'erase', label: 'Viskelæder', hint: 'Fjern terræn (gør laget gennemsigtigt)' },
  ];
  /** Stier kan kun være af de materialer, der er markeret som `pathable`. */
  function setPathMode() {
    editor.paintMode = 'path';
    if (!MATERIALS.find((m) => m.id === editor.material)?.pathable) editor.material = 2;
  }
  const wallGroups = [...new Set(WALL_STYLES.map((s) => s.group))];
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

{#if editor.tool === 'line'}
  {#if !editor.placeableWallLayer}
    <p class="warn">Vælg et synligt, ulåst <b>Linjer og former</b>-lag (eller opret et).</p>
  {/if}
  <div class="modes" role="radiogroup" aria-label="Sådan tegnes linjen">
    <button role="radio" aria-checked={editor.lineMode === 'points'} class:on={editor.lineMode === 'points'} onclick={() => (editor.lineMode = 'points')} title="Klik for hvert punkt">Punkter</button>
    <button role="radio" aria-checked={editor.lineMode === 'free'} class:on={editor.lineMode === 'free'} onclick={() => (editor.lineMode = 'free')} title="Træk med musen eller fingeren">Frihånd</button>
  </div>
  {#each wallGroups as group}
    <h3>{group}</h3>
    <div class="mats" role="radiogroup" aria-label={group}>
      {#each WALL_STYLES.filter((s) => s.group === group) as st}
        <button role="radio" aria-checked={editor.wallStyle === st.key} class:on={editor.wallStyle === st.key} onclick={() => editor.setWallStyle(st.key)}>
          <span class="sw" style="background:rgb({st.fill.join(',')})"></span>{st.label}
        </button>
      {/each}
    </div>
  {/each}
  <label>Tykkelse: {editor.wallThicknessCells} felter
    <input type="range" min="0.1" max="4" step="0.05" bind:value={editor.wallThicknessCells} />
  </label>
  <label class="chk"><input type="checkbox" bind:checked={editor.lineFlip} /> Vend (anden side)</label>
  {#if editor.lineMode === 'free'}
    <label class="chk"><input type="checkbox" bind:checked={editor.lineSmooth} /> Udjævn frihåndslinjen</label>
  {:else}
    <label class="chk"><input type="checkbox" bind:checked={editor.snap} /> Fastgør til halve felter</label>
  {/if}
  <p class="hint">
    {#if editor.lineMode === 'free'}
      Træk for at tegne. Linjen forenkles til få punkter, som du kan flytte bagefter med Vælg.
    {:else}
      Klik for hvert punkt. Klik på sidste punkt (eller tryk Enter) for at afslutte; klik på første punkt for at lukke. Shift låser vinklen til 15°. Backspace fjerner sidste punkt, Esc afbryder.
    {/if}
    Døre og vinduer kan kun sættes i mure.
  </p>
  {#if editor.wallDraft}
    <div class="row">
      <button class="primary" onclick={() => editor.finishDraft(false)}>Færdig</button>
      <button onclick={() => editor.finishDraft(true)} disabled={(editor.wallDraft?.length ?? 0) < 3}>Luk linje</button>
      <button onclick={() => editor.cancelDraft()}>Annullér</button>
    </div>
  {/if}
{/if}

{#if editor.tool === 'shape'}
  {#if !editor.placeableWallLayer}
    <p class="warn">Vælg et synligt, ulåst <b>Linjer og former</b>-lag (eller opret et).</p>
  {/if}
  <div class="kinds" role="radiogroup" aria-label="Formens type">
    <button role="radio" aria-checked={editor.shapeKind === 'rect'} class:on={editor.shapeKind === 'rect'} onclick={() => (editor.shapeKind = 'rect')} title="Træk fra hjørne til hjørne (Shift = kvadrat)">Firkant</button>
    <button role="radio" aria-checked={editor.shapeKind === 'ellipse'} class:on={editor.shapeKind === 'ellipse'} onclick={() => (editor.shapeKind = 'ellipse')} title="Træk fra midten (Shift = cirkel)">Cirkel</button>
    <button role="radio" aria-checked={editor.shapeKind === 'free'} class:on={editor.shapeKind === 'free'} onclick={() => (editor.shapeKind = 'free')} title="Tegn frit; formen lukkes af sig selv">Frihånd</button>
  </div>
  <h3>Kant</h3>
  <label>Type
    <select bind:value={editor.shapeStyle}>
      <option value="none">Ingen kant</option>
      {#each wallGroups as group}
        <optgroup label={group}>
          {#each WALL_STYLES.filter((s) => s.group === group) as st}<option value={st.key}>{st.label}</option>{/each}
        </optgroup>
      {/each}
    </select>
  </label>
  {#if editor.shapeStyle !== 'none'}
    <label>Kantens tykkelse: {editor.shapeThicknessCells} felter
      <input type="range" min="0.1" max="3" step="0.05" bind:value={editor.shapeThicknessCells} />
    </label>
  {/if}
  <h3>Udfyldning</h3>
  <label>Materiale
    <select bind:value={editor.shapeMaterial}>
      {#each MATERIAL_GROUPS as group}
        <optgroup label={group}>
          {#each MATERIALS.filter((m) => m.group === group) as m}<option value={m.id}>{m.name}</option>{/each}
        </optgroup>
      {/each}
    </select>
  </label>
  <label class="chk"><input type="checkbox" bind:checked={editor.shapeFlip} /> Vend (inderside og yderside)</label>
  <label class="chk"><input type="checkbox" bind:checked={editor.snap} /> Fastgør til halve felter</label>
  <p class="hint">Træk på kortet. Bagefter kan du flytte formens punkter med Vælg-værktøjet, ændre kant og udfyldning, og sætte døre i kanten, hvis den er en mur.</p>
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
  <div class="modes" role="radiogroup" aria-label="Hvad skal males">
    <button role="radio" aria-checked={editor.paintMode === 'base'} class:on={editor.paintMode === 'base'} onclick={() => (editor.paintMode = 'base')} title="Mal selve terrænet">Terræn</button>
    <button role="radio" aria-checked={editor.paintMode === 'path'} class:on={editor.paintMode === 'path'} onclick={() => setPathMode()} title="Mal en sti oven på terrænet; den blander sig med det, den ligger på">Sti oven på</button>
  </div>
  {#if editor.tool === 'paint'}
    {#each MATERIAL_GROUPS as group}
      {@const list = MATERIALS.filter((m) => m.group === group && (editor.paintMode === 'base' || m.pathable))}
      {#if list.length}
        <h3>{group}</h3>
        <div class="mats" role="radiogroup" aria-label={group}>
          {#each list as m}
            <button role="radio" aria-checked={editor.material === m.id} class:on={editor.material === m.id} title={m.name} onclick={() => (editor.material = m.id)}>
              <span class="sw" style="background:{m.swatch}"></span>{m.name}
            </button>
          {/each}
        </div>
      {/if}
    {/each}
  {:else if editor.paintMode === 'path'}
    <p class="hint">Visker fjerner stier. Terrænet under står, som det var.</p>
  {/if}
  <label>Penselstørrelse: {editor.brushCells} felter
    <input type="range" min="0.5" max="16" step="0.5" bind:value={editor.brushCells} />
  </label>
  <button disabled={!editor.paintableLayer} onclick={() => editor.fillSelected()}>
    {editor.tool === 'erase' ? (editor.paintMode === 'path' ? 'Fjern alle stier' : 'Ryd hele laget') : editor.paintMode === 'path' ? 'Dæk hele laget med sti' : 'Fyld hele laget'}
  </button>
{/if}

<style>
  .tools { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 10px; }
  .tools button { padding: 5px 4px; }
  button.on { border-color: var(--accent); background: #3a3426; }
  .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
  .kinds { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 8px; }
  h3 { font-size: 11px; color: var(--muted); margin: 6px 0 4px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
  .mats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px; }
  .mats button { display: flex; align-items: center; gap: 6px; text-align: left; padding: 4px 6px; }
  .sw { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,.5); flex: none; }
  label.chk { flex-direction: row; align-items: center; gap: 6px; }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; color: var(--muted); }
  .warn { color: var(--danger); margin: 0 0 8px; }
  .hint { color: var(--muted); font-size: 12px; margin: 0 0 8px; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  h2 + .tools { margin-top: 0; }
</style>
