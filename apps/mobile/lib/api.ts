import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const API_ORIGIN = API_BASE.replace(/\/api$/, '');

/**
 * Resolves a coverImageUrl (relative path or legacy absolute URL) to a full URL
 * using the same host as the configured API, so it works on Android emulator and physical devices.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = url.startsWith('http') ? new URL(url).pathname : url;
  return `${API_ORIGIN}${path}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await SecureStore.getItemAsync('access_token');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    // Attempt token refresh on 401
    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return apiFetch<T>(path, options);
      }
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message ?? 'API error');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync('refresh_token');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-refresh-token': refreshToken,
      },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string };
    await SecureStore.setItemAsync('access_token', data.accessToken);
    return true;
  } catch {
    return false;
  }
}
