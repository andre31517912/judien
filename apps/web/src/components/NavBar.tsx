'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/auth.context';
import NotificationBell from './NotificationBell';

interface NavBarProps { locale: string }

export default function NavBar({ locale }: NavBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEventsPage = /^\/[a-z]{2}\/events$/.test(pathname ?? '');
  const isGroupsPage = /^\/[a-z]{2}\/groups$/.test(pathname ?? '');
  const showSearch = !!user;

  const searchPlaceholder = locale === 'zh' ? '搜尋活動、群組、動態…' : 'Search events, groups, posts…';

  // Sync search input from URL param on pages that support live filtering
  useEffect(() => {
    if ((isEventsPage || isGroupsPage) && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setSearchValue(params.get('q') ?? '');
    } else if (!isEventsPage && !isGroupsPage) {
      setSearchValue('');
    }
  }, [isEventsPage, isGroupsPage, pathname]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // Live filter only on events/groups pages
    if (!isEventsPage && !isGroupsPage) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (typeof window === 'undefined') return;
      const currentParams = new URLSearchParams(window.location.search);
      if (value) {
        currentParams.set('q', value);
      } else {
        currentParams.delete('q');
      }
      const qs = currentParams.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`);
    }, 300);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      router.push(`/${locale}/search?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.push(`/${locale}/login`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const zh = locale === 'zh';

  return (
    <>
    <nav className="relative bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center justify-between transition-colors">
      {/* Left: Logo */}
      <Link href={user ? `/${locale}/events` : `/${locale}`} className="font-bold text-xl text-indigo-600 dark:text-indigo-400 shrink-0 z-10">
        {zh ? '聚點' : 'Judien'}
      </Link>

      {/* Center: absolutely positioned so it is always in the true middle of the bar */}
      {showSearch && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-full max-w-xs sm:max-w-sm pointer-events-auto px-4">
            <svg className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>
      )}

      {/* Right: Nav links */}
      <div className="flex items-center gap-4 text-sm shrink-0 z-10">
        {user ? (
          <>
            {user.role === 'ADMIN' ? (
              <>
                <Link href={`/${locale}/admin/groups`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                  {zh ? '群組管理' : 'Groups'}
                </Link>
              </>
            ) : (
              <Link href={`/${locale}/groups`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                {zh ? '群組' : 'Groups'}
              </Link>
            )}
            <div className="flex items-center gap-1.5">
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <span className="max-w-[120px] truncate">
                    {(user as any).displayName || user.email?.split('@')[0] || user.phoneE164 || 'User'}
                  </span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-gray-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 py-1 z-40">
                    <Link
                      href={`/${locale}/profile`}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {zh ? '個人資料' : 'Profile'}
                    </Link>
                    <button
                      onClick={() => { setShowUserMenu(false); setShowLogoutConfirm(true); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {zh ? '登出' : 'Sign out'}
                    </button>
                  </div>
                )}
              </div>
              <NotificationBell locale={locale} />
            </div>
          </>
        ) : (
          <>
            <Link href={`/${locale}/login`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              {zh ? '登入' : 'Sign In'}
            </Link>
            <Link
              href={`/${locale}/signup`}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              {zh ? '註冊' : 'Sign Up'}
            </Link>
          </>
        )}
      </div>
    </nav>
    {showLogoutConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            {zh ? '確定要登出嗎？' : 'Sign out?'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            {zh ? '您將需要重新登入。' : "You'll need to sign in again."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {zh ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 transition"
            >
              {zh ? '登出' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
