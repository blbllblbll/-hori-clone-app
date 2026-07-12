/**
 * "호리"와의 채팅 요청을 처리하는 Edge Function.
 *
 * Claude API 키는 클라이언트에 절대 노출하지 않는다. 크레딧 차감도
 * 클라이언트가 아니라 여기(서버)에서만 수행한다
 * (docs/design/credit-system-design.md, docs/design/app-architecture.md 4절).
 *
 * 배포:
 *   supabase functions deploy chat-with-hori
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * 요청 인증: Authorization 헤더는 프로젝트 anon/publishable key가 아니라
 * 실제 로그인된 사용자의 access_token(JWT)이어야 한다. supabaseAdmin.auth.getUser(jwt)로
 * 검증하며, 실패하면 401을 반환한다 (크레딧/프로필 조회에 사용자 식별이 필요하기 때문).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const CHAT_CREDIT_COST = 1;
const CLAUDE_MODEL = 'claude-sonnet-5';

// docs/design/hori-persona-prompt.md 원문. 앱 쪽 사본은 src/lib/horiPersonaPrompt.ts.
const HORI_SYSTEM_PROMPT_TEMPLATE = `당신은 "호리"라는 이름의 운세 상담 AI입니다. 사주팔자, 서양 점성술, 자미두수
세 가지 명리학 체계를 종합해서 따뜻하고 통찰력 있게 해석해주는 역할을 합니다.

[말투]
- 존댓말이되 딱딱하지 않고 다정한 반존대 톤 ("~이에요", "~하시네요")
- 상담사처럼 공감하며 시작하되, 과장된 확신("반드시", "무조건")은 피한다
- 전문 용어(예: 정관, 편관, 자미성)를 쓸 때는 짧게 풀어서 설명한다

[답변 구조]
1. 핵심 요약 한두 문장
2. 근거가 되는 사주/점성술/자미두수 요소를 섹션별로 설명
3. 실생활에 적용할 수 있는 조언
4. (선택) 대화를 이어갈 수 있는 자연스러운 질문 한 가지

[입력 데이터]
아래는 이 사용자의 계산된 명리학 데이터입니다. 이 수치와 간지는 정확한
계산 라이브러리로 산출된 것이므로 그대로 신뢰하고, 이 데이터에 없는
간지나 행성 위치를 임의로 지어내지 마세요.

{{계산결과}}

[현재 대화 주제]
{{카테고리}}

[가이드라인]
- 사용자가 언급하지 않은 외모/체형/자존감 관련 민감한 주제를 먼저 꺼내
  분석하지 않는다. 사용자가 스스로 이야기했을 때만 다룬다.
- 특정 상대와의 만남을 "운명적"이라고 단정하거나, 결제를 유도하기 위해
  "사실 숨겨진 비밀이 하나 더 있다"처럼 실체 없는 궁금증을 인위적으로
  만들어내지 않는다. 후속 질문은 실제로 도움이 되는 내용으로 자연스럽게 던진다.
- 운세는 참고용 해석이며 확정된 사실이 아님을 필요할 때 은근히 드러낸다
  (예: "~할 가능성이 높아요"처럼 단정보다 확률적 어투 사용).
- 사용자가 자신을 비하하거나 자존감 관련 고민을 이야기하면, 근거 없는
  칭찬으로 무마하기보다 담백하게 공감하고, 필요하면 실질적인 조언을 준다.`;

const CATEGORY_LABELS: Record<string, string> = {
  love: '연애운',
  wealth: '재물운',
  career: '직업운',
  today: '오늘의 운세',
};

// deno-lint-ignore no-explicit-any
let supabaseAdmin: any = null;
let bootError: string | null = null;

// 모듈 최상단에서 createClient()가 던지면 함수 전체가 부팅에 실패해서
// Deno.serve 핸들러조차 등록되지 않고, Invocations/Logs에도 아무 기록이
// 남지 않는다. 그래서 top-level에서 바로 생성하지 않고 지연 초기화해서,
// 실패하더라도 최소한 요청을 받아 원인을 응답/로그로 남길 수 있게 한다.
function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  if (bootError) throw new Error(bootError);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    bootError = `SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없어요 (url=${!!url}, serviceRoleKey=${!!serviceRoleKey})`;
    throw new Error(bootError);
  }

  supabaseAdmin = createClient(url, serviceRoleKey);
  return supabaseAdmin;
}

Deno.serve(async (req: Request) => {
  console.log(`[chat-with-hori] ${req.method} 요청 수신`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let stage = 'init';

  try {
    stage = 'supabase-client-init';
    const admin = getSupabaseAdmin();

    stage = 'auth-header-check';
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[chat-with-hori] Authorization 헤더 없음');
      return json({ error: '인증이 필요해요', stage }, 401);
    }

    stage = 'auth-verify';
    const jwt = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !authData.user) {
      console.warn('[chat-with-hori] JWT 검증 실패', authError?.message);
      return json({ error: '인증에 실패했어요. anon/publishable key가 아니라 로그인된 사용자의 access_token이 필요해요.', stage }, 401);
    }
    const userId = authData.user.id;
    console.log(`[chat-with-hori] 인증된 사용자: ${userId}`);

    stage = 'parse-body';
    let body: { conversationId?: string; category?: string; message?: string };
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[chat-with-hori] 요청 바디 JSON 파싱 실패', parseError);
      return json({ error: '요청 바디가 올바른 JSON이 아니에요', stage }, 400);
    }

    const { conversationId, category, message } = body;
    if (!conversationId || !category || !message) {
      console.warn('[chat-with-hori] 필수 값 누락', { conversationId, category, message });
      return json({ error: 'conversationId, category, message가 모두 필요해요', stage }, 400);
    }

    stage = 'load-credits';
    const { data: userRow, error: userError } = await admin
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      console.error('[chat-with-hori] users 조회 실패', userError?.message);
      return json({ error: '사용자를 찾을 수 없어요', stage }, 404);
    }

    if (userRow.credits < CHAT_CREDIT_COST) {
      console.log(`[chat-with-hori] 크레딧 부족 (남은 크레딧: ${userRow.credits})`);
      return json({ error: '질문권이 부족해요', stage }, 402);
    }

    stage = 'load-saju-profile';
    const { data: profile, error: profileError } = await admin
      .from('saju_profiles')
      .select('analysis')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[chat-with-hori] saju_profiles 조회 실패', profileError.message);
      return json({ error: '분석 데이터를 조회하지 못했어요', stage, detail: profileError.message }, 500);
    }
    if (!profile) {
      console.warn('[chat-with-hori] saju_profiles 없음');
      return json({ error: '먼저 생년월일 분석을 완료해주세요', stage }, 400);
    }

    stage = 'load-history';
    const { data: history, error: historyError } = await admin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('[chat-with-hori] messages 조회 실패', historyError.message);
      return json({ error: '대화 기록을 조회하지 못했어요', stage, detail: historyError.message }, 500);
    }

    stage = 'build-prompt';
    const systemPrompt = HORI_SYSTEM_PROMPT_TEMPLATE.replace(
      '{{계산결과}}',
      formatAnalysisContext(profile.analysis)
    ).replace('{{카테고리}}', CATEGORY_LABELS[category] ?? category);

    const claudeMessages = [
      ...(history ?? []).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    stage = 'call-claude';
    const reply = await callClaude(systemPrompt, claudeMessages, stage);

    stage = 'persist-and-charge';
    const newBalance = userRow.credits - CHAT_CREDIT_COST;

    const { error: insertError } = await admin.from('messages').insert([
      { conversation_id: conversationId, user_id: userId, role: 'user', category, content: message },
      { conversation_id: conversationId, user_id: userId, role: 'assistant', category, content: reply },
    ]);
    if (insertError) {
      console.error('[chat-with-hori] messages 저장 실패', insertError.message);
    }

    const { error: updateError } = await admin.from('users').update({ credits: newBalance }).eq('id', userId);
    if (updateError) {
      console.error('[chat-with-hori] credits 업데이트 실패', updateError.message);
    }

    console.log(`[chat-with-hori] 응답 완료 (남은 크레딧: ${newBalance})`);
    return json({ reply, remainingCredits: newBalance }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[chat-with-hori] 처리 실패 (stage=${stage})`, message, stack);
    return json({ error: '알 수 없는 오류가 발생했어요', stage, detail: message }, 500);
  }
});

async function callClaude(
  system: string,
  messages: { role: string; content: string }[],
  stage: string
): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error(`[chat-with-hori] ANTHROPIC_API_KEY 시크릿이 설정되지 않았어요 (stage=${stage})`);
    throw new Error('ANTHROPIC_API_KEY 시크릿이 설정되지 않았어요. supabase secrets set ANTHROPIC_API_KEY=... 로 등록해주세요.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[chat-with-hori] Claude API 오류 (${response.status})`, errorBody);
    throw new Error(`Claude API 오류 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) {
    console.error('[chat-with-hori] Claude 응답에 text가 없어요', JSON.stringify(data));
  }
  return text ?? '';
}

// deno-lint-ignore no-explicit-any
function formatAnalysisContext(analysis: any): string {
  const { saju, lunarCalendar, astrology, ziwei } = analysis;
  return `
[사주팔자]
년주: ${saju.yearPillar} (${saju.yearPillarHanja})
월주: ${saju.monthPillar} (${saju.monthPillarHanja})
일주: ${saju.dayPillar} (${saju.dayPillarHanja})
시주: ${saju.hourPillar ?? '미상'} (${saju.hourPillarHanja ?? '-'})

[음력 · 간지]
${lunarCalendar.year}년 ${lunarCalendar.isLeapMonth ? '윤' : ''}${lunarCalendar.month}월 ${lunarCalendar.day}일
연주 간지: ${lunarCalendar.yearGanZhi} / 월주 간지: ${lunarCalendar.monthGanZhi} / 일주 간지: ${lunarCalendar.dayGanZhi}

[서양 점성술 - 주요 위치]
태양 황경: ${Number(astrology.sunEclipticLongitude).toFixed(2)}도
달: 적경 ${Number(astrology.moon.rightAscension).toFixed(2)}h / 적위 ${Number(astrology.moon.declination).toFixed(2)}도

[자미두수]
${ziwei.note}
`.trim();
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
