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
      await apiFetch<EventWithCounts>('/events', {
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
            {zh ? '設定此群組的上層群組（父群組），或檢視其子群組。' : 'Set a parent group for this group, or view its subgroups.'}
          </p>

          {/* Current parent */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '目前父群組' : 'Current Parent'}</p>
            {relationships?.parentGroup ? (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{relationships.parentGroup.name}</span>
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
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">{zh ? '無（頂層群組）' : 'None (top-level group)'}</p>
            )}
          </div>

          {/* Subgroups */}
          {relationships?.subgroups && relationships.subgroups.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? `子群組 (${relationships.subgroups.length})` : `Subgroups (${relationships.subgroups.length})`}</p>
              <div className="mt-2 space-y-2">
                {relationships.subgroups.map((sg) => (
                  <div key={sg.id} className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{sg.name}</span>
                    {sg.description && <span className="text-gray-400 dark:text-gray-500">{sg.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Set parent */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '設定父群組' : 'Set Parent Group'}</p>
            <div className="mt-2 flex gap-2">
              <input
                value={parentSearchQuery}
                onChange={(e) => setParentSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleParentSearch(); } }}
                placeholder={zh ? '搜尋群組名稱…' : 'Search group name…'}
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
                  <div key={g.id} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{g.name}</p>
                      {g.description && <p className="text-xs text-gray-400 dark:text-gray-500">{g.description}</p>}
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm(zh ? `確定要將「${g.name}」設為此群組的父群組嗎？` : `Set "${g.name}" as parent of this group?`)) return;
                        setParentSaving(true);
                        setError('');
                        setSuccess('');
                        try {
                          await apiFetch(`/groups/${params.groupId}/parent`, { method: 'PATCH', body: JSON.stringify({ parentGroupId: g.id }) });
                          setParentSearchQuery('');
                          setParentSearchResults([]);
                          setSuccess(zh ? `父群組已設為「${g.name}」。` : `Parent group set to "${g.name}".`);
                          await loadPage();
                        } catch (err: unknown) {
                          setError((err as Error).message ?? 'Failed.');
                        } finally {
                          setParentSaving(false);
                        }
                      }}
                      disabled={parentSaving}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {zh ? '設為父群組' : 'Set as Parent'}
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Post Group News */}
        <section className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '發布群組公告' : 'Post Group News'}</h2>
          <form onSubmit={handleCreateNews} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '標題' : 'Title'}</label>
              <input value={newsForm.title} onChange={(e) => setNewsForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '內容' : 'Body'}</label>
              <textarea value={newsForm.body} onChange={(e) => setNewsForm((f) => ({ ...f, body: e.target.value }))} rows={4} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <button type="submit" disabled={newsLoading || !newsForm.title.trim() || !newsForm.body.trim()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {newsLoading ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布公告' : 'Post News')}
            </button>
          </form>
        </section>

        {/* Create Group Event */}
        <section className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{zh ? '建立群組活動' : 'Create Group Event'}</h2>
          <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '名稱' : 'Title'}</label>
              <input value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '地點' : 'Location'}</label>
              <LocationPicker value={eventForm.location} onChange={(value) => setEventForm((f) => ({ ...f, location: value }))} showMapPreview={false} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '描述' : 'Description'}</label>
              <textarea value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '開始' : 'Start'}</label>
                <input type="datetime-local" value={eventForm.startAt} onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '結束' : 'End'}</label>
                <input type="datetime-local" value={eventForm.endAt} onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '時區' : 'Timezone'}</label>
                <input value={eventForm.timezone} onChange={(e) => setEventForm((f) => ({ ...f, timezone: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '費用' : 'Fee'}</label>
                <input type="number" value={eventForm.feeAmount} onChange={(e) => setEventForm((f) => ({ ...f, feeAmount: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '幣別' : 'Currency'}</label>
                <input value={eventForm.feeCurrency} onChange={(e) => setEventForm((f) => ({ ...f, feeCurrency: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '封面照片' : 'Cover photo'}</label>
              <div onClick={() => coverFileRef.current?.click()} className="relative flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition hover:bg-gray-100 dark:hover:bg-gray-700">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">{zh ? '點擊上傳照片' : 'Click to upload a photo'}</span>
                )}
              </div>
              <input ref={coverFileRef} type="file" accept="image/*" onChange={handleEventFileChange} className="hidden" />
            </div>
            <button type="submit" disabled={eventLoading || !eventForm.title.trim() || !eventForm.location.trim() || !eventForm.startAt} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立活動' : 'Create Event')}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
