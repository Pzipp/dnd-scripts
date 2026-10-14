import * as api from '../api';
import { createCamera, fit, type Camera } from '../render/camera';
import {
  addElements, addLayer, addOpening, addWall, moveLayer, moveOpening, paintCells, removeElements, removeLayer, removeOpening, removeWall, renameDoc,
  transformElement, transformWall, updateElement, updateLayer, updateOpening, updateWall, type ElementPatch, type OpeningPatch, type WallPatch,
} from './commands';
import { createDoc, createLayer, createPreset, type NewDocOptions } from './doc';
import { fillChange, materialAt, Stroke } from './ground';
import { ScatterStroke, elementsInCircle } from './scatter';
import { hitWall, nearestOnPath, pathLength, pathOf, type Pt } from './walls';
import { defaultThickness, OPENING_KINDS } from '../render/walls';
import { groundCache } from '../render/groundCache';
import { MATERIAL_GRASS } from '../render/materials';
import { History, type Command } from './history';
import { newId, newSeed } from './ids';
import { defaultParams, familyKinds, getKind, type ObjectKind } from '../objects';
import { CELL_PX, LAYER_TYPE_LABEL, type ExportPreset, type Layer, type LayerType, type MapDoc, type MapElement, type Opening, type OpeningKind, type Rect, type Wall, type WallStyle } from './types';

export type Tool = 'hand' | 'select' | 'stamp' | 'scatter' | 'wall' | 'opening' | 'paint' | 'erase';

/** Fastgørelse til halve felter (25 px). */
export const SNAP_PX = CELL_PX / 2;
const snapTo = (v: number, on: boolean) => (on ? Math.round(v / SNAP_PX) * SNAP_PX : v);

/** Editorens tilstand. Dokumentet er reaktivt ($state); alle ændringer går gennem `run`, så de kan fortrydes. */
class Editor {
  doc = $state<MapDoc>(createDoc({ name: 'Nyt kort', widthCells: 80, heightCells: 55 }));
  camera = $state<Camera>(createCamera());
  selectedLayerId = $state<string | null>(null);
  showGrid = $state(true);
  tool = $state<Tool>('hand');
  selectedElementId = $state<string | null>(null);
  /** Familien i vælgeren (fx 'tree') og varianten, der sættes ud: en nøgle, eller 'random' = en tilfældig variant i familien. */
  stampFamily = $state('tree');
  stampKind = $state('random');
  // mure
  selectedWallId = $state<string | null>(null);
  selectedOpeningId = $state<string | null>(null);
  wallStyle = $state<WallStyle>('stone');
  /** Tykkelse for nye mure, i felter. */
  wallThicknessCells = $state(0.4);
  wallDraft = $state<Pt[] | null>(null);
  openingKind = $state<OpeningKind>('door');
  // scatter
  scatterCells = $state(6);
  scatterDensity = $state(0.5);
  scatterAvoidWater = $state(true);
  scatterErase = $state(false);
  snap = $state(false);
  material = $state(MATERIAL_GRASS);
  /** Penselens diameter i felter. */
  brushCells = $state(3);
  /** Stiger, når forhåndsvisningen skal tegnes igen (flise færdig, område ugyldigt). */
  drawRev = $state(0);
  dirty = $state(false);
  status = $state('');
  error = $state('');
  /** Tæller, der stiger ved hver ændring af historikken (så knapperne opdateres). */
  private rev = $state(0);

  private history = new History();
  viewSize = { w: 0, h: 0 };

  constructor() {
    this.selectedLayerId = this.doc.layers[0]?.id ?? null;
  }

  get canUndo(): boolean {
    void this.rev;
    return this.history.canUndo;
  }
  get canRedo(): boolean {
    void this.rev;
    return this.history.canRedo;
  }
  get selectedLayer() {
    return this.doc.layers.find((l) => l.id === this.selectedLayerId) ?? null;
  }

