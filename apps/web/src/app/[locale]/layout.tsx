import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import NavBar from '../../components/NavBar';

const locales = ['en', 'zh'];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(params.locale)) notFound();
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar locale={params.locale} />
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
