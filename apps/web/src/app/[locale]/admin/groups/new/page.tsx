'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload, resolveImageUrl } from '@/lib/api';
import ImageCropModal from '@/components/ImageCropModal';

function slugifyPid(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default function NewGroupPage({ params }: { params: { locale: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const zh = params.locale === 'zh';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const photoFileRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handlePhotoAreaClick = () => {
    if (photoPreview) { setShowPhotoModal(true); } else { photoFileRef.current?.click(); }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null); setPhotoPreview(null);
    if (photoFileRef.current) photoFileRef.current.value = '';
    setShowPhotoModal(false);
  };

  const handleReplacePhoto = () => {
    setShowPhotoModal(false);
    photoFileRef.current?.click();
  };

  const suggestedPid = useMemo(() => slugifyPid(name), [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Group name is required.'); return; }
    setError('');
    setSaving(true);
    try {
      // Fall back to a short unique ID if the name is all non-Latin (e.g. Chinese) or too short
      const generatedPid = suggestedPid.length >= 3 ? suggestedPid : `group-${Date.now().toString(36).slice(-6)}`;
      let photoUrl: string | null = null;
      if (photoFile) {
        const uploaded = await apiUpload(photoFile);
        photoUrl = resolveImageUrl(uploaded.url);
      }
      await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          pid: generatedPid,
          description,
          discoverableBySearch: true,
          adminUserIds: [],
          ...(photoUrl ? { photoUrl } : {}),
        }),
      });
      router.push(`/${params.locale}/groups`);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create group.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="py-16 text-center text-gray-400">Loading…</p>;

  if (!user) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        {zh ? '請先登入。' : 'Please log in first.'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={3 / 1}
          zh={zh}
          onConfirm={(file) => { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); setCropSrc(null); }}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{zh ? '建立群組' : 'Create Group'}</h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '群組名稱' : 'Group name'}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder={zh ? '例如：台北扶輪社' : 'e.g. Rotary Taipei Downtown'}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '描述' : 'Description'}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={4}
            placeholder={zh ? '介紹這個群組的用途、地區或成員特色。' : 'Describe this group, its chapter, region, or purpose.'}
          />
        </div>

        {/* Group photo upload */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '群組照片（選填）' : 'Group Photo (optional)'}</label>
          <div
            onClick={handlePhotoAreaClick}
            className="relative w-full aspect-[3/1] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer overflow-hidden flex items-center justify-center transition"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500 select-none pointer-events-none">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">{zh ? '點擊上傳照片' : 'Upload Photo'}</span>
              </div>
            )}
          </div>
          <input ref={photoFileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          {showPhotoModal && photoPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowPhotoModal(false)}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-xs mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <p className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 pt-4 pb-2 px-4">{zh ? '群組照片' : 'Group Photo'}</p>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <button type="button" className="w-full py-3.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition" onClick={handleRemovePhoto}>{zh ? '移除照片' : 'Remove Photo'}</button>
                  <button type="button" className="w-full py-3.5 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition" onClick={handleReplacePhoto}>{zh ? '更換照片' : 'Replace Photo'}</button>
                  <button type="button" className="w-full py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition" onClick={() => setShowPhotoModal(false)}>{zh ? '取消' : 'Cancel'}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/${params.locale}/groups`} className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
            {zh ? '取消' : 'Cancel'}
          </Link>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立群組' : 'Create Group')}
          </button>
        </div>
      </form>
    </div>
  );
}
