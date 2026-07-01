import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  Share,
  Modal,
  Linking,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import JLogo from '../../../components/JLogo';
import { apiFetch, resolveImageUrl } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';
import { useTheme } from '../../../context/theme.context';
import { useTranslation } from 'react-i18next';
import type { EventWithCounts, Comment, EventInvitee, EventSeries } from '@judien/shared';
import { Ionicons } from '@expo/vector-icons';

type GuestEntry = { handle: string; displayName: string | null; email?: string; phone?: string; checkedIn?: boolean; userId?: string; guestRsvpId?: string; source?: 'user' | 'guest' };
type InvitedEntry = { name: string; email?: string | null; phone?: string | null; relationship?: string | null };
type ExtraGuest = { id?: string; addedByUserId?: string | null; name: string; email?: string; phone?: string; relationship?: string; connectedInviteeName?: string; addedByName: string };
type RosterEntry = {
  kind: 'user' | 'guest' | 'plusOne' | 'invited';
  inviteId?: string;
  userId?: string;
  guestRsvpId?: string;
  plusOneId?: string;
  addedByUserId?: string | null;
  name: string;
  handle?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  connectedInviteeName?: string;
  addedByName?: string;
  status: 'INVITED' | 'PENDING' | 'GOING' | 'NO';
  checkedIn?: boolean;
};
type Guests = { GOING: GuestEntry[]; NO: GuestEntry[]; INVITED: InvitedEntry[]; PENDING?: GuestEntry[]; EXTRA_GUESTS?: ExtraGuest[]; ROSTER: RosterEntry[]; guestListViewMode?: 'FUSION' | 'SEPARATE_OUTSIDE_GUESTS'; organizeGuestBatches?: boolean };
type GuestBatch = { id: string; eventId: string; entryKey: string; label: string };
type UserResult = { id: string; displayName: string | null; email: string | null; phoneE164?: string | null };
type PlusOne = { id: string; name: string; email?: string | null; phone?: string | null; relationship?: string | null; connectedInviteeName?: string | null; notes?: string | null };

const INDIGO = '#4F46E5';
const rosterStatusOrder: Record<RosterEntry['status'], number> = { INVITED: 0, GOING: 1, NO: 2, PENDING: 3 };

const isOutsideRosterGuest = (entry: RosterEntry) => entry.kind === 'plusOne';
const sortRosterForAttendance = (entries: RosterEntry[], separateOutsideGuests: boolean) =>
  [...entries].sort((a, b) => {
    if (!separateOutsideGuests) {
      return (a.name || a.handle || '').localeCompare(b.name || b.handle || '');
    }
    const outsideDiff = Number(isOutsideRosterGuest(a)) - Number(isOutsideRosterGuest(b));
    if (outsideDiff) return outsideDiff;
    const statusDiff = rosterStatusOrder[a.status] - rosterStatusOrder[b.status];
    if (statusDiff) return statusDiff;
    return (a.name || a.handle || '').localeCompare(b.name || b.handle || '');
  });

const csvRosterRow = (entry: RosterEntry, esc: (s: string) => string) =>
  [
    esc(entry.name),
    esc(entry.email ?? ''),
    esc(entry.phone ?? ''),
    esc(entry.status),
    esc(entry.connectedInviteeName ?? ''),
    esc(entry.relationship ?? ''),
    esc(entry.checkedIn ? 'Checked in' : ''),
  ].join(',');

