import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function LoginScreen() {
  const { login, loginWithTokens } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(identifier, password);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Sign in failed.');
    } finally {
      setLoading(false);
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

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const tokens = await apiFetch<{ accessToken: string; refreshToken: string }>('/auth/apple/mobile', {
        method: 'POST',
        body: JSON.stringify({ identityToken: credential.identityToken, fullName: credential.fullName }),
      });
      await loginWithTokens(tokens.accessToken, tokens.refreshToken);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', zh ? 'Apple 登入失敗。' : 'Apple Sign In failed.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.login')}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.inputText }]}
          placeholder={zh ? '電子郵件或手機號碼' : 'Email or phone number'}
          placeholderTextColor={colors.placeholder}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          keyboardType="default"
          textContentType="username"
          autoComplete="username"
          returnKeyType="next"
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.inputText }]}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? (zh ? '登入中…' : 'Signing in…') : t('auth.login')}</Text>
        </TouchableOpacity>
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.placeholder }]}>{zh ? '或' : 'or'}</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>
        <TouchableOpacity style={styles.lineBtn} onPress={handleLineLogin}>
          <Text style={styles.lineBtnText}>🟩 {zh ? '使用 LINE 登入' : 'Sign in with LINE'}</Text>
        </TouchableOpacity>
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={styles.appleBtn}
            onPress={handleAppleLogin}
          />
        )}
        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={{ marginBottom: 12 }}>
          <Text style={styles.link}>{t('auth.forgotPassword') || 'Forgot password / Get sign-in link'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.link}>{t('auth.noAccount')}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16 },
  btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 10, fontSize: 13 },
  lineBtn: { backgroundColor: '#06C755', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  lineBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  appleBtn: { width: '100%', height: 50, marginBottom: 16 },
  link: { color: '#4F46E5', textAlign: 'center', fontSize: 14 },
});
