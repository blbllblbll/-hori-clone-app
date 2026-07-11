import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AstrologySummaryCard from '../components/AstrologySummaryCard';
import CreditBadge from '../components/CreditBadge';
import PrimaryButton from '../components/PrimaryButton';
import SajuSummaryCard from '../components/SajuSummaryCard';
import ZiweiSummaryCard from '../components/ZiweiSummaryCard';
import { colors, spacing, typography } from '../constants/theme';
import { useBirthProfile } from '../context/BirthProfileContext';
import { useCredits } from '../context/CreditsContext';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Dashboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function DashboardScreen({ navigation }: Props) {
  const { analysis } = useBirthProfile();
  const { credits } = useCredits();

  if (!analysis) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.empty}>아직 계산된 분석이 없어요.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{analysis.birth.placeName}에서 태어난 당신</Text>
          <CreditBadge credits={credits} onPress={() => navigation.navigate('Credits')} />
        </View>

        <SajuSummaryCard saju={analysis.saju} />
        <AstrologySummaryCard astrology={analysis.astrology} />
        <ZiweiSummaryCard ziwei={analysis.ziwei} />

        <PrimaryButton label="호리에게 물어보기" onPress={() => navigation.navigate('Chat', undefined)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
