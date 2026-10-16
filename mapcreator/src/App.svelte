<script lang="ts">
  import { editor } from './model/store.svelte';
  import { QUALITIES, QUALITY_LABEL, type Quality } from './render/quality';
  import LayerPanel from './ui/LayerPanel.svelte';
  import Inspector from './ui/Inspector.svelte';
  import Viewport from './ui/Viewport.svelte';
  import ResizeDialog from './ui/ResizeDialog.svelte';
  import NewMapDialog from './ui/NewMapDialog.svelte';
  import OpenDialog from './ui/OpenDialog.svelte';
  import ToolPanel from './ui/ToolPanel.svelte';
  import ObjectPicker from './ui/ObjectPicker.svelte';
  import ExportDialog from './ui/ExportDialog.svelte';
  import Gallery from './ui/Gallery.svelte';
  import ImportDialog from './ui/ImportDialog.svelte';

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
<div class="app">
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
  <aside class="left"><ToolPanel />{#if editor.tool === 'stamp' || (editor.tool === 'scatter' && !editor.scatterErase)}<ObjectPicker />{/if}<LayerPanel /></aside>
  <main><Viewport /></main>
  <aside class="right"><Inspector /></aside>
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
    grid-template: 'top top top' auto 'left main right' 1fr / 240px 1fr 260px;
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
  .left { grid-area: left; border-right: 1px solid var(--line); }
  .right { grid-area: right; border-left: 1px solid var(--line); }
  main { grid-area: main; min-width: 0; min-height: 0; position: relative; }
  @media (max-width: 900px) {
    .app { grid-template: 'top' auto 'main' 1fr 'left' auto 'right' auto / 1fr; }
    aside { border: 0; border-top: 1px solid var(--line); max-height: 30vh; }
  }
</style>
