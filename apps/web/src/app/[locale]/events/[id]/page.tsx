'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';
import { useAuth } from '../../../../context/auth.context';
import type { EventWithCounts, Comment, PaginatedResponse } from '@judien/shared';

export default function EventDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const locale = params.locale;
  const zh = locale === 'zh';
  const { user } = useAuth();

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<EventWithCounts>(`/events/${params.id}`),
      apiFetch<PaginatedResponse<Comment>>(`/events/${params.id}/comments`),
    ]).then(([ev, comms]) => {
      setEvent(ev);
      setRsvpStatus(ev.myRsvp);
      setComments(comms.data);
      setLoading(false);
    });
  }, [params.id]);

  const handleRsvp = async (status: 'GOING' | 'MAYBE' | 'NO') => {
    if (!user) return;
    if (rsvpStatus === status) {
      // Already selected — toggle off (remove RSVP)
      await apiFetch(`/events/${params.id}/rsvp`, { method: 'DELETE' });
      setRsvpStatus(null);
    } else {
      await apiFetch(`/events/${params.id}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      setRsvpStatus(status);
    }
    // Refresh counts
    const ev = await apiFetch<EventWithCounts>(`/events/${params.id}`);
    setEvent(ev);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    const c = await apiFetch<Comment>(`/events/${params.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: commentBody }),
    });
    setComments((prev) => [...prev, c]);
    setCommentBody('');
  };

  const handleDeleteComment = async (id: string) => {
    await apiFetch(`/comments/${id}`, { method: 'DELETE' });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDeleteEvent = async () => {
    if (!confirm('Delete this event permanently?')) return;
    await apiFetch(`/events/${params.id}`, { method: 'DELETE' });
    router.push(`/${locale}/events`);
  };

  if (loading) return <p className="text-gray-500 mt-8">{zh ? '載入中…' : 'Loading…'}</p>;
  if (!event) return <p className="text-red-500 mt-8">Event not found.</p>;

  const title = zh ? event.title_zh : event.title_en;
  const description = zh ? event.description_zh : event.description_en;
  const location = zh ? event.location_zh : event.location_en;

  const startDate = new Date(event.startAt).toLocaleString(
    zh ? 'zh-TW' : 'en-US',
    { dateStyle: 'full', timeStyle: 'short' },
  );

  const fee = event.feeAmount
    ? `${event.feeCurrency} ${event.feeAmount}`
    : zh ? '免費' : 'Free';

  const rsvpBtn = (status: 'GOING' | 'MAYBE' | 'NO', label: string) => (
    <button
      key={status}
      onClick={() => handleRsvp(status)}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
        rsvpStatus === status
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Admin toolbar */}
      {user?.role === 'ADMIN' ? (
        <div className="flex gap-3 py-2 border-b border-dashed border-gray-200">
          <a
            href={`/${locale}/events`}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mr-2"
          >
            ← Back
          </a>
          <a
            href={`/${locale}/admin/events/${params.id}/edit`}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
          >
            ✏️ Edit Event
          </a>
          <button
            onClick={handleDeleteEvent}
            className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600"
          >
            🗑 Delete Event
          </button>
        </div>
      ) : (
        <a
          href={`/${locale}/events`}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 self-start"
        >
          ← Back
        </a>
      )}

      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImageUrl}
          alt={title}
          className="w-full h-60 object-cover rounded-xl"
        />
      ) : (
        <div className="w-full h-60 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50 border border-gray-100 flex flex-col items-center justify-center gap-3 select-none">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400 max-w-xs text-center truncate px-4">{title}</p>
        </div>
      )}

      <h1 className="text-3xl font-bold">{title}</h1>

      <div className="text-sm text-gray-600 space-y-1">
        {(event as any).createdByEmail && (
          <p>🎙 {(event as any).createdByEmail}</p>
        )}
        <p>📅 {startDate} ({event.timezone})</p>
        {location && <p>📍 {location}</p>}
        <p>💰 {fee}</p>
      </div>

      {description && (
        <p className="text-gray-800 whitespace-pre-wrap">{description}</p>
      )}

      {/* RSVP counts */}
      <div className="flex gap-4 text-sm text-gray-500">
        <span>✓ {event.rsvpCounts.GOING} {zh ? '參加' : 'Going'}</span>
        <span>? {event.rsvpCounts.MAYBE} {zh ? '也許' : 'Maybe'}</span>
        <span>✗ {event.rsvpCounts.NO} {zh ? '不參加' : 'Not Going'}</span>
      </div>

      {/* RSVP buttons (requires login) */}
      {user ? (
        <div className="flex gap-3">
          {rsvpBtn('GOING', zh ? '參加' : 'Going')}
          {rsvpBtn('MAYBE', zh ? '也許' : 'Maybe')}
          {rsvpBtn('NO', zh ? '不參加' : 'Not Going')}
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          {zh ? '請登入以回覆 RSVP。' : 'Log in to RSVP.'}
        </p>
      )}

      {/* Comments */}
      <section>
        <h2 className="text-lg font-semibold mb-3">{zh ? '留言' : 'Comments'}</h2>

        {comments.length === 0 && (
          <p className="text-sm text-gray-400">{zh ? '目前沒有留言。' : 'No comments yet.'}</p>
        )}

        <div className="flex flex-col gap-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="bg-white rounded-lg p-3 shadow-sm relative">
              <p className="text-xs text-gray-400 mb-1">{c.userHandle}</p>
              <p className="text-sm text-gray-800">{c.body}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(c.createdAt).toLocaleString()}
              </p>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="absolute top-2 right-2 text-xs text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {user && (
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={zh ? '寫下留言…' : 'Write a comment…'}
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
            >
              {zh ? '送出' : 'Post'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
