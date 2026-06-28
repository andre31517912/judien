'use client';

import { useState, useEffect, useRef } from 'react';
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
  type GuestEntry = { handle: string; displayName: string | null; email?: string; phone?: string; checkedIn?: boolean; userId?: string; guestRsvpId?: string; source?: 'user' | 'guest' };
  type InvitedEntry = { name: string; email?: string | null; phone?: string | null; relationship?: string | null };
  type ExtraGuest = { id?: string; addedByUserId?: string | null; name: string; email?: string; phone?: string; relationship?: string; connectedInviteeName?: string; addedByName: string };
  type PlusOne = { id: string; name: string; email?: string | null; phone?: string | null; relationship?: string | null; connectedInviteeName?: string | null; notes?: string | null };

  // unified invite modal state
  const [showInviteGuestModal, setShowInviteGuestModal] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState<'search' | 'outside'>('search');
  // my outside guests (plus-ones I added)
  const [myPlusOnes, setMyPlusOnes] = useState<PlusOne[]>([]);
  const [poName, setPoName] = useState('');
  const [poContact, setPoContact] = useState('');
  const [poRelationship, setPoRelationship] = useState('');
  const [poConnectedTo, setPoConnectedTo] = useState('');
  const [poConnectedToSuggestions, setPoConnectedToSuggestions] = useState<string[]>([]);
  const [poNotes, setPoNotes] = useState('');
  const [poLoading, setPoLoading] = useState(false);
  const [poMsg, setPoMsg] = useState('');
  // delete state
  const [deletingGuest, setDeletingGuest] = useState<string | null>(null);

  // transportation + sub-events
  const [myTransportation, setMyTransportation] = useState<string>('');
  const [transportationSaved, setTransportationSaved] = useState(false);
  const [transportationLoading, setTransportationLoading] = useState(false);
  const [subEventLoading, setSubEventLoading] = useState<string | null>(null);

  const handleSaveTransportation = async () => {
    if (transportationLoading) return;
    setTransportationLoading(true);
    try {
      await apiFetch(`/events/${params.id}/rsvp/transportation`, {
        method: 'PATCH',
        body: JSON.stringify({ method: myTransportation.trim() }),
      });
      setTransportationSaved(true);
      setTimeout(() => setTransportationSaved(false), 3000);
    } catch (err: any) {
      alert(err.message ?? 'Failed to save.');
    } finally {
      setTransportationLoading(false);
    }
  };

  const [checkingIn, setCheckingIn] = useState<Set<string>>(new Set());

  const handleCheckIn = async (entry: GuestEntry, checkedIn: boolean) => {
    const key = entry.userId ?? entry.guestRsvpId ?? '';
    if (!key || checkingIn.has(key)) return;
    setCheckingIn((prev) => new Set(prev).add(key));
    try {
      const url = entry.source === 'guest'
        ? `/events/${params.id}/guest-rsvp/${entry.guestRsvpId}/checkin`
        : `/events/${params.id}/rsvp/${entry.userId}/checkin`;
      await apiFetch(url, { method: 'PATCH', body: JSON.stringify({ checkedIn }) });
      setGuests((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          GOING: prev.GOING.map((g) =>
            (g.userId === entry.userId && entry.userId) || (g.guestRsvpId === entry.guestRsvpId && entry.guestRsvpId)
              ? { ...g, checkedIn }
              : g,
          ),
        };
      });
    } catch (err: any) {
      alert(err.message ?? 'Check-in failed.');
    } finally {
      setCheckingIn((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const handleSubEventToggle = async (subId: string, isMine: boolean) => {
    if (subEventLoading) return;
    setSubEventLoading(subId);
    try {
      if (isMine) {
        await apiFetch(`/events/${params.id}/sub-events/${subId}/join`, { method: 'DELETE' });
      } else {
        await apiFetch(`/events/${params.id}/sub-events/${subId}/join`, { method: 'POST' });
      }
      const ev = await apiFetch<EventWithCounts>(`/events/${params.id}`);
      setEvent(ev);
    } catch (err: any) {
      alert(err.message ?? 'Failed to update.');
    } finally {
      setSubEventLoading(null);
    }
  };

  // loading guards
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          ...(poConnectedTo.trim() ? { connectedInviteeName: poConnectedTo.trim() } : {}),
          ...(poNotes.trim() ? { notes: poNotes.trim() } : {}),
        }),
      });
      setPoName(''); setPoContact(''); setPoRelationship(''); setPoConnectedTo(''); setPoConnectedToSuggestions([]); setPoNotes('');
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
    } catch {
      setPoMsg(zh ? '移除失敗，請再試。' : 'Failed to remove. Please try again.');
    }
  };

  const handleDeleteGuestRsvp = async (targetUserId: string) => {
    if (deletingGuest) return;
    setDeletingGuest(targetUserId);
    try {
      await apiFetch(`/events/${params.id}/rsvp/${targetUserId}`, { method: 'DELETE' });
      setGuests(null);
      loadGuests();
    } catch (err: any) {
      alert(err.message ?? (zh ? '移除失敗，請再試。' : 'Failed to remove guest. Please try again.'));
    } finally {
      setDeletingGuest(null);
    }
  };

  const handleDeleteExtraGuest = async (id: string) => {
    if (deletingGuest) return;
    setDeletingGuest(id);
    try {
      await apiFetch(`/events/${params.id}/rsvp/plus-ones/${id}`, { method: 'DELETE' });
      setGuests(null);
      loadGuests();
    } catch (err: any) {
      alert(err.message ?? (zh ? '移除失敗，請再試。' : 'Failed to remove guest. Please try again.'));
    } finally {
      setDeletingGuest(null);
    }
  };
  type Guests = { GOING: GuestEntry[]; NO: GuestEntry[]; INVITED: InvitedEntry[]; PENDING?: GuestEntry[]; EXTRA_GUESTS?: ExtraGuest[] };
  const [guests, setGuests] = useState<Guests | null>(null);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [activeGuestTab, setActiveGuestTab] = useState<'INVITED' | 'GOING' | 'NO' | 'PENDING' | 'EXTRA_GUESTS'>('GOING');
  const [showGuests, setShowGuests] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');

  const loadGuests = async () => {
    if (guests) return;
    setGuestsLoading(true);
    try {
      const [rsvpData, inviteesData] = await Promise.all([
        apiFetch<{ GOING: GuestEntry[]; NO: GuestEntry[]; INVITED?: InvitedEntry[]; PENDING?: GuestEntry[]; EXTRA_GUESTS?: ExtraGuest[] }>(`/events/${params.id}/rsvp/guests`),
        apiFetch<EventInvitee[]>(`/event-invites/event/${params.id}/invitees`).catch(() => [] as EventInvitee[]),
      ]);
      setGuests({
        GOING: rsvpData.GOING,
        NO: rsvpData.NO,
        INVITED: rsvpData.INVITED
          ? rsvpData.INVITED.map((i) => ({ name: i.name, email: i.email ?? undefined, phone: i.phone ?? undefined }))
          : inviteesData.map((i) => ({ name: i.guestName ?? i.displayName ?? '', email: i.email ?? undefined })),
        PENDING: rsvpData.PENDING,
        EXTRA_GUESTS: rsvpData.EXTRA_GUESTS ?? [],
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
          apiFetch<{ GOING: GuestEntry[]; NO: GuestEntry[]; INVITED?: InvitedEntry[]; PENDING?: GuestEntry[]; EXTRA_GUESTS?: ExtraGuest[] }>(`/events/${params.id}/rsvp/guests`),
          apiFetch<EventInvitee[]>(`/event-invites/event/${params.id}/invitees`).catch(() => [] as EventInvitee[]),
        ]);
        data = {
          GOING: rsvpData.GOING,
          NO: rsvpData.NO,
          INVITED: rsvpData.INVITED
            ? rsvpData.INVITED.map((i) => ({ name: i.name, email: i.email ?? undefined, phone: i.phone ?? undefined }))
            : inviteesData.map((i) => ({ name: i.guestName ?? i.displayName ?? '', email: i.email ?? undefined })),
          PENDING: rsvpData.PENDING,
          EXTRA_GUESTS: rsvpData.EXTRA_GUESTS ?? [],
        };
        setGuests(data);
      } finally {
        setGuestsLoading(false);
      }
    }
    const rows = ['Name,Email,Phone,Status'];
    for (const g of (data.INVITED ?? [])) rows.push([esc(g.name), esc(g.email ?? ''), esc(g.phone ?? ''), esc('Invited')].join(','));
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
  const [directInviteLoading, setDirectInviteLoading] = useState<string | null>(null);
  const [directInviteMsg, setDirectInviteMsg] = useState('');
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
    if (directInviteLoading) return;
    setDirectInviteLoading(u.id);
    setDirectInviteMsg('');
    try {
      await apiFetch(`/events/${params.id}/invite-members`, {
        method: 'POST',
        body: JSON.stringify({ userIds: [u.id] }),
      });
      const msg = zh ? `已邀請 ${u.displayName ?? u.handle}。` : `Invited ${u.displayName ?? u.handle}.`;
      setDirectInviteMsg(msg);
      setTimeout(() => setDirectInviteMsg(''), 4000);
      setDirectInviteSearchResults([]);
      setDirectInviteQuery('');
      setGuests(null);
    } catch (err: unknown) {
      setDirectInviteMsg((err as Error).message ?? (zh ? '邀請失敗。' : 'Failed to invite.'));
    } finally { setDirectInviteLoading(null); }
  };

  // blast state
  const [showBlastModal, setShowBlastModal] = useState(false);
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
      setTimeout(() => { setBlastResult(''); setShowBlastModal(false); }, 1200);
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
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setCopyDone(true);
    copyTimeoutRef.current = setTimeout(() => setCopyDone(false), 2000);
  };

  // event series state
  const [eventSeries, setEventSeries] = useState<EventSeries | null>(null);

  useEffect(() => {
    if (event?.seriesId) {
      apiFetch<EventSeries>(`/event-series/${event.seriesId}`).then(setEventSeries).catch(() => {});
    }
  }, [event?.seriesId]);

  const anyModalOpen = showInviteModal || showNoReason || showInviteGuestModal || showDeleteModal || showBlastModal;
  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowInviteModal(false);
          setShowNoReason(false);
          setShowGuests(false);
          setShowInviteGuestModal(false);
          setShowDeleteModal(false);
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
      if (ev.myTransportation) setMyTransportation(ev.myTransportation);
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
    if (!user || rsvpLoading) return;
    if (status === 'NO' && rsvpStatus !== 'NO') {
      setShowNoReason(true);
      setNoReason('');
      return;
    }
    setShowNoReason(false);
    setRsvpLoading(true);
    try {
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
      const ev = await apiFetch<EventWithCounts>(`/events/${params.id}`);
      setEvent(ev);
      setMyTransportation(ev.myTransportation ?? '');
      setGuests(null);
    } catch (err: any) {
      alert(err.message ?? (zh ? 'RSVP 更新失敗，請再試。' : 'Failed to update RSVP. Please try again.'));
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleConfirmNo = async () => {
    if (!user || rsvpLoading) return;
    setShowNoReason(false);
    setRsvpLoading(true);
    try {
      await apiFetch(`/events/${params.id}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status: 'NO', ...(noReason.trim() ? { declineReason: noReason.trim() } : {}) }),
      });
      setRsvpStatus('NO');
      setNoReason('');
      setMyPlusOnes([]);
      const ev = await apiFetch<EventWithCounts>(`/events/${params.id}`);
      setEvent(ev);
      setMyTransportation(ev.myTransportation ?? '');
      setGuests(null);
    } catch (err: any) {
      alert(err.message ?? (zh ? 'RSVP 更新失敗，請再試。' : 'Failed to update RSVP. Please try again.'));
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() || commentLoading) return;
    setCommentLoading(true);
    setCommentError('');
    try {
      const created = await apiFetch<Comment>(`/events/${params.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      setComments((prev) => [...prev, created]);
      setCommentBody('');
    } catch (err: any) {
      setCommentError(err.message ?? (zh ? '留言失敗，請再試。' : 'Failed to post comment. Please try again.'));
    } finally {
      setCommentLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyBody.trim() || replyLoading) return;
    setReplyLoading(true);
    try {
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
    } catch (err: any) {
      alert(err.message ?? (zh ? '回覆失敗，請再試。' : 'Failed to post reply. Please try again.'));
    } finally {
      setReplyLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiFetch(`/events/${params.id}/comments/${commentId}`, { method: 'DELETE' });
      setComments((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({ ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) })),
      );
    } catch (err: any) {
      alert(err.message ?? (zh ? '刪除失敗，請再試。' : 'Failed to delete. Please try again.'));
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentBody.trim()) return;
    try {
      const updated = await apiFetch<Comment>(`/events/${params.id}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: editCommentBody.trim() }),
      });
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body: updated.body } : c)));
      setEditingCommentId(null);
      setEditCommentBody('');
    } catch (err: any) {
      alert(err.message ?? (zh ? '儲存失敗，請再試。' : 'Failed to save. Please try again.'));
    }
  };

  const handleDeleteEvent = async () => {
    try {
      await apiFetch(`/events/${params.id}`, { method: 'DELETE' });
      router.push(`/${locale}/events`);
    } catch (err: any) {
      alert(err.message ?? (zh ? '刪除失敗，請再試。' : 'Failed to delete event. Please try again.'));
      setShowDeleteModal(false);
    }
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
      disabled={rsvpLoading}
      className={`px-4 py-2 rounded-xl text-sm font-medium border transition disabled:opacity-60 ${
        rsvpStatus === status
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400'
      }`}
    >
      {rsvpLoading ? '…' : label}
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
        {event.groupName && event.groupId && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400 dark:text-gray-500">{zh ? '主辦團體' : 'Hosted by'}</span>
            <Link href={`/${locale}/groups/${event.groupId}`} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">{event.groupName}</Link>
          </div>
        )}
        {event.createdByName && (
          <div className="flex gap-2">
            <span className="w-24 shrink-0 font-medium text-gray-400 dark:text-gray-500">{zh ? '主辦人' : 'Host'}</span>
            <Link href={`/${locale}/profile/${event.createdById}`} className="hover:underline">{event.createdByName}</Link>
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
          {user && (
            <button
              onClick={() => { setShowInviteGuestModal(true); setInviteModalTab('search'); setPoMsg(''); setPoName(''); setPoContact(''); setPoRelationship(''); setPoConnectedTo(isEventAdmin ? '' : (user?.displayName ?? '')); setPoConnectedToSuggestions([]); setPoNotes(''); setDirectInviteQuery(''); setDirectInviteSearchResults([]); setDirectInviteMsg(''); loadGuests(); }}
              className="px-4 py-2 rounded-xl text-sm font-medium border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400 transition"
            >
              {zh ? '邀請賓客' : 'Invite Guest'}
            </button>
          )}
          {isEventAdmin && (
            <button
              onClick={() => setShowBlastModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400 transition"
            >
              {zh ? '群發訊息' : 'Text Blast'}
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

        {/* Transportation input — shown when host collects it and user is Going */}
        {event.collectTransportation && rsvpStatus === 'GOING' && (
          <div className="rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 p-4 flex flex-col gap-2">
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              {zh ? '🚌 您如何前往活動？' : '🚌 How are you getting there?'}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={myTransportation}
                onChange={(e) => { setMyTransportation(e.target.value); setTransportationSaved(false); }}
                placeholder={zh ? '例：開車、騎車、搭捷運…' : 'e.g. Driving, biking, MRT…'}
                className="flex-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={500}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTransportation(); }}
              />
              <button
                onClick={handleSaveTransportation}
                disabled={transportationLoading || !myTransportation.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {transportationLoading ? '…' : transportationSaved ? (zh ? '已儲存 ✓' : 'Saved ✓') : (zh ? '儲存' : 'Save')}
              </button>
            </div>
          </div>
        )}

        {/* Sub-events activity picker — shown when user is Going and event has sub-events */}
        {(event.subEvents?.length ?? 0) > 0 && rsvpStatus === 'GOING' && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {zh ? '🎯 選擇您想參加的活動' : '🎯 Pick your activities'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {event.subEvents!.map((se) => (
                <button
                  key={se.id}
                  onClick={() => handleSubEventToggle(se.id, se.isMine)}
                  disabled={subEventLoading === se.id}
                  className={`text-left rounded-xl border p-3 transition disabled:opacity-60 ${
                    se.isMine
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-600'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${se.isMine ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>{se.title}</p>
                      {se.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{se.description}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${se.isMine ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {se.isMine ? (zh ? '已加入' : 'Joined') : (zh ? '加入' : 'Join')}
                      </span>
                      <span className="text-xs text-gray-400">{se.count} {zh ? '人' : 'going'}{se.maxCapacity ? ` / ${se.maxCapacity}` : ''}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unified Invite Guest modal */}
      {showInviteGuestModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowInviteGuestModal(false)}>
          <div className="w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{zh ? '邀請賓客' : 'Invite Guest'}</h3>
              <button onClick={() => setShowInviteGuestModal(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mx-6 mt-4 mb-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 shrink-0">
              <button
                onClick={() => setInviteModalTab('search')}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${inviteModalTab === 'search' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {zh ? '搜尋用戶' : 'Search Users'}
              </button>
              <button
                onClick={() => setInviteModalTab('outside')}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${inviteModalTab === 'outside' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {zh ? '新增外部賓客' : 'Add Outside Guest'}
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 pb-6">
              {inviteModalTab === 'search' ? (
                <div className="flex flex-col gap-3 pt-2">
                  <input
                    type="text"
                    value={directInviteQuery}
                    onChange={(e) => searchInviteUsers(e.target.value)}
                    placeholder={zh ? '搜尋用戶（姓名、Email 或電話）' : 'Search by name, email, or phone'}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  {directInviteSearchLoading && <p className="text-sm text-gray-400">{zh ? '搜尋中…' : 'Searching…'}</p>}
                  {directInviteSearchResults.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {directInviteSearchResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleInviteUser(u)}
                          disabled={!!directInviteLoading}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 disabled:opacity-50 transition"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{u.displayName ?? u.handle}</p>
                            {(u.email || u.phoneE164) && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">{[u.email, u.phoneE164].filter(Boolean).join(' · ')}</p>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 ml-3 shrink-0">
                            {directInviteLoading === u.id ? (zh ? '邀請中…' : 'Inviting…') : (zh ? '邀請' : 'Invite')}
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
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-2">
                  {/* My outside guests I've added */}
                  {myPlusOnes.length > 0 && (
                    <ul className="flex flex-col gap-2 mb-1">
                      {myPlusOnes.map((po) => (
                        <li key={po.id} className="flex items-start justify-between gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{po.name}</span>
                            {po.connectedInviteeName && po.relationship && <span className="text-xs text-gray-400">{po.connectedInviteeName}{zh ? '的' : "'s "}{po.relationship}</span>}
                            {po.connectedInviteeName && !po.relationship && <span className="text-xs text-gray-400">{po.connectedInviteeName}{zh ? '的賓客' : "'s guest"}</span>}
                            {!po.connectedInviteeName && po.relationship && <span className="text-xs text-gray-400">{po.relationship}</span>}
                            {(po.email || po.phone) && <span className="text-xs text-gray-400">{po.email ?? po.phone}</span>}
                            {po.notes && <span className="text-xs text-gray-400 italic">{po.notes}</span>}
                          </div>
                          <button onClick={() => handleRemovePlusOne(po.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0 mt-0.5">{zh ? '移除' : 'Remove'}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Add form */}
                  <input value={poName} onChange={(e) => setPoName(e.target.value)} placeholder={zh ? '賓客姓名 *' : 'Guest name *'} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" maxLength={100} />
                  <input value={poContact} onChange={(e) => setPoContact(e.target.value)} placeholder={zh ? '電話 / Email（選填）' : 'Phone / Email (optional)'} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" maxLength={100} />
                  {isEventAdmin ? (
                    <div className="relative">
                      <input
                        value={poConnectedTo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPoConnectedTo(val);
                          if (!val.trim()) { setPoConnectedToSuggestions([]); return; }
                          const term = val.toLowerCase();
                          const allNames = [
                            ...(guests?.INVITED ?? []).map((i) => i.name),
                            ...(guests?.GOING ?? []).map((g) => g.displayName ?? g.handle),
                            ...(guests?.PENDING ?? []).map((g) => g.displayName ?? g.handle),
                          ].filter(Boolean) as string[];
                          const unique = [...new Set(allNames)];
                          setPoConnectedToSuggestions(unique.filter((n) => n.toLowerCase().includes(term)).slice(0, 6));
                        }}
                        placeholder={zh ? '邀請人姓名（搜尋已邀請名單）' : "Inviter's name (search invited list)"}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        maxLength={200}
                      />
                      {poConnectedToSuggestions.length > 0 && (
                        <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                          {poConnectedToSuggestions.map((name) => (
                            <li key={name}>
                              <button type="button" onClick={() => { setPoConnectedTo(name); setPoConnectedToSuggestions([]); }} className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition">{name}</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                      <span className="text-gray-500 dark:text-gray-400 shrink-0">{zh ? '邀請人：' : 'Inviter:'}</span>
                      <span className="text-gray-800 dark:text-gray-200 font-medium">{user?.displayName ?? ''}</span>
                      <span className="ml-auto text-xs text-indigo-500 dark:text-indigo-400 shrink-0">{zh ? '（您）' : 'You'}</span>
                    </div>
                  )}
                  <input value={poRelationship} onChange={(e) => setPoRelationship(e.target.value)} placeholder={zh ? '與邀請人的關係（例：太太、朋友）' : "Guest's relationship to inviter (e.g. wife, friend)"} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" maxLength={100} />
                  <textarea value={poNotes} onChange={(e) => setPoNotes(e.target.value)} placeholder={zh ? '備註' : 'Notes'} rows={2} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" maxLength={500} />
                  {poMsg && <p className="text-xs text-red-500">{poMsg}</p>}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setPoName(''); setPoContact(''); setPoRelationship(''); setPoConnectedTo(isEventAdmin ? '' : (user?.displayName ?? '')); setPoConnectedToSuggestions([]); setPoNotes(''); setPoMsg(''); }} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">{zh ? '清除' : 'Clear'}</button>
                    <button onClick={handleAddPlusOne} disabled={poLoading || !poName.trim()} className="rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50">{poLoading ? (zh ? '新增中…' : 'Adding…') : (zh ? '新增賓客' : 'Add Guest')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guest list panel — tabs: Invited, Going, Not Going, Unresponded */}
      {showGuests && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-1">
            {([
              ['INVITED',      zh ? '已邀請' : 'Invited',        guests?.INVITED.length ?? 0],
              ['GOING',        zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going'), event.rsvpCounts.GOING],
              ['NO',           zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't Attend" : 'Not Going'), event.rsvpCounts.NO],
              ...(guests?.PENDING !== undefined ? [['PENDING', zh ? '未回應' : 'Unresponded', guests.PENDING.length] as [typeof activeGuestTab, string, number]] : []),
              ...(guests?.EXTRA_GUESTS !== undefined ? [['EXTRA_GUESTS', zh ? '外部賓客' : 'Extra Guests', guests.EXTRA_GUESTS.length] as [typeof activeGuestTab, string, number]] : []),
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
                        {g.relationship && <p className="text-xs text-indigo-500 dark:text-indigo-400 truncate">{g.relationship}</p>}
                        {isGroupAdmin && g.email && <p className="text-xs text-gray-400 truncate">{g.email}</p>}
                        {isGroupAdmin && g.phone && <p className="text-xs text-gray-400 truncate">{g.phone}</p>}
                      </div>
                    </div>
                  ));
              }
              if (activeGuestTab === 'EXTRA_GUESTS') {
                const rows = (guests?.EXTRA_GUESTS ?? []).filter((g) =>
                  !term || g.name.toLowerCase().includes(term) || (g.connectedInviteeName ?? '').toLowerCase().includes(term) || (g.addedByName ?? '').toLowerCase().includes(term)
                );
                return rows.length === 0
                  ? <p className="text-xs text-gray-400 px-4 py-4 text-center">{term ? (zh ? '找不到符合結果。' : 'No matches.') : (zh ? '目前沒有外部賓客。' : 'No outside guests yet.')}</p>
                  : rows.map((g, i) => {
                    const canDeleteExtra = isEventAdmin || (g.addedByUserId != null && g.addedByUserId === user?.id);
                    const isDeletingExtra = g.id ? deletingGuest === g.id : false;
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-500 shrink-0">
                          {(g.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{g.name}</p>
                          {g.connectedInviteeName && g.relationship && (
                            <p className="text-xs text-purple-500 dark:text-purple-400 truncate">{g.connectedInviteeName}{zh ? '的' : "'s "}{g.relationship}</p>
                          )}
                          {g.connectedInviteeName && !g.relationship && (
                            <p className="text-xs text-purple-500 dark:text-purple-400 truncate">{g.connectedInviteeName}{zh ? '的賓客' : "'s guest"}</p>
                          )}
                          {!g.connectedInviteeName && g.relationship && (
                            <p className="text-xs text-gray-400 truncate">{g.relationship}</p>
                          )}
                          <p className="text-xs text-gray-400 truncate">{zh ? '邀請者：' : 'inviter: '}{g.addedByName}</p>
                          {isEventAdmin && g.email && <p className="text-xs text-gray-400 truncate">{g.email}</p>}
                          {isEventAdmin && g.phone && <p className="text-xs text-gray-400 truncate">{g.phone}</p>}
                        </div>
                        {canDeleteExtra && g.id && (
                          <button
                            onClick={() => handleDeleteExtraGuest(g.id!)}
                            disabled={isDeletingExtra}
                            className="shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition"
                            title={zh ? '移除賓客' : 'Remove guest'}
                          >
                            {isDeletingExtra ? '…' : '✕'}
                          </button>
                        )}
                      </div>
                    );
                  });
              }
              const tabData = activeGuestTab === 'PENDING' ? (guests?.PENDING ?? []) : (guests?.[activeGuestTab as 'GOING' | 'NO'] ?? []);
              const rows = tabData.filter((g) =>
                !term || (g.displayName ?? '').toLowerCase().includes(term) || g.handle.toLowerCase().includes(term) || (g.email ?? '').toLowerCase().includes(term)
              );
              const emptyMsg = term ? (zh ? '找不到符合結果。' : 'No matches.') : activeGuestTab === 'PENDING' ? (zh ? '所有受邀者皆已回應。' : 'Everyone has responded.') : (zh ? '目前沒有人。' : 'Nobody yet.');
              const showCheckIn = isEventAdmin && activeGuestTab === 'GOING';
              const checkedInCount = showCheckIn ? (guests?.GOING ?? []).filter((g) => g.checkedIn).length : 0;
              return (
                <>
                  {showCheckIn && (guests?.GOING ?? []).length > 0 && (
                    <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${(guests!.GOING.length > 0 ? checkedInCount / guests!.GOING.length : 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        {checkedInCount} / {guests?.GOING.length ?? 0} {zh ? '已報到' : 'checked in'}
                      </span>
                    </div>
                  )}
                  {rows.length === 0
                    ? <p className="text-xs text-gray-400 px-4 py-4 text-center">{emptyMsg}</p>
                    : rows.map((g, i) => {
                      const key = g.userId ?? g.guestRsvpId ?? String(i);
                      const busy = checkingIn.has(key);
                      const isDeleting = g.userId ? deletingGuest === g.userId : false;
                      return (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${g.checkedIn ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500'}`}>
                            {g.checkedIn ? '✓' : (g.displayName ?? g.handle ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${g.checkedIn ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-800 dark:text-gray-200'}`}>
                              {g.displayName ?? g.handle}
                            </p>
                            {isEventAdmin && g.email && <p className="text-xs text-gray-400 truncate">{g.email}</p>}
                            {isEventAdmin && g.phone && <p className="text-xs text-gray-400 truncate">{g.phone}</p>}
                          </div>
                          {showCheckIn && (g.userId ?? g.guestRsvpId) && (
                            <button
                              onClick={() => handleCheckIn(g, !g.checkedIn)}
                              disabled={busy}
                              className={`shrink-0 text-xs px-2.5 py-1 rounded-lg border font-medium transition disabled:opacity-50 ${
                                g.checkedIn
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600'
                              }`}
                            >
                              {busy ? '…' : g.checkedIn ? (zh ? '✓ 已報到' : '✓ Checked in') : (zh ? '報到' : 'Check in')}
                            </button>
                          )}
                          {isEventAdmin && g.userId && g.userId !== user?.id && (
                            <button
                              onClick={() => handleDeleteGuestRsvp(g.userId!)}
                              disabled={isDeleting}
                              className="shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition ml-1"
                              title={zh ? '移除賓客' : 'Remove guest'}
                            >
                              {isDeleting ? '…' : '✕'}
                            </button>
                          )}
                        </div>
                      );
                    })
                  }
                </>
              );
            })()}
          </div>
        </div>
      )}



      {/* Feed */}
      <section>
        <h2 className="text-lg font-semibold mb-3 dark:text-white">{zh ? '動態' : 'Feed'}</h2>

        {comments.length === 0 && goingList.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">{zh ? '還沒有動態。' : 'No feeds yet.'}</p>
        )}

        <div className="max-h-[228px] overflow-y-auto flex flex-col gap-3 pr-1">
        {goingList.length > 0 && (
          <div className="flex flex-col gap-2">
            {goingList.map((g, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                ✓ {g.displayName ?? g.handle} {zh ? '要參加' : 'is going'}
              </div>
            ))}
          </div>
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
                        disabled={replyLoading}
                        className="flex-1 border border-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={replyLoading || !replyBody.trim()}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {replyLoading ? '…' : (zh ? '送出' : 'Reply')}
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
        </div>

        {user && (
          <form onSubmit={handleComment} className="flex flex-col gap-2 mt-4">
            <div className="flex gap-2">
              <input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder={zh ? '寫下留言…' : 'Write a comment…'}
                maxLength={1000}
                disabled={commentLoading}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={commentLoading || !commentBody.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {commentLoading ? '…' : (zh ? '送出' : 'Post')}
              </button>
            </div>
            {commentError && <p className="text-xs text-red-500">{commentError}</p>}
          </form>
        )}
      </section>

      {/* Text Blast Modal */}
      {showBlastModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBlastModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{zh ? '📣 群發訊息' : '📣 Text Blast'}</h3>
              <button onClick={() => setShowBlastModal(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
            </div>

            {/* Channel row: In-App left, Email right (disabled) */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{zh ? '發送方式' : 'Send via'}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleBlastChannel('IN_APP')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                    blastChannels.includes('IN_APP')
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  🔔 {zh ? '站內通知' : 'In-App'}
                </button>
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
                >
                  ✉️ {zh ? 'Email（停用）' : 'Email'}
                </button>
              </div>
            </div>

            {/* Audience row: All Invited left, RSVPed right */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{zh ? '發送對象' : 'Send to'}</p>
              <div className="flex gap-2">
                {(['invited', 'rsvped'] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBlastAudience(val)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                      blastAudience === val
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {val === 'invited' ? (zh ? '全部受邀' : 'All Invited') : (zh ? '已回覆' : 'RSVPed Only')}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{zh ? '訊息內容' : 'Message'}</p>
              <textarea
                value={blastMsg}
                onChange={(e) => setBlastMsg(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={zh ? '輸入訊息…' : 'Write your message…'}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBlast}
                disabled={!blastMsg.trim() || blastChannels.length === 0}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {zh ? '立即發送' : 'Send Now'}
              </button>
              {blastResult && (
                <p className={`text-sm shrink-0 ${blastResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {blastResult}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
