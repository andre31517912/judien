import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../context/auth.context';
import { Text } from 'react-native';

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/(auth)/login" />;
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: () => <Text>🏠</Text> }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: () => <Text>📅</Text> }} />
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => <Text>👤</Text> }} />
    </Tabs>
  );
}
