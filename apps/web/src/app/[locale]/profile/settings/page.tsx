'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch, apiUpload } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';

export default function ProfileSettingsPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [muteEmail, setMuteEmail] = useState(false);
  const [muteLinePush, setMuteLinePush] = useState(false);
  const [muteInApp, setMuteInApp] = useState(false);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineMsg, setLineMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [lineLoading, setLineLoading] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>(params.locale as 'en' | 'zh');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLineNewBanner, setShowLineNewBanner] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<'light' | 'dark'>(theme);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  type Invite = { id: string; token: string; role: string; expiresAt: string; usedAt: string | null; createdAt: string; usedBy: { id: string; displayName: string | null; email: string } | null };
  const [allInvites, setAllInvites] = useState<Invite[]>([]);
  const [adminInviteGenerating, setAdminInviteGenerating] = useState(false);
  const [adminInviteLink, setAdminInviteLink] = useState<string | null>(null);
  const [adminInviteCopied, setAdminInviteCopied] = useState(false);
  const [userInviteGenerating, setUserInviteGenerating] = useState(false);
  const [userInviteLink, setUserInviteLink] = useState<string | null>(null);
  const [userInviteCopied, setUserInviteCopied] = useState(false);

  const isLineOnlyEmail = (e: string) => e.endsWith('@line.local');

  useEffect(() => {
    if (user) {
      setDisplayName((user as any).displayName ?? '');
      setPhone((user as any)?.phoneE164 ?? '');
      const rawEmail = (user as any)?.email ?? '';
      setEmail(isLineOnlyEmail(rawEmail) ? '' : rawEmail);
      setPassword('');
      setMuteEmail((user as any).muteEmail ?? false);
      setMuteLinePush(user.muteLinePush ?? false);
      setMuteInApp((user as any).muteInAppNotifications ?? false);
      setLineLinked(!!user.lineUserId);
      setPhotoUrl((user as any).photoUrl ?? null);
      if (user.role === 'ADMIN') {
        apiFetch<Invite[]>('/invites').then(setAllInvites).catch(() => {});
      }
    }
  }, [user]);

  useEffect(() => {
    const lineParam = searchParams.get('line');
    if (lineParam === 'linked') {
      setLineMsg({ text: zh ? 'LINE 帳號已連結。' : 'LINE account linked.', ok: true });
    } else if (lineParam === 'error') {
      const reason = searchParams.get('reason') ?? '';
      setLineMsg({ text: zh ? `LINE 連結失敗：${reason}` : `LINE link failed: ${reason}`, ok: false });
    }
    if (searchParams.get('line_new') === '1') setShowLineNewBanner(true);
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
    } catch (err: any) {
      setMsg({ text: err.message ?? 'Photo upload failed.', ok: false });
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm(zh ? '確定要刪除大頭照嗎？' : 'Delete your profile photo?')) return;
    try {
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ photoUrl: null }) });
      setPhotoUrl(null);
      await refresh();
    } catch (err: any) {
      setMsg({ text: err.message ?? 'Failed to remove photo.', ok: false });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      preferredLanguage: lang,
      muteEmail,
      muteLinePush,
      muteInAppNotifications: muteInApp,
      displayName: displayName.trim(),
    };
    const storedPhone = (user as any)?.phoneE164 ?? '';
    const storedEmail = (user as any)?.email ?? '';
    const isLineEmail = isLineOnlyEmail(storedEmail);
    const displayedEmail = isLineEmail ? '' : storedEmail;

    if (phone.trim() !== storedPhone) body.phone = phone.trim() || null;
    if (email.trim() !== displayedEmail) {
      if (email.trim() && !isLineOnlyEmail(email.trim())) body.email = email.trim();
      else if (!email.trim() && !isLineEmail) body.email = null;
    }

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
      setTheme(pendingTheme);
      await refresh();
      setPassword('');
      setMsg({ text: lang === 'zh' ? '資料已更新。' : 'Profile updated.', ok: true });
      if (lang !== params.locale) router.push(`/${lang}/profile/settings`);
    } catch (err: any) {
      setMsg({ text: err.message ?? 'Error updating profile.', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const generateInvite = async (role: 'ADMIN' | 'USER') => {
    const setGenerating = role === 'ADMIN' ? setAdminInviteGenerating : setUserInviteGenerating;
    const setLink = role === 'ADMIN' ? setAdminInviteLink : setUserInviteLink;
    const setCopied = role === 'ADMIN' ? setAdminInviteCopied : setUserInviteCopied;
    setGenerating(true);
    setLink(null);
    setCopied(false);
    try {
      const inv = await apiFetch<{ token: string }>('/invites', {
        method: 'POST',
        body: JSON.stringify({ role, expiresInHours: 168 }),
      });
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/${params.locale}/signup?invite=${inv.token}`;
      setLink(link);
      setAllInvites((prev) => [...prev, { id: '', token: inv.token, role, expiresAt: new Date(Date.now() + 168 * 3600 * 1000).toISOString(), usedAt: null, createdAt: new Date().toISOString(), usedBy: null }]);
    } catch (err: any) {
      setMsg({ text: err.message ?? 'Failed to generate invite.', ok: false });
    } finally {
      setGenerating(false);
    }
  };

  if (!user) return <p className="text-gray-400">{zh ? '請先登入。' : 'Please log in.'}</p>;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${params.locale}/profile`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          ‹ {zh ? '返回個人資料' : 'Back to Profile'}
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold dark:text-white">{zh ? '編輯個人資料' : 'Edit Profile'}</h1>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.role === 'ADMIN' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'}`}>
          {user.role === 'ADMIN' ? (zh ? '平台管理員' : 'Admin') : (zh ? '用戶' : 'User')}
        </span>
      </div>

      {/* LINE welcome banner */}
      {showLineNewBanner && (
        <div className="mb-5 rounded-xl border border-[#06C755]/40 bg-[#06C755]/10 p-4 flex gap-3">
          <span className="text-2xl leading-none mt-0.5">👋</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{zh ? '歡迎加入 Judien！' : 'Welcome to Judien!'}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {zh
                ? '您的帳號已透過 LINE 建立。您可以在下方設定電子郵件與密碼，以便在 LINE 以外的裝置上也能登入。這是選填的，可以之後再設定。'
                : 'Your account was created with your LINE profile. You can optionally set an email and password below so you can also log in without LINE. You can skip this and do it later.'}
            </p>
          </div>
          <button type="button" onClick={() => setShowLineNewBanner(false)} className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {msg && <p className={`text-sm mb-4 ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}

      {/* Profile Photo */}
      <div className="flex items-end gap-4 mb-6">
        <div className="relative group">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
              <svg className="w-14 h-14 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
          )}
          <label className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center cursor-pointer shadow-md transition ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={photoUploading} />
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-white">{(user as any).displayName || (zh ? '未設定姓名' : 'No name set')}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{photoUploading ? (zh ? '上傳中…' : 'Uploading…') : (zh ? '點擊相機圖示更換大頭照' : 'Click the camera icon to change photo')}</p>
          {photoUrl && (
            <button type="button" onClick={handlePhotoDelete} className="text-xs text-red-500 hover:text-red-600 text-left mt-1">
              {zh ? '刪除大頭照' : 'Remove photo'}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">{zh ? '姓名' : 'Full Name'}</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder={(user as any)?.displayName || (zh ? '輸入姓名' : 'Enter full name')}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">{zh ? '語言' : 'Language'}</label>
          <div className="flex gap-2">
            {(['en', 'zh'] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)}
                className={`px-5 py-3 rounded-lg border text-sm font-medium transition-colors ${lang === l ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400'}`}>
                {l === 'en' ? 'English' : '中文'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">{zh ? '主題' : 'Theme'}</label>
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setPendingTheme(t)}
                className={`px-5 py-3 rounded-lg border text-sm font-medium transition-colors flex items-center gap-1.5 ${pendingTheme === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400'}`}>
                {t === 'light' ? '☀️ ' : '🌙 '}
                {t === 'light' ? (zh ? '淺色' : 'Light') : (zh ? '深色' : 'Dark')}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-3">
          <p className="text-sm font-medium dark:text-gray-200">{zh ? '通知設定' : 'Notification settings'}</p>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="muteInApp" checked={muteInApp} onChange={(e) => setMuteInApp(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="muteInApp" className="text-sm dark:text-gray-300">{zh ? '靜音所有站內通知（通知鈴鐺）' : 'Mute all in-app notifications (bell)'}</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="muteEmail" checked={muteEmail} onChange={(e) => setMuteEmail(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="muteEmail" className="text-sm dark:text-gray-300">{zh ? '靜音電子郵件通知' : 'Mute email notifications'}</label>
          </div>
        </div>

        {/* LINE account linking for push notifications — removed; LINE login already handles account linking */}

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">{zh ? '電話號碼' : 'Phone'}</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder={zh ? '保留空白則不更新' : 'Leave blank to keep current'}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">{zh ? '電子郵件' : 'Email'}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={
              isLineOnlyEmail((user as any)?.email ?? '')
                ? (zh ? '設定真實電子郵件（選填）' : 'Set a real email (optional)')
                : (zh ? '保留空白則不更新' : 'Leave blank to keep current')
            }
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          {isLineOnlyEmail((user as any)?.email ?? '') && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {zh ? '您是透過 LINE 登入，目前無真實電子郵件。設定後可用電子郵件+密碼登入。' : 'You signed in with LINE and have no real email set. Add one here to also be able to log in with email + password.'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">{zh ? '密碼' : 'Password'}</label>
          {isLineOnlyEmail((user as any)?.email ?? '') && (
            <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">{zh ? '設定密碼後，可搭配電子郵件用於帳號登入。' : 'Set a password to go along with your email for logging in.'}</p>
          )}
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60 transition">
          {saving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
        </button>
      </form>

      {/* Admin invite sections */}
      {user.role === 'ADMIN' && (
        <div className="mt-8 space-y-6">

          {/* Platform Admin invite */}
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-950/20 p-6">
            <h2 className="text-base font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
              {zh ? '邀請新平台管理員' : 'Invite New Platform Admin'}
            </h2>
            <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-4">
              {zh ? '產生一個邀請連結，讓對方以平台管理員身份完成註冊。平台管理員擁有全平台超級使用者權限。' : 'Generate a link so someone can sign up as a Platform Admin — a superuser with full privileges across all groups and features.'}
            </p>
            <button type="button" disabled={adminInviteGenerating} onClick={() => generateInvite('ADMIN')}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {adminInviteGenerating ? (zh ? '產生中…' : 'Generating…') : (zh ? '產生平台管理員邀請連結' : 'Generate Platform Admin Invite Link')}
            </button>
            {adminInviteLink && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300">{zh ? '邀請連結（7 天內有效）：' : 'Invite link (valid for 7 days):'}</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={adminInviteLink} className="flex-1 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 font-mono" />
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(adminInviteLink).then(() => { setAdminInviteCopied(true); setTimeout(() => setAdminInviteCopied(false), 2000); }).catch(() => {}); }}
                    className="shrink-0 rounded-lg border border-indigo-300 dark:border-indigo-600 px-3 py-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition">
                    {adminInviteCopied ? (zh ? '已複製！' : 'Copied!') : (zh ? '複製' : 'Copy')}
                  </button>
                </div>
              </div>
            )}
            {allInvites.filter((i) => !i.usedAt && i.role === 'ADMIN').length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300 mb-2">{zh ? '尚未使用的平台管理員邀請：' : 'Unused platform admin invites:'}</p>
                <div className="space-y-2">
                  {allInvites.filter((i) => !i.usedAt && i.role === 'ADMIN').map((inv, idx) => {
                    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/${params.locale}/signup?invite=${inv.token}`;
                    return (
                      <div key={inv.id || idx} className="flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 px-3 py-2">
                        <span className="flex-1 text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{link}</span>
                        <span className="text-xs text-gray-400 shrink-0">{zh ? '到期：' : 'Exp:'} {new Date(inv.expiresAt).toLocaleDateString()}</span>
                        <button type="button"
                          onClick={async () => {
                            if (!inv.id || !confirm(zh ? '確定要撤銷此邀請嗎？' : 'Revoke this invite?')) return;
                            try { await apiFetch(`/invites/${inv.id}`, { method: 'DELETE' }); setAllInvites((prev) => prev.filter((i) => i.id !== inv.id)); } catch { /* ignore */ }
                          }}
                          className="shrink-0 text-xs text-red-500 hover:text-red-600 font-medium">
                          {zh ? '撤銷' : 'Revoke'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Normal User welcome link */}
          <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-6">
            <h2 className="text-base font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
              {zh ? '產生一般用戶歡迎連結' : 'Generate User Welcome Link'}
            </h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-4">
              {zh ? '產生一個邀請連結，讓尚未註冊的人以一般用戶身份加入平台。一般用戶無超級使用者權限。' : 'Generate a link for someone who doesn\'t have an account yet to sign up as a regular user — no admin privileges.'}
            </p>
            <button type="button" disabled={userInviteGenerating} onClick={() => generateInvite('USER')}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {userInviteGenerating ? (zh ? '產生中…' : 'Generating…') : (zh ? '產生一般用戶邀請連結' : 'Generate User Welcome Link')}
            </button>
            {userInviteLink && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{zh ? '邀請連結（7 天內有效）：' : 'Invite link (valid for 7 days):'}</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={userInviteLink} className="flex-1 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 font-mono" />
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(userInviteLink).then(() => { setUserInviteCopied(true); setTimeout(() => setUserInviteCopied(false), 2000); }).catch(() => {}); }}
                    className="shrink-0 rounded-lg border border-emerald-300 dark:border-emerald-600 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition">
                    {userInviteCopied ? (zh ? '已複製！' : 'Copied!') : (zh ? '複製' : 'Copy')}
                  </button>
                </div>
              </div>
            )}
            {allInvites.filter((i) => !i.usedAt && i.role === 'USER').length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-2">{zh ? '尚未使用的一般用戶邀請：' : 'Unused user invites:'}</p>
                <div className="space-y-2">
                  {allInvites.filter((i) => !i.usedAt && i.role === 'USER').map((inv, idx) => {
                    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/${params.locale}/signup?invite=${inv.token}`;
                    return (
                      <div key={inv.id || idx} className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-800 px-3 py-2">
                        <span className="flex-1 text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{link}</span>
                        <span className="text-xs text-gray-400 shrink-0">{zh ? '到期：' : 'Exp:'} {new Date(inv.expiresAt).toLocaleDateString()}</span>
                        <button type="button"
                          onClick={async () => {
                            if (!inv.id || !confirm(zh ? '確定要撤銷此邀請嗎？' : 'Revoke this invite?')) return;
                            try { await apiFetch(`/invites/${inv.id}`, { method: 'DELETE' }); setAllInvites((prev) => prev.filter((i) => i.id !== inv.id)); } catch { /* ignore */ }
                          }}
                          className="shrink-0 text-xs text-red-500 hover:text-red-600 font-medium">
                          {zh ? '撤銷' : 'Revoke'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Danger Zone ── */}
      <div className="mt-10 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-6">
        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">{zh ? '危險區域' : 'Danger Zone'}</h3>
        <p className="text-xs text-red-500 dark:text-red-400/80 mb-4">
          {zh ? '刪除帳號後，所有資料將永久刪除且無法還原。' : 'Deleting your account is permanent and cannot be undone. All your data will be erased.'}
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
        >
          {zh ? '刪除帳號' : 'Delete Account'}
        </button>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{zh ? '確定要刪除帳號嗎？' : 'Delete your account?'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {zh ? '此操作無法復原。所有活動、群組、RSVP 資料都將永久刪除。請輸入「DELETE」確認。' : 'This cannot be undone. All your events, groups, and RSVPs will be permanently erased. Type DELETE to confirm.'}
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 mb-4 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {zh ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await apiFetch('/users/me', { method: 'DELETE' });
                    window.location.href = `/${params.locale}`;
                  } catch {
                    setDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? (zh ? '刪除中…' : 'Deleting…') : (zh ? '永久刪除' : 'Delete Forever')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
