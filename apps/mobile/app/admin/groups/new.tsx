import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/auth.context';
import { useTranslation } from 'react-i18next';

function slugifyPid(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default function NewGroupScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberDataPrivate, setMemberDataPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const suggestedPid = useMemo(() => slugifyPid(name), [name]);

  const handleCreate = async () => {
    if (!name.trim() || !suggestedPid) return;
    setError('');
    setSaving(true);
    try {
      const created = await apiFetch<{ id: string }>('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          pid: suggestedPid,
          description: description.trim(),
          discoverableBySearch: false,
          memberDataPrivate,
          adminUserIds: [],
        }),
      });
      router.replace(`/groups/${created.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create group.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <View style={styles.centerWrap}>
        <Stack.Screen options={{ title: zh ? '建立群組' : 'Create Group' }} />
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{zh ? '只有平台管理員可以建立群組。' : 'Only platform admins can create groups.'}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: zh ? '建立群組' : 'Create Group' }} />

      <View style={styles.section}>
        <Text style={styles.title}>{zh ? '建立群組' : 'Create Group'}</Text>
        <Text style={styles.subtitle}>
          {zh ? '建立新的 Rotary 分組並設定初始隱私規則。' : 'Create a new Rotary group and set its initial privacy rules.'}
        </Text>
      </View>

      <View style={styles.card}>
        {error ? <Text style={styles.errorInline}>{error}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>{zh ? '群組名稱' : 'Group name'}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder={zh ? '例如：台北扶輪社' : 'e.g. Rotary Taipei Downtown'}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{zh ? '群組 PID' : 'Group PID'}</Text>
          <TextInput
            value={suggestedPid}
            editable={false}
            style={[styles.input, styles.readonlyInput]}
            placeholder={zh ? '將根據群組名稱自動產生' : 'Auto-generated from the group name'}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.helperText}>
            {zh ? 'PID 會根據群組名稱自動產生，預設不會被搜尋到。' : 'PID is auto-generated from the group name and is private by default.'}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{zh ? '描述' : 'Description'}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
            placeholder={zh ? '介紹這個群組的用途、地區或成員特色。' : 'Describe this group, its chapter, region, or purpose.'}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyNote}>
            {zh ? '此群組建立後預設為私人，之後可於群組設定中開啟搜尋。' : 'This group starts private by default. Search discoverability can be enabled later in group settings.'}
          </Text>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>{zh ? '成員資料隱私模式' : 'Member data privacy mode'}</Text>
              <Text style={styles.toggleDesc}>
                {zh ? '開啟後，普通成員僅可看見 display name、角色與加入日期。' : 'When on, regular members only see display name, role, and join date.'}
              </Text>
            </View>
            <Switch value={memberDataPrivate} onValueChange={setMemberDataPrivate} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, (saving || !name.trim() || !suggestedPid) && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving || !name.trim() || !suggestedPid}
        >
          <Text style={styles.createBtnText}>{saving ? (zh ? '建立中…' : 'Creating…') : (zh ? '建立群組' : 'Create Group')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerWrap: { flex: 1, backgroundColor: '#F9FAFB', padding: 20 },
  container: { padding: 20, gap: 16, backgroundColor: '#F9FAFB', flexGrow: 1 },
  section: { gap: 6 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    gap: 14,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 15,
  },
  readonlyInput: { backgroundColor: '#F9FAFB', color: '#6B7280' },
  textArea: { minHeight: 96 },
  helperText: { fontSize: 12, color: '#9CA3AF' },
  privacyCard: { gap: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12 },
  privacyNote: { fontSize: 12, color: '#6B7280' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  toggleDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  createBtn: { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorCard: { borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 16 },
  errorText: { color: '#B91C1C', fontSize: 14 },
  errorInline: { color: '#B91C1C', fontSize: 13 },
});