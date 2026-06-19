'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
const GroupHierarchyChart = dynamic(() => import('@/components/GroupHierarchyChart'), { ssr: false });
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload, resolveImageUrl } from '@/lib/api';
import type { EventWithCounts, News, PaginatedResponse } from '@judien/shared';

type AdminGroupItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    photoUrl: string | null;
    discoverableBySearch: boolean;
  };
  membership: {
    role: 'GROUP_ADMIN' | 'GROUP_MEMBER';
    status: 'ACCEPTED' | 'PENDING' | 'DECLINED' | 'REMOVED';
    joinedAt: string | null;
  };
};

type GroupMember = {
  userId: string;
  groupNickname: string | null;
  displayName: string | null;
  role: 'GROUP_ADMIN' | 'GROUP_MEMBER';
  joinedAt: string | null;
  email: string | null;
  phoneE164: string | null;
};

type JoinRequest = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  requester: { id: string; displayName: string | null; email: string };
};

type SubgroupInfo = { id: string; name: string; description?: string };
type RelationshipsData = {
  parentGroup: SubgroupInfo | null;
  subgroups: SubgroupInfo[];
  lineage?: Array<{ id: string; name: string }>;
  tree?: Array<SubgroupInfo & { children: SubgroupInfo[] }>;
};

