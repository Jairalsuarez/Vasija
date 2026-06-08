DROP POLICY IF EXISTS "Users delete own notifications" ON app_notifications;
CREATE POLICY "Users delete own notifications"
ON app_notifications FOR DELETE
USING (auth.uid() = user_id);
