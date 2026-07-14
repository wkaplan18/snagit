-- New organizations start on a 14-day free trial (matches the landing page).
-- The dashboard layout locks expired unpaid trials out to /billing.
CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  org_name      TEXT,
  org_type_val  org_type DEFAULT 'builder'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_slug   TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF org_name IS NULL OR length(trim(org_name)) < 2 THEN
    RAISE EXCEPTION 'Organisation name is too short';
  END IF;
  IF EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already belongs to an organisation';
  END IF;

  org_slug := lower(regexp_replace(trim(org_name), '[^a-zA-Z0-9]+', '-', 'g'))
              || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO organizations (name, slug, org_type, is_trial, plan_expires_at)
  VALUES (trim(org_name), org_slug, org_type_val, true, NOW() + INTERVAL '14 days')
  RETURNING id INTO new_org_id;

  INSERT INTO org_members (org_id, user_id, role, accepted_at)
  VALUES (new_org_id, auth.uid(), 'owner', NOW());

  RETURN new_org_id;
END;
$$;
