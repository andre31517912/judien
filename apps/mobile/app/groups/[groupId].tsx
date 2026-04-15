import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../lib/api';
import type { EventWithCounts, GroupMessage, News, PaginatedResponse } from '@judien/shared';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/auth.context';
import DateTimeField from '../../components/DateTimeField';

type GroupListItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    memberDataPrivate: boolean;
  };
  membership: {
    role: 'GROUP_ADMIN' | 'MEMBER';
    status: 'ACCEPTED' | 'PENDING' | 'DECLINED' | 'REMOVED';
    joinedAt: string | null;
  };
};

type GroupMember = {
  userId: string;
  displayName: string | null;
  role: 'GROUP_ADMIN' | 'MEMBER';
  joinedAt: string | null;
  email: string | null;
  phoneE164: string | null;
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
  const zh = i18n.language === 'zh';

  const [loading, setLoading] = useState(true);
  const [groupItem, setGroupItem] = useState<GroupListItem | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [chatBody, setChatBody] = useState('');
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [relationships, setRelationships] = useState<GroupRelationships | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);

  const isGroupAdmin = useMemo(() => groupItem?.membership.role === 'GROUP_ADMIN', [groupItem]);

  const loadPage = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [myGroups, memberList, groupNews, groupEvents, relationshipData] = await Promise.all([
        apiFetch<GroupListItem[]>('/groups/me'),
        apiFetch<GroupMember[]>(`/groups/${groupId}/members`),
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
      const messageRes = await apiFetch<PaginatedResponse<GroupMessage>>(
        `/groups/${groupId}/messages?page=1&pageSize=100`,
      ).catch(() => ({ data: [] as GroupMessage[] } as PaginatedResponse<GroupMessage>));
      setMessages(messageRes.data);

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

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const removeMember = (memberUserId: string) => {
    if (!groupId) return;
    Alert.alert(
      zh ? '移除成員' : 'Remove Member',
      zh ? '確定要移除此成員？' : 'Are you sure you want to remove this member?',
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '移除' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/groups/${groupId}/members/${memberUserId}`, { method: 'DELETE' });
              await loadPage();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to remove member');
            }
          },
        },
      ],
    );
  };

  const changeMemberRole = (memberUserId: string, currentRole: 'GROUP_ADMIN' | 'MEMBER') => {
    if (!groupId) return;
    const newRole = currentRole === 'GROUP_ADMIN' ? 'MEMBER' : 'GROUP_ADMIN';
    const title = newRole === 'GROUP_ADMIN'
      ? (zh ? '升為管理員' : 'Promote to Admin')
      : (zh ? '降為成員' : 'Demote to Member');
    const message = newRole === 'GROUP_ADMIN'
      ? (zh ? '確定要將此成員升為群組管理員？' : 'Promote this member to Group Admin?')
      : (zh ? '確定要將此管理員降為成員？' : 'Demote this admin to Member?');
    Alert.alert(title, message, [
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
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to change role');
          }
        },
      },
    ]);
  };

  const sendGroupMessage = async () => {
    if (!groupId || !chatBody.trim()) return;
    setChatSubmitting(true);
    try {
      const created = await apiFetch<GroupMessage>(`/groups/${groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: chatBody.trim() }),
      });
      setMessages((prev) => [...prev, created]);
      setChatBody('');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send message');
    } finally {
      setChatSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!groupItem) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{zh ? '找不到群組或您尚未加入' : 'Group not found or you are not a member'}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: groupItem.group.name }} />

      <View style={styles.headerCard}>
        <Text style={styles.groupTitle}>{groupItem.group.name}</Text>
        <Text style={styles.groupPid}>PID: {groupItem.group.pid}</Text>
        {groupItem.group.description ? <Text style={styles.groupDesc}>{groupItem.group.description}</Text> : null}
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{isGroupAdmin ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '群組成員' : 'Member')}</Text>
        </View>
      </View>

      {relationships && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{zh ? '群組層級' : 'Group Hierarchy'}</Text>
          {relationships.lineage && relationships.lineage.length > 0 && (
            <View style={styles.inlineRow}>
              {relationships.lineage.map((node, idx) => (
                <Text key={node.id} style={styles.inlineMeta}>
                  {idx > 0 ? ' > ' : ''}
                  {node.name}
                </Text>
              ))}
            </View>
          )}
          <Text style={styles.inlineMeta}>
            {relationships.parentGroup ? `${zh ? '上層：' : 'Parent: '}${relationships.parentGroup.name}` : (zh ? '上層：無' : 'Parent: none')}
          </Text>
          <Text style={styles.inlineMeta}>
            {relationships.subgroups.length > 0
              ? `${zh ? '下層：' : 'Children: '}${relationships.subgroups.map((g) => g.name).join(', ')}`
              : (zh ? '下層：無' : 'Children: none')}
          </Text>
        </View>
      )}

      {isGroupAdmin && (
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push(`/groups/${groupId}/settings`)}
        >
          <Text style={styles.settingsBtnText}>
            ⚙️ {zh ? '群組設定' : 'Group Settings'}
            {joinRequests.length > 0 ? ` (${joinRequests.length})` : ''}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{zh ? '群組公告' : 'Group News'}</Text>
        {news.length === 0 ? (
          <Text style={styles.emptyText}>{zh ? '目前沒有公告' : 'No news yet'}</Text>
        ) : news.map((item) => (
          <View key={item.id} style={styles.inlineCard}>
            <Text style={styles.inlineTitle}>{zh ? item.title_zh : item.title_en}</Text>
            <Text style={styles.inlineBody}>{zh ? item.body_zh : item.body_en}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{zh ? '即將到來的活動' : 'Upcoming Events'}</Text>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>{zh ? '目前沒有活動' : 'No upcoming events'}</Text>
        ) : events.map((ev) => (
          <TouchableOpacity key={ev.id} style={styles.inlineCard} onPress={() => router.push(`/events/${ev.id}`)}>
            <Text style={styles.inlineTitle}>{zh ? ev.title_zh : ev.title_en}</Text>
            <Text style={styles.inlineMeta}>{new Date(ev.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US')}</Text>
            {(zh ? ev.location_zh : ev.location_en) ? <Text style={styles.inlineBody}>{zh ? ev.location_zh : ev.location_en}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{zh ? '群組聊天室' : 'Group Chat'}</Text>
        <View style={styles.chatListCard}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>{zh ? '聊天室目前沒有訊息' : 'No chat messages yet'}</Text>
          ) : messages.map((msg) => {
            const mine = msg.userId === user?.id;
            return (
              <View
                key={msg.id}
                style={[styles.chatBubble, mine ? styles.chatBubbleMine : styles.chatBubbleOther]}
              >
                <Text style={[styles.chatUser, mine && styles.chatUserMine]}>{msg.userHandle}</Text>
                <Text style={[styles.chatBody, mine && styles.chatBodyMine]}>{msg.body}</Text>
                <Text style={[styles.chatTime, mine && styles.chatTimeMine]}>
                  {new Date(msg.createdAt).toLocaleString(zh ? 'zh-TW' : 'en-US')}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.chatInputRow}>
          <TextInput
            value={chatBody}
            onChangeText={setChatBody}
            placeholder={zh ? '輸入訊息…' : 'Type a message...'}
            style={[styles.input, styles.chatInput]}
            placeholderTextColor="#9CA3AF"
            multiline
          />
          <TouchableOpacity
            style={[styles.primaryBtn, styles.chatSendBtn, (!chatBody.trim() || chatSubmitting) && styles.disabledBtn]}
            onPress={sendGroupMessage}
            disabled={!chatBody.trim() || chatSubmitting}
          >
            <Text style={styles.primaryBtnText}>{chatSubmitting ? (zh ? '傳送中…' : 'Sending…') : (zh ? '送出' : 'Send')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeaderToggle}
          onPress={() => setMembersOpen((v) => !v)}
        >
          <Text style={styles.sectionTitle}>{zh ? '成員名單' : 'Members'}</Text>
          <Text style={styles.toggleIcon}>{membersOpen ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {membersOpen && (
          <>
            {groupItem.group.memberDataPrivate && !isGroupAdmin ? (
              <Text style={styles.emptyText}>{zh ? '此群組成員資料為私人' : 'Member directory is private for this group'}</Text>
            ) : members.map((m) => (
              <View key={m.userId} style={styles.inlineCard}>
                <Text style={styles.inlineTitle}>{m.displayName || m.email || m.userId}</Text>
                <Text style={styles.inlineMeta}>{m.role === 'GROUP_ADMIN' ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '成員' : 'Member')}</Text>
                {isGroupAdmin && (
                  <View style={styles.adminMemberRow}>
                    <Text style={styles.inlineMeta}>{m.email || ''} {m.phoneE164 || ''}</Text>
                    {m.userId !== user?.id && (
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={styles.promoteBtnSmall}
                          onPress={() => changeMemberRole(m.userId, m.role)}
                        >
                          <Text style={styles.promoteBtnTextSmall}>
                            {m.role === 'GROUP_ADMIN' ? (zh ? '降為成員' : 'Demote') : (zh ? '升為管理員' : 'Promote')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryBtnSmall} onPress={() => removeMember(m.userId)}>
                          <Text style={styles.secondaryBtnTextSmall}>{zh ? '移除' : 'Remove'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  container: { padding: 16, gap: 14, backgroundColor: '#F9FAFB', flexGrow: 1 },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    gap: 4,
  },
  groupTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  groupPid: { fontSize: 12, color: '#6B7280' },
  groupDesc: { fontSize: 13, color: '#4B5563' },
  roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#4338CA' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  subtleTitle: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 14,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  inlineRow: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  pillActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  pillText: { color: '#4B5563', fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: '#4338CA' },
  primaryBtn: { backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  primaryBtnSmall: { backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  primaryBtnTextSmall: { color: '#fff', fontSize: 12, fontWeight: '700' },
  secondaryBtnSmall: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  secondaryBtnTextSmall: { color: '#374151', fontSize: 12, fontWeight: '700' },
  inlineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    gap: 4,
  },
  inlineTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  inlineMeta: { fontSize: 12, color: '#6B7280' },
  inlineBody: { fontSize: 13, color: '#374151' },
  emptyText: { color: '#9CA3AF', fontSize: 13 },
  adminMemberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  settingsBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  settingsBtnText: { color: '#4338CA', fontWeight: '700', fontSize: 14 },
  promoteBtnSmall: { borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#EEF2FF' },
  promoteBtnTextSmall: { color: '#4338CA', fontSize: 12, fontWeight: '700' },
  sectionHeaderToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleIcon: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  chatListCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    gap: 8,
    maxHeight: 360,
  },
  chatBubble: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '88%',
  },
  chatBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#4F46E5',
  },
  chatBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
  },
  chatUser: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  chatUserMine: { color: '#C7D2FE' },
  chatBody: { fontSize: 13, color: '#111827', marginTop: 2 },
  chatBodyMine: { color: '#fff' },
  chatTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  chatTimeMine: { color: '#C7D2FE' },
  chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  chatInput: { flex: 1, minHeight: 44, maxHeight: 120 },
  chatSendBtn: { paddingHorizontal: 14, minWidth: 76 },
  disabledBtn: { opacity: 0.5 },
});
