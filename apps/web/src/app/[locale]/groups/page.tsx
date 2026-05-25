'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type GroupListItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
  };
  membership: {
    role: 'GROUP_ADMIN' | 'GROUP_MEMBER';
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

type MyPendingRequest = { groupId: string; status: string; createdAt: string };

function SortableGroupRow({ item, locale, zh }: { item: GroupListItem; locale: string; zh: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.group.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-stretch rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"
    >
      {/* Clickable link area */}
      <Link href={`/${locale}/groups/${item.group.id}`} className="flex-1 p-5 block">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.group.name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                item.membership.role === 'GROUP_ADMIN'
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                  : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
              }`}>
                {item.membership.role === 'GROUP_ADMIN'
                  ? (zh ? '群組管理員' : 'Group Admin')
                  : (zh ? '群組成員' : 'Group Member')}
              </span>
            </div>
            {item.group.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.group.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            {item.membership.joinedAt && (
              <span className="text-gray-400 dark:text-gray-500">
                {zh ? '加入於 ' : 'Joined '}
                {new Date(item.membership.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}
              </span>
            )}
          </div>
        </div>
      </Link>
      {/* Drag handle — right side */}
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-10 shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none rounded-r-2xl border-l border-gray-100 dark:border-gray-800"
        tabIndex={-1}
        aria-label={zh ? '拖動以排序' : 'Drag to reorder'}
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
          <rect y="1" width="14" height="1.75" rx="0.875"/>
          <rect y="6.125" width="14" height="1.75" rx="0.875"/>
          <rect y="11.25" width="14" height="1.75" rx="0.875"/>
        </svg>
      </button>
    </div>
  );
}

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
  const [joinSuccess, setJoinSuccess] = useState(false);

  const [myPendingRequests, setMyPendingRequests] = useState<MyPendingRequest[]>([]);
  const [orderedGroups, setOrderedGroups] = useState<GroupListItem[]>([]);

  const [respondingId, setRespondingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedGroups((prev) => {
      const oldIndex = prev.findIndex((g) => g.group.id === active.id);
      const newIndex = prev.findIndex((g) => g.group.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      apiFetch('/groups/me/order', {
        method: 'PATCH',
        body: JSON.stringify({ order: next.map((g) => g.group.id) }),
      }).catch(() => {});
      return next;
    });
  };

  const loadPage = () => {
    setPageLoading(true);
    setError('');
    Promise.all([
      apiFetch<GroupListItem[]>('/groups/me'),
      apiFetch<MyInvite[]>('/groups/invitations/me'),
      apiFetch<MyPendingRequest[]>('/groups/my-join-requests').catch(() => [] as MyPendingRequest[]),
    ])
      .then(([g, i, jr]) => {
        const accepted = g.filter((item) => item.membership.status === 'ACCEPTED');
        setGroups(accepted);
        setOrderedGroups(accepted);
        setInvites(i.filter((inv) => inv.status === 'PENDING'));
        setMyPendingRequests(jr);
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
    setJoinSuccess(false);
    try {
      await apiFetch(`/groups/${groupId}/join-requests`, { method: 'POST', body: JSON.stringify({ message: '' }) });
      setJoinSuccess(true);
      setJoinMsg(zh ? '加入申請已送出，等待管理員審核。' : 'Join request sent. Awaiting approval.');
      setMyPendingRequests((prev) => [...prev.filter((r) => r.groupId !== groupId), { groupId, status: 'PENDING', createdAt: new Date().toISOString() }]);
    } catch (err: Error | unknown) {
      setJoinSuccess(false);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{zh ? '我的群組' : 'My Groups'}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {zh ? '查看您所屬的 Rotary 分組、回應邀請、申請加入新群組。' : 'View your Rotary groups, respond to invitations, and request to join new ones.'}
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <section className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-amber-900 dark:text-amber-300">
            {zh ? `待處理邀請 (${pendingInvites.length})` : `Pending Invitations (${pendingInvites.length})`}
          </h2>
          <div className="space-y-3">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{inv.group.name}</p>
                  {inv.group.description && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{inv.group.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
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
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{zh ? '我加入的群組' : 'Groups I Belong To'}</h2>
        {memberGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{zh ? '您尚未加入任何群組。' : "You haven't joined any groups yet."}</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedGroups.map((g) => g.group.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-4">
                {orderedGroups.map((item) => (
                  <SortableGroupRow key={item.group.id} item={item} locale={params.locale} zh={zh} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* Search & request to join */}
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '搜尋並申請加入群組' : 'Search & Request to Join'}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {zh ? '搜尋可加入的公開群組，並送出加入申請。' : 'Find a public group and send a join request.'}
        </p>
        <form onSubmit={handleSearch} className="mt-4 flex gap-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={zh ? '輸入群組名稱…' : 'Search by group name…'}
            className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
          <p className={`mt-3 text-sm ${joinSuccess ? 'text-green-600' : 'text-red-500'}`}>
            {joinMsg}
          </p>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            {searchResults.map((result) => {
              const alreadyMember = groups.some((g) => g.group.id === result.id);
              const hasPending = myPendingRequests.some((r) => r.groupId === result.id);
              return (
                <div key={result.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{result.name}</p>
                    {result.description && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{result.description}</p>}
                  </div>
                  {alreadyMember ? (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">{zh ? '已加入' : 'Already a member'}</span>
                  ) : hasPending ? (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-xs font-medium">
                      {zh ? '申請審核中' : 'Request pending'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRequestJoin(result.id)}
                      className="rounded-md border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
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
          <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">{zh ? '未找到符合的群組。' : 'No groups found.'}</p>
        )}
      </section>
    </div>
  );
}
