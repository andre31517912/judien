import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

const INDIGO = '#4F46E5';
import { apiFetch } from '../../../../../lib/api';
import type { News } from '@judien/shared';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../../context/theme.context';

export default function NewsDetailScreen() {
  const { newsId } = useLocalSearchParams<{ newsId: string }>();
  const { i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const zh = i18n.language === 'zh';

  const [post, setPost] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!newsId) return;
    apiFetch<News>(`/news/${newsId}`)
      .then(setPost)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [newsId]);

  const apiBase = process.env.EXPO_PUBLIC_API_URL ?? '';
  const coverUrl = post?.coverImageUrl
    ? (post.coverImageUrl.startsWith('http') ? post.coverImageUrl : `${apiBase}${post.coverImageUrl}`)
    : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={INDIGO} style={{ marginTop: 40 }} />
        ) : !post ? (
          <Text style={{ color: '#EF4444', textAlign: 'center', marginTop: 40 }}>{zh ? '找不到此文章。' : 'Post not found.'}</Text>
        ) : (
          <>
            {coverUrl && (
              <Image source={{ uri: coverUrl }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }} resizeMode="cover" />
            )}

            {post.group && (
              <View style={{ alignSelf: 'flex-start', backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 }}>
                <Text style={{ color: isDark ? '#A5B4FC' : '#4338CA', fontSize: 12, fontWeight: '600' }}>{post.group.name}</Text>
              </View>
            )}

            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, lineHeight: 30, marginBottom: 12 }}>
              {post.title}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? '#312E81' : '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: isDark ? '#A5B4FC' : '#4338CA', fontSize: 11, fontWeight: '700' }}>
                  {(post.createdBy?.displayName?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 13 }}>
                {post.createdBy?.displayName ?? ''} · {new Date(post.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: isDark ? '#1F2937' : '#F3F4F6', marginBottom: 16 }} />

            <Text style={{ fontSize: 15, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 24 }}>
              {post.body}
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}
