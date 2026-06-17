import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch, apiUpload } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/theme.context';
import JLogo from '../../../components/JLogo';

function slugifyPid(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default function NewGroupScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const zh = i18n.language === 'zh';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const suggestedPid = useMemo(() => slugifyPid(name), [name]);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { top: safeTop } = useSafeAreaInsets();

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('', zh ? '需要相簿權限' : 'Photo library permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setPhotoUploading(true);
    try {
      const { url } = await apiUpload(uri);
      setPhotoUrl(url);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError('');
    setSaving(true);
    try {
      const pid = suggestedPid || `group-${Date.now().toString(36).slice(-6)}`;
      const created = await apiFetch<{ id: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          pid,
          description: description.trim(),
          discoverableBySearch: false,
          adminUserIds: [],
          ...(photoUrl ? { photoUrl } : {}),
        }),
      });
      router.replace(`/groups/${created.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create group.');
    } finally {
      setSaving(false);
    }
  };

  const CustomHeader = () => (
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
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <CustomHeader />
        <View style={styles.center}><ActivityIndicator color={colors.subtext} /></View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <CustomHeader />
        <View style={styles.centerWrap}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{zh ? '請先登入。' : 'Please log in first.'}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CustomHeader />
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      <View style={styles.section}>
        <Text style={styles.title}>{zh ? '建立群組' : 'Create Group'}</Text>
        <Text style={styles.subtitle}>
          {zh ? '建立新的 Rotary 分組並設定初始隱私規則。' : 'Create a new Rotary group and set its initial privacy rules.'}
        </Text>
      </View>

      <View style={styles.card}>
        {error ? <Text style={styles.errorInline}>{error}</Text> : null}

        {/* Photo upload */}
        <View style={styles.field}>
          <Text style={styles.label}>{zh ? '群組照片（選填）' : 'Group Photo (optional)'}</Text>
          <View style={{ alignItems: 'center', gap: 10 }}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>{name.charAt(0).toUpperCase() || '?'}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} disabled={photoUploading}>
                <Text style={styles.photoBtnText}>{photoUploading ? (zh ? '上傳中…' : 'Uploading…') : (zh ? '上傳照片' : 'Upload Photo')}</Text>
              </TouchableOpacity>
              {photoUrl && (
                <TouchableOpacity style={[styles.photoBtn, styles.photoBtnDanger]} onPress={() => setPhotoUrl(null)}>
                  <Text style={[styles.photoBtnText, { color: '#DC2626' }]}>{zh ? '移除' : 'Remove'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{zh ? '群組名稱' : 'Group name'}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder={zh ? '例如：台北扶輪社' : 'e.g. Rotary Taipei Downtown'}
            placeholderTextColor={colors.placeholder}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{zh ? '群組 PID' : 'Group PID'}</Text>
          <TextInput
            value={suggestedPid}
            editable={false}
            style={[styles.input, styles.readonlyInput]}
            placeholder={zh ? '將根據群組名稱自動產生' : 'Auto-generated from the group name'}
            placeholderTextColor={colors.placeholder}
          />
          <Text style={styles.helperText}>
            {zh ? 'PID 會根據群組名稱自動產生，預設不會被搜尋到。' : 'PID is auto-generated from the group name and is private by default.'}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{zh ? '描述' : 'Description'}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
            placeholder={zh ? '介紹這個群組的用途、地區或成員特色。' : 'Describe this group, its chapter, region, or purpose.'}
            placeholderTextColor={colors.placeholder}
          />
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyNote}>
            {zh ? '此群組建立後預設為私人，之後可於群組設定中開啟搜尋。' : 'This group starts private by default. Search discoverability can be enabled later in group settings.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, (saving || !name.trim()) && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving || !name.trim()}
        >
          <Text style={styles.createBtnText}>{saving ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立群組' : 'Create Group')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const INDIGO = '#4F46E5';

function makeStyles(colors: ReturnType<typeof import('../../../context/theme.context').useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    customHeader: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    centerWrap: { flex: 1, backgroundColor: colors.bg, padding: 20 },
    container: { padding: 20, gap: 16, backgroundColor: colors.bg, flexGrow: 1 },
    section: { gap: 6 },
    title: { fontSize: 26, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.subtext },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    field: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: colors.subtext },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      backgroundColor: colors.input,
      color: colors.inputText,
      fontSize: 15,
    },
    readonlyInput: { backgroundColor: colors.bg, color: colors.placeholder },
    textArea: { minHeight: 96 },
    helperText: { fontSize: 12, color: colors.placeholder },
    photoPreview: { width: 88, height: 88, borderRadius: 44 },
    photoPlaceholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    photoPlaceholderText: { fontSize: 32, fontWeight: '700', color: '#4F46E5' },
    photoBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card },
    photoBtnDanger: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
    photoBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
    privacyCard: { gap: 12, backgroundColor: colors.bg, borderRadius: 12, padding: 12 },
    privacyNote: { fontSize: 12, color: colors.subtext },
    createBtn: { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    createBtnDisabled: { opacity: 0.6 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    errorCard: { borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 16 },
    errorText: { color: '#B91C1C', fontSize: 14 },
    errorInline: { color: '#B91C1C', fontSize: 13 },
  });
}
