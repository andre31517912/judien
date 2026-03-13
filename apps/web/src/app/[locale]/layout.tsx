import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import NavBar from '../../components/NavBar';
import HtmlLang from '../../components/HtmlLang';
import AuthGuard from '../../components/AuthGuard';

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
      <HtmlLang locale={params.locale} />
      <NavBar locale={params.locale} />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <AuthGuard locale={params.locale}>{children}</AuthGuard>
      </main>
    </div>
  );
}
