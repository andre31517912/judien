import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Animated, PanResponder, Alert,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import JLogo from '../../components/JLogo';
import { apiFetch } from '../../lib/api';
import { useTheme } from '../../context/theme.context';
import { useTranslation } from 'react-i18next';

const INDIGO = '#4F46E5';

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  actionUrl: string | null;
  groupId: string | null;
  createdAt: string;
};

function resolveRoute(actionUrl: string | null): string | null {
  if (!actionUrl) return null;
  // /events/{id}
  const eventMatch = actionUrl.match(/^\/events\/([^/]+)$/);
  if (eventMatch) return `/events/${eventMatch[1]}`;
  // /news/{newsId} → global news detail
  const globalNewsMatch = actionUrl.match(/^\/news\/([^/]+)$/);
  if (globalNewsMatch) return `/news/${globalNewsMatch[1]}`;
  // /groups/{groupId}/news/{newsId} → group post detail
  const groupNewsMatch = actionUrl.match(/^\/groups\/([^/]+)\/news\/([^/]+)$/);
  if (groupNewsMatch) return `/groups/${groupNewsMatch[1]}/news/${groupNewsMatch[2]}`;
  // /groups/{groupId}/events/{eventId} → group event detail
  const groupEventMatch = actionUrl.match(/^\/groups\/([^/]+)\/events\/([^/]+)$/);
  if (groupEventMatch) return `/groups/${groupEventMatch[1]}/events/${groupEventMatch[2]}`;
  // /groups/{groupId} or /groups/{groupId}/... → group page
  const groupMatch = actionUrl.match(/^\/groups\/([^/]+)/);
  if (groupMatch) return `/groups/${groupMatch[1]}`;
  // /admin/groups/{groupId}/... → no admin on mobile, go to group page
  const adminGroupMatch = actionUrl.match(/^\/admin\/groups\/([^/]+)/);
  if (adminGroupMatch) return `/groups/${adminGroupMatch[1]}`;
  // /feed or /news → home
  if (actionUrl === '/feed' || actionUrl.startsWith('/news')) return '/(tabs)/home';
  return null;
}

const DELETE_BTN_WIDTH = 72;

function SwipeableNotification({ n, onDelete, onPress, styles, colors, zh }: {
  n: AppNotification;
  onDelete: (id: string) => void;
  onPress: (n: AppNotification) => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof import('../../context/theme.context').useTheme>['colors'];
  zh: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    isOpen.current = false;
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
      onPanResponderMove: (_, { dx }) => {
        if (isOpen.current) {
          translateX.setValue(Math.max(-DELETE_BTN_WIDTH, Math.min(0, -DELETE_BTN_WIDTH + dx)));
        } else if (dx < 0) {
          translateX.setValue(Math.max(-DELETE_BTN_WIDTH, dx));
        }
      },
      onPanResponderRelease: (_, { dx }) => {
        if (isOpen.current) {
          if (dx > DELETE_BTN_WIDTH / 2) {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
            isOpen.current = false;
          } else {
            Animated.spring(translateX, { toValue: -DELETE_BTN_WIDTH, useNativeDriver: true, bounciness: 4 }).start();
          }
        } else {
          if (dx < -DELETE_BTN_WIDTH / 2) {
            Animated.spring(translateX, { toValue: -DELETE_BTN_WIDTH, useNativeDriver: true, bounciness: 4 }).start();
            isOpen.current = true;
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          }
        }
      },
    })
  ).current;

  const handleDeletePress = () => {
    Animated.timing(translateX, { toValue: -400, duration: 220, useNativeDriver: true }).start(() => {
      onDelete(n.id);
    });
  };

  const title = n.title;
  const body = n.body;
  const hasRoute = !!resolveRoute(n.actionUrl);

  return (
    <View style={styles.swipeRow}>
      <TouchableOpacity style={styles.deleteAction} onPress={handleDeletePress} activeOpacity={0.85}>
        <Text style={styles.deleteActionIcon}>✕</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.slideRow, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[styles.item, { backgroundColor: n.read ? colors.card : (isDark ? 'rgba(79,70,229,0.15)' : '#EEF2FF'), borderColor: colors.border }]}
          onPress={() => { if (isOpen.current) { close(); return; } onPress(n); }}
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
      </Animated.View>
    </View>
  );
}

export default function NotificationsTab() {
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const router = useRouter();
  const { colors, isDark } = useTheme();
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
    const route = resolveRoute(n.actionUrl) ?? (n.groupId ? `/groups/${n.groupId}` : null);
    if (route) router.push(route as any);
  };

  const handleDelete = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
    } catch {
      load();
    }
  }, [load]);

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
      <Stack.Screen options={{
        headerTitle: () => <JLogo />,
        headerStyle: { backgroundColor: colors.headerBg },
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
            <Ionicons name="search" size={24} color={INDIGO} />
          </TouchableOpacity>
        ),
      }} />
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
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.empty}>{zh ? '沒有通知' : 'No notifications'}</Text>
          </View>
        }
        renderItem={({ item: n }) => (
          <SwipeableNotification
            key={n.id}
            n={n}
            onDelete={handleDelete}
            onPress={handlePress}
            styles={styles}
            colors={colors}
            zh={zh}
          />
        )}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 40, marginBottom: 12, opacity: 0.4 },
    empty: { fontSize: 14, color: colors.placeholder },
    markAllBtn: {
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1,
      alignItems: 'flex-end',
    },
    markAllText: { fontSize: 13, color: '#4F46E5' },
    swipeRow: { overflow: 'hidden' },
    deleteAction: {
      position: 'absolute', right: 0, top: 0, bottom: 0,
      width: DELETE_BTN_WIDTH,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteActionIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
    slideRow: { backgroundColor: colors.bg },
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
