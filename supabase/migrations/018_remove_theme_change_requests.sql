DROP TRIGGER IF EXISTS theme_change_request_notifications ON theme_change_requests;
DROP FUNCTION IF EXISTS notify_theme_change_request();
DROP FUNCTION IF EXISTS propose_theme_change(UUID, TEXT);
DROP FUNCTION IF EXISTS respond_theme_change(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_pending_theme_change(UUID);
DROP TABLE IF EXISTS theme_change_requests;
