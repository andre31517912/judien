'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch, setTokens } from '../../../../lib/api';
import { useAuth } from '../../../../context/auth.context';
import type { EventWithCounts } from '@judien/shared';

type InviteType = 'event' | 'group' | 'unknown' | 'loading';

type GroupInviteInfo = {
  groupName: string;
  groupId: string;
  hasAccount: boolean;
};

export default function InviteAcceptPage() {
  const params = useParams<{ locale: string; token: string }>();
  const router = useRouter();
  const { user: authUser, refresh } = useAuth();
  const zh = params.locale === 'zh';

  const [inviteType, setInviteType] = useState<InviteType>('loading');
  const [eventInfo, setEventInfo] = useState<EventWithCounts | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInviteInfo | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detect invite type on mount
  useEffect(() => {
    const detect = async () => {
      // Try event invite first
      try {
        const res = await apiFetch<{ eventId: string; groupName?: string; groupId?: string }>(
          `/event-invites/${params.token}/info`
        ).catch(() => null);
        if (res && res.eventId) {
          setInviteType('event');
          return;
        }
      } catch {}

      // Try group invite
      try {
        const res = await apiFetch<GroupInviteInfo>(
          `/groups/invites/${params.token}/info`
        ).catch(() => null);
        if (res && res.groupName) {
          setGroupInfo(res);
          setInviteType('group');
          return;
        }
      } catch {}

      setInviteType('unknown');
    };
    detect();
  }, [params.token]);

  // If user is already logged in and this is a group invite, auto-accept
  useEffect(() => {
    if (inviteType !== 'group' || !groupInfo || !authUser) return;
    const autoAccept = async () => {
      setLoading(true);
      try {
        await apiFetch(`/groups/invitations/${params.token}/respond`, {
          method: 'POST',
          body: JSON.stringify({ action: 'accept' }),
        });
        router.push(`/${params.locale}/groups/${groupInfo.groupId}`);
      } catch {
        // Invite may not match this user — fall through to the manual form
        setLoading(false);
      }
    };
    autoAccept();
  }, [inviteType, groupInfo, authUser, params.token, params.locale, router]);

  const handleEventAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<{ user: unknown; eventId: string }>(
        `/event-invites/${params.token}/accept`,
        {
          method: 'POST',
          body: JSON.stringify({
            displayName,
            phoneE164: phone || undefined,
            email: email || undefined,
          }),
        }
      );
      router.push(`/${params.locale}/events/${result.eventId}`);
    } catch (err: unknown) {
      setError((err as Error).message || (zh ? '無法接受邀請' : 'Failed to accept invite'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestGroupJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<{ user: unknown; accessToken: string; refreshToken?: string; groupId: string }>(
        `/auth/guest-join`,
        {
          method: 'POST',
          body: JSON.stringify({
            groupInviteToken: params.token,
            displayName: displayName || undefined,
            phoneE164: phone || undefined,
            email: email || undefined,
          }),
        }
      );
      setTokens(result.accessToken, result.refreshToken ?? null);
      await refresh();
      router.push(`/${params.locale}/groups/${result.groupId}`);
    } catch (err: unknown) {
      setError((err as Error).message || (zh ? '無法加入群組' : 'Failed to join group'));
    } finally {
      setLoading(false);
    }
  };

  if (inviteType === 'loading' || (inviteType === 'group' && authUser)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:bg-black dark:from-black dark:to-black">
        <p className="text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
      </div>
    );
  }

  if (inviteType === 'unknown') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:bg-black p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-red-500 font-medium">{zh ? '邀請連結無效或已過期。' : 'Invalid or expired invite link.'}</p>
          <button
            onClick={() => router.push(`/${params.locale}/events`)}
            className="mt-4 text-sm text-indigo-600 hover:underline"
          >
            {zh ? '返回首頁' : 'Go home'}
          </button>
        </div>
      </div>
    );
  }

  const isGroup = inviteType === 'group';
  const hasAccount = isGroup && groupInfo?.hasAccount === true;
  const handleSubmit = isGroup ? handleGuestGroupJoin : handleEventAccept;

  // For group invites: phone or email required; for event invites: phone required
  const canSubmit = isGroup
    ? (phone.trim() || email.trim()) && (hasAccount || displayName.trim())
    : displayName.trim() && phone.trim();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:bg-black p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">{isGroup ? '👥' : '🎉'}</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isGroup
              ? (zh ? '您收到群組邀請！' : "You're invited to join a group!")
              : (zh ? '您收到活動邀請！' : "You're invited!")}
          </h1>
          {isGroup && groupInfo && (
            <p className="text-indigo-600 dark:text-indigo-400 font-medium mt-1">{groupInfo.groupName}</p>
          )}
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            {isGroup
              ? (hasAccount
                ? (zh ? '請輸入您的手機或電子郵件以繼續' : 'Enter your phone or email to continue')
                : (zh ? '填寫資料以加入群組' : 'Fill in your details to join'))
              : (zh ? '填寫資料以確認出席' : 'Fill in your details to confirm attendance')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name — always shown for events; shown for group invites only if no existing account */}
          {(!isGroup || !hasAccount) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {zh ? '顯示名稱' : 'Display Name'}{!isGroup || !hasAccount ? ' *' : ''}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={zh ? '您的名字' : 'What should we call you?'}
                required={!isGroup || !hasAccount}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {zh ? '手機號碼' : 'Phone Number'}{!isGroup ? ' *' : ''}
              {isGroup && <span className="text-gray-400 text-xs ml-1">{zh ? '（手機或電子郵件二擇一）' : '(phone or email required)'}</span>}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+886 900 000 123"
              required={!isGroup}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {zh ? '電子郵件' : 'Email'}{isGroup ? '' : ` (${zh ? '選填' : 'optional'})`}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full mt-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading
              ? (zh ? '處理中…' : 'Processing…')
              : isGroup
                ? (zh ? '加入群組' : 'Join Group')
                : (zh ? '確認出席' : 'Confirm Attendance')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          {isGroup
            ? (zh ? '加入後即可查看群組動態與活動。' : "You'll be able to see the group feed and events.")
            : (zh ? '確認後您將被標記為出席。' : "You'll be marked as attending this event.")}
        </p>
      </div>
    </div>
  );
}


