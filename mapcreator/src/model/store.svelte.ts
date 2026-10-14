import * as api from '../api';
import { createCamera, fit, type Camera } from '../render/camera';
import { addLayer, moveLayer, removeLayer, renameDoc, updateLayer } from './commands';
import { createDoc, createLayer, type NewDocOptions } from './doc';
import { History, type Command } from './history';
import { CELL_PX, LAYER_TYPE_LABEL, type LayerType, type MapDoc } from './types';

/** Editorens tilstand. Dokumentet er reaktivt ($state); alle ændringer går gennem `run`, så de kan fortrydes. */
class Editor {
  doc = $state<MapDoc>(createDoc({ name: 'Nyt kort', widthCells: 80, heightCells: 55 }));
  camera = $state<Camera>(createCamera());
  selectedLayerId = $state<string | null>(null);
  showGrid = $state(true);
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
    this.dirty = true;
    this.rev++;
  }
  undo(): void {
    if (this.history.undo(this.doc)) {
      this.dirty = true;
      this.rev++;
      this.keepSelection();
    }
  }
  redo(): void {
    if (this.history.redo(this.doc)) {
      this.dirty = true;
      this.rev++;
      this.keepSelection();
    }
  }
  private keepSelection(): void {
    if (!this.selectedLayer) this.selectedLayerId = this.doc.layers.at(-1)?.id ?? null;
  }

  // ---- lag ----
  addLayer(type: LayerType): void {
    const n = this.doc.layers.filter((l) => l.type === type).length + 1;
    const layer = createLayer(type, `${LAYER_TYPE_LABEL[type]} ${n}`);
    // Nye lag lægges oven på det valgte lag (eller øverst).
    const sel = this.doc.layers.findIndex((l) => l.id === this.selectedLayerId);
    this.run(addLayer(layer, sel < 0 ? undefined : sel + 1));
    this.selectedLayerId = layer.id;
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
    this.doc = doc;
    this.history.clear();
    this.rev++;
    this.selectedLayerId = doc.layers.at(-1)?.id ?? null;
    this.dirty = false;
    this.fitView();
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
      await api.saveMap($state.snapshot(this.doc) as MapDoc);
      this.dirty = false;
      this.error = '';
      this.status = 'Gemt';
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
}

export const editor = new Editor();
