'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload } from '@/lib/api';

const LocationPicker = dynamic(() => import('@/components/LocationPickerInner'), { ssr: false });

type GroupListItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    discoverableBySearch: boolean;
    memberDataPrivate: boolean;
    createdAt: string;
    updatedAt: string;
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

  const [groupItem, setGroupItem] = useState<GroupListItem | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);

  const [addIdentifier, setAddIdentifier] = useState('');
  const [addRole, setAddRole] = useState<'GROUP_MEMBER' | 'GROUP_ADMIN'>('GROUP_MEMBER');
  const [addLoading, setAddLoading] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; already_member: number; not_found: number } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingImportType, setPendingImportType] = useState<'xlsx' | 'txt' | null>(null);

  const [groupSettings, setGroupSettings] = useState({ discoverableBySearch: false, memberDataPrivate: false });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [relationships, setRelationships] = useState<{
    parentGroup: { id: string; name: string } | null;
    subgroups: { id: string; name: string; description: string }[];
  } | null>(null);
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<{ id: string; pid: string; name: string; description: string }[]>([]);
  const [parentSearchLoading, setParentSearchLoading] = useState(false);
  const [parentSaving, setParentSaving] = useState(false);

  const [newParentForm, setNewParentForm] = useState({ pid: '', name: '', description: '' });
  const [parentCreating, setParentCreating] = useState(false);

  const [childSearchQuery, setChildSearchQuery] = useState('');
  const [childSearchResults, setChildSearchResults] = useState<{ id: string; pid: string; name: string; description: string }[]>([]);
  const [childSearchLoading, setChildSearchLoading] = useState(false);
  const [childLinking, setChildLinking] = useState(false);
  const [newChildForm, setNewChildForm] = useState({ pid: '', name: '', description: '' });
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

  const triggerImport = (type: 'xlsx' | 'txt') => {
    setPendingImportType(type);
    setShowImportModal(false);
    setTimeout(() => importFileRef.current?.click(), 50);
  };

  const handleExportMembers = async (format: 'xlsx' | 'txt') => {
    setShowExportModal(false);
    setExportLoading(true);
    setError('');
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(
        `${apiBase}/groups/${params.groupId}/members/export?format=${format}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members-${params.groupId}.${format === 'xlsx' ? 'xlsx' : 'txt'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Export failed.');
    } finally {
      setExportLoading(false);
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
          discoverableBySearch: current.group.discoverableBySearch,
          memberDataPrivate: current.group.memberDataPrivate,
        });
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
      const res = await apiFetch<{ id: string; pid: string; name: string; description: string }[]>(`/groups/search?q=${encodeURIComponent(parentSearchQuery.trim())}`);
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
      const res = await apiFetch<{ id: string; pid: string; name: string; description: string }[]>(`/groups/search?q=${encodeURIComponent(childSearchQuery.trim())}`);
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
    if (!newParentForm.pid.trim() || !newParentForm.name.trim()) return;
    setParentCreating(true);
    setError('');
    setSuccess('');
    try {
      const created = await apiFetch<{ id: string; name: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify({
          pid: newParentForm.pid.trim(),
          name: newParentForm.name.trim(),
          description: newParentForm.description.trim() || undefined,
        }),
      });
      await apiFetch(`/groups/${params.groupId}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: created.id }) });
      const createdName = newParentForm.name.trim();
      setNewParentForm({ pid: '', name: '', description: '' });
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
    if (!newChildForm.pid.trim() || !newChildForm.name.trim()) return;
    setChildCreating(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({
          pid: newChildForm.pid.trim(),
          name: newChildForm.name.trim(),
          description: newChildForm.description.trim() || undefined,
          parentGroupId: params.groupId,
        }),
      });
      const createdName = newChildForm.name.trim();
      setNewChildForm({ pid: '', name: '', description: '' });
      setSuccess(zh ? `子群組「${createdName}」已建立。` : `Child group "${createdName}" created.`);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create child group.');
    } finally {
      setChildCreating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);    setError('');
    setSuccess('');
    try {
      await apiFetch(`/groups/${params.groupId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(groupSettings),
      });
      setSuccess(zh ? '群組設定已儲存。' : 'Group settings saved.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (!inviteEmail.trim() && !invitePhone.trim()) {
      setError(zh ? '請輸入 email 或電話號碼。' : 'Please provide an email or phone number.');
      return;
    }
    setInviteLoading(true);
    try {
      const payload: Record<string, unknown> = { role: inviteRole };
      if (inviteEmail.trim()) payload.email = inviteEmail.trim();
      if (invitePhone.trim()) payload.phoneE164 = invitePhone.trim();
      await apiFetch(`/groups/${params.groupId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ invites: [payload] }),
      });
      setInviteEmail('');
      setInvitePhone('');
      setInviteRole('GROUP_MEMBER');
      setSuccess(zh ? '邀請已送出。' : 'Invitation sent.');
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to invite member.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setAddLoading(true);
    try {
      const result = await apiFetch<{ added: boolean; displayName: string | null }>(`/groups/${params.groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ identifier: addIdentifier.trim(), role: addRole }),
      });
      setAddIdentifier('');
      setAddRole('GROUP_MEMBER');
      setSuccess(zh ? `成員已新增：${result.displayName ?? addIdentifier.trim()}` : `Member added: ${result.displayName ?? addIdentifier.trim()}`);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to add member.');
    } finally {
      setAddLoading(false);
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
        <Link href={`/${params.locale}/admin/groups/${params.groupId}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          ← {zh ? `返回 ${groupItem.group.name}` : `Back to ${groupItem.group.name}`}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {zh ? '群組管理' : 'Group Management'} — {groupItem.group.name}
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={newParentForm.pid}
                      onChange={(e) => setNewParentForm((f) => ({ ...f, pid: e.target.value }))}
                      placeholder={zh ? 'ID (例如 org-main)' : 'ID (e.g. org-main)'}
                      minLength={3}
                      maxLength={40}
                      className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                    <input
                      value={newParentForm.name}
                      onChange={(e) => setNewParentForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={zh ? '群組名稱' : 'Group name'}
                      className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <input
                    value={newParentForm.description}
                    onChange={(e) => setNewParentForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={parentCreating || !newParentForm.pid.trim() || !newParentForm.name.trim()}
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={newChildForm.pid}
                      onChange={(e) => setNewChildForm((f) => ({ ...f, pid: e.target.value }))}
                      placeholder={zh ? 'ID (例如 team-alpha)' : 'ID (e.g. team-alpha)'}
                      minLength={3}
                      maxLength={40}
                      className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                    <input
                      value={newChildForm.name}
                      onChange={(e) => setNewChildForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={zh ? '群組名稱' : 'Group name'}
                      className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <input
                    value={newChildForm.description}
                    onChange={(e) => setNewChildForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={zh ? '描述（選填）' : 'Description (optional)'}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={childCreating || !newChildForm.pid.trim() || !newChildForm.name.trim()}
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
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '控制此群組的公開性與成員資料隱私。' : 'Control discoverability and member data privacy.'}</p>
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={groupSettings.discoverableBySearch}
              onChange={(e) => setGroupSettings((s) => ({ ...s, discoverableBySearch: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">{zh ? '允許搜尋及申請加入' : 'Discoverable by search'}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{zh ? '開啟後，使用者可搜尋此群組並送出加入申請。' : 'Users can find this group via search and send join requests.'}</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={groupSettings.memberDataPrivate}
              onChange={(e) => setGroupSettings((s) => ({ ...s, memberDataPrivate: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">{zh ? '成員資料隱私模式' : 'Member data privacy'}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{zh ? '開啟後，一般成員只能看到顯示名稱、角色與加入日期。' : 'Regular members only see display name, role, and join date.'}</span>
            </span>
          </label>
        </div>
        <button onClick={handleSaveSettings} disabled={settingsSaving} className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {settingsSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存設定' : 'Save Settings')}
        </button>
      </section>

      {/* Invite Member */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '邀請成員' : 'Invite Member'}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '輸入電子郵件或手機號碼發送群組邀請。' : 'Send a group invitation by email or phone.'}</p>
        <form onSubmit={handleInvite} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="member@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
            <input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="+886900000123" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '角色' : 'Role'}</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'GROUP_MEMBER' | 'GROUP_ADMIN')} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="GROUP_MEMBER">{zh ? '成員' : 'Member'}</option>
              <option value="GROUP_ADMIN">{zh ? '群組管理員' : 'Group Admin'}</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={inviteLoading || (!inviteEmail.trim() && !invitePhone.trim())} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {inviteLoading ? (zh ? '發送中…' : 'Sending…') : (zh ? '發送邀請' : 'Send Invite')}
            </button>
          </div>
        </form>
      </section>

      {/* Add Member Directly — platform admin only */}
      {isPlatformAdmin && (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '直接新增成員' : 'Add Member Directly'}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{zh ? '以電子郵件、手機號碼或用戶 ID 直接加入成員，無需邀請流程。' : 'Add a member instantly by email, phone, or user ID — no invite required.'}</p>
          <form onSubmit={handleAddMember} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '電子郵件 / 手機 / 用戶 ID' : 'Email / Phone / User ID'}</label>
              <input value={addIdentifier} onChange={(e) => setAddIdentifier(e.target.value)} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder={zh ? 'member@example.com 或 +886…' : 'member@example.com or +886…'} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '角色' : 'Role'}</label>
              <select value={addRole} onChange={(e) => setAddRole(e.target.value as 'GROUP_MEMBER' | 'GROUP_ADMIN')} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="GROUP_MEMBER">{zh ? '成員' : 'Member'}</option>
                <option value="GROUP_ADMIN">{zh ? '群組管理員' : 'Group Admin'}</option>
              </select>
            </div>
            <div className="flex items-end md:col-span-3">
              <button type="submit" disabled={addLoading || !addIdentifier.trim()} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {addLoading ? (zh ? '新增中…' : 'Adding…') : (zh ? '直接新增' : 'Add Directly')}
              </button>
            </div>
          </form>
        </section>
      )}

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
                    {importLoading ? (zh ? '匯入中…' : 'Importing…') : (zh ? '📥 匯入' : '📥 Import')}
                  </button>
                  {showImportModal && (
                    <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                      <p className="border-b border-gray-100 dark:border-gray-800 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{zh ? '選擇格式' : 'Choose format'}</p>
                      <button onClick={() => triggerImport('xlsx')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">📊 Excel (.xlsx)</button>
                      <button onClick={() => triggerImport('txt')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">📄 Text (.txt)</button>
                      <button onClick={() => setShowImportModal(false)} className="w-full border-t border-gray-100 dark:border-gray-800 px-3 py-2 text-left text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">{zh ? '取消' : 'Cancel'}</button>
                    </div>
                  )}
                  <input ref={importFileRef} type="file" accept={pendingImportType === 'txt' ? '.txt' : '.xlsx,.xls'} onChange={handleImportMembers} className="hidden" />
                </div>
                <div className="relative">
                  <button onClick={() => setShowExportModal(true)} disabled={exportLoading} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {exportLoading ? (zh ? '匯出中…' : 'Exporting…') : (zh ? '📤 匯出' : '📤 Export')}
                  </button>
                  {showExportModal && (
                    <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                      <p className="border-b border-gray-100 dark:border-gray-800 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{zh ? '選擇格式' : 'Choose format'}</p>
                      <button onClick={() => handleExportMembers('xlsx')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">📊 Excel (.xlsx)</button>
                      <button onClick={() => handleExportMembers('txt')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">📄 Text (.txt)</button>
                      <button onClick={() => setShowExportModal(false)} className="w-full border-t border-gray-100 dark:border-gray-800 px-3 py-2 text-left text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">{zh ? '取消' : 'Cancel'}</button>
                    </div>
                  )}
                </div>
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
      </div>
    </div>
  );
}
