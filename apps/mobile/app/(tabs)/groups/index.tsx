import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { apiFetch } from '../../../lib/api';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/theme.context';

type GroupListItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    photoUrl?: string | null;
  };
  membership: {
    role: 'GROUP_ADMIN' | 'GROUP_MEMBER';
    status: 'ACCEPTED' | 'PENDING' | 'DECLINED' | 'REMOVED';
    joinedAt: string | null;
  };
};

type InviteItem = {
  id: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expiresAt: string;
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
  };
};

type GroupSearchResult = {
  id: string;
  pid: string;
  name: string;
  description: string;
};

export default function GroupsTab() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const zh = i18n.language === 'zh';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GroupSearchResult[]>([]);

  const loadPage = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [myGroups, myInvites] = await Promise.all([
        apiFetch<GroupListItem[]>('/groups/me'),
        apiFetch<InviteItem[]>('/groups/invitations/me'),
      ]);
      setGroups(myGroups.filter((g) => g.membership.status === 'ACCEPTED'));
      setInvites(myInvites.filter((inv) => inv.status === 'PENDING'));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const respondInvite = async (token: string, action: 'accept' | 'decline') => {
    try {
      await apiFetch(`/groups/invitations/${token}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await loadPage(false);
      Alert.alert('', action === 'accept' ? (zh ? '已接受邀請' : 'Invitation accepted') : (zh ? '已拒絕邀請' : 'Invitation declined'));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to respond to invitation');
    }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const found = await apiFetch<GroupSearchResult[]>(`/groups/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(found);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const requestJoin = async (groupId: string) => {
    try {
      await apiFetch(`/groups/${groupId}/join-requests`, {
        method: 'POST',
        body: JSON.stringify({ note: '' }),
      });
      Alert.alert('', zh ? '加入申請已送出' : 'Join request sent');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send join request');
    }
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.subtext} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPage(false); }} tintColor={colors.subtext} />}
    >
      <Stack.Screen options={{ title: zh ? '我的群組' : 'My Groups' }} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>{zh ? '我的群組' : 'My Groups'}</Text>
        <TouchableOpacity style={styles.createGroupBtn} onPress={() => router.push('/admin/groups/new')}>
          <Text style={styles.createGroupBtnText}>{zh ? '+ 建立群組' : '+ Create Group'}</Text>
        </TouchableOpacity>
      </View>

      {invites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{zh ? `待回覆邀請 (${invites.length})` : `Pending Invitations (${invites.length})`}</Text>
          {invites.map((inv) => (
            <View key={inv.id} style={styles.card}>
              <Text style={styles.cardTitle}>{inv.group.name}</Text>
              {inv.group.description ? <Text style={styles.cardSub}>{inv.group.description}</Text> : null}
              <Text style={styles.metaText}>{zh ? '到期：' : 'Expires: '}{new Date(inv.expiresAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => respondInvite(inv.token, 'accept')}>
                  <Text style={styles.primaryBtnText}>{zh ? '接受' : 'Accept'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => respondInvite(inv.token, 'decline')}>
                  <Text style={styles.secondaryBtnText}>{zh ? '拒絕' : 'Decline'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{zh ? '我的群組' : 'My Groups'}</Text>
        {groups.length === 0 ? (
          <Text style={styles.emptyText}>{zh ? '目前尚未加入任何群組。' : 'You have not joined any groups yet.'}</Text>
        ) : groups.map((item) => (
          <TouchableOpacity key={item.group.id} style={styles.card} onPress={() => router.push(`/groups/${item.group.id}`)}>
            <View style={styles.cardRow}>
              {item.group.photoUrl ? (
                <Image source={{ uri: item.group.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{item.group.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.group.name}</Text>
                {item.group.description ? <Text style={styles.cardSub} numberOfLines={1}>{item.group.description}</Text> : null}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{zh ? '搜尋群組' : 'Search Group'}</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={zh ? '輸入群組名稱' : 'Group name'}
            style={styles.searchInput}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={runSearch} disabled={searching || !searchQuery.trim()}>
            <Text style={styles.primaryBtnText}>{searching ? (zh ? '搜尋中…' : 'Searching…') : (zh ? '搜尋' : 'Search')}</Text>
          </TouchableOpacity>
        </View>

        {searchResults.map((g) => {
          const alreadyMember = groups.some((m) => m.group.id === g.id);
          return (
            <View key={g.id} style={styles.card}>
              <Text style={styles.cardTitle}>{g.name}</Text>
              {g.description ? <Text style={styles.cardSub}>{g.description}</Text> : null}
              {alreadyMember ? (
                <Text style={styles.okText}>{zh ? '你已是此群組成員' : 'You are already a member'}</Text>
              ) : (
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => requestJoin(g.id)}>
                  <Text style={styles.secondaryBtnText}>{zh ? '申請加入' : 'Request to Join'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    container: { padding: 16, gap: 16, backgroundColor: colors.bg, flexGrow: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 24, fontWeight: '700', color: colors.text },
    createGroupBtn: { backgroundColor: '#4F46E5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    createGroupBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    section: { gap: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
      gap: 6,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardContent: { flex: 1, gap: 4 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { fontSize: 18, fontWeight: '700', color: '#4F46E5' },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
    cardSub: { fontSize: 13, color: colors.subtext },
    metaText: { fontSize: 12, color: colors.placeholder },
    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    primaryBtn: { backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
    primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    secondaryBtn: { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
    secondaryBtnText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    searchInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.input,
      paddingHorizontal: 10,
      paddingVertical: 10,
      color: colors.inputText,
      fontSize: 14,
    },
    emptyText: { color: colors.placeholder, fontSize: 14 },
    okText: { color: '#047857', fontSize: 12, fontWeight: '600' },
  });
}
