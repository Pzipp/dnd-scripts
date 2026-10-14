import * as api from '../api';
import { createCamera, fit, type Camera } from '../render/camera';
import { addElements, addLayer, moveLayer, paintCells, removeElements, removeLayer, renameDoc, transformElement, updateElement, updateLayer, type ElementPatch } from './commands';
import { createDoc, createLayer, createPreset, type NewDocOptions } from './doc';
import { fillChange, Stroke } from './ground';
import { groundCache } from '../render/groundCache';
import { MATERIAL_GRASS } from '../render/materials';
import { History, type Command } from './history';
import { newId, newSeed } from './ids';
import { defaultParams, familyKinds, getKind, type ObjectKind } from '../objects';
import { CELL_PX, LAYER_TYPE_LABEL, type ExportPreset, type Layer, type LayerType, type MapDoc, type MapElement, type Rect } from './types';

export type Tool = 'hand' | 'select' | 'stamp' | 'paint' | 'erase';

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
    if (applied && cmd.selectsElement) this.selectedElementId = cmd.selectsElement;
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
    if (layerId) this.selectedLayerId = layerId;
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
