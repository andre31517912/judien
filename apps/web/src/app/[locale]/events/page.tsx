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
import DateTimeInput from '../../../components/DateTimeInput';

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
  const [newsCoverFile, setNewsCoverFile] = useState<File | null>(null);
  const [newsCoverPreview, setNewsCoverPreview] = useState<string | null>(null);
  const newsCoverFileRef = useRef<HTMLInputElement>(null);

  // ── Create Event inline form state ───────────────────────────────────────
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventMsg, setEventMsg] = useState('');
  const [eventForm, setEventForm] = useState({
    title: '', description: '', location: '',
    mapAddress: '',
    startAt: '', endAt: '',
    feeAmount: '',
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
    const q = searchQuery.toLowerCase();
    return !q || event.title.toLowerCase().includes(q);
  });

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsMsg('');
    if (!newsForm.title.trim()) { setNewsMsg(zh ? '請輸入標題' : 'Title is required.'); return; }
    if (!newsForm.body.trim()) { setNewsMsg(zh ? '請輸入內容' : 'Body is required.'); return; }
    setNewsSaving(true);
    try {
      const created = await apiFetch<News>('/news', { method: 'POST', body: JSON.stringify({
        title: newsForm.title,
        body: newsForm.body,
      }) });
      if (newsCoverFile) {
        await apiUpload(`/news/${created.id}/cover`, newsCoverFile).catch(() => {});
      }
      setNewsForm({ title: '', body: '' });
      setNewsCoverFile(null);
      setNewsCoverPreview(null);
      if (newsCoverFileRef.current) newsCoverFileRef.current.value = '';
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
        title: eventForm.title,
        description: eventForm.description,
        location: eventForm.location,
        mapAddress: eventForm.mapAddress || null,
        startAt: eventForm.startAt ? new Date(eventForm.startAt).toISOString() : undefined,
        endAt: eventForm.endAt ? new Date(eventForm.endAt).toISOString() : null,
        feeAmount: eventForm.feeAmount ? parseFloat(eventForm.feeAmount) : null,
        coverImageUrl,
      };
      await apiFetch<EventWithCounts>('/events', { method: 'POST', body: JSON.stringify(body) });
      setEventForm({ title: '', description: '', location: '', mapAddress: '', startAt: '', endAt: '', feeAmount: '' });
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
          title: editForm.title,
          body: editForm.body,
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
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '封面圖片（選填）' : 'Cover image (optional)'}</label>
                {newsCoverPreview ? (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={newsCoverPreview} alt="preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setNewsCoverFile(null); setNewsCoverPreview(null); if (newsCoverFileRef.current) newsCoverFileRef.current.value = ''; }}
                      className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => newsCoverFileRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 py-3 text-xs text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition">
                    {zh ? '點擊選擇圖片（選填）' : 'Click to add cover image (optional)'}
                  </button>
                )}
                <input ref={newsCoverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return; setNewsCoverFile(f); setNewsCoverPreview(URL.createObjectURL(f));
                }} />
              </div>
              <button type="submit" disabled={newsSaving} className="self-end bg-indigo-600 text-white text-sm px-5 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-60 font-medium transition-colors">
                {newsSaving ? (zh ? '發布中…' : 'Posting…') : (zh ? '發布' : 'Post')}
              </button>
            </form>
          )}

          {editingId && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 flex flex-col gap-3 border border-indigo-100 dark:border-indigo-900">
              <h3 className="font-semibold text-gray-800 dark:text-white">{zh ? '編輯公告' : 'Edit Post'}</h3>
              {newsError && <p className="text-red-500 text-sm">{newsError}</p>}
              <input className={inputCls} value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder={zh ? '標題' : 'Title'} />
              <textarea rows={3} className={`${inputCls} resize-none`} value={editForm.body}
                onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} placeholder={zh ? '內容' : 'Body'} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingId(null)} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  {zh ? '取消' : 'Cancel'}
                </button>
                <button onClick={() => handleUpdateNews(editingId)} disabled={editSaving} className="rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                  {editSaving ? (zh ? '儲存中…' : 'Saving…') : (zh ? '儲存' : 'Save')}
                </button>
              </div>
            </div>
          )}

          {newsError && !editingId && <p className="text-sm text-red-500 dark:text-red-400">{newsError}</p>}
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
            <div className="grid grid-cols-3 gap-2">
              {news.map((item) => {
                const canEdit = item.createdById === user?.id || isAdmin;
                const hash = item.id.charCodeAt(0) + (item.id.charCodeAt(2) ?? 0);
                const grad = POST_GRADIENTS[hash % POST_GRADIENTS.length];
                const initial = (item.createdBy?.displayName?.[0] ?? '?').toUpperCase();
                return (
                  <div key={item.id} className={`relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${grad} shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5`}>
                    <Link href={`/${params.locale}/news/${item.id}`} className="absolute inset-0 z-0 block">
                      {item.coverImageUrl && (
                        <Image src={resolveImageUrl(item.coverImageUrl)!} alt={item.title} fill className="object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/15" />
                      <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                        <div className={`flex-1 overflow-hidden ${(item.group || canEdit) ? 'mt-7' : ''}`}>
                          <h2 className="font-extrabold text-white text-base line-clamp-3 leading-snug">{item.title}</h2>
                          <p className="text-white/75 text-xs mt-1.5 line-clamp-4 leading-relaxed">{item.body}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            {item.createdBy?.displayName && (
                              <p className="text-[11px] font-medium text-white/90 truncate leading-none">{item.createdBy.displayName}</p>
                            )}
                            <p className="text-[10px] text-white/60">
                              {new Date(item.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    {item.group && (
                      <div className="absolute top-2.5 left-2.5 right-10 overflow-hidden z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-black/25 backdrop-blur-sm text-white truncate max-w-full">
                          👥 {item.group.name}
                        </span>
                      </div>
                    )}
                    {canEdit && (
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                        <button
                          onClick={() => { setEditingId(item.id); setEditForm({ title: item.title, body: item.body }); }}
                          className="w-6 h-6 rounded-full bg-black/30 text-white text-xs hover:bg-black/55 flex items-center justify-center backdrop-blur-sm"
                          title={zh ? '編輯' : 'Edit'}
                        >✎</button>
                        <button
                          onClick={() => handleDeleteNews(item.id)}
                          className="w-6 h-6 rounded-full bg-black/30 text-white text-xs hover:bg-red-500/80 flex items-center justify-center backdrop-blur-sm"
                          title={zh ? '刪除' : 'Delete'}
                        >✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
              onConfirm={(selection) => setEventForm((prev) => ({ ...prev, mapAddress: selection?.label ?? '' }))}
              showMapPreview={false}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '費用（選填）' : 'Fee (optional)'}</label>
            <input type="number" className={inputCls} value={eventForm.feeAmount} onChange={setEF('feeAmount')} placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '描述' : 'Description'}</label>
            <textarea rows={3} className={`${inputCls} resize-none`} value={eventForm.description} onChange={setEF('description')} placeholder="What's this event about?" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '開始' : 'Start'}</label>
              <DateTimeInput value={eventForm.startAt} onChange={(v) => setEventForm((f) => ({ ...f, startAt: v }))} placeholder={zh ? '選擇開始時間' : 'Select start'} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{zh ? '結束（選填）' : 'End (optional)'}</label>
              <DateTimeInput value={eventForm.endAt} onChange={(v) => setEventForm((f) => ({ ...f, endAt: v }))} placeholder={zh ? '選擇結束時間' : 'Select end'} clearable />
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
            <div className="grid grid-cols-3 gap-2">
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

const POST_GRADIENTS = [
  'from-violet-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-teal-500 to-cyan-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-green-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
];

function EventCard({ event, locale }: { event: EventWithCounts; locale: string }) {
  const zh = locale === 'zh';
  const title = event.title;
  const location = event.location;

  const startDateObj = new Date(event.startAt);
  const dayStr = startDateObj.toLocaleDateString(zh ? 'zh-TW' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = startDateObj.toLocaleTimeString(zh ? 'zh-TW' : 'en-US', { hour: 'numeric', minute: '2-digit' });

  const fee = event.feeAmount ? `${event.feeCurrency} ${event.feeAmount}` : zh ? '免費' : 'Free';
  const isFree = !event.feeAmount;
  const coverUrl = resolveImageUrl(event.coverImageUrl);

  return (
    <Link
      href={`/${locale}/events/${event.id}`}
      className="group relative block aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
    >
      {coverUrl ? (
        <Image src={coverUrl} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="absolute inset-0 bg-indigo-600" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className="absolute top-2.5 right-2.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold shadow backdrop-blur-sm ${isFree ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
          {fee}
        </span>
      </div>
      {event.groupName && (
        <div className="absolute top-2.5 left-2.5 max-w-[55%]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-indigo-600/80 backdrop-blur-sm text-white overflow-hidden">
            <span className="truncate">{event.groupName}</span>
          </span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wide mb-0.5">{dayStr} · {timeStr}</p>
        <h2 className="font-bold text-sm text-white line-clamp-2 leading-snug">{title}</h2>
        {location && <p className="text-xs text-white/70 mt-0.5 truncate">{location}</p>}
        {event.rsvpCounts.GOING > 0 && (
          <p className="text-xs text-white/50 mt-0.5">{event.rsvpCounts.GOING} {zh ? '人參加' : 'going'}</p>
        )}
      </div>
    </Link>
  );
}
