'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Event } from '@judien/shared';

export default function NewEventPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    timezone: 'Asia/Taipei',
    feeAmount: '',
    feeCurrency: 'TWD',
    coverImageUrl: '',
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const body: Record<string, unknown> = {
        title_en: form.title,
        title_zh: form.title,
        description_en: form.description,
        description_zh: form.description,
        location_en: form.location,
        location_zh: form.location,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        timezone: form.timezone,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        feeCurrency: form.feeCurrency || 'TWD',
        coverImageUrl: form.coverImageUrl || null,
      };
      const ev = await apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify(body) });
      router.push(`/${params.locale}/events/${ev.id}`);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error creating event.');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Create Event</h1>
      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title">
          <input value={form.title} onChange={set('title')}
            placeholder="Event name" className={inp} />
        </Field>
        <Field label="Location">
          <input value={form.location} onChange={set('location')}
            placeholder="e.g. Taipei, Da'an Park" className={inp} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={set('description')}
            placeholder="What's this event about?" rows={4}
            className={inp + ' resize-none'} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start">
            <input type="datetime-local" value={form.startAt} onChange={set('startAt')} className={inp} />
          </Field>
          <Field label="End (optional)">
            <input type="datetime-local" value={form.endAt} onChange={set('endAt')} className={inp} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Timezone">
            <input value={form.timezone} onChange={set('timezone')} className={inp} />
          </Field>
          <Field label="Fee">
            <input type="number" value={form.feeAmount} onChange={set('feeAmount')}
              placeholder="0" className={inp} />
          </Field>
          <Field label="Currency">
            <input value={form.feeCurrency} onChange={set('feeCurrency')} className={inp} />
          </Field>
        </div>
        <Field label="Cover Image URL (optional)">
          <input value={form.coverImageUrl} onChange={set('coverImageUrl')}
            placeholder="https://..." className={inp} />
        </Field>
        <button type="submit"
          className="bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 font-medium mt-2">
          Create Event
        </button>
      </form>
    </div>
  );
}

const inp = 'w-full border rounded-md px-3 py-2 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
      {children}
    </div>
  );
}
