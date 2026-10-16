<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { LAYER_TYPE_LABEL, type LayerType } from '../model/types';
  import Icon from './Icon.svelte';

  let { collapsed = false, ontoggle }: { collapsed?: boolean; ontoggle: () => void } = $props();

  const types = Object.keys(LAYER_TYPE_LABEL) as LayerType[];
  let newType = $state<LayerType>('objects');
  // Øverste lag vises øverst i listen.
  const rows = $derived([...editor.doc.layers].reverse());
</script>

<div class="head">
  {#if !collapsed}<h2>Lag</h2>{/if}
  <button class="fold" title={collapsed ? 'Fold lagene ud' : 'Fold lagene sammen (kun ikoner)'} aria-label="Fold lag" onclick={ontoggle}>
    <Icon name={collapsed ? 'left' : 'right'} size={14} />
  </button>
</div>

{#if !collapsed}
  <div class="add">
    <select bind:value={newType} aria-label="Lagtype">
      {#each types as t}<option value={t}>{LAYER_TYPE_LABEL[t]}</option>{/each}
    </select>
    <button onclick={() => editor.addLayer(newType)} title="Nyt lag af den valgte type">+ Lag</button>
  </div>
{/if}

<ul class:collapsed>
  {#each rows as l (l.id)}
    <li class:sel={l.id === editor.selectedLayerId} class:off={!l.visible}>
      <button class="name" title="{l.name} ({LAYER_TYPE_LABEL[l.type]})" onclick={() => (editor.selectedLayerId = l.id)}>
        <Icon name={l.type} size={collapsed ? 20 : 16} />
        {#if !collapsed}<span class="txt"><span>{l.name}</span><small>{LAYER_TYPE_LABEL[l.type]}</small></span>{/if}
      </button>
      {#if !collapsed}
        <button class="tog" title={l.visible ? 'Skjul' : 'Vis'} aria-pressed={l.visible} onclick={() => editor.patchLayer(l.id, { visible: !l.visible })}>
          <Icon name={l.visible ? 'eye' : 'eyeoff'} size={15} />
        </button>
        <button class="tog" title={l.locked ? 'Lås op' : 'Lås'} aria-pressed={l.locked} onclick={() => editor.patchLayer(l.id, { locked: !l.locked })}>
          <Icon name={l.locked ? 'lock' : 'unlock'} size={15} />
        </button>
      {/if}
    </li>
  {/each}
</ul>

{#if collapsed}
  <div class="icons"><Icon name="plus" size={12} />
    {#each types as t}
      <button title="Nyt lag: {LAYER_TYPE_LABEL[t]}" aria-label="Nyt lag: {LAYER_TYPE_LABEL[t]}" onclick={() => editor.addLayer(t)}><Icon name={t} size={16} /></button>
    {/each}
  </div>
{:else}
  <div class="row">
    <button disabled={!editor.selectedLayer} onclick={() => editor.selectedLayerId && editor.moveLayer(editor.selectedLayerId, 1)} title="Flyt lag op" aria-label="Flyt lag op"><Icon name="up" size={14} /></button>
    <button disabled={!editor.selectedLayer} onclick={() => editor.selectedLayerId && editor.moveLayer(editor.selectedLayerId, -1)} title="Flyt lag ned" aria-label="Flyt lag ned"><Icon name="down" size={14} /></button>
    <button
      class="danger"
      disabled={!editor.selectedLayer || editor.doc.layers.length <= 1}
      onclick={() => editor.selectedLayerId && editor.removeLayer(editor.selectedLayerId)}>Slet lag</button>
  </div>
{/if}

<style>
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .head h2 { margin: 0; }
  .fold { padding: 3px 5px; margin-left: auto; }
  .add, .row { display: flex; gap: 6px; margin-bottom: 8px; }
  .add select { flex: 1; }
  .icons { display: flex; flex-direction: column; align-items: stretch; gap: 3px; margin-bottom: 8px; color: var(--muted); border-top: 1px solid var(--line); padding-top: 6px; }
  .icons > :global(svg) { align-self: center; }
  .icons button { padding: 4px; display: grid; place-items: center; }
  ul { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  li { display: flex; gap: 2px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel-2); }
  li.sel { border-color: var(--accent); }
  li.off { opacity: .55; }
  li button { border: 0; background: none; padding: 5px; }
  .tog { width: 24px; flex: none; display: grid; place-items: center; }
  .name { flex: 1; display: flex; align-items: center; gap: 6px; text-align: left; min-width: 0; }
  ul.collapsed .name { justify-content: center; }
  .txt { display: flex; flex-direction: column; min-width: 0; }
  .txt span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .txt small { color: var(--muted); }
</style>
