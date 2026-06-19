import { useEffect } from 'react';
import { useRouter } from 'expo-router';
export default function AdminLookupRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)/events' as any); }, []);
  return null;
}
