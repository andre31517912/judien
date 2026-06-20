import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
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
    }
  }, [user]);

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
        <View style={[styles.muteRow, { marginTop: 10 }]}>
          <Text style={styles.muteLabel}>{t('profile.muteEmail')}</Text>
          <Switch value={muteEmail} onValueChange={setMuteEmail} trackColor={{ true: INDIGO }} />
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
  });
}
