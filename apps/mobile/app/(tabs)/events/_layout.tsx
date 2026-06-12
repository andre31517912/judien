import { Stack } from 'expo-router';
import { useTheme } from '../../../context/theme.context';
import JLogo from '../../../components/JLogo';

export default function EventsLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.headerBg }, headerTintColor: colors.text, headerTitle: () => <JLogo /> }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ gestureEnabled: true }} />
    </Stack>
  );
}
