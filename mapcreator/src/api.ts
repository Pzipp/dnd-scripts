import { parseDoc } from './model/doc';
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
    body: JSON.stringify(doc),
  });
export const deleteMap = (id: string) => call<{ ok: true }>(`${BASE}/maps/${encodeURIComponent(id)}`, { method: 'DELETE' });
