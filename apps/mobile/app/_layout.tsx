import '../lib/i18n';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/auth.context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="groups/[groupId]" options={{ title: 'Group' }} />
        <Stack.Screen name="events/[id]" options={{ title: 'Event' }} />
        <Stack.Screen name="admin/groups/new" options={{ title: 'Create Group' }} />
        <Stack.Screen name="admin/events/new" options={{ title: 'Create Event' }} />
        <Stack.Screen name="admin/events/[id]/edit" options={{ title: 'Edit Event' }} />
      </Stack>
    </AuthProvider>
  );
}
