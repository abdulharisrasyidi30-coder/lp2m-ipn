import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Role } from './lib';

export type Profile = {
  id: string; full_name: string; email: string | null;
  role: Role; prodi: string | null; nomor_induk: string | null;
};

type Ctx = {
  session: Session | null; profile: Profile | null; loading: boolean;
  refresh: () => Promise<void>; signOut: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>({} as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) { setProfile(null); setLoading(false); } });
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  const refresh = async () => {
    if (!uid) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
    setLoading(false);
  };
  useEffect(() => { if (uid) void refresh(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const signOut = async () => { await supabase.auth.signOut(); };
  return <AuthCtx.Provider value={{ session, profile, loading, refresh, signOut }}>{children}</AuthCtx.Provider>;
}
