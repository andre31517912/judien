'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { apiFetch, apiUpload, resolveImageUrl } from '@/lib/api';
import { useAuth } from '@/context/auth.context';
import ConfirmModal from '@/components/ConfirmModal';
import type { Event, ReminderRule } from '@judien/shared';
import DateTimeInput from '@/components/DateTimeInput';

const LocationPicker = dynamic(() => import('@/components/LocationPickerInner'), { ssr: false });

// ── helpers ──────────────────────────────────────────────────────────────────

const inp = 'w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{label}</label>
      {children}
    </div>
  );
}

function minutesToLabel(m: number) {
  if (m >= 10080 && m % 10080 === 0) return `${m / 10080} week${m / 10080 > 1 ? 's' : ''} before`;
  if (m >= 1440) return `${m / 1440} day${m / 1440 > 1 ? 's' : ''} before`;
  if (m >= 60) return `${m / 60} hour${m / 60 > 1 ? 's' : ''} before`;
  return `${m} min before`;
}

interface GroupMember {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: string;
}

const REMINDER_PRESETS = [
  { label: '1 week before', minutes: 10080 },
  { label: '1 day before', minutes: 1440 },
  { label: '2 hours before', minutes: 120 },
  { label: '1 hour before', minutes: 60 },
  { label: '15 min before', minutes: 15 },
];

// ── page ──────────────────────────────────────────────────────────────────────

