import React from 'react';
import { Text, View } from 'react-native';

import type { AstrologyInfo } from '../types';
import SummaryCard, { rowStyles } from './SummaryCard';

export default function AstrologySummaryCard({ astrology }: { astrology: AstrologyInfo }) {
  return (
    <SummaryCard icon="🌌" title="점성술 네이탈 요약">
      <View style={rowStyles.row}>
        <Text style={rowStyles.label}>태양 황경</Text>
        <Text style={rowStyles.value}>{astrology.sunEclipticLongitude.toFixed(1)}°</Text>
      </View>
      <View style={rowStyles.row}>
        <Text style={rowStyles.label}>달 적경 / 적위</Text>
        <Text style={rowStyles.value}>
          {astrology.moon.rightAscension.toFixed(1)}h / {astrology.moon.declination.toFixed(1)}°
        </Text>
      </View>
      <View style={rowStyles.row}>
        <Text style={rowStyles.label}>주요 행성</Text>
        <Text style={rowStyles.value}>{astrology.planets.length}개 계산됨</Text>
      </View>
    </SummaryCard>
  );
}
