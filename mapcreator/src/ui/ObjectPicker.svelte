<script lang="ts">
  import '../objects';
  import { CATEGORIES, FAMILIES, familyKinds, type Family } from '../objects';
  import { editor } from '../model/store.svelte';
  import Thumb from './Thumb.svelte';

  /** Hvilken familie der er foldet ud (uafhængigt af, hvad der er valgt til udsætning). */
  let openKey = $state<string>(editor.stampFamily);
  let query = $state('');
  let category = $state<string>('all');

  const q = $derived(query.trim().toLowerCase());
  const visible = $derived(
    FAMILIES.filter((f) => {
      if (category !== 'all' && f.category !== category) return false;
      if (!q) return true;
      return f.label.toLowerCase().includes(q) || familyKinds(f.key).some((k) => k.name.toLowerCase().includes(q));
    }),
  );

  /** Klik på en familie åbner den. Natur-familier vælger "Tilfældig" med det samme; de øvrige beholder en variant. */
  function openFamily(f: Family) {
    if (openKey === f.key) {
      openKey = '';
      return;
    }
    openKey = f.key;
    editor.stampFamily = f.key;
    const kinds = familyKinds(f.key);
    editor.stampKind = f.randomDefault && kinds.length > 1 ? 'random' : kinds[0]!.key;
    editor.tool = 'stamp';
  }
  function pick(key: string) {
    editor.stampKind = key;
    editor.tool = 'stamp';
  }
</script>

<h2>Genstande</h2>
<div class="picker">
<input type="search" placeholder="Søg …" bind:value={query} aria-label="Søg i genstande" />
<div class="cats" role="group" aria-label="Kategori">
  <button class:on={category === 'all'} onclick={() => (category = 'all')}>Alle</button>
  {#each CATEGORIES as c}
    <button class:on={category === c.key} onclick={() => (category = c.key)}>{c.label}</button>
  {/each}
</div>

<ul class="fam">
  {#each visible as f (f.key)}
    {@const kinds = familyKinds(f.key)}
    {@const open = openKey === f.key || (!!q && kinds.some((k) => k.name.toLowerCase().includes(q)))}
    <li>
      <button class="head" class:open aria-expanded={open} onclick={() => openFamily(f)}>
        <Thumb kindKey={kinds[0]!.key} size={36} />
        <span>{f.label}</span><small>{kinds.length}</small>
      </button>
      {#if open}
        <div class="vars">
          {#if kinds.length > 1}
            <button class="v" class:on={editor.stampFamily === f.key && editor.stampKind === 'random'} onclick={() => { editor.stampFamily = f.key; pick('random'); }} title="En tilfældig variant ved hver udsætning">
              <span class="dice">🎲</span><span>Tilfældig</span>
            </button>
          {/if}
          {#each kinds as k (k.key)}
            <button class="v" class:on={editor.stampFamily === f.key && editor.stampKind === k.key} onclick={() => { editor.stampFamily = f.key; pick(k.key); }}>
              <Thumb kindKey={k.key} size={52} />
              <span>{k.name}</span>
            </button>
          {/each}
        </div>
      {/if}
    </li>
  {/each}
  {#if visible.length === 0}<li class="none">Ingen genstande matcher.</li>{/if}
</ul>
</div>

<style>
  .picker { max-height: 52vh; overflow-y: auto; padding-right: 2px; margin-bottom: 8px; }
  input[type='search'] { width: 100%; margin-bottom: 6px; background: var(--bg); border: 1px solid var(--line); border-radius: 4px; padding: 4px 8px; }
  .cats { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
  .cats button { padding: 2px 8px; font-size: 12px; }
  .cats button.on, .head.open, .v.on { border-color: var(--accent); background: #3a3426; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .head { width: 100%; display: flex; align-items: center; gap: 8px; text-align: left; padding: 3px 6px; }
  .head span { flex: 1; }
  small { color: var(--muted); }
  .vars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 6px 0 4px; }
  .v { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 2px; font-size: 11px; line-height: 1.15; text-align: center; }
  .dice { font-size: 30px; line-height: 52px; height: 52px; }
  .none { color: var(--muted); padding: 6px; }
</style>
