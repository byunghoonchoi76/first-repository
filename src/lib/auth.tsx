import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AppUser, Role } from '@/lib/data/types';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

const STORAGE_KEY = 'church-app/local-user';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  /** 샘플 모드: 이름과 역할만으로 로그인. Supabase 모드: 이메일/비밀번호 로그인. */
  signIn: (params: { name?: string; role?: Role; email?: string; password?: string }) => Promise<void>;
  signUp: (params: { name: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadSupabaseUser(): Promise<AppUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) return null;

  // 역할은 profiles 테이블에서 읽습니다. 행이 없으면 일반 성도로 처리합니다.
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    email: authUser.email ?? undefined,
    name: profile?.name ?? authUser.email?.split('@')[0] ?? '성도',
    role: (profile?.role as Role) ?? 'member',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        if (hasSupabaseConfig && supabase) {
          const current = await loadSupabaseUser();
          if (active) setUser(current);
        } else {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (active && stored) setUser(JSON.parse(stored) as AppUser);
        }
      } catch {
        // 로그인 정보를 못 읽어도 앱은 비로그인 상태로 계속 동작합니다.
      } finally {
        if (active) setLoading(false);
      }
    })();

    const subscription = supabase?.auth.onAuthStateChange(() => {
      loadSupabaseUser().then((next) => {
        if (active) setUser(next);
      });
    });

    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(async ({ name, role, email, password }) => {
    if (hasSupabaseConfig && supabase) {
      if (!email || !password) throw new Error('이메일과 비밀번호를 입력해 주세요.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      setUser(await loadSupabaseUser());
      return;
    }

    const localUser: AppUser = {
      id: `local-${Date.now()}`,
      name: name?.trim() || '성도',
      role: role ?? 'member',
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
    setUser(localUser);
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async ({ name, email, password }) => {
    if (!hasSupabaseConfig || !supabase) {
      throw new Error('샘플 모드에서는 가입 없이 바로 시작할 수 있습니다.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, name, role: 'member' });
    }
    setUser(await loadSupabaseUser());
  }, []);

  const signOut = useCallback(async () => {
    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut();
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAdmin: user?.role === 'admin', signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.');
  return context;
}
