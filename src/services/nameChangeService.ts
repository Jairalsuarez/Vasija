import { supabase } from '../lib/supabase';
import type { NameChangeRequest } from '../types';

export async function proposeNameChange(
  jointAccountId: string,
  proposedName: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('propose_name_change', {
    p_joint_account_id: jointAccountId,
    p_proposed_name: proposedName,
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function respondNameChange(
  requestId: string,
  accept: boolean,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('respond_name_change', {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function getPendingNameChange(
  jointAccountId: string,
): Promise<NameChangeRequest | null> {
  const { data, error } = await supabase.rpc('get_pending_name_change', {
    p_joint_account_id: jointAccountId,
  });
  if (error || !data) return null;
  const result = data as any;
  if (!result?.id) return null;
  return {
    id: result.id,
    joint_account_id: jointAccountId,
    requester_id: result.requester_id,
    proposed_name: result.proposed_name,
    status: 'pending',
    created_at: result.created_at,
    responded_at: null,
  };
}
