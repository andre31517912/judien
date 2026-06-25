import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Clipboard, Image, Modal, KeyboardAvoidingView, Platform, Share, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from 'expo-router';
import JLogo from '../../../../components/JLogo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, apiUpload } from '../../../../lib/api';
import { useTheme } from '../../../../context/theme.context';
import { useAuth } from '../../../../context/auth.context';

type JoinRequest = { id: string; status: string; note: string | null; createdAt: string; requester: { id: string; displayName: string | null; email: string } };
type BulkResult = { displayName: string; email?: string; phone?: string; created: boolean; added: boolean; tempPassword?: string; error?: string };
type RosterMember = { userId: string; groupNickname: string | null; displayName: string | null; email: string | null; phoneE164: string | null; joinedAt: string | null; role: string };
type DonationRecord = { id: string; forUserId: string; amount: string; currency: string; date: string; note: string | null; forUser: { id: string; displayName: string | null; email: string } };

const INDIGO = '#4F46E5';

function slugifyPid(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

type Tab = 'general' | 'roster' | 'hierarchy';

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const zh = i18n.language === 'zh';
  const isPlatformAdmin = user?.role === 'ADMIN';
  const navigation = useNavigation();
  const router = useRouter();

  useFocusEffect(useCallback(() => {
    navigation.getParent()?.setOptions({
      headerShown: true,
      headerTitle: () => <JLogo />,
      headerStyle: { backgroundColor: colors.headerBg },
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color={INDIGO} />
          <Text style={{ color: INDIGO, fontSize: 17 }}>{zh ? '群組首頁' : 'Group Home'}</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="search" size={24} color={INDIGO} />
        </TouchableOpacity>
      ),
    });
    return () => {
      navigation.getParent()?.setOptions({ headerLeft: undefined, headerRight: undefined });
    };
  }, [zh, colors.headerBg]));

  const [isGroupAdmin, setIsGroupAdmin] = useState(false);

  const [tab, setTab] = useState<Tab>('general');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [discoverableBySearch, setDiscoverableBySearch] = useState(true);

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
  type RelNode = { id: string; name: string };
  type Relationships = { parentGroup: RelNode | null; subgroups: RelNode[] };
  type RelationshipRequest = { id: string; status: string; sourceGroupId: string; sourceGroupName: string; targetGroupId: string; targetGroupName: string; createdAt: string };
  const [relationships, setRelationships] = useState<Relationships | null>(null);
  const [incomingRelRequests, setIncomingRelRequests] = useState<RelationshipRequest[]>([]);
  const [outgoingRelRequests, setOutgoingRelRequests] = useState<RelationshipRequest[]>([]);
  // Parent management
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<{ id: string; name: string; description: string }[]>([]);
  const [parentSearching, setParentSearching] = useState(false);
  const [sendingRelReq, setSendingRelReq] = useState(false);
  const [unlinkingParent, setUnlinkingParent] = useState(false);
  const [showCreateParent, setShowCreateParent] = useState(false);
  const [newParentName, setNewParentName] = useState('');
  const [newParentDesc, setNewParentDesc] = useState('');
  const [creatingParent, setCreatingParent] = useState(false);
  // Child management
  const [childSearchQuery, setChildSearchQuery] = useState('');
  const [childSearchResults, setChildSearchResults] = useState<{ id: string; name: string; description: string }[]>([]);
  const [childSearching, setChildSearching] = useState(false);
  const [linkingChild, setLinkingChild] = useState(false);
  const [unlinkingChildId, setUnlinkingChildId] = useState<string | null>(null);
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildDesc, setNewChildDesc] = useState('');
  const [childMemberIds, setChildMemberIds] = useState<string[]>([]);
  const [creatingChild, setCreatingChild] = useState(false);
  const [hierarchyMembers, setHierarchyMembers] = useState<RosterMember[]>([]);

  // Report
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportLoading, setReportLoading] = useState(false);

  const generateReport = async () => {
    if (!groupId) return;
    setReportLoading(true);
    try {
      type ReportData = {
        groupName: string; year: number; totalEvents: number; totalMembers: number;
        members: { userId: string; displayName: string | null; email: string; going: number; no: number; noResponse: number; attendanceRate: number; totalDonatedUSD: number; totalDonatedNTD: number }[];
      };
      const data = await apiFetch<ReportData>(`/groups/${groupId}/report?year=${reportYear}`);
      const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const row = (...cols: (string | number)[]) => cols.map(esc).join(',');
      const lines: string[] = [];
      lines.push(row('Group', data.groupName));
      lines.push(row('Year', data.year));
      lines.push(row('Total Events', data.totalEvents));
      lines.push(row('Total Members', data.totalMembers));
      lines.push('');
      lines.push(row('Member', 'Attended', 'Absent', 'Unresponded', 'Attendance%', 'Donation'));
      for (const m of data.members) {
        const donations: string[] = [];
        if (m.totalDonatedNTD > 0) donations.push(`$${m.totalDonatedNTD.toLocaleString()} NTD`);
        if (m.totalDonatedUSD > 0) donations.push(`$${m.totalDonatedUSD.toLocaleString()} USD`);
        lines.push(row(m.displayName ?? m.email, m.going, m.no, m.noResponse, `${m.attendanceRate}%`, donations.join(', ') || '—'));
      }
      await Share.share({ message: lines.join('\n'), title: `${data.groupName} ${data.year} Report` });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to generate report.');
    } finally { setReportLoading(false); }
  };

  // Donations
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationForm, setDonationForm] = useState({ forUserId: '', amount: '', currency: 'NTD', date: new Date().toISOString().slice(0, 10), note: '' });
  const [donationSaving, setDonationSaving] = useState(false);
  const [groupMembers, setGroupMembers] = useState<RosterMember[]>([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const loadData = async () => {
    if (!groupId) return;
    try {
      const [myGroups, reqData, relData, relReqData, mems] = await Promise.all([
        apiFetch<Array<{ group: { discoverableBySearch: boolean; photoUrl?: string | null } }>>('/groups/me'),
        apiFetch<JoinRequest[]>(`/groups/${groupId}/join-requests`).catch(() => []),
        apiFetch<Relationships>(`/groups/${groupId}/relationships`).catch(() => null),
        apiFetch<{ incoming: RelationshipRequest[]; outgoing: RelationshipRequest[] }>(`/groups/${groupId}/relationship-requests`).catch(() => ({ incoming: [], outgoing: [] })),
        apiFetch<RosterMember[]>(`/groups/${groupId}/members`).catch(() => []),
      ]);
      const current = myGroups.find((m: any) => m.group.id === groupId);
      if (current) {
        setGroupName((current.group as any).name ?? '');
        setGroupDescription((current.group as any).description ?? '');
        setPhotoUrl((current.group as any).photoUrl ?? null);
        setDiscoverableBySearch((current.group as any).discoverableBySearch ?? true);
        setIsGroupAdmin((current as any).membership?.role === 'GROUP_ADMIN' || (current.group as any).createdById === user?.id);
      }
      setJoinRequests((reqData ?? []).filter((req) => req.status === 'PENDING'));
      if (relData) setRelationships(relData);
      setIncomingRelRequests((relReqData?.incoming ?? []).filter((r) => r.status === 'PENDING'));
      setOutgoingRelRequests((relReqData?.outgoing ?? []).filter((r) => r.status === 'PENDING'));
      setHierarchyMembers(mems ?? []);
    } catch {
      setJoinRequests([]);
    }
  };

  const searchGroupsForParent = async (q: string) => {
    if (!q.trim()) { setParentSearchResults([]); return; }
    setParentSearching(true);
    try {
      const res = await apiFetch<{ id: string; name: string; description: string }[]>(`/groups/search?q=${encodeURIComponent(q)}`);
      setParentSearchResults(Array.isArray(res) ? res : []);
    } catch { setParentSearchResults([]); }
    finally { setParentSearching(false); }
  };

  const searchGroupsForChild = async (q: string) => {
    if (!q.trim()) { setChildSearchResults([]); return; }
    setChildSearching(true);
    try {
      const res = await apiFetch<{ id: string; name: string; description: string }[]>(`/groups/search?q=${encodeURIComponent(q)}`);
      setChildSearchResults(Array.isArray(res) ? res : []);
    } catch { setChildSearchResults([]); }
    finally { setChildSearching(false); }
  };

  const sendRelationshipRequest = async (targetGroupId: string) => {
    if (!groupId) return;
    setSendingRelReq(true);
    try {
      await apiFetch(`/groups/${groupId}/relationship-requests`, {
        method: 'POST',
        body: JSON.stringify({ parentGroupId: targetGroupId }),
      });
      Alert.alert('✓', zh ? '父群組申請已送出，等待對方管理員審核。' : 'Parent group request sent, awaiting approval.');
      setParentSearchQuery('');
      setParentSearchResults([]);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send request.');
      await loadData();
    }
    finally { setSendingRelReq(false); }
  };

  const linkExistingChild = async (childGroupId: string) => {
    if (!groupId) return;
    setLinkingChild(true);
    try {
      await apiFetch(`/groups/${childGroupId}/relationship-requests`, {
        method: 'POST',
        body: JSON.stringify({ parentGroupId: groupId }),
      });
      Alert.alert('✓', zh ? '申請已送出，等待對方管理員審核。' : 'Request sent, awaiting approval from that group\'s admin.');
      setChildSearchQuery('');
      setChildSearchResults([]);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed.');
      await loadData();
    }
    finally { setLinkingChild(false); }
  };

  const createParentGroup = async () => {
    if (!newParentName.trim()) { Alert.alert('', zh ? '請輸入群組名稱' : 'Name required'); return; }
    setCreatingParent(true);
    try {
      const newGroup = await apiFetch<{ id: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newParentName.trim(), description: newParentDesc.trim() }),
      });
      const req = await apiFetch<{ id: string }>(`/groups/${groupId}/relationship-requests`, {
        method: 'POST',
        body: JSON.stringify({ parentGroupId: newGroup.id }),
      });
      await apiFetch(`/groups/relationship-requests/${req.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      });
      setNewParentName('');
      setNewParentDesc('');
      setShowCreateParent(false);
      await loadData();
      Alert.alert('✓', zh ? '父群組已建立並連結。' : 'Parent group created and linked.');
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed.'); }
    finally { setCreatingParent(false); }
  };

  const createChildGroup = async () => {
    if (!newChildName.trim()) { Alert.alert('', zh ? '請輸入群組名稱' : 'Name required'); return; }
    setCreatingChild(true);
    try {
      const newGroup = await apiFetch<{ id: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newChildName.trim(), description: newChildDesc.trim(), ...(childMemberIds.length > 0 ? { initialMemberIds: childMemberIds } : {}) }),
      });
      const req = await apiFetch<{ id: string }>(`/groups/${newGroup.id}/relationship-requests`, {
        method: 'POST',
        body: JSON.stringify({ parentGroupId: groupId }),
      });
      await apiFetch(`/groups/relationship-requests/${req.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      });
      setNewChildName('');
      setNewChildDesc('');
      setChildMemberIds([]);
      setShowCreateChild(false);
      await loadData();
      Alert.alert('✓', zh ? '子群組已建立並連結。' : 'Child group created and linked.');
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed.'); }
    finally { setCreatingChild(false); }
  };

  const unlinkParent = async () => {
    if (!groupId) return;
    Alert.alert(
      zh ? '移除父群組' : 'Remove Parent Group',
      zh ? '確定要解除與父群組的關聯嗎？' : 'Remove the parent group link?',
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        { text: zh ? '移除' : 'Remove', style: 'destructive', onPress: async () => {
          setUnlinkingParent(true);
          try {
            await apiFetch(`/groups/${groupId}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: null }) });
            await loadData();
          } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to unlink.'); }
          finally { setUnlinkingParent(false); }
        }},
      ]
    );
  };

  const unlinkChild = async (childGroupId: string, childName: string) => {
    if (!groupId) return;
    Alert.alert(
      zh ? '移除子群組' : 'Remove Child Group',
      zh ? `確定要解除與「${childName}」的連結嗎？` : `Remove link with "${childName}"?`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        { text: zh ? '移除' : 'Remove', style: 'destructive', onPress: async () => {
          setUnlinkingChildId(childGroupId);
          try {
            await apiFetch(`/groups/${childGroupId}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: null }) });
            await loadData();
          } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed.'); }
          finally { setUnlinkingChildId(null); }
        }},
      ]
    );
  };

  const reviewRelRequest = async (reqId: string, action: 'approve' | 'reject') => {
    try {
      await apiFetch(`/groups/relationship-requests/${reqId}/review`, { method: 'POST', body: JSON.stringify({ action }) });
      await loadData();
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed.'); }
  };

  const toggleChildMember = (userId: string) => {
    setChildMemberIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  useEffect(() => { loadData(); }, [groupId]);

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

  const doPickGroupPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('', zh ? '需要相簿權限' : 'Photo library permission required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.7,
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

  const handleGroupPhotoPress = () => {
    if (photoUrl) {
      Alert.alert(
        zh ? '群組照片' : 'Group Photo',
        undefined,
        [
          { text: zh ? '移除照片' : 'Remove Photo', style: 'destructive', onPress: () => setPhotoUrl(null) },
          { text: zh ? '更換照片' : 'Replace Photo', onPress: doPickGroupPhoto },
          { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        ],
      );
    } else {
      doPickGroupPhoto();
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
      const phone = parts[2] && parts[2].trim() ? parts[2].trim() : undefined;
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
        body: JSON.stringify({ name: groupName.trim(), description: groupDescription.trim(), photoUrl, discoverableBySearch }),
      });
      Alert.alert('✓', zh ? '設定已儲存' : 'Settings saved.');
    } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to save settings'); }
    finally { setSettingsSaving(false); }
  };


  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: zh ? '設定' : 'Settings' },
    { key: 'roster', label: joinRequests.length > 0 ? `${zh ? '成員' : 'Members'} (${joinRequests.length})` : (zh ? '成員' : 'Members') },
    { key: 'hierarchy', label: incomingRelRequests.length > 0 ? `${zh ? '層級' : 'Hierarchy'} (${incomingRelRequests.length})` : (zh ? '層級' : 'Hierarchy') },
  ];

  const headerTitle = groupName ? `${groupName} ${zh ? '設定' : 'Settings'}` : (zh ? '群組設定' : 'Group Settings');

  return (
    <>
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ gestureEnabled: true }} />

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
          <TouchableOpacity
            onPress={handleGroupPhotoPress}
            disabled={photoUploading}
            style={styles.groupPhotoArea}
            activeOpacity={0.7}
          >
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
              <View style={styles.groupPhotoInner}>
                <Ionicons name="image-outline" size={36} color={colors.placeholder} />
                <Text style={styles.groupPhotoLabel}>{zh ? '上傳照片' : 'Upload Photo'}</Text>
              </View>
            )}
            {photoUploading && (
              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </TouchableOpacity>

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
          {/* Visibility toggle */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.fieldLabel}>{zh ? '群組可見性' : 'Group Visibility'}</Text>
              <Text style={styles.muted}>
                {discoverableBySearch
                  ? (zh ? '公開 — 任何人可搜尋並申請加入' : 'Public — anyone can search and request to join')
                  : (zh ? '私密 — 僅限邀請加入' : 'Private — invite-only')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleTrack, discoverableBySearch && styles.toggleTrackOn]}
              onPress={() => setDiscoverableBySearch((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, discoverableBySearch && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={saveSettings} disabled={settingsSaving}>
            <Text style={styles.primaryBtnText}>{settingsSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存設定' : 'Save Settings')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Members */}
      {tab === 'roster' && (
        <View style={{ gap: 12 }}>
          {/* Pending join requests */}
          {joinRequests.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{zh ? `加入申請 (${joinRequests.length})` : `Join Requests (${joinRequests.length})`}</Text>
              {joinRequests.map((req) => (
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


      {/* Hierarchy */}
      {tab === 'hierarchy' && (
        <View style={{ gap: 12 }}>

          {/* ── PARENT GROUP ─────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '父群組' : 'Parent Group'}</Text>

            {relationships?.parentGroup ? (
              <View style={{ gap: 8 }}>
                <View style={[styles.reqRow, { flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqPrimary}>{relationships.parentGroup.name}</Text>
                    <Text style={styles.reqMeta}>{zh ? '目前的父群組' : 'Current parent group'}</Text>
                  </View>
                  <TouchableOpacity style={styles.unlinkBtn} onPress={unlinkParent} disabled={unlinkingParent}>
                    {unlinkingParent
                      ? <ActivityIndicator size="small" color="#DC2626" />
                      : <Text style={styles.unlinkBtnText}>{zh ? '移除' : 'Remove'}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.muted}>{zh ? '此群組目前沒有父群組。' : 'This group has no parent group.'}</Text>
            )}

            {/* Search existing group to set as parent */}
            {!relationships?.parentGroup && (
              <View style={{ gap: 6, marginTop: 4 }}>
                <Text style={styles.fieldLabel}>{zh ? '搜尋現有群組設為父群組' : 'Search existing group to set as parent'}</Text>
                <Text style={styles.muted}>{zh ? '需要對方管理員核准。' : 'Requires approval from that group\'s admin.'}</Text>
                <TextInput
                  style={styles.input}
                  value={parentSearchQuery}
                  onChangeText={(v) => { setParentSearchQuery(v); searchGroupsForParent(v); }}
                  placeholder={zh ? '搜尋群組…' : 'Search groups…'}
                  placeholderTextColor={colors.placeholder}
                />
                {parentSearching && <ActivityIndicator size="small" color={INDIGO} style={{ alignSelf: 'flex-start' }} />}
                {parentSearchResults.map((g) => (
                  <View key={g.id} style={[styles.reqRow, { flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.reqPrimary}>{g.name}</Text>
                      {g.description ? <Text style={styles.reqMeta} numberOfLines={1}>{g.description}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={[styles.approveBtn, { opacity: sendingRelReq ? 0.5 : 1 }]}
                      onPress={() => sendRelationshipRequest(g.id)}
                      disabled={sendingRelReq}
                    >
                      <Text style={styles.approveBtnText}>{zh ? '申請' : 'Request'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Create new parent group */}
            {!relationships?.parentGroup && (
              <View style={{ marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.roleBtn, showCreateParent && styles.roleBtnActive, { alignSelf: 'flex-start', paddingHorizontal: 14 }]}
                  onPress={() => setShowCreateParent((v) => !v)}
                >
                  <Text style={[styles.roleBtnText, showCreateParent && styles.roleBtnTextActive]}>
                    {zh ? (showCreateParent ? '取消建立' : '＋ 建立新父群組') : (showCreateParent ? 'Cancel' : '＋ Create New Parent Group')}
                  </Text>
                </TouchableOpacity>
                {showCreateParent && (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    <TextInput
                      style={styles.input}
                      value={newParentName}
                      onChangeText={setNewParentName}
                      placeholder={zh ? '父群組名稱（必填）' : 'Parent group name (required)'}
                      placeholderTextColor={colors.placeholder}
                    />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={newParentDesc}
                      onChangeText={setNewParentDesc}
                      placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                      placeholderTextColor={colors.placeholder}
                      multiline
                    />
                    <TouchableOpacity
                      style={[styles.primaryBtn, { opacity: creatingParent ? 0.5 : 1 }]}
                      onPress={createParentGroup}
                      disabled={creatingParent}
                    >
                      <Text style={styles.primaryBtnText}>{creatingParent ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立並連結父群組' : 'Create & Link Parent Group')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── CHILD GROUPS ─────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{zh ? '子群組' : 'Child Groups'}</Text>

            {(relationships?.subgroups?.length ?? 0) === 0 ? (
              <Text style={styles.muted}>{zh ? '此群組目前沒有子群組。' : 'No child groups yet.'}</Text>
            ) : (
              relationships!.subgroups.map((sg) => (
                <View key={sg.id} style={[styles.reqRow, { flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={[styles.reqPrimary, { flex: 1 }]}>{sg.name}</Text>
                  <TouchableOpacity
                    style={[styles.unlinkBtn, { opacity: unlinkingChildId === sg.id ? 0.5 : 1 }]}
                    onPress={() => unlinkChild(sg.id, sg.name)}
                    disabled={unlinkingChildId === sg.id}
                  >
                    {unlinkingChildId === sg.id
                      ? <ActivityIndicator size="small" color="#DC2626" />
                      : <Text style={styles.unlinkBtnText}>{zh ? '移除' : 'Remove'}</Text>}
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Link existing group as child */}
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={styles.fieldLabel}>{zh ? '搜尋現有群組設為子群組' : 'Search existing group to add as child'}</Text>
              <TextInput
                style={styles.input}
                value={childSearchQuery}
                onChangeText={(v) => { setChildSearchQuery(v); searchGroupsForChild(v); }}
                placeholder={zh ? '搜尋群組…' : 'Search groups…'}
                placeholderTextColor={colors.placeholder}
              />
              {childSearching && <ActivityIndicator size="small" color={INDIGO} style={{ alignSelf: 'flex-start' }} />}
              {childSearchResults.map((g) => (
                <View key={g.id} style={[styles.reqRow, { flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.reqPrimary}>{g.name}</Text>
                    {g.description ? <Text style={styles.reqMeta} numberOfLines={1}>{g.description}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.approveBtn, { opacity: linkingChild ? 0.5 : 1 }]}
                    onPress={() => linkExistingChild(g.id)}
                    disabled={linkingChild}
                  >
                    <Text style={styles.approveBtnText}>{zh ? '申請' : 'Request'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Create new child group */}
            <View style={{ marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.roleBtn, showCreateChild && styles.roleBtnActive, { alignSelf: 'flex-start', paddingHorizontal: 14 }]}
                onPress={() => setShowCreateChild((v) => !v)}
              >
                <Text style={[styles.roleBtnText, showCreateChild && styles.roleBtnTextActive]}>
                  {zh ? (showCreateChild ? '取消建立' : '＋ 建立新子群組') : (showCreateChild ? 'Cancel' : '＋ Create New Child Group')}
                </Text>
              </TouchableOpacity>
              {showCreateChild && (
                <View style={{ gap: 8, marginTop: 8 }}>
                  <TextInput
                    style={styles.input}
                    value={newChildName}
                    onChangeText={setNewChildName}
                    placeholder={zh ? '子群組名稱（必填）' : 'Child group name (required)'}
                    placeholderTextColor={colors.placeholder}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newChildDesc}
                    onChangeText={setNewChildDesc}
                    placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                    placeholderTextColor={colors.placeholder}
                    multiline
                  />
                  {hierarchyMembers.length > 0 && (
                    <View style={{ gap: 4 }}>
                      <Text style={styles.fieldLabel}>{zh ? '將現有成員加入子群組（可多選）' : 'Pull existing members into child group (optional)'}</Text>
                      <View style={{ gap: 4 }}>
                        {hierarchyMembers.map((m) => {
                          const selected = childMemberIds.includes(m.userId);
                          return (
                            <TouchableOpacity
                              key={m.userId}
                              style={[styles.memberCheckRow, selected && styles.memberCheckRowSelected]}
                              onPress={() => toggleChildMember(m.userId)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                                {selected && <Text style={styles.checkmark}>✓</Text>}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.reqPrimary, selected && { color: isDark ? '#818CF8' : '#4338CA' }]}>
                                  {m.groupNickname ?? m.displayName ?? m.email ?? m.userId}
                                </Text>
                                {m.email ? <Text style={styles.reqMeta}>{m.email}</Text> : null}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {childMemberIds.length > 0 && (
                        <Text style={[styles.muted, { color: isDark ? '#818CF8' : '#4338CA' }]}>
                          {zh ? `已選 ${childMemberIds.length} 人` : `${childMemberIds.length} member${childMemberIds.length > 1 ? 's' : ''} selected`}
                        </Text>
                      )}
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.primaryBtn, { opacity: creatingChild ? 0.5 : 1 }]}
                    onPress={createChildGroup}
                    disabled={creatingChild}
                  >
                    <Text style={styles.primaryBtnText}>{creatingChild ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立並連結子群組' : 'Create & Link Child Group')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* ── INCOMING REQUESTS ────────────────────────────── */}
          {incomingRelRequests.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{zh ? `收到的層級申請 (${incomingRelRequests.length})` : `Incoming Hierarchy Requests (${incomingRelRequests.length})`}</Text>
              <Text style={styles.muted}>{zh ? '有群組申請成為此群組的子群組。' : 'These groups are requesting to become a child of this group.'}</Text>
              {incomingRelRequests.map((req) => (
                <View key={req.id} style={styles.reqRow}>
                  <Text style={styles.reqPrimary}>{req.sourceGroupName}</Text>
                  <Text style={styles.reqMeta}>{zh ? '申請成為子群組' : 'Requesting to become a child group'} · {new Date(req.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}</Text>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => reviewRelRequest(req.id, 'approve')}>
                      <Text style={styles.approveBtnText}>{zh ? '核准' : 'Approve'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => reviewRelRequest(req.id, 'reject')}>
                      <Text style={styles.rejectBtnText}>{zh ? '拒絕' : 'Reject'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── OUTGOING REQUESTS ────────────────────────────── */}
          {outgoingRelRequests.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{zh ? `已送出的申請 (${outgoingRelRequests.length})` : `Outgoing Requests (${outgoingRelRequests.length})`}</Text>
              <Text style={styles.muted}>{zh ? '等待對方管理員審核。' : 'Waiting for approval from the other group\'s admin.'}</Text>
              {outgoingRelRequests.map((req) => (
                <View key={req.id} style={styles.reqRow}>
                  <Text style={styles.reqPrimary}>{zh ? '申請加入' : 'Requesting to join'}: {req.targetGroupName}</Text>
                  <Text style={styles.reqMeta}>{new Date(req.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US')}</Text>
                </View>
              ))}
            </View>
          )}

        </View>
      )}

      {/* Donations — commented out, work in progress */}
      {false && tab === ('donations' as Tab) && (
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

      {/* Annual Report — commented out, work in progress */}
      {false && tab === ('report' as Tab) && (isPlatformAdmin || isGroupAdmin) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{zh ? '年度報告' : 'Annual Report'}</Text>
          <Text style={styles.muted}>{zh ? '下載每位成員的年度出席率與捐款統計。' : 'Download per-member attendance and donation stats for any year.'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <Text style={styles.fieldLabel}>{zh ? '年份' : 'Year'}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={[styles.roleBtn, { paddingHorizontal: 10 }]} onPress={() => setReportYear((y) => y - 1)}>
                <Text style={styles.roleBtnText}>−</Text>
              </TouchableOpacity>
              <View style={[styles.roleBtn, { paddingHorizontal: 16 }]}>
                <Text style={styles.roleBtnText}>{reportYear}</Text>
              </View>
              <TouchableOpacity style={[styles.roleBtn, { paddingHorizontal: 10 }]} onPress={() => setReportYear((y) => Math.min(y + 1, new Date().getFullYear() + 1))}>
                <Text style={styles.roleBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12, opacity: reportLoading ? 0.5 : 1 }]} onPress={generateReport} disabled={reportLoading}>
            <Text style={styles.primaryBtnText}>{reportLoading ? (zh ? '生成中…' : 'Generating…') : (zh ? '生成並下載報告' : 'Generate & Download Report')}</Text>
          </TouchableOpacity>
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
                    <TouchableOpacity key={m.userId} style={[styles.reqRow, donationForm.forUserId === m.userId && { borderColor: INDIGO, backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF' }]}
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

function makeStyles(colors: ReturnType<typeof import('../../../../context/theme.context').useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    container: { padding: 16, gap: 12, backgroundColor: colors.bg },
    tabBar: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    tabBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card },
    tabBtnActive: { borderColor: INDIGO, backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF' },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: colors.subtext },
    tabBtnTextActive: { color: isDark ? '#818CF8' : '#4338CA' },
    card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.subtext },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, backgroundColor: colors.input, color: colors.inputText },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    groupPhotoArea: { width: '100%', aspectRatio: 3, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 12, overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#1f2937' : '#f9fafb' },
    groupPhotoInner: { alignItems: 'center', gap: 8 },
    groupPhotoLabel: { fontSize: 13, color: colors.placeholder },
    roleRow: { flexDirection: 'row', gap: 8 },
    roleBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 8, alignItems: 'center' },
    roleBtnActive: { borderColor: INDIGO, backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF' },
    roleBtnText: { color: colors.subtext, fontSize: 12, fontWeight: '600' },
    roleBtnTextActive: { color: isDark ? '#818CF8' : '#4338CA' },
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
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    searchBtn: { borderWidth: 1, borderColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : '#EEF2FF' },
    searchBtnText: { color: isDark ? '#818CF8' : '#4338CA', fontSize: 13, fontWeight: '600' },
    unlinkBtn: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FFF5F5' },
    unlinkBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
    donationAddBtn: { backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    donationAddBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    donationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
    donationAmount: { fontSize: 14, fontWeight: '700', color: '#059669', fontVariant: ['tabular-nums'] },
    deleteDonationBtn: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 2 },
    toggleTrackOn: { backgroundColor: INDIGO },
    toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
    toggleThumbOn: { alignSelf: 'flex-end' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    donationHint: { backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginBottom: 12, gap: 2 },
    donationHintTitle: { fontSize: 11, fontWeight: '700', color: colors.subtext, textTransform: 'uppercase', letterSpacing: 0.5 },
    donationHintText: { fontSize: 11, color: colors.subtext },
    donationHintExample: { fontSize: 11, color: colors.placeholder, fontStyle: 'italic' },
    memberCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
    memberCheckRowSelected: { borderColor: INDIGO, backgroundColor: isDark ? 'rgba(79,70,229,0.1)' : '#EEF2FF' },
    checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxSelected: { borderColor: INDIGO, backgroundColor: INDIGO },
    checkmark: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 14 },
  });
}
