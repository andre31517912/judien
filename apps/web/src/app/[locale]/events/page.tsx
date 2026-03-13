'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch, resolveImageUrl } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';
import type { EventWithCounts, PaginatedResponse } from '@judien/shared';

export default function EventsPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [scope, setScope] = useState<'future' | 'past'>('future');
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<EventWithCounts>>(
      `/events?scope=${scope}&page=${page}&pageSize=${pageSize}`,
    )
      .then((res) => {
        setEvents(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [scope, page]);

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${
      active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 border-b">
        <div className="flex gap-0">
          <button className={tabCls(scope === 'future')} onClick={() => { setScope('future'); setPage(1); }}>
            {zh ? '即將到來' : 'Upcoming'}
          </button>
          <button className={tabCls(scope === 'past')} onClick={() => { setScope('past'); setPage(1); }}>
            {zh ? '過往活動' : 'Past'}
          </button>
        </div>
        {isAdmin && (
          <Link
            href={`/${params.locale}/admin/events/new`}
            className="mb-1 bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-indigo-700"
          >
            + Create Event
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">{zh ? '載入中…' : 'Loading…'}</p>
      ) : events.length === 0 ? (
        <p className="text-gray-500">{zh ? '目前沒有活動。' : 'No events yet.'}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} locale={params.locale} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border disabled:opacity-40"
          >
            ‹
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {Math.ceil(total / pageSize)}
          </span>
          <button
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, locale }: { event: EventWithCounts; locale: string }) {
  const zh = locale === 'zh';
  const title = zh ? event.title_zh : event.title_en;
  const location = zh ? event.location_zh : event.location_en;
  const startDate = new Date(event.startAt).toLocaleString(
    zh ? 'zh-TW' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short' },
  );
  const fee = event.feeAmount
    ? `${event.feeCurrency} ${event.feeAmount}`
    : zh ? '免費' : 'Free';

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition">
      <Link
        href={`/${locale}/events/${event.id}`}
        className="flex gap-4 p-4"
      >
        {resolveImageUrl(event.coverImageUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImageUrl(event.coverImageUrl)!}
            alt={title}
            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg truncate">{title}</h2>
          <p className="text-sm text-gray-500">{startDate}</p>
          {location && <p className="text-sm text-gray-500 truncate">{location}</p>}
          <p className="text-sm text-indigo-600 mt-1">{fee}</p>
          <p className="text-xs text-gray-400 mt-1">
            ✓ {event.rsvpCounts.GOING} &nbsp; ? {event.rsvpCounts.MAYBE} &nbsp; ✗ {event.rsvpCounts.NO}
          </p>
        </div>
      </Link>

    </div>
  );
}
