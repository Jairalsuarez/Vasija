import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export async function signUp(
  email: string,
  password: string,
  profile: {
    name: string;
    age: number;
    gender: string;
  },
): Promise<{ user: Profile | null; error: string | null }> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    if (authError.message?.includes('already exists')) {
      return { user: null, error: 'Este correo ya está registrado. Inicia sesión.' };
    }
    if (authError.message?.includes('429') || (authError as any)?.status === 429) {
      return { user: null, error: 'Demasiados intentos. Espera un momento.' };
    }
    return { user: null, error: authError.message };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { user: null, error: 'Error al crear la cuenta.' };
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfile) {
    return { user: existingProfile as Profile, error: null };
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      account_name: profile.name,
      app_theme: profile.gender === 'male' ? 'male-blue' : profile.gender === 'female' ? 'female-rose' : 'neutral',
    })
    .select()
    .single();

  if (profileError) {
    return { user: null, error: profileError.message };
  }

  return { user: profileData as Profile, error: null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: Profile | null; error: string | null }> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    if (authError.message?.includes('Invalid login credentials')) {
      return { user: null, error: 'Correo o contraseña incorrectos' };
    }
    return { user: null, error: authError.message };
  }
  if (!authData.user) return { user: null, error: 'Usuario no encontrado' };

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileData) return { user: profileData as Profile, error: null };

  return { user: null, error: 'Perfil no encontrado.' };
}

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return { error: error?.message ?? null };
}
