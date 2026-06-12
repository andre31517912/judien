import { useState, useEffect } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, resolveImageUrl } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';
import { useTranslation } from 'react-i18next';
import type { EventWithCounts, Comment, PaginatedResponse } from '@judien/shared';

type GuestEntry = { handle: string; displayName: string | null };
type Guests = { GOING: GuestEntry[]; NO: GuestEntry[]; PENDING?: GuestEntry[] };

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const zh = i18n.language === 'zh';
  const isAdmin = user?.role === 'ADMIN';

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [myRsvp, setMyRsvp] = useState<string | null>(null);

  // share link state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // decline reason state
  const [showNoReason, setShowNoReason] = useState(false);
  const [noReason, setNoReason] = useState('');

  // guest list state
  const [guests, setGuests] = useState<Guests | null>(null);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [activeGuestTab, setActiveGuestTab] = useState<'GOING' | 'NO' | 'PENDING'>('GOING');
  const [guestSearch, setGuestSearch] = useState('');

  // blast state (admin only)
  const [showBlast, setShowBlast] = useState(false);
  const [blastMsg, setBlastMsg] = useState('');
  const [blastAudience, setBlastAudience] = useState<'rsvped' | 'invited'>('rsvped');
  const [blastSending, setBlastSending] = useState(false);
  const [blastResult, setBlastResult] = useState('');

  useEffect(() => {
    apiFetch<EventWithCounts>(`/events/${id}`)
      .then((ev) => { setEvent(ev); setMyRsvp(ev.myRsvp); })
      .catch(() => setFetchFailed(true));
    apiFetch<PaginatedResponse<Comment>>(`/events/${id}/comments`)
      .then((res) => setComments(res.data))
      .catch(() => {});
  }, [id]);

  const submitRsvp = async (status: 'GOING' | 'NO', reason?: string) => {
    try {
      if (myRsvp === status) {
        await apiFetch(`/events/${id}/rsvp`, { method: 'DELETE' });
        setMyRsvp(null);
      } else {
        await apiFetch(`/events/${id}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({ status, declineReason: reason }),
        });
        setMyRsvp(status);
      }
      const ev = await apiFetch<EventWithCounts>(`/events/${id}`);
      setEvent(ev);
      setMyRsvp(ev.myRsvp);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update RSVP.');
    }
  };

  const handleRsvp = async (status: 'GOING' | 'NO') => {
    if (!user) { Alert.alert('Login required'); return; }
    if (status === 'NO' && myRsvp !== 'NO') {
      setShowNoReason(true);
      return;
    }
    await submitRsvp(status);
  };

  const handleDeclineSubmit = async () => {
    setShowNoReason(false);
    await submitRsvp('NO', noReason.trim() || undefined);
    setNoReason('');
  };

  const handleDelete = () => {
    Alert.alert(
      t('events.deleteEvent'),
      t('events.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive',
          onPress: async () => {
            await apiFetch(`/events/${id}`, { method: 'DELETE' });
            router.replace('/(tabs)/events');
          },
        },
      ],
    );
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
      const data = await apiFetch<Guests>(`/events/${id}/rsvp/guests`);
      setGuests(data);
      setShowGuests(true);
    } catch {
      Alert.alert(zh ? '無法載入出席名單' : 'Failed to load guest list');
    } finally {
      setGuestsLoading(false);
    }
  };

  const handleBlastSend = async () => {
    if (!blastMsg.trim()) return;
    setBlastSending(true);
    setBlastResult('');
    try {
      const res = await apiFetch<{ sent: number }>(`/events/${id}/blast`, {
        method: 'POST',
        body: JSON.stringify({ messageEn: blastMsg, messageZh: blastMsg, channels: ['EMAIL'], audience: blastAudience }),
      });
      setBlastResult(zh ? `已發送給 ${res.sent} 人` : `Sent to ${res.sent} people`);
      setBlastMsg('');
    } catch (err: any) {
      setBlastResult(zh ? '發送失敗' : 'Failed to send');
    } finally {
      setBlastSending(false);
    }
  };

  const handleComment = async () => {
    if (!commentBody.trim()) return;
    const c = await apiFetch<Comment>(`/events/${id}/comments`, {
      method: 'POST', body: JSON.stringify({ body: commentBody }),
    });
    setComments((prev) => [...prev, c]);
    setCommentBody('');
  };

  const handleReply = async (parentCommentId: string) => {
    if (!replyBody.trim()) return;
    const reply = await apiFetch<Comment>(`/events/${id}/comments`, {
      method: 'POST', body: JSON.stringify({ body: replyBody, replyToId: parentCommentId }),
    });
    setComments((prev) =>
      prev.map((c) => c.id === parentCommentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c)
    );
    setReplyBody('');
    setReplyingToId(null);
  };

  if (!event) {
    if (fetchFailed) return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, color: '#EF4444', textAlign: 'center' }}>
          {zh ? '載入失敗，請返回重試。' : 'Failed to load event. Please go back and try again.'}
        </Text>
      </View>
    );
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>{t('common.loading')}</Text></View>;
  }

  const title = zh ? event.title_zh : event.title_en;
  const desc = zh ? event.description_zh : event.description_en;
  const location = zh ? event.location_zh : event.location_en;
  const fee = event.feeAmount ? `${event.feeCurrency} ${event.feeAmount}` : t('events.free');
  const dateStr = new Date(event.startAt).toLocaleString();
  const isPast = new Date(event.startAt) < new Date();

  const rsvpBtn = (status: 'GOING' | 'NO', label: string) => (
    <TouchableOpacity
      key={status}
      style={[styles.rsvpBtn, myRsvp === status && styles.rsvpBtnActive]}
      onPress={() => handleRsvp(status)}
    >
      <Text style={[styles.rsvpBtnText, myRsvp === status && styles.rsvpBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {resolveImageUrl(event.coverImageUrl) && (
        <Image source={{ uri: resolveImageUrl(event.coverImageUrl)! }} style={styles.cover} />
      )}
      <View style={styles.body}>

        {/* Admin toolbar */}
        {isAdmin && (
          <View style={styles.adminBar}>
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push(`/admin/events/${id}/edit`)}>
              <Text style={styles.editBtnText}>✏️ {t('events.editEvent')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>🗑 {t('events.deleteEvent')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Series badge */}
        {(event as any).seriesTitle && (
          <View style={styles.seriesBadge}>
            <Text style={styles.seriesBadgeText}>
              📚 {(event as any).seriesTitle}{(event as any).partNumber ? ` #${(event as any).partNumber}` : ''}
            </Text>
          </View>
        )}

        <Text style={styles.title}>{title}</Text>
        {event.groupName && <Text style={styles.groupBadge}>👥 {event.groupName}</Text>}
        <Text style={styles.meta}>📅 {dateStr} ({event.timezone})</Text>
        {location ? (
          <TouchableOpacity onPress={() => {
            const q = encodeURIComponent(location);
            const url = Platform.OS === 'ios'
              ? `maps://q=${q}`
              : `geo:0,0?q=${q}`;
            Linking.openURL(url).catch(() =>
              Linking.openURL(`https://maps.google.com/?q=${q}`)
            );
          }}>
            <Text style={[styles.meta, { textDecorationLine: 'underline' }]}>📍 {location}</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.meta}>💰 {fee}</Text>
        {desc ? <Text style={styles.desc}>{desc}</Text> : null}

        {/* RSVP counts + guest list toggle */}
        <View style={styles.countsRow}>
          <TouchableOpacity onPress={loadGuests} disabled={guestsLoading}>
            <Text style={styles.count}>✓ {event.rsvpCounts.GOING} {isPast ? (zh ? '出席' : 'Attended') : t('rsvp.going')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadGuests} disabled={guestsLoading}>
            <Text style={styles.count}>✗ {event.rsvpCounts.NO} {isPast ? (zh ? '缺席' : 'Did Not Attend') : t('rsvp.notGoing')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={loadGuests} style={styles.guestListBtn}>
          <Text style={styles.guestListBtnText}>
            {guestsLoading ? (zh ? '載入中…' : 'Loading…') : (zh ? '查看出席名單' : 'View guest list')}
          </Text>
        </TouchableOpacity>

        {!isPast && (
          <View style={styles.rsvpRow}>
            {rsvpBtn('GOING', t('rsvp.going'))}
            {rsvpBtn('NO', t('rsvp.notGoing'))}
          </View>
        )}

        {!isPast && user && (
          <TouchableOpacity style={styles.inviteBtn} onPress={handleCreateShareLink} disabled={inviteLoading}>
            <Text style={styles.inviteBtnText}>{inviteLoading ? (zh ? '生成中…' : 'Generating…') : (zh ? '🔗 分享活動' : '🔗 Share Event')}</Text>
          </TouchableOpacity>
        )}

        {/* Admin blast */}
        {isAdmin && (
          <View style={styles.blastSection}>
            <TouchableOpacity onPress={() => setShowBlast(!showBlast)} style={styles.blastToggle}>
              <Text style={styles.blastToggleText}>📣 {zh ? '發送訊息給出席者' : 'Message attendees'}</Text>
            </TouchableOpacity>
            {showBlast && (
              <View style={styles.blastForm}>
                <View style={styles.blastAudienceRow}>
                  {(['rsvped', 'invited'] as const).map((a) => (
                    <TouchableOpacity key={a} onPress={() => setBlastAudience(a)}
                      style={[styles.audienceBtn, blastAudience === a && styles.audienceBtnActive]}>
                      <Text style={[styles.audienceBtnText, blastAudience === a && styles.audienceBtnTextActive]}>
                        {a === 'rsvped' ? (zh ? '已回覆' : 'RSVPed') : (zh ? '已邀請' : 'Invited')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.blastInput}
                  placeholder={zh ? '輸入訊息…' : 'Enter message…'}
                  value={blastMsg}
                  onChangeText={setBlastMsg}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[styles.blastSendBtn, blastSending && { opacity: 0.6 }]}
                  onPress={handleBlastSend}
                  disabled={blastSending}
                >
                  <Text style={styles.blastSendBtnText}>{blastSending ? (zh ? '發送中…' : 'Sending…') : (zh ? '發送 Email' : 'Send Email')}</Text>
                </TouchableOpacity>
                {!!blastResult && <Text style={styles.blastResult}>{blastResult}</Text>}
              </View>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('comments.title')}</Text>
        {user && (
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder={t('comments.placeholder')}
              value={commentBody}
              onChangeText={setCommentBody}
              multiline
            />
            <TouchableOpacity style={styles.postBtn} onPress={handleComment}>
              <Text style={styles.postBtnText}>{t('comments.post')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {comments.length === 0 && <Text style={styles.empty}>{t('comments.noComments')}</Text>}
        {comments.map((c) => (
          <View key={c.id}>
            <View style={styles.comment}>
              <Text style={styles.commentHandle}>{c.userHandle}</Text>
              <Text style={styles.commentBody}>{c.body}</Text>
              <View style={styles.commentFooter}>
                <Text style={styles.commentDate}>{new Date(c.createdAt).toLocaleString()}</Text>
                {user && (
                  <TouchableOpacity onPress={() => setReplyingToId(replyingToId === c.id ? null : c.id)}>
                    <Text style={styles.replyBtn}>
                      {replyingToId === c.id ? (zh ? '取消' : 'Cancel') : (zh ? '回覆' : 'Reply')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {replyingToId === c.id && user && (
              <View style={styles.replyInputRow}>
                <TextInput
                  style={styles.replyInput}
                  placeholder={zh ? '寫下回覆…' : 'Write a reply…'}
                  value={replyBody}
                  onChangeText={setReplyBody}
                  multiline
                />
                <TouchableOpacity style={styles.postReplyBtn} onPress={() => handleReply(c.id)}>
                  <Text style={styles.postBtnText}>{t('comments.post')}</Text>
                </TouchableOpacity>
              </View>
            )}
            {c.replies && c.replies.length > 0 && (
              <View style={styles.repliesSection}>
                {c.replies.map((reply) => (
                  <View key={reply.id} style={styles.nestedReply}>
                    <Text style={styles.replyHandle}>{reply.userHandle}</Text>
                    <Text style={styles.replyBody}>{reply.body}</Text>
                    <Text style={styles.replyDate}>{new Date(reply.createdAt).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Share link modal */}
      {showInviteModal && (
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{zh ? '活動分享連結' : 'Event Share Link'}</Text>
            <Text style={styles.inviteLinkText}>{inviteLink}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareInvite}>
                <Text style={styles.shareBtnText}>{zh ? '分享' : 'Share'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowInviteModal(false)}>
                <Text style={styles.closeBtnText}>{zh ? '關閉' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Decline reason modal */}
      <Modal visible={showNoReason} transparent animationType="fade" onRequestClose={() => setShowNoReason(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{zh ? '無法參加的原因（選填）' : 'Reason for declining (optional)'}</Text>
            <TextInput
              style={[styles.commentInput, { marginBottom: 16 }]}
              placeholder={zh ? '請輸入原因…' : 'Enter reason…'}
              value={noReason}
              onChangeText={setNoReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleDeclineSubmit}>
                <Text style={styles.shareBtnText}>{zh ? '確認不參加' : 'Confirm Not Going'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowNoReason(false)}>
                <Text style={styles.closeBtnText}>{zh ? '取消' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Guest list modal */}
      <Modal visible={showGuests} transparent animationType="slide" onRequestClose={() => setShowGuests(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>{zh ? '出席名單' : 'Guest List'}</Text>
            {/* Search */}
            <TextInput
              style={styles.guestSearch}
              value={guestSearch}
              onChangeText={setGuestSearch}
              placeholder={zh ? '搜尋…' : 'Search…'}
              placeholderTextColor="#9CA3AF"
              clearButtonMode="while-editing"
            />
            {/* Tabs */}
            <View style={styles.guestTabRow}>
              {(['GOING', 'NO'] as const).map((tab) => (
                <TouchableOpacity key={tab} onPress={() => setActiveGuestTab(tab)}
                  style={[styles.guestTab, activeGuestTab === tab && styles.guestTabActive]}>
                  <Text style={[styles.guestTabText, activeGuestTab === tab && styles.guestTabTextActive]}>
                    {tab === 'GOING'
                      ? `✓ ${zh ? '參加' : 'Going'} (${guests?.GOING.length ?? 0})`
                      : `✗ ${zh ? '不參加' : 'Not Going'} (${guests?.NO.length ?? 0})`}
                  </Text>
                </TouchableOpacity>
              ))}
              {guests?.PENDING !== undefined && (
                <TouchableOpacity onPress={() => setActiveGuestTab('PENDING')}
                  style={[styles.guestTab, activeGuestTab === 'PENDING' && styles.guestTabPending]}>
                  <Text style={[styles.guestTabText, activeGuestTab === 'PENDING' && styles.guestTabTextPending]}>
                    {zh ? `未回覆 (${guests.PENDING.length})` : `No Reply (${guests.PENDING.length})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={{ marginTop: 8 }}>
              {(() => {
                const term = guestSearch.trim().toLowerCase();
                const rows = (guests?.[activeGuestTab] ?? []).filter((g) =>
                  !term ||
                  (g.displayName ?? '').toLowerCase().includes(term) ||
                  g.handle.toLowerCase().includes(term),
                );
                return rows.length === 0 ? (
                  <Text style={styles.empty}>
                    {term ? (zh ? '找不到符合結果' : 'No matches') : (zh ? '暫無名單' : 'No one yet')}
                  </Text>
                ) : rows.map((g, i) => (
                  <View key={i} style={styles.guestRow}>
                    <Text style={styles.guestName}>{g.displayName || g.handle}</Text>
                    {g.handle && <Text style={styles.guestHandle}>{g.handle}</Text>}
                  </View>
                ));
              })()}
            </ScrollView>
            <TouchableOpacity style={[styles.closeBtn, { marginTop: 12 }]} onPress={() => setShowGuests(false)}>
              <Text style={styles.closeBtnText}>{zh ? '關閉' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const INDIGO = '#4F46E5';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  cover: { width: '100%', height: 220 },
  body: { padding: 16 },
  adminBar: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  editBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  deleteBtn: { backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  seriesBadge: { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  seriesBadgeText: { color: '#4338CA', fontSize: 12, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  groupBadge: { fontSize: 12, color: '#4F46E5', fontWeight: '500', marginBottom: 8 },
  meta: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  desc: { fontSize: 15, color: '#374151', marginTop: 8, lineHeight: 22 },
  countsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  count: { fontSize: 13, color: '#6B7280' },
  guestListBtn: { marginTop: 6, marginBottom: 4 },
  guestListBtnText: { fontSize: 12, color: INDIGO, textDecorationLine: 'underline' },
  rsvpRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  rsvpBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  rsvpBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  rsvpBtnText: { fontSize: 14, color: '#374151' },
  rsvpBtnTextActive: { color: '#fff' },
  inviteBtn: { backgroundColor: '#06B6D4', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 },
  inviteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  blastSection: { marginTop: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden' },
  blastToggle: { padding: 14, backgroundColor: '#F9FAFB' },
  blastToggleText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  blastForm: { padding: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  blastAudienceRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  audienceBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  audienceBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  audienceBtnText: { fontSize: 13, color: '#374151' },
  audienceBtnTextActive: { color: '#fff' },
  blastInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10, minHeight: 80, textAlignVertical: 'top' },
  blastSendBtn: { backgroundColor: INDIGO, borderRadius: 8, padding: 12, alignItems: 'center' },
  blastSendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  blastResult: { marginTop: 8, fontSize: 13, color: '#16A34A', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111', marginTop: 24, marginBottom: 12 },
  empty: { color: '#9CA3AF', fontSize: 14 },
  comment: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  commentHandle: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  commentBody: { fontSize: 14, color: '#374151', marginBottom: 8 },
  commentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentDate: { fontSize: 11, color: '#BFDBFE' },
  replyBtn: { fontSize: 12, color: INDIGO, fontWeight: '600' },
  replyInputRow: { flexDirection: 'row', gap: 8, marginLeft: 16, marginBottom: 10 },
  replyInput: { flex: 1, borderWidth: 1, borderColor: '#E0E7FF', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: '#F5F3FF' },
  postReplyBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  repliesSection: { marginLeft: 16, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: '#E0E7FF', paddingLeft: 12 },
  nestedReply: { backgroundColor: '#F9FAFB', borderRadius: 6, padding: 10, marginBottom: 8 },
  replyHandle: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  replyBody: { fontSize: 13, color: '#374151', marginBottom: 4 },
  replyDate: { fontSize: 10, color: '#D1D5DB' },
  commentInputRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14 },
  postBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  postBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 10 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12, textAlign: 'center' },
  inviteLinkText: { fontSize: 12, color: INDIGO, backgroundColor: '#F3F4F6', borderRadius: 6, padding: 10, marginBottom: 14, textAlign: 'center', fontFamily: 'Courier' },
  modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  shareBtn: { backgroundColor: INDIGO, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10, flex: 1 },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  closeBtn: { backgroundColor: '#E5E7EB', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10, flex: 1 },
  closeBtnText: { color: '#374151', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  guestSearch: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#111827', marginBottom: 8 },
  guestTabRow: { flexDirection: 'row', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  guestTab: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 8, alignItems: 'center' },
  guestTabActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  guestTabPending: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
  guestTabText: { fontSize: 12, color: '#374151' },
  guestTabTextActive: { color: '#fff', fontWeight: '600' },
  guestTabTextPending: { color: '#B45309', fontWeight: '600' },
  guestRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  guestName: { fontSize: 14, color: '#111', fontWeight: '500' },
  guestHandle: { fontSize: 12, color: '#9CA3AF' },
});
