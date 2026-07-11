import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import CreditBadge from '../components/CreditBadge';
import PrimaryButton from '../components/PrimaryButton';
import SummaryCard, { rowStyles } from '../components/SummaryCard';
import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useBirthProfile } from '../context/BirthProfileContext';
import { useCredits } from '../context/CreditsContext';
import { CATEGORY_LABELS } from '../lib/horiPersonaPrompt';
import { supabase } from '../lib/supabaseClient';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { ChatCategory } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyPage'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface RecentConversation {
  category: ChatCategory;
  lastMessage: string;
  updatedAt: string;
}

export default function MyPageScreen({ navigation }: Props) {
  const { userId } = useAuth();
  const { credits } = useCredits();
  const { analysis, clear } = useBirthProfile();
  const [recent, setRecent] = useState<RecentConversation[]>([]);

  const loadRecentConversations = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('category, content, created_at')
      .eq('user_id', userId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('대화 기록 조회 실패', error);
      return;
    }

    const seen = new Set<string>();
    const items: RecentConversation[] = [];
    for (const row of data ?? []) {
      if (seen.has(row.category)) continue;
      seen.add(row.category);
      items.push({ category: row.category, lastMessage: row.content, updatedAt: row.created_at });
    }
    setRecent(items);
  }, [userId]);

  useEffect(() => {
    loadRecentConversations();
  }, [loadRecentConversations]);

  function handleResetProfile() {
    Alert.alert('다시 계산할까요?', '저장된 생년월일 정보가 초기화돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: async () => {
          await clear();
          navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>마이페이지</Text>
          <CreditBadge credits={credits} onPress={() => navigation.navigate('Credits')} />
        </View>

        <SummaryCard icon="🪙" title="이용권">
          <View style={rowStyles.row}>
            <Text style={rowStyles.label}>남은 질문권</Text>
            <Text style={rowStyles.value}>{credits ?? '-'}개</Text>
          </View>
          <PrimaryButton label="질문권 더 받기" onPress={() => navigation.navigate('Credits')} />
        </SummaryCard>

        {analysis && (
          <SummaryCard icon="📁" title="저장한 분석 결과">
            <View style={rowStyles.row}>
              <Text style={rowStyles.label}>생년월일</Text>
              <Text style={rowStyles.value}>
                {analysis.birth.year}.{analysis.birth.month}.{analysis.birth.day}
              </Text>
            </View>
            <View style={rowStyles.row}>
              <Text style={rowStyles.label}>사주 일주</Text>
              <Text style={rowStyles.value}>{analysis.saju.dayPillar}</Text>
            </View>
          </SummaryCard>
        )}

        <SummaryCard icon="💬" title="대화 기록 다시보기">
          {recent.length === 0 ? (
            <Text style={styles.emptyText}>아직 나눈 대화가 없어요.</Text>
          ) : (
            recent.map((item) => (
              <Text
                key={item.category}
                style={styles.recentItem}
                onPress={() => navigation.navigate('Chat', { initialCategory: item.category })}
              >
                {CATEGORY_LABELS[item.category]} · {item.lastMessage.slice(0, 24)}...
              </Text>
            ))
          )}
        </SummaryCard>

        <PrimaryButton label="생년월일 다시 입력하기" onPress={handleResetProfile} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.title, color: colors.text },
  emptyText: { ...typography.body, color: colors.textMuted },
  recentItem: {
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
});
