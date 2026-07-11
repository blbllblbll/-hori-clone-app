import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Chip from '../components/Chip';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../constants/theme';
import type { RootStackParamList } from '../navigation/types';
import type { BirthInput, CalendarType } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const PRESET_PLACES = [
  { name: '서울', longitude: 126.98, latitude: 37.57 },
  { name: '부산', longitude: 129.08, latitude: 35.18 },
  { name: '대구', longitude: 128.6, latitude: 35.87 },
  { name: '인천', longitude: 126.7, latitude: 37.46 },
  { name: '광주', longitude: 126.85, latitude: 35.16 },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [birthDate, setBirthDate] = useState<Date>(new Date(2000, 0, 1, 12, 0));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [calendarType, setCalendarType] = useState<CalendarType>('solar');
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [placeIndex, setPlaceIndex] = useState(0);

  const place = PRESET_PLACES[placeIndex];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>태어난 순간을 알려주세요</Text>
        <Text style={styles.subtitle}>정확한 사주/점성술 계산을 위해 필요해요.</Text>

        <Text style={styles.label}>양력 · 음력</Text>
        <View style={styles.row}>
          <Chip label="양력" selected={calendarType === 'solar'} onPress={() => setCalendarType('solar')} />
          <Chip label="음력" selected={calendarType === 'lunar'} onPress={() => setCalendarType('lunar')} />
        </View>
        {calendarType === 'lunar' && (
          <Pressable style={styles.checkboxRow} onPress={() => setIsLeapMonth((v) => !v)}>
            <View style={[styles.checkbox, isLeapMonth && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>윤달이에요</Text>
          </Pressable>
        )}

        <Text style={styles.label}>생년월일</Text>
        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputText}>
            {birthDate.getFullYear()}년 {birthDate.getMonth() + 1}월 {birthDate.getDate()}일
          </Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={birthDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_event, selected) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selected) setBirthDate((prev) => mergeDatePart(prev, selected));
            }}
          />
        )}

        <Text style={styles.label}>태어난 시간</Text>
        <Pressable style={styles.input} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.inputText}>
            {String(birthDate.getHours()).padStart(2, '0')}시 {String(birthDate.getMinutes()).padStart(2, '0')}분
          </Text>
        </Pressable>
        {showTimePicker && (
          <DateTimePicker
            value={birthDate}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_event, selected) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (selected) setBirthDate((prev) => mergeTimePart(prev, selected));
            }}
          />
        )}

        <Text style={styles.label}>출생지</Text>
        <View style={styles.wrapRow}>
          {PRESET_PLACES.map((p, index) => (
            <Chip key={p.name} label={p.name} selected={placeIndex === index} onPress={() => setPlaceIndex(index)} />
          ))}
        </View>

        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          <Chip label="여성" selected={gender === 'female'} onPress={() => setGender('female')} />
          <Chip label="남성" selected={gender === 'male'} onPress={() => setGender('male')} />
        </View>

        <Text style={styles.disclaimer}>
          호리의 풀이는 오락 · 자기이해를 위한 참고 자료예요. 확정된 사실이나 전문적인 조언을 대체하지 않아요.
        </Text>

        <PrimaryButton
          label="분석 시작하기"
          onPress={() => {
            const birth: BirthInput = {
              year: birthDate.getFullYear(),
              month: birthDate.getMonth() + 1,
              day: birthDate.getDate(),
              hour: birthDate.getHours(),
              minute: birthDate.getMinutes(),
              calendarType,
              isLeapMonth,
              gender,
              placeName: place.name,
              longitude: place.longitude,
              latitude: place.latitude,
            };
            navigation.navigate('Calculating', { birth });
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function mergeDatePart(prev: Date, datePart: Date) {
  const next = new Date(prev);
  next.setFullYear(datePart.getFullYear(), datePart.getMonth(), datePart.getDate());
  return next;
}

function mergeTimePart(prev: Date, timePart: Date) {
  const next = new Date(prev);
  next.setHours(timePart.getHours(), timePart.getMinutes());
  return next;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  inputText: { ...typography.body, color: colors.text },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { ...typography.body, color: colors.text },
  disclaimer: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
