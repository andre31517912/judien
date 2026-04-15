import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { EventWithCounts } from '@judien/shared';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';

type GuestIdentity = {
  name: string;
  phoneE164: string;
  email: string;
};

export default function SharedEventScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventWithCounts | null>(null);
  const [guest, setGuest] = useState<GuestIdentity>({ name: '', phoneE164: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<EventWithCounts>(`/events/share/${token}`);
      setEvent(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load shared event');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const rsvp = async (status: 'GOING' | 'MAYBE' | 'NO') => {
    if (!token) return;
    setSaving(true);
    try {
      if (user) {
        await apiFetch(`/events/share/${token}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({ status }),
        });
      } else {
        if (!guest.name.trim() || !guest.phoneE164.trim() || !guest.email.trim()) {
          Alert.alert('Required', 'Please enter name, phone, and email.');
          setSaving(false);
          return;
        }
        await apiFetch(`/events/share/${token}/rsvp`, {
          method: 'POST',
          body: JSON.stringify({ status, guest }),
        });
      }

      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to submit RSVP');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !event) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{event.title_en || event.title_zh}</Text>
      <Text style={styles.meta}>{new Date(event.startAt).toLocaleString()}</Text>
      <Text style={styles.meta}>{event.location_en || event.location_zh}</Text>

      <View style={styles.countRow}>
        <Text style={styles.count}>Going: {event.rsvpCounts.GOING}</Text>
        <Text style={styles.count}>Maybe: {event.rsvpCounts.MAYBE}</Text>
        <Text style={styles.count}>Not Going: {event.rsvpCounts.NO}</Text>
      </View>

      {!user && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={guest.name}
            onChangeText={(value) => setGuest((prev) => ({ ...prev, name: value }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone (+886...)"
            value={guest.phoneE164}
            onChangeText={(value) => setGuest((prev) => ({ ...prev, phoneE164: value }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={guest.email}
            onChangeText={(value) => setGuest((prev) => ({ ...prev, email: value }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={() => rsvp('GOING')} disabled={saving}>
          <Text style={styles.btnText}>Going</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => rsvp('MAYBE')} disabled={saving}>
          <Text style={styles.btnText}>Maybe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => rsvp('NO')} disabled={saving}>
          <Text style={styles.btnText}>Not Going</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#6B7280' },
  container: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  meta: { color: '#4B5563', fontSize: 14 },
  countRow: { gap: 6, marginTop: 8 },
  count: { color: '#374151' },
  form: { gap: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  btn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
