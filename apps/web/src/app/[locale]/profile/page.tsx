'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';

export default function ProfilePage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [muteSms, setMuteSms] = useState(false);
  const [muteEmail, setMuteEmail] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

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
      setMsg({ text: zh ? '資料已更新。' : 'Profile updated.', ok: true });
    } catch (err: any) {
      setMsg({ text: err.message ?? 'Error updating profile.', ok: false });
    }
  };

  if (!user) return <p>{zh ? '請先登入。' : 'Please log in.'}</p>;

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{zh ? '個人資料' : 'Profile'}</h1>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            user.role === 'ADMIN'
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {user.role === 'ADMIN' ? (zh ? '管理員' : 'Admin') : (zh ? '用戶' : 'User')}
        </span>
      </div>

      {msg && (
        <p className={`text-sm mb-4 ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>
          {msg.text}
        </p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-4">

        <div>
          <label className="block text-sm font-medium mb-1">
            {zh ? '顯示名稱' : 'Display Name'}
          </label>
          <input
            type="text"
            value={displayName}
            placeholder={(user as any)?.displayName || (zh ? '輸入顯示名稱' : 'Enter a display name')}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {zh ? '顯示語言' : 'Display Language'}
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as 'en' | 'zh')}
            className="border rounded-md px-3 py-2 w-full"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="muteSms" checked={muteSms}
            onChange={(e) => setMuteSms(e.target.checked)} className="w-4 h-4" />
          <label htmlFor="muteSms" className="text-sm">
            {zh ? '靜音簡訊通知' : 'Mute SMS notifications'}
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="muteEmail" checked={muteEmail}
            onChange={(e) => setMuteEmail(e.target.checked)} className="w-4 h-4" />
          <label htmlFor="muteEmail" className="text-sm">
            {zh ? '靜音電子郵件通知' : 'Mute email notifications'}
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {zh ? '電話號碼' : 'Phone'}
          </label>
          <input
            type="tel"
            value={phone}
            placeholder={zh ? '保留空白則不更新' : 'Leave blank to keep current'}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {zh ? '電子郵件' : 'Email'}
          </label>
          <input
            type="email"
            value={email}
            placeholder={zh ? '保留空白則不更新' : 'Leave blank to keep current'}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {zh ? '新密碼' : 'Password'}
          </label>
          <input
            type="password"
            value={password}
            placeholder={zh ? '保留空白則不更新' : 'Leave blank to keep current'}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
        >
          {zh ? '儲存' : 'Save'}
        </button>
      </form>
    </div>
  );
}
