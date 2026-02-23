import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../../../lib/api';
import { useTranslation } from 'react-i18next';
import type { Event } from '@judien/shared';

export default function NewEventScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title_en: '', title_zh: '',
    description_en: '', description_zh: '',
    location_en: '', location_zh: '',
    startAt: '',
    timezone: 'Asia/Taipei',
    feeAmount: '',
    feeCurrency: 'TWD',
    coverImageUrl: '',
  });

  const set = (k: keyof typeof form) => (val: string) => setForm({ ...form, [k]: val });

  const handleCreate = async () => {
    try {
      const body: Record<string, unknown> = {
        ...form,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        coverImageUrl: form.coverImageUrl || null,
      };
      const ev = await apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify(body) });
      router.replace(`/events/${ev.id}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create event.');
    }
  };

  const F = ({ label, k, keyboard = 'default', multi }: { label: string; k: keyof typeof form; keyboard?: any; multi?: boolean }) => (
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
      <Text style={styles.title}>{t('events.createEvent')}</Text>
      <F label={t('events.titleEn')} k="title_en" />
      <F label={t('events.titleZh')} k="title_zh" />
      <F label={t('events.descriptionEn')} k="description_en" multi />
      <F label={t('events.descriptionZh')} k="description_zh" multi />
      <F label={t('events.locationEn')} k="location_en" />
      <F label={t('events.locationZh')} k="location_zh" />
      <F label="Start (ISO8601)" k="startAt" />
      <F label={t('events.timezone')} k="timezone" />
      <F label="Fee" k="feeAmount" keyboard="numeric" />
      <F label="Currency" k="feeCurrency" />
      <F label={t('events.coverImage')} k="coverImageUrl" />
      <TouchableOpacity style={styles.btn} onPress={handleCreate}>
        <Text style={styles.btnText}>{t('events.createEvent')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#111' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 15 },
  btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
