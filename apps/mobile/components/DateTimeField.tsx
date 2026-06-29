import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/theme.context';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  locale?: string;
  clearable?: boolean;
};

function parseLocalDateTime(value: string): Date | null {
  if (!value) return null;
  const normalized = value.length === 16 ? `${value}:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplayValue(date: Date, locale: string) {
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function DateTimeField({
  label, value, onChange, placeholder, locale = 'en-US', clearable = false,
}: Props) {
  const { colors, isDark } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date'); // Android only
  const [draft, setDraft] = useState<Date>(new Date());

  const parsedValue = useMemo(() => parseLocalDateTime(value), [value]);

  const openPicker = () => {
    setDraft(parsedValue ?? new Date());
    setPickerMode('date');
    setPickerVisible(true);
  };

  const dismiss = () => setPickerVisible(false);

  const confirm = () => {
    onChange(formatLocalDateTimeValue(draft));
    setPickerVisible(false);
  };

  // Android: two sequential native dialogs (date then time)
  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') { setPickerVisible(false); setPickerMode('date'); return; }
    if (!selected) return;
    if (pickerMode === 'date') {
      setDraft(selected);
      setPickerMode('time');
      return;
    }
    const combined = new Date(draft);
    combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(formatLocalDateTimeValue(combined));
    setPickerVisible(false);
    setPickerMode('date');
  };

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Label row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.subtext ?? colors.text }}>{label}</Text>
        {clearable && value ? (
          <TouchableOpacity onPress={() => onChange('')}>
            <Text style={{ fontSize: 12, color: colors.placeholder, fontWeight: '600' }}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Trigger button */}
      <TouchableOpacity
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: colors.input }}
        onPress={openPicker}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 15, color: parsedValue ? colors.inputText : colors.placeholder }}>
          {parsedValue ? formatDisplayValue(parsedValue, locale) : placeholder}
        </Text>
      </TouchableOpacity>

      {/* ── Android: sequential native dialogs ── */}
      {pickerVisible && Platform.OS === 'android' ? (
        <DateTimePicker
          key={pickerMode}
          value={draft}
          mode={pickerMode}
          display="default"
          minimumDate={new Date(0)}
          onChange={handleAndroidChange}
        />
      ) : null}

      {/* ── iOS: inline calendar + spinner time — NO ScrollView to avoid touch conflict ── */}
      {Platform.OS === 'ios' ? (
        <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={dismiss}>
          {/* Backdrop */}
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
            activeOpacity={1}
            onPress={dismiss}
          />

          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 36,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
              borderBottomWidth: 1, borderBottomColor: colors.border,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Select Date & Time</Text>
              <TouchableOpacity
                onPress={confirm}
                accessibilityLabel="Confirm date and time"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 20 }}>✓</Text>
              </TouchableOpacity>
            </View>

            {/* Inline calendar — NOT inside a ScrollView, so pan gestures work correctly */}
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              minimumDate={new Date(0)}
              onChange={(_, date) => {
                if (!date) return;
                // Preserve the time portion from the current draft
                const updated = new Date(draft);
                updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                setDraft(updated);
              }}
              accentColor="#4F46E5"
              themeVariant={isDark ? 'dark' : 'light'}
            />

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16, marginBottom: 4 }} />

            {/* Time spinner — preserve the date portion from the current draft */}
            <DateTimePicker
              value={draft}
              mode="time"
              display="spinner"
              minimumDate={new Date(0)}
              onChange={(_, time) => {
                if (!time) return;
                const updated = new Date(draft);
                updated.setHours(time.getHours(), time.getMinutes(), 0, 0);
                setDraft(updated);
              }}
              accentColor="#4F46E5"
              themeVariant={isDark ? 'dark' : 'light'}
              style={{ height: 110, backgroundColor: colors.card }}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
