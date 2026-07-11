import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';

interface CreditBadgeProps {
  credits: number | null;
  onPress?: () => void;
}

export default function CreditBadge({ credits, onPress }: CreditBadgeProps) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Text style={styles.icon}>🪙</Text>
      <Text style={styles.text}>{credits === null ? '-' : credits}개 남음</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
});
