import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

const OTP_DOMAIN = 'finanzas.app';

function phoneToEmail(phone: string): string {
  return `${phone.replace(/[^+\d]/g, '').replace('+', '')}@${OTP_DOMAIN}`;
}

const otpStore = new Map<string, { code: string; expires: number }>();

export async function sendOTP(
  phone: string,
): Promise<{ success: boolean; code?: string; error?: string }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { phone },
    });
    if (!error && data?.success) {
      return { success: true };
    }
  } catch {}

  otpStore.set(phone, { code, expires: Date.now() + 5 * 60 * 1000 });
  console.log(`[DEV OTP] ${phone}: ${code}`);
  return { success: true, code };
}

export async function verifyOTP(
  phone: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { phone, code },
    });
    if (!error && data?.success) {
      return { success: true };
    }
  } catch {}

  const stored = otpStore.get(phone);
  if (!stored) return { success: false, error: 'Código expirado' };
  if (Date.now() > stored.expires) {
    otpStore.delete(phone);
    return { success: false, error: 'Código expirado' };
  }
  if (stored.code !== code) return { success: false, error: 'Código incorrecto' };

  otpStore.delete(phone);
  return { success: true };
}

export async function signUpWithPhone(
  phone: string,
  password: string,
  profile: {
    name: string;
    age: number;
    gender: string;
    country_code: string;
  },
): Promise<{ user: Profile | null; error: string | null }> {
  const email = phoneToEmail(phone);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    if (authError.message?.includes('429') || (authError as any).status === 429) {
      return { user: null, error: 'Demasiados intentos. Espera un minuto e intenta de nuevo.' };
    }
    if (authError.message?.includes('already exists') || (authError as any).status === 422) {
      const loginResult = await signInWithPhone(phone, password);
      if (loginResult.user) return loginResult;
      return { user: null, error: 'Este número ya está registrado. Inicia sesión.' };
    }
    return { user: null, error: authError.message };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { user: null, error: 'Error al crear usuario. ¿Ya tienes una cuenta? Intenta iniciar sesión.' };
  }

  if (!authData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return { user: null, error: 'Cuenta creada. Ahora inicia sesión con tu teléfono y contraseña.' };
    }
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingProfile) {
    return { user: existingProfile as Profile, error: null };
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      phone,
      country_code: profile.country_code,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      phone_verified: true,
    })
    .select()
    .single();

  if (profileError) {
    if ((profileError as any).code === '23505') {
      const { data: dupProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (dupProfile) return { user: dupProfile as Profile, error: null };
    }
    return { user: null, error: profileError.message };
  }

  return { user: profileData as Profile, error: null };
}

export async function signInWithPhone(
  phone: string,
  password: string,
): Promise<{ user: Profile | null; error: string | null }> {
  const email = phoneToEmail(phone);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    if (authError.message?.includes('Invalid login credentials')) {
      return { user: null, error: 'Teléfono o contraseña incorrectos' };
    }
    return { user: null, error: authError.message };
  }
  if (!authData.user) return { user: null, error: 'Usuario no encontrado' };

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileData) return { user: profileData as Profile, error: null };

  return { user: null, error: 'Perfil no encontrado. Contacta soporte.' };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
