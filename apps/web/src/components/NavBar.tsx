'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/auth.context';

interface NavBarProps { locale: string }

export default function NavBar({ locale }: NavBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push(`/${locale}/login`);
  };

  const zh = locale === 'zh';

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center justify-between transition-colors">
      <Link href={`/${locale}/events`} className="font-bold text-xl text-indigo-600 dark:text-indigo-400">
        {zh ? '聚點' : 'Judien'}
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            {user.role === 'ADMIN' ? (
              <Link href={`/${locale}/admin/groups`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                {zh ? '群組管理' : 'Groups'}
              </Link>
            ) : (
              <Link href={`/${locale}/groups`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                {zh ? '我的群組' : 'My Groups'}
              </Link>
            )}
            <Link href={`/${locale}/profile?from=${encodeURIComponent(pathname)}`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white max-w-[120px] truncate">
              {(user as any).displayName || user.email.split('@')[0]}
            </Link>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
              {zh ? '登出' : 'Logout'}
            </button>
          </>
        ) : (
          <>
            <Link href={`/${locale}/login`} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              {zh ? '登入' : 'Login'}
            </Link>
            <Link
              href={`/${locale}/signup`}
              className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700"
            >
              {zh ? '註冊' : 'Sign Up'}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
