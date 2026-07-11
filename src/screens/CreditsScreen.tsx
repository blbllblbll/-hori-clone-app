import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import CreditBadge from '../components/CreditBadge';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../constants/theme';
import { AD_DAILY_WATCH_LIMIT, DONATION_TIERS } from '../constants/credits';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/CreditsContext';
import { loadAndShowRewardedAd, purchaseDonationTier } from '../lib/adAndDonationHandler';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Credits'>;

// "질문권 얻기" 화면. 크레딧은 클라이언트에서 직접 올리지 않고 항상 서버 응답값을 반영한다
// (docs/design/credit-system-design.md 3절 플로우 참고)
export default function CreditsScreen({}: Props) {
  const { userId } = useAuth();
  const { credits, setCredits } = useCredits();
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);

  function handleWatchAd() {
    if (!userId) return;
    setIsWatchingAd(true);
    loadAndShowRewardedAd({
      userId,
      onGranted: (newBalance) => {
        setIsWatchingAd(false);
        setCredits(newBalance);
        Alert.alert('질문권 지급 완료', `현재 ${newBalance}개를 가지고 있어요.`);
      },
      onError: (error) => {
        setIsWatchingAd(false);
        const message = error instanceof Error ? error.message : '오늘 시청 한도를 초과했을 수 있어요.';
        Alert.alert('광고를 불러오지 못했어요', message);
      },
    });
  }

  async function handleDonate(tierId: (typeof DONATION_TIERS)[number]['id']) {
    if (!userId) return;
    setPurchasingTier(tierId);
    try {
      await purchaseDonationTier(tierId);
      // 실제 크레딧 지급은 App.tsx에 등록된 setupPurchaseListener가 처리한다.
    } catch (error) {
      const message = error instanceof Error ? error.message : '결제를 시작하지 못했어요.';
      Alert.alert('결제 오류', message);
    } finally {
      setPurchasingTier(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>광고를 보거나 후원하고 질문을 이어가 보세요.</Text>
          <CreditBadge credits={credits} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎬 리워드 광고 시청</Text>
          <Text style={styles.cardBody}>광고 1회 시청 시 +2 질문권 (하루 최대 {AD_DAILY_WATCH_LIMIT}회)</Text>
          <PrimaryButton label="광고 보기" onPress={handleWatchAd} loading={isWatchingAd} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💜 후원하기</Text>
          {DONATION_TIERS.map((tier) => (
            <View key={tier.id} style={styles.tierRow}>
              <View>
                <Text style={styles.tierLabel}>{tier.priceLabel}</Text>
                <Text style={styles.tierCredits}>+{tier.credits} 질문권</Text>
              </View>
              <PrimaryButton
                label="후원"
                onPress={() => handleDonate(tier.id)}
                loading={purchasingTier === tier.id}
                variant="secondary"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  subtitle: { ...typography.body, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { ...typography.subtitle, color: colors.text },
  cardBody: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tierLabel: { ...typography.body, color: colors.text, fontWeight: '600' },
  tierCredits: { ...typography.caption, color: colors.textMuted },
});
