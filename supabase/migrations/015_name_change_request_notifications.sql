CREATE OR REPLACE FUNCTION notify_name_change_request()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_sender_name TEXT;
BEGIN
  SELECT partner_id, COALESCE(account_name, name, 'Tu pareja')
  INTO v_partner_id, v_sender_name
  FROM profiles
  WHERE id = NEW.requester_id;

  IF v_partner_id IS NOT NULL THEN
    PERFORM notify_user(
      v_partner_id,
      'Solicitud de cambio',
      v_sender_name || ' quiere cambiar el nombre de la cuenta a "' || NEW.proposed_name || '".',
      'info',
      jsonb_build_object(
        'scope', 'couple',
        'route', '/accounts?type=joint&focus=name-request',
        'name_change_request_id', NEW.id,
        'joint_account_id', NEW.joint_account_id,
        'proposed_name', NEW.proposed_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS name_change_request_notifications ON name_change_requests;
CREATE TRIGGER name_change_request_notifications
AFTER INSERT ON name_change_requests
FOR EACH ROW
EXECUTE FUNCTION notify_name_change_request();
