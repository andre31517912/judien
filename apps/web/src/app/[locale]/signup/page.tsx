'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth.context';
import { apiFetch } from '@/lib/api';
import PolicyModal from '@/components/PolicyModal';

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
  const [inviteInfo, setInviteInfo] = useState<{ valid: boolean; role?: string; createdByName?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [policyModal, setPolicyModal] = useState<'privacy' | 'terms' | null>(null);

  // Auto-read invite token from ?invite= URL param
  useEffect(() => {
    const token = searchParams.get('invite');
    if (token) {
      setForm((f) => ({ ...f, inviteToken: token }));
      apiFetch<{ valid: boolean; role?: string; createdByName?: string }>(`/auth/invite/${token}`)
        .then(setInviteInfo)
        .catch(() => setInviteInfo({ valid: false }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      router.push(`/${params.locale}/events`);
    } catch (err: unknown) {
      setError((err as Error).message ?? (zh ? '註冊失敗。' : 'Sign-up failed.'));
    } finally {
      setLoading(false);
    }
  };

  const autoCompleteHint: Record<string, string> = {
    displayName: 'name',
    email: 'email',
    phone: 'tel',
    password: 'new-password',
  };

  const field = (label: string, key: keyof typeof form, type = 'text', isRequired = true) => (
    <div>
      <label className="block text-sm font-medium mb-1 dark:text-gray-300">{label}</label>
      <input
        type={type}
        name={key}
        autoComplete={autoCompleteHint[key] ?? 'off'}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={isRequired}
        className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
    </div>
  );

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">{zh ? '註冊' : 'Sign Up'}</h1>

      {/* Invite banner / gate */}

      {inviteInfo?.valid === false && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {zh ? '此邀請連結無效或已過期。請向管理員索取新的連結。' : 'This invite link is invalid or has expired. Ask an admin for a new one.'}
        </div>
      )}

      {inviteInfo?.valid === true && inviteInfo.role === 'ADMIN' && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-5 py-4 text-sm text-amber-900 dark:text-amber-300">
          <p className="font-semibold text-base mb-1">
            {zh ? '管理員邀請' : 'Administrator Invitation'}
          </p>
          {zh ? (
            <p>
              {inviteInfo.createdByName ? <><strong>{inviteInfo.createdByName}</strong> 正在邀請您以<strong>管理員</strong>身份在 Judien 註冊，享有額外的管理權限。</> : '您已受邀以管理員身份在 Judien 註冊，享有額外的管理權限。'}
            </p>
          ) : (
            <p>
              {inviteInfo.createdByName ? <><strong>{inviteInfo.createdByName}</strong> is inviting you to sign up to Judien as an <strong>administrator</strong> with extra privileges.</> : 'You have been invited to sign up to Judien as an administrator with extra privileges.'}
            </p>
          )}
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            {zh ? '請在下方建立您的帳號。' : 'Create your account below to get started.'}
          </p>
        </div>
      )}

      {inviteInfo?.valid === true && inviteInfo.role !== 'ADMIN' && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
          {zh ? (
            <>
              {inviteInfo.createdByName && <><strong>{inviteInfo.createdByName}</strong> 邀請您加入 Judien。</>}
              {!inviteInfo.createdByName && '您受邀加入 Judien。'}
              {' '}{zh ? '在下方建立帳號。' : ''}
            </>
          ) : (
            <>
              {inviteInfo.createdByName && <><strong>{inviteInfo.createdByName}</strong> has invited you to join Judien.</>}
              {!inviteInfo.createdByName && "You've been invited to join Judien."}
              {' '}Create your account below.
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {field(zh ? '姓名' : 'Full Name', 'displayName')}
        {field(zh ? '電話號碼（如 +886912345678）' : 'Phone (e.g. +886912345678)', 'phone', 'tel')}
        {field(zh ? '密碼（至少 8 字元）' : 'Password (min 8 chars)', 'password', 'password')}
        {field(zh ? '電子郵件' : 'Email', 'email', 'email', false)}
        {/* Terms & Privacy checkbox */}
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="agreeTerms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 accent-indigo-600"
          />
          <label htmlFor="agreeTerms" className="text-sm text-gray-600 dark:text-gray-400 leading-snug">
            {zh ? '我同意 ' : 'I agree to the '}
            <button
              type="button"
              onClick={() => setPolicyModal('terms')}
              className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-800"
            >
              {zh ? '使用條款' : 'Terms of Use'}
            </button>
            {zh ? ' 及 ' : ' and '}
            <button
              type="button"
              onClick={() => setPolicyModal('privacy')}
              className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-800"
            >
              {zh ? '隱私政策' : 'Privacy Policy'}
            </button>
          </label>
        </div>
        <button
          type="submit"
          disabled={loading || !agreedToTerms}
          className="bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60 transition"
        >
          {loading ? (zh ? '建立中…' : 'Creating account…') : (zh ? '建立帳號' : 'Create Account')}
        </button>
      </form>

      <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">
        {zh ? '已有帳號？' : 'Already have an account?'}{' '}
        <Link href={`/${params.locale}/login`} className="text-indigo-600 underline">
          {zh ? '登入' : 'Sign In'}
        </Link>
      </p>

      {policyModal && (
        <PolicyModal type={policyModal} onClose={() => setPolicyModal(null)} />
      )}
    </div>
  );
}

