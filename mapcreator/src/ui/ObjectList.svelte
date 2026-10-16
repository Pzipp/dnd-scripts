<script lang="ts">
  import { editor } from '../model/store.svelte';
  import { resolveKind } from '../objects';
  import { LAYER_TYPE_LABEL, hasGround } from '../model/types';
  import { wallStyle } from '../render/walls';
  import { materialById } from '../render/materials';

  interface Row {
    key: string;
    layerId: string;
    layerName: string;
    kind: 'element' | 'wall' | 'terrain';
    id: string;
    label: string;
  }

  let query = $state('');

  // Øverste lag og øverste genstand først.
  const rows = $derived.by(() => {
    const out: Row[] = [];
    for (const layer of [...editor.doc.layers].reverse()) {
      if (hasGround(layer.type)) {
        out.push({ key: `t:${layer.id}`, layerId: layer.id, layerName: layer.name, kind: 'terrain', id: layer.id, label: `${LAYER_TYPE_LABEL[layer.type]}: ${layer.name}` });
      }
      const els = layer.elements ?? [];
      for (let i = els.length - 1; i >= 0; i--) {
        const el = els[i]!;
        out.push({ key: `e:${el.id}`, layerId: layer.id, layerName: layer.name, kind: 'element', id: el.id, label: resolveKind(el.kind)?.name ?? el.kind });
      }
      const ws = layer.walls ?? [];
      for (let i = ws.length - 1; i >= 0; i--) {
        const w = ws[i]!;
        const shape = w.shape && w.shape !== 'line' ? 'Form' : 'Linje';
        const what = w.fill ? `${materialById(w.fill.material)?.name ?? 'Udfyldning'}${w.stroke === false ? '' : ` · ${wallStyle(w.style).label}`}` : wallStyle(w.style).label;
        out.push({ key: `w:${w.id}`, layerId: layer.id, layerName: layer.name, kind: 'wall', id: w.id, label: `${shape}: ${what}` });
      }
    }
    const q = query.trim().toLowerCase();
    return q ? out.filter((r) => `${r.label} ${r.layerName}`.toLowerCase().includes(q)) : out;
  });

  const isSelected = (r: Row): boolean =>
    r.kind === 'element' ? editor.selectedElementId === r.id : r.kind === 'wall' ? editor.selectedWallId === r.id : !editor.selectedElementId && !editor.selectedWallId && editor.selectedLayerId === r.id;

  function pick(r: Row) {
    if (r.kind === 'terrain') {
      editor.selectedLayerId = r.layerId;
      editor.clearSelection();
      return;
    }
    editor.setTool('select');
    if (r.kind === 'element') editor.selectElement(r.layerId, r.id);
    else editor.selectWall(r.layerId, r.id);
  }

  function remove(r: Row) {
    if (r.kind === 'element') editor.removeObject(r.layerId, 'element', r.id);
    else if (r.kind === 'wall') editor.removeObject(r.layerId, 'wall', r.id);
  }

  const count = $derived(rows.filter((r) => r.kind !== 'terrain').length);
</script>

<h2>Objekter <small>({count})</small></h2>
<input class="q" type="search" placeholder="Søg …" bind:value={query} aria-label="Søg i objekter" />
<ul>
  {#each rows as r (r.key)}
    <li class:sel={isSelected(r)} class:terrain={r.kind === 'terrain'}>
      <button class="name" onclick={() => pick(r)} title={r.layerName}>
        <span>{r.label}</span>
        {#if r.kind !== 'terrain'}<small>{r.layerName}</small>{/if}
      </button>
      {#if r.kind !== 'terrain'}
        <button class="del" title="Slet" aria-label="Slet {r.label}" onclick={() => remove(r)}>×</button>
      {/if}
    </li>
  {:else}
    <li class="empty">Ingen objekter endnu.</li>
  {/each}
</ul>

<style>
  h2 small { color: var(--muted); font-weight: normal; }
  .q { width: 100%; margin-bottom: 6px; box-sizing: border-box; }
  ul { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 2px; max-height: 38vh; overflow-y: auto; }
  li { display: flex; border: 1px solid var(--line); border-radius: 4px; background: var(--panel-2); }
  li.sel { border-color: var(--accent); }
  li.terrain { opacity: 0.75; }
  li.empty { padding: 8px; color: var(--muted); border-style: dashed; }
  button { border: 0; background: none; padding: 5px 7px; }
  .name { flex: 1; min-width: 0; display: flex; justify-content: space-between; gap: 6px; text-align: left; }
  .name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .name small { color: var(--muted); flex: none; max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .del { width: 28px; flex: none; color: var(--muted); font-size: 16px; }
  .del:hover { color: #e05a4a; }
</style>
