import { useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

    // iOS spinner should not auto-advance; users confirm using Next/Confirm actions.
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
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {clearable && value ? (
          <TouchableOpacity onPress={() => onChange('')}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity style={styles.inputButton} onPress={openPicker} activeOpacity={0.8}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {parsedValue ? formatDisplayValue(parsedValue, locale) : placeholder}
        </Text>
      </TouchableOpacity>

      {pickerVisible ? (
        <View style={styles.pickerWrap}>
          <Text style={styles.helperText}>{pickerMode === 'date' ? 'Select date' : 'Select time'}</Text>
          <DateTimePicker
            value={draftDate}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handlePickerChange}
          />
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => {
                setPickerVisible(false);
                setPickerMode('date');
              }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
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
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmText}>{pickerMode === 'date' ? 'Next' : 'Confirm'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151' },
  clearText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  inputButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  valueText: { fontSize: 15, color: '#111827' },
  placeholderText: { fontSize: 15, color: '#9CA3AF' },
  pickerWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 8,
  },
  helperText: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  actionsRow: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 10 },
  cancelBtn: { alignSelf: 'flex-end', paddingHorizontal: 6, paddingVertical: 4 },
  cancelText: { color: '#4F46E5', fontSize: 13, fontWeight: '600' },
  confirmBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  confirmText: { color: '#4F46E5', fontSize: 13, fontWeight: '700' },
});