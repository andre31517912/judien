'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch, resolveImageUrl } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
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
    photoUrl: string | null;
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
      className="flex items-stretch rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
    >
      {/* Full-height left photo */}
      <div className="w-20 shrink-0 bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
        {item.group.photoUrl ? (
          <div className="relative w-full h-full">
            <Image src={resolveImageUrl(item.group.photoUrl) ?? ''} alt="" fill className="object-cover" />
          </div>
        ) : (
          <svg className="w-7 h-7 text-indigo-300 dark:text-indigo-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        )}
      </div>
      <Link href={`/${locale}/groups/${item.group.id}`} className="flex-1 flex items-center px-4 py-4">
        {/* Text */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{item.group.name}</h3>
          {item.group.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.group.description}</p>
          )}
          {item.membership.joinedAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {zh ? '加入於 ' : 'Joined '}
              {new Date(item.membership.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}
            </p>
          )}
        </div>
      </Link>
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-10 shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none border-l border-gray-100 dark:border-gray-800"
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
  const searchParams = useSearchParams();
  const router = useRouter();

  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [invites, setInvites] = useState<MyInvite[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  // Search query comes from URL ?q= param (set by the NavBar search input)
  const searchQuery = searchParams.get('q') ?? '';
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

  // Auto-trigger group search when URL ?q= param changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    setJoinMsg('');
    apiFetch<SearchResult[]>(`/groups/search?q=${encodeURIComponent(searchQuery.trim())}`)
      .then((res) => { if (!cancelled) setSearchResults(res); })
      .catch((err: Error | unknown) => { if (!cancelled) setError((err as Error).message ?? 'Search failed.'); })
      .finally(() => { if (!cancelled) setSearchLoading(false); });
    return () => { cancelled = true; };
  }, [searchQuery]);

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
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-end gap-4">
        <Link
          href={`/${params.locale}/admin/groups/new`}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm transition-colors"
        >
          {zh ? '+ 建立群組' : '+ Create Group'}
        </Link>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Search loading indicator */}
      {searchLoading && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}

      {joinMsg && (
        <p className={`text-sm ${joinSuccess ? 'text-green-600' : 'text-red-500'}`}>{joinMsg}</p>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-3">
          {searchResults.map((result) => {
            const alreadyMember = groups.some((g) => g.group.id === result.id);
            const hasPending = myPendingRequests.some((r) => r.groupId === result.id);
            return (
              <div key={result.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
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
                    className="rounded-lg border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                  >
                    {zh ? '申請加入' : 'Request to Join'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {searchResults.length === 0 && searchQuery.trim() && !searchLoading && (
        <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '未找到符合的群組。' : 'No groups found.'}</p>
      )}

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
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {zh ? '接受' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleRespondInvite(inv.token, false)}
                    disabled={respondingId === inv.token}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {zh ? '拒絕' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My groups list */}
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
    </div>
  );
}