  run(cmd: Command): void {
    this.history.execute(this.doc, cmd);
    this.afterChange(cmd);
  }
  undo(): void {
    const cmd = this.history.undo(this.doc);
    if (cmd) {
      this.afterChange(cmd, false);
      this.keepSelection();
    }
  }
  redo(): void {
    const cmd = this.history.redo(this.doc);
    if (cmd) this.afterChange(cmd, true);
  }
  private afterChange(cmd: Command, applied = true): void {
    this.dirty = true;
    this.rev++;
    if (cmd.touches) this.invalidate(cmd.touches.layerId, cmd.touches.rect);
    if (applied && cmd.selectsLayer) this.selectedLayerId = cmd.selectsLayer;
    if (applied && cmd.selectsElement) this.selectElement(null, cmd.selectsElement);
    if (applied && cmd.selectsWall) this.selectedWallId = cmd.selectsWall;
    if (applied && cmd.selectsOpening) {
      this.selectedWallId = cmd.selectsOpening.wallId;
      this.selectedOpeningId = cmd.selectsOpening.id;
    }
  }

  /** Gentegn forhåndsvisningen af et grundlag (område i verdenspixels, null = hele laget). */
  invalidate(layerId: string, rect: Rect | null): void {
    groundCache.invalidate(layerId, rect, this.doc);
    this.drawRev++;
  }

  // ---- genstande ----
  /** Det valgte lag, hvis genstande kan sættes ud på det. */
  get placeableLayer(): Layer | null {
    const l = this.selectedLayer;
    return l && (l.type === 'objects' || l.type === 'effects') && l.visible && !l.locked ? l : null;
  }

  /** Den valgte genstand og dens lag (null, hvis den er væk, fx efter fortryd). */
  get selection(): { layer: Layer; el: MapElement } | null {
    const id = this.selectedElementId;
    if (!id) return null;
    for (const layer of this.doc.layers) {
      const el = layer.elements?.find((e) => e.id === id);
      if (el) return { layer, el };
    }
    return null;
  }

  selectElement(layerId: string | null, id: string | null): void {
    this.selectedElementId = id;
    this.selectedWallId = null;
    this.selectedOpeningId = null;
    if (layerId) this.selectedLayerId = layerId;
  }

  // ---- mure ----
  /** Det valgte lag, hvis der kan tegnes mure på det. */
  get placeableWallLayer(): Layer | null {
    const l = this.selectedLayer;
    return l && l.type === 'walls' && l.visible && !l.locked ? l : null;
  }

  /** Den valgte mur (og evt. åbning) med lag. */
  get selectionWall(): { layer: Layer; wall: Wall; opening: Opening | null } | null {
    const id = this.selectedWallId;
    if (!id) return null;
    for (const layer of this.doc.layers) {
      const wall = layer.walls?.find((w) => w.id === id);
      if (wall) return { layer, wall, opening: wall.openings.find((o) => o.id === this.selectedOpeningId) ?? null };
    }
    return null;
  }

  selectWall(layerId: string, wallId: string, openingId: string | null = null): void {
    this.selectedWallId = wallId;
    this.selectedOpeningId = openingId;
    this.selectedElementId = null;
    this.selectedLayerId = layerId;
  }

  /** Skifter værktøj; en markering følger kun med til Vælg og Dør. */
  setTool(tool: Tool): void {
    this.tool = tool;
    if (tool !== 'select' && tool !== 'opening') this.clearSelection();
    if (tool !== 'wall') this.wallDraft = null;
  }

  clearSelection(): void {
    this.selectedElementId = null;
    this.selectedWallId = null;
    this.selectedOpeningId = null;
  }

  setWallStyle(style: WallStyle): void {
    this.wallStyle = style;
    this.wallThicknessCells = Math.round((defaultThickness(style) / CELL_PX) * 100) / 100;
  }

