'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/auth.context';
import CompleteProfileModal from './CompleteProfileModal';
import SetPasswordModal from './SetPasswordModal';

const PUBLIC_SUFFIXES = ['/login', '/signup', '/forgot-password', '/privacy-policy', '/terms-of-use', '/privacy-practice'];

/** Placeholder emails created by the system — not real identifiers. */
function isPlaceholderEmail(email: string | null): boolean {
  if (!email) return true;
  return (
    email.endsWith('@line.local') ||
    email.endsWith('@guest.local') ||
    email.endsWith('@invited.local')
  );
}

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
  const [showCompletion, setShowCompletion] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isLandingPage = pathname === `/${locale}`;
  const isPublic = isLandingPage || PUBLIC_SUFFIXES.some((s) => pathname.endsWith(s));

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace(`/${locale}/login`);
    }
    // Authenticated users on landing page go straight to events
    if (!loading && user && isLandingPage) {
      router.replace(`/${locale}/events`);
    }
  }, [loading, user, isPublic, isLandingPage, locale, router]);

  useEffect(() => {
    if (!user) return;

    const noRealPhone = !user.phoneE164;
    const noRealEmail = isPlaceholderEmail(user.email);
    const hasRealIdentifier = !noRealPhone || !noRealEmail;

    // 1. Phone/email prompt — skip if already dismissed this session
    const skippedContact =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('skipProfileCompletion') === '1';

    if (!skippedContact && noRealPhone && noRealEmail) {
      setShowCompletion(true);
      return; // show one modal at a time
    }

    // 2. Password prompt — only if they have a real identifier to recover with
    //    and they haven't permanently dismissed it
    const skippedPassword =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(`passwordPromptDone_${user.id}`) === '1';

    if (!skippedPassword && !user.hasPassword && hasRealIdentifier) {
      setShowPassword(true);
    }
  }, [user]);

  if (isPublic) return <>{children}</>;
  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!user) return null;

  return (
    <>
      {showCompletion && (
        <CompleteProfileModal locale={locale} onDismiss={() => setShowCompletion(false)} />
      )}
      {!showCompletion && showPassword && (
        <SetPasswordModal locale={locale} onDismiss={() => setShowPassword(false)} />
      )}
      {children}
    </>
  );
}
