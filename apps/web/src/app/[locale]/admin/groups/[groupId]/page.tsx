'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload } from '@/lib/api';
import type { Event, EventWithCounts, News, PaginatedResponse } from '@judien/shared';

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

export default function GroupWorkspacePage({ params }: { params: { locale: string; groupId: string } }) {
  const zh = params.locale === 'zh';
  const { user, loading } = useAuth();

  const [groupItem, setGroupItem] = useState<GroupListItem | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'GROUP_ADMIN'>('MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);

  const [addIdentifier, setAddIdentifier] = useState('');
  const [addRole, setAddRole] = useState<'MEMBER' | 'GROUP_ADMIN'>('MEMBER');
  const [addLoading, setAddLoading] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; already_member: number; not_found: number } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingImportType, setPendingImportType] = useState<'xlsx' | 'txt' | null>(null);

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
      const [groups, memberList, groupNews, groupEvents] = await Promise.all([
        apiFetch<GroupListItem[]>('/groups/me'),
        apiFetch<GroupMember[]>(`/groups/${params.groupId}/members`),
        apiFetch<News[]>(`/news?groupId=${params.groupId}`),
        apiFetch<PaginatedResponse<EventWithCounts>>(`/events?scope=future&groupId=${params.groupId}&page=1&pageSize=20`),
      ]);
      const current = groups.find((item) => item.group.id === params.groupId) ?? null;
      setGroupItem(current);
      setMembers(memberList);
      setNews(groupNews);
      setEvents(groupEvents.data);
      if (!current) setError(zh ? '找不到此群組。' : 'Group not found.');
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load group workspace.');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !user) return;
    loadPage();
  }, [loading, user, params.groupId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
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
      setInviteRole('MEMBER');
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
      setAddRole('MEMBER');
      setSuccess(zh ? `成員已新增：${result.displayName ?? addIdentifier.trim()}` : `Member added: ${result.displayName ?? addIdentifier.trim()}`);
      await loadPage();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to add member.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
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
    setEventLoading(true);
    try {
      let coverImageUrl: string | null = null;
      if (coverFile) {
        const uploaded = await apiUpload(coverFile);
        coverImageUrl = uploaded.url;
      }
      await apiFetch<Event>('/events', {
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
      setEventForm({
        title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD',
      });
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

  if (loading || pageLoading) return <p className="py-16 text-center text-gray-400">Loading…</p>;

  if (!user || user.role !== 'ADMIN') {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{zh ? '只有平台管理員可以管理群組。' : 'Only platform admins can manage groups.'}</div>;
  }

  if (!groupItem) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{error || (zh ? '找不到此群組。' : 'Group not found.')}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href={`/${params.locale}/admin/groups`} className="text-sm text-gray-500 hover:text-gray-800">← {zh ? '返回群組列表' : 'Back to groups'}</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{groupItem.group.name}</h1>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{groupItem.membership.role}</span>
        </div>
        {groupItem.group.description && <p className="text-sm text-gray-500">{groupItem.group.description}</p>}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{zh ? '邀請成員' : 'Invite Member'}</h2>
        <p className="mt-1 text-sm text-gray-500">{zh ? '輸入電子郵件或手機號碼發送群組邀請。' : 'Send a group invitation by email or phone.'}</p>
        <form onSubmit={handleInvite} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="member@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="+886900000123" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '角色' : 'Role'}</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'MEMBER' | 'GROUP_ADMIN')} className="w-full rounded-md border px-3 py-2 text-sm">
              <option value="MEMBER">{zh ? '成員' : 'Member'}</option>
              <option value="GROUP_ADMIN">{zh ? '群組管理員' : 'Group admin'}</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={inviteLoading || (!inviteEmail.trim() && !invitePhone.trim())} className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {inviteLoading ? (zh ? '發送中…' : 'Sending…') : (zh ? '發送邀請' : 'Send Invite')}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{zh ? '直接新增成員' : 'Add Member Directly'}</h2>
        <p className="mt-1 text-sm text-gray-500">{zh ? '以電子郵件、手機號碼或用戶 ID 直接加入成員，無需邀請流程。' : 'Add a member instantly by email, phone, or user ID — no invite required.'}</p>
        <form onSubmit={handleAddMember} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '電子郵件 / 手機 / 用戶 ID' : 'Email / Phone / User ID'}</label>
            <input value={addIdentifier} onChange={(e) => setAddIdentifier(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder={zh ? 'member@example.com 或 +886…' : 'member@example.com or +886…'} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '角色' : 'Role'}</label>
            <select value={addRole} onChange={(e) => setAddRole(e.target.value as 'MEMBER' | 'GROUP_ADMIN')} className="w-full rounded-md border px-3 py-2 text-sm">
              <option value="MEMBER">{zh ? '成員' : 'Member'}</option>
              <option value="GROUP_ADMIN">{zh ? '群組管理員' : 'Group admin'}</option>
            </select>
          </div>
          <div className="flex items-end md:col-span-3">
            <button type="submit" disabled={addLoading || !addIdentifier.trim()} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {addLoading ? (zh ? '新增中…' : 'Adding…') : (zh ? '直接新增' : 'Add Directly')}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{zh ? '群組成員' : 'Members'}</h2>
            <p className="mt-1 text-sm text-gray-500">{zh ? '目前此群組內可見的成員名單。' : 'Current visible members in this group.'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">{members.length} {zh ? '位成員' : 'members'}</span>
            <div className="relative">
              <button
                onClick={() => setShowImportModal(true)}
                disabled={importLoading}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {importLoading ? (zh ? '匯入中…' : 'Importing…') : (zh ? '📥 匯入' : '📥 Import')}
              </button>
              {showImportModal && (
                <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <p className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">{zh ? '選擇格式' : 'Choose format'}</p>
                  <button
                    onClick={() => triggerImport('xlsx')}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    📊 Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => triggerImport('txt')}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    📄 Text (.txt)
                  </button>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100"
                  >
                    {zh ? '取消' : 'Cancel'}
                  </button>
                </div>
              )}
              <input
                ref={importFileRef}
                type="file"
                accept={pendingImportType === 'txt' ? '.txt' : '.xlsx,.xls'}
                onChange={handleImportMembers}
                className="hidden"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportModal(true)}
                disabled={exportLoading}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {exportLoading ? (zh ? '匯出中…' : 'Exporting…') : (zh ? '📤 匯出' : '📤 Export')}
              </button>
              {showExportModal && (
                <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <p className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">{zh ? '選擇格式' : 'Choose format'}</p>
                  <button
                    onClick={() => handleExportMembers('xlsx')}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    📊 Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExportMembers('txt')}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    📄 Text (.txt)
                  </button>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100"
                  >
                    {zh ? '取消' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {importResult && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            {zh
              ? `匯入結果：新增 ${importResult.added} 人，已是成員 ${importResult.already_member} 人，未找到 ${importResult.not_found} 人。`
              : `Import result: ${importResult.added} added, ${importResult.already_member} already members, ${importResult.not_found} not found.`}
          </div>
        )}
        <div className="grid gap-3">
          {members.map((member) => (
            <div key={member.userId} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{member.displayName || (member.email ?? member.userId)}</p>
                  <p className="text-xs text-gray-500">{member.role} • {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US') : (zh ? '尚未加入' : 'Not joined yet')}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {member.email && <p>{member.email}</p>}
                  {member.phoneE164 && <p>{member.phoneE164}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{zh ? '發布群組公告' : 'Post Group News'}</h2>
          <form onSubmit={handleCreateNews} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '標題' : 'Title'}</label>
              <input value={newsForm.title} onChange={(e) => setNewsForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '內容' : 'Body'}</label>
              <textarea value={newsForm.body} onChange={(e) => setNewsForm((f) => ({ ...f, body: e.target.value }))} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <button type="submit" disabled={newsLoading || !newsForm.title.trim() || !newsForm.body.trim()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {newsLoading ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布公告' : 'Post News')}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {news.length === 0 ? <p className="text-sm text-gray-400">{zh ? '尚無群組公告。' : 'No group news yet.'}</p> : news.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="font-medium text-gray-900">{zh ? item.title_zh : item.title_en}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{zh ? item.body_zh : item.body_en}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{zh ? '建立群組活動' : 'Create Group Event'}</h2>
          <form onSubmit={handleCreateEvent} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '名稱' : 'Title'}</label>
              <input value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '地點' : 'Location'}</label>
              <LocationPicker value={eventForm.location} onChange={(value) => setEventForm((f) => ({ ...f, location: value }))} showMapPreview={false} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '描述' : 'Description'}</label>
              <textarea value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '開始' : 'Start'}</label>
                <input type="datetime-local" value={eventForm.startAt} onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '結束' : 'End'}</label>
                <input type="datetime-local" value={eventForm.endAt} onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '時區' : 'Timezone'}</label>
                <input value={eventForm.timezone} onChange={(e) => setEventForm((f) => ({ ...f, timezone: e.target.value }))} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '費用' : 'Fee'}</label>
                <input type="number" value={eventForm.feeAmount} onChange={(e) => setEventForm((f) => ({ ...f, feeAmount: e.target.value }))} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '幣別' : 'Currency'}</label>
                <input value={eventForm.feeCurrency} onChange={(e) => setEventForm((f) => ({ ...f, feeCurrency: e.target.value }))} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{zh ? '封面照片' : 'Cover photo'}</label>
              <div onClick={() => coverFileRef.current?.click()} className="relative flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:bg-gray-100">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-gray-400">{zh ? '點擊上傳照片' : 'Click to upload a photo'}</span>
                )}
              </div>
              <input ref={coverFileRef} type="file" accept="image/*" onChange={handleEventFileChange} className="hidden" />
            </div>
            <button type="submit" disabled={eventLoading || !eventForm.title.trim() || !eventForm.location.trim() || !eventForm.startAt} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {eventLoading ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立活動' : 'Create Event')}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {events.length === 0 ? <p className="text-sm text-gray-400">{zh ? '尚無群組活動。' : 'No group events yet.'}</p> : events.map((event) => (
              <Link key={event.id} href={`/${params.locale}/events/${event.id}`} className="block rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:bg-gray-100">
                <h3 className="font-medium text-gray-900">{zh ? event.title_zh : event.title_en}</h3>
                <p className="mt-1 text-sm text-gray-500">{new Date(event.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <p className="mt-1 text-sm text-gray-500">{zh ? event.location_zh : event.location_en}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
