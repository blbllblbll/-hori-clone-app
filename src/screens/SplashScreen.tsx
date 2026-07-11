import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useBirthProfile } from '../context/BirthProfileContext';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const { isReady: authReady } = useAuth();
  const { analysis, isRestoring } = useBirthProfile();

  useEffect(() => {
    if (!authReady || isRestoring) return;

    const timer = setTimeout(() => {
      if (analysis) {
        navigation.replace('Main', { screen: 'Dashboard' });
      } else {
        navigation.replace('Onboarding');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [authReady, isRestoring, analysis, navigation]);

  return (
    <LinearGradient colors={[colors.background, colors.surfaceAlt]} style={styles.container}>
      <Text style={styles.logo}>호리</Text>
      <Text style={styles.tagline}>사주 · 점성술 · 자미두수를 한 번에</Text>
      <ActivityIndicator style={styles.spinner} color={colors.primary} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logo: {
    ...typography.title,
    fontSize: 40,
    color: colors.text,
    fontWeight: '700',
  },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
  },
  spinner: {
    marginTop: spacing.xl,
  },
});
