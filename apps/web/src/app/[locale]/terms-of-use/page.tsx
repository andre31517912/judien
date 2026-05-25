import { TermsOfUseContent } from '@/lib/policyContent';

export default function TermsOfUsePage({ params }: { params: { locale: string } }) {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Terms of Use</h1>
      <TermsOfUseContent />
    </div>
  );
}
