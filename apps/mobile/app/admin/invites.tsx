import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/auth.context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/theme.context';
import JLogo from '../../components/JLogo';
import type { InviteToken } from '@judien/shared';

const INDIGO = '#4F46E5';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function AdminInvitesScreen() {
  const { user, loading } = useAuth();
  const { i18n, t } = useTranslation();
  const zh = i18n.language === 'zh';
  const { colors } = useTheme();
  const router = useRouter();
  const { top: safeTop } = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
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

  const revokeInvite = (invite: InviteToken) => {
    Alert.alert(
      zh ? '刪除邀請連結' : 'Delete Invite Link',
      zh ? '確定要刪除此邀請連結嗎？此操作無法復原。' : 'Permanently delete this invite link? Cannot be undone.',
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '刪除' : 'Delete', style: 'destructive',
          onPress: async () => {
            setRevoking(invite.id);
            try {
              await apiFetch(`/invites/${invite.id}`, { method: 'DELETE' });
              setInvites((prev) => prev.filter((i) => i.id !== invite.id));
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to delete invite.');
            } finally {
              setRevoking(null);
            }
          },
        },
      ],
    );
  };

  const copyLink = (token: string) => {
    const url = `${API_BASE.replace('/api', '')}/signup?invite=${token}`;
    Clipboard.setString(url);
    Alert.alert(t('common.appName'), t('admin.inviteCopied'));
  };

  const header = (
    <View style={{ backgroundColor: colors.headerBg, paddingTop: safeTop }}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()} style={{ minWidth: 60, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={INDIGO} />
          <Text style={{ color: INDIGO, fontSize: 17 }}>{zh ? '返回' : 'Back'}</Text>
        </TouchableOpacity>
        <JLogo />
        <View style={{ minWidth: 60 }} />
      </View>
    </View>
  );

  if (loading || pageLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <View style={styles.center}><ActivityIndicator /></View>
      </View>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <View style={styles.container}>
          <Text style={styles.errorText}>{zh ? '只有平台管理員可以管理邀請。' : 'Only platform admins can manage invites.'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
                <View style={styles.cardActions}>
                  {!used && !expired && (
                    <TouchableOpacity style={[styles.copyBtn, { flex: 1 }]} onPress={() => copyLink(invite.token)}>
                      <Text style={styles.copyBtnText}>{zh ? '複製連結' : 'Copy Link'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.revokeBtn}
                    onPress={() => revokeInvite(invite)}
                    disabled={revoking === invite.id}
                  >
                    <Text style={styles.revokeBtnText}>{revoking === invite.id ? '…' : (zh ? '刪除' : 'Delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import('../../context/theme.context').useTheme>['colors']) {
  return StyleSheet.create({
    customHeader: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    container: { flexGrow: 1, padding: 20, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: colors.text },
    errorText: { color: '#ef4444', marginBottom: 12 },
    empty: { color: colors.placeholder, textAlign: 'center', marginTop: 40 },
    buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
    btnUser: { backgroundColor: '#4F46E5' },
    btnAdmin: { backgroundColor: '#7c3aed' },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 12, backgroundColor: colors.card },
    cardDim: { opacity: 0.5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    badgeUser: { backgroundColor: '#dbeafe' },
    badgeAdmin: { backgroundColor: '#ede9fe' },
    badgeText: { fontSize: 12, fontWeight: '600' },
    statusTag: { fontSize: 12, color: colors.subtext, fontStyle: 'italic' },
    statusExpired: { color: '#ef4444' },
    tokenText: { fontFamily: 'monospace', fontSize: 12, color: colors.subtext, marginBottom: 6 },
    meta: { fontSize: 12, color: colors.placeholder, marginBottom: 2 },
    cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
    copyBtn: { backgroundColor: colors.input, borderRadius: 8, padding: 8, alignItems: 'center' },
    copyBtnText: { fontSize: 13, color: colors.text },
    revokeBtn: { borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF5F5' },
    revokeBtnText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  });
}
