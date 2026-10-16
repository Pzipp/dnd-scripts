<script lang="ts">
  import { editor } from './model/store.svelte';
  import { QUALITIES, QUALITY_LABEL, type Quality } from './render/quality';
  import LayerPanel from './ui/LayerPanel.svelte';
  import Inspector from './ui/Inspector.svelte';
  import Viewport from './ui/Viewport.svelte';
  import ResizeDialog from './ui/ResizeDialog.svelte';
  import NewMapDialog from './ui/NewMapDialog.svelte';
  import OpenDialog from './ui/OpenDialog.svelte';
  import ToolBar from './ui/ToolBar.svelte';
  import Icon from './ui/Icon.svelte';
  import ElementInspector from './ui/ElementInspector.svelte';
  import WallInspector from './ui/WallInspector.svelte';
  import { CELL_PX } from './model/types';
  import ToolPanel from './ui/ToolPanel.svelte';
  import ObjectPicker from './ui/ObjectPicker.svelte';
  import ExportDialog from './ui/ExportDialog.svelte';
  import Gallery from './ui/Gallery.svelte';
  import ImportDialog from './ui/ImportDialog.svelte';

  let layersFolded = $state(false);
  let objectsFolded = $state(false);
  let leftFolded = $state(false);
  // Værktøjskolonnen er foldet ind, når der intet er at vise (fx Hånd, eller Vælg uden en markering).
  const leftHasContent = $derived(editor.tool !== 'hand' && !(editor.tool === 'select' && !editor.selection && !editor.selectionWall));
  const leftCollapsed = $derived(!leftHasContent || leftFolded);

  // Små skærme: kolonnerne bliver til et panel nederst, som åbnes fra en fanelinje under værktøjerne.
  const narrowQuery = window.matchMedia('(max-width: 900px)');
  let narrow = $state(narrowQuery.matches);
  $effect(() => {
    const on = () => (narrow = narrowQuery.matches);
    narrowQuery.addEventListener('change', on);
    return () => narrowQuery.removeEventListener('change', on);
  });
  let toolsH = $state(48);
  let tabsH = $state(0);
  let sheet = $state<'left' | 'right' | 'layers' | null>(null);
  const openSheet = (s: 'left' | 'right' | 'layers') => (sheet = sheet === s ? null : s);
  // et værktøjsskift lukker panelet, så kortet er frit igen
  $effect(() => {
    editor.tool;
    sheet = null;
  });

  const gallery = new URLSearchParams(location.search).has('galleri');

  let dialog = $state<'new' | 'open' | 'export' | 'assets' | 'resize' | null>(null);

  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
    const mod = e.ctrlKey || e.metaKey;
    if (editor.tool === 'line' && editor.wallDraft) {
      if (e.key === 'Enter') {
        e.preventDefault();
        return editor.finishDraft(false);
      }
      if (e.key === 'Escape') return editor.cancelDraft();
      if (e.key === 'Backspace') {
        e.preventDefault();
        return editor.popDraftPoint();
      }
    }
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? editor.redo() : editor.undo();
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      editor.redo();
    } else if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      editor.save();
    } else if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      editor.duplicateSelectedElement();
    } else if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
      if (editor.selectedOpeningId) editor.removeSelectedOpening();
      else if (editor.selectedWallId) editor.removeSelectedWall();
      else editor.removeSelectedElement();
    } else if (!mod && e.key === 'Escape') {
      if (editor.tool !== 'hand' && editor.tool !== 'select') editor.setTool('select');
      else editor.clearSelection();
    } else if (!mod && e.key.startsWith('Arrow') && editor.selection) {
      e.preventDefault();
      const d = e.shiftKey ? 50 : 5;
      editor.nudgeSelected(e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0);
    } else if (!mod && !e.altKey) {
      const k = e.key.toLowerCase();
      if ((editor.tool === 'paint' || editor.tool === 'erase') && (e.key === '[' || e.key === ']')) {
        editor.brushCells = Math.min(16, Math.max(0.5, editor.brushCells + (e.key === ']' ? 0.5 : -0.5)));
        return;
      }
      const map: Record<string, typeof editor.tool> = { h: 'hand', v: 'select', g: 'stamp', s: 'scatter', l: 'line', f: 'shape', m: 'line', d: 'opening', b: 'paint', e: 'erase' };
      if (map[k]) editor.setTool(map[k]!);
    }
  }

  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (editor.dirty) e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKey} onbeforeunload={onBeforeUnload} />

