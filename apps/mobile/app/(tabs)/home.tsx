import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import JLogo from '../../components/JLogo';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import type { News } from '@judien/shared';

export default function HomeTab() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const isAdmin = user?.role === 'ADMIN';

  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const data = await apiFetch<News[]>('/news');
      setNews(data);
    } catch (err: unknown) {
      setLoadError((err as Error).message ?? 'Failed to load feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { setRefreshing(true); load(true); };

  const handleCreate = async () => {
    if (!form.title.trim()) { Alert.alert(zh ? '請輸入標題' : 'Title required', zh ? '標題不能為空。' : 'Please enter a title.'); return; }
    if (!form.body.trim()) { Alert.alert(zh ? '請輸入內容' : 'Body required', zh ? '內容不能為空。' : 'Please enter some content.'); return; }
    setSaving(true);
    try {
      await apiFetch('/news', { method: 'POST', body: JSON.stringify({
        title_en: form.title, title_zh: form.title,
        body_en: form.body, body_zh: form.body,
      }) });
      setForm({ title: '', body: '' });
      setComposing(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('home.deletePost'), t('home.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/news/${id}`, { method: 'DELETE' });
            load();
          } catch (err: unknown) {
            Alert.alert('Error', (err as Error).message ?? 'Failed to delete.');
          }
        },
      },
    ]);
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.subtext} />}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.Screen options={{
          headerTitle: composing ? (zh ? '發布公告' : 'Create Post') : () => <JLogo />,
          headerStyle: { backgroundColor: colors.headerBg },
          headerLeft: composing ? () => (
            <TouchableOpacity onPress={() => setComposing(false)} activeOpacity={1} style={{ marginLeft: 16 }}>
              <Text style={styles.backBtn}>‹ {zh ? '返回' : 'Back'}</Text>
            </TouchableOpacity>
          ) : undefined,
          headerRight: user && !composing ? () => (
            <TouchableOpacity onPress={() => setComposing(true)} activeOpacity={0.7} style={{ marginRight: 16 }} accessibilityLabel={zh ? '建立公告' : 'Create post'}>
              <Text style={styles.headerBtn}>＋</Text>
            </TouchableOpacity>
          ) : undefined,
        }} />

        {user && composing && (
          <View style={styles.form}>
            <Text style={styles.formLabel}>{zh ? '標題' : 'Title'}</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm({ ...form, title: v })}
              placeholderTextColor={colors.placeholder}
              maxLength={200}
              returnKeyType="next"
            />
            <Text style={styles.formLabel}>{zh ? '內容' : 'Body'}</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={form.body}
              onChangeText={(v) => setForm({ ...form, body: v })}
              multiline
              placeholderTextColor={colors.placeholder}
              maxLength={5000}
            />
            <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.5 }]} onPress={handleCreate} disabled={saving}>
              <Text style={styles.submitBtnText}>{saving ? (zh ? '發布中…' : 'Posting…') : t('home.createPost')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!composing && (
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.subtext} />
          ) : loadError ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: '#EF4444' }]}>{loadError}</Text>
              <TouchableOpacity onPress={() => load()} style={{ marginTop: 12 }}>
                <Text style={{ color: '#4F46E5', fontSize: 14 }}>{zh ? '重試' : 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : news.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📢</Text>
              <Text style={styles.emptyText}>{zh ? '沒有動態' : 'No feeds'}</Text>
            </View>
          ) : (
            news.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {zh ? item.title_zh : item.title_en}
                  </Text>
                  {(isAdmin || item.createdById === user?.id) && (
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn} accessibilityLabel={zh ? '刪除公告' : 'Delete post'}>
                      <Text style={styles.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {item.group && (
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>👥 {item.group.name}</Text>
                  </View>
                )}
                <Text style={styles.cardBody}>{zh ? item.body_zh : item.body_en}</Text>
                <Text style={styles.cardDate}>
                  {item.createdBy?.displayName ? `${item.createdBy.displayName} · ` : ''}
                  {new Date(item.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}
                </Text>
              </View>
            ))
          )
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const INDIGO = '#4F46E5';

function makeStyles(colors: ReturnType<typeof import('../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    container: { padding: 20, backgroundColor: colors.bg, flexGrow: 1 },
    headerBtn: { color: INDIGO, fontSize: 24, fontWeight: '400' },
    backBtn: { color: INDIGO, fontSize: 17 },
    form: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    formLabel: { fontSize: 13, fontWeight: '500', color: colors.subtext, marginBottom: 4, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: colors.input, color: colors.inputText },
    multiline: { minHeight: 70, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: INDIGO, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 14 },
    submitBtnText: { color: '#fff', fontWeight: '600' },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { color: colors.placeholder, textAlign: 'center', fontSize: 15 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, marginRight: 8 },
    groupBadge: { alignSelf: 'flex-start', backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
    groupBadgeText: { fontSize: 11, fontWeight: '500', color: INDIGO },
    cardBody: { fontSize: 14, color: colors.subtext, lineHeight: 20 },
    cardDate: { fontSize: 12, color: colors.placeholder, marginTop: 8 },
    deleteBtn: { padding: 4 },
    deleteBtnText: { fontSize: 16 },
  });
}
