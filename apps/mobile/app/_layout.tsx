import '../lib/i18n';
import { useEffect } from 'react';
import { Linking, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/auth.context';
import { ThemeProvider, useTheme } from '../context/theme.context';
import { useTranslation } from 'react-i18next';

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

const INDIGO = '#4F46E5';

function AppShell() {
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.headerBg} />
      <AuthProvider>
        <DeepLinkHandler />
        <Stack screenOptions={{
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.text,
          headerLeft: ({ canGoBack }) => canGoBack ? (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={28} color={INDIGO} />
              <Text style={{ color: INDIGO, fontSize: 17 }}>{zh ? '返回' : 'Back'}</Text>
            </TouchableOpacity>
          ) : undefined,
        }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="admin/groups/new" options={{ headerShown: false }} />
          <Stack.Screen name="admin/events/new" options={{ headerShown: false }} />
          <Stack.Screen name="admin/events/[id]/edit" options={{ headerShown: false }} />
          <Stack.Screen name="admin/invites" options={{ headerShown: false }} />
          <Stack.Screen name="admin/lookup" options={{ headerShown: false }} />
          <Stack.Screen name="search" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
