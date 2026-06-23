'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

type UserResult = {
  id: string;
  displayName: string | null;
  handle: string;
  email?: string | null;
  phoneE164?: string | null;
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
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);

  // guest list
  type GuestEntry = { handle: string; displayName: string | null; email?: string; phone?: string; plusOneOf?: string };
  type InvitedEntry = { name: string; email?: string | null; phone?: string | null };
  type PlusOne = { id: string; name: string; email?: string | null; phone?: string | null; relationship?: string | null; notes?: string | null };

  // plus-ones state
  const [myPlusOnes, setMyPlusOnes] = useState<PlusOne[]>([]);
  const [showPlusOneModal, setShowPlusOneModal] = useState(false);
  const [showPlusOneForm, setShowPlusOneForm] = useState(false);
  const [poName, setPoName] = useState('');
  const [poContact, setPoContact] = useState('');
  const [poRelationship, setPoRelationship] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poLoading, setPoLoading] = useState(false);
  const [poMsg, setPoMsg] = useState('');

  const loadMyPlusOnes = async () => {
    try {
      const data = await apiFetch<PlusOne[]>(`/events/${params.id}/rsvp/plus-ones`);
      setMyPlusOnes(data);
    } catch { setMyPlusOnes([]); }
  };

  const handleAddPlusOne = async () => {
    if (!poName.trim()) return;
    setPoLoading(true);
    setPoMsg('');
    try {
      const isEmail = poContact.includes('@');
      await apiFetch(`/events/${params.id}/rsvp/plus-ones`, {
        method: 'POST',
        body: JSON.stringify({
          name: poName.trim(),
          ...(isEmail ? { email: poContact.trim() } : poContact.trim() ? { phone: poContact.trim() } : {}),
          ...(poRelationship.trim() ? { relationship: poRelationship.trim() } : {}),
          ...(poNotes.trim() ? { notes: poNotes.trim() } : {}),
        }),
      });
      setPoName(''); setPoContact(''); setPoRelationship(''); setPoNotes('');
      setShowPlusOneForm(false);
      await loadMyPlusOnes();
      setGuests(null);
    } catch (err: any) {
      setPoMsg(err.message ?? (zh ? '新增失敗' : 'Failed to add guest'));
    } finally { setPoLoading(false); }
  };

  const handleRemovePlusOne = async (id: string) => {
    try {
      await apiFetch(`/events/${params.id}/rsvp/plus-ones/${id}`, { method: 'DELETE' });
      setMyPlusOnes((prev) => prev.filter((p) => p.id !== id));
      setGuests(null);
    } catch {}
  };
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
  const [directInviteQuery, setDirectInviteQuery] = useState('');
  const [directInviteSearchResults, setDirectInviteSearchResults] = useState<UserResult[]>([]);
  const [directInviteSearchLoading, setDirectInviteSearchLoading] = useState(false);
  const [directInviteLoading, setDirectInviteLoading] = useState(false);
  const [directInviteMsg, setDirectInviteMsg] = useState('');
  // invite section tab: 'search' | 'roster'
  const [inviteTab, setInviteTab] = useState<'search' | 'roster'>('search');
  // roster guest add form
  const [rosterGuests, setRosterGuests] = useState<PlusOne[]>([]);
  const [rgName, setRgName] = useState('');
  const [rgContact, setRgContact] = useState('');
  const [rgRelationship, setRgRelationship] = useState('');
  const [rgNotes, setRgNotes] = useState('');
  const [rgLoading, setRgLoading] = useState(false);
  const [rgMsg, setRgMsg] = useState('');

  const loadRosterGuests = async () => {
    try {
      const data = await apiFetch<PlusOne[]>(`/events/${params.id}/roster-guests`);
      setRosterGuests(Array.isArray(data) ? data : []);
    } catch { setRosterGuests([]); }
  };

  const handleAddRosterGuest = async () => {
    if (!rgName.trim()) return;
    setRgLoading(true); setRgMsg('');
    try {
      const isEmail = rgContact.includes('@');
      await apiFetch(`/events/${params.id}/roster-guests`, {
        method: 'POST',
        body: JSON.stringify({
          name: rgName.trim(),
          ...(isEmail ? { email: rgContact.trim() } : rgContact.trim() ? { phone: rgContact.trim() } : {}),
          ...(rgRelationship.trim() ? { relationship: rgRelationship.trim() } : {}),
          ...(rgNotes.trim() ? { notes: rgNotes.trim() } : {}),
        }),
      });
      setRgName(''); setRgContact(''); setRgRelationship(''); setRgNotes('');
      setRgMsg(zh ? '已新增至名單。' : 'Added to roster.');
      loadRosterGuests();
    } catch { setRgMsg(zh ? '新增失敗，請再試。' : 'Failed to add. Please try again.'); }
    finally { setRgLoading(false); }
  };

  const handleRemoveRosterGuest = async (id: string) => {
    try {
      await apiFetch(`/events/${params.id}/roster-guests/${id}`, { method: 'DELETE' });
      setRosterGuests((prev) => prev.filter((g) => g.id !== id));
    } catch {}
  };

  const searchInviteUsers = async (q: string) => {
    setDirectInviteQuery(q);
    setDirectInviteMsg('');
    if (!q.trim()) { setDirectInviteSearchResults([]); return; }
    setDirectInviteSearchLoading(true);
    try {
      const res = await apiFetch<UserResult[]>(`/users/search?q=${encodeURIComponent(q)}`);
      setDirectInviteSearchResults(Array.isArray(res) ? res : []);
    } catch { setDirectInviteSearchResults([]); }
    finally { setDirectInviteSearchLoading(false); }
  };

  const handleInviteUser = async (u: UserResult) => {
    setDirectInviteLoading(true);
    setDirectInviteMsg('');
    try {
      await apiFetch(`/events/${params.id}/invite-members`, {
        method: 'POST',
        body: JSON.stringify({ userIds: [u.id] }),
      });
      setDirectInviteMsg(zh ? `已邀請 ${u.displayName ?? u.handle}。` : `Invited ${u.displayName ?? u.handle}.`);
      setDirectInviteSearchResults([]);
      setDirectInviteQuery('');
      setGuests(null);
    } catch (err: unknown) {
      setDirectInviteMsg((err as Error).message ?? (zh ? '邀請失敗。' : 'Failed to invite.'));
    } finally { setDirectInviteLoading(false); }
  };

  // blast state
  const [blastMsg, setBlastMsg] = useState('');
  const [blastChannels, setBlastChannels] = useState<string[]>(['IN_APP']);
  const [blastAudience, setBlastAudience] = useState<'rsvped' | 'invited'>('invited');
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
      setBlastResult('✓ Message sent');
      setBlastMsg('');
    } catch (err: unknown) {
      setBlastResult('Failed to send. Please try again.');
    }
  };

  // feed state
  const [goingList, setGoingList] = useState<GuestEntry[]>([]);
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
      apiFetch<{ GOING: GuestEntry[] }>(`/events/${params.id}/rsvp/guests`).catch(() => ({ GOING: [] })),
    ]).then(([ev, commentsData, rsvpData]) => {
      setEvent(ev);
      setRsvpStatus(ev.myRsvp);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      setGoingList(rsvpData.GOING ?? []);
      setLoading(false);
      if (ev.myRsvp === 'GOING') {
        apiFetch<PlusOne[]>(`/events/${params.id}/rsvp/plus-ones`).then(setMyPlusOnes).catch(() => {});
      }
      if (ev.groupId) {
        const gid = ev.groupId;
        apiFetch<Array<{ group: { id: string }; membership: { role: string; status: string } }>>('/groups/me')
          .then(groups => {
            const match = groups.find((g) => g.group.id === gid);
            setIsGroupAdmin(match?.membership.status === 'ACCEPTED' && match?.membership.role === 'GROUP_ADMIN');
          })
          .catch(() => {});
      }
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
      setMyPlusOnes([]);
    } else {
      await apiFetch(`/events/${params.id}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setRsvpStatus(status);
      if (status === 'GOING') {
        apiFetch<PlusOne[]>(`/events/${params.id}/rsvp/plus-ones`).then(setMyPlusOnes).catch(() => {});
      } else {
        setMyPlusOnes([]);
      }
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

  const isEventAdmin = user?.role === 'ADMIN' || event.createdById === user?.id || isGroupAdmin;

  const title = event.title;
  const description = event.description;
  const location = event.location;

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
      className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
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
      <div>
        <Link
          href={`/${locale}/events`}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {zh ? '返回活動列表' : 'Back to Events'}
        </Link>
      </div>
      {showDeleteModal && (
        <ConfirmModal
          title={zh ? '刪除活動' : 'Delete Event'}
          message={
            zh
              ? `確定要永久刪除「${event.title}」嗎？此操作無法恢復。`
              : `Are you sure you want to delete "${event.title}"? This cannot be undone.`
          }
          confirmLabel={zh ? '確定刪除' : 'Delete'}
          cancelLabel={zh ? '取消' : 'Cancel'}
          onConfirm={handleDeleteEvent}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      {/* Admin toolbar */}
      {(user?.role === 'ADMIN' || event.createdById === user?.id || isGroupAdmin) && (
        <div className="flex gap-3 py-2 border-b border-dashed border-gray-200 dark:border-gray-700 flex-wrap">
          <a
            href={`/${locale}/admin/events/${params.id}/edit`}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 font-medium"
          >
            {zh ? '編輯活動' : 'Edit Event'}
          </a>
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
            📚 {eventSeries.title}
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
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">{event.groupName}</span>
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
          <span>{startDate}{event.timezone ? ` (${event.timezone})` : ''}</span>
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
            className="px-4 py-2 rounded-xl text-sm font-medium border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400 transition"
          >
            {zh ? '賓客名單' : 'Guest List'}
          </button>
          {rsvpStatus === 'GOING' && user && !isPast && (
            <button
              onClick={() => { setShowPlusOneModal(true); setShowPlusOneForm(false); setPoMsg(''); }}
              className="px-4 py-2 rounded-xl text-sm font-medium border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400 transition"
            >
              {zh ? '帶同行者' : '+ Guest'}
            </button>
          )}
          {!isPast && (
            <button
              onClick={handleCreateInvite}
              disabled={inviteLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-cyan-500 text-white hover:bg-cyan-600 transition disabled:opacity-50"
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
                className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {zh ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmNo}
                className="rounded-xl bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition"
              >
                {zh ? '確認不參加' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Plus-one modal */}
      {showPlusOneModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowPlusOneModal(false)}>
          <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{zh ? '同行者' : 'Your Guests'}</h3>
              <button onClick={() => setShowPlusOneModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
            </div>

            {myPlusOnes.length > 0 && (
              <ul className="flex flex-col gap-2">
                {myPlusOnes.map((po) => (
                  <li key={po.id} className="flex items-start justify-between gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{po.name}</span>
                      {po.relationship && <span className="text-xs text-gray-400">{po.relationship}</span>}
                      {(po.email || po.phone) && <span className="text-xs text-gray-400">{po.email ?? po.phone}</span>}
                      {po.notes && <span className="text-xs text-gray-400 italic">{po.notes}</span>}
                    </div>
                    <button onClick={() => handleRemovePlusOne(po.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0 mt-0.5">{zh ? '移除' : 'Remove'}</button>
                  </li>
                ))}
              </ul>
            )}

            {!showPlusOneForm ? (
              <button
                onClick={() => { setShowPlusOneForm(true); setPoMsg(''); }}
                className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-2.5 text-sm text-gray-400 dark:text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition"
              >
                {zh ? '+ 新增同行者' : '+ Add a guest'}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input value={poName} onChange={(e) => setPoName(e.target.value)} placeholder={zh ? '姓名 *' : 'Name *'} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" maxLength={100} autoFocus />
                <input value={poContact} onChange={(e) => setPoContact(e.target.value)} placeholder={zh ? '電話 / Email' : 'Phone / Email'} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" maxLength={100} />
                <input value={poRelationship} onChange={(e) => setPoRelationship(e.target.value)} placeholder={zh ? '關係（例：伴侶、朋友）' : 'Relationship (e.g. partner, friend)'} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" maxLength={100} />
                <textarea value={poNotes} onChange={(e) => setPoNotes(e.target.value)} placeholder={zh ? '備註' : 'Notes'} rows={2} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" maxLength={500} />
                {poMsg && <p className="text-xs text-red-500">{poMsg}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowPlusOneForm(false); setPoMsg(''); }} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">{zh ? '取消' : 'Cancel'}</button>
                  <button onClick={handleAddPlusOne} disabled={poLoading || !poName.trim()} className="rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50">{poLoading ? (zh ? '新增中…' : 'Adding…') : (zh ? '新增' : 'Add')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
            {(user?.role === 'ADMIN' || event.createdById === user?.id || isGroupAdmin) && (
              <button
                onClick={handleExportCsv}
                className="shrink-0 px-3 py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                title={zh ? '匯出 CSV' : 'Export CSV'}
              >
                {zh ? '匯出' : 'Export'}
              </button>
            )}
          </div>

          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <input
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
              placeholder={zh ? '搜尋…' : 'Search…'}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        {isEventAdmin && g.email && <p className="text-xs text-gray-400 truncate">{g.email}</p>}
                        {isEventAdmin && (g as any).phone && <p className="text-xs text-gray-400 truncate">{(g as any).phone}</p>}
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
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${(g as any).plusOneOf ? 'pl-8 bg-gray-50/50 dark:bg-gray-800/30' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-500 shrink-0">
                      {(g.displayName ?? g.handle ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{g.displayName ?? g.handle}</p>
                        {(g as any).plusOneOf && (
                          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {zh ? `同 ${(g as any).plusOneOf} 來` : `+1 of ${(g as any).plusOneOf}`}
                          </span>
                        )}
                      </div>
                      {isEventAdmin && g.email && <p className="text-xs text-gray-400 truncate">{g.email}</p>}
                      {isEventAdmin && g.phone && <p className="text-xs text-gray-400 truncate">{g.phone}</p>}
                    </div>
                  </div>
                ));
            })()}
          </div>
        </div>
      )}

      {/* Invite Guest by search or add to roster (event creator/admin) */}
      {(user?.role === 'ADMIN' || event.createdById === user?.id || isGroupAdmin) && (
        <section className="border border-dashed border-green-200 dark:border-green-900/40 rounded-xl p-5 bg-green-50/40 dark:bg-gray-900/50">
          <h2 className="text-base font-semibold mb-3 dark:text-white">{zh ? '邀請賓客' : 'Invite Guest'}</h2>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setInviteTab('search')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${inviteTab === 'search' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {zh ? '搜尋用戶' : 'Search Users'}
            </button>
            <button
              onClick={() => { setInviteTab('roster'); loadRosterGuests(); setRgMsg(''); }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${inviteTab === 'roster' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {zh ? '新增至名單' : 'Add to Roster'}
            </button>
          </div>

          {inviteTab === 'search' ? (
            <>
              <input
                type="text"
                value={directInviteQuery}
                onChange={(e) => searchInviteUsers(e.target.value)}
                placeholder={zh ? '搜尋用戶（姓名、Email 或電話）' : 'Search by name, email, or phone'}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              />
              {directInviteSearchLoading && (
                <p className="text-sm text-gray-400 mb-2">{zh ? '搜尋中…' : 'Searching…'}</p>
              )}
              {directInviteSearchResults.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-2">
                  {directInviteSearchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleInviteUser(u)}
                      disabled={directInviteLoading}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 disabled:opacity-50 transition"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{u.displayName ?? u.handle}</p>
                        {(u.email || u.phoneE164) && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{[u.email, u.phoneE164].filter(Boolean).join(' · ')}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 ml-3 shrink-0">
                        {directInviteLoading ? (zh ? '邀請中…' : 'Inviting…') : (zh ? '邀請' : 'Invite')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {directInviteMsg && (
                <p className={`text-sm ${directInviteMsg.startsWith('Invited') || directInviteMsg.startsWith('已邀請') ? 'text-green-600' : 'text-red-500'}`}>
                  {directInviteMsg}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Existing roster guests */}
              {rosterGuests.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {rosterGuests.map((g) => (
                    <li key={g.id} className="flex items-start justify-between gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{g.name}</span>
                        {g.relationship && <span className="text-xs text-gray-400">{g.relationship}</span>}
                        {(g.email || g.phone) && <span className="text-xs text-gray-400">{g.email ?? g.phone}</span>}
                        {g.notes && <span className="text-xs text-gray-400 italic">{g.notes}</span>}
                      </div>
                      <button onClick={() => handleRemoveRosterGuest(g.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0 mt-0.5">{zh ? '移除' : 'Remove'}</button>
                    </li>
                  ))}
                </ul>
              )}
              {/* Add form */}
              <input value={rgName} onChange={(e) => setRgName(e.target.value)} placeholder={zh ? '姓名 *' : 'Name *'} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" maxLength={100} />
              <input value={rgContact} onChange={(e) => setRgContact(e.target.value)} placeholder={zh ? '電話 / Email' : 'Phone / Email'} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" maxLength={100} />
              <input value={rgRelationship} onChange={(e) => setRgRelationship(e.target.value)} placeholder={zh ? '關係（例：朋友、同事）' : 'Relationship (e.g. friend, colleague)'} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" maxLength={100} />
              <textarea value={rgNotes} onChange={(e) => setRgNotes(e.target.value)} placeholder={zh ? '備註' : 'Notes'} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" maxLength={500} />
              {rgMsg && <p className={`text-sm ${rgMsg.includes('Failed') || rgMsg.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>{rgMsg}</p>}
              <div className="flex justify-end">
                <button onClick={handleAddRosterGuest} disabled={rgLoading || !rgName.trim()} className="rounded-xl bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-50">
                  {rgLoading ? (zh ? '新增中…' : 'Adding…') : (zh ? '新增至名單' : 'Add to Roster')}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Send Message Blast (admin or event creator) */}
      {(user?.role === 'ADMIN' || event.createdById === user?.id || isGroupAdmin) && (
        <section className="border border-dashed border-indigo-200 dark:border-gray-700 rounded-xl p-5 bg-indigo-50/40 dark:bg-gray-900/50">
          <h2 className="text-lg font-semibold mb-1 dark:text-white">{zh ? '群組訊息' : 'Text Blast'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Send a message to attendees right now.</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Message</label>
              <textarea
                value={blastMsg}
                onChange={(e) => setBlastMsg(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Write your message…"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Send via</p>
              <div className="flex gap-3 flex-wrap">
                {([
                  ['EMAIL', '✉️ Email'],
                  ['IN_APP', '🔔 In-App'],
                ] as const).map(([ch, label]) => (
                  <label key={ch} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition text-gray-900 dark:text-gray-100 ${
                    blastChannels.includes(ch) ? 'border-indigo-500 bg-indigo-50 dark:bg-gray-700 dark:border-gray-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}>
                    <input type="checkbox" className="sr-only" checked={blastChannels.includes(ch)} onChange={() => toggleBlastChannel(ch)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Send to</p>
              <div className="flex gap-3 flex-wrap">
                {([
                  ['rsvped', 'RSVPed Only'],
                  ['invited', 'All Invited'],
                ] as [typeof blastAudience, string][]).map(([val, label]) => (
                  <label key={val} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition text-gray-900 dark:text-gray-100 ${
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
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Send Now
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

      {/* Feed */}
      <section>
        <h2 className="text-lg font-semibold mb-3 dark:text-white">{zh ? '動態' : 'Feed'}</h2>

        {user && (
          <form onSubmit={handleComment} className="flex gap-2 mb-4">
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={zh ? '寫下留言…' : 'Write a comment…'}
              maxLength={1000}
              className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
            >
              {zh ? '送出' : 'Post'}
            </button>
          </form>
        )}

        {goingList.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {goingList.map((g, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                ✓ {g.displayName ?? g.handle} {zh ? '要參加' : 'is going'}
              </div>
            ))}
          </div>
        )}

        {comments.length === 0 && goingList.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '還沒有動態。' : 'No feeds yet.'}</p>
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
                        className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditComment(c.id)}
                          className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-xl hover:bg-indigo-700 font-medium"
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
                        className="flex-1 border border-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-indigo-700"
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
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{reply.userHandle}</p>
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
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition font-medium text-sm"
              >
                {copyDone ? (zh ? '✓ 已複製' : '✓ Copied!') : (zh ? '複製' : 'Copy')}
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium text-sm"
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
