/** Centralised API fetch with cookie + Bearer token support */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const API_ORIGIN = API_BASE.replace(/\/api$/, '');

// ---------------------------------------------------------------------------
// In-memory token cache (synced with localStorage for cross-navigation persist)
// This is the fallback for mobile/Safari/Firefox that block cross-origin cookies.
// All localStorage calls are wrapped in try/catch — Safari private mode throws
// QuotaExceededError on setItem, and some browsers restrict storage entirely.
// ---------------------------------------------------------------------------
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

function lsGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch { /* storage restricted (Safari private, IE, quota exceeded) — silently ignore */ }
}

function lsRemove(key: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  } catch { /* ignore */ }
}

_accessToken = lsGet('access_token');
_refreshToken = lsGet('refresh_token');

export function setTokens(access: string | null, refresh?: string | null) {
  _accessToken = access;
  access ? lsSet('access_token', access) : lsRemove('access_token');
  if (refresh !== undefined) {
    _refreshToken = refresh;
    refresh ? lsSet('refresh_token', refresh) : lsRemove('refresh_token');
  }
}

export function clearTokens() {
  setTokens(null, null);
}

/**
 * Resolves a coverImageUrl (relative path or legacy absolute URL) to a full URL
 * using the same host as the configured API, so it works on any device/network.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  const path = url.startsWith('http') ? new URL(url).pathname : url;
  return `${API_ORIGIN}${path}`;
}

function buildHeaders(extra?: HeadersInit, token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra as Record<string, string> ?? {}),
  };
  const t = token !== undefined ? token : _accessToken;
  if (t) headers['Authorization'] = `Bearer ${t}`;
  return headers;
}

// Deduplicate concurrent refresh calls
let _refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (_refreshToken) headers['X-Refresh-Token'] = _refreshToken;
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      if (!res.ok) { setTokens(null); return null; }
      const data: { accessToken: string } = await res.json();
      if (data.accessToken) { setTokens(data.accessToken); return data.accessToken; }
      return null;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: buildHeaders(options.headers),
  });

  // Auto-refresh on 401 (skip auth endpoints to avoid loops)
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: buildHeaders(options.headers, newToken),
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg: string = typeof err?.message === 'string' ? err.message : (err?.message?.message ?? 'API error');
    const errors: Record<string, string[]> | undefined = err?.errors;
    const detail = errors ? ` (${Object.entries(errors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join('; ')})` : '';
    throw Object.assign(new Error(msg + detail), { errors });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Compress every image before upload: max 1200 px on longest edge, JPEG quality 0.75.
 *  Looks identical on any phone or laptop screen while keeping files at 100–400 KB.
 *  Falls back to the original file on any canvas error.
 */
function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_PX = 1200;
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          resolve(compressed);
        },
        'image/jpeg',
        0.75,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

/** Upload a file (multipart/form-data). Returns { url } of the saved file.
 *  Automatically compresses image files before upload so they stay within body limits.
 *  @param pathOrFile - Either a File (uploads to /upload) or a path string (e.g. `/news/:id/cover`)
 *  @param file       - Required when pathOrFile is a string path
 */
export async function apiUpload(pathOrFile: File | string, file?: File): Promise<{ url: string }> {
  const path = typeof pathOrFile === 'string' ? pathOrFile : '/upload';
  let f = typeof pathOrFile === 'string' ? file! : pathOrFile;
  if (f.type.startsWith('image/')) f = await compressImage(f);
  const form = new FormData();
  form.append('file', f);
  const headers: Record<string, string> = {};
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
    headers,
    // Do NOT set Content-Type — browser sets it with the multipart boundary
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message ?? 'Upload error');
  }
  return res.json();
}
