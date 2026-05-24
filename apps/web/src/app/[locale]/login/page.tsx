'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';

export default function LoginPage({ params }: { params: { locale: string } }) {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      router.push(`/${params.locale}/events`);
    } catch (err: any) {
      setError(err.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">
        {params.locale === 'zh' ? '登入' : 'Log In'}
      </h1>
      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {params.locale === 'zh' ? '電子郵件或電話' : 'Email or Phone'}
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={params.locale === 'zh' ? 'someone@example.com 或 +886912345678' : 'someone@example.com or +886912345678'}
            required
            className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            {params.locale === 'zh' ? '密碼' : 'Password'}
          </label>
          <input
            type="password"
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
          {loading ? '…' : (params.locale === 'zh' ? '登入' : 'Log In')}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        {params.locale === 'zh' ? '還沒有帳號？' : "Don't have an account?"}{' '}
        <Link href={`/${params.locale}/signup`} className="text-indigo-600 underline">
          {params.locale === 'zh' ? '註冊' : 'Sign Up'}
        </Link>
      </p>
    </div>
  );
}
