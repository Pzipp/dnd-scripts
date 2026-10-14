<script lang="ts">
  import { onMount } from 'svelte';
  import { editor } from '../model/store.svelte';
  import { zoomAt } from '../render/camera';
  import { groundCache } from '../render/groundCache';
  import { drawScene } from '../render/scene';
  import { screenToWorld } from '../render/camera';
  import { type Stroke } from '../model/ground';

  let canvas: HTMLCanvasElement;
  let box: HTMLDivElement;
  let w = $state(0);
  let h = $state(0);
  let dpr = 1;
  let queued = false;
  let firstFit = true;
  /** Musens position i verdenskoordinater (til penselringen). */
  let hover: { x: number; y: number } | null = null;

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const ctx = canvas.getContext('2d');
      if (!ctx || w === 0) return;
      groundCache.sync(editor.doc);
      const more = groundCache.step(editor.doc, 10);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Kameraet ganges med dpr, så tegningen er skarp på høj-opløsningsskærme.
      const cam = { zoom: editor.camera.zoom * dpr, panX: editor.camera.panX * dpr, panY: editor.camera.panY * dpr };
      const paint = editor.tool !== 'hand' && hover && !panning;
      drawScene(ctx, w * dpr, h * dpr, cam, editor.doc, {
        grid: editor.showGrid,
        brush: paint ? { x: hover!.x, y: hover!.y, r: (editor.brushCells * 50) / 2, ok: !!editor.paintableLayer } : null,
      });
      if (more) schedule();
    });
  }

  // Tegn igen, når dokument, kamera eller grid ændres.
  $effect(() => {
    void editor.camera.zoom, editor.camera.panX, editor.camera.panY;
    void editor.showGrid, editor.doc.widthCells, editor.doc.heightCells, editor.drawRev, editor.tool, editor.brushCells;
    void editor.doc.layers.map((l) => [l.id, l.visible, l.opacity, l.height]);
    schedule();
  });

  onMount(() => {
    const ro = new ResizeObserver(() => {
      const r = box.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      editor.viewSize = { w, h };
      if (firstFit) {
        firstFit = false;
        editor.fitView();
      }
      schedule();
    });
    ro.observe(box);
    return () => ro.disconnect();
  });

  // ---- pan og zoom: træk (midterknap, højre knap, mellemrum+træk eller ét ekstra værktøj senere), hjul, knib ----
  const pointers = new Map<number, { x: number; y: number }>();
  let panning = false;
  let space = false;
  let lastPinch = 0;

  function local(e: PointerEvent | WheelEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const p = local(e);
    const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    zoomAt(editor.camera, p.x, p.y, f);
  }

  let stroke: Stroke | null = null;
  let strokeLayer = '';
  let last: [number, number] | null = null;

  function stamp(p: { x: number; y: number }) {
    const layer = editor.paintableLayer;
    if (!stroke || !layer?.ground) return;
    const [wx, wy] = screenToWorld(editor.camera, p.x, p.y);
    const mat = editor.tool === 'erase' ? 0 : editor.material;
    const r = (editor.brushCells * 50) / 2;
    const [ax, ay] = last ?? [wx, wy];
    const dirty = stroke.line(layer.ground, ax, ay, wx, wy, r, mat);
    last = [wx, wy];
    if (dirty) editor.invalidate(strokeLayer, dirty);
  }

  function cancelStroke() {
    const layer = editor.doc.layers.find((l) => l.id === strokeLayer);
    if (stroke && layer?.ground) {
      const rect = stroke.undoAll(layer.ground);
      if (rect) editor.invalidate(strokeLayer, rect);
    }
    stroke = null;
    last = null;
  }

  function onDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    lastPinch = 0;
    if (pointers.size > 1) {
      cancelStroke();
      panning = false;
      return;
    }
    const wantsPaint = editor.tool !== 'hand' && e.button === 0 && !space;
    if (wantsPaint) {
      const layer = editor.paintableLayer;
      if (layer) {
        stroke = editor.newStroke();
        strokeLayer = layer.id;
        last = null;
        panning = false;
        stamp(p);
      } else {
        editor.error = 'Vælg et synligt, ulåst grundlag for at male.';
      }
      return;
    }
    panning = true;
  }

  function onMove(e: PointerEvent) {
    const p = local(e);
    hover = { x: screenToWorld(editor.camera, p.x, p.y)[0], y: screenToWorld(editor.camera, p.x, p.y)[1] };
    const prev = pointers.get(e.pointerId);
    if (!prev) {
      if (editor.tool !== 'hand') schedule();
      return;
    }
    pointers.set(e.pointerId, p);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch > 0) zoomAt(editor.camera, (a.x + b.x) / 2, (a.y + b.y) / 2, dist / lastPinch);
      lastPinch = dist;
    } else if (pointers.size === 1 && stroke) {
      stamp(p);
      schedule();
    } else if (pointers.size === 1 && panning) {
      editor.camera.panX += p.x - prev.x;
      editor.camera.panY += p.y - prev.y;
    }
  }

  function onUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    lastPinch = 0;
    if (stroke && pointers.size === 0) {
      editor.commitStroke(strokeLayer, stroke);
      stroke = null;
      last = null;
    }
    panning = false;
  }

  function onLeave() {
    hover = null;
    schedule();
  }

  function key(e: KeyboardEvent, down: boolean) {
    if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') space = down;
  }
</script>

<svelte:window onkeydown={(e) => key(e, true)} onkeyup={(e) => key(e, false)} />

<div class="box" bind:this={box}>
  <canvas
    bind:this={canvas}
    class:paint={editor.tool !== 'hand'}
    style="width:{w}px;height:{h}px"
    aria-label="Kort. Træk for at flytte, hjul eller knib for at zoome."
    onwheel={onWheel}
    onpointerdown={onDown}
    onpointermove={onMove}
    onpointerup={onUp}
    onpointercancel={onUp}
    onpointerleave={onLeave}
    oncontextmenu={(e) => e.preventDefault()}
  ></canvas>
  <div class="zoom">{Math.round(editor.camera.zoom * 100)} %</div>
</div>

<style>
  .box { position: absolute; inset: 0; overflow: hidden; }
  canvas { display: block; touch-action: none; cursor: grab; }
  canvas.paint { cursor: crosshair; }
  .zoom {
    position: absolute; right: 10px; bottom: 8px; background: rgba(0,0,0,.5); color: var(--muted);
    padding: 2px 8px; border-radius: 4px; font-size: 12px; pointer-events: none;
  }
</style>
