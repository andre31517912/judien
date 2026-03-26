'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';

type GroupListItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
  };
  membership: {
    role: 'GROUP_ADMIN' | 'MEMBER';
    status: 'ACCEPTED' | 'PENDING' | 'DECLINED' | 'REMOVED';
    joinedAt: string | null;
  };
};

type MyInvite = {
  id: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
  };
};

type SearchResult = {
  id: string;
  pid: string;
  name: string;
  description: string;
};

export default function MyGroupsPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user, loading } = useAuth();

  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [invites, setInvites] = useState<MyInvite[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');

  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadPage = () => {
    setPageLoading(true);
    setError('');
    Promise.all([
      apiFetch<GroupListItem[]>('/groups/me'),
      apiFetch<MyInvite[]>('/groups/invitations/me'),
    ])
      .then(([g, i]) => {
        setGroups(g.filter((item) => item.membership.status === 'ACCEPTED'));
        setInvites(i.filter((inv) => inv.status === 'PENDING'));
      })
      .catch((err: Error) => setError(err.message ?? 'Failed to load groups.'))
      .finally(() => setPageLoading(false));
  };

  useEffect(() => {
    if (loading || !user) return;
    loadPage();
  }, [loading, user]);

  const handleRespondInvite = async (token: string, accept: boolean) => {
    setRespondingId(token);
    try {
      await apiFetch(`/groups/invitations/${token}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action: accept ? 'accept' : 'decline' }),
      });
      loadPage();
    } catch (err: Error | unknown) {
      setError((err as Error).message ?? 'Failed to respond to invitation.');
    } finally {
      setRespondingId(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    setJoinMsg('');
    try {
      const res = await apiFetch<SearchResult[]>(`/groups/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res);
    } catch (err: Error | unknown) {
      setError((err as Error).message ?? 'Search failed.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRequestJoin = async (groupId: string) => {
    setJoinMsg('');
    try {
      await apiFetch(`/groups/${groupId}/join-requests`, { method: 'POST', body: JSON.stringify({ message: '' }) });
      setJoinMsg(zh ? '加入申請已送出，等待管理員審核。' : 'Join request sent. Awaiting approval.');
    } catch (err: Error | unknown) {
      setJoinMsg((err as Error).message ?? 'Request failed.');
    }
  };

  if (loading || pageLoading) {
    return <p className="py-16 text-center text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>;
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        {zh ? '請先登入。' : 'Please log in first.'}
      </div>
    );
  }

  const pendingInvites = invites;
  const memberGroups = groups;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{zh ? '我的群組' : 'My Groups'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {zh ? '查看您所屬的 Rotary 分組、回應邀請、申請加入新群組。' : 'View your Rotary groups, respond to invitations, and request to join new ones.'}
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-amber-900">
            {zh ? `待處理邀請 (${pendingInvites.length})` : `Pending Invitations (${pendingInvites.length})`}
          </h2>
          <div className="space-y-3">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{inv.group.name}</p>
                  {inv.group.description && (
                    <p className="mt-0.5 text-sm text-gray-500">{inv.group.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {zh ? '到期：' : 'Expires: '}
                    {new Date(inv.expiresAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondInvite(inv.token, true)}
                    disabled={respondingId === inv.token}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {zh ? '接受' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleRespondInvite(inv.token, false)}
                    disabled={respondingId === inv.token}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {zh ? '拒絕' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My groups */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{zh ? '我加入的群組' : 'Groups I Belong To'}</h2>
        {memberGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">{zh ? '您尚未加入任何群組。' : "You haven't joined any groups yet."}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {memberGroups.map(({ group, membership }) => (
              <Link
                key={group.id}
                href={`/${params.locale}/groups/${group.id}`}
                className="block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {group.pid}
                      </span>
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-600">{group.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${membership.role === 'GROUP_ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                      {membership.role === 'GROUP_ADMIN' ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '成員' : 'Member')}
                    </span>
                    {membership.joinedAt && (
                      <span className="text-gray-400">
                        {zh ? '加入於 ' : 'Joined '}
                        {new Date(membership.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Search & request to join */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{zh ? '搜尋並申請加入群組' : 'Search & Request to Join'}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {zh ? '搜尋可加入的公開群組，並送出加入申請。' : 'Find a public group and send a join request.'}
        </p>
        <form onSubmit={handleSearch} className="mt-4 flex gap-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={zh ? '群組名稱或 PID…' : 'Group name or PID…'}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={searchLoading || !searchQuery.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {searchLoading ? (zh ? '搜尋中…' : 'Searching…') : (zh ? '搜尋' : 'Search')}
          </button>
        </form>

        {joinMsg && (
          <p className={`mt-3 text-sm ${joinMsg.includes('sent') || joinMsg.includes('送出') ? 'text-green-600' : 'text-red-500'}`}>
            {joinMsg}
          </p>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            {searchResults.map((result) => {
              const alreadyMember = groups.some((g) => g.group.id === result.id);
              return (
                <div key={result.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{result.name}</p>
                    <p className="text-xs text-gray-500">{result.pid}</p>
                    {result.description && <p className="mt-0.5 text-sm text-gray-500">{result.description}</p>}
                  </div>
                  {alreadyMember ? (
                    <span className="text-xs text-green-600">{zh ? '已加入' : 'Already a member'}</span>
                  ) : (
                    <button
                      onClick={() => handleRequestJoin(result.id)}
                      className="rounded-md border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      {zh ? '申請加入' : 'Request to Join'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !searchLoading && (
          <p className="mt-4 text-sm text-gray-400">{zh ? '未找到符合的群組。' : 'No groups found.'}</p>
        )}
      </section>
    </div>
  );
}
