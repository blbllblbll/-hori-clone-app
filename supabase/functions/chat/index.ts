/**
 * "호리"와의 채팅 요청을 처리하는 Edge Function.
 *
 * Claude API 키는 클라이언트에 절대 노출하지 않는다. 크레딧 차감도
 * 클라이언트가 아니라 여기(서버)에서만 수행한다
 * (docs/design/credit-system-design.md, docs/design/app-architecture.md 4절).
 *
 * 배포:
 *   supabase functions deploy chat
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
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

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: '인증이 필요해요' }, 401);
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !authData.user) {
      return json({ error: '인증에 실패했어요' }, 401);
    }
    const userId = authData.user.id;

    const { conversationId, category, message } = await req.json();
    if (!conversationId || !category || !message) {
      return json({ error: '필수 값이 없어요' }, 400);
    }

    const { data: userRow, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      return json({ error: '사용자를 찾을 수 없어요' }, 404);
    }

    if (userRow.credits < CHAT_CREDIT_COST) {
      return json({ error: '질문권이 부족해요' }, 402);
    }

    const { data: profile } = await supabaseAdmin
      .from('saju_profiles')
      .select('analysis')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      return json({ error: '먼저 생년월일 분석을 완료해주세요' }, 400);
    }

    const { data: history } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const systemPrompt = HORI_SYSTEM_PROMPT_TEMPLATE.replace(
      '{{계산결과}}',
      formatAnalysisContext(profile.analysis)
    ).replace('{{카테고리}}', CATEGORY_LABELS[category] ?? category);

    const claudeMessages = [
      ...(history ?? []).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const reply = await callClaude(systemPrompt, claudeMessages);

    const newBalance = userRow.credits - CHAT_CREDIT_COST;

    await supabaseAdmin.from('messages').insert([
      { conversation_id: conversationId, user_id: userId, role: 'user', category, content: message },
      { conversation_id: conversationId, user_id: userId, role: 'assistant', category, content: reply },
    ]);
    await supabaseAdmin.from('users').update({ credits: newBalance }).eq('id', userId);

    return json({ reply, remainingCredits: newBalance }, 200);
  } catch (error) {
    console.error(error);
    return json({ error: '알 수 없는 오류가 발생했어요' }, 500);
  }
});

async function callClaude(system: string, messages: { role: string; content: string }[]): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
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
    throw new Error(`Claude API 오류 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
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