  /** Mur-tegning: punkter tilføjes ét ad gangen; `finishDraft` laver muren. */
  addDraftPoint(p: Pt): void {
    if (!this.placeableWallLayer) {
      this.error = 'Vælg et synligt, ulåst Mure-lag (eller opret et) at tegne på.';
      return;
    }
    this.error = '';
    this.wallDraft = [...(this.wallDraft ?? []), p];
  }
  popDraftPoint(): void {
    if (!this.wallDraft) return;
    const next = this.wallDraft.slice(0, -1);
    this.wallDraft = next.length ? next : null;
  }
  cancelDraft(): void {
    this.wallDraft = null;
  }
  finishDraft(closed = false): void {
    const layer = this.placeableWallLayer;
    const pts = (this.wallDraft ?? []).filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1]![0], p[1] - a[i - 1]![1]) > 2);
    this.wallDraft = null;
    if (!layer || pts.length < 2) return;
    const wall: Wall = {
      id: newId(),
      style: this.wallStyle,
      points: pts.map((p) => [p[0], p[1]] as Pt),
      closed: closed && pts.length > 2,
      thickness: this.wallThicknessCells * CELL_PX,
      seed: newSeed(),
      openings: [],
    };
    this.run(addWall(layer.id, wall));
  }

  patchWall(patch: WallPatch): void {
    const sel = this.selectionWall;
    if (sel) this.run(updateWall(sel.layer.id, sel.wall.id, patch));
  }
  removeSelectedWall(): void {
    const sel = this.selectionWall;
    if (!sel) return;
    this.run(removeWall(sel.layer.id, sel.wall.id));
    this.selectedWallId = null;
    this.selectedOpeningId = null;
  }
  /** Samler et træk i murens punkter til én fortryd-handling. */
  commitWallTransform(layerId: string, wallId: string, before: Pt[]): void {
    const wall = this.doc.layers.find((l) => l.id === layerId)?.walls?.find((w) => w.id === wallId);
    if (!wall) return;
    const after = wall.points.map((p) => [p[0], p[1]] as Pt);
    if (before.length === after.length && before.every((p, i) => p[0] === after[i]![0] && p[1] === after[i]![1])) return;
    this.run(transformWall(layerId, wallId, before, after));
  }
  removeWallPoint(index: number): void {
    const sel = this.selectionWall;
    if (!sel || sel.wall.points.length <= 2) return;
    this.run(updateWall(sel.layer.id, sel.wall.id, { points: sel.wall.points.filter((_, i) => i !== index) as Pt[] }));
  }

  /** Nærmeste mur i et punkt (blandt synlige, ulåste mur-lag), med afstanden langs muren. */
  nearestWall(wx: number, wy: number, tolerance: number): { layer: Layer; wall: Wall; s: number } | null {
    let best: { layer: Layer; wall: Wall; s: number; d: number } | null = null;
    for (const layer of this.doc.layers) {
      if (layer.type !== 'walls' || !layer.visible || layer.locked) continue;
      for (const wall of layer.walls ?? []) {
        const n = nearestOnPath(pathOf(wall), wx, wy);
        if (n && n.dist <= wall.thickness / 2 + tolerance && (!best || n.dist < best.d)) best = { layer, wall, s: n.s, d: n.dist };
      }
    }
    return best ? { layer: best.layer, wall: best.wall, s: best.s } : null;
  }

  /** En åbning af den valgte slags, så den ligger helt inden for muren omkring `s`. */
  buildOpening(wall: Wall, s: number): Opening {
    const def = OPENING_KINDS.find((k) => k.key === this.openingKind)!;
    const len = pathLength(pathOf(wall));
    const width = Math.min(def.width * CELL_PX, len);
    const at = Math.min(len - width / 2, Math.max(width / 2, this.snap ? Math.round(s / (CELL_PX / 2)) * (CELL_PX / 2) : s));
    return { id: 'ghost', kind: def.key, at, width, open: false, flip: false };
  }
  placeOpening(layerId: string, wall: Wall, s: number): void {
    const o = this.buildOpening(wall, s);
    o.id = newId();
    this.run(addOpening(layerId, wall.id, o));
  }
  patchOpening(patch: OpeningPatch): void {
    const sel = this.selectionWall;
    if (sel?.opening) this.run(updateOpening(sel.layer.id, sel.wall.id, sel.opening.id, patch));
  }
  removeSelectedOpening(): void {
    const sel = this.selectionWall;
    if (!sel?.opening) return;
    this.run(removeOpening(sel.layer.id, sel.wall.id, sel.opening.id));
    this.selectedOpeningId = null;
  }
  commitOpeningMove(layerId: string, wallId: string, id: string, beforeAt: number): void {
    const o = this.doc.layers.find((l) => l.id === layerId)?.walls?.find((w) => w.id === wallId)?.openings.find((x) => x.id === id);
    if (o && o.at !== beforeAt) this.run(moveOpening(layerId, wallId, id, beforeAt, o.at));
  }

  // ---- scatter ----
  scatterStroke: ScatterStroke | null = null;
  /** Genstande, som det igangværende strøg har sat ud (vises som forhåndsvisning, til strøget slippes). */
  scatterPlaced = $state<MapElement[]>([]);
  /** Genstande, der fjernes, hvis strøget i fjern-tilstand slippes. */
  scatterRemoving = $state<MapElement[]>([]);

  beginScatter(): boolean {
    const layer = this.placeableLayer;
    if (!layer) {
      this.error = 'Vælg et synligt, ulåst genstands- eller effektlag at sprede på.';
      return false;
    }
    this.error = '';
    this.scatterPlaced = [];
    this.scatterRemoving = [];
    this.scatterStroke = new ScatterStroke(layer.elements ?? []);
    return true;
  }

  /** Spreder (eller markerer til fjernelse) langs et stykke af strøget. Returnerer true, hvis der er ændret noget. */
  scatterLine(ax: number, ay: number, bx: number, by: number): boolean {
    const layer = this.placeableLayer;
    if (!layer) return false;
    const radius = (this.scatterCells * CELL_PX) / 2;
    if (this.scatterErase) {
      const ids = new Set(this.scatterRemoving.map((e) => e.id));
      const step = Math.max(10, radius * 0.6);
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      let changed = false;
      for (let k = 0; k <= n; k++) {
        for (const e of elementsInCircle(layer.elements ?? [], ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, radius)) {
          if (!ids.has(e.id)) {
            ids.add(e.id);
            this.scatterRemoving.push(e);
            changed = true;
          }
        }
      }
      return changed;
    }
    const stroke = this.scatterStroke;
    if (!stroke) return false;
    const family = this.stampFamily;
    const pickKind = () => {
      if (this.stampKind !== 'random') return getKind(this.stampKind);
      const list = familyKinds(family);
      return list[Math.floor(Math.random() * list.length)];
    };
    const added = stroke.line(ax, ay, bx, by, {
      density: this.scatterDensity,
      radius,
      avoidWater: this.scatterAvoidWater,
      materialAt: (x, y) => materialAt(this.doc, x, y),
      blocked: (x, y, r) => this.doc.layers.some((l) => l.visible && l.walls?.some((w) => hitWall(w, x, y, r))),
      pickKind,
      newId,
      newSeed,
      bounds: { w: this.doc.widthCells * CELL_PX, h: this.doc.heightCells * CELL_PX },
    });
    if (added.length) this.scatterPlaced.push(...added);
    return added.length > 0;
  }

  commitScatter(): void {
    const layer = this.placeableLayer;
    if (layer && this.scatterErase && this.scatterRemoving.length) this.run(removeElements(layer.id, this.scatterRemoving.map((e) => e.id)));
    else if (layer && this.scatterPlaced.length) this.run(addElements(layer.id, $state.snapshot(this.scatterPlaced) as MapElement[]));
    this.scatterStroke = null;
    this.scatterPlaced = [];
    this.scatterRemoving = [];
  }
  cancelScatter(): void {
    this.scatterStroke = null;
    this.scatterPlaced = [];
    this.scatterRemoving = [];
  }

  /** Tilfældige valg til den næste genstand (så forhåndsvisningen ligner det, der bliver sat ud). */
  pending = $state({ seed: newSeed(), rot: Math.random() * Math.PI * 2, jitter: Math.random() * 2 - 1, pick: Math.random() });
  private reroll(): void {
    this.pending = { seed: newSeed(), rot: Math.random() * Math.PI * 2, jitter: Math.random() * 2 - 1, pick: Math.random() };
  }

  /** Varianten, der sættes ud næste gang (ved "Tilfældig" er den rullet på forhånd). */
  get stampedKind(): ObjectKind | undefined {
    if (this.stampKind !== 'random') return getKind(this.stampKind);
    const list = familyKinds(this.stampFamily);
    return list[Math.min(list.length - 1, Math.floor(this.pending.pick * list.length))];
  }

  /** Genstanden, der ville blive sat ud i (wx, wy) med de nuværende valg. */
  buildElement(wx: number, wy: number): MapElement | null {
    const kind = this.stampedKind;
    if (!kind) return null;
    const k = 1 + this.pending.jitter * kind.sizeJitter;
    return {
      id: 'ghost',
      kind: kind.key,
      x: snapTo(wx, this.snap),
      y: snapTo(wy, this.snap),
      w: kind.w * CELL_PX * k,
      h: kind.h * CELL_PX * k,
      rot: kind.randomRotation ? this.pending.rot : 0,
      seed: this.pending.seed,
      z: 0,
      params: defaultParams(kind),
    };
  }

  placeElement(wx: number, wy: number): void {
    const layer = this.placeableLayer;
    const el = this.buildElement(wx, wy);
    if (!layer || !el) {
      this.error = 'Vælg et synligt, ulåst genstands- eller effektlag at sætte ud på.';
      return;
    }
    el.id = newId();
    this.error = '';
    this.reroll();
    this.run(addElements(layer.id, [el]));
  }

  patchElement(patch: ElementPatch): void {
    const sel = this.selection;
    if (sel) this.run(updateElement(sel.layer.id, sel.el.id, patch));
  }

  /** Samler en træk-handling (flyt, skalér, rotér) til én fortryd-handling. `before` er værdierne ved trækkets start. */
  commitTransform(layerId: string, id: string, before: ElementPatch): void {
    const el = this.doc.layers.find((l) => l.id === layerId)?.elements?.find((e) => e.id === id);
    if (!el) return;
    const after: ElementPatch = {};
    for (const k of Object.keys(before) as ('x' | 'y' | 'w' | 'h' | 'rot')[]) after[k] = el[k] as never;
    if (Object.keys(before).every((k) => (before as Record<string, unknown>)[k] === (after as Record<string, unknown>)[k])) return;
    this.run(transformElement(layerId, id, before, after));
  }

  removeSelectedElement(): void {
    const sel = this.selection;
    if (!sel) return;
    this.run(removeElements(sel.layer.id, [sel.el.id]));
    this.selectedElementId = null;
  }

  duplicateSelectedElement(): void {
    const sel = this.selection;
    if (!sel) return;
    const copy: MapElement = { ...structuredClone($state.snapshot(sel.el)), id: newId(), x: sel.el.x + CELL_PX / 2, y: sel.el.y + CELL_PX / 2 };
    this.run(addElements(sel.layer.id, [copy]));
  }

  nudgeSelected(dx: number, dy: number): void {
    const sel = this.selection;
    if (sel) this.run(updateElement(sel.layer.id, sel.el.id, { x: sel.el.x + dx, y: sel.el.y + dy }));
  }

  /** Det valgte lag, hvis man kan male på det. */
  get paintableLayer() {
    const l = this.selectedLayer;
    return l && l.type === 'ground' && l.ground && l.visible && !l.locked ? l : null;
  }

  newStroke(): Stroke {
    return new Stroke();
  }
  commitStroke(layerId: string, stroke: Stroke): void {
    const g = this.doc.layers.find((l) => l.id === layerId)?.ground;
    const change = g && stroke.result(g);
    if (change) this.run(paintCells(layerId, change));
  }
  fillSelected(): void {
    const l = this.paintableLayer;
    if (!l?.ground) return;
    const change = fillChange(l.ground, this.tool === 'erase' ? 0 : this.material);
    if (change) {
      const cmd = paintCells(l.id, change);
      cmd.label = 'Fyld lag';
      this.run(cmd);
    }
  }

  // ---- udgaver (eksport) ----
  addPreset(): ExportPreset {
    const p = createPreset(`${this.doc.name} ${this.doc.exports.length + 1}`);
    this.doc.exports.push(p);
    this.dirty = true;
    return p;
  }
  removePreset(id: string): void {
    const i = this.doc.exports.findIndex((e) => e.id === id);
    if (i >= 0 && this.doc.exports.length > 1) {
      this.doc.exports.splice(i, 1);
      this.dirty = true;
    }
  }
  touchPresets(): void {
    this.dirty = true;
  }
  private keepSelection(): void {
    if (!this.selectedLayer) this.selectedLayerId = this.doc.layers.at(-1)?.id ?? null;
  }

  // ---- lag ----
  addLayer(type: LayerType): void {
    const n = this.doc.layers.filter((l) => l.type === type).length + 1;
    const layer = createLayer(type, `${LAYER_TYPE_LABEL[type]} ${n}`, this.doc);
    // Nye lag lægges oven på det valgte lag (eller øverst).
    const sel = this.doc.layers.findIndex((l) => l.id === this.selectedLayerId);
    this.run(addLayer(layer, sel < 0 ? undefined : sel + 1));
    groundCache.sync(this.doc);
    this.drawRev++;
  }
  removeLayer(id: string): void {
    if (this.doc.layers.length <= 1) return;
    this.run(removeLayer(id));
    this.keepSelection();
  }
  patchLayer(id: string, patch: Parameters<typeof updateLayer>[1]): void {
    this.run(updateLayer(id, patch));
  }
  moveLayer(id: string, delta: number): void {
    this.run(moveLayer(id, delta));
  }
  rename(name: string): void {
    this.run(renameDoc(name));
  }

  // ---- kamera ----
  fitView(): void {
    if (this.viewSize.w > 0) fit(this.camera, this.viewSize.w, this.viewSize.h, this.doc.widthCells * CELL_PX, this.doc.heightCells * CELL_PX);
  }

  // ---- filer ----
  private load(doc: MapDoc): void {
    groundCache.reset();
    this.doc = doc;
    this.history.clear();
    this.rev++;
    this.selectedLayerId = doc.layers.at(-1)?.id ?? null;
    this.selectedElementId = null;
    this.selectedWallId = null;
    this.selectedOpeningId = null;
    this.wallDraft = null;
    this.dirty = false;
    this.fitView();
    this.drawRev++;
  }
  newMap(opts: NewDocOptions): void {
    this.load(createDoc(opts));
    this.dirty = true;
  }
  async open(id: string): Promise<void> {
    try {
      this.load(await api.loadMap(id));
      this.error = '';
      this.status = `Åbnede "${this.doc.name}"`;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
  async save(): Promise<void> {
    try {
      await api.saveMap(this.doc);
      this.dirty = false;
      this.error = '';
      this.status = 'Gemt';
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
}

export const editor = new Editor();
