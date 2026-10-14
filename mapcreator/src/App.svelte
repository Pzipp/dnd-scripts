<script lang="ts">
  import { editor } from './model/store.svelte';
  import LayerPanel from './ui/LayerPanel.svelte';
  import Inspector from './ui/Inspector.svelte';
  import Viewport from './ui/Viewport.svelte';
  import NewMapDialog from './ui/NewMapDialog.svelte';
  import OpenDialog from './ui/OpenDialog.svelte';
  import ToolPanel from './ui/ToolPanel.svelte';
  import ExportDialog from './ui/ExportDialog.svelte';

  let dialog = $state<'new' | 'open' | 'export' | null>(null);

  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? editor.redo() : editor.undo();
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      editor.redo();
    } else if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      editor.save();
    }
  }

  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (editor.dirty) e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKey} onbeforeunload={onBeforeUnload} />

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
    <button onclick={() => (dialog = 'export')}>Eksportér …</button>
    <span class="sep"></span>
    <button onclick={() => editor.undo()} disabled={!editor.canUndo} title="Fortryd (Ctrl+Z)">Fortryd</button>
    <button onclick={() => editor.redo()} disabled={!editor.canRedo} title="Gentag (Ctrl+Y)">Gentag</button>
    <span class="sep"></span>
    <label class="chk"><input type="checkbox" bind:checked={editor.showGrid} /> Grid (kun visning)</label>
    <button onclick={() => editor.fitView()}>Hele kortet</button>
    <span class="msg" class:err={editor.error}>{editor.error || editor.status}</span>
  </header>
  <aside class="left"><ToolPanel /><LayerPanel /></aside>
  <main><Viewport /></main>
  <aside class="right"><Inspector /></aside>
</div>

{#if dialog === 'new'}<NewMapDialog onclose={() => (dialog = null)} />{/if}
{#if dialog === 'open'}<OpenDialog onclose={() => (dialog = null)} />{/if}
{#if dialog === 'export'}<ExportDialog onclose={() => (dialog = null)} />{/if}

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
