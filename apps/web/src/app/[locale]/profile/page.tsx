'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import PolicyModal from '@/components/PolicyModal';

export default function ProfilePage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const backHref = searchParams.get('from') ?? `/${params.locale}/events`;
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [muteSms, setMuteSms] = useState(false);
  const [muteEmail, setMuteEmail] = useState(false);
  const [muteLinePush, setMuteLinePush] = useState(false);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineMsg, setLineMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [lineLoading, setLineLoading] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>(params.locale as 'en' | 'zh');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();
  const [policyModal, setPolicyModal] = useState<'privacy' | 'terms' | null>(null);

  type AdminInvite = { id: string; token: string; role: string; expiresAt: string; usedAt: string | null; createdAt: string; usedBy: { id: string; displayName: string | null; email: string } | null };
  const [adminInvites, setAdminInvites] = useState<AdminInvite[]>([]);
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName((user as any).displayName ?? '');
      setPhone('');
      setEmail('');
      setPassword('');
      setMuteSms((user as any).muteSms ?? false);
      setMuteEmail((user as any).muteEmail ?? false);
      setMuteLinePush(user.muteLinePush ?? false);
      setLineLinked(!!user.lineUserId);
      // lang is driven by the URL locale, not the stored preference
      if (user.role === 'ADMIN') {
        apiFetch<AdminInvite[]>('/invites').then(setAdminInvites).catch(() => {});
      }
    }
  }, [user]);

  // Show feedback after LINE OAuth redirect
  useEffect(() => {
    const lineParam = searchParams.get('line');
    if (lineParam === 'linked') {
      setLineMsg({ text: zh ? 'LINE 帳號已連結。' : 'LINE account linked.', ok: true });
    } else if (lineParam === 'error') {
      const reason = searchParams.get('reason') ?? '';
      setLineMsg({ text: zh ? `LINE 連結失敗：${reason}` : `LINE link failed: ${reason}`, ok: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      preferredLanguage: lang,
      muteSms,
      muteEmail,
      muteLinePush,
      displayName: displayName.trim(),
    };
    // Only send phone/email if they have actually changed
    if (phone.trim()) body.phone = phone.trim();
    if (email.trim() && email.trim() !== (user as any)?.email) body.email = email.trim();
    if (password.trim()) body.password = password.trim();
    try {
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(body) });
      await refresh();
      setPassword('');
      setMsg({ text: lang === 'zh' ? '資料已更新。' : 'Profile updated.', ok: true });
      // Redirect to new locale path if language changed
      if (lang !== params.locale) {
        router.push(`/${lang}/profile`);
      }
    } catch (err: any) {
      setMsg({ text: err.message ?? 'Error updating profile.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <p>{zh ? '請先登入。' : 'Please log in.'}</p>;

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold dark:text-white">{zh ? '個人資料' : 'Profile'}</h1>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            user.role === 'ADMIN'
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
          }`}
        >
          {user.role === 'ADMIN' ? (zh ? '平台管理員' : 'Admin') : (zh ? '用戶' : 'User')}
        </span>
      </div>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-indigo-700 font-medium"
        >
          ‹ {zh ? '返回' : 'Back'}
        </button>
      </div>

      {msg && (
        <p className={`text-sm mb-4 ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>
          {msg.text}
        </p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-4">

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {zh ? '顯示名稱' : 'Display Name'}
          </label>
          <input
            type="text"
            value={displayName}
            placeholder={(user as any)?.displayName || (zh ? '輸入顯示名稱' : 'Enter a display name')}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {zh ? '顯示語言' : 'Display Language'}
          </label>
          <div className="flex gap-2">
            {(['en', 'zh'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-5 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  lang === l
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400'
                }`}
              >
                {l === 'en' ? 'English' : '中文'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {zh ? '主題' : 'Theme'}
          </label>
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`px-5 py-3 rounded-lg border text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  theme === t
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400'
                }`}
              >
                {t === 'light' ? '☀️ ' : '🌙 '}
                {t === 'light' ? (zh ? '淺色' : 'Light') : (zh ? '深色' : 'Dark')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="muteSms" checked={muteSms}
            onChange={(e) => setMuteSms(e.target.checked)} className="w-4 h-4" />
          <label htmlFor="muteSms" className="text-sm dark:text-gray-300">
            {zh ? '靜音簡訊通知' : 'Mute SMS notifications'}
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="muteEmail" checked={muteEmail}
            onChange={(e) => setMuteEmail(e.target.checked)} className="w-4 h-4" />
          <label htmlFor="muteEmail" className="text-sm dark:text-gray-300">
            {zh ? '靜音電子郵件通知' : 'Mute email notifications'}
          </label>
        </div>

        {/* LINE account linking */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium dark:text-gray-300">
                {zh ? 'LINE 帳號連結' : 'LINE Account'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {lineLinked
                  ? (zh ? '已連結，可接收 LINE 推播通知。' : 'Linked — you can receive LINE push notifications.')
                  : (zh ? '連結後可接收 LINE 推播通知。' : 'Link to receive LINE push notifications.')}
              </p>
            </div>
            {lineLinked ? (
              <button
                type="button"
                disabled={lineLoading}
                onClick={async () => {
                  setLineLoading(true);
                  try {
                    await apiFetch('/auth/line/connect', { method: 'DELETE' });
                    await refresh();
                    setLineLinked(false);
                    setLineMsg({ text: zh ? 'LINE 帳號已解除連結。' : 'LINE account unlinked.', ok: true });
                  } catch (err: any) {
                    setLineMsg({ text: err.message ?? 'Error unlinking LINE.', ok: false });
                  } finally {
                    setLineLoading(false);
                  }
                }}
                className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
              >
                {lineLoading ? '…' : (zh ? '解除連結' : 'Unlink')}
              </button>
            ) : (
              <button
                type="button"
                disabled={lineLoading}
                onClick={async () => {
                  setLineLoading(true);
                  try {
                    const data = await apiFetch<{ url?: string; error?: string }>('/auth/line/connect');
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      setLineMsg({ text: data.error ?? 'LINE not configured.', ok: false });
                      setLineLoading(false);
                    }
                  } catch (err: any) {
                    setLineMsg({ text: err.message ?? 'Error starting LINE link.', ok: false });
                    setLineLoading(false);
                  }
                }}
                className="text-sm bg-[#06C755] text-white px-3 py-1.5 rounded-md hover:bg-[#05a847] font-medium disabled:opacity-50"
              >
                {lineLoading ? '…' : (zh ? '連結 LINE' : 'Link LINE')}
              </button>
            )}
          </div>
          {lineMsg && (
            <p className={`text-xs ${lineMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
              {lineMsg.text}
            </p>
          )}
          {lineLinked && (
            <div className="flex items-center gap-3">
              <input type="checkbox" id="muteLinePush" checked={muteLinePush}
                onChange={(e) => setMuteLinePush(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="muteLinePush" className="text-xs dark:text-gray-400">
                {zh ? '靜音 LINE 推播通知' : 'Mute LINE push notifications'}
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {zh ? '電話號碼' : 'Phone'}
          </label>
          <input
            type="tel"
            value={phone}
            placeholder={zh ? '保留空白則不更新' : 'Leave blank to keep current'}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {zh ? '電子郵件' : 'Email'}
          </label>
          <input
            type="email"
            value={email}
            placeholder={zh ? '保留空白則不更新' : 'Leave blank to keep current'}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {zh ? '新密碼' : 'Password'}
          </label>
          <input
            type="password"
            value={password}
            placeholder={zh ? '保留空白則不更新' : 'Leave blank to keep current'}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 font-medium disabled:opacity-60 transition"
        >
          {saving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
        </button>
      </form>

      {/* Legal links */}
      <div className="mt-6 flex gap-4 text-xs text-gray-400 dark:text-gray-500">
        <button
          type="button"
          onClick={() => setPolicyModal('privacy')}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-2 transition"
        >
          {zh ? '隱私政策' : 'Privacy Policy'}
        </button>
        <button
          type="button"
          onClick={() => setPolicyModal('terms')}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-2 transition"
        >
          {zh ? '使用條款' : 'Terms of Use'}
        </button>
      </div>

      {policyModal && (
        <PolicyModal type={policyModal} onClose={() => setPolicyModal(null)} />
      )}

      {/* Admin invite link generator */}
      {user.role === 'ADMIN' && (
        <div className="mt-8 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-950/20 p-6">
          <h2 className="text-base font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
            {zh ? '邀請新管理員' : 'Invite New Administrator'}
          </h2>
          <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-4">
            {zh ? '產生一個邀請連結，讓對方以管理員身份在 Judien 完成註冊。' : 'Generate a link so someone can sign up to Judien with administrator privileges.'}
          </p>

          <button
            type="button"
            disabled={inviteGenerating}
            onClick={async () => {
              setInviteGenerating(true);
              setInviteLink(null);
              setInviteCopied(false);
              try {
                const inv = await apiFetch<{ token: string }>('/invites', {
                  method: 'POST',
                  body: JSON.stringify({ role: 'ADMIN', expiresInHours: 168 }),
                });
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const link = `${origin}/${params.locale}/signup?invite=${inv.token}`;
                setInviteLink(link);
                setAdminInvites((prev) => [...prev, { id: '', token: inv.token, role: 'ADMIN', expiresAt: new Date(Date.now() + 168 * 3600 * 1000).toISOString(), usedAt: null, createdAt: new Date().toISOString(), usedBy: null }]);
              } catch (err: any) {
                setMsg({ text: err.message ?? 'Failed to generate invite.', ok: false });
              } finally {
                setInviteGenerating(false);
              }
            }}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {inviteGenerating ? (zh ? '產生中…' : 'Generating…') : (zh ? '產生管理員邀請連結' : 'Generate Admin Invite Link')}
          </button>

          {inviteLink && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300">{zh ? '邀請連結（7 天內有效）：' : 'Invite link (valid for 7 days):'}</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 rounded-md border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink).then(() => {
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2000);
                    }).catch(() => {});
                  }}
                  className="shrink-0 rounded-md border border-indigo-300 dark:border-indigo-600 px-3 py-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"
                >
                  {inviteCopied ? (zh ? '已複製！' : 'Copied!') : (zh ? '複製' : 'Copy')}
                </button>
              </div>
            </div>
          )}

          {/* Existing unused admin invites */}
          {adminInvites.filter((i) => !i.usedAt && i.role === 'ADMIN').length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300 mb-2">{zh ? '尚未使用的管理員邀請：' : 'Unused admin invites:'}</p>
              <div className="space-y-2">
                {adminInvites.filter((i) => !i.usedAt && i.role === 'ADMIN').map((inv, idx) => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/${params.locale}/signup?invite=${inv.token}`;
                  return (
                    <div key={inv.id || idx} className="flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 px-3 py-2">
                      <span className="flex-1 text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{link}</span>
                      <span className="text-xs text-gray-400 shrink-0">{zh ? '到期：' : 'Exp:'} {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!inv.id || !confirm(zh ? '確定要撤銷此邀請嗎？' : 'Revoke this invite?')) return;
                          try {
                            await apiFetch(`/invites/${inv.id}`, { method: 'DELETE' });
                            setAdminInvites((prev) => prev.filter((i) => i.id !== inv.id));
                          } catch { /* ignore */ }
                        }}
                        className="shrink-0 text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        {zh ? '撤銷' : 'Revoke'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
