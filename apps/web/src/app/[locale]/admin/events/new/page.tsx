'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Event } from '@judien/shared';

export default function NewEventPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const router = useRouter();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title_en: '', title_zh: '',
    description_en: '', description_zh: '',
    location_en: '', location_zh: '',
    startAt: '',
    endAt: '',
    timezone: 'Asia/Taipei',
    feeAmount: '',
    feeCurrency: 'TWD',
    coverImageUrl: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const body: Record<string, unknown> = {
        ...form,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        endAt: form.endAt || null,
        coverImageUrl: form.coverImageUrl || null,
      };
      const ev = await apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify(body) });
      router.push(`/${params.locale}/events/${ev.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Error creating event.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6">{zh ? '建立活動' : 'Create Event'}</h1>
      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TwoCol
          label1={zh ? '標題（英文）' : 'Title (EN)'}
          label2={zh ? '標題（中文）' : 'Title (ZH)'}
          val1={form.title_en} set1={set('title_en')}
          val2={form.title_zh} set2={set('title_zh')}
        />
        <TwoCol
          label1={zh ? '地點（英文）' : 'Location (EN)'}
          label2={zh ? '地點（中文）' : 'Location (ZH)'}
          val1={form.location_en} set1={set('location_en')}
          val2={form.location_zh} set2={set('location_zh')}
        />
        <LabeledTextarea label={zh ? '說明（英文）' : 'Description (EN)'} value={form.description_en} onChange={set('description_en')} />
        <LabeledTextarea label={zh ? '說明（中文）' : 'Description (ZH)'} value={form.description_zh} onChange={set('description_zh')} />

        <div className="grid grid-cols-2 gap-4">
          <LabeledInput label={zh ? '開始時間' : 'Start'} type="datetime-local" value={form.startAt} onChange={set('startAt')} required />
          <LabeledInput label={zh ? '結束時間（選填）' : 'End (optional)'} type="datetime-local" value={form.endAt} onChange={set('endAt')} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <LabeledInput label={zh ? '時區' : 'Timezone'} value={form.timezone} onChange={set('timezone')} />
          <LabeledInput label={zh ? '費用' : 'Fee'} type="number" value={form.feeAmount} onChange={set('feeAmount')} />
          <LabeledInput label={zh ? '幣種' : 'Currency'} value={form.feeCurrency} onChange={set('feeCurrency')} />
        </div>

        <LabeledInput label={zh ? '封面圖片 URL（選填）' : 'Cover Image URL (optional)'} value={form.coverImageUrl} onChange={set('coverImageUrl')} />

        <button type="submit" className="bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 font-medium">
          {zh ? '建立活動' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}

// ── Small helper components ─────────────────────────────────────────────────

function LabeledInput({ label, value, onChange, type = 'text', required }: {
  label: string; value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} required={required}
        className="w-full border rounded-md px-3 py-2 text-sm" />
    </div>
  );
}

function LabeledTextarea({ label, value, onChange }: {
  label: string; value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <textarea value={value} onChange={onChange} rows={3}
        className="w-full border rounded-md px-3 py-2 text-sm resize-none" />
    </div>
  );
}

function TwoCol({ label1, label2, val1, set1, val2, set2 }: {
  label1: string; label2: string;
  val1: string; set1: React.ChangeEventHandler<HTMLInputElement>;
  val2: string; set2: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <LabeledInput label={label1} value={val1} onChange={set1} required />
      <LabeledInput label={label2} value={val2} onChange={set2} required />
    </div>
  );
}
