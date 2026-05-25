import { PrivacyPolicyContent } from '@/lib/policyContent';

export default function PrivacyPracticePage({ params }: { params: { locale: string } }) {
  const zh = params.locale === 'zh';
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        {zh ? '隱私政策' : 'Privacy Practice'}
      </h1>
      <PrivacyPolicyContent />
    </div>
  );
}
