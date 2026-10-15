<script lang="ts">
  import { CELL_PX, MAX_CELLS } from '../model/types';

  let { widthCells = $bindable(), heightCells = $bindable() }: { widthCells: number; heightCells: number } = $props();

  const PRESETS: { label: string; w: number; h: number }[] = [
    { label: 'Rum', w: 20, h: 20 },
    { label: 'Lille', w: 30, h: 30 },
    { label: 'Mellem', w: 50, h: 40 },
    { label: 'Stort', w: 80, h: 55 },
    { label: 'By', w: 120, h: 90 },
    { label: 'Region', w: 200, h: 150 },
  ];
</script>

<div class="presets">
  {#each PRESETS as p (p.label)}
    <button
      type="button"
      class:on={widthCells === p.w && heightCells === p.h}
      onclick={() => {
        widthCells = p.w;
        heightCells = p.h;
      }}>{p.label}<small>{p.w} × {p.h}</small></button
    >
  {/each}
</div>
<div class="two">
  <label>Bredde (felter) <input type="number" min="1" max={MAX_CELLS} bind:value={widthCells} /></label>
  <label>Højde (felter) <input type="number" min="1" max={MAX_CELLS} bind:value={heightCells} /></label>
</div>
<p class="hint">1 felt = 5 ft = {CELL_PX} px. {widthCells * CELL_PX} × {heightCells * CELL_PX} px ({widthCells * 5} × {heightCells * 5} ft).</p>

<style>
  .presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .presets button { display: flex; flex-direction: column; align-items: center; padding: 4px 10px; }
  .presets small { color: var(--muted); }
  .presets button.on { border-color: var(--accent, #6aa7ff); }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; color: var(--muted); }
  .two { display: flex; gap: 10px; } .two label { flex: 1; }
  .hint { color: var(--muted); margin: 0 0 12px; }
</style>
