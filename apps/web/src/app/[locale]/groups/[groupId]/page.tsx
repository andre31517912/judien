'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import GroupHierarchyChart from '@/components/GroupHierarchyChart';
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload, resolveImageUrl } from '@/lib/api';
import type { EventWithCounts, News, PaginatedResponse } from '@judien/shared';

const LocationPicker = dynamic(() => import('@/components/LocationPickerInner'), { ssr: false });

type MyGroupItem = {
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

type GroupMember = {
  userId: string;
  groupNickname: string | null;
  displayName: string | null;
  role: 'GROUP_ADMIN' | 'GROUP_MEMBER';
  userRole: 'ADMIN' | 'USER';
  joinedAt: string | null;
  email: string | null;
  phoneE164: string | null;
  childGroupId: string | null;
  childGroupName: string | null;
};

type JoinRequest = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  requester: {
    id: string;
    displayName: string | null;
    email: string;
  };
};

export default function GroupPage({ params }: { params: { locale: string; groupId: string } }) {
  const zh = params.locale === 'zh';
  const { user, loading } = useAuth();

  const [groupItem, setGroupItem] = useState<MyGroupItem | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [hasPendingJoinRequest, setHasPendingJoinRequest] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // GROUP_ADMIN: news post form
  const [newsForm, setNewsForm] = useState({ title: '', body: '' });
  const [newsLoading, setNewsLoading] = useState(false);

  // GROUP_ADMIN: event create form
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    timezone: 'Asia/Taipei',
    feeAmount: '',
    feeCurrency: 'TWD',
  });
  const [eventLoading, setEventLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const [memberSearch, setMemberSearch] = useState('');

  // Main view tabs
  type ViewTab = 'feed' | 'upcoming' | 'past' | 'members';
  const [viewTab, setViewTab] = useState<ViewTab>('feed');
  const [pastEvents, setPastEvents] = useState<EventWithCounts[]>([]);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);

  // Toggle state for create forms
  const [composingNews, setComposingNews] = useState(false);
  const [composingEvent, setComposingEvent] = useState(false);

  // Inline edit state for news
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', body: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  type SubgroupInfo = { id: string; name: string; description: string };
  type RelationshipsData = {
    parentGroup: SubgroupInfo | null;
    subgroups: SubgroupInfo[];
    lineage?: Array<{ id: string; name: string }>;
    tree?: Array<SubgroupInfo & { children: SubgroupInfo[] }>;
  };
  const [relationships, setRelationships] = useState<RelationshipsData | null>(null);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);

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
      const [myGroups, memberList, groupNews, groupEvents] = await Promise.all([
        apiFetch<MyGroupItem[]>('/groups/me'),
        apiFetch<GroupMember[]>(`/groups/${params.groupId}/members?includeChildGroups=true`),
        apiFetch<News[]>(`/news?groupId=${params.groupId}`),
        apiFetch<PaginatedResponse<EventWithCounts>>(
          `/events?scope=future&groupId=${params.groupId}&page=1&pageSize=20`,
        ),
      ]);

      const current = myGroups.find((item) => item.group.id === params.groupId) ?? null;
      setGroupItem(current);
      setMembers(memberList);
      setNews(groupNews);
      setEvents(groupEvents.data);

      // Load join requests for group admins.
      if (current?.membership.status === 'ACCEPTED') {
        if (current?.membership.role === 'GROUP_ADMIN') {
          const requestsRes = await apiFetch<JoinRequest[]>(`/groups/${params.groupId}/join-requests`).catch(() => [] as JoinRequest[]);
          setJoinRequests((requestsRes ?? []).filter((r) => r.status === 'PENDING'));
        } else {
          setJoinRequests([]);
        }
      }

      if (!current) {
        const myRequests = await apiFetch<{ groupId: string; status: string }[]>('/groups/my-join-requests').catch(() => [] as { groupId: string; status: string }[]);
        setHasPendingJoinRequest(myRequests.some((r) => r.groupId === params.groupId && r.status === 'PENDING'));
      } else {
        setHasPendingJoinRequest(false);
      }
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
    } catch {
      // silently fail
    } finally {
      setPastLoading(false);
    }
  };

  useEffect(() => {
    if (viewTab === 'past' && user) loadPastEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab]);

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (!newsForm.title.trim()) { setError(zh ? '請輸入標題。' : 'Title is required.'); return; }
    if (!newsForm.body.trim()) { setError(zh ? '請輸入內容。' : 'Body is required.'); return; }
    setNewsLoading(true);
    try {
      await apiFetch('/news', {
        method: 'POST',
        body: JSON.stringify({
          groupId: params.groupId,
          title_en: newsForm.title,
          title_zh: newsForm.title,
          body_en: newsForm.body,
          body_zh: newsForm.body,
        }),
      });
      setNewsForm({ title: '', body: '' });
      setComposingNews(false);
      setSuccess(zh ? '公告已發布。' : 'News posted.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to post news.');
    } finally {
      setNewsLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (!eventForm.title.trim()) { setError(zh ? '請輸入活動名稱。' : 'Event title is required.'); return; }
    if (!eventForm.startAt) { setError(zh ? '請選擇開始時間。' : 'Start time is required.'); return; }
    setEventLoading(true);
    try {
      let coverImageUrl: string | null = null;
      if (coverFile) {
        const uploaded = await apiUpload(coverFile);
        coverImageUrl = uploaded.url;
      }
      await apiFetch<EventWithCounts>('/events', {
        method: 'POST',
        body: JSON.stringify({
          groupId: params.groupId,
          title_en: eventForm.title,
          title_zh: eventForm.title,
          description_en: eventForm.description,
          description_zh: eventForm.description,
          location_en: eventForm.location,
          location_zh: eventForm.location,
          startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : undefined,
          endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : null,
          timezone: eventForm.timezone,
          feeAmount: eventForm.feeAmount ? parseFloat(eventForm.feeAmount) : null,
          feeCurrency: eventForm.feeCurrency || 'TWD',
          coverImageUrl,
        }),
      });
      setEventForm({
        title: '',
        description: '',
        location: '',
        startAt: '',
        endAt: '',
        timezone: 'Asia/Taipei',
        feeAmount: '',
        feeCurrency: 'TWD',
      });
      setCoverFile(null);
      setCoverPreview(null);
      setComposingEvent(false);
      setSuccess(zh ? '活動已建立。' : 'Event created.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create event.');
    } finally {
      setEventLoading(false);
    }
  };

  const handleReviewRequest = async (requestId: string, approve: boolean) => {
    setSuccess('');
    setError('');
    try {
      await apiFetch(`/groups/join-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: approve ? 'approve' : 'reject' }),
      });
      setSuccess(
        approve
          ? (zh ? '已核准加入申請。' : 'Join request approved.')
          : (zh ? '已拒絕加入申請。' : 'Join request declined.'),
      );
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to review request.');
    }
  };

  const handleUpdateNews = async (id: string) => {
    if (!editForm.title.trim()) { setError(zh ? '請輸入標題。' : 'Title is required.'); return; }
    if (!editForm.body.trim()) { setError(zh ? '請輸入內容。' : 'Body is required.'); return; }
    setEditSaving(true);
    setError('');
    try {
      await apiFetch(`/news/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title_en: editForm.title, title_zh: editForm.title,
          body_en: editForm.body, body_zh: editForm.body,
        }),
      });
      setEditingId(null);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to update post.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteGroupNews = async (id: string) => {
    if (!confirm(zh ? '確定要刪除此公告嗎？' : 'Delete this post?')) return;
    setError('');
    try {
      await apiFetch(`/news/${id}`, { method: 'DELETE' });
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to delete post.');
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!confirm(zh ? '確定要移除此成員嗎？' : 'Remove this member?')) return;
    setSuccess('');
    setError('');
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
    const label = newRole === 'GROUP_ADMIN'
      ? (zh ? '確定要將此成員升為管理員嗎？' : 'Promote this member to Group Admin?')
      : (zh ? '確定要將此管理員降為成員嗎？' : 'Demote this admin to Member?');
    if (!confirm(label)) return;
    setSuccess('');
    setError('');
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
    try {
      await apiFetch(`/groups/join-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (action === 'approve') await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to review request.');
    } finally {
      setReviewingId(null);
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

  if (!groupItem) {
    if (hasPendingJoinRequest) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-yellow-100 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 p-10 text-center">
          <p className="text-4xl">⏳</p>
          <p className="font-semibold text-yellow-800 dark:text-yellow-300">
            {zh ? '申請審核中' : 'Request Pending'}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 max-w-sm">
            {zh ? '您的加入申請已送出，等待群組管理員審核。' : 'Your join request has been submitted and is awaiting admin approval.'}
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        {error || (zh ? '找不到此群組。' : 'Group not found.')}
      </div>
    );
  }

  const isGroupAdmin = groupItem.membership.role === 'GROUP_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const { group } = groupItem;

  const VIEW_TABS: { key: ViewTab; label: string; labelZh: string }[] = [
    { key: 'feed',     label: 'Feed',    labelZh: '動態' },
    { key: 'upcoming', label: 'Upcoming', labelZh: '即將到來' },
    { key: 'past',     label: 'Past',    labelZh: '過去活動' },
    { key: 'members',  label: 'Members', labelZh: '成員' },
  ];

  return (
    <>
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      {/* ── Group cover header ── */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {/* Banner */}
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
        <div className="px-4 pb-0 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{group.name}</h1>
            {group.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">{group.description}</p>
            )}
            {relationships?.lineage && relationships.lineage.length > 1 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {relationships.lineage.map((n, i) => (
                  <span key={n.id}>
                    {i > 0 && <span className="mx-1 text-gray-300 dark:text-gray-600">›</span>}
                    <Link href={`/${params.locale}/groups/${n.id}`} className="hover:text-indigo-600">{n.name}</Link>
                  </span>
                ))}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await loadRelationships();
                setShowRelationships(true);
              }}
              disabled={relationshipsLoading}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-1.5"
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
            {isGroupAdmin && (
              <>
                {joinRequests.length > 0 && (
                  <span className="rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
                    {joinRequests.length} {zh ? '待審核' : 'pending'}
                  </span>
                )}
                <Link
                  href={`/${params.locale}/admin/groups/${params.groupId}/settings`}
                  className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                >
                  ⚙️ {zh ? '群組設定' : 'Settings'}
                </Link>
              </>
            )}
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-500 dark:text-red-400">{error}</p>}
        {success && <p className="mb-3 text-sm text-green-600 dark:text-green-400">{success}</p>}

        {/* ── Tab bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex overflow-x-auto">
            {VIEW_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setViewTab(t.key)}
                className={`shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  viewTab === t.key
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {zh ? t.labelZh : t.label}
                {t.key === 'members' && isGroupAdmin && joinRequests.length > 0 && (
                  <span className="inline-flex items-center justify-center h-4.5 min-w-[1.125rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none py-0.5">
                    {joinRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {(isGroupAdmin || isAdmin) && viewTab === 'feed' && (
            <button
              onClick={() => setComposingNews((v) => !v)}
              className="shrink-0 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
            >
              {composingNews ? (zh ? '取消' : 'Cancel') : (zh ? '+ 建立動態' : '+ Create Feed')}
            </button>
          )}
          {(isGroupAdmin || isAdmin) && (viewTab === 'upcoming' || viewTab === 'past') && (
            <button
              onClick={() => setComposingEvent((v) => !v)}
              className="shrink-0 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
            >
              {composingEvent ? (zh ? '取消' : 'Cancel') : (zh ? '+ 建立活動' : '+ Create Event')}
            </button>
          )}
        </div>
      </div>
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">

        {/* Feed */}
        {viewTab === 'feed' && (
          <div className="space-y-4">
            {(isGroupAdmin || isAdmin) && composingNews && (
              <form onSubmit={handleCreateNews} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{zh ? '發布公告' : 'Post Announcement'}</h3>
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  placeholder={zh ? '標題' : 'Title'}
                />
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={newsForm.body}
                  onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })}
                  placeholder={zh ? '內容' : 'Body'}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={newsLoading || !newsForm.title.trim() || !newsForm.body.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {newsLoading ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布' : 'Post')}
                  </button>
                </div>
              </form>
            )}
            {news.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
                <p className="text-3xl">📢</p>
                <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">{zh ? '目前沒有公告' : 'No announcements yet'}</p>
              </div>
            ) : news.map((item) => {
              const canEdit = item.createdById === user.id || isGroupAdmin || user.role === 'ADMIN';
              const isEditing = editingId === item.id;
              return (
                <div key={item.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder={zh ? '標題' : 'Title'}
                      />
                      <textarea
                        rows={4}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        value={editForm.body}
                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                        placeholder={zh ? '內容' : 'Body'}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          {zh ? '取消' : 'Cancel'}
                        </button>
                        <button
                          onClick={() => handleUpdateNews(item.id)}
                          disabled={editSaving}
                          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                        >
                          {editSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{zh ? item.title_zh : item.title_en}</h3>
                        {canEdit && (
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => { setEditingId(item.id); setEditForm({ title: zh ? item.title_zh : item.title_en, body: zh ? item.body_zh : item.body_en }); }}
                              className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                            >
                              {zh ? '編輯' : 'Edit'}
                            </button>
                            <button
                              onClick={() => handleDeleteGroupNews(item.id)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            >
                              {zh ? '刪除' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{zh ? item.body_zh : item.body_en}</p>
                      {item.createdAt && (
                        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                          {item.createdBy?.displayName ? `${item.createdBy.displayName} · ` : ''}
                          {new Date(item.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Upcoming events */}
        {viewTab === 'upcoming' && (
          <div className="space-y-3">
            {(isGroupAdmin || isAdmin) && composingEvent && (
              <form onSubmit={handleCreateEvent} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{zh ? '新增活動' : 'Create Event'}</h3>
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder={zh ? '活動名稱' : 'Event title'}
                />
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                />
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder={zh ? '地點（選填）' : 'Location (optional)'}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '開始時間' : 'Start'}</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={eventForm.startAt}
                      onChange={(e) => setEventForm({ ...eventForm, startAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '結束時間（選填）' : 'End (optional)'}</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={eventForm.endAt}
                      onChange={(e) => setEventForm({ ...eventForm, endAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '費用（選填）' : 'Fee (optional)'}</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={eventForm.feeAmount}
                      onChange={(e) => setEventForm({ ...eventForm, feeAmount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '幣別' : 'Currency'}</label>
                    <select
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={eventForm.feeCurrency}
                      onChange={(e) => setEventForm({ ...eventForm, feeCurrency: e.target.value })}
                    >
                      <option value="TWD">TWD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '封面圖片（選填）' : 'Cover image (optional)'}</label>
                  {coverPreview ? (
                    <div className="relative w-full h-28 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(null); if (coverFileRef.current) coverFileRef.current.value = ''; }}
                        className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverFileRef.current?.click()}
                      className="w-full rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 py-4 text-xs text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition"
                    >
                      {zh ? '點擊選擇圖片' : 'Click to select image'}
                    </button>
                  )}
                  <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setCoverFile(f);
                    setCoverPreview(URL.createObjectURL(f));
                  }} />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={eventLoading || !eventForm.title.trim() || !eventForm.startAt}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立活動' : 'Create Event')}
                  </button>
                </div>
              </form>
            )}
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
                <p className="text-3xl">📅</p>
                <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">{zh ? '目前沒有即將到來的活動' : 'No upcoming events'}</p>
              </div>
            ) : events.map((ev) => (
              <Link
                key={ev.id}
                href={`/${params.locale}/events/${ev.id}`}
                className="block rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{zh ? ev.title_zh : ev.title_en}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(ev.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {(zh ? ev.location_zh : ev.location_en) && (
                      <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? ev.location_zh : ev.location_en}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">✓ {ev.rsvpCounts.GOING}  ✗ {ev.rsvpCounts.NO}</p>
                  </div>
                  {ev.feeAmount != null && ev.feeAmount > 0 && (
                    <span className="rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      {ev.feeAmount} {ev.feeCurrency}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Past events */}
        {viewTab === 'past' && (
          <div className="space-y-3">
            {(isGroupAdmin || isAdmin) && composingEvent && (
              <form onSubmit={handleCreateEvent} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{zh ? '新增活動' : 'Create Event'}</h3>
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder={zh ? '活動名稱' : 'Event title'}
                />
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                />
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder={zh ? '地點（選填）' : 'Location (optional)'}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '開始時間' : 'Start'}</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={eventForm.startAt}
                      onChange={(e) => setEventForm({ ...eventForm, startAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '結束時間（選填）' : 'End (optional)'}</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={eventForm.endAt}
                      onChange={(e) => setEventForm({ ...eventForm, endAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '費用（選填）' : 'Fee (optional)'}</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={eventForm.feeAmount}
                      onChange={(e) => setEventForm({ ...eventForm, feeAmount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '幣別' : 'Currency'}</label>
                    <select
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={eventForm.feeCurrency}
                      onChange={(e) => setEventForm({ ...eventForm, feeCurrency: e.target.value })}
                    >
                      <option value="TWD">TWD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '封面圖片（選填）' : 'Cover image (optional)'}</label>
                  {coverPreview ? (
                    <div className="relative w-full h-28 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(null); if (coverFileRef.current) coverFileRef.current.value = ''; }}
                        className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverFileRef.current?.click()}
                      className="w-full rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 py-4 text-xs text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition"
                    >
                      {zh ? '點擊選擇圖片' : 'Click to select image'}
                    </button>
                  )}
                  <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setCoverFile(f);
                    setCoverPreview(URL.createObjectURL(f));
                  }} />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={eventLoading || !eventForm.title.trim() || !eventForm.startAt}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立活動' : 'Create Event')}
                  </button>
                </div>
              </form>
            )}
            {pastLoading ? (
              <p className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">{zh ? '載入中…' : 'Loading…'}</p>
            ) : pastEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
                <p className="text-3xl">🕐</p>
                <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">{zh ? '沒有過去的活動記錄' : 'No past events'}</p>
              </div>
            ) : pastEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/${params.locale}/events/${ev.id}`}
                className="block rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 opacity-75 shadow-sm transition hover:opacity-100 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-600 dark:text-gray-300">{zh ? ev.title_zh : ev.title_en}</h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      {new Date(ev.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {(zh ? ev.location_zh : ev.location_en) && (
                      <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? ev.location_zh : ev.location_en}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">✓ {ev.rsvpCounts.GOING}  ✗ {ev.rsvpCounts.NO}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Members */}
        {viewTab === 'members' && (
          <div className="space-y-2">
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder={zh ? '搜尋成員…' : 'Search members…'}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="pb-1 text-xs text-gray-400 dark:text-gray-500">
              {members.length + (isGroupAdmin ? joinRequests.length : 0)}{' '}
              {zh ? '位成員' : (members.length + (isGroupAdmin ? joinRequests.length : 0)) === 1 ? 'member' : 'members'}
              {isGroupAdmin && joinRequests.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  {joinRequests.length} {zh ? '待審核' : 'pending'}
                </span>
              )}
            </p>
            {/* Pending join requests shown inline at top – group admin only */}
            {isGroupAdmin && joinRequests.map((req) => (
              <div key={`req-${req.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 shadow-sm">
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
                  <button
                    onClick={() => handleReviewJoinRequest(req.id, 'approve')}
                    disabled={reviewingId === req.id}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {zh ? '批准' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReviewJoinRequest(req.id, 'reject')}
                    disabled={reviewingId === req.id}
                    className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
                  >
                    {zh ? '拒絕' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
            {[...members].filter((m) => {
              const term = memberSearch.trim().toLowerCase();
              if (!term) return true;
              return (
                (m.groupNickname ?? '').toLowerCase().includes(term) ||
                (m.displayName ?? '').toLowerCase().includes(term) ||
                (m.email ?? '').toLowerCase().includes(term) ||
                (m.phoneE164 ?? '').includes(term)
              );
            }).sort((a, b) => {
              if (a.role !== b.role) return a.role === 'GROUP_ADMIN' ? -1 : 1;
              const na = (a.groupNickname ?? a.displayName ?? a.email ?? '').toLowerCase();
              const nb = (b.groupNickname ?? b.displayName ?? b.email ?? '').toLowerCase();
              return na.localeCompare(nb);
            }).map((member) => {
              const isOwnRow = member.userId === user?.id;
              const shownName = member.groupNickname ?? member.displayName ?? member.email ?? member.userId;
              return (
              <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-white">{shownName}</p>
                    {member.groupNickname && member.displayName && member.groupNickname !== member.displayName && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">({member.displayName})</p>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      member.role === 'GROUP_ADMIN'
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {member.role === 'GROUP_ADMIN' ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '群組成員' : 'Group Member')}
                    </span>
                    {member.childGroupName && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {member.childGroupName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {member.joinedAt ? `${zh ? '加入於' : 'Joined'} ${new Date(member.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}` : ''}
                  </p>
                  {isGroupAdmin && (member.email || member.phoneE164) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{[member.email, member.phoneE164].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                {isGroupAdmin && !isOwnRow && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleChangeRole(member.userId, member.role)}
                      className="rounded-lg border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                    >
                      {member.role === 'GROUP_ADMIN' ? (zh ? '降為成員' : 'Demote') : (zh ? '升為管理員' : 'Promote')}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                      {zh ? '移除' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

      </div>
    </div>

    {/* ── Group Hierarchy modal ── */}
    {showRelationships && relationships && (
      <GroupHierarchyChart
        data={relationships}
        currentGroupId={params.groupId}
        locale={params.locale}
        loading={relationshipsLoading}
        onClose={() => setShowRelationships(false)}
      />
    )}
    </>
  );
}
