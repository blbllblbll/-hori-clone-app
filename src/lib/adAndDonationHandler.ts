/**
 * 리워드 광고 시청 + 후원(IAP) 결제 처리
 * 원본 설계: docs/design/ad-and-donation-handler.js
 *
 * 크레딧은 절대 클라이언트에서 직접 증가시키지 않는다. 광고 시청/결제가
 * 끝나면 Supabase Edge Function을 호출해 서버에서 검증 후 지급한다
 * (docs/design/credit-system-design.md 1절).
 */
import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import {
  initConnection,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  type Purchase,
} from 'react-native-iap';

import { supabase } from './supabaseClient';
import { DONATION_TIERS } from '../constants/credits';
import type { DonationTier } from '../types';

// ---------- 1. 리워드 광고 ----------

const AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : (process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID ?? TestIds.REWARDED);

interface LoadAndShowRewardedAdParams {
  userId: string;
  onGranted?: (newCreditBalance: number) => void;
  onError?: (error: unknown) => void;
}

/**
 * 광고를 로드하고, 사용자가 끝까지 시청하면 서버에 보상 요청을 보낸다.
 * 실제 크레딧 지급은 클라이언트가 아니라 서버(Edge Function)가 수행한다.
 */
export function loadAndShowRewardedAd({ userId, onGranted, onError }: LoadAndShowRewardedAdParams) {
  const rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_ID);

  const unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedAd.show();
  });

  const unsubscribeEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
    try {
      const { data, error } = await supabase.functions.invoke('grant-ad-credit', {
        body: { userId },
      });
      if (error) throw error;
      onGranted?.(data.newCreditBalance);
    } catch (e) {
      onError?.(e);
    }
  });

  const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
    onError?.(error);
  });

  const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
    unsubscribeLoaded();
    unsubscribeEarned();
    unsubscribeError();
    unsubscribeClosed();
  });

  rewardedAd.load();
}

// ---------- 2. 후원(IAP 소모성 상품) ----------

export async function initIAP() {
  await initConnection();
}

export async function purchaseDonationTier(tier: DonationTier) {
  const product = DONATION_TIERS.find((t) => t.id === tier);
  if (!product) throw new Error(`알 수 없는 후원 티어예요: ${tier}`);

  // 결제창 표시 → 결제 완료 시 purchaseUpdatedListener에서 처리
  await requestPurchase({
    request: {
      apple: { sku: product.productId },
      google: { skus: [product.productId] },
    },
    type: 'in-app',
  });
}

interface SetupPurchaseListenerParams {
  userId: string;
  onGranted?: (newCreditBalance: number) => void;
  onError?: (error: unknown) => void;
}

/**
 * 앱 최상단(App.tsx)에서 한 번만 등록해두는 결제 완료 리스너.
 * 결제 토큰을 서버로 보내 검증한 뒤 크레딧을 지급받는다.
 */
export function setupPurchaseListener({ userId, onGranted, onError }: SetupPurchaseListenerParams) {
  const updateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
    try {
      const purchaseToken = purchase.purchaseToken;
      if (!purchaseToken) return;

      const { data, error } = await supabase.functions.invoke('verify-donation-receipt', {
        body: {
          userId,
          productId: purchase.productId,
          purchaseToken,
          platform: Platform.OS,
        },
      });
      if (error) throw error;

      await finishTransaction({ purchase, isConsumable: true });
      onGranted?.(data.newCreditBalance);
    } catch (e) {
      onError?.(e);
    }
  });

  const errorSub = purchaseErrorListener((error) => {
    onError?.(error);
  });

  return () => {
    updateSub.remove();
    errorSub.remove();
  };
}