export default function AdminGroupPage({ params }: { params: { locale: string; groupId: string } }) {
  const zh = params.locale === 'zh';
  const { user, loading } = useAuth();

  const [groupItem, setGroupItem] = useState<AdminGroupItem | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  type ViewTab = 'feed' | 'upcoming' | 'past' | 'members';
  const [viewTab, setViewTab] = useState<ViewTab>('feed');
  const [pastEvents, setPastEvents] = useState<EventWithCounts[]>([]);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);

  // Create post / event inline
  const [composingNews, setComposingNews] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: '', body: '' });
  const [newsLoading, setNewsLoading] = useState(false);
  const [composingEvent, setComposingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' });
  const [eventLoading, setEventLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', body: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [relationships, setRelationships] = useState<RelationshipsData | null>(null);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);

  // Member search + nickname
  const [memberSearch, setMemberSearch] = useState('');
  const [editingNicknameUserId, setEditingNicknameUserId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  const handleSaveNickname = async (memberId: string) => {
    setNicknameSaving(true); setError('');
    try {
      const endpoint = memberId === user?.id
        ? `/groups/${params.groupId}/members/me/nickname`
        : `/groups/${params.groupId}/members/${memberId}/nickname`;
      await apiFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ groupNickname: nicknameInput.trim() || null }) });
      setMembers((prev) => prev.map((m) => m.userId === memberId ? { ...m, groupNickname: nicknameInput.trim() || null } : m));
      setEditingNicknameUserId(null);
    } catch (err: unknown) { setError((err as Error).message ?? 'Failed to save nickname.'); }
    finally { setNicknameSaving(false); }
  };

  const loadRelationships = async () => {
    setRelationshipsLoading(true);
    try {
      const data = await apiFetch<RelationshipsData>(`/groups/${params.groupId}/relationships`);
      setRelationships(data);
    } finally {
      setRelationshipsLoading(false);
    }
  };

  const loadPage = async () => {
    setPageLoading(true);
    setError('');
    try {
      const [groups, memberList, groupNews, groupEvents] = await Promise.all([
        apiFetch<AdminGroupItem[]>('/groups/me'),
        apiFetch<GroupMember[]>(`/groups/${params.groupId}/members`),
        apiFetch<News[]>(`/news?groupId=${params.groupId}`),
        apiFetch<PaginatedResponse<EventWithCounts>>(`/events?scope=future&groupId=${params.groupId}&page=1&pageSize=20`),
      ]);
      const current = groups.find((item) => item.group.id === params.groupId) ?? null;
      setGroupItem(current);
      setMembers(memberList);
      setNews(groupNews);
      setEvents(groupEvents.data);
      const reqRes = await apiFetch<JoinRequest[]>(`/groups/${params.groupId}/join-requests`).catch(() => [] as JoinRequest[]);
      setJoinRequests((reqRes ?? []).filter((r) => r.status === 'PENDING'));
      if (!current) setError(zh ? '找不到此群組。' : 'Group not found.');
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load group.');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !user) return;
    loadPage();
  }, [loading, user, params.groupId]);

  const loadPastEvents = async () => {
    if (pastLoaded) return;
    setPastLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<EventWithCounts>>(
        `/events?scope=past&groupId=${params.groupId}&page=1&pageSize=40`,
      );
      setPastEvents(res.data);
      setPastLoaded(true);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load past events.');
    } finally {
      setPastLoading(false);
    }
  };

  useEffect(() => {
    if (viewTab === 'past' && user) loadPastEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab]);

  const handleRemoveMember = async (memberUserId: string) => {
    if (!confirm(zh ? '確定要移除此成員嗎？' : 'Remove this member?')) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/${params.groupId}/members/${memberUserId}`, { method: 'DELETE' });
      setSuccess(zh ? '成員已移除。' : 'Member removed.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to remove member.');
    }
  };

  const handleChangeRole = async (memberUserId: string, currentRole: 'GROUP_ADMIN' | 'GROUP_MEMBER') => {
    const newRole = currentRole === 'GROUP_ADMIN' ? 'GROUP_MEMBER' : 'GROUP_ADMIN';
    if (!confirm(newRole === 'GROUP_ADMIN' ? (zh ? '升為管理員？' : 'Promote to admin?') : (zh ? '降為成員？' : 'Demote to member?'))) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/${params.groupId}/members/${memberUserId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setSuccess(zh ? '成員角色已更新。' : 'Member role updated.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to change role.');
    }
  };

  const handleReviewJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setReviewingId(requestId);
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/join-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (action === 'approve') await loadPage();
      setSuccess(action === 'approve' ? (zh ? '已批准加入申請。' : 'Request approved.') : (zh ? '已拒絕加入申請。' : 'Request declined.'));
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to review request.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsForm.title.trim() || !newsForm.body.trim()) return;
    setNewsLoading(true);
    setError('');
    try {
      await apiFetch('/news', {
        method: 'POST',
        body: JSON.stringify({ groupId: params.groupId, title_en: newsForm.title, title_zh: newsForm.title, body_en: newsForm.body, body_zh: newsForm.body }),
      });
      setNewsForm({ title: '', body: '' });
      setComposingNews(false);
      setSuccess(zh ? '公告已發布。' : 'Post published.');
      await loadPage();
    } catch (err: unknown) { setError((err as Error).message ?? 'Failed.'); }
    finally { setNewsLoading(false); }
  };

  const handleUpdateNews = async (id: string) => {
    if (!editForm.title.trim() || !editForm.body.trim()) return;
    setEditSaving(true);
    setError('');
    try {
      await apiFetch(`/news/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title_en: editForm.title, title_zh: editForm.title, body_en: editForm.body, body_zh: editForm.body }),
      });
      setEditingId(null);
      await loadPage();
    } catch (err: unknown) { setError((err as Error).message ?? 'Failed.'); }
    finally { setEditSaving(false); }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm(zh ? '確定要刪除此公告嗎？' : 'Delete this post?')) return;
    setError('');
    try {
      await apiFetch(`/news/${id}`, { method: 'DELETE' });
      await loadPage();
    } catch (err: unknown) { setError((err as Error).message ?? 'Failed.'); }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.startAt) return;
    setEventLoading(true);
    setError('');
    try {
      let coverImageUrl: string | undefined;
      if (coverFile) {
        const uploadRes = await apiUpload(coverFile);
        coverImageUrl = uploadRes.url;
      }
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify({ groupId: params.groupId, title_en: eventForm.title, title_zh: eventForm.title, description_en: eventForm.description, description_zh: eventForm.description, location_en: eventForm.location, location_zh: eventForm.location, startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : undefined, endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : undefined, timezone: eventForm.timezone, feeAmount: eventForm.feeAmount ? parseFloat(eventForm.feeAmount) : undefined, feeCurrency: eventForm.feeCurrency, ...(coverImageUrl ? { coverImageUrl } : {}) }),
      });
      setEventForm({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' });
      setCoverFile(null);
      setCoverPreview(null);
      setComposingEvent(false);
      setSuccess(zh ? '活動已建立。' : 'Event created.');
      await loadPage();
    } catch (err: unknown) { setError((err as Error).message ?? 'Failed.'); }
    finally { setEventLoading(false); }
  };

  if (loading || pageLoading) return <p className="py-16 text-center text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>;

  const isPlatformAdmin = user?.role === 'ADMIN';
  const isGroupAdmin = groupItem?.membership.role === 'GROUP_ADMIN';

  if (!user || (!isPlatformAdmin && !isGroupAdmin)) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{zh ? '您沒有管理此群組的權限。' : 'You do not have permission to manage this group.'}</div>;
  }

  if (!groupItem) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{error || (zh ? '找不到此群組。' : 'Group not found.')}</div>;
  }

  const { group } = groupItem;

  const VIEW_TABS: { key: ViewTab; label: string; labelZh: string }[] = [
    { key: 'feed',     label: 'Feed',     labelZh: '動態' },
    { key: 'upcoming', label: 'Upcoming', labelZh: '即將到來' },
    { key: 'past',     label: 'Past',     labelZh: '過去活動' },
    { key: 'members',  label: 'Members',  labelZh: '成員' },
  ];

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      {/* ── Group cover header ── */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950">
        <div className="relative">
          {group.photoUrl ? (
            <div className="relative w-full h-40 sm:h-56">
              <Image src={resolveImageUrl(group.photoUrl) ?? ''} alt={group.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-full h-40 sm:h-56 bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <svg className="w-14 h-14 text-indigo-300 dark:text-indigo-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
          )}
        </div>
        <div className="px-4 pb-4 pt-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">{group.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await loadRelationships();
                  setShowRelationships(true);
                }}
                disabled={relationshipsLoading}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {relationshipsLoading ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-indigo-500">
                    <path d="M2 3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3ZM2 10a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3ZM9 3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3ZM13 9.5a.5.5 0 0 0-1 0V11H9.5a.5.5 0 0 0 0 1H12v1.5a.5.5 0 0 0 1 0V12h1.5a.5.5 0 0 0 0-1H13V9.5Z" />
                  </svg>
                )}
                {zh ? '層級圖' : 'Hierarchy'}
              </button>
              {joinRequests.length > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {joinRequests.length} {zh ? '待審核' : 'pending'}
                </span>
              )}
              <Link
                href={`/${params.locale}/admin/groups/${params.groupId}/settings`}
                className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
              >
                ⚙️ {zh ? '群組設定' : 'Settings'}
              </Link>
            </div>
          </div>
        

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        {success && <p className="mb-3 text-sm text-green-600">{success}</p>}

        {/* ── Tab bar ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {VIEW_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setViewTab(t.key)}
                className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewTab === t.key
                    ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {zh ? t.labelZh : t.label}
              </button>
            ))}
          </div>
          {(isGroupAdmin || isPlatformAdmin) && viewTab === 'feed' && (
            <button
              onClick={() => { setComposingNews((v) => !v); setNewsForm({ title: '', body: '' }); }}
              className="shrink-0 bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 font-medium transition-colors"
            >
              {composingNews ? (zh ? '取消' : 'Cancel') : `＋ ${zh ? '發布公告' : 'Create Post'}`}
            </button>
          )}
          {(isGroupAdmin || isPlatformAdmin) && (viewTab === 'upcoming' || viewTab === 'past') && (
            <button
              onClick={() => { setComposingEvent((v) => !v); setEventForm({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' }); }}
              className="shrink-0 bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 font-medium transition-colors"
            >
              {composingEvent ? (zh ? '取消' : 'Cancel') : `＋ ${zh ? '建立活動' : 'Create Event'}`}
            </button>
          )}
        </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 dark:bg-black min-h-screen">

        {/* Feed */}
        {viewTab === 'feed' && (
          <div className="space-y-4">
            {composingNews && (isGroupAdmin || isPlatformAdmin) && (
              <form onSubmit={handleCreateNews} className="rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{zh ? '發布公告' : 'Create Post'}</h3>
                <input required value={newsForm.title} onChange={(e) => setNewsForm((f) => ({ ...f, title: e.target.value }))} placeholder={zh ? '標題' : 'Title'} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <textarea required value={newsForm.body} onChange={(e) => setNewsForm((f) => ({ ...f, body: e.target.value }))} placeholder={zh ? '內容' : 'Body'} rows={3} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <div className="flex gap-2">
                  <button type="submit" disabled={newsLoading || !newsForm.title.trim() || !newsForm.body.trim()} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                    {newsLoading ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布' : 'Post')}
                  </button>
                  <button type="button" onClick={() => { setComposingNews(false); setNewsForm({ title: '', body: '' }); }} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                    {zh ? '取消' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
            {editingId && (
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{zh ? '編輯公告' : 'Edit Post'}</h3>
                <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} placeholder={zh ? '標題' : 'Title'} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <textarea value={editForm.body} onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))} placeholder={zh ? '內容' : 'Body'} rows={3} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    {zh ? '取消' : 'Cancel'}
                  </button>
                  <button onClick={() => handleUpdateNews(editingId)} disabled={editSaving} className="rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                    {editSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
                  </button>
                </div>
              </div>
            )}
            {news.length === 0 && !composingNews ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-gray-500 dark:text-gray-400">{zh ? '目前沒有公告，一切都是最新的！' : "No news yet — you're all caught up!"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {news.map((item) => {
                  const hash = item.id.charCodeAt(0) + (item.id.charCodeAt(2) ?? 0);
                  const gradients = ['from-violet-500 to-indigo-600','from-rose-500 to-pink-600','from-teal-500 to-cyan-600','from-amber-500 to-orange-600','from-emerald-500 to-green-600','from-sky-500 to-blue-600','from-fuchsia-500 to-purple-600'];
                  const grad = gradients[hash % gradients.length];
                  const initial = (item.createdBy?.displayName?.[0] ?? '?').toUpperCase();
                  return (
                    <div key={item.id} className={`relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${grad} shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5`}>
                      <div className="absolute inset-0 bg-black/15" />
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                        <button
                          onClick={() => { setEditingId(item.id); setEditForm({ title: zh ? item.title_zh : item.title_en, body: zh ? item.body_zh : item.body_en }); }}
                          className="w-6 h-6 rounded-full bg-black/30 text-white text-xs hover:bg-black/55 flex items-center justify-center backdrop-blur-sm"
                        >✎</button>
                        <button
                          onClick={() => handleDeleteNews(item.id)}
                          className="w-6 h-6 rounded-full bg-black/30 text-white text-xs hover:bg-red-500/80 flex items-center justify-center backdrop-blur-sm"
                        >✕</button>
                      </div>
                      <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                        <div className="flex-1 overflow-hidden mt-7">
                          <h2 className="font-bold text-white text-sm line-clamp-3 leading-snug">{zh ? item.title_zh : item.title_en}</h2>
                          <p className="text-white/75 text-xs mt-1.5 line-clamp-4 leading-relaxed">{zh ? item.body_zh : item.body_en}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white text-[9px] font-bold shrink-0">{initial}</div>
                          <div className="min-w-0">
                            {item.createdBy?.displayName && <p className="text-[11px] font-medium text-white/90 truncate leading-none">{item.createdBy.displayName}</p>}
                            <p className="text-[10px] text-white/60">{new Date(item.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'short' })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upcoming events */}
        {viewTab === 'upcoming' && (
          <div className="space-y-4">
            {composingEvent && (isGroupAdmin || isPlatformAdmin) && (
              <form onSubmit={handleCreateEvent} className="rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{zh ? '建立活動' : 'Create Event'}</h3>
                <input required value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} placeholder={zh ? '活動名稱' : 'Event title'} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <input value={eventForm.location} onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))} placeholder={zh ? '地點' : 'Location'} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <textarea value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} placeholder={zh ? '描述（選填）' : 'Description (optional)'} rows={2} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '開始' : 'Start'}</label>
                    <input required type="datetime-local" value={eventForm.startAt} onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '結束（選填）' : 'End (optional)'}</label>
                    <input type="datetime-local" value={eventForm.endAt} onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '時區' : 'Timezone'}</label>
                    <input value={eventForm.timezone} onChange={(e) => setEventForm((f) => ({ ...f, timezone: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '費用' : 'Fee'}</label>
                    <input type="number" min="0" value={eventForm.feeAmount} onChange={(e) => setEventForm((f) => ({ ...f, feeAmount: e.target.value }))} placeholder="0" className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '幣別' : 'Currency'}</label>
                    <input value={eventForm.feeCurrency} onChange={(e) => setEventForm((f) => ({ ...f, feeCurrency: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '封面照片（選填）' : 'Cover Photo (optional)'}</label>
                  <div
                    onClick={() => coverFileRef.current?.click()}
                    className="relative w-full h-44 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer overflow-hidden flex items-center justify-center transition"
                  >
                    {coverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">{zh ? '點擊上傳照片' : 'Click to upload a photo'}</span>
                      </div>
                    )}
                    {coverPreview && (
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}
                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70">✕</button>
                    )}
                  </div>
                  <input ref={coverFileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }} className="hidden" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={eventLoading || !eventForm.title.trim() || !eventForm.startAt} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                    {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立' : 'Create')}
                  </button>
                  <button type="button" onClick={() => { setComposingEvent(false); setEventForm({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' }); setCoverFile(null); setCoverPreview(null); }} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                    {zh ? '取消' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
            {events.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📅</p>
                <p className="text-gray-500 dark:text-gray-400">{zh ? '目前沒有活動，一切都是最新的！' : "No events yet — you're all caught up!"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {events.map((ev) => {
                  const coverUrl = resolveImageUrl(ev.coverImageUrl);
                  const hash = (ev.id.charCodeAt(0) ?? 0) + (ev.id.charCodeAt(2) ?? 0);
                  const gradients = ['from-indigo-400 to-violet-500','from-rose-400 to-pink-500','from-amber-400 to-orange-500','from-teal-400 to-cyan-500','from-purple-400 to-indigo-500','from-sky-400 to-blue-500','from-emerald-400 to-teal-500'];
                  const emojis = ['🎉','🎊','🍻','🎸','🌟','🎨','🏃','☕','🎭','🎤','🎮','🌸'];
                  const grad = gradients[hash % gradients.length];
                  const emoji = emojis[hash % emojis.length];
                  const fee = ev.feeAmount ? `${ev.feeCurrency} ${ev.feeAmount}` : null;
                  const dayStr = new Date(ev.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
                  const timeStr = new Date(ev.startAt).toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });
                  return (
                    <Link key={ev.id} href={`/${params.locale}/events/${ev.id}`} className="group relative block aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                      {coverUrl ? (
                        <Image src={coverUrl} alt={zh ? ev.title_zh : ev.title_en} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${grad} flex items-center justify-center`}>
                          <span className="text-5xl opacity-90 select-none">{emoji}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      {fee && (
                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/90 text-white backdrop-blur-sm">{fee}</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide mb-0.5">{dayStr} · {timeStr}</p>
                        <h2 className="font-bold text-sm text-white line-clamp-2 leading-snug">{zh ? ev.title_zh : ev.title_en}</h2>
                        {(zh ? ev.location_zh : ev.location_en) && <p className="text-xs text-white/70 mt-0.5 truncate">{zh ? ev.location_zh : ev.location_en}</p>}
                        <p className="text-xs text-white/50 mt-0.5">✓ {ev.rsvpCounts.GOING}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Past events */}
        {viewTab === 'past' && (
          <div className="space-y-4">
            {composingEvent && (isGroupAdmin || isPlatformAdmin) && (
              <form onSubmit={handleCreateEvent} className="rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{zh ? '建立活動' : 'Create Event'}</h3>
                <input required value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} placeholder={zh ? '活動名稱' : 'Event title'} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <input value={eventForm.location} onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))} placeholder={zh ? '地點' : 'Location'} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <textarea value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} placeholder={zh ? '描述（選填）' : 'Description (optional)'} rows={2} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '開始' : 'Start'}</label>
                    <input required type="datetime-local" value={eventForm.startAt} onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '結束（選填）' : 'End (optional)'}</label>
                    <input type="datetime-local" value={eventForm.endAt} onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '時區' : 'Timezone'}</label>
                    <input value={eventForm.timezone} onChange={(e) => setEventForm((f) => ({ ...f, timezone: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '費用' : 'Fee'}</label>
                    <input type="number" min="0" value={eventForm.feeAmount} onChange={(e) => setEventForm((f) => ({ ...f, feeAmount: e.target.value }))} placeholder="0" className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '幣別' : 'Currency'}</label>
                    <input value={eventForm.feeCurrency} onChange={(e) => setEventForm((f) => ({ ...f, feeCurrency: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '封面照片（選填）' : 'Cover Photo (optional)'}</label>
                  <div
                    onClick={() => coverFileRef.current?.click()}
                    className="relative w-full h-44 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer overflow-hidden flex items-center justify-center transition"
                  >
                    {coverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">{zh ? '點擊上傳照片' : 'Click to upload a photo'}</span>
                      </div>
                    )}
                    {coverPreview && (
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}
                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70">✕</button>
                    )}
                  </div>
                  <input ref={coverFileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }} className="hidden" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={eventLoading || !eventForm.title.trim() || !eventForm.startAt} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                    {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立' : 'Create')}
                  </button>
                  <button type="button" onClick={() => { setComposingEvent(false); setEventForm({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' }); setCoverFile(null); setCoverPreview(null); }} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                    {zh ? '取消' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
            {pastLoading ? (
              <p className="py-16 text-center text-sm text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
            ) : pastEvents.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🕐</p>
                <p className="text-gray-500 dark:text-gray-400">{zh ? '沒有過去的活動記錄，一切都是最新的！' : "No past events yet."}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {pastEvents.map((ev) => {
                  const coverUrl = resolveImageUrl(ev.coverImageUrl);
                  const hash = (ev.id.charCodeAt(0) ?? 0) + (ev.id.charCodeAt(2) ?? 0);
                  const gradients = ['from-indigo-400 to-violet-500','from-rose-400 to-pink-500','from-amber-400 to-orange-500','from-teal-400 to-cyan-500','from-purple-400 to-indigo-500','from-sky-400 to-blue-500','from-emerald-400 to-teal-500'];
                  const emojis = ['🎉','🎊','🍻','🎸','🌟','🎨','🏃','☕','🎭','🎤','🎮','🌸'];
                  const grad = gradients[hash % gradients.length];
                  const emoji = emojis[hash % emojis.length];
                  const dayStr = new Date(ev.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
                  const timeStr = new Date(ev.startAt).toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });
                  return (
                    <Link key={ev.id} href={`/${params.locale}/events/${ev.id}`} className="group relative block aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 opacity-75 hover:opacity-100">
                      {coverUrl ? (
                        <Image src={coverUrl} alt={zh ? ev.title_zh : ev.title_en} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${grad} flex items-center justify-center`}>
                          <span className="text-5xl opacity-90 select-none">{emoji}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide mb-0.5">{dayStr} · {timeStr}</p>
                        <h2 className="font-bold text-sm text-white line-clamp-2 leading-snug">{zh ? ev.title_zh : ev.title_en}</h2>
                        {(zh ? ev.location_zh : ev.location_en) && <p className="text-xs text-white/70 mt-0.5 truncate">{zh ? ev.location_zh : ev.location_en}</p>}
                        <p className="text-xs text-white/50 mt-0.5">✓ {ev.rsvpCounts.GOING}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Members */}
        {viewTab === 'members' && (
          <div className="space-y-2">
            {/* Count above the card */}
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {members.length}{' '}
              {zh ? '位成員' : members.length === 1 ? 'member' : 'members'}
              {joinRequests.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  {joinRequests.length} {zh ? '待審核' : 'pending'}
                </span>
              )}
            </p>

            {/* Single card */}
            <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              {/* Search header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder={zh ? '搜尋成員…' : 'Search members…'}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Pending join requests */}
              {joinRequests.map((req) => (
                <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{req.requester.displayName || req.requester.email}</p>
                      <span className="rounded-full bg-amber-200 dark:bg-amber-800/60 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                        {zh ? '申請中' : 'Pending'}
                      </span>
                    </div>
                    {req.note && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{req.note}</p>}
                    <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(req.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReviewJoinRequest(req.id, 'approve')} disabled={reviewingId === req.id}
                      className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition">
                      {zh ? '批准' : 'Approve'}
                    </button>
                    <button onClick={() => handleReviewJoinRequest(req.id, 'reject')} disabled={reviewingId === req.id}
                      className="rounded-xl border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition">
                      {zh ? '拒絕' : 'Decline'}
                    </button>
                  </div>
                </div>
              ))}

              {/* Member rows */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...members].filter((m) => {
                  const term = memberSearch.trim().toLowerCase();
                  if (!term) return true;
                  return (
                    (m.groupNickname ?? '').toLowerCase().includes(term) ||
                    (m.displayName ?? '').toLowerCase().includes(term) ||
                    (m.email ?? '').toLowerCase().includes(term)
                  );
                }).sort((a, b) => {
                  if (a.role !== b.role) return a.role === 'GROUP_ADMIN' ? -1 : 1;
                  const na = (a.groupNickname ?? a.displayName ?? a.email ?? '').toLowerCase();
                  const nb = (b.groupNickname ?? b.displayName ?? b.email ?? '').toLowerCase();
                  return na.localeCompare(nb);
                }).map((member) => {
                  const isOwnRow = member.userId === user?.id;
                  const isEditingNickname = editingNicknameUserId === member.userId;
                  const shownName = member.groupNickname ?? member.displayName ?? member.email ?? member.userId;
                  return (
                    <div key={member.userId} className="px-4 py-2.5">
                      {isEditingNickname ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input autoFocus
                            className="rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
                            placeholder={zh ? '群組暱稱（留空清除）' : 'Nickname (blank to clear)'}
                            value={nicknameInput}
                            onChange={(e) => setNicknameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveNickname(member.userId); if (e.key === 'Escape') setEditingNicknameUserId(null); }}
                            maxLength={100}
                          />
                          <button onClick={() => void handleSaveNickname(member.userId)} disabled={nicknameSaving}
                            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition">
                            {nicknameSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
                          </button>
                          <button onClick={() => setEditingNicknameUserId(null)}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            {zh ? '取消' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{shownName}</span>
                            {member.groupNickname && member.displayName && member.groupNickname !== member.displayName && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">({member.displayName})</span>
                            )}
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${member.role === 'GROUP_ADMIN' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                              {member.role === 'GROUP_ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '成員' : 'Member')}
                            </span>
                            {(member.email || member.phoneE164) && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">{[member.email, member.phoneE164].filter(Boolean).join(' · ')}</span>
                            )}
                          </div>
                          <div className="flex items-center shrink-0">
                            <button onClick={() => { setEditingNicknameUserId(member.userId); setNicknameInput(member.groupNickname ?? ''); }}
                              className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                              {zh ? '改名' : 'Rename'}
                            </button>
                            {!isOwnRow && (
                              <>
                                <button onClick={() => handleChangeRole(member.userId, member.role)}
                                  className="px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition">
                                  {member.role === 'GROUP_ADMIN' ? (zh ? '降級' : 'Demote') : (zh ? '升級' : 'Promote')}
                                </button>
                                <button onClick={() => handleRemoveMember(member.userId)}
                                  className="px-2 py-1 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                  {zh ? '移除' : 'Remove'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {showRelationships && relationships && (
        <GroupHierarchyChart
          data={relationships}
          currentGroupId={params.groupId}
          locale={params.locale}
          loading={relationshipsLoading}
          onClose={() => setShowRelationships(false)}
        />
      )}
    </div>
  );
}

