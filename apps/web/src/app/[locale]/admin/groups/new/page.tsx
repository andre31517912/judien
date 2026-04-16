'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';

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
  const [memberDataPrivate, setMemberDataPrivate] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const suggestedPid = useMemo(() => slugifyPid(name), [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const generatedPid = suggestedPid;
      await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name,
          pid: generatedPid,
          description,
          discoverableBySearch: false,
          memberDataPrivate,
          adminUserIds: [],
        }),
      });
      router.push(`/${params.locale}/admin/groups`);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create group.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="py-16 text-center text-gray-400">Loading…</p>;

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        {zh ? '只有平台管理員可以建立群組。' : 'Only platform admins can create groups.'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link href={`/${params.locale}/admin/groups`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          ← {zh ? '返回群組列表' : 'Back to groups'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{zh ? '建立群組' : 'Create Group'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {zh ? '建立新的 Rotary 分組並設定初始隱私規則。' : 'Create a new Rotary group and set its initial privacy rules.'}
        </p>
      </div>

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
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '群組 PID' : 'Group PID'}</label>
          <input
            value={suggestedPid}
            readOnly
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-600 dark:text-gray-400"
            placeholder={zh ? '將根據群組名稱自動產生' : 'Will be auto-generated from the group name'}
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {zh ? 'PID 會根據群組名稱自動產生，預設不會被搜尋到。' : 'PID is auto-generated from the group name and is private by default.'}
          </p>
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

        <div className="space-y-3 rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
            {zh ? '此群組建立後預設為私人，之後可於群組設定中開啟搜尋。' : 'This group starts private by default. Search discoverability can be enabled later in group settings.'}
          </div>
          <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={memberDataPrivate}
              onChange={(e) => setMemberDataPrivate(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium dark:text-white">{zh ? '成員資料隱私模式' : 'Member data privacy mode'}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {zh ? '開啟後，普通成員僅可看見 display name、角色與加入日期。' : 'When on, regular members only see display name, role, and join date.'}
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/${params.locale}/admin/groups`} className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
            {zh ? '取消' : 'Cancel'}
          </Link>
          <button
            type="submit"
            disabled={saving || !name.trim() || !suggestedPid}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立群組' : 'Create Group')}
          </button>
        </div>
      </form>
    </div>
  );
}
