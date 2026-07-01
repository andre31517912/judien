import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch, apiUpload } from '../../../../lib/api';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme.context';
import { useAuth } from '../../../../context/auth.context';
import JLogo from '../../../../components/JLogo';
import DateTimeField from '../../../../components/DateTimeField';
import type { Event, ReminderRule } from '@judien/shared';

const INDIGO = '#4F46E5';
type LocationSuggestion = { label: string };

async function searchMapAddresses(query: string): Promise<LocationSuggestion[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, {
      headers: { 'User-Agent': 'JudienApp/1.0' },
    });
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((item) => ({ label: item.display_name })).filter((item) => item.label)
      : [];
  } catch {
    return [];
  }
}

function toLocalNaive(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const REMINDER_PRESETS = [
  { label: '1 week before', labelZh: '1 週前', minutes: 10080 },
  { label: '1 day before', labelZh: '1 天前', minutes: 1440 },
  { label: '2 hours before', labelZh: '2 小時前', minutes: 120 },
  { label: '1 hour before', labelZh: '1 小時前', minutes: 60 },
  { label: '15 min before', labelZh: '15 分鐘前', minutes: 15 },
];

function minutesToLabel(m: number) {
  if (m >= 10080 && m % 10080 === 0) return `${m / 10080} week${m / 10080 > 1 ? 's' : ''} before`;
  if (m >= 1440) return `${m / 1440} day${m / 1440 > 1 ? 's' : ''} before`;
  if (m >= 60) return `${m / 60} hour${m / 60 > 1 ? 's' : ''} before`;
  return `${m} min before`;
}

const FInput = React.memo(function FInput({
  label, value, onChangeText, keyboard, multi,
}: { label: string; value: string; onChangeText: (v: string) => void; keyboard?: any; multi?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.subtext, marginBottom: 5 }}>{label}</Text>
      <TextInput
        style={[
          { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.inputText, backgroundColor: colors.input },
          multi ? { height: 90, textAlignVertical: 'top' as const } : null,
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard ?? 'default'}
        multiline={multi}
        placeholderTextColor={colors.placeholder}
      />
    </View>
  );
});

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const zh = i18n.language === 'zh';

  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { top: safeTop } = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    mapAddress: '',
    startAt: '',
    endAt: '',
    feeAmount: '',
    coverImageUrl: '',
  });

  const [eventCreatorId, setEventCreatorId] = useState<string | null>(null);
  const [collectTransportation, setCollectTransportation] = useState(false);
  const [organizeGuestBatches, setOrganizeGuestBatches] = useState(false);
  const [guestListViewMode, setGuestListViewMode] = useState<'FUSION' | 'SEPARATE_OUTSIDE_GUESTS'>('FUSION');
  const [coverUploading, setCoverUploading] = useState(false);
  const [reminders, setReminders] = useState<{ offsetMinutes: number; channels: string[]; enabled: boolean }[]>([]);
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('hours');
  const [savingReminders, setSavingReminders] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);


  useEffect(() => {
    Promise.all([
      apiFetch<Event>(`/events/${id}`),
      apiFetch<ReminderRule[]>(`/events/${id}/reminders`).catch(() => [] as ReminderRule[]),
    ]).then(([ev, rules]) => {
      setForm({
        title: ev.title,
        description: ev.description,
        location: ev.location,
        mapAddress: ev.mapAddress ?? '',
        startAt: toLocalNaive(ev.startAt),
        endAt: toLocalNaive(ev.endAt),
        feeAmount: ev.feeAmount != null ? String(ev.feeAmount) : '',
        coverImageUrl: ev.coverImageUrl ?? '',
      });
      setReminders((rules ?? []).map((r) => ({ offsetMinutes: r.offsetMinutes, channels: r.channels, enabled: r.enabled })));
      setEventCreatorId(ev.createdById);
      setCollectTransportation(!!ev.collectTransportation);
      setOrganizeGuestBatches(!!ev.organizeGuestBatches);
      setGuestListViewMode(ev.guestListViewMode ?? 'FUSION');
      if (ev.groupId) {
        const gid = ev.groupId;
        apiFetch<Array<{ group: { id: string }; membership: { role: string; status: string } }>>('/groups/me')
          .then((groups) => {
            const match = groups.find((g) => g.group.id === gid);
            setIsGroupAdmin(match?.membership.status === 'ACCEPTED' && match?.membership.role === 'GROUP_ADMIN');
            setAccessChecked(true);
          })
          .catch(() => setAccessChecked(true));
      } else {
        setAccessChecked(true);
      }
      setLoading(false);
    });
  }, [id]);

  const set = (k: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [k]: val }));

  const searchLocation = async () => {
    if (!form.location.trim()) return;
    setLocationSearching(true);
    try {
      setLocationSuggestions(await searchMapAddresses(form.location));
    } finally {
      setLocationSearching(false);
    }
  };

  const doPickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('', zh ? '需要相簿權限' : 'Photo library permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setCoverUploading(true);
    try {
      const { url } = await apiUpload(uri);
      setForm((f) => ({ ...f, coverImageUrl: url }));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Upload failed');
    } finally {
      setCoverUploading(false);
    }
  };

  const pickCover = async () => {
    if (form.coverImageUrl) {
      Alert.alert(
        zh ? '封面圖片' : 'Cover Photo',
        undefined,
        [
          { text: zh ? '移除圖片' : 'Remove', style: 'destructive', onPress: () => setForm((f) => ({ ...f, coverImageUrl: '' })) },
          { text: zh ? '更換圖片' : 'Replace', onPress: doPickCover },
          { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    await doPickCover();
  };

  const addReminder = (minutes: number) => {
    if (reminders.some((r) => r.offsetMinutes === minutes)) return;
    setReminders((r) => [...r, { offsetMinutes: minutes, channels: ['EMAIL'], enabled: true }]);
  };

  const removeReminder = (i: number) => setReminders((r) => r.filter((_, j) => j !== i));

  const handleSave = async () => {
    try {
      const toISO = (s: string) => new Date(s.trim().replace(' ', 'T')).toISOString();
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        location: form.location,
        mapAddress: form.mapAddress || null,
        startAt: form.startAt ? toISO(form.startAt) : undefined,
        endAt: form.endAt ? toISO(form.endAt) : null,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        coverImageUrl: form.coverImageUrl || null,
        collectTransportation,
        organizeGuestBatches,
        guestListViewMode,
      };
      await apiFetch(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      router.replace(`/(tabs)/events/${id}` as any);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save.');
    }
  };

  const handleSaveReminders = async () => {
    setSavingReminders(true);
    try {
      await apiFetch(`/events/${id}/reminders`, {
        method: 'POST',
        body: JSON.stringify({ rules: reminders.map((r) => ({ offsetMinutes: r.offsetMinutes, channels: r.channels, enabled: r.enabled })) }),
      });
      Alert.alert('✓', zh ? '提醒已儲存' : 'Reminders saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed.');
    } finally {
      setSavingReminders(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ backgroundColor: colors.headerBg, paddingTop: safeTop }}>
        <View style={[styles.customHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ minWidth: 60, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color={INDIGO} />
            <Text style={{ color: INDIGO, fontSize: 17 }}>{zh ? '返回' : 'Back'}</Text>
          </TouchableOpacity>
          <JLogo />
          <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ minWidth: 60, alignItems: 'flex-end', paddingRight: 8 }}>
            <Ionicons name="search" size={24} color={INDIGO} />
          </TouchableOpacity>
        </View>
      </View>
      {loading || (!accessChecked && user?.role !== 'ADMIN') ? (
        <View style={styles.center}>
          <ActivityIndicator color={INDIGO} />
        </View>
      ) : user?.role !== 'ADMIN' && !isGroupAdmin && eventCreatorId !== user?.id ? (
        <View style={[styles.center, { padding: 24 }]}>
          <Text style={{ color: '#EF4444', fontSize: 15, textAlign: 'center', fontWeight: '600' }}>
            {zh ? '需要管理員權限。' : 'Admin access required.'}
          </Text>
        </View>
      ) : (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageTitle}>{t('events.editEvent')}</Text>

      <FInput label={zh ? '標題' : 'Title'} value={form.title} onChangeText={set('title')} />
      <FInput
        label={zh ? '地點' : 'Location'}
        value={form.location}
        onChangeText={(value) => {
          setForm((prev) => ({ ...prev, location: value, mapAddress: '' }));
          setLocationSuggestions([]);
        }}
      />
      <View style={{ marginTop: -10, marginBottom: 16, gap: 8 }}>
        <TouchableOpacity onPress={searchLocation} disabled={locationSearching || !form.location.trim()} style={[styles.secondaryBtn, { opacity: locationSearching || !form.location.trim() ? 0.5 : 1 }]}>
          <Text style={styles.secondaryBtnText}>{locationSearching ? (zh ? '搜尋中...' : 'Searching...') : (zh ? '尋找地圖地址' : 'Find map address')}</Text>
        </TouchableOpacity>
        {!!form.mapAddress && <Text style={{ fontSize: 12, color: '#059669' }}>{zh ? '已確認地圖地址：' : 'Map address confirmed: '}{form.mapAddress}</Text>}
        {locationSuggestions.map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => {
              setForm((prev) => ({ ...prev, location: item.label, mapAddress: item.label }));
              setLocationSuggestions([]);
            }}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, backgroundColor: colors.card }}
          >
            <Text style={{ color: colors.text, fontSize: 13 }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FInput label={zh ? '費用（選填）' : 'Fee (optional)'} value={form.feeAmount} onChangeText={set('feeAmount')} keyboard="numeric" />
      <FInput label={zh ? '說明' : 'Description'} value={form.description} onChangeText={set('description')} multi />

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label={zh ? '開始時間' : 'Start Time'}
            value={form.startAt}
            onChange={set('startAt')}
            placeholder={zh ? '選擇日期時間' : 'Select date & time'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label={zh ? '結束時間（選填）' : 'End Time (optional)'}
            value={form.endAt}
            onChange={set('endAt')}
            placeholder={zh ? '選擇日期時間' : 'Select date & time'}
            clearable
          />
        </View>
      </View>


      <View style={styles.field}>
        <Text style={styles.label}>{zh ? '封面圖' : 'Cover Image'}</Text>
        <TouchableOpacity
          style={styles.coverPicker}
          onPress={pickCover}
          disabled={coverUploading}
        >
          {form.coverImageUrl && !coverUploading ? (
            <Image source={{ uri: form.coverImageUrl }} style={styles.coverPreview} resizeMode="cover" />
          ) : (
            <Text style={{ color: INDIGO, fontWeight: '600', fontSize: 14 }}>
              {coverUploading ? (zh ? '上傳中…' : 'Uploading…') : (zh ? '點擊上傳或更換封面圖' : 'Tap to upload cover photo')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Transportation toggle */}
      <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.card }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{zh ? '收集交通方式' : 'Collect transportation info'}</Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>{zh ? '出席賓客將被問及交通方式' : "Going guests will be asked how they're getting there"}</Text>
        </View>
        <Switch
          value={collectTransportation}
          onValueChange={setCollectTransportation}
          trackColor={{ false: colors.border, true: INDIGO }}
          thumbColor="#fff"
        />
      </View>

      <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.card }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{zh ? '啟用賓客分組' : 'Enable guest grouping'}</Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>{zh ? '可在活動頁使用自訂文字將賓客分組' : 'Assign guests to custom typed groups from the event page'}</Text>
        </View>
        <Switch
          value={organizeGuestBatches}
          onValueChange={setOrganizeGuestBatches}
          trackColor={{ false: colors.border, true: INDIGO }}
          thumbColor="#fff"
        />
      </View>

      <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.card }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{zh ? '賓客獨立欄位' : 'Separate guest column'}</Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>{zh ? '外部賓客顯示在獨立的賓客分頁，不混入 RSVP 分頁' : 'Keep outside guests in their own Guests tab instead of mixing them into RSVP tabs'}</Text>
        </View>
        <Switch
          value={guestListViewMode === 'SEPARATE_OUTSIDE_GUESTS'}
          onValueChange={(value) => setGuestListViewMode(value ? 'SEPARATE_OUTSIDE_GUESTS' : 'FUSION')}
          trackColor={{ false: colors.border, true: INDIGO }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>{t('common.save')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() =>
          Alert.alert(
            t('events.deleteEvent'),
            t('events.deleteConfirm'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.delete'),
                style: 'destructive',
                onPress: async () => {
                  await apiFetch(`/events/${id}`, { method: 'DELETE' });
                  router.replace('/(tabs)/events');
                },
              },
            ],
          )
        }
      >
        <Text style={styles.deleteBtnText}>{t('events.deleteEvent')}</Text>
      </TouchableOpacity>

      {/* ── Reminders ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{zh ? '自動提醒' : 'Automatic Reminders'}</Text>
        <Text style={styles.muted}>{zh ? '活動前自動發送提醒給已回覆的用戶。' : 'Sent automatically to RSVPed users before the event.'}</Text>

        <View style={styles.presetRow}>
          {REMINDER_PRESETS.map((p) => {
            const active = reminders.some((r) => r.offsetMinutes === p.minutes);
            return (
              <TouchableOpacity
                key={p.minutes}
                style={[styles.presetBtn, active && styles.presetBtnActive]}
                onPress={() => active ? removeReminder(reminders.findIndex((r) => r.offsetMinutes === p.minutes)) : addReminder(p.minutes)}
              >
                <Text style={[styles.presetBtnText, active && styles.presetBtnTextActive]}>
                  {active ? '✓ ' : '+ '}{zh ? p.labelZh : p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customValue}
            onChangeText={setCustomValue}
            keyboardType="number-pad"
            placeholder={zh ? '數量' : 'Amount'}
            placeholderTextColor={colors.placeholder}
          />
          <View style={styles.unitToggle}>
            {(['hours', 'days'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, customUnit === u && styles.unitBtnActive]}
                onPress={() => setCustomUnit(u)}
              >
                <Text style={[styles.unitBtnText, customUnit === u && styles.unitBtnTextActive]}>
                  {u === 'hours' ? (zh ? '小時' : 'Hrs') : (zh ? '天' : 'Days')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.muted}>{zh ? '前' : 'before'}</Text>
          <TouchableOpacity
            style={[styles.addBtn, (!customValue || parseInt(customValue, 10) < 1) && { opacity: 0.4 }]}
            disabled={!customValue || parseInt(customValue, 10) < 1}
            onPress={() => {
              const v = parseInt(customValue, 10);
              if (!v || v < 1) return;
              addReminder(customUnit === 'days' ? v * 1440 : v * 60);
              setCustomValue('');
            }}
          >
            <Text style={styles.addBtnText}>+ {zh ? '新增' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {reminders.length === 0 ? (
          <Text style={styles.muted}>{zh ? '尚無提醒。點選上方選項新增。' : 'No reminders set. Tap a preset to add one.'}</Text>
        ) : reminders.map((r, i) => (
          <View key={i} style={styles.reminderRow}>
            <Text style={styles.reminderLabel}>{minutesToLabel(r.offsetMinutes)}</Text>
            <TouchableOpacity onPress={() => removeReminder(i)}>
              <Text style={styles.removeBtnText}>{zh ? '移除' : 'Remove'}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {reminders.length > 0 && (
          <TouchableOpacity
            style={[styles.saveBtn, { marginTop: 8, opacity: savingReminders ? 0.6 : 1 }]}
            onPress={handleSaveReminders}
            disabled={savingReminders}
          >
            <Text style={styles.saveBtnText}>{savingReminders ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存提醒' : 'Save Reminders')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  customHeader: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: colors.subtext, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.inputText,
    backgroundColor: colors.input,
  },
  coverPicker: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.input,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPreview: { width: '100%', height: '100%' },
  userResultRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  userResultName: { fontSize: 14, fontWeight: '600', color: colors.text },
  userResultMeta: { fontSize: 12, color: colors.subtext },
  addUserBtn: { backgroundColor: INDIGO, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  addUserBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  inviteeRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  saveBtn: { backgroundColor: INDIGO, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 10 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.card },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  deleteBtn: { borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 20 },
  deleteBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 16 },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 20, marginTop: 4, gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 12, color: colors.placeholder },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.card },
  presetBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  presetBtnText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  presetBtnTextActive: { color: '#fff' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  customInput: {
    width: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.inputText,
    backgroundColor: colors.input,
  },
  unitToggle: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card },
  unitBtnActive: { backgroundColor: INDIGO },
  unitBtnText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  unitBtnTextActive: { color: '#fff' },
  addBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  removeBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
});
