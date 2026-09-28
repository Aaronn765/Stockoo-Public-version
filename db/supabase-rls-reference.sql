-- Optional Supabase-only example; not executed by the local PostgreSQL test.
-- The helper binds access to the verified Supabase Auth identity.

CREATE OR REPLACE FUNCTION public.demo_can_access_store(target_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.demo_stores AS s
    JOIN public.demo_organization_members AS om
      ON om.organization_id = s.organization_id
    LEFT JOIN public.demo_store_members AS sm
      ON sm.store_id = s.store_id
     AND sm.user_id = om.user_id
    WHERE s.store_id = target_store_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND (
        om.role = 'owner'
        OR (sm.user_id IS NOT NULL AND sm.status = 'active')
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.demo_can_access_store(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_can_access_store(uuid) TO authenticated;

ALTER TABLE public.demo_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_products_select_for_store_members ON public.demo_products;
CREATE POLICY demo_products_select_for_store_members
ON public.demo_products
FOR SELECT
TO authenticated
USING (public.demo_can_access_store(store_id));
