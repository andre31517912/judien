'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';
import type { EventWithCounts, GroupMessage, News, PaginatedResponse } from '@judien/shared';

type AdminGroupItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    discoverableBySearch: boolean;
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

type JoinRequest = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  requester: { id: string; displayName: string | null; email: string };
};

export default function AdminGroupPage({ params }: { params: { locale: string; groupId: string } }) {
  const zh = params.locale === 'zh';
  const { user, loading } = useAuth();

  const [groupItem, setGroupItem] = useState<AdminGroupItem | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [chatBody, setChatBody] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  type ViewTab = 'feed' | 'upcoming' | 'past' | 'chat' | 'members';
  const [viewTab, setViewTab] = useState<ViewTab>('feed');
  const [pastEvents, setPastEvents] = useState<EventWithCounts[]>([]);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const loadPage = async () => {
    setPageLoading(true);
    setError('');
    try {
      const [groups, memberList, groupNews, groupEvents, messageRes] = await Promise.all([
        apiFetch<AdminGroupItem[]>('/groups/me'),
        apiFetch<GroupMember[]>(`/groups/${params.groupId}/members`),
        apiFetch<News[]>(`/news?groupId=${params.groupId}`),
        apiFetch<PaginatedResponse<EventWithCounts>>(`/events?scope=future&groupId=${params.groupId}&page=1&pageSize=20`),
        apiFetch<PaginatedResponse<GroupMessage>>(`/groups/${params.groupId}/messages?page=1&pageSize=100`).catch(() => ({ data: [] as GroupMessage[] } as PaginatedResponse<GroupMessage>)),
      ]);
      const current = groups.find((item) => item.group.id === params.groupId) ?? null;
      setGroupItem(current);
      setMembers(memberList);
      setNews(groupNews);
      setEvents(groupEvents.data);
      setMessages(messageRes.data);
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

  useEffect(() => {
    if (viewTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, viewTab]);

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

  const handleChangeRole = async (memberUserId: string, currentRole: 'GROUP_ADMIN' | 'MEMBER') => {
    const newRole = currentRole === 'GROUP_ADMIN' ? 'MEMBER' : 'GROUP_ADMIN';
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

  if (loading || pageLoading) return <p className="py-16 text-center text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>;

  const isPlatformAdmin = user?.role === 'ADMIN';
  const isGroupAdmin = groupItem?.membership.role === 'GROUP_ADMIN';

  if (!user || (!isPlatformAdmin && !isGroupAdmin)) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{zh ? '您沒有管理此群組的權限。' : 'You do not have permission to manage this group.'}</div>;
  }

  if (!groupItem) {
    return (
      <div className="space-y-4">
        <Link href={`/${params.locale}/admin/groups`} className="text-sm text-gray-500 hover:text-gray-800">← {zh ? '所有群組' : 'All Groups'}</Link>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{error || (zh ? '找不到此群組。' : 'Group not found.')}</div>
      </div>
    );
  }

  const { group } = groupItem;

  const VIEW_TABS: { key: ViewTab; label: string; labelZh: string }[] = [
    { key: 'feed',     label: 'Feed',     labelZh: '動態' },
    { key: 'upcoming', label: 'Upcoming', labelZh: '即將到來' },
    { key: 'past',     label: 'Past',     labelZh: '過去活動' },
    { key: 'chat',     label: 'Chat',     labelZh: '聊天室' },
    { key: 'members',  label: 'Members',  labelZh: '成員' },
  ];

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      {/* ── Group cover header ── */}
      <div className="border-b border-gray-200 bg-white px-4 pb-0 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <Link href={`/${params.locale}/admin/groups`} className="text-xs text-gray-400 hover:text-gray-600">
              ← {zh ? '管理：所有群組' : 'Admin: All Groups'}
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{group.name}</h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isPlatformAdmin && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                  {zh ? '平台管理員' : 'Platform Admin'}
                </span>
              )}
              {!isPlatformAdmin && isGroupAdmin && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {zh ? '群組管理員' : 'Group Admin'}
                </span>
              )}
              <span className="text-xs text-gray-400">{members.length} {zh ? '位成員' : 'members'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {joinRequests.length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {joinRequests.length} {zh ? '待審核' : 'pending'}
              </span>
            )}
            <Link
              href={`/${params.locale}/admin/groups/${params.groupId}/settings`}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
            >
              ⚙️ {zh ? '管理群組' : 'Manage'}
            </Link>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        {success && <p className="mb-3 text-sm text-green-600">{success}</p>}

        {/* ── Tab bar ── */}
        <div className="flex overflow-x-auto">
          {VIEW_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setViewTab(t.key)}
              className={`shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                viewTab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {zh ? t.labelZh : t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">

        {/* Feed */}
        {viewTab === 'feed' && (
          <div className="mx-auto max-w-2xl space-y-4">
            {news.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
                <p className="text-3xl">📢</p>
                <p className="mt-3 text-sm text-gray-400">{zh ? '目前沒有公告' : 'No announcements yet'}</p>
              </div>
            ) : news.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">{zh ? item.title_zh : item.title_en}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{zh ? item.body_zh : item.body_en}</p>
                {item.createdAt && (
                  <p className="mt-3 text-xs text-gray-400">
                    {item.createdBy?.displayName ? `${item.createdBy.displayName} · ` : ''}
                    {new Date(item.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upcoming events */}
        {viewTab === 'upcoming' && (
          <div className="mx-auto max-w-2xl space-y-3">
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
                <p className="text-3xl">📅</p>
                <p className="mt-3 text-sm text-gray-400">{zh ? '目前沒有即將到來的活動' : 'No upcoming events'}</p>
              </div>
            ) : events.map((ev) => (
              <Link
                key={ev.id}
                href={`/${params.locale}/events/${ev.id}`}
                className="block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900">{zh ? ev.title_zh : ev.title_en}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(ev.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {(zh ? ev.location_zh : ev.location_en) && (
                      <p className="text-sm text-gray-400">{zh ? ev.location_zh : ev.location_en}</p>
                    )}
                    <p className="text-xs text-gray-400">✓ {ev.rsvpCounts.GOING}  ? {ev.rsvpCounts.MAYBE}  ✗ {ev.rsvpCounts.NO}</p>
                  </div>
                  {ev.feeAmount != null && ev.feeAmount > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
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
          <div className="mx-auto max-w-2xl space-y-3">
            {pastLoading ? (
              <p className="py-16 text-center text-sm text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
            ) : pastEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
                <p className="text-3xl">🕐</p>
                <p className="mt-3 text-sm text-gray-400">{zh ? '沒有過去的活動記錄' : 'No past events'}</p>
              </div>
            ) : pastEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/${params.locale}/events/${ev.id}`}
                className="block rounded-2xl border border-gray-100 bg-white p-5 opacity-75 shadow-sm transition hover:opacity-100 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-600">{zh ? ev.title_zh : ev.title_en}</h3>
                    <p className="text-sm text-gray-400">
                      {new Date(ev.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {(zh ? ev.location_zh : ev.location_en) && (
                      <p className="text-sm text-gray-400">{zh ? ev.location_zh : ev.location_en}</p>
                    )}
                    <p className="text-xs text-gray-400">✓ {ev.rsvpCounts.GOING}  ? {ev.rsvpCounts.MAYBE}  ✗ {ev.rsvpCounts.NO}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Chat */}
        {viewTab === 'chat' && (
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 max-h-[480px] min-h-[240px] space-y-2 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-4">
              {messages.length === 0 ? (
                <p className="pt-10 text-center text-sm text-gray-400">{zh ? '聊天室目前沒有訊息' : 'No messages yet.'}</p>
              ) : messages.map((msg) => {
                const mine = msg.userId === user!.id;
                return (
                  <div key={msg.id} className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? 'ml-auto bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
                    <p className={`text-[11px] font-medium ${mine ? 'text-indigo-200' : 'text-gray-400'}`}>{msg.userHandle}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{msg.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-indigo-300' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                value={chatBody}
                onChange={(e) => setChatBody(e.target.value)}
                placeholder={zh ? '輸入訊息…' : 'Type a message...'}
                className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={chatSending || !chatBody.trim()}
                className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {chatSending ? '…' : (zh ? '送出' : 'Send')}
              </button>
            </form>
          </div>
        )}

        {/* Members */}
        {viewTab === 'members' && (
          <div className="mx-auto max-w-2xl space-y-2">
            {members.map((member) => (
              <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="font-medium text-gray-900">{member.displayName || (member.email ?? member.userId)}</p>
                  <p className="text-xs text-gray-500">
                    {member.role === 'GROUP_ADMIN' ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '成員' : 'Member')}
                    {member.joinedAt ? ` · ${new Date(member.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}` : ''}
                  </p>
                  {(member.email || member.phoneE164) && (
                    <p className="text-xs text-gray-400">{[member.email, member.phoneE164].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                {user && member.userId !== user.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleChangeRole(member.userId, member.role)}
                      className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      {member.role === 'GROUP_ADMIN' ? (zh ? '降為成員' : 'Demote') : (zh ? '升為管理員' : 'Promote')}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      {zh ? '移除' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <p className="pt-2 text-center text-xs text-gray-400">{members.length} {zh ? '位成員' : 'members'}</p>
          </div>
        )}

      </div>
    </div>
  );
}

