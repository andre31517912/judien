'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';

export default function SignupPage({ params }: { params: { locale: string } }) {
  const { signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const zh = params.locale === 'zh';

  const [form, setForm] = useState({
    email: '',
    password: '',
    phone: '',
    displayName: '',
    preferredLanguage: params.locale as 'en' | 'zh',
    inviteToken: '',
  });
  const [inviteInfo, setInviteInfo] = useState<{ valid: boolean; role?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill invite token from ?invite= query param and validate it
  useEffect(() => {
    const token = searchParams.get('invite');
    if (token) {
      setForm((f) => ({ ...f, inviteToken: token }));
      apiFetch<{ valid: boolean; role?: string }>(`/auth/invite/${token}`)
        .then(setInviteInfo)
        .catch(() => setInviteInfo({ valid: false }));
    }
  }, [searchParams]);

  // Re-validate when user manually types a token
  const handleTokenChange = (token: string) => {
    setForm((f) => ({ ...f, inviteToken: token }));
    setInviteInfo(null);
    if (token.length >= 10) {
      apiFetch<{ valid: boolean; role?: string }>(`/auth/invite/${token}`)
        .then(setInviteInfo)
        .catch(() => setInviteInfo({ valid: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.inviteToken.trim()) {
      setError(zh ? '需要邀請碼才能註冊。' : 'An invite code is required to sign up.');
      return;
    }
    setLoading(true);
    try {
      await signup(form);
      router.push(`/${params.locale}/events`);
    } catch (err: any) {
      setError(err.message ?? 'Sign-up failed.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label className="block text-sm font-medium mb-1 dark:text-gray-300">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required
        className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
    </div>
  );

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">{zh ? '註冊' : 'Sign Up'}</h1>

      {/* Invite token field */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">
          {zh ? '邀請碼' : 'Invite Code'} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.inviteToken}
          onChange={(e) => handleTokenChange(e.target.value)}
          placeholder={zh ? '貼上您的邀請碼' : 'Paste your invite code here'}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
        />
        {inviteInfo && (
          <p className={`mt-1 text-xs ${inviteInfo.valid ? 'text-green-600' : 'text-red-500'}`}>
            {inviteInfo.valid
              ? (zh ? `✓ 有效邀請 — 角色：${inviteInfo.role === 'ADMIN' ? '管理員' : '用戶'}` : `✓ Valid invite — Role: ${inviteInfo.role}`)
              : (zh ? '✗ 邀請碼無效或已過期。' : '✗ Invalid or expired invite code.')}
          </p>
        )}
      </div>

      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {field(zh ? '顯示名稱（暱稱）' : 'Display Name (nickname)', 'displayName')}
        {field(zh ? '電子郵件' : 'Email', 'email', 'email')}
        {field(zh ? '密碼（至少 8 字元）' : 'Password (min 8 chars)', 'password', 'password')}
        {field(zh ? '電話號碼（含國碼，如 +886912345678）' : 'Phone (e.g. +886912345678)', 'phone', 'tel')}
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 font-medium disabled:opacity-60 transition"
        >
          {loading ? '…' : (zh ? '建立帳號' : 'Create Account')}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        {zh ? '已有帳號？' : 'Already have an account?'}{' '}
        <Link href={`/${params.locale}/login`} className="text-indigo-600 underline">
          {zh ? '登入' : 'Log In'}
        </Link>
      </p>
    </div>
  );
}