export default function InviteAcceptPage() {
  const params = useParams<{ locale: string; token: string }>();
  const router = useRouter();
  const { refresh } = useAuth();
  const zh = params.locale === 'zh';

  const [inviteType, setInviteType] = useState<InviteType>('loading');
  const [eventInfo, setEventInfo] = useState<EventWithCounts | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInviteInfo | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detect invite type on mount
  useEffect(() => {
    const detect = async () => {
      // Try event invite first
      try {
        const res = await apiFetch<{ eventId: string; groupName?: string; groupId?: string }>(
          `/event-invites/${params.token}/info`
        ).catch(() => null);
        if (res && res.eventId) {
          setInviteType('event');
          return;
        }
      } catch {}

      // Try group invite
      try {
        const res = await apiFetch<GroupInviteInfo>(
          `/groups/invites/${params.token}/info`
        ).catch(() => null);
        if (res && res.groupName) {
          setGroupInfo(res);
          setInviteType('group');
          return;
        }
      } catch {}

      setInviteType('unknown');
    };
    detect();
  }, [params.token]);

  const handleEventAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<{ user: unknown; eventId: string }>(
        `/event-invites/${params.token}/accept`,
        {
          method: 'POST',
          body: JSON.stringify({
            displayName,
            phoneE164: phone,
            email: email || undefined,
          }),
        }
      );
      router.push(`/${params.locale}/events/${result.eventId}`);
    } catch (err: unknown) {
      setError((err as Error).message || (zh ? '無法接受邀請' : 'Failed to accept invite'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestGroupJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<{ user: unknown; accessToken: string; refreshToken?: string }>(
        `/auth/guest-join`,
        {
          method: 'POST',
          body: JSON.stringify({
            groupInviteToken: params.token,
            displayName,
            phoneE164: phone,
            email: email || undefined,
          }),
        }
      );
      setTokens(result.accessToken, result.refreshToken ?? null);
      await refresh();
      router.push(`/${params.locale}/groups`);
    } catch (err: unknown) {
      setError((err as Error).message || (zh ? '無法加入群組' : 'Failed to join group'));
    } finally {
      setLoading(false);
    }
  };

  if (inviteType === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:bg-black dark:from-black dark:to-black">
        <p className="text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
      </div>
    );
  }

  if (inviteType === 'unknown') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:bg-black p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-red-500 font-medium">{zh ? '邀請連結無效或已過期。' : 'Invalid or expired invite link.'}</p>
          <button
            onClick={() => router.push(`/${params.locale}/events`)}
            className="mt-4 text-sm text-indigo-600 hover:underline"
          >
            {zh ? '返回首頁' : 'Go home'}
          </button>
        </div>
      </div>
    );
  }

  const isGroup = inviteType === 'group';
  const handleSubmit = isGroup ? handleGuestGroupJoin : handleEventAccept;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:bg-black p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">{isGroup ? '👥' : '🎉'}</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isGroup
              ? (zh ? '您收到群組邀請！' : "You're invited to join a group!")
              : (zh ? '您收到活動邀請！' : "You're invited!")}
          </h1>
          {isGroup && groupInfo && (
            <p className="text-indigo-600 dark:text-indigo-400 font-medium mt-1">{groupInfo.groupName}</p>
          )}
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            {zh ? '填寫資料以繼續' : 'Fill in your details to continue'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {zh ? '顯示名稱' : 'Display Name'} *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={zh ? '您的名字' : 'What should we call you?'}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {zh ? '手機號碼' : 'Phone Number'} *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+886 900 000 123"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {zh ? '電子郵件（選填）' : 'Email (optional)'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !displayName.trim() || !phone.trim()}
            className="w-full mt-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading
              ? (zh ? '處理中…' : 'Processing…')
              : isGroup
                ? (zh ? '以訪客身份加入群組' : 'Join Group as Guest')
                : (zh ? '確認出席' : 'Confirm Attendance')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          {isGroup
            ? (zh ? '加入後您將以訪客帳號加入此群組。' : "You'll join as a guest member of this group.")
            : (zh ? '確認後您將被標記為出席。' : "You'll be marked as attending this event.")}
        </p>
      </div>
    </div>
  );
}