function timeAgo(dateStr: string, zh: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return zh ? '剛剛' : 'just now';
  if (m < 60) return zh ? `${m} 分鐘前` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return zh ? `${h} 小時前` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return zh ? `${d} 天前` : `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const zh = i18n.language === 'zh';
  const isAdmin = user?.role === 'ADMIN';
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation();

  // Use the Tabs JS header (no system tap-highlight) instead of the native Stack header
  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({
      headerShown: true,
      headerTitle: () => <JLogo />,
      headerStyle: { backgroundColor: colors.headerBg },
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7} accessibilityLabel={zh ? '返回' : 'Go back'} accessibilityRole="button">
          <Ionicons name="chevron-back" size={28} color={INDIGO} />
          <Text style={{ color: INDIGO, fontSize: 17 }}>{zh ? '返回' : 'Back'}</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="search" size={24} color={INDIGO} />
        </TouchableOpacity>
      ),
    });
    return () => {
      navigation.getParent()?.setOptions({ headerLeft: undefined, headerRight: undefined });
    };
  }, [zh, colors.headerBg]));

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [myRsvp, setMyRsvp] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const [showNoReason, setShowNoReason] = useState(false);
  const [noReason, setNoReason] = useState('');

  const [guests, setGuests] = useState<Guests | null>(null);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [showGuestBatches, setShowGuestBatches] = useState(false);
  const [guestBatches, setGuestBatches] = useState<Record<string, string>>({});
  const [guestBatchSaving, setGuestBatchSaving] = useState<string | null>(null);
  const [activeGuestTab, setActiveGuestTab] = useState<'INVITED' | 'GOING' | 'NO' | 'PENDING' | 'EXTRA_GUESTS'>('GOING');
  const [guestSearch, setGuestSearch] = useState('');
  const [goingList, setGoingList] = useState<GuestEntry[]>([]);

  const [showBlast, setShowBlast] = useState(false);
  const [blastMsg, setBlastMsg] = useState('');
  const [blastChannels, setBlastChannels] = useState<string[]>(['IN_APP']);
  const [blastAudience, setBlastAudience] = useState<'rsvped' | 'invited'>('invited');
  const [blastSending, setBlastSending] = useState(false);
  const [blastResult, setBlastResult] = useState('');

  const [directInviteQuery, setDirectInviteQuery] = useState('');
  const [directInviteSearchResults, setDirectInviteSearchResults] = useState<UserResult[]>([]);
  const [directInviteSearchLoading, setDirectInviteSearchLoading] = useState(false);
  const [directInviteLoading, setDirectInviteLoading] = useState<string | null>(null);
  const [directInviteMsg, setDirectInviteMsg] = useState('');

  const [myPlusOnes, setMyPlusOnes] = useState<PlusOne[]>([]);
  // unified invite guest modal
  const [showInviteGuestModal, setShowInviteGuestModal] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState<'search' | 'outside'>('search');
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

  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // transportation + sub-events
  const [myTransportation, setMyTransportation] = useState('');
  const [transportationSaved, setTransportationSaved] = useState(false);
  const [transportationLoading, setTransportationLoading] = useState(false);
  const [subEventLoading, setSubEventLoading] = useState<string | null>(null);

  // check-in
  const [checkingIn, setCheckingIn] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<EventWithCounts>(`/events/${id}`)
      .then((ev) => {
        setEvent(ev);
        setMyRsvp(ev.myRsvp);
        if (ev.myTransportation) setMyTransportation(ev.myTransportation);
        if (ev.myRsvp === 'GOING') {
          apiFetch<PlusOne[]>(`/events/${id}/rsvp/plus-ones`).then(setMyPlusOnes).catch(() => {});
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
      })
      .catch(() => setFetchFailed(true));
    apiFetch<Comment[] | { data: Comment[] }>(`/events/${id}/comments`)
      .then((res) => setComments(Array.isArray(res) ? res : res.data))
      .catch(() => {});
    apiFetch<{ GOING: GuestEntry[] }>(`/events/${id}/rsvp/guests`)
      .then((res) => setGoingList(res.GOING ?? []))
      .catch(() => {});
  }, [id]);

  const submitRsvp = async (status: 'GOING' | 'NO', reason?: string) => {
    try {
      if (myRsvp === status) {
        await apiFetch(`/events/${id}/rsvp`, { method: 'DELETE' });
        setMyRsvp(null);
        setMyPlusOnes([]);
      } else {
        await apiFetch(`/events/${id}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({ status, declineReason: reason }),
        });
        setMyRsvp(status);
        if (status === 'GOING') {
          apiFetch<PlusOne[]>(`/events/${id}/rsvp/plus-ones`).then(setMyPlusOnes).catch(() => {});
        } else {
          setMyPlusOnes([]);
        }
      }
      const ev = await apiFetch<EventWithCounts>(`/events/${id}`);
      setEvent(ev);
      setMyRsvp(ev.myRsvp);
      setMyTransportation(ev.myTransportation ?? '');
      setGuests(null);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update RSVP.');
    }
  };

  const handleRsvp = async (status: 'GOING' | 'NO') => {
    if (!user) { Alert.alert(zh ? '請登入' : 'Login required'); return; }
    if (status === 'NO' && myRsvp !== 'NO') { setShowNoReason(true); return; }
    await submitRsvp(status);
  };

  const handleDeclineSubmit = async () => {
    setShowNoReason(false);
    await submitRsvp('NO', noReason.trim() || undefined);
    setNoReason('');
  };

  const handleAddPlusOne = async () => {
    if (!poName.trim()) return;
    setPoLoading(true);
    setPoMsg('');
    try {
      const isEmail = poContact.includes('@');
      await apiFetch(`/events/${id}/rsvp/plus-ones`, {
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
      const data = await apiFetch<PlusOne[]>(`/events/${id}/rsvp/plus-ones`);
      setMyPlusOnes(data);
      setGuests(null);
    } catch (err: any) {
      setPoMsg(err.message ?? (zh ? '新增失敗' : 'Failed to add guest'));
    } finally { setPoLoading(false); }
  };

  const handleRemovePlusOne = async (plusOneId: string) => {
    try {
      await apiFetch(`/events/${id}/rsvp/plus-ones/${plusOneId}`, { method: 'DELETE' });
      setMyPlusOnes((prev) => prev.filter((p) => p.id !== plusOneId));
      setGuests(null);
    } catch {}
  };

  const handleDeleteGuestRsvp = async (targetUserId: string) => {
    if (deletingGuest) return;
    setDeletingGuest(targetUserId);
    try {
      await apiFetch(`/events/${id}/rsvp/${targetUserId}`, { method: 'DELETE' });
      setGuests(null);
      loadGuests();
    } catch (err: any) {
      Alert.alert(zh ? '移除失敗' : 'Remove failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
    } finally {
      setDeletingGuest(null);
    }
  };

  const handleDeleteExtraGuest = async (plusOneId: string) => {
    if (deletingGuest) return;
    setDeletingGuest(plusOneId);
    try {
      await apiFetch(`/events/${id}/rsvp/plus-ones/${plusOneId}`, { method: 'DELETE' });
      setGuests(null);
      loadGuests();
    } catch (err: any) {
      Alert.alert(zh ? '移除失敗' : 'Remove failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
    } finally {
      setDeletingGuest(null);
    }
  };

  const getRosterKey = (entry: RosterEntry) => entry.userId ?? entry.guestRsvpId ?? entry.plusOneId ?? entry.inviteId ?? `${entry.kind}:${entry.name}:${entry.email ?? ''}`;

  const refreshGuests = async () => {
    const [rsvpData, inviteesData] = await Promise.all([
      apiFetch<{ GOING: GuestEntry[]; NO: GuestEntry[]; INVITED?: InvitedEntry[]; PENDING?: GuestEntry[]; EXTRA_GUESTS?: ExtraGuest[]; ROSTER?: RosterEntry[] }>(`/events/${id}/rsvp/guests`),
      apiFetch<EventInvitee[]>(`/event-invites/event/${id}/invitees`).catch(() => [] as EventInvitee[]),
    ]);
    setGuests({
      GOING: rsvpData.GOING,
      NO: rsvpData.NO,
      INVITED: rsvpData.INVITED
        ? rsvpData.INVITED.map((i) => ({ name: i.name, email: i.email ?? undefined, phone: i.phone ?? undefined }))
        : inviteesData.map((i) => ({ name: i.guestName ?? i.displayName ?? '', email: i.email ?? undefined })),
      PENDING: rsvpData.PENDING,
      EXTRA_GUESTS: rsvpData.EXTRA_GUESTS ?? [],
      ROSTER: rsvpData.ROSTER ?? [],
      guestListViewMode: (rsvpData as any).guestListViewMode,
      organizeGuestBatches: (rsvpData as any).organizeGuestBatches,
    });
  };

  const handleRosterStatus = async (entry: RosterEntry, status: 'GOING' | 'NO') => {
    const key = getRosterKey(entry);
    if (deletingGuest) return;
    setDeletingGuest(key);
    try {
      if (entry.kind === 'plusOne' && entry.plusOneId) {
        await apiFetch(`/events/${id}/rsvp/plus-ones/${entry.plusOneId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      } else if (entry.kind === 'guest' && entry.guestRsvpId) {
        await apiFetch(`/events/${id}/guest-rsvp/${entry.guestRsvpId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      } else if (entry.inviteId) {
        await apiFetch(`/event-invites/${entry.inviteId}/rsvp`, { method: 'PATCH', body: JSON.stringify({ status }) });
      } else if (entry.userId) {
        await apiFetch(`/events/${id}/rsvp/${entry.userId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      }
      await refreshGuests();
      const ev = await apiFetch<EventWithCounts>(`/events/${id}`);
      setEvent(ev);
    } catch (err: any) {
      Alert.alert(zh ? '更新失敗' : 'Update failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
    } finally {
      setDeletingGuest(null);
    }
  };

  const handleDeleteRosterEntry = async (entry: RosterEntry) => {
    const key = getRosterKey(entry);
    if (deletingGuest) return;
    setDeletingGuest(key);
    try {
      if (entry.kind === 'plusOne' && entry.plusOneId) {
        await apiFetch(`/events/${id}/rsvp/plus-ones/${entry.plusOneId}`, { method: 'DELETE' });
      } else if (entry.kind === 'guest' && entry.guestRsvpId) {
        await apiFetch(`/events/${id}/guest-rsvp/${entry.guestRsvpId}`, { method: 'DELETE' });
      } else if (entry.inviteId) {
        await apiFetch(`/event-invites/${entry.inviteId}`, { method: 'DELETE' });
      } else if (entry.userId) {
        await apiFetch(`/events/${id}/rsvp/${entry.userId}`, { method: 'DELETE' });
      }
      await refreshGuests();
      const ev = await apiFetch<EventWithCounts>(`/events/${id}`);
      setEvent(ev);
    } catch (err: any) {
      Alert.alert(zh ? '移除失敗' : 'Remove failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
    } finally {
      setDeletingGuest(null);
    }
  };

  const handleCreateShareLink = async () => {
    if (!user) { Alert.alert(zh ? '請登入' : 'Login required'); return; }
    setInviteLoading(true);
    try {
      const res = await apiFetch<{ token: string }>(`/events/${id}/share-link`, { method: 'POST' });
      const link = `https://app.judien.tw/${i18n.language}/events/share/${res.token}`;
      setInviteLink(link);
      setShowInviteModal(true);
    } catch (err: any) {
      Alert.alert(zh ? '無法生成分享連結' : 'Failed to generate share link', err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({ message: zh ? `活動分享：${inviteLink}` : `Event share: ${inviteLink}`, url: inviteLink });
    } catch {
      Alert.alert(zh ? '分享失敗' : 'Share failed');
    }
  };

  const loadGuests = async () => {
    if (guests) { setShowGuests(true); return; }
    setGuestsLoading(true);
    try {
      const [rsvpData, inviteesData] = await Promise.all([
        apiFetch<{ GOING: GuestEntry[]; NO: GuestEntry[]; INVITED?: InvitedEntry[]; PENDING?: GuestEntry[]; EXTRA_GUESTS?: ExtraGuest[]; ROSTER?: RosterEntry[] }>(`/events/${id}/rsvp/guests`),
        apiFetch<EventInvitee[]>(`/event-invites/event/${id}/invitees`).catch(() => [] as EventInvitee[]),
      ]);
      setGuests({
        GOING: rsvpData.GOING,
        NO: rsvpData.NO,
        INVITED: rsvpData.INVITED
          ? rsvpData.INVITED.map((i) => ({ name: i.name, email: i.email ?? undefined, phone: i.phone ?? undefined }))
          : inviteesData.map((i) => ({ name: i.guestName ?? i.displayName ?? '', email: i.email ?? undefined })),
        PENDING: rsvpData.PENDING,
        EXTRA_GUESTS: rsvpData.EXTRA_GUESTS ?? [],
        ROSTER: rsvpData.ROSTER ?? [],
        guestListViewMode: (rsvpData as any).guestListViewMode,
        organizeGuestBatches: (rsvpData as any).organizeGuestBatches,
      });
      setShowGuests(true);
    } catch {
      Alert.alert(zh ? '無法載入出席名單' : 'Failed to load guest list');
    } finally {
      setGuestsLoading(false);
    }
  };

  const loadGuestBatches = async () => {
    if (!event?.organizeGuestBatches || !(isAdmin || event.createdById === user?.id || Boolean(event.groupId && isGroupAdmin))) return;
    try {
      const rows = await apiFetch<GuestBatch[]>(`/events/${id}/guest-batches`);
      setGuestBatches(Object.fromEntries(rows.map((row) => [row.entryKey, row.label])));
    } catch {
      setGuestBatches({});
    }
  };

  const openGuestBatches = async () => {
    if (!guests) {
      setGuestsLoading(true);
      try {
        await refreshGuests();
      } finally {
        setGuestsLoading(false);
      }
    }
    await loadGuestBatches();
    setShowGuestBatches(true);
  };

  const saveGuestBatch = async (entryKey: string, label: string) => {
    setGuestBatchSaving(entryKey);
    setGuestBatches((prev) => ({ ...prev, [entryKey]: label }));
    try {
      await apiFetch(`/events/${id}/guest-batches`, {
        method: 'PATCH',
        body: JSON.stringify({ entryKey, label }),
      });
    } finally {
      setGuestBatchSaving(null);
    }
  };

  const handleExportCsv = async () => {
    const esc = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    let data = guests;
    if (!data) {
      setGuestsLoading(true);
      try {
        const [rsvpData, inviteesData] = await Promise.all([
          apiFetch<{ GOING: GuestEntry[]; NO: GuestEntry[]; INVITED?: InvitedEntry[]; PENDING?: GuestEntry[]; EXTRA_GUESTS?: ExtraGuest[]; ROSTER?: RosterEntry[] }>(`/events/${id}/rsvp/guests`),
          apiFetch<EventInvitee[]>(`/event-invites/event/${id}/invitees`).catch(() => [] as EventInvitee[]),
        ]);
        data = {
          GOING: rsvpData.GOING,
          NO: rsvpData.NO,
          INVITED: rsvpData.INVITED
            ? rsvpData.INVITED.map((i) => ({ name: i.name, email: i.email ?? undefined, phone: i.phone ?? undefined }))
            : inviteesData.map((i) => ({ name: i.guestName ?? i.displayName ?? '', email: i.email ?? undefined })),
          PENDING: rsvpData.PENDING,
          EXTRA_GUESTS: rsvpData.EXTRA_GUESTS ?? [],
          ROSTER: rsvpData.ROSTER ?? [],
          guestListViewMode: (rsvpData as any).guestListViewMode,
          organizeGuestBatches: (rsvpData as any).organizeGuestBatches,
        };
        setGuests(data);
      } catch {
        Alert.alert(zh ? '無法載入出席名單' : 'Failed to load guest list');
        return;
      } finally {
        setGuestsLoading(false);
      }
    }
    const isGroupEvent = Boolean(event?.groupId);
    const sortedRoster = sortRosterForAttendance(data.ROSTER ?? [], isGroupEvent);
    const rows = isGroupEvent
      ? [
          'Group members / invited list',
          'Name,Email,Phone,Status,Connected Invitee,Relationship,Check-in',
          ...sortedRoster.filter((g) => !isOutsideRosterGuest(g)).map((g) => csvRosterRow(g, esc)),
          '',
          'Outside guests',
          'Name,Email,Phone,Status,Connected Invitee,Relationship,Check-in',
          ...sortedRoster.filter(isOutsideRosterGuest).map((g) => csvRosterRow(g, esc)),
        ]
      : [
          'Guest list',
          'Name,Email,Phone,Status,Connected Invitee,Relationship,Check-in',
          ...sortedRoster.map((g) => csvRosterRow(g, esc)),
        ];
    await Share.share({ message: rows.join('\n'), title: zh ? '賓客名單' : 'Guest List' });
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
    if (directInviteLoading) return;
    setDirectInviteLoading(u.id);
    setDirectInviteMsg('');
    try {
      await apiFetch(`/events/${id}/invite-members`, {
        method: 'POST',
        body: JSON.stringify({ userIds: [u.id] }),
      });
      setDirectInviteMsg(zh ? `已邀請 ${u.displayName ?? u.email ?? ''}。` : `Invited ${u.displayName ?? u.email ?? ''}.`);
      setTimeout(() => setDirectInviteMsg(''), 4000);
      setDirectInviteSearchResults([]);
      setDirectInviteQuery('');
      setGuests(null);
    } catch (err: any) {
      setDirectInviteMsg(`ERR:${err.message ?? (zh ? '邀請失敗。' : 'Failed to invite.')}`);
    } finally { setDirectInviteLoading(null); }
  };

  const handleBlastSend = async () => {
    if (!blastMsg.trim()) return;
    setBlastSending(true);
    setBlastResult('');
    try {
      const res = await apiFetch<{ sent: number }>(`/events/${id}/blast`, {
        method: 'POST',
        body: JSON.stringify({ message: blastMsg, channels: blastChannels, audience: blastAudience }),
      });
      setBlastResult(`✓ Sent to ${res.sent} people`);
      setBlastMsg('');
      setTimeout(() => { setBlastResult(''); setShowBlast(false); }, 1500);
    } catch (err: any) {
      setBlastResult('Failed to send. Please try again.');
    } finally {
      setBlastSending(false);
    }
  };

  const handleSaveTransportation = async () => {
    if (transportationLoading) return;
    setTransportationLoading(true);
    try {
      await apiFetch(`/events/${id}/rsvp/transportation`, {
        method: 'PATCH',
        body: JSON.stringify({ method: myTransportation.trim() }),
      });
      setTransportationSaved(true);
      setTimeout(() => setTransportationSaved(false), 3000);
    } catch (err: any) {
      Alert.alert(zh ? '儲存失敗' : 'Save failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
    } finally {
      setTransportationLoading(false);
    }
  };

  const handleSubEventToggle = async (subId: string, isMine: boolean) => {
    if (subEventLoading) return;
    setSubEventLoading(subId);
    try {
      if (isMine) {
        await apiFetch(`/events/${id}/sub-events/${subId}/join`, { method: 'DELETE' });
      } else {
        await apiFetch(`/events/${id}/sub-events/${subId}/join`, { method: 'POST' });
      }
      const ev = await apiFetch<EventWithCounts>(`/events/${id}`);
      setEvent(ev);
      setMyRsvp(ev.myRsvp);
    } catch (err: any) {
      Alert.alert(zh ? '更新失敗' : 'Update failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
    } finally {
      setSubEventLoading(null);
    }
  };

  const handleCheckIn = async (entry: RosterEntry, checkedIn: boolean) => {
    const key = entry.userId ?? entry.guestRsvpId ?? entry.plusOneId ?? '';
    if (!key || checkingIn.has(key)) return;
    setCheckingIn((prev) => new Set(prev).add(key));
    try {
      const url = entry.kind === 'guest'
        ? `/events/${id}/guest-rsvp/${entry.guestRsvpId}/checkin`
        : entry.kind === 'plusOne'
          ? `/events/${id}/rsvp/plus-ones/${entry.plusOneId}/checkin`
        : `/events/${id}/rsvp/${entry.userId}/checkin`;
      await apiFetch(url, { method: 'PATCH', body: JSON.stringify({ checkedIn }) });
      setGuests((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ROSTER: prev.ROSTER.map((g) => getRosterKey(g) === getRosterKey(entry) ? { ...g, checkedIn } : g),
        };
      });
    } catch (err: any) {
      Alert.alert(zh ? '報到失敗' : 'Check-in failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
    } finally {
      setCheckingIn((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const handleComment = async () => {
    if (!commentBody.trim() || commentLoading) return;
    setCommentLoading(true);
    setCommentError('');
    try {
      const c = await apiFetch<Comment>(`/events/${id}/comments`, {
        method: 'POST', body: JSON.stringify({ body: commentBody.trim() }),
      });
      setComments((prev) => [...prev, c]);
      setCommentBody('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      setCommentError(err.message ?? (zh ? '留言失敗，請再試。' : 'Failed to post. Please try again.'));
    } finally {
      setCommentLoading(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentBody.trim()) return;
    try {
      const updated = await apiFetch<Comment>(`/comments/${commentId}`, {
        method: 'PATCH', body: JSON.stringify({ body: editCommentBody.trim() }),
      });
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, body: updated.body } : c));
      setEditingCommentId(null);
      setEditCommentBody('');
    } catch (err: any) {
      Alert.alert(zh ? '儲存失敗' : 'Save failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      zh ? '刪除留言' : 'Delete Comment',
      zh ? '確定要刪除這則留言嗎？' : 'Delete this comment?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/comments/${commentId}`, { method: 'DELETE' });
              setComments((prev) =>
                prev.filter((c) => c.id !== commentId)
                    .map((c) => ({ ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) }))
              );
            } catch (err: any) {
              Alert.alert(zh ? '刪除失敗' : 'Delete failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
            }
          },
        },
      ],
    );
  };

  const handleReply = async (parentCommentId: string) => {
    if (!replyBody.trim() || replyLoading) return;
    setReplyLoading(true);
    try {
      const reply = await apiFetch<Comment>(`/events/${id}/comments`, {
        method: 'POST', body: JSON.stringify({ body: replyBody.trim(), replyToId: parentCommentId }),
      });
      setComments((prev) =>
        prev.map((c) => c.id === parentCommentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c)
      );
      setReplyBody('');
      setReplyingToId(null);
    } catch (err: any) {
      Alert.alert(zh ? '回覆失敗' : 'Reply failed', err.message ?? (zh ? '請再試。' : 'Please try again.'));
    } finally {
      setReplyLoading(false);
    }
  };

  if (!event) {
    if (fetchFailed) return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ fontSize: 15, color: '#EF4444', textAlign: 'center' }}>
          {zh ? '載入失敗，請返回重試。' : 'Failed to load event. Please go back and try again.'}
        </Text>
      </View>
    );
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.subtext }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const title = event.title;
  const desc = event.description;
  const location = event.location;
  const mapQuery = event.mapAddress || location;
  const fee = event.feeAmount ? `${event.feeCurrency} ${event.feeAmount}` : t('events.free');
  const dateStr = new Date(event.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US');
  const isPast = new Date(event.startAt) < new Date();

  const openMap = (provider: 'native' | 'google') => {
    if (!mapQuery) return;
    const q = encodeURIComponent(mapQuery);
    const url = provider === 'google'
      ? `https://www.google.com/maps/search/?api=1&query=${q}`
      : Platform.OS === 'ios'
        ? `maps://?q=${q}`
        : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
  };

  const handleOpenMap = () => {
    if (!mapQuery) return;
    Alert.alert(
      zh ? '開啟地圖' : 'Open map',
      mapQuery,
      [
        { text: Platform.OS === 'ios' ? 'Apple Maps' : (zh ? '裝置地圖' : 'Device maps'), onPress: () => openMap('native') },
        { text: 'Google Maps', onPress: () => openMap('google') },
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
      ],
    );
  };

  const rsvpBtn = (status: 'GOING' | 'NO', label: string) => (
    <TouchableOpacity
      key={status}
      style={[styles.rsvpBtn, myRsvp === status && styles.rsvpBtnActive]}
      onPress={() => handleRsvp(status)}
    >
      <Text style={[styles.rsvpBtnText, myRsvp === status && styles.rsvpBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  // Height of the sticky input bar so ScrollView content isn't hidden behind it
  const inputBarHeight = user ? 64 : 0;

  return (
    <KeyboardAvoidingView
      style={[styles.kav, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: inputBarHeight + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {resolveImageUrl(event.coverImageUrl) && (
          <View style={[styles.coverWrapper, { backgroundColor: colors.border }]}>
            <Image source={{ uri: resolveImageUrl(event.coverImageUrl)! }} style={styles.cover} accessibilityLabel={title} accessibilityRole="image" />
          </View>
        )}
        <View style={styles.body}>

          {(isAdmin || event.createdById === user?.id || Boolean(event.groupId && isGroupAdmin)) && (
            <View style={styles.adminBar}>
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push(`/admin/events/${id}/edit`)}>
                <Text style={styles.editBtnText}>{t('events.editEvent')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {event.seriesId && event.partNumber && (
            <View style={styles.seriesBadge}>
              <Text style={styles.seriesBadgeText}>
                📚 {zh ? '系列' : 'Series'} #{event.partNumber}
              </Text>
            </View>
          )}

          <Text style={styles.title}>{title}</Text>
          {event.groupName && event.groupId && (
            <TouchableOpacity onPress={() => router.push(`/(tabs)/groups/${event.groupId}` as any)}>
              <Text style={styles.groupBadge}>{event.groupName}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.metaBlock}>
            {event.createdByName && (
              <TouchableOpacity onPress={() => router.push(`/(tabs)/profile/${event.createdById}` as any)}>
                <Text style={styles.meta}>👤 {event.createdByName}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.meta}>📅 {dateStr}{event.timezone ? ` (${event.timezone})` : ''}</Text>
            {location ? (
              <TouchableOpacity onPress={handleOpenMap} activeOpacity={0.7}>
                <Text style={[styles.meta, styles.mapLink]}>📍 {location}</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.meta}>💰 {fee}</Text>
          </View>

          {desc ? <Text style={styles.desc}>{desc}</Text> : null}

          <View style={styles.countsRow}>
            <Text style={styles.count}>✓ {event.rsvpCounts.GOING} {isPast ? (zh ? '出席' : 'Attended') : t('rsvp.going')}</Text>
            <Text style={styles.count}>✗ {event.rsvpCounts.NO} {isPast ? (zh ? '缺席' : 'Did Not Attend') : t('rsvp.notGoing')}</Text>
          </View>

          {/* Guest List + Share row (above action buttons) */}
          <View style={styles.rsvpRow}>
            <TouchableOpacity style={styles.rsvpBtn} onPress={loadGuests} disabled={guestsLoading}>
              <Text style={styles.rsvpBtnText}>{guestsLoading ? (zh ? '載入中…' : 'Loading…') : (zh ? '賓客名單' : 'Guest List')}</Text>
            </TouchableOpacity>
            {(isAdmin || event.createdById === user?.id || Boolean(event.groupId && isGroupAdmin)) && event.organizeGuestBatches && (
              <TouchableOpacity style={styles.rsvpBtn} onPress={openGuestBatches} disabled={guestsLoading}>
                <Text style={styles.rsvpBtnText}>{zh ? '賓客分組' : 'Guest Groups'}</Text>
              </TouchableOpacity>
            )}
            {!isPast && user && (
              <TouchableOpacity style={styles.rsvpBtn} onPress={handleCreateShareLink} disabled={inviteLoading}>
                <Text style={styles.rsvpBtnText}>{inviteLoading ? (zh ? '生成中…' : 'Generating…') : (zh ? '🔗 分享' : '🔗 Share')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* RSVP + action row */}
          <View style={styles.rsvpRow}>
            {user && !isPast && rsvpBtn('GOING', t('rsvp.going'))}
            {user && !isPast && rsvpBtn('NO', t('rsvp.notGoing'))}
            {user && (
              <TouchableOpacity
                style={[styles.rsvpBtn]}
                onPress={() => { const isMgr = isAdmin || event.createdById === user?.id || Boolean(event.groupId && isGroupAdmin); setShowInviteGuestModal(true); setInviteModalTab('search'); setPoMsg(''); setPoName(''); setPoContact(''); setPoRelationship(''); setPoConnectedTo(isMgr ? '' : (user?.displayName ?? '')); setPoConnectedToSuggestions([]); setPoNotes(''); setDirectInviteQuery(''); setDirectInviteSearchResults([]); setDirectInviteMsg(''); loadGuests(); }}
              >
                <Text style={styles.rsvpBtnText}>{zh ? '邀請賓客' : 'Invite Guest'}</Text>
              </TouchableOpacity>
            )}
            {(isAdmin || event.createdById === user?.id || Boolean(event.groupId && isGroupAdmin)) && (
              <TouchableOpacity
                style={styles.rsvpBtn}
                onPress={() => setShowBlast(true)}
              >
                <Text style={styles.rsvpBtnText}>
                  {zh ? '群發訊息' : 'Text Blast'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Transportation input */}
          {event.collectTransportation && myRsvp === 'GOING' && (
            <View style={styles.transportSection}>
              <Text style={styles.transportTitle}>
                {zh ? '🚌 您如何前往活動？' : '🚌 How are you getting there?'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TextInput
                  style={[styles.editInput, { flex: 1, marginBottom: 0, minHeight: 44, height: 44, textAlignVertical: 'center' }]}
                  value={myTransportation}
                  onChangeText={(v) => { setMyTransportation(v); setTransportationSaved(false); }}
                  placeholder={zh ? '例：開車、騎車、搭捷運…' : 'e.g. Driving, biking, MRT…'}
                  placeholderTextColor={colors.placeholder}
                  maxLength={500}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveTransportation}
                />
                <TouchableOpacity
                  style={[styles.rsvpBtn, styles.rsvpBtnActive, { flex: 0, paddingHorizontal: 16 }]}
                  onPress={handleSaveTransportation}
                  disabled={transportationLoading || !myTransportation.trim()}
                >
                  <Text style={styles.rsvpBtnTextActive}>
                    {transportationLoading ? '…' : transportationSaved ? (zh ? '已儲存 ✓' : 'Saved ✓') : (zh ? '儲存' : 'Save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sub-events activity picker */}
          {(event.subEvents?.length ?? 0) > 0 && myRsvp === 'GOING' && (
            <View style={styles.subEventsSection}>
              <Text style={styles.transportTitle}>
                {zh ? '🎯 選擇您想參加的活動' : '🎯 Pick your activities'}
              </Text>
              {event.subEvents!.map((se) => (
                <TouchableOpacity
                  key={se.id}
                  style={[styles.subEventCard, se.isMine && styles.subEventCardActive]}
                  onPress={() => handleSubEventToggle(se.id, se.isMine)}
                  disabled={subEventLoading === se.id}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subEventTitle, se.isMine && { color: INDIGO }]}>{se.title}</Text>
                    {se.description ? <Text style={styles.subEventDesc}>{se.description}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.subEventBadge, se.isMine && styles.subEventBadgeActive]}>
                      <Text style={[styles.subEventBadgeText, se.isMine && { color: INDIGO }]}>
                        {subEventLoading === se.id ? '…' : se.isMine ? (zh ? '已加入' : 'Joined') : (zh ? '加入' : 'Join')}
                      </Text>
                    </View>
                    <Text style={styles.subEventCount}>
                      {se.count} {zh ? '人' : 'going'}{se.maxCapacity ? ` / ${se.maxCapacity}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Unified Invite Guest modal */}
          <Modal visible={showInviteGuestModal} transparent animationType="slide" onRequestClose={() => setShowInviteGuestModal(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowInviteGuestModal(false)} />
              <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: safeBottom + 20, maxHeight: '85%' }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{zh ? '邀請賓客' : 'Invite Guest'}</Text>
                  <TouchableOpacity onPress={() => setShowInviteGuestModal(false)}>
                    <Text style={{ fontSize: 20, color: colors.subtext, lineHeight: 24 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4, backgroundColor: isDark ? '#374151' : '#F3F4F6', borderRadius: 8, padding: 3 }}>
                  <TouchableOpacity
                    onPress={() => setInviteModalTab('search')}
                    style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center', backgroundColor: inviteModalTab === 'search' ? (isDark ? '#1F2937' : '#FFFFFF') : 'transparent' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: inviteModalTab === 'search' ? colors.text : colors.subtext }}>{zh ? '搜尋用戶' : 'Search Users'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setInviteModalTab('outside')}
                    style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center', backgroundColor: inviteModalTab === 'outside' ? (isDark ? '#1F2937' : '#FFFFFF') : 'transparent' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: inviteModalTab === 'outside' ? colors.text : colors.subtext }}>{zh ? '外部賓客' : 'Outside Guest'}</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8 }}>
                  {inviteModalTab === 'search' ? (
                    <View style={{ gap: 8 }}>
                      <TextInput
                        style={styles.inviteSearchInput}
                        placeholder={zh ? '搜尋用戶…' : 'Search users…'}
                        placeholderTextColor={colors.placeholder}
                        value={directInviteQuery}
                        onChangeText={searchInviteUsers}
                        autoCapitalize="none"
                        autoFocus
                      />
                      {directInviteSearchLoading && <ActivityIndicator size="small" color={INDIGO} />}
                      {directInviteSearchResults.length > 0 && (
                        <View style={styles.inviteResultsList}>
                          {directInviteSearchResults.map((u) => (
                            <TouchableOpacity
                              key={u.id}
                              style={styles.inviteResultItem}
                              onPress={() => handleInviteUser(u)}
                              disabled={!!directInviteLoading}
                              activeOpacity={0.7}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.inviteResultName}>{u.displayName ?? (zh ? '未知' : 'Unknown')}</Text>
                                {(u.email || u.phoneE164) && (
                                  <Text style={styles.inviteResultSub}>{[u.email, u.phoneE164].filter(Boolean).join(' · ')}</Text>
                                )}
                              </View>
                              {directInviteLoading === u.id
                                ? <ActivityIndicator size="small" color={INDIGO} />
                                : <Text style={styles.inviteResultAction}>{zh ? '邀請' : 'Invite'}</Text>}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {!!directInviteMsg && (
                        <Text style={{ fontSize: 13, color: directInviteMsg.startsWith('ERR:') ? '#EF4444' : '#16A34A' }}>
                          {directInviteMsg.startsWith('ERR:') ? directInviteMsg.slice(4) : directInviteMsg}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <TextInput style={styles.editInput} placeholder={zh ? '賓客姓名 *' : 'Guest name *'} placeholderTextColor={colors.placeholder} value={poName} onChangeText={setPoName} maxLength={100} />
                      <TextInput style={styles.editInput} placeholder={zh ? '電話 / Email（選填）' : 'Phone / Email (optional)'} placeholderTextColor={colors.placeholder} value={poContact} onChangeText={setPoContact} maxLength={100} />
                      {(isAdmin || event.createdById === user?.id || Boolean(event.groupId && isGroupAdmin)) ? (
                        <View>
                          <TextInput
                            style={styles.editInput}
                            placeholder={zh ? '邀請人姓名（搜尋已邀請名單）' : "Inviter's name (search invited list)"}
                            placeholderTextColor={colors.placeholder}
                            value={poConnectedTo}
                            onChangeText={(val) => {
                              setPoConnectedTo(val);
                              if (!val.trim()) { setPoConnectedToSuggestions([]); return; }
                              const term = val.toLowerCase();
                              const allNames = [
                                ...(guests?.INVITED ?? []).map((i) => i.name),
                                ...(guests?.GOING ?? []).map((g) => g.displayName ?? g.handle),
                                ...(guests?.PENDING ?? []).map((g) => g.displayName ?? g.handle),
                              ].filter(Boolean) as string[];
                              const unique = [...new Set(allNames)];
                              setPoConnectedToSuggestions(unique.filter((n) => n.toLowerCase().includes(term)).slice(0, 5));
                            }}
                            maxLength={200}
                          />
                          {poConnectedToSuggestions.length > 0 && (
                            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 2, overflow: 'hidden' }}>
                              {poConnectedToSuggestions.map((name) => (
                                <TouchableOpacity key={name} onPress={() => { setPoConnectedTo(name); setPoConnectedToSuggestions([]); }} style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                  <Text style={{ fontSize: 14, color: colors.text }}>{name}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.card, gap: 6 }}>
                          <Text style={{ fontSize: 13, color: colors.subtext }}>{zh ? '邀請人：' : 'Inviter:'}</Text>
                          <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600', flex: 1 }}>{user?.displayName ?? ''}</Text>
                          <Text style={{ fontSize: 12, color: '#6366F1' }}>{zh ? '（您）' : 'You'}</Text>
                        </View>
                      )}
                      <TextInput style={styles.editInput} placeholder={zh ? '與邀請人的關係（例：太太、朋友）' : "Guest's relationship to inviter (e.g. wife, friend)"} placeholderTextColor={colors.placeholder} value={poRelationship} onChangeText={setPoRelationship} maxLength={100} />
                      <TextInput style={[styles.editInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder={zh ? '備註' : 'Notes'} placeholderTextColor={colors.placeholder} value={poNotes} onChangeText={setPoNotes} multiline numberOfLines={3} maxLength={500} />
                      {poMsg ? <Text style={{ fontSize: 12, color: '#EF4444' }}>{poMsg}</Text> : null}
                      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                        <TouchableOpacity onPress={() => { const isMgr = isAdmin || event.createdById === user?.id || Boolean(event.groupId && isGroupAdmin); setPoMsg(''); setPoName(''); setPoContact(''); setPoRelationship(''); setPoConnectedTo(isMgr ? '' : (user?.displayName ?? '')); setPoConnectedToSuggestions([]); setPoNotes(''); }} style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
                          <Text style={{ fontSize: 14, color: colors.text }}>{zh ? '清除' : 'Clear'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalPrimaryBtn, (!poName.trim() || poLoading) && { opacity: 0.5 }]} onPress={handleAddPlusOne} disabled={!poName.trim() || poLoading}>
                          <Text style={styles.modalPrimaryBtnText}>{poLoading ? (zh ? '新增中…' : 'Adding…') : (zh ? '新增賓客' : 'Add Guest')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>



          {/* Feed section */}
          <Text style={styles.sectionTitle}>{zh ? '動態' : 'Feed'}</Text>
          {comments.length === 0 && goingList.length === 0 && <Text style={styles.empty}>{zh ? '還沒有動態' : 'No feeds yet'}</Text>}
          <ScrollView style={{ maxHeight: 286 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {goingList.map((g, i) => (
            <View key={`going-${i}`} style={styles.feedGoingItem}>
              <Text style={styles.feedGoingText}>✓ {g.displayName ?? g.handle} {zh ? '要參加' : 'is going'}</Text>
            </View>
          ))}
          {comments.map((c) => {
            const isOwn = user?.id === c.userId;
            const canDelete = isOwn || isAdmin;
            const isEditing = editingCommentId === c.id;
            return (
              <View key={c.id} style={styles.commentWrapper}>
                <View style={styles.comment}>
                  {/* Header: handle + timestamp */}
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentHandle}>{c.userHandle}</Text>
                    <Text style={styles.commentDate}>{timeAgo(c.createdAt, zh)}</Text>
                  </View>

                  {/* Body or inline edit */}
                  {isEditing ? (
                    <View style={styles.editBlock}>
                      <TextInput
                        style={styles.editInput}
                        value={editCommentBody}
                        onChangeText={setEditCommentBody}
                        multiline
                        placeholderTextColor={colors.placeholder}
                        autoFocus
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity style={styles.editSaveBtn} onPress={() => handleEditComment(c.id)}>
                          <Text style={styles.editSaveBtnText}>{t('common.save')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editCancelBtn} onPress={() => { setEditingCommentId(null); setEditCommentBody(''); }}>
                          <Text style={styles.editCancelBtnText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.commentBody}>{c.body}</Text>
                  )}

                  {/* Footer actions */}
                  {!isEditing && (
                    <View style={styles.commentFooter}>
                      {user && (
                        <TouchableOpacity onPress={() => setReplyingToId(replyingToId === c.id ? null : c.id)} hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}>
                          <Text style={styles.commentAction}>
                            {replyingToId === c.id ? (zh ? '取消' : 'Cancel') : (zh ? '回覆' : 'Reply')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {isOwn && (
                        <TouchableOpacity onPress={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={styles.commentAction}>{zh ? '編輯' : 'Edit'}</Text>
                        </TouchableOpacity>
                      )}
                      {canDelete && (
                        <TouchableOpacity onPress={() => handleDeleteComment(c.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}>
                          <Text style={[styles.commentAction, styles.commentActionDelete]}>{zh ? '刪除' : 'Delete'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* Reply input */}
                {replyingToId === c.id && user && (
                  <View style={styles.replyInputRow}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder={zh ? '寫下回覆…' : 'Write a reply…'}
                      placeholderTextColor={colors.placeholder}
                      value={replyBody}
                      onChangeText={setReplyBody}
                      multiline
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.postReplyBtn, (!replyBody.trim() || replyLoading) && { opacity: 0.5 }]}
                      onPress={() => handleReply(c.id)}
                      disabled={!replyBody.trim() || replyLoading}
                      accessibilityLabel={zh ? '送出回覆' : 'Post reply'}
                      accessibilityRole="button"
                    >
                      <Text style={styles.postBtnText}>{replyLoading ? '…' : t('comments.post')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Replies */}
                {c.replies && c.replies.length > 0 && (
                  <View style={styles.repliesSection}>
                    {c.replies.map((reply) => (
                      <View key={reply.id} style={styles.nestedReply}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.replyHandle}>{reply.userHandle}</Text>
                          <Text style={styles.commentDate}>{timeAgo(reply.createdAt, zh)}</Text>
                        </View>
                        <Text style={styles.replyBody}>{reply.body}</Text>
                        {(user?.id === reply.userId || isAdmin) && (
                          <TouchableOpacity onPress={() => handleDeleteComment(reply.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginTop: 6 }}>
                            <Text style={[styles.commentAction, styles.commentActionDelete]}>{zh ? '刪除' : 'Delete'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          </ScrollView>
        </View>

        {/* Modals */}
        <Modal visible={showBlast} transparent animationType="slide" onRequestClose={() => setShowBlast(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowBlast(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { paddingBottom: 32 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.modalTitle}>{zh ? '📣 群發訊息' : '📣 Text Blast'}</Text>
                  <TouchableOpacity onPress={() => setShowBlast(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontSize: 20, color: colors.placeholder }}>×</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.blastLabel}>{zh ? '發送方式' : 'Send via'}</Text>
                <View style={styles.blastAudienceRow}>
                  <TouchableOpacity
                    onPress={() => setBlastChannels((prev) => prev.includes('IN_APP') ? prev.filter((c) => c !== 'IN_APP') : [...prev, 'IN_APP'])}
                    style={[styles.audienceBtn, blastChannels.includes('IN_APP') && styles.audienceBtnActive, { flex: 1 }]}
                  >
                    <Text style={[styles.audienceBtnText, blastChannels.includes('IN_APP') && styles.audienceBtnTextActive]}>🔔 {zh ? '站內通知' : 'In-App'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled style={[styles.audienceBtn, { flex: 1, opacity: 0.35 }]}>
                    <Text style={styles.audienceBtnText}>✉️ {zh ? 'Email' : 'Email'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.blastLabel}>{zh ? '發送對象' : 'Send to'}</Text>
                <View style={styles.blastAudienceRow}>
                  {(['invited', 'rsvped'] as const).map((a) => (
                    <TouchableOpacity key={a} onPress={() => setBlastAudience(a)} style={[styles.audienceBtn, blastAudience === a && styles.audienceBtnActive, { flex: 1 }]}>
                      <Text style={[styles.audienceBtnText, blastAudience === a && styles.audienceBtnTextActive]}>
                        {a === 'invited' ? (zh ? '全部受邀' : 'All Invited') : (zh ? '已回覆' : 'RSVPed Only')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.blastInput, { marginTop: 12 }]}
                  placeholder={zh ? '輸入訊息…' : 'Write your message…'}
                  placeholderTextColor={colors.placeholder}
                  value={blastMsg}
                  onChangeText={setBlastMsg}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={[styles.blastSendBtn, { marginTop: 12 }, (blastSending || !blastMsg.trim() || blastChannels.length === 0) && { opacity: 0.5 }]}
                  onPress={handleBlastSend}
                  disabled={blastSending || !blastMsg.trim() || blastChannels.length === 0}
                >
                  <Text style={styles.blastSendBtnText}>{blastSending ? (zh ? '發送中…' : 'Sending…') : (zh ? '立即發送' : 'Send Now')}</Text>
                </TouchableOpacity>
                {!!blastResult && (
                  <Text style={[styles.blastResult, { color: blastResult.startsWith('✓') ? '#16A34A' : '#EF4444', marginTop: 8 }]}>{blastResult}</Text>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowInviteModal(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
              <Text style={styles.modalTitle}>{zh ? '活動分享連結' : 'Event Share Link'}</Text>
              <Text style={styles.inviteLinkText}>{inviteLink}</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleShareInvite}>
                  <Text style={styles.modalPrimaryBtnText}>{zh ? '分享' : 'Share'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowInviteModal(false)}>
                  <Text style={styles.modalSecondaryBtnText}>{zh ? '關閉' : 'Close'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showNoReason} transparent animationType="fade" onRequestClose={() => setShowNoReason(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowNoReason(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
              <Text style={styles.modalTitle}>{zh ? '無法參加的原因（選填）' : 'Reason for declining (optional)'}</Text>
              <TextInput
                style={[styles.editInput, { marginBottom: 16 }]}
                placeholder={zh ? '請輸入原因…' : 'Enter reason…'}
                placeholderTextColor={colors.placeholder}
                value={noReason}
                onChangeText={setNoReason}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleDeclineSubmit}>
                  <Text style={styles.modalPrimaryBtnText}>{zh ? '確認不參加' : 'Confirm Not Going'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowNoReason(false)}>
                  <Text style={styles.modalSecondaryBtnText}>{zh ? '取消' : 'Cancel'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showGuestBatches} transparent animationType="slide" onRequestClose={() => setShowGuestBatches(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowGuestBatches(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
              <Text style={styles.modalTitle}>{zh ? '賓客分組' : 'Guest Groups'}</Text>
              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                {guestsLoading ? (
                  <ActivityIndicator color={INDIGO} style={{ marginVertical: 20 }} />
                ) : sortRosterForAttendance(guests?.ROSTER ?? [], Boolean(event.groupId)).length === 0 ? (
                  <Text style={styles.empty}>{zh ? '目前沒有賓客。' : 'No guests yet.'}</Text>
                ) : sortRosterForAttendance(guests?.ROSTER ?? [], Boolean(event.groupId)).map((g) => {
                  const key = getRosterKey(g);
                  return (
                    <View key={key} style={styles.batchRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.guestName} numberOfLines={1}>{g.name}</Text>
                        <Text style={styles.guestHandle} numberOfLines={1}>{g.status}{g.connectedInviteeName ? ` · ${g.connectedInviteeName}` : ''}</Text>
                      </View>
                      <TextInput
                        style={styles.batchInput}
                        value={guestBatches[key] ?? ''}
                        onChangeText={(value) => saveGuestBatch(key, value)}
                        placeholder={zh ? '分組名稱' : 'Group label'}
                        placeholderTextColor={colors.placeholder}
                        maxLength={100}
                      />
                      {guestBatchSaving === key && <ActivityIndicator size="small" color={INDIGO} />}
                    </View>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowGuestBatches(false)}>
                <Text style={styles.modalSecondaryBtnText}>{zh ? '關閉' : 'Close'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showGuests} transparent animationType="slide" onRequestClose={() => setShowGuests(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowGuests(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>{zh ? '出席名單' : 'Guest List'}</Text>
              <TextInput
                style={styles.guestSearch}
                value={guestSearch}
                onChangeText={setGuestSearch}
                placeholder={zh ? '搜尋…' : 'Search…'}
                placeholderTextColor={colors.placeholder}
                clearButtonMode="while-editing"
              />
              <View style={styles.guestTabRow}>
                {(() => {
                  const separateGuestMode = event.guestListViewMode === 'SEPARATE_OUTSIDE_GUESTS';
                  const memberLabel = event.groupId && separateGuestMode ? (zh ? '成員' : 'Members') : (zh ? '已邀請' : 'Invited');
                  const tabs: [typeof activeGuestTab, string, number][] = [
                    ['INVITED', memberLabel, guests?.ROSTER.filter((g) => g.status === 'INVITED').length ?? 0],
                    ['GOING', zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going'), guests?.ROSTER.filter((g) => g.status === 'GOING').length ?? event.rsvpCounts.GOING],
                    ['NO', zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't" : 'Not Going'), guests?.ROSTER.filter((g) => g.status === 'NO').length ?? event.rsvpCounts.NO],
                    ['PENDING', zh ? '未回應' : 'Unresponded', guests?.ROSTER.filter((g) => g.status === 'PENDING').length ?? 0],
                  ];
                  if (separateGuestMode) tabs.push(['EXTRA_GUESTS', zh ? '賓客' : 'Guests', guests?.EXTRA_GUESTS?.length ?? 0]);
                  return tabs;
                })().map(([tab, label, count]) => (
                  <TouchableOpacity key={tab} onPress={() => setActiveGuestTab(tab)}
                    style={[styles.guestTab, activeGuestTab === tab && styles.guestTabActive]}>
                    <Text style={[styles.guestTabText, activeGuestTab === tab && styles.guestTabTextActive]}>
                      {label} ({count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ScrollView style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
                {(() => {
                  const term = guestSearch.trim().toLowerCase();
                  if (activeGuestTab === 'INVITED') {
                    const rows = sortRosterForAttendance(guests?.ROSTER ?? [], Boolean(event?.groupId)).filter((g) =>
                      g.status === 'INVITED' &&
                      (!term || g.name.toLowerCase().includes(term) || (g.email ?? '').toLowerCase().includes(term) || (g.connectedInviteeName ?? '').toLowerCase().includes(term))
                    );
                    const isEventAdminInvited = isAdmin || event?.createdById === user?.id || Boolean(event?.groupId && isGroupAdmin);
                    const emptyInvited = event?.groupId && event?.guestListViewMode === 'SEPARATE_OUTSIDE_GUESTS'
                      ? (zh ? '暫無成員' : 'No members yet')
                      : (zh ? '暫無受邀者' : 'No invitees yet');
                    return rows.length === 0
                      ? <Text style={styles.empty}>{term ? (zh ? '找不到符合結果' : 'No matches') : emptyInvited}</Text>
                      : rows.map((g, i) => (
                        <View key={getRosterKey(g)}>
                          {Boolean(event?.groupId) && (i === 0 || isOutsideRosterGuest(rows[i - 1]) !== isOutsideRosterGuest(g)) ? (
                            <Text style={{ paddingHorizontal: 4, paddingVertical: 6, fontSize: 11, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase' }}>
                              {isOutsideRosterGuest(g) ? (zh ? '賓客' : 'Guests') : (zh ? '成員' : 'Members')} ({rows.filter((row) => isOutsideRosterGuest(row) === isOutsideRosterGuest(g)).length})
                            </Text>
                          ) : null}
                        <View style={[styles.guestRow, { flexDirection: 'row', alignItems: 'center' }]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.guestName}>{g.name}</Text>
                          {g.connectedInviteeName ? <Text style={{ fontSize: 11, color: INDIGO, marginTop: 1 }}>{g.connectedInviteeName}{zh ? '的賓客' : "'s guest"}</Text> : null}
                          {g.relationship ? <Text style={{ fontSize: 11, color: INDIGO, marginTop: 1 }}>{g.relationship}</Text> : null}
                          {isEventAdminInvited && g.email && <Text style={styles.guestHandle}>{g.email}</Text>}
                          {isEventAdminInvited && g.phone && <Text style={styles.guestHandle}>{g.phone}</Text>}
                          </View>
                          {isEventAdminInvited && (g.kind !== 'invited' || g.inviteId) ? (
                            <View style={{ flexDirection: 'row', gap: 10, marginLeft: 8, flexShrink: 0 }}>
                              <TouchableOpacity onPress={() => handleRosterStatus(g, 'GOING')}><Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>{zh ? '參加' : 'Going'}</Text></TouchableOpacity>
                              <TouchableOpacity onPress={() => handleRosterStatus(g, 'NO')}><Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>{zh ? '不參加' : 'Not Going'}</Text></TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteRosterEntry(g)}><Text style={{ fontSize: 12, color: '#EF4444' }}>{zh ? '移除' : 'Remove'}</Text></TouchableOpacity>
                            </View>
                          ) : null}
                        </View>
                        </View>
                      ));
                  }
                  if (activeGuestTab === 'EXTRA_GUESTS') {
                    const rows = (guests?.EXTRA_GUESTS ?? []).filter((g) =>
                      !term || g.name.toLowerCase().includes(term) || (g.connectedInviteeName ?? '').toLowerCase().includes(term) || g.addedByName.toLowerCase().includes(term)
                    );
                    const isEventAdminExtra = isAdmin || event?.createdById === user?.id || Boolean(event?.groupId && isGroupAdmin);
                    return rows.length === 0
                      ? <Text style={styles.empty}>{term ? (zh ? '找不到符合結果' : 'No matches') : (zh ? '暫無外部賓客' : 'No outside guests yet')}</Text>
                      : rows.map((g, i) => {
                        const canDeleteExtra = isEventAdminExtra || (g.addedByUserId != null && g.addedByUserId === user?.id);
                        const isDeletingExtra = g.id ? deletingGuest === g.id : false;
                        return (
                          <View key={i} style={[styles.guestRow, { flexDirection: 'row', alignItems: 'flex-start' }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.guestName}>{g.name}</Text>
                              {g.connectedInviteeName && g.relationship ? <Text style={{ fontSize: 11, color: '#7C3AED', marginTop: 1 }}>{g.connectedInviteeName}{zh ? '的' : "'s "}{g.relationship}</Text> : null}
                              {g.connectedInviteeName && !g.relationship ? <Text style={{ fontSize: 11, color: '#7C3AED', marginTop: 1 }}>{g.connectedInviteeName}{zh ? '的賓客' : "'s guest"}</Text> : null}
                              {!g.connectedInviteeName && g.relationship ? <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 1 }}>{g.relationship}</Text> : null}
                              <Text style={styles.guestHandle}>{zh ? '邀請者：' : 'inviter: '}{g.addedByName}</Text>
                              {isEventAdminExtra && g.email && <Text style={styles.guestHandle}>{g.email}</Text>}
                              {isEventAdminExtra && g.phone && <Text style={styles.guestHandle}>{g.phone}</Text>}
                            </View>
                            {canDeleteExtra && g.id && (
                              <TouchableOpacity onPress={() => handleDeleteExtraGuest(g.id!)} disabled={isDeletingExtra} style={{ marginLeft: 8, paddingTop: 2, opacity: isDeletingExtra ? 0.5 : 1 }}>
                                <Text style={{ fontSize: 13, color: '#EF4444' }}>{isDeletingExtra ? '…' : '✕'}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      });
                  }
                  const tabData = sortRosterForAttendance(guests?.ROSTER ?? [], Boolean(event?.groupId)).filter((g) => g.status === activeGuestTab);
                  const rows = tabData.filter((g) =>
                    !term || g.name.toLowerCase().includes(term) || (g.handle ?? '').toLowerCase().includes(term) || (g.email ?? '').toLowerCase().includes(term) || (g.connectedInviteeName ?? '').toLowerCase().includes(term)
                  );
                  const emptyMsg = term ? (zh ? '找不到符合結果' : 'No matches') : activeGuestTab === 'PENDING' ? (zh ? '所有受邀者皆已回應' : 'Everyone has responded') : (zh ? '暫無名單' : 'No one yet');
                  const isEventAdmin = isAdmin || event?.createdById === user?.id || Boolean(event?.groupId && isGroupAdmin);
                  const showCheckIn = isEventAdmin && activeGuestTab === 'GOING';
                  const checkedInCount = showCheckIn ? rows.filter((g) => g.checkedIn).length : 0;
                  return (
                    <>
                      {showCheckIn && rows.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#10B981' }}>
                          <View style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                            <View style={{ height: 4, borderRadius: 4, backgroundColor: '#10B981', width: `${rows.length > 0 ? (checkedInCount / rows.length) * 100 : 0}%` }} />
                          </View>
                          <Text style={{ fontSize: 11, color: '#6B7280' }}>{checkedInCount} / {rows.length} {zh ? '已報到' : 'checked in'}</Text>
                        </View>
                      )}
                      {rows.length === 0
                        ? <Text style={styles.empty}>{emptyMsg}</Text>
                        : rows.map((g, i) => {
                          const key = getRosterKey(g);
                          const busy = checkingIn.has(key);
                          const isDeleting = deletingGuest === key;
                          return (
                            <View key={key}>
                              {Boolean(event?.groupId) && (i === 0 || isOutsideRosterGuest(rows[i - 1]) !== isOutsideRosterGuest(g)) ? (
                                <Text style={{ paddingHorizontal: 4, paddingVertical: 6, fontSize: 11, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase' }}>
                                  {isOutsideRosterGuest(g) ? (zh ? '賓客' : 'Guests') : (zh ? '成員' : 'Members')} ({rows.filter((row) => isOutsideRosterGuest(row) === isOutsideRosterGuest(g)).length})
                                </Text>
                              ) : null}
                            <View style={[styles.guestRow, { flexDirection: 'row', alignItems: 'center' }]}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.guestName, g.checkedIn && { color: '#059669' }]}>{g.name || g.handle}</Text>
                                {g.connectedInviteeName ? <Text style={{ fontSize: 11, color: '#7C3AED', marginTop: 1 }}>{g.connectedInviteeName}{zh ? '的賓客' : "'s guest"}</Text> : null}
                                {g.relationship ? <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 1 }}>{g.relationship}</Text> : null}
                                {isEventAdmin && g.email && <Text style={styles.guestHandle}>{g.email}</Text>}
                                {isEventAdmin && g.phone && <Text style={styles.guestHandle}>{g.phone}</Text>}
                              </View>
                              {showCheckIn && (g.userId ?? g.guestRsvpId ?? g.plusOneId) && (
                                <TouchableOpacity
                                  onPress={() => handleCheckIn(g, !g.checkedIn)}
                                  disabled={busy}
                                  style={{
                                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
                                    borderColor: g.checkedIn ? '#10B981' : '#D1D5DB',
                                    backgroundColor: g.checkedIn ? '#ECFDF5' : 'transparent',
                                    opacity: busy ? 0.5 : 1,
                                    marginLeft: 8,
                                  }}
                                >
                                  <Text style={{ fontSize: 12, fontWeight: '600', color: g.checkedIn ? '#059669' : '#6B7280' }}>
                                    {busy ? '…' : g.checkedIn ? (zh ? '✓ 已報到' : '✓ In') : (zh ? '報到' : 'Check in')}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              {isEventAdmin && (g.kind !== 'invited' || g.inviteId) && (
                                <View style={{ flexDirection: 'row', gap: 8, marginLeft: 8, opacity: isDeleting ? 0.5 : 1, flexShrink: 0 }}>
                                  {activeGuestTab !== 'GOING' && <TouchableOpacity onPress={() => handleRosterStatus(g, 'GOING')} disabled={isDeleting}><Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>{zh ? '參加' : 'Going'}</Text></TouchableOpacity>}
                                  {activeGuestTab !== 'NO' && <TouchableOpacity onPress={() => handleRosterStatus(g, 'NO')} disabled={isDeleting}><Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>{zh ? '不參加' : 'Not Going'}</Text></TouchableOpacity>}
                                  <TouchableOpacity onPress={() => handleDeleteRosterEntry(g)} disabled={isDeleting}>
                                    <Text style={{ fontSize: 13, color: '#EF4444' }}>{isDeleting ? '…' : '×'}</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                            </View>
                          );
                        })
                      }
                    </>
                  );
                })()}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {(isAdmin || event?.createdById === user?.id || Boolean(event?.groupId && isGroupAdmin)) && (
                  <TouchableOpacity style={[styles.modalPrimaryBtn, { flex: 1 }]} onPress={handleExportCsv}>
                    <Text style={styles.modalPrimaryBtnText}>{zh ? '匯出 CSV' : 'Export CSV'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.modalSecondaryBtn, { flex: 1 }]} onPress={() => setShowGuests(false)}>
                  <Text style={styles.modalSecondaryBtnText}>{zh ? '關閉' : 'Close'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ScrollView>

      {/* Sticky comment input bar — lives outside ScrollView so keyboard pushes it up */}
      {user && (
        <View style={[styles.inputBar, { paddingBottom: safeBottom > 0 ? safeBottom : 12 }]}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.inputBarField}
              placeholder={t('comments.placeholder')}
              placeholderTextColor={colors.placeholder}
              value={commentBody}
              onChangeText={(v) => { setCommentBody(v); if (commentError) setCommentError(''); }}
              multiline
              numberOfLines={1}
              maxLength={2000}
              editable={!commentLoading}
            />
            {!!commentError && <Text style={{ fontSize: 11, color: '#EF4444', paddingHorizontal: 4, paddingTop: 2 }}>{commentError}</Text>}
          </View>
          <TouchableOpacity
            style={[styles.inputBarSend, (!commentBody.trim() || commentLoading) && { opacity: 0.4 }]}
            onPress={handleComment}
            disabled={!commentBody.trim() || commentLoading}
            accessibilityLabel={zh ? '送出留言' : 'Post comment'}
            accessibilityRole="button"
          >
            <Text style={styles.inputBarSendText}>{commentLoading ? '…' : '↑'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  kav: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { flex: 1, backgroundColor: colors.bg },
  coverWrapper: { width: '100%', aspectRatio: 4 / 3 },
  cover: { width: '100%', height: '100%' },
  body: { padding: 16 },
  adminBar: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  editBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  exportBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  exportBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  deleteBtn: { backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  seriesBadge: { backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  seriesBadgeText: { color: isDark ? '#818CF8' : '#4338CA', fontSize: 12, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  groupBadge: { fontSize: 12, color: INDIGO, fontWeight: '500', marginBottom: 8 },
  metaBlock: { gap: 5, marginBottom: 12 },
  meta: { fontSize: 14, color: colors.subtext },
  mapLink: { color: INDIGO, textDecorationLine: 'underline' },
  desc: { fontSize: 15, color: colors.text, marginTop: 4, marginBottom: 12, lineHeight: 22 },
  countsRow: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 4 },
  count: { fontSize: 13, color: colors.subtext },
  rsvpRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' },
  rsvpBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.card },
  rsvpBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  rsvpBtnText: { fontSize: 14, color: colors.text },
  rsvpBtnTextActive: { color: '#fff' },
  blastSection: { marginTop: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' },
  blastToggle: { padding: 14, backgroundColor: colors.card },
  blastToggleText: { fontSize: 14, fontWeight: '600', color: colors.text },
  blastForm: { padding: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  blastLabel: { fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 8 },
  blastAudienceRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  audienceBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card },
  audienceBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  audienceBtnText: { fontSize: 13, color: colors.text },
  audienceBtnTextActive: { color: '#fff' },
  blastInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10, minHeight: 80, textAlignVertical: 'top' as const, color: colors.inputText, backgroundColor: colors.input },
  blastSendBtn: { backgroundColor: INDIGO, borderRadius: 8, padding: 12, alignItems: 'center' as const },
  blastSendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  blastResult: { marginTop: 8, fontSize: 13, textAlign: 'center' as const },
  inviteSearchInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, marginBottom: 10, color: colors.inputText, backgroundColor: colors.input },
  inviteResultsList: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  inviteResultItem: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.card, gap: 8 },
  inviteResultName: { fontSize: 13, fontWeight: '600', color: colors.text },
  inviteResultSub: { fontSize: 11, color: colors.placeholder, marginTop: 1 },
  inviteResultAction: { fontSize: 12, fontWeight: '700', color: INDIGO },

  // Comments
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 28, marginBottom: 16 },
  empty: { color: colors.placeholder, fontSize: 14, marginBottom: 8 },
  feedGoingItem: { backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  feedGoingText: { fontSize: 13, color: colors.subtext },
  commentWrapper: { marginBottom: 14 },
  comment: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commentHandle: { fontSize: 13, color: colors.text, fontWeight: '600' },
  commentBody: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 8 },
  commentFooter: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 2 },
  commentDate: { fontSize: 11, color: colors.placeholder },
  commentAction: { fontSize: 12, color: colors.subtext, fontWeight: '500' },
  commentActionDelete: { color: '#EF4444' },
  replyBtn: { fontSize: 13, color: INDIGO, fontWeight: '600' },

  // Transportation + sub-events
  transportSection: { borderWidth: 1, borderColor: INDIGO + '44', borderRadius: 12, padding: 14, marginBottom: 12, backgroundColor: isDark ? '#1E1B4B22' : '#EEF2FF' },
  transportTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  subEventsSection: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 12 },
  subEventCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 8, backgroundColor: colors.bg },
  subEventCardActive: { borderColor: INDIGO, backgroundColor: isDark ? '#1E1B4B33' : '#EEF2FF' },
  subEventTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  subEventDesc: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  subEventBadge: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  subEventBadgeActive: { borderColor: INDIGO, backgroundColor: isDark ? '#3730A355' : '#E0E7FF' },
  subEventBadgeText: { fontSize: 12, fontWeight: '600', color: colors.subtext },
  subEventCount: { fontSize: 11, color: colors.placeholder },
  batchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  batchInput: { width: 130, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: colors.inputText, backgroundColor: colors.input, fontSize: 13 },

  // Inline edit
  editBlock: { gap: 10, marginBottom: 8 },
  editInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 15, color: colors.inputText, backgroundColor: colors.input, minHeight: 72, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 8 },
  editSaveBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  editSaveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  editCancelBtn: { paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  editCancelBtnText: { color: colors.subtext, fontSize: 14 },

  // Replies
  replyInputRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginLeft: 14 },
  replyInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: colors.input, color: colors.inputText },
  postReplyBtn: { backgroundColor: INDIGO, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  postBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  repliesSection: { marginTop: 4, marginLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 12 },
  nestedReply: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 8 },
  replyHandle: { fontSize: 12, color: colors.subtext, fontWeight: '600' },
  replyBody: { fontSize: 14, color: colors.text, marginVertical: 5, lineHeight: 20 },
  replyDate: { fontSize: 10, color: colors.placeholder },

  // Sticky input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  inputBarField: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 15,
    color: colors.inputText,
    backgroundColor: colors.input,
    minHeight: 38,
    maxHeight: 120,
  },
  inputBarSend: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: INDIGO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  inputBarSendText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 20 },

  // Modals
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalContent: { backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '90%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 10 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 14, textAlign: 'center' },
  inviteLinkText: { fontSize: 12, color: INDIGO, backgroundColor: colors.input, borderRadius: 8, padding: 10, marginBottom: 14, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  modalPrimaryBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11, flex: 1 },
  modalPrimaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  modalSecondaryBtn: { backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11, flex: 1 },
  modalSecondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  guestSearch: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: colors.inputText, backgroundColor: colors.input, marginBottom: 10 },
  guestTabRow: { flexDirection: 'row', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  guestTab: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, alignItems: 'center', backgroundColor: colors.card },
  guestTabActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  guestTabText: { fontSize: 12, color: colors.text },
  guestTabTextActive: { color: '#fff', fontWeight: '600' },
  guestRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  guestName: { fontSize: 14, color: colors.text, fontWeight: '500' },
  guestHandle: { fontSize: 12, color: colors.subtext, marginTop: 2 },
});
