import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { analyzeBirth } from '../lib/sajuCalculator';
import { supabase } from '../lib/supabaseClient';
import type { BirthAnalysis, BirthInput } from '../types';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'hori.birthAnalysis.v1';

interface BirthProfileContextValue {
  analysis: BirthAnalysis | null;
  isRestoring: boolean;
  calculateAndSave: (birth: BirthInput) => Promise<BirthAnalysis>;
  clear: () => Promise<void>;
}

const BirthProfileContext = createContext<BirthProfileContextValue>({
  analysis: null,
  isRestoring: true,
  calculateAndSave: async () => {
    throw new Error('BirthProfileProvider가 없어요');
  },
  clear: async () => {},
});

export function BirthProfileProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [analysis, setAnalysis] = useState<BirthAnalysis | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setAnalysis(JSON.parse(stored));
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  const calculateAndSave = useCallback(
    async (birth: BirthInput) => {
      // 사주/음력/점성술 계산은 항상 라이브러리로만 수행한다 (계산과 해석의 분리).
      const result = analyzeBirth(birth);
      setAnalysis(result);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result));

      if (userId) {
        const { error } = await supabase.from('saju_profiles').upsert({
          user_id: userId,
          birth_input: birth,
          analysis: result,
        });
        if (error) {
          console.error('사주 프로필 저장 실패', error);
        }
      }

      return result;
    },
    [userId]
  );

  const clear = useCallback(async () => {
    setAnalysis(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ analysis, isRestoring, calculateAndSave, clear }),
    [analysis, isRestoring, calculateAndSave, clear]
  );

  return <BirthProfileContext.Provider value={value}>{children}</BirthProfileContext.Provider>;
}

export function useBirthProfile() {
  return useContext(BirthProfileContext);
}
