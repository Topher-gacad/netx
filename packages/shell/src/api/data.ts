import { apiFetch } from './client.js';

export interface SavePayload {
  topology: unknown;
  pluginData: unknown;
  preferences: unknown;
}

export interface LoadResponse {
  topology: unknown;
  pluginData: unknown;
  preferences: unknown;
  savedAt: string;
}

export async function apiSaveData(payload: SavePayload): Promise<{ ok: boolean; savedAt: string }> {
  return apiFetch('/data/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiLoadData(): Promise<LoadResponse> {
  return apiFetch<LoadResponse>('/data/load');
}
