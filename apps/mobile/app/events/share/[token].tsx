'use client';

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { EventWithCounts } from '@judien/shared';
import { apiFetch, resolveImageUrl } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';
import { useTheme } from '../../../context/theme.context';
import { useTranslation } from 'react-i18next';

type GuestIdentity = { name: string; phoneE164: string; email: string };
type GuestEntry = { handle: string; displayName: string | null };
type Guests = { GOING: GuestEntry[]; NO: GuestEntry[] };

export default function SharedEventScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { i18n } = useTranslation();
  const router = useRouter();
  const zh = i18n.language === 'zh';

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [guests, setGuests] = useState<Guests | null>(null);
  const [guest, setGuest] = useState<GuestIdentity>({ name: '', phoneE164: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showJoinNudge, setShowJoinNudge] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [eventData, guestsData] = await Promise.all([
        apiFetch<EventWithCounts>(`/events/share/${token}`),
        apiFetch<Guests>(`/events/share/${token}/rsvp/guests`).catch(() => null),
      ]);
      setEvent(eventData);
      setGuests(guestsData);
    } catch (err: any) {
      Alert.alert(zh ? '錯誤' : 'Error', err.message ?? (zh ? '載入失敗' : 'Failed to load event'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const rsvp = async (status: 'GOING' | 'NO') => {
    if (!token) return;
    setSaving(true);
    try {
      if (user) {
        await apiFetch(`/events/share/${token}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({ status }),
        });
      } else {
        if (!guest.name.trim() || !guest.phoneE164.trim() || !guest.email.trim()) {
          Alert.alert(zh ? '請填寫資料' : 'Required', zh ? '請先填寫姓名、電話與 Email。' : 'Please enter name, phone, and email first.');
          setSaving(false);
          return;
        }
        await apiFetch(`/events/share/${token}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({ status, guest }),
        });
        setShowJoinNudge(true);
      }
      await load();
    } catch (err: any) {
      Alert.alert(zh ? '錯誤' : 'Error', err.message ?? (zh ? 'RSVP 失敗。' : 'Failed to submit RSVP.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !event) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.muted, { color: colors.subtext }]}>{zh ? '載入中…' : 'Loading…'}</Text>
      </View>
    );
  }

  const title = event.title;
  const description = event.description;
  const location = event.location;
  const isPast = new Date(event.startAt) < new Date();
  const coverUri = resolveImageUrl(event.coverImageUrl);

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.container}>
      {coverUri && (
        <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
      )}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {event.groupName ? <Text style={[styles.groupBadge, { color: colors.subtext }]}>{event.groupName}</Text> : null}
      <Text style={[styles.meta, { color: colors.subtext }]}>{new Date(event.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US')}</Text>
      {location ? <Text style={[styles.meta, { color: colors.subtext }]}>📍 {location}</Text> : null}
      {description ? <Text style={[styles.desc, { color: colors.text }]}>{description}</Text> : null}

      {/* RSVP counts */}
      <View style={styles.countRow}>
        <Text style={[styles.count, { color: colors.subtext }]}>✓ {event.rsvpCounts.GOING} {zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going')}</Text>
        <Text style={[styles.count, { color: colors.subtext }]}>✕ {event.rsvpCounts.NO} {zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't Attend" : 'Not Going')}</Text>
      </View>

      {/* Guest identity form (non-logged-in only) */}
      {!isPast && !user && (
        <View style={styles.form}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.inputText }]}
            placeholder={zh ? '姓名' : 'Name'}
            placeholderTextColor={colors.placeholder}
            value={guest.name}
            onChangeText={(v) => setGuest((prev) => ({ ...prev, name: v }))}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.inputText }]}
            placeholder={zh ? '電話 (+886...)' : 'Phone (+886...)'}
            placeholderTextColor={colors.placeholder}
            value={guest.phoneE164}
            onChangeText={(v) => setGuest((prev) => ({ ...prev, phoneE164: v }))}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.inputText }]}
            placeholder={zh ? '電子郵件' : 'Email'}
            placeholderTextColor={colors.placeholder}
            value={guest.email}
            onChangeText={(v) => setGuest((prev) => ({ ...prev, email: v }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      )}

      {/* RSVP buttons */}
      {!isPast && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, event.myRsvp === 'GOING' && styles.btnActive]}
            onPress={() => rsvp('GOING')}
            disabled={saving}
          >
            <Text style={[styles.btnText, event.myRsvp === 'GOING' && styles.btnTextActive]}>{zh ? '參加' : 'Going'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, event.myRsvp === 'NO' && styles.btnActive]}
            onPress={() => rsvp('NO')}
            disabled={saving}
          >
            <Text style={[styles.btnText, event.myRsvp === 'NO' && styles.btnTextActive]}>{zh ? '不參加' : 'Not Going'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Join nudge (shown after guest RSVP) */}
      {showJoinNudge && (
        <View style={[styles.nudge, { borderColor: isDark ? '#4338CA' : '#A5B4FC', backgroundColor: isDark ? 'rgba(79,70,229,0.15)' : '#EEF2FF' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nudgeTitle}>{zh ? '你已回覆成功！🎉' : "You're in! 🎉"}</Text>
            <Text style={styles.nudgeBody}>
              {zh ? '想追蹤所有活動和社群嗎？立即免費建立帳號。' : 'Want to track all your events and groups? Create a free account.'}
            </Text>
            <TouchableOpacity style={styles.nudgeBtn} onPress={() => router.push('/signup' as any)}>
              <Text style={styles.nudgeBtnText}>{zh ? '建立帳號 →' : 'Create Account →'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowJoinNudge(false)} style={styles.nudgeDismiss}>
            <Text style={{ color: '#818CF8', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Guest list */}
      {guests && (
        <View style={[styles.guestPanel, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.guestPanelTitle, { color: colors.text }]}>{zh ? '出席名單' : 'Attendance'}</Text>
          {(['GOING', 'NO'] as const).map((s) => (
            <View key={s} style={[styles.guestGroup, { borderColor: colors.border }]}>
              <Text style={[styles.guestGroupLabel, { color: colors.subtext }]}>
                {s === 'GOING'
                  ? `${zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going')} (${guests[s].length})`
                  : `${zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't Attend" : 'Not Going')} (${guests[s].length})`}
              </Text>
              {guests[s].length === 0 ? (
                <Text style={[styles.guestNone, { color: colors.placeholder }]}>{zh ? '尚無' : 'None yet'}</Text>
              ) : guests[s].map((g, i) => (
                <Text key={i} style={[styles.guestName, { color: colors.text }]}>{g.displayName ?? g.handle}</Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const INDIGO = '#4F46E5';

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 16, gap: 10, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 14 },
  cover: { width: '100%', height: 200, borderRadius: 12, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  groupBadge: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  meta: { fontSize: 14, marginBottom: 2 },
  desc: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  countRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  count: { fontSize: 13 },
  form: { gap: 8, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  btn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  btnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  btnText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  btnTextActive: { color: '#fff' },
  nudge: { borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 4 },
  nudgeTitle: { fontSize: 14, fontWeight: '700', color: '#3730A3', marginBottom: 2 },
  nudgeBody: { fontSize: 13, color: '#4338CA', lineHeight: 18 },
  nudgeBtn: { marginTop: 8, backgroundColor: INDIGO, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  nudgeBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  nudgeDismiss: { padding: 4 },
  guestPanel: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 4, gap: 10 },
  guestPanelTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  guestGroup: { borderTopWidth: 1, paddingTop: 8, gap: 4 },
  guestGroupLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  guestNone: { fontSize: 12 },
  guestName: { fontSize: 13 },
});
