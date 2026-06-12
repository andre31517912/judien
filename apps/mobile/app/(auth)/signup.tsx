import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { useTranslation } from 'react-i18next';

export default function SignupScreen() {
  const { signup } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  const handleSignup = async () => {
    if (!inviteToken.trim()) {
      Alert.alert('Error', t('auth.inviteTokenRequired'));
      return;
    }
    try {
      await signup({ email, password, phone, displayName: displayName.trim() || undefined, preferredLanguage: 'en', inviteToken: inviteToken.trim() });
      router.replace('/(tabs)/events');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Sign-up failed.');
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.inputText }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('auth.signup')}</Text>
        <TextInput style={inputStyle} placeholder={t('auth.displayName') || 'Display Name (nickname)'}
          placeholderTextColor={colors.placeholder} value={displayName} onChangeText={setDisplayName} />
        <TextInput style={inputStyle} placeholder={t('auth.email')}
          placeholderTextColor={colors.placeholder} value={email}
          onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={inputStyle} placeholder={t('auth.password')}
          placeholderTextColor={colors.placeholder} value={password}
          onChangeText={setPassword} secureTextEntry />
        <TextInput style={inputStyle} placeholder="+886912345678"
          placeholderTextColor={colors.placeholder} value={phone}
          onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={inputStyle} placeholder={t('auth.inviteTokenPlaceholder') || 'Invite Code'}
          placeholderTextColor={colors.placeholder} value={inviteToken}
          onChangeText={setInviteToken} autoCapitalize="none" autoCorrect={false} />
        <TouchableOpacity style={styles.btn} onPress={handleSignup}>
          <Text style={styles.btnText}>{t('auth.signup')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>{t('auth.hasAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
