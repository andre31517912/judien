import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/theme.context';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../../lib/api';

type PublicProfile = { id: string; displayName: string | null };

const INDIGO = '#4F46E5';

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    apiFetch<PublicProfile>(`/users/${userId}`)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={INDIGO} />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <Text style={{ color: colors.subtext, fontSize: 15 }}>
          {zh ? '找不到該用戶。' : 'User not found.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24 }}>
      <View style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}>
        {/* Top color band */}
        <View style={{ height: 80, backgroundColor: INDIGO }} />

        {/* Avatar + name */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 4, borderColor: colors.card,
            marginTop: -40,
            marginBottom: 12,
          }}>
            <Ionicons name="person" size={44} color={colors.placeholder} />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {profile.displayName ?? (
              <Text style={{ color: colors.placeholder, fontWeight: '400', fontStyle: 'italic' }}>
                {zh ? '未設定姓名' : 'No name set'}
              </Text>
            )}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
