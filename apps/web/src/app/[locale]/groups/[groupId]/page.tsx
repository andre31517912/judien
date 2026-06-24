'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload, resolveImageUrl } from '@/lib/api';
import type { EventWithCounts, News, PaginatedResponse } from '@judien/shared';
import type { HierarchyData } from '@/components/GroupHierarchyChart';
import DateTimeInput from '@/components/DateTimeInput';

const GroupHierarchyChart = dynamic(() => import('@/components/GroupHierarchyChart'), { ssr: false });

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
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [newsForm, setNewsForm] = useState({ body: '' });
  const [newsLoading, setNewsLoading] = useState(false);

  // GROUP_ADMIN: event create form
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    feeAmount: '',
  });
  const [eventLoading, setEventLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const [memberSearch, setMemberSearch] = useState('');
  const [renamingMemberId, setRenamingMemberId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  // Main view tabs
  type ViewTab = 'feed' | 'upcoming' | 'past' | 'members';
  const VALID_TABS: ViewTab[] = ['feed', 'upcoming', 'past', 'members'];
  const initTab = VALID_TABS.includes(searchParams.get('tab') as ViewTab)
    ? (searchParams.get('tab') as ViewTab)
    : 'feed';
  const [viewTab, setViewTab] = useState<ViewTab>(initTab);
  const [pastEvents, setPastEvents] = useState<EventWithCounts[]>([]);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);

  // Toggle state for create forms
  const [composingNews, setComposingNews] = useState(false);
  const [composingEvent, setComposingEvent] = useState(false);

  // Hierarchy chart
  const [showChart, setShowChart] = useState(false);
  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);

  // Inline edit state for news
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ body: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [newsCoverFile, setNewsCoverFile] = useState<File | null>(null);
  const [newsCoverPreview, setNewsCoverPreview] = useState<string | null>(null);
  const newsCoverFileRef = useRef<HTMLInputElement>(null);

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

      let current = myGroups.find((item) => item.group.id === params.groupId) ?? null;
      setMyGroupIds(myGroups.map((g) => g.group.id));
      setMembers(memberList);
      setNews(groupNews);
      setEvents(groupEvents.data);

      // Platform admins who aren't group members still get full admin view.
      if (!current && user?.role === 'ADMIN') {
        const groupInfo = await apiFetch<{ id: string; pid: string; name: string; description: string; photoUrl: string | null }>(`/groups/${params.groupId}/info`);
        current = {
          group: groupInfo,
          membership: { role: 'GROUP_ADMIN', status: 'ACCEPTED', joinedAt: null },
        };
      }
      setGroupItem(current);

      // Load join requests for group admins (including platform admins acting as group admin).
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
    if (!newsForm.body.trim()) { setError(zh ? '請輸入內容。' : 'Content is required.'); return; }
    setNewsLoading(true);
    try {
      const created = await apiFetch<News>('/news', {
        method: 'POST',
        body: JSON.stringify({
          groupId: params.groupId,
          body: newsForm.body,
        }),
      });
      if (newsCoverFile) {
        await apiUpload(`/news/${created.id}/cover`, newsCoverFile).catch(() => {});
      }
      setNewsForm({ body: '' });
      setNewsCoverFile(null);
      setNewsCoverPreview(null);
      if (newsCoverFileRef.current) newsCoverFileRef.current.value = '';
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
          title: eventForm.title,
          description: eventForm.description,
          location: eventForm.location,
          startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : undefined,
          endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : null,
          feeAmount: eventForm.feeAmount ? parseFloat(eventForm.feeAmount) : null,
          coverImageUrl,
        }),
      });
      setEventForm({
        title: '',
        description: '',
        location: '',
        startAt: '',
        endAt: '',
        feeAmount: '',
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
    if (!editForm.body.trim()) { setError(zh ? '請輸入內容。' : 'Content is required.'); return; }
    setEditSaving(true);
    setError('');
    try {
      await apiFetch(`/news/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: editForm.body }),
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

  const handleRenameMember = async (memberUserId: string) => {
    setRenameSaving(true);
    setError('');
    try {
      await apiFetch(`/groups/${params.groupId}/members/${memberUserId}/nickname`, {
        method: 'PATCH',
        body: JSON.stringify({ groupNickname: renameInput.trim() || null }),
      });
      setRenamingMemberId(null);
      setSuccess(zh ? '成員名稱已更新。' : 'Member name updated.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to rename member.');
    } finally {
      setRenameSaving(false);
    }
  };

  const handleOpenChart = async () => {
    setShowChart(true);
    if (hierarchyData) return;
    setHierarchyLoading(true);
    try {
      const data = await apiFetch<HierarchyData>(`/groups/${params.groupId}/relationships`);
      setHierarchyData(data);
    } catch {
      // silently fail — chart shows "no data"
    } finally {
      setHierarchyLoading(false);
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

  if ((loading || pageLoading) && !groupItem) {
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
    {showChart && hierarchyData && (
      <GroupHierarchyChart
        data={hierarchyData}
        currentGroupId={params.groupId}
        locale={params.locale}
        loading={hierarchyLoading}
        onClose={() => setShowChart(false)}
        memberGroupIds={myGroupIds}
      />
    )}
    {showChart && hierarchyLoading && !hierarchyData && (
      <GroupHierarchyChart
        data={{ parentGroup: null, subgroups: [] }}
        currentGroupId={params.groupId}
        locale={params.locale}
        loading={true}
        onClose={() => setShowChart(false)}
        memberGroupIds={myGroupIds}
      />
    )}
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <Link
          href={`/${params.locale}/groups`}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition w-fit mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {zh ? '返回群組列表' : 'Back to Groups'}
        </Link>
      </div>
      {/* ── Group cover header ── */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {/* Banner */}
        {group.photoUrl ? (
          <div className="relative w-full h-32 sm:h-44">
            <img src={resolveImageUrl(group.photoUrl) ?? ''} alt={group.name} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-32 sm:h-44 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-900/30 dark:to-violet-900/30 flex items-center justify-center">
            <svg className="w-12 h-12 text-indigo-300 dark:text-indigo-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </div>
        )}
        <div className="px-4 pb-4 pt-4 sm:px-6 lg:px-8">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{group.name}</h1>
            {group.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenChart}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              {zh ? '🗂 層級圖' : '🗂 Hierarchy'}
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
            {VIEW_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setViewTab(t.key);
                  router.replace(`/${params.locale}/groups/${params.groupId}?tab=${t.key}`);
                }}
                className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewTab === t.key
                    ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {zh ? t.labelZh : t.label}
                {t.key === 'members' && isGroupAdmin && joinRequests.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.125rem] px-1 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {joinRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {(isGroupAdmin || isAdmin) && viewTab === 'feed' && (
            <button
              onClick={() => setComposingNews((v) => !v)}
              className="shrink-0 bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 font-medium transition-colors"
            >
              {composingNews ? (zh ? '取消' : 'Cancel') : `＋ ${zh ? '建立動態' : 'Create Post'}`}
            </button>
          )}
          {(isGroupAdmin || isAdmin) && (viewTab === 'upcoming' || viewTab === 'past') && (
            <button
              onClick={() => setComposingEvent((v) => !v)}
              className="shrink-0 bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 font-medium transition-colors"
            >
              {composingEvent ? (zh ? '取消' : 'Cancel') : `＋ ${zh ? '建立活動' : 'Create Event'}`}
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
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={newsForm.body}
                  onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })}
                  placeholder={zh ? '有什麼想說的…' : "What's on your mind…"}
                  autoFocus
                />
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '封面圖片（選填）' : 'Cover image (optional)'}</label>
                  {newsCoverPreview ? (
                    <div className="relative w-full h-28 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={newsCoverPreview} alt="preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { setNewsCoverFile(null); setNewsCoverPreview(null); if (newsCoverFileRef.current) newsCoverFileRef.current.value = ''; }}
                        className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => newsCoverFileRef.current?.click()}
                      className="w-full rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 py-3 text-xs text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition">
                      {zh ? '點擊選擇圖片（選填）' : 'Click to add cover image (optional)'}
                    </button>
                  )}
                  <input ref={newsCoverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return; setNewsCoverFile(f); setNewsCoverPreview(URL.createObjectURL(f));
                  }} />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={newsLoading || !newsForm.body.trim()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {newsLoading ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布' : 'Post')}
                  </button>
                </div>
              </form>
            )}
            {editingId && (
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{zh ? '編輯貼文' : 'Edit Post'}</h3>
                <textarea
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={editForm.body}
                  onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                  placeholder={zh ? '有什麼想說的…' : "What's on your mind…"}
                  autoFocus
                />
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
              <div className="py-16 text-center">
                <p className="text-5xl mb-3">📢</p>
                <p className="text-gray-500 dark:text-gray-400 font-medium">{zh ? '目前沒有動態' : 'No feeds yet'}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{zh ? '管理員會在這裡發布最新公告' : 'Group updates will appear here'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {news.map((item) => {
                  const canEdit = item.createdById === user.id || isGroupAdmin || user.role === 'ADMIN';
                  const hash = item.id.charCodeAt(0) + (item.id.charCodeAt(2) ?? 0);
                  const gradients = ['from-violet-500 to-indigo-600','from-rose-500 to-pink-600','from-teal-500 to-cyan-600','from-amber-500 to-orange-600','from-emerald-500 to-green-600','from-sky-500 to-blue-600','from-fuchsia-500 to-purple-600'];
                  const grad = gradients[hash % gradients.length];
                  const initial = (item.createdBy?.displayName?.[0] ?? '?').toUpperCase();
                  return (
                    <div key={item.id} className={`relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${grad} shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5`}>
                      <Link href={`/${params.locale}/news/${item.id}`} className="absolute inset-0 z-0 block">
                        {item.coverImageUrl && (
                          <Image src={resolveImageUrl(item.coverImageUrl)!} alt={item.title} fill className="object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/15" />
                        <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                          <div className={`flex-1 overflow-hidden ${canEdit ? 'mt-7' : ''}`}>
                            <h2 className="font-bold text-white text-sm line-clamp-3 leading-snug">{item.title}</h2>
                            <p className="text-white/75 text-xs mt-1.5 line-clamp-4 leading-relaxed">{item.body}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white text-[9px] font-bold shrink-0">{initial}</div>
                            <div className="min-w-0">
                              {item.createdBy?.displayName && <p className="text-[11px] font-medium text-white/90 truncate leading-none">{item.createdBy.displayName}</p>}
                              <p className="text-[10px] text-white/60">{new Date(item.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'short' })}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                      {canEdit && (
                        <div className="absolute top-2 right-2 flex gap-1 z-10">
                          <button
                            onClick={() => { setEditingId(item.id); setEditForm({ body: item.body }); }}
                            className="w-6 h-6 rounded-full bg-black/30 text-white text-xs hover:bg-black/55 flex items-center justify-center backdrop-blur-sm"
                          >✎</button>
                          <button
                            onClick={() => handleDeleteGroupNews(item.id)}
                            className="w-6 h-6 rounded-full bg-black/30 text-white text-xs hover:bg-red-500/80 flex items-center justify-center backdrop-blur-sm"
                          >✕</button>
                        </div>
                      )}
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
            {(isGroupAdmin || isAdmin) && composingEvent && (
              <form onSubmit={handleCreateEvent} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{zh ? '新增活動' : 'Create Event'}</h3>
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder={zh ? '活動名稱' : 'Event title'}
                />
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder={zh ? '地點（選填）' : 'Location (optional)'}
                />
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
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '開始時間' : 'Start'}</label>
                    <DateTimeInput value={eventForm.startAt} onChange={(v) => setEventForm({ ...eventForm, startAt: v })} placeholder={zh ? '選擇開始時間' : 'Select start'} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '結束時間（選填）' : 'End (optional)'}</label>
                    <DateTimeInput value={eventForm.endAt} onChange={(v) => setEventForm({ ...eventForm, endAt: v })} placeholder={zh ? '選擇結束時間' : 'Select end'} clearable />
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
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立活動' : 'Create Event')}
                  </button>
                </div>
              </form>
            )}
            {events.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-5xl mb-3">📅</p>
                <p className="text-gray-500 dark:text-gray-400 font-medium">{zh ? '目前沒有活動' : 'No events yet'}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{zh ? '即將舉辦的活動會顯示在這裡' : 'Upcoming events will appear here'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {events.map((ev) => {
                  const coverUrl = resolveImageUrl(ev.coverImageUrl);
                  const isFree = !ev.feeAmount;
                  const fee = ev.feeAmount ? `${ev.feeCurrency} ${ev.feeAmount}` : zh ? '免費' : 'Free';
                  const dayStr = new Date(ev.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
                  const timeStr = new Date(ev.startAt).toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });
                  return (
                    <Link key={ev.id} href={`/${params.locale}/events/${ev.id}`} className="group relative block aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                      {coverUrl ? (
                        <Image src={coverUrl} alt={ev.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="absolute inset-0 bg-indigo-600" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute top-2.5 right-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold shadow backdrop-blur-sm ${isFree ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>{fee}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide mb-0.5">{dayStr} · {timeStr}</p>
                        <h2 className="font-bold text-sm text-white line-clamp-2 leading-snug">{ev.title}</h2>
                        {ev.location && <p className="text-xs text-white/70 mt-0.5 truncate">{ev.location}</p>}
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
            {(isGroupAdmin || isAdmin) && composingEvent && (
              <form onSubmit={handleCreateEvent} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{zh ? '新增活動' : 'Create Event'}</h3>
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder={zh ? '活動名稱' : 'Event title'}
                />
                <input
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder={zh ? '地點（選填）' : 'Location (optional)'}
                />
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
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '開始時間' : 'Start'}</label>
                    <DateTimeInput value={eventForm.startAt} onChange={(v) => setEventForm({ ...eventForm, startAt: v })} placeholder={zh ? '選擇開始時間' : 'Select start'} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{zh ? '結束時間（選填）' : 'End (optional)'}</label>
                    <DateTimeInput value={eventForm.endAt} onChange={(v) => setEventForm({ ...eventForm, endAt: v })} placeholder={zh ? '選擇結束時間' : 'Select end'} clearable />
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
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立活動' : 'Create Event')}
                  </button>
                </div>
              </form>
            )}
            {pastLoading ? (
              <p className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">{zh ? '載入中…' : 'Loading…'}</p>
            ) : pastEvents.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-5xl mb-3">🕐</p>
                <p className="text-gray-500 dark:text-gray-400 font-medium">{zh ? '沒有過去的活動' : 'No past events'}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{zh ? '過去舉辦的活動會顯示在這裡' : 'Past events will appear here'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {pastEvents.map((ev) => {
                  const coverUrl = resolveImageUrl(ev.coverImageUrl);
                  const isFree = !ev.feeAmount;
                  const fee = ev.feeAmount ? `${ev.feeCurrency} ${ev.feeAmount}` : zh ? '免費' : 'Free';
                  const dayStr = new Date(ev.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
                  const timeStr = new Date(ev.startAt).toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });
                  return (
                    <Link key={ev.id} href={`/${params.locale}/events/${ev.id}`} className="group relative block aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 opacity-75 hover:opacity-100">
                      {coverUrl ? (
                        <Image src={coverUrl} alt={ev.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="absolute inset-0 bg-indigo-600" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute top-2.5 right-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold shadow backdrop-blur-sm ${isFree ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>{fee}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide mb-0.5">{dayStr} · {timeStr}</p>
                        <h2 className="font-bold text-sm text-white line-clamp-2 leading-snug">{ev.title}</h2>
                        {ev.location && <p className="text-xs text-white/70 mt-0.5 truncate">{ev.location}</p>}
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
              {isGroupAdmin && joinRequests.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  {joinRequests.length} {zh ? '待審核' : 'pending'}
                </span>
              )}
            </p>

            {/* Single card */}
            <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              {/* Card header: search */}
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

              {/* Pending join requests – group admin only */}
              {isGroupAdmin && joinRequests.map((req) => (
                <div key={`req-${req.id}`} className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 px-4 py-3">
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
                      className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      {zh ? '批准' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReviewJoinRequest(req.id, 'reject')}
                      disabled={reviewingId === req.id}
                      className="rounded-xl border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
                    >
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
                  const isRenaming = renamingMemberId === member.userId;
                  return (
                    <div key={member.userId} className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{shownName}</span>
                          {member.groupNickname && member.displayName && member.groupNickname !== member.displayName && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">({member.displayName})</span>
                          )}
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                            member.role === 'GROUP_ADMIN'
                              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}>
                            {member.role === 'GROUP_ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '成員' : 'Member')}
                          </span>
                          {member.childGroupName && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
                              {member.childGroupName}
                            </span>
                          )}
                          {isGroupAdmin && (member.email || member.phoneE164) && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{[member.email, member.phoneE164].filter(Boolean).join(' · ')}</span>
                          )}
                        </div>
                        {isGroupAdmin && !isOwnRow && (
                          <div className="flex items-center shrink-0">
                            <button
                              onClick={() => { setRenamingMemberId(member.userId); setRenameInput(member.groupNickname ?? member.displayName ?? ''); }}
                              className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                            >
                              {zh ? '改名' : 'Rename'}
                            </button>
                            <button
                              onClick={() => handleChangeRole(member.userId, member.role)}
                              className="px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                            >
                              {member.role === 'GROUP_ADMIN' ? (zh ? '降級' : 'Demote') : (zh ? '升級' : 'Promote')}
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="px-2 py-1 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            >
                              {zh ? '移除' : 'Remove'}
                            </button>
                          </div>
                        )}
                      </div>
                      {isRenaming && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            autoFocus
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameMember(member.userId); if (e.key === 'Escape') setRenamingMemberId(null); }}
                            placeholder={zh ? '群組內顯示名稱（留空以清除）' : 'In-group display name (blank to clear)'}
                            maxLength={100}
                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => handleRenameMember(member.userId)}
                            disabled={renameSaving}
                            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                          >
                            {renameSaving ? '…' : (zh ? '儲存' : 'Save')}
                          </button>
                          <button
                            onClick={() => setRenamingMemberId(null)}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                          >
                            {zh ? '取消' : 'Cancel'}
                          </button>
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
    </div>

    </>
  );
}
