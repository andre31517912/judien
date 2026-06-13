import { useState, useEffect, useMemo } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { useRouter, Stack } from 'expo-router';
import JLogo from '../../components/JLogo';
import i18n from '../../lib/i18n';

export default function ProfileScreen() {
  const { user, logout, refresh } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, theme, setTheme } = useTheme();
  const zh = i18n.language === 'zh';

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [muteEmail, setMuteEmail] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [pendingTheme, setPendingTheme] = useState<'light' | 'dark'>(theme);

  const isLineOnlyEmail = (e: string) => e.endsWith('@line.local');

  useEffect(() => {
    if (user) {
      setDisplayName((user as any).displayName ?? '');
      const rawEmail = (user as any)?.email ?? '';
      setEmail(isLineOnlyEmail(rawEmail) ? '' : rawEmail);
      setPhone((user as any)?.phoneE164 ?? '');
      setMuteEmail((user as any).muteEmail ?? false);
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

    const body: Record<string, unknown> = { preferredLanguage: lang, muteEmail };
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

    try {
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(body) });
      i18n.changeLanguage(lang);
      setTheme(pendingTheme);
      await refresh();
      setPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleLogout = async () => { await logout(); };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!user) return <View style={styles.center}><Text style={styles.text}>Please log in.</Text></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <Stack.Screen options={{ headerTitle: () => <JLogo />, headerStyle: { backgroundColor: colors.headerBg } }} />
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <View style={[styles.roleBadge, user.role === 'ADMIN' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
          <Text style={[styles.roleBadgeText, user.role === 'ADMIN' ? styles.roleBadgeTextAdmin : styles.roleBadgeTextUser]}>
            {user.role === 'ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '用戶' : 'User')}
          </Text>
        </View>
      </View>

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
          <TouchableOpacity key={l} onPress={() => setLang(l)}
            style={[styles.optBtn, lang === l && styles.optBtnActive]}>
            <Text style={[styles.optBtnText, lang === l && styles.optBtnTextActive]}>
              {l === 'en' ? 'English' : '中文'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{zh ? '主題' : 'Theme'}</Text>
      <View style={styles.rowGroup}>
        {(['light', 'dark'] as const).map((th) => (
          <TouchableOpacity key={th} onPress={() => setPendingTheme(th)}
            style={[styles.optBtn, pendingTheme === th && styles.optBtnActive]}>
            <Text style={[styles.optBtnText, pendingTheme === th && styles.optBtnTextActive]}>
              {th === 'light' ? (zh ? '☀️ 淺色' : '☀️ Light') : (zh ? '🌙 深色' : '🌙 Dark')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.muteRow}>
        <Text style={styles.label}>{t('profile.muteEmail')}</Text>
        <Switch value={muteEmail} onValueChange={setMuteEmail} trackColor={{ true: '#4F46E5' }} />
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

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>{zh ? '儲存' : 'Save'}</Text>
      </TouchableOpacity>

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
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    container: { padding: 24, backgroundColor: colors.bg, flexGrow: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    text: { color: colors.text },
    roleBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    roleBadgeAdmin: { backgroundColor: '#EEF2FF' },
    roleBadgeUser: { backgroundColor: '#DCFCE7' },
    roleBadgeText: { fontSize: 12, fontWeight: '600' },
    roleBadgeTextAdmin: { color: '#4338CA' },
    roleBadgeTextUser: { color: '#16A34A' },
    label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6, marginTop: 14 },
    rowGroup: { flexDirection: 'row', gap: 10 },
    optBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: colors.card },
    optBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    optBtnText: { color: colors.text, fontSize: 14 },
    optBtnTextActive: { color: '#fff' },
    muteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 4, backgroundColor: colors.input, color: colors.inputText },
    btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    policyRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28, gap: 8 },
    policyLink: { fontSize: 13, color: colors.subtext, textDecorationLine: 'underline' },
    policySep: { color: colors.border, fontSize: 13 },
  });
}
