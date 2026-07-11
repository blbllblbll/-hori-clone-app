import React, { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import CategoryButton from '../components/CategoryButton';
import ChatBubble from '../components/ChatBubble';
import CreditBadge from '../components/CreditBadge';
import PaymentModal from '../components/PaymentModal';
import { colors, spacing, typography } from '../constants/theme';
import { useCredits } from '../context/CreditsContext';
import { CATEGORY_LABELS, DISCLAIMER } from '../lib/horiPersonaPrompt';
import { sendChatMessage } from '../lib/claudeClient';
import { createLocalId } from '../lib/uuid';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { ChatCategory, ChatMessage } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Chat'>,
  NativeStackScreenProps<RootStackParamList>
>;

const CATEGORIES: ChatCategory[] = ['today', 'love', 'wealth', 'career'];

export default function ChatScreen({ route, navigation }: Props) {
  const { credits, setCredits } = useCredits();
  const [category, setCategory] = useState<ChatCategory>(route.params?.initialCategory ?? 'today');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createLocalId(),
      role: 'assistant',
      content: `안녕하세요, 호리예요. 무엇이든 편하게 물어보세요.\n\n${DISCLAIMER}`,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const conversationId = useMemo(() => createLocalId(), []);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    if ((credits ?? 0) <= 0) {
      setShowPaymentModal(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: createLocalId(),
      role: 'user',
      content: trimmed,
      category,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const result = await sendChatMessage({ conversationId, category, message: trimmed });
      setMessages((prev) => [
        ...prev,
        {
          id: createLocalId(),
          role: 'assistant',
          content: result.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
      setCredits(result.remainingCredits);
    } catch (e) {
      console.error('메시지 전송 실패', e);
      setMessages((prev) => [
        ...prev,
        {
          id: createLocalId(),
          role: 'assistant',
          content: '답변을 가져오는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <CategoryButton
              category={item}
              label={CATEGORY_LABELS[item]}
              selected={category === item}
              onPress={setCategory}
            />
          )}
        />
        <CreditBadge credits={credits} onPress={() => navigation.navigate('Credits')} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => <ChatBubble message={item} />}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={`${CATEGORY_LABELS[category]}에 대해 물어보세요`}
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Text style={styles.sendButton} onPress={handleSend}>
            {isSending ? '...' : '보내기'}
          </Text>
        </View>
      </KeyboardAvoidingView>

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onWatchAd={() => {
          setShowPaymentModal(false);
          navigation.navigate('Credits');
        }}
        onDonate={() => {
          setShowPaymentModal(false);
          navigation.navigate('Credits');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  categoryList: { gap: spacing.sm, flexGrow: 1 },
  messageList: { padding: spacing.md, flexGrow: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    maxHeight: 120,
  },
  sendButton: {
    ...typography.subtitle,
    color: colors.primary,
    paddingVertical: spacing.sm,
  },
});
