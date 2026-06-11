'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';

type UserRow = {
  id: string;
  displayName: string | null;
  email: string | null;
  phoneE164: string | null;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  lineUserId: string | null;
  _count?: { groupMemberships: number };
};

type GroupRow = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  discoverableBySearch?: boolean;
  _count: { memberships: number };
  createdBy: { id: string; displayName: string | null; email: string | null } | null;
};

type SearchResults = { users: UserRow[]; groups: GroupRow[] };
type PagedUsers = { total: number; page: number; pageSize: number; data: UserRow[] };
type PagedGroups = { total: number; page: number; pageSize: number; data: GroupRow[] };

export default function AdminLookupPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user, loading } = useAuth();
  const router = useRouter();

  // Search
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'user' | 'group'>('all');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browse tabs
  const [tab, setTab] = useState<'search' | 'users' | 'groups'>('search');

  // All users
  const [usersPage, setUsersPage] = useState(1);
  const [usersData, setUsersData] = useState<PagedUsers | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  // All groups
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsData, setGroupsData] = useState<PagedGroups | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  useEffect(() => {
    if (!loading && user && user.role !== 'ADMIN') router.replace(`/${params.locale}/events`);
  }, [loading, user]);

  // Debounced search
  useEffect(() => {
    if (tab !== 'search') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch<SearchResults>(`/admin/search?q=${encodeURIComponent(query)}&type=${searchType}`);
        setSearchResults(data);
      } catch { setSearchResults(null); }
      finally { setSearching(false); }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchType, tab]);

  const loadUsers = async (page: number) => {
    setUsersLoading(true);
    try {
      const data = await apiFetch<PagedUsers>(`/admin/users?page=${page}&pageSize=${PAGE_SIZE}`);
      setUsersData(data);
      setUsersPage(page);
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setUsersLoading(false); }
  };

  const loadGroups = async (page: number) => {
    setGroupsLoading(true);
    try {
      const data = await apiFetch<PagedGroups>(`/admin/groups?page=${page}&pageSize=${PAGE_SIZE}`);
      setGroupsData(data);
      setGroupsPage(page);
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setGroupsLoading(false); }
  };

  useEffect(() => {
    if (tab === 'users' && !usersData) loadUsers(1);
    if (tab === 'groups' && !groupsData) loadGroups(1);
  }, [tab]);

  const handleDeleteUser = async (u: UserRow) => {
    if (!confirm(zh
      ? `確定要永久刪除用戶「${u.displayName ?? u.email ?? u.id}」嗎？此操作無法復原。`
      : `Permanently delete user "${u.displayName ?? u.email ?? u.id}"? This cannot be undone.`)) return;
    setDeletingId(u.id);
    setError('');
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: 'DELETE' });
      setSearchResults((prev) => prev ? { ...prev, users: prev.users.filter((x) => x.id !== u.id) } : null);
      setUsersData((prev) => prev ? { ...prev, total: prev.total - 1, data: prev.data.filter((x) => x.id !== u.id) } : null);
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setDeletingId(null); }
  };

  const handleDeleteGroup = async (g: GroupRow) => {
    if (!confirm(zh
      ? `確定要永久刪除群組「${g.name}」嗎？此操作無法復原。`
      : `Permanently delete group "${g.name}"? This cannot be undone.`)) return;
    setDeletingId(g.id);
    setError('');
    try {
      await apiFetch(`/admin/groups/${g.id}`, { method: 'DELETE' });
      setSearchResults((prev) => prev ? { ...prev, groups: prev.groups.filter((x) => x.id !== g.id) } : null);
      setGroupsData((prev) => prev ? { ...prev, total: prev.total - 1, data: prev.data.filter((x) => x.id !== g.id) } : null);
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setDeletingId(null); }
  };

  if (loading || !user) return <p className="py-16 text-center text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>;
  if (user.role !== 'ADMIN') return null;

  const TABS = [
    { key: 'search' as const, label: zh ? '搜尋' : 'Search' },
    { key: 'users' as const, label: zh ? '所有用戶' : 'All Users' },
    { key: 'groups' as const, label: zh ? '所有群組' : 'All Groups' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{zh ? '平台管理 — 查詢' : 'Platform Lookup'}</h1>
      </div>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setError(''); }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search tab ── */}
      {tab === 'search' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={zh ? '輸入姓名、電子郵件、手機或群組名稱…' : 'Name, email, phone, or group name…'}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as typeof searchType)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="all">{zh ? '全部' : 'All'}</option>
              <option value="user">{zh ? '用戶' : 'Users'}</option>
              <option value="group">{zh ? '群組' : 'Groups'}</option>
            </select>
          </div>

          {searching && <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '搜尋中…' : 'Searching…'}</p>}

          {searchResults && (
            <div className="space-y-6">
              {/* User results */}
              {searchResults.users.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {zh ? '用戶' : 'Users'} ({searchResults.users.length})
                  </h3>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {searchResults.users.map((u) => (
                      <UserRowItem key={u.id} u={u} zh={zh} deleting={deletingId === u.id} onDelete={() => handleDeleteUser(u)} locale={params.locale} />
                    ))}
                  </div>
                </div>
              )}

              {/* Group results */}
              {searchResults.groups.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {zh ? '群組' : 'Groups'} ({searchResults.groups.length})
                  </h3>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {searchResults.groups.map((g) => (
                      <GroupRowItem key={g.id} g={g} zh={zh} deleting={deletingId === g.id} onDelete={() => handleDeleteGroup(g)} locale={params.locale} />
                    ))}
                  </div>
                </div>
              )}

              {searchResults.users.length === 0 && searchResults.groups.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '找不到符合結果。' : 'No results found.'}</p>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── All Users tab ── */}
      {tab === 'users' && (
        <div className="space-y-3">
          {usersData && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {zh ? `共 ${usersData.total} 位用戶` : `${usersData.total} total users`}
            </p>
          )}
          {usersLoading
            ? <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '載入中…' : 'Loading…'}</p>
            : usersData && (
              <>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  {usersData.data.map((u) => (
                    <UserRowItem key={u.id} u={u} zh={zh} deleting={deletingId === u.id} onDelete={() => handleDeleteUser(u)} locale={params.locale} />
                  ))}
                </div>
                <Pagination total={usersData.total} page={usersPage} pageSize={PAGE_SIZE} zh={zh} onChange={(p) => loadUsers(p)} />
              </>
            )
          }
        </div>
      )}

      {/* ── All Groups tab ── */}
      {tab === 'groups' && (
        <div className="space-y-3">
          {groupsData && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {zh ? `共 ${groupsData.total} 個群組` : `${groupsData.total} total groups`}
            </p>
          )}
          {groupsLoading
            ? <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '載入中…' : 'Loading…'}</p>
            : groupsData && (
              <>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  {groupsData.data.map((g) => (
                    <GroupRowItem key={g.id} g={g} zh={zh} deleting={deletingId === g.id} onDelete={() => handleDeleteGroup(g)} locale={params.locale} />
                  ))}
                </div>
                <Pagination total={groupsData.total} page={groupsPage} pageSize={PAGE_SIZE} zh={zh} onChange={(p) => loadGroups(p)} />
              </>
            )
          }
        </div>
      )}
    </div>
  );
}

