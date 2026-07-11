import React from 'react';
import { Text } from 'react-native';

import type { ZiweiPlaceholder } from '../types';
import { colors, typography } from '../constants/theme';
import SummaryCard from './SummaryCard';

export default function ZiweiSummaryCard({ ziwei }: { ziwei: ZiweiPlaceholder }) {
  return (
    <SummaryCard icon="🔮" title="자미두수 명반 요약">
      <Text style={{ ...typography.body, color: colors.textMuted }}>{ziwei.note}</Text>
    </SummaryCard>
  );
}
