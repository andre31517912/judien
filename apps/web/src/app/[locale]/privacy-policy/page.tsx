import { PrivacyPolicyContent } from '@/lib/policyContent';
import Link from 'next/link';

export default function PrivacyPolicyPage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Link
        href={`/${params.locale}/events`}
        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-6 inline-block"
      >
        ← {zh ? '返回' : 'Back'}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
      <PrivacyPolicyContent />
    </div>
  );
}
