'use client';
import { useEffect } from 'react';

/** Sets <html lang="…"> to match the active locale — prevents Chrome's translate popup. */
export default function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-TW' : 'en';
  }, [locale]);
  return null;
}
