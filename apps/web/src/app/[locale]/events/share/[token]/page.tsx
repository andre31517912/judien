'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { apiFetch, resolveImageUrl } from '../../../../../lib/api';
import { useAuth } from '../../../../../context/auth.context';
import type { EventWithCounts } from '@judien/shared';

type GuestEntry = { handle: string; displayName: string | null; source: 'user' | 'guest' };
type Guests = { GOING: GuestEntry[]; NO: GuestEntry[] };

export default function SharedEventPage() {
  const params = useParams<{ locale: string; token: string }>();
  const locale = params.locale;
  const token = params.token;
  const zh = locale === 'zh';
  const { user, signup } = useAuth();

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [guests, setGuests] = useState<Guests | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [rsvpDone, setRsvpDone] = useState(false);

  // Signup form state
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showGuestFallback, setShowGuestFallback] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: '', phoneE164: '', email: '' });

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [eventRes, guestsRes] = await Promise.all([
        apiFetch<EventWithCounts>(`/events/share/${token}`),
        apiFetch<Guests>(`/events/share/${token}/rsvp/guests`),
      ]);
      setEvent(eventRes);
      setGuests(guestsRes);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load shared event.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [token]);

  const handleSignupAndRsvp = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password.trim()) {
      setError(zh ? '請填寫所有欄位。' : 'Please fill in all fields.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await signup({
        displayName: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        preferredLanguage: zh ? 'zh' : 'en',
      });
      await apiFetch(`/events/share/${token}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status: 'GOING' }),
      });
      setRsvpDone(true);
      await refresh();
    } catch (err: unknown) {
      setError((err as Error).message ?? (zh ? '建立帳號失敗，請再試一次。' : 'Failed to create account. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleLoggedInRsvp = async (status: 'GOING' | 'NO') => {
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/events/share/${token}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (err: unknown) {
      setError((err as Error).message ?? (zh ? 'RSVP 失敗。' : 'Failed to submit RSVP.'));
    } finally {
      setSaving(false);
    }
  };

  const handleGuestRsvp = async (status: 'GOING' | 'NO') => {
    if (!guestForm.name.trim() || !guestForm.phoneE164.trim() || !guestForm.email.trim()) {
      setError(zh ? '請先填寫姓名、電話與 Email。' : 'Please enter name, phone, and email first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/events/share/${token}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          guest: { name: guestForm.name.trim(), phoneE164: guestForm.phoneE164.trim(), email: guestForm.email.trim() },
        }),
      });
      setRsvpDone(true);
      await refresh();
    } catch (err: unknown) {
      setError((err as Error).message ?? (zh ? 'RSVP 失敗。' : 'Failed to submit RSVP.'));
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(zh ? '複製失敗，請手動複製網址。' : 'Copy failed. Please copy the URL manually.');
    }
  };

  if (loading) {
    return <p className="mt-10 text-sm text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>;
  }

  if (!event) {
    return <p className="mt-10 text-sm text-red-500">{error || (zh ? '找不到分享活動。' : 'Shared event not found.')}</p>;
  }

  const title = event.title;
  const description = event.description;
  const location = event.location;
  const isPast = new Date(event.startAt) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={copyLink} className="text-sm rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          {copied ? (zh ? '已複製' : 'Copied') : (zh ? '複製分享連結' : 'Copy Share Link')}
        </button>
      </div>

      {resolveImageUrl(event.coverImageUrl) ? (
        <div className="relative w-full h-56 rounded-xl overflow-hidden">
          <Image src={resolveImageUrl(event.coverImageUrl)!} alt={title} fill className="object-cover" />
        </div>
      ) : (
        <div className="w-full h-40 rounded-xl bg-indigo-600 flex items-center justify-center">
          <svg className="w-12 h-12 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {event.groupName ? <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-400">{event.groupName}</p> : null}
      </div>

      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
        <p>{new Date(event.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US')}</p>
        {location ? <p>{location}</p> : null}
      </div>

      {description ? <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{description}</p> : null}

      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>✓ {event.rsvpCounts.GOING} {zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going')}</span>
        <span>✕ {event.rsvpCounts.NO} {zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't Attend" : 'Not Going')}</span>
      </div>

      {!isPast && (
        <div className="space-y-3">
          {/* Logged-in RSVP */}
          {user && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {zh ? `以 ${user.displayName ?? user.email ?? user.phoneE164} 身份回覆：` : `RSVP as ${user.displayName ?? user.email ?? user.phoneE164}:`}
              </p>
              <div className="flex gap-2 flex-wrap">
                {(['GOING', 'NO'] as const).map((s) => (
                  <button key={s} onClick={() => handleLoggedInRsvp(s)} disabled={saving}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                      event.myRsvp === s
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400'
                    } disabled:opacity-50`}>
                    {s === 'GOING' ? (zh ? '參加' : 'Going') : (zh ? '不參加' : 'Not Going')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Signup + RSVP for non-logged-in users */}
          {!user && !rsvpDone && !showGuestFallback && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {zh ? '建立帳號並加入活動' : 'Create Account & Join Event'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {zh
                    ? '免費建立帳號，即可參加此活動。不會自動加入群組。'
                    : 'Create a free account to RSVP to this event. You won\'t be added to the group automatically.'}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={zh ? '姓名' : 'Name'} autoComplete="name"
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder={zh ? '電子郵件' : 'Email'} type="email" autoComplete="email"
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder={zh ? '電話 (+886...)' : 'Phone (+886...)'} type="tel" autoComplete="tel"
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder={zh ? '密碼（至少 8 字元）' : 'Password (min. 8 chars)'} type="password" autoComplete="new-password"
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button onClick={handleSignupAndRsvp} disabled={saving}
                className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition">
                {saving ? (zh ? '處理中…' : 'Processing…') : (zh ? '建立帳號並參加活動 →' : 'Create Account & Join Event →')}
              </button>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {zh ? '已有帳號？' : 'Already have an account?'}{' '}
                <Link href={`/${locale}/login?next=${encodeURIComponent(shareUrl)}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  {zh ? '登入' : 'Log in'}
                </Link>
                {' · '}
                <Link href={`/${locale}/forgot-password?next=${encodeURIComponent(shareUrl)}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline">
                  {zh ? '忘記密碼？' : 'Forgot password?'}
                </Link>
                {' · '}
                <button onClick={() => setShowGuestFallback(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {zh ? '不建立帳號繼續' : 'Continue without account'}
                </button>
              </p>
            </div>
          )}

          {/* Guest RSVP fallback */}
          {!user && !rsvpDone && showGuestFallback && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{zh ? '以訪客身份回覆' : 'RSVP as guest'}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input value={guestForm.name} onChange={(e) => setGuestForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={zh ? '姓名' : 'Name'}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={guestForm.phoneE164} onChange={(e) => setGuestForm((p) => ({ ...p, phoneE164: e.target.value }))}
                  placeholder={zh ? '電話 (+886...)' : 'Phone (+886...)'}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={guestForm.email} onChange={(e) => setGuestForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder={zh ? '電子郵件' : 'Email'}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['GOING', 'NO'] as const).map((s) => (
                  <button key={s} onClick={() => handleGuestRsvp(s)} disabled={saving}
                    className="px-4 py-2 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-indigo-400 disabled:opacity-50 transition">
                    {s === 'GOING' ? (zh ? '參加' : 'Going') : (zh ? '不參加' : 'Not Going')}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowGuestFallback(false)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                ← {zh ? '返回建立帳號' : 'Back to create account'}
              </button>
            </div>
          )}

          {/* RSVP success (guest/signup done) */}
          {rsvpDone && !user && (
            <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 p-4">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                {zh ? '你已成功回覆！' : "You're in!"}
              </p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                {zh ? '你的 RSVP 已記錄。' : 'Your RSVP has been recorded.'}
              </p>
            </div>
          )}
        </div>
      )}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {guests && (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">{zh ? '出席名單' : 'Attendance'}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(['GOING', 'NO'] as const).map((status) => (
              <div key={status} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  {status === 'GOING' ? (zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going')) : (zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't Attend" : 'Not Going'))}
                </p>
                {(guests[status] ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{zh ? '尚無' : 'None yet'}</p>
                ) : (
                  <div className="space-y-1">
                    {guests[status].map((g, idx) => (
                      <p key={`${status}-${idx}`} className="text-xs text-gray-700 dark:text-gray-300 truncate">
                        {g.displayName ?? g.handle}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
