import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth.context';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login(email, password);
      router.replace('/(tabs)/events');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Login failed.');
    }
  };

  const handleLineLogin = async () => {
    try {
      const data = await apiFetch<{ url: string }>('/auth/line/login-mobile');
      await Linking.openURL(data.url);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not open LINE login.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.login')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        <Text style={styles.btnText}>{t('auth.login')}</Text>
      </TouchableOpacity>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      <TouchableOpacity style={styles.lineBtn} onPress={handleLineLogin}>
        <Text style={styles.lineBtnText}>🟩 {t('auth.lineLogin') || 'Continue with LINE'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={{ marginBottom: 12 }}>
        <Text style={styles.link}>{t('auth.forgotPassword') || 'Forgot password / Get sign-in link'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
        <Text style={styles.link}>{t('auth.noAccount')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, color: '#111' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16 },
  btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 10, fontSize: 13, color: '#9CA3AF' },
  lineBtn: { backgroundColor: '#06C755', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  lineBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#4F46E5', textAlign: 'center', fontSize: 14 },
});
