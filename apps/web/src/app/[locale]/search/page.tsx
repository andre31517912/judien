'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth.context';

// ── Shared types ──────────────────────────────────────────────────────────────

type NewsRow = {
  id: string; title: string; body: string; createdAt: string;
  createdBy: { displayName: string | null } | null;
  group: { id: string; name: string } | null;
};
type EventRow = {
  id: string; title: string; description: string | null; startAt: string;
  createdBy: { displayName: string | null } | null;
  group: { id: string; name: string } | null;
};
type GroupRow = {
  id: string; name: string; description: string;
  _count: { memberships: number };
  discoverableBySearch?: boolean;
  createdBy?: { id: string; displayName: string | null; email: string | null } | null;
  createdAt?: string;
};
type UserRow = {
  id: string; displayName: string | null; email: string | null; phoneE164: string | null;
  role: 'ADMIN' | 'USER'; createdAt: string; lineUserId: string | null;
};
type Results = { users?: UserRow[]; groups: GroupRow[]; news: NewsRow[]; events: EventRow[] };

// ── Page ──────────────────────────────────────────────────────────────────────

function SearchContent({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const endpoint = isAdmin
          ? `/admin/search?q=${encodeURIComponent(q)}&type=all`
          : `/search?q=${encodeURIComponent(q)}`;
        const data = await apiFetch<Results>(endpoint);
        setResults(data);
      } catch { setError(zh ? '搜尋失敗。' : 'Search failed.'); }
      finally { setLoading(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, isAdmin]);

  const del = async (endpoint: string, onSuccess: () => void) => {
    setError('');
    try {
      await apiFetch(endpoint, { method: 'DELETE' });
      onSuccess();
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setDeletingId(null); }
  };

  const deleteUser = (u: UserRow) => {
    if (!confirm(zh ? `確定要永久刪除用戶「${u.displayName ?? u.email}」嗎？` : `Delete user "${u.displayName ?? u.email}"?`)) return;
    setDeletingId(u.id);
    del(`/admin/users/${u.id}`, () =>
      setResults((p) => p ? { ...p, users: p.users?.filter((x) => x.id !== u.id) } : null));
  };

  const deleteNews = (n: NewsRow) => {
    const title = n.title;
    if (!confirm(zh ? `確定要永久刪除貼文「${title}」嗎？` : `Delete post "${title}"?`)) return;
    setDeletingId(n.id);
    del(`/admin/news/${n.id}`, () =>
      setResults((p) => p ? { ...p, news: p.news.filter((x) => x.id !== n.id) } : null));
  };

  const deleteEvent = (e: EventRow) => {
    if (!confirm(zh ? `確定要永久刪除活動「${e.title}」嗎？` : `Delete event "${e.title}"?`)) return;
    setDeletingId(e.id);
    del(`/admin/events/${e.id}`, () =>
      setResults((p) => p ? { ...p, events: p.events.filter((x) => x.id !== e.id) } : null));
  };

  const deleteGroup = (g: GroupRow) => {
    if (!confirm(zh ? `確定要永久刪除群組「${g.name}」嗎？` : `Delete group "${g.name}"?`)) return;
    setDeletingId(g.id);
    del(`/admin/groups/${g.id}`, () =>
      setResults((p) => p ? { ...p, groups: p.groups.filter((x) => x.id !== g.id) } : null));
  };

  const total = results
    ? (results.users?.length ?? 0) + results.news.length + results.events.length + results.groups.length
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{zh ? '搜尋結果' : 'Search results'}</p>
        {q && <h1 className="text-xl font-bold text-gray-900 dark:text-white">"{q}"</h1>}
        {!loading && q && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total === 0
              ? (zh ? '找不到結果' : 'No results found')
              : `${total} ${zh ? '項結果' : total === 1 ? 'result' : 'results'}`}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && !q && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 dark:text-gray-400">{zh ? '輸入關鍵字以搜尋。' : 'Type a keyword in the search bar above.'}</p>
        </div>
      )}

      {!loading && q && results && total === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{zh ? `找不到「${q}」的相關結果` : `No results for "${q}"`}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{zh ? '試試不同的關鍵字' : 'Try a different keyword'}</p>
        </div>
      )}

      {!loading && results && (
        <div className="space-y-8">
          {/* Users (admin only) */}
          {isAdmin && (results.users?.length ?? 0) > 0 && (
            <Section label={`${zh ? '用戶' : 'Users'} · ${results.users!.length}`}>
              {results.users!.map((u) => (
                <Row
                  key={u.id}
                  primary={u.displayName ?? <em className="text-gray-400">{zh ? '未設名稱' : 'No name'}</em>}
                  secondary={[u.email, u.phoneE164].filter(Boolean).join(' · ') || '—'}
                  badge={u.role === 'ADMIN' ? (zh ? '管理員' : 'Admin') : undefined}
                  isAdmin={isAdmin} deletingId={deletingId} id={u.id} zh={zh}
                  onDelete={() => deleteUser(u)}
                />
              ))}
            </Section>
          )}

          {/* Posts */}
          {results.news.length > 0 && (
            <Section label={`${zh ? '貼文' : 'Posts'} · ${results.news.length}`}>
              {results.news.map((n) => (
                <Row
                  key={n.id}
                  primary={<Link href={`/${locale}/news/${n.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">{n.title}</Link>}
                  secondary={`${n.createdBy?.displayName ?? '—'}${n.group ? ` · ${n.group.name}` : ''} · ${new Date(n.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}`}
                  sub={n.body}
                  isAdmin={isAdmin} deletingId={deletingId} id={n.id} zh={zh}
                  onDelete={() => deleteNews(n)}
                />
              ))}
            </Section>
          )}

          {/* Events */}
          {results.events.length > 0 && (
            <Section label={`${zh ? '活動' : 'Events'} · ${results.events.length}`}>
              {results.events.map((e) => (
                <Row
                  key={e.id}
                  primary={e.title}
                  secondary={`${e.createdBy?.displayName ?? '—'}${e.group ? ` · ${e.group.name}` : ''} · ${new Date(e.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}`}
                  sub={e.description ?? undefined}
                  isAdmin={isAdmin} deletingId={deletingId} id={e.id} zh={zh}
                  onDelete={() => deleteEvent(e)}
                />
              ))}
            </Section>
          )}

          {/* Groups */}
          {results.groups.length > 0 && (
            <Section label={`${zh ? '群組' : 'Groups'} · ${results.groups.length}`}>
              {results.groups.map((g) => (
                <Row
                  key={g.id}
                  primary={
                    isAdmin
                      ? <Link href={`/${locale}/admin/groups/${g.id}/settings`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">{g.name}</Link>
                      : <Link href={`/${locale}/groups/${g.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">{g.name}</Link>
                  }
                  secondary={`${g._count.memberships} ${zh ? '位成員' : 'members'}${g.description ? ` · ${g.description}` : ''}`}
                  isAdmin={isAdmin} deletingId={deletingId} id={g.id} zh={zh}
                  onDelete={() => deleteGroup(g)}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{label}</h2>
      <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
        {children}
      </div>
    </section>
  );
}

function Row({
  primary, secondary, sub, badge, id, deletingId, isAdmin, onDelete, zh,
}: {
  primary: React.ReactNode; secondary: string; sub?: string; badge?: string;
  id: string; deletingId: string | null; isAdmin: boolean; onDelete: () => void; zh: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{primary}</span>
          {badge && (
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">{badge}</span>
          )}
        </div>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{sub}</p>}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{secondary}</p>
      </div>
      {isAdmin && (
        <button
          onClick={onDelete}
          disabled={deletingId === id}
          className="shrink-0 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
        >
          {deletingId === id ? '…' : (zh ? '刪除' : 'Delete')}
        </button>
      )}
    </div>
  );
}

export default function SearchPage({ params }: { params: { locale: string } }) {
  return (
    <Suspense>
      <SearchContent locale={params.locale} />
    </Suspense>
  );
}
