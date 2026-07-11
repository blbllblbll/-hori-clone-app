import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../constants/theme';
import { useBirthProfile } from '../context/BirthProfileContext';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Calculating'>;

const STEPS = ['사주팔자 계산 중...', '점성술 네이탈 계산 중...', '자미두수 명반 준비 중...'];

export default function CalculatingScreen({ route, navigation }: Props) {
  const { calculateAndSave } = useBirthProfile();
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 500);

    (async () => {
      try {
        await calculateAndSave(route.params.birth);
        setTimeout(() => {
          navigation.replace('Main', { screen: 'Dashboard' } as never);
        }, STEPS.length * 500);
      } catch (e) {
        console.error('계산 실패', e);
        setErrorMessage('계산 중 문제가 생겼어요. 다시 시도해주세요.');
      }
    })();

    return () => clearInterval(stepTimer);
  }, [calculateAndSave, navigation, route.params.birth]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.step}>{errorMessage ?? STEPS[stepIndex]}</Text>
      {errorMessage && (
        <Text style={styles.retry} onPress={() => navigation.replace('Onboarding')}>
          다시 입력하기
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  step: { ...typography.body, color: colors.text },
  retry: { ...typography.caption, color: colors.primary, textDecorationLine: 'underline' },
});
