import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';

export default function EventInviteAcceptScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!displayName.trim() || !phone.trim()) {
      setError(zh ? '請填入名字和電話' : 'Please enter name and phone');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await apiFetch<{ user: any; eventId: string }>(
        `/event-invites/${token}/accept`,
        {
          method: 'POST',
          body: JSON.stringify({
            displayName,
            phoneE164: phone,
            email: email || undefined,
          }),
        }
      );

      router.replace(`/events/${result.eventId}`);
    } catch (err: any) {
      setError(err.message || (zh ? '無法確認邀請' : 'Failed to accept invite'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{zh ? '你被邀請了！' : "You're Invited!"}</Text>
        <Text style={styles.subtitle}>
          {zh ? '填入你的資訊以確認參加' : 'Fill in your details to confirm attendance'}
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{zh ? '名字 *' : 'Display Name *'}</Text>
            <TextInput
              style={styles.input}
              placeholder={zh ? '我們要怎麼稱呼你？' : 'What should we call you?'}
              value={displayName}
              onChangeText={setDisplayName}
              placeholderTextColor="#9CA3AF"
              editable={!loading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{zh ? '電話 *' : 'Phone Number *'}</Text>
            <TextInput
              style={styles.input}
              placeholder="+886 900 000 123"
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{zh ? '信箱 (選填)' : 'Email (optional)'}</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (loading || !displayName.trim() || !phone.trim()) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || !displayName.trim() || !phone.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{zh ? '確認參加' : 'Confirm Attendance'}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            {zh ? '確認後，你將被標記為參加此活動' : 'By confirming, you\'ll be marked as attending this event'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, gap: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  errorText: { color: '#991B1B', fontSize: 13 },
  form: { gap: 14 },
  formGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  submitBtn: { backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  note: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
});
