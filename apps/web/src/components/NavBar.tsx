'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth.context';

interface NavBarProps { locale: string }

export default function NavBar({ locale }: NavBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const otherLocale = locale === 'en' ? 'zh' : 'en';

  const handleLogout = async () => {
    await logout();
    router.push(`/${locale}/login`);
  };

  return (
    <nav className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
      <Link href={`/${locale}/events`} className="font-bold text-xl text-indigo-600">
        Judien
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link
          href={`/${otherLocale}/events`}
          className="text-gray-500 hover:text-gray-800"
        >
          {otherLocale === 'zh' ? '中文' : 'EN'}
        </Link>
        {user ? (
          <>
            <Link href={`/${locale}/profile`} className="text-gray-600 hover:text-gray-900">
              Profile
            </Link>
            {user.role === 'ADMIN' && (
              <Link href={`/${locale}/admin/events/new`} className="text-indigo-600">
                + Event
              </Link>
            )}
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href={`/${locale}/login`} className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link
              href={`/${locale}/signup`}
              className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
