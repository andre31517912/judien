export default function SupportPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  return (
    <div className="mx-auto max-w-2xl py-12 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{zh ? '支援' : 'Support'}</h1>
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm space-y-4">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {zh
            ? 'Judien 為 Fayde LLC 旗下的應用程式。如有任何問題或需要協助，請透過電子郵件聯絡我們。'
            : 'Judien is a product of Fayde LLC. For any questions or assistance, please reach out to us by email.'}
        </p>
        <a
          href="mailto:contact@madebyfayde.com"
          className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          contact@madebyfayde.com
        </a>
        <p className="text-xs text-gray-400 dark:text-gray-500 pt-2">
          {zh ? '我們通常會在 1–2 個工作日內回覆。' : 'We typically respond within 1–2 business days.'}
        </p>
      </div>
    </div>
  );
}
