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
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../../lib/api';
import type { EventWithCounts, News, PaginatedResponse } from '@judien/shared';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/auth.context';
import { useTheme } from '../../../context/theme.context';

type GroupListItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    photoUrl: string | null;
  };
  membership: {
    role: 'GROUP_ADMIN' | 'GROUP_MEMBER';
    status: 'ACCEPTED' | 'PENDING' | 'DECLINED' | 'REMOVED';
    joinedAt: string | null;
  };
};

type GroupMember = {
  userId: string;
  groupNickname: string | null;
  displayName: string | null;
  role: 'GROUP_ADMIN' | 'GROUP_MEMBER';
  userRole: 'ADMIN' | 'USER';
  joinedAt: string | null;
  email: string | null;
  phoneE164: string | null;
  childGroupId: string | null;
  childGroupName: string | null;
};

type JoinRequest = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  requester: {
    id: string;
    displayName: string | null;
    email: string;
  };
};

type GroupRelationshipNode = { id: string; name: string; description?: string };
type GroupRelationships = {
  parentGroup: GroupRelationshipNode | null;
  subgroups: GroupRelationshipNode[];
  lineage?: GroupRelationshipNode[];
  tree?: Array<GroupRelationshipNode & { children: GroupRelationshipNode[] }>;
};

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const zh = i18n.language === 'zh';

  type Tab = 'feed' | 'upcoming' | 'past' | 'members';

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('feed');
  const [groupItem, setGroupItem] = useState<GroupListItem | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithCounts[]>([]);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [relationships, setRelationships] = useState<GroupRelationships | null>(null);

  const [memberSearch, setMemberSearch] = useState('');
  const [editingNicknameFor, setEditingNicknameFor] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const isGroupAdmin = useMemo(() => groupItem?.membership.role === 'GROUP_ADMIN', [groupItem]);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const loadPage = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [myGroups, memberList, groupNews, groupEvents, relationshipData] = await Promise.all([
        apiFetch<GroupListItem[]>('/groups/me'),
        apiFetch<GroupMember[]>(`/groups/${groupId}/members?includeChildGroups=true`),
        apiFetch<News[]>(`/news?groupId=${groupId}`),
        apiFetch<PaginatedResponse<EventWithCounts>>(`/events?scope=future&groupId=${groupId}&page=1&pageSize=20`),
        apiFetch<GroupRelationships>(`/groups/${groupId}/relationships`).catch(() => null),
      ]);

      const current = myGroups.find((item) => item.group.id === groupId) ?? null;
      setGroupItem(current);
      setMembers(memberList);
      setNews(groupNews);
      setEvents(groupEvents.data);
      setRelationships(relationshipData);

      if (current?.membership.role === 'GROUP_ADMIN') {
        const requestsRes = await apiFetch<JoinRequest[]>(`/groups/${groupId}/join-requests`).catch(() => [] as JoinRequest[]);
        setJoinRequests((requestsRes ?? []).filter((req) => req.status === 'PENDING'));
      } else {
        setJoinRequests([]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { loadPage(); }, [loadPage]);

  const loadPastEvents = useCallback(async () => {
    if (!groupId || pastLoaded) return;
    setPastLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<EventWithCounts>>(
        `/events?scope=past&groupId=${groupId}&page=1&pageSize=40`,
      );
      setPastEvents(res.data);
      setPastLoaded(true);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load past events');
    } finally {
      setPastLoading(false);
    }
  }, [groupId, pastLoaded]);

  useEffect(() => { if (tab === 'past') loadPastEvents(); }, [tab, loadPastEvents]);

  const removeMember = (memberUserId: string) => {
    if (!groupId) return;
    Alert.alert(
      zh ? '移除成員' : 'Remove Member',
      zh ? '確定要移除此成員？' : 'Are you sure you want to remove this member?',
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '移除' : 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/groups/${groupId}/members/${memberUserId}`, { method: 'DELETE' });
              await loadPage();
            } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to remove member'); }
          },
        },
      ],
    );
  };

  const changeMemberRole = (memberUserId: string, currentRole: 'GROUP_ADMIN' | 'GROUP_MEMBER') => {
    if (!groupId) return;
    const newRole = currentRole === 'GROUP_ADMIN' ? 'GROUP_MEMBER' : 'GROUP_ADMIN';
    Alert.alert(
      newRole === 'GROUP_ADMIN' ? (zh ? '升為管理員' : 'Promote to Admin') : (zh ? '降為成員' : 'Demote to Member'),
      newRole === 'GROUP_ADMIN'
        ? (zh ? '確定要將此成員升為群組管理員？' : 'Promote this member to Group Admin?')
        : (zh ? '確定要將此管理員降為成員？' : 'Demote this admin to Member?'),
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '確認' : 'Confirm',
          onPress: async () => {
            try {
              await apiFetch(`/groups/${groupId}/members/${memberUserId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole }),
              });
              await loadPage();
            } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to change role'); }
          },
        },
      ],
    );
  };

  const handleSaveNickname = async (targetUserId: string) => {
    if (!groupId) return;
    setNicknameSaving(true);
    try {
      const endpoint = targetUserId === user?.id
        ? `/groups/${groupId}/members/me/nickname`
        : `/groups/${groupId}/members/${targetUserId}/nickname`;
      await apiFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ groupNickname: nicknameInput.trim() || null }),
      });
      setMembers((prev) =>
        prev.map((m) => m.userId === targetUserId ? { ...m, groupNickname: nicknameInput.trim() || null } : m),
      );
      setEditingNicknameFor(null);
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to save nickname'); }
    finally { setNicknameSaving(false); }
  };

  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    return [...members]
      .filter((m) => {
        if (!term) return true;
        return (
          (m.groupNickname ?? '').toLowerCase().includes(term) ||
          (m.displayName ?? '').toLowerCase().includes(term) ||
          (m.email ?? '').toLowerCase().includes(term) ||
          (m.phoneE164 ?? '').includes(term)
        );
      })
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === 'GROUP_ADMIN' ? -1 : 1;
        const na = (a.groupNickname ?? a.displayName ?? a.email ?? '').toLowerCase();
        const nb = (b.groupNickname ?? b.displayName ?? b.email ?? '').toLowerCase();
        return na.localeCompare(nb);
      });
  }, [members, memberSearch]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.subtext} /></View>;
  }

  if (!groupItem) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{zh ? '找不到群組或您尚未加入' : 'Group not found or you are not a member'}</Text>
      </View>
    );
  }

  const TABS: { key: Tab; label: string; labelZh: string }[] = [
    { key: 'feed',     label: 'Feed',     labelZh: '動態' },
    { key: 'upcoming', label: 'Upcoming', labelZh: '即將到來' },
    { key: 'past',     label: 'Past',     labelZh: '過去活動' },
    { key: 'members',  label: 'Members',  labelZh: '成員' },
  ];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '', headerLeft: () => null, gestureEnabled: true }} />

      {/* ── Group photo banner ── */}
      {groupItem.group.photoUrl && (
        <View style={[styles.photoBanner, { backgroundColor: colors.border }]}>
          <Image source={{ uri: groupItem.group.photoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        </View>
      )}

      {/* ── Group header ── */}
      <View style={styles.coverHeader}>
        <View style={styles.coverContent}>
          <View style={styles.coverLeft}>
            <Text style={styles.groupTitle} numberOfLines={2}>{groupItem.group.name}</Text>
            {groupItem.group.description ? (
              <Text style={styles.groupDesc}>{groupItem.group.description}</Text>
            ) : null}
            {relationships?.lineage && relationships.lineage.length > 1 && (
              <Text style={styles.breadcrumb}>
                {relationships.lineage.map((n) => n.name).join(' › ')}
              </Text>
            )}
          </View>
          {isGroupAdmin && (
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => router.push(`/groups/${groupId}/settings`)}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsBtnText}>⚙️</Text>
              {joinRequests.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{joinRequests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {zh ? t.labelZh : t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Feed ── */}
      {tab === 'feed' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          {news.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📢</Text>
              <Text style={styles.emptyText}>{zh ? '目前沒有公告' : 'No announcements yet'}</Text>
            </View>
          ) : news.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{zh ? item.title_zh : item.title_en}</Text>
              <Text style={styles.cardBody}>{zh ? item.body_zh : item.body_en}</Text>
              <Text style={styles.cardMeta}>
                {item.createdBy?.displayName ? `${item.createdBy.displayName} · ` : ''}
                {new Date(item.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Upcoming ── */}
      {tab === 'upcoming' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          {events.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyText}>{zh ? '目前沒有即將到來的活動' : 'No upcoming events'}</Text>
            </View>
          ) : events.map((ev) => (
            <TouchableOpacity key={ev.id} style={styles.card} onPress={() => router.push(`/events/${ev.id}`)}>
              <Text style={styles.cardTitle}>{zh ? ev.title_zh : ev.title_en}</Text>
              <Text style={styles.cardMeta}>
                {new Date(ev.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
              {(zh ? ev.location_zh : ev.location_en) ? (
                <Text style={styles.cardMeta}>{zh ? ev.location_zh : ev.location_en}</Text>
              ) : null}
              {ev.feeAmount != null && Number(ev.feeAmount) > 0 && (
                <Text style={styles.feeTag}>{ev.feeAmount} {ev.feeCurrency}</Text>
              )}
              <Text style={styles.rsvpRow}>✓ {ev.rsvpCounts.GOING}  ✗ {ev.rsvpCounts.NO}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Past ── */}
      {tab === 'past' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          {pastLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.subtext} />
          ) : pastEvents.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🕐</Text>
              <Text style={styles.emptyText}>{zh ? '沒有過去的活動記錄' : 'No past events'}</Text>
            </View>
          ) : pastEvents.map((ev) => (
            <TouchableOpacity key={ev.id} style={[styles.card, styles.cardPast]} onPress={() => router.push(`/events/${ev.id}`)}>
              <Text style={[styles.cardTitle, styles.cardTitlePast]}>{zh ? ev.title_zh : ev.title_en}</Text>
              <Text style={styles.cardMeta}>
                {new Date(ev.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
              {(zh ? ev.location_zh : ev.location_en) ? (
                <Text style={styles.cardMeta}>{zh ? ev.location_zh : ev.location_en}</Text>
              ) : null}
              <Text style={styles.rsvpRow}>✓ {ev.rsvpCounts.GOING}  ✗ {ev.rsvpCounts.NO}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Members ── */}
      {tab === 'members' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          <TextInput
            style={styles.searchInput}
            value={memberSearch}
            onChangeText={setMemberSearch}
            placeholder={zh ? '搜尋成員…' : 'Search members…'}
            placeholderTextColor={colors.placeholder}
            clearButtonMode="while-editing"
          />

          <Text style={styles.memberCount}>
            {members.length} {zh ? '位成員' : 'members'}
          </Text>

          {filteredMembers.length === 0 ? (
            <Text style={styles.emptyText}>{memberSearch ? (zh ? '找不到符合結果。' : 'No matches.') : (zh ? '目前沒有成員。' : 'No members yet.')}</Text>
          ) : filteredMembers.map((m) => {
            const isOwnRow = m.userId === user?.id;
            const isEditing = editingNicknameFor === m.userId;
            const shownName = m.groupNickname ?? m.displayName ?? m.email ?? m.userId;
            return (
              <View key={m.userId} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  {isEditing ? (
                    <View style={{ gap: 6 }}>
                      <TextInput
                        style={styles.nicknameInput}
                        value={nicknameInput}
                        onChangeText={setNicknameInput}
                        placeholder={zh ? '群組暱稱（留空清除）' : 'In-group nickname (blank to clear)'}
                        placeholderTextColor={colors.placeholder}
                        autoFocus
                        maxLength={100}
                      />
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.smallBtn, styles.smallBtnPrimary]}
                          onPress={() => handleSaveNickname(m.userId)}
                          disabled={nicknameSaving}
                        >
                          <Text style={styles.smallBtnPrimaryText}>{nicknameSaving ? '…' : (zh ? '儲存' : 'Save')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.smallBtn} onPress={() => setEditingNicknameFor(null)}>
                          <Text style={styles.smallBtnText}>{zh ? '取消' : 'Cancel'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.memberName}>{shownName}</Text>
                        {m.groupNickname && m.displayName && m.groupNickname !== m.displayName && (
                          <Text style={styles.memberNameSub}>({m.displayName})</Text>
                        )}
                        <View style={[styles.rolePill, m.role === 'GROUP_ADMIN' ? styles.rolePillAdmin : styles.rolePillMember]}>
                          <Text style={[styles.rolePillText, m.role === 'GROUP_ADMIN' ? styles.rolePillTextAdmin : styles.rolePillTextMember]}>
                            {m.role === 'GROUP_ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '成員' : 'Member')}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.memberRole}>
                        {m.joinedAt ? `${zh ? '加入於' : 'Joined'} ${new Date(m.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}` : ''}
                      </Text>
                      {isGroupAdmin && (m.email || m.phoneE164) ? (
                        <Text style={styles.memberContact}>{[m.email, m.phoneE164].filter(Boolean).join(' · ')}</Text>
                      ) : null}
                    </>
                  )}
                </View>
                {!isEditing && (
                  <View style={{ gap: 4 }}>
                    {isGroupAdmin && isOwnRow && (
                      <TouchableOpacity
                        style={styles.smallBtn}
                        onPress={() => { setEditingNicknameFor(m.userId); setNicknameInput(m.groupNickname ?? ''); }}
                      >
                        <Text style={styles.smallBtnText}>{zh ? '改名' : 'Rename'}</Text>
                      </TouchableOpacity>
                    )}
                    {isGroupAdmin && !isOwnRow && (
                      <View style={{ gap: 4 }}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }]}
                          onPress={() => { setEditingNicknameFor(m.userId); setNicknameInput(m.groupNickname ?? ''); }}
                        >
                          <Text style={[styles.smallBtnText, { color: '#4338CA' }]}>{zh ? '改名' : 'Rename'}</Text>
                        </TouchableOpacity>
                        <View style={styles.memberActions}>
                          <TouchableOpacity style={styles.promoteBtn} onPress={() => changeMemberRole(m.userId, m.role)}>
                            <Text style={styles.promoteBtnText}>
                              {m.role === 'GROUP_ADMIN' ? (zh ? '降級' : 'Demote') : (zh ? '升級' : 'Promote')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.removeBtn} onPress={() => removeMember(m.userId)}>
                            <Text style={styles.removeBtnText}>{zh ? '移除' : 'Remove'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const INDIGO = '#4F46E5';

function makeStyles(colors: ReturnType<typeof import('../../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.bg },

    photoBanner: { width: '100%', height: 130 },

    coverHeader: {
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
    },
    coverContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    coverLeft: { flex: 1, gap: 4 },
    groupTitle: { fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 28 },
    groupDesc: { fontSize: 13, color: colors.subtext, lineHeight: 18 },
    breadcrumb: { fontSize: 11, color: colors.placeholder },
    settingsBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    settingsBtnText: { fontSize: 18 },
    badge: {
      position: 'absolute', top: -2, right: -2,
      backgroundColor: '#EF4444', borderRadius: 999,
      minWidth: 16, height: 16,
      alignItems: 'center', justifyContent: 'center', padding: 2,
    },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

    tabBar: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    tabScroll: { paddingHorizontal: 8 },
    tabItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: INDIGO },
    tabText: { fontSize: 14, color: colors.subtext, fontWeight: '500' },
    tabTextActive: { color: INDIGO, fontWeight: '700' },

    tabContent: { padding: 16, gap: 12, paddingBottom: 40 },

    card: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 4,
    },
    cardPast: { opacity: 0.75 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    cardTitlePast: { color: colors.subtext },
    cardBody: { fontSize: 14, color: colors.text, lineHeight: 20 },
    cardMeta: { fontSize: 12, color: colors.placeholder },
    feeTag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '700', color: '#B45309', backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    rsvpRow: { fontSize: 12, color: colors.placeholder, marginTop: 2 },

    emptyBox: { alignItems: 'center', marginTop: 40, gap: 10 },
    emptyEmoji: { fontSize: 40 },
    emptyText: { color: colors.placeholder, textAlign: 'center', fontSize: 14 },

    searchInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: colors.inputText, backgroundColor: colors.input,
      marginBottom: 4,
    },

    memberCard: {
      backgroundColor: colors.card, borderRadius: 12, padding: 12,
      flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    memberInfo: { flex: 1, gap: 2 },
    memberName: { fontSize: 14, fontWeight: '600', color: colors.text },
    memberNameSub: { fontSize: 12, color: colors.placeholder },
    memberRole: { fontSize: 12, color: colors.subtext },
    memberContact: { fontSize: 11, color: colors.placeholder },
    memberCount: { fontSize: 12, color: colors.placeholder, marginBottom: 4 },
    memberActions: { flexDirection: 'row', gap: 6, marginTop: 2 },

    rolePill: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    rolePillAdmin: { backgroundColor: '#EEF2FF' },
    rolePillMember: { backgroundColor: colors.border },
    rolePillText: { fontSize: 10, fontWeight: '700' },
    rolePillTextAdmin: { color: '#4338CA' },
    rolePillTextMember: { color: colors.subtext },

    nicknameInput: {
      borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: colors.inputText, backgroundColor: colors.input,
    },
    smallBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    smallBtnPrimary: { backgroundColor: INDIGO, borderColor: INDIGO },
    smallBtnText: { fontSize: 11, fontWeight: '600', color: colors.text },
    smallBtnPrimaryText: { fontSize: 11, fontWeight: '700', color: '#fff' },

    promoteBtn: { borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EEF2FF' },
    promoteBtnText: { fontSize: 11, fontWeight: '700', color: '#4338CA' },
    removeBtn: { borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FEF2F2' },
    removeBtnText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  });
}
