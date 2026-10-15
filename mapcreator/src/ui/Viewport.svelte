<script lang="ts">
  import { onMount } from 'svelte';
  import { editor } from '../model/store.svelte';
  import { zoomAt } from '../render/camera';
  import { groundCache } from '../render/groundCache';
  import { drawScene } from '../render/scene';
  import { screenToWorld, worldToScreen } from '../render/camera';
  import { HANDLES, handlePos, resizeBy, rotationTo, type HandleId } from '../model/geometry';
  import { pickAt } from '../model/pick';
  import { constrainAngle, midpoints, nearestOnPath, pathLength, pathOf, type Pt } from '../model/walls';
  import { getKind } from '../objects';
  import { ROT_HANDLE_PX } from '../render/scene';
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
      if (!more) editor.bakeWhenIdle();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Kameraet ganges med dpr, så tegningen er skarp på høj-opløsningsskærme.
      const cam = { zoom: editor.camera.zoom * dpr, panX: editor.camera.panX * dpr, panY: editor.camera.panY * dpr };
      const paint = (editor.tool === 'paint' || editor.tool === 'erase') && hover && !panning;
      const ghostEl = editor.tool === 'stamp' && hover && editor.placeableLayer ? editor.buildElement(hover.x, hover.y) : null;
      const scatter = editor.tool === 'scatter' && hover && !panning;
      const elLayer = editor.placeableLayer;
      const ghosts = ghostEl && elLayer ? [{ el: ghostEl, layer: elLayer }] : [];
      if (elLayer && editor.tool === 'scatter') for (const el of editor.scatterPlaced) ghosts.push({ el, layer: elLayer });
      const draftPts = editor.wallDraft;
      const wallTool = editor.tool === 'select' || editor.tool === 'opening';
      let openingGhost = null;
      if (editor.tool === 'opening' && hover) {
        const near = editor.nearestWall(hover.x, hover.y, 24 / editor.camera.zoom);
        if (near) openingGhost = { wall: near.wall, layer: near.layer, opening: editor.buildOpening(near.wall, near.s) };
      }
      drawScene(ctx, w * dpr, h * dpr, cam, editor.doc, {
        grid: editor.showGrid,
        brush: paint ? { x: hover!.x, y: hover!.y, r: (editor.brushCells * 50) / 2, ok: !!editor.paintableLayer }
          : scatter ? { x: hover!.x, y: hover!.y, r: (editor.scatterCells * 50) / 2, ok: !!editor.placeableLayer } : null,
        selected: editor.tool === 'select' ? editor.selection?.el ?? null : null,
        ghosts,
        ghostAlpha: editor.tool === 'scatter' ? 0.95 : 0.6,
        markers: editor.tool === 'scatter' ? editor.scatterRemoving : [],
        draft: draftPts && editor.tool === 'wall' ? { points: draftPts, cursor: hover ? draftCursor() : null, style: editor.wallStyle, thickness: editor.wallThicknessCells * 50 } : null,
        wallSel: wallTool && editor.selectionWall ? editor.selectionWall : null,
        openingGhost,
      });
      if (more) schedule();
    });
  }

  /** Mur-tegning: pil til musen (med vinkellås, hvis Shift holdes). */
  let shiftDown = false;
  function snapV(v: number): number {
    return editor.snap ? Math.round(v / 25) * 25 : v;
  }
  function draftCursor(): Pt | null {
    if (!hover) return null;
    const d = editor.wallDraft;
    let pt: Pt = [snapV(hover.x), snapV(hover.y)];
    if (shiftDown && d?.length) pt = constrainAngle(d.at(-1)!, pt);
    return pt;
  }

  // Tegn igen, når dokument, kamera eller grid ændres.
  $effect(() => {
    void editor.camera.zoom, editor.camera.panX, editor.camera.panY;
    void editor.showGrid, editor.doc.widthCells, editor.doc.heightCells, editor.drawRev, editor.tool, editor.brushCells, editor.selectedElementId, editor.stampKind, editor.stampFamily, editor.snap, editor.pending.seed, editor.wallDraft, editor.selectedWallId, editor.selectedOpeningId, editor.scatterPlaced.length, editor.scatterRemoving.length, editor.scatterCells, editor.wallStyle, editor.wallThicknessCells, editor.openingKind;
    void editor.doc.layers.map((l) => [l.id, l.visible, l.opacity, l.height, l.elements?.map((e) => [e.id, e.x, e.y, e.w, e.h, e.rot, e.z, JSON.stringify(e.params)])]);
    void editor.doc.layers.map((l) => l.walls?.map((wl) => [wl.id, wl.style, wl.thickness, wl.closed, JSON.stringify(wl.points), wl.openings.map((o) => [o.id, o.kind, o.at, o.width, o.open, o.flip])]));
    void editor.doc.lightAngle;
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

  // ---- vælg, flyt, skalér, rotér ----
  type Drag =
    | { kind: 'move'; layerId: string; id: string; before: { x: number; y: number }; grab: [number, number] }
    | { kind: 'resize'; layerId: string; id: string; handle: Exclude<HandleId, 'rot'>; start: { x: number; y: number; w: number; h: number; rot: number }; before: { x: number; y: number; w: number; h: number } }
    | { kind: 'rotate'; layerId: string; id: string; before: { rot: number } }
    | { kind: 'wallPoint'; layerId: string; wallId: string; index: number; before: Pt[] }
    | { kind: 'wallMove'; layerId: string; wallId: string; before: Pt[]; grab: [number, number] }
    | { kind: 'openingMove'; layerId: string; wallId: string; id: string; beforeAt: number };
  let drag: Drag | null = null;
  let scattering = false;
  let scatterLast: [number, number] | null = null;
  let lastVertexClick: { wallId: string; index: number; time: number } | null = null;
  const copyPts = (pts: Pt[]): Pt[] => pts.map((p) => [p[0], p[1]] as Pt);

  function handleAt(p: { x: number; y: number }): HandleId | null {
    const sel = editor.selection;
    if (!sel) return null;
    const rotOffset = ROT_HANDLE_PX / editor.camera.zoom;
    for (const h of [...HANDLES, 'rot' as const]) {
      const [wx, wy] = handlePos(sel.el, h, rotOffset);
      const [sx, sy] = worldToScreen(editor.camera, wx, wy);
      if (Math.hypot(sx - p.x, sy - p.y) <= 10) return h;
    }
    return null;
  }

  function startSelect(p: { x: number; y: number }) {
    const [wx, wy] = screenToWorld(editor.camera, p.x, p.y);
    const sel = editor.selection;
    const h = handleAt(p);
    if (sel && h) {
      if (h === 'rot') drag = { kind: 'rotate', layerId: sel.layer.id, id: sel.el.id, before: { rot: sel.el.rot } };
      else drag = { kind: 'resize', layerId: sel.layer.id, id: sel.el.id, handle: h, start: { x: sel.el.x, y: sel.el.y, w: sel.el.w, h: sel.el.h, rot: sel.el.rot }, before: { x: sel.el.x, y: sel.el.y, w: sel.el.w, h: sel.el.h } };
      return;
    }
    const ws = editor.selectionWall;
    if (ws) {
      const pts = ws.wall.points;
      for (let i = 0; i < pts.length; i++) {
        const [sx, sy] = worldToScreen(editor.camera, pts[i]![0], pts[i]![1]);
        if (Math.hypot(sx - p.x, sy - p.y) <= 10) {
          const now = performance.now();
          if (lastVertexClick && lastVertexClick.wallId === ws.wall.id && lastVertexClick.index === i && now - lastVertexClick.time < 400) {
            lastVertexClick = null;
            editor.removeWallPoint(i); // dobbeltklik på et punkt fjerner det
            return;
          }
          lastVertexClick = { wallId: ws.wall.id, index: i, time: now };
          drag = { kind: 'wallPoint', layerId: ws.layer.id, wallId: ws.wall.id, index: i, before: copyPts(pts as Pt[]) };
          return;
        }
      }
      for (const m of midpoints(ws.wall)) {
        const [sx, sy] = worldToScreen(editor.camera, m.at[0], m.at[1]);
        if (Math.hypot(sx - p.x, sy - p.y) <= 9) {
          const before = copyPts(pts as Pt[]);
          ws.wall.points.splice(m.index, 0, [m.at[0], m.at[1]]); // nyt punkt midt på stykket; trækkes videre
          drag = { kind: 'wallPoint', layerId: ws.layer.id, wallId: ws.wall.id, index: m.index, before };
          return;
        }
      }
    }
    const hit = pickAt(editor.doc, wx, wy, 4 / editor.camera.zoom);
    if (hit?.type === 'element') {
      editor.selectElement(hit.layer.id, hit.el.id);
      drag = { kind: 'move', layerId: hit.layer.id, id: hit.el.id, before: { x: hit.el.x, y: hit.el.y }, grab: [wx - hit.el.x, wy - hit.el.y] };
      return;
    }
    if (hit?.type === 'wall') {
      editor.selectWall(hit.layer.id, hit.wall.id);
      drag = { kind: 'wallMove', layerId: hit.layer.id, wallId: hit.wall.id, before: copyPts(hit.wall.points as Pt[]), grab: [wx, wy] };
      return;
    }
    if (hit?.type === 'opening') {
      editor.selectWall(hit.layer.id, hit.wall.id, hit.opening.id);
      drag = { kind: 'openingMove', layerId: hit.layer.id, wallId: hit.wall.id, id: hit.opening.id, beforeAt: hit.opening.at };
      return;
    }
    editor.clearSelection();
    panning = true;
  }

  function moveDrag(p: { x: number; y: number }, e: PointerEvent) {
    if (!drag) return;
    const [wx, wy] = screenToWorld(editor.camera, p.x, p.y);
    if (drag.kind === 'wallPoint' || drag.kind === 'wallMove' || drag.kind === 'openingMove') {
      const ws = editor.selectionWall;
      if (!ws) return;
      if (drag.kind === 'wallPoint') {
        ws.wall.points[drag.index] = [snapV(wx), snapV(wy)];
      } else if (drag.kind === 'wallMove') {
        const dx = snapV(wx - drag.grab[0]);
        const dy = snapV(wy - drag.grab[1]);
        ws.wall.points = drag.before.map((q) => [q[0] + dx, q[1] + dy] as Pt);
      } else if (ws.opening) {
        const n = nearestOnPath(pathOf(ws.wall), wx, wy);
        if (n) {
          const len = pathLength(pathOf(ws.wall));
          const half = ws.opening.width / 2;
          ws.opening.at = Math.min(len - half, Math.max(half, editor.snap ? Math.round(n.s / 25) * 25 : n.s));
        }
      }
      schedule();
      return;
    }
    const sel = editor.selection;
    if (!sel) return;
    const el = sel.el;
    if (drag.kind === 'move') {
      const nx = wx - drag.grab[0];
      const ny = wy - drag.grab[1];
      const step = editor.snap ? 25 : 0;
      el.x = step ? Math.round(nx / step) * step : nx;
      el.y = step ? Math.round(ny / step) * step : ny;
    } else if (drag.kind === 'resize') {
      const kind = getKind(el.kind);
      const r = resizeBy(drag.start, drag.handle, wx, wy, (kind?.keepAspect ?? false) !== e.shiftKey);
      el.x = r.x; el.y = r.y; el.w = r.w; el.h = r.h;
    } else if (drag.kind === 'rotate') {
      el.rot = rotationTo(el, wx, wy, e.shiftKey ? Math.PI / 12 : 0);
    }
    schedule();
  }

  function onDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    lastPinch = 0;
    if (pointers.size > 1) {
      cancelStroke();
      if (scattering) editor.cancelScatter();
      scattering = false;
      drag = null;
      panning = false;
      return;
    }
    const primary = e.button === 0 && !space;
    if (primary && editor.tool === 'stamp') {
      const [wx, wy] = screenToWorld(editor.camera, p.x, p.y);
      editor.placeElement(wx, wy);
      return;
    }
    if (primary && editor.tool === 'select') {
      startSelect(p);
      return;
    }
    if (primary && editor.tool === 'wall') {
      const [wx, wy] = screenToWorld(editor.camera, p.x, p.y);
      const d = editor.wallDraft;
      if (d?.length) {
        const [fx, fy] = worldToScreen(editor.camera, d[0]![0], d[0]![1]);
        const [lx, ly] = worldToScreen(editor.camera, d.at(-1)![0], d.at(-1)![1]);
        if (d.length >= 3 && Math.hypot(fx - p.x, fy - p.y) < 10) return editor.finishDraft(true); // klik på første punkt lukker muren
        if (Math.hypot(lx - p.x, ly - p.y) < 8) return editor.finishDraft(false); // klik igen på sidste punkt afslutter
      }
      let pt: Pt = [snapV(wx), snapV(wy)];
      if (e.shiftKey && d?.length) pt = constrainAngle(d.at(-1)!, pt);
      editor.addDraftPoint(pt);
      return;
    }
    if (primary && editor.tool === 'opening') {
      const [wx, wy] = screenToWorld(editor.camera, p.x, p.y);
      const near = editor.nearestWall(wx, wy, 24 / editor.camera.zoom);
      if (near) editor.placeOpening(near.layer.id, near.wall, near.s);
      else editor.error = 'Klik på en mur for at sætte en åbning ind.';
      return;
    }
    if (primary && editor.tool === 'scatter') {
      const [wx, wy] = screenToWorld(editor.camera, p.x, p.y);
      if (editor.beginScatter()) {
        scattering = true;
        scatterLast = [wx, wy];
        editor.scatterLine(wx, wy, wx, wy);
        schedule();
      }
      return;
    }
    const wantsPaint = (editor.tool === 'paint' || editor.tool === 'erase') && primary;
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
    } else if (pointers.size === 1 && scattering && scatterLast) {
      const [wx, wy] = screenToWorld(editor.camera, p.x, p.y);
      editor.scatterLine(scatterLast[0], scatterLast[1], wx, wy);
      scatterLast = [wx, wy];
      schedule();
    } else if (pointers.size === 1 && drag) {
      moveDrag(p, e);
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
    if (scattering && pointers.size === 0) {
      editor.commitScatter();
      scattering = false;
      scatterLast = null;
    }
    if (drag && pointers.size === 0) {
      if (drag.kind === 'wallPoint' || drag.kind === 'wallMove') editor.commitWallTransform(drag.layerId, drag.wallId, drag.before);
      else if (drag.kind === 'openingMove') editor.commitOpeningMove(drag.layerId, drag.wallId, drag.id, drag.beforeAt);
      else editor.commitTransform(drag.layerId, drag.id, drag.kind === 'move' ? drag.before : drag.before);
      drag = null;
    }
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
    if (e.key === 'Shift') {
      shiftDown = down;
      if (editor.wallDraft) schedule();
    }
    if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') space = down;
  }
</script>

<svelte:window onkeydown={(e) => key(e, true)} onkeyup={(e) => key(e, false)} />

<div class="box" bind:this={box}>
  <canvas
    bind:this={canvas}
    class:paint={editor.tool !== 'hand' && editor.tool !== 'select'}
    class:sel={editor.tool === 'select'}
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
  canvas.sel { cursor: default; }
  .zoom {
    position: absolute; right: 10px; bottom: 8px; background: rgba(0,0,0,.5); color: var(--muted);
    padding: 2px 8px; border-radius: 4px; font-size: 12px; pointer-events: none;
  }
</style>
