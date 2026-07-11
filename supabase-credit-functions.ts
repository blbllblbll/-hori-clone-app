/**
 * Supabase Edge Function 예시 (Deno 런타임)
 *
 * 실제로는 두 개의 함수로 분리해서 배포하세요:
 *   supabase functions deploy grant-ad-credit
 *   supabase functions deploy verify-donation-receipt
 *
 * 이 파일은 두 함수의 핵심 로직을 한 곳에 모아둔 "설계 예시"입니다.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // 서버 전용 키, 클라이언트에 절대 노출 금지
);

// ---------- 함수 1: grant-ad-credit ----------
// AdMob 리워드 광고 시청 완료 후 호출됨

export async function handleGrantAdCredit(req: Request) {
  const { userId } = await req.json();

  // 1. 일일 광고 시청 한도 체크 (예: 하루 5회)
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabaseAdmin
    .from('ad_reward_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00Z`);

  if ((count ?? 0) >= 5) {
    return new Response(JSON.stringify({ error: '오늘 시청 한도를 초과했어요' }), {
      status: 429,
    });
  }

  // 2. (권장) AdMob SSV 콜백 서명 검증 로직을 여기에 추가
  //    https://developers.google.com/admob/android/rewarded-video-ssv 참고

  // 3. 크레딧 지급 + 로그 기록 (원자적으로 처리하려면 DB 함수/트랜잭션 권장)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  const newBalance = (user?.credits ?? 0) + 2;

  await supabaseAdmin.from('users').update({ credits: newBalance }).eq('id', userId);
  await supabaseAdmin.from('ad_reward_logs').insert({ user_id: userId });

  return new Response(JSON.stringify({ newCreditBalance: newBalance }), { status: 200 });
}

// ---------- 함수 2: verify-donation-receipt ----------
// IAP 결제 완료 후 호출됨

const CREDIT_BY_PRODUCT: Record<string, number> = {
  donation_tier1_2000won: 5,
  donation_tier2_5000won: 12,
  donation_tier3_10000won: 20,
};

export async function handleVerifyDonationReceipt(req: Request) {
  const { userId, productId, receipt, platform } = await req.json();

  // 1. 중복 지급 방지: 이미 처리된 영수증인지 확인
  const { data: existing } = await supabaseAdmin
    .from('processed_receipts')
    .select('id')
    .eq('receipt_hash', receipt.slice(0, 100)) // 실제로는 해시값 저장 권장
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: '이미 처리된 결제예요' }), { status: 409 });
  }

  // 2. 플랫폼별 영수증 검증 (실제 구현 시 각 서버 API 호출 필요)
  const isValid =
    platform === 'ios'
      ? await verifyAppleReceipt(receipt)
      : await verifyGoogleReceipt(receipt, productId);

  if (!isValid) {
    return new Response(JSON.stringify({ error: '결제 검증 실패' }), { status: 400 });
  }

  // 3. 크레딧 지급
  const creditsToAdd = CREDIT_BY_PRODUCT[productId] ?? 0;
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  const newBalance = (user?.credits ?? 0) + creditsToAdd;

  await supabaseAdmin.from('users').update({ credits: newBalance }).eq('id', userId);
  await supabaseAdmin.from('processed_receipts').insert({
    receipt_hash: receipt.slice(0, 100),
    user_id: userId,
    product_id: productId,
  });

  return new Response(JSON.stringify({ newCreditBalance: newBalance }), { status: 200 });
}

// 실제 구현 시 Apple/Google 서버와 통신하는 로직으로 교체
async function verifyAppleReceipt(receipt: string) {
  // https://developer.apple.com/documentation/appstorereceipts
  return true; // TODO: 실제 검증 로직 구현
}

async function verifyGoogleReceipt(receipt: string, productId: string) {
  // https://developers.google.com/android-publisher (Purchases.products.get)
  return true; // TODO: 실제 검증 로직 구현
}
