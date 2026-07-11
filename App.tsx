import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BirthProfileProvider } from './src/context/BirthProfileContext';
import { CreditsProvider, useCredits } from './src/context/CreditsContext';
import { initIAP, setupPurchaseListener } from './src/lib/adAndDonationHandler';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/constants/theme';

function PurchaseListenerBridge() {
  const { userId } = useAuth();
  const { setCredits } = useCredits();

  useEffect(() => {
    if (!userId) return;

    let removeListener: (() => void) | undefined;

    initIAP()
      .then(() => {
        removeListener = setupPurchaseListener({
          userId,
          onGranted: setCredits,
          onError: (error) => console.error('후원 결제 처리 실패', error),
        });
      })
      .catch((error) => console.error('IAP 초기화 실패', error));

    return () => removeListener?.();
  }, [userId, setCredits]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CreditsProvider>
          <BirthProfileProvider>
            <PurchaseListenerBridge />
            <NavigationContainer theme={navigationTheme}>
              <RootNavigator />
            </NavigationContainer>
            <StatusBar style="light" />
          </BirthProfileProvider>
        </CreditsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};
