<script lang="ts">
  import { MATERIAL_GROUPS, MATERIALS } from '../render/materials';
  import { OPENING_KINDS, WALL_STYLES } from '../render/walls';
  import { editor, type Tool } from '../model/store.svelte';
  import { familyKinds, getKind } from '../objects';
  import type { BrushKind } from '../render/paintBrush';
  import { isStoneMaterial } from '../render/stones';

  const TITLES: Record<Tool, string> = {
    hand: 'Hånd', select: 'Vælg', stamp: 'Genstand', scatter: 'Spred', line: 'Linje', shape: 'Form', opening: 'Dør', paint: 'Pensel', erase: 'Viskelæder',
  };
  const BRUSHES: { id: BrushKind; label: string; hint: string }[] = [
    { id: 'round', label: 'Rund', hint: 'Rund pensel med blød eller hård kant' },
    { id: 'edge', label: 'Kant', hint: 'Skarp, men ujævn kant (strand, klippe, jordpletter)' },
    { id: 'grid', label: 'Gitter', hint: 'Maler hele felter ad gangen' },
    { id: 'tuft', label: 'Totter', hint: 'Sætter græstotter ud med en vis afstand' },
  ];
  const tuftKinds = familyKinds('tallgrass');
  const toneParam = $derived.by(() => {
    const def = getKind(editor.tuftKind)?.params.find((p) => p.key === 'tone');
    return def && def.type === 'select' ? def : null;
  });
  const isStone = $derived(isStoneMaterial(editor.material));
  const wallGroups = [...new Set(WALL_STYLES.map((s) => s.group))];
  const painting = $derived(editor.tool === 'paint' || editor.tool === 'erase');
</script>

<h2>{TITLES[editor.tool]}</h2>
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
    <p class="warn">Vælg et synligt, ulåst <b>Grund</b>- eller <b>Gulv</b>-lag for at male.</p>
  {/if}
  <h3>Pensel</h3>
  <div class="kinds4" role="radiogroup" aria-label="Penseltype">
    {#each BRUSHES.filter((b) => editor.tool === 'paint' || b.id !== 'tuft') as b}
      <button role="radio" aria-checked={editor.brushKind === b.id} class:on={editor.brushKind === b.id} title={b.hint} onclick={() => (editor.brushKind = b.id)}>{b.label}</button>
    {/each}
  </div>
  <label>Størrelse: {editor.brushCells} felter ({Math.round(editor.brushCells * 50)} px)
    <input type="range" min="0.5" max="16" step="0.5" bind:value={editor.brushCells} />
  </label>
  {#if editor.brushKind !== 'tuft' || editor.tool === 'erase'}
    <label>Gennemsigtighed: {Math.round(editor.brushOpacity * 100)} %
      <input type="range" min="0.05" max="1" step="0.05" bind:value={editor.brushOpacity} />
    </label>
  {/if}
  {#if editor.brushKind === 'round' || (editor.brushKind === 'tuft' && editor.tool === 'erase')}
    <label>Hårdhed: {Math.round(editor.brushHardness * 100)} % <span class="sub">(lav = blød kant)</span>
      <input type="range" min="0" max="1" step="0.05" bind:value={editor.brushHardness} />
    </label>
  {:else if editor.brushKind === 'edge'}
    <label>Ujævnhed: {Math.round(editor.brushRoughness * 100)} %
      <input type="range" min="0" max="1" step="0.05" bind:value={editor.brushRoughness} />
    </label>
  {:else if editor.brushKind === 'grid'}
    <p class="hint">Maler hele felter ad gangen (størrelsen rundes til hele felter).</p>
  {/if}

  {#if editor.tool === 'paint' && editor.brushKind === 'tuft'}
    <h3>Totter</h3>
    <label>Type
      <select bind:value={editor.tuftKind}>
        {#each tuftKinds as k}<option value={k.key}>{k.name}</option>{/each}
      </select>
    </label>
    {#if toneParam}
      <label>{toneParam.label}
        <select bind:value={editor.tuftTone}>
          {#each toneParam.options as o}<option value={o.value}>{o.label}</option>{/each}
        </select>
      </label>
    {/if}
    <label>Afstand mellem totter: {editor.tuftSpacing} felter
      <input type="range" min="0.2" max="3" step="0.1" bind:value={editor.tuftSpacing} />
    </label>
    <label>Tottens størrelse: {editor.tuftSize} felter
      <input type="range" min="0.3" max="2" step="0.1" bind:value={editor.tuftSize} />
    </label>
    <label>Tæthed: {Math.round(editor.tuftDensity * 100)} %
      <input type="range" min="0.1" max="1" step="0.05" bind:value={editor.tuftDensity} />
    </label>
    <label>Gennemsigtighed: {Math.round(editor.brushOpacity * 100)} %
      <input type="range" min="0.05" max="1" step="0.05" bind:value={editor.brushOpacity} />
    </label>
  {:else if editor.tool === 'paint'}
    {#if editor.recentMaterials.length}
      <h3>Seneste</h3>
      <div class="recent">
        {#each editor.recentMaterials as id}
          {@const m = MATERIALS.find((x) => x.id === id)}
          {#if m}
            <button class:on={editor.material === id} title={m.name} aria-label={m.name} onclick={() => (editor.material = id)}><span class="sw big" style="background:{m.swatch}"></span></button>
          {/if}
        {/each}
      </div>
    {/if}
    {#each MATERIAL_GROUPS.filter((g) => g !== 'Tomrum') as group}
      {@const list = MATERIALS.filter((m) => m.group === group)}
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
    {#if isStone}
      <label class="chk"><input type="checkbox" bind:checked={editor.wholeStones} /> Hele sten (ikke skåret ved penselkanten)</label>
    {:else}
      <h3>Mønster</h3>
      <label>Størrelse: {Math.round(editor.textureScale * 100)} %
        <input type="range" min="0.5" max="2" step="0.05" bind:value={editor.textureScale} />
      </label>
      <label>Drejning: {editor.textureRotation}°
        <input type="range" min="0" max="345" step="15" bind:value={editor.textureRotation} />
      </label>
    {/if}
  {/if}
  <button disabled={!editor.paintableLayer} onclick={() => editor.fillSelected()}>
    {editor.tool === 'erase' ? 'Ryd hele laget' : 'Fyld hele laget'}
  </button>
  <p class="hint">Underlaget er et fladt billede: det huskes ikke, hvordan noget er malet. Fortryd virker stadig. Tast [ og ] for at ændre størrelsen.</p>
{/if}

<style>
  button.on { border-color: var(--accent); background: #3a3426; }
  .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
  .kinds { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 8px; }
  h3 { font-size: 9px; color: var(--muted); margin: 6px 0 4px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
  .kinds4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px; }
  .recent { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
  .recent button { padding: 3px; }
  .sw.big { width: 22px; height: 22px; display: block; }
  .sub { font-size: 8px; opacity: .75; }
  .mats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px; }
  .mats button { display: flex; align-items: center; gap: 6px; text-align: left; padding: 4px 6px; }
  .sw { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,.5); flex: none; }
  label.chk { flex-direction: row; align-items: center; gap: 6px; }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; color: var(--muted); }
  .warn { color: var(--danger); margin: 0 0 8px; }
  .hint { color: var(--muted); font-size: 9px; margin: 0 0 8px; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
</style>