{#if gallery}
  <Gallery />
{:else}
<div class="app" class:narrow style:--dock-h="{toolsH + tabsH}px" style:--left-w={leftCollapsed ? "30px" : "220px"} style:--right-w={objectsFolded ? "30px" : "240px"} style:--layers-w={layersFolded ? "44px" : "190px"}>
  <header>
    <a class="home" href="/" title="Til forsiden">←</a>
    <input
      class="name"
      type="text"
      aria-label="Kortets navn"
      value={editor.doc.name}
      onchange={(e) => editor.rename(e.currentTarget.value.trim() || editor.doc.name)}
    />
    <span class="dirty" title={editor.dirty ? 'Ugemte ændringer' : 'Alt er gemt'}>{editor.dirty ? '●' : ''}</span>
    <button onclick={() => (dialog = 'new')}>Nyt</button>
    <button onclick={() => (dialog = 'open')}>Åbn</button>
    <button class="primary" onclick={() => editor.save()}>Gem</button>
    <button onclick={() => (dialog = 'resize')} title="Gør kortet større eller mindre">Størrelse …</button>
    <button onclick={() => (dialog = 'export')}>Eksportér …</button>
    <button onclick={() => (dialog = 'assets')} title="Importér dine egne billeder som genstande">Egne genstande …</button>
    <span class="sep"></span>
    <button onclick={() => editor.undo()} disabled={!editor.canUndo} title="Fortryd (Ctrl+Z)">Fortryd</button>
    <button onclick={() => editor.redo()} disabled={!editor.canRedo} title="Gentag (Ctrl+Y)">Gentag</button>
    <span class="sep"></span>
    <label class="chk"><input type="checkbox" bind:checked={editor.showGrid} /> Grid (kun visning)</label>
    <label class="chk" title="Kvaliteten af forhåndsvisningen. Lav er hurtigst, Høj er pænest. Eksporten er altid i fuld kvalitet.">Kvalitet
      <select value={editor.quality} onchange={(e) => editor.setQuality((e.currentTarget as HTMLSelectElement).value as Quality)}>
        {#each QUALITIES as q}<option value={q}>{QUALITY_LABEL[q]}</option>{/each}
      </select>
    </label>
    <button onclick={() => editor.fitView()}>Hele kortet</button>
    <span class="msg" class:err={editor.error}>{editor.error || editor.status}</span>
  </header>
  <aside class="tools" bind:offsetHeight={toolsH}><ToolBar /></aside>
  <aside class="left" class:folded={leftCollapsed && !narrow} class:open={sheet === 'left'}>
    <button class="fold" disabled={!leftHasContent} title={leftCollapsed ? 'Fold værktøjets indstillinger ud' : 'Fold værktøjets indstillinger ind'} aria-label="Fold værktøjets indstillinger" onclick={() => (leftFolded = !leftFolded)}>
      <Icon name={leftCollapsed ? 'right' : 'left'} size={14} />
    </button>
    {#if !leftCollapsed || narrow}
      <ToolPanel />
      {#if editor.tool === 'select' || editor.tool === 'opening'}<ElementInspector /><WallInspector />{/if}
      {#if editor.tool === 'stamp' || (editor.tool === 'scatter' && !editor.scatterErase)}<ObjectPicker />{/if}
    {/if}
  </aside>
  <main><Viewport /><div class="foot">{editor.doc.widthCells} × {editor.doc.heightCells} felter · {editor.doc.widthCells * CELL_PX} × {editor.doc.heightCells * CELL_PX} px</div></main>
  <aside class="right" class:folded={objectsFolded && !narrow} class:open={sheet === 'right'}><Inspector collapsed={objectsFolded && !narrow} ontoggle={() => (objectsFolded = !objectsFolded)} /></aside>
  <aside class="layers" class:folded={layersFolded && !narrow} class:open={sheet === 'layers'}><LayerPanel collapsed={layersFolded && !narrow} ontoggle={() => (layersFolded = !layersFolded)} /></aside>
  <nav class="tabs" aria-label="Paneler" bind:offsetHeight={tabsH}>
    <button class:on={sheet === 'left'} disabled={!leftHasContent} onclick={() => openSheet('left')}>Værktøj</button>
    <button class:on={sheet === 'right'} onclick={() => openSheet('right')}>Objekter</button>
    <button class:on={sheet === 'layers'} onclick={() => openSheet('layers')}>Lag</button>
  </nav>
</div>

{/if}

{#if dialog === 'new'}<NewMapDialog onclose={() => (dialog = null)} />{/if}
{#if dialog === 'open'}<OpenDialog onclose={() => (dialog = null)} />{/if}
{#if dialog === 'resize'}<ResizeDialog onclose={() => (dialog = null)} />{/if}
{#if dialog === 'export'}<ExportDialog onclose={() => (dialog = null)} />{/if}
{#if dialog === 'assets'}<ImportDialog onclose={() => (dialog = null)} />{/if}

<style>
  .app {
    display: grid; height: 100%;
    grid-template: 'top top top top top' auto 'tools left main right layers' 1fr / 48px var(--left-w, 220px) 1fr var(--right-w, 240px) var(--layers-w, 190px);
  }
  header {
    grid-area: top; display: flex; align-items: center; gap: 8px; padding: 6px 10px;
    background: var(--panel); border-bottom: 1px solid var(--line); flex-wrap: wrap;
  }
  .home { color: var(--muted); text-decoration: none; font-size: 18px; padding: 0 4px; }
  .name { width: 220px; font-weight: 600; }
  .dirty { color: var(--accent); width: 10px; }
  .sep { width: 1px; height: 22px; background: var(--line); margin: 0 4px; }
  .chk { display: flex; gap: 4px; align-items: center; color: var(--muted); }
  .msg { margin-left: auto; color: var(--muted); }
  .msg.err { color: var(--danger); }
  aside { background: var(--panel); padding: 10px; overflow: auto; min-height: 0; }
  .tools { grid-area: tools; padding: 6px 6px; border-right: 1px solid var(--line); }
  .layers { grid-area: layers; border-left: 1px solid var(--line); }
  .layers.folded { padding: 6px 4px; }
  .right.folded { padding: 6px 4px; }
  .fold { padding: 3px 5px; float: right; }
  .left.folded { padding: 6px 4px; }
  .foot { position: absolute; left: 8px; bottom: 4px; font-size: 8px; color: var(--muted); opacity: .6; pointer-events: none; }
  .left { grid-area: left; border-right: 1px solid var(--line); }
  .right { grid-area: right; border-left: 1px solid var(--line); }
  main { grid-area: main; min-width: 0; min-height: 0; position: relative; }
  .tabs { display: none; }
  @media (max-width: 900px) {
    .app {
      grid-template: 'top' auto 'main' 1fr 'tools' auto 'tabs' auto / 1fr;
      font-size: 11px;
    }
    header { flex-wrap: nowrap; overflow-x: auto; gap: 6px; padding: 5px 8px; }
    header > :global(*) { flex: none; }
    .name { width: 130px; }
    .msg { margin-left: 0; }
    .app :global(button), .app :global(select) { min-height: 32px; }
    .app :global(input:not([type='checkbox']):not([type='range'])) { min-height: 30px; }
    .tools { padding: 4px 6px; overflow-x: auto; overflow-y: hidden; border: 0; border-top: 1px solid var(--line); }
    .tools :global(.bar) { flex-direction: row; flex-wrap: nowrap; width: max-content; }
    .tools :global(.bar button) { width: 40px; height: 38px; }
    .tabs { grid-area: tabs; display: flex; gap: 4px; padding: 4px 6px; background: var(--panel); border-top: 1px solid var(--line); }
    .tabs button { flex: 1; }
    .tabs button.on { border-color: var(--accent); color: var(--accent); }
    /* kolonnerne bliver til et panel over værktøjslinjen, ét ad gangen */
    aside.left, aside.right, aside.layers {
      display: none; position: fixed; left: 0; right: 0; bottom: var(--dock-h, 96px); z-index: 20; max-height: 52vh;
      border: 0; border-top: 2px solid var(--accent); box-shadow: 0 -6px 18px rgba(0,0,0,.45);
    }
    aside.open { display: block; }
    .app :global(.fold) { display: none; }
    .foot { display: none; }
  }
</style>
