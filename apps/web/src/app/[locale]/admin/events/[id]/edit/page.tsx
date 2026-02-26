'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, apiUpload } from '@/lib/api';
import type { Event, ReminderRule } from '@judien/shared';

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
  if (m >= 1440) return `${m / 1440} day${m / 1440 > 1 ? 's' : ''} before`;
  if (m >= 60) return `${m / 60} hour${m / 60 > 1 ? 's' : ''} before`;
  return `${m} min before`;
}

const REMINDER_PRESETS = [
  { label: '3 days before', minutes: 4320 },
  { label: '1 day before', minutes: 1440 },
  { label: '1 hour before', minutes: 60 },
  { label: '15 min before', minutes: 15 },
];

// ── page ──────────────────────────────────────────────────────────────────────

export default function EditEventPage({ params }: { params: { locale: string; id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [reminders, setReminders] = useState<{ offsetMinutes: number; channels: string[]; enabled: boolean }[]>([]);

  // blast state
  const [blastMsg, setBlastMsg] = useState('');
  const [blastChannels, setBlastChannels] = useState<string[]>(['EMAIL']);
  const [blastAudience, setBlastAudience] = useState<'rsvped' | 'all'>('rsvped');
  const [blastResult, setBlastResult] = useState('');

  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

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
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
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
      setSaved(true);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error updating event.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm('Delete this event permanently?')) return;
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
    alert('Reminders saved.');
  };

  // ── blast ───────────────────────────────────────────────────────────────────
  const toggleBlastChannel = (ch: string) =>
    setBlastChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );

  const handleBlast = async () => {
    if (!blastMsg.trim()) { setBlastResult('Please enter a message.'); return; }
    if (blastChannels.length === 0) { setBlastResult('Select at least one channel.'); return; }
    setBlastResult('Sending…');
    try {
      const res = await apiFetch<{ sent: number }>(`/events/${params.id}/blast`, {
        method: 'POST',
        body: JSON.stringify({
          channels: blastChannels,
          audience: blastAudience,
          messageEn: blastMsg,
          messageZh: blastMsg,
        }),
      });
      setBlastResult(`✓ Sent to ${res.sent} user${res.sent !== 1 ? 's' : ''}.`);
    } catch (err: unknown) {
      setBlastResult((err as Error).message ?? 'Failed to send.');
    }
  };

  if (!event) return <p className="text-gray-400 mt-8">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto mt-8 pb-20 space-y-12">

      {/* ── Edit form ───────────────────────────────────────────────────────── */}
      <section>
        <h1 className="text-2xl font-bold mb-6">Edit Event</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {saved && <p className="text-green-600 text-sm mb-4">✓ Changes saved.</p>}

        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          <Field label="Title">
            <input value={form.title ?? ''} onChange={set('title')} placeholder="Event name" className={inp} />
          </Field>
          <Field label="Location">
            <input value={form.location ?? ''} onChange={set('location')} className={inp} />
          </Field>
          <Field label="Description">
            <textarea value={form.description ?? ''} onChange={set('description')} rows={3} className={inp} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start">
              <input type="datetime-local" value={form.startAt ?? ''} onChange={set('startAt')} className={inp} />
            </Field>
            <Field label="End (optional)">
              <input type="datetime-local" value={form.endAt ?? ''} onChange={set('endAt')} className={inp} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
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
                  src={coverPreview ?? form.coverImageUrl ?? ''}
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
          <div className="flex gap-3 pt-2">
            <button type="submit" className="bg-indigo-600 text-white py-2 px-5 rounded-md hover:bg-indigo-700 font-medium">
              Save Changes
            </button>
            <button type="button" onClick={handleDeleteEvent}
              className="bg-red-500 text-white py-2 px-5 rounded-md hover:bg-red-600 font-medium">
              Delete Event
            </button>
            <a href={`/${params.locale}/events/${params.id}`}
              className="text-sm text-gray-500 self-center hover:underline ml-auto">
              ← Back to event
            </a>
          </div>
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
            className="mt-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-md hover:bg-indigo-700">
            Save Reminders
          </button>
        )}
      </section>

      {/* ── Manual blast ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-semibold mb-1">Send Message Blast</h2>
        <p className="text-sm text-gray-500 mb-4">Send a message to attendees right now.</p>

        <div className="flex flex-col gap-4 bg-gray-50 rounded-xl p-5">
          {/* message */}
          <Field label="Message">
            <textarea
              value={blastMsg}
              onChange={(e) => setBlastMsg(e.target.value)}
              rows={3}
              placeholder="Your message (used for both English and Chinese)…"
              className={inp}
            />
          </Field>

          {/* channels */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Send via</p>
            <div className="flex gap-4">
              {(['EMAIL', 'SMS'] as const).map((ch) => (
                <label key={ch} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${blastChannels.includes(ch) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                  <input type="checkbox" className="sr-only" checked={blastChannels.includes(ch)} onChange={() => toggleBlastChannel(ch)} />
                  <span className="text-sm font-medium">{ch === 'EMAIL' ? '✉️ Email' : '💬 SMS'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* audience */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Send to</p>
            <div className="flex gap-4">
              {([['rsvped', "RSVPed users only"], ['all', 'All registered users']] as const).map(([val, label]) => (
                <label key={val} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${blastAudience === val ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                  <input type="radio" name="audience" className="sr-only" checked={blastAudience === val} onChange={() => setBlastAudience(val)} />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleBlast}
              className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 font-medium text-sm"
            >
              Send Now
            </button>
            {blastResult && (
              <p className={`text-sm ${blastResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                {blastResult}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Tip: use the <strong>Automatic Reminders</strong> section above to schedule blasts 3 days or 1 hour before the event.
          </p>
        </div>
      </section>

    </div>
  );
}
