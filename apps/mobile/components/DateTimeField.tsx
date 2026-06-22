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
  const [step, setStep] = useState<'date' | 'time'>('date'); // iOS two-step
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date'); // Android
  const [draftDate, setDraftDate] = useState<Date>(new Date());

  const parsedValue = useMemo(() => parseLocalDateTime(value), [value]);

  const openPicker = () => {
    setDraftDate(parsedValue ?? new Date());
    setStep('date');
    setPickerMode('date');
    setPickerVisible(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') { setPickerVisible(false); setPickerMode('date'); return; }
    if (!selectedDate) return;
    const next = new Date(draftDate);
    if (pickerMode === 'date') {
      next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDraftDate(next);
      setPickerMode('time');
      return;
    }
    next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    onChange(formatLocalDateTimeValue(next));
    setDraftDate(next);
    setPickerVisible(false);
    setPickerMode('date');
  };

  const handleIOSDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (date) setDraftDate(date);
  };

  const dismiss = () => { setPickerVisible(false); setStep('date'); };

  const confirm = () => {
    onChange(formatLocalDateTimeValue(draftDate));
    setPickerVisible(false);
    setStep('date');
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

      {/* Trigger */}
      <TouchableOpacity
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: colors.input }}
        onPress={openPicker}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 15, color: parsedValue ? colors.inputText : colors.placeholder }}>
          {parsedValue ? formatDisplayValue(parsedValue, locale) : placeholder}
        </Text>
      </TouchableOpacity>

      {/* ── Android: native dialog (no container needed) ── */}
      {pickerVisible && Platform.OS === 'android' ? (
        <DateTimePicker
          key={pickerMode}
          value={draftDate}
          mode={pickerMode}
          display="default"
          onChange={handleAndroidChange}
        />
      ) : null}

      {/* ── iOS: two-step bottom-sheet Modal ── */}
      {Platform.OS === 'ios' ? (
        <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={dismiss}>
          {/* Backdrop */}
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={dismiss} />

          {/* Sheet */}
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

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                {step === 'date' ? 'Select Date' : 'Select Time'}
              </Text>

              {step === 'date' ? (
                <TouchableOpacity onPress={() => setStep('time')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#4F46E5' }}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={confirm} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#4F46E5' }}>Confirm</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Step 1: inline calendar — date only, no time wheel, full contrast */}
            {step === 'date' ? (
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="inline"
                onChange={handleIOSDateChange}
                accentColor="#4F46E5"
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ alignSelf: 'center', backgroundColor: colors.card }}
              />
            ) : (
              /* Step 2: spinner time wheel — works in Modal, no blank issue */
              <DateTimePicker
                value={draftDate}
                mode="time"
                display="spinner"
                onChange={handleIOSDateChange}
                accentColor="#4F46E5"
                themeVariant={isDark ? 'dark' : 'light'}
                style={{ height: 180, backgroundColor: colors.card }}
              />
            )}
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
