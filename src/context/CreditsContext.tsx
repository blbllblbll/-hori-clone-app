import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

interface CreditsContextValue {
  credits: number | null;
  isLoading: boolean;
  refreshCredits: () => Promise<void>;
  setCredits: (value: number) => void;
}

const CreditsContext = createContext<CreditsContextValue>({
  credits: null,
  isLoading: true,
  refreshCredits: async () => {},
  setCredits: () => {},
});

/**
 * credits는 users 테이블에 서버가 관리하는 값이다. 클라이언트는 절대 직접
 * 증감시키지 않고, Edge Function 응답으로 받은 최신값만 반영한다
 * (docs/design/credit-system-design.md 1절).
 */
export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { userId, isReady } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCredits = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    const { data, error } = await supabase.from('users').select('credits').eq('id', userId).single();
    if (error) {
      console.error('크레딧 조회 실패', error);
    } else {
      setCredits(data?.credits ?? 0);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (isReady && userId) {
      refreshCredits();
    }
  }, [isReady, userId, refreshCredits]);

  const value = useMemo(
    () => ({ credits, isLoading, refreshCredits, setCredits }),
    [credits, isLoading, refreshCredits]
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits() {
  return useContext(CreditsContext);
}
