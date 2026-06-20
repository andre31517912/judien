import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, Image, Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import JLogo from '../../components/JLogo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { apiFetch, apiUpload, resolveImageUrl } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import type { News, EventWithCounts, PaginatedResponse } from '@judien/shared';

const INDIGO = '#4F46E5';
type HomeTab = 'feed' | 'upcoming' | 'past';

export default function HomeTab() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const isAdmin = user?.role === 'ADMIN';
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<HomeTab>('feed');
  const [composing, setComposing] = useState(false);

  // ── Feed state ────────────────────────────────────────────────────────────
  const [news, setNews] = useState<News[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Events state ──────────────────────────────────────────────────────────
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsRefreshing, setEventsRefreshing] = useState(false);
  const [eventsScope, setEventsScope] = useState<'future' | 'past'>('future');

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setFeedLoading(true);
    try {
      const data = await apiFetch<News[]>('/news');
      setNews(data);
    } catch { /* ignore */ }
    finally { setFeedLoading(false); setFeedRefreshing(false); }
  }, []);

  const loadEvents = useCallback(async (scope: 'future' | 'past', silent = false) => {
    if (!silent) setEventsLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<EventWithCounts>>(
        `/events?scope=${scope}&page=1&pageSize=30`,
      );
      setEvents(res.data);
    } catch { /* ignore */ }
    finally { setEventsLoading(false); setEventsRefreshing(false); }
  }, []);

  // Load feed on mount; load events when switching to events tabs
  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    if (activeTab === 'upcoming') {
      setEventsScope('future');
      loadEvents('future');
    } else if (activeTab === 'past') {
      setEventsScope('past');
      loadEvents('past');
    }
  }, [activeTab]);

  // ── Compose handlers ──────────────────────────────────────────────────────
  const doPickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('', zh ? '需要相簿權限' : 'Photo library permission required'); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.5 });
    if (!result.canceled && result.assets[0]) setCoverUri(result.assets[0].uri);
  };

  const pickImage = async () => {
    if (coverUri) {
      Alert.alert(zh ? '封面圖片' : 'Cover Photo', undefined, [
        { text: zh ? '移除圖片' : 'Remove', style: 'destructive', onPress: () => setCoverUri(null) },
        { text: zh ? '更換圖片' : 'Replace', onPress: doPickImage },
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    await doPickImage();
  };

  const handleCreatePost = async () => {
    if (!postBody.trim()) { Alert.alert(zh ? '請輸入內容' : 'Content required'); return; }
    setSaving(true);
    try {
      let coverImageUrl: string | null = null;
      if (coverUri) { const up = await apiUpload(coverUri); coverImageUrl = up.url; }
      await apiFetch('/news', { method: 'POST', body: JSON.stringify({ body: postBody, coverImageUrl }) });
      setPostBody(''); setCoverUri(null); setComposing(false);
      loadFeed();
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDeletePost = (id: string) => {
    Alert.alert(t('home.deletePost'), t('home.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try { await apiFetch(`/news/${id}`, { method: 'DELETE' }); loadFeed(); }
        catch (err: unknown) { Alert.alert('Error', (err as Error).message ?? 'Failed to delete.'); }
      }},
    ]);
  };

  const handlePlusPress = () => {
    Alert.alert(
      zh ? '新增' : 'Create',
      undefined,
      [
        { text: zh ? '發布公告' : 'Create Post', onPress: () => { setActiveTab('feed'); setComposing(true); } },
        { text: zh ? '建立活動' : 'Create Event', onPress: () => router.push('/admin/events/new' as any) },
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const TABS: { key: HomeTab; label: string }[] = [
    { key: 'feed', label: zh ? '動態' : 'Feed' },
    { key: 'upcoming', label: zh ? '即將到來' : 'Upcoming' },
    { key: 'past', label: zh ? '已結束' : 'Past' },
  ];

  const tileSize = (Dimensions.get('window').width - 32 - 8) / 2;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{
        headerTitle: composing ? (zh ? '發布公告' : 'Create Post') : () => <JLogo />,
        headerStyle: { backgroundColor: colors.headerBg },
        headerLeft: composing ? () => (
          <TouchableOpacity
            onPress={() => { setComposing(false); setCoverUri(null); setPostBody(''); }}
            activeOpacity={0.7}
            style={{ marginLeft: 4, flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="chevron-back" size={28} color={INDIGO} />
            <Text style={styles.backBtn}>{zh ? '返回' : 'Back'}</Text>
          </TouchableOpacity>
        ) : undefined,
        headerRight: !composing ? () => (
          <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
            <Ionicons name="search" size={24} color={INDIGO} />
          </TouchableOpacity>
        ) : undefined,
      }} />

      {/* ── Tab row (hidden while composing) ───────────────────────────────── */}
      {!composing && (
        <View style={styles.tabRow}>
          <View style={styles.tabPills}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.pill, activeTab === tab.key && styles.pillActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, activeTab === tab.key && styles.pillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.plusBtn} onPress={handlePlusPress} activeOpacity={0.75}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Compose form ────────────────────────────────────────────────────── */}
      {composing && (
        <ScrollView contentContainerStyle={styles.composeScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={postBody}
            onChangeText={setPostBody}
            placeholder={zh ? '有什麼想說的…' : "What's on your mind…"}
            multiline
            placeholderTextColor={colors.placeholder}
            maxLength={5000}
            autoFocus
          />
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage} activeOpacity={0.7}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Ionicons name="image-outline" size={20} color={colors.placeholder} />
                <Text style={styles.imagePickerText}>{zh ? '新增圖片（選填）' : 'Add image (optional)'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, (saving || !postBody.trim()) && { opacity: 0.5 }]}
            onPress={handleCreatePost}
            disabled={saving || !postBody.trim()}
          >
            <Text style={styles.submitBtnText}>{saving ? (zh ? '發布中…' : 'Posting…') : t('home.createPost')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Feed tab ────────────────────────────────────────────────────────── */}
      {!composing && activeTab === 'feed' && (
        feedLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.subtext} />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.container, { flexGrow: 1 }]}
            refreshControl={<RefreshControl refreshing={feedRefreshing} onRefresh={() => { setFeedRefreshing(true); loadFeed(true); }} tintColor={colors.subtext} />}
          >
            {news.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📢</Text>
                <Text style={styles.emptyText}>{zh ? '沒有動態' : 'No posts yet'}</Text>
              </View>
            ) : news.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  {(isAdmin || item.createdById === user?.id) && (
                    <TouchableOpacity onPress={() => handleDeletePost(item.id)} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 16 }}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {item.group && (
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>{item.group.name}</Text>
                  </View>
                )}
                <Text style={styles.cardBody}>{item.body}</Text>
                <Text style={styles.cardDate}>
                  {item.createdBy?.displayName ? `${item.createdBy.displayName} · ` : ''}
                  {new Date(item.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}
                </Text>
              </View>
            ))}
          </ScrollView>
        )
      )}

      {/* ── Upcoming / Past tabs ─────────────────────────────────────────────── */}
      {!composing && (activeTab === 'upcoming' || activeTab === 'past') && (
        eventsLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.subtext} />
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 12, backgroundColor: colors.bg, flexGrow: 1 }}
            refreshControl={<RefreshControl
              refreshing={eventsRefreshing}
              onRefresh={() => { setEventsRefreshing(true); loadEvents(activeTab === 'upcoming' ? 'future' : 'past', true); }}
              tintColor={colors.subtext}
            />}
          >
            {events.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={styles.emptyText}>{zh ? '沒有活動' : 'No events'}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {events.map((item) => {
                  const dayStr = new Date(item.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
                  const timeStr = new Date(item.startAt).toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });
                  const isFree = !item.feeAmount;
                  const fee = item.feeAmount ? `${item.feeCurrency} ${item.feeAmount}` : (zh ? '免費' : 'Free');
                  const coverUrl = resolveImageUrl(item.coverImageUrl);
                  const isPast = activeTab === 'past';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => router.push(`/events/${item.id}`)}
                      style={{ width: tileSize, height: tileSize, borderRadius: 16, overflow: 'hidden', backgroundColor: INDIGO, opacity: isPast ? 0.75 : 1 }}
                      activeOpacity={0.85}
                    >
                      {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                      ) : null}
                      <View style={{ position: 'absolute', top: 8, right: 8 }}>
                        <View style={{ backgroundColor: isFree ? 'rgba(16,185,129,0.9)' : 'rgba(245,158,11,0.9)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{fee}</Text>
                        </View>
                      </View>
                      <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 10 }}>
                        <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 8 }}>
                          <Text style={{ color: '#A5B4FC', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                            {dayStr} · {timeStr}
                          </Text>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 16 }} numberOfLines={2}>{item.title}</Text>
                          {item.location ? (
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }} numberOfLines={1}>{item.location}</Text>
                          ) : null}
                          {item.groupName ? (
                            <Text style={{ color: '#A5B4FC', fontSize: 10, marginTop: 2 }} numberOfLines={1}>{item.groupName}</Text>
                          ) : null}
                          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>✓ {item.rsvpCounts.GOING}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )
      )}
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../context/theme.context').useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    backBtn: { color: INDIGO, fontSize: 17 },

    // Tab row
    tabRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 8,
    },
    tabPills: { flex: 1, flexDirection: 'row', gap: 6 },
    pill: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    pillActive: { backgroundColor: INDIGO, borderColor: INDIGO },
    pillText: { fontSize: 13, fontWeight: '600', color: colors.subtext },
    pillTextActive: { color: '#fff' },
    plusBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: INDIGO,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },

    // Compose
    composeScroll: { padding: 16, backgroundColor: colors.bg },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: colors.input, color: colors.inputText },
    multiline: { minHeight: 100, textAlignVertical: 'top' },
    imagePickerBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', marginTop: 10 },
    imagePickerPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
    imagePickerText: { fontSize: 13, color: colors.placeholder },
    imagePreview: { width: '100%', height: 160, resizeMode: 'cover' },
    submitBtn: { backgroundColor: INDIGO, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 14 },
    submitBtnText: { color: '#fff', fontWeight: '600' },

    // Feed
    container: { padding: 16, backgroundColor: colors.bg },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { color: colors.placeholder, textAlign: 'center', fontSize: 15 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    cardTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text, marginRight: 8 },
    groupBadge: { alignSelf: 'flex-start', backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
    groupBadgeText: { fontSize: 11, fontWeight: '500', color: INDIGO },
    cardBody: { fontSize: 14, color: colors.subtext, lineHeight: 20 },
    cardDate: { fontSize: 12, color: colors.placeholder, marginTop: 8 },
  });
}
