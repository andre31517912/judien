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

  const initial = (profile.displayName ?? '?').charAt(0).toUpperCase();

  return (
    <div className="max-w-sm mx-auto mt-12 flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-3xl font-bold text-indigo-500">
        {initial}
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
        {profile.displayName ?? <em className="text-gray-400">{zh ? '未設名稱' : 'No name'}</em>}
      </h1>
    </div>
  );
}
