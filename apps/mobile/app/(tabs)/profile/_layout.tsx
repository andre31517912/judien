import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/theme.context';
import { useTranslation } from 'react-i18next';

const INDIGO = '#4F46E5';

export default function ProfileLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  return (
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
      <Stack.Screen name="settings" options={{ gestureEnabled: true, headerShown: false }} />
    </Stack>
  );
}
