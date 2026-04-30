'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';

type GroupListItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    discoverableBySearch: boolean;
    memberDataPrivate: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: { displayName: string | null };
  };
  membership: {
    role: 'GROUP_ADMIN' | 'GROUP_MEMBER';
    status: 'ACCEPTED' | 'PENDING' | 'DECLINED' | 'REMOVED';
    joinedAt: string | null;
  };
};

export default function AdminGroupsPage({ params }: { params: { locale: string } }) {
  const { user, loading } = useAuth();
  const zh = params.locale === 'zh';
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading || !user) return;
    if (user.role !== 'ADMIN') {
      setPageLoading(false);
      return;
    }

    apiFetch<GroupListItem[]>('/groups/me')
      .then(setGroups)
      .catch((err: Error) => setError(err.message ?? 'Failed to load groups.'))
      .finally(() => setPageLoading(false));
  }, [loading, user]);

  if (loading || pageLoading) return <p className="py-16 text-center text-gray-400">Loading…</p>;

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        {zh ? '只有平台管理員可以查看群組管理。' : 'Only platform admins can access group management.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{zh ? '群組管理' : 'Groups'}</h1>

        </div>
        <Link
          href={`/${params.locale}/admin/groups/new`}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {zh ? '+ 建立群組' : '+ Create Group'}
        </Link>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{zh ? '尚未建立任何群組。' : 'No groups created yet.'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map(({ group, membership }) => (
            <Link
              key={group.id}
              href={`/${params.locale}/admin/groups/${group.id}`}
              className="block rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h2>
                  </div>
                  {group.description && <p className="text-sm text-gray-600 dark:text-gray-300">{group.description}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500">{zh ? '建立者：' : 'Created by '}{group.createdBy.displayName ?? (zh ? '未知' : 'Unknown')}</p>

                </div>

              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
