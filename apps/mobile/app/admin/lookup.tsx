import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/auth.context';
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

export default function AdminLookupScreen() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const router = useRouter();
  const zh = i18n.language === 'zh';

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

  // Debounced search
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>{zh ? '平台查詢' : 'Platform Lookup'}</Text>

      {/* Tab bar */}
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

      {/* ── Search tab ── */}
      {tab === 'search' && (
        <View style={{ gap: 10 }}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={zh ? '輸入姓名、電子郵件、手機或群組名稱…' : 'Name, email, phone, or group name…'}
            placeholderTextColor="#9CA3AF"
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
                    <UserCard key={u.id} u={u} zh={zh} deleting={deletingId === u.id} onDelete={() => confirmDeleteUser(u)} />
                  ))}
                </View>
              )}
              {searchResults.groups.length > 0 && (
                <View>
                  <Text style={styles.sectionLabel}>{zh ? '群組' : 'Groups'} ({searchResults.groups.length})</Text>
                  {searchResults.groups.map((g) => (
                    <GroupCard key={g.id} g={g} zh={zh} deleting={deletingId === g.id} onDelete={() => confirmDeleteGroup(g)} onOpen={() => router.push(`/groups/${g.id}/settings` as any)} />
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

      {/* ── All Users tab ── */}
      {tab === 'users' && (
        <View style={{ gap: 8 }}>
          {usersData && <Text style={styles.countLabel}>{zh ? `共 ${usersData.total} 位用戶` : `${usersData.total} total users`}</Text>}
          {usersLoading ? <ActivityIndicator style={{ marginTop: 30 }} /> : (
            <>
              {(usersData?.data ?? []).map((u) => (
                <UserCard key={u.id} u={u} zh={zh} deleting={deletingId === u.id} onDelete={() => confirmDeleteUser(u)} />
              ))}
              {usersData && Math.ceil(usersData.total / PAGE_SIZE) > 1 && (
                <PaginationBar page={usersPage} total={usersData.total} pageSize={PAGE_SIZE} zh={zh} onChange={loadUsers} />
              )}
            </>
          )}
        </View>
      )}

      {/* ── All Groups tab ── */}
      {tab === 'groups' && (
        <View style={{ gap: 8 }}>
          {groupsData && <Text style={styles.countLabel}>{zh ? `共 ${groupsData.total} 個群組` : `${groupsData.total} total groups`}</Text>}
          {groupsLoading ? <ActivityIndicator style={{ marginTop: 30 }} /> : (
            <>
              {(groupsData?.data ?? []).map((g) => (
                <GroupCard key={g.id} g={g} zh={zh} deleting={deletingId === g.id} onDelete={() => confirmDeleteGroup(g)} onOpen={() => router.push(`/groups/${g.id}/settings` as any)} />
              ))}
              {groupsData && Math.ceil(groupsData.total / PAGE_SIZE) > 1 && (
                <PaginationBar page={groupsPage} total={groupsData.total} pageSize={PAGE_SIZE} zh={zh} onChange={loadGroups} />
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function UserCard({ u, zh, deleting, onDelete }: { u: UserRow; zh: boolean; deleting: boolean; onDelete: () => void }) {
  return (
    <View style={cardStyles.row}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={cardStyles.name}>{u.displayName ?? <Text style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{zh ? '未設名稱' : 'No name'}</Text>}</Text>
          {u.role === 'ADMIN' && (
            <View style={cardStyles.adminBadge}><Text style={cardStyles.adminBadgeText}>{zh ? '平台管理員' : 'Admin'}</Text></View>
          )}
          {u.lineUserId && (
            <View style={cardStyles.lineBadge}><Text style={cardStyles.lineBadgeText}>LINE</Text></View>
          )}
        </View>
        <Text style={cardStyles.meta}>{[u.email, u.phoneE164].filter(Boolean).join(' · ') || '—'}</Text>
        {u._count && (
          <Text style={cardStyles.meta}>{u._count.groupMemberships} {zh ? '個群組' : 'groups'} · {new Date(u.createdAt).toLocaleDateString()}</Text>
        )}
      </View>
      <TouchableOpacity style={cardStyles.deleteBtn} onPress={onDelete} disabled={deleting}>
        <Text style={cardStyles.deleteBtnText}>{deleting ? '…' : (zh ? '刪除' : 'Delete')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function GroupCard({ g, zh, deleting, onDelete, onOpen }: { g: GroupRow; zh: boolean; deleting: boolean; onDelete: () => void; onOpen: () => void }) {
  return (
    <View style={cardStyles.row}>
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={onOpen}>
          <Text style={[cardStyles.name, { color: '#4F46E5' }]}>{g.name}</Text>
        </TouchableOpacity>
        <Text style={cardStyles.meta}>
          {g._count.memberships} {zh ? '位成員' : 'members'}
          {g.createdBy ? ` · ${g.createdBy.displayName ?? g.createdBy.email ?? '—'}` : ''}
          {' · '}{new Date(g.createdAt).toLocaleDateString()}
        </Text>
        {g.discoverableBySearch === false && (
          <Text style={[cardStyles.meta, { color: '#6B7280' }]}>{zh ? '私密群組' : 'Private'}</Text>
        )}
      </View>
      <TouchableOpacity style={cardStyles.deleteBtn} onPress={onDelete} disabled={deleting}>
        <Text style={cardStyles.deleteBtnText}>{deleting ? '…' : (zh ? '刪除' : 'Delete')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PaginationBar({ page, total, pageSize, zh, onChange }: { page: number; total: number; pageSize: number; zh: boolean; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 }}>
      <TouchableOpacity style={[cardStyles.pageBtn, page <= 1 && { opacity: 0.4 }]} onPress={() => onChange(page - 1)} disabled={page <= 1}>
        <Text style={cardStyles.pageBtnText}>{zh ? '上一頁' : 'Prev'}</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 13, color: '#6B7280', alignSelf: 'center' }}>{page} / {totalPages}</Text>
      <TouchableOpacity style={[cardStyles.pageBtn, page >= totalPages && { opacity: 0.4 }]} onPress={() => onChange(page + 1)} disabled={page >= totalPages}>
        <Text style={cardStyles.pageBtnText}>{zh ? '下一頁' : 'Next'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const INDIGO = '#4F46E5';
const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: '#F9FAFB' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' },
  tabBtnActive: { borderColor: INDIGO, backgroundColor: '#EEF2FF' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  tabBtnTextActive: { color: '#4338CA' },
  searchInput: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#111827', backgroundColor: '#fff',
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 7, alignItems: 'center', backgroundColor: '#fff' },
  typeBtnActive: { borderColor: INDIGO, backgroundColor: '#EEF2FF' },
  typeBtnText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  typeBtnTextActive: { color: '#4338CA', fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 8 },
  countLabel: { fontSize: 12, color: '#9CA3AF' },
  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 30, fontSize: 14 },
});

const cardStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 12,
  },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  adminBadge: { backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  adminBadgeText: { fontSize: 10, fontWeight: '700', color: '#4338CA' },
  lineBadge: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  lineBadgeText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  deleteBtn: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFF5F5' },
  deleteBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
  pageBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  pageBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
});
