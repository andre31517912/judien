import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch, apiUpload } from '../../../lib/api';
import { useTheme } from '../../../context/theme.context';
import { useTranslation } from 'react-i18next';
import JLogo from '../../../components/JLogo';
import type { Event } from '@judien/shared';
import DateTimeField from '../../../components/DateTimeField';

const INDIGO = '#4F46E5';

export default function NewEventScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { top: safeTop } = useSafeAreaInsets();
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
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  /** Normalise "YYYY-MM-DD HH:MM" (space) to ISO "YYYY-MM-DDTHH:MM" before parsing.
   *  Hermes does not guarantee parsing of non-ISO date strings. */
  const toISO = (s: string): string => new Date(s.trim().replace(' ', 'T')).toISOString();

  const handleCreate = async () => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }
    if (form.startAt && isNaN(new Date(form.startAt.trim().replace(' ', 'T')).getTime())) {
      Alert.alert('Invalid date', 'Start date must be in YYYY-MM-DD HH:MM format.');
      return;
    }
    if (form.endAt && isNaN(new Date(form.endAt.trim().replace(' ', 'T')).getTime())) {
      Alert.alert('Invalid date', 'End date must be in YYYY-MM-DD HH:MM format.');
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
        title: form.title,
        description: form.description,
        location: form.location,
        startAt: form.startAt ? toISO(form.startAt) : undefined,
        endAt: form.endAt ? toISO(form.endAt) : null,
        timezone: form.timezone,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        feeCurrency: form.feeCurrency || 'TWD',
        coverImageUrl,
        ...(groupId ? { groupId } : {}),
      };
      const ev = await apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify(body) });
      router.replace(`/events/${ev.id}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

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
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ backgroundColor: colors.headerBg, paddingTop: safeTop }}>
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => router.back()} style={{ minWidth: 60, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color={INDIGO} />
            <Text style={{ color: INDIGO, fontSize: 17 }}>{zh ? '返回' : 'Back'}</Text>
          </TouchableOpacity>
          <JLogo />
          <View style={{ minWidth: 60 }} />
        </View>
      </View>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text ?? '#111', marginBottom: 16 }}>
        {zh ? (groupId ? '在群組建立活動' : '建立活動') : (groupId ? 'Create Event in Group' : 'Create Event')}
      </Text>
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
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    customHeader: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    container: { padding: 20, backgroundColor: colors.bg, flexGrow: 1 },
    field: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15, color: colors.inputText, backgroundColor: colors.input },
    inputMulti: { height: 88, paddingTop: 9 },
    row: { flexDirection: 'row', gap: 10 },
    half: { flex: 1 },
    photoPicker: {
      width: '100%', height: 160, borderRadius: 12,
      borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
      backgroundColor: colors.bg, overflow: 'hidden',
    },
    photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
    photoIcon: { fontSize: 36 },
    photoHint: { fontSize: 13, color: colors.placeholder },
    removePhoto: { marginTop: 6 },
    removePhotoText: { fontSize: 13, color: '#EF4444' },
    btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  });
}
