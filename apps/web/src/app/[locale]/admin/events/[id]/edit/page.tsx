'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Event, ReminderRule } from '@judien/shared';

export default function EditEventPage({ params }: { params: { locale: string; id: string } }) {
  const zh = params.locale === 'zh';
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [reminders, setReminders] = useState<{ offsetMinutes: string; channels: string[]; enabled: boolean }[]>([]);
  const [blastMsgEn, setBlastMsgEn] = useState('');
  const [blastMsgZh, setBlastMsgZh] = useState('');
  const [error, setError] = useState('');
  const [blastResult, setBlastResult] = useState('');

  useEffect(() => {
    apiFetch<Event>(`/events/${params.id}`).then((ev) => {
      setEvent(ev);
      setForm({
        title_en: ev.title_en, title_zh: ev.title_zh,
        description_en: ev.description_en, description_zh: ev.description_zh,
        location_en: ev.location_en, location_zh: ev.location_zh,
        startAt: (ev.startAt ?? '').replace('Z', '').slice(0, 16),
        endAt: (ev.endAt ?? '').replace('Z', '').slice(0, 16),
        timezone: ev.timezone,
        feeAmount: ev.feeAmount != null ? String(ev.feeAmount) : '',
        feeCurrency: ev.feeCurrency,
        coverImageUrl: ev.coverImageUrl ?? '',
      });
    });
    apiFetch<ReminderRule[]>(`/events/${params.id}/reminders`).then((rules) => {
      setReminders(rules.map((r) => ({
        offsetMinutes: String(r.offsetMinutes),
        channels: r.channels,
        enabled: r.enabled,
      })));
    });
  }, [params.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const body: Record<string, unknown> = { ...form };
      body.feeAmount = form.feeAmount ? parseFloat(form.feeAmount) : null;
      body.endAt = form.endAt || null;
      body.coverImageUrl = form.coverImageUrl || null;
      await apiFetch(`/events/${params.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      router.push(`/${params.locale}/events/${params.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Error updating event.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm(zh ? '確定要刪除此活動嗎？' : 'Delete this event?')) return;
    await apiFetch(`/events/${params.id}`, { method: 'DELETE' });
    router.push(`/${params.locale}/events`);
  };

  const handleSaveReminders = async () => {
    const rules = reminders.map((r) => ({
      offsetMinutes: parseInt(r.offsetMinutes),
      channels: r.channels as ('SMS' | 'EMAIL')[],
      enabled: r.enabled,
    }));
    await apiFetch(`/events/${params.id}/reminders`, {
      method: 'POST',
      body: JSON.stringify({ rules }),
    });
    alert(zh ? '提醒設定已儲存。' : 'Reminders saved.');
  };

  const handleBlast = async () => {
    if (!blastMsgEn.trim() && !blastMsgZh.trim()) return;
    const res = await apiFetch<{ sent: number }>(`/events/${params.id}/blast`, {
      method: 'POST',
      body: JSON.stringify({
        channels: ['SMS', 'EMAIL'],
        audience: 'rsvped',
        messageEn: blastMsgEn || blastMsgZh,
        messageZh: blastMsgZh || blastMsgEn,
      }),
    });
    setBlastResult(`Sent to ${res.sent} users.`);
  };

  if (!event) return <p>{zh ? '載入中…' : 'Loading…'}</p>;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">{zh ? '編輯活動' : 'Edit Event'}</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          {['title_en','title_zh','location_en','location_zh','timezone','feeCurrency','coverImageUrl'].map((k) => (
            <div key={k}>
              <label className="block text-sm font-medium mb-1">{k}</label>
              <input value={form[k] ?? ''} onChange={set(k)} className="w-full border rounded-md px-3 py-2 text-sm" />
            </div>
          ))}
          {['description_en','description_zh'].map((k) => (
            <div key={k}>
              <label className="block text-sm font-medium mb-1">{k}</label>
              <textarea value={form[k] ?? ''} onChange={set(k)} rows={3} className="w-full border rounded-md px-3 py-2 text-sm" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">startAt</label>
              <input type="datetime-local" value={form.startAt ?? ''} onChange={set('startAt')} className="w-full border rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">endAt</label>
              <input type="datetime-local" value={form.endAt ?? ''} onChange={set('endAt')} className="w-full border rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">feeAmount</label>
            <input type="number" value={form.feeAmount ?? ''} onChange={set('feeAmount')} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">
              {zh ? '儲存變更' : 'Save Changes'}
            </button>
            <button type="button" onClick={handleDeleteEvent} className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">
              {zh ? '刪除活動' : 'Delete Event'}
            </button>
          </div>
        </form>
      </div>

      {/* Reminders */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{zh ? '提醒設定' : 'Reminders'}</h2>
        {reminders.map((r, i) => (
          <div key={i} className="flex items-center gap-3 mb-2">
            <input
              type="number"
              value={r.offsetMinutes}
              onChange={(e) => setReminders((prev) => prev.map((x, j) => j === i ? { ...x, offsetMinutes: e.target.value } : x))}
              placeholder="minutes before"
              className="border rounded-md px-3 py-2 text-sm w-32"
            />
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={r.channels.includes('SMS')}
                onChange={(e) => setReminders((prev) => prev.map((x, j) => j === i ? { ...x, channels: e.target.checked ? [...x.channels.filter(c=>c!=='SMS'),'SMS'] : x.channels.filter(c=>c!=='SMS') } : x))} /> SMS
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={r.channels.includes('EMAIL')}
                onChange={(e) => setReminders((prev) => prev.map((x, j) => j === i ? { ...x, channels: e.target.checked ? [...x.channels.filter(c=>c!=='EMAIL'),'EMAIL'] : x.channels.filter(c=>c!=='EMAIL') } : x))} /> Email
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={r.enabled}
                onChange={(e) => setReminders((prev) => prev.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} /> Enabled
            </label>
            <button onClick={() => setReminders((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 text-xs">Remove</button>
          </div>
        ))}
        <div className="flex gap-3 mt-2">
          <button onClick={() => setReminders((r) => [...r, { offsetMinutes: '60', channels: ['EMAIL'], enabled: true }])} className="text-sm text-indigo-600">
            + {zh ? '新增提醒' : 'Add Reminder'}
          </button>
          <button onClick={handleSaveReminders} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded">
            {zh ? '儲存提醒' : 'Save Reminders'}
          </button>
        </div>
      </div>

      {/* Blast */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{zh ? '發送通知' : 'Send Blast'}</h2>
        <div className="flex flex-col gap-3">
          <textarea value={blastMsgEn} onChange={(e) => setBlastMsgEn(e.target.value)}
            rows={3} placeholder="Message (English)" className="border rounded-md px-3 py-2 text-sm" />
          <textarea value={blastMsgZh} onChange={(e) => setBlastMsgZh(e.target.value)}
            rows={3} placeholder="訊息內容（中文）" className="border rounded-md px-3 py-2 text-sm" />
          <button onClick={handleBlast} className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 self-start">
            {zh ? '發送給所有已回應用戶' : "Blast to RSVP'd Users"}
          </button>
          {blastResult && <p className="text-sm text-green-600">{blastResult}</p>}
        </div>
      </div>
    </div>
  );
}
