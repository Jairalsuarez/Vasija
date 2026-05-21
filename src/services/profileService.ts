import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error loading profile:', error);
    return null;
  }

  return data as Profile | null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl })
    .eq('id', userId);

  if (updateError) return { url: null, error: updateError.message };

  return { url: urlData.publicUrl, error: null };
}
