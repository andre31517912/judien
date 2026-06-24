'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiFetch, apiUpload } from '@/lib/api';
import { useAuth } from '@/context/auth.context';
import type { Event } from '@judien/shared';
import DateTimeInput from '@/components/DateTimeInput';
import ImageCropModal from '@/components/ImageCropModal';

const LocationPicker = dynamic(() => import('@/components/LocationPickerInner'), { ssr: false });

export default function NewEventPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    feeAmount: '',
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let coverImageUrl: string | null = null;
      if (coverFile) {
        const uploaded = await apiUpload(coverFile);
        coverImageUrl = uploaded.url;
      }
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        location: form.location,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        coverImageUrl,
      };
      const ev = await apiFetch<Event>('/events', { method: 'POST', body: JSON.stringify(body) });
      router.push(`/${params.locale}/events/${ev.id}`);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error creating event.');
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'ADMIN') return (
    <div className="text-center py-16">
      <p className="text-red-500 font-medium">Admin access required.</p>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto mt-8 px-4">
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={16 / 9}
          onConfirm={(file) => { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); setCropSrc(null); }}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Create Event</h1>
      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title">
          <input value={form.title} onChange={set('title')}
            placeholder="Event name" className={inp} />
        </Field>
        <Field label="Location">
          <LocationPicker
            value={form.location}
            onChange={(v) => setForm((f) => ({ ...f, location: v }))}
            showMapPreview={false}
          />
        </Field>
        <Field label="Fee (optional)">
          <input type="number" value={form.feeAmount} onChange={set('feeAmount')}
            placeholder="0" className={inp} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={set('description')}
            placeholder="What's this event about?" rows={4}
            className={inp + ' resize-none'} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Start">
            <DateTimeInput value={form.startAt} onChange={(v) => setForm((f) => ({ ...f, startAt: v }))} placeholder="Select start date & time" />
          </Field>
          <Field label="End (optional)">
            <DateTimeInput value={form.endAt} onChange={(v) => setForm((f) => ({ ...f, endAt: v }))} placeholder="Select end date & time" clearable />
          </Field>
        </div>

        {/* Cover image upload */}
        <Field label="Cover Photo (optional)">
          <div
            onClick={() => fileRef.current?.click()}
          className="relative w-full h-44 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer overflow-hidden flex items-center justify-center transition"
          >
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400 select-none">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Click to upload a photo</span>
              </div>
            )}
            {coverPreview && (
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
              >
                ✕
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </Field>

        <button type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 font-medium mt-2 disabled:opacity-60 transition">
          {submitting ? 'Creating…' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}

const inp = 'w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{label}</label>
      {children}
    </div>
  );
}
