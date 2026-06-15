import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { useTranslation } from 'react-i18next';

export default function SignupScreen() {
  const { signup } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!inviteToken.trim()) {
      Alert.alert('Error', t('auth.inviteTokenRequired'));
      return;
    }
    setLoading(true);
    try {
      await signup({ email, password, phone, displayName: displayName.trim() || undefined, preferredLanguage: (i18n.language === 'zh' ? 'zh' : 'en'), inviteToken: inviteToken.trim() });
      router.replace('/(tabs)/events');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Sign-up failed.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.inputText }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.signup')}</Text>
        <TextInput style={inputStyle} placeholder={t('auth.displayName') || 'Display Name (nickname)'}
          placeholderTextColor={colors.placeholder} value={displayName} onChangeText={setDisplayName}
          textContentType="name" autoComplete="name" returnKeyType="next" />
        <TextInput style={inputStyle} placeholder={t('auth.email')}
          placeholderTextColor={colors.placeholder} value={email}
          onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          textContentType="emailAddress" autoComplete="email" returnKeyType="next" />
        <TextInput style={inputStyle} placeholder={t('auth.password')}
          placeholderTextColor={colors.placeholder} value={password}
          onChangeText={setPassword} secureTextEntry
          textContentType="newPassword" autoComplete="new-password" returnKeyType="next" />
        <TextInput style={inputStyle} placeholder={zh ? '+886912345678' : '+1 / +44 / +886…'}
          placeholderTextColor={colors.placeholder} value={phone}
          onChangeText={setPhone} keyboardType="phone-pad"
          textContentType="telephoneNumber" autoComplete="tel" returnKeyType="next" />
        <TextInput style={inputStyle} placeholder={t('auth.inviteTokenPlaceholder') || 'Invite Code'}
          placeholderTextColor={colors.placeholder} value={inviteToken}
          onChangeText={setInviteToken} autoCapitalize="none" autoCorrect={false} />
        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSignup} disabled={loading}>
          <Text style={styles.btnText}>{loading ? (zh ? '建立中…' : 'Creating account…') : t('auth.signup')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>{t('auth.hasAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16 },
  btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#4F46E5', textAlign: 'center', fontSize: 14 },
});
