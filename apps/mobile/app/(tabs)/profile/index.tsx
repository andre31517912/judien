import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useAuth } from '../../../context/auth.context';
import { useTheme } from '../../../context/theme.context';
import { apiFetch, apiUpload } from '../../../lib/api';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import i18n from '../../../lib/i18n';
import * as ImagePicker from 'expo-image-picker';

const INDIGO = '#4F46E5';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const zh = i18n.language === 'zh';

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (user) setPhotoUrl((user as any).photoUrl ?? null);
  }, [user]);

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('', zh ? '需要相簿權限' : 'Photo library permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (result.canceled) return;
    setPhotoUploading(true);
    try {
      const { url } = await apiUpload(result.assets[0].uri);
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ photoUrl: url }) });
      setPhotoUrl(url);
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Upload failed'); }
    finally { setPhotoUploading(false); }
  };

  const handleLogout = async () => { await logout(); };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  if (!user) return <View style={styles.center}><Text style={styles.text}>Please log in.</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
            <Ionicons name="search" size={24} color={INDIGO} />
          </TouchableOpacity>
        ),
      }} />

      {/* Profile card */}
      <View style={styles.profileCard}>
        {/* Gradient band */}
        <View style={styles.cardBand} />

        {/* Card body */}
        <View style={styles.cardBody}>
          {/* Avatar overlapping the band */}
          <TouchableOpacity onPress={handlePickPhoto} disabled={photoUploading} style={styles.photoWrapper} activeOpacity={0.85}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photoAvatar} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={40} color={colors.placeholder} />
              </View>
            )}
            <View style={styles.cameraBtn}>
              {photoUploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>

          {photoUploading && <Text style={styles.uploadingText}>{zh ? '上傳中…' : 'Uploading…'}</Text>}

          {/* Name + role badge on left, Edit button on right */}
          <View style={styles.nameRow}>
            <View style={styles.nameLeft}>
              <Text style={styles.displayName} numberOfLines={1}>
                {(user as any).displayName || <Text style={styles.noName}>{zh ? '未設定姓名' : 'No name set'}</Text>}
              </Text>
              <View style={[styles.roleBadge, user.role === 'ADMIN' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
                <Text style={[styles.roleBadgeText, user.role === 'ADMIN' ? styles.roleBadgeTextAdmin : styles.roleBadgeTextUser]}>
                  {user.role === 'ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '用戶' : 'User')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editPill}
              onPress={() => router.push('/profile/settings')}
              activeOpacity={0.85}
            >
              <Text style={styles.editPillText}>{zh ? '編輯' : 'Edit Profile'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Admin buttons */}
      {user.role === 'ADMIN' && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#7C3AED', marginBottom: 12 }]} onPress={() => router.push('/admin/invites' as any)}>
          <Text style={styles.btnText}>{zh ? '📨 邀請連結' : '📨 Invite Links'}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF4444' }]} onPress={handleLogout}>
        <Text style={styles.btnText}>{t('auth.logout')}</Text>
      </TouchableOpacity>

      <View style={styles.policyRow}>
        <TouchableOpacity onPress={() => router.push('/policy/terms')}>
          <Text style={styles.policyLink}>{zh ? '使用條款' : 'Terms of Use'}</Text>
        </TouchableOpacity>
        <Text style={styles.policySep}>·</Text>
        <TouchableOpacity onPress={() => router.push('/policy/privacy')}>
          <Text style={styles.policyLink}>{zh ? '隱私政策' : 'Privacy Policy'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../../context/theme.context').useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    container: { padding: 24, backgroundColor: colors.bg, flexGrow: 1 },
    text: { color: colors.text },

    // Profile card
    profileCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 24,
    },
    cardBand: { height: 80, backgroundColor: INDIGO },
    cardBody: { paddingHorizontal: 20, paddingBottom: 20 },

    // Avatar
    photoWrapper: { position: 'relative', width: 80, height: 80, marginTop: -40, marginBottom: 12 },
    photoAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: colors.card },
    photoPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.card },
    cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: INDIGO, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    uploadingText: { fontSize: 12, color: colors.placeholder, marginBottom: 8 },

    // Name row
    nameRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
    nameLeft: { flex: 1, gap: 6 },
    displayName: { fontSize: 18, fontWeight: '700', color: colors.text },
    noName: { fontSize: 15, fontWeight: '400', color: colors.placeholder, fontStyle: 'italic' },
    roleBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    roleBadgeAdmin: { backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF' },
    roleBadgeUser: { backgroundColor: '#DCFCE7' },
    roleBadgeText: { fontSize: 12, fontWeight: '600' },
    roleBadgeTextAdmin: { color: isDark ? '#818CF8' : '#4338CA' },
    roleBadgeTextUser: { color: '#16A34A' },

    // Edit pill
    editPill: { backgroundColor: INDIGO, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0 },
    editPillText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    // Action buttons
    btn: { backgroundColor: INDIGO, borderRadius: 10, padding: 16, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },

    // Policy
    policyRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28, gap: 8 },
    policyLink: { fontSize: 13, color: colors.subtext, textDecorationLine: 'underline' },
    policySep: { color: colors.border, fontSize: 13 },
  });
}
