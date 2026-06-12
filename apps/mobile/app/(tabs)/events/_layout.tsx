import { Stack } from 'expo-router';
import { useTheme } from '../../../context/theme.context';

export default function EventsLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.headerBg }, headerTintColor: colors.text, headerBackVisible: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Event', gestureEnabled: true }} />
    </Stack>
  );
}
