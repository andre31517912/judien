import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../context/auth.context';
import { Text } from 'react-native';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () => {
      apiFetch<{ count: number }>('/notifications/unread-count')
        .then((d) => setCount(d.count))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);
  return count;
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const unread = useUnreadCount();
  if (!loading && !user) return <Redirect href="/(auth)/login" />;
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: () => <Text>🏠</Text> }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: () => <Text>📅</Text> }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: () => <Text>👥</Text> }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: () => <Text>🔔</Text>,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => <Text>👤</Text> }} />
    </Tabs>
  );
}
