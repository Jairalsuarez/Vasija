CREATE OR REPLACE FUNCTION clear_notifications_by_ids(p_notification_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_partner UUID;
  v_deleted INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  SELECT partner_id INTO v_partner
  FROM profiles
  WHERE id = v_user;

  WITH selected_notifications AS (
    SELECT *
    FROM app_notifications
    WHERE user_id = v_user
      AND id = ANY(p_notification_ids)
  ),
  own_deleted AS (
    DELETE FROM app_notifications target
    USING selected_notifications selected
    WHERE target.id = selected.id
    RETURNING target.id
  ),
  partner_deleted AS (
    DELETE FROM app_notifications target
    USING selected_notifications selected
    WHERE v_partner IS NOT NULL
      AND target.user_id = v_partner
      AND selected.metadata->>'scope' = 'couple'
      AND target.metadata->>'scope' = 'couple'
      AND (
        (selected.metadata ? 'movement_id' AND target.metadata->>'movement_id' = selected.metadata->>'movement_id')
        OR (selected.metadata ? 'home_slug' AND target.metadata->>'home_slug' = selected.metadata->>'home_slug' AND COALESCE(target.metadata->>'schedule_id', '') = COALESCE(selected.metadata->>'schedule_id', ''))
        OR (selected.metadata ? 'name_change_request_id' AND target.metadata->>'name_change_request_id' = selected.metadata->>'name_change_request_id')
        OR (selected.metadata ? 'theme_change_request_id' AND target.metadata->>'theme_change_request_id' = selected.metadata->>'theme_change_request_id')
      )
    RETURNING target.id
  )
  SELECT COUNT(*) INTO v_deleted
  FROM (
    SELECT id FROM own_deleted
    UNION ALL
    SELECT id FROM partner_deleted
  ) deleted_rows;

  RETURN jsonb_build_object('success', true, 'deleted', v_deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION clear_notifications_by_ids(UUID[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
