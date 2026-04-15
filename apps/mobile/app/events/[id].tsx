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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, resolveImageUrl } from '../../lib/api';
import { useAuth } from '../../context/auth.context';
import { useTranslation } from 'react-i18next';
import type { EventWithCounts, Comment, PaginatedResponse } from '@judien/shared';

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

  useEffect(() => {
    apiFetch<EventWithCounts>(`/events/${id}`)
      .then((ev) => { setEvent(ev); setMyRsvp(ev.myRsvp); })
      .catch(() => setFetchFailed(true));
    apiFetch<PaginatedResponse<Comment>>(`/events/${id}/comments`)
      .then((res) => setComments(res.data))
      .catch(() => {});
  }, [id]);

  const handleRsvp = async (status: 'GOING' | 'MAYBE' | 'NO') => {
    if (!user) { Alert.alert('Login required'); return; }
    try {
      if (myRsvp === status) {
        await apiFetch(`/events/${id}/rsvp`, { method: 'DELETE' });
        setMyRsvp(null);
      } else {
        await apiFetch(`/events/${id}/rsvp`, {
          method: 'POST', body: JSON.stringify({ status }),
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
      const res = await apiFetch<{ token: string }>(`/events/${id}/share-link`, {
        method: 'POST',
      });
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
      await Share.share({
        message: zh ? `活動分享：${inviteLink}` : `Event share: ${inviteLink}`,
        url: inviteLink,
        title: zh ? '活動分享連結' : 'Event Share Link',
      });
    } catch {
      Alert.alert(zh ? '分享失敗' : 'Share failed');
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
      prev.map((c) =>
        c.id === parentCommentId
          ? { ...c, replies: [...(c.replies ?? []), reply] }
          : c
      )
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

  const rsvpBtn = (status: 'GOING' | 'MAYBE' | 'NO', label: string) => (
    <TouchableOpacity
      key={status}
      style={[styles.rsvpBtn, myRsvp === status && styles.rsvpBtnActive]}
      onPress={() => handleRsvp(status)}
    >
      <Text style={[styles.rsvpBtnText, myRsvp === status && styles.rsvpBtnTextActive]}>
        {label}
      </Text>
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
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push(`/admin/events/${id}/edit`)}
            >
              <Text style={styles.editBtnText}>✏️ {t('events.editEvent')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>🗑 {t('events.deleteEvent')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.title}>{title}</Text>
        {event.groupName && <Text style={styles.groupBadge}>👥 {event.groupName}</Text>}
        <Text style={styles.meta}>📅 {dateStr} ({event.timezone})</Text>
        {location ? <Text style={styles.meta}>📍 {location}</Text> : null}
        <Text style={styles.meta}>💰 {fee}</Text>
        {desc ? <Text style={styles.desc}>{desc}</Text> : null}

        <View style={styles.countsRow}>
          <Text style={styles.count}>✓ {event.rsvpCounts.GOING} {t('rsvp.going')}</Text>
          <Text style={styles.count}>? {event.rsvpCounts.MAYBE} {t('rsvp.maybe')}</Text>
          <Text style={styles.count}>✗ {event.rsvpCounts.NO} {t('rsvp.notGoing')}</Text>
        </View>

        <View style={styles.rsvpRow}>
          {rsvpBtn('GOING', t('rsvp.going'))}
          {rsvpBtn('MAYBE', t('rsvp.maybe'))}
          {rsvpBtn('NO', t('rsvp.notGoing'))}
        </View>

        {user && (
          <TouchableOpacity style={styles.inviteBtn} onPress={handleCreateShareLink} disabled={inviteLoading}>
            <Text style={styles.inviteBtnText}>{inviteLoading ? (zh ? '生成中…' : 'Generating…') : (zh ? '🔗 分享活動' : '🔗 Share Event')}</Text>
          </TouchableOpacity>
        )}

        {showInviteModal && (
          <View style={styles.modal}>
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
            {/* Main comment */}
            <View style={styles.comment}>
              <Text style={styles.commentHandle}>{c.userHandle}</Text>
              <Text style={styles.commentBody}>{c.body}</Text>
              <View style={styles.commentFooter}>
                <Text style={styles.commentDate}>{new Date(c.createdAt).toLocaleString()}</Text>
                {user && (
                  <TouchableOpacity
                    onPress={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                  >
                    <Text style={styles.replyBtn}>
                      {replyingToId === c.id ? (zh ? '取消' : 'Cancel') : (zh ? '回覆' : 'Reply')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Reply form */}
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

            {/* Replies */}
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  groupBadge: { fontSize: 12, color: '#4F46E5', fontWeight: '500', marginBottom: 8 },
  meta: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  desc: { fontSize: 15, color: '#374151', marginTop: 8, lineHeight: 22 },
  countsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  count: { fontSize: 13, color: '#6B7280' },
  rsvpRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  rsvpBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  rsvpBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  rsvpBtnText: { fontSize: 14, color: '#374151' },
  rsvpBtnTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111', marginTop: 24, marginBottom: 12 },
  empty: { color: '#9CA3AF', fontSize: 14 },
  comment: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  commentHandle: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  commentBody: { fontSize: 14, color: '#374151', marginBottom: 8 },
  commentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentDate: { fontSize: 11, color: '#BFDBFE' },
  replyBtn: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
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
  inviteBtn: { backgroundColor: '#06B6D4', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 },
  inviteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '85%', maxWidth: 350, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, elevation: 10 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12, textAlign: 'center' },
  inviteLinkText: { fontSize: 12, color: '#4F46E5', backgroundColor: '#F3F4F6', borderRadius: 6, padding: 10, marginBottom: 14, textAlign: 'center', fontWeight: '500', fontFamily: 'Courier' },
  modalActions: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  shareBtn: { backgroundColor: '#4F46E5', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10, flex: 1 },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  closeBtn: { backgroundColor: '#E5E7EB', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 10, flex: 1 },
  closeBtnText: { color: '#374151', fontWeight: '600', fontSize: 13, textAlign: 'center' },
});
