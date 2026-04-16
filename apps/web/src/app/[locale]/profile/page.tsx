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
  const backHref = searchParams.get('from') ?? `/${params.locale}/events`;
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [muteSms, setMuteSms] = useState(false);
  const [muteEmail, setMuteEmail] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user) {
      setDisplayName((user as any).displayName ?? '');
      setPhone('');
      setEmail('');
      setPassword('');
      setMuteSms((user as any).muteSms ?? false);
      setMuteEmail((user as any).muteEmail ?? false);
      setLang(user.preferredLanguage);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      preferredLanguage: lang,
      muteSms,
      muteEmail,
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
          {user.role === 'ADMIN' ? (zh ? '群組管理員' : 'Group Admin') : (zh ? '用戶' : 'User')}
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
    </div>
  );
}
