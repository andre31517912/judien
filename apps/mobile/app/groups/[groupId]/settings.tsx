import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch, Clipboard, Image } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, apiUpload } from '../../../lib/api';
import { useTheme } from '../../../context/theme.context';

type PendingInvite = { id: string; email: string | null; phoneE164: string | null; status: string; expiresAt: string };
type JoinRequest = { id: string; status: string; note: string | null; createdAt: string; requester: { id: string; displayName: string | null; email: string } };
type BulkResult = { displayName: string; email?: string; phone?: string; created: boolean; added: boolean; tempPassword?: string; error?: string };
type RosterMember = { userId: string; groupNickname: string | null; displayName: string | null; email: string | null; phoneE164: string | null; joinedAt: string | null; role: string };

type Tab = 'general' | 'invite' | 'roster' | 'requests';

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const zh = i18n.language === 'zh';

  const [tab, setTab] = useState<Tab>('general');
  const [discoverableBySearch, setDiscoverableBySearch] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Invite tab
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Add member (lives inside roster tab)
  const [showAddMember, setShowAddMember] = useState(false);
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

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [editingNicknameFor, setEditingNicknameFor] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const loadData = async () => {
    if (!groupId) return;
    try {
      const [myGroups, invData, reqData] = await Promise.all([
        apiFetch<Array<{ group: { discoverableBySearch: boolean; photoUrl?: string | null } }>>('/groups/me'),
        apiFetch<PendingInvite[]>(`/groups/${groupId}/invites`).catch(() => []),
        apiFetch<JoinRequest[]>(`/groups/${groupId}/join-requests`).catch(() => []),
      ]);
      const current = myGroups.find((m: any) => m.group.id === groupId);
      if (current) {
        setDiscoverableBySearch(current.group.discoverableBySearch);
        setGroupName((current.group as any).name ?? '');
        setGroupDescription((current.group as any).description ?? '');
        setPhotoUrl((current.group as any).photoUrl ?? null);
      }
      setPendingInvites((invData ?? []).filter((inv) => inv.status === 'PENDING'));
      setJoinRequests((reqData ?? []).filter((req) => req.status === 'PENDING'));
    } catch {
      setPendingInvites([]);
      setJoinRequests([]);
    }
  };

  useEffect(() => { loadData(); }, [groupId]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('', zh ? '需要相簿權限' : 'Photo library permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setPhotoUploading(true);
    try {
      const { url } = await apiUpload(uri);
      setPhotoUrl(url);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

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
      loadRoster();
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
    const parseErrors: string[] = [];
    const members = lines.map((line, idx) => {
      const parts = line.split(',').map((p) => p.trim());
      const displayName = parts[0] ?? '';
      const email = parts[1] && parts[1].includes('@') ? parts[1] : undefined;
      const phone = parts[2] && parts[2].startsWith('+') ? parts[2] : undefined;
      if (!displayName) parseErrors.push(zh ? `第 ${idx + 1} 行：缺少姓名。` : `Line ${idx + 1}: name required.`);
      else if (!email && !phone) parseErrors.push(zh ? `第 ${idx + 1} 行（${displayName}）：必須填入電子郵件或手機至少一項。` : `Line ${idx + 1} (${displayName}): email or phone required.`);
      return { displayName, email, phone };
    }).filter((m) => m.displayName);
    if (parseErrors.length) { Alert.alert(zh ? '格式錯誤' : 'Format Error', parseErrors.slice(0, 5).join('\n')); return; }

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
      loadRoster();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Bulk add failed.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const reviewRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await apiFetch(`/groups/join-requests/${requestId}/review`, { method: 'POST', body: JSON.stringify({ action }) });
      await loadData();
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to review request'); }
  };

  const saveSettings = async () => {
    if (!groupId) return;
    if (!groupName.trim()) { Alert.alert('', zh ? '群組名稱不可為空。' : 'Group name is required.'); return; }
    setSettingsSaving(true);
    try {
      await apiFetch(`/groups/${groupId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ name: groupName.trim(), description: groupDescription.trim(), discoverableBySearch, photoUrl }),
      });
      Alert.alert('✓', zh ? '設定已儲存' : 'Settings saved.');
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to save settings'); }
    finally { setSettingsSaving(false); }
  };

  const handleSaveNickname = async (targetUserId: string) => {
    if (!groupId) return;
    setNicknameSaving(true);
    try {
      await apiFetch(`/groups/${groupId}/members/${targetUserId}/nickname`, {
        method: 'PATCH',
        body: JSON.stringify({ groupNickname: nicknameInput.trim() || null }),
      });
      setRoster((prev) => prev.map((m) => m.userId === targetUserId ? { ...m, groupNickname: nicknameInput.trim() || null } : m));
      setEditingNicknameFor(null);
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed'); }
    finally { setNicknameSaving(false); }
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
    { key: 'roster', label: zh ? `成員名單${roster.length ? ` (${roster.length})` : ''}` : `Roster${roster.length ? ` (${roster.length})` : ''}` },
    { key: 'requests', label: joinRequests.length > 0 ? `${zh ? '申請' : 'Requests'} (${joinRequests.length})` : (zh ? '申請' : 'Requests') },
  ];

  const headerTitle = groupName ? `${groupName} ${zh ? '設定' : 'Settings'}` : (zh ? '群組設定' : 'Group Settings');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: headerTitle, headerLeft: () => null, gestureEnabled: true }} />

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

          {/* Photo */}
          <Text style={styles.fieldLabel}>{zh ? '群組照片' : 'Group Photo'}</Text>
          <View style={{ alignItems: 'center', gap: 10 }}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>{groupName.charAt(0).toUpperCase() || '?'}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} disabled={photoUploading}>
                <Text style={styles.photoBtnText}>{photoUploading ? (zh ? '上傳中…' : 'Uploading…') : (zh ? '上傳照片' : 'Upload Photo')}</Text>
              </TouchableOpacity>
              {photoUrl && (
                <TouchableOpacity style={[styles.photoBtn, styles.photoBtnDanger]} onPress={() => setPhotoUrl(null)}>
                  <Text style={[styles.photoBtnText, { color: '#DC2626' }]}>{zh ? '刪除照片' : 'Remove Photo'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.fieldLabel}>{zh ? '群組名稱' : 'Group Name'}</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder={zh ? '群組名稱' : 'Group name'}
            placeholderTextColor={colors.placeholder}
            maxLength={80}
          />
          <Text style={styles.fieldLabel}>{zh ? '描述（選填）' : 'Description (optional)'}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={groupDescription}
            onChangeText={setGroupDescription}
            placeholder={zh ? '群組描述' : 'Group description'}
            placeholderTextColor={colors.placeholder}
            multiline
            maxLength={500}
          />
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
          <TextInput value={inviteEmail} onChangeText={setInviteEmail} placeholder="member@example.com" style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.placeholder} />
          <TextInput value={invitePhone} onChangeText={setInvitePhone} placeholder="+886900000123" style={styles.input} keyboardType="phone-pad" placeholderTextColor={colors.placeholder} />
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

      {/* Roster */}
      {tab === 'roster' && (
        <View style={{ gap: 12 }}>
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>{zh ? `成員名單 (${roster.length})` : `Members (${roster.length})`}</Text>
              <TouchableOpacity
                style={styles.addMemberBtn}
                onPress={() => { setShowAddMember(!showAddMember); setNewResult(null); setBulkResults(null); }}
              >
                <Text style={styles.addMemberBtnText}>{showAddMember ? (zh ? '關閉' : 'Close') : (zh ? '+ 新增成員' : '+ Add Member')}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={rosterSearch}
              onChangeText={setRosterSearch}
              placeholder={zh ? '搜尋成員姓名、電郵、手機…' : 'Search name, email, phone…'}
              placeholderTextColor={colors.placeholder}
              clearButtonMode="while-editing"
            />
            {rosterLoading && !rosterLoaded && <Text style={styles.muted}>{zh ? '載入中…' : 'Loading…'}</Text>}
            {rosterLoaded && roster.length === 0 && <Text style={styles.muted}>{zh ? '目前沒有成員' : 'No members yet.'}</Text>}
            {roster
              .filter((m) => {
                const term = rosterSearch.trim().toLowerCase();
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
              })
              .map((member) => {
                const isEditing = editingNicknameFor === member.userId;
                const shownName = member.groupNickname ?? member.displayName ?? member.email ?? member.userId;
                return (
                  <View key={member.userId} style={styles.rosterRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      {isEditing ? (
                        <View style={{ gap: 6 }}>
                          <TextInput
                            style={styles.input}
                            value={nicknameInput}
                            onChangeText={setNicknameInput}
                            placeholder={zh ? '群組暱稱（留空清除）' : 'Nickname (blank to clear)'}
                            placeholderTextColor={colors.placeholder}
                            autoFocus
                            maxLength={100}
                          />
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity style={[styles.primaryBtn, { flex: 1, paddingVertical: 8 }]} onPress={() => handleSaveNickname(member.userId)} disabled={nicknameSaving}>
                              <Text style={styles.primaryBtnText}>{nicknameSaving ? '…' : (zh ? '儲存' : 'Save')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.rejectBtn, { flex: 1, paddingVertical: 8, alignItems: 'center' }]} onPress={() => setEditingNicknameFor(null)}>
                              <Text style={styles.rejectBtnText}>{zh ? '取消' : 'Cancel'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.reqPrimary}>{shownName}</Text>
                            {member.groupNickname && member.displayName && member.groupNickname !== member.displayName && (
                              <Text style={styles.muted}>({member.displayName})</Text>
                            )}
                          </View>
                          {member.email && <Text style={styles.reqMeta}>{member.email}</Text>}
                          {member.phoneE164 && <Text style={styles.reqMeta}>{member.phoneE164}</Text>}
                          <Text style={styles.muted}>
                            {member.role === 'GROUP_ADMIN' ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '一般成員' : 'Member')}
                            {member.joinedAt ? ` · ${new Date(member.joinedAt).toLocaleDateString()}` : ''}
                          </Text>
                        </>
                      )}
                    </View>
                    {!isEditing && (
                      <View style={{ gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.removeBtn, { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }]}
                          onPress={() => { setEditingNicknameFor(member.userId); setNicknameInput(member.groupNickname ?? ''); }}
                        >
                          <Text style={[styles.removeBtnText, { color: '#4338CA' }]}>{zh ? '暱稱' : 'Nickname'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member.userId, member.displayName)}
                          disabled={removingMemberId === member.userId}
                          style={[styles.removeBtn, removingMemberId === member.userId && { opacity: 0.5 }]}
                        >
                          <Text style={styles.removeBtnText}>{removingMemberId === member.userId ? '…' : (zh ? '移除' : 'Remove')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>

          {/* Add Member panel */}
          {showAddMember && (
            <View style={{ gap: 12 }}>
              {/* Single create-and-add */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{zh ? '建立帳號並加入' : 'Create Account & Add'}</Text>
                <Text style={styles.muted}>{zh ? '為新成員建立帳號並直接加入群組。' : 'Create an account for someone and add them directly.'}</Text>
                <TextInput value={newName} onChangeText={setNewName} placeholder={zh ? '真實姓名（必填）' : 'Full name (required)'} style={styles.input} placeholderTextColor={colors.placeholder} />
                <TextInput value={newEmail} onChangeText={setNewEmail} placeholder="email@example.com" style={styles.input} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.placeholder} />
                <TextInput value={newPhone} onChangeText={setNewPhone} placeholder="+886900000123" style={styles.input} keyboardType="phone-pad" placeholderTextColor={colors.placeholder} />
                <View style={styles.roleRow}>
                  {(['GROUP_MEMBER', 'GROUP_ADMIN'] as const).map((r) => (
                    <TouchableOpacity key={r} style={[styles.roleBtn, newRole === r && styles.roleBtnActive]} onPress={() => setNewRole(r)}>
                      <Text style={[styles.roleBtnText, newRole === r && styles.roleBtnTextActive]}>{r === 'GROUP_MEMBER' ? (zh ? '一般成員' : 'Member') : (zh ? '群組管理員' : 'Group Admin')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                  <TextInput value={newCustomPassword} onChangeText={setNewCustomPassword} placeholder={zh ? '至少 6 個字元' : 'Min 6 characters'} style={[styles.input, { fontFamily: 'monospace' }]} placeholderTextColor={colors.placeholder} />
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
                      <TouchableOpacity onPress={() => { Clipboard.setString(newResult!.password); Alert.alert('✓', zh ? '已複製' : 'Copied'); }}>
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
                <Text style={styles.muted}>{zh ? '每行：全名, 電子郵件, 含國碼手機號碼（電郵或手機至少填一項）' : 'One per line: Full Name, Email, Phone With Country Code (at least one of email/phone required)'}</Text>
                <TextInput
                  value={bulkText}
                  onChangeText={setBulkText}
                  placeholder={zh ? '王小明, ming@example.com, +886912345678\n李小華, , +886900000001' : 'Jane Smith, jane@example.com, +886912345678\nJohn Doe, , +886900000001'}
                  style={[styles.input, styles.textArea]}
                  placeholderTextColor={colors.placeholder}
                  multiline
                />
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
                  <TextInput value={bulkSharedPassword} onChangeText={setBulkSharedPassword} placeholder={zh ? '輸入共用密碼（至少 6 個字元）' : 'Shared password (min 6 chars)'} style={[styles.input, { fontFamily: 'monospace' }]} placeholderTextColor={colors.placeholder} />
                ) : (
                  <Text style={styles.muted}>{zh ? '每人產生唯一密碼，結果中會顯示各自的密碼。' : 'Each person gets a unique random password shown in the results.'}</Text>
                )}
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
                        const text = bulkResults!.filter((r) => r.tempPassword).map((r) => `${r.displayName}\t${r.email ?? r.phone ?? ''}\t${r.tempPassword}`).join('\n');
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

function makeStyles(colors: ReturnType<typeof import('../../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    container: { padding: 16, gap: 12, backgroundColor: colors.bg },
    tabBar: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    tabBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card },
    tabBtnActive: { borderColor: INDIGO, backgroundColor: '#EEF2FF' },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: colors.subtext },
    tabBtnTextActive: { color: '#4338CA' },
    card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.subtext },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, backgroundColor: colors.input, color: colors.inputText },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    photoPreview: { width: 88, height: 88, borderRadius: 44 },
    photoPlaceholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    photoPlaceholderText: { fontSize: 32, fontWeight: '700', color: INDIGO },
    photoBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card },
    photoBtnDanger: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
    photoBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
    roleRow: { flexDirection: 'row', gap: 8 },
    roleBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 8, alignItems: 'center' },
    roleBtnActive: { borderColor: INDIGO, backgroundColor: '#EEF2FF' },
    roleBtnText: { color: colors.subtext, fontSize: 12, fontWeight: '600' },
    roleBtnTextActive: { color: '#4338CA' },
    primaryBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
    muted: { color: colors.placeholder, fontSize: 12 },
    reqRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, gap: 4 },
    reqPrimary: { color: colors.text, fontWeight: '600', fontSize: 13 },
    reqMeta: { color: colors.subtext, fontSize: 12 },
    reqNote: { color: colors.text, fontSize: 12, fontStyle: 'italic' },
    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    approveBtn: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    approveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    rejectBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.card },
    rejectBtnText: { color: colors.text, fontSize: 12, fontWeight: '700' },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
    settingInfo: { flex: 1 },
    settingLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    resultBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 8, padding: 12, gap: 6 },
    resultTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
    resultSubtitle: { fontSize: 12, color: '#B45309' },
    passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#FDE68A' },
    passwordText: { flex: 1, fontSize: 13, fontFamily: 'monospace', color: '#111827' },
    copyBtn: { color: INDIGO, fontSize: 12, fontWeight: '600' },
    dismissBtn: { color: colors.placeholder, fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
    bulkResultRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, gap: 2 },
    rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
    removeBtn: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFF5F5' },
    removeBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
    addMemberBtn: { backgroundColor: INDIGO, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    addMemberBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  });
}
