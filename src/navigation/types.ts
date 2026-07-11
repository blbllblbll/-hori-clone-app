import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BirthInput, ChatCategory } from '../types';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Calculating: { birth: BirthInput };
  Main: NavigatorScreenParams<MainTabParamList>;
  Credits: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Chat: { initialCategory?: ChatCategory } | undefined;
  MyPage: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
