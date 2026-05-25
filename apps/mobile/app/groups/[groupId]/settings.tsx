import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimeField from '../../../components/DateTimeField';
import { apiFetch } from '../../../lib/api';

type PendingInvite = {
  id: string;
  email: string | null;
  phoneE164: string | null;
  status: string;
  expiresAt: string;
};

type JoinRequest = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  requester: { id: string; displayName: string | null; email: string };
};

type Tab = 'general' | 'invite' | 'news' | 'event' | 'requests';

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  const [tab, setTab] = useState<Tab>('general');

  const [discoverableBySearch, setDiscoverableBySearch] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const [newsTitle, setNewsTitle] = useState('');
  const [newsBody, setNewsBody] = useState('');
  const [newsSubmitting, setNewsSubmitting] = useState(false);

  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartAt, setEventStartAt] = useState('');
  const [eventEndAt, setEventEndAt] = useState('');
  const [eventTimezone, setEventTimezone] = useState('Asia/Taipei');
  const [eventFeeAmount, setEventFeeAmount] = useState('');
  const [eventFeeCurrency, setEventFeeCurrency] = useState('TWD');
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  const loadData = async () => {
    if (!groupId) return;
    try {
      const [myGroups, invData, reqData] = await Promise.all([
        apiFetch<Array<{ group: { discoverableBySearch: boolean } }>>('/groups/me'),
        apiFetch<PendingInvite[]>(`/groups/${groupId}/invites`).catch(() => []),
        apiFetch<JoinRequest[]>(`/groups/${groupId}/join-requests`).catch(() => []),
      ]);
      const current = myGroups.find((m: any) => m.group.id === groupId);
      if (current) {
        setDiscoverableBySearch(current.group.discoverableBySearch);
      }
      setPendingInvites((invData ?? []).filter((inv) => inv.status === 'PENDING'));
      setJoinRequests((reqData ?? []).filter((req) => req.status === 'PENDING'));
    } catch {
      setPendingInvites([]);
      setJoinRequests([]);
    }
  };

  useEffect(() => { loadData(); }, [groupId]);

  const submitInvite = async () => {
    if (!groupId) return;
    if (!inviteEmail.trim() && !invitePhone.trim()) {
      Alert.alert(zh ? '必填' : 'Required', zh ? '請輸入 email 或電話' : 'Please provide email or phone.');
      return;
    }
    setInviteSubmitting(true);
    try {
      const payload: Record<string, unknown> = { role: inviteRole };
      if (inviteEmail.trim()) payload.email = inviteEmail.trim();
      if (invitePhone.trim()) payload.phoneE164 = invitePhone.trim();
      await apiFetch(`/groups/${groupId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ invites: [payload] }),
      });
      setInviteEmail('');
      setInvitePhone('');
      setInviteRole('GROUP_MEMBER');
      await loadData();
      Alert.alert('✓', zh ? '邀請已送出' : 'Invitation sent.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send invite');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const submitNews = async () => {
    if (!groupId) return;
    if (!newsTitle.trim() || !newsBody.trim()) {
      Alert.alert(zh ? '必填' : 'Required', zh ? '請輸入標題和內容' : 'Please enter title and body.');
      return;
    }
    setNewsSubmitting(true);
    try {
      await apiFetch('/news', {
        method: 'POST',
        body: JSON.stringify({
          groupId,
          title_en: newsTitle, title_zh: newsTitle,
          body_en: newsBody, body_zh: newsBody,
        }),
      });
      setNewsTitle('');
      setNewsBody('');
      Alert.alert('✓', zh ? '公告已發布' : 'Announcement posted.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to post news');
    } finally {
      setNewsSubmitting(false);
    }
  };

  const submitEvent = async () => {
    if (!groupId) return;
    if (!eventTitle.trim() || !eventLocation.trim() || !eventStartAt.trim()) {
      Alert.alert(zh ? '必填' : 'Required', zh ? '請填寫標題、地點、開始時間' : 'Please provide title, location, and start time.');
      return;
    }
    setEventSubmitting(true);
    try {
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify({
          groupId,
          title_en: eventTitle, title_zh: eventTitle,
          description_en: eventDescription, description_zh: eventDescription,
          location_en: eventLocation, location_zh: eventLocation,
          startAt: new Date(eventStartAt).toISOString(),
          endAt: eventEndAt.trim() ? new Date(eventEndAt).toISOString() : null,
          timezone: eventTimezone,
          feeAmount: eventFeeAmount.trim() ? parseFloat(eventFeeAmount) : null,
          feeCurrency: eventFeeCurrency || 'TWD',
          coverImageUrl: null,
        }),
      });
      setEventTitle(''); setEventLocation(''); setEventDescription('');
      setEventStartAt(''); setEventEndAt(''); setEventTimezone('Asia/Taipei');
      setEventFeeAmount(''); setEventFeeCurrency('TWD');
      Alert.alert('✓', zh ? '群組活動已建立' : 'Group event created.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create event');
    } finally {
      setEventSubmitting(false);
    }
  };

  const reviewRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await apiFetch(`/groups/join-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to review request');
    }
  };

  const saveSettings = async () => {
    if (!groupId) return;
    setSettingsSaving(true);
    try {
      await apiFetch(`/groups/${groupId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ discoverableBySearch }),
      });
      Alert.alert('✓', zh ? '設定已儲存' : 'Settings saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: zh ? '設定' : 'Settings' },
    { key: 'invite', label: zh ? '邀請' : 'Invite' },
    { key: 'news', label: zh ? '公告' : 'Announce' },
    { key: 'event', label: zh ? '活動' : 'Event' },
    { key: 'requests', label: joinRequests.length > 0 ? `${zh ? '申請' : 'Requests'} (${joinRequests.length})` : (zh ? '申請' : 'Requests') },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>{zh ? '群組設定' : 'Group Settings'}</Text>

      {/* Tab bar */}
      <View style={styles.tabBar}>
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

      {/* General Settings tab */}
      {tab === 'general' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '群組設定' : 'Group Settings'}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{zh ? '允許搜尋及申請加入' : 'Discoverable by search'}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={saveSettings} disabled={settingsSaving}>
            <Text style={styles.primaryBtnText}>{settingsSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存設定' : 'Save Settings')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Invite tab */}
      {tab === 'invite' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '邀請成員' : 'Invite Member'}</Text>
          <TextInput
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="member@example.com"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            value={invitePhone}
            onChangeText={setInvitePhone}
            placeholder="+886900000123"
            style={styles.input}
            keyboardType="phone-pad"
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.roleRow}>
            <TouchableOpacity style={[styles.roleBtn, inviteRole === 'GROUP_MEMBER' && styles.roleBtnActive]} onPress={() => setInviteRole('GROUP_MEMBER')}>
              <Text style={[styles.roleBtnText, inviteRole === 'GROUP_MEMBER' && styles.roleBtnTextActive]}>{zh ? '一般成員' : 'Member'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleBtn, inviteRole === 'GROUP_ADMIN' && styles.roleBtnActive]} onPress={() => setInviteRole('GROUP_ADMIN')}>
              <Text style={[styles.roleBtnText, inviteRole === 'GROUP_ADMIN' && styles.roleBtnTextActive]}>{zh ? '群組管理員' : 'Group Admin'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={submitInvite} disabled={inviteSubmitting}>
            <Text style={styles.primaryBtnText}>{inviteSubmitting ? (zh ? '傳送中…' : 'Sending…') : (zh ? '送出邀請' : 'Send Invite')}</Text>
          </TouchableOpacity>

          {pendingInvites.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{zh ? '待回覆邀請' : 'Pending Invites'}</Text>
              {pendingInvites.map((inv) => (
                <View key={inv.id} style={styles.reqRow}>
                  <Text style={styles.reqPrimary}>{inv.email || inv.phoneE164 || inv.id}</Text>
                  <Text style={styles.reqMeta}>{zh ? '到期：' : 'Expires: '}{new Date(inv.expiresAt).toLocaleDateString()}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Post Announcement tab */}
      {tab === 'news' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '發布群組公告' : 'Post Announcement'}</Text>
          <TextInput
            value={newsTitle}
            onChangeText={setNewsTitle}
            placeholder={zh ? '標題' : 'Title'}
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            value={newsBody}
            onChangeText={setNewsBody}
            placeholder={zh ? '內容' : 'Body'}
            style={[styles.input, styles.textArea]}
            placeholderTextColor="#9CA3AF"
            multiline
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={submitNews} disabled={newsSubmitting}>
            <Text style={styles.primaryBtnText}>{newsSubmitting ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布公告' : 'Post Announcement')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Event tab */}
      {tab === 'event' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '建立群組活動' : 'Create Group Event'}</Text>
          <TextInput value={eventTitle} onChangeText={setEventTitle} placeholder={zh ? '活動名稱' : 'Title'} style={styles.input} placeholderTextColor="#9CA3AF" />
          <TextInput value={eventLocation} onChangeText={setEventLocation} placeholder={zh ? '地點' : 'Location'} style={styles.input} placeholderTextColor="#9CA3AF" />
          <TextInput value={eventDescription} onChangeText={setEventDescription} placeholder={zh ? '描述（選填）' : 'Description (optional)'} style={[styles.input, styles.textArea]} placeholderTextColor="#9CA3AF" multiline />
          <DateTimeField
            label={zh ? '開始時間' : 'Start time'}
            value={eventStartAt}
            onChange={setEventStartAt}
            placeholder={zh ? '選擇日期與時間' : 'Select date and time'}
            locale={zh ? 'zh-TW' : 'en-US'}
          />
          <DateTimeField
            label={zh ? '結束時間（選填）' : 'End time (optional)'}
            value={eventEndAt}
            onChange={setEventEndAt}
            placeholder={zh ? '選擇日期與時間' : 'Select date and time'}
            locale={zh ? 'zh-TW' : 'en-US'}
            clearable
          />
          <View style={styles.inlineRow}>
            <TextInput value={eventTimezone} onChangeText={setEventTimezone} placeholder="Asia/Taipei" style={[styles.input, styles.flex2]} placeholderTextColor="#9CA3AF" />
            <TextInput value={eventFeeAmount} onChangeText={setEventFeeAmount} placeholder={zh ? '費用' : 'Fee'} style={[styles.input, styles.flex1]} placeholderTextColor="#9CA3AF" keyboardType="numeric" />
            <TextInput value={eventFeeCurrency} onChangeText={setEventFeeCurrency} placeholder="TWD" style={[styles.input, styles.flex1]} placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={submitEvent} disabled={eventSubmitting}>
            <Text style={styles.primaryBtnText}>{eventSubmitting ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立活動' : 'Create Event')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Join Requests tab */}
      {tab === 'requests' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '加入申請審核' : 'Join Requests'}</Text>
          {joinRequests.length === 0 ? (
            <Text style={styles.muted}>{zh ? '目前無待審核申請' : 'No pending requests.'}</Text>
          ) : joinRequests.map((req) => (
            <View key={req.id} style={styles.reqRow}>
              <Text style={styles.reqPrimary}>{req.requester.displayName || req.requester.email}</Text>
              <Text style={styles.reqMeta}>{req.requester.email}</Text>
              {req.note ? <Text style={styles.reqNote}>{req.note}</Text> : null}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => reviewRequest(req.id, 'approve')}>
                  <Text style={styles.approveBtnText}>{zh ? '核准' : 'Approve'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => reviewRequest(req.id, 'reject')}>
                  <Text style={styles.rejectBtnText}>{zh ? '拒絕' : 'Reject'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#F9FAFB' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  tabBar: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tabBtn: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff',
  },
  tabBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  tabBtnTextActive: { color: '#4338CA' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff', color: '#111827',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  inlineRow: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingVertical: 8, alignItems: 'center' },
  roleBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  roleBtnText: { color: '#4B5563', fontSize: 12, fontWeight: '600' },
  roleBtnTextActive: { color: '#4338CA' },
  primaryBtn: { backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  muted: { color: '#9CA3AF', fontSize: 13 },
  reqRow: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, gap: 4 },
  reqPrimary: { color: '#111827', fontWeight: '600', fontSize: 13 },
  reqMeta: { color: '#6B7280', fontSize: 12 },
  reqNote: { color: '#374151', fontSize: 12, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  approveBtn: { backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  approveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rejectBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  rejectBtnText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  settingDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
