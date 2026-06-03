'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type AppNotification = {
  id: string;
  type: string;
  title_en: string;
  title_zh: string;
  body_en: string;
  body_zh: string;
  read: boolean;
  actionUrl: string | null;
  groupId: string | null;
  createdAt: string;
  group: { id: string; name: string } | null;
};

interface NotificationBellProps {
  locale: string;
}

export default function NotificationBell({ locale }: NotificationBellProps) {
  const zh = locale === 'zh';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const data = await apiFetch<{ count: number }>('/notifications/unread-count');
      setUnread(data.count);
    } catch { /* silently ignore */ }
  }, []);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openPanel = async () => {
    setOpen((v) => !v);
    if (!open) {
      setLoading(true);
      try {
        const data = await apiFetch<AppNotification[]>('/notifications');
        setNotifications(data);
        setUnread(data.filter((n) => !n.read).length);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
  };

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((c) => Math.max(0, c - 1));
    await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  };

  const deleteOne = async (id: string, wasUnread: boolean) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnread((c) => Math.max(0, c - 1));
    await apiFetch(`/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await apiFetch('/notifications/mark-all-read', { method: 'POST' }).catch(() => {});
  };

  const clearAll = async () => {
    setNotifications([]);
    setUnread(0);
    await apiFetch('/notifications', { method: 'DELETE' }).catch(() => {});
  };

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) markRead(n.id);
    if (n.actionUrl) {
      setOpen(false);
      router.push(`/${locale}${n.actionUrl}`);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={openPanel}
        aria-label={zh ? '通知' : 'Notifications'}
        className="relative p-1 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[480px] flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              {zh ? '通知' : 'Notifications'}
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-medium px-1.5 py-0.5">
                  {unread}
                </span>
              )}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60">
            {loading && (
              <p className="text-center text-sm text-gray-400 py-8">{zh ? '載入中…' : 'Loading…'}</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">{zh ? '沒有通知' : 'No notifications'}</p>
            )}
            {!loading && notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`relative flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition group ${!n.read ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''}`}
              >
                {/* Unread dot */}
                {!n.read && (
                  <span className="mt-1.5 shrink-0 h-2 w-2 rounded-full bg-indigo-500" />
                )}
                {n.read && <span className="mt-1.5 shrink-0 h-2 w-2" />}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                    {zh ? n.title_zh : n.title_en}
                  </p>
                  {(zh ? n.body_zh : n.body_en) && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-snug">
                      {zh ? n.body_zh : n.body_en}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                    {new Date(n.createdAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* X delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteOne(n.id, !n.read); }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition text-base leading-none mt-0.5 -mr-1"
                  aria-label="Delete notification"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          {notifications.length > 0 && (
            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 flex items-center justify-between gap-2">
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {zh ? '全部標為已讀' : 'Mark all as read'}
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-red-500 dark:text-red-400 hover:underline font-medium"
              >
                {zh ? '清除通知' : 'Clear notifications'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
