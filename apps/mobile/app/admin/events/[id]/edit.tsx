import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../../../lib/api';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme.context';
import type { Event, ReminderRule } from '@judien/shared';

const INDIGO = '#4F46E5';

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

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const zh = i18n.language === 'zh';

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    timezone: 'Asia/Taipei',
    feeAmount: '',
    feeCurrency: 'TWD',
    coverImageUrl: '',
  });

  const [reminders, setReminders] = useState<{ offsetMinutes: number; channels: string[]; enabled: boolean }[]>([]);
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('hours');
  const [savingReminders, setSavingReminders] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Event>(`/events/${id}`),
      apiFetch<ReminderRule[]>(`/events/${id}/reminders`).catch(() => [] as ReminderRule[]),
    ]).then(([ev, rules]) => {
      setForm({
        title: (zh ? ev.title_zh : ev.title_en) || ev.title_en || ev.title_zh,
        description: (zh ? ev.description_zh : ev.description_en) || ev.description_en || ev.description_zh,
        location: (zh ? ev.location_zh : ev.location_en) || ev.location_en || ev.location_zh,
        startAt: ev.startAt ? ev.startAt.replace('Z', '').slice(0, 16) : '',
        endAt: ev.endAt ? ev.endAt.replace('Z', '').slice(0, 16) : '',
        timezone: ev.timezone,
        feeAmount: ev.feeAmount != null ? String(ev.feeAmount) : '',
        feeCurrency: ev.feeCurrency,
        coverImageUrl: ev.coverImageUrl ?? '',
      });
      setReminders((rules ?? []).map((r) => ({ offsetMinutes: r.offsetMinutes, channels: r.channels, enabled: r.enabled })));
      setLoading(false);
    });
  }, [id]);

  const set = (k: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [k]: val }));

  const addReminder = (minutes: number) => {
    if (reminders.some((r) => r.offsetMinutes === minutes)) return;
    setReminders((r) => [...r, { offsetMinutes: minutes, channels: ['EMAIL'], enabled: true }]);
  };

  const removeReminder = (i: number) => setReminders((r) => r.filter((_, j) => j !== i));

  const handleSave = async () => {
    try {
      const toISO = (s: string) => new Date(s.trim().replace(' ', 'T')).toISOString();
      const body: Record<string, unknown> = {
        title_en: form.title,
        title_zh: form.title,
        description_en: form.description,
        description_zh: form.description,
        location_en: form.location,
        location_zh: form.location,
        startAt: form.startAt ? toISO(form.startAt) : undefined,
        endAt: form.endAt ? toISO(form.endAt) : null,
        timezone: form.timezone,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        feeCurrency: form.feeCurrency,
        coverImageUrl: form.coverImageUrl || null,
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

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={INDIGO} />
    </View>
  );

  const F = ({
    label, k, keyboard = 'default', multi,
  }: { label: string; k: keyof typeof form; keyboard?: any; multi?: boolean }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multi && { height: 90, textAlignVertical: 'top' }]}
        value={form[k] as string}
        onChangeText={set(k)}
        keyboardType={keyboard}
        multiline={multi}
        placeholderTextColor={colors.placeholder}
      />
    </View>
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>{t('events.editEvent')}</Text>

      <F label={zh ? '標題' : 'Title'} k="title" />
      <F label={zh ? '說明' : 'Description'} k="description" multi />
      <F label={zh ? '地點' : 'Location'} k="location" />
      <F label={zh ? '開始時間 (YYYY-MM-DDTHH:MM)' : 'Start (YYYY-MM-DDTHH:MM)'} k="startAt" />
      <F label={zh ? '結束時間（選填）' : 'End (optional)'} k="endAt" />
      <F label={zh ? '時區' : 'Timezone'} k="timezone" />
      <F label={zh ? '費用' : 'Fee'} k="feeAmount" keyboard="numeric" />
      <F label={zh ? '幣別' : 'Currency'} k="feeCurrency" />
      <F label={zh ? '封面圖 URL' : 'Cover Image URL'} k="coverImageUrl" />

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
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
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
  saveBtn: { backgroundColor: INDIGO, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 10 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
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
