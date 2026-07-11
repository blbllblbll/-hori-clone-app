import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import PrimaryButton from './PrimaryButton';

interface PaymentModalProps {
  visible: boolean;
  onWatchAd: () => void;
  onDonate: () => void;
  onClose: () => void;
}

// 이용권 소진 시 뜨는 결제 유도 모달 (docs/design/app-architecture.md 2절)
export default function PaymentModal({ visible, onWatchAd, onDonate, onClose }: PaymentModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>질문권이 다 떨어졌어요</Text>
          <Text style={styles.subtitle}>광고를 보거나 후원하고 질문을 이어가 보세요.</Text>

          <View style={styles.actions}>
            <PrimaryButton label="광고 보고 +2개 받기" onPress={onWatchAd} />
            <PrimaryButton label="후원하고 질문권 받기" onPress={onDonate} variant="secondary" />
          </View>

          <Text style={styles.close} onPress={onClose}>
            나중에 할게요
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  actions: { gap: spacing.sm },
  close: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
