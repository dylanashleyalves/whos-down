import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import type { Profile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  // null when signed out or the profile row is missing.
  profile: Profile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

async function fetchProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { userId, profile: data as Profile | null };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  // Remember whose profile we loaded, so a stale one never shows after switching accounts.
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchProfile(userId).then((result) => {
      if (active) setLoaded(result);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    setLoaded(await fetchProfile(userId));
  }, [userId]);

  const profileLoaded = loaded !== null && loaded.userId === userId;
  const profile = userId && profileLoaded ? loaded.profile : null;
  const isLoading = !sessionLoaded || (!!userId && !profileLoaded);

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
