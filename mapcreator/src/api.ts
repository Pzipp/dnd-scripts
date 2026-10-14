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
