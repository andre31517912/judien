'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';
import type { InviteToken } from '@judien/shared';

export default function AdminInvitesPage({ params }: { params: { locale: string } }) {
  const { user, loading } = useAuth();
  const zh = params.locale === 'zh';

  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<InviteToken[]>('/invites');
      setInvites(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load invites.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user?.role === 'ADMIN') load();
    else if (!loading) setPageLoading(false);
  }, [loading, user, load]);

  const generate = async (role: 'USER' | 'ADMIN') => {
    setCreating(true);
    try {
      await apiFetch('/invites', { method: 'POST', body: JSON.stringify({ role, expiresInHours: 48 }) });
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Failed to create invite.');
    } finally {
      setCreating(false);
    }
  };

  const buildLink = (token: string) =>
    `${window.location.origin}/${params.locale}/signup?invite=${token}`;

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildLink(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* fallback: do nothing */
    }
  };

  const revoke = async (id: string) => {
    if (!confirm(zh ? '確定要撤銷這個邀請連結嗎？' : 'Revoke this invite link?')) return;
    try {
      await apiFetch(`/invites/${id}`, { method: 'DELETE' });
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      setError(err.message ?? 'Failed to revoke invite.');
    }
  };

  if (loading || pageLoading) {
    return <div className="p-8 text-gray-500">{zh ? '載入中…' : 'Loading…'}</div>;
  }

  if (!user || user.role !== 'ADMIN') {
    return <div className="p-8 text-red-500">{zh ? '只有平台管理員可以管理邀請。' : 'Only platform admins can manage invites.'}</div>;
  }

  const now = new Date();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">{zh ? '邀請連結' : 'Invite Links'}</h1>

      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => generate('USER')}
          disabled={creating}
          className="flex-1 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-60 transition"
        >
          {zh ? '產生用戶邀請' : 'Generate User Invite'}
        </button>
        <button
          onClick={() => generate('ADMIN')}
          disabled={creating}
          className="flex-1 bg-purple-700 text-white py-2 rounded-md hover:bg-purple-800 text-sm font-medium disabled:opacity-60 transition"
        >
          {zh ? '產生管理員邀請' : 'Generate Admin Invite'}
        </button>
      </div>

      {invites.length === 0 ? (
        <p className="text-gray-400 text-center mt-8">{zh ? '尚無邀請連結。' : 'No invite links yet.'}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {invites.map((invite) => {
            const expired = new Date(invite.expiresAt) <= now;
            const used = !!invite.usedAt;
            const dim = used || expired;
            return (
              <li
                key={invite.id}
                className={`border rounded-xl p-4 dark:border-gray-700 ${dim ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      invite.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}
                  >
                    {invite.role === 'ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '用戶' : 'User')}
                  </span>
                  {used && <span className="text-xs text-gray-500 italic">{zh ? '已使用' : 'Used'}</span>}
                  {!used && expired && <span className="text-xs text-red-400 italic">{zh ? '已過期' : 'Expired'}</span>}
                </div>

                <p className="font-mono text-xs text-gray-500 dark:text-gray-400 break-all mb-1">
                  {invite.token}
                </p>

                {invite.usedBy && (
                  <p className="text-xs text-gray-500">
                    {zh ? '使用者' : 'Used by'}: {invite.usedBy.displayName ?? invite.usedBy.email}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {zh ? '到期' : 'Expires'}: {new Date(invite.expiresAt).toLocaleDateString()}
                </p>

                {!used && !expired && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => copyLink(invite.token)}
                      className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-md py-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      {copied === invite.token ? (zh ? '已複製！' : 'Copied!') : (zh ? '複製連結' : 'Copy Link')}
                    </button>
                    <button
                      onClick={() => revoke(invite.id)}
                      className="flex-1 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md py-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                    >
                      {zh ? '撤銷' : 'Revoke'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
