import { texturesReady } from '../render/imageTextures';
import * as api from '../api';
import { createCamera, fit, type Camera } from '../render/camera';
import {
  addElements, addLayer, addOpening, addWall, fillPaint, moveLayer, moveOpening, paintTiles, removeElements, removeLayer, removeOpening, removeWall, renameDoc,
  transformElement, transformWall, updateElement, updateLayer, updateOpening, updateWall, type ElementPatch, type OpeningPatch, type WallPatch,
} from './commands';
import { createDoc, createLayer, createPreset, type NewDocOptions } from './doc';
import { generateMap, type GenOptions } from '../generator';
import { resizeMap, type Anchor } from './resize';
import { keyName, liveKeys, looksLikeWater, PAINT_TILE, pixelAt, putTile, scaleOf, type PaintData } from './paint';
import { ScatterStroke, elementsInCircle } from './scatter';
import { hitWall, nearestOnPath, pathLength, pathOf, type Pt } from './walls';
import { defaultThickness, OPENING_KINDS, wallStyle } from '../render/walls';
import { chaikin, simplify } from './shapes';
import { PaintStroke, type Brush, type BrushKind } from '../render/paintBrush';
import { tuftStamper } from '../render/paintTuft';
import { fillSource } from '../render/paintSource';
import { materializeAll, tileCanvas } from '../render/paintView';
import { adoptLegacy } from '../render/paintSource';
import { initialQuality, saveQuality, setQualityMode, type Quality } from '../render/quality';
import { MATERIAL_GRASS, MATERIAL_WATER } from '../render/materials';
import { History, type Command } from './history';
import { newId, newSeed } from './ids';
import { defaultParams, familyKinds, getKind, type ObjectKind } from '../objects';
import { CELL_PX, hasGround, LAYER_TYPE_LABEL, type ExportPreset, type Layer, type LayerType, type MapDoc, type MapElement, type Opening, type OpeningKind, type Rect, type Wall, type WallStyle } from './types';

