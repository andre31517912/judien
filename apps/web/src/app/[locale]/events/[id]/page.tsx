'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { apiFetch, resolveImageUrl } from '../../../../lib/api';
import { useAuth } from '../../../../context/auth.context';
import ConfirmModal from '../../../../components/ConfirmModal';
import type { EventWithCounts, EventSeries, EventInvitee } from '@judien/shared';

const EventMap = dynamic(() => import('../../../../components/EventMapInner'), { ssr: false });

type Comment = {
  id: string;
  userId: string;
  userHandle: string;
  body: string;
  createdAt: string;
  replies?: Comment[];
};

export default function EventDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const locale = params.locale;
  const zh = locale === 'zh';
  const { user } = useAuth();

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [showNoReason, setShowNoReason] = useState(false);
  const [noReason, setNoReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // guest list
  type GuestEntry = { handle: string; displayName: string | null; email?: string; phone?: string };
  type InvitedEntry = { name: string; email?: string | null; phone?: string | null };
  type Guests = { GOING: GuestEntry[]; NO: GuestEntry[]; INVITED: InvitedEntry[]; PENDING?: GuestEntry[] };
  const [guests, setGuests] = useState<Guests | null>(null);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [activeGuestTab, setActiveGuestTab] = useState<'INVITED' | 'GOING' | 'NO' | 'PENDING'>('GOING');
  const [showGuests, setShowGuests] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');

  const loadGuests = async () => {
    if (guests) return;
    setGuestsLoading(true);
    try {
      const [rsvpData, inviteesData] = await Promise.all([
        apiFetch<{ GOING: GuestEntry[]; NO: GuestEntry[]; INVITED?: InvitedEntry[]; PENDING?: GuestEntry[] }>(`/events/${params.id}/rsvp/guests`),
        apiFetch<EventInvitee[]>(`/event-invites/event/${params.id}/invitees`).catch(() => [] as EventInvitee[]),
      ]);
      setGuests({
        GOING: rsvpData.GOING,
        NO: rsvpData.NO,
        INVITED: rsvpData.INVITED
          ? rsvpData.INVITED.map((i) => ({ name: i.name, email: i.email ?? undefined, phone: i.phone ?? undefined }))
          : inviteesData.map((i) => ({ name: i.guestName ?? i.displayName ?? '', email: i.email ?? undefined })),
        PENDING: rsvpData.PENDING,
      });
    } finally {
      setGuestsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    const esc = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    // Load guests if not already loaded
    let data = guests;
    if (!data) {
      setGuestsLoading(true);
      try {
        const [rsvpData, inviteesData] = await Promise.all([
          apiFetch<{ GOING: GuestEntry[]; NO: GuestEntry[]; INVITED?: InvitedEntry[]; PENDING?: GuestEntry[] }>(`/events/${params.id}/rsvp/guests`),
          apiFetch<EventInvitee[]>(`/event-invites/event/${params.id}/invitees`).catch(() => [] as EventInvitee[]),
        ]);
        data = {
          GOING: rsvpData.GOING,
          NO: rsvpData.NO,
          INVITED: rsvpData.INVITED
            ? rsvpData.INVITED.map((i) => ({ name: i.name, email: i.email ?? undefined, phone: i.phone ?? undefined }))
            : inviteesData.map((i) => ({ name: i.guestName ?? i.displayName ?? '', email: i.email ?? undefined })),
          PENDING: rsvpData.PENDING,
        };
        setGuests(data);
      } finally {
        setGuestsLoading(false);
      }
    }
    const rows = ['Name,Email,Phone,Status'];
    for (const g of (data.INVITED ?? [])) rows.push([esc(g.name), esc(g.email ?? ''), esc((g as any).phone ?? ''), esc('Invited')].join(','));
    for (const g of (data.GOING ?? [])) rows.push([esc(g.displayName ?? g.handle ?? ''), esc(g.email ?? ''), esc(g.phone ?? ''), esc('Going')].join(','));
    for (const g of (data.NO ?? [])) rows.push([esc(g.displayName ?? g.handle ?? ''), esc(g.email ?? ''), esc(g.phone ?? ''), esc('Not Going')].join(','));
    for (const g of (data.PENDING ?? [])) rows.push([esc(g.displayName ?? g.handle ?? ''), esc(g.email ?? ''), esc(g.phone ?? ''), esc('Unresponded')].join(','));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guest-list-${params.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // direct invite state
  const [directInviteId, setDirectInviteId] = useState('');
  const [directInviteLoading, setDirectInviteLoading] = useState(false);
  const [directInviteMsg, setDirectInviteMsg] = useState('');

  const handleDirectInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directInviteId.trim()) return;
    setDirectInviteLoading(true);
    setDirectInviteMsg('');
    try {
      const res = await apiFetch<{ displayName: string | null; status: string }>(`/events/${params.id}/direct-invite`, {
        method: 'POST',
        body: JSON.stringify({ identifier: directInviteId.trim() }),
      });
      if (res.status === 'already_rsvpd') {
        setDirectInviteMsg(zh ? `${res.displayName ?? directInviteId} 已回覆 RSVP。` : `${res.displayName ?? directInviteId} has already RSVPed.`);
      } else {
        setDirectInviteMsg(zh ? `已邀請 ${res.displayName ?? directInviteId}，並已發送通知。` : `Invited ${res.displayName ?? directInviteId} and sent notification.`);
        setDirectInviteId('');
        setGuests(null);
        if (showGuests) loadGuests();
      }
    } catch (err: unknown) {
      setDirectInviteMsg((err as Error).message ?? (zh ? '找不到該用戶。' : 'User not found.'));
    } finally { setDirectInviteLoading(false); }
  };

  // blast state
  const [blastMsg, setBlastMsg] = useState('');
  const [blastChannels, setBlastChannels] = useState<string[]>(['EMAIL']);
  const [blastAudience, setBlastAudience] = useState<'rsvped' | 'invited'>('rsvped');
  const [blastResult, setBlastResult] = useState('');

  const toggleBlastChannel = (ch: string) =>
    setBlastChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);

  const handleBlast = async () => {
    if (!blastMsg.trim()) return;
    try {
      await apiFetch(`/events/${params.id}/blast`, {
        method: 'POST',
        body: JSON.stringify({ message: blastMsg.trim(), channels: blastChannels, audience: blastAudience }),
      });
      setBlastResult(zh ? '✓ 訊息已發送' : '✓ Message sent');
      setBlastMsg('');
    } catch (err: unknown) {
      setBlastResult(zh ? '發送失敗，請稍後再試。' : 'Failed to send. Please try again.');
    }
  };

  // comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  // invite state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copyDone, setCopyDone] = useState(false);

  const handleCreateInvite = async () => {
    if (!user) return;
    setInviteLoading(true);
    setInviteError('');
    try {
      const res = await apiFetch<{ token: string }>(`/events/${params.id}/share-link`, {
        method: 'POST',
      });
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.judien.tw';
      const link = `${origin}/${locale}/events/share/${res.token}`;
      setInviteLink(link);
      setShowInviteModal(true);
    } catch (err) {
      setInviteError(zh ? '無法生成分享連結，請稍後再試。' : 'Failed to generate share link. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  // event series state
  const [eventSeries, setEventSeries] = useState<EventSeries | null>(null);

  useEffect(() => {
    if (event?.seriesId) {
      apiFetch<EventSeries>(`/event-series/${event.seriesId}`).then(setEventSeries).catch(() => {});
    }
  }, [event?.seriesId]);

  const anyModalOpen = showInviteModal || showNoReason;
  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowInviteModal(false);
          setShowNoReason(false);
          setShowGuests(false);
        }
      };
      document.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [anyModalOpen]);

  useEffect(() => {
    Promise.all([
      apiFetch<EventWithCounts>(`/events/${params.id}`),
      apiFetch<Comment[]>(`/events/${params.id}/comments`).catch(() => [] as Comment[]),
    ]).then(([ev, commentsData]) => {
      setEvent(ev);
      setRsvpStatus(ev.myRsvp);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  const handleRsvp = async (status: 'GOING' | 'NO') => {
    if (!user) return;
    // Clicking NO when not already NO → show the reason prompt instead of submitting
    if (status === 'NO' && rsvpStatus !== 'NO') {
      setShowNoReason(true);
      setNoReason('');
      return;
    }
    setShowNoReason(false);
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
    if (showGuests) {
      const data = await apiFetch<Guests>(`/events/${params.id}/rsvp/guests`);
      setGuests(data);
    } else {
      setGuests(null);
    }
  };

  const handleConfirmNo = async () => {
    if (!user) return;
    setShowNoReason(false);
    await apiFetch(`/events/${params.id}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status: 'NO', ...(noReason.trim() ? { declineReason: noReason.trim() } : {}) }),
    });
    setRsvpStatus('NO');
    setNoReason('');
    const ev = await apiFetch<EventWithCounts>(`/events/${params.id}`);
    setEvent(ev);
    if (showGuests) {
      const data = await apiFetch<Guests>(`/events/${params.id}/rsvp/guests`);
      setGuests(data);
    } else {
      setGuests(null);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    const created = await apiFetch<Comment>(`/events/${params.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: commentBody.trim() }),
    });
    setComments((prev) => [...prev, created]);
    setCommentBody('');
  };

  const handleReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    const created = await apiFetch<Comment>(`/events/${params.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: replyBody.trim(), parentId }),
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...(c.replies ?? []), created] } : c,
      ),
    );
    setReplyBody('');
    setReplyingToId(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    await apiFetch(`/events/${params.id}/comments/${commentId}`, { method: 'DELETE' });
    setComments((prev) =>
      prev
        .filter((c) => c.id !== commentId)
        .map((c) => ({ ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) })),
    );
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentBody.trim()) return;
    const updated = await apiFetch<Comment>(`/events/${params.id}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body: editCommentBody.trim() }),
    });
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body: updated.body } : c)));
    setEditingCommentId(null);
    setEditCommentBody('');
  };

  const handleDeleteEvent = async () => {
    await apiFetch(`/events/${params.id}`, { method: 'DELETE' });
    router.push(`/${locale}/events`);
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
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

  const isPast = event ? new Date(event.startAt) < new Date() : false;

  const rsvpBtn = (status: 'GOING' | 'NO', label: string) => (
    <button
      key={status}
      onClick={() => handleRsvp(status)}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
        rsvpStatus === status
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400'
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
      {(user?.role === 'ADMIN' || event.createdById === user?.id) && (
        <div className="flex gap-3 py-2 border-b border-dashed border-gray-200 dark:border-gray-700 flex-wrap">
          <a
            href={`/${locale}/admin/events/${params.id}/edit`}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
          >
            {zh ? '編輯活動' : 'Edit Event'}
          </a>
          <button
            onClick={handleExportCsv}
            className="text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:border-indigo-400 hover:text-indigo-600 transition"
          >
            {zh ? '匯出 CSV' : 'Export CSV'}
          </button>
        </div>
      )}

      {resolveImageUrl(event.coverImageUrl) ? (
        <div className="relative w-full h-60 rounded-xl overflow-hidden">
          <Image src={resolveImageUrl(event.coverImageUrl)!} alt={title} fill className="object-cover" />
        </div>
      ) : (
        <div className="w-full h-60 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 select-none">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400 max-w-xs text-center truncate px-4">{title}</p>
        </div>
      )}

      <h1 className="text-3xl font-bold dark:text-white">{title}</h1>

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

      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
        {event.groupName && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400 dark:text-gray-500">{zh ? '主辦團體' : 'Hosted by'}</span>
            <span className="text-indigo-600 font-medium">👥 {event.groupName}</span>
          </div>
        )}
        {(event as any).createdByName && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400 dark:text-gray-500">{zh ? '主辦人' : 'Host'}</span>
            <span>{(event as any).createdByName}</span>
          </div>
        )}
        <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400 dark:text-gray-500">{zh ? '時間' : 'Time'}</span>
          <span>{startDate} ({event.timezone})</span>
        </div>
        {location && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400 dark:text-gray-500">{zh ? '地點' : 'Location'}</span>
            <span>{location}</span>
          </div>
        )}
        <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400 dark:text-gray-500">{zh ? '費用' : 'Price'}</span>
          <span>{fee}</span>
        </div>
        {location && <EventMap location={location} title={title} />}
      </div>

      {description && (
        <div>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1">{zh ? '活動說明' : 'Description'}</p>
          <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm">{description}</p>
        </div>
      )}

      {/* RSVP counts */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>✓ {event.rsvpCounts.GOING} {zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going')}</span>
        <span>✕ {event.rsvpCounts.NO} {zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't Attend" : 'Not Going')}</span>
      </div>

      {/* RSVP + actions row */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 items-center flex-wrap">
          {user && !isPast && rsvpBtn('GOING', zh ? '參加' : 'Going')}
          {user && !isPast && rsvpBtn('NO', zh ? '不參加' : 'Not Going')}
          <button
            onClick={() => { setShowGuests(!showGuests); if (!showGuests) loadGuests(); }}
            className="px-4 py-2 rounded-full text-sm font-medium border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400 transition"
          >
            {zh ? '賓客名單' : 'Guest List'}
          </button>
          {!isPast && (
            <button
              onClick={handleCreateInvite}
              disabled={inviteLoading}
              className="px-4 py-2 rounded-full text-sm font-medium border bg-cyan-500 text-white border-cyan-500 hover:bg-cyan-600 transition disabled:opacity-50"
            >
              {inviteLoading ? (zh ? '生成中…' : 'Generating…') : (zh ? '🔗 分享活動' : '🔗 Share Event')}
            </button>
          )}
          {inviteError && <p className="text-sm text-red-500 dark:text-red-400 w-full mt-1">{inviteError}</p>}
          {!user && <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '請登入以回覆 RSVP。' : 'Log in to RSVP.'}</p>}
        </div>
        {showNoReason && (
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {zh ? '原因（選填）' : 'Reason (optional)'}
            </label>
            <input
              type="text"
              value={noReason}
              onChange={(e) => setNoReason(e.target.value)}
              placeholder={zh ? '為什麼無法參加？' : "Why can't you make it?"}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              maxLength={500}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmNo(); if (e.key === 'Escape') setShowNoReason(false); }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNoReason(false)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {zh ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmNo}
                className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition"
              >
                {zh ? '確認不參加' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guest list panel — tabs: Invited, Going, Not Going, Unresponded */}
      {showGuests && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-1">
            {([
              ['INVITED',  zh ? '已邀請' : 'Invited',      guests?.INVITED.length ?? 0],
              ['GOING',    zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going'), event.rsvpCounts.GOING],
              ['NO',       zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't Attend" : 'Not Going'), event.rsvpCounts.NO],
              ...(guests?.PENDING !== undefined ? [['PENDING', zh ? '未回應' : 'Unresponded', guests.PENDING.length] as [typeof activeGuestTab, string, number]] : []),
            ] as [typeof activeGuestTab, string, number][]).map(([tab, label, count]) => (
              <button
                key={tab}
                onClick={() => setActiveGuestTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium transition ${
                  activeGuestTab === tab
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 -mb-px'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {label} ({count})
              </button>
            ))}
            </div>
          </div>

          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <input
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
              placeholder={zh ? '搜尋…' : 'Search…'}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-52 overflow-y-auto">
            {guestsLoading ? (
              <p className="text-xs text-gray-400 px-4 py-4 text-center">{zh ? '載入中…' : 'Loading…'}</p>
            ) : (() => {
              const term = guestSearch.trim().toLowerCase();
              if (activeGuestTab === 'INVITED') {
                const rows = (guests?.INVITED ?? []).filter((g) =>
                  !term || g.name.toLowerCase().includes(term) || (g.email ?? '').toLowerCase().includes(term)
                );
                return rows.length === 0
                  ? <p className="text-xs text-gray-400 px-4 py-4 text-center">{term ? (zh ? '找不到符合結果。' : 'No matches.') : (zh ? '目前沒有受邀者。' : 'No invitees yet.')}</p>
                  : rows.map((g, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-500 shrink-0">
                        {(g.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{g.name}</p>
                        {g.email && <p className="text-xs text-gray-400 truncate">{g.email}</p>}
                        {(g as any).phone && <p className="text-xs text-gray-400 truncate">{(g as any).phone}</p>}
                      </div>
                    </div>
                  ));
              }
              const tabData = activeGuestTab === 'PENDING' ? (guests?.PENDING ?? []) : (guests?.[activeGuestTab as 'GOING' | 'NO'] ?? []);
              const rows = tabData.filter((g) =>
                !term || (g.displayName ?? '').toLowerCase().includes(term) || g.handle.toLowerCase().includes(term) || (g.email ?? '').toLowerCase().includes(term)
              );
              const emptyMsg = term ? (zh ? '找不到符合結果。' : 'No matches.') : activeGuestTab === 'PENDING' ? (zh ? '所有受邀者皆已回應。' : 'Everyone has responded.') : (zh ? '目前沒有人。' : 'Nobody yet.');
              return rows.length === 0
                ? <p className="text-xs text-gray-400 px-4 py-4 text-center">{emptyMsg}</p>
                : rows.map((g, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-500 shrink-0">
                      {(g.displayName ?? g.handle ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200">{g.displayName ?? g.handle}</p>
                      {g.email && <p className="text-xs text-gray-400 truncate">{g.email}</p>}
                      {g.phone && <p className="text-xs text-gray-400 truncate">{g.phone}</p>}
                    </div>
                  </div>
                ));
            })()}
          </div>
        </div>
      )}

      {/* Direct invite by email/phone (event creator/admin, non-group events only) */}
      {!event.groupId && (user?.role === 'ADMIN' || event.createdById === user?.id) && (
        <section className="border border-dashed border-green-200 dark:border-green-900/40 rounded-xl p-5 bg-green-50/40 dark:bg-gray-900/50">
          <h2 className="text-base font-semibold mb-1 dark:text-white">{zh ? '邀請指定用戶' : 'Invite by Email / Phone'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{zh ? '輸入已註冊用戶的電子郵件或手機號碼，將其加入受邀名單並發送通知。' : 'Enter the email or phone of a registered user to add them to the invite list and send a notification.'}</p>
          <form onSubmit={handleDirectInvite} className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={directInviteId}
              onChange={(e) => setDirectInviteId(e.target.value)}
              placeholder={zh ? 'Email 或手機號碼' : 'Email or phone number'}
              className="flex-1 min-w-48 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={directInviteLoading || !directInviteId.trim()}
              className="rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {directInviteLoading ? (zh ? '邀請中…' : 'Inviting…') : (zh ? '邀請' : 'Invite')}
            </button>
          </form>
          {directInviteMsg && (
            <p className={`mt-2 text-sm ${directInviteMsg.startsWith('Invited') || directInviteMsg.startsWith('已邀請') ? 'text-green-600' : directInviteMsg.includes('already') || directInviteMsg.includes('已回覆') ? 'text-amber-500' : 'text-red-500'}`}>
              {directInviteMsg}
            </p>
          )}
        </section>
      )}

      {/* Send Message Blast (admin or event creator) */}
      {(user?.role === 'ADMIN' || event.createdById === user?.id) && (
        <section className="border border-dashed border-indigo-200 dark:border-gray-700 rounded-xl p-5 bg-indigo-50/40 dark:bg-gray-900/50">
          <h2 className="text-lg font-semibold mb-1 dark:text-white">{zh ? '發送訊息' : 'Send Message Blast'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{zh ? '立即發送訊息給出席者。' : 'Send a message to attendees right now.'}</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{zh ? '訊息' : 'Message'}</label>
              <textarea
                value={blastMsg}
                onChange={(e) => setBlastMsg(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={zh ? '您的訊息（中英文相同）…' : 'Your message (used for both English and Chinese)…'}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{zh ? '發送方式' : 'Send via'}</p>
              <div className="flex gap-3 flex-wrap">
                {([
                  ['EMAIL', zh ? '✉️ 電子郵件' : '✉️ Email'],
                  ['IN_APP', zh ? '🔔 站內通知' : '🔔 In-App'],
                ] as const).map(([ch, label]) => (
                  <label key={ch} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition ${
                    blastChannels.includes(ch) ? 'border-indigo-500 bg-indigo-50 dark:bg-gray-700 dark:border-gray-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}>
                    <input type="checkbox" className="sr-only" checked={blastChannels.includes(ch)} onChange={() => toggleBlastChannel(ch)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{zh ? '發送對象' : 'Send to'}</p>
              <div className="flex gap-3 flex-wrap">
                {([
                  ['rsvped', zh ? '已回覆的用戶' : 'RSVPed Only'],
                  ['invited', zh ? '所有受邀者' : 'All Invited'],
                ] as [typeof blastAudience, string][]).map(([val, label]) => (
                  <label key={val} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition ${
                    blastAudience === val ? 'border-indigo-500 bg-indigo-50 dark:bg-gray-700 dark:border-gray-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
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
                disabled={!blastMsg.trim() || blastChannels.length === 0}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
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
        <h2 className="text-lg font-semibold mb-3 dark:text-white">{zh ? '留言' : 'Comments'}</h2>

        {user && (
          <form onSubmit={handleComment} className="flex gap-2 mb-4">
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={zh ? '寫下留言…' : 'Write a comment…'}
              maxLength={1000}
              className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
          <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '目前沒有留言。' : 'No comments yet.'}</p>
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
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.userHandle}</p>
                    {(canEdit || canDelete) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && !isEditing && (
                          <button
                            onClick={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }}
                            title={zh ? '編輯' : 'Edit'}
                            aria-label={zh ? '編輯留言' : 'Edit comment'}
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
                            aria-label={zh ? '刪除留言' : 'Delete comment'}
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
                        maxLength={1000}
                        className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{c.body}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
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

                {isReplying && (
                  <div className="ml-4 mt-2 bg-indigo-50 dark:bg-gray-800 rounded-lg p-3">
                    <form onSubmit={(e) => handleReply(e, c.id)} className="flex gap-2">
                      <input
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder={zh ? '寫下回覆…' : 'Write a reply…'}
                        maxLength={1000}
                        className="flex-1 border border-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

                {c.replies && c.replies.length > 0 && (
                  <div className="ml-4 mt-2 flex flex-col gap-2">
                    {c.replies.map((reply) => {
                      const isOwnReply = user?.id === reply.userId;
                      const canDeleteReply = isOwnReply || user?.role === 'ADMIN';
                      return (
                        <div key={reply.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-gray-500 font-medium">{reply.userHandle}</p>
                            {canDeleteReply && (
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                title={zh ? '刪除' : 'Delete'}
                                aria-label={zh ? '刪除回覆' : 'Delete reply'}
                                className="text-gray-400 hover:text-red-500 transition text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{reply.body}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowInviteModal(false)}>
          <div role="dialog" aria-modal="true" aria-label={zh ? '活動分享連結' : 'Event share link'} className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-center dark:text-white">{zh ? '活動分享連結' : 'Event Share Link'}</h3>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 break-all">
              <p className="text-sm font-mono text-indigo-600 dark:text-indigo-400">{inviteLink}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopyInviteLink}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
              >
                {copyDone ? (zh ? '✓ 已複製' : '✓ Copied!') : (zh ? '複製' : 'Copy')}
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
