'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
        {group.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImageUrl(group.photoUrl) ?? ''}
            alt={group.name}
            className="w-full h-40 sm:h-56 object-cover"
          />
        )}
        <div className="px-4 pb-0 pt-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{group.name}</h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">{members.length} {zh ? '位成員' : members.length === 1 ? 'member' : 'members'}</span>
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
        <div className="flex items-end overflow-x-auto justify-between">
          <div className="flex">
            {VIEW_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setViewTab(t.key)}
                className={`shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  viewTab === t.key
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {zh ? t.labelZh : t.label}
              </button>
            ))}
          </div>
          {(isGroupAdmin || isPlatformAdmin) && viewTab === 'feed' && (
            <button
              onClick={() => { setComposingNews((v) => !v); setNewsForm({ title: '', body: '' }); }}
              className="mb-1 shrink-0 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {composingNews ? (zh ? '取消' : 'Cancel') : `+ ${zh ? '發布公告' : 'Create Post'}`}
            </button>
          )}
          {(isGroupAdmin || isPlatformAdmin) && (viewTab === 'upcoming' || viewTab === 'past') && (
            <button
              onClick={() => { setComposingEvent((v) => !v); setEventForm({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' }); }}
              className="mb-1 shrink-0 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {composingEvent ? (zh ? '取消' : 'Cancel') : `+ ${zh ? '建立活動' : 'Create Event'}`}
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
                      <button type="submit" disabled={newsLoading || !newsForm.title.trim() || !newsForm.body.trim()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                        {newsLoading ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布' : 'Post')}
                      </button>
                      <button type="button" onClick={() => { setComposingNews(false); setNewsForm({ title: '', body: '' }); }} className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                        {zh ? '取消' : 'Cancel'}
                      </button>
                    </div>
              </form>
            )}
            {news.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-gray-500 dark:text-gray-400">{zh ? '目前沒有公告，一切都是最新的！' : "No news yet — you're all caught up!"}</p>
              </div>
            ) : news.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-white">{zh ? item.title_zh : item.title_en}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{zh ? item.body_zh : item.body_en}</p>
                {item.createdAt && (
                  <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
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
          <div className="space-y-3">
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
                    {/* Cover photo */}
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
                      <button type="submit" disabled={eventLoading || !eventForm.title.trim() || !eventForm.startAt} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                        {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立' : 'Create')}
                      </button>
                      <button type="button" onClick={() => { setComposingEvent(false); setEventForm({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' }); setCoverFile(null); setCoverPreview(null); }} className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
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
                    <p className="text-xs text-gray-400 dark:text-gray-500">✓ {ev.rsvpCounts.GOING}  ? {ev.rsvpCounts.MAYBE}  ✗ {ev.rsvpCounts.NO}</p>
                  </div>
                  {ev.feeAmount != null && ev.feeAmount > 0 && (
                    <span className="rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
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
            {pastLoading ? (
              <p className="py-16 text-center text-sm text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
            ) : pastEvents.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🕐</p>
                <p className="text-gray-500 dark:text-gray-400">{zh ? '沒有過去的活動記錄，一切都是最新的！' : "No events yet — you're all caught up!"}</p>
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
                    <p className="text-xs text-gray-400 dark:text-gray-500">✓ {ev.rsvpCounts.GOING}  ? {ev.rsvpCounts.MAYBE}  ✗ {ev.rsvpCounts.NO}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Members */}
        {viewTab === 'members' && (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">{member.displayName || (member.email ?? member.userId)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.role === 'GROUP_ADMIN' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {member.role === 'GROUP_ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '成員' : 'Member')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {member.joinedAt ? `${new Date(member.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}` : ''}
                  </p>
                  {(member.email || member.phoneE164) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{[member.email, member.phoneE164].filter(Boolean).join(' · ')}</p>
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
            <p className="pt-2 text-center text-xs text-gray-400 dark:text-gray-500">{members.length} {zh ? '位成員' : 'members'}</p>
          </div>
        )}

      </div>
    </div>
  );
}

