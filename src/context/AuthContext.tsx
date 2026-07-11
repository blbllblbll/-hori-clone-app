import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabaseClient';

interface AuthContextValue {
  userId: string | null;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({ userId: null, isReady: false });

/**
 * 이 앱은 별도 로그인 화면 없이(app-architecture.md 화면 흐름 참고) 익명 인증으로
 * 사용자를 식별한다. users.credits 같은 서버 상태는 이 userId를 키로 저장된다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function ensureSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (mounted) {
          setSession(data.session);
          setIsReady(true);
        }
        return;
      }

      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('익명 로그인 실패', error);
      }
      if (mounted) {
        setSession(signInData?.session ?? null);
        setIsReady(true);
      }
    }

    ensureSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ userId: session?.user.id ?? null, isReady }),
    [session, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
