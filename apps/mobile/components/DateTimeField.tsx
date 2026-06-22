import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
  // Separate drafts so date and time pickers don't fight each other on re-render
  const [draftDay, setDraftDay] = useState<Date>(new Date());
  const [draftTime, setDraftTime] = useState<Date>(new Date());

  const parsedValue = useMemo(() => parseLocalDateTime(value), [value]);

  const openPicker = () => {
    const base = parsedValue ?? new Date();
    setDraftDay(new Date(base));
    setDraftTime(new Date(base));
    setPickerMode('date');
    setPickerVisible(true);
  };

  const dismiss = () => setPickerVisible(false);

  const confirm = () => {
    const combined = new Date(draftDay);
    combined.setHours(draftTime.getHours(), draftTime.getMinutes(), 0, 0);
    onChange(formatLocalDateTimeValue(combined));
    setPickerVisible(false);
  };

  // Android: two sequential native dialogs
  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') { setPickerVisible(false); setPickerMode('date'); return; }
    if (!selected) return;
    if (pickerMode === 'date') {
      setDraftDay(selected);
      setPickerMode('time');
      return;
    }
    const combined = new Date(draftDay);
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
          value={pickerMode === 'date' ? draftDay : draftTime}
          mode={pickerMode}
          display="default"
          onChange={handleAndroidChange}
        />
      ) : null}

      {/* ── iOS: bottom-sheet Modal — calendar + time spinner together ── */}
      {Platform.OS === 'ios' ? (
        <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={dismiss}>
          {/* Backdrop tap to dismiss */}
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={dismiss} />

          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
              borderBottomWidth: 1, borderBottomColor: colors.border,
            }}>
              <TouchableOpacity onPress={dismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.subtext ?? colors.placeholder }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Select Date & Time</Text>
              <TouchableOpacity onPress={confirm} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#4F46E5' }}>Confirm</Text>
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {/* Calendar — date only, clean with no time wheel */}
              <DateTimePicker
                value={draftDay}
                mode="date"
                display="inline"
                onChange={(_, date) => { if (date) setDraftDay(date); }}
                accentColor="#4F46E5"
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ alignSelf: 'center', backgroundColor: colors.card }}
              />

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 20 }} />

              {/* Time spinner — clean wheel, no gray calendar overlap */}
              <DateTimePicker
                value={draftTime}
                mode="time"
                display="spinner"
                onChange={(_, date) => { if (date) setDraftTime(date); }}
                accentColor="#4F46E5"
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ height: 140, backgroundColor: colors.card }}
              />
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
