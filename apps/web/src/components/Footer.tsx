import Link from 'next/link';

export default function Footer({ locale }: { locale: string }) {
  const zh = locale === 'zh';
  return (
    <footer className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
      <span>Judien © 2026</span>
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/privacy-practice`}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          {zh ? '隱私政策' : 'Privacy Practice'}
        </Link>
        <Link
          href={`/${locale}/terms-of-use`}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          {zh ? '使用條款' : 'Terms of Use'}
        </Link>
      </div>
    </footer>
  );
}
