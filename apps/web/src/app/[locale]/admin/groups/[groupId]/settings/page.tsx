'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload } from '@/lib/api';

const LocationPicker = dynamic(() => import('@/components/LocationPickerInner'), { ssr: false });

function slugifyPid(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

type GroupSearchResult = { id: string; pid: string; name: string; description: string; createdBy: { id: string; displayName: string | null } | null };

type GroupListItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    photoUrl?: string | null;
    discoverableBySearch: boolean;
    createdAt: string;
    updatedAt: string;
    createdById: string;
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
  joinedAt: string | null;
  email: string | null;
  phoneE164: string | null;
};

type JoinRequest = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  requester: { id: string; displayName: string | null; email: string };
};

type GroupRelationshipRequest = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  sourceGroupId: string;
  sourceGroupName: string;
  targetGroupId: string;
  targetGroupName: string;
  requesterUserId: string;
  requesterDisplayName: string | null;
  requesterEmail: string | null;
};

export default function GroupSettingsPage({ params }: { params: { locale: string; groupId: string } }) {

  const zh = params.locale === 'zh';
  const { user, loading } = useAuth();
  const router = useRouter();

  const [groupItem, setGroupItem] = useState<GroupListItem | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const importFileRef = useRef<HTMLInputElement>(null);
  const groupPhotoFileRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [groupPhotoUploading, setGroupPhotoUploading] = useState(false);
  const [groupInfoSaving, setGroupInfoSaving] = useState(false);
  const [editDiscoverableBySearch, setEditDiscoverableBySearch] = useState(true);
  const [importResult, setImportResult] = useState<{ added: number; already_member: number; not_found: number } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingImportType, setPendingImportType] = useState<'csv' | null>(null);


  const [relationships, setRelationships] = useState<{
    parentGroup: { id: string; name: string } | null;
    subgroups: { id: string; name: string; description: string }[];
  } | null>(null);
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<GroupSearchResult[]>([]);
  const [parentSearchLoading, setParentSearchLoading] = useState(false);
  const [parentSaving, setParentSaving] = useState(false);

  const [newParentForm, setNewParentForm] = useState({ name: '', description: '' });
  const [parentCreating, setParentCreating] = useState(false);

  const [childSearchQuery, setChildSearchQuery] = useState('');
  const [childSearchResults, setChildSearchResults] = useState<GroupSearchResult[]>([]);
  const [childSearchLoading, setChildSearchLoading] = useState(false);
  const [childLinking, setChildLinking] = useState(false);
  const [childSevering, setChildSevering] = useState(false);
  const [newChildForm, setNewChildForm] = useState({ name: '', description: '' });
  const [childCreating, setChildCreating] = useState(false);
  const [childInitialMemberIds, setChildInitialMemberIds] = useState<string[]>([]);
  const [incomingRelationshipRequests, setIncomingRelationshipRequests] = useState<GroupRelationshipRequest[]>([]);
  const [outgoingRelationshipRequests, setOutgoingRelationshipRequests] = useState<GroupRelationshipRequest[]>([]);
  const [reviewingRelationshipRequestId, setReviewingRelationshipRequestId] = useState<string | null>(null);

  const [memberAddMode, setMemberAddMode] = useState<'search' | 'new'>('search');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<{ id: string; displayName: string | null; email: string | null; phoneE164: string | null }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberAddRole, setMemberAddRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [memberAddLoading, setMemberAddLoading] = useState<string | null>(null);

  const [newMemberForm, setNewMemberForm] = useState({ displayName: '', phone: '', email: '' });
  const [newMemberRole, setNewMemberRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [newMemberLoading, setNewMemberLoading] = useState(false);
  const [newMemberTempPassword, setNewMemberTempPassword] = useState<{ name: string; password: string } | null>(null);
  const [newMemberPasswordMode, setNewMemberPasswordMode] = useState<'random' | 'custom'>('random');
  const [newMemberCustomPassword, setNewMemberCustomPassword] = useState('');

  // Bulk add state
  const [bulkText, setBulkText] = useState('');
  const [bulkPasswordMode, setBulkPasswordMode] = useState<'shared' | 'random'>('shared');
  const [bulkSharedPassword, setBulkSharedPassword] = useState('');
  const [bulkRole, setBulkRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [bulkLoading, setBulkLoading] = useState(false);
  type BulkResult = { displayName: string; email?: string; phone?: string; created: boolean; added: boolean; tempPassword?: string; error?: string };
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);

  const [newsForm, setNewsForm] = useState({ title: '', body: '' });
  const [newsLoading, setNewsLoading] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    timezone: 'Asia/Taipei',
    feeAmount: '',
    feeCurrency: 'TWD',
  });
  const [eventLoading, setEventLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);

  // ── Donations state ──────────────────────────────────────────────────────
  type DonationRecord = { id: string; forUserId: string; amount: string; currency: string; date: string; note: string | null; forUser: { id: string; displayName: string | null; email: string } };
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationForm, setDonationForm] = useState({ forUserId: '', amount: '', currency: 'NTD', date: new Date().toISOString().slice(0, 10), note: '' });
  const [donationSaving, setDonationSaving] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);

  const handleGroupPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGroupPhotoUploading(true);
    setError('');
    try {
      const { url } = await apiUpload(file);
      setEditPhotoUrl(url);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Photo upload failed.');
    } finally {
      setGroupPhotoUploading(false);
      if (groupPhotoFileRef.current) groupPhotoFileRef.current.value = '';
    }
  };

  const handleSaveGroupInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) { setError(zh ? '群組名稱不可為空。' : 'Group name is required.'); return; }
    setGroupInfoSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/${params.groupId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), description: editDescription.trim(), photoUrl: editPhotoUrl, discoverableBySearch: editDiscoverableBySearch }),
      });
      setSuccess(zh ? '群組資訊已更新。' : 'Group info updated.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to save group info.');
    } finally {
      setGroupInfoSaving(false);
    }
  };

  const loadDonations = async () => {
    setDonationsLoading(true);
    try {
      const data = await apiFetch<DonationRecord[]>(`/groups/${params.groupId}/donations`);
      setDonations(data);
    } catch { /* ignore */ } finally { setDonationsLoading(false); }
  };

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationForm.forUserId || !donationForm.amount || !donationForm.date) return;
    setDonationSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/${params.groupId}/donations`, {
        method: 'POST',
        body: JSON.stringify({ forUserId: donationForm.forUserId, amount: parseFloat(donationForm.amount), currency: donationForm.currency, date: donationForm.date, note: donationForm.note || undefined }),
      });
      setDonationForm({ forUserId: '', amount: '', currency: 'NTD', date: new Date().toISOString().slice(0, 10), note: '' });
      setShowDonationModal(false);
      setSuccess(zh ? '捐款記錄已新增。' : 'Donation recorded.');
      await loadDonations();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed.');
    } finally { setDonationSaving(false); }
  };

  const handleDeleteDonation = async (id: string) => {
    if (!confirm(zh ? '確定要刪除此捐款記錄嗎？' : 'Delete this donation record?')) return;
    setError('');
    try {
      await apiFetch(`/groups/${params.groupId}/donations/${id}`, { method: 'DELETE' });
      setDonations((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed.');
    }
  };

  // ── Report state ─────────────────────────────────────────────────────────
  type ReportData = {
    groupName: string; year: number; totalEvents: number; totalMembers: number;
    events: { id: string; title: string; startAt: string; memberRsvps: { userId: string; displayName: string | null; email: string; status: 'GOING' | 'NO' | null }[] }[];
    members: { userId: string; displayName: string | null; email: string; totalEvents: number; going: number; no: number; noResponse: number; attendanceRate: number; totalDonatedUSD: number; totalDonatedNTD: number }[];
  };
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportLoading, setReportLoading] = useState(false);

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const data = await apiFetch<ReportData>(`/groups/${params.groupId}/report?year=${reportYear}`);
      const csvEscape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const row = (...cols: (string | number)[]) => cols.map(csvEscape).join(',');
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
      const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.groupName}_report_${data.year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) { setError((err as Error).message ?? 'Failed.'); }
    finally { setReportLoading(false); }
  };

  const handleImportMembers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowImportModal(false);
    setPendingImportType(null);
    setImportLoading(true);
    setImportResult(null);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ''}/groups/${params.groupId}/members/import`,
        { method: 'POST', body: formData, credentials: 'include' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Import failed' }));
        throw new Error(err.message ?? 'Import failed');
      }
      const data = await res.json();
      setImportResult(data);
      setSuccess(zh ? '匯入完成。' : 'Import complete.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Import failed.');
    } finally {
      setImportLoading(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const triggerImport = () => {
    setPendingImportType('csv');
    setShowImportModal(false);
    setTimeout(() => importFileRef.current?.click(), 50);
  };

  const handleExportMembers = async () => {
    setShowExportModal(false);
    setExportLoading(true);
    setError('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(
        `${apiBase}/groups/${params.groupId}/members/export?format=csv`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members-${params.groupId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Export failed.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupItem) return;
    setDeleteGroupLoading(true);
    try {
      await apiFetch(`/groups/${params.groupId}`, { method: 'DELETE' });
      router.push(`/${params.locale}/admin/groups`);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to delete group.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteGroupLoading(false);
    }
  };

  const loadPage = async () => {
    setPageLoading(true);
    setError('');
    try {
      const [groups, memberList] = await Promise.all([
        apiFetch<GroupListItem[]>('/groups/me'),
        apiFetch<GroupMember[]>(`/groups/${params.groupId}/members`),
      ]);
      const current = groups.find((item) => item.group.id === params.groupId) ?? null;
      setGroupItem(current);
      if (current) {
        setEditName(current.group.name ?? '');
        setEditDescription(current.group.description ?? '');
        setEditPhotoUrl(current.group.photoUrl ?? null);
        setEditDiscoverableBySearch(current.group.discoverableBySearch ?? true);
      }
      setMembers(memberList);

      const reqRes = await apiFetch<JoinRequest[]>(`/groups/${params.groupId}/join-requests`).catch(() => [] as JoinRequest[]);
      setJoinRequests((reqRes ?? []).filter((r) => r.status === 'PENDING'));

      const rel = await apiFetch<{ parentGroup: { id: string; name: string } | null; subgroups: { id: string; name: string; description: string }[] }>(`/groups/${params.groupId}/relationships`).catch(() => null);
      setRelationships(rel);

      const relationRequests = await apiFetch<{ incoming: GroupRelationshipRequest[]; outgoing: GroupRelationshipRequest[] }>(
        `/groups/${params.groupId}/relationship-requests`,
      ).catch(() => ({ incoming: [], outgoing: [] }));
      setIncomingRelationshipRequests((relationRequests?.incoming ?? []).filter((r) => r.status === 'PENDING'));
      setOutgoingRelationshipRequests((relationRequests?.outgoing ?? []).filter((r) => r.status === 'PENDING'));

      if (!current) setError(zh ? '找不到此群組。' : 'Group not found.');
      void loadDonations();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load group.');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !user) return;
    loadPage();
  }, [loading, user, params.groupId]);

  const handleParentSearch = async () => {
    if (!parentSearchQuery.trim()) return;
    setParentSearchLoading(true);
    setParentSearchResults([]);
    try {
      const res = await apiFetch<GroupSearchResult[]>(`/groups/search?q=${encodeURIComponent(parentSearchQuery.trim())}`);
      setParentSearchResults(res.filter((g) => g.id !== params.groupId));
    } catch {
      // silently ignore
    } finally {
      setParentSearchLoading(false);
    }
  };

  const handleChildSearch = async () => {
    if (!childSearchQuery.trim()) return;
    setChildSearchLoading(true);
    setChildSearchResults([]);
    try {
      const res = await apiFetch<GroupSearchResult[]>(`/groups/search?q=${encodeURIComponent(childSearchQuery.trim())}`);
      setChildSearchResults(res.filter((g) => g.id !== params.groupId));
    } catch {
      // silently ignore
    } finally {
      setChildSearchLoading(false);
    }
  };

  const handleLinkChildGroup = async (childId: string, childName: string) => {
    if (!confirm(zh ? `送出申請，將「${childName}」設為此群組的子群組？對方管理員核准後生效。` : `Submit a request to link "${childName}" as a child group? The other group's admin must approve.`)) return;
    setChildLinking(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/${childId}/relationship-requests`, {
        method: 'POST',
        body: JSON.stringify({ parentGroupId: params.groupId }),
      });
      setChildSearchQuery('');
      setChildSearchResults([]);
      setSuccess(zh ? `已送出子群組連結申請，待「${childName}」管理員核准。` : `Request sent — awaiting approval from "${childName}"'s admin.`);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed.');
    } finally {
      setChildLinking(false);
    }
  };

  const handleCreateParentGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentForm.name.trim()) return;
    setParentCreating(true);
    setError('');
    setSuccess('');
    try {
      const generatedPid = slugifyPid(newParentForm.name) || `group-${Date.now().toString(36).slice(-6)}`;
      const created = await apiFetch<{ id: string; name: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify({
          pid: generatedPid,
          name: newParentForm.name.trim(),
          description: newParentForm.description.trim() || undefined,
        }),
      });
      // Source = current group, target = new group. Current user just created new group so can approve as target creator.
      const req = await apiFetch<{ id: string }>(`/groups/${params.groupId}/relationship-requests`, {
        method: 'POST',
        body: JSON.stringify({ parentGroupId: created.id }),
      });
      await apiFetch(`/groups/relationship-requests/${req.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      });
      const createdName = newParentForm.name.trim();
      setNewParentForm({ name: '', description: '' });
      setSuccess(zh ? `父群組「${createdName}」已建立並連結。` : `Parent group "${createdName}" created and linked.`);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create parent group.');
    } finally {
      setParentCreating(false);
    }
  };

  const handleCreateChildGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildForm.name.trim()) return;
    setChildCreating(true);
    setError('');
    setSuccess('');
    try {
      const generatedPid = slugifyPid(newChildForm.name) || `group-${Date.now().toString(36).slice(-6)}`;
      const created = await apiFetch<{ id: string; name: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify({
          pid: generatedPid,
          name: newChildForm.name.trim(),
          description: newChildForm.description.trim() || undefined,
          initialMemberIds: childInitialMemberIds,
        }),
      });
      // Source = new group, target = current group. Current user is creator of current group so can approve.
      const req = await apiFetch<{ id: string }>(`/groups/${created.id}/relationship-requests`, {
        method: 'POST',
        body: JSON.stringify({ parentGroupId: params.groupId }),
      });
      await apiFetch(`/groups/relationship-requests/${req.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      });
      const createdName = newChildForm.name.trim();
      setNewChildForm({ name: '', description: '' });
      setChildInitialMemberIds([]);
      setSuccess(zh ? `子群組「${createdName}」已建立並連結。` : `Child group "${createdName}" created and linked.`);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create child group.');
    } finally {
      setChildCreating(false);
    }
  };

  const handleMemberSearch = async () => {
    if (!memberSearchQuery.trim()) return;
    setMemberSearchLoading(true);
    setMemberSearchResults([]);
    try {
      const results = await apiFetch<{ id: string; displayName: string | null; email: string | null; phoneE164: string | null }[]>(
        `/groups/${params.groupId}/members/search-users?q=${encodeURIComponent(memberSearchQuery.trim())}`,
      );
      setMemberSearchResults(results);
    } catch { /* ignore */ } finally {
      setMemberSearchLoading(false);
    }
  };

  const handleAddExistingMember = async (userId: string, displayName: string | null) => {
    setMemberAddLoading(userId);
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/${params.groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ identifier: userId, role: memberAddRole }),
      });
      setMemberSearchResults((prev) => prev.filter((u) => u.id !== userId));
      setSuccess(zh ? `成員已新增：${displayName ?? userId}` : `Member added: ${displayName ?? userId}`);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to add member.');
    } finally {
      setMemberAddLoading(null);
    }
  };

  const handleCreateAndAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newMemberForm.displayName.trim()) {
      setError(zh ? '請輸入姓名。' : 'Full name is required.');
      return;
    }
    if (!newMemberForm.phone.trim() && !newMemberForm.email.trim()) {
      setError(zh ? '請輸入電話或電子郵件至少一項。' : 'Phone or email is required.');
      return;
    }
    setNewMemberLoading(true);
    try {
      const result = await apiFetch<{ created: boolean; displayName: string | null; tempPassword?: string }>(`/groups/${params.groupId}/members/new-and-add`, {
        method: 'POST',
        body: JSON.stringify({
          displayName: newMemberForm.displayName.trim(),
          phone: newMemberForm.phone.trim() || undefined,
          email: newMemberForm.email.trim() || undefined,
          role: newMemberRole,
          ...(newMemberPasswordMode === 'custom' && newMemberCustomPassword.trim()
            ? { password: newMemberCustomPassword.trim() }
            : {}),
        }),
      });
      setNewMemberForm({ displayName: '', phone: '', email: '' });
      setNewMemberRole('GROUP_MEMBER');
      setNewMemberCustomPassword('');
      setNewMemberPasswordMode('random');
      const name = result.displayName ?? newMemberForm.displayName.trim();
      if (result.created && result.tempPassword) {
        setNewMemberTempPassword({ name, password: result.tempPassword });
        setSuccess('');
      } else {
        setNewMemberTempPassword(null);
        setSuccess(
          zh ? `現有用戶已新增為成員：${name}` : `Existing user added as member: ${name}`,
        );
      }
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed.');
    } finally {
      setNewMemberLoading(false);
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBulkResults(null);
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { setError(zh ? '請輸入成員資料。' : 'Please enter member data.'); return; }
    if (bulkPasswordMode === 'shared' && !bulkSharedPassword.trim()) {
      setError(zh ? '請輸入共用密碼。' : 'Please enter the shared password.');
      return;
    }

    // Parse: Full Name, Email, Phone (all 3 columns, email and phone optional but at least one required)
    const parseErrors: string[] = [];
    const members = lines.map((line, idx) => {
      const parts = line.split(',').map((p) => p.trim());
      const displayName = parts[0] ?? '';
      const email = parts[1] && parts[1].includes('@') ? parts[1] : undefined;
      const phone = parts[2] && parts[2].startsWith('+') ? parts[2] : undefined;
      if (!displayName) {
        parseErrors.push(zh ? `第 ${idx + 1} 行：缺少姓名。` : `Line ${idx + 1}: name is required.`);
      } else if (!email && !phone) {
        parseErrors.push(zh ? `第 ${idx + 1} 行（${displayName}）：必須填入電子郵件或手機號碼至少一項。` : `Line ${idx + 1} (${displayName}): must have at least an email or phone number.`);
      }
      return { displayName, email, phone };
    }).filter((m) => m.displayName);

    if (parseErrors.length) {
      setError(parseErrors.join('\n'));
      return;
    }

    setBulkLoading(true);
    try {
      const res = await apiFetch<{ results: BulkResult[] }>(`/groups/${params.groupId}/members/bulk-create-and-add`, {
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
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Bulk add failed.');
    } finally {
      setBulkLoading(false);
    }
  };


  const handleReviewRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/join-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setSuccess(action === 'approve' ? (zh ? '已核准加入申請。' : 'Request approved.') : (zh ? '已拒絕加入申請。' : 'Request rejected.'));
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to review request.');
    }
  };

  const handleReviewRelationshipRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setReviewingRelationshipRequestId(requestId);
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/relationship-requests/${requestId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setSuccess(action === 'approve'
        ? (zh ? '已核准群組層級申請。' : 'Group relationship request approved.')
        : (zh ? '已拒絕群組層級申請。' : 'Group relationship request rejected.'));
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to review relationship request.');
    } finally {
      setReviewingRelationshipRequestId(null);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (!newsForm.title.trim()) { setError(zh ? '請輸入標題。' : 'Title is required.'); return; }
    if (!newsForm.body.trim()) { setError(zh ? '請輸入內容。' : 'Body is required.'); return; }
    setNewsLoading(true);
    try {
      await apiFetch('/news', {
        method: 'POST',
        body: JSON.stringify({
          groupId: params.groupId,
          title_en: newsForm.title,
          title_zh: newsForm.title,
          body_en: newsForm.body,
          body_zh: newsForm.body,
        }),
      });
      setNewsForm({ title: '', body: '' });
      setSuccess(zh ? '群組公告已發布。' : 'Group news posted.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to post group news.');
    } finally {
      setNewsLoading(false);
    }
  };

  const handleEventFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (!eventForm.title.trim()) { setError(zh ? '請輸入活動名稱。' : 'Event title is required.'); return; }
    if (!eventForm.startAt) { setError(zh ? '請選擇開始時間。' : 'Start time is required.'); return; }
    setEventLoading(true);
    try {
      let coverImageUrl: string | null = null;
      if (coverFile) {
        const uploaded = await apiUpload(coverFile);
        coverImageUrl = uploaded.url;
      }
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify({
          groupId: params.groupId,
          title_en: eventForm.title,
          title_zh: eventForm.title,
          description_en: eventForm.description,
          description_zh: eventForm.description,
          location_en: eventForm.location,
          location_zh: eventForm.location,
          startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : undefined,
          endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : null,
          timezone: eventForm.timezone,
          feeAmount: eventForm.feeAmount ? parseFloat(eventForm.feeAmount) : null,
          feeCurrency: eventForm.feeCurrency || 'TWD',
          coverImageUrl,
        }),
      });
      setEventForm({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' });
      setCoverFile(null);
      setCoverPreview(null);
      setSuccess(zh ? '群組活動已建立。' : 'Group event created.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create group event.');

    } finally {
      setEventLoading(false);
    }
  };

  if (loading || pageLoading) return <p className="py-16 text-center text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>;

  const isPlatformAdmin = user?.role === 'ADMIN';
  const isGroupAdmin = groupItem?.membership.role === 'GROUP_ADMIN';
  const isGroupCreator = groupItem?.group.createdById === user?.id;
  const canManageRelationshipRequests = isPlatformAdmin || isGroupCreator;
  const canReviewRelationshipRequests = isGroupCreator;


  if (!user || (!isPlatformAdmin && !isGroupAdmin)) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{zh ? '您沒有權限管理此群組。' : 'You do not have permission to manage this group.'}</div>;
  }
  if (!groupItem) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{error || (zh ? '找不到此群組。' : 'Group not found.')}</div>;
  }
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {zh ? '群組設定' : 'Group Settings'} — {groupItem.group.name}
        </h1>
        {joinRequests.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            {joinRequests.length} {zh ? '件待審加入申請' : 'pending join requests'}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {/* Group Info */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '群組資訊' : 'Group Info'}</h2>
        <form onSubmit={(e) => void handleSaveGroupInfo(e)} className="mt-4 space-y-4">
          {/* Photo */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '群組照片' : 'Group Photo'}</label>
            <div className="flex items-center gap-4">
              {editPhotoUrl ? (
                <img src={editPhotoUrl} alt="" className="h-16 w-16 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{editName.charAt(0).toUpperCase() || '?'}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => groupPhotoFileRef.current?.click()} disabled={groupPhotoUploading}
                  className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                  {groupPhotoUploading ? (zh ? '上傳中…' : 'Uploading…') : (zh ? '更換照片' : 'Change Photo')}
                </button>
                {editPhotoUrl && (
                  <button type="button" onClick={() => setEditPhotoUrl(null)}
                    className="rounded-md border border-red-200 dark:border-red-800 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    {zh ? '移除照片' : 'Remove Photo'}
                  </button>
                )}
              </div>
              <input ref={groupPhotoFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleGroupPhotoUpload(e)} />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '群組名稱' : 'Group Name'}</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={160}
              required
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '描述（選填）' : 'Description (optional)'}</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {zh ? '群組可見性' : 'Group Visibility'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {editDiscoverableBySearch
                  ? (zh ? '公開 — 任何人可搜尋並申請加入' : 'Public — anyone can search and request to join')
                  : (zh ? '私密 — 僅限邀請加入' : 'Private — invite-only')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={editDiscoverableBySearch}
              onClick={() => setEditDiscoverableBySearch((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${editDiscoverableBySearch ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${editDiscoverableBySearch ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <button type="submit" disabled={groupInfoSaving || !editName.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {groupInfoSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存群組資訊' : 'Save Group Info')}
          </button>
        </form>
      </section>

      {/* Pending join requests */}
      {joinRequests.length > 0 && (
        <section className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-amber-900 dark:text-amber-300">{zh ? `加入申請 (${joinRequests.length})` : `Join Requests (${joinRequests.length})`}</h2>
          <div className="space-y-3">
            {joinRequests.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{req.requester.displayName || req.requester.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{req.requester.email}</p>
                  {req.note && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 italic">"{req.note}"</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReviewRequest(req.id, 'approve')} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                    {zh ? '核准' : 'Approve'}
                  </button>
                  <button onClick={() => handleReviewRequest(req.id, 'reject')} className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    {zh ? '拒絕' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Group Hierarchy — platform admin or group admin */}
      {(isPlatformAdmin || isGroupAdmin) && (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '群組層級' : 'Group Hierarchy'}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '設定此群組的上層父群組，或在其下建立、連結子群組。' : 'Set a parent group this one sits under, or create and link child groups beneath it.'}</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* ── Parent Group Column ── */}
            <div className="space-y-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{zh ? '父群組' : 'Parent Group'}</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{zh ? '此群組的上層群組。' : 'The group this one is nested under.'}</p>
              </div>

              {/* Current parent status */}
              {relationships?.parentGroup ? (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
                  <Link href={`/${params.locale}/admin/groups/${relationships.parentGroup.id}`} className="flex-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {relationships.parentGroup.name}
                  </Link>
                  <button
                    onClick={async () => {
                      if (!confirm(zh ? '確定要移除父群組嗎？' : 'Remove parent group?')) return;
                      setParentSaving(true);
                      setError('');
                      setSuccess('');
                      try {
                        await apiFetch(`/groups/${params.groupId}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: null }) });
                        setSuccess(zh ? '父群組已移除。' : 'Parent group removed.');
                        await loadPage();
                      } catch (err: unknown) {
                        setError((err as Error).message ?? 'Failed.');
                      } finally {
                        setParentSaving(false);
                      }
                    }}
                    disabled={parentSaving}
                    className="rounded-md border border-red-200 dark:border-red-800 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    {zh ? '移除' : 'Remove'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '尚無父群組。' : 'No parent group yet.'}</p>
              )}

              {/* Search to set parent */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '搜尋並設為父群組' : 'Search to set parent'}</p>
                <div className="flex gap-2">
                  <input
                    value={parentSearchQuery}
                    onChange={(e) => setParentSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleParentSearch(); } }}
                    placeholder={zh ? '群組名稱…' : 'Group name…'}
                    className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleParentSearch}
                    disabled={parentSearchLoading || !parentSearchQuery.trim()}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {parentSearchLoading ? '…' : (zh ? '搜尋' : 'Search')}
                  </button>
                </div>
                {parentSearchResults.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {parentSearchResults.map((g) => (
                      <div key={g.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{g.name}</p>
                          {g.createdBy && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{zh ? '建立者：' : 'By: '}{g.createdBy.displayName ?? 'Unknown'}</p>}
                          {g.description && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{g.description}</p>}
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm(zh ? `送出申請，將「${g.name}」設為父群組？對方管理員核准後生效。` : `Submit a request to set "${g.name}" as parent? Their admin must approve.`)) return;
                            setParentSaving(true);
                            setError('');
                            setSuccess('');
                            try {
                              await apiFetch(`/groups/${params.groupId}/relationship-requests`, { method: 'POST', body: JSON.stringify({ parentGroupId: g.id }) });
                              setParentSearchQuery('');
                              setParentSearchResults([]);
                              setSuccess(zh ? `已送出父群組連結申請，待「${g.name}」管理員核准。` : `Request sent — awaiting approval from "${g.name}"'s admin.`);
                              await loadPage();
                            } catch (err: unknown) {
                              setError((err as Error).message ?? 'Failed.');
                            } finally {
                              setParentSaving(false);
                            }
                          }}
                          disabled={parentSaving}
                          className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {zh ? '送出申請' : 'Send Request'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create new parent group */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '建立新父群組' : 'Create new parent group'}</p>
                <form onSubmit={handleCreateParentGroup} className="space-y-2">
                  <input
                    value={newParentForm.name}
                    onChange={(e) => setNewParentForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={zh ? '群組名稱' : 'Group name'}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    required
                  />
                  <input
                    value={newParentForm.description}
                    onChange={(e) => setNewParentForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={parentCreating || !newParentForm.name.trim()}
                    className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {parentCreating ? (zh ? '建立中…' : 'Creating…') : (zh ? '+ 建立父群組' : '+ Create Parent Group')}
                  </button>
                </form>
              </div>
            </div>

            {/* ── Child Groups Column ── */}
            <div className="space-y-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{zh ? `子群組 (${relationships?.subgroups?.length ?? 0})` : `Child Groups (${relationships?.subgroups?.length ?? 0})`}</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{zh ? '直接隸屬於此群組的子群組。' : 'Groups nested directly under this one.'}</p>
              </div>

              {/* Current subgroups list */}
              {relationships?.subgroups && relationships.subgroups.length > 0 ? (
                <div className="space-y-2">
                  {relationships.subgroups.map((sg) => (
                    <div key={sg.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm">
                      <Link href={`/${params.locale}/admin/groups/${sg.id}`} className="flex-1 font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate">{sg.name}</Link>
                      <button
                        onClick={async () => {
                          if (!confirm(zh ? `確定要將「${sg.name}」從子群組中移除嗎？` : `Remove "${sg.name}" as a child group?`)) return;
                          setChildSevering(true);
                          setError('');
                          setSuccess('');
                          try {
                            await apiFetch(`/groups/${sg.id}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: null }) });
                            setSuccess(zh ? `「${sg.name}」已從子群組移除。` : `"${sg.name}" removed from child groups.`);
                            await loadPage();
                          } catch (err: unknown) {
                            setError((err as Error).message ?? 'Failed.');
                          } finally {
                            setChildSevering(false);
                          }
                        }}
                        disabled={childSevering}
                        className="shrink-0 rounded-md border border-red-200 dark:border-red-800 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        {zh ? '移除' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '目前無子群組。' : 'No child groups yet.'}</p>
              )}

              {/* Search to set child */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '搜尋並設為子群組' : 'Search to set child'}</p>
                <div className="flex gap-2">
                  <input
                    value={childSearchQuery}
                    onChange={(e) => setChildSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChildSearch(); } }}
                    placeholder={zh ? '群組名稱…' : 'Group name…'}
                    className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleChildSearch}
                    disabled={childSearchLoading || !childSearchQuery.trim()}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {childSearchLoading ? '…' : (zh ? '搜尋' : 'Search')}
                  </button>
                </div>
                {childSearchResults.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {childSearchResults.map((g) => (
                      <div key={g.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{g.name}</p>
                          {g.createdBy && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{zh ? '建立者：' : 'By: '}{g.createdBy.displayName ?? 'Unknown'}</p>}
                          {g.description && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{g.description}</p>}
                        </div>
                        <button
                          onClick={() => handleLinkChildGroup(g.id, g.name)}
                          disabled={childLinking}
                          className="shrink-0 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {zh ? '設為子群組' : 'Set as Child'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create new child group */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '建立新子群組' : 'Create new child group'}</p>
                <form onSubmit={handleCreateChildGroup} className="space-y-2">
                  <input
                    value={newChildForm.name}
                    onChange={(e) => setNewChildForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={zh ? '群組名稱' : 'Group name'}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    required
                  />
                  <input
                    value={newChildForm.description}
                    onChange={(e) => setNewChildForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  {/* Member checklist from parent group */}
                  {members.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '選擇初始成員（從現有成員）' : 'Select initial members (from existing members)'}</p>
                      <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                        {members.map((m) => (
                          <label key={m.userId} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                            <input
                              type="checkbox"
                              checked={childInitialMemberIds.includes(m.userId)}
                              onChange={(e) => setChildInitialMemberIds((prev) =>
                                e.target.checked ? [...prev, m.userId] : prev.filter((id) => id !== m.userId)
                              )}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                            />
                            <span className="text-sm text-gray-900 dark:text-white">{m.displayName || m.email || m.userId}</span>
                            {m.role === 'GROUP_ADMIN' && (
                              <span className="ml-auto text-xs text-indigo-500 dark:text-indigo-400">{zh ? '管理員' : 'Admin'}</span>
                            )}
                          </label>
                        ))}
                      </div>
                      {childInitialMemberIds.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{childInitialMemberIds.length} {zh ? '人已選' : 'selected'}</p>
                      )}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={childCreating || !newChildForm.name.trim()}
                    className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {childCreating ? (zh ? '建立中…' : 'Creating…') : (zh ? '+ 建立子群組' : '+ Create Child Group')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Add Member */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '新增成員' : 'Add Member'}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {zh ? '搜尋平台上的現有用戶，或為尚未註冊者建立新帳號並直接加入。' : 'Find an existing platform user or create a new account for someone not yet registered.'}
        </p>

        {/* Mode toggle + bulk buttons on same row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setMemberAddMode('search')}
              className={`px-4 py-2 text-sm font-medium transition ${memberAddMode === 'search' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {zh ? '搜尋現有用戶' : 'Search Existing User'}
            </button>
            <button
              type="button"
              onClick={() => setMemberAddMode('new')}
              className={`px-4 py-2 text-sm font-medium transition border-l border-gray-200 dark:border-gray-700 ${memberAddMode === 'new' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {zh ? '建立新帳號並加入' : 'Create New Account & Add'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowImportModal(true); setError(''); setBulkResults(null); }}
              disabled={importLoading}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {importLoading ? (zh ? '匯入中…' : 'Importing…') : (zh ? '批量匯入' : 'Bulk Import')}
            </button>
            {isPlatformAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => void handleExportMembers()}
                  disabled={exportLoading}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {exportLoading ? (zh ? '匯出中…' : 'Exporting…') : (zh ? '批量匯出' : 'Bulk Export')}
                </button>
                <input ref={importFileRef} type="file" accept=".csv" onChange={handleImportMembers} className="hidden" />
              </>
            )}
          </div>
        </div>

        {/* Search mode */}
        {memberAddMode === 'search' && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleMemberSearch(); } }}
                placeholder={zh ? '姓名、電子郵件或電話…' : 'Name, email, or phone…'}
                className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => void handleMemberSearch()}
                disabled={memberSearchLoading || !memberSearchQuery.trim()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {memberSearchLoading ? '…' : (zh ? '搜尋' : 'Search')}
              </button>
            </div>

            {/* Role selector for search mode */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '加入角色' : 'Add as'}</label>
              <select
                value={memberAddRole}
                onChange={(e) => setMemberAddRole(e.target.value as 'GROUP_MEMBER' | 'GROUP_ADMIN')}
                className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="GROUP_MEMBER">{zh ? '成員' : 'Member'}</option>
                <option value="GROUP_ADMIN">{zh ? '群組管理員' : 'Group Admin'}</option>
              </select>
            </div>

            {/* Search results */}
            {memberSearchResults.length > 0 && (
              <div className="space-y-2">
                {memberSearchResults.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.displayName ?? (zh ? '未命名' : 'Unnamed')}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email ?? u.phoneE164 ?? u.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAddExistingMember(u.id, u.displayName)}
                      disabled={memberAddLoading === u.id}
                      className="shrink-0 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {memberAddLoading === u.id ? '…' : (zh ? '新增' : 'Add')}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {memberSearchResults.length === 0 && memberSearchQuery.trim() && !memberSearchLoading && (
              <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '找不到符合的用戶。' : 'No matching users found.'}</p>
            )}
          </div>
        )}

        {/* Create new account mode */}
        {memberAddMode === 'new' && (
          <>
          <form onSubmit={(e) => void handleCreateAndAddMember(e)} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '姓名（必填）' : 'Full Name (required)'}</label>
              <input
                value={newMemberForm.displayName}
                onChange={(e) => setNewMemberForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder={zh ? '真實姓名' : 'Full name'}
                required
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '手機號碼（選填）' : 'Phone Number (optional)'}</label>
              <input
                value={newMemberForm.phone}
                onChange={(e) => setNewMemberForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+886900000123"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '電子郵件（選填）' : 'Email Address (optional)'}</label>
              <input
                value={newMemberForm.email}
                onChange={(e) => setNewMemberForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="member@example.com"
                type="email"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '角色' : 'Role'}</label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as 'GROUP_MEMBER' | 'GROUP_ADMIN')}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="GROUP_MEMBER">{zh ? '成員' : 'Member'}</option>
                <option value="GROUP_ADMIN">{zh ? '群組管理員' : 'Group Admin'}</option>
              </select>
            </div>
            {/* Password mode */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '密碼設定' : 'Password'}</label>
              <div className="flex gap-3 mb-2">
                {(['random', 'custom'] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" checked={newMemberPasswordMode === mode} onChange={() => setNewMemberPasswordMode(mode)} />
                    <span className="text-gray-700 dark:text-gray-300">
                      {mode === 'random' ? (zh ? '自動產生隨機密碼' : 'Generate random password') : (zh ? '自訂密碼' : 'Set custom password')}
                    </span>
                  </label>
                ))}
              </div>
              {newMemberPasswordMode === 'custom' && (
                <input
                  type="text"
                  value={newMemberCustomPassword}
                  onChange={(e) => setNewMemberCustomPassword(e.target.value)}
                  placeholder={zh ? '至少 6 個字元' : 'Min 6 characters'}
                  minLength={6}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                />
              )}
              {newMemberPasswordMode === 'random' && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{zh ? '系統將產生隨機密碼並於建立後顯示供您轉告。' : 'A random password will be generated and shown after creation for you to share.'}</p>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {zh ? '電話或電子郵件至少填寫一項。若此聯絡方式已有帳號，將直接加入群組。' : 'At least one of phone or email is required. If an account with that contact info already exists, they will be added directly.'}
            </p>
            <button
              type="submit"
              disabled={newMemberLoading || !newMemberForm.displayName.trim() || (!newMemberForm.phone.trim() && !newMemberForm.email.trim()) || (newMemberPasswordMode === 'custom' && newMemberCustomPassword.trim().length < 6)}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {newMemberLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立帳號並加入群組' : 'Create Account & Add to Group')}
            </button>
          </form>
          {newMemberTempPassword && (
            <div className="mt-4 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                {zh ? `✅ 帳號已建立：${newMemberTempPassword.name}` : `✅ Account created: ${newMemberTempPassword.name}`}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                {zh
                  ? '請將以下臨時密碼傳送給該成員。他們可在個人資料中設定新密碼。'
                  : 'Share this temporary password with the member. They can set a new password in their profile.'}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 px-3 py-1.5 text-sm font-mono text-gray-900 dark:text-white select-all">
                  {newMemberTempPassword.password}
                </code>
                <button
                  type="button"
                  onClick={() => { void navigator.clipboard.writeText(newMemberTempPassword.password); }}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                >
                  {zh ? '複製' : 'Copy'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setNewMemberTempPassword(null)}
                className="mt-2 text-xs text-amber-600 dark:text-amber-400 underline"
              >
                {zh ? '關閉' : 'Dismiss'}
              </button>
            </div>
          )}
          </>
        )}

        {importResult && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
            {zh
              ? `匯入結果：新增 ${importResult.added} 人，已是成員 ${importResult.already_member} 人，未找到 ${importResult.not_found} 人。`
              : `Import result: ${importResult.added} added, ${importResult.already_member} already members, ${importResult.not_found} not found.`}
          </div>
        )}
      </section>

      <div className="space-y-6">
        {/* ─── Donations ────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '捐款記錄' : 'Donation Records'}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '記錄並追蹤成員的捐款歷史（新台幣或美金）。' : 'Record and track member donations in NTD or USD with a running history.'}</p>
            </div>
            <button onClick={() => setShowDonationModal(true)} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition">
              {zh ? '+ 新增記錄' : '+ Add Record'}
            </button>
          </div>

          {/* Donation list */}
          <div className="mt-6 space-y-2">
            {donationsLoading ? (
              <p className="text-sm text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
            ) : donations.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '尚無捐款記錄。' : 'No donation records yet.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">{zh ? '成員' : 'Member'}</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">{zh ? '金額' : 'Amount'}</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">{zh ? '日期' : 'Date'}</th>
                      <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">{zh ? '備註' : 'Note'}</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {donations.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 pr-4 text-gray-900 dark:text-white">{d.forUser.displayName ?? d.forUser.email}</td>
                        <td className="py-2 pr-4 font-mono text-gray-900 dark:text-white">{Number(d.amount).toLocaleString()} {d.currency}</td>
                        <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{new Date(d.date).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}</td>
                        <td className="py-2 pr-4 text-gray-400 dark:text-gray-500">{d.note ?? '—'}</td>
                        <td className="py-2">
                          <button onClick={() => handleDeleteDonation(d.id)} className="text-xs text-red-400 hover:text-red-600">{zh ? '刪除' : 'Delete'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add donation modal */}
          {showDonationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowDonationModal(false); }}>
              <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{zh ? '新增捐款記錄' : 'Add Donation Record'}</h3>
                  <button onClick={() => setShowDonationModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
                </div>
                <div className="mb-4 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                  <p className="font-medium mb-1">{zh ? '格式說明' : 'Format'}</p>
                  <p className="font-mono">{zh ? '成員 · 金額 · 幣別（NTD / USD）· 日期 · 備註（選填）' : 'Member · Amount · Currency (NTD / USD) · Date · Note (optional)'}</p>
                  <p className="font-mono mt-0.5 text-gray-400 dark:text-gray-500">{zh ? '例：王小明 · 1000 · NTD · 2024-03-15 · 春季奉獻' : 'e.g. Jane Smith · 500 · USD · 2024-03-15 · Spring offering'}</p>
                </div>
                <form onSubmit={handleCreateDonation} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '成員' : 'Member'}</label>
                    <select required value={donationForm.forUserId} onChange={(e) => setDonationForm((f) => ({ ...f, forUserId: e.target.value }))}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                      <option value="">{zh ? '選擇成員…' : 'Select member…'}</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>{m.displayName ?? m.email ?? m.userId}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '金額' : 'Amount'}</label>
                      <input type="number" min="0" step="0.01" required value={donationForm.amount}
                        onChange={(e) => setDonationForm((f) => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '幣別' : 'Currency'}</label>
                      <select value={donationForm.currency} onChange={(e) => setDonationForm((f) => ({ ...f, currency: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option value="NTD">NTD 新台幣</option>
                        <option value="USD">USD 美金</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '日期' : 'Date'}</label>
                    <input type="date" required value={donationForm.date}
                      onChange={(e) => setDonationForm((f) => ({ ...f, date: e.target.value }))}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '備註（選填）' : 'Note (optional)'}</label>
                    <input value={donationForm.note} onChange={(e) => setDonationForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder={zh ? '例：春季奉獻' : 'e.g. Spring offering'}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowDonationModal(false)}
                      className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      {zh ? '取消' : 'Cancel'}
                    </button>
                    <button type="submit" disabled={donationSaving || !donationForm.forUserId || !donationForm.amount}
                      className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                      {donationSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '新增捐款' : 'Add Donation')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>

        {/* ─── Annual Report ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '年度報告' : 'Annual Report'}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '查看每位成員的年度出席率與捐款統計。' : 'View per-member attendance and donation stats for any given year.'}</p>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <input
              type="number"
              value={reportYear}
              min={2020}
              max={new Date().getFullYear() + 1}
              onChange={(e) => setReportYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-28 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button onClick={generateReport} disabled={reportLoading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {reportLoading ? (zh ? '生成中…' : 'Generating…') : (zh ? '生成報告' : 'Generate Report')}
            </button>
          </div>
        </section>

        {/* ─── Danger Zone ───────────────────────────────────────────────── */}
        {user && groupItem && user.id === groupItem.group.createdById && (
          <section className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">{zh ? '危險區域' : 'Danger Zone'}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {zh
                ? '刪除此群組將永久移除所有成員、訊息及相關資料，且無法復原。'
                : 'Deleting this group permanently removes all members, messages, and related data. This cannot be undone.'}
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              {zh ? '刪除群組' : 'Delete Group'}
            </button>
          </section>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {zh ? '確認刪除群組' : 'Confirm Delete Group'}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {zh
                ? `您確定要刪除「${groupItem?.group.name}」嗎？此操作無法復原。`
                : `Are you sure you want to delete "${groupItem?.group.name}"? This action cannot be undone.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteGroupLoading}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                {zh ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleteGroupLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteGroupLoading ? (zh ? '刪除中…' : 'Deleting…') : (zh ? '確認刪除' : 'Yes, Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Members Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {zh ? '批量匯入成員' : 'Bulk Import Members'}
              </h3>
              <button
                onClick={() => { setShowImportModal(false); setBulkResults(null); setError(''); }}
                className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {zh
                ? '每行一筆，格式：全名, 電子郵件, 含國碼手機號碼'
                : 'One per line: Full Name, Email, Phone Number With Country Code'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              {zh
                ? '範例：Jane Smith, jane@example.com, +8861234567890（電子郵件與手機至少填一項）'
                : 'Example: Jane Smith, jane@example.com, +8861234567890 — at least one of email or phone is required'}
            </p>

            <form onSubmit={(e) => void handleBulkAdd(e)} className="space-y-4">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={7}
                placeholder={zh
                  ? '王小明, ming@example.com, +886912345678\n李小華, , +886900000001\n張三, three@example.com,'
                  : 'Jane Smith, jane@example.com, +886912345678\nJohn Doe, , +886900000001\nAlex Chen, alex@example.com,'}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono resize-y"
              />

              {/* Password mode */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{zh ? '密碼設定' : 'Password'}</p>
                <div className="flex gap-4 mb-2">
                  {(['shared', 'random'] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" checked={bulkPasswordMode === mode} onChange={() => setBulkPasswordMode(mode)} />
                      <span className="text-gray-700 dark:text-gray-300">
                        {mode === 'shared'
                          ? (zh ? '所有人共用同一密碼' : 'Same password for everyone')
                          : (zh ? '每人產生隨機密碼' : 'Random password per person')}
                      </span>
                    </label>
                  ))}
                </div>
                {bulkPasswordMode === 'shared' ? (
                  <div>
                    <input
                      type="text"
                      value={bulkSharedPassword}
                      onChange={(e) => setBulkSharedPassword(e.target.value)}
                      placeholder={zh ? '輸入共用密碼（至少 6 個字元）' : 'Enter shared password (min 6 chars)'}
                      minLength={6}
                      className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                    />
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{zh ? '全部成員使用此密碼登入，建議提醒他們登入後修改。' : 'All members will use this password. Remind them to change it after first login.'}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{zh ? '系統為每人產生唯一隨機密碼，結果表格將顯示各自的密碼供您轉告。' : 'A unique random password is generated per person. The results table will show each password for you to distribute.'}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '角色' : 'Role'}</label>
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value as 'GROUP_MEMBER' | 'GROUP_ADMIN')}
                  className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="GROUP_MEMBER">{zh ? '成員' : 'Member'}</option>
                  <option value="GROUP_ADMIN">{zh ? '群組管理員' : 'Group Admin'}</option>
                </select>
              </div>

              {error && (
                <p className="whitespace-pre-wrap rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-400">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setBulkResults(null); setError(''); }}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {zh ? '關閉' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading || !bulkText.trim() || (bulkPasswordMode === 'shared' && bulkSharedPassword.trim().length < 6)}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {bulkLoading ? (zh ? '新增中…' : 'Adding…') : (zh ? '批量新增' : 'Bulk Add')}
                </button>
              </div>
            </form>

            {/* Results table */}
            {bulkResults && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {zh
                      ? `結果：${bulkResults.filter((r) => r.added).length} 人已加入，${bulkResults.filter((r) => r.error).length} 人失敗`
                      : `Results: ${bulkResults.filter((r) => r.added).length} added, ${bulkResults.filter((r) => r.error).length} failed`}
                  </p>
                  {bulkPasswordMode === 'random' && bulkResults.some((r) => r.tempPassword) && (
                    <button
                      type="button"
                      onClick={() => {
                        const text = bulkResults
                          .filter((r) => r.tempPassword)
                          .map((r) => `${r.displayName}\t${r.email ?? r.phone ?? ''}\t${r.tempPassword}`)
                          .join('\n');
                        void navigator.clipboard.writeText(text);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {zh ? '複製全部密碼' : 'Copy all passwords'}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800 max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{zh ? '姓名' : 'Name'}</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{zh ? '聯絡方式' : 'Contact'}</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{zh ? '狀態' : 'Status'}</th>
                        {bulkPasswordMode === 'random' && (
                          <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{zh ? '臨時密碼' : 'Temp Password'}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {bulkResults.map((r, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-gray-900 dark:text-white">{r.displayName}</td>
                          <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">{r.email ?? r.phone ?? '—'}</td>
                          <td className="px-4 py-2">
                            {r.error
                              ? <span className="text-red-500 text-xs">✗ {r.error}</span>
                              : r.created
                              ? <span className="text-green-600 text-xs">✓ {zh ? '已建立帳號' : 'Created'}</span>
                              : <span className="text-blue-600 text-xs">→ {zh ? '已加入現有帳號' : 'Added existing'}</span>}
                          </td>
                          {bulkPasswordMode === 'random' && (
                            <td className="px-4 py-2">
                              {r.tempPassword
                                ? <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded select-all">{r.tempPassword}</code>
                                : <span className="text-gray-400 text-xs">—</span>}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkResults(null)}
                  className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  {zh ? '關閉結果' : 'Dismiss results'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
