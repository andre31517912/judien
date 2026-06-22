import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
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

type UserResult = { id: string; displayName: string | null; email: string | null; phoneE164?: string | null };

const FieldInput = React.memo(function FieldInput({
  label, value, onChangeText, placeholder, multiline, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={[
          { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15, color: colors.inputText, backgroundColor: colors.input },
          multiline ? { height: 88, paddingTop: 9 } : null,
        ]}
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
});

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
    feeAmount: '',
  });
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Invite
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [inviteeList, setInviteeList] = useState<UserResult[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [userSearching, setUserSearching] = useState(false);

  const set = (k: keyof typeof form) => (val: string) =>
    setForm((prev) => ({ ...prev, [k]: val }));

  const searchUsers = async (q: string) => {
    setUserQuery(q);
    if (!q.trim()) { setUserResults([]); return; }
    setUserSearching(true);
    try {
      const res = await apiFetch<UserResult[]>(`/users/search?q=${encodeURIComponent(q)}`);
      setUserResults(Array.isArray(res) ? res : []);
    } catch { setUserResults([]); }
    finally { setUserSearching(false); }
  };

  const addInvitee = (u: UserResult) => {
    if (inviteeIds.includes(u.id)) return;
    setInviteeIds((prev) => [...prev, u.id]);
    setInviteeList((prev) => [...prev, u]);
    setUserResults([]);
    setUserQuery('');
  };

  const removeInvitee = (userId: string) => {
    setInviteeIds((prev) => prev.filter((id) => id !== userId));
    setInviteeList((prev) => prev.filter((u) => u.id !== userId));
  };

  const doPickImage = async () => {
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

  const pickImage = async () => {
    if (coverUri) {
      Alert.alert(
        zh ? '封面圖片' : 'Cover Photo',
        undefined,
        [
          { text: zh ? '移除圖片' : 'Remove', style: 'destructive', onPress: () => setCoverUri(null) },
          { text: zh ? '更換圖片' : 'Replace', onPress: doPickImage },
          { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    await doPickImage();
  };

  const toISO = (s: string): string => new Date(s.trim().replace(' ', 'T')).toISOString();

  const handleCreate = async () => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }
    if (form.startAt && isNaN(new Date(form.startAt.trim().replace(' ', 'T')).getTime())) {
      Alert.alert('Invalid date', 'Start date must be valid.');
      return;
    }
    if (form.endAt && isNaN(new Date(form.endAt.trim().replace(' ', 'T')).getTime())) {
      Alert.alert('Invalid date', 'End date must be valid.');
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
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        coverImageUrl,
        ...(groupId ? { groupId } : {}),
      };
      const ev = await apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify(body) });
      if (inviteeIds.length > 0) {
        await apiFetch(`/events/${ev.id}/invite-members`, {
          method: 'POST',
          body: JSON.stringify({ userIds: inviteeIds }),
        }).catch(() => {});
      }
      router.replace(`/events/${ev.id}`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ backgroundColor: colors.headerBg, paddingTop: safeTop }}>
        <View style={styles.customHeader}>
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text ?? '#111', marginBottom: 16 }}>
        {zh ? (groupId ? '在群組建立活動' : '建立活動') : (groupId ? 'Create Event in Group' : 'Create Event')}
      </Text>

      <FieldInput label={zh ? '標題' : 'Title'} value={form.title} onChangeText={set('title')} placeholder={zh ? '活動名稱' : 'Event name'} />
      <FieldInput label={zh ? '地點' : 'Location'} value={form.location} onChangeText={set('location')} placeholder="e.g. Taipei, Da'an Park" />
      <FieldInput label={zh ? '費用（選填）' : 'Fee (optional)'} value={form.feeAmount} onChangeText={set('feeAmount')} placeholder="0" keyboardType="numeric" />
      <FieldInput label={zh ? '說明' : 'Description'} value={form.description} onChangeText={set('description')}
        placeholder={zh ? '活動說明' : "What's this event about?"} multiline />

      <View style={styles.row}>
        <View style={styles.half}>
          <DateTimeField
            label={zh ? '開始' : 'Start'}
            value={form.startAt}
            onChange={set('startAt')}
            placeholder={zh ? '選擇日期時間' : 'Select date and time'}
          />
        </View>
        <View style={styles.half}>
          <DateTimeField
            label={zh ? '結束（選填）' : 'End (optional)'}
            value={form.endAt}
            onChange={set('endAt')}
            placeholder={zh ? '選擇日期時間' : 'Select date and time'}
            clearable
          />
        </View>
      </View>


      <View style={styles.field}>
        <Text style={styles.label}>{zh ? '封面圖片（選填）' : 'Cover Photo (optional)'}</Text>
        <TouchableOpacity style={styles.photoPicker} onPress={pickImage} activeOpacity={0.7}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>🖼️</Text>
              <Text style={styles.photoHint}>{zh ? '點擊上傳封面圖' : 'Tap to upload a photo'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Invite section */}
      <View style={styles.field}>
        <Text style={styles.label}>{zh ? '邀請用戶（選填）' : 'Invite People (optional)'}</Text>
        <TextInput
          style={styles.input}
          value={userQuery}
          onChangeText={searchUsers}
          placeholder={zh ? '搜尋姓名、Email 或電話…' : 'Search name, email or phone…'}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {userSearching && <ActivityIndicator size="small" color={INDIGO} style={{ marginTop: 6, alignSelf: 'flex-start' }} />}
        {userResults.filter((u) => !inviteeIds.includes(u.id)).map((u) => (
          <View key={u.id} style={styles.userResultRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userResultName}>{u.displayName ?? '—'}</Text>
              {u.email ? <Text style={styles.userResultMeta}>{u.email}</Text> : null}
            </View>
            <TouchableOpacity style={styles.addUserBtn} onPress={() => addInvitee(u)}>
              <Text style={styles.addUserBtnText}>{zh ? '新增' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        ))}
        {inviteeList.length > 0 && (
          <View style={{ marginTop: 8, gap: 6 }}>
            <Text style={{ fontSize: 12, color: colors.subtext }}>
              {zh ? `已加入 ${inviteeList.length} 人` : `${inviteeList.length} person(s) to invite`}
            </Text>
            {inviteeList.map((u) => (
              <View key={u.id} style={styles.inviteeRow}>
                <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{u.displayName ?? u.email ?? '—'}</Text>
                <TouchableOpacity onPress={() => removeInvitee(u.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color={colors.placeholder} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.btn, submitting && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={submitting}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>{submitting ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立活動' : 'Create Event')}</Text>
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
    btn: { backgroundColor: INDIGO, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  });
}
