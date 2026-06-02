import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';

type AppNotification = {
  id: string;
  type: string;
  title_en: string;
  title_zh: string;
  body_en: string;
  body_zh: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
};

function resolveRoute(actionUrl: string | null): string | null {
  if (!actionUrl) return null;
  // /events/UUID → /events/UUID (mobile route)
  const eventMatch = actionUrl.match(/^\/events\/([^/]+)$/);
  if (eventMatch) return `/events/${eventMatch[1]}`;
  // /feed or /news → navigate to home tab
  if (actionUrl === '/feed' || actionUrl.startsWith('/news')) return '/(tabs)/home';
  return null;
}

export default function NotificationsTab() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<AppNotification[]>('/notifications');
      setNotifications(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePress = async (n: AppNotification) => {
    if (!n.read) {
      apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    const route = resolveRoute(n.actionUrl);
    if (route) {
      router.push(route as any);
    }
  };

  const markAllRead = async () => {
    await apiFetch('/notifications/mark-all-read', { method: 'POST' }).catch(() => {});
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );

  return (
    <View style={styles.container}>
      {notifications.some((n) => !n.read) && (
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
          <Text style={styles.markAllText}>{zh ? '全部標為已讀' : 'Mark all as read'}</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>{zh ? '目前沒有通知。' : 'No notifications yet.'}</Text>
          </View>
        }
        renderItem={({ item: n }) => {
          const title = zh ? n.title_zh : n.title_en;
          const body = zh ? n.body_zh : n.body_en;
          const hasRoute = !!resolveRoute(n.actionUrl);
          return (
            <TouchableOpacity
              style={[styles.item, !n.read && styles.itemUnread]}
              onPress={() => handlePress(n)}
              activeOpacity={hasRoute ? 0.7 : 1}
            >
              {!n.read && <View style={styles.dot} />}
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.itemBody2} numberOfLines={2}>{body}</Text>
                <Text style={styles.itemTime}>
                  {new Date(n.createdAt).toLocaleString(zh ? 'zh-TW' : 'en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  empty: { fontSize: 14, color: '#9CA3AF' },
  markAllBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  markAllText: { fontSize: 13, color: '#4F46E5' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderColor: '#F3F4F6',
    gap: 10,
  },
  itemUnread: { backgroundColor: '#EEF2FF' },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#4F46E5', marginTop: 5, shrink: 0,
  } as any,
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  itemBody2: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  itemTime: { fontSize: 11, color: '#9CA3AF' },
});
