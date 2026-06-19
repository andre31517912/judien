import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/auth.context';
import { useTheme } from '../context/theme.context';
import JLogo from '../components/JLogo';
import { apiFetch } from '../lib/api';

const INDIGO = '#4F46E5';

type NewsRow = {
  id: string; title: string; body: string; createdAt: string;
  createdBy: { displayName: string | null } | null;
  group: { id: string; name: string } | null;
};
type EventRow = {
  id: string; title: string; description: string | null; startAt: string;
  createdBy: { displayName: string | null } | null;
  group: { id: string; name: string } | null;
};
type GroupRow = {
  id: string; name: string; description: string;
  _count: { memberships: number };
};
type UserRow = {
  id: string; displayName: string | null; email: string | null; phoneE164: string | null;
  role: 'ADMIN' | 'USER'; createdAt: string; lineUserId: string | null;
};
type Results = { users?: UserRow[]; groups: GroupRow[]; news: NewsRow[]; events: EventRow[] };

type Colors = ReturnType<typeof import('../context/theme.context').useTheme>['colors'];

export default function SearchScreen() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const zh = i18n.language === 'zh';
  const isAdmin = user?.role === 'ADMIN';
  const { colors, isDark } = useTheme();
  const { top: safeTop } = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [query, setQuery] = useState(params.q ?? '');
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const endpoint = isAdmin
          ? `/admin/search?q=${encodeURIComponent(query)}&type=all`
          : `/search?q=${encodeURIComponent(query)}`;
        const data = await apiFetch<Results>(endpoint);
        setResults(data);
      } catch { setResults(null); }
      finally { setLoading(false); }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, isAdmin]);

  const confirmDelete = (label: string, onConfirm: () => Promise<void>) => {
    Alert.alert(zh ? '確認刪除' : 'Confirm Delete', label, [
      { text: zh ? '取消' : 'Cancel', style: 'cancel' },
      { text: zh ? '刪除' : 'Delete', style: 'destructive', onPress: () => { onConfirm().catch(() => {}); } },
    ]);
  };

  const del = async (endpoint: string, onSuccess: () => void) => {
    try {
      await apiFetch(endpoint, { method: 'DELETE' });
      onSuccess();
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setDeletingId(null); }
  };

  const deleteUser = (u: UserRow) => confirmDelete(
    zh ? `確定要永久刪除「${u.displayName ?? u.email}」嗎？` : `Delete "${u.displayName ?? u.email}"?`,
    async () => { setDeletingId(u.id); await del(`/admin/users/${u.id}`, () => setResults((p) => p ? { ...p, users: p.users?.filter((x) => x.id !== u.id) } : null)); },
  );

  const deleteNews = (n: NewsRow) => {
    const title = n.title;
    confirmDelete(
      zh ? `確定要永久刪除貼文「${title}」嗎？` : `Delete post "${title}"?`,
      async () => { setDeletingId(n.id); await del(`/admin/news/${n.id}`, () => setResults((p) => p ? { ...p, news: p.news.filter((x) => x.id !== n.id) } : null)); },
    );
  };

  const deleteEvent = (e: EventRow) => confirmDelete(
    zh ? `確定要永久刪除活動「${e.title}」嗎？` : `Delete event "${e.title}"?`,
    async () => { setDeletingId(e.id); await del(`/admin/events/${e.id}`, () => setResults((p) => p ? { ...p, events: p.events.filter((x) => x.id !== e.id) } : null)); },
  );

  const deleteGroup = (g: GroupRow) => confirmDelete(
    zh ? `確定要永久刪除群組「${g.name}」嗎？` : `Delete group "${g.name}"?`,
    async () => { setDeletingId(g.id); await del(`/admin/groups/${g.id}`, () => setResults((p) => p ? { ...p, groups: p.groups.filter((x) => x.id !== g.id) } : null)); },
  );

  const total = results
    ? (results.users?.length ?? 0) + results.news.length + results.events.length + results.groups.length
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.headerBg, paddingTop: safeTop }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color={INDIGO} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={zh ? '搜尋…' : 'Search…'}
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults(null); }} style={{ marginLeft: 8 }} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={colors.placeholder} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loading && <ActivityIndicator style={{ marginTop: 40 }} color={colors.subtext} />}

        {!loading && !query.trim() && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>{zh ? '輸入關鍵字以搜尋。' : 'Type to search across all content.'}</Text>
          </View>
        )}

        {!loading && query.trim() && results && total === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>{zh ? `找不到「${query}」的相關結果` : `No results for "${query}"`}</Text>
          </View>
        )}

        {!loading && results && total > 0 && (
          <View style={{ gap: 24 }}>
            {/* Users (admin only) */}
            {isAdmin && (results.users?.length ?? 0) > 0 && (
              <View>
                <Text style={styles.sectionLabel}>{zh ? '用戶' : 'Users'} · {results.users!.length}</Text>
                {results.users!.map((u) => (
                  <Card key={u.id} colors={colors}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{u.displayName ?? <Text style={{ color: colors.placeholder, fontStyle: 'italic' }}>{zh ? '未設名稱' : 'No name'}</Text>}</Text>
                        {u.role === 'ADMIN' && <Badge label={zh ? '管理員' : 'Admin'} isDark={isDark} />}
                      </View>
                      <Text style={styles.cardMeta}>{[u.email, u.phoneE164].filter(Boolean).join(' · ') || '—'}</Text>
                    </View>
                    <DeleteBtn deleting={deletingId === u.id} zh={zh} onPress={() => deleteUser(u)} />
                  </Card>
                ))}
              </View>
            )}

            {/* Posts */}
            {results.news.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>{zh ? '貼文' : 'Posts'} · {results.news.length}</Text>
                {results.news.map((n) => (
                  <Card key={n.id} colors={colors}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                      <Text style={styles.cardSub} numberOfLines={2}>{n.body}</Text>
                      <Text style={styles.cardMeta}>{n.createdBy?.displayName ?? '—'}{n.group ? ` · ${n.group.name}` : ''}</Text>
                    </View>
                    {isAdmin
                      ? <DeleteBtn deleting={deletingId === n.id} zh={zh} onPress={() => deleteNews(n)} />
                      : <TouchableOpacity onPress={() => router.push(`/(tabs)/groups/${n.group?.id}/news/${n.id}` as any)} activeOpacity={0.7}>
                          <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
                        </TouchableOpacity>
                    }
                  </Card>
                ))}
              </View>
            )}

            {/* Events */}
            {results.events.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>{zh ? '活動' : 'Events'} · {results.events.length}</Text>
                {results.events.map((e) => (
                  <Card key={e.id} colors={colors}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{e.title}</Text>
                      {e.description ? <Text style={styles.cardSub} numberOfLines={1}>{e.description}</Text> : null}
                      <Text style={styles.cardMeta}>{e.createdBy?.displayName ?? '—'}{e.group ? ` · ${e.group.name}` : ''} · {new Date(e.startAt).toLocaleDateString()}</Text>
                    </View>
                    {isAdmin
                      ? <DeleteBtn deleting={deletingId === e.id} zh={zh} onPress={() => deleteEvent(e)} />
                      : <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
                    }
                  </Card>
                ))}
              </View>
            )}

            {/* Groups */}
            {results.groups.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>{zh ? '群組' : 'Groups'} · {results.groups.length}</Text>
                {results.groups.map((g) => (
                  <Card key={g.id} colors={colors}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: INDIGO }]} numberOfLines={1}>{g.name}</Text>
                      {g.description ? <Text style={styles.cardSub} numberOfLines={1}>{g.description}</Text> : null}
                      <Text style={styles.cardMeta}>{g._count.memberships} {zh ? '位成員' : 'members'}</Text>
                    </View>
                    {isAdmin
                      ? <DeleteBtn deleting={deletingId === g.id} zh={zh} onPress={() => deleteGroup(g)} />
                      : <TouchableOpacity onPress={() => router.push(`/(tabs)/groups/${g.id}` as any)} activeOpacity={0.7}>
                          <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
                        </TouchableOpacity>
                    }
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Card({ colors, children }: { colors: Colors; children: React.ReactNode }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      padding: 12, marginBottom: 8,
    }}>
      {children}
    </View>
  );
}

function Badge({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <View style={{ backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#818CF8' : '#4338CA' }}>{label}</Text>
    </View>
  );
}

function DeleteBtn({ deleting, zh, onPress }: { deleting: boolean; zh: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={deleting}
      style={{ borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FFF5F5' }}
    >
      <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>{deleting ? '…' : (zh ? '刪除' : 'Del')}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors: Colors, isDark: boolean) {
  return StyleSheet.create({
    header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    backBtn: { padding: 4 },
    searchInput: { flex: 1, fontSize: 16, color: colors.inputText, backgroundColor: isDark ? colors.input : '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    container: { padding: 16, gap: 0, flexGrow: 1 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.placeholder, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
    cardSub: { fontSize: 12, color: colors.subtext, marginTop: 2 },
    cardMeta: { fontSize: 11, color: colors.placeholder, marginTop: 2 },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 36, marginBottom: 12, opacity: 0.5 },
    emptyText: { color: colors.placeholder, fontSize: 14, textAlign: 'center' },
  });
}
