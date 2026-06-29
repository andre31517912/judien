import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Image, Alert, Platform, RefreshControl, Dimensions,
} from 'react-native';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import JLogo from '../../../components/JLogo';
import { Ionicons } from '@expo/vector-icons';
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
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const isAdmin = user?.role === 'ADMIN';
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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
        <TouchableOpacity onPress={() => { setCreating(false); resetForm(); }} activeOpacity={0.7} style={{ marginLeft: 4, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="chevron-back" size={28} color={INDIGO} />
          <Text style={{ color: INDIGO, fontSize: 17 }}>{zh ? '返回' : 'Back'}</Text>
        </TouchableOpacity>
      ) : undefined,
      headerRight: !creating && user ? () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 8 }}>
          <TouchableOpacity onPress={() => setCreating(true)} activeOpacity={0.7} style={{ padding: 8 }}>
            <Ionicons name="add" size={26} color={INDIGO} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ padding: 8 }}>
            <Ionicons name="search" size={24} color={INDIGO} />
          </TouchableOpacity>
        </View>
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
      allowsEditing: true, aspect: [4, 3], quality: 0.5,
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
        title: form.title,
        description: form.description,
        location: form.location,
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
        placeholderTextColor={colors.placeholder} keyboardType={keyboardType ?? 'default'}
        multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'}
        maxLength={maxLength}
      />
    </View>
  );

  const tabStyle = (active: boolean) => [styles.tab, active && styles.activeTab];

  return (
    <View style={styles.container}>

      {/* ── Upcoming / Past tabs (hidden while creating) ── */}
      {!creating && (
        <View style={styles.tabs}>
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

      {/* ── Events grid ── */}
      {!creating && (
        loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 12, backgroundColor: colors.bg, flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(scope, page, true); }} tintColor={colors.subtext} />}
          >
            {events.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={styles.empty}>{zh ? '沒有活動' : 'No events'}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {events.map((item) => {
                  const tileSize = (Dimensions.get('window').width - 32) / 2;
                  const dayStr = new Date(item.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
                  const timeStr = new Date(item.startAt).toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });
                  const isFree = !item.feeAmount;
                  const fee = item.feeAmount ? `${item.feeCurrency} ${item.feeAmount}` : (zh ? '免費' : 'Free');
                  const coverUri = resolveImageUrl(item.coverImageUrl);
                  const isPast = scope === 'past';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => router.push(`/events/${item.id}`)}
                      style={{ width: tileSize, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: isPast ? 0.75 : 1 }}
                      activeOpacity={0.85}
                    >
                      <View style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: '#4F46E5' }}>
                        {coverUri ? (
                          <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        ) : null}
                      </View>
                      <View style={{ position: 'absolute', top: 8, right: 8 }}>
                        <View style={{ backgroundColor: isFree ? 'rgba(16,185,129,0.9)' : 'rgba(245,158,11,0.9)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{fee}</Text>
                        </View>
                      </View>
                      {(item as any).seriesTitle ? (
                        <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: '#A5B4FC', fontSize: 9, fontWeight: '700' }}>📚 {(item as any).partNumber ? `#${(item as any).partNumber}` : ''}</Text>
                        </View>
                      ) : null}
                      <View style={{ minHeight: tileSize * 0.62, padding: 10, justifyContent: 'space-between' }}>
                        <View>
                          <Text style={{ color: INDIGO, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 }}>{dayStr} · {timeStr}</Text>
                          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', lineHeight: 16 }} numberOfLines={2}>{item.title}</Text>
                          {item.location ? (
                            <Text style={{ color: colors.subtext, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{item.location}</Text>
                          ) : null}
                          {item.groupName ? (
                            <Text style={{ color: INDIGO, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{item.groupName}</Text>
                          ) : null}
                        </View>
                        <Text style={{ color: colors.placeholder, fontSize: 10, marginTop: 4 }}>✓ {item.rsvpCounts.GOING}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../../context/theme.context').useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderColor: INDIGO },
    tabText: { fontSize: 14, color: colors.subtext },
    activeTabText: { color: INDIGO, fontWeight: '600' },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyEmoji: { fontSize: 36, marginBottom: 8, opacity: 0.5 },
    empty: { textAlign: 'center', color: colors.placeholder },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    thumbnail: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden' },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
    cardGroup: { fontSize: 12, color: INDIGO, fontWeight: '500', marginBottom: 4 },
    seriesBadge: { backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 },
    seriesBadgeText: { color: isDark ? '#818CF8' : '#4338CA', fontSize: 11, fontWeight: '500' },
    cardMeta: { fontSize: 13, color: colors.subtext },
    rsvpRow: { fontSize: 12, color: colors.placeholder, marginTop: 4 },
    backBtn: { color: INDIGO, fontSize: 17 },
    formContainer: { padding: 20, paddingBottom: 40, backgroundColor: colors.bg },
    field: { marginBottom: 14 },
    fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15, color: colors.inputText, backgroundColor: colors.input },
    inputMulti: { height: 88, paddingTop: 9 },
    row: { flexDirection: 'row', gap: 10 },
    half: { flex: 1 },
    photoPicker: { width: '100%', height: 150, borderRadius: 12, borderWidth: 2, borderColor: colors.border,
      borderStyle: 'dashed', backgroundColor: colors.bg, overflow: 'hidden' },
    photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
    photoHint: { fontSize: 13, color: colors.placeholder },
    submitBtn: { backgroundColor: INDIGO, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
    submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  });
}
