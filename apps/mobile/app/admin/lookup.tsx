import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import JLogo from '../../components/JLogo';
import { apiFetch } from '../../lib/api';

type UserRow = {
  id: string;
  displayName: string | null;
  email: string | null;
  phoneE164: string | null;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  lineUserId: string | null;
  _count?: { groupMemberships: number };
};

type GroupRow = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  discoverableBySearch?: boolean;
  _count: { memberships: number };
  createdBy: { id: string; displayName: string | null; email: string | null } | null;
};

type SearchResults = { users: UserRow[]; groups: GroupRow[] };
type PagedUsers = { total: number; page: number; pageSize: number; data: UserRow[] };
type PagedGroups = { total: number; page: number; pageSize: number; data: GroupRow[] };

const PAGE_SIZE = 30;
const INDIGO = '#4F46E5';

type Colors = ReturnType<typeof import('../../context/theme.context').useTheme>['colors'];

export default function AdminLookupScreen() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const router = useRouter();
  const zh = i18n.language === 'zh';
  const { colors } = useTheme();
  const { top: safeTop } = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab] = useState<'search' | 'users' | 'groups'>('search');
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'user' | 'group'>('all');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [usersPage, setUsersPage] = useState(1);
  const [usersData, setUsersData] = useState<PagedUsers | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsData, setGroupsData] = useState<PagedGroups | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') router.replace('/(tabs)/events' as any);
  }, [user]);

  useEffect(() => {
    if (tab !== 'search') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch<SearchResults>(`/admin/search?q=${encodeURIComponent(query)}&type=${searchType}`);
        setSearchResults(data);
      } catch { setSearchResults(null); }
      finally { setSearching(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchType, tab]);

  const loadUsers = async (page: number) => {
    setUsersLoading(true);
    try {
      const data = await apiFetch<PagedUsers>(`/admin/users?page=${page}&pageSize=${PAGE_SIZE}`);
      setUsersData(data);
      setUsersPage(page);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setUsersLoading(false); }
  };

  const loadGroups = async (page: number) => {
    setGroupsLoading(true);
    try {
      const data = await apiFetch<PagedGroups>(`/admin/groups?page=${page}&pageSize=${PAGE_SIZE}`);
      setGroupsData(data);
      setGroupsPage(page);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setGroupsLoading(false); }
  };

  useEffect(() => {
    if (tab === 'users' && !usersData) loadUsers(1);
    if (tab === 'groups' && !groupsData) loadGroups(1);
  }, [tab]);

  const confirmDeleteUser = (u: UserRow) => {
    Alert.alert(
      zh ? '刪除用戶' : 'Delete User',
      zh ? `確定要永久刪除「${u.displayName ?? u.email ?? u.id}」嗎？無法復原。` : `Permanently delete "${u.displayName ?? u.email ?? u.id}"? Cannot be undone.`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '刪除' : 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingId(u.id);
            try {
              await apiFetch(`/admin/users/${u.id}`, { method: 'DELETE' });
              setSearchResults((prev) => prev ? { ...prev, users: prev.users.filter((x) => x.id !== u.id) } : null);
              setUsersData((prev) => prev ? { ...prev, total: prev.total - 1, data: prev.data.filter((x) => x.id !== u.id) } : null);
            } catch (err: any) { Alert.alert('Error', err.message); }
            finally { setDeletingId(null); }
          },
        },
      ],
    );
  };

  const confirmDeleteGroup = (g: GroupRow) => {
    Alert.alert(
      zh ? '刪除群組' : 'Delete Group',
      zh ? `確定要永久刪除「${g.name}」嗎？無法復原。` : `Permanently delete "${g.name}"? Cannot be undone.`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '刪除' : 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingId(g.id);
            try {
              await apiFetch(`/admin/groups/${g.id}`, { method: 'DELETE' });
              setSearchResults((prev) => prev ? { ...prev, groups: prev.groups.filter((x) => x.id !== g.id) } : null);
              setGroupsData((prev) => prev ? { ...prev, total: prev.total - 1, data: prev.data.filter((x) => x.id !== g.id) } : null);
            } catch (err: any) { Alert.alert('Error', err.message); }
            finally { setDeletingId(null); }
          },
        },
      ],
    );
  };

  if (!user || user.role !== 'ADMIN') return null;

  const TABS = [
    { key: 'search' as const, label: zh ? '搜尋' : 'Search' },
    { key: 'users' as const,  label: zh ? '所有用戶' : 'All Users' },
    { key: 'groups' as const, label: zh ? '所有群組' : 'All Groups' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ backgroundColor: colors.headerBg, paddingTop: safeTop }}>
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => router.back()} style={{ minWidth: 60 }} activeOpacity={1}>
            <Text style={{ color: INDIGO, fontSize: 17 }}>‹ {zh ? '返回' : 'Back'}</Text>
          </TouchableOpacity>
          <JLogo />
          <View style={{ minWidth: 60 }} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>{zh ? '平台查詢' : 'Platform Lookup'}</Text>

        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'search' && (
          <View style={{ gap: 10 }}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={zh ? '輸入姓名、電子郵件、手機或群組名稱…' : 'Name, email, phone, or group name…'}
              placeholderTextColor={colors.placeholder}
              autoFocus
              clearButtonMode="while-editing"
            />
            <View style={styles.typeRow}>
              {(['all', 'user', 'group'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, searchType === type && styles.typeBtnActive]}
                  onPress={() => setSearchType(type)}
                >
                  <Text style={[styles.typeBtnText, searchType === type && styles.typeBtnTextActive]}>
                    {type === 'all' ? (zh ? '全部' : 'All') : type === 'user' ? (zh ? '用戶' : 'Users') : (zh ? '群組' : 'Groups')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {searching && <ActivityIndicator style={{ marginTop: 20 }} />}

            {!searching && searchResults && (
              <>
                {searchResults.users.length > 0 && (
                  <View>
                    <Text style={styles.sectionLabel}>{zh ? '用戶' : 'Users'} ({searchResults.users.length})</Text>
                    {searchResults.users.map((u) => (
                      <UserCard key={u.id} u={u} zh={zh} colors={colors} deleting={deletingId === u.id} onDelete={() => confirmDeleteUser(u)} />
                    ))}
                  </View>
                )}
                {searchResults.groups.length > 0 && (
                  <View>
                    <Text style={styles.sectionLabel}>{zh ? '群組' : 'Groups'} ({searchResults.groups.length})</Text>
                    {searchResults.groups.map((g) => (
                      <GroupCard key={g.id} g={g} zh={zh} colors={colors} deleting={deletingId === g.id} onDelete={() => confirmDeleteGroup(g)} onOpen={() => router.push(`/groups/${g.id}/settings` as any)} />
                    ))}
                  </View>
                )}
                {searchResults.users.length === 0 && searchResults.groups.length === 0 && (
                  <Text style={styles.empty}>{zh ? '找不到符合結果。' : 'No results found.'}</Text>
                )}
              </>
            )}
            {!query.trim() && !searchResults && (
              <Text style={styles.empty}>{zh ? '輸入關鍵字以搜尋。' : 'Type to search.'}</Text>
            )}
          </View>
        )}

        {tab === 'users' && (
          <View style={{ gap: 8 }}>
            {usersData && <Text style={styles.countLabel}>{zh ? `共 ${usersData.total} 位用戶` : `${usersData.total} total users`}</Text>}
            {usersLoading ? <ActivityIndicator style={{ marginTop: 30 }} /> : (
              <>
                {(usersData?.data ?? []).map((u) => (
                  <UserCard key={u.id} u={u} zh={zh} colors={colors} deleting={deletingId === u.id} onDelete={() => confirmDeleteUser(u)} />
                ))}
                {usersData && Math.ceil(usersData.total / PAGE_SIZE) > 1 && (
                  <PaginationBar page={usersPage} total={usersData.total} pageSize={PAGE_SIZE} zh={zh} colors={colors} onChange={loadUsers} />
                )}
              </>
            )}
          </View>
        )}

        {tab === 'groups' && (
          <View style={{ gap: 8 }}>
            {groupsData && <Text style={styles.countLabel}>{zh ? `共 ${groupsData.total} 個群組` : `${groupsData.total} total groups`}</Text>}
            {groupsLoading ? <ActivityIndicator style={{ marginTop: 30 }} /> : (
              <>
                {(groupsData?.data ?? []).map((g) => (
                  <GroupCard key={g.id} g={g} zh={zh} colors={colors} deleting={deletingId === g.id} onDelete={() => confirmDeleteGroup(g)} onOpen={() => router.push(`/groups/${g.id}/settings` as any)} />
                ))}
                {groupsData && Math.ceil(groupsData.total / PAGE_SIZE) > 1 && (
                  <PaginationBar page={groupsPage} total={groupsData.total} pageSize={PAGE_SIZE} zh={zh} colors={colors} onChange={loadGroups} />
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function UserCard({ u, zh, colors, deleting, onDelete }: { u: UserRow; zh: boolean; colors: Colors; deleting: boolean; onDelete: () => void }) {
  const cs = useMemo(() => makeCardStyles(colors), [colors]);
  return (
    <View style={cs.row}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={cs.name}>{u.displayName ?? <Text style={{ color: colors.placeholder, fontStyle: 'italic' }}>{zh ? '未設名稱' : 'No name'}</Text>}</Text>
          {u.role === 'ADMIN' && (
            <View style={cs.adminBadge}><Text style={cs.adminBadgeText}>{zh ? '平台管理員' : 'Admin'}</Text></View>
          )}
          {u.lineUserId && (
            <View style={cs.lineBadge}><Text style={cs.lineBadgeText}>LINE</Text></View>
          )}
        </View>
        <Text style={cs.meta}>{[u.email, u.phoneE164].filter(Boolean).join(' · ') || '—'}</Text>
        {u._count && (
          <Text style={cs.meta}>{u._count.groupMemberships} {zh ? '個群組' : 'groups'} · {new Date(u.createdAt).toLocaleDateString()}</Text>
        )}
      </View>
      <TouchableOpacity style={cs.deleteBtn} onPress={onDelete} disabled={deleting}>
        <Text style={cs.deleteBtnText}>{deleting ? '…' : (zh ? '刪除' : 'Delete')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function GroupCard({ g, zh, colors, deleting, onDelete, onOpen }: { g: GroupRow; zh: boolean; colors: Colors; deleting: boolean; onDelete: () => void; onOpen: () => void }) {
  const cs = useMemo(() => makeCardStyles(colors), [colors]);
  return (
    <View style={cs.row}>
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={onOpen}>
          <Text style={[cs.name, { color: INDIGO }]}>{g.name}</Text>
        </TouchableOpacity>
        <Text style={cs.meta}>
          {g._count.memberships} {zh ? '位成員' : 'members'}
          {g.createdBy ? ` · ${g.createdBy.displayName ?? g.createdBy.email ?? '—'}` : ''}
          {' · '}{new Date(g.createdAt).toLocaleDateString()}
        </Text>
        {g.discoverableBySearch === false && (
          <Text style={[cs.meta, { color: colors.placeholder }]}>{zh ? '私密群組' : 'Private'}</Text>
        )}
      </View>
      <TouchableOpacity style={cs.deleteBtn} onPress={onDelete} disabled={deleting}>
        <Text style={cs.deleteBtnText}>{deleting ? '…' : (zh ? '刪除' : 'Delete')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PaginationBar({ page, total, pageSize, zh, colors, onChange }: { page: number; total: number; pageSize: number; zh: boolean; colors: Colors; onChange: (p: number) => void }) {
  const cs = useMemo(() => makeCardStyles(colors), [colors]);
  const totalPages = Math.ceil(total / pageSize);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 }}>
      <TouchableOpacity style={[cs.pageBtn, page <= 1 && { opacity: 0.4 }]} onPress={() => onChange(page - 1)} disabled={page <= 1}>
        <Text style={cs.pageBtnText}>{zh ? '上一頁' : 'Prev'}</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 13, color: colors.subtext, alignSelf: 'center' }}>{page} / {totalPages}</Text>
      <TouchableOpacity style={[cs.pageBtn, page >= totalPages && { opacity: 0.4 }]} onPress={() => onChange(page + 1)} disabled={page >= totalPages}>
        <Text style={cs.pageBtnText}>{zh ? '下一頁' : 'Next'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    customHeader: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    container: { padding: 16, gap: 14, backgroundColor: colors.bg, flexGrow: 1 },
    pageTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
    tabRow: { flexDirection: 'row', gap: 8 },
    tabBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 8, alignItems: 'center', backgroundColor: colors.card },
    tabBtnActive: { borderColor: INDIGO, backgroundColor: '#EEF2FF' },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: colors.subtext },
    tabBtnTextActive: { color: '#4338CA' },
    searchInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
      color: colors.inputText, backgroundColor: colors.input,
    },
    typeRow: { flexDirection: 'row', gap: 8 },
    typeBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 7, alignItems: 'center', backgroundColor: colors.card },
    typeBtnActive: { borderColor: INDIGO, backgroundColor: '#EEF2FF' },
    typeBtnText: { fontSize: 12, color: colors.subtext, fontWeight: '500' },
    typeBtnTextActive: { color: '#4338CA', fontWeight: '700' },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.placeholder, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 8 },
    countLabel: { fontSize: 12, color: colors.placeholder },
    empty: { color: colors.placeholder, textAlign: 'center', marginTop: 30, fontSize: 14 },
  });
}

function makeCardStyles(colors: Colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
      padding: 12, marginBottom: 8,
    },
    name: { fontSize: 14, fontWeight: '600', color: colors.text },
    meta: { fontSize: 12, color: colors.subtext, marginTop: 2 },
    adminBadge: { backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    adminBadgeText: { fontSize: 10, fontWeight: '700', color: '#4338CA' },
    lineBadge: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    lineBadgeText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
    deleteBtn: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFF5F5' },
    deleteBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
    pageBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.card },
    pageBtnText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  });
}
