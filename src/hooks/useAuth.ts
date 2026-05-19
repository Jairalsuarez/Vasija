import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore, useCoupleStore } from '../store';

export function useAuth() {
  const { setProfile, setAuthenticated, setSessionReady, logout, profile } =
    useProfileStore();

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user) {
          setAuthenticated(true);
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (data && !cancelled) {
            const prof = data as any;
            setProfile(prof);
            if (prof.partner_id) {
              console.log("[DEBUG AUTH] Loading partner info for ID:", prof.partner_id);
              const { data: rawPartner, error: rpcErr } = await supabase
                .rpc('get_partner_info', { partner_id: prof.partner_id })
                .single();
              if (rpcErr) {
                console.error("[DEBUG AUTH] Error in get_partner_info RPC:", rpcErr);
              } else {
                console.log("[DEBUG AUTH] Partner data loaded successfully:", rawPartner);
              }
              const partnerData = rawPartner as { name: string; avatar_url: string | null; couple_alias: string | null } | null;
              useCoupleStore.getState().setLinked(true);
              useCoupleStore.getState().setPartner(
                partnerData?.name || 'Pareja',
                partnerData?.avatar_url || null,
                partnerData?.couple_alias
              );
            } else {
              useCoupleStore.getState().resetCouple();
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        logout();
      }
      if (session?.user) {
        setAuthenticated(true);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { profile, isAuthenticated: !!profile };
}
