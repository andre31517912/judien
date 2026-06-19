'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';

type PublicProfile = { id: string; displayName: string | null };

export default function PublicProfilePage() {
  const params = useParams<{ locale: string; userId: string }>();
  const zh = params.locale === 'zh';
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiFetch<PublicProfile>(`/users/${params.userId}`)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.userId]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (notFound || !profile) return (
    <p className="text-center text-gray-500 dark:text-gray-400 mt-12">
      {zh ? '找不到該用戶。' : 'User not found.'}
    </p>
  );

  return (
    <div className="max-w-lg mx-auto py-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Top gradient band */}
        <div className="h-20 bg-gradient-to-r from-indigo-500 to-violet-600" />

        {/* Avatar + name */}
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow">
              <svg className="w-11 h-11 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
          </div>

          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {profile.displayName ?? <span className="font-normal text-gray-400 dark:text-gray-500">{zh ? '未設定姓名' : 'No name set'}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
