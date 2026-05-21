import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore, useCoupleStore, useFinanceStore } from '../store';

type AuthProfile = NonNullable<ReturnType<typeof useProfileStore.getState>['profile']>;

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
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error) {
            console.error('Error loading auth profile:', error);
            setAuthenticated(false);
            return;
          }

          let prof = data as AuthProfile | null;

          if (!prof) {
            const fallbackName =
              session.user.user_metadata?.name ||
              session.user.email?.split('@')[0] ||
              'Usuario';

            const { data: createdProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email || null,
                name: fallbackName,
                age: 18,
                gender: 'unspecified',
                phone: '',
                country_code: '+593',
                account_name: fallbackName,
              })
              .select('*')
              .single();

            if (createError) {
              console.error('Error creating missing profile:', createError);
              setAuthenticated(false);
              return;
            }

            prof = createdProfile as AuthProfile;
          }

          if (prof && !cancelled) {
            setAuthenticated(true);
            setProfile(prof);
            if (prof.partner_id) {
              const { data: rawPartner } = await supabase
                .rpc('get_partner_info', { v_partner_id: prof.partner_id })
                .maybeSingle();
              const partnerData = rawPartner as { name: string; avatar_url: string | null } | null;
              useCoupleStore.getState().setLinked(true);
              useCoupleStore.getState().setPartner(
                partnerData?.name || 'Pareja',
                partnerData?.avatar_url || null,
                prof.partner_alias || null
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
        useCoupleStore.getState().resetCouple();
        useFinanceStore.getState().resetFinance();
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
