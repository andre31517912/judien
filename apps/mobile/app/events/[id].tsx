import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Image,
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [myRsvp, setMyRsvp] = useState<string | null>(null);

  // blast state
  const [blastMsg, setBlastMsg] = useState('');
  const [blastChannels, setBlastChannels] = useState<string[]>(['EMAIL']);
  const [blastAudience, setBlastAudience] = useState<'rsvped' | 'all'>('rsvped');
  const [blastResult, setBlastResult] = useState('');

  useEffect(() => {
    apiFetch<EventWithCounts>(`/events/${id}`).then((ev) => {
      setEvent(ev);
      setMyRsvp(ev.myRsvp);
    });
    apiFetch<PaginatedResponse<Comment>>(`/events/${id}/comments`).then((res) => {
      setComments(res.data);
    });
  }, [id]);

  const handleRsvp = async (status: 'GOING' | 'MAYBE' | 'NO') => {
    if (!user) { Alert.alert('Login required'); return; }
    await apiFetch(`/events/${id}/rsvp`, {
      method: 'POST', body: JSON.stringify({ status }),
    });
    setMyRsvp(status);
    const ev = await apiFetch<EventWithCounts>(`/events/${id}`);
    setEvent(ev);
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

  const toggleBlastChannel = (ch: string) =>
    setBlastChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );

  const handleBlast = async () => {
    if (!blastMsg.trim()) { setBlastResult(zh ? '請輸入訊息。' : 'Please enter a message.'); return; }
    if (blastChannels.length === 0) { setBlastResult(zh ? '請選擇發送方式。' : 'Select at least one channel.'); return; }
    setBlastResult(zh ? '發送中…' : 'Sending…');
    try {
      const res = await apiFetch<{ sent: number }>(`/events/${id}/blast`, {
        method: 'POST',
        body: JSON.stringify({ channels: blastChannels, audience: blastAudience, messageEn: blastMsg, messageZh: blastMsg }),
      });
      setBlastResult(zh ? `✓ 已發送給 ${res.sent} 位用戶。` : `✓ Sent to ${res.sent} user${res.sent !== 1 ? 's' : ''}.`);
      setBlastMsg('');
    } catch (err: any) {
      setBlastResult(err.message ?? (zh ? '發送失敗。' : 'Failed to send.'));
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

  if (!event) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>{t('common.loading')}</Text></View>;

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

        <Text style={styles.sectionTitle}>{t('comments.title')}</Text>
        {comments.length === 0 && <Text style={styles.empty}>{t('comments.noComments')}</Text>}
        {comments.map((c) => (
          <View key={c.id} style={styles.comment}>
            <Text style={styles.commentHandle}>{c.userHandle}</Text>
            <Text style={styles.commentBody}>{c.body}</Text>
          </View>
        ))}

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

        {/* Admin blast section */}
        {isAdmin && (
          <View style={styles.blastSection}>
            <Text style={styles.sectionTitle}>{t('admin.sendBlast')}</Text>

            <Text style={styles.label}>{t('admin.audience')}</Text>
            <View style={styles.toggleRow}>
              {(['rsvped', 'all'] as const).map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.toggleBtn, blastAudience === a && styles.toggleBtnActive]}
                  onPress={() => setBlastAudience(a)}
                >
                  <Text style={[styles.toggleBtnText, blastAudience === a && styles.toggleBtnTextActive]}>
                    {a === 'rsvped' ? t('admin.audienceRsvped') : t('admin.audienceAll')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('admin.channels')}</Text>
            <View style={styles.toggleRow}>
              {(['EMAIL', 'SMS'] as const).map((ch) => (
                <TouchableOpacity
                  key={ch}
                  style={[styles.toggleBtn, blastChannels.includes(ch) && styles.toggleBtnActive]}
                  onPress={() => toggleBlastChannel(ch)}
                >
                  <Text style={[styles.toggleBtnText, blastChannels.includes(ch) && styles.toggleBtnTextActive]}>
                    {ch === 'EMAIL' ? t('admin.email') : t('admin.sms')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.commentInput, { marginTop: 8 }]}
              placeholder={zh ? '輸入訊息…' : 'Enter message…'}
              value={blastMsg}
              onChangeText={setBlastMsg}
              multiline
            />
            <TouchableOpacity style={styles.blastBtn} onPress={handleBlast}>
              <Text style={styles.blastBtnText}>{t('admin.sendBlast')}</Text>
            </TouchableOpacity>
            {blastResult ? <Text style={styles.blastResult}>{blastResult}</Text> : null}
          </View>
        )}
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
  commentBody: { fontSize: 14, color: '#374151' },
  commentInputRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14 },
  postBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  postBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  blastSection: { marginTop: 8, borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 8 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 10 },
  toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  toggleBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  toggleBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  toggleBtnText: { fontSize: 13, color: '#374151' },
  toggleBtnTextActive: { color: '#fff' },
  blastBtn: { backgroundColor: INDIGO, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 10 },
  blastBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  blastResult: { marginTop: 8, fontSize: 13, color: '#6B7280', textAlign: 'center' },
});
