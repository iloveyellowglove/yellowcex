import type { ApiResponse } from '@yellowcex/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('yellowcex_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  });
  return res.json();
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('yellowcex_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return res.json();
}

export function getWsUrl(): string {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('yellowcex_token') : null;
  return `${wsBase}/ws${token ? `?token=${token}` : ''}`;
}
