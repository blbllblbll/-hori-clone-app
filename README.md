# 호리 (Hori) — 사주 · 점성술 AI 챗봇

React Native(Expo) + Supabase + Claude 기반 사주/점성술/자미두수 해석 앱.
설계 원본은 [`docs/design/`](./docs/design)에 있습니다 (`app-architecture.md`,
`saju-calculator.js`, `hori-persona-prompt.md`, `credit-system-design.md`,
`ad-and-donation-handler.js`, `supabase-credit-functions.ts`).

## 화면 흐름

```
스플래시 → 온보딩(생년월일시/출생지/성별/양음력) → 계산 로딩
  → 메인 탭 [대시보드 | 호리(챗) | 마이페이지]
        대시보드: 사주팔자 · 점성술 · 자미두수 요약 카드
        챗: 카테고리(연애/재물/직업/오늘의 운세) + 대화 + 이용권 소진 시 결제 모달
        마이페이지: 저장한 분석, 남은 질문권, 대화 기록 다시보기
  → 질문권 얻기(모달): 리워드 광고 시청 / 후원(IAP)
```

## 프로젝트 구조

```
App.tsx                        앱 진입점 (Provider 조합 + 네비게이션)
src/
  types/                       공용 타입 (BirthAnalysis, ChatMessage 등)
  constants/                   테마, 크레딧 정책 상수
  lib/
    sajuCalculator.ts          사주/음력/점성술 계산 (계산과 해석의 분리)
    horiPersonaPrompt.ts       "호리" 페르소나 시스템 프롬프트
    claudeClient.ts            Claude 호출은 항상 Edge Function(chat-with-hori)을 경유
    adAndDonationHandler.ts    리워드 광고 + IAP 후원 클라이언트 로직
    supabaseClient.ts
  context/                     Auth / Credits / BirthProfile 전역 상태
  navigation/                  RootNavigator, MainTabNavigator
  screens/                     Splash, Onboarding, Calculating, Dashboard, Chat, Credits, MyPage
  components/                  SummaryCard류, ChatBubble, PaymentModal 등
supabase/
  schema.sql                   users/saju_profiles/messages/ad_reward_logs/processed_receipts
  functions/
    chat-with-hori/            Claude 프록시 + 크레딧 차감 (서버에서만 수행)
    grant-ad-credit/           광고 시청 보상 지급
    verify-donation-receipt/   IAP 영수증 검증 + 크레딧 지급
```

## 핵심 설계 원칙 (docs/design/app-architecture.md 4절)

- **계산과 해석의 분리**: 간지/행성 위치는 라이브러리로만 계산하고, Claude에게는
  결과만 넘겨 해석시킨다 (`sajuCalculator.ts` → `chat-with-hori` Edge Function).
- **크레딧은 서버 전용**: 클라이언트는 `users.credits`를 직접 증감하지 않는다.
  광고 시청/IAP 결제/채팅 차감 모두 Edge Function(서비스 롤)에서만 처리한다.
- **자미두수 명반**: 공개 라이브러리가 없어 현재는 자리표시자(`ZiweiSummaryCard`)만
  있다. 실제 배포 전 전용 성계 배치 로직으로 교체해야 한다.

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수

`.env.example`을 복사해 `.env`를 만들고 Supabase 프로젝트 값을 채운다.

```bash
cp .env.example .env
```

### 3. Supabase 백엔드 준비

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push            # supabase/schema.sql 적용
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy chat-with-hori
supabase functions deploy grant-ad-credit
supabase functions deploy verify-donation-receipt
```

Supabase Auth에서 **Anonymous Sign-in**을 활성화해야 한다 (이 앱은 별도 로그인 화면
없이 익명 인증으로 사용자를 식별한다).

### 4. AdMob / IAP 상품 설정

- AdMob 콘솔에서 리워드 광고 단위 ID 발급 후 `app.json`의 `androidAppId` /
  `iosAppId`와 `.env`의 `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID`를 교체한다.
  (현재 값은 Google 공식 **테스트용** 샘플 ID다.)
- App Store Connect / Play Console에 `src/constants/credits.ts`의
  `DONATION_TIERS` productId와 동일한 소모성 상품을 등록한다.

### 5. 실행

```bash
npm run start      # Expo Go / 개발 빌드
npm run android
npm run ios
npm run typecheck
```

> 리워드 광고(`react-native-google-mobile-ads`)와 IAP(`react-native-iap`)는
> 네이티브 모듈이라 Expo Go에서 동작하지 않는다. `npx expo run:android` /
> `npx expo run:ios` 또는 EAS 개발 빌드로 테스트해야 한다.
