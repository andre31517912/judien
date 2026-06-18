'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth.context';
import type { EventWithCounts, News, PaginatedResponse } from '@judien/shared';

type GroupResult = { id: string; name: string; description: string; memberCount?: number };
type UserResult = { id: string; displayName: string | null; email: string; phoneE164: string | null; role: string };

export default function SearchPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [posts, setPosts] = useState<News[]>([]);
  const [people, setPeople] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim() || !user) return;
    setLoading(true);
    setEvents([]);
    setGroups([]);
    setPosts([]);
    setPeople([]);

    const enc = encodeURIComponent(q.trim());
    const fetches: Promise<unknown>[] = [
      apiFetch<PaginatedResponse<EventWithCounts>>(`/events?scope=future&q=${enc}&pageSize=10`)
        .then((r) => setEvents(r.data))
        .catch(() => {}),
      apiFetch<PaginatedResponse<EventWithCounts>>(`/events?scope=past&q=${enc}&pageSize=5`)
        .then((r) => setEvents((prev) => [...prev, ...r.data]))
        .catch(() => {}),
      apiFetch<GroupResult[]>(`/groups/search?q=${enc}`)
        .then(setGroups)
        .catch(() => {}),
      apiFetch<News[]>(`/news?q=${enc}`)
        .then(setPosts)
        .catch(() => {}),
    ];

    if (user.role === 'ADMIN') {
      fetches.push(
        apiFetch<{ users: UserResult[] }>(`/admin/search?q=${enc}&type=user`)
          .then((r) => setPeople(r.users))
          .catch(() => {}),
      );
    }

    Promise.all(fetches).finally(() => setLoading(false));
  }, [q, user]);

  const total = events.length + groups.length + posts.length + people.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{zh ? '搜尋結果' : 'Search results'}</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {q ? `"${q}"` : ''}
        </h1>
        {!loading && q && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total === 0
              ? (zh ? '找不到結果' : 'No results found')
              : `${total} ${zh ? '項結果' : total === 1 ? 'result' : 'results'}`}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && q && total === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {zh ? `找不到「${q}」的相關結果` : `No results for "${q}"`}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {zh ? '試試不同的關鍵字' : 'Try a different keyword'}
          </p>
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {zh ? '活動' : 'Events'} · {events.length}
          </h2>
          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {events.map((ev) => (
              <Link
                key={ev.id}
                href={`/${params.locale}/events/${ev.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{zh ? ev.title_zh : ev.title_en}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(ev.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}
                    {(zh ? ev.location_zh : ev.location_en) && ` · ${zh ? ev.location_zh : ev.location_en}`}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {zh ? '群組' : 'Groups'} · {groups.length}
          </h2>
          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/${params.locale}/groups/${g.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{g.name}</p>
                  {g.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{g.description}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Posts / News */}
      {posts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {zh ? '動態' : 'Posts'} · {posts.length}
          </h2>
          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {posts.map((post) => (
              <div key={post.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{zh ? post.title_zh : post.title_en}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {zh ? post.body_zh : post.body_en}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {(post as any).group?.name && `${(post as any).group.name} · `}
                      {post.createdAt && new Date(post.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* People (admin only) */}
      {people.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {zh ? '用戶' : 'People'} · {people.length}
          </h2>
          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/${params.locale}/admin/lookup?userId=${p.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.displayName || p.email}</p>
                    {p.role === 'ADMIN' && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shrink-0">
                        {zh ? '管理員' : 'Admin'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{[p.email, p.phoneE164].filter(Boolean).join(' · ')}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
