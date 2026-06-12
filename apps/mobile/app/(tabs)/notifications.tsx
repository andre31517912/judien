import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../lib/api';
import { useTheme } from '../../context/theme.context';
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
  const eventMatch = actionUrl.match(/^\/events\/([^/]+)$/);
  if (eventMatch) return `/events/${eventMatch[1]}`;
  if (actionUrl === '/feed' || actionUrl.startsWith('/news')) return '/(tabs)/home';
  return null;
}

export default function NotificationsTab() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const router = useRouter();
  const { colors } = useTheme();
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
    if (route) router.push(route as any);
  };

  const markAllRead = async () => {
    await apiFetch('/notifications/mark-all-read', { method: 'POST' }).catch(() => {});
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.subtext} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {notifications.some((n) => !n.read) && (
        <TouchableOpacity style={[styles.markAllBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={markAllRead}>
          <Text style={styles.markAllText}>{zh ? '全部標為已讀' : 'Mark all as read'}</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.subtext} />}
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
              style={[styles.item, { backgroundColor: n.read ? colors.card : '#EEF2FF', borderColor: colors.border }]}
              onPress={() => handlePress(n)}
              activeOpacity={hasRoute ? 0.7 : 1}
            >
              {!n.read && <View style={styles.dot} />}
              <View style={styles.itemBody}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                <Text style={[styles.itemBodyText, { color: colors.subtext }]} numberOfLines={2}>{body}</Text>
                <Text style={[styles.itemTime, { color: colors.placeholder }]}>
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

function makeStyles(colors: ReturnType<typeof import('../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    empty: { fontSize: 14, color: colors.placeholder },
    markAllBtn: {
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1,
      alignItems: 'flex-end',
    },
    markAllText: { fontSize: 13, color: '#4F46E5' },
    item: {
      flexDirection: 'row', alignItems: 'flex-start',
      padding: 16,
      borderBottomWidth: 1,
      gap: 10,
    },
    dot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: '#4F46E5', marginTop: 5,
    },
    itemBody: { flex: 1 },
    itemTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    itemBodyText: { fontSize: 13, marginBottom: 4 },
    itemTime: { fontSize: 11 },
  });
}
