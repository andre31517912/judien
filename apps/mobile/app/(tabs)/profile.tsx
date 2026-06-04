import { useState, useEffect } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/auth.context';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import i18n from '../../lib/i18n';

export default function ProfileScreen() {
  const { user, logout, refresh } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const zh = i18n.language === 'zh';

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [muteEmail, setMuteEmail] = useState(false);
  const [muteLinePush, setMuteLinePush] = useState(false);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [lineMsg, setLineMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [colorTheme, setColorThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((stored) => {
      if (stored === 'dark' || stored === 'light') setColorThemeState(stored);
    });
  }, []);

  useEffect(() => {
    if (user) {
      setMuteEmail((user as any).muteEmail ?? false);
      setMuteLinePush((user as any).muteLinePush ?? false);
      setLineLinked(!!(user as any).lineUserId);
      const savedLang = user.preferredLanguage as 'en' | 'zh';
      setLang(savedLang);
      i18n.changeLanguage(savedLang);
    }
  }, [user]);

  const handleSave = async () => {
    const body: Record<string, unknown> = {
      preferredLanguage: lang,
      muteEmail,
      muteLinePush,
    };
    if (displayName.trim()) body.displayName = displayName.trim();
    if (phone.trim()) body.phone = phone.trim();
    if (email.trim()) body.email = email.trim();
    if (password.trim()) body.password = password.trim();
    try {
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(body) });
      await refresh();
      setPassword('');
      Alert.alert(t('common.appName'), t('profile.updateSuccess'));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleLogout = async () => { await logout(); };

  const handleSetTheme = async (th: 'light' | 'dark') => {
    setColorThemeState(th);
    await AsyncStorage.setItem('theme', th);
  };

  const handleLinkLine = async () => {
    setLineLoading(true);
    setLineMsg(null);
    try {
      const data = await apiFetch<{ url?: string; error?: string }>('/auth/line/connect');
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        setLineMsg({ text: data.error ?? 'LINE not configured.', ok: false });
      }
    } catch (err: any) {
      setLineMsg({ text: err.message ?? 'Error starting LINE link.', ok: false });
    } finally {
      setLineLoading(false);
    }
  };

  const handleUnlinkLine = async () => {
    Alert.alert(
      zh ? '解除連結 LINE' : 'Unlink LINE',
      zh ? '確定要解除 LINE 帳號連結嗎？' : 'Are you sure you want to unlink your LINE account?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: zh ? '解除連結' : 'Unlink', style: 'destructive',
          onPress: async () => {
            setLineLoading(true);
            try {
              await apiFetch('/auth/line/connect', { method: 'DELETE' });
              await refresh();
              setLineLinked(false);
              setLineMsg({ text: zh ? 'LINE 帳號已解除連結。' : 'LINE account unlinked.', ok: true });
            } catch (err: any) {
              setLineMsg({ text: err.message ?? 'Error unlinking LINE.', ok: false });
            } finally {
              setLineLoading(false);
            }
          },
        },
      ],
    );
  };

  if (!user) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Please log in.</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <View style={[styles.roleBadge, user.role === 'ADMIN' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
          <Text style={[styles.roleBadgeText, user.role === 'ADMIN' ? styles.roleBadgeTextAdmin : styles.roleBadgeTextUser]}>
            {user.role === 'ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '用戶' : 'User')}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>{t('auth.displayName')}</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={(user as any).displayName || (zh ? '輸入顯示名稱' : 'Enter display name')}
      />

      <Text style={styles.label}>{t('profile.language')}</Text>
      <View style={styles.langRow}>
        {(['en', 'zh'] as const).map((l) => (
          <TouchableOpacity key={l} onPress={() => { setLang(l); i18n.changeLanguage(l); }}
            style={[styles.langBtn, lang === l && styles.langBtnActive]}>
            <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
              {l === 'en' ? 'English' : '中文'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{zh ? '主題' : 'Theme'}</Text>
      <View style={styles.langRow}>
        {(['light', 'dark'] as const).map((th) => (
          <TouchableOpacity key={th} onPress={() => handleSetTheme(th)}
            style={[styles.langBtn, colorTheme === th && styles.langBtnActive]}>
            <Text style={[styles.langBtnText, colorTheme === th && styles.langBtnTextActive]}>
              {th === 'light' ? (zh ? '☀️ 淺色' : '☀️ Light') : (zh ? '🌙 深色' : '🌙 Dark')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.muteRow}>
        <Text style={styles.label}>{t('profile.muteEmail')}</Text>
        <Switch value={muteEmail} onValueChange={setMuteEmail} trackColor={{ true: '#4F46E5' }} />
      </View>

      {/* LINE Account */}
      <View style={styles.lineCard}>
        <View style={styles.lineCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lineCardTitle}>{zh ? 'LINE 帳號連結' : 'LINE Account'}</Text>
            <Text style={styles.lineCardSubtitle}>
              {lineLinked
                ? (zh ? '已連結，可接收 LINE 推播通知。' : 'Linked — you can receive LINE push notifications.')
                : (zh ? '連結後可接收 LINE 推播通知。' : 'Link to receive LINE push notifications.')}
            </Text>
          </View>
          {lineLinked ? (
            <TouchableOpacity onPress={handleUnlinkLine} disabled={lineLoading}>
              <Text style={[styles.lineUnlinkBtn, lineLoading && { opacity: 0.5 }]}>
                {lineLoading ? '…' : (zh ? '解除連結' : 'Unlink')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.lineLinkBtn} onPress={handleLinkLine} disabled={lineLoading}>
              <Text style={styles.lineLinkBtnText}>{lineLoading ? '…' : (zh ? '連結 LINE' : 'Link LINE')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {lineMsg && (
          <Text style={[styles.lineMsg, { color: lineMsg.ok ? '#16A34A' : '#EF4444' }]}>{lineMsg.text}</Text>
        )}
        {lineLinked && (
          <View style={styles.muteRow}>
            <Text style={styles.label}>{zh ? '靜音 LINE 推播' : 'Mute LINE push'}</Text>
            <Switch value={muteLinePush} onValueChange={setMuteLinePush} trackColor={{ true: '#4F46E5' }} />
          </View>
        )}
      </View>

      <Text style={styles.label}>{t('auth.phone')}</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={(user as any).phone || '+886912345678'} keyboardType="phone-pad" />

      <Text style={styles.label}>{t('auth.email')}</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={(user as any).email || 'email@example.com'} keyboardType="email-address" autoCapitalize="none" />

      <Text style={styles.label}>{t('auth.password')}</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>{t('profile.updateProfile')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF4444', marginTop: 12 }]} onPress={handleLogout}>
        <Text style={styles.btnText}>{t('auth.logout')}</Text>
      </TouchableOpacity>

      {/* Policy links */}
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

const INDIGO = '#4F46E5';
const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  roleBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  roleBadgeAdmin: { backgroundColor: '#EEF2FF' },
  roleBadgeUser: { backgroundColor: '#DCFCE7' },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },
  roleBadgeTextAdmin: { color: '#4338CA' },
  roleBadgeTextUser: { color: '#16A34A' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 14 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  langBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  langBtnText: { color: '#374151', fontSize: 14 },
  langBtnTextActive: { color: '#fff' },
  muteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  lineCard: { marginTop: 20, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14 },
  lineCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lineCardTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  lineCardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  lineLinkBtn: { backgroundColor: '#06C755', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  lineLinkBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  lineUnlinkBtn: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  lineMsg: { fontSize: 12, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 4 },
  btn: { backgroundColor: INDIGO, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  policyRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28, gap: 8 },
  policyLink: { fontSize: 13, color: '#6B7280', textDecorationLine: 'underline' },
  policySep: { color: '#D1D5DB', fontSize: 13 },
});
