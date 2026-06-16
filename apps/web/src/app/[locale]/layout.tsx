import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import NavBar from '../../components/NavBar';
import HtmlLang from '../../components/HtmlLang';
import AuthGuard from '../../components/AuthGuard';
import Footer from '../../components/Footer';

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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-black transition-colors overflow-x-hidden">
      <HtmlLang locale={params.locale} />
      <NavBar locale={params.locale} />
      <main className="flex-1 w-full px-4 py-6">
        <AuthGuard locale={params.locale}>{children}</AuthGuard>
      </main>
      <Footer locale={params.locale} />
    </div>
  );
}
