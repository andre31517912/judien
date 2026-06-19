'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function AdminLookupRedirect({ params }: { params: { locale: string } }) {
  const router = useRouter();
  useEffect(() => { router.replace(`/${params.locale}/events`); }, []);
  return null;
}
