import React from 'react';
import { Text, View } from 'react-native';

import type { SajuPillars } from '../types';
import SummaryCard, { rowStyles } from './SummaryCard';

export default function SajuSummaryCard({ saju }: { saju: SajuPillars }) {
  return (
    <SummaryCard icon="🀄" title="사주팔자 요약">
      <View style={rowStyles.row}>
        <Text style={rowStyles.label}>년주</Text>
        <Text style={rowStyles.value}>{saju.yearPillar} ({saju.yearPillarHanja})</Text>
      </View>
      <View style={rowStyles.row}>
        <Text style={rowStyles.label}>월주</Text>
        <Text style={rowStyles.value}>{saju.monthPillar} ({saju.monthPillarHanja})</Text>
      </View>
      <View style={rowStyles.row}>
        <Text style={rowStyles.label}>일주</Text>
        <Text style={rowStyles.value}>{saju.dayPillar} ({saju.dayPillarHanja})</Text>
      </View>
      <View style={rowStyles.row}>
        <Text style={rowStyles.label}>시주</Text>
        <Text style={rowStyles.value}>
          {saju.hourPillar ? `${saju.hourPillar} (${saju.hourPillarHanja})` : '미상'}
        </Text>
      </View>
    </SummaryCard>
  );
}
