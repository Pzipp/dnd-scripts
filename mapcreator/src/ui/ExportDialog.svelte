<script lang="ts">
  import { onMount } from 'svelte';
  import * as api from '../api';
  import { editor } from '../model/store.svelte';
  import {
    downloadBlob, exportProblem, exportSize, fileNameFor, FORMATS, PX_PER_CELL_OPTIONS, renderExport, safeFileName,
  } from '../render/export';
  import type { ExportFormat, ExportPreset } from '../model/types';

  let { onclose }: { onclose: () => void } = $props();
  let selectedId = $state(editor.doc.exports[0]!.id);
  let busy = $state(false);
  let progress = $state(0);
  let message = $state('');
  let failed = $state(false);
  const preset = $derived(editor.doc.exports.find((e) => e.id === selectedId) ?? editor.doc.exports[0]!);
  const size = $derived(exportSize(editor.doc, preset));
  const problem = $derived(exportProblem(editor.doc, preset));
  let tree = $state<api.VttTree | null>(null);
  let treeError = $state('');
  let sentRef = $state('');

  onMount(async () => {
    try {
      tree = await api.getVttTree();
    } catch (e) {
      treeError = (e as Error).message;
    }
  });

  /** Mål i formen: 'download', 'gm' (General Maps) eller 'c:<kampagne>'. */
  const targetValue = $derived(preset.target?.kind === 'vtt' ? (preset.target.campaign === api.GENERAL_MAPS ? 'gm' : `c:${preset.target.campaign}`) : 'download');
  const rooms = $derived.by(() => {
    const t = preset.target;
    if (!tree || t?.kind !== 'vtt') return [];
    if (t.campaign === api.GENERAL_MAPS) return tree.general.rooms.map((r) => r.name);
    return tree.campaigns.find((c) => c.name === t.campaign)?.rooms.map((r) => r.name) ?? [];
  });
  const campaignMissing = $derived(preset.target?.kind === 'vtt' && preset.target.campaign !== api.GENERAL_MAPS && !!tree && !tree.campaigns.some((c) => c.name === (preset.target as { campaign: string }).campaign));

  function setTarget(v: string) {
    if (v === 'download') preset.target = { kind: 'download' };
    else if (v === 'gm') preset.target = { kind: 'vtt', campaign: api.GENERAL_MAPS, room: '' };
    else preset.target = { kind: 'vtt', campaign: v.slice(2), room: '' };
    editor.touchPresets();
  }
  function setRoom(room: string) {
    if (preset.target?.kind === 'vtt') {
      preset.target = { ...preset.target, room };
      editor.touchPresets();
    }
  }

  const formats = Object.keys(FORMATS) as ExportFormat[];

  function toggleLayer(id: string, included: boolean) {
    const hidden = new Set(preset.hiddenLayerIds);
    if (included) hidden.delete(id);
    else hidden.add(id);
    preset.hiddenLayerIds = [...hidden];
    editor.touchPresets();
  }

  /** Tegner en udgave og sender den: hentes som fil eller lægges i VTT'et. */
  async function download(p: ExportPreset) {
    busy = true;
    failed = false;
    progress = 0;
    sentRef = '';
    message = `Tegner "${p.name}" …`;
    try {
      const blob = await renderExport(editor.doc, p, (d) => (progress = d));
      const mb = `${(blob.size / 1e6).toFixed(1)} MB`;
      if (p.target?.kind === 'vtt') {
        message = `Sender ${fileNameFor(p)} (${mb}) til VTT …`;
        sentRef = await api.uploadToVtt(blob, fileNameFor(p), p.target.campaign, p.target.room);
        message = `Lagt i VTT: ${sentRef} (${mb})`;
      } else {
        downloadBlob(blob, fileNameFor(p));
        message = `Hentede ${fileNameFor(p)} (${mb})`;
      }
    } catch (e) {
      failed = true;
      message = (e as Error).message;
    } finally {
      busy = false;
    }
  }

  async function downloadAll() {
    for (const p of editor.doc.exports) {
      if (exportProblem(editor.doc, p)) continue;
      if (p.target?.kind === 'vtt' && p.target.campaign !== api.GENERAL_MAPS && tree && !tree.campaigns.some((c) => c.name === (p.target as { campaign: string }).campaign)) continue;
      await download(p);
      if (failed) break;
    }
  }
</script>

