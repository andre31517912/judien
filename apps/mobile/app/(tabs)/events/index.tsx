import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Image, Alert, Platform, RefreshControl, Share,
} from 'react-native';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import JLogo from '../../../components/JLogo';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../context/auth.context';
import { useTheme } from '../../../context/theme.context';
import { apiFetch, apiUpload, resolveImageUrl } from '../../../lib/api';
import { useTranslation } from 'react-i18next';
import type { EventWithCounts, PaginatedResponse, Event } from '@judien/shared';
import DateTimeField from '../../../components/DateTimeField';

const INDIGO = '#4F46E5';

export default function EventsTab() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const isAdmin = user?.role === 'ADMIN';

  // ── List state ──────────────────────────────────────────────────────────
  const [scope, setScope] = useState<'future' | 'past'>('future');
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadEvents = (s = scope, p = page, silent = false) => {
    if (!silent) setLoading(true);
    apiFetch<PaginatedResponse<EventWithCounts>>(
      `/events?scope=${s}&page=${p}&pageSize=${pageSize}`,
    ).then((res) => { setEvents(res.data); setTotal(res.total); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { if (!authLoading) loadEvents(); }, [scope, page, authLoading]);

  // ── Create form state ───────────────────────────────────────────────────
  const [creating, setCreating] = useState(false);

  // ── Configure Tabs header (same style as Home/Notifications/Profile) ─────
  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({
      headerShown: true,
      headerTitle: creating ? (zh ? '建立活動' : 'Create Event') : () => <JLogo />,
      headerStyle: { backgroundColor: colors.headerBg },
      headerLeft: creating ? () => (
        <TouchableOpacity onPress={() => { setCreating(false); resetForm(); }} activeOpacity={1} style={{ marginLeft: 16 }}>
          <Text style={{ color: INDIGO, fontSize: 17 }}>‹ {zh ? '返回' : 'Back'}</Text>
        </TouchableOpacity>
      ) : undefined,
      headerRight: !creating && user ? () => (
        <TouchableOpacity onPress={() => setCreating(true)} activeOpacity={0.7} style={{ marginRight: 16 }}>
          <Text style={{ color: INDIGO, fontSize: 24, fontWeight: '400' }}>＋</Text>
        </TouchableOpacity>
      ) : undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating, zh, colors.headerBg, user]));
  const [form, setForm] = useState({
    title: '', description: '', location: '',
    startAt: '', endAt: '', timezone: 'Asia/Taipei',
    feeAmount: '', feeCurrency: 'TWD',
  });
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setF = (k: keyof typeof form) => (val: string) =>
    setForm((prev) => ({ ...prev, [k]: val }));

  const resetForm = () => {
    setForm({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' });
    setCoverUri(null);
  };

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo library access to upload a cover image.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setCoverUri(result.assets[0].uri);
  };

  /** Normalise "YYYY-MM-DD HH:MM" (space) to ISO "YYYY-MM-DDTHH:MM" before parsing. */
  const toISO = (s: string): string => new Date(s.trim().replace(' ', 'T')).toISOString();

  const handleCreate = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Please enter a title.'); return; }
    if (form.startAt && isNaN(new Date(form.startAt.trim().replace(' ', 'T')).getTime())) {
      Alert.alert('Invalid date', 'Start date must be in YYYY-MM-DD HH:MM format.'); return;
    }
    if (form.endAt && isNaN(new Date(form.endAt.trim().replace(' ', 'T')).getTime())) {
      Alert.alert('Invalid date', 'End date must be in YYYY-MM-DD HH:MM format.'); return;
    }
    setSubmitting(true);
    try {
      let coverImageUrl: string | null = null;
      if (coverUri) { const up = await apiUpload(coverUri); coverImageUrl = up.url; }
      await apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify({
        title_en: form.title, title_zh: form.title,
        description_en: form.description, description_zh: form.description,
        location_en: form.location, location_zh: form.location,
        startAt: form.startAt ? toISO(form.startAt) : undefined,
        endAt: form.endAt ? toISO(form.endAt) : null,
        timezone: form.timezone,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        feeCurrency: form.feeCurrency || 'TWD',
        coverImageUrl,
      }) });
      resetForm();
      setCreating(false);
      loadEvents();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, value, onChange, placeholder, multiline, keyboardType, maxLength }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; multiline?: boolean; keyboardType?: any; maxLength?: number;
  }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor="#9CA3AF" keyboardType={keyboardType ?? 'default'}
        multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'}
        maxLength={maxLength}
      />
    </View>
  );

  const tabStyle = (active: boolean) => [styles.tab, active && styles.activeTab];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* ── Upcoming / Past tabs (hidden while creating) ── */}
      {!creating && (
        <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={tabStyle(scope === 'future')} onPress={() => { setScope('future'); setPage(1); }}>
            <Text style={[styles.tabText, scope === 'future' && styles.activeTabText]}>{t('events.future')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tabStyle(scope === 'past')} onPress={() => { setScope('past'); setPage(1); }}>
            <Text style={[styles.tabText, scope === 'past' && styles.activeTabText]}>{t('events.past')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Create Event form ── */}
      {creating && (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Field label={zh ? '名稱' : 'Title'} value={form.title} onChange={setF('title')} placeholder="Event name" />
          <Field label={zh ? '地點' : 'Location'} value={form.location} onChange={setF('location')} placeholder="e.g. Taipei, Da'an Park" />
          <Field label={zh ? '描述' : 'Description'} value={form.description} onChange={setF('description')}
            placeholder="What's this event about?" multiline maxLength={5000} />
          <View style={styles.row}>
            <View style={styles.half}>
              <DateTimeField
                label={zh ? '開始' : 'Start'}
                value={form.startAt}
                onChange={setF('startAt')}
                placeholder={zh ? '選擇日期與時間' : 'Select date and time'}
                locale={zh ? 'zh-TW' : 'en-US'}
              />
            </View>
            <View style={styles.half}>
              <DateTimeField
                label={zh ? '結束（選填）' : 'End (optional)'}
                value={form.endAt}
                onChange={setF('endAt')}
                placeholder={zh ? '選擇日期與時間' : 'Select date and time'}
                locale={zh ? 'zh-TW' : 'en-US'}
                clearable
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.half, { flex: 1.5 }]}>
              <Field label={zh ? '時區' : 'Timezone'} value={form.timezone} onChange={setF('timezone')} />
            </View>
            <View style={styles.half}>
              <Field label={zh ? '費用' : 'Fee'} value={form.feeAmount} onChange={setF('feeAmount')} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={styles.half}>
              <Field label={zh ? '幣別' : 'Currency'} value={form.feeCurrency} onChange={setF('feeCurrency')} />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{zh ? '封面照片（選填）' : 'Cover Photo (optional)'}</Text>
            <TouchableOpacity style={styles.photoPicker} onPress={pickImage} activeOpacity={0.7}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={{ fontSize: 32 }}>🖼️</Text>
                  <Text style={styles.photoHint}>{zh ? '點擊上傳照片' : 'Tap to upload a photo'}</Text>
                </View>
              )}
            </TouchableOpacity>
            {coverUri && (
              <TouchableOpacity onPress={() => setCoverUri(null)} style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 13, color: '#EF4444' }}>{zh ? '移除照片' : 'Remove photo'}</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleCreate} disabled={submitting} activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>{submitting ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立' : 'Create Event')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Events list ── */}
      {!creating && (
        loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12, backgroundColor: colors.bg }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(scope, page, true); }} tintColor={colors.subtext} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={[styles.empty, { color: colors.placeholder }]}>{zh ? '目前沒有活動。' : 'No events yet.'}</Text>
              </View>
            }
            renderItem={({ item }) => {
              const title = zh ? item.title_zh : item.title_en;
              const location = zh ? item.location_zh : item.location_en;
              const date = new Date(item.startAt).toLocaleDateString();
              const fee = item.feeAmount ? `${item.feeCurrency} ${item.feeAmount}` : (zh ? '免費' : 'Free');
              const coverUri = resolveImageUrl(item.coverImageUrl);
              const handleExport = async () => {
                try {
                  type GuestEntry = { handle: string; displayName: string | null };
                  type InvitedEntry = { name: string };
                  const guests = await apiFetch<{ GOING: GuestEntry[]; NO: GuestEntry[]; INVITED?: InvitedEntry[]; PENDING?: GuestEntry[] }>(`/events/${item.id}/rsvp/guests`);
                  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
                  const lines: string[] = [];
                  lines.push(`Title,${esc(title)}`);
                  lines.push(`Date,${esc(date)}`);
                  if (location) lines.push(`Location,${esc(location)}`);
                  lines.push(`Fee,${esc(fee)}`);
                  if (item.groupName) lines.push(`Group,${esc(item.groupName)}`);
                  lines.push('');
                  const invited = (guests.INVITED ?? []).map((g) => g.name);
                  const going = guests.GOING.map((g) => g.displayName ?? g.handle);
                  const notGoing = guests.NO.map((g) => g.displayName ?? g.handle);
                  const unresponded = (guests.PENDING ?? []).map((g) => g.displayName ?? g.handle);
                  lines.push('Invited,Going,Not Going,Unresponded');
                  const maxLen = Math.max(invited.length, going.length, notGoing.length, unresponded.length, 0);
                  for (let i = 0; i < maxLen; i++) {
                    lines.push([invited[i] ?? '', going[i] ?? '', notGoing[i] ?? '', unresponded[i] ?? ''].map(esc).join(','));
                  }
                  await Share.share({ message: lines.join('\n'), title: zh ? '活動資料' : 'Event Export' });
                } catch (err: any) { Alert.alert('Error', err.message ?? 'Export failed'); }
              };
              return (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity style={{ flexDirection: 'row', gap: 12, flex: 1 }} onPress={() => router.push(`/events/${item.id}`)}>
                    {coverUri && (
                      <View style={[styles.thumbnail, { backgroundColor: colors.border }]}>
                        <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                      </View>
                    )}
                    <View style={styles.cardBody}>
                      {(item as any).seriesTitle && (
                        <View style={styles.seriesBadge}>
                          <Text style={styles.seriesBadgeText}>
                            📚 {(item as any).seriesTitle}{(item as any).partNumber ? ` #${(item as any).partNumber}` : ''}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
                      {item.groupName && <Text style={styles.cardGroup}>👥 {item.groupName}</Text>}
                      <Text style={[styles.cardMeta, { color: colors.subtext }]}>{date}</Text>
                      {location ? <Text style={[styles.cardMeta, { color: colors.subtext }]} numberOfLines={1}>{location}</Text> : null}
                      <Text style={[styles.rsvpRow, { color: colors.placeholder }]}>✓ {item.rsvpCounts.GOING}  ✗ {item.rsvpCounts.NO}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
                    <Text style={styles.exportBtnText}>{zh ? '匯出' : 'Export'}</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: '#4F46E5' },
  tabText: { fontSize: 14, color: '#6B7280' },
  activeTabText: { color: '#4F46E5', fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 36, marginBottom: 8, opacity: 0.5 },
  empty: { textAlign: 'center', color: '#9CA3AF' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'column', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden' },
  cardBody: { flex: 1 },
  exportBtn: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  exportBtnText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardGroup: { fontSize: 12, color: '#4F46E5', fontWeight: '500', marginBottom: 4 },
  seriesBadge: { backgroundColor: '#EEF2FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 },
  seriesBadgeText: { color: '#4338CA', fontSize: 11, fontWeight: '500' },
  cardMeta: { fontSize: 13, color: '#6B7280' },
  rsvpRow: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  backBtn: { color: '#4F46E5', fontSize: 17 },
  // form
  formContainer: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
  inputMulti: { height: 88, paddingTop: 9 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  photoPicker: { width: '100%', height: 150, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB',
    borderStyle: 'dashed', backgroundColor: '#F9FAFB', overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoHint: { fontSize: 13, color: '#9CA3AF' },
  submitBtn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
