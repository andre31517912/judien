import { PrivacyPolicyContent } from '@/lib/policyContent';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
      <PrivacyPolicyContent />
    </div>
  );
}
