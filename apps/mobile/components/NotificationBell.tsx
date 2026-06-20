import { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '../lib/api';

const INDIGO = '#4F46E5';

export default function NotificationBell({ style }: { style?: object }) {
  const [count, setCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const load = () => {
      apiFetch<{ count: number }>('/notifications/unread-count')
        .then((d) => setCount(d.count))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/notifications' as any)}
      style={[{ padding: 8 }, style]}
      activeOpacity={0.7}
    >
      <View>
        <Ionicons name="notifications-outline" size={24} color={INDIGO} />
        {count > 0 && (
          <View style={{
            position: 'absolute', top: -2, right: -2,
            backgroundColor: '#EF4444', borderRadius: 8,
            minWidth: 16, height: 16,
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 3,
          }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', lineHeight: 16 }}>
              {count > 99 ? '99' : String(count)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
