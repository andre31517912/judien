import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../context/auth.context';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Redirect href="/(tabs)/events" />;
  return <Stack />;
}
