import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplayValue(date: Date, locale: string) {
  return date.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function DateTimeField({
  label,
  value,
  onChange,
  placeholder,
  locale = 'en-US',
  clearable = false,
}: Props) {
  const { colors } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [draftDate, setDraftDate] = useState<Date>(new Date());

  const parsedValue = useMemo(() => parseLocalDateTime(value), [value]);

  const openPicker = () => {
    const base = parsedValue ?? new Date();
    setDraftDate(base);
    setPickerMode('date');
    setPickerVisible(true);
  };

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setPickerVisible(false);
      setPickerMode('date');
      return;
    }
    if (!selectedDate) return;

    const next = new Date(draftDate);

    if (Platform.OS === 'ios') {
      if (pickerMode === 'date') {
        next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      } else {
        next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      }
      setDraftDate(next);
      return;
    }

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

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.subtext ?? colors.text }}>{label}</Text>
        {clearable && value ? (
          <TouchableOpacity onPress={() => onChange('')}>
            <Text style={{ fontSize: 12, color: colors.placeholder, fontWeight: '600' }}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 12,
          backgroundColor: colors.input,
        }}
        onPress={openPicker}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 15, color: parsedValue ? colors.inputText : colors.placeholder }}>
          {parsedValue ? formatDisplayValue(parsedValue, locale) : placeholder}
        </Text>
      </TouchableOpacity>

      {pickerVisible ? (
        <View style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          backgroundColor: colors.card,
          padding: 8,
        }}>
          <Text style={{ fontSize: 12, color: colors.placeholder, marginBottom: 4 }}>
            {pickerMode === 'date' ? 'Select date' : 'Select time'}
          </Text>
          <DateTimePicker
            value={draftDate}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handlePickerChange}
          />
          <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                setPickerVisible(false);
                setPickerMode('date');
              }}
              style={{ paddingHorizontal: 6, paddingVertical: 4 }}
            >
              <Text style={{ color: colors.subtext ?? colors.placeholder, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            {Platform.OS === 'ios' ? (
              <TouchableOpacity
                onPress={() => {
                  if (pickerMode === 'date') {
                    setPickerMode('time');
                    return;
                  }
                  onChange(formatLocalDateTimeValue(draftDate));
                  setPickerVisible(false);
                  setPickerMode('date');
                }}
                style={{ paddingHorizontal: 6, paddingVertical: 4 }}
              >
                <Text style={{ color: '#4F46E5', fontSize: 13, fontWeight: '700' }}>
                  {pickerMode === 'date' ? 'Next' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
