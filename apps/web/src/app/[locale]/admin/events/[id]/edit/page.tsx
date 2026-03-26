'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiFetch, apiUpload, resolveImageUrl } from '@/lib/api';
import { useAuth } from '@/context/auth.context';
import ConfirmModal from '@/components/ConfirmModal';
import type { Event, ReminderRule } from '@judien/shared';

const LocationPicker = dynamic(() => import('@/components/LocationPickerInner'), { ssr: false });

// ── helpers ──────────────────────────────────────────────────────────────────

const inp = 'w-full border rounded-md px-3 py-2 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
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

const REMINDER_PRESETS = [
  { label: '1 week before', minutes: 10080 },
  { label: '3 days before', minutes: 4320 },
  { label: '1 day before', minutes: 1440 },
  { label: '1 hour before', minutes: 60 },
  { label: '15 min before', minutes: 15 },
];

// ── page ──────────────────────────────────────────────────────────────────────

export default function EditEventPage({ params }: { params: { locale: string; id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const zh = params.locale === 'zh';
  const [event, setEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [reminders, setReminders] = useState<{ offsetMinutes: number; channels: string[]; enabled: boolean }[]>([]);

  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
        title: ev.title_en,
        description: ev.description_en,
        location: ev.location_en,
        startAt: (ev.startAt ?? '').replace('Z', '').slice(0, 16),
        endAt: (ev.endAt ?? '').replace('Z', '').slice(0, 16),
        timezone: ev.timezone,
        feeAmount: ev.feeAmount != null ? String(ev.feeAmount) : '',
        feeCurrency: ev.feeCurrency,
        coverImageUrl: ev.coverImageUrl ?? '',
      });
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
        title_en: form.title,
        title_zh: form.title,
        description_en: form.description,
        description_zh: form.description,
        location_en: form.location,
        location_zh: form.location,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt || null,
        timezone: form.timezone,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        feeCurrency: form.feeCurrency,
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
            channels: r.channels as ('SMS' | 'EMAIL')[],
            enabled: r.enabled,
          })),
        }),
      });
    } finally {
      setSavingReminders(false);
    }
  };

  if (!event) return <p className="text-gray-400 mt-8">Loading…</p>;

  if (user?.role !== 'ADMIN') return (
    <div className="text-center py-16">
      <p className="text-red-500 font-medium">Admin access required.</p>
      <a href={`/${params.locale}/events`} className="text-indigo-600 underline mt-3 block text-sm">← Back to events</a>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto mt-6 pb-20 space-y-6">
      {showDeleteModal && (
        <ConfirmModal
          title={zh ? '刪除活動' : 'Delete Event'}
          message={
            zh
              ? `確定要永久刪除「${event.title_zh || event.title_en}」嗎？此操作無法恢復。`
              : `Are you sure you want to delete "${event.title_en || event.title_zh}"? This cannot be undone.`
          }
          confirmLabel={zh ? '確定刪除' : 'Delete'}
          cancelLabel={zh ? '取消' : 'Cancel'}
          onConfirm={handleDeleteEvent}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* ── Top toolbar: ← Back | Save Changes | Delete Event ─────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 border-b border-dashed border-gray-200">
        <a
          href={`/${params.locale}/events/${params.id}`}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mr-2"
        >
          ← {zh ? '返回' : 'Back'}
        </a>
        <button
          type="button"
          onClick={doUpdate}
          disabled={submitting}
          className="text-sm bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-60 transition"
        >
          {submitting ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存變更' : 'Save Changes')}
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600"
        >
          {zh ? '刪除活動' : 'Delete Event'}
        </button>
        {error && <p className="text-red-500 text-sm ml-2">{error}</p>}
      </div>

      {/* ── Edit form ───────────────────────────────────────────────────────── */}
      <section>
        <h1 className="text-2xl font-bold mb-3">{zh ? '編輯活動' : 'Edit Event'}</h1>
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
          <Field label="Description">
            <textarea value={form.description ?? ''} onChange={set('description')} rows={3} className={inp} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start">
              <input type="datetime-local" value={form.startAt ?? ''} onChange={set('startAt')} className={inp} />
            </Field>
            <Field label="End (optional)">
              <input type="datetime-local" value={form.endAt ?? ''} onChange={set('endAt')} className={inp} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Timezone">
              <input value={form.timezone ?? ''} onChange={set('timezone')} className={inp} />
            </Field>
            <Field label="Fee">
              <input type="number" value={form.feeAmount ?? ''} onChange={set('feeAmount')} placeholder="0" className={inp} />
            </Field>
            <Field label="Currency">
              <input value={form.feeCurrency ?? ''} onChange={set('feeCurrency')} className={inp} />
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
              className="relative w-full h-16 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-center gap-2 text-gray-400 text-sm transition"
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

      {/* ── Automatic reminders ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-semibold mb-1">Automatic Reminders</h2>
        <p className="text-sm text-gray-500 mb-4">Sent automatically to RSVPed users before the event.</p>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {REMINDER_PRESETS.map((p) => {
            const active = reminders.some((r) => r.offsetMinutes === p.minutes);
            return (
              <button
                key={p.minutes}
                onClick={() => active ? removeReminder(reminders.findIndex((r) => r.offsetMinutes === p.minutes)) : addPresetReminder(p.minutes)}
                className={`text-sm px-3 py-1.5 rounded-full border transition ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
              >
                {active ? '✓ ' : '+ '}{p.label}
              </button>
            );
          })}
        </div>

        {reminders.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">No reminders set. Click a preset above to add one.</p>
        )}

        {reminders.map((r, i) => (
          <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-3 mb-2">
            <span className="text-sm font-medium w-36">{minutesToLabel(r.offsetMinutes)}</span>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={r.channels.includes('EMAIL')}
                onChange={(e) => toggleReminderChannel(i, 'EMAIL', e.target.checked)} /> Email
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={r.channels.includes('SMS')}
                onChange={(e) => toggleReminderChannel(i, 'SMS', e.target.checked)} /> SMS
            </label>
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
            className="mt-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-60 transition">
            {savingReminders ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存提醒' : 'Save Reminders')}
          </button>
        )}
      </section>



    </div>
  );
}
