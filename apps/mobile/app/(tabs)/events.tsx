import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import type { EventWithCounts, PaginatedResponse } from '@judien/shared';

export default function EventsTab() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const [scope, setScope] = useState<'future' | 'past'>('future');
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<EventWithCounts>>(
      `/events?scope=${scope}&page=${page}&pageSize=${pageSize}`,
    ).then((res) => {
      setEvents(res.data);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  }, [scope, page]);

  const tabStyle = (active: boolean) => [styles.tab, active && styles.activeTab];

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={tabStyle(scope === 'future')} onPress={() => { setScope('future'); setPage(1); }}>
          <Text style={[styles.tabText, scope === 'future' && styles.activeTabText]}>
            {t('events.future')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={tabStyle(scope === 'past')} onPress={() => { setScope('past'); setPage(1); }}>
          <Text style={[styles.tabText, scope === 'past' && styles.activeTabText]}>
            {t('events.past')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>{t('events.noEvents')}</Text>}
          renderItem={({ item }) => {
            const title = zh ? item.title_zh : item.title_en;
            const location = zh ? item.location_zh : item.location_en;
            const date = new Date(item.startAt).toLocaleDateString();
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/events/${item.id}`)}
              >
                {item.coverImageUrl && (
                  <Image source={{ uri: item.coverImageUrl }} style={styles.thumbnail} />
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
                  <Text style={styles.cardMeta}>{date}</Text>
                  {location ? <Text style={styles.cardMeta} numberOfLines={1}>{location}</Text> : null}
                  <Text style={styles.rsvpRow}>
                    ✓ {item.rsvpCounts.GOING}  ?{item.rsvpCounts.MAYBE}  ✗{item.rsvpCounts.NO}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: '#4F46E5' },
  tabText: { fontSize: 14, color: '#6B7280' },
  activeTabText: { color: '#4F46E5', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  thumbnail: { width: 80, height: 80, borderRadius: 8 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#6B7280' },
  rsvpRow: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});
