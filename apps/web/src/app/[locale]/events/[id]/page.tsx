'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiFetch, resolveImageUrl } from '../../../../lib/api';
import { useAuth } from '../../../../context/auth.context';
import ConfirmModal from '../../../../components/ConfirmModal';
import type { EventWithCounts, Comment, PaginatedResponse, EventSeries, EventInvitee } from '@judien/shared';

const EventMap = dynamic(() => import('../../../../components/EventMapInner'), { ssr: false });

export default function EventDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const locale = params.locale;
  const zh = locale === 'zh';
  const { user } = useAuth();

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // guest list
  type GuestEntry = { handle: string; displayName: string | null };
  type Guests = { GOING: GuestEntry[]; MAYBE: GuestEntry[]; NO: GuestEntry[] };
  const [guests, setGuests] = useState<Guests | null>(null);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [activeGuestTab, setActiveGuestTab] = useState<'GOING' | 'MAYBE' | 'NO'>('GOING');
  const [showGuests, setShowGuests] = useState(false);

  const loadGuests = async () => {
    if (guests) return; // already loaded
    setGuestsLoading(true);
    try {
      const data = await apiFetch<Guests>(`/events/${params.id}/rsvp/guests`);
      setGuests(data);
    } finally {
      setGuestsLoading(false);
    }
  };

  // blast state (admin only)
  const [blastMsg, setBlastMsg] = useState('');
  const [blastChannels, setBlastChannels] = useState<string[]>(['EMAIL']);
  const [blastAudience, setBlastAudience] = useState<'rsvped' | 'all'>('rsvped');
  const [blastResult, setBlastResult] = useState('');

  // invite state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleCreateInvite = async () => {
    if (!user) return;
    setInviteLoading(true);
    try {
      const res = await apiFetch<{ token: string }>(`/events/${params.id}/share-link`, {
        method: 'POST',
      });
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.judien.tw';
      const link = `${origin}/${locale}/events/share/${res.token}`;
      setInviteLink(link);
      setShowInviteModal(true);
    } catch (err) {
      alert(zh ? '無法生成分享連結' : 'Failed to generate share link');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert(zh ? '已複製到剪貼簿' : 'Copied to clipboard');
  };

  // invitees state (admin only)
  const [invitees, setInvitees] = useState<EventInvitee[]>([]);
  const [inviteesLoading, setInviteesLoading] = useState(false);
  const [showInvitees, setShowInvitees] = useState(false);

  const loadInvitees = async () => {
    setInviteesLoading(true);
    try {
      const data = await apiFetch<EventInvitee[]>(`/event-invites/event/${params.id}/invitees`);
      setInvitees(data);
    } finally {
      setInviteesLoading(false);
    }
  };

  // event series state
  const [eventSeries, setEventSeries] = useState<EventSeries | null>(null);

  useEffect(() => {
    if (event?.seriesId) {
      apiFetch<EventSeries>(`/event-series/${event.seriesId}`).then(setEventSeries).catch(() => {});
    }
  }, [event?.seriesId]);

  useEffect(() => {
    Promise.all([
      apiFetch<EventWithCounts>(`/events/${params.id}`),
      apiFetch<PaginatedResponse<Comment>>(`/events/${params.id}/comments`),
    ]).then(([ev, comms]) => {
      setEvent(ev);
      setRsvpStatus(ev.myRsvp);
      setComments(comms.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  const handleRsvp = async (status: 'GOING' | 'MAYBE' | 'NO') => {
    if (!user) return;
    if (rsvpStatus === status) {
      await apiFetch(`/events/${params.id}/rsvp`, { method: 'DELETE' });
      setRsvpStatus(null);
    } else {
      await apiFetch(`/events/${params.id}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setRsvpStatus(status);
    }
    // Refresh counts + guest list
    const ev = await apiFetch<EventWithCounts>(`/events/${params.id}`);
    setEvent(ev);
    // Refresh guest list if currently shown
    if (showGuests) {
      const data = await apiFetch<{ GOING: { handle: string; displayName: string | null }[]; MAYBE: { handle: string; displayName: string | null }[]; NO: { handle: string; displayName: string | null }[] }>(`/events/${params.id}/rsvp/guests`);
      setGuests(data);
    } else {
      setGuests(null); // invalidate so next open refetches
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    const c = await apiFetch<Comment>(`/events/${params.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: commentBody }),
    });
    setComments((prev) => [...prev, { ...c, replies: [] }]);
    setCommentBody('');
  };

  const handleReply = async (e: React.FormEvent, parentCommentId: string) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    const reply = await apiFetch<Comment>(`/events/${params.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: replyBody, replyToId: parentCommentId }),
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentCommentId
          ? { ...c, replies: [...(c.replies ?? []), reply] }
          : c
      )
    );
    setReplyBody('');
    setReplyingToId(null);
  };

  const handleDeleteComment = async (id: string) => {
    await apiFetch(`/comments/${id}`, { method: 'DELETE' });
    setComments((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c) => ({
          ...c,
          replies: (c.replies ?? []).filter((r) => r.id !== id),
        }))
    );
  };

  const handleEditComment = async (id: string) => {
    if (!editCommentBody.trim()) return;
    const updated = await apiFetch<Comment>(`/comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body: editCommentBody }),
    });
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...updated, replies: c.replies ?? [] } : c))
    );
    setEditingCommentId(null);
    setEditCommentBody('');
  };

  const handleDeleteEvent = async () => {
    await apiFetch(`/events/${params.id}`, { method: 'DELETE' });
    router.push(`/${locale}/events`);
  };

  // ── blast (admin only) ────────────────────────────────────────────────────────
  const toggleBlastChannel = (ch: string) =>
    setBlastChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );

  const handleBlast = async () => {
    if (!blastMsg.trim()) { setBlastResult(zh ? '請輸入訊息。' : 'Please enter a message.'); return; }
    if (blastChannels.length === 0) { setBlastResult(zh ? '請選擇至少一種發送方式。' : 'Select at least one channel.'); return; }
    setBlastResult(zh ? '發送中…' : 'Sending…');
    try {
      const res = await apiFetch<{ sent: number }>(`/events/${params.id}/blast`, {
        method: 'POST',
        body: JSON.stringify({
          channels: blastChannels,
          audience: blastAudience,
          messageEn: blastMsg,
          messageZh: blastMsg,
        }),
      });
      const msg = zh ? `✓ 已發送給 ${res.sent} 位用戶。` : `✓ Sent to ${res.sent} user${res.sent !== 1 ? 's' : ''}.`;
      setBlastResult(msg);
      setBlastMsg('');
      setTimeout(() => setBlastResult(''), 4000);
    } catch (err: unknown) {
      setBlastResult((err as Error).message ?? (zh ? '發送失敗。' : 'Failed to send.'));
    }
  };

  if (loading) return <p className="text-gray-500 mt-8">{zh ? '載入中…' : 'Loading…'}</p>;
  if (!event) return <p className="text-red-500 mt-8">Event not found.</p>;

  const title = zh ? event.title_zh : event.title_en;
  const description = zh ? event.description_zh : event.description_en;
  const location = zh ? event.location_zh : event.location_en;

  const startDate = new Date(event.startAt).toLocaleString(
    zh ? 'zh-TW' : 'en-US',
    { dateStyle: 'full', timeStyle: 'short' },
  );

  const fee = event.feeAmount
    ? `${event.feeCurrency} ${event.feeAmount}`
    : zh ? '免費' : 'Free';

  const rsvpBtn = (status: 'GOING' | 'MAYBE' | 'NO', label: string) => (
    <button
      key={status}
      onClick={() => handleRsvp(status)}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
        rsvpStatus === status
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      {showDeleteModal && (
        <ConfirmModal
          title={zh ? '刪除活動' : 'Delete Event'}
          message={
            zh
              ? `確定要永久刪除「${event.title_zh || event.title_en}」嗎？此操作無法恢復。`
              : `Are you sure you want to delete "${event.title_en || event.title_zh}"? This cannot be undone.`
          }
          confirmLabel={zh ? '確定刪除' : 'Delete'}
          cancelLabel={zh ? '取消' : 'Cancel'}
          onConfirm={handleDeleteEvent}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      {/* Admin toolbar */}
      {user?.role === 'ADMIN' ? (
        <div className="flex gap-3 py-2 border-b border-dashed border-gray-200">
          <a
            href={`/${locale}/events`}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mr-2"
          >
            ← {zh ? '返回' : 'Back'}
          </a>
          <a
            href={`/${locale}/admin/events/${params.id}/edit`}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
          >
            ✏️ {zh ? '編輯活動' : 'Edit Event'}
          </a>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600"
          >
            🗑 {zh ? '刪除活動' : 'Delete Event'}
          </button>
        </div>
      ) : (
        <a
          href={`/${locale}/events`}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 self-start"
        >
          ← Back
        </a>
      )}

      {resolveImageUrl(event.coverImageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveImageUrl(event.coverImageUrl)!}
          alt={title}
          className="w-full h-60 object-cover rounded-xl"
        />
      ) : (
        <div className="w-full h-60 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50 border border-gray-100 flex flex-col items-center justify-center gap-3 select-none">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400 max-w-xs text-center truncate px-4">{title}</p>
        </div>
      )}

      <h1 className="text-3xl font-bold">{title}</h1>

      {/* Series badge */}
      {eventSeries && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">
            📚 {zh ? (eventSeries.title_zh || eventSeries.title_en) : (eventSeries.title_en || eventSeries.title_zh)}
            {event.partNumber != null && ` — ${zh ? '第' : 'Part'} ${event.partNumber}`}
          </span>
          {eventSeries.events && eventSeries.events.length > 1 && (
            <span className="text-xs text-gray-400">
              {zh ? `系列共 ${eventSeries.events.length} 場` : `${eventSeries.events.length} events in series`}
            </span>
          )}
        </div>
      )}

      <div className="text-sm text-gray-700 space-y-2">
        {event.groupName && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400">{zh ? '主辦團體' : 'Hosted by'}</span>
            <span className="text-indigo-600 font-medium">👥 {event.groupName}</span>
          </div>
        )}
        {(event as any).createdByEmail && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400">{zh ? '主辦人' : 'Host'}</span>
            <span>{(event as any).createdByEmail}</span>
          </div>
        )}
        <div className="flex gap-2">
          <span className="w-24 shrink-0 font-medium text-gray-400">{zh ? '時間' : 'Time'}</span>
          <span>{startDate} ({event.timezone})</span>
        </div>
        {location && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400">{zh ? '地點' : 'Location'}</span>
            <span>{location}</span>
          </div>
        )}
        {location && <EventMap location={location} title={title} />}
        <div className="flex gap-2">
          <span className="w-24 shrink-0 font-medium text-gray-400">{zh ? '費用' : 'Price'}</span>
          <span>{fee}</span>
        </div>
        {event.commentsEnabled === false && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400">{zh ? '留言' : 'Comments'}</span>
            <span className="text-orange-500 text-sm">{zh ? '已關閉' : 'Disabled'}</span>
          </div>
        )}
        {event.messagingEnabled === false && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400">{zh ? '訊息' : 'Messaging'}</span>
            <span className="text-orange-500 text-sm">{zh ? '已關閉' : 'Disabled'}</span>
          </div>
        )}
      </div>

      {description && (
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{zh ? '活動說明' : 'Description'}</p>
          <p className="text-gray-800 whitespace-pre-wrap text-sm">{description}</p>
        </div>
      )}

      {/* RSVP counts */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>✓ {event.rsvpCounts.GOING} {zh ? '參加' : 'Going'}</span>
        <span>? {event.rsvpCounts.MAYBE} {zh ? '也許' : 'Maybe'}</span>
        <span>✕ {event.rsvpCounts.NO} {zh ? '不參加' : 'Not Going'}</span>
      </div>

      {/* RSVP buttons (requires login) */}
      {user ? (
        <div className="flex gap-3 items-center flex-wrap">
          {rsvpBtn('GOING', zh ? '參加' : 'Going')}
          {rsvpBtn('MAYBE', zh ? '也許' : 'Maybe')}
          {rsvpBtn('NO', zh ? '不參加' : 'Not Going')}
          <button
            onClick={() => {
              if (showGuests) {
                setShowGuests(false);
              } else {
                setShowGuests(true);
                loadGuests();
              }
            }}
            className="px-4 py-2 rounded-full text-sm font-medium border bg-white text-gray-700 border-gray-300 hover:border-indigo-400 transition"
          >
            {zh ? '賓客名單' : 'Guest List'}
          </button>
          <button
            onClick={handleCreateInvite}
            disabled={inviteLoading}
            className="px-4 py-2 rounded-full text-sm font-medium border bg-cyan-500 text-white border-cyan-500 hover:bg-cyan-600 transition disabled:opacity-50"
          >
            {inviteLoading ? (zh ? '生成中…' : 'Generating…') : (zh ? '🔗 分享活動' : '🔗 Share Event')}
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => {
                if (showInvitees) {
                  setShowInvitees(false);
                } else {
                  setShowInvitees(true);
                  loadInvitees();
                }
              }}
              className="px-4 py-2 rounded-full text-sm font-medium border bg-white text-gray-700 border-gray-300 hover:border-purple-400 transition"
            >
              {zh ? '受邀名單' : 'Invitees'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400">
            {zh ? '請登入以回覆 RSVP。' : 'Log in to RSVP.'}
          </p>
          <button
            onClick={() => {
              if (showGuests) {
                setShowGuests(false);
              } else {
                setShowGuests(true);
                loadGuests();
              }
            }}
            className="px-4 py-2 rounded-full text-sm font-medium border bg-white text-gray-700 border-gray-300 hover:border-indigo-400 transition"
          >
            {zh ? '賓客名單' : 'Guest List'}
          </button>
        </div>
      )}

      {/* Guest list panel */}
      {showGuests && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* tab header */}
            <div className="flex border-b border-gray-100">
              {(['GOING', 'MAYBE', 'NO'] as const).map((s) => {
                const labels = {
                  GOING: zh ? '參加' : 'Going',
                  MAYBE: zh ? '也許' : 'Maybe',
                  NO: zh ? '不參加' : 'Not Going',
                };
                return (
                  <button
                    key={s}
                    onClick={() => setActiveGuestTab(s)}
                    className={`flex-1 py-2.5 text-xs font-medium transition ${
                      activeGuestTab === s
                        ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-px'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {labels[s]} ({event.rsvpCounts[s]})
                  </button>
                );
              })}
            </div>

            {/* guest rows */}
            <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
              {guestsLoading ? (
                <p className="text-xs text-gray-400 px-4 py-4 text-center">{zh ? '載入中…' : 'Loading…'}</p>
              ) : (guests?.[activeGuestTab] ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 px-4 py-4 text-center">
                  {zh ? '目前沒有人。' : 'Nobody yet.'}
                </p>
              ) : (
                (guests?.[activeGuestTab] ?? []).map((g, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-500 shrink-0">
                      {(g.displayName ?? g.handle).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-800">
                      {g.displayName ?? g.handle}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      {/* Invitees panel (admin only) */}
      {showInvitees && user?.role === 'ADMIN' && (
        <div className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-purple-50">
            <h3 className="text-sm font-semibold text-purple-700">{zh ? '受邀名單' : 'Invitees'}</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {inviteesLoading ? (
              <p className="text-xs text-gray-400 px-4 py-4 text-center">{zh ? '載入中…' : 'Loading…'}</p>
            ) : invitees.length === 0 ? (
              <p className="text-xs text-gray-400 px-4 py-4 text-center">{zh ? '尚無受邀用戶。' : 'No invitees yet.'}</p>
            ) : (
              invitees.map((inv) => (
                <div key={inv.inviteId} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-500 shrink-0">
                    {(inv.guestName ?? inv.displayName ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{inv.guestName ?? inv.displayName ?? (zh ? '未知' : 'Unknown')}</p>
                    {inv.email && <p className="text-xs text-gray-400 truncate">{inv.email}</p>}
                  </div>
                  {inv.acceptedAt ? (
                    <span className="text-xs text-green-600 shrink-0">{zh ? '已接受' : 'Accepted'}</span>
                  ) : (
                    <span className="text-xs text-gray-400 shrink-0">{zh ? '待接受' : 'Pending'}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Send Message Blast (admin only) */}
      {user?.role === 'ADMIN' && (
        <section className="border border-dashed border-indigo-200 rounded-xl p-5 bg-indigo-50/40">
          <h2 className="text-lg font-semibold mb-1">{zh ? '發送訊息' : 'Send Message Blast'}</h2>
          <p className="text-sm text-gray-500 mb-4">{zh ? '立即發送訊息給出席者。' : 'Send a message to attendees right now.'}</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">{zh ? '訊息' : 'Message'}</label>
              <textarea
                value={blastMsg}
                onChange={(e) => setBlastMsg(e.target.value)}
                rows={3}
                placeholder={zh ? '您的訊息（中英文相同）…' : 'Your message (used for both English and Chinese)…'}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{zh ? '發送方式' : 'Send via'}</p>
              <div className="flex gap-3">
                {(['EMAIL', 'SMS'] as const).map((ch) => (
                  <label key={ch} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition ${
                    blastChannels.includes(ch) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
                  }`}>
                    <input type="checkbox" className="sr-only" checked={blastChannels.includes(ch)} onChange={() => toggleBlastChannel(ch)} />
                    {ch === 'EMAIL' ? '✉️ Email' : '💬 SMS'}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{zh ? '發送對象' : 'Send to'}</p>
              <div className="flex gap-3">
                {([['rsvped', zh ? '已回覆的用戶' : 'RSVPed only'], ['all', zh ? '全部用戶' : 'All users']] as const).map(([val, label]) => (
                  <label key={val} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition ${
                    blastAudience === val ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
                  }`}>
                    <input type="radio" name="blastAudience" className="sr-only" checked={blastAudience === val} onChange={() => setBlastAudience(val)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBlast}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                {zh ? '立即發送' : 'Send Now'}
              </button>
              {blastResult && (
                <p className={`text-sm ${blastResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {blastResult}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Comments */}
      <section>
        <h2 className="text-lg font-semibold mb-3">{zh ? '留言' : 'Comments'}</h2>

        {event.commentsEnabled === false ? (
          <p className="text-sm text-gray-400 italic mb-4">{zh ? '此活動已關閉留言功能。' : 'Comments are disabled for this event.'}</p>
        ) : user && (
          <form onSubmit={handleComment} className="flex gap-2 mb-4">
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={zh ? '寫下留言…' : 'Write a comment…'}
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
            >
              {zh ? '送出' : 'Post'}
            </button>
          </form>
        )}

        {comments.length === 0 && (
          <p className="text-sm text-gray-400">{zh ? '目前沒有留言。' : 'No comments yet.'}</p>
        )}

        <div className="flex flex-col gap-3">
          {comments.map((c) => {
            const isOwn = user?.id === c.userId;
            const canDelete = isOwn || user?.role === 'ADMIN';
            const canEdit = isOwn;
            const isEditing = editingCommentId === c.id;
            const isReplying = replyingToId === c.id;
            return (
              <div key={c.id}>
                {/* Main comment */}
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-gray-400 mt-0.5">{c.userHandle}</p>
                    {(canEdit || canDelete) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && !isEditing && (
                          <button
                            onClick={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }}
                            title={zh ? '編輯' : 'Edit'}
                            className="text-gray-400 hover:text-indigo-500 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.071-6.071a2.25 2.25 0 013.182 3.182L12 14H9v-3z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            title={zh ? '刪除' : 'Delete'}
                            className="text-gray-400 hover:text-red-500 transition text-xs leading-none"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <textarea
                        value={editCommentBody}
                        onChange={(e) => setEditCommentBody(e.target.value)}
                        rows={2}
                        className="w-full border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditComment(c.id)}
                          className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-md hover:bg-indigo-700"
                        >
                          {zh ? '儲存' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setEditingCommentId(null); setEditCommentBody(''); }}
                          className="text-xs text-gray-500 hover:text-gray-800"
                        >
                          {zh ? '取消' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-800 mt-1">{c.body}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                    {user && (
                      <button
                        onClick={() => setReplyingToId(isReplying ? null : c.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        {isReplying ? (zh ? '取消' : 'Cancel') : (zh ? '回覆' : 'Reply')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Reply form */}
                {isReplying && (
                  <div className="ml-4 mt-2 bg-indigo-50 rounded-lg p-3">
                    <form onSubmit={(e) => handleReply(e, c.id)} className="flex gap-2">
                      <input
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder={zh ? '寫下回覆…' : 'Write a reply…'}
                        className="flex-1 border border-indigo-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-indigo-700"
                      >
                        {zh ? '送出' : 'Reply'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Replies */}
                {c.replies && c.replies.length > 0 && (
                  <div className="ml-4 mt-2 flex flex-col gap-2">
                    {c.replies.map((reply) => {
                      const isOwnReply = user?.id === reply.userId;
                      const canDeleteReply = isOwnReply || user?.role === 'ADMIN';
                      return (
                        <div key={reply.id} className="bg-gray-50 rounded-lg p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-gray-500 font-medium">{reply.userHandle}</p>
                            {canDeleteReply && (
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                title={zh ? '刪除' : 'Delete'}
                                className="text-gray-400 hover:text-red-500 transition text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{reply.body}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(reply.createdAt).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">{zh ? '活動分享連結' : 'Event Share Link'}</h3>
            <div className="bg-gray-100 rounded-lg p-4 mb-4 break-all">
              <p className="text-sm font-mono text-indigo-600">{inviteLink}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopyInviteLink}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
              >
                {zh ? '複製' : 'Copy'}
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition font-medium text-sm"
              >
                {zh ? '關閉' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
