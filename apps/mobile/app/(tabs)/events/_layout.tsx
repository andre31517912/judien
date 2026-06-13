import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../../context/theme.context';
import { useTranslation } from 'react-i18next';
import JLogo from '../../../components/JLogo';

const INDIGO = '#4F46E5';

export default function EventsLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.headerBg },
      headerTintColor: colors.text,
      headerTitle: () => <JLogo />,
      headerLeft: ({ canGoBack }) => canGoBack ? (
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }} activeOpacity={1}>
          <Text style={{ color: INDIGO, fontSize: 17 }}>‹ {zh ? '返回' : 'Back'}</Text>
        </TouchableOpacity>
      ) : undefined,
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ gestureEnabled: true }} />
    </Stack>
  );
}
