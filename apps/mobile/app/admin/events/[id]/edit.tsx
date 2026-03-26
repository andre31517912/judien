import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../../../lib/api';
import { useTranslation } from 'react-i18next';
import type { Event } from '@judien/shared';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title_en: '', title_zh: '',
    description_en: '', description_zh: '',
    location_en: '', location_zh: '',
    startAt: '',
    endAt: '',
    timezone: 'Asia/Taipei',
    feeAmount: '',
    feeCurrency: 'TWD',
    coverImageUrl: '',
  });

  useEffect(() => {
    apiFetch<Event>(`/events/${id}`).then((ev) => {
      setForm({
        title_en: ev.title_en,
        title_zh: ev.title_zh,
        description_en: ev.description_en,
        description_zh: ev.description_zh,
        location_en: ev.location_en,
        location_zh: ev.location_zh,
        startAt: ev.startAt ? ev.startAt.replace('Z', '').slice(0, 16) : '',
        endAt: ev.endAt ? ev.endAt.replace('Z', '').slice(0, 16) : '',
        timezone: ev.timezone,
        feeAmount: ev.feeAmount != null ? String(ev.feeAmount) : '',
        feeCurrency: ev.feeCurrency,
        coverImageUrl: ev.coverImageUrl ?? '',
      });
      setLoading(false);
    });
  }, [id]);

  const set = (k: keyof typeof form) => (val: string) => setForm((f) => ({ ...f, [k]: val }));

  const handleSave = async () => {
    try {
      const toISO = (s: string) => new Date(s.trim().replace(' ', 'T')).toISOString();
      const body: Record<string, unknown> = {
        title_en: form.title_en,
        title_zh: form.title_zh,
        description_en: form.description_en,
        description_zh: form.description_zh,
        location_en: form.location_en,
        location_zh: form.location_zh,
        startAt: form.startAt ? toISO(form.startAt) : undefined,
        endAt: form.endAt ? toISO(form.endAt) : null,
        timezone: form.timezone,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        feeCurrency: form.feeCurrency,
        coverImageUrl: form.coverImageUrl || null,
      };
      await apiFetch(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      router.replace(`/events/${id}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save.');
    }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );

  const F = ({
    label, k, keyboard = 'default', multi,
  }: { label: string; k: keyof typeof form; keyboard?: any; multi?: boolean }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multi && { height: 80, textAlignVertical: 'top' }]}
        value={form[k] as string}
        onChangeText={set(k)}
        keyboardType={keyboard}
        multiline={multi}
      />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('events.editEvent')}</Text>

      <F label={t('events.titleEn')} k="title_en" />
      <F label={t('events.titleZh')} k="title_zh" />
      <F label={t('events.descriptionEn')} k="description_en" multi />
      <F label={t('events.descriptionZh')} k="description_zh" multi />
      <F label={t('events.locationEn')} k="location_en" />
      <F label={t('events.locationZh')} k="location_zh" />
      <F label="Start (YYYY-MM-DDTHH:MM)" k="startAt" />
      <F label="End (optional)" k="endAt" />
      <F label={t('events.timezone')} k="timezone" />
      <F label="Fee" k="feeAmount" keyboard="numeric" />
      <F label="Currency" k="feeCurrency" />
      <F label={t('events.coverImage')} k="coverImageUrl" />

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>{t('common.save')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#111' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 15 },
  btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
