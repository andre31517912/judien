'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch, apiUpload, resolveImageUrl } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';
import type { EventWithCounts, PaginatedResponse, News } from '@judien/shared';

const LocationPicker = dynamic(() => import('../../../components/LocationPickerInner'), { ssr: false });

type PageScope = 'home' | 'future' | 'past';

export default function EventsPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [scope, setScope] = useState<PageScope>('home');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [lineNewBanner, setLineNewBanner] = useState(false);

  // Search query comes from URL ?q= param (set by the NavBar search input)
  const searchQuery = searchParams.get('q') ?? '';

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
    if (authLoading) return;
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
  }, [scope, page, authLoading]);

  const filteredEvents = events.filter((event) => {
    const title = zh ? event.title_zh : event.title_en;
    const q = searchQuery.toLowerCase();
    return !q || title.toLowerCase().includes(q);
  });

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

  const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div>
      {/* LINE new user banner */}
      {lineNewBanner && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[#06C755]/10 border border-[#06C755]/30 p-4">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#06C755] shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.477 2 2 6.036 2 11.07c0 4.522 3.613 8.312 8.5 8.94v2.99s-.01.3.18.37c.23.08.36-.14.36-.14l2.17-2.89c.26.02.53.03.79.03 5.523 0 10-4.036 10-9.07C24 6.036 17.523 2 12 2z"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {zh ? '歡迎加入 Judien！' : 'Welcome to Judien! 🎉'}
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

      {/* Tabs + action button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['home', 'future', 'past'] as PageScope[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                setScope(s);
                if (s !== 'home') setPage(1);
                // Clear the URL search param when switching tabs
                router.replace(`/${params.locale}/events`);
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                scope === s
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {s === 'home'
                ? (zh ? '動態' : 'Feed')
                : s === 'future'
                  ? (zh ? '即將到來' : 'Upcoming')
                  : (zh ? '過往活動' : 'Past')}
            </button>
          ))}
        </div>
        {user && scope !== 'home' && (
          <button
            onClick={() => { setCreatingEvent((v) => !v); setEventMsg(''); }}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 font-medium transition-colors"
          >
            {creatingEvent ? (zh ? '取消' : 'Cancel') : `＋ ${zh ? '建立活動' : 'Create Event'}`}
          </button>
        )}
        {user && scope === 'home' && (
          <button
            onClick={() => setComposing((v) => !v)}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 font-medium transition-colors"
          >
            {composing ? (zh ? '取消' : 'Cancel') : `＋ ${zh ? '建立貼文' : 'Create Post'}`}
          </button>
        )}
      </div>

      {/* ── Feed / News tab ── */}
      {scope === 'home' && (
        <div className="flex flex-col gap-4">
          {user && composing && (
            <form onSubmit={handleCreateNews} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 flex flex-col gap-3 border border-indigo-100 dark:border-indigo-900">
              <h3 className="font-semibold text-gray-800 dark:text-white">{zh ? '發布公告 📢' : 'New Post 📢'}</h3>
              {newsMsg && <p className="text-red-500 text-sm">{newsMsg}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '標題' : 'Title'}</label>
                <input className={inputCls} value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '內容' : 'Body'}</label>
                <textarea rows={3} className={inputCls} value={newsForm.body}
                  onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} />
              </div>
              <button type="submit" disabled={newsSaving} className="self-end bg-indigo-600 text-white text-sm px-5 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-60 font-medium transition-colors">
                {newsSaving ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布' : 'Post')}
              </button>
            </form>
          )}

          {newsError && <p className="text-sm text-red-500 dark:text-red-400">{newsError}</p>}
          {newsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : news.length === 0 && !composing ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🌟</p>
              <p className="text-gray-500 dark:text-gray-400 font-medium">{zh ? '沒有動態' : 'Nothing here yet'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{zh ? '管理員會在這裡發布最新消息' : 'Community updates will appear here'}</p>
            </div>
          ) : (
            news.map((item) => {
              const canEdit = item.createdById === user?.id || isAdmin;
              const isEditing = editingId === item.id;
              const initial = (item.createdBy?.displayName?.[0] ?? '?').toUpperCase();
              return (
                <div key={item.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 border border-gray-100 dark:border-gray-800">
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <input
                        className={inputCls}
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder={zh ? '標題' : 'Title'}
                      />
                      <textarea
                        rows={4}
                        className={`${inputCls} resize-none`}
                        value={editForm.body}
                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                        placeholder={zh ? '內容' : 'Body'}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                          {zh ? '取消' : 'Cancel'}
                        </button>
                        <button onClick={() => handleUpdateNews(item.id)} disabled={editSaving} className="rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                          {editSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {item.group && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-3">
                          👥 {item.group.name}
                        </span>
                      )}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-1.5 leading-snug">
                            {zh ? item.title_zh : item.title_en}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                            {zh ? item.body_zh : item.body_en}
                          </p>
                          <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {initial}
                            </div>
                            <div>
                              {item.createdBy?.displayName && (
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-none">{item.createdBy.displayName}</p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {new Date(item.createdAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <button
                              onClick={() => { setEditingId(item.id); setEditForm({ title: zh ? item.title_zh : item.title_en, body: zh ? item.body_zh : item.body_en }); }}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
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
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Create Event form ── */}
      {scope !== 'home' && isAdmin && creatingEvent && (
        <form onSubmit={handleCreateEvent} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 flex flex-col gap-4 border border-indigo-100 dark:border-indigo-900 mb-6">
          <h3 className="font-semibold text-gray-800 dark:text-white">{zh ? '建立活動 🗓️' : 'Create Event 🗓️'}</h3>
          {eventMsg && <p className="text-red-500 text-sm">{eventMsg}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '名稱' : 'Title'}</label>
            <input className={inputCls} value={eventForm.title} onChange={setEF('title')} placeholder="Event name" />
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
            <textarea rows={3} className={`${inputCls} resize-none`} value={eventForm.description} onChange={setEF('description')} placeholder="What's this event about?" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '開始' : 'Start'}</label>
              <input type="datetime-local" className={inputCls} value={eventForm.startAt} onChange={setEF('startAt')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '結束（選填）' : 'End (optional)'}</label>
              <input type="datetime-local" className={inputCls} value={eventForm.endAt} onChange={setEF('endAt')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '時區' : 'Timezone'}</label>
              <input className={inputCls} value={eventForm.timezone} onChange={setEF('timezone')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '費用' : 'Fee'}</label>
              <input type="number" className={inputCls} value={eventForm.feeAmount} onChange={setEF('feeAmount')} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '幣別' : 'Currency'}</label>
              <input className={inputCls} value={eventForm.feeCurrency} onChange={setEF('feeCurrency')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '封面照片（選填）' : 'Cover Photo (optional)'}</label>
            <div
              onClick={() => coverFileRef.current?.click()}
              className="relative w-full h-40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer overflow-hidden flex items-center justify-center transition"
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
          <button type="submit" className="self-end bg-indigo-600 text-white text-sm px-6 py-2.5 rounded-xl hover:bg-indigo-700 font-semibold transition-colors">
            {zh ? '建立活動' : 'Create Event'}
          </button>
        </form>
      )}

      {/* ── Events grid ── */}
      {scope !== 'home' && (
        <>
          {eventLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">📅</p>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {searchQuery
                  ? (zh ? '找不到符合的活動' : 'No matching events')
                  : (zh ? '目前沒有活動' : 'No events yet')}
              </p>
              {searchQuery && (
                <button
                  onClick={() => router.replace(`/${params.locale}/events`)}
                  className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {zh ? '清除搜尋' : 'Clear search'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} locale={params.locale} />
              ))}
            </div>
          )}

          {total > pageSize && (
            <div className="flex justify-center items-center gap-3 mt-10">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition text-lg"
              >
                ‹
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium min-w-[60px] text-center">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
                className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition text-lg"
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

const CARD_GRADIENTS = [
  'from-indigo-400 to-violet-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-purple-400 to-indigo-500',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-teal-500',
];

const CARD_EMOJIS = ['🎉', '🎊', '🍻', '🎸', '🌟', '🎨', '🏃', '☕', '🎭', '🎤', '🎮', '🌸'];

function EventCard({ event, locale }: { event: EventWithCounts; locale: string }) {
  const zh = locale === 'zh';
  const title = zh ? event.title_zh : event.title_en;
  const location = zh ? event.location_zh : event.location_en;

  const startDateObj = new Date(event.startAt);
  const dayStr = startDateObj.toLocaleDateString(zh ? 'zh-TW' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = startDateObj.toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });

  const fee = event.feeAmount ? `${event.feeCurrency} ${event.feeAmount}` : zh ? '免費' : 'Free';
  const isFree = !event.feeAmount;
  const coverUrl = resolveImageUrl(event.coverImageUrl);

  const hash = (event.id.charCodeAt(0) ?? 0) + (event.id.charCodeAt(2) ?? 0);
  const gradient = CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
  const emoji = CARD_EMOJIS[hash % CARD_EMOJIS.length];

  return (
    <Link
      href={`/${locale}/events/${event.id}`}
      className="group block bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-800 overflow-hidden hover:-translate-y-1"
    >
      {/* Cover image or gradient placeholder */}
      <div className="relative w-full aspect-video overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-5xl drop-shadow-sm select-none">{emoji}</span>
          </div>
        )}
        {/* Fee badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-sm ${
            isFree
              ? 'bg-emerald-500 text-white'
              : 'bg-amber-500 text-white'
          }`}>
            {fee}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Date */}
        <div className="flex items-center gap-1.5 mb-2">
          <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
            {dayStr} · {timeStr}
          </span>
        </div>

        {/* Title */}
        <h2 className="font-bold text-base text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2">
          {title}
        </h2>

        {/* Group */}
        {event.groupName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1 truncate">
            <span>👥</span>
            <span className="truncate">{event.groupName}</span>
          </p>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-start gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{location}</p>
          </div>
        )}

        {/* Attendee count */}
        {event.rsvpCounts.GOING > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {Array.from({ length: Math.min(3, event.rsvpCounts.GOING) }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[9px]"
                >
                  😊
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {event.rsvpCounts.GOING} {zh ? '人參加' : 'going'}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
