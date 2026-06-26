import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Share, Clipboard } from 'react-native';
import { useAuth } from '../../../context/auth.context';
import { useTheme } from '../../../context/theme.context';
import { apiFetch } from '../../../lib/api';
import { useTranslation } from 'react-i18next';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import JLogo from '../../../components/JLogo';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../../lib/i18n';

const INDIGO = '#4F46E5';

export default function ProfileSettingsScreen() {
  const { user, refresh, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, theme, setTheme, isDark } = useTheme();
  const zh = i18n.language === 'zh';

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [muteEmail, setMuteEmail] = useState(false);
  const [muteInApp, setMuteInApp] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [pendingTheme, setPendingTheme] = useState<'light' | 'dark'>(theme);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  type Invite = { id: string; token: string; role: string; expiresAt: string; usedAt: string | null; createdAt: string };
  const [allInvites, setAllInvites] = useState<Invite[]>([]);
  const [adminInviteGenerating, setAdminInviteGenerating] = useState(false);
  const [userInviteGenerating, setUserInviteGenerating] = useState(false);

  const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? '';

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({
      headerShown: true,
      headerTitle: () => <JLogo />,
      headerStyle: { backgroundColor: colors.headerBg },
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color={INDIGO} />
          <Text style={{ color: INDIGO, fontSize: 17 }}>{zh ? '返回' : 'Back'}</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="search" size={24} color={INDIGO} />
        </TouchableOpacity>
      ),
    });
    return () => {
      navigation.getParent()?.setOptions({ headerLeft: undefined, headerRight: undefined });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zh, colors.headerBg]));

  const isLineOnlyEmail = (e: string) => e.endsWith('@line.local');

  useEffect(() => {
    if (user) {
      setDisplayName((user as any).displayName ?? '');
      const rawEmail = (user as any)?.email ?? '';
      setEmail(isLineOnlyEmail(rawEmail) ? '' : rawEmail);
      setPhone((user as any)?.phoneE164 ?? '');
      setMuteEmail((user as any).muteEmail ?? false);
      setMuteInApp((user as any).muteInAppNotifications ?? false);
      const savedLang = user.preferredLanguage as 'en' | 'zh';
      setLang(savedLang);
      i18n.changeLanguage(savedLang);
      if (user.role === 'ADMIN') {
        apiFetch<Invite[]>('/invites').then(setAllInvites).catch(() => {});
      }
    }
  }, [user]);

  const generateInvite = async (role: 'ADMIN' | 'USER') => {
    const setGenerating = role === 'ADMIN' ? setAdminInviteGenerating : setUserInviteGenerating;
    setGenerating(true);
    try {
      const inv = await apiFetch<{ token: string }>('/invites', {
        method: 'POST',
        body: JSON.stringify({ role, expiresInHours: 168 }),
      });
      const link = `${WEB_BASE}/${lang}/signup?invite=${inv.token}`;
      setAllInvites((prev) => [
        ...prev,
        { id: '', token: inv.token, role, expiresAt: new Date(Date.now() + 168 * 3600 * 1000).toISOString(), usedAt: null, createdAt: new Date().toISOString() },
      ]);
      await Share.share({ message: link, url: link });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to generate invite.');
    } finally {
      setGenerating(false);
    }
  };

  const revokeInvite = async (id: string) => {
    if (!id) return;
    try {
      await apiFetch(`/invites/${id}`, { method: 'DELETE' });
      setAllInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to revoke invite.');
    }
  };

  const handleSave = async () => {
    const storedEmail = (user as any)?.email ?? '';
    const storedPhone = (user as any)?.phoneE164 ?? '';
    const isLineEmail = isLineOnlyEmail(storedEmail);
    const displayedEmail = isLineEmail ? '' : storedEmail;

    const body: Record<string, unknown> = { preferredLanguage: lang, muteEmail, muteInAppNotifications: muteInApp };
    if (displayName.trim() && displayName.trim() !== ((user as any)?.displayName ?? '')) body.displayName = displayName.trim();
    if (phone.trim() !== storedPhone) body.phone = phone.trim() || null;
    if (email.trim() !== displayedEmail) {
      if (email.trim() && !isLineOnlyEmail(email.trim())) body.email = email.trim();
      else if (!email.trim() && !isLineEmail) body.email = null;
    }
    if (password.trim()) body.password = password.trim();

    const resultingEmail = 'email' in body ? (body.email as string | null) : (isLineEmail ? null : storedEmail || null);
    const resultingPhone = 'phone' in body ? (body.phone as string | null) : (storedPhone || null);
    if (!resultingEmail && !resultingPhone) {
      Alert.alert('', zh ? '必須至少保留一個電子郵件或手機號碼。' : 'You must keep at least one email or phone number.');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(body) });
      i18n.changeLanguage(lang);
      setTheme(pendingTheme);
      await refresh();
      setPassword('');
      Alert.alert('✓', zh ? '資料已更新。' : 'Profile updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  if (!user) return <View style={styles.center}><Text style={styles.text}>Please log in.</Text></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.pageTitle}>{zh ? '編輯個人資料' : 'Edit Profile'}</Text>

      <Text style={styles.label}>{zh ? '全名' : 'Full Name'}</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={(user as any).displayName || (zh ? '輸入全名' : 'Enter full name')}
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.label}>{t('profile.language')}</Text>
      <View style={styles.rowGroup}>
        {(['en', 'zh'] as const).map((l) => (
          <TouchableOpacity key={l} onPress={() => setLang(l)} style={[styles.optBtn, lang === l && styles.optBtnActive]}>
            <Text style={[styles.optBtnText, lang === l && styles.optBtnTextActive]}>{l === 'en' ? 'English' : '中文'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{zh ? '主題' : 'Theme'}</Text>
      <View style={styles.rowGroup}>
        {(['light', 'dark'] as const).map((th) => (
          <TouchableOpacity key={th} onPress={() => setPendingTheme(th)} style={[styles.optBtn, pendingTheme === th && styles.optBtnActive]}>
            <Text style={[styles.optBtnText, pendingTheme === th && styles.optBtnTextActive]}>
              {th === 'light' ? (zh ? '☀️ 淺色' : '☀️ Light') : (zh ? '🌙 深色' : '🌙 Dark')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.notifCard}>
        <Text style={[styles.label, { marginTop: 0, marginBottom: 10 }]}>{zh ? '通知設定' : 'Notification settings'}</Text>
        <View style={styles.muteRow}>
          <Text style={styles.muteLabel}>{zh ? '靜音所有站內通知' : 'Mute in-app notifications'}</Text>
          <Switch value={muteInApp} onValueChange={setMuteInApp} trackColor={{ true: INDIGO }} />
        </View>
        <View style={[styles.muteRow, { marginTop: 10, opacity: 0.4 }]} pointerEvents="none">
          <Text style={styles.muteLabel}>{zh ? '靜音電子郵件通知（即將推出）' : 'Mute email notifications (coming soon)'}</Text>
          <Switch value={false} disabled trackColor={{ true: INDIGO }} />
        </View>
      </View>

      <Text style={styles.label}>{t('auth.phone')}</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone}
        placeholder={(user as any)?.phoneE164 || '+886912345678'} keyboardType="phone-pad"
        placeholderTextColor={colors.placeholder} />

      <Text style={styles.label}>{t('auth.email')}</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail}
        placeholder={
          isLineOnlyEmail((user as any)?.email ?? '')
            ? (zh ? '設定真實電子郵件（選填）' : 'Set a real email (optional)')
            : ((user as any)?.email || 'email@example.com')
        }
        keyboardType="email-address" autoCapitalize="none"
        placeholderTextColor={colors.placeholder} />
      {isLineOnlyEmail((user as any)?.email ?? '') && (
        <Text style={{ fontSize: 11, color: '#D97706', marginTop: 2, marginBottom: 4 }}>
          {zh ? '您透過 LINE 登入，目前無真實電子郵件。設定後可用電子郵件+密碼登入。' : 'You signed in with LINE and have no real email. Add one to also log in with email + password.'}
        </Text>
      )}

      <Text style={styles.label}>{t('auth.password')}</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword}
        placeholder="••••••••" secureTextEntry placeholderTextColor={colors.placeholder} />

      <TouchableOpacity style={[styles.btn, { opacity: saving ? 0.6 : 1 }]} onPress={handleSave} disabled={saving}>
        <Text style={styles.btnText}>{saving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}</Text>
      </TouchableOpacity>

      {/* Admin Invites */}
      {user.role === 'ADMIN' && (
        <View style={{ gap: 12, marginTop: 24 }}>
          {/* Platform Admin invite */}
          <View style={styles.inviteCard}>
            <Text style={styles.inviteTitle}>{zh ? '邀請新平台管理員' : 'Invite New Platform Admin'}</Text>
            <Text style={styles.inviteBody}>
              {zh ? '產生連結，讓對方以平台管理員身份完成註冊。' : 'Generate a link so someone can sign up as a Platform Admin.'}
            </Text>
            <TouchableOpacity
              style={[styles.inviteBtn, { opacity: adminInviteGenerating ? 0.6 : 1 }]}
              onPress={() => generateInvite('ADMIN')}
              disabled={adminInviteGenerating}
            >
              <Text style={styles.inviteBtnText}>{adminInviteGenerating ? (zh ? '產生中…' : 'Generating…') : (zh ? '產生並分享連結' : 'Generate & Share Link')}</Text>
            </TouchableOpacity>
            {allInvites.filter((i) => !i.usedAt && i.role === 'ADMIN' && i.id).length > 0 && (
              <View style={{ gap: 6, marginTop: 8 }}>
                <Text style={styles.inviteListLabel}>{zh ? '尚未使用的管理員邀請：' : 'Unused admin invites:'}</Text>
                {allInvites.filter((i) => !i.usedAt && i.role === 'ADMIN' && i.id).map((inv) => {
                  const link = `${WEB_BASE}/${lang}/signup?invite=${inv.token}`;
                  return (
                    <View key={inv.id} style={styles.inviteRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inviteToken} numberOfLines={1}>{link}</Text>
                        <Text style={styles.inviteExpiry}>{zh ? '到期：' : 'Exp: '}{new Date(inv.expiresAt).toLocaleDateString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => { Clipboard.setString(link); Alert.alert('✓', zh ? '已複製' : 'Copied'); }}>
                          <Text style={styles.inviteCopyBtn}>{zh ? '複製' : 'Copy'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert(zh ? '撤銷邀請' : 'Revoke Invite', zh ? '確定要撤銷？' : 'Revoke this invite?', [{ text: zh ? '取消' : 'Cancel', style: 'cancel' }, { text: zh ? '撤銷' : 'Revoke', style: 'destructive', onPress: () => revokeInvite(inv.id) }])}>
                          <Text style={styles.inviteRevokeBtn}>{zh ? '撤銷' : 'Revoke'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Normal User invite */}
          <View style={[styles.inviteCard, styles.inviteCardGreen]}>
            <Text style={[styles.inviteTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>{zh ? '邀請新平台用戶' : 'Invite New Platform User'}</Text>
            <Text style={styles.inviteBody}>
              {zh ? '產生連結，讓尚未註冊的人以一般用戶身份加入平台。' : 'Generate a link for someone to sign up as a regular user.'}
            </Text>
            <TouchableOpacity
              style={[styles.inviteBtn, styles.inviteBtnGreen, { opacity: userInviteGenerating ? 0.6 : 1 }]}
              onPress={() => generateInvite('USER')}
              disabled={userInviteGenerating}
            >
              <Text style={styles.inviteBtnText}>{userInviteGenerating ? (zh ? '產生中…' : 'Generating…') : (zh ? '產生並分享連結' : 'Generate & Share Link')}</Text>
            </TouchableOpacity>
            {allInvites.filter((i) => !i.usedAt && i.role === 'USER' && i.id).length > 0 && (
              <View style={{ gap: 6, marginTop: 8 }}>
                <Text style={styles.inviteListLabel}>{zh ? '尚未使用的用戶邀請：' : 'Unused user invites:'}</Text>
                {allInvites.filter((i) => !i.usedAt && i.role === 'USER' && i.id).map((inv) => {
                  const link = `${WEB_BASE}/${lang}/signup?invite=${inv.token}`;
                  return (
                    <View key={inv.id} style={styles.inviteRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inviteToken} numberOfLines={1}>{link}</Text>
                        <Text style={styles.inviteExpiry}>{zh ? '到期：' : 'Exp: '}{new Date(inv.expiresAt).toLocaleDateString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => { Clipboard.setString(link); Alert.alert('✓', zh ? '已複製' : 'Copied'); }}>
                          <Text style={styles.inviteCopyBtn}>{zh ? '複製' : 'Copy'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert(zh ? '撤銷邀請' : 'Revoke Invite', zh ? '確定要撤銷？' : 'Revoke this invite?', [{ text: zh ? '取消' : 'Cancel', style: 'cancel' }, { text: zh ? '撤銷' : 'Revoke', style: 'destructive', onPress: () => revokeInvite(inv.id) }])}>
                          <Text style={styles.inviteRevokeBtn}>{zh ? '撤銷' : 'Revoke'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Danger Zone */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>{zh ? '危險區域' : 'Danger Zone'}</Text>
        <Text style={styles.dangerBody}>
          {zh ? '刪除帳號後，所有資料將永久刪除且無法還原。' : 'Deleting your account is permanent and cannot be undone.'}
        </Text>
        <TouchableOpacity
          style={[styles.deleteBtn, { opacity: deleting ? 0.6 : 1 }]}
          disabled={deleting}
          onPress={() => {
            Alert.alert(
              zh ? '刪除帳號' : 'Delete Account',
              zh ? '此操作無法復原。所有資料將永久刪除。確定要繼續嗎？' : 'This cannot be undone. All your data will be permanently erased. Are you sure?',
              [
                { text: zh ? '取消' : 'Cancel', style: 'cancel' },
                {
                  text: zh ? '永久刪除' : 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await apiFetch('/users/me', { method: 'DELETE' });
                      await logout();
                    } catch (err: any) {
                      Alert.alert('Error', err.message ?? 'Failed to delete account.');
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          }}
        >
          {deleting
            ? <ActivityIndicator color="#EF4444" />
            : <Text style={styles.deleteBtnText}>{zh ? '刪除帳號' : 'Delete Account'}</Text>}
        </TouchableOpacity>
      </View>

    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../../context/theme.context').useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    container: { padding: 24, backgroundColor: colors.bg, flexGrow: 1 },
    text: { color: colors.text },
    pageTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6, marginTop: 14 },
    rowGroup: { flexDirection: 'row', gap: 10 },
    optBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: colors.card },
    optBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
    optBtnText: { color: colors.text, fontSize: 14 },
    optBtnTextActive: { color: '#fff' },
    notifCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 16, marginTop: 14 },
    muteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    muteLabel: { fontSize: 14, color: colors.text, flex: 1, marginRight: 8 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 4, backgroundColor: colors.input, color: colors.inputText },
    btn: { backgroundColor: INDIGO, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    dangerZone: { marginTop: 32, borderWidth: 1, borderColor: isDark ? '#7F1D1D' : '#FCA5A5', borderRadius: 12, padding: 16, backgroundColor: isDark ? 'rgba(127,29,29,0.18)' : '#FFF5F5' },
    dangerTitle: { fontSize: 13, fontWeight: '700', color: isDark ? '#FCA5A5' : '#DC2626', marginBottom: 4 },
    dangerBody: { fontSize: 12, color: isDark ? '#F87171' : '#EF4444', marginBottom: 12, lineHeight: 18 },
    deleteBtn: { borderWidth: 1, borderColor: isDark ? '#7F1D1D' : '#FCA5A5', borderRadius: 8, padding: 12, alignItems: 'center' },
    deleteBtnText: { color: isDark ? '#FCA5A5' : '#DC2626', fontWeight: '600', fontSize: 14 },
    inviteCard: { borderWidth: 1, borderColor: isDark ? 'rgba(99,102,241,0.4)' : '#C7D2FE', borderRadius: 12, padding: 16, backgroundColor: isDark ? 'rgba(79,70,229,0.1)' : '#EEF2FF', gap: 8 },
    inviteCardGreen: { borderColor: isDark ? 'rgba(16,185,129,0.4)' : '#A7F3D0', backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5' },
    inviteTitle: { fontSize: 14, fontWeight: '700', color: isDark ? '#818CF8' : '#4338CA' },
    inviteBody: { fontSize: 12, color: isDark ? '#A5B4FC' : '#4338CA', lineHeight: 18 },
    inviteBtn: { backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    inviteBtnGreen: { backgroundColor: '#059669' },
    inviteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    inviteListLabel: { fontSize: 11, fontWeight: '600', color: isDark ? '#818CF8' : '#4338CA' },
    inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: isDark ? 'rgba(99,102,241,0.3)' : '#C7D2FE', borderRadius: 8, padding: 8, backgroundColor: isDark ? '#1e1b4b' : '#fff' },
    inviteToken: { fontSize: 10, fontFamily: 'monospace', color: isDark ? '#A5B4FC' : '#3730A3', flex: 1 },
    inviteExpiry: { fontSize: 10, color: isDark ? '#818CF8' : '#6366F1', marginTop: 2 },
    inviteCopyBtn: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
    inviteRevokeBtn: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  });
}
