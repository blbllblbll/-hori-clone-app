/**
 * 리워드 광고 시청 완료 후 호출되는 Edge Function.
 * 원본 설계: docs/design/supabase-credit-functions.ts
 *
 * 배포:
 *   supabase functions deploy grant-ad-credit
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const AD_REWARD_CREDITS = 2;
const AD_DAILY_WATCH_LIMIT = 5;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // 서버 전용 키, 클라이언트에 절대 노출 금지
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return json({ error: 'userId가 필요해요' }, 400);
    }

    // 1. 일일 광고 시청 한도 체크
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabaseAdmin
      .from('ad_reward_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00Z`);

    if ((count ?? 0) >= AD_DAILY_WATCH_LIMIT) {
      return json({ error: '오늘 시청 한도를 초과했어요' }, 429);
    }

    // 2. (권장) AdMob SSV 콜백 서명 검증 로직을 여기에 추가
    //    https://developers.google.com/admob/android/rewarded-video-ssv 참고

    // 3. 크레딧 지급 + 로그 기록
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (userError) {
      return json({ error: '사용자를 찾을 수 없어요' }, 404);
    }

    const newBalance = (user?.credits ?? 0) + AD_REWARD_CREDITS;

    await supabaseAdmin.from('users').update({ credits: newBalance }).eq('id', userId);
    await supabaseAdmin.from('ad_reward_logs').insert({ user_id: userId });

    return json({ newCreditBalance: newBalance }, 200);
  } catch (error) {
    console.error(error);
    return json({ error: '알 수 없는 오류가 발생했어요' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
