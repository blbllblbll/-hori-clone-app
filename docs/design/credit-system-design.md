# 광고 · 후원 기반 질문권(크레딧) 시스템 설계

## 1. 개념

유료 구독/일괄결제 대신, "질문권"이라는 소모성 크레딧을 아래 방법으로 충전합니다.

| 방법 | 보상 | 비고 |
|---|---|---|
| 리워드 광고 시청 1회 | +2 질문권 | 하루 최대 시청 횟수 제한 필요 (예: 5회/일) |
| 후원 티어 1 (예: 1,500원) | +5 질문권 | IAP 소모성 상품 |
| 후원 티어 2 (예: 3,000원) | +12 질문권 | IAP 소모성 상품 (보너스 포함) |
| 후원 티어 3 (예: 5,000원) | +20 질문권 | IAP 소모성 상품 (보너스 포함) |
| 신규 가입 | +1 질문권 | 첫 체험용 무료 크레딧 |

- 질문권은 서버(Supabase) DB의 `users.credits` 컬럼에 정수로 저장
- 클라이언트에서 직접 credits를 증가시키지 않고, **반드시 서버 함수(Edge Function)를 통해서만** 증감
- 광고 시청 완료 콜백, IAP 영수증 모두 서버에서 검증 후 크레딧 지급 (클라이언트 조작 방지)

## 2. 필요한 도구

| 용도 | 추천 |
|---|---|
| 리워드 광고 | `react-native-google-mobile-ads` (공식 AdMob RN 라이브러리) |
| 인앱결제 | `react-native-iap` 또는 RevenueCat (consumable 상품 지원) |
| 서버 검증 | Supabase Edge Function (Deno) |
| 어뷰징 방지 | 광고 SSV(Server-Side Verification) 콜백 + 일일 시청 횟수 제한 |

## 3. 플로우

```
[사용자] 질문권 0개 → "질문권 얻기" 화면
   ├─ 광고 보기 버�튼
   │     └▶ 리워드 광고 재생 완료
   │           └▶ AdMob SSV 콜백 → Supabase Edge Function 검증
   │                 └▶ users.credits += 2
   │
   └─ 후원하기 버튼 (티어 선택)
         └▶ IAP 결제 완료 → 영수증(receipt) 서버 전송
               └▶ Edge Function이 Apple/Google 서버에 영수증 검증
                     └▶ users.credits += (티어별 수량)
```

## 4. 어뷰징 방지 체크리스트

- [ ] 광고 보상은 반드시 AdMob의 SSV(Server-Side Verification) 콜백으로 지급 (클라이언트 콜백만 믿지 않기)
- [ ] IAP는 반드시 영수증을 서버에서 Apple/Google에 재검증 후 지급
- [ ] 동일 영수증으로 중복 지급되지 않도록 거래 ID(transaction id) 저장 및 중복 체크
- [ ] 광고 시청 일일 한도 설정 (무한 반복 시청으로 크레딧 파밍 방지)
