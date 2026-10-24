import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import type { PrivateProfile, Profile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  // null when signed out or the profile row is missing.
  profile: Profile | null;
  // Birthday and guidelines agreement; null until the user finishes setup.
  privateProfile: PrivateProfile | null;
  // Can use the moderation screen (set from the SQL Editor only).
  isAdmin: boolean;
  // Banned by a moderator: can't post, join or chat.
  isBanned: boolean;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  privateProfile: null,
  isAdmin: false,
  isBanned: false,
  isLoading: true,
  refreshProfile: async () => {},
});

async function fetchProfile(userId: string) {
  const [profile, privateProfile, admin, ban] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('profile_private').select('*').eq('id', userId).maybeSingle(),
    supabase.rpc('is_admin'),
    supabase.from('bans').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);
  return {
    userId,
    profile: profile.data as Profile | null,
    privateProfile: privateProfile.data as PrivateProfile | null,
    isAdmin: admin.data === true,
    isBanned: !!ban.data,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  // Remember whose profile we loaded, so a stale one never shows after switching accounts.
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof fetchProfile>> | null>(null);

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
  const privateProfile = userId && profileLoaded ? loaded.privateProfile : null;
  const isAdmin = !!userId && profileLoaded && loaded.isAdmin;
  const isBanned = !!userId && profileLoaded && loaded.isBanned;
  const isLoading = !sessionLoaded || (!!userId && !profileLoaded);

  return (
    <AuthContext.Provider
      value={{ session, profile, privateProfile, isAdmin, isBanned, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
