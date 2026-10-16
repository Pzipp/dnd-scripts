<script lang="ts">
  import { onDestroy } from 'svelte';
  import { deleteAsset, patchAsset, uploadAsset, type AssetItem } from '../api';
  import { assetKey, OWN_FAMILY, refreshLibrary } from '../assets/library';
  import {
    cutOut,
    defaultOptions,
    findBackground,
    suggestSizes,
    type Background,
    type Cutout,
    type CutoutOptions,
    type Raster,
    type Rgb,
  } from '../assets/cutout';
  import { editor } from '../model/store.svelte';
  import { FAMILIES, familyKinds, onKindsChanged, TAGS } from '../objects';
  import Thumb from './Thumb.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const MAX_SOURCE = 2500;
  const MAX_ASSET_PX = 512;

  let tab = $state<'import' | 'library'>('import');
  let library = $state<AssetItem[]>([]);
  let rev = $state(0);
  const off = onKindsChanged(() => rev++);
  onDestroy(off);
  const kindsOf = (_rev: number, key: string) => familyKinds(key);

  // ---- import ----
  interface Tile {
    cut: Cutout;
    url: string;
    include: boolean;
    name: string;
    /** Bredde i felter; højden følger udsnittets proportioner. */
    w: number;
  }
  let src = $state.raw<Raster | null>(null);
  let srcUrl = $state('');
  let fileName = $state('');
  let bg = $state.raw<Background>({ colors: [], transparent: false });
  let opt = $state<CutoutOptions>({ tolerance: 30, mergeGap: 12, fillHoles: false });
  let tiles = $state.raw<Tile[]>([]);
  let baseCells = $state(2);
  let family = $state('tree');
  let shadow = $state(true);
  let randomRotation = $state(false);
  let tags = $state<string[]>([]);
  let busy = $state('');
  let error = $state('');
  let namePrefix = $state('');
  let manualBg = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const families = $derived(FAMILIES.filter((f) => f.key === OWN_FAMILY || kindsOf(rev, f.key).length > 0));
  const chosen = $derived(tiles.filter((t) => t.include));

  const rgb = (c: Rgb) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

  async function readRaster(file: File): Promise<Raster> {
    let bmp: ImageBitmap;
    try {
      bmp = await createImageBitmap(file);
    } catch {
      throw new Error('Filen kan ikke læses som billede (brug PNG, JPEG eller WebP).');
    }
    const k = Math.min(1, MAX_SOURCE / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    srcUrl = c.toDataURL('image/png');
    const d = g.getImageData(0, 0, c.width, c.height);
    return { width: d.width, height: d.height, data: d.data };
  }

  function cutToCanvas(r: Raster): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = r.width;
    c.height = r.height;
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.width, r.height), 0, 0);
    return c;
  }

  function build(): void {
    if (!src) return;
    error = '';
    const cuts = cutOut(src, opt, bg);
    const sizes = suggestSizes(cuts, baseCells);
    const old = tiles;
    tiles = cuts.map((cut, n) => ({
      cut,
      url: cutToCanvas(cut.raster).toDataURL('image/png'),
      include: old.length === cuts.length ? old[n]!.include : true,
      name: old.length === cuts.length && old[n]!.name ? old[n]!.name : defaultName(n),
      w: sizes[n]!,
    }));
    if (!cuts.length) error = 'Jeg fandt ingen genstande. Prøv en anden tolerance eller klik på baggrunden i billedet.';
    busy = '';
  }

  const defaultName = (n: number) => `${namePrefix.trim() || 'Egen genstand'} ${n + 1}`;

  /** Kører udskæringen igen kort efter en ændring (så skydere ikke gør siden træg). */
  function schedule(): void {
    busy = 'Arbejder …';
    clearTimeout(timer);
    timer = setTimeout(() => setTimeout(build, 0), 120);
  }

  async function onFile(e: Event | File) {
    const file = e instanceof File ? e : (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    error = '';
    busy = 'Læser billedet …';
    try {
      src = await readRaster(file);
      fileName = file.name;
      bg = findBackground(src);
      manualBg = false;
      opt = defaultOptions(src);
      tiles = [];
      await new Promise((r) => setTimeout(r, 0));
      build();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      src = null;
      busy = '';
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) void onFile(f);
  }

  /** Klik på billedet: den farve er baggrunden. */
  function pickBackground(e: MouseEvent) {
    if (!src) return;
    const img = e.currentTarget as HTMLImageElement;
    const r = img.getBoundingClientRect();
    const x = Math.min(src.width - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * src.width)));
    const y = Math.min(src.height - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * src.height)));
    const i = (y * src.width + x) * 4;
    bg = { colors: [[src.data[i]!, src.data[i + 1]!, src.data[i + 2]!]], transparent: false };
    manualBg = true;
    schedule();
  }

  function autoBackground() {
    if (!src) return;
    bg = findBackground(src);
    manualBg = false;
    schedule();
  }

  function setBase(v: number) {
    baseCells = v;
    const sizes = suggestSizes(tiles.map((t) => t.cut), v);
    tiles = tiles.map((t, n) => ({ ...t, w: sizes[n]! }));
  }

  function patchTile(n: number, ch: Partial<Tile>) {
    tiles = tiles.map((t, k) => (k === n ? { ...t, ...ch } : t));
  }

  function renameAll() {
    tiles = tiles.map((t, n) => ({ ...t, name: defaultName(n) }));
  }

  /** Halverer i trin og skalerer til sidst, så en stor genstand ikke får takkede kanter. */
  function scaled(c: HTMLCanvasElement, max: number): HTMLCanvasElement {
    let cur = c;
    while (Math.max(cur.width, cur.height) > max) {
      const k = Math.max(max / Math.max(cur.width, cur.height), 0.5);
      const n = document.createElement('canvas');
      n.width = Math.max(1, Math.round(cur.width * k));
      n.height = Math.max(1, Math.round(cur.height * k));
      const g = n.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      g.drawImage(cur, 0, 0, n.width, n.height);
      cur = n;
    }
    return cur;
  }

  const toBlob = (c: HTMLCanvasElement) =>
    new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Kunne ikke lave billedet.'))), 'image/png'));

  async function save() {
    if (!chosen.length) return;
    error = '';
    const created: AssetItem[] = [];
    try {
      for (const [n, t] of chosen.entries()) {
        busy = `Gemmer ${n + 1} af ${chosen.length} …`;
        const c = scaled(cutToCanvas(t.cut.raster), MAX_ASSET_PX);
        const w = Math.min(40, Math.max(0.25, t.w));
        const h = Math.round(((w * t.cut.h) / t.cut.w) * 100) / 100;
        created.push(await uploadAsset(await toBlob(c), { name: t.name.trim() || defaultName(n), family, w, h, shadow, randomRotation, tags }));
      }
    } catch (err) {
      error = (err instanceof Error ? err.message : String(err)) + (created.length ? ` (${created.length} er allerede gemt.)` : '');
      busy = '';
      if (created.length) library = await refreshLibrary();
      return;
    }
    library = await refreshLibrary();
    busy = '';
    editor.status = `${created.length} egne genstande gemt`;
    // gør den første af de nye klar til udsætning
    editor.stampFamily = created[0]!.family === family && familyKinds(family).length ? family : OWN_FAMILY;
    editor.stampKind = assetKey(created[0]!.id);
    editor.setTool('stamp');
    onclose();
  }

  // ---- bibliotek ----
  async function openLibrary() {
    tab = 'library';
    library = await refreshLibrary();
  }

  async function change(item: AssetItem, ch: Parameters<typeof patchAsset>[1]) {
    error = '';
    try {
      const upd = await patchAsset(item.id, ch);
      library = library.map((i) => (i.id === upd.id ? upd : i));
      await refreshLibrary();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  async function remove(item: AssetItem) {
    if (!confirm(`Slet "${item.name}"? Kort, der bruger den, viser en rød ramme i stedet.`)) return;
    error = '';
    try {
      await deleteAsset(item.id);
      library = await refreshLibrary();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function resizeItem(item: AssetItem, w: number) {
    if (!(w >= 0.25 && w <= 40)) return;
    void change(item, { w, h: Math.round(((w * item.pxH) / item.pxW) * 100) / 100 });
  }

  function toggleTag(t: string) {
    tags = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
  }
</script>

<div class="backdrop" role="presentation" onclick={onclose}></div>
<div class="dlg" role="dialog" aria-modal="true" aria-label="Egne genstande">
  <header>
    <h2>Egne genstande</h2>
    <div class="tabs">
      <button class:on={tab === 'import'} onclick={() => (tab = 'import')}>Importér billede</button>
      <button class:on={tab === 'library'} onclick={openLibrary}>Mine genstande</button>
    </div>
    <button class="x" onclick={onclose} aria-label="Luk">✕</button>
  </header>

  {#if error}<p class="err" role="alert">{error}</p>{/if}

  {#if tab === 'import'}
    {#if !src}
      <label class="drop" ondragover={(e) => e.preventDefault()} ondrop={onDrop}>
        <input type="file" accept="image/png,image/jpeg,image/webp" onchange={onFile} />
        <strong>Vælg et billede</strong> eller træk det herind<br />
        <span>Et enkelt billede eller et ark med mange genstande. Jeg finder dem og fjerner baggrunden.</span>
        {#if busy}<em>{busy}</em>{/if}
      </label>
      <p class="hint">
        Billedet skal vise genstandene set oppefra på en <b>ensfarvet</b> (fx hvid) eller <b>ternet</b> baggrund, uden skygge og med luft imellem. PNG, JPEG eller WebP.
      </p>
    {:else}
      <div class="cols">
        <section class="src">
          <h3>{fileName}</h3>
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
          <img src={srcUrl} alt="Det valgte billede. Klik for at vælge baggrundsfarven." onclick={pickBackground} />
          <p class="hint">Klik på baggrunden i billedet, hvis den ikke blev fundet rigtigt.</p>
          <div class="bg">
            Baggrund:
            {#if bg.transparent}<span>allerede gennemsigtig</span>{/if}
            {#each bg.colors as c}<i class="sw" style="background:{rgb(c)}" title={rgb(c)}></i>{/each}
            {#if manualBg}<button onclick={autoBackground}>Find selv</button>{/if}
          </div>
          <label><span>Tolerance for baggrund: <b>{opt.tolerance}</b></span>
            <input type="range" min="6" max="90" bind:value={opt.tolerance} oninput={schedule} />
          </label>
          <label><span>Saml dele, der ligger tættere end <b>{opt.mergeGap}</b> px</span>
            <input type="range" min="0" max="80" bind:value={opt.mergeGap} oninput={schedule} />
          </label>
          <label class="chk"><input type="checkbox" bind:checked={opt.fillHoles} onchange={schedule} /> Fjern også baggrund inde i genstande (huller)</label>
          <button onclick={() => { src = null; tiles = []; }}>Vælg et andet billede</button>
        </section>

        <section class="res">
          <div class="shared">
            <label>Familie
              <select bind:value={family}>
                {#each families as f (f.key)}<option value={f.key}>{f.label}</option>{/each}
              </select>
            </label>
            <label>Navn begynder med
              <input type="text" bind:value={namePrefix} placeholder="Egen genstand" onchange={renameAll} />
            </label>
            <label><span>Midterste genstand = <b>{baseCells}</b> felter</span>
              <input type="range" min="0.5" max="6" step="0.5" value={baseCells} oninput={(e) => setBase(+e.currentTarget.value)} />
            </label>
            <label class="chk"><input type="checkbox" bind:checked={shadow} /> Skygge</label>
            <label class="chk"><input type="checkbox" bind:checked={randomRotation} /> Tilfældig rotation (træer, sten)</label>
            <details>
              <summary>Tags ({tags.length})</summary>
              <div class="tags">
                {#each Object.entries(TAGS) as [k, label]}
                  <button class:on={tags.includes(k)} onclick={() => toggleTag(k)}>{label}</button>
                {/each}
              </div>
            </details>
          </div>

          <p class="count">{busy || `${tiles.length} genstande fundet, ${chosen.length} valgt`}</p>
          <div class="tiles">
            {#each tiles as t, n (n)}
              <div class="tile" class:off={!t.include}>
                <label class="pick"><input type="checkbox" checked={t.include} onchange={(e) => patchTile(n, { include: e.currentTarget.checked })} /></label>
                <div class="pv"><img src={t.url} alt={t.name} /></div>
                <input type="text" value={t.name} maxlength="60" aria-label="Navn" onchange={(e) => patchTile(n, { name: e.currentTarget.value })} />
                <label class="sz">Bredde <input type="number" min="0.25" max="40" step="0.25" value={t.w} onchange={(e) => patchTile(n, { w: +e.currentTarget.value })} /> felter</label>
              </div>
            {/each}
          </div>
        </section>
      </div>
      <div class="btns">
        <button onclick={onclose}>Annullér</button>
        <button class="primary" disabled={!chosen.length || !!busy} onclick={save}>Gem {chosen.length} genstande</button>
      </div>
    {/if}
  {:else}
    {#if !library.length}
      <p class="hint">Du har ikke importeret nogen genstande endnu.</p>
    {/if}
    <div class="lib">
      {#each library as item (item.id)}
        <div class="row">
          <Thumb kindKey={assetKey(item.id)} size={56} />
          <input type="text" value={item.name} maxlength="60" aria-label="Navn" onchange={(e) => change(item, { name: e.currentTarget.value })} />
          <select value={item.family} aria-label="Familie" onchange={(e) => change(item, { family: e.currentTarget.value })}>
            {#each families as f (f.key)}<option value={f.key}>{f.label}</option>{/each}
          </select>
          <label class="sz">Bredde <input type="number" min="0.25" max="40" step="0.25" value={item.w} onchange={(e) => resizeItem(item, +e.currentTarget.value)} /></label>
          <label class="chk" title="Skygge"><input type="checkbox" checked={item.shadow} onchange={(e) => change(item, { shadow: e.currentTarget.checked })} /> Skygge</label>
          <label class="chk" title="Tilfældig rotation"><input type="checkbox" checked={item.randomRotation} onchange={(e) => change(item, { randomRotation: e.currentTarget.checked })} /> Roter</label>
          <button class="danger" onclick={() => remove(item)}>Slet</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); }
  .dlg {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(1100px, 96vw); max-height: 92vh; overflow: auto;
    background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px;
  }
  header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  header h2 { margin: 0; }
  .tabs { display: flex; gap: 4px; flex: 1; }
  .tabs button.on { border-color: var(--accent); background: #3a3426; }
  .x { padding: 2px 8px; }
  .err { color: var(--danger); margin: 0 0 8px; }
  .hint { color: var(--muted); margin: 6px 0; }
  .drop {
    display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 36px 16px;
    border: 2px dashed var(--line); border-radius: 8px; cursor: pointer;
  }
  .drop:hover { border-color: var(--accent); }
  .drop span { color: var(--muted); }
  .drop input { max-width: 100%; }
  .cols { display: grid; grid-template-columns: 300px 1fr; gap: 16px; }
  @media (max-width: 800px) { .cols { grid-template-columns: 1fr; } }
  h3 { margin: 0 0 6px; font-size: 13px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .src img { width: 100%; border: 1px solid var(--line); border-radius: 4px; cursor: crosshair; background: #fff; }
  .src label, .shared label { display: flex; flex-direction: column; gap: 2px; margin: 8px 0; color: var(--muted); }
  label.chk { flex-direction: row; align-items: center; gap: 6px; }
  .bg { display: flex; align-items: center; gap: 6px; color: var(--muted); }
  .sw { display: inline-block; width: 18px; height: 18px; border: 1px solid var(--line); border-radius: 3px; }
  .shared { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0 12px; align-items: end; }
  .shared details { grid-column: 1 / -1; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 0; }
  .tags button { padding: 1px 8px; font-size: 12px; }
  .tags button.on { border-color: var(--accent); background: #3a3426; }
  .count { color: var(--muted); margin: 6px 0; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; max-height: 46vh; overflow: auto; padding-right: 2px; }
  .tile { position: relative; display: flex; flex-direction: column; gap: 4px; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 6px; }
  .tile.off { opacity: .4; }
  .pick { position: absolute; top: 4px; left: 6px; z-index: 1; }
  .pv {
    height: 110px; display: flex; align-items: center; justify-content: center; border-radius: 4px;
    background: repeating-conic-gradient(#555 0 25%, #777 0 50%) 0 0 / 14px 14px;
  }
  .pv img { max-width: 100%; max-height: 100%; }
  .tile input[type='text'] { width: 100%; }
  .sz { display: flex; align-items: center; gap: 4px; color: var(--muted); font-size: 12px; }
  .sz input { width: 64px; }
  .btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  .lib { display: flex; flex-direction: column; gap: 6px; }
  .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 6px; }
  .row input[type='text'] { flex: 1; min-width: 140px; }
</style>
