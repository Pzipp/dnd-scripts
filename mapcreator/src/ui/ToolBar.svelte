<script lang="ts">
  import { editor, type Tool } from '../model/store.svelte';
  import Icon from './Icon.svelte';

  const tools: { id: Tool; label: string; key: string; hint: string }[] = [
    { id: 'hand', label: 'Hånd', key: 'H', hint: 'Flyt kortet' },
    { id: 'select', label: 'Vælg', key: 'V', hint: 'Vælg, flyt, skalér og rotér på det valgte lag' },
    { id: 'stamp', label: 'Genstand', key: 'G', hint: 'Sæt genstande ud' },
    { id: 'scatter', label: 'Spred', key: 'S', hint: 'Mal en skov, spred sten eller planter' },
    { id: 'line', label: 'Linje', key: 'L', hint: 'Tegn mure, stier, broer, kløfter og hegn' },
    { id: 'shape', label: 'Form', key: 'F', hint: 'Tegn firkanter, cirkler og frie former' },
    { id: 'opening', label: 'Dør', key: 'D', hint: 'Sæt døre, porte og vinduer i en mur' },
    { id: 'paint', label: 'Pensel', key: 'B', hint: 'Mal terræn på et grundlag' },
    { id: 'erase', label: 'Viskelæder', key: 'E', hint: 'Fjern terræn (gør laget gennemsigtigt)' },
  ];
</script>

<div class="bar" role="radiogroup" aria-label="Værktøj">
  {#each tools as t}
    <button role="radio" aria-checked={editor.tool === t.id} aria-label={t.label} class:on={editor.tool === t.id} title="{t.label} ({t.key}) – {t.hint}" onclick={() => editor.setTool(t.id)}>
      <Icon name={t.id} size={20} />
    </button>
  {/each}
</div>

<style>
  .bar { display: flex; flex-direction: column; gap: 4px; }
  button { width: 34px; height: 34px; padding: 0; display: grid; place-items: center; }
  button.on { border-color: var(--accent); background: #3a3426; color: var(--accent); }
</style>
