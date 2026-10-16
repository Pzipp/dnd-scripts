import { parseDoc, serializeDoc } from './model/doc';
import type { MapDoc } from './model/types';

export interface MapInfo {
  id: string;
  name: string;
  widthCells: number;
  heightCells: number;
  modified: string;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { error?: string }).error ?? `Serverfejl (${r.status})`);
  return body as T;
}

const BASE = '/api/mapcreator';

export const listMaps = () => call<MapInfo[]>(`${BASE}/maps`);
export const loadMap = async (id: string) => parseDoc(await call<unknown>(`${BASE}/maps/${encodeURIComponent(id)}`));
export const saveMap = (doc: MapDoc) =>
  call<{ ok: true }>(`${BASE}/maps/${encodeURIComponent(doc.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serializeDoc(doc)),
  });
export const deleteMap = (id: string) => call<{ ok: true }>(`${BASE}/maps/${encodeURIComponent(id)}`, { method: 'DELETE' });

// ---- egne genstande ----

export interface AssetMeta {
  name: string;
  family: string;
  /** Mål i felter. */
  w: number;
  h: number;
  shadow: boolean;
  randomRotation: boolean;
  tags: string[];
}

export interface AssetItem extends AssetMeta {
  id: string;
  /** Billedets størrelse i pixels. */
  pxW: number;
  pxH: number;
  created: string;
}

export const assetUrl = (id: string) => `${BASE}/assets/${encodeURIComponent(id)}.webp`;
export const listAssets = () => call<AssetItem[]>(`${BASE}/assets`);
export const patchAsset = (id: string, changes: Partial<AssetMeta>) =>
  call<AssetItem>(`${BASE}/assets/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
export const deleteAsset = (id: string) => call<{ ok: true }>(`${BASE}/assets/${encodeURIComponent(id)}`, { method: 'DELETE' });
export function uploadAsset(image: Blob, meta: AssetMeta): Promise<AssetItem> {
  const form = new FormData();
  form.set('file', image, 'asset.png');
  form.set('meta', JSON.stringify(meta));
  return call<AssetItem>(`${BASE}/assets`, { method: 'POST', body: form });
}

// ---- det simple VTT (/simpelvtt): kampagner, rooms og upload ----

export interface VttTree {
  campaigns: { name: string; images: string[]; rooms: { name: string; images: string[] }[] }[];
  general: { name: string; rooms: { name: string; shipped: boolean }[] };
}

export const GENERAL_MAPS = 'General Maps';

export const getVttTree = () => call<VttTree>('/api/simpelvtt/tree');

/** Lægger et billede i en kampagne (eller General Maps) og evt. et room. Returnerer stien, VTT'et gav filen. */
export async function uploadToVtt(blob: Blob, filename: string, campaign: string, room: string): Promise<string> {
  const form = new FormData();
  form.set('campaign', campaign);
  if (room) form.set('room', room);
  form.append('files', blob, filename);
  const r = await fetch('/api/simpelvtt/upload', { method: 'POST', body: form });
  const body = (await r.json().catch(() => ({}))) as { saved?: string[]; errors?: string[]; error?: string };
  if (!r.ok || !body.saved?.length) throw new Error(body.errors?.join(' ') || body.error || `Upload mislykkedes (${r.status})`);
  return body.saved[0]!;
}

// ---- færdigtegnede terrænfliser ----

export interface BakeManifest {
  version: number;
  scale: number;
  tile: number;
  /** "tx_ty" -> fingeraftryk. */
  sigs: Record<string, string>;
}

/** Skalaen skrives som heltal (skala * 1000), så den kan stå i en adresse. */
export const scaleKey = (scale: number): number => Math.round(scale * 1000);

export const loadBakeManifests = (mapId: string, scale: number) =>
  call<Record<string, BakeManifest>>(`${BASE}/maps/${encodeURIComponent(mapId)}/bake?scale=${scaleKey(scale)}`);
export const bakeTileUrl = (mapId: string, layerId: string, scale: number, key: string, sig: string) =>
  `${BASE}/maps/${encodeURIComponent(mapId)}/bake/${encodeURIComponent(layerId)}/${scaleKey(scale)}/${key}.webp?s=${sig}`;
export const saveBake = (mapId: string, layerId: string, manifest: BakeManifest, tiles: Map<string, Blob>) => {
  const form = new FormData();
  form.append('manifest', JSON.stringify(manifest));
  for (const [key, blob] of tiles) form.append(`t_${key}`, blob, `${key}.webp`);
  return call<{ ok: true }>(`${BASE}/maps/${encodeURIComponent(mapId)}/bake/${encodeURIComponent(layerId)}`, { method: 'POST', body: form });
};
