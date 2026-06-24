import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import JLogo from '../../../components/JLogo';
import { apiFetch, apiUpload } from '../../../lib/api';
import * as ImagePicker from 'expo-image-picker';
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
  const navigation = useNavigation();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const zh = i18n.language === 'zh';

  type Tab = 'feed' | 'upcoming' | 'past' | 'members';

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('feed');
  const [groupItem, setGroupItem] = useState<GroupListItem | null>(null);
  const [hasPendingJoinRequest, setHasPendingJoinRequest] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithCounts[]>([]);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [relationships, setRelationships] = useState<GroupRelationships | null>(null);

  const [showHierarchy, setShowHierarchy] = useState(false);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);

  const [memberSearch, setMemberSearch] = useState('');
  const [editingNicknameFor, setEditingNicknameFor] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  const [composingNews, setComposingNews] = useState(false);
  const [newsBody, setNewsBody] = useState('');
  const [newsCoverUri, setNewsCoverUri] = useState<string | null>(null);
  const [newsSubmitting, setNewsSubmitting] = useState(false);
  const isGroupAdmin = useMemo(() => groupItem?.membership.role === 'GROUP_ADMIN', [groupItem]);
  const canManageGroup = useMemo(() => isGroupAdmin || user?.role === 'ADMIN', [isGroupAdmin, user?.role]);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // Build the Tabs JS header (no system tap-highlight). Re-runs when isGroupAdmin or badge count changes.
  const configureHeader = useCallback(() => {
    navigation.getParent()?.setOptions({
      headerShown: true,
      headerTitle: () => <JLogo />,
      headerStyle: { backgroundColor: colors.headerBg },
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color={INDIGO} />
          <Text style={{ color: INDIGO, fontSize: 17 }}>{zh ? '返回' : 'Back'}</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 8 }}>
          <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ padding: 8 }}>
            <Ionicons name="search" size={24} color={INDIGO} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [zh, colors.headerBg, colors.text, canManageGroup, joinRequests.length, groupId]);

  useFocusEffect(useCallback(() => {
    configureHeader();
    loadPage();
    return () => {
      navigation.getParent()?.setOptions({ headerLeft: undefined, headerRight: undefined });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configureHeader]));

  // Re-configure when async data loads while screen is already focused
  useEffect(() => {
    configureHeader();
  }, [configureHeader]);

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

      let current = myGroups.find((item) => item.group.id === groupId) ?? null;
      setMyGroupIds(myGroups.map((g) => g.group.id));
      setMembers(memberList);
      setNews(groupNews);
      setEvents(groupEvents.data);
      setRelationships(relationshipData);

      // Platform admins who aren't group members still get full admin view.
      if (!current && user?.role === 'ADMIN') {
        const groupInfo = await apiFetch<{ id: string; pid: string; name: string; description: string; photoUrl: string | null }>(`/groups/${groupId}/info`);
        current = {
          group: groupInfo,
          membership: { role: 'GROUP_ADMIN', status: 'ACCEPTED', joinedAt: null },
        };
      }

      setGroupItem(current);

      if (!current) {
        const myRequests = await apiFetch<{ groupId: string; status: string }[]>('/groups/my-join-requests').catch(() => [] as { groupId: string; status: string }[]);
        setHasPendingJoinRequest(myRequests.some((r) => r.groupId === groupId && r.status === 'PENDING'));
      } else {
        setHasPendingJoinRequest(false);
      }

      if (current?.membership.role === 'GROUP_ADMIN' || user?.role === 'ADMIN') {
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

  const doPickNewsImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!status || status !== 'granted') { Alert.alert('', zh ? '需要相簿權限' : 'Photo library permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.5 });
    if (!result.canceled && result.assets[0]) setNewsCoverUri(result.assets[0].uri);
  };

  const pickNewsImage = async () => {
    if (newsCoverUri) {
      Alert.alert(
        zh ? '封面圖片' : 'Cover Photo',
        undefined,
        [
          { text: zh ? '移除圖片' : 'Remove', style: 'destructive', onPress: () => setNewsCoverUri(null) },
          { text: zh ? '更換圖片' : 'Replace', onPress: doPickNewsImage },
          { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    await doPickNewsImage();
  };

  const submitNews = async () => {
    if (!newsBody.trim()) { Alert.alert('', zh ? '請輸入內容' : 'Please enter content.'); return; }
    setNewsSubmitting(true);
    try {
      let coverImageUrl: string | null = null;
      if (newsCoverUri) { const up = await apiUpload(newsCoverUri); coverImageUrl = up.url; }
      const created = await apiFetch<News>('/news', {
        method: 'POST',
        body: JSON.stringify({ body: newsBody.trim(), groupId, coverImageUrl }),
      });
      setNews((prev) => [created, ...prev]);
      setNewsBody(''); setNewsCoverUri(null); setComposingNews(false);
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to post.'); }
    finally { setNewsSubmitting(false); }
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

  if (loading && !groupItem) {
    return <View style={styles.center}><ActivityIndicator color={colors.subtext} /></View>;
  }

  if (!groupItem) {
    return (
      <View style={styles.center}>
        {hasPendingJoinRequest ? (
          <>
            <Text style={[styles.emptyText, { fontSize: 40, marginBottom: 12 }]}>⏳</Text>
            <Text style={[styles.emptyText, { fontWeight: '600', marginBottom: 6 }]}>
              {zh ? '申請審核中' : 'Request Pending'}
            </Text>
            <Text style={[styles.emptyText, { fontSize: 13, textAlign: 'center', maxWidth: 260 }]}>
              {zh ? '您的加入申請已送出，等待群組管理員審核。' : 'Your join request has been submitted and is awaiting admin approval.'}
            </Text>
          </>
        ) : (
          <Text style={styles.emptyText}>{zh ? '找不到群組或您尚未加入' : 'Group not found or you are not a member'}</Text>
        )}
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
      <Stack.Screen options={{ gestureEnabled: true }} />

      {/* ── Group photo banner ── */}
      {groupItem.group.photoUrl ? (
        <View style={[styles.photoBanner, { backgroundColor: colors.border }]}>
          <Image source={{ uri: groupItem.group.photoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        </View>
      ) : (
        <View style={[styles.photoBanner, styles.photoBannerPlaceholder]}>
          <Text style={styles.photoBannerIcon}>👥</Text>
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
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowHierarchy(true)}
              style={styles.hierarchyBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="git-network-outline" size={16} color={INDIGO} />
            </TouchableOpacity>
            {canManageGroup && (
              <TouchableOpacity
                onPress={() => router.push(`/groups/${groupId}/settings`)}
                style={styles.gearBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={16} color={colors.subtext} />
                {joinRequests.length > 0 && (
                  <View style={styles.gearBadge}>
                    <Text style={styles.gearBadgeText}>{joinRequests.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <View style={styles.tabPillWrap}>
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
        {canManageGroup && (tab === 'feed' || tab === 'upcoming' || tab === 'past') && (
          <TouchableOpacity
            style={styles.tabAddBtn}
            onPress={() => {
              if (tab === 'feed') { setComposingNews(true); }
              else { router.push(`/admin/events/new?groupId=${groupId}` as any); }
            }}
            accessibilityLabel={zh ? '新增' : 'Add'}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Feed ── */}
      {tab === 'feed' && (
        <ScrollView contentContainerStyle={styles.tabContent} keyboardShouldPersistTaps="handled">
          {composingNews && (
            <View style={styles.composeBox}>
              <TextInput
                style={styles.composeBody}
                value={newsBody}
                onChangeText={setNewsBody}
                placeholder={zh ? '有什麼想說的…' : "What's on your mind…"}
                placeholderTextColor={colors.placeholder}
                multiline
                textAlignVertical="top"
                maxLength={5000}
                autoFocus
              />
              <TouchableOpacity style={styles.composeImageBtn} onPress={pickNewsImage} activeOpacity={0.7}>
                {newsCoverUri ? (
                  <Image source={{ uri: newsCoverUri }} style={styles.composeImagePreview} />
                ) : (
                  <View style={styles.composeImagePlaceholder}>
                    <Ionicons name="image-outline" size={18} color={colors.placeholder} />
                    <Text style={styles.composeImageHint}>{zh ? '新增圖片（選填）' : 'Add image (optional)'}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.composeBtn, (newsSubmitting || !newsBody.trim()) && { opacity: 0.6 }]}
                  onPress={submitNews}
                  disabled={newsSubmitting || !newsBody.trim()}
                >
                  <Text style={styles.composeBtnText}>{newsSubmitting ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布' : 'Post')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.composeCancelBtn} onPress={() => { setComposingNews(false); setNewsBody(''); setNewsCoverUri(null); }}>
                  <Text style={styles.composeCancelText}>{zh ? '取消' : 'Cancel'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {news.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📢</Text>
              <Text style={styles.emptyText}>{zh ? '目前沒有公告' : 'No announcements yet'}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {news.map((item) => {
                const hash = item.id.charCodeAt(0) + (item.id.charCodeAt(2) ?? 0);
                const gradColors: [string, string][] = [
                  ['#7C3AED','#4F46E5'],['#E11D48','#DB2777'],['#0D9488','#0891B2'],
                  ['#D97706','#EA580C'],['#059669','#16A34A'],['#0284C7','#2563EB'],
                  ['#A21CAF','#7C3AED'],
                ];
                const [c1] = gradColors[hash % gradColors.length];
                const tileSize = (Dimensions.get('window').width - 48) / 2;
                return (
                  <TouchableOpacity key={item.id} onPress={() => router.push(`/(tabs)/groups/${groupId}/news/${item.id}` as any)} activeOpacity={0.9} style={{ width: tileSize, height: tileSize, borderRadius: 16, overflow: 'hidden', backgroundColor: c1 }}>
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' }} />
                    <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 18 }} numberOfLines={4}>
                        {item.title}
                      </Text>
                      <View>
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }} numberOfLines={2}>
                          {item.body}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 4 }}>
                          {item.createdBy?.displayName ?? ''}{item.createdBy?.displayName ? ' · ' : ''}
                          {new Date(item.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {events.map((ev) => {
                const tileSize = (Dimensions.get('window').width - 48) / 2;
                const dayStr = new Date(ev.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
                const timeStr = new Date(ev.startAt).toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });
                const isFree = !ev.feeAmount;
                const fee = ev.feeAmount ? `${ev.feeCurrency} ${ev.feeAmount}` : (zh ? '免費' : 'Free');
                return (
                  <TouchableOpacity key={ev.id} onPress={() => router.push(`/(tabs)/groups/${groupId}/events/${ev.id}` as any)} style={{ width: tileSize, height: tileSize, borderRadius: 16, overflow: 'hidden', backgroundColor: '#4F46E5' }} activeOpacity={0.85}>
                    {ev.coverImageUrl ? (
                      <Image source={{ uri: ev.coverImageUrl.startsWith('http') ? ev.coverImageUrl : `${process.env.EXPO_PUBLIC_API_URL ?? ''}${ev.coverImageUrl}` }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    ) : null}
                    <View style={{ position: 'absolute', top: 8, right: 8 }}>
                      <View style={{ backgroundColor: isFree ? 'rgba(16,185,129,0.9)' : 'rgba(245,158,11,0.9)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{fee}</Text>
                      </View>
                    </View>
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0)', justifyContent: 'flex-end', padding: 10 }}>
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 8 }}>
                        <Text style={{ color: '#A5B4FC', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{dayStr} · {timeStr}</Text>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 16 }} numberOfLines={2}>{ev.title}</Text>
                        {ev.location ? (
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }} numberOfLines={1}>{ev.location}</Text>
                        ) : null}
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>✓ {ev.rsvpCounts.GOING}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {pastEvents.map((ev) => {
                const tileSize = (Dimensions.get('window').width - 48) / 2;
                const dayStr = new Date(ev.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' });
                const timeStr = new Date(ev.startAt).toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });
                const isFree = !ev.feeAmount;
                const fee = ev.feeAmount ? `${ev.feeCurrency} ${ev.feeAmount}` : (zh ? '免費' : 'Free');
                return (
                  <TouchableOpacity key={ev.id} onPress={() => router.push(`/(tabs)/groups/${groupId}/events/${ev.id}` as any)} style={{ width: tileSize, height: tileSize, borderRadius: 16, overflow: 'hidden', backgroundColor: '#4F46E5', opacity: 0.75 }} activeOpacity={0.85}>
                    {ev.coverImageUrl ? (
                      <Image source={{ uri: ev.coverImageUrl.startsWith('http') ? ev.coverImageUrl : `${process.env.EXPO_PUBLIC_API_URL ?? ''}${ev.coverImageUrl}` }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    ) : null}
                    <View style={{ position: 'absolute', top: 8, right: 8 }}>
                      <View style={{ backgroundColor: isFree ? 'rgba(16,185,129,0.9)' : 'rgba(245,158,11,0.9)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{fee}</Text>
                      </View>
                    </View>
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0)', justifyContent: 'flex-end', padding: 10 }}>
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 8 }}>
                        <Text style={{ color: '#A5B4FC', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{dayStr} · {timeStr}</Text>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 16 }} numberOfLines={2}>{ev.title}</Text>
                        {ev.location ? (
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }} numberOfLines={1}>{ev.location}</Text>
                        ) : null}
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>✓ {ev.rsvpCounts.GOING}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Hierarchy Modal ── */}
      <Modal visible={showHierarchy} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHierarchy(false)}>
        <View style={[styles.hierModalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.hierModalTitle, { color: colors.text }]}>{zh ? '群組層級' : 'Group Hierarchy'}</Text>
          <TouchableOpacity onPress={() => setShowHierarchy(false)} style={styles.hierModalClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={colors.subtext} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {!relationships ? (
            <Text style={{ color: colors.placeholder, textAlign: 'center', marginTop: 40 }}>{zh ? '無層級資料' : 'No hierarchy data'}</Text>
          ) : (() => {
            const lineage = relationships.lineage ?? [];
            const tree = relationships.tree ?? [];
            const ancestors = lineage.filter((n) => n.id !== groupId);
            return (
              <View style={{ gap: 6 }}>
                {/* Legend */}
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: INDIGO }} />
                    <Text style={{ fontSize: 11, color: colors.subtext }}>{zh ? '目前群組' : 'Current'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border }} />
                    <Text style={{ fontSize: 11, color: colors.subtext }}>{zh ? '其他群組' : 'Other group'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border }} />
                    <Text style={{ fontSize: 11, color: colors.subtext }}>{zh ? '未加入' : 'Not joined'}</Text>
                  </View>
                </View>

                {/* Ancestor chain */}
                {ancestors.map((ancestor, i) => {
                  const isMember = myGroupIds.includes(ancestor.id);
                  return (
                    <View key={ancestor.id} style={{ marginLeft: i * 16 }}>
                      {isMember ? (
                        <TouchableOpacity
                          onPress={() => { setShowHierarchy(false); router.push(`/(tabs)/groups/${ancestor.id}` as any); }}
                          style={[styles.hierNode, { borderColor: colors.border, backgroundColor: colors.card }]}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.hierNodeText, { color: colors.text }]} numberOfLines={1}>{ancestor.name}</Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.placeholder} />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.hierNode, { borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.bg }]}>
                          <Text style={[styles.hierNodeText, { color: colors.placeholder }]} numberOfLines={1}>{ancestor.name}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Current group */}
                <View style={{ marginLeft: ancestors.length * 16 }}>
                  <View style={[styles.hierNode, { borderColor: INDIGO, borderWidth: 2, backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]}>
                    <Text style={[styles.hierNodeText, { color: isDark ? '#A5B4FC' : '#4338CA', fontWeight: '700' }]} numberOfLines={1}>{groupItem.group.name}</Text>
                    <View style={{ backgroundColor: INDIGO, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{zh ? '目前' : 'YOU'}</Text>
                    </View>
                  </View>
                </View>

                {/* Children */}
                {tree.map((child) => {
                  const isMember = myGroupIds.includes(child.id);
                  return (
                    <View key={child.id} style={{ marginLeft: (ancestors.length + 1) * 16, gap: 6 }}>
                      {isMember ? (
                        <TouchableOpacity
                          onPress={() => { setShowHierarchy(false); router.push(`/(tabs)/groups/${child.id}` as any); }}
                          style={[styles.hierNode, { borderColor: colors.border, backgroundColor: colors.card }]}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.hierNodeText, { color: colors.text }]} numberOfLines={1}>{child.name}</Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.placeholder} />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.hierNode, { borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.bg }]}>
                          <Text style={[styles.hierNodeText, { color: colors.placeholder }]} numberOfLines={1}>{child.name}</Text>
                        </View>
                      )}
                      {child.children?.map((grandchild) => {
                        const gcMember = myGroupIds.includes(grandchild.id);
                        return (
                          <View key={grandchild.id} style={{ marginLeft: 16 }}>
                            {gcMember ? (
                              <TouchableOpacity
                                onPress={() => { setShowHierarchy(false); router.push(`/(tabs)/groups/${grandchild.id}` as any); }}
                                style={[styles.hierNode, { borderColor: colors.border, backgroundColor: colors.card }]}
                                activeOpacity={0.75}
                              >
                                <Text style={[styles.hierNodeText, { color: colors.text }]} numberOfLines={1}>{grandchild.name}</Text>
                                <Ionicons name="chevron-forward" size={14} color={colors.placeholder} />
                              </TouchableOpacity>
                            ) : (
                              <View style={[styles.hierNode, { borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.bg }]}>
                                <Text style={[styles.hierNodeText, { color: colors.placeholder }]} numberOfLines={1}>{grandchild.name}</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}

                {ancestors.length === 0 && tree.length === 0 && (
                  <Text style={{ color: colors.placeholder, textAlign: 'center', marginTop: 20, fontSize: 13 }}>
                    {zh ? '此群組目前沒有上下層群組' : 'This group has no parent or child groups yet'}
                  </Text>
                )}
              </View>
            );
          })()}
        </ScrollView>
      </Modal>

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
                      {canManageGroup && (m.email || m.phoneE164) ? (
                        <Text style={styles.memberContact}>{[m.email, m.phoneE164].filter(Boolean).join(' · ')}</Text>
                      ) : null}
                    </>
                  )}
                </View>
                {!isEditing && canManageGroup && (
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={styles.renameBtn}
                      onPress={() => { setEditingNicknameFor(m.userId); setNicknameInput(m.groupNickname ?? ''); }}
                    >
                      <Text style={styles.renameBtnText}>{zh ? '改名' : 'Rename'}</Text>
                    </TouchableOpacity>
                    {!isOwnRow && (
                      <>
                        <TouchableOpacity style={styles.promoteBtn} onPress={() => changeMemberRole(m.userId, m.role)}>
                          <Text style={styles.promoteBtnText}>
                            {m.role === 'GROUP_ADMIN' ? (zh ? '降級' : 'Demote') : (zh ? '升級' : 'Promote')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.removeBtn} onPress={() => removeMember(m.userId)}>
                          <Text style={styles.removeBtnText}>{zh ? '移除' : 'Remove'}</Text>
                        </TouchableOpacity>
                      </>
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

function makeStyles(colors: ReturnType<typeof import('../../../context/theme.context').useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.bg },

    photoBanner: { width: '100%', height: 130 },
    photoBannerPlaceholder: { backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    photoBannerIcon: { fontSize: 40, opacity: 0.5 },

    tabAddBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: INDIGO, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

    composeBox: {
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border, gap: 6,
    },
    composeTitle: {
      borderBottomWidth: 1, borderColor: colors.border,
      paddingVertical: 6, fontSize: 15, fontWeight: '600', color: colors.text,
    },
    composeBody: {
      minHeight: 80, fontSize: 14, color: colors.text,
      paddingTop: 6,
    },
    composeImageBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', marginTop: 8 },
    composeImagePlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
    composeImageHint: { fontSize: 12, color: colors.placeholder },
    composeImagePreview: { width: '100%', height: 140, resizeMode: 'cover' },
    composeBtn: { backgroundColor: INDIGO, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
    composeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    composeCancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
    composeCancelText: { color: colors.subtext, fontSize: 13 },

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

    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
    hierarchyBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#4338CA' : '#C7D2FE', backgroundColor: isDark ? 'rgba(79,70,229,0.15)' : '#EEF2FF' },
    gearBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    gearBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#EF4444', borderRadius: 999, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
    gearBadgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },

    hierModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    hierModalTitle: { fontSize: 17, fontWeight: '700' },
    hierModalClose: { padding: 4 },
    hierNode: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    hierNodeText: { fontSize: 14, fontWeight: '500', flex: 1 },

    tabBar: { backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    tabPillWrap: { flex: 1, backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderRadius: 12, padding: 4 },
    tabScroll: { flexDirection: 'row', gap: 4 },
    tabItem: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    tabItemActive: { backgroundColor: isDark ? '#111827' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
    tabText: { fontSize: 13, color: colors.subtext, fontWeight: '500' },
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
    cardEditRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 },
    cardEditText: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },

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
      backgroundColor: colors.bg,
      flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
      paddingHorizontal: 0, paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    memberInfo: { flex: 1, gap: 2 },
    memberName: { fontSize: 14, fontWeight: '600', color: colors.text },
    memberNameSub: { fontSize: 12, color: colors.placeholder },
    memberRole: { fontSize: 12, color: colors.subtext },
    memberContact: { fontSize: 11, color: colors.placeholder },
    memberCount: { fontSize: 12, color: colors.placeholder, marginBottom: 4 },
    memberActions: { flexDirection: 'row', gap: 6, marginTop: 2 },

    rolePill: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    rolePillAdmin: { backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF' },
    rolePillMember: { backgroundColor: colors.border },
    rolePillText: { fontSize: 10, fontWeight: '700' },
    rolePillTextAdmin: { color: isDark ? '#818CF8' : '#4338CA' },
    rolePillTextMember: { color: colors.subtext },

    nicknameInput: {
      borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: colors.inputText, backgroundColor: colors.input,
    },
    smallBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
    smallBtnPrimary: { backgroundColor: INDIGO, borderColor: INDIGO },
    smallBtnText: { fontSize: 11, fontWeight: '600', color: colors.text },
    smallBtnPrimaryText: { fontSize: 11, fontWeight: '700', color: '#fff' },

    renameBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.card },
    renameBtnText: { fontSize: 11, fontWeight: '700', color: colors.text },
    promoteBtn: { borderWidth: 1, borderColor: isDark ? '#4338CA' : '#C7D2FE', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF' },
    promoteBtnText: { fontSize: 11, fontWeight: '700', color: isDark ? '#818CF8' : '#4338CA' },
    removeBtn: { borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FEF2F2' },
    removeBtnText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  });
}
