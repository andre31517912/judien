import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, ScrollView, Alert, Image, Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, apiUpload } from '../../../lib/api';
import type { Event } from '@judien/shared';
import DateTimeField from '../../../components/DateTimeField';

export default function NewEventScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    timezone: 'Asia/Taipei',
    feeAmount: '',
    feeCurrency: 'TWD',
  });
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (val: string) =>
    setForm((prev) => ({ ...prev, [k]: val }));

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
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }
    setSubmitting(true);
    try {
      let coverImageUrl: string | null = null;
      if (coverUri) {
        const uploaded = await apiUpload(coverUri);
        coverImageUrl = uploaded.url;
      }
      const body: Record<string, unknown> = {
        title_en: form.title, title_zh: form.title,
        description_en: form.description, description_zh: form.description,
        location_en: form.location, location_zh: form.location,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        timezone: form.timezone,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        feeCurrency: form.feeCurrency || 'TWD',
        coverImageUrl,
      };
      const ev = await apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify(body) });
      router.replace(`/events/${ev.id}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({
    label, value, onChangeText, placeholder, multiline, keyboardType,
  }: {
    label: string; value: string; onChangeText: (v: string) => void;
    placeholder?: string; multiline?: boolean; keyboardType?: any;
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{
        title: 'Create Event',
        headerBackVisible: false,
        headerLeft: () => (
          <TouchableWithoutFeedback onPress={() => router.back()}>
            <View style={{ marginLeft: 16 }}>
              <Text style={{ color: '#4F46E5', fontSize: 17 }}>‹ Back</Text>
            </View>
          </TouchableWithoutFeedback>
        ),
      }} />

      <Field label="Title" value={form.title} onChangeText={set('title')} placeholder="Event name" />
      <Field label="Location" value={form.location} onChangeText={set('location')} placeholder="e.g. Taipei, Da'an Park" />
      <Field label="Description" value={form.description} onChangeText={set('description')}
        placeholder="What's this event about?" multiline />

      <View style={styles.row}>
        <View style={styles.half}>
          <DateTimeField
            label="Start"
            value={form.startAt}
            onChange={set('startAt')}
            placeholder="Select date and time"
          />
        </View>
        <View style={styles.half}>
          <DateTimeField
            label="End (optional)"
            value={form.endAt}
            onChange={set('endAt')}
            placeholder="Select date and time"
            clearable
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.half, { flex: 1.5 }]}>
          <Field label="Timezone" value={form.timezone} onChangeText={set('timezone')} />
        </View>
        <View style={styles.half}>
          <Field label="Fee" value={form.feeAmount} onChangeText={set('feeAmount')}
            placeholder="0" keyboardType="numeric" />
        </View>
        <View style={styles.half}>
          <Field label="Currency" value={form.feeCurrency} onChangeText={set('feeCurrency')} />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Cover Photo (optional)</Text>
        <TouchableOpacity style={styles.photoPicker} onPress={pickImage} activeOpacity={0.7}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>🖼️</Text>
              <Text style={styles.photoHint}>Tap to upload a photo</Text>
            </View>
          )}
        </TouchableOpacity>
        {coverUri && (
          <TouchableOpacity onPress={() => setCoverUri(null)} style={styles.removePhoto}>
            <Text style={styles.removePhotoText}>Remove photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.btn, submitting && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={submitting}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>{submitting ? 'Creating…' : 'Create Event'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15, color: '#111827' },
  inputMulti: { height: 88, paddingTop: 9 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  photoPicker: {
    width: '100%', height: 160, borderRadius: 12,
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
    backgroundColor: '#F9FAFB', overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoIcon: { fontSize: 36 },
  photoHint: { fontSize: 13, color: '#9CA3AF' },
  removePhoto: { marginTop: 6 },
  removePhotoText: { fontSize: 13, color: '#EF4444' },
  btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