function UserRowItem({ u, zh, deleting, onDelete, locale }: { u: UserRow; zh: boolean; deleting: boolean; onDelete: () => void; locale: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-900 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {u.displayName ?? <span className="italic text-gray-400">{zh ? '未設名稱' : 'No name'}</span>}
          </span>
          {u.role === 'ADMIN' && (
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {zh ? '平台管理員' : 'Platform Admin'}
            </span>
          )}
          {u.lineUserId && (
            <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">LINE</span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
          {[u.email, u.phoneE164].filter(Boolean).join(' · ') || '—'}
        </p>
        {u._count && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {u._count.groupMemberships} {zh ? '個群組' : 'groups'}
            {' · '}
            {new Date(u.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}
          </p>
        )}
      </div>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="shrink-0 rounded-md border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
      >
        {deleting ? '…' : (zh ? '刪除' : 'Delete')}
      </button>
    </div>
  );
}

function GroupRowItem({ g, zh, deleting, onDelete, locale }: { g: GroupRow; zh: boolean; deleting: boolean; onDelete: () => void; locale: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-900 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/${locale}/admin/groups/${g.id}/settings`}
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate"
          >
            {g.name}
          </Link>
          {g.discoverableBySearch === false && (
            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">{zh ? '私密' : 'Private'}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
          {g._count.memberships} {zh ? '位成員' : 'members'}
          {g.createdBy ? ` · ${zh ? '建立者：' : 'by '}${g.createdBy.displayName ?? g.createdBy.email ?? '—'}` : ''}
          {' · '}
          {new Date(g.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}
        </p>
        {g.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{g.description}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="shrink-0 rounded-md border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
      >
        {deleting ? '…' : (zh ? '刪除' : 'Delete')}
      </button>
    </div>
  );
}

function Pagination({ total, page, pageSize, zh, onChange }: { total: number; page: number; pageSize: number; zh: boolean; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
      >
        {zh ? '上一頁' : 'Prev'}
      </button>
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
      >
        {zh ? '下一頁' : 'Next'}
      </button>
    </div>
  );
}
