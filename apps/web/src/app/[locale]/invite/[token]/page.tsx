'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';
import type { EventWithCounts } from '@judien/shared';

type InviteType = 'event' | 'group' | 'unknown' | 'loading';

type GroupInviteInfo = {
  groupName: string;
  groupId: string;
};

export default function InviteAcceptPage() {
  const params = useParams<{ locale: string; token: string }>();
  const router = useRouter();
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
      await apiFetch<{ user: unknown; accessToken: string }>(
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
      router.push(`/${params.locale}/groups`);
    } catch (err: unknown) {
      setError((err as Error).message || (zh ? '無法加入群組' : 'Failed to join group'));
    } finally {
      setLoading(false);
    }
  };

  if (inviteType === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
        <p className="text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
      </div>
    );
  }

  if (inviteType === 'unknown') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">{isGroup ? '👥' : '🎉'}</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isGroup
              ? (zh ? '您收到群組邀請！' : "You're invited to join a group!")
              : (zh ? '您收到活動邀請！' : "You're invited!")}
          </h1>
          {isGroup && groupInfo && (
            <p className="text-indigo-600 font-medium mt-1">{groupInfo.groupName}</p>
          )}
          <p className="text-gray-500 text-sm mt-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {zh ? '顯示名稱' : 'Display Name'} *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={zh ? '您的名字' : 'What should we call you?'}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {zh ? '手機號碼' : 'Phone Number'} *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+886 900 000 123"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {zh ? '電子郵件（選填）' : 'Email (optional)'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

        <p className="text-center text-xs text-gray-500 mt-4">
          {isGroup
            ? (zh ? '加入後您將以訪客帳號加入此群組。' : "You'll join as a guest member of this group.")
            : (zh ? '確認後您將被標記為出席。' : "You'll be marked as attending this event.")}
        </p>
      </div>
    </div>
  );
}
