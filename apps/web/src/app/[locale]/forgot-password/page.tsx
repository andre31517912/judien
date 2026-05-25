'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Mode = 'email' | 'sms';

export default function ForgotPasswordPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const [mode, setMode] = useState<Mode>('email');
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const handleModeChange = (next: Mode) => {
    setMode(next);
    setValue('');
    setError('');
    setSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown) return;
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(mode === 'email' ? { email: value.trim() } : { phone: value.trim() }),
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

  const label = mode === 'email'
    ? (zh ? '電子郵件' : 'Email')
    : (zh ? '手機號碼' : 'Phone number');

  const placeholder = mode === 'email' ? 'someone@example.com' : '+886912345678';

  const sentMsg = mode === 'email'
    ? (zh
        ? `如果 ${value} 已登記，您將收到一封包含登入連結的電子郵件。`
        : `If ${value} is registered, you'll receive an email with a sign-in link.`)
    : (zh
        ? `如果 ${value} 已登記，您將收到一則包含登入連結的簡訊。`
        : `If ${value} is registered, you'll receive an SMS with a sign-in link.`);

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-2 dark:text-white">
        {zh ? '取得登入連結' : 'Get a sign-in link'}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {zh
          ? '輸入您的電子郵件或手機號碼，我們將發送一個可直接登入的連結（15 分鐘內有效）。'
          : "Enter your email or phone number and we'll send you a link to sign in instantly (valid for 15 minutes)."}
      </p>

      {/* Mode toggle */}
      <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden mb-5">
        {(['email', 'sms'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`flex-1 py-2 text-sm font-medium transition ${
              mode === m
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {m === 'email'
              ? (zh ? '電子郵件' : 'Email')
              : (zh ? '簡訊 (SMS)' : 'SMS')}
          </button>
        ))}
      </div>

      {sent ? (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-4 text-green-800 dark:text-green-200 text-sm">
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
            {zh ? '使用不同的聯絡方式' : 'Try a different contact'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
              {label}
            </label>
            <input
              key={mode}
              type={mode === 'email' ? 'email' : 'tel'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              required
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            {mode === 'sms' && (
              <p className="mt-1 text-xs text-gray-400">
                {zh ? '請使用國際格式，例如 +886912345678' : 'Use international format e.g. +886912345678'}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || cooldown}
            className="bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 font-medium disabled:opacity-60 transition"
          >
            {loading ? '…' : (zh ? '發送登入連結' : 'Send sign-in link')}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        <Link href={`/${params.locale}/login`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
          ← {zh ? '返回登入' : 'Back to login'}
        </Link>
      </p>
    </div>
  );
}
