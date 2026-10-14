import { CELL_PX, type ExportFormat, type ExportPreset, type MapDoc } from '../model/types';
import { renderGroundTile } from './ground';
import { drawElementsLayer } from './sprites';
import { drawWallsLayer } from './walls';
import '../objects';

export const FORMATS: Record<ExportFormat, { mime: string; ext: string; label: string; lossy: boolean }> = {
  png: { mime: 'image/png', ext: 'png', label: 'PNG (tabsfri)', lossy: false },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WebP (mindre)', lossy: true },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPEG (mindst, uden gennemsigtighed)', lossy: true },
};

export const PX_PER_CELL_OPTIONS = [25, 50, 75, 100];
const MAX_SIDE = 16384;
const MAX_PIXELS = 120_000_000;
const TILE = 512;

export function exportSize(doc: Pick<MapDoc, 'widthCells' | 'heightCells'>, preset: Pick<ExportPreset, 'pxPerCell'>) {
  return { w: doc.widthCells * preset.pxPerCell, h: doc.heightCells * preset.pxPerCell };
}

/** Dansk forklaring, hvis billedet ikke kan laves i den valgte opløsning, ellers null. */
export function exportProblem(doc: Pick<MapDoc, 'widthCells' | 'heightCells'>, preset: Pick<ExportPreset, 'pxPerCell'>): string | null {
  const { w, h } = exportSize(doc, preset);
  if (Math.max(w, h) > MAX_SIDE) return `Billedet bliver ${w} × ${h} px; browseren kan højst lave ${MAX_SIDE} px på den lange led.`;
  if (w * h > MAX_PIXELS) return `Billedet bliver ${w} × ${h} px, og det er for mange pixels (højst ${MAX_PIXELS / 1e6} mio.).`;
  return null;
}

/** Filnavn ud fra udgavens navn: uden tegn, der er forbudt i filnavne (bogstaver som æøå bevares). */
export function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[\x00-\x1f/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 80);
  return cleaned || 'kort';
}

export function includedLayers(doc: MapDoc, preset: ExportPreset) {
  const hidden = new Set(preset.hiddenLayerIds);
  return doc.layers.filter((l) => l.visible && !hidden.has(l.id));
}

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

/** Tegner kortet i fuld opløsning (fliser, så siden ikke fryser) og returnerer billedfilen. */
export async function renderExport(doc: MapDoc, preset: ExportPreset, onProgress?: (done: number) => void): Promise<Blob> {
  const problem = exportProblem(doc, preset);
  if (problem) throw new Error(problem);
  const { w, h } = exportSize(doc, preset);
  const scale = preset.pxPerCell / CELL_PX;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browseren kan ikke oprette et så stort lærred.');
  const fmt = FORMATS[preset.format];
  if (preset.format === 'jpeg') {
    ctx.fillStyle = '#c9c3ad';
    ctx.fillRect(0, 0, w, h);
  }

  const layers = includedLayers(doc, preset);
  const tilesX = Math.ceil(w / TILE);
  const tilesY = Math.ceil(h / TILE);
  const total = Math.max(1, layers.reduce((n, l) => n + (l.type === 'ground' ? tilesX * tilesY : 1), 0));
  let done = 0;
  const tmp = document.createElement('canvas');
  tmp.width = TILE;
  tmp.height = TILE;
  const tctx = tmp.getContext('2d')!;

  for (const layer of layers) {
    if (layer.type === 'objects' || layer.type === 'effects') {
      ctx.save();
      ctx.scale(scale, scale);
      ctx.globalAlpha = layer.opacity;
      drawElementsLayer(ctx, layer, doc, scale);
      ctx.restore();
      onProgress?.(++done / total);
      await yieldToUi();
      continue;
    }
    if (layer.type === 'walls') {
      ctx.save();
      ctx.scale(scale, scale);
      ctx.globalAlpha = layer.opacity;
      drawWallsLayer(ctx, layer, doc, scale);
      ctx.restore();
      onProgress?.(++done / total);
      await yieldToUi();
      continue;
    }
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const x = tx * TILE;
        const y = ty * TILE;
        const tw = Math.min(TILE, w - x);
        const th = Math.min(TILE, h - y);
        if (layer.type === 'ground' && layer.ground) {
          const img = tctx.createImageData(tw, th);
          renderGroundTile(img, layer.ground, doc.seed, x / scale, y / scale, scale);
          tctx.putImageData(img, 0, 0);
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(tmp, 0, 0, tw, th, x, y, tw, th);
          ctx.globalAlpha = 1;
        }
        onProgress?.(++done / total);
        await yieldToUi();
      }
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Browseren kunne ikke lave billedfilen (måske er den for stor).'))),
      fmt.mime,
      fmt.lossy ? preset.quality : undefined,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function fileNameFor(preset: ExportPreset): string {
  return `${safeFileName(preset.name)}.${FORMATS[preset.format].ext}`;
}
