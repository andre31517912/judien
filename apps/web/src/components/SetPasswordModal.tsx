'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth.context';

export default function SetPasswordModal({
  locale,
  onDismiss,
}: {
  locale: string;
  onDismiss: () => void;
}) {
  const zh = locale === 'zh';
  const { refresh, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSave = password.length >= 8 && password === confirm;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ password }),
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
    if (typeof localStorage !== 'undefined' && user) {
      localStorage.setItem(`passwordPromptDone_${user.id}`, '1');
    }
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {zh ? '設定密碼' : 'Set a password'}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {zh
              ? '設定密碼後，下次可直接用電話或電子郵件登入。'
              : 'Add a password so you can log in directly with your phone or email next time.'}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {zh ? '密碼' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={zh ? '至少 8 個字元' : 'At least 8 characters'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {zh ? '確認密碼' : 'Confirm password'}
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={zh ? '再次輸入密碼' : 'Re-enter password'}
              className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                mismatch
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {mismatch && (
              <p className="mt-1 text-xs text-red-500">
                {zh ? '密碼不一致。' : 'Passwords do not match.'}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
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
            {zh ? '稍後再說' : 'Skip for now'}
          </button>
        </div>
      </div>
    </div>
  );
}
