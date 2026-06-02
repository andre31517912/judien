'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { apiFetch, apiUpload, resolveImageUrl } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';
import type { EventWithCounts, PaginatedResponse, News } from '@judien/shared';

const LocationPicker = dynamic(() => import('../../../components/LocationPickerInner'), { ssr: false });

type PageScope = 'home' | 'future' | 'past';

export default function EventsPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [scope, setScope] = useState<PageScope>('home');
  const searchParams = useSearchParams();
  const [lineNewBanner, setLineNewBanner] = useState(false);

  useEffect(() => {
    if (searchParams.get('line_new') === '1') {
      setLineNewBanner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Events state ──────────────────────────────────────────────────────────
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [eventLoading, setEventLoading] = useState(false);
  const pageSize = 20;

  // ── News state ────────────────────────────────────────────────────────────
  const [news, setNews] = useState<News[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [composing, setComposing] = useState(false);
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: '', body: '' });
  const [newsMsg, setNewsMsg] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', body: '' });
  const [editSaving, setEditSaving] = useState(false);

  // ── Create Event inline form state ───────────────────────────────────────
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventMsg, setEventMsg] = useState('');
  const [eventForm, setEventForm] = useState({
    title: '', description: '', location: '',
    startAt: '', endAt: '', timezone: 'Asia/Taipei',
    feeAmount: '', feeCurrency: 'TWD',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const setEF = (k: keyof typeof eventForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEventForm((prev) => ({ ...prev, [k]: e.target.value }));

  const loadNews = () => {
    setNewsLoading(true);
    setNewsError('');
    apiFetch<News[]>('/news')
      .then(setNews)
      .catch((err: unknown) => setNewsError((err as Error).message ?? 'Failed to load feed.'))
      .finally(() => setNewsLoading(false));
  };

  useEffect(() => {
    if (scope === 'home') {
      loadNews();
    } else {
      setEventLoading(true);
      apiFetch<PaginatedResponse<EventWithCounts>>(
        `/events?scope=${scope}&page=${page}&pageSize=${pageSize}`,
      )
        .then((res) => { setEvents(res.data); setTotal(res.total); })
        .finally(() => setEventLoading(false));
    }
  }, [scope, page]);

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsMsg('');
    if (!newsForm.title.trim()) { setNewsMsg(zh ? '請輸入標題' : 'Title is required.'); return; }
    if (!newsForm.body.trim()) { setNewsMsg(zh ? '請輸入內容' : 'Body is required.'); return; }
    setNewsSaving(true);
    try {
      await apiFetch('/news', { method: 'POST', body: JSON.stringify({
        title_en: newsForm.title, title_zh: newsForm.title,
        body_en: newsForm.body, body_zh: newsForm.body,
      }) });
      setNewsForm({ title: '', body: '' });
      setComposing(false);
      loadNews();
    } catch (err: any) {
      setNewsMsg(err.message ?? 'Error posting.');
    } finally {
      setNewsSaving(false);
    }
  };

  const handleEventFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventMsg('');
    if (!eventForm.title.trim()) { setEventMsg(zh ? '請輸入名稱' : 'Title is required.'); return; }
    if (!eventForm.startAt) { setEventMsg(zh ? '請選擇開始時間' : 'Start time is required.'); return; }
    try {
      let coverImageUrl: string | null = null;
      if (coverFile) {
        const uploaded = await apiUpload(coverFile);
        coverImageUrl = uploaded.url;
      }
      const body: Record<string, unknown> = {
        title_en: eventForm.title, title_zh: eventForm.title,
        description_en: eventForm.description, description_zh: eventForm.description,
        location_en: eventForm.location, location_zh: eventForm.location,
        startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : undefined,
        endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : null,
        timezone: eventForm.timezone,
        feeAmount: eventForm.feeAmount ? parseFloat(eventForm.feeAmount) : null,
        feeCurrency: eventForm.feeCurrency || 'TWD',
        coverImageUrl,
      };
      await apiFetch<EventWithCounts>('/events', { method: 'POST', body: JSON.stringify(body) });
      setEventForm({ title: '', description: '', location: '', startAt: '', endAt: '', timezone: 'Asia/Taipei', feeAmount: '', feeCurrency: 'TWD' });
      setCoverFile(null);
      setCoverPreview(null);
      setCreatingEvent(false);
      // Refresh events list
      setEventLoading(true);
      apiFetch<PaginatedResponse<EventWithCounts>>(
        `/events?scope=${scope}&page=${page}&pageSize=${pageSize}`,
      ).then((res) => { setEvents(res.data); setTotal(res.total); }).finally(() => setEventLoading(false));
    } catch (err: unknown) {
      setEventMsg((err as Error).message ?? 'Error creating event.');
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm(zh ? '確定要刪除此公告嗎？' : 'Delete this post?')) return;
    try {
      await apiFetch(`/news/${id}`, { method: 'DELETE' });
      loadNews();
    } catch (err: unknown) {
      setNewsError((err as Error).message ?? 'Failed to delete post.');
    }
  };

  const handleUpdateNews = async (id: string) => {
    if (!editForm.title.trim()) { setNewsError(zh ? '請輸入標題。' : 'Title is required.'); return; }
    if (!editForm.body.trim()) { setNewsError(zh ? '請輸入內容。' : 'Body is required.'); return; }
    setEditSaving(true);
    try {
      await apiFetch(`/news/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title_en: editForm.title, title_zh: editForm.title,
          body_en: editForm.body, body_zh: editForm.body,
        }),
      });
      setEditingId(null);
      loadNews();
    } catch (err: unknown) {
      setNewsError((err as Error).message ?? 'Failed to update post.');
    } finally {
      setEditSaving(false);
    }
  };

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${
      active ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  return (
    <div>
      {/* LINE new user banner */}
      {lineNewBanner && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-[#06C755]/10 border border-[#06C755]/30 p-4">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#06C755] shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.477 2 2 6.036 2 11.07c0 4.522 3.613 8.312 8.5 8.94v2.99s-.01.3.18.37c.23.08.36-.14.36-.14l2.17-2.89c.26.02.53.03.79.03 5.523 0 10-4.036 10-9.07C24 6.036 17.523 2 12 2z"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {zh ? '歡迎加入 Judien！' : 'Welcome to Judien!'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {zh
                ? '加入我們的 LINE 官方帳號，接收活動提醒與通知。'
                : 'Add our LINE official account to receive event reminders and notifications.'}
            </p>
            {process.env.NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_ID && (
              <a
                href={`https://line.me/ti/p/@${process.env.NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-[#06C755] hover:underline"
              >
                {zh ? '➕ 加入好友' : '➕ Add as Friend'}
              </a>
            )}
          </div>
          <button onClick={() => setLineNewBanner(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0">×</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-0">
          <button className={tabCls(scope === 'home')} onClick={() => setScope('home')}>
            {zh ? '動態' : 'Feed'}
          </button>
          <button className={tabCls(scope === 'future')} onClick={() => { setScope('future'); setPage(1); }}>
            {zh ? '即將到來' : 'Upcoming'}
          </button>
          <button className={tabCls(scope === 'past')} onClick={() => { setScope('past'); setPage(1); }}>
            {zh ? '過往活動' : 'Past'}
          </button>
        </div>
        {isAdmin && scope !== 'home' && (
          <button
            onClick={() => { setCreatingEvent((v) => !v); setEventMsg(''); }}
            className="mb-1 bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-indigo-700"
          >
            {creatingEvent ? (zh ? '取消' : 'Cancel') : `+ ${zh ? '建立活動' : 'Create Event'}`}
          </button>
        )}
        {user && scope === 'home' && (
          <button
            onClick={() => setComposing((v) => !v)}
            className="mb-1 bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-indigo-700"
          >
            {composing ? (zh ? '取消' : 'Cancel') : `+ ${zh ? '發布公告' : 'Create Post'}`}
          </button>
        )}
      </div>

      {/* ── Home / News tab ── */}
      {scope === 'home' && (
        <div className="flex flex-col gap-4">
          {user && composing && (
            <form onSubmit={handleCreateNews} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-5 flex flex-col gap-3 border border-indigo-100 dark:border-indigo-900">
              <h3 className="font-semibold text-gray-800 dark:text-white">{zh ? '發布公告' : 'Create Post'}</h3>
              {newsMsg && <p className="text-red-500 text-sm">{newsMsg}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '標題' : 'Title'}</label>
                <input className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '內容' : 'Body'}</label>
                <textarea rows={3} className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" value={newsForm.body}
                  onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} />
              </div>
              <button type="submit" disabled={newsSaving} className="self-end bg-indigo-600 text-white text-sm px-5 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-60">
                {newsSaving ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布' : 'Post')}
              </button>
            </form>
          )}

          {newsError && <p className="text-sm text-red-500 dark:text-red-400">{newsError}</p>}
          {newsLoading ? (
            <p className="text-gray-500 dark:text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
          ) : news.length === 0 && !composing ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-gray-500 dark:text-gray-400">{zh ? '目前沒有公告，一切都是最新的！' : "No news yet — you're all caught up!"}</p>
            </div>
          ) : (
            news.map((item) => {
              const canEdit = item.createdById === user?.id || isAdmin;
              const isEditing = editingId === item.id;
              return (
                <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition p-5 border border-gray-100 dark:border-gray-800">
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <input
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder={zh ? '標題' : 'Title'}
                      />
                      <textarea
                        rows={4}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        value={editForm.body}
                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                        placeholder={zh ? '內容' : 'Body'}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                          {zh ? '取消' : 'Cancel'}
                        </button>
                        <button onClick={() => handleUpdateNews(item.id)} disabled={editSaving} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                          {editSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {item.group && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                            👥 {item.group.name}
                          </span>
                        )}
                        <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                          {zh ? item.title_zh : item.title_en}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{zh ? item.body_zh : item.body_en}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                          {item.createdBy?.displayName && (
                            <span className="mr-2">{zh ? '發布者：' : 'By '}{item.createdBy.displayName} ·</span>
                          )}
                          {new Date(item.createdAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <button
                            onClick={() => { setEditingId(item.id); setEditForm({ title: zh ? item.title_zh : item.title_en, body: zh ? item.body_zh : item.body_en }); }}
                            className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                          >
                            {zh ? '編輯' : 'Edit'}
                          </button>
                          <button onClick={() => handleDeleteNews(item.id)}
                            className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 text-xs flex-shrink-0">
                            {zh ? '刪除' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {scope !== 'home' && isAdmin && creatingEvent && (
        <form onSubmit={handleCreateEvent} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-5 flex flex-col gap-4 border border-indigo-100 dark:border-indigo-900 mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-white">{zh ? '建立活動' : 'Create Event'}</h3>
          {eventMsg && <p className="text-red-500 text-sm">{eventMsg}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '名稱' : 'Title'}</label>
            <input className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={eventForm.title} onChange={setEF('title')} placeholder="Event name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '地點' : 'Location'}</label>
              <LocationPicker
                value={eventForm.location}
                onChange={(v) => setEventForm((prev) => ({ ...prev, location: v }))}
                showMapPreview={false}
              />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '描述' : 'Description'}</label>
            <textarea rows={3} className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={eventForm.description} onChange={setEF('description')} placeholder="What's this event about?" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '開始' : 'Start'}</label>
              <input type="datetime-local" className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={eventForm.startAt} onChange={setEF('startAt')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '結束（選填）' : 'End (optional)'}</label>
              <input type="datetime-local" className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={eventForm.endAt} onChange={setEF('endAt')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '時區' : 'Timezone'}</label>
              <input className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={eventForm.timezone} onChange={setEF('timezone')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '費用' : 'Fee'}</label>
              <input type="number" className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={eventForm.feeAmount} onChange={setEF('feeAmount')} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '幣別' : 'Currency'}</label>
              <input className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={eventForm.feeCurrency} onChange={setEF('feeCurrency')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '封面照片（選填）' : 'Cover Photo (optional)'}</label>
            <div
              onClick={() => coverFileRef.current?.click()}
              className="relative w-full h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer overflow-hidden flex items-center justify-center transition"
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500 select-none">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">{zh ? '點擊上傳照片' : 'Click to upload a photo'}</span>
                </div>
              )}
              {coverPreview && (
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); setCoverFile(null); setCoverPreview(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
                >✕</button>
              )}
            </div>
            <input ref={coverFileRef} type="file" accept="image/*" onChange={handleEventFileChange} className="hidden" />
          </div>
          <button type="submit" className="self-end bg-indigo-600 text-white text-sm px-5 py-2 rounded-md hover:bg-indigo-700 font-medium">
            {zh ? '建立' : 'Create'}
          </button>
        </form>
      )}

      {/* ── Events tabs ── */}
      {scope !== 'home' && (
        <>
          {eventLoading ? (
            <p className="text-gray-500 dark:text-gray-400">{zh ? '載入中…' : 'Loading…'}</p>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-500 dark:text-gray-400">{zh ? '目前沒有活動，一切都是最新的！' : "No events yet — you're all caught up!"}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} locale={params.locale} />
              ))}
            </div>
          )}

          {total > pageSize && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40"
              >
                ‹
              </button>
              <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          )}
        </>
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
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 dark:border-gray-800">
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
          <h2 className="font-semibold text-lg truncate text-gray-900 dark:text-white">{title}</h2>
          {event.groupName && <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">👥 {event.groupName}</p>}
          <p className="text-sm text-gray-500 dark:text-gray-400">{startDate}</p>
          {location && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{location}</p>}
          <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">{fee}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            ✓ {event.rsvpCounts.GOING} &nbsp; ? {event.rsvpCounts.MAYBE} &nbsp; ✗ {event.rsvpCounts.NO}
          </p>
        </div>
      </Link>
    </div>
  );
}
