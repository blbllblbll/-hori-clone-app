import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CalculatingScreen from '../screens/CalculatingScreen';
import CreditsScreen from '../screens/CreditsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SplashScreen from '../screens/SplashScreen';
import MainTabNavigator from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// 화면 흐름: 스플래시 -> 온보딩 -> 계산 로딩 -> 메인(대시보드/챗/마이페이지)
// docs/design/app-architecture.md 2절 참고
export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Calculating" component={CalculatingScreen} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen
        name="Credits"
        component={CreditsScreen}
        options={{ presentation: 'modal', headerShown: true, title: '질문권 얻기' }}
      />
    </Stack.Navigator>
  );
}
