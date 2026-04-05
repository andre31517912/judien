'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload } from '@/lib/api';
import type { Event, EventWithCounts, GroupMessage, News, PaginatedResponse } from '@judien/shared';

const LocationPicker = dynamic(() => import('@/components/LocationPickerInner'), { ssr: false });

type MyGroupItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    memberDataPrivate: boolean;
  };
  membership: {
    role: 'GROUP_ADMIN' | 'MEMBER';
    status: 'ACCEPTED' | 'PENDING' | 'DECLINED' | 'REMOVED';
    joinedAt: string | null;
  };
};

type GroupMember = {
  userId: string;
  displayName: string | null;
  role: 'GROUP_ADMIN' | 'MEMBER';
  joinedAt: string | null;
  email: string | null;
  phoneE164: string | null;
};

type PendingInvite = {
  id: string;
  token: string;
  status: string;
  expiresAt: string;
  email: string | null;
  phoneE164: string | null;
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
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [chatBody, setChatBody] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // GROUP_ADMIN: invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'GROUP_ADMIN'>('MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);

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

  // Active tab for the management area (GROUP_ADMIN only)
  const [adminTab, setAdminTab] = useState<'invite' | 'news' | 'event' | 'requests'>('invite');

  type SubgroupInfo = { id: string; name: string; description: string };
  type RelationshipsData = {
    parentGroup: SubgroupInfo | null;
    subgroups: SubgroupInfo[];
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
        apiFetch<GroupMember[]>(`/groups/${params.groupId}/members`),
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
      const messageRes = await apiFetch<PaginatedResponse<GroupMessage>>(
        `/groups/${params.groupId}/messages?page=1&pageSize=100`,
      ).catch(() => ({ data: [] as GroupMessage[] } as PaginatedResponse<GroupMessage>));
      setMessages(messageRes.data);

      // GROUP_ADMIN: also load pending invites and join requests
      if (current?.membership.role === 'GROUP_ADMIN') {
        const [invitesRes, requestsRes] = await Promise.all([
          apiFetch<PendingInvite[]>(`/groups/${params.groupId}/invites`).catch(() => [] as PendingInvite[]),
          apiFetch<JoinRequest[]>(`/groups/${params.groupId}/join-requests`).catch(() => [] as JoinRequest[]),
        ]);
        setPendingInvites((invitesRes ?? []).filter((inv) => inv.status === 'PENDING'));
        setJoinRequests((requestsRes ?? []).filter((r) => r.status === 'PENDING'));
      }

      if (!current) setError(zh ? '找不到此群組或您尚未是成員。' : 'Group not found or you are not a member.');
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setInviteLoading(true);
    try {
      const payload: Record<string, unknown> = { role: inviteRole };
      if (inviteEmail.trim()) payload.email = inviteEmail.trim();
      if (invitePhone.trim()) payload.phoneE164 = invitePhone.trim();
      await apiFetch(`/groups/${params.groupId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ invites: [payload] }),
      });
      setInviteEmail('');
      setInvitePhone('');
      setInviteRole('MEMBER');
      setSuccess(zh ? '邀請已送出。' : 'Invitation sent.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
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
    setEventLoading(true);
    try {
      let coverImageUrl: string | null = null;
      if (coverFile) {
        const uploaded = await apiUpload(coverFile);
        coverImageUrl = uploaded.url;
      }
      await apiFetch<Event>('/events', {
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatBody.trim()) return;
    setChatSending(true);
    setError('');
    try {
      const created = await apiFetch<GroupMessage>(`/groups/${params.groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: chatBody.trim() }),
      });
      setMessages((prev) => [...prev, created]);
      setChatBody('');
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to send message.');
    } finally {
      setChatSending(false);
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

  const handleChangeRole = async (memberUserId: string, currentRole: 'GROUP_ADMIN' | 'MEMBER') => {
    const newRole = currentRole === 'GROUP_ADMIN' ? 'MEMBER' : 'GROUP_ADMIN';
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
    return (
      <div className="space-y-4">
        <Link href={`/${params.locale}/groups`} className="text-sm text-gray-500 hover:text-gray-800">
          ← {zh ? '返回我的群組' : 'Back to My Groups'}
        </Link>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
          {error || (zh ? '找不到此群組。' : 'Group not found.')}
        </div>
      </div>
    );
  }

  const isGroupAdmin = groupItem.membership.role === 'GROUP_ADMIN';
  const { group } = groupItem;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link href={`/${params.locale}/groups`} className="text-sm text-gray-500 hover:text-gray-800">
          ← {zh ? '返回我的群組' : 'Back to My Groups'}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isGroupAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isGroupAdmin ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '成員' : 'Member')}
          </span>
        </div>
        {group.description && <p className="text-sm text-gray-500">{group.description}</p>}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {/* GROUP_ADMIN management panel */}
      {isGroupAdmin && (
        <section className="rounded-2xl border border-indigo-100 bg-white shadow-sm">
          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-indigo-100">
            {(
              [
                { key: 'invite', label: zh ? '邀請成員' : 'Invite' },
                { key: 'news', label: zh ? '發布公告' : 'Post Announcement' },
                { key: 'event', label: zh ? '建立活動' : 'Create Event' },
                {
                  key: 'requests',
                  label: zh
                    ? `加入申請${joinRequests.length > 0 ? ` (${joinRequests.length})` : ''}`
                    : `Requests${joinRequests.length > 0 ? ` (${joinRequests.length})` : ''}`,
                },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setAdminTab(key)}
                className={`whitespace-nowrap px-5 py-3 text-sm font-medium transition ${
                  adminTab === key
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Invite tab */}
            {adminTab === 'invite' && (
              <div>
                <p className="mb-4 text-sm text-gray-500">
                  {zh ? '輸入電子郵件或手機號碼發送群組邀請。' : 'Send a group invitation by email or phone number.'}
                </p>
                <form onSubmit={handleInvite} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="member@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {zh ? '手機號碼' : 'Phone'}
                    </label>
                    <input
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="+886900000123"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {zh ? '角色' : 'Role'}
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'MEMBER' | 'GROUP_ADMIN')}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="MEMBER">{zh ? '成員' : 'Member'}</option>
                      <option value="GROUP_ADMIN">{zh ? '群組管理員' : 'Group Admin'}</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={inviteLoading || (!inviteEmail.trim() && !invitePhone.trim())}
                      className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {inviteLoading ? (zh ? '發送中…' : 'Sending…') : (zh ? '發送邀請' : 'Send Invite')}
                    </button>
                  </div>
                </form>

                {pendingInvites.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">
                      {zh ? '待接受的邀請' : 'Pending Invitations'}
                    </h3>
                    <div className="space-y-2">
                      {pendingInvites.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm"
                        >
                          <span className="text-gray-800">
                            {inv.email || inv.phoneE164 || inv.id}
                          </span>
                          <span className="text-xs text-gray-500">
                            {zh ? '到期：' : 'Expires: '}
                            {new Date(inv.expiresAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Post announcement tab */}
            {adminTab === 'news' && (
              <form onSubmit={handleCreateNews} className="space-y-4">
                <p className="text-sm text-gray-500">
                  {zh
                    ? `此公告將發布至「${group.name}」的所有成員。`
                    : `This announcement will be visible to all members of "${group.name}".`}
                </p>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {zh ? '標題' : 'Title'}
                  </label>
                  <input
                    value={newsForm.title}
                    onChange={(e) => setNewsForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {zh ? '內容' : 'Body'}
                  </label>
                  <textarea
                    value={newsForm.body}
                    onChange={(e) => setNewsForm((f) => ({ ...f, body: e.target.value }))}
                    rows={5}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={newsLoading || !newsForm.title.trim() || !newsForm.body.trim()}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {newsLoading ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布公告' : 'Post Announcement')}
                </button>
              </form>
            )}

            {/* Create event tab */}
            {adminTab === 'event' && (
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {zh ? '活動名稱' : 'Title'}
                  </label>
                  <input
                    value={eventForm.title}
                    onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {zh ? '地點' : 'Location'}
                  </label>
                  <LocationPicker
                    value={eventForm.location}
                    onChange={(value) => setEventForm((f) => ({ ...f, location: value }))}
                    showMapPreview={false}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {zh ? '描述' : 'Description'}
                  </label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {zh ? '開始時間' : 'Start'}
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.startAt}
                      onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {zh ? '結束時間' : 'End'}
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.endAt}
                      onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {zh ? '時區' : 'Timezone'}
                    </label>
                    <input
                      value={eventForm.timezone}
                      onChange={(e) => setEventForm((f) => ({ ...f, timezone: e.target.value }))}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {zh ? '費用' : 'Fee'}
                    </label>
                    <input
                      type="number"
                      value={eventForm.feeAmount}
                      onChange={(e) => setEventForm((f) => ({ ...f, feeAmount: e.target.value }))}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {zh ? '幣別' : 'Currency'}
                    </label>
                    <input
                      value={eventForm.feeCurrency}
                      onChange={(e) => setEventForm((f) => ({ ...f, feeCurrency: e.target.value }))}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {zh ? '封面照片' : 'Cover Photo'}
                  </label>
                  <div
                    onClick={() => coverFileRef.current?.click()}
                    className="relative flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:bg-gray-100"
                  >
                    {coverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverPreview} alt="preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm text-gray-400">
                        {zh ? '點擊上傳照片' : 'Click to upload'}
                      </span>
                    )}
                  </div>
                  <input
                    ref={coverFileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setCoverFile(file);
                      setCoverPreview(URL.createObjectURL(file));
                    }}
                    className="hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={
                    eventLoading ||
                    !eventForm.title.trim() ||
                    !eventForm.location.trim() ||
                    !eventForm.startAt
                  }
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立活動' : 'Create Event')}
                </button>
              </form>
            )}

            {/* Join requests tab */}
            {adminTab === 'requests' && (
              <div>
                {joinRequests.length === 0 ? (
                  <p className="text-sm text-gray-400">{zh ? '目前沒有待審核的加入申請。' : 'No pending join requests.'}</p>
                ) : (
                  <div className="space-y-3">
                    {joinRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {req.requester.displayName || req.requester.email}
                          </p>
                          <p className="text-xs text-gray-500">{req.requester.email}</p>
                          {req.note && (
                            <p className="mt-1 text-sm text-gray-600">{req.note}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(req.createdAt).toLocaleString(zh ? 'zh-TW' : 'en-US')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewRequest(req.id, true)}
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                          >
                            {zh ? '核准' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReviewRequest(req.id, false)}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {zh ? '拒絕' : 'Decline'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* News feed */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {zh ? '群組公告' : 'Group Announcements'}
        </h2>
        {news.length === 0 ? (
          <p className="text-sm text-gray-400">{zh ? '尚無群組公告。' : 'No group news yet.'}</p>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-medium text-gray-900">{zh ? item.title_zh : item.title_en}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                  {zh ? item.body_zh : item.body_en}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming events */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {zh ? '群組活動' : 'Group Events'}
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">{zh ? '目前沒有即將到來的活動。' : 'No upcoming events.'}</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/${params.locale}/events/${event.id}`}
                className="block rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:bg-gray-100"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {zh ? event.title_zh : event.title_en}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(event.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    {(zh ? event.location_zh : event.location_en) && (
                      <p className="mt-0.5 text-sm text-gray-400">
                        {zh ? event.location_zh : event.location_en}
                      </p>
                    )}
                  </div>
                  {event.feeAmount != null && event.feeAmount > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {event.feeAmount} {event.feeCurrency}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Group chat */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {zh ? '群組聊天室' : 'Group Chat'}
          </h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
            {messages.length} {zh ? '則訊息' : 'messages'}
          </span>
        </div>

        <div className="mb-4 max-h-96 space-y-2 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400">{zh ? '聊天室目前沒有訊息。' : 'No chat messages yet.'}</p>
          ) : (
            messages.map((msg) => {
              const mine = msg.userId === user.id;
              return (
                <div
                  key={msg.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 ${mine ? 'ml-auto bg-indigo-600 text-white' : 'bg-white text-gray-800'}`}
                >
                  <p className={`text-[11px] ${mine ? 'text-indigo-100' : 'text-gray-400'}`}>
                    {msg.userHandle}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{msg.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? 'text-indigo-100' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleString(zh ? 'zh-TW' : 'en-US', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            value={chatBody}
            onChange={(e) => setChatBody(e.target.value)}
            placeholder={zh ? '輸入訊息…' : 'Type a message...'}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={chatSending || !chatBody.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {chatSending ? (zh ? '傳送中…' : 'Sending…') : (zh ? '送出' : 'Send')}
          </button>
        </form>
      </section>

      {/* Member directory */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {zh ? '成員名單' : 'Members'}
          </h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {members.length} {zh ? '位成員' : 'members'}
          </span>
        </div>
        {group.memberDataPrivate && !isGroupAdmin ? (
          <p className="text-sm text-gray-400">
            {zh ? '此群組的成員名單不公開。' : 'Member directory is private for this group.'}
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {member.displayName || (member.email ?? member.userId)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {member.role === 'GROUP_ADMIN' ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '成員' : 'Member')}
                    {member.joinedAt
                      ? ` · ${zh ? '加入於' : 'Joined'} ${new Date(member.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}`
                      : ''}
                  </p>
                </div>
                {isGroupAdmin && (
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {member.email && <span>{member.email}</span>}
                    {member.phoneE164 && <span>{member.phoneE164}</span>}
                    {member.userId !== user.id && (
                      <>
                        <button
                          onClick={() => handleChangeRole(member.userId, member.role)}
                          className="rounded-md border border-indigo-200 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
                        >
                          {member.role === 'GROUP_ADMIN' ? (zh ? '降為成員' : 'Demote') : (zh ? '升為管理員' : 'Promote')}
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          {zh ? '移除' : 'Remove'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Group relationships (parent / subgroups) */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{zh ? '群組關聯' : 'Group Relationships'}</h2>
          <button
            onClick={() => {
              if (showRelationships) {
                setShowRelationships(false);
              } else {
                setShowRelationships(true);
                if (!relationships) loadRelationships();
              }
            }}
            className="text-sm text-indigo-600 hover:underline"
          >
            {showRelationships ? (zh ? '收起' : 'Hide') : (zh ? '顯示' : 'Show')}
          </button>
        </div>
        {showRelationships && (
          <div className="space-y-4">
            {relationshipsLoading ? (
              <p className="text-sm text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
            ) : !relationships ? null : (
              <>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{zh ? '上層群組' : 'Parent Group'}</p>
                  {relationships.parentGroup ? (
                    <Link
                      href={`/${params.locale}/groups/${relationships.parentGroup.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
                    >
                      👥 {relationships.parentGroup.name}
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-400">{zh ? '無上層群組。' : 'No parent group.'}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{zh ? '子群組' : 'Subgroups'}</p>
                  {relationships.subgroups.length === 0 ? (
                    <p className="text-sm text-gray-400">{zh ? '無子群組。' : 'No subgroups.'}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {relationships.subgroups.map((sg) => (
                        <Link
                          key={sg.id}
                          href={`/${params.locale}/groups/${sg.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                          👥 {sg.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
