'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';

export default function SignupPage({ params }: { params: { locale: string } }) {
  const { signup } = useAuth();
  const router = useRouter();
  const zh = params.locale === 'zh';
  const [form, setForm] = useState({
    email: '',
    password: '',
    phone: '',
    preferredLanguage: params.locale as 'en' | 'zh',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signup(form);
      router.push(`/${params.locale}/events`);
    } catch (err: any) {
      setError(err.message ?? 'Sign-up failed.');
    }
  };

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required
        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6">{zh ? '註冊' : 'Sign Up'}</h1>
      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {field(zh ? '電子郵件' : 'Email', 'email', 'email')}
        {field(zh ? '密碼（至少 8 字元）' : 'Password (min 8 chars)', 'password', 'password')}
        {field(zh ? '電話號碼（含國碼，如 +886912345678）' : 'Phone (e.g. +886912345678)', 'phone', 'tel')}
        <button
          type="submit"
          className="bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 font-medium"
        >
          {zh ? '建立帳號' : 'Create Account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        {zh ? '已有帳號？' : 'Already have an account?'}{' '}
        <Link href={`/${params.locale}/login`} className="text-indigo-600 underline">
          {zh ? '登入' : 'Log In'}
        </Link>
      </p>
    </div>
  );
}
