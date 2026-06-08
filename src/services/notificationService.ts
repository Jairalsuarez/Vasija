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

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  return !error;
}

export async function markNotificationsRead(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const { error } = await supabase
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids);

  return !error;
}

export async function clearNotifications(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('app_notifications')
    .delete()
    .eq('user_id', userId);

  return !error;
}

export async function clearNotificationsByIds(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const { error } = await supabase.rpc('clear_notifications_by_ids', {
    p_notification_ids: ids,
  });

  if (error) {
    console.warn('Error clearing notifications:', error);
    return false;
  }

  return true;
}
