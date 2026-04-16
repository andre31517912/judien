import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../../context/auth.context';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import type { News } from '@judien/shared';

export default function HomeTab() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const isAdmin = user?.role === 'ADMIN';

  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    apiFetch<News[]>('/news')
      .then(setNews)
      .catch((err: unknown) => setLoadError((err as Error).message ?? 'Failed to load feed.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{
        title: composing ? (zh ? '發布公告' : 'Create Post') : (zh ? '動態' : 'Feed'),
        headerRight: user && !composing ? () => (
          <TouchableOpacity onPress={() => setComposing(true)} activeOpacity={0.7} style={{ marginRight: 16 }}>
            <Text style={styles.headerBtn}>＋</Text>
          </TouchableOpacity>
        ) : undefined,
        headerLeft: composing ? () => (
          <TouchableOpacity onPress={() => setComposing(false)} activeOpacity={1} style={{ marginLeft: 16 }}>
            <Text style={styles.backBtn}>‹ Back</Text>
          </TouchableOpacity>
        ) : undefined,
      }} />

      {/* Remove the old inline header row */}

      {/* Compose form for any authenticated user */}
      {user && composing && (
        <View style={styles.form}>
          <Text style={styles.formLabel}>{zh ? '標題' : 'Title'}</Text>
          <TextInput style={styles.input} value={form.title}
            onChangeText={(v) => setForm({ ...form, title: v })} />
          <Text style={styles.formLabel}>{zh ? '內容' : 'Body'}</Text>
          <TextInput style={[styles.input, styles.multiline]} value={form.body}
            onChangeText={(v) => setForm({ ...form, body: v })} multiline />
          <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            <Text style={styles.submitBtnText}>{t('home.createPost')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!composing && (
        loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : loadError ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: '#EF4444' }]}>{loadError}</Text>
            <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
              <Text style={{ color: '#4F46E5', fontSize: 14 }}>{zh ? '重試' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : news.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>{t('home.noNews')}</Text>
          </View>
        ) : (
          news.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {zh ? item.title_zh : item.title_en}
                </Text>
                {(isAdmin || item.createdById === user?.id) && (
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
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
  );
}

const INDIGO = '#4F46E5';
const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F9FAFB', flexGrow: 1 },
  headerBtn: { color: INDIGO, fontSize: 24, fontWeight: '400' },
  backBtn: { color: INDIGO, fontSize: 17 },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  formLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: INDIGO, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 14 },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827', marginRight: 8 },
  groupBadge: { alignSelf: 'flex-start', backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  groupBadgeText: { fontSize: 11, fontWeight: '500', color: '#4F46E5' },
  cardBody: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  cardDate: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 16 },
});
