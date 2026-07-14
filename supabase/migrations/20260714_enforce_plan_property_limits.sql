-- Enforce each paid plan's property (project) limit at creation time.
-- Trials and internal-test orgs stay unrestricted; plans without a
-- known limit (enterprise, legacy 'starter') stay unrestricted too —
-- safer to under-restrict on unrecognized data than lock out a payer.
CREATE OR REPLACE FUNCTION public.enforce_project_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  org_plan             TEXT;
  org_is_trial         BOOLEAN;
  org_is_internal_test BOOLEAN;
  max_allowed          INT;
  current_count        INT;
BEGIN
  SELECT plan, is_trial, is_internal_test
    INTO org_plan, org_is_trial, org_is_internal_test
    FROM organizations
   WHERE id = NEW.org_id;

  IF org_is_trial OR org_is_internal_test THEN
    RETURN NEW;
  END IF;

  max_allowed := CASE org_plan
    WHEN 'solo'       THEN 1
    WHEN 'contractor' THEN 5
    WHEN 'portfolio'  THEN 20
    ELSE NULL
  END;

  IF max_allowed IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO current_count
    FROM projects
   WHERE org_id = NEW.org_id
     AND status <> 'archived';

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Plan limit reached: your % plan allows up to % %. Upgrade your plan to add more.',
      initcap(org_plan), max_allowed, CASE WHEN max_allowed = 1 THEN 'property' ELSE 'properties' END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_plan_limit ON projects;
CREATE TRIGGER trg_enforce_project_plan_limit
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_plan_limit();
