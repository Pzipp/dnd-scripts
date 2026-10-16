<script lang="ts">
  import { onMount } from 'svelte';
  import * as api from '../api';
  import { editor } from '../model/store.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let maps = $state<api.MapInfo[]>([]);
  let loading = $state(true);
  let error = $state('');

  async function refresh() {
    try {
      maps = await api.listMaps();
      error = '';
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }
  onMount(refresh);

  async function open(id: string) {
    if (editor.dirty && !confirm('Du har ugemte ændringer. Åbn alligevel?')) return;
    await editor.open(id);
    onclose();
  }
  async function remove(m: api.MapInfo) {
    if (!confirm(`Slet "${m.name}" for altid?`)) return;
    try {
      await api.deleteMap(m.id);
      await refresh();
    } catch (e) {
      error = (e as Error).message;
    }
  }
</script>

<div class="backdrop" role="presentation" onclick={onclose}></div>
<div class="dlg" role="dialog" aria-modal="true" aria-label="Åbn kort">
  <h2>Åbn kort</h2>
  {#if loading}<p class="hint">Henter …</p>{/if}
  {#if error}<p class="err">{error}</p>{/if}
  {#if !loading && !error && maps.length === 0}<p class="hint">Ingen gemte kort endnu.</p>{/if}
  <ul>
    {#each maps as m (m.id)}
      <li>
        <button class="open" onclick={() => open(m.id)}>
          <span>{m.name}</span><small>{m.widthCells} × {m.heightCells} felter · {new Date(m.modified).toLocaleString('da-DK')}</small>
        </button>
        <button class="danger" onclick={() => remove(m)} title="Slet">Slet</button>
      </li>
    {/each}
  </ul>
  <div class="btns"><button onclick={onclose}>Luk</button></div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); }
  .dlg {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(520px, 92vw); max-height: 80vh;
    display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px;
  }
  ul { list-style: none; margin: 0 0 12px; padding: 0; overflow: auto; display: flex; flex-direction: column; gap: 4px; }
  li { display: flex; gap: 6px; }
  .open { flex: 1; text-align: left; display: flex; flex-direction: column; }
  small, .hint { color: var(--muted); }
  .err { color: var(--danger); }
  .btns { display: flex; justify-content: flex-end; }
</style>
