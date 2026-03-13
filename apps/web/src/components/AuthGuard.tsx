'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/auth.context';

const PUBLIC_SUFFIXES = ['/login', '/signup'];

export default function AuthGuard({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_SUFFIXES.some((s) => pathname.endsWith(s));

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace(`/${locale}/login`);
    }
  }, [loading, user, isPublic, locale, router]);

  if (isPublic) return <>{children}</>;
  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!user) return null;

  return <>{children}</>;
}
