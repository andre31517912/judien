'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Modal state
  const [modalLink, setModalLink] = useState<string | null>(null);
  const [modalRole, setModalRole] = useState<'USER' | 'ADMIN'>('USER');
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<InviteToken[]>('/invites');
      setInvites(data);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load invites.');
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
    setError('');
    try {
      const invite = await apiFetch<InviteToken>('/invites', {
        method: 'POST',
        body: JSON.stringify({ role, expiresInHours: 48 }),
      });
      const link = `${window.location.origin}/${params.locale}/signup?invite=${invite.token}`;
      setModalRole(role);
      setModalLink(link);
      setCopied(false);
      await load();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to create invite.');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!modalLink) return;
    try {
      await navigator.clipboard.writeText(modalLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      linkRef.current?.select();
    }
  };

  const revoke = async (id: string) => {
    if (!confirm(zh ? '確定要撤銷這個邀請連結嗎？' : 'Revoke this invite link?')) return;
    try {
      await apiFetch(`/invites/${id}`, { method: 'DELETE' });
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to revoke invite.');
    }
  };

  if (loading || pageLoading) return <div className="p-8 text-gray-500">{zh ? '載入中…' : 'Loading…'}</div>;
  if (!user || user.role !== 'ADMIN') {
    return <div className="p-8 text-red-500">{zh ? '只有平台管理員可以管理邀請。' : 'Only platform admins can manage invites.'}</div>;
  }

  const now = new Date();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2 dark:text-white">{zh ? '邀請連結' : 'Invite Links'}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {zh ? '產生一次性邀請連結，分享給您要邀請的人。' : 'Generate a one-time invite link and share it with the person you want to invite.'}
      </p>

      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => generate('USER')}
          disabled={creating}
          className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-60 transition"
        >
          {zh ? '邀請用戶' : 'Invite as User'}
        </button>
        <button
          onClick={() => generate('ADMIN')}
          disabled={creating}
          className="flex-1 bg-purple-700 text-white py-2.5 rounded-lg hover:bg-purple-800 text-sm font-medium disabled:opacity-60 transition"
        >
          {zh ? '邀請管理員' : 'Invite as Admin'}
        </button>
      </div>

      {/* History */}
      {invites.length === 0 ? (
        <p className="text-gray-400 text-center mt-8 text-sm">{zh ? '尚無邀請連結。' : 'No invite links yet.'}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invites.map((invite) => {
            const expired = new Date(invite.expiresAt) <= now;
            const used = !!invite.usedAt;
            const dim = used || expired;
            return (
              <li key={invite.id} className={`border dark:border-gray-700 rounded-xl p-3 flex items-center gap-3 ${dim ? 'opacity-40' : ''}`}>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  invite.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {invite.role === 'ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '用戶' : 'User')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-gray-400 truncate">{invite.token}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {used
                      ? `${zh ? '已使用 by' : 'Used by'} ${invite.usedBy?.displayName ?? invite.usedBy?.email ?? '?'}`
                      : expired
                        ? (zh ? '已過期' : 'Expired')
                        : `${zh ? '到期' : 'Expires'} ${new Date(invite.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                {!used && !expired && (
                  <button
                    onClick={() => revoke(invite.id)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    {zh ? '撤銷' : 'Revoke'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal */}
      {modalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                modalRole === 'ADMIN'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {modalRole === 'ADMIN' ? (zh ? '管理員邀請' : 'Admin invite') : (zh ? '用戶邀請' : 'User invite')}
              </span>
            </div>
            <h2 className="text-lg font-bold dark:text-white mb-1">
              {zh ? '邀請連結已產生' : 'Invite link ready'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {zh
                ? '將以下連結分享給您要邀請的人，連結在 48 小時內有效，且僅能使用一次。'
                : 'Share this link with the person you want to invite. It expires in 48 hours and can only be used once.'}
            </p>

            <div className="flex gap-2 mb-4">
              <input
                ref={linkRef}
                type="text"
                readOnly
                value={modalLink}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 min-w-0 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none cursor-text select-all"
              />
              <button
                onClick={copyLink}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  copied
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? (zh ? '已複製！' : 'Copied!') : (zh ? '複製' : 'Copy')}
              </button>
            </div>

            <button
              onClick={() => setModalLink(null)}
              className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {zh ? '完成' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


