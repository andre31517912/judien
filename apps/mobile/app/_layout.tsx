import '../lib/i18n';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../context/auth.context';

function DeepLinkHandler() {
  const { loginWithTokens } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const parsed = new URL(url);
      if (parsed.hostname === 'line-auth') {
        const accessToken = parsed.searchParams.get('accessToken');
        const refreshToken = parsed.searchParams.get('refreshToken');
        const isNew = parsed.searchParams.get('isNew');
        if (accessToken && refreshToken) {
          await loginWithTokens(accessToken, refreshToken);
          if (isNew === '1') {
            const lineId = process.env.EXPO_PUBLIC_LINE_OFFICIAL_ACCOUNT_ID;
            if (lineId) {
              Linking.openURL(`https://line.me/ti/p/@${lineId}`).catch(() => {});
            }
          }
          router.replace('/(tabs)');
        }
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => { handleUrl(url).catch(() => {}); });
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url).catch(() => {}); });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DeepLinkHandler />
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
