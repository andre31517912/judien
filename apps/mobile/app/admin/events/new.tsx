import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, Alert, Image, Platform, Switch,
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
    mapAddress: '',
    startAt: '',
    endAt: '',
    feeAmount: '',
  });
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);

  // Transportation + sub-events
  const [collectTransportation, setCollectTransportation] = useState(false);
  const [organizeGuestBatches, setOrganizeGuestBatches] = useState(false);
  const [guestListViewMode, setGuestListViewMode] = useState<'FUSION' | 'SEPARATE_OUTSIDE_GUESTS'>('FUSION');
  const [subEventsEnabled, setSubEventsEnabled] = useState(false);
  const [subEventItems, setSubEventItems] = useState<{ title: string; description: string }[]>([
    { title: '', description: '' },
  ]);

  // Invite
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [inviteeList, setInviteeList] = useState<UserResult[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [userSearching, setUserSearching] = useState(false);

  const set = (k: keyof typeof form) => (val: string) =>
    setForm((prev) => ({ ...prev, [k]: val }));

  const searchLocation = async () => {
    if (!form.location.trim()) return;
    setLocationSearching(true);
    try {
      setLocationSuggestions(await searchMapAddresses(form.location));
    } finally {
      setLocationSearching(false);
    }
  };

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

  const addSubEvent = () =>
    setSubEventItems((prev) => [...prev, { title: '', description: '' }]);

  const removeSubEvent = (i: number) =>
    setSubEventItems((prev) => prev.filter((_, idx) => idx !== i));

  const setSubField = (i: number, field: 'title' | 'description', val: string) =>
    setSubEventItems((prev) => prev.map((se, idx) => idx === i ? { ...se, [field]: val } : se));

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
      const validSubEvents = subEventsEnabled
        ? subEventItems.filter((se) => se.title.trim())
        : undefined;

      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        location: form.location,
        mapAddress: form.mapAddress || null,
        startAt: form.startAt ? toISO(form.startAt) : undefined,
        endAt: form.endAt ? toISO(form.endAt) : null,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        coverImageUrl,
        collectTransportation,
        organizeGuestBatches,
        guestListViewMode: groupId ? guestListViewMode : 'FUSION',
        ...(validSubEvents?.length ? { subEvents: validSubEvents } : {}),
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
      <FieldInput
        label={zh ? '地點' : 'Location'}
        value={form.location}
        onChangeText={(value) => {
          setForm((prev) => ({ ...prev, location: value, mapAddress: '' }));
          setLocationSuggestions([]);
        }}
        placeholder="e.g. Taipei, Da'an Park"
      />
      <View style={{ marginTop: -8, marginBottom: 14, gap: 8 }}>
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

      {/* Transportation toggle */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
            {zh ? '收集交通方式' : 'Collect transportation info'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
            {zh ? '出席的賓客將被問及交通方式' : "Going guests will be asked how they're getting there"}
          </Text>
        </View>
        <Switch
          value={collectTransportation}
          onValueChange={setCollectTransportation}
          trackColor={{ false: colors.border, true: INDIGO }}
          thumbColor="#fff"
        />
      </View>

      {/* Sub-events toggle */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
            {zh ? '啟用賓客分組' : 'Enable guest grouping'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
            {zh ? '建立後可用自訂文字將賓客分組' : 'After creation, organizers can group guests with custom labels'}
          </Text>
        </View>
        <Switch
          value={organizeGuestBatches}
          onValueChange={setOrganizeGuestBatches}
          trackColor={{ false: colors.border, true: INDIGO }}
          thumbColor="#fff"
        />
      </View>

      {!!groupId && (
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {zh ? '外部賓客獨立欄位' : 'Separate outside guest column'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
              {zh ? '群組成員狀態與外部賓客分開顯示' : 'Keep member RSVP status separate from confirmed outside guests'}
            </Text>
          </View>
          <Switch
            value={guestListViewMode === 'SEPARATE_OUTSIDE_GUESTS'}
            onValueChange={(value) => setGuestListViewMode(value ? 'SEPARATE_OUTSIDE_GUESTS' : 'FUSION')}
            trackColor={{ false: colors.border, true: INDIGO }}
            thumbColor="#fff"
          />
        </View>
      )}

      {/* Sub-events toggle */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
            {zh ? '啟用子活動' : 'Enable sub-events / activities'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
            {zh ? '設定賓客出席後可選擇的活動（如：健行、跑步）' : 'Add activities guests can choose after RSVPing Going'}
          </Text>
        </View>
        <Switch
          value={subEventsEnabled}
          onValueChange={setSubEventsEnabled}
          trackColor={{ false: colors.border, true: INDIGO }}
          thumbColor="#fff"
        />
      </View>

      {subEventsEnabled && (
        <View style={styles.subEventsContainer}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: INDIGO, marginBottom: 8, letterSpacing: 0.5 }}>
            {zh ? '活動項目' : 'ACTIVITIES'}
          </Text>
          {subEventItems.map((se, i) => (
            <View key={i} style={styles.subEventItem}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={se.title}
                  onChangeText={(v) => setSubField(i, 'title', v)}
                  placeholder={zh ? `活動 ${i + 1} 名稱（如：健行）` : `Activity ${i + 1} name (e.g. Hiking)`}
                  placeholderTextColor={colors.placeholder}
                  maxLength={200}
                />
                {subEventItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeSubEvent(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={22} color={colors.placeholder} />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[styles.input, { marginTop: 6 }]}
                value={se.description}
                onChangeText={(v) => setSubField(i, 'description', v)}
                placeholder={zh ? '簡短說明（選填）' : 'Short description (optional)'}
                placeholderTextColor={colors.placeholder}
                maxLength={500}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.addSubEventBtn} onPress={addSubEvent} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color={INDIGO} />
            <Text style={{ fontSize: 14, color: INDIGO, marginLeft: 4 }}>{zh ? '新增活動' : 'Add activity'}</Text>
          </TouchableOpacity>
        </View>
      )}

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
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      padding: 12, marginBottom: 12, backgroundColor: colors.card,
    },
    subEventsContainer: {
      borderLeftWidth: 2, borderLeftColor: INDIGO + '55',
      paddingLeft: 12, marginLeft: 4, marginBottom: 12,
    },
    subEventItem: {
      backgroundColor: colors.bg, borderRadius: 8,
      borderWidth: 1, borderColor: colors.border,
      padding: 10, marginBottom: 8,
    },
    addSubEventBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: INDIGO + '80', borderStyle: 'dashed',
      borderRadius: 8, paddingVertical: 8, marginTop: 2,
    },
    secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.card },
    secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    btn: { backgroundColor: INDIGO, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  });
}
