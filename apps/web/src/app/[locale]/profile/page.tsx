'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';

export default function ProfilePage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [muteEmail, setMuteEmail] = useState(false);
  const [muteLinePush, setMuteLinePush] = useState(false);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineMsg, setLineMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [lineLoading, setLineLoading] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>(params.locale as 'en' | 'zh');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLineNewBanner, setShowLineNewBanner] = useState(false);
  const { theme, setTheme } = useTheme();
  type AdminInvite = { id: string; token: string; role: string; expiresAt: string; usedAt: string | null; createdAt: string; usedBy: { id: string; displayName: string | null; email: string } | null };
  const [adminInvites, setAdminInvites] = useState<AdminInvite[]>([]);
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const isLineOnlyEmail = (e: string) => e.endsWith('@line.local');

  useEffect(() => {
    if (user) {
      setDisplayName((user as any).displayName ?? '');
      setPhone((user as any)?.phoneE164 ?? '');
      // Don't pre-fill the fake LINE placeholder email — show blank so they know to set a real one
      const rawEmail = (user as any)?.email ?? '';
      setEmail(isLineOnlyEmail(rawEmail) ? '' : rawEmail);
      setPassword('');
      setMuteEmail((user as any).muteEmail ?? false);
      setMuteLinePush(user.muteLinePush ?? false);
      setLineLinked(!!user.lineUserId);
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
    if (searchParams.get('line_new') === '1') {
      setShowLineNewBanner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      preferredLanguage: lang,
      muteEmail,
      muteLinePush,
      displayName: displayName.trim(),
    };
    const storedPhone = (user as any)?.phoneE164 ?? '';
    const storedEmail = (user as any)?.email ?? '';
    const isLineEmail = isLineOnlyEmail(storedEmail);
    // The email value the user sees in the field (blank if LINE placeholder)
    const displayedEmail = isLineEmail ? '' : storedEmail;

    // Phone: send if changed — including clearing (null) if user blanked it out
    if (phone.trim() !== storedPhone) {
      body.phone = phone.trim() || null;
    }

    // Email: send if changed — including clearing (null) if user blanked a real email out
    if (email.trim() !== displayedEmail) {
      if (email.trim() && !isLineOnlyEmail(email.trim())) {
        body.email = email.trim();
      } else if (!email.trim() && !isLineEmail) {
        body.email = null; // user explicitly cleared a real email
      }
      // if isLineEmail and field is still blank — no change, don't send
    }

    // Client-side guard: make sure at least one real contact remains after this save
    const resultingEmail = 'email' in body ? (body.email as string | null) : (isLineEmail ? null : storedEmail || null);
    const resultingPhone = 'phone' in body ? (body.phone as string | null) : (storedPhone || null);
    if (!resultingEmail && !resultingPhone) {
      setMsg({ text: zh ? '必須至少保留一個電子郵件或手機號碼。' : 'You must keep at least one email or phone number on file.', ok: false });
      setSaving(false);
      return;
    }

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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
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

      {/* Welcome banner for first-time LINE login */}
      {showLineNewBanner && (
        <div className="mb-5 rounded-xl border border-[#06C755]/40 bg-[#06C755]/10 p-4 flex gap-3">
          <span className="text-2xl leading-none mt-0.5">👋</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {zh ? '歡迎加入 Judien！' : 'Welcome to Judien!'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {zh
                ? '您的帳號已透過 LINE 建立。您可以在下方設定電子郵件與密碼，以便在 LINE 以外的裝置上也能登入。這是選填的，可以之後再設定。'
                : 'Your account was created with your LINE profile. You can optionally set an email and password below so you can also log in without LINE. You can skip this and do it later.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLineNewBanner(false)}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-0.5"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {msg && (
        <p className={`text-sm mb-4 ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>
          {msg.text}
        </p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-4">

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {zh ? '姓名' : 'Full Name'}
          </label>
          <input
            type="text"
            value={displayName}
            placeholder={(user as any)?.displayName || (zh ? '輸入姓名' : 'Enter full name')}
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
            placeholder={
              isLineOnlyEmail((user as any)?.email ?? '')
                ? (zh ? '設定真實電子郵件（選填）' : 'Set a real email (optional)')
                : (zh ? '保留空白則不更新' : 'Leave blank to keep current')
            }
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          {isLineOnlyEmail((user as any)?.email ?? '') && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {zh
                ? '您是透過 LINE 登入，目前無真實電子郵件。設定後可用電子郵件+密碼登入。'
                : 'You signed in with LINE and have no real email set. Add one here to also be able to log in with email + password.'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {zh ? '密碼' : 'Password'}
          </label>
          {isLineOnlyEmail((user as any)?.email ?? '') && (
            <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
              {zh ? '設定密碼後，可搭配電子郵件用於帳號登入。' : 'Set a password to go along with your email for logging in.'}
            </p>
          )}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={showPassword ? (zh ? '隱藏密碼' : 'Hide password') : (zh ? '顯示密碼' : 'Show password')}
            >
              {showPassword ? (
                /* Eye open — password is visible */
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                /* Eye with slash — password is hidden (default) */
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 font-medium disabled:opacity-60 transition"
        >
          {saving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
        </button>
      </form>

      {/* Admin invite link generator */}
      {user.role === 'ADMIN' && (
        <div className="mt-8 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-950/20 p-6">
          <h2 className="text-base font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
            {zh ? '邀請新平台管理員' : 'Invite New Platform Admin'}
          </h2>
          <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-4">
            {zh ? '產生一個邀請連結，讓對方以平台管理員身份完成註冊。平台管理員擁有全平台超級使用者權限，可管理所有群組與功能。' : 'Generate a link so someone can sign up as a Platform Admin — a superuser with full privileges across all groups and features on the platform.'}
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
            {inviteGenerating ? (zh ? '產生中…' : 'Generating…') : (zh ? '產生平台管理員邀請連結' : 'Generate Platform Admin Invite Link')}
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
              <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300 mb-2">{zh ? '尚未使用的平台管理員邀請：' : 'Unused platform admin invites:'}</p>
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
