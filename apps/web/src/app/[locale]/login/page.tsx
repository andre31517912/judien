'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';

export default function LoginPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Show error if redirected back from a bad magic link
  useEffect(() => {
    if (searchParams.get('error') === 'invalid_link') {
      setError(zh ? '登入連結無效或已過期，請重新申請。' : 'Sign-in link is invalid or expired. Please request a new one.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = searchParams.get('next');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(identifier, password);
      router.push(next ?? `/${loggedInUser.preferredLanguage ?? params.locale}/events`);
    } catch (err: unknown) {
      setError((err as Error).message ?? (zh ? '登入失敗。' : 'Sign in failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">
        {zh ? '登入' : 'Sign In'}
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
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60 transition"
        >
          {loading ? (zh ? '登入中…' : 'Signing in…') : (zh ? '登入' : 'Sign In')}
        </button>
      </form>

      <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">
        {zh ? '還沒有帳號？' : "Don't have an account?"}{' '}
        <Link href={`/${params.locale}/signup`} className="text-indigo-600 underline">
          {zh ? '註冊' : 'Sign Up'}
        </Link>
      </p>
    </div>
  );
}
