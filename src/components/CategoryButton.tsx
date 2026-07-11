import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../constants/theme';
import type { ChatCategory } from '../types';

const CATEGORY_ICONS: Record<ChatCategory, string> = {
  love: '💕',
  wealth: '💰',
  career: '💼',
  today: '☀️',
};

interface CategoryButtonProps {
  category: ChatCategory;
  label: string;
  selected?: boolean;
  onPress: (category: ChatCategory) => void;
}

export default function CategoryButton({ category, label, selected, onPress }: CategoryButtonProps) {
  return (
    <Pressable
      onPress={() => onPress(category)}
      style={[styles.button, selected && styles.buttonSelected]}
    >
      <Text style={styles.icon}>{CATEGORY_ICONS[category]}</Text>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  icon: { fontSize: 14 },
  label: { ...typography.caption, color: colors.text, fontWeight: '600' },
  labelSelected: { color: colors.background },
});