export type Tool = 'hand' | 'select' | 'stamp' | 'scatter' | 'line' | 'shape' | 'opening' | 'paint' | 'erase';

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
  // linjeværktøjet: punkt for punkt eller frihånd
  lineMode = $state<'points' | 'free'>('points');
  lineFlip = $state(false);
  /** Frihåndslinjer udjævnes til bløde kurver, når de slippes. */
  lineSmooth = $state(true);
  /** Frihåndslinjen under tegning (vises som kladde). */
  freeDraft = $state<Pt[] | null>(null);
  // formværktøjet
  shapeKind = $state<'rect' | 'ellipse' | 'free'>('rect');
  /** Kantens type, eller 'none' for kun udfyldning. */
  shapeStyle = $state<WallStyle | 'none'>('stone');
  shapeThicknessCells = $state(0.4);
  /** Udfyldningens terrænmateriale (trægulv som standard). */
  shapeMaterial = $state(17);
  shapeFlip = $state(false);
  /** Formen under tegning (lukket polygon, vises som kladde). */
  shapeDraft = $state<Pt[] | null>(null);
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
  brushKind = $state<BrushKind>('round');
  /** Gennemsigtighed 0..1 (1 = dækker helt). */
  brushOpacity = $state(1);
  /** Rund pensel: 1 = hård kant, 0 = blød. */
  brushHardness = $state(0.85);
  /** Kantpensel: hvor ujævn kanten er. */
  brushRoughness = $state(0.6);
  /** Mønstrets størrelse (1 = normal) og drejning i grader. */
  textureScale = $state(1);
  textureRotation = $state(0);
  /** Brosten, fliser og planker males som hele sten. */
  wholeStones = $state(true);
  // tuftpenslen
  tuftKind = $state('grass_tuft');
  tuftTone = $state('green');
  /** Afstand mellem totter og tottens størrelse, i felter. */
  tuftSpacing = $state(0.6);
  tuftSize = $state(0.7);
  tuftDensity = $state(0.9);
  /** Senest brugte materialer (nyeste først). */
  recentMaterials = $state<number[]>([]);
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
    if (cmd.relayout) {
      this.keepSelection();
      this.selectedElementId = null;
      this.selectedWallId = null;
      this.selectedOpeningId = null;
      this.fitView();
      this.drawRev++;
    }
    if (cmd.touches) this.invalidate(cmd.touches.layerId, cmd.touches.rect);
    if (applied && cmd.selectsLayer) this.selectedLayerId = cmd.selectsLayer;
    if (applied && cmd.selectsElement) this.selectElement(null, cmd.selectsElement);
    if (applied && cmd.selectsWall) this.selectedWallId = cmd.selectsWall;
    if (applied && cmd.selectsOpening) {
      this.selectedWallId = cmd.selectsOpening.wallId;
      this.selectedOpeningId = cmd.selectsOpening.id;
    }
  }

  /** Gentegn forhåndsvisningen (det malede underlag tegnes direkte fra sine fliser). */
  invalidate(_layerId?: string, _rect?: Rect | null): void {
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
    if (tool !== 'line') {
      this.wallDraft = null;
      this.freeDraft = null;
    }
    if (tool !== 'shape') this.shapeDraft = null;
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
    const pts = (this.wallDraft ?? []).filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1]![0], p[1] - a[i - 1]![1]) > 2);
    this.wallDraft = null;
    this.addLine(pts, closed && pts.length > 2);
  }

  /** Opret en linje af punkterne på det valgte lag (stil, tykkelse og vending fra værktøjet). */
  addLine(points: Pt[], closed: boolean): void {
    const layer = this.placeableWallLayer;
    if (!layer || points.length < 2) {
      if (!layer) this.error = 'Vælg et synligt, ulåst Linjer og former-lag (eller opret et) at tegne på.';
      return;
    }
    const wall: Wall = {
      id: newId(),
      style: this.wallStyle,
      points: points.map((p) => [p[0], p[1]] as Pt),
      closed,
      thickness: this.wallThicknessCells * CELL_PX,
      seed: newSeed(),
      openings: [],
      shape: 'line',
    };
    if (this.lineFlip) wall.flip = true;
    this.run(addWall(layer.id, wall));
    this.selectedWallId = wall.id;
    this.selectedLayerId = layer.id;
  }

  /** En frihåndslinje er færdig: forenkles til få punkter (og udjævnes), så den kan redigeres bagefter. */
  finishFree(raw: Pt[], zoom: number): void {
    this.freeDraft = null;
    if (raw.length < 2) return;
    let pts = simplify(raw, Math.max(1.5, 3 / zoom));
    if (this.lineSmooth && pts.length > 2) pts = simplify(chaikin(pts, 2), 1.2 / zoom);
    if (pts.length > 400) pts = pts.filter((_, i) => i % 2 === 0);
    this.addLine(pts, false);
  }

  /** En form er færdig: firkant og cirkel gives som punkter, frihånd forenkles. Altid lukket. */
  finishShape(pts: Pt[]): void {
    const layer = this.placeableWallLayer;
    this.shapeDraft = null;
    if (!layer) {
      this.error = 'Vælg et synligt, ulåst Linjer og former-lag (eller opret et) at tegne på.';
      return;
    }
    if (pts.length < 3) return;
    const wall: Wall = {
      id: newId(),
      style: this.shapeStyle === 'none' ? 'stone' : this.shapeStyle,
      points: pts.map((p) => [p[0], p[1]] as Pt),
      closed: true,
      thickness: this.shapeThicknessCells * CELL_PX,
      seed: newSeed(),
      openings: [],
      fill: { material: this.shapeMaterial },
      shape: this.shapeKind,
    };
    if (this.shapeStyle === 'none') wall.stroke = false;
    if (this.shapeFlip) wall.flip = true;
    this.run(addWall(layer.id, wall));
    this.selectedWallId = wall.id;
    this.selectedLayerId = layer.id;
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
        if (!wallStyle(wall.style).solid) continue; // døre og vinduer sidder kun i rigtige mure
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
      materialAt: (x, y) => this.materialAt(x, y),
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

  /** Slet en genstand eller mur/form i et vilkårligt lag (objektlisten). */
  removeObject(layerId: string, kind: 'element' | 'wall', id: string): void {
    if (kind === 'element') {
      this.run(removeElements(layerId, [id]));
      if (this.selectedElementId === id) this.selectedElementId = null;
    } else {
      this.run(removeWall(layerId, id));
      if (this.selectedWallId === id) {
        this.selectedWallId = null;
        this.selectedOpeningId = null;
      }
    }
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
    return l && hasGround(l.type) && l.paint && l.visible && !l.locked ? l : null;
  }

  /** Vand (id 6), hvis punktet ligner vand i det øverste malede lag med noget i punktet; ellers 0. Bruges af spredningen. */
  private materialAt(x: number, y: number): number {
    for (let i = this.doc.layers.length - 1; i >= 0; i--) {
      const l = this.doc.layers[i]!;
      const p = l.paint;
      if (!p || !l.visible) continue;
      const c = pixelAt(p, x, y);
      if (c) {
        if (c[3] > 128) return looksLikeWater(c) ? MATERIAL_WATER : 1;
        continue;
      }
      if (p.fill && p.lazy && x >= 0 && y >= 0 && x < this.doc.widthCells * CELL_PX && y < this.doc.heightCells * CELL_PX) return p.fill.material;
    }
    return 0;
  }

  /** Penslen, som den står i indstillingerne (viskelæderet bruger de samme, men uden materiale). */
  get brush(): Brush {
    const erase = this.tool === 'erase';
    const brush: Brush = {
      kind: this.brushKind,
      size: this.brushCells * CELL_PX,
      opacity: this.brushOpacity,
      hardness: this.brushHardness,
      roughness: this.brushRoughness,
      material: this.material,
      textureScale: this.textureScale,
      rotation: this.textureRotation,
      wholeStones: this.wholeStones,
      erase,
      seed: this.doc.seed,
    };
    if (brush.kind === 'tuft' && !erase) {
      brush.size = Math.max(brush.size, CELL_PX);
      brush.stamp = tuftStamper(
        { kind: this.tuftKind, tone: this.tuftTone, spacing: this.tuftSpacing * CELL_PX, density: this.tuftDensity, size: this.tuftSize * CELL_PX },
        newSeed(),
        this.brushOpacity,
      );
    }
    return brush;
  }

  newStroke(): PaintStroke | null {
    const l = this.paintableLayer;
    if (!l?.paint) return null;
    if (this.tool === 'paint') {
      this.recentMaterials = [this.material, ...this.recentMaterials.filter((m) => m !== this.material)].slice(0, 8);
    }
    return new PaintStroke(l.paint, this.brush);
  }
  commitStroke(layerId: string, stroke: PaintStroke): void {
    const done = stroke.finish();
    if (done) this.run(paintTiles(layerId, done.before, done.rect, stroke.brush.erase ? 'Visk ud' : 'Mal'));
  }
  /** Dækker hele laget med det valgte materiale (som baggrund, tegnet ved behov), eller rydder det med viskelæderet. */
  fillSelected(): void {
    const l = this.paintableLayer;
    if (!l?.paint) return;
    const erase = this.tool === 'erase';
    const seed = this.doc.seed;
    this.run(fillPaint(l.id, erase ? 0 : this.material, (p: PaintData, f) => fillSource(f.material, seed, scaleOf(p), f.ox, f.oy), erase ? 'Ryd lag' : 'Fyld lag'));
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
  /** Stiger, hver gang et kort åbnes eller laves, så en hentning af fliser til et forladt kort stopper. */
  private loadToken = 0;
  private load(doc: MapDoc): void {
    this.loadToken++;
    adoptLegacy(doc);
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
  async resizeMap(widthCells: number, heightCells: number, anchor: Anchor): Promise<void> {
    await this.whenLoaded();
    await materializeAll(this.doc, { onlyLegacy: true, onProgress: (d, t) => (this.status = `Tegner terrænet… ${Math.round((d / Math.max(1, t)) * 100)} %`) });
    this.run(resizeMap(widthCells, heightCells, anchor));
  }
  /** Nyt kort lavet af en generator (tema + seed); bagefter et almindeligt kort, der kan redigeres frit. */
  generateMap(opts: GenOptions): void {
    this.load(generateMap(opts));
    this.onServer = false;
    this.dirty = true;
  }
  newMap(opts: NewDocOptions): void {
    this.load(createDoc(opts));
    this.onServer = false;
    this.dirty = true;
  }
  /** Forhåndsvisningens kvalitet (Lav, Medium, Høj). Eksporten er altid i fuld kvalitet. */
  quality = $state<Quality>(initialQuality());

  setQuality(q: Quality): void {
    if (q === this.quality) return;
    this.quality = q;
    saveQuality(q);
    setQualityMode(q);
    this.drawRev++;
  }

  /** Den igangværende hentning af malede fliser (løst, når alle er hentet). */
  private loading: Promise<void> = Promise.resolve();
  whenLoaded(): Promise<void> {
    return this.loading;
  }

  async open(id: string): Promise<void> {
    try {
      const doc = await api.loadMap(id);
      await texturesReady;
      this.load(doc);
      this.onServer = true;
      this.error = '';
      this.status = `Åbnede "${this.doc.name}"`;
      this.loading = this.fetchPaint(doc, id);
      await this.loading;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.drawRev++;
    }
  }

  /** Henter lagenes malede fliser fra serveren (seks ad gangen); forhåndsvisningen fyldes ud, efterhånden som de kommer. */
  private async fetchPaint(doc: MapDoc, mapId: string): Promise<void> {
    const jobs: { p: PaintData; layerId: string; key: number }[] = [];
    for (const l of doc.layers) if (l.paint) for (const key of l.paint.remote) jobs.push({ p: l.paint, layerId: l.id, key });
    if (jobs.length === 0) return;
    const token = this.loadToken;
    const total = jobs.length;
    let done = 0;
    let next = 0;
    const canvas = document.createElement('canvas');
    canvas.width = PAINT_TILE;
    canvas.height = PAINT_TILE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const worker = async () => {
      while (next < jobs.length && token === this.loadToken) {
        const job = jobs[next++]!;
        try {
          const r = await fetch(api.paintTileUrl(mapId, job.layerId, keyName(job.key)));
          if (!r.ok) throw new Error(String(r.status));
          const bmp = await createImageBitmap(await r.blob(), { premultiplyAlpha: 'none' });
          ctx.clearRect(0, 0, PAINT_TILE, PAINT_TILE);
          ctx.drawImage(bmp, 0, 0);
          bmp.close();
          putTile(job.p, job.key, ctx.getImageData(0, 0, PAINT_TILE, PAINT_TILE).data);
        } catch {
          // flisen findes ikke hos serveren: laget er tomt dér (eller tegnes ud fra sin baggrund)
          job.p.remote.delete(job.key);
          job.p.saved.delete(job.key);
        }
        done++;
        if (done % 6 === 0 || done === total) {
          this.status = done === total ? `Åbnede "${doc.name}"` : `Henter terræn… ${Math.round((done / total) * 100)} %`;
          this.drawRev++;
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  /** Gemmer kortet. Først de malede fliser (nye og ændrede), så selve dokumentet, som kun nævner, hvilke fliser der findes. */
  async save(): Promise<void> {
    try {
      this.status = 'Gemmer…';
      await this.whenLoaded();
      await materializeAll(this.doc, { onlyLegacy: true, onProgress: (d, t) => (this.status = `Tegner terrænet… ${Math.round((d / Math.max(1, t)) * 100)} %`) });
      const doc = this.doc;
      const keys = new Map<string, number[]>();
      const done: { p: PaintData; key: number; ver: number }[] = [];
      for (const l of doc.layers) {
        const p = l.paint;
        if (!p) continue;
        const live = liveKeys(p);
        keys.set(l.id, live);
        const tiles = new Map<string, Blob>();
        for (const key of live) {
          const t = p.tiles.get(key);
          if (!t || !(p.dirty.has(key) || !this.onServer || !p.saved.has(key))) continue;
          const blob = await new Promise<Blob | null>((res) => tileCanvas(t).toBlob(res, 'image/png'));
          if (!blob) throw new Error('Browseren kunne ikke gemme en flise.');
          tiles.set(keyName(key), blob);
          done.push({ p, key, ver: t.ver });
        }
        const all = live.map(keyName);
        const names = [...tiles.keys()];
        if (names.length === 0 && all.length === p.saved.size && all.every((n) => p.saved.has(tileKeyOf(n)))) continue;
        for (let i = 0; i < Math.max(1, names.length); i += 40) {
          const part = new Map(names.slice(i, i + 40).map((n) => [n, tiles.get(n)!] as const));
          await api.savePaint(doc.id, l.id, all, part);
          this.status = `Gemmer terræn… ${Math.min(names.length, i + 40)} af ${names.length}`;
        }
      }
      await api.saveMap(doc, keys);
      for (const l of doc.layers) if (l.paint) l.paint.saved = new Set(keys.get(l.id));
      for (const d of done) if (d.p.tiles.get(d.key)?.ver === d.ver) d.p.dirty.delete(d.key);
      this.dirty = false;
      this.onServer = true;
      this.error = '';
      this.status = 'Gemt';
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  /** Findes det åbne kort på serveren (åbnet eller gemt)? Ellers gemmes alle fliser. */
  private onServer = false;
}

const tileKeyOf = (name: string): number => {
  const [x, y] = name.split('_').map(Number) as [number, number];
  return y * 256 + x;
};

export const editor = new Editor();
