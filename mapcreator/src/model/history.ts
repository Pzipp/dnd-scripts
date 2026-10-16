import type { MapDoc, Rect } from './types';

/** En ændring, der kan fortrydes. `merge` samler fx mange skyder-trin til én fortryd-handling. */
export interface Command {
  label: string;
  apply(doc: MapDoc): void;
  revert(doc: MapDoc): void;
  /** Returnér true, hvis `next` er lagt ind i denne kommando (så den ikke skal på stakken). */
  merge?(next: Command): boolean;
  /** Hukommelse, kommandoen fylder (bytes), så historikken kan smide de ældste væk, når der er for meget. */
  readonly bytes?: number;
  /** Lag og område (verdenspixels), der skal tegnes igen, når kommandoen er udført eller fortrudt. */
  touches?: { layerId: string; rect: Rect };
  /** Kortets mål eller lag er skiftet ud: al forhåndsvisning skal bygges forfra. */
  relayout?: boolean;
  /** Lag, der skal vælges, når kommandoen udføres (eller gentages). */
  selectsLayer?: string;
  /** Genstand, der skal vælges, når kommandoen udføres (eller gentages). */
  selectsElement?: string;
  /** Mur og åbning, der skal vælges, når kommandoen udføres (eller gentages). */
  selectsWall?: string;
  selectsOpening?: { wallId: string; id: string };
}

const MERGE_WINDOW_MS = 800;
const MAX_BYTES = 300 * 1024 * 1024;

export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private lastAt = 0;

  constructor(private now: () => number = () => Date.now()) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  get undoLabel(): string | undefined {
    return this.undoStack.at(-1)?.label;
  }
  get redoLabel(): string | undefined {
    return this.redoStack.at(-1)?.label;
  }

  execute(doc: MapDoc, cmd: Command): void {
    cmd.apply(doc);
    const t = this.now();
    const top = this.undoStack.at(-1);
    if (top?.merge && t - this.lastAt < MERGE_WINDOW_MS && top.merge(cmd)) {
      // slået sammen med forrige
    } else {
      this.undoStack.push(cmd);
    }
    this.lastAt = t;
    this.redoStack = [];
    this.trim();
  }

  /** Smider de ældste handlinger væk, når de samlet fylder for meget (malede fliser fylder mest). */
  private trim(): void {
    let total = 0;
    for (const c of this.undoStack) total += c.bytes ?? 0;
    while (total > MAX_BYTES && this.undoStack.length > 1) total -= this.undoStack.shift()!.bytes ?? 0;
  }

  undo(doc: MapDoc): Command | null {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    cmd.revert(doc);
    this.redoStack.push(cmd);
    this.lastAt = 0;
    return cmd;
  }

  redo(doc: MapDoc): Command | null {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    cmd.apply(doc);
    this.undoStack.push(cmd);
    this.lastAt = 0;
    return cmd;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastAt = 0;
  }
}
