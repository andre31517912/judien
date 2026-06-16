import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { apiFetch, apiUpload } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { useRouter, Stack } from 'expo-router';
import JLogo from '../../components/JLogo';
import i18n from '../../lib/i18n';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const zh = i18n.language === 'zh';

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (user) setPhotoUrl((user as any).photoUrl ?? null);
  }, [user]);

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('', zh ? '需要相簿權限' : 'Photo library permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
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

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!user) return <View style={styles.center}><Text style={styles.text}>Please log in.</Text></View>;

  const rawEmail = (user as any)?.email ?? '';
  const displayEmail = rawEmail.endsWith('@line.local') ? '' : rawEmail;
  const displayPhone = (user as any)?.phoneE164 ?? '';

  return (
    <>
    <Stack.Screen options={{ headerTitle: () => <JLogo />, headerStyle: { backgroundColor: colors.headerBg } }} />
    <ScrollView contentContainerStyle={styles.container}>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickPhoto} disabled={photoUploading} style={styles.photoWrapper} activeOpacity={0.85}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photoAvatar} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>👤</Text>
            </View>
          )}
          <View style={styles.cameraBtn}>
            <Text style={styles.cameraBtnText}>{photoUploading ? '…' : '📷'}</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.roleBadge, user.role === 'ADMIN' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
          <Text style={[styles.roleBadgeText, user.role === 'ADMIN' ? styles.roleBadgeTextAdmin : styles.roleBadgeTextUser]}>
            {user.role === 'ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '用戶' : 'User')}
          </Text>
        </View>

        {photoUploading && <Text style={styles.uploadingText}>{zh ? '上傳中…' : 'Uploading…'}</Text>}
      </View>

      {/* Info cards */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>{zh ? '姓名' : 'Name'}</Text>
          <Text style={styles.infoValue}>{(user as any).displayName || <Text style={styles.infoEmpty}>{zh ? '未設定' : 'Not set'}</Text>}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>{zh ? '電子郵件' : 'Email'}</Text>
          <Text style={styles.infoValue}>{displayEmail || <Text style={styles.infoEmpty}>{zh ? '未設定' : 'Not set'}</Text>}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>{zh ? '電話' : 'Phone'}</Text>
          <Text style={styles.infoValue}>{displayPhone || <Text style={styles.infoEmpty}>{zh ? '未設定' : 'Not set'}</Text>}</Text>
        </View>
      </View>

      {/* Edit Profile */}
      <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/profile-settings' as any)} activeOpacity={0.85}>
        <Text style={styles.editBtnText}>{zh ? '編輯個人資料' : 'Edit Profile'}</Text>
      </TouchableOpacity>

      {/* Admin buttons */}
      {user.role === 'ADMIN' && (
        <>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#7C3AED', marginTop: 12 }]} onPress={() => router.push('/admin/invites' as any)}>
            <Text style={styles.btnText}>{zh ? '📨 邀請連結' : '📨 Invite Links'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#7C3AED', marginTop: 12 }]} onPress={() => router.push('/admin/lookup' as any)}>
            <Text style={styles.btnText}>{zh ? '🔍 平台查詢' : '🔍 Platform Lookup'}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF4444', marginTop: 12 }]} onPress={handleLogout}>
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
    </>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    container: { padding: 24, backgroundColor: colors.bg, flexGrow: 1 },
    text: { color: colors.text },
    avatarSection: { alignItems: 'center', gap: 12, marginBottom: 28, paddingTop: 8 },
    photoWrapper: { position: 'relative', width: 100, height: 100 },
    photoAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#E5E7EB' },
    photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
    photoPlaceholderIcon: { fontSize: 50 },
    cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    cameraBtnText: { fontSize: 15 },
    uploadingText: { fontSize: 12, color: colors.placeholder },
    roleBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    roleBadgeAdmin: { backgroundColor: '#EEF2FF' },
    roleBadgeUser: { backgroundColor: '#DCFCE7' },
    roleBadgeText: { fontSize: 12, fontWeight: '600' },
    roleBadgeTextAdmin: { color: '#4338CA' },
    roleBadgeTextUser: { color: '#16A34A' },
    infoSection: { gap: 10, marginBottom: 24 },
    infoCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14 },
    infoLabel: { fontSize: 11, color: colors.placeholder, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
    infoValue: { fontSize: 16, fontWeight: '600', color: colors.text },
    infoEmpty: { fontSize: 14, fontWeight: '400', color: colors.placeholder },
    editBtn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center' },
    editBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    policyRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28, gap: 8 },
    policyLink: { fontSize: 13, color: colors.subtext, textDecorationLine: 'underline' },
    policySep: { color: colors.border, fontSize: 13 },
  });
}
