
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_manage_orders(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_orders(uuid) TO authenticated, service_role;
