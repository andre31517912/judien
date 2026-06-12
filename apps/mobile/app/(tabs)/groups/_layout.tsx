import { Stack } from 'expo-router';
import { useTheme } from '../../../context/theme.context';
import JLogo from '../../../components/JLogo';

export default function GroupsLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.headerBg }, headerTintColor: colors.text, headerTitle: () => <JLogo /> }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[groupId]" options={{ gestureEnabled: true }} />
      <Stack.Screen name="[groupId]/settings" options={{ gestureEnabled: true }} />
    </Stack>
  );
}
