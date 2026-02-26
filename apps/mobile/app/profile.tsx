import { useState, useEffect } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/auth.context';
import { apiFetch } from '../lib/api';
import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [muteSms, setMuteSms] = useState(false);
  const [muteEmail, setMuteEmail] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>('en');

  useEffect(() => {
    if (user) {
      setMuteSms((user as any).muteSms ?? false);
      setMuteEmail((user as any).muteEmail ?? false);
      setLang(user.preferredLanguage as 'en' | 'zh');
    }
  }, [user]);

  const handleSave = async () => {
    const body: Record<string, unknown> = { preferredLanguage: lang, muteSms, muteEmail };
    if (phone.trim()) body.phone = phone;
    if (email.trim()) body.email = email;
    try {
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(body) });
      await i18n.changeLanguage(lang);
      Alert.alert(t('common.appName'), t('profile.updateSuccess'));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Please log in.</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <Text style={styles.label}>{t('profile.language')}</Text>
      <View style={styles.langRow}>
        {(['en', 'zh'] as const).map((l) => (
          <TouchableOpacity key={l} onPress={() => setLang(l)}
            style={[styles.langBtn, lang === l && styles.langBtnActive]}>
            <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
              {l === 'en' ? 'English' : '中文'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.muteRow}>
        <Text style={styles.label}>{t('profile.muteSms') || 'Mute SMS'}</Text>
        <Switch value={muteSms} onValueChange={setMuteSms} trackColor={{ true: '#4F46E5' }} />
      </View>

      <View style={styles.muteRow}>
        <Text style={styles.label}>{t('profile.muteEmail') || 'Mute Email'}</Text>
        <Switch value={muteEmail} onValueChange={setMuteEmail} trackColor={{ true: '#4F46E5' }} />
      </View>

      <Text style={styles.label}>{t('auth.phone')} (leave blank to keep)</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+886912345678" keyboardType="phone-pad" />

      <Text style={styles.label}>{t('auth.email')} (leave blank to keep)</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="new@email.com" keyboardType="email-address" autoCapitalize="none" />

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>{t('profile.updateProfile')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF4444', marginTop: 12 }]} onPress={handleLogout}>
        <Text style={styles.btnText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const INDIGO = '#4F46E5';
const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#111' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 14 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  langBtnActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  langBtnText: { color: '#374151', fontSize: 14 },
  langBtnTextActive: { color: '#fff' },
  muteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 4 },
  btn: { backgroundColor: INDIGO, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
