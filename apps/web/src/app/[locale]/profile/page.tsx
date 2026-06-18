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
    <div className="max-w-lg mx-auto py-6">
      {/* Profile card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Top band */}
        <div className="h-20 bg-gradient-to-r from-indigo-500 to-violet-600" />

        {/* Avatar + name */}
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4">
            <div className="relative inline-block">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-900 shadow" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow">
                  <svg className="w-11 h-11 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                </div>
              )}
              <label className={`absolute bottom-0 right-0 w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center cursor-pointer shadow transition ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={photoUploading} />
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
            </div>
          </div>

          {photoUploading && <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{zh ? '上傳中…' : 'Uploading…'}</p>}

          <div className="flex items-center gap-2 mb-4">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {(user as any).displayName || <span className="font-normal text-gray-400 dark:text-gray-500">{zh ? '未設定姓名' : 'No name set'}</span>}
            </p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${user.role === 'ADMIN' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'}`}>
              {user.role === 'ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '用戶' : 'User')}
            </span>
          </div>

          {/* Info rows + Edit button on same line */}
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-2 min-w-0">
              {displayEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{displayEmail}</span>
                </div>
              )}
              {displayPhone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {displayPhone}
                </div>
              )}
              {!displayEmail && !displayPhone && (
                <p className="text-sm text-gray-400 dark:text-gray-500">{zh ? '尚未設定聯絡資訊' : 'No contact info set'}</p>
              )}
            </div>
            <Link
              href={`/${params.locale}/profile/settings`}
              className="shrink-0 rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              {zh ? '編輯' : 'Edit Profile'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
