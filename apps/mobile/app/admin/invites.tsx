import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Clipboard } from 'react-native';
import { Stack } from 'expo-router';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/auth.context';
import { useTranslation } from 'react-i18next';
import type { InviteToken } from '@judien/shared';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function AdminInvitesScreen() {
  const { user, loading } = useAuth();
  const { i18n, t } = useTranslation();
  const zh = i18n.language === 'zh';

  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<InviteToken[]>('/invites');
      setInvites(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load invites.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => { if (!loading && user?.role === 'ADMIN') load(); }, [loading, user, load]);

  const generate = async (role: 'USER' | 'ADMIN') => {
    setCreating(true);
    try {
      await apiFetch('/invites', { method: 'POST', body: JSON.stringify({ role }) });
      await load();
      Alert.alert(t('common.appName'), t('admin.inviteCreated'));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create invite.');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${API_BASE.replace('/api', '')}/signup?invite=${token}`;
    Clipboard.setString(url);
    Alert.alert(t('common.appName'), t('admin.inviteCopied'));
  };

  if (loading || pageLoading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: zh ? '邀請連結' : 'Invite Links' }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: zh ? '邀請連結' : 'Invite Links' }} />
        <Text style={styles.errorText}>{zh ? '只有平台管理員可以管理邀請。' : 'Only platform admins can manage invites.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: zh ? '邀請連結' : 'Invite Links' }} />

      <Text style={styles.title}>{t('admin.invites')}</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnUser]}
          onPress={() => generate('USER')}
          disabled={creating}
        >
          <Text style={styles.btnText}>{t('admin.generateUserInvite')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnAdmin]}
          onPress={() => generate('ADMIN')}
          disabled={creating}
        >
          <Text style={styles.btnText}>{t('admin.generateAdminInvite')}</Text>
        </TouchableOpacity>
      </View>

      {invites.length === 0 ? (
        <Text style={styles.empty}>{t('admin.noInvites')}</Text>
      ) : (
        invites.map((invite) => {
          const expired = new Date(invite.expiresAt) <= new Date();
          const used = !!invite.usedAt;
          return (
            <View key={invite.id} style={[styles.card, (used || expired) && styles.cardDim]}>
              <View style={styles.cardHeader}>
                <View style={[styles.roleBadge, invite.role === 'ADMIN' ? styles.badgeAdmin : styles.badgeUser]}>
                  <Text style={styles.badgeText}>
                    {invite.role === 'ADMIN' ? t('admin.inviteRoleAdmin') : t('admin.inviteRoleUser')}
                  </Text>
                </View>
                {used && <Text style={styles.statusTag}>{zh ? '已使用' : 'Used'}</Text>}
                {!used && expired && <Text style={[styles.statusTag, styles.statusExpired]}>{zh ? '已過期' : 'Expired'}</Text>}
              </View>
              <Text style={styles.tokenText} numberOfLines={1}>{invite.token}</Text>
              {invite.usedBy && (
                <Text style={styles.meta}>
                  {t('admin.inviteUsed')}: {invite.usedBy.displayName ?? invite.usedBy.email}
                </Text>
              )}
              <Text style={styles.meta}>
                {t('admin.inviteExpires')}: {new Date(invite.expiresAt).toLocaleDateString()}
              </Text>
              {!used && !expired && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.copyBtn} onPress={() => copyLink(invite.token)}>
                    <Text style={styles.copyBtnText}>{zh ? '複製連結' : 'Copy Link'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#111' },
  errorText: { color: '#ef4444', marginBottom: 12 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnUser: { backgroundColor: '#4F46E5' },
  btnAdmin: { backgroundColor: '#7c3aed' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardDim: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeUser: { backgroundColor: '#dbeafe' },
  badgeAdmin: { backgroundColor: '#ede9fe' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  statusTag: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
  statusExpired: { color: '#ef4444' },
  tokenText: { fontFamily: 'monospace', fontSize: 12, color: '#6b7280', marginBottom: 6 },
  meta: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  copyBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, padding: 8, alignItems: 'center' },
  copyBtnText: { fontSize: 13, color: '#111' },
});
