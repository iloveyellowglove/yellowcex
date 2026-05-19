const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return res.json();
}

export const api = {
  get: <T>(path: string) => fetchApi<T>(path),
  post: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
};

export async function getAdminStats() {
  const [users, orders, trades] = await Promise.all([
    api.get<any[]>('/api/admin/users?limit=5'),
    api.get<any[]>('/api/admin/orders?limit=5'),
    api.get<any[]>('/api/trades?limit=10'),
  ]);
  return { users, orders, trades };
}
