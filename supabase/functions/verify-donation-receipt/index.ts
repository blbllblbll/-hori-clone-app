/**
 * IAP 후원 결제 완료 후 호출되는 Edge Function.
 * 원본 설계: docs/design/supabase-credit-functions.ts
 *
 * 배포:
 *   supabase functions deploy verify-donation-receipt
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const CREDIT_BY_PRODUCT: Record<string, number> = {
  donation_tier1_1500won: 5,
  donation_tier2_3000won: 12,
  donation_tier3_5000won: 20,
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // 서버 전용 키, 클라이언트에 절대 노출 금지
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, productId, purchaseToken, platform } = await req.json();
    if (!userId || !productId || !purchaseToken) {
      return json({ error: '필수 값이 없어요' }, 400);
    }

    // 1. 중복 지급 방지: 이미 처리된 영수증인지 확인
    const receiptHash = await sha256(purchaseToken);
    const { data: existing } = await supabaseAdmin
      .from('processed_receipts')
      .select('id')
      .eq('receipt_hash', receiptHash)
      .maybeSingle();

    if (existing) {
      return json({ error: '이미 처리된 결제예요' }, 409);
    }

    // 2. 플랫폼별 영수증 검증
    const isValid =
      platform === 'ios'
        ? await verifyAppleReceipt(purchaseToken)
        : await verifyGoogleReceipt(purchaseToken, productId);

    if (!isValid) {
      return json({ error: '결제 검증 실패' }, 400);
    }

    // 3. 크레딧 지급
    const creditsToAdd = CREDIT_BY_PRODUCT[productId] ?? 0;
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (userError) {
      return json({ error: '사용자를 찾을 수 없어요' }, 404);
    }

    const newBalance = (user?.credits ?? 0) + creditsToAdd;

    await supabaseAdmin.from('users').update({ credits: newBalance }).eq('id', userId);
    await supabaseAdmin.from('processed_receipts').insert({
      receipt_hash: receiptHash,
      user_id: userId,
      product_id: productId,
    });

    return json({ newCreditBalance: newBalance }, 200);
  } catch (error) {
    console.error(error);
    return json({ error: '알 수 없는 오류가 발생했어요' }, 500);
  }
});

// 실제 구현 시 Apple 서버와 통신하는 로직으로 교체
// https://developer.apple.com/documentation/appstorereceipts
async function verifyAppleReceipt(_purchaseToken: string): Promise<boolean> {
  return true; // TODO: 실제 검증 로직 구현
}

// 실제 구현 시 Google Play Developer API와 통신하는 로직으로 교체
// https://developers.google.com/android-publisher (Purchases.products.get)
async function verifyGoogleReceipt(_purchaseToken: string, _productId: string): Promise<boolean> {
  return true; // TODO: 실제 검증 로직 구현
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
