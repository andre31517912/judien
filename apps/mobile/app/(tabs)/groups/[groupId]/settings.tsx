import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Clipboard, Image, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, apiUpload } from '../../../../lib/api';
import { useTheme } from '../../../../context/theme.context';
import { useAuth } from '../../../../context/auth.context';

type JoinRequest = { id: string; status: string; note: string | null; createdAt: string; requester: { id: string; displayName: string | null; email: string } };
type BulkResult = { displayName: string; email?: string; phone?: string; created: boolean; added: boolean; tempPassword?: string; error?: string };
type RosterMember = { userId: string; groupNickname: string | null; displayName: string | null; email: string | null; phoneE164: string | null; joinedAt: string | null; role: string };
type GroupRelationships = { parentGroup: { id: string; name: string } | null; subgroups: { id: string; name: string; description: string }[] };
type GroupSearchResult = { id: string; name: string; description: string };
type DonationRecord = { id: string; forUserId: string; amount: string; currency: string; date: string; note: string | null; forUser: { id: string; displayName: string | null; email: string } };

function slugifyPid(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

type Tab = 'general' | 'roster' | 'requests' | 'hierarchy' | 'donations';

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const zh = i18n.language === 'zh';
  const isPlatformAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState<Tab>('general');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Add member
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

  // Hierarchy
  const [relationships, setRelationships] = useState<GroupRelationships | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState('');
  const [hierarchySuccess, setHierarchySuccess] = useState('');
  const [createParentName, setCreateParentName] = useState('');
  const [createParentSubmitting, setCreateParentSubmitting] = useState(false);
  const [createChildName, setCreateChildName] = useState('');
  const [createChildSubmitting, setCreateChildSubmitting] = useState(false);
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<GroupSearchResult[]>([]);
  const [parentSearching, setParentSearching] = useState(false);
  const [parentLinking, setParentLinking] = useState(false);
  const [childSearchQuery, setChildSearchQuery] = useState('');
  const [childSearchResults, setChildSearchResults] = useState<GroupSearchResult[]>([]);
  const [childSearching, setChildSearching] = useState(false);
  const [childLinking, setChildLinking] = useState(false);

  // Donations
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationForm, setDonationForm] = useState({ forUserId: '', amount: '', currency: 'NTD', date: new Date().toISOString().slice(0, 10), note: '' });
  const [donationSaving, setDonationSaving] = useState(false);
  const [groupMembers, setGroupMembers] = useState<RosterMember[]>([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const loadData = async () => {
    if (!groupId) return;
    try {
      const [myGroups, reqData] = await Promise.all([
        apiFetch<Array<{ group: { discoverableBySearch: boolean; photoUrl?: string | null } }>>('/groups/me'),
        apiFetch<JoinRequest[]>(`/groups/${groupId}/join-requests`).catch(() => []),
      ]);
      const current = myGroups.find((m: any) => m.group.id === groupId);
      if (current) {
        setGroupName((current.group as any).name ?? '');
        setGroupDescription((current.group as any).description ?? '');
        setPhotoUrl((current.group as any).photoUrl ?? null);
      }
      setJoinRequests((reqData ?? []).filter((req) => req.status === 'PENDING'));
    } catch {
      setJoinRequests([]);
    }
  };

  useEffect(() => { loadData(); }, [groupId]);

  const loadHierarchy = async () => {
    if (!groupId) return;
    setHierarchyLoading(true);
    try {
      const data = await apiFetch<GroupRelationships>(`/groups/${groupId}/relationships`);
      setRelationships(data);
    } catch { /* ignore */ } finally {
      setHierarchyLoading(false);
    }
  };

  useEffect(() => { if (tab === 'hierarchy') loadHierarchy(); }, [tab, groupId]);

  const loadDonations = async () => {
    if (!groupId) return;
    setDonationsLoading(true);
    try {
      const [data, mems] = await Promise.all([
        apiFetch<DonationRecord[]>(`/groups/${groupId}/donations`),
        groupMembers.length === 0 ? apiFetch<RosterMember[]>(`/groups/${groupId}/members`) : Promise.resolve(groupMembers),
      ]);
      setDonations(data);
      if (groupMembers.length === 0) setGroupMembers(mems);
    } catch { /* ignore */ } finally { setDonationsLoading(false); }
  };

  useEffect(() => { if (tab === 'donations') loadDonations(); }, [tab, groupId]);

  const handleCreateDonation = async () => {
    if (!groupId) return;
    if (!donationForm.forUserId || !donationForm.amount || !donationForm.date) {
      Alert.alert('', zh ? '請填寫必填欄位' : 'Please fill in all required fields.');
      return;
    }
    setDonationSaving(true);
    try {
      await apiFetch(`/groups/${groupId}/donations`, {
        method: 'POST',
        body: JSON.stringify({
          forUserId: donationForm.forUserId,
          amount: parseFloat(donationForm.amount),
          currency: donationForm.currency,
          date: donationForm.date,
          note: donationForm.note || undefined,
        }),
      });
      setDonationForm({ forUserId: '', amount: '', currency: 'NTD', date: new Date().toISOString().slice(0, 10), note: '' });
      setShowDonationModal(false);
      await loadDonations();
      Alert.alert('✓', zh ? '捐款記錄已新增。' : 'Donation recorded.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed.');
    } finally { setDonationSaving(false); }
  };

  const handleDeleteDonation = (id: string) => {
    Alert.alert(
      zh ? '刪除記錄' : 'Delete Record',
      zh ? '確定要刪除此捐款記錄嗎？' : 'Delete this donation record?',
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        { text: zh ? '刪除' : 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiFetch(`/groups/${groupId}/donations/${id}`, { method: 'DELETE' });
            setDonations((prev) => prev.filter((d) => d.id !== id));
          } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed.'); }
        }},
      ]
    );
  };

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
        body: JSON.stringify({ name: groupName.trim(), description: groupDescription.trim(), photoUrl }),
      });
      Alert.alert('✓', zh ? '設定已儲存' : 'Settings saved.');
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to save settings'); }
    finally { setSettingsSaving(false); }
  };


  const handleCreateParentGroup = async () => {
    const name = createParentName.trim();
    if (!name) { Alert.alert('', zh ? '請輸入群組名稱' : 'Group name required.'); return; }
    Alert.alert(
      zh ? '建立父群組' : 'Create Parent Group',
      zh ? `將建立新群組「${name}」並設為父群組。` : `Create "${name}" and set as parent group?`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        { text: zh ? '確定' : 'Confirm', onPress: async () => {
          setCreateParentSubmitting(true); setHierarchyError(''); setHierarchySuccess('');
          try {
            const created = await apiFetch<{ id: string }>('/groups', { method: 'POST', body: JSON.stringify({ name, pid: slugifyPid(name) }) });
            const req = await apiFetch<{ id: string }>(`/groups/${groupId}/relationship-requests`, { method: 'POST', body: JSON.stringify({ parentGroupId: created.id }) });
            await apiFetch(`/groups/relationship-requests/${req.id}/review`, { method: 'POST', body: JSON.stringify({ action: 'approve' }) });
            setCreateParentName('');
            await loadHierarchy();
            setHierarchySuccess(zh ? `父群組「${name}」已建立並連結。` : `Parent group "${name}" created and linked.`);
          } catch (err: any) { setHierarchyError(err.message ?? 'Failed.'); }
          finally { setCreateParentSubmitting(false); }
        }},
      ]
    );
  };

  const handleCreateChildGroup = async () => {
    const name = createChildName.trim();
    if (!name) { Alert.alert('', zh ? '請輸入群組名稱' : 'Group name required.'); return; }
    Alert.alert(
      zh ? '建立子群組' : 'Create Child Group',
      zh ? `將建立新群組「${name}」並設為子群組。` : `Create "${name}" and add as child group?`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        { text: zh ? '確定' : 'Confirm', onPress: async () => {
          setCreateChildSubmitting(true); setHierarchyError(''); setHierarchySuccess('');
          try {
            const created = await apiFetch<{ id: string }>('/groups', { method: 'POST', body: JSON.stringify({ name, pid: slugifyPid(name) }) });
            const req = await apiFetch<{ id: string }>(`/groups/${created.id}/relationship-requests`, { method: 'POST', body: JSON.stringify({ parentGroupId: groupId }) });
            await apiFetch(`/groups/relationship-requests/${req.id}/review`, { method: 'POST', body: JSON.stringify({ action: 'approve' }) });
            setCreateChildName('');
            await loadHierarchy();
            setHierarchySuccess(zh ? `子群組「${name}」已建立並連結。` : `Child group "${name}" created and linked.`);
          } catch (err: any) { setHierarchyError(err.message ?? 'Failed.'); }
          finally { setCreateChildSubmitting(false); }
        }},
      ]
    );
  };

  const handleSearchParent = async () => {
    const q = parentSearchQuery.trim();
    if (!q) return;
    setParentSearching(true);
    try {
      const res = await apiFetch<{ groups: GroupSearchResult[] }>(`/groups?search=${encodeURIComponent(q)}&limit=5`);
      setParentSearchResults((res.groups ?? []).filter((g) => g.id !== groupId));
    } catch { setParentSearchResults([]); } finally { setParentSearching(false); }
  };

  const handleLinkParentGroup = async (parentId: string, parentName: string) => {
    Alert.alert(
      zh ? '連結父群組' : 'Link Parent Group',
      zh ? `送出申請，待「${parentName}」管理員核准後生效。` : `Request "${parentName}" as parent? Their admin must approve.`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        { text: zh ? '送出' : 'Send Request', onPress: async () => {
          setParentLinking(true); setHierarchyError(''); setHierarchySuccess('');
          try {
            await apiFetch(`/groups/${groupId}/relationship-requests`, { method: 'POST', body: JSON.stringify({ parentGroupId: parentId }) });
            setParentSearchQuery(''); setParentSearchResults([]);
            setHierarchySuccess(zh ? `已送出申請，待「${parentName}」管理員核准。` : `Request sent — awaiting approval from "${parentName}"'s admin.`);
          } catch (err: any) { setHierarchyError(err.message ?? 'Failed.'); }
          finally { setParentLinking(false); }
        }},
      ]
    );
  };

  const handleSearchChild = async () => {
    const q = childSearchQuery.trim();
    if (!q) return;
    setChildSearching(true);
    try {
      const res = await apiFetch<{ groups: GroupSearchResult[] }>(`/groups?search=${encodeURIComponent(q)}&limit=5`);
      setChildSearchResults((res.groups ?? []).filter((g) => g.id !== groupId));
    } catch { setChildSearchResults([]); } finally { setChildSearching(false); }
  };

  const handleLinkChildGroup = async (childId: string, childName: string) => {
    Alert.alert(
      zh ? '連結子群組' : 'Link Child Group',
      zh ? `送出申請，待「${childName}」管理員核准後生效。` : `Request "${childName}" as child? Their admin must approve.`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        { text: zh ? '送出' : 'Send Request', onPress: async () => {
          setChildLinking(true); setHierarchyError(''); setHierarchySuccess('');
          try {
            await apiFetch(`/groups/${childId}/relationship-requests`, { method: 'POST', body: JSON.stringify({ parentGroupId: groupId }) });
            setChildSearchQuery(''); setChildSearchResults([]);
            setHierarchySuccess(zh ? `已送出申請，待「${childName}」管理員核准。` : `Request sent — awaiting approval from "${childName}"'s admin.`);
          } catch (err: any) { setHierarchyError(err.message ?? 'Failed.'); }
          finally { setChildLinking(false); }
        }},
      ]
    );
  };

  const handleUnlink = async (type: 'parent' | 'child', targetId: string, targetName: string) => {
    Alert.alert(
      zh ? '解除連結' : 'Unlink',
      zh ? `確定解除與「${targetName}」的連結嗎？` : `Unlink "${targetName}"?`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        { text: zh ? '解除' : 'Unlink', style: 'destructive', onPress: async () => {
          setHierarchyError(''); setHierarchySuccess('');
          try {
            const targetGroupId = type === 'parent' ? groupId : targetId;
            await apiFetch(`/groups/${targetGroupId}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: null }) });
            await loadHierarchy();
            setHierarchySuccess(zh ? `已解除與「${targetName}」的連結。` : `Unlinked from "${targetName}".`);
          } catch (err: any) { setHierarchyError(err.message ?? 'Failed.'); }
        }},
      ]
    );
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: zh ? '設定' : 'Settings' },
    { key: 'roster', label: zh ? '新增成員' : 'Add Members' },
    { key: 'requests', label: joinRequests.length > 0 ? `${zh ? '申請' : 'Requests'} (${joinRequests.length})` : (zh ? '申請' : 'Requests') },
    { key: 'donations' as Tab, label: zh ? '捐款' : 'Donations' },
    ...(isPlatformAdmin ? [{ key: 'hierarchy' as Tab, label: zh ? '群組架構' : 'Hierarchy' }] : []),
  ];

  const headerTitle = groupName ? `${groupName} ${zh ? '設定' : 'Settings'}` : (zh ? '群組設定' : 'Group Settings');

  return (
    <>
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerTitle, gestureEnabled: true }} />

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]} onPress={() => setTab(t.key)}>
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
          <TouchableOpacity style={styles.primaryBtn} onPress={saveSettings} disabled={settingsSaving}>
            <Text style={styles.primaryBtnText}>{settingsSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存設定' : 'Save Settings')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Members */}
      {tab === 'roster' && (
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
            <Text style={styles.sectionTitle}>{zh ? '批量匯入' : 'Bulk Import'}</Text>
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

      {/* Hierarchy (platform admin only) */}
      {tab === 'hierarchy' && isPlatformAdmin && (
        <View style={{ gap: 12 }}>
          {hierarchyError ? <Text style={styles.hierarchyError}>{hierarchyError}</Text> : null}
          {hierarchySuccess ? <Text style={styles.hierarchySuccess}>{hierarchySuccess}</Text> : null}
          {hierarchyLoading && <Text style={styles.muted}>{zh ? '載入中…' : 'Loading…'}</Text>}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '父群組' : 'Parent Group'}</Text>
            <Text style={styles.muted}>{zh ? '設定此群組所屬的上層群組。' : 'Set the parent group this one sits under.'}</Text>
            {relationships?.parentGroup ? (
              <View style={styles.hierarchyRelRow}>
                <Text style={styles.reqPrimary}>{relationships.parentGroup.name}</Text>
                <TouchableOpacity style={styles.unlinkBtn} onPress={() => handleUnlink('parent', relationships!.parentGroup!.id, relationships!.parentGroup!.name)}>
                  <Text style={styles.unlinkBtnText}>{zh ? '解除' : 'Unlink'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.reqMeta}>{zh ? '尚無父群組。' : 'No parent group yet.'}</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '建立新父群組' : 'Create New Parent Group'}</Text>
            <TextInput style={styles.input} value={createParentName} onChangeText={setCreateParentName} placeholder={zh ? '新父群組名稱' : 'New parent group name'} placeholderTextColor={colors.placeholder} />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateParentGroup} disabled={createParentSubmitting}>
              <Text style={styles.primaryBtnText}>{createParentSubmitting ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立並連結' : 'Create & Link')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '連結現有父群組' : 'Link Existing Parent Group'}</Text>
            <Text style={styles.muted}>{zh ? '送出申請，待對方管理員核准後生效。' : "Submit a request — the other group's admin must approve."}</Text>
            <View style={styles.searchRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={parentSearchQuery} onChangeText={setParentSearchQuery} placeholder={zh ? '搜尋群組名稱' : 'Search group name'} placeholderTextColor={colors.placeholder} onSubmitEditing={handleSearchParent} returnKeyType="search" />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearchParent} disabled={parentSearching}>
                <Text style={styles.searchBtnText}>{parentSearching ? '…' : (zh ? '搜尋' : 'Search')}</Text>
              </TouchableOpacity>
            </View>
            {parentSearchResults.map((g) => (
              <View key={g.id} style={styles.hierarchyRelRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqPrimary}>{g.name}</Text>
                  {g.description ? <Text style={styles.reqMeta}>{g.description}</Text> : null}
                </View>
                <TouchableOpacity style={[styles.approveBtn, { opacity: parentLinking ? 0.5 : 1 }]} onPress={() => handleLinkParentGroup(g.id, g.name)} disabled={parentLinking}>
                  <Text style={styles.approveBtnText}>{zh ? '送出申請' : 'Send Request'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '子群組' : 'Child Groups'}</Text>
            <Text style={styles.muted}>{zh ? '此群組下的子群組。' : 'Groups that sit beneath this one.'}</Text>
            {(relationships?.subgroups ?? []).length === 0 ? (
              <Text style={styles.reqMeta}>{zh ? '尚無子群組。' : 'No child groups yet.'}</Text>
            ) : relationships!.subgroups.map((sg) => (
              <View key={sg.id} style={styles.hierarchyRelRow}>
                <Text style={styles.reqPrimary}>{sg.name}</Text>
                <TouchableOpacity style={styles.unlinkBtn} onPress={() => handleUnlink('child', sg.id, sg.name)}>
                  <Text style={styles.unlinkBtnText}>{zh ? '解除' : 'Unlink'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '建立新子群組' : 'Create New Child Group'}</Text>
            <TextInput style={styles.input} value={createChildName} onChangeText={setCreateChildName} placeholder={zh ? '新子群組名稱' : 'New child group name'} placeholderTextColor={colors.placeholder} />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateChildGroup} disabled={createChildSubmitting}>
              <Text style={styles.primaryBtnText}>{createChildSubmitting ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立並連結' : 'Create & Link')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '連結現有子群組' : 'Link Existing Child Group'}</Text>
            <Text style={styles.muted}>{zh ? '送出申請，待對方管理員核准後生效。' : "Submit a request — the other group's admin must approve."}</Text>
            <View style={styles.searchRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={childSearchQuery} onChangeText={setChildSearchQuery} placeholder={zh ? '搜尋群組名稱' : 'Search group name'} placeholderTextColor={colors.placeholder} onSubmitEditing={handleSearchChild} returnKeyType="search" />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearchChild} disabled={childSearching}>
                <Text style={styles.searchBtnText}>{childSearching ? '…' : (zh ? '搜尋' : 'Search')}</Text>
              </TouchableOpacity>
            </View>
            {childSearchResults.map((g) => (
              <View key={g.id} style={styles.hierarchyRelRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqPrimary}>{g.name}</Text>
                  {g.description ? <Text style={styles.reqMeta}>{g.description}</Text> : null}
                </View>
                <TouchableOpacity style={[styles.approveBtn, { opacity: childLinking ? 0.5 : 1 }]} onPress={() => handleLinkChildGroup(g.id, g.name)} disabled={childLinking}>
                  <Text style={styles.approveBtnText}>{zh ? '送出申請' : 'Send Request'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Donations */}
      {tab === 'donations' && (
        <View style={{ gap: 12 }}>
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{zh ? '捐款記錄' : 'Donation Records'}</Text>
                <Text style={styles.muted}>{zh ? '記錄並追蹤成員捐款歷史（新台幣或美金）。' : 'Record and track member donations in NTD or USD.'}</Text>
              </View>
              <TouchableOpacity style={styles.donationAddBtn} onPress={() => setShowDonationModal(true)}>
                <Text style={styles.donationAddBtnText}>{zh ? '+ 新增' : '+ Add'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 8, gap: 6 }}>
              {donationsLoading ? (
                <Text style={styles.muted}>{zh ? '載入中…' : 'Loading…'}</Text>
              ) : donations.length === 0 ? (
                <Text style={styles.reqMeta}>{zh ? '尚無捐款記錄。' : 'No donation records yet.'}</Text>
              ) : donations.map((d) => (
                <View key={d.id} style={styles.donationRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.reqPrimary}>{d.forUser.displayName ?? d.forUser.email}</Text>
                    <Text style={styles.donationAmount}>{Number(d.amount).toLocaleString()} {d.currency}</Text>
                    <Text style={styles.reqMeta}>{new Date(d.date).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}{d.note ? `  ·  ${d.note}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteDonation(d.id)}>
                    <Text style={styles.deleteDonationBtn}>{zh ? '刪除' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScrollView>

    {/* Add Donation Modal */}
    <Modal visible={showDonationModal} animationType="slide" transparent onRequestClose={() => setShowDonationModal(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDonationModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>{zh ? '新增捐款記錄' : 'Add Donation Record'}</Text>
              <TouchableOpacity onPress={() => setShowDonationModal(false)}>
                <Text style={{ fontSize: 18, color: colors.subtext }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.donationHint}>
              <Text style={styles.donationHintTitle}>{zh ? '格式說明' : 'Format'}</Text>
              <Text style={styles.donationHintText}>{zh ? '成員 · 金額 · 幣別（NTD / USD）· 日期 · 備註（選填）' : 'Member · Amount · Currency (NTD / USD) · Date · Note (optional)'}</Text>
              <Text style={styles.donationHintExample}>{zh ? '例：王小明 · 1000 · NTD · 2024-03-15 · 春季奉獻' : 'e.g. Jane Smith · 500 · USD · 2024-03-15 · Spring offering'}</Text>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>{zh ? '成員 *' : 'Member *'}</Text>
              {showMemberPicker ? (
                <View style={[styles.card, { marginBottom: 8, gap: 4 }]}>
                  {groupMembers.map((m) => (
                    <TouchableOpacity key={m.userId} style={[styles.reqRow, donationForm.forUserId === m.userId && { borderColor: INDIGO, backgroundColor: '#EEF2FF' }]}
                      onPress={() => { setDonationForm((f) => ({ ...f, forUserId: m.userId })); setShowMemberPicker(false); }}>
                      <Text style={styles.reqPrimary}>{m.groupNickname ?? m.displayName ?? m.email ?? m.userId}</Text>
                      {m.email ? <Text style={styles.reqMeta}>{m.email}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity style={[styles.input, { justifyContent: 'center', marginBottom: 8 }]} onPress={() => setShowMemberPicker(true)}>
                  <Text style={{ color: donationForm.forUserId ? colors.text : colors.placeholder, fontSize: 14 }}>
                    {donationForm.forUserId
                      ? (groupMembers.find((m) => m.userId === donationForm.forUserId)?.groupNickname ?? groupMembers.find((m) => m.userId === donationForm.forUserId)?.displayName ?? donationForm.forUserId)
                      : (zh ? '選擇成員…' : 'Select member…')}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>{zh ? '金額 *' : 'Amount *'}</Text>
                  <TextInput style={styles.input} value={donationForm.amount} onChangeText={(v) => setDonationForm((f) => ({ ...f, amount: v }))}
                    placeholder="0" placeholderTextColor={colors.placeholder} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>{zh ? '幣別' : 'Currency'}</Text>
                  <View style={styles.roleRow}>
                    {(['NTD', 'USD'] as const).map((c) => (
                      <TouchableOpacity key={c} style={[styles.roleBtn, { flex: 1 }, donationForm.currency === c && styles.roleBtnActive]}
                        onPress={() => setDonationForm((f) => ({ ...f, currency: c }))}>
                        <Text style={[styles.roleBtnText, donationForm.currency === c && styles.roleBtnTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.fieldLabel}>{zh ? '日期 *（YYYY-MM-DD）' : 'Date * (YYYY-MM-DD)'}</Text>
              <TextInput style={[styles.input, { marginBottom: 8 }]} value={donationForm.date}
                onChangeText={(v) => setDonationForm((f) => ({ ...f, date: v }))}
                placeholder="2024-01-15" placeholderTextColor={colors.placeholder} keyboardType="numbers-and-punctuation" />

              <Text style={styles.fieldLabel}>{zh ? '備註（選填）' : 'Note (optional)'}</Text>
              <TextInput style={[styles.input, { marginBottom: 16 }]} value={donationForm.note}
                onChangeText={(v) => setDonationForm((f) => ({ ...f, note: v }))}
                placeholder={zh ? '例：春季奉獻' : 'e.g. Spring offering'} placeholderTextColor={colors.placeholder} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.roleBtn, { flex: 1, paddingVertical: 12 }]} onPress={() => setShowDonationModal(false)}>
                  <Text style={styles.roleBtnText}>{zh ? '取消' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1, opacity: donationSaving ? 0.5 : 1 }]} onPress={handleCreateDonation} disabled={donationSaving}>
                  <Text style={styles.primaryBtnText}>{donationSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '新增捐款' : 'Add Donation')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

const INDIGO = '#4F46E5';

function makeStyles(colors: ReturnType<typeof import('../../../../context/theme.context').useTheme>['colors']) {
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
    resultBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 8, padding: 12, gap: 6 },
    resultTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
    resultSubtitle: { fontSize: 12, color: '#B45309' },
    passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#FDE68A' },
    passwordText: { flex: 1, fontSize: 13, fontFamily: 'monospace', color: '#111827' },
    copyBtn: { color: INDIGO, fontSize: 12, fontWeight: '600' },
    dismissBtn: { color: colors.placeholder, fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
    bulkResultRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, gap: 2 },
    removeBtn: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFF5F5' },
    removeBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
    hierarchyRelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    searchBtn: { borderWidth: 1, borderColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#EEF2FF' },
    searchBtnText: { color: '#4338CA', fontSize: 13, fontWeight: '600' },
    unlinkBtn: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FFF5F5' },
    unlinkBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
    hierarchyError: { color: '#DC2626', fontSize: 13, backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, padding: 10 },
    hierarchySuccess: { color: '#16A34A', fontSize: 13, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 8, padding: 10 },
    donationAddBtn: { backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    donationAddBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    donationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
    donationAmount: { fontSize: 14, fontWeight: '700', color: '#059669', fontVariant: ['tabular-nums'] },
    deleteDonationBtn: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    donationHint: { backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginBottom: 12, gap: 2 },
    donationHintTitle: { fontSize: 11, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase', letterSpacing: 0.5 },
    donationHintText: { fontSize: 11, color: colors.subtext },
    donationHintExample: { fontSize: 11, color: colors.placeholder, fontStyle: 'italic' },
  });
}
