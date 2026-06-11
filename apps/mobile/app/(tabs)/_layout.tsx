import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
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
  const { colors } = useTheme();
  const unread = useUnreadCount();
  if (!loading && !user) return <Redirect href="/(auth)/login" />;
  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
      tabBarActiveTintColor: '#4F46E5',
      tabBarInactiveTintColor: colors.subtext,
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
