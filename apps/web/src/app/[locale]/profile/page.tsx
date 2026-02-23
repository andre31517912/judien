'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';

export default function ProfilePage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user, refresh } = useAuth();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [muted, setMuted] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) {
      setPhone('');
      setEmail('');
      setMuted(user.notificationsMuted);
      setLang(user.preferredLanguage);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    const body: Record<string, unknown> = {
      preferredLanguage: lang,
      notificationsMuted: muted,
    };
    if (phone.trim()) body.phone = phone.trim();
    if (email.trim()) body.email = email.trim();
    try {
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(body) });
      await refresh();
      setMsg(zh ? '資料已更新。' : 'Profile updated.');
    } catch (err: any) {
      setMsg(err.message ?? 'Error updating profile.');
    }
  };

  if (!user) return <p>{zh ? '請先登入。' : 'Please log in.'}</p>;

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6">{zh ? '個人資料' : 'Profile'}</h1>
      {msg && <p className="text-sm text-green-600 mb-4">{msg}</p>}
      <form onSubmit={handleSave} className="flex flex-col gap-4">

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
          <input
            type="checkbox"
            id="muted"
            checked={muted}
            onChange={(e) => setMuted(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="muted" className="text-sm">
            {zh ? '靜音所有通知' : 'Mute all notifications'}
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {zh ? '更新電話號碼' : 'Update Phone'}
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
            {zh ? '更新電子郵件' : 'Update Email'}
          </label>
          <input
            type="email"
            value={email}
            placeholder={zh ? '保留空白則不更新' : 'Leave blank to keep current'}
            onChange={(e) => setEmail(e.target.value)}
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
