'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { apiFetch, resolveImageUrl } from '../../../../../lib/api';
import { useAuth } from '../../../../../context/auth.context';
import type { EventWithCounts } from '@judien/shared';

type GuestIdentity = {
  name: string;
  phoneE164: string;
  email: string;
};

type GuestEntry = { handle: string; displayName: string | null; source: 'user' | 'guest' };
type Guests = { GOING: GuestEntry[]; NO: GuestEntry[] };

const GUEST_IDENTITY_KEY = 'shared_event_guest_identity_v1';

export default function SharedEventPage() {
  const params = useParams<{ locale: string; token: string }>();
  const locale = params.locale;
  const token = params.token;
  const zh = locale === 'zh';
  const { user } = useAuth();

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [guests, setGuests] = useState<Guests | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [guest, setGuest] = useState<GuestIdentity>({ name: '', phoneE164: '', email: '' });

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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GUEST_IDENTITY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GuestIdentity;
        if (parsed?.name && parsed?.phoneE164 && parsed?.email) {
          setGuest(parsed);
        }
      }
    } catch {
      // ignore malformed local data
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleRsvp = async (status: 'GOING' | 'NO') => {
    setSaving(true);
    setError('');
    try {
      if (user) {
        await apiFetch(`/events/share/${token}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({ status }),
        });
      } else {
        if (!guest.name.trim() || !guest.phoneE164.trim() || !guest.email.trim()) {
          setError(zh ? '請先填寫姓名、電話與 Email。' : 'Please enter name, phone, and email first.');
          setSaving(false);
          return;
        }

        await apiFetch(`/events/share/${token}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({
            status,
            guest: {
              name: guest.name.trim(),
              phoneE164: guest.phoneE164.trim(),
              email: guest.email.trim(),
            },
          }),
        });

        window.localStorage.setItem(
          GUEST_IDENTITY_KEY,
          JSON.stringify({
            name: guest.name.trim(),
            phoneE164: guest.phoneE164.trim(),
            email: guest.email.trim(),
          }),
        );
      }

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

  const title = zh ? event.title_zh : event.title_en;
  const description = zh ? event.description_zh : event.description_en;
  const location = zh ? event.location_zh : event.location_en;

  const isPast = event ? new Date(event.startAt) < new Date() : false;

  const rsvpBtn = (status: 'GOING' | 'NO', label: string) => (
    <button
      key={status}
      onClick={() => handleRsvp(status)}
      disabled={saving}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
        event.myRsvp === status
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400'
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={copyLink} className="text-sm rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          {copied ? (zh ? '已複製' : 'Copied') : (zh ? '複製分享連結' : 'Copy Share Link')}
        </button>
      </div>

      {resolveImageUrl(event.coverImageUrl) ? (
        <div className="relative w-full h-56 rounded-xl overflow-hidden">
          <Image src={resolveImageUrl(event.coverImageUrl)!} alt={title} fill className="object-cover" />
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {event.groupName ? <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-400">{event.groupName}</p> : null}
      </div>

      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
        <p>{new Date(event.startAt).toLocaleString(zh ? 'zh-TW' : 'en-US')}</p>
        {location ? <p>{location}</p> : null}
      </div>

      {description ? <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{description}</p> : null}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>✓ {event.rsvpCounts.GOING} {zh ? (isPast ? '出席' : '參加') : (isPast ? 'Attended' : 'Going')}</span>
          <span>✕ {event.rsvpCounts.NO} {zh ? (isPast ? '未出席' : '不參加') : (isPast ? "Didn't Attend" : 'Not Going')}</span>
        </div>

        {!isPast && !user && (
          <div className="grid gap-2 md:grid-cols-3">
            <input
              value={guest.name}
              onChange={(e) => setGuest((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={zh ? '姓名' : 'Name'}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <input
              value={guest.phoneE164}
              onChange={(e) => setGuest((prev) => ({ ...prev, phoneE164: e.target.value }))}
              placeholder={zh ? '電話 (+886...)' : 'Phone (+886...)'}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <input
              value={guest.email}
              onChange={(e) => setGuest((prev) => ({ ...prev, email: e.target.value }))}
              placeholder={zh ? '電子郵件' : 'Email'}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        )}

        {!isPast && (
        <div className="flex gap-2 flex-wrap">
          {rsvpBtn('GOING', zh ? '參加' : 'Going')}
          {rsvpBtn('NO', zh ? '不參加' : 'Not Going')}
        </div>
        )}

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>

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
