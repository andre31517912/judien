'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (user) setPhotoUrl((user as any).photoUrl ?? null);
  }, [user]);

  // Forward LINE OAuth redirect params to settings page so the banner shows there
  useEffect(() => {
    const line = searchParams.get('line');
    const lineNew = searchParams.get('line_new');
    if (line || lineNew) {
      const qs = new URLSearchParams();
      if (line) qs.set('line', line);
      const reason = searchParams.get('reason');
      if (reason) qs.set('reason', reason);
      if (lineNew) qs.set('line_new', lineNew);
      router.replace(`/${params.locale}/profile/settings?${qs.toString()}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const { url } = await apiUpload(file);
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ photoUrl: url }) });
      setPhotoUrl(url);
      await refresh();
    } catch { /* ignore */ } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  if (!user) return <p className="text-gray-400 dark:text-gray-500">{zh ? '請先登入。' : 'Please log in.'}</p>;

  const rawEmail = (user as any)?.email ?? '';
  const displayEmail = rawEmail.endsWith('@line.local') ? '' : rawEmail;
  const displayPhone = (user as any)?.phoneE164 ?? '';

  return (
    <div className="max-w-sm mx-auto py-10 px-4">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="relative">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="w-28 h-28 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
              <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
          )}
          <label className={`absolute bottom-0 right-0 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center cursor-pointer shadow-md transition ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={photoUploading} />
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </label>
        </div>
        {photoUploading && <p className="text-xs text-gray-400 dark:text-gray-500">{zh ? '上傳中…' : 'Uploading…'}</p>}
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.role === 'ADMIN' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'}`}>
          {user.role === 'ADMIN' ? (zh ? '平台管理員' : 'Admin') : (zh ? '用戶' : 'User')}
        </span>
      </div>

      {/* Info cards */}
      <div className="space-y-3 mb-8">
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{zh ? '姓名' : 'Name'}</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {(user as any).displayName || <span className="font-normal text-gray-400 dark:text-gray-500">{zh ? '未設定' : 'Not set'}</span>}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{zh ? '電子郵件' : 'Email'}</p>
          <p className="text-base text-gray-900 dark:text-white">
            {displayEmail || <span className="text-sm text-gray-400 dark:text-gray-500">{zh ? '未設定' : 'Not set'}</span>}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{zh ? '電話' : 'Phone'}</p>
          <p className="text-base text-gray-900 dark:text-white">
            {displayPhone || <span className="text-sm text-gray-400 dark:text-gray-500">{zh ? '未設定' : 'Not set'}</span>}
          </p>
        </div>
      </div>

      <Link
        href={`/${params.locale}/profile/settings`}
        className="block w-full text-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
      >
        {zh ? '編輯個人資料' : 'Edit Profile'}
      </Link>
    </div>
  );
}
