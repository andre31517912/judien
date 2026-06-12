import { Stack } from 'expo-router';
import { useTheme } from '../../../context/theme.context';

export default function GroupsLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.headerBg }, headerTintColor: colors.text, headerBackVisible: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[groupId]" options={{ title: 'Group', gestureEnabled: true }} />
      <Stack.Screen name="[groupId]/settings" options={{ title: 'Settings', gestureEnabled: true }} />
    </Stack>
  );
}
