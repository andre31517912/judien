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
    mapAddress: '',
    startAt: '',
    endAt: '',
    feeAmount: '',
  });

  // Transportation + sub-events flags
  const [collectTransportation, setCollectTransportation] = useState(false);
  const [organizeGuestBatches, setOrganizeGuestBatches] = useState(false);
  const [guestListViewMode, setGuestListViewMode] = useState<'FUSION' | 'SEPARATE_OUTSIDE_GUESTS'>('FUSION');
  const [subEventsEnabled, setSubEventsEnabled] = useState(false);
  const [subEventItems, setSubEventItems] = useState<{ title: string; description: string }[]>([
    { title: '', description: '' },
  ]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  };

  const addSubEvent = () =>
    setSubEventItems((prev) => [...prev, { title: '', description: '' }]);

  const removeSubEvent = (i: number) =>
    setSubEventItems((prev) => prev.filter((_, idx) => idx !== i));

  const setSubEventField = (i: number, field: 'title' | 'description', val: string) =>
    setSubEventItems((prev) => prev.map((se, idx) => idx === i ? { ...se, [field]: val } : se));

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
      const validSubEvents = subEventsEnabled
        ? subEventItems.filter((se) => se.title.trim())
        : undefined;

      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        location: form.location,
        mapAddress: form.mapAddress || null,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        coverImageUrl,
        collectTransportation,
        organizeGuestBatches,
        guestListViewMode,
        ...(validSubEvents?.length ? { subEvents: validSubEvents } : {}),
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
            onConfirm={(selection) => setForm((f) => ({
              ...f,
              mapAddress: selection?.label ?? '',
            }))}
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
            onClick={() => { if (coverPreview) setCropSrc(coverPreview); else fileRef.current?.click(); }}
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

        {/* Transportation checkbox */}
        <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
          <input
            type="checkbox"
            checked={collectTransportation}
            onChange={(e) => setCollectTransportation(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-indigo-600 rounded"
          />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Collect transportation info</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Guests who RSVP Going will be asked how they&apos;re getting to the event.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
          <input
            type="checkbox"
            checked={organizeGuestBatches}
            onChange={(e) => setOrganizeGuestBatches(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-indigo-600 rounded"
          />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Enable guest grouping</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Organizers can assign guests to custom typed groups from the event page.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
          <input
            type="checkbox"
            checked={guestListViewMode === 'SEPARATE_OUTSIDE_GUESTS'}
            onChange={(e) => setGuestListViewMode(e.target.checked ? 'SEPARATE_OUTSIDE_GUESTS' : 'FUSION')}
            className="mt-0.5 w-4 h-4 text-indigo-600 rounded"
          />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Separate guest column</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Keep outside guests in their own Guests tab instead of mixing them into RSVP tabs.
            </p>
          </div>
        </label>

        {/* Sub-events toggle */}
        <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
          <input
            type="checkbox"
            checked={subEventsEnabled}
            onChange={(e) => setSubEventsEnabled(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-indigo-600 rounded"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Enable sub-events / activities</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Add activity options guests can choose from after RSVPing Going (e.g. hiking, beach, running).
            </p>
          </div>
        </label>

        {subEventsEnabled && (
          <div className="flex flex-col gap-3 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800 ml-2">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Activities</p>
            {subEventItems.map((se, i) => (
              <div key={i} className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <input
                    value={se.title}
                    onChange={(e) => setSubEventField(i, 'title', e.target.value)}
                    placeholder={`Activity ${i + 1} name (e.g. Hiking)`}
                    className={inp + ' flex-1'}
                    maxLength={200}
                  />
                  {subEventItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubEvent(i)}
                      className="text-gray-400 hover:text-red-500 transition text-lg leading-none shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <input
                  value={se.description}
                  onChange={(e) => setSubEventField(i, 'description', e.target.value)}
                  placeholder="Short description (optional)"
                  className={inp}
                  maxLength={500}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addSubEvent}
              className="text-sm text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
            >
              + Add activity
            </button>
          </div>
        )}

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