<div class="backdrop" role="presentation" onclick={() => !busy && onclose()}></div>
<div class="dlg" role="dialog" aria-modal="true" aria-label="Eksportér kort">
  <h2>Eksportér udgaver</h2>
  <div class="cols">
    <div class="list">
      <ul>
        {#each editor.doc.exports as p (p.id)}
          <li class:sel={p.id === preset.id}>
            <button onclick={() => (selectedId = p.id)}>{p.name}</button>
          </li>
        {/each}
      </ul>
      <div class="row">
        <button disabled={busy} onclick={() => (selectedId = editor.addPreset().id)}>+ Ny udgave</button>
        <button class="danger" disabled={busy || editor.doc.exports.length <= 1} onclick={() => { editor.removePreset(preset.id); selectedId = editor.doc.exports[0]!.id; }}>Slet</button>
      </div>
    </div>

    <div class="form">
      <label>Navn (bliver filnavnet)
        <input type="text" value={preset.name} oninput={(e) => { preset.name = e.currentTarget.value; editor.touchPresets(); }} />
      </label>
      <p class="hint">Filen hedder <b>{fileNameFor(preset)}</b></p>

      <fieldset>
        <legend>Lag i denne udgave</legend>
        {#each [...editor.doc.layers].reverse() as l (l.id)}
          <label class="chk">
            <input type="checkbox" checked={l.visible && !preset.hiddenLayerIds.includes(l.id)} disabled={!l.visible}
              onchange={(e) => toggleLayer(l.id, e.currentTarget.checked)} />
            {l.name}{#if !l.visible} <small>(skjult i editoren)</small>{/if}
          </label>
        {/each}
      </fieldset>

      <div class="two">
        <label>Format
          <select bind:value={preset.format} onchange={() => editor.touchPresets()}>
            {#each formats as f}<option value={f}>{FORMATS[f].label}</option>{/each}
          </select>
        </label>
        <label>Opløsning
          <select bind:value={preset.pxPerCell} onchange={() => editor.touchPresets()}>
            {#each PX_PER_CELL_OPTIONS as n}<option value={n}>{n} px pr. felt</option>{/each}
          </select>
        </label>
      </div>
      {#if FORMATS[preset.format].lossy}
        <label>Kvalitet: {Math.round(preset.quality * 100)} %
          <input type="range" min="0.5" max="1" step="0.01" bind:value={preset.quality} onchange={() => editor.touchPresets()} />
        </label>
      {/if}
      <label>Send til
        <select value={targetValue} onchange={(e) => setTarget(e.currentTarget.value)} disabled={!tree && !treeError}>
          <option value="download">Hent som fil</option>
          {#if tree}
            <option value="gm">VTT: General Maps</option>
            {#each tree.campaigns as c}<option value={`c:${c.name}`}>VTT: kampagne {c.name}</option>{/each}
          {/if}
        </select>
      </label>
      {#if preset.target?.kind === 'vtt'}
        <label>Room
          <select value={preset.target.room} onchange={(e) => setRoom(e.currentTarget.value)}>
            <option value="">(ingen room, løst i {preset.target.campaign})</option>
            {#each rooms as r}<option value={r}>{r}</option>{/each}
          </select>
        </label>
        {#if campaignMissing}<p class="err">Kampagnen findes ikke længere i VTT'et. Vælg en anden.</p>{/if}
        <p class="hint">Findes filnavnet allerede, får den nye «(2)» efter navnet; den gamle overskrives ikke.</p>
      {/if}
      {#if treeError}<p class="err">Kunne ikke hente kampagner fra VTT'et: {treeError}</p>{/if}
      <p class="hint">{size.w} × {size.h} px · ingen grid i billedet</p>
      {#if problem}<p class="err">{problem}</p>{/if}
    </div>
  </div>

  {#if busy}<progress max="1" value={progress}></progress>{/if}
  {#if message}<p class:err={failed} class="hint">{message}{#if sentRef} · <a href="/simpelvtt" target="_blank" rel="noopener">Åbn VTT</a>{/if}</p>{/if}

  <div class="btns">
    <button onclick={onclose} disabled={busy}>Luk</button>
    <button disabled={busy || editor.doc.exports.length < 2} onclick={downloadAll}>Kør alle udgaver</button>
    <button class="primary" disabled={busy || !!problem || !safeFileName(preset.name) || campaignMissing} onclick={() => download(preset)}>
      {preset.target?.kind === 'vtt' ? 'Send til VTT' : 'Hent denne'}
    </button>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); }
  .dlg {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(760px, 94vw); max-height: 90vh; overflow: auto;
    background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px;
  }
  .cols { display: grid; grid-template-columns: 210px 1fr; gap: 16px; }
  @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }
  ul { list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  li button { width: 100%; text-align: left; }
  li.sel button { border-color: var(--accent); }
  .row, .btns { display: flex; gap: 6px; }
  .btns { justify-content: flex-end; margin-top: 14px; }
  label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; color: var(--muted); }
  label.chk { flex-direction: row; align-items: center; gap: 6px; margin-bottom: 4px; color: var(--fg); }
  fieldset { border: 1px solid var(--line); border-radius: 4px; margin: 0 0 10px; padding: 8px 10px; }
  legend { color: var(--muted); padding: 0 4px; }
  .two { display: flex; gap: 10px; } .two label { flex: 1; }
  .hint { color: var(--muted); margin: 0 0 8px; }
  .err { color: var(--danger); margin: 0 0 8px; }
  progress { width: 100%; margin-top: 10px; }
</style>
