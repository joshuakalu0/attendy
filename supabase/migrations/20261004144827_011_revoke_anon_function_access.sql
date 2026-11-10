-- Revoke EXECUTE from anon on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.check_branch_limit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_seat_limit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_managed_branch_ids(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_branch_ids(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_geofence(uuid, double precision, double precision, double precision) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_schedule(uuid, date, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_check_in(uuid, uuid, double precision, double precision, double precision, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_check_out(uuid, double precision, double precision, double precision) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_permissions() FROM anon;
