'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';
import type { EventWithCounts } from '@judien/shared';

export default function EventInviteAcceptPage() {
  const params = useParams<{ locale: string; token: string }>();
  const router = useRouter();
  
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventInfo, setEventInfo] = useState<EventWithCounts | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await apiFetch<{ user: any; eventId: string }>(
        `/event-invites/${params.token}/accept`,
        {
          method: 'POST',
          body: JSON.stringify({
            displayName,
            phoneE164: phone,
            email: email || undefined,
          }),
        }
      );
      
      // Redirect to event page
      router.push(`/${params.locale}/events/${result.eventId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          You're invited!
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Fill in your details to confirm your attendance
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+886 900 000 123"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !displayName.trim() || !phone.trim()}
            className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Confirming...' : 'Confirm Attendance'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          By confirming, you'll be marked as attending this event
        </p>
      </div>
    </div>
  );
}
