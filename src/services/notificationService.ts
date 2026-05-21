import { supabase } from '../lib/supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const { data } = await supabase
    .from('app_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data as AppNotification[]) || [];
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}
