import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/theme.context';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || cooldown) return;
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60_000);
    } catch {
      setError(zh ? '發送失敗，請稍後再試。' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>{zh ? '取得登入連結' : 'Get a sign-in link'}</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {zh
            ? '輸入您的電子郵件，我們將發送一個可直接登入的連結（15 分鐘內有效）。'
            : "Enter your email and we'll send you a link to sign in instantly (valid for 15 minutes)."}
        </Text>

        {sent ? (
          <View style={[styles.successBox, { backgroundColor: colors.card, borderColor: '#BBF7D0' }]}>
            <Text style={styles.successText}>
              {zh
                ? `如果 ${email} 已登記，您將收到一封包含登入連結的電子郵件。`
                : `If ${email} is registered, you'll receive an email with a sign-in link.`}
            </Text>
            {cooldown && (
              <Text style={styles.cooldownText}>
                {zh ? '60 秒後可重新發送。' : 'You can request again in 60 seconds.'}
              </Text>
            )}
            <TouchableOpacity
              onPress={() => { setSent(false); setEmail(''); }}
              disabled={cooldown}
              style={{ marginTop: 12 }}
            >
              <Text style={[styles.link, cooldown && { opacity: 0.4 }]}>
                {zh ? '使用不同的電子郵件' : 'Try a different email'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Text style={[styles.label, { color: colors.subtext }]}>{zh ? '電子郵件' : 'Email'}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.inputText }]}
              value={email}
              onChangeText={setEmail}
              placeholder="someone@example.com"
              placeholderTextColor={colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.btn, (loading || cooldown) && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading || cooldown}
            >
              <Text style={styles.btnText}>
                {loading ? '…' : (zh ? '發送登入連結' : 'Send sign-in link')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={styles.link}>{zh ? '返回登入' : 'Back to login'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 16 },
  btn: { backgroundColor: '#4F46E5', borderRadius: 10, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#EF4444', fontSize: 13, marginBottom: 12 },
  successBox: { borderWidth: 1, borderRadius: 10, padding: 16 },
  successText: { color: '#166534', fontSize: 14, lineHeight: 20 },
  cooldownText: { color: '#16A34A', fontSize: 12, marginTop: 8 },
  link: { color: '#4F46E5', textAlign: 'center', fontSize: 14 },
});
