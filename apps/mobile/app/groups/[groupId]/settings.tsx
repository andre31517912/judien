import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch, Clipboard } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimeField from '../../../components/DateTimeField';
import { apiFetch } from '../../../lib/api';

type PendingInvite = { id: string; email: string | null; phoneE164: string | null; status: string; expiresAt: string };
type JoinRequest = { id: string; status: string; note: string | null; createdAt: string; requester: { id: string; displayName: string | null; email: string } };
type BulkResult = { displayName: string; email?: string; phone?: string; created: boolean; added: boolean; tempPassword?: string; error?: string };
type RosterMember = { userId: string; displayName: string | null; email: string | null; phoneE164: string | null; joinedAt: string | null; role: string };

type Tab = 'general' | 'invite' | 'members' | 'roster' | 'news' | 'event' | 'requests';

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  const [tab, setTab] = useState<Tab>('general');
  const [discoverableBySearch, setDiscoverableBySearch] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Invite tab
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Single create-and-add
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [newPasswordMode, setNewPasswordMode] = useState<'random' | 'custom'>('random');
  const [newCustomPassword, setNewCustomPassword] = useState('');
  const [newSubmitting, setNewSubmitting] = useState(false);
  const [newResult, setNewResult] = useState<{ name: string; password: string } | null>(null);

  // Bulk add
  const [bulkText, setBulkText] = useState('');
  const [bulkPasswordMode, setBulkPasswordMode] = useState<'shared' | 'random'>('shared');
  const [bulkSharedPassword, setBulkSharedPassword] = useState('');
  const [bulkRole, setBulkRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);

  // News
  const [newsTitle, setNewsTitle] = useState('');
  const [newsBody, setNewsBody] = useState('');
  const [newsSubmitting, setNewsSubmitting] = useState(false);

  // Event
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
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const loadData = async () => {
    if (!groupId) return;
    try {
      const [myGroups, invData, reqData] = await Promise.all([
        apiFetch<Array<{ group: { discoverableBySearch: boolean } }>>('/groups/me'),
        apiFetch<PendingInvite[]>(`/groups/${groupId}/invites`).catch(() => []),
        apiFetch<JoinRequest[]>(`/groups/${groupId}/join-requests`).catch(() => []),
      ]);
      const current = myGroups.find((m: any) => m.group.id === groupId);
      if (current) setDiscoverableBySearch(current.group.discoverableBySearch);
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
      await apiFetch(`/groups/${groupId}/invites`, { method: 'POST', body: JSON.stringify({ invites: [payload] }) });
      setInviteEmail(''); setInvitePhone(''); setInviteRole('GROUP_MEMBER');
      await loadData();
      Alert.alert('✓', zh ? '邀請已送出' : 'Invitation sent.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send invite');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const submitNewMember = async () => {
    if (!groupId) return;
    if (!newName.trim()) { Alert.alert(zh ? '必填' : 'Required', zh ? '請輸入姓名' : 'Name is required.'); return; }
    if (!newEmail.trim() && !newPhone.trim()) { Alert.alert(zh ? '必填' : 'Required', zh ? '請輸入 email 或電話' : 'Email or phone required.'); return; }
    if (newPasswordMode === 'custom' && newCustomPassword.trim().length < 6) {
      Alert.alert(zh ? '密碼太短' : 'Password too short', zh ? '密碼至少 6 個字元' : 'Minimum 6 characters.'); return;
    }
    setNewSubmitting(true);
    setNewResult(null);
    try {
      const res = await apiFetch<{ created: boolean; displayName: string | null; tempPassword?: string }>(`/groups/${groupId}/members/new-and-add`, {
        method: 'POST',
        body: JSON.stringify({
          displayName: newName.trim(),
          email: newEmail.trim() || undefined,
          phone: newPhone.trim() || undefined,
          role: newRole,
          ...(newPasswordMode === 'custom' ? { password: newCustomPassword.trim() } : {}),
        }),
      });
      if (res.created && res.tempPassword) {
        setNewResult({ name: res.displayName ?? newName.trim(), password: res.tempPassword });
      } else {
        Alert.alert('✓', zh ? `現有用戶已加入群組：${res.displayName ?? newName.trim()}` : `Existing user added: ${res.displayName ?? newName.trim()}`);
      }
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewCustomPassword(''); setNewPasswordMode('random'); setNewRole('GROUP_MEMBER');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed.');
    } finally {
      setNewSubmitting(false);
    }
  };

  const submitBulkAdd = async () => {
    if (!groupId) return;
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { Alert.alert(zh ? '必填' : 'Required', zh ? '請輸入成員資料' : 'Please enter member data.'); return; }
    if (bulkPasswordMode === 'shared' && bulkSharedPassword.trim().length < 6) {
      Alert.alert(zh ? '密碼太短' : 'Password too short', zh ? '共用密碼至少 6 個字元' : 'Min 6 characters.'); return;
    }
    const members = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      const displayName = parts[0] ?? '';
      const second = parts[1] ?? '';
      const isEmail = second.includes('@');
      return { displayName, email: isEmail ? second : undefined, phone: !isEmail && second ? second : undefined };
    }).filter((m) => m.displayName);

    setBulkSubmitting(true);
    setBulkResults(null);
    try {
      const res = await apiFetch<{ results: BulkResult[] }>(`/groups/${groupId}/members/bulk-create-and-add`, {
        method: 'POST',
        body: JSON.stringify({
          members,
          passwordMode: bulkPasswordMode,
          sharedPassword: bulkPasswordMode === 'shared' ? bulkSharedPassword.trim() : undefined,
          role: bulkRole,
        }),
      });
      setBulkResults(res.results);
      setBulkText('');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Bulk add failed.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const submitNews = async () => {
    if (!groupId) return;
    if (!newsTitle.trim() || !newsBody.trim()) { Alert.alert(zh ? '必填' : 'Required', zh ? '請輸入標題和內容' : 'Title and body required.'); return; }
    setNewsSubmitting(true);
    try {
      await apiFetch('/news', { method: 'POST', body: JSON.stringify({ groupId, title_en: newsTitle, title_zh: newsTitle, body_en: newsBody, body_zh: newsBody }) });
      setNewsTitle(''); setNewsBody('');
      Alert.alert('✓', zh ? '公告已發布' : 'Announcement posted.');
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to post news'); }
    finally { setNewsSubmitting(false); }
  };

  const submitEvent = async () => {
    if (!groupId) return;
    if (!eventTitle.trim() || !eventLocation.trim() || !eventStartAt.trim()) {
      Alert.alert(zh ? '必填' : 'Required', zh ? '請填寫標題、地點、開始時間' : 'Title, location, and start time required.'); return;
    }
    setEventSubmitting(true);
    try {
      await apiFetch('/events', { method: 'POST', body: JSON.stringify({ groupId, title_en: eventTitle, title_zh: eventTitle, description_en: eventDescription, description_zh: eventDescription, location_en: eventLocation, location_zh: eventLocation, startAt: new Date(eventStartAt).toISOString(), endAt: eventEndAt.trim() ? new Date(eventEndAt).toISOString() : null, timezone: eventTimezone, feeAmount: eventFeeAmount.trim() ? parseFloat(eventFeeAmount) : null, feeCurrency: eventFeeCurrency || 'TWD', coverImageUrl: null }) });
      setEventTitle(''); setEventLocation(''); setEventDescription(''); setEventStartAt(''); setEventEndAt(''); setEventTimezone('Asia/Taipei'); setEventFeeAmount(''); setEventFeeCurrency('TWD');
      Alert.alert('✓', zh ? '群組活動已建立' : 'Group event created.');
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to create event'); }
    finally { setEventSubmitting(false); }
  };

  const reviewRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await apiFetch(`/groups/join-requests/${requestId}/review`, { method: 'POST', body: JSON.stringify({ action }) });
      await loadData();
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to review request'); }
  };

  const saveSettings = async () => {
    if (!groupId) return;
    setSettingsSaving(true);
    try {
      await apiFetch(`/groups/${groupId}/settings`, { method: 'PATCH', body: JSON.stringify({ discoverableBySearch }) });
      Alert.alert('✓', zh ? '設定已儲存' : 'Settings saved.');
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to save settings'); }
    finally { setSettingsSaving(false); }
  };

  const loadRoster = async () => {
    if (!groupId) return;
    setRosterLoading(true);
    try {
      const data = await apiFetch<RosterMember[]>(`/groups/${groupId}/members`);
      setRoster(data);
      setRosterLoaded(true);
    } catch {
      Alert.alert(zh ? '錯誤' : 'Error', zh ? '無法載入成員名單' : 'Failed to load members');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleRemoveMember = (userId: string, displayName: string | null) => {
    const name = displayName || userId;
    Alert.alert(
      zh ? '移除成員' : 'Remove member',
      zh ? `確定要將「${name}」從群組中移除嗎？` : `Remove "${name}" from this group?`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '移除' : 'Remove', style: 'destructive',
          onPress: async () => {
            setRemovingMemberId(userId);
            try {
              await apiFetch(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
              setRoster((prev) => prev.filter((m) => m.userId !== userId));
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to remove member.');
            } finally {
              setRemovingMemberId(null);
            }
          },
        },
      ],
    );
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: zh ? '設定' : 'Settings' },
    { key: 'invite', label: zh ? '邀請' : 'Invite' },
    { key: 'members', label: zh ? '新增成員' : 'Add Members' },
    { key: 'roster', label: zh ? `成員名單${roster.length ? ` (${roster.length})` : ''}` : `Roster${roster.length ? ` (${roster.length})` : ''}` },
    { key: 'news', label: zh ? '公告' : 'Announce' },
    { key: 'event', label: zh ? '活動' : 'Event' },
    { key: 'requests', label: joinRequests.length > 0 ? `${zh ? '申請' : 'Requests'} (${joinRequests.length})` : (zh ? '申請' : 'Requests') },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>{zh ? '群組設定' : 'Group Settings'}</Text>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]} onPress={() => { setTab(t.key); if (t.key === 'roster' && !rosterLoaded) loadRoster(); }}>
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* General */}
      {tab === 'general' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '群組設定' : 'Group Settings'}</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{zh ? '允許搜尋及申請加入' : 'Discoverable by search'}</Text>
            </View>
            <Switch value={discoverableBySearch} onValueChange={setDiscoverableBySearch} trackColor={{ true: '#4F46E5' }} />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={saveSettings} disabled={settingsSaving}>
            <Text style={styles.primaryBtnText}>{settingsSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存設定' : 'Save Settings')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Invite */}
      {tab === 'invite' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '邀請成員' : 'Invite Member'}</Text>
          <TextInput value={inviteEmail} onChangeText={setInviteEmail} placeholder="member@example.com" style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#9CA3AF" />
          <TextInput value={invitePhone} onChangeText={setInvitePhone} placeholder="+886900000123" style={styles.input} keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />
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

      {/* Add Members (single + bulk) */}
      {tab === 'members' && (
        <View style={{ gap: 12 }}>
          {/* Single create-and-add */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '建立帳號並加入' : 'Create Account & Add'}</Text>
            <Text style={styles.muted}>{zh ? '為新成員建立帳號並直接加入群組。' : 'Create an account for someone and add them directly.'}</Text>

            <TextInput value={newName} onChangeText={setNewName} placeholder={zh ? '真實姓名（必填）' : 'Full name (required)'} style={styles.input} placeholderTextColor="#9CA3AF" />
            <TextInput value={newEmail} onChangeText={setNewEmail} placeholder="email@example.com" style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#9CA3AF" />
            <TextInput value={newPhone} onChangeText={setNewPhone} placeholder="+886900000123" style={styles.input} keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />

            {/* Role */}
            <View style={styles.roleRow}>
              {(['GROUP_MEMBER', 'GROUP_ADMIN'] as const).map((r) => (
                <TouchableOpacity key={r} style={[styles.roleBtn, newRole === r && styles.roleBtnActive]} onPress={() => setNewRole(r)}>
                  <Text style={[styles.roleBtnText, newRole === r && styles.roleBtnTextActive]}>{r === 'GROUP_MEMBER' ? (zh ? '一般成員' : 'Member') : (zh ? '群組管理員' : 'Group Admin')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Password mode */}
            <Text style={styles.fieldLabel}>{zh ? '密碼設定' : 'Password'}</Text>
            <View style={styles.roleRow}>
              {(['random', 'custom'] as const).map((m) => (
                <TouchableOpacity key={m} style={[styles.roleBtn, newPasswordMode === m && styles.roleBtnActive]} onPress={() => setNewPasswordMode(m)}>
                  <Text style={[styles.roleBtnText, newPasswordMode === m && styles.roleBtnTextActive]}>
                    {m === 'random' ? (zh ? '隨機產生' : 'Auto-generate') : (zh ? '自訂密碼' : 'Set custom')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {newPasswordMode === 'custom' && (
              <TextInput value={newCustomPassword} onChangeText={setNewCustomPassword} placeholder={zh ? '至少 6 個字元' : 'Min 6 characters'} style={[styles.input, { fontFamily: 'monospace' }]} placeholderTextColor="#9CA3AF" />
            )}
            {newPasswordMode === 'random' && (
              <Text style={styles.muted}>{zh ? '系統產生隨機密碼，建立後顯示供您轉告。' : 'A random password will be shown after creation for you to share.'}</Text>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={submitNewMember} disabled={newSubmitting}>
              <Text style={styles.primaryBtnText}>{newSubmitting ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立帳號並加入' : 'Create & Add')}</Text>
            </TouchableOpacity>

            {newResult && (
              <View style={styles.resultBox}>
                <Text style={styles.resultTitle}>✅ {zh ? `帳號已建立：${newResult.name}` : `Account created: ${newResult.name}`}</Text>
                <Text style={styles.resultSubtitle}>{zh ? '請將以下臨時密碼傳給該成員，他們可在個人資料中修改。' : 'Share this temporary password. They can change it in their profile.'}</Text>
                <View style={styles.passwordRow}>
                  <Text style={styles.passwordText} selectable>{newResult.password}</Text>
                  <TouchableOpacity onPress={() => { Clipboard.setString(newResult.password); Alert.alert('✓', zh ? '已複製' : 'Copied'); }}>
                    <Text style={styles.copyBtn}>{zh ? '複製' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setNewResult(null)}><Text style={styles.dismissBtn}>{zh ? '關閉' : 'Dismiss'}</Text></TouchableOpacity>
              </View>
            )}
          </View>

          {/* Bulk add */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '批量新增成員' : 'Bulk Add Members'}</Text>
            <Text style={styles.muted}>{zh ? '每行格式：姓名, 電子郵件或電話' : 'One per line: Full Name, email or phone'}</Text>
            <TextInput
              value={bulkText}
              onChangeText={setBulkText}
              placeholder={zh ? '王小明, ming@example.com\n李小華, +886900000001' : 'Jane Smith, jane@example.com\nJohn Doe, +886900000001'}
              style={[styles.input, styles.textArea]}
              placeholderTextColor="#9CA3AF"
              multiline
            />

            {/* Password mode */}
            <Text style={styles.fieldLabel}>{zh ? '密碼設定' : 'Password'}</Text>
            <View style={styles.roleRow}>
              {(['shared', 'random'] as const).map((m) => (
                <TouchableOpacity key={m} style={[styles.roleBtn, bulkPasswordMode === m && styles.roleBtnActive]} onPress={() => setBulkPasswordMode(m)}>
                  <Text style={[styles.roleBtnText, bulkPasswordMode === m && styles.roleBtnTextActive]}>
                    {m === 'shared' ? (zh ? '共用密碼' : 'Shared password') : (zh ? '每人隨機' : 'Random each')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {bulkPasswordMode === 'shared' ? (
              <>
                <TextInput value={bulkSharedPassword} onChangeText={setBulkSharedPassword} placeholder={zh ? '輸入共用密碼（至少 6 個字元）' : 'Shared password (min 6 chars)'} style={[styles.input, { fontFamily: 'monospace' }]} placeholderTextColor="#9CA3AF" />
                <Text style={styles.muted}>{zh ? '所有成員使用此密碼，建議登入後修改。' : 'All members use this password. Remind them to change it.'}</Text>
              </>
            ) : (
              <Text style={styles.muted}>{zh ? '每人產生唯一密碼，結果中會顯示各自的密碼。' : 'Each person gets a unique random password shown in the results.'}</Text>
            )}

            {/* Role */}
            <Text style={styles.fieldLabel}>{zh ? '角色' : 'Role'}</Text>
            <View style={styles.roleRow}>
              {(['GROUP_MEMBER', 'GROUP_ADMIN'] as const).map((r) => (
                <TouchableOpacity key={r} style={[styles.roleBtn, bulkRole === r && styles.roleBtnActive]} onPress={() => setBulkRole(r)}>
                  <Text style={[styles.roleBtnText, bulkRole === r && styles.roleBtnTextActive]}>{r === 'GROUP_MEMBER' ? (zh ? '一般成員' : 'Member') : (zh ? '群組管理員' : 'Group Admin')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={submitBulkAdd} disabled={bulkSubmitting}>
              <Text style={styles.primaryBtnText}>{bulkSubmitting ? (zh ? '新增中…' : 'Adding…') : (zh ? '批量新增' : 'Bulk Add')}</Text>
            </TouchableOpacity>

            {bulkResults && (
              <View style={{ marginTop: 8, gap: 6 }}>
                <Text style={styles.resultTitle}>
                  {zh
                    ? `結果：${bulkResults.filter((r) => r.added).length} 人已加入，${bulkResults.filter((r) => r.error).length} 人失敗`
                    : `Results: ${bulkResults.filter((r) => r.added).length} added, ${bulkResults.filter((r) => r.error).length} failed`}
                </Text>
                {bulkPasswordMode === 'random' && bulkResults.some((r) => r.tempPassword) && (
                  <TouchableOpacity onPress={() => {
                    const text = bulkResults.filter((r) => r.tempPassword).map((r) => `${r.displayName}\t${r.email ?? r.phone ?? ''}\t${r.tempPassword}`).join('\n');
                    Clipboard.setString(text);
                    Alert.alert('✓', zh ? '已複製所有密碼' : 'All passwords copied');
                  }}>
                    <Text style={styles.copyBtn}>{zh ? '複製全部密碼' : 'Copy all passwords'}</Text>
                  </TouchableOpacity>
                )}
                {bulkResults.map((r, i) => (
                  <View key={i} style={styles.bulkResultRow}>
                    <Text style={styles.reqPrimary}>{r.displayName}</Text>
                    <Text style={styles.reqMeta}>{r.email ?? r.phone ?? ''}</Text>
                    {r.error
                      ? <Text style={{ color: '#EF4444', fontSize: 12 }}>✗ {r.error}</Text>
                      : r.created
                      ? <Text style={{ color: '#16A34A', fontSize: 12 }}>✓ {zh ? '已建立帳號' : 'Created'}</Text>
                      : <Text style={{ color: '#2563EB', fontSize: 12 }}>→ {zh ? '已加入現有帳號' : 'Added existing'}</Text>}
                    {r.tempPassword && (
                      <View style={styles.passwordRow}>
                        <Text style={styles.passwordText} selectable>{r.tempPassword}</Text>
                        <TouchableOpacity onPress={() => { Clipboard.setString(r.tempPassword!); }}>
                          <Text style={styles.copyBtn}>{zh ? '複製' : 'Copy'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={() => setBulkResults(null)}>
                  <Text style={styles.dismissBtn}>{zh ? '關閉結果' : 'Dismiss'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Roster */}
      {tab === 'roster' && (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>{zh ? `成員名單 (${roster.length})` : `Members (${roster.length})`}</Text>
            <TouchableOpacity onPress={loadRoster} disabled={rosterLoading}>
              <Text style={styles.copyBtn}>{rosterLoading ? (zh ? '載入中…' : 'Loading…') : (zh ? '重新整理' : 'Refresh')}</Text>
            </TouchableOpacity>
          </View>
          {rosterLoading && !rosterLoaded && (
            <Text style={styles.muted}>{zh ? '載入中…' : 'Loading…'}</Text>
          )}
          {rosterLoaded && roster.length === 0 && (
            <Text style={styles.muted}>{zh ? '目前沒有成員' : 'No members yet.'}</Text>
          )}
          {roster.map((member) => (
            <View key={member.userId} style={styles.rosterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqPrimary}>{member.displayName || member.email || member.userId}</Text>
                {member.email && <Text style={styles.reqMeta}>{member.email}</Text>}
                {member.phoneE164 && <Text style={styles.reqMeta}>{member.phoneE164}</Text>}
                <Text style={styles.muted}>
                  {member.role === 'GROUP_ADMIN' ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '一般成員' : 'Member')}
                  {member.joinedAt ? ` · ${new Date(member.joinedAt).toLocaleDateString()}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveMember(member.userId, member.displayName)}
                disabled={removingMemberId === member.userId}
                style={[styles.removeBtn, removingMemberId === member.userId && { opacity: 0.5 }]}
              >
                <Text style={styles.removeBtnText}>{removingMemberId === member.userId ? '…' : (zh ? '移除' : 'Remove')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* News */}
      {tab === 'news' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '發布群組公告' : 'Post Announcement'}</Text>
          <TextInput value={newsTitle} onChangeText={setNewsTitle} placeholder={zh ? '標題' : 'Title'} style={styles.input} placeholderTextColor="#9CA3AF" />
          <TextInput value={newsBody} onChangeText={setNewsBody} placeholder={zh ? '內容' : 'Body'} style={[styles.input, styles.textArea]} placeholderTextColor="#9CA3AF" multiline />
          <TouchableOpacity style={styles.primaryBtn} onPress={submitNews} disabled={newsSubmitting}>
            <Text style={styles.primaryBtnText}>{newsSubmitting ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布公告' : 'Post Announcement')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event */}
      {tab === 'event' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '建立群組活動' : 'Create Group Event'}</Text>
          <TextInput value={eventTitle} onChangeText={setEventTitle} placeholder={zh ? '活動名稱' : 'Title'} style={styles.input} placeholderTextColor="#9CA3AF" />
          <TextInput value={eventLocation} onChangeText={setEventLocation} placeholder={zh ? '地點' : 'Location'} style={styles.input} placeholderTextColor="#9CA3AF" />
          <TextInput value={eventDescription} onChangeText={setEventDescription} placeholder={zh ? '描述（選填）' : 'Description (optional)'} style={[styles.input, styles.textArea]} placeholderTextColor="#9CA3AF" multiline />
          <DateTimeField label={zh ? '開始時間' : 'Start time'} value={eventStartAt} onChange={setEventStartAt} placeholder={zh ? '選擇日期與時間' : 'Select date and time'} locale={zh ? 'zh-TW' : 'en-US'} />
          <DateTimeField label={zh ? '結束時間（選填）' : 'End time (optional)'} value={eventEndAt} onChange={setEventEndAt} placeholder={zh ? '選擇日期與時間' : 'Select date and time'} locale={zh ? 'zh-TW' : 'en-US'} clearable />
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

      {/* Requests */}
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

const INDIGO = '#4F46E5';
const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#F9FAFB' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  tabBar: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tabBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  tabBtnActive: { borderColor: INDIGO, backgroundColor: '#EEF2FF' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  tabBtnTextActive: { color: '#4338CA' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff', color: '#111827' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  inlineRow: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingVertical: 8, alignItems: 'center' },
  roleBtnActive: { borderColor: INDIGO, backgroundColor: '#EEF2FF' },
  roleBtnText: { color: '#4B5563', fontSize: 12, fontWeight: '600' },
  roleBtnTextActive: { color: '#4338CA' },
  primaryBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  muted: { color: '#9CA3AF', fontSize: 12 },
  reqRow: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, gap: 4 },
  reqPrimary: { color: '#111827', fontWeight: '600', fontSize: 13 },
  reqMeta: { color: '#6B7280', fontSize: 12 },
  reqNote: { color: '#374151', fontSize: 12, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  approveBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  approveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rejectBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  rejectBtnText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  settingDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  resultBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 8, padding: 12, gap: 6 },
  resultTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  resultSubtitle: { fontSize: 12, color: '#B45309' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#FDE68A' },
  passwordText: { flex: 1, fontSize: 13, fontFamily: 'monospace', color: '#111827' },
  copyBtn: { color: INDIGO, fontSize: 12, fontWeight: '600' },
  dismissBtn: { color: '#9CA3AF', fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
  bulkResultRow: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, gap: 2 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10 },
  removeBtn: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFF5F5' },
  removeBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
});
