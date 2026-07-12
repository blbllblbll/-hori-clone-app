/**
 * Claude API는 클라이언트에서 직접 호출하지 않는다 (API 키 노출 방지).
 * credit-system-design.md가 크레딧 증감을 서버 함수로만 제한하는 것과 같은 이유로,
 * 채팅 요청도 Supabase Edge Function('chat-with-hori')을 통해서만 보낸다.
 * 이 함수 안에서 크레딧 차감 + Claude 호출 + 대화 저장이 원자적으로 처리된다
 * (supabase/functions/chat-with-hori/index.ts 참고).
 */
import { supabase } from './supabaseClient';
import type { ChatCategory } from '../types';

export interface SendChatMessageParams {
  conversationId: string;
  category: ChatCategory;
  message: string;
}

export interface SendChatMessageResult {
  reply: string;
  remainingCredits: number;
}

export async function sendChatMessage(params: SendChatMessageParams): Promise<SendChatMessageResult> {
  const { data, error } = await supabase.functions.invoke('chat-with-hori', {
    body: params,
  });

  if (error) {
    throw error;
  }

  return data as SendChatMessageResult;
}