export default function EditEventPage({ params }: { params: { locale: string; id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const zh = params.locale === 'zh';
  const [event, setEvent] = useState<Event | null>(null);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [reminders, setReminders] = useState<{ offsetMinutes: number; channels: string[]; enabled: boolean }[]>([]);
  const [customReminderValue, setCustomReminderValue] = useState('');
  const [customReminderUnit, setCustomReminderUnit] = useState<'hours' | 'days'>('hours');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // group member invite state
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // cover image
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    apiFetch<Event>(`/events/${params.id}`).then((ev) => {
      setEvent(ev);
      setForm({
        title: ev.title,
        description: ev.description,
        location: ev.location,
        startAt: (ev.startAt ?? '').replace('Z', '').slice(0, 16),
        endAt: (ev.endAt ?? '').replace('Z', '').slice(0, 16),
        feeAmount: ev.feeAmount != null ? String(ev.feeAmount) : '',
        coverImageUrl: ev.coverImageUrl ?? '',
      });
      if (ev.groupId) {
        const gid = ev.groupId;
        apiFetch<Array<{ group: { id: string }; membership: { role: string; status: string } }>>('/groups/me')
          .then((groups) => {
            const match = groups.find((g) => g.group.id === gid);
            setIsGroupAdmin(match?.membership.status === 'ACCEPTED' && match?.membership.role === 'GROUP_ADMIN');
            setAccessChecked(true);
          })
          .catch(() => setAccessChecked(true));
        apiFetch<GroupMember[]>(`/groups/${ev.groupId}/members`).then(setGroupMembers).catch(() => {});
      } else {
        setAccessChecked(true);
      }
    });
    apiFetch<ReminderRule[]>(`/events/${params.id}/reminders`).then((rules) => {
      setReminders(rules.map((r) => ({ offsetMinutes: r.offsetMinutes, channels: r.channels, enabled: r.enabled })));
    });
  }, [params.id]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // ── event update ────────────────────────────────────────────────────────────
  const doUpdate = async () => {
    setError('');
    setSaved(false);
    setSubmitting(true);
    try {
      // Upload new cover photo first if one was selected
      if (coverFile) {
        const uploaded = await apiUpload(coverFile);
        setForm((f) => ({ ...f, coverImageUrl: uploaded.url }));
        form.coverImageUrl = uploaded.url;
        setCoverFile(null);
      }
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        location: form.location,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        coverImageUrl: form.coverImageUrl || null,
      };
      await apiFetch(`/events/${params.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      // Redirect back to event detail after saving
      router.push(`/${params.locale}/events/${params.id}`);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error updating event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = (e: React.FormEvent) => { e.preventDefault(); doUpdate(); };

  const handleDeleteEvent = async () => {
    await apiFetch(`/events/${params.id}`, { method: 'DELETE' });
    router.push(`/${params.locale}/events`);
  };

  // ── member invites ──────────────────────────────────────────────────────────
  const toggleMember = (userId: string) =>
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });

  const selectAllMembers = () => setSelectedMemberIds(new Set(groupMembers.map((m) => m.userId)));
  const clearMemberSelection = () => setSelectedMemberIds(new Set());

  const handleSendInvites = async () => {
    if (selectedMemberIds.size === 0) return;
    setInviting(true);
    setInviteSent(false);
    try {
      await apiFetch(`/events/${params.id}/invite-members`, {
        method: 'POST',
        body: JSON.stringify({ userIds: Array.from(selectedMemberIds) }),
      });
      setInviteSent(true);
      setSelectedMemberIds(new Set());
    } finally {
      setInviting(false);
    }
  };

  // ── reminders ───────────────────────────────────────────────────────────────
  const addPresetReminder = (minutes: number) => {
    if (reminders.some((r) => r.offsetMinutes === minutes)) return; // no dup
    setReminders((r) => [...r, { offsetMinutes: minutes, channels: ['EMAIL'], enabled: true }]);
  };

  const removeReminder = (i: number) => setReminders((r) => r.filter((_, j) => j !== i));

  const toggleReminderChannel = (i: number, ch: string, on: boolean) =>
    setReminders((prev) => prev.map((r, j) => j !== i ? r : {
      ...r, channels: on ? [...r.channels.filter((c) => c !== ch), ch] : r.channels.filter((c) => c !== ch),
    }));

  const handleSaveReminders = async () => {
    setSavingReminders(true);
    try {
      await apiFetch(`/events/${params.id}/reminders`, {
        method: 'POST',
        body: JSON.stringify({
          rules: reminders.map((r) => ({
            offsetMinutes: r.offsetMinutes,
            channels: r.channels as ('EMAIL' | 'LINE')[],
            enabled: r.enabled,
          })),
        }),
      });
    } finally {
      setSavingReminders(false);
    }
  };

  if (!event) return <p className="text-gray-400 mt-8">Loading…</p>;
  if (!accessChecked && user?.role !== 'ADMIN') return <p className="text-gray-400 mt-8">Loading…</p>;

  if (user?.role !== 'ADMIN' && !isGroupAdmin) return (
    <div className="text-center py-16">
      <p className="text-red-500 font-medium">Admin access required.</p>
    </div>
  );

  return (
    <div className="mt-6 pb-20 space-y-6">
      {showDeleteModal && (
        <ConfirmModal
          title={zh ? '刪除活動' : 'Delete Event'}
          message={
            zh
              ? `確定要永久刪除「${event.title}」嗎？此操作無法恢復。`
              : `Are you sure you want to delete "${event.title}"? This cannot be undone.`
          }
          confirmLabel={zh ? '確定刪除' : 'Delete'}
          cancelLabel={zh ? '取消' : 'Cancel'}
          onConfirm={handleDeleteEvent}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* ── Top toolbar: ← Back | Save Changes | Delete Event ─────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 border-b border-dashed border-gray-200 dark:border-gray-700">
        <Link
          href={`/${params.locale}/events/${params.id}`}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition mr-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {zh ? '返回' : 'Back'}
        </Link>
        <button
          type="button"
          onClick={doUpdate}
          disabled={submitting}
          className="text-sm bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition"
        >
          {submitting ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存變更' : 'Save Changes')}
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-xl hover:bg-red-600"
        >
          {zh ? '刪除活動' : 'Delete Event'}
        </button>
        {error && <p className="text-red-500 text-sm ml-2">{error}</p>}
      </div>

      {/* ── Edit form ───────────────────────────────────────────────────────── */}
      <section>
        <h1 className="text-2xl font-bold mb-3 dark:text-white">{zh ? '編輯活動' : 'Edit Event'}</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {saved && <p className="text-green-600 text-sm mb-4">✓ Changes saved.</p>}

        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          <Field label="Title">
            <input value={form.title ?? ''} onChange={set('title')} placeholder="Event name" className={inp} />
          </Field>
          <Field label="Location">
            <LocationPicker
              value={form.location ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, location: v }))}
            />
          </Field>
          <Field label="Fee (optional)">
            <input type="number" value={form.feeAmount ?? ''} onChange={set('feeAmount')} placeholder="0" className={inp} />
          </Field>
          <Field label="Description">
            <textarea value={form.description ?? ''} onChange={set('description')} rows={3} className={inp} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start">
              <DateTimeInput value={form.startAt ?? ''} onChange={(v) => setForm((f) => ({ ...f, startAt: v }))} placeholder="Select start date & time" />
            </Field>
            <Field label="End (optional)">
              <DateTimeInput value={form.endAt ?? ''} onChange={(v) => setForm((f) => ({ ...f, endAt: v }))} placeholder="Select end date & time" clearable />
            </Field>
          </div>
          <Field label="Cover Photo">
            {/* Show current cover with remove button */}
            {(form.coverImageUrl || coverPreview) && (
              <div className="relative mb-2 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview ?? resolveImageUrl(form.coverImageUrl) ?? ''}
                  alt="cover"
                  className="w-full h-40 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                    setForm((f) => ({ ...f, coverImageUrl: '' }));
                  }}
                  className="absolute top-2 right-2 bg-black/55 hover:bg-black/75 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition"
                  title="Remove photo"
                >
                  ✕
                </button>
              </div>
            )}
            <div
              onClick={() => coverFileRef.current?.click()}
              className="relative w-full h-16 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-sm transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {coverPreview ? 'Replace photo' : (form.coverImageUrl ? 'Replace photo' : 'Upload cover photo')}
            </div>
            <input ref={coverFileRef} type="file" accept="image/*" onChange={handleCoverFileChange} className="hidden" />
          </Field>
        </form>
      </section>

      {/* ── Invite Group Members ────────────────────────────────────────────── */}
      {groupMembers.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-1 dark:text-white">{zh ? '邀請賓客' : 'Invite Guest'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {zh ? '選擇要邀請到此活動的成員，系統將傳送通知給他們。' : 'Select members to invite to this event. They will receive an in-app, email, or LINE notification.'}
          </p>

          {inviteSent && (
            <p className="text-green-600 text-sm mb-3">✓ {zh ? '邀請已送出！' : 'Invitations sent!'}</p>
          )}

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={selectAllMembers}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {zh ? '全選' : 'Select all'}
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={clearMemberSelection}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
            >
              {zh ? '取消全選' : 'Clear'}
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              {selectedMemberIds.size} {zh ? '已選' : 'selected'}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
            {groupMembers.map((m) => (
              <label
                key={m.userId}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <input
                  type="checkbox"
                  checked={selectedMemberIds.has(m.userId)}
                  onChange={() => toggleMember(m.userId)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">
                  {m.displayName ?? '(no name)'}
                </span>
                {m.role === 'GROUP_ADMIN' && (
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded px-1.5 py-0.5">
                    Admin
                  </span>
                )}
                {m.email && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px]">{m.email}</span>
                )}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSendInvites}
            disabled={inviting || selectedMemberIds.size === 0}
            className="mt-3 bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {inviting
              ? (zh ? '傳送中…' : 'Sending…')
              : (zh ? `傳送邀請 (${selectedMemberIds.size})` : `Send Invites (${selectedMemberIds.size})`)}
          </button>
        </section>
      )}

      {/* ── Automatic reminders ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-semibold mb-1 dark:text-white">Automatic Reminders</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Sent automatically to RSVPed users before the event.</p>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {REMINDER_PRESETS.map((p) => {
            const active = reminders.some((r) => r.offsetMinutes === p.minutes);
            return (
              <button
                key={p.minutes}
                onClick={() => active ? removeReminder(reminders.findIndex((r) => r.offsetMinutes === p.minutes)) : addPresetReminder(p.minutes)}
                className={`text-sm px-3 py-1.5 rounded-full border transition ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400'}`}
              >
                {active ? '✓ ' : '+ '}{p.label}
              </button>
            );
          })}
        </div>

        {/* Custom reminder input */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input
            type="number"
            min="1"
            max="365"
            value={customReminderValue}
            onChange={(e) => setCustomReminderValue(e.target.value)}
            placeholder={zh ? '數量' : 'Amount'}
            className="w-24 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <div className="flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden text-sm">
            {(['hours', 'days'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setCustomReminderUnit(u)}
                className={`px-3 py-1.5 transition ${customReminderUnit === u ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                {u === 'hours' ? (zh ? '小時' : 'Hours') : (zh ? '天' : 'Days')}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{zh ? '之前' : 'before'}</span>
          <button
            type="button"
            onClick={() => {
              const v = parseInt(customReminderValue, 10);
              if (!v || v < 1) return;
              const minutes = customReminderUnit === 'days' ? v * 1440 : v * 60;
              addPresetReminder(minutes);
              setCustomReminderValue('');
            }}
            disabled={!customReminderValue || parseInt(customReminderValue, 10) < 1}
            className="rounded-xl bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            + {zh ? '新增' : 'Add'}
          </button>
        </div>

        {reminders.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">No reminders set. Click a preset above to add one.</p>
        )}

        {reminders.map((r, i) => (
          <div key={i} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 mb-2">
            <span className="text-sm font-medium w-36">{minutesToLabel(r.offsetMinutes)}</span>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={r.channels.includes('EMAIL')}
                onChange={(e) => toggleReminderChannel(i, 'EMAIL', e.target.checked)} /> Email
            </label>
            {/* LINE reminder disabled — re-enable when LINE Messaging API is active */}
            {/* <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={r.channels.includes('LINE')}
                onChange={(e) => toggleReminderChannel(i, 'LINE', e.target.checked)} /> LINE
            </label> */}
            <label className="flex items-center gap-1 text-sm ml-2">
              <input type="checkbox" checked={r.enabled}
                onChange={(e) => setReminders((prev) => prev.map((x, j) => j !== i ? x : { ...x, enabled: e.target.checked }))} />
              Enabled
            </label>
            <button onClick={() => removeReminder(i)} className="ml-auto text-xs text-red-400 hover:text-red-600">Remove</button>
          </div>
        ))}

        {reminders.length > 0 && (
          <button onClick={handleSaveReminders}
            disabled={savingReminders}
            className="mt-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition">
            {savingReminders ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存提醒' : 'Save Reminders')}
          </button>
        )}
      </section>



    </div>
  );
}
