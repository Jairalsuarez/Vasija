import { supabase } from '../lib/supabase';

export interface ThemeChangeRequest {
  id: string;
  joint_account_id: string;
  requester_id: string;
  proposed_theme: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  responded_at: string | null;
}

export async function proposeThemeChange(
  jointAccountId: string,
  proposedTheme: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('propose_theme_change', {
    p_joint_account_id: jointAccountId,
    p_proposed_theme: proposedTheme,
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function respondThemeChange(
  requestId: string,
  accept: boolean,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('respond_theme_change', {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function getPendingThemeChange(
  jointAccountId: string,
): Promise<ThemeChangeRequest | null> {
  const { data, error } = await supabase.rpc('get_pending_theme_change', {
    p_joint_account_id: jointAccountId,
  });
  if (error || !data) return null;
  const result = data as any;
  if (!result?.id) return null;
  return {
    id: result.id,
    joint_account_id: jointAccountId,
    requester_id: result.requester_id,
    proposed_theme: result.proposed_theme,
    status: 'pending',
    created_at: result.created_at,
    responded_at: null,
  };
}
