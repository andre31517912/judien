'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown) return;
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: value.trim() }),
      });
      setSent(true);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60_000);
    } catch {
      setError(zh ? '發送失敗，請稍後再試。' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sentMsg = zh
    ? `如果 ${value} 已登記，您將收到一封包含登入連結的電子郵件。`
    : `If ${value} is registered, you'll receive an email with a sign-in link.`;

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-2 dark:text-white">
        {zh ? '取得登入連結' : 'Get a sign-in link'}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {zh
          ? '輸入您的電子郵件，我們將發送一個可直接登入的連結（15 分鐘內有效）。'
          : "Enter your email and we'll send you a link to sign in instantly (valid for 15 minutes)."}
      </p>

      {sent ? (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-4 text-green-800 dark:text-green-200 text-sm">
          {sentMsg}
          {cooldown && (
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">
              {zh ? '60 秒後可重新發送。' : 'You can request again in 60 seconds.'}
            </p>
          )}
          <button
            onClick={() => { setSent(false); setValue(''); }}
            disabled={cooldown}
            className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40"
          >
            {zh ? '使用不同的電子郵件' : 'Try a different email'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
              {zh ? '電子郵件' : 'Email'}
            </label>
            <input
              type="email"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="someone@example.com"
              required
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading || cooldown}
            className="bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60 transition"
          >
            {loading ? '…' : (zh ? '發送登入連結' : 'Send sign-in link')}
          </button>
        </form>
      )}


    </div>
  );
}
