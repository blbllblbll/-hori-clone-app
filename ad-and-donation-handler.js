/**
 * 리워드 광고 시청 + 후원(IAP) 결제 처리 예시 (React Native / Expo)
 *
 * 설치:
 *   npm install react-native-google-mobile-ads react-native-iap
 *
 * 주의: 아래 코드는 구조 예시이며, 실제 광고 단위 ID / 상품 ID는
 * AdMob 콘솔 및 App Store Connect / Play Console에서 발급받아야 합니다.
 */

import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import * as IAP from 'react-native-iap';
import { supabase } from './supabaseClient'; // 프로젝트의 Supabase 클라이언트

// ---------- 1. 리워드 광고 ----------

const AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-xxxxxxxx/xxxxxxxxxx';

const rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_ID);

/**
 * 광고를 로드하고, 사용자가 끝까지 시청하면 서버에 보상 요청을 보낸다.
 * 실제 크레딧 지급은 클라이언트가 아니라 서버(Edge Function)가 수행한다.
 */
export function loadAndShowRewardedAd({ userId, onGranted, onError }) {
  const unsubscribeLoaded = rewardedAd.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => rewardedAd.show()
  );

  const unsubscribeEarned = rewardedAd.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    async () => {
      try {
        // 클라이언트에서 직접 크레딧을 올리지 않고, 서버 함수 호출로 검증 위임
        const { data, error } = await supabase.functions.invoke('grant-ad-credit', {
          body: { userId },
        });
        if (error) throw error;
        onGranted?.(data.newCreditBalance);
      } catch (e) {
        onError?.(e);
      }
    }
  );

  const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
    unsubscribeLoaded();
    unsubscribeEarned();
    unsubscribeClosed();
  });

  rewardedAd.load();
}

// ---------- 2. 후원(IAP 소모성 상품) ----------

// App Store Connect / Play Console에 등록한 소모성 상품 ID
export const DONATION_SKUS = {
  tier1: 'donation_tier1_2000won', // +5 질문권
  tier2: 'donation_tier2_5000won', // +12 질문권
  tier3: 'donation_tier3_10000won', // +20 질문권
};

export async function initIAP() {
  await IAP.initConnection();
}

export async function purchaseDonationTier(sku) {
  // 결제창 표시 → 결제 완료 시 purchaseUpdatedListener에서 처리
  await IAP.requestPurchase({ sku });
}

/**
 * 앱 최상단(App.tsx 등)에서 한 번만 등록해두는 결제 완료 리스너.
 * 결제 영수증을 서버로 보내 검증한 뒤 크레딧을 지급받는다.
 */
export function setupPurchaseListener({ userId, onGranted, onError }) {
  const purchaseUpdateSubscription = IAP.purchaseUpdatedListener(async (purchase) => {
    try {
      const receipt = purchase.transactionReceipt;
      if (!receipt) return;

      const { data, error } = await supabase.functions.invoke('verify-donation-receipt', {
        body: {
          userId,
          productId: purchase.productId,
          receipt,
          platform: IAP.getIosModule ? 'ios' : 'android', // 실제로는 Platform.OS 사용 권장
        },
      });
      if (error) throw error;

      await IAP.finishTransaction({ purchase, isConsumable: true });
      onGranted?.(data.newCreditBalance);
    } catch (e) {
      onError?.(e);
    }
  });

  return () => purchaseUpdateSubscription.remove();
}
