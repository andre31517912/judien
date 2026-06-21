import { Tabs, Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import JLogo from '../../components/JLogo';

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

const INDIGO = '#4F46E5';

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const unread = useUnreadCount();
  if (!loading && !user) return <Redirect href="/(auth)/login" />;
  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
      tabBarActiveTintColor: INDIGO,
      tabBarInactiveTintColor: colors.subtext,
      tabBarItemStyle: { paddingTop: 10, paddingBottom: 0 },
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="search" size={24} color={INDIGO} />
        </TouchableOpacity>
      ),
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      {/* events tab hidden — content merged into Home */}
      <Tabs.Screen
        name="events"
        options={{
          href: null,
          headerTitle: () => <JLogo />,
          headerStyle: { backgroundColor: colors.headerBg },
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          headerTitle: () => <JLogo />,
          headerStyle: { backgroundColor: colors.headerBg },
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
          headerTitle: () => <JLogo />,
          headerStyle: { backgroundColor: colors.headerBg },
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
