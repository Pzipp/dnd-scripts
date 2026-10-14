<script lang="ts">
  import { defaultParams, familyKinds, getFamily, getKind } from '../objects';
  import { editor } from '../model/store.svelte';
  import { CELL_PX, type ParamValue } from '../model/types';

  const sel = $derived(editor.selection);
  const kind = $derived(sel ? getKind(sel.el.kind) : undefined);
  const variants = $derived(kind ? familyKinds(kind.family) : []);

  const cells = (px: number) => Math.round((px / CELL_PX) * 100) / 100;
  const deg = (rad: number) => Math.round((((rad * 180) / Math.PI) % 360 + 360) % 360);

  function setParam(key: string, value: ParamValue) {
    if (sel) editor.patchElement({ params: { ...sel.el.params, [key]: value } });
  }
  function setW(v: number) {
    if (!sel || !(v > 0)) return;
    const w = v * CELL_PX;
    editor.patchElement(kind?.keepAspect ? { w, h: (sel.el.h * w) / sel.el.w } : { w });
  }
  function setH(v: number) {
    if (!sel || !(v > 0)) return;
    const h = v * CELL_PX;
    editor.patchElement(kind?.keepAspect ? { h, w: (sel.el.w * h) / sel.el.h } : { h });
  }
  function setVariant(key: string) {
    const k = getKind(key);
    if (sel && k) editor.patchElement({ kind: key, params: defaultParams(k) });
  }
</script>

{#if sel && kind}
  <h2>Valgt genstand</h2>
  <p class="name">{getFamily(kind.family)?.label}: <b>{kind.name}</b></p>

  {#if variants.length > 1}
    <label>Variant
      <select value={kind.key} onchange={(e) => setVariant(e.currentTarget.value)}>
        {#each variants as v}<option value={v.key}>{v.name}</option>{/each}
      </select>
    </label>
  {/if}

  {#each kind.params as p (p.key)}
    {@const v = sel.el.params[p.key] ?? p.default}
    {#if p.type === 'select'}
      <label>{p.label}
        <select value={String(v)} onchange={(e) => setParam(p.key, e.currentTarget.value)}>
          {#each p.options as o}<option value={o.value}>{o.label}</option>{/each}
        </select>
      </label>
    {:else if p.type === 'toggle'}
      <label class="chk"><input type="checkbox" checked={!!v} onchange={(e) => setParam(p.key, e.currentTarget.checked)} /> {p.label}</label>
    {:else}
      <label>{p.label}: {v}
        <input type="range" min={p.min} max={p.max} step={p.step} value={Number(v)} oninput={(e) => setParam(p.key, +e.currentTarget.value)} />
      </label>
    {/if}
  {/each}

  <div class="two">
    <label>Bredde (felter)
      <input type="number" min="0.1" step="0.25" value={cells(sel.el.w)} onchange={(e) => setW(+e.currentTarget.value)} />
    </label>
    <label>Højde (felter)
      <input type="number" min="0.1" step="0.25" value={cells(sel.el.h)} onchange={(e) => setH(+e.currentTarget.value)} />
    </label>
  </div>
  <div class="two">
    <label>Rotation (°)
      <input type="number" step="15" value={deg(sel.el.rot)} onchange={(e) => editor.patchElement({ rot: (+e.currentTarget.value * Math.PI) / 180 })} />
    </label>
    <label>Højde (z)
      <input type="number" step="1" min="0" value={sel.el.z} onchange={(e) => editor.patchElement({ z: Math.max(0, +e.currentTarget.value || 0) })} />
    </label>
  </div>
  <div class="row">
    <button onclick={() => editor.duplicateSelectedElement()}>Duplikér</button>
    <button class="danger" onclick={() => editor.removeSelectedElement()}>Slet</button>
  </div>
  <p class="hint">Skift: hold Shift for at låse/frigive proportioner eller runde rotation af til 15°. Pile flytter, Delete sletter.</p>
{/if}

<style>
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; color: var(--muted); }
  label.chk { flex-direction: row; align-items: center; gap: 6px; }
  .two { display: flex; gap: 8px; } .two label { flex: 1; }
  .row { display: flex; gap: 6px; margin-bottom: 10px; }
  .name { margin: 0 0 10px; color: var(--muted); }
  .hint { color: var(--muted); font-size: 12px; margin: 0; }
</style>
