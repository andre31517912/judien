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
    setDraftDate(parsedValue ?? new Date());
    setPickerMode('date');
    setPickerVisible(true);
  };

  // Android: two native dialogs, date then time
  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setPickerVisible(false);
      setPickerMode('date');
      return;
    }
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

      {/* Android: native dialog — renders outside view hierarchy automatically */}
      {pickerVisible && Platform.OS === 'android' ? (
        <DateTimePicker
          key={pickerMode}
          value={draftDate}
          mode={pickerMode}
          display="default"
          onChange={handleAndroidChange}
        />
      ) : null}

      {/* iOS: bottom-sheet Modal so the picker is outside any ScrollView */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={pickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerVisible(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
            activeOpacity={1}
            onPress={() => setPickerVisible(false)}
          />
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 34,
          }}>
            {/* Header bar */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.subtext ?? colors.placeholder }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onChange(formatLocalDateTimeValue(draftDate));
                  setPickerVisible(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#4F46E5' }}>Confirm</Text>
              </TouchableOpacity>
            </View>

            {/* Inline datetime picker — reliable when not inside a ScrollView */}
            <DateTimePicker
              value={draftDate}
              mode="datetime"
              display="inline"
              onChange={(_, date) => { if (date) setDraftDate(date); }}
              accentColor="#4F46E5"
              style={{ backgroundColor: colors.card, alignSelf: 'center' }}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
