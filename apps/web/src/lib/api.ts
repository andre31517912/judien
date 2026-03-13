/** Centralised API fetch with cookie support */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const API_ORIGIN = API_BASE.replace(/\/api$/, '');

/**
 * Resolves a coverImageUrl (relative path or legacy absolute URL) to a full URL
 * using the same host as the configured API, so it works on any device/network.
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
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message ?? 'API error');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Upload a file (multipart/form-data). Returns { url } of the saved file. */
export async function apiUpload(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: form,
    // Do NOT set Content-Type — browser sets it with the multipart boundary
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message ?? 'Upload error');
  }
  return res.json();
}
