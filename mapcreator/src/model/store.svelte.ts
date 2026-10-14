import * as api from '../api';
import { createCamera, fit, type Camera } from '../render/camera';
import { addLayer, moveLayer, paintCells, removeLayer, renameDoc, updateLayer } from './commands';
import { createDoc, createLayer, createPreset, type NewDocOptions } from './doc';
import { fillChange, Stroke } from './ground';
import { groundCache } from '../render/groundCache';
import { MATERIAL_GRASS } from '../render/materials';
import { History, type Command } from './history';
import { CELL_PX, LAYER_TYPE_LABEL, type ExportPreset, type LayerType, type MapDoc, type Rect } from './types';

export type Tool = 'hand' | 'paint' | 'erase';

/** Editorens tilstand. Dokumentet er reaktivt ($state); alle ændringer går gennem `run`, så de kan fortrydes. */
class Editor {
  doc = $state<MapDoc>(createDoc({ name: 'Nyt kort', widthCells: 80, heightCells: 55 }));
  camera = $state<Camera>(createCamera());
  selectedLayerId = $state<string | null>(null);
  showGrid = $state(true);
  tool = $state<Tool>('hand');
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
  }

  /** Gentegn forhåndsvisningen af et grundlag (område i verdenspixels, null = hele laget). */
  invalidate(layerId: string, rect: Rect | null): void {
    groundCache.invalidate(layerId, rect, this.doc);
    this.drawRev++;
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
