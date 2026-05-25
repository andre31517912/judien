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

  const [memberAddMode, setMemberAddMode] = useState<'search' | 'new'>('search');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<{ id: string; displayName: string | null; email: string | null; phoneE164: string | null }[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberAddRole, setMemberAddRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [memberAddLoading, setMemberAddLoading] = useState<string | null>(null);
  const [newMemberForm, setNewMemberForm] = useState({ displayName: '', phone: '', email: '' });
  const [newMemberRole, setNewMemberRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [newMemberLoading, setNewMemberLoading] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; already_member: number; not_found: number } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingImportType, setPendingImportType] = useState<'csv' | null>(null);

  const [groupSettings, setGroupSettings] = useState({ name: '', description: '' });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const groupPhotoFileRef = useRef<HTMLInputElement>(null);
  const [groupPhotoFile, setGroupPhotoFile] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [currentGroupPhotoUrl, setCurrentGroupPhotoUrl] = useState<string | null>(null);

  const [childInitialMemberIds, setChildInitialMemberIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false);

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
  const coverFileRef = useRef<HTMLInputElement>(null);

  // ── Donations state ──────────────────────────────────────────────────────
  type DonationRecord = { id: string; forUserId: string; amount: string; currency: string; date: string; note: string | null; forUser: { id: string; displayName: string | null; email: string } };
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationForm, setDonationForm] = useState({ forUserId: '', amount: '', currency: 'NTD', date: new Date().toISOString().slice(0, 10), note: '' });
  const [donationSaving, setDonationSaving] = useState(false);
  const [donationsLoaded, setDonationsLoaded] = useState(false);

  const loadDonations = async () => {
    setDonationsLoading(true);
    try {
      const data = await apiFetch<DonationRecord[]>(`/groups/${params.groupId}/donations`);
      setDonations(data);
      setDonationsLoaded(true);
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
    } catch (err: unknown) { setError((err as Error).message ?? 'Failed.'); }
  };

  // ── Report state ─────────────────────────────────────────────────────────
  type ReportData = {
    groupName: string; year: number; totalEvents: number; totalMembers: number;
    events: { id: string; title: string; startAt: string; memberRsvps: { userId: string; displayName: string | null; email: string; status: 'GOING' | 'MAYBE' | 'NO' | null }[] }[];
    members: { userId: string; displayName: string | null; email: string; totalEvents: number; going: number; maybe: number; no: number; noResponse: number; attendanceRate: number; totalDonatedUSD: number; totalDonatedNTD: number }[];
  };
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportExpanded, setReportExpanded] = useState<Record<string, boolean>>({});

  const loadReport = async (year: number) => {
    setReportLoading(true);
    setReportData(null);
    try {
      const data = await apiFetch<ReportData>(`/groups/${params.groupId}/report?year=${year}`);
      setReportData(data);
    } catch (err: unknown) { setError((err as Error).message ?? 'Failed.'); }
    finally { setReportLoading(false); }
  };

  const exportReportToCsv = (data: ReportData) => {
    const csvEscape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const row = (...cols: (string | number)[]) => cols.map(csvEscape).join(',');

    const lines: string[] = [];

    // Summary section
    lines.push(row('Group', data.groupName));
    lines.push(row('Year', data.year));
    lines.push(row('Total Events', data.totalEvents));
    lines.push(row('Total Members', data.totalMembers));
    lines.push('');

    // Member stats section
    lines.push(row('Member', 'Email', 'Going', 'Maybe', 'No', 'No Response', 'Attendance %', 'Donated USD', 'Donated NTD'));
    for (const m of data.members) {
      lines.push(row(m.displayName ?? m.email, m.email, m.going, m.maybe, m.no, m.noResponse, m.attendanceRate, m.totalDonatedUSD, m.totalDonatedNTD));
    }
    lines.push('');

    // Per-event breakdown
    for (const ev of data.events) {
      lines.push(row('Event', ev.title, new Date(ev.startAt).toLocaleDateString('en-US', { dateStyle: 'medium' })));
      lines.push(row('Member', 'Email', 'RSVP'));
      for (const r of ev.memberRsvps) {
        lines.push(row(r.displayName ?? r.email, r.email, r.status ?? 'No Response'));
      }
      lines.push('');
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.groupName}_report_${data.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        setGroupSettings({
          name: current.group.name,
          description: current.group.description ?? '',
        });
        const photoUrl = (current.group as { photoUrl?: string | null }).photoUrl ?? null;
        setCurrentGroupPhotoUrl(photoUrl);
        setGroupPhotoPreview(null);
        setGroupPhotoFile(null);
      }
      setMembers(memberList);

      const reqRes = await apiFetch<JoinRequest[]>(`/groups/${params.groupId}/join-requests`).catch(() => [] as JoinRequest[]);
      setJoinRequests((reqRes ?? []).filter((r) => r.status === 'PENDING'));

      const rel = await apiFetch<{ parentGroup: { id: string; name: string } | null; subgroups: { id: string; name: string; description: string }[] }>(`/groups/${params.groupId}/relationships`).catch(() => null);
      setRelationships(rel);

      if (!current) setError(zh ? '找不到此群組。' : 'Group not found.');
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
    if (!confirm(zh ? `確定要將「${childName}」設為此群組的子群組嗎？` : `Set "${childName}" as a subgroup of this group?`)) return;
    setChildLinking(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/${childId}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: params.groupId }) });
      setChildSearchQuery('');
      setChildSearchResults([]);
      setSuccess(zh ? `「${childName}」已設為子群組。` : `"${childName}" is now a subgroup.`);
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
      await apiFetch(`/groups/${params.groupId}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: created.id }) });
      const createdName = newParentForm.name.trim();
      setNewParentForm({ name: '', description: '' });
      setSuccess(zh ? `父群組「${createdName}」已建立並設定。` : `Parent group "${createdName}" created and set.`);
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
      await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({
          pid: generatedPid,
          name: newChildForm.name.trim(),
          description: newChildForm.description.trim() || undefined,
          parentGroupId: params.groupId,
          initialMemberIds: childInitialMemberIds,
        }),
      });
      const createdName = newChildForm.name.trim();
      setNewChildForm({ name: '', description: '' });
      setChildInitialMemberIds([]);
      setSuccess(zh ? `子群組「${createdName}」已建立。` : `Child group "${createdName}" created.`);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create child group.');
    } finally {
      setChildCreating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setError('');
    setSuccess('');
    try {
      let photoUrl: string | null | undefined = undefined;
      if (groupPhotoFile) {
        const uploaded = await apiUpload(groupPhotoFile);
        photoUrl = uploaded.url;
      }
      const payload: Record<string, unknown> = {
        name: groupSettings.name,
        description: groupSettings.description,
      };
      if (photoUrl !== undefined) payload.photoUrl = photoUrl;
      await apiFetch(`/groups/${params.groupId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setSuccess(zh ? '群組設定已儲存。' : 'Group settings saved.');
      setGroupPhotoFile(null);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
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
      const result = await apiFetch<{ created: boolean; displayName: string | null }>(`/groups/${params.groupId}/members/new-and-add`, {
        method: 'POST',
        body: JSON.stringify({
          displayName: newMemberForm.displayName.trim(),
          phone: newMemberForm.phone.trim() || undefined,
          email: newMemberForm.email.trim() || undefined,
          role: newMemberRole,
        }),
      });
      setNewMemberForm({ displayName: '', phone: '', email: '' });
      setNewMemberRole('GROUP_MEMBER');
      const name = result.displayName ?? newMemberForm.displayName.trim();
      setSuccess(
        result.created
          ? (zh ? `帳號已建立並新增為成員：${name}` : `Account created and added as member: ${name}`)
          : (zh ? `現有用戶已新增為成員：${name}` : `Existing user added as member: ${name}`),
      );
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed.');
    } finally {
      setNewMemberLoading(false);
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

      {/* Group Hierarchy — platform admin only */}
      {isPlatformAdmin && (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '群組層級' : 'Group Hierarchy'}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {zh ? '管理此群組的父群組與子群組。' : 'Manage this group\'s parent and child groups.'}
          </p>

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
                <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '無（頂層群組）' : 'None — this is a top-level group'}</p>
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
                            if (!confirm(zh ? `確定要將「${g.name}」設為父群組嗎？` : `Set "${g.name}" as parent?`)) return;
                            setParentSaving(true);
                            setError('');
                            setSuccess('');
                            try {
                              await apiFetch(`/groups/${params.groupId}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: g.id }) });
                              setParentSearchQuery('');
                              setParentSearchResults([]);
                              setSuccess(zh ? `父群組已設為「${g.name}」。` : `Parent set to "${g.name}".`);
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
                          {zh ? '設為父群組' : 'Set as Parent'}
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
                      {sg.description && <span className="text-gray-400 dark:text-gray-500 truncate max-w-[160px] hidden sm:block">{sg.description}</span>}
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

      {/* Group Settings */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '群組設定' : 'Group Settings'}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '控制此群組的公開性。' : 'Control group discoverability.'}</p>

        {/* Group photo */}
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '群組照片' : 'Group Photo'}</label>
          <div
            onClick={() => groupPhotoFileRef.current?.click()}
            className="relative w-full h-44 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer overflow-hidden flex items-center justify-center transition"
          >
            {(groupPhotoPreview ?? currentGroupPhotoUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={groupPhotoPreview ?? (currentGroupPhotoUrl ? `${process.env.NEXT_PUBLIC_API_URL ?? ''}${currentGroupPhotoUrl}` : '')}
                alt="group"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">{zh ? '點擊上傳照片' : 'Click to upload a photo'}</span>
              </div>
            )}
            {(groupPhotoPreview ?? currentGroupPhotoUrl) && (
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); setGroupPhotoFile(null); setGroupPhotoPreview(null); setCurrentGroupPhotoUrl(null); if (groupPhotoFileRef.current) groupPhotoFileRef.current.value = ''; }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
              >✕</button>
            )}
          </div>
          <input ref={groupPhotoFileRef} type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setGroupPhotoFile(file);
            setGroupPhotoPreview(URL.createObjectURL(file));
          }} className="hidden" />
        </div>

        {/* Name & description edit */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '群組名稱' : 'Group Name'}</label>
            <input
              value={groupSettings.name}
              onChange={(e) => setGroupSettings((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '描述' : 'Description'}</label>
            <textarea
              value={groupSettings.description}
              onChange={(e) => setGroupSettings((s) => ({ ...s, description: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

        </div>
        <button onClick={handleSaveSettings} disabled={settingsSaving} className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {settingsSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存設定' : 'Save Settings')}
        </button>
      </section>

      {/* Add Member */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '新增成員' : 'Add Member'}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {zh ? '搜尋現有 Judien 用戶，或為尚未加入的人建立新帳號。' : 'Search for an existing Judien user, or create a new account for someone not yet on Judien.'}
        </p>

        {/* Mode toggle */}
        <div className="mt-4 flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden w-fit">
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
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {zh ? '電話或電子郵件至少填寫一項。若此聯絡方式已有帳號，將直接加入群組。' : 'At least one of phone or email is required. If an account with that contact info already exists, they will be added directly.'}
            </p>
            <button
              type="submit"
              disabled={newMemberLoading || !newMemberForm.displayName.trim() || (!newMemberForm.phone.trim() && !newMemberForm.email.trim())}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {newMemberLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立帳號並加入群組' : 'Create Account & Add to Group')}
            </button>
          </form>
        )}
      </section>

      {/* Members list */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '群組成員' : 'Members'}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '目前此群組內可見的成員名單。' : 'Current visible members in this group.'}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-600 dark:text-gray-400">{members.length} {zh ? '位成員' : 'members'}</span>
            {isPlatformAdmin && (
              <>
                <div className="relative">
                  <button onClick={() => setShowImportModal(true)} disabled={importLoading} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {importLoading ? (zh ? '匯入中…' : 'Importing…') : (zh ? '📥 匯入 CSV' : '📥 Import CSV')}
                  </button>
                  <input ref={importFileRef} type="file" accept=".csv" onChange={handleImportMembers} className="hidden" />
                </div>
                <button onClick={() => handleExportMembers()} disabled={exportLoading} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {exportLoading ? (zh ? '匯出中…' : 'Exporting…') : (zh ? '📤 匯出 CSV' : '📤 Export CSV')}
                  </button>
              </>
            )}
          </div>
        </div>
        {importResult && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {zh
              ? `匯入結果：新增 ${importResult.added} 人，已是成員 ${importResult.already_member} 人，未找到 ${importResult.not_found} 人。`
              : `Import result: ${importResult.added} added, ${importResult.already_member} already members, ${importResult.not_found} not found.`}
          </div>
        )}
        <div className="grid gap-3">
          {members.map((member) => (
            <div key={member.userId} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{member.displayName || (member.email ?? member.userId)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US') : (zh ? '尚未加入' : 'Not joined yet')}</p>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  {member.email && <p>{member.email}</p>}
                  {member.phoneE164 && <p>{member.phoneE164}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        {/* ─── Donations ────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '捐款記錄' : 'Donation Records'}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '記錄成員捐款金額（USD 或 NTD）。' : 'Record member donations in USD or NTD.'}</p>
            </div>
            {!donationsLoaded && (
              <button onClick={loadDonations} disabled={donationsLoading} className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                {donationsLoading ? (zh ? '載入中…' : 'Loading…') : (zh ? '載入捐款記錄' : 'Load Records')}
              </button>
            )}
          </div>

          {/* Add donation form */}
          <form onSubmit={handleCreateDonation} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '成員' : 'Member'}</label>
              <select
                required
                value={donationForm.forUserId}
                onChange={(e) => setDonationForm((f) => ({ ...f, forUserId: e.target.value }))}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">{zh ? '選擇成員…' : 'Select member…'}</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.displayName ?? m.email ?? m.userId}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '金額' : 'Amount'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={donationForm.amount}
                onChange={(e) => setDonationForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '幣別' : 'Currency'}</label>
              <select
                value={donationForm.currency}
                onChange={(e) => setDonationForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="NTD">NTD (新台幣)</option>
                <option value="USD">USD (美金)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '日期' : 'Date'}</label>
              <input
                type="date"
                required
                value={donationForm.date}
                onChange={(e) => setDonationForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{zh ? '備註（選填）' : 'Note (optional)'}</label>
              <input
                value={donationForm.note}
                onChange={(e) => setDonationForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={zh ? '例：巾要天特款捐' : 'e.g. Monthly tithe'}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={donationSaving || !donationForm.forUserId || !donationForm.amount} className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {donationSaving ? (zh ? '新增中…' : 'Saving…') : (zh ? '+ 新增捐款' : '+ Add Donation')}
              </button>
            </div>
          </form>

          {/* Donation list */}
          {donationsLoaded && (
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
          )}
        </section>

        {/* ─── Annual Report ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '年度報告' : 'Annual Report'}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '查看每年活動出席率與捐款統計。' : 'View per-year attendance and donation stats for each member.'}</p>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <input
              type="number"
              value={reportYear}
              min={2020}
              max={new Date().getFullYear() + 1}
              onChange={(e) => setReportYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-28 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button onClick={() => loadReport(reportYear)} disabled={reportLoading} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {reportLoading ? (zh ? '生成中…' : 'Generating…') : (zh ? '生成報告' : 'Generate Report')}
            </button>
            {reportData && (
              <button
                onClick={() => exportReportToCsv(reportData)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {zh ? '匯出 CSV' : 'Export CSV'}
              </button>
            )}
          </div>

          {reportData && (
            <div className="mt-6 space-y-6">

              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[{label: zh ? '總活動數' : 'Total Events', value: reportData.totalEvents}, {label: zh ? '總成員數' : 'Members', value: reportData.totalMembers}].map((s) => (
                  <div key={s.label} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Member summary table */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{zh ? '成員統計' : 'Member Summary'}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                        <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400">{zh ? '成員' : 'Member'}</th>
                        <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400 text-center">✓ {zh ? '參加' : 'Going'}</th>
                        <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400 text-center">? {zh ? '也許' : 'Maybe'}</th>
                        <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400 text-center">✗ {zh ? '不參加' : 'No'}</th>
                        <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400 text-center">– {zh ? '未回應' : 'No resp.'}</th>
                        <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400 text-center">{zh ? '出席率' : 'Attendance'}</th>
                        <th className="pb-2 pr-4 font-medium text-gray-500 dark:text-gray-400 text-right">USD</th>
                        <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">NTD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {reportData.members.map((m) => (
                        <tr key={m.userId}>
                          <td className="py-2 pr-4 text-gray-900 dark:text-white">{m.displayName ?? m.email}</td>
                          <td className="py-2 pr-4 text-center text-green-600">{m.going}</td>
                          <td className="py-2 pr-4 text-center text-yellow-600">{m.maybe}</td>
                          <td className="py-2 pr-4 text-center text-red-500">{m.no}</td>
                          <td className="py-2 pr-4 text-center text-gray-400">{m.noResponse}</td>
                          <td className="py-2 pr-4 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              m.attendanceRate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : m.attendanceRate >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            }`}>{m.attendanceRate}%</span>
                          </td>
                          <td className="py-2 pr-4 text-right font-mono text-gray-700 dark:text-gray-300">{m.totalDonatedUSD > 0 ? m.totalDonatedUSD.toLocaleString() : '—'}</td>
                          <td className="py-2 text-right font-mono text-gray-700 dark:text-gray-300">{m.totalDonatedNTD > 0 ? m.totalDonatedNTD.toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per-event breakdown */}
              {reportData.events.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{zh ? '活動明細' : 'Event Breakdown'}</h3>
                  <div className="space-y-2">
                    {reportData.events.map((ev) => (
                      <div key={ev.id} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <button
                          onClick={() => setReportExpanded((p) => ({ ...p, [ev.id]: !p[ev.id] }))}
                          className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{ev.title}</span>
                            <span className="ml-3 text-xs text-gray-400 dark:text-gray-500">{new Date(ev.startAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium' })}</span>
                          </div>
                          <span className="text-xs text-gray-400">{reportExpanded[ev.id] ? '▲' : '▼'}</span>
                        </button>
                        {reportExpanded[ev.id] && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                                  <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">{zh ? '成員' : 'Member'}</th>
                                  <th className="px-4 py-2 font-medium text-gray-500 dark:text-gray-400">{zh ? '多婆證' : 'RSVP'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {ev.memberRsvps.map((r) => (
                                  <tr key={r.userId}>
                                    <td className="px-4 py-2 text-gray-900 dark:text-white">{r.displayName ?? r.email}</td>
                                    <td className="px-4 py-2">
                                      {r.status === 'GOING' ? <span className="text-green-600 font-medium">✓ {zh ? '參加' : 'Going'}</span>
                                      : r.status === 'MAYBE' ? <span className="text-yellow-600">? {zh ? '也許' : 'Maybe'}</span>
                                      : r.status === 'NO' ? <span className="text-red-500">✗ {zh ? '不參加' : 'No'}</span>
                                      : <span className="text-gray-300 dark:text-gray-600">– {zh ? '未回應' : 'No response'}</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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

      {/* CSV Import Format Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {zh ? 'CSV 格式範例' : 'CSV Format'}
            </h3>
            <pre className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-700 dark:text-gray-300 whitespace-pre overflow-x-auto">{`name,phone,email\nBob Smith,+886912345678,bob@example.com\n陳小明,+886987654321,ming@example.com`}</pre>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              {zh ? '手機需含國碼（如 +886）。' : 'Phone must include country code (e.g. +1, +886).'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {zh ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={() => { setShowImportModal(false); setTimeout(() => importFileRef.current?.click(), 50); }}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {zh ? '選擇檔案' : 'Select File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
