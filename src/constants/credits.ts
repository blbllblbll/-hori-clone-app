import { CREDIT_PRODUCT_IDS } from '../types';

// docs/design/credit-system-design.md 의 보상 테이블을 그대로 반영
export const NEW_USER_FREE_CREDITS = 1;
export const AD_REWARD_CREDITS = 2;
export const AD_DAILY_WATCH_LIMIT = 5;

export const DONATION_TIERS = [
  { id: 'tier1' as const, productId: CREDIT_PRODUCT_IDS.tier1, priceLabel: '1,500원', credits: 5 },
  { id: 'tier2' as const, productId: CREDIT_PRODUCT_IDS.tier2, priceLabel: '3,000원', credits: 12 },
  { id: 'tier3' as const, productId: CREDIT_PRODUCT_IDS.tier3, priceLabel: '5,000원', credits: 20 },
];

export const CHAT_CREDIT_COST_PER_QUESTION = 1;
