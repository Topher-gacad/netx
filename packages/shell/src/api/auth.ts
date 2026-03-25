import { apiFetch } from './client.js';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

export async function apiSignup(username: string, email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function apiLogin(username: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function apiGetMe(): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>('/auth/me');
}

export async function apiLogout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}
