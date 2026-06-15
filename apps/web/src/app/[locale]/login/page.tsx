'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';

export default function LoginPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);

  // Show error if redirected back from a bad magic link
  useEffect(() => {
    if (searchParams.get('error') === 'invalid_link') {
      setError(zh ? '登入連結無效或已過期，請重新申請。' : 'Sign-in link is invalid or expired. Please request a new one.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(identifier, password);
      router.push(`/${loggedInUser.preferredLanguage ?? params.locale}/events`);
    } catch (err: unknown) {
      setError((err as Error).message ?? (zh ? '登入失敗。' : 'Login failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLineLogin = async () => {
    setLineLoading(true);
    try {
      const data = await apiFetch<{ url?: string; error?: string }>('/auth/line/login');
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(zh ? 'LINE 登入設定有誤。' : 'LINE login is not configured.');
        setLineLoading(false);
      }
    } catch {
      setError(zh ? 'LINE 登入失敗，請稍後再試。' : 'LINE login failed. Please try again.');
      setLineLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">
        {zh ? '登入' : 'Log In'}
      </h1>

      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {zh ? '電子郵件或電話' : 'Email or Phone'}
          </label>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder=""
            required
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium dark:text-gray-300">
              {zh ? '密碼' : 'Password'}
            </label>
            <Link
              href={`/${params.locale}/forgot-password`}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {zh ? '忘記密碼？' : 'Forgot password?'}
            </Link>
          </div>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 font-medium disabled:opacity-60 transition"
        >
          {loading ? (zh ? '登入中…' : 'Logging in…') : (zh ? '登入' : 'Log In')}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400">{zh ? '或' : 'or'}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <button
        onClick={handleLineLogin}
        disabled={lineLoading}
        className="w-full flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34d] disabled:opacity-60 text-white font-medium py-3 rounded-md transition"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.477 2 2 6.036 2 11.07c0 4.522 3.613 8.312 8.5 8.94v2.99s-.01.3.18.37c.23.08.36-.14.36-.14l2.17-2.89c.26.02.53.03.79.03 5.523 0 10-4.036 10-9.07C24 6.036 17.523 2 12 2z"/>
        </svg>
        {lineLoading ? (zh ? '連接中…' : 'Connecting…') : (zh ? '使用 LINE 登入' : 'Continue with LINE')}
      </button>

      <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">
        {zh ? '還沒有帳號？' : "Don't have an account?"}{' '}
        <Link href={`/${params.locale}/signup`} className="text-indigo-600 underline">
          {zh ? '註冊' : 'Sign Up'}
        </Link>
      </p>
    </div>
  );
}
