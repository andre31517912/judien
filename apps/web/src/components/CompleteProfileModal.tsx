'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth.context';

export default function CompleteProfileModal({
  locale,
  onDismiss,
}: {
  locale: string;
  onDismiss: () => void;
}) {
  const zh = locale === 'zh';
  const { refresh } = useAuth();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = phone.trim().length > 0 || email.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      await refresh();
      onDismiss();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : null;
      setError(msg ?? (zh ? '儲存失敗，請再試一次。' : 'Save failed. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('skipProfileCompletion', '1');
    }
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {zh ? '完善您的資料' : 'Complete your profile'}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {zh
              ? '新增電話或電子郵件，方便我們在必要時聯繫您，並確保您的帳號可被識別。'
              : 'Add a phone number or email so we can reach you and keep your account linked across sessions.'}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {zh ? '電話號碼' : 'Phone number'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={zh ? '例：+886912345678' : 'e.g. +1 555 000 0000'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {zh ? '電子郵件' : 'Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <p className="text-xs text-gray-400 dark:text-gray-500">
            {zh ? '電話或電子郵件至少填一項。' : 'At least one of phone or email is required to save.'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            {saving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 rounded-lg py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {zh ? '稍後再說' : 'Remind me later'}
          </button>
        </div>
      </div>
    </div>
  );
}
