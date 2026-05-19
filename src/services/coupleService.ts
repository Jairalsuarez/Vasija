import { supabase } from '../lib/supabase';

interface CodeOwner {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

export async function generateCoupleLink(
  userId: string,
): Promise<{ code: string | null; error: string | null }> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const { error } = await supabase.from('couple_links').insert({
    user_id: userId,
    code,
  });

  if (error) return { code: null, error: error.message };
  return { code, error: null };
}

export async function lookupCode(
  code: string,
): Promise<{ name: string | null; avatar: string | null; partnerId: string | null; error: string | null }> {
  const { data: rawData, error: rpcError } = await supabase
    .rpc('get_code_owner', { code_text: code })
    .single();

  const data = rawData as unknown as CodeOwner | null;

  if (rpcError || !data) {
    return { name: null, avatar: null, partnerId: null, error: 'Código inválido' };
  }

  return {
    name: data.name || null,
    avatar: data.avatar_url || null,
    partnerId: data.user_id,
    error: null,
  };
}

export async function linkWithCode(
  userId: string,
  code: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data: rawData, error: rpcError } = await supabase
    .rpc('get_code_owner', { code_text: code })
    .single();

  const data = rawData as unknown as CodeOwner | null;

  if (rpcError || !data) {
    return { success: false, error: 'Código inválido' };
  }

  const partnerId = data.user_id;
  if (partnerId === userId) {
    return { success: false, error: 'No puedes vincularte contigo mismo' };
  }

  const { error: linkError } = await supabase.rpc('link_couple', {
    user_id: userId,
    partner_id: partnerId,
  });

  if (linkError) return { success: false, error: linkError.message };

  return { success: true, error: null };
}

export interface CoupleDetails {
  id: string;
  user1_id: string;
  user2_id: string;
  together_since: string | null;
  anniversary_date: string | null;
  is_married: boolean;
  is_sealed: boolean;
  created_at: string;
}

export async function getCoupleDetails(userId: string, partnerId: string): Promise<CoupleDetails | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    console.error('Error fetching couple details:', error);
    return null;
  }

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from('couples')
      .insert({
        user1_id: userId < partnerId ? userId : partnerId,
        user2_id: userId < partnerId ? partnerId : userId,
        is_married: false,
        is_sealed: false,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating couple row:', insertError);
      return null;
    }
    return inserted as CoupleDetails;
  }

  return data as CoupleDetails;
}

export async function updateCoupleDetails(
  coupleId: string,
  updates: Partial<CoupleDetails>
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('couples')
    .update(updates)
    .eq('id', coupleId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}
