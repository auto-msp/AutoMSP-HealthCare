\set ON_ERROR_STOP on
\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B '''bbbbbbbb-0000-0000-0000-000000000002'''

-- Seed as the migration owner (superuser bypasses RLS, as an admin task would).
INSERT INTO tenants (id, name, specialty) VALUES (:A, 'Tenant A', 'Family'), (:B, 'Tenant B', 'Pediatrics');
INSERT INTO approval_items (id, tenant_id, module, kind, title, detail, patient_ref) VALUES
  ('a0000000-0000-0000-0000-000000000001', :A, 'prior-auth', 'prior_auth_submit', 'A item', 'd', 'p'),
  ('b0000000-0000-0000-0000-000000000001', :B, 'prior-auth', 'prior_auth_submit', 'B item', 'd', 'p');
INSERT INTO audit_events (tenant_id, seq, actor_id, actor_name, action, prev_hash, hash)
  VALUES (:A, 1, 'x', 'X', 'seed', repeat('0', 64), repeat('1', 64));

SET ROLE app_user;

-- 1. A tenant sees only its own rows.
SELECT set_config('app.tenant_id', :A, false);
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM approval_items) = 1, 'A should see exactly 1 approval';
  ASSERT (SELECT count(*) FROM approval_items WHERE tenant_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 0, 'A must not see B rows even when asking';
  ASSERT (SELECT count(*) FROM tenants) = 1, 'A should see only its own tenant row';
END $$;

-- 2. No tenant set means no rows (fail closed).
SELECT set_config('app.tenant_id', '', false);
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM approval_items) = 0, 'unset tenant must see nothing';
  ASSERT (SELECT count(*) FROM audit_events) = 0, 'unset tenant must see no audit rows';
END $$;

-- 3. Writing into another tenant is rejected.
SELECT set_config('app.tenant_id', :A, false);
DO $$ BEGIN
  BEGIN
    INSERT INTO approval_items (tenant_id, module, kind, title, detail, patient_ref)
      VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'prior-auth', 'prior_auth_submit', 'x', 'd', 'p');
    RAISE EXCEPTION 'cross-tenant insert was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; -- row-level security violation
  END;
END $$;

-- 4. Updating another tenant's row touches nothing.
DO $$ DECLARE n integer; BEGIN
  UPDATE approval_items SET status = 'approved' WHERE id = 'b0000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'cross-tenant update must affect 0 rows';
END $$;

-- 5. Own rows can be updated; nothing can be deleted.
DO $$ DECLARE n integer; BEGIN
  UPDATE approval_items SET status = 'approved' WHERE id = 'a0000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'own update should work';
  BEGIN
    DELETE FROM approval_items WHERE id = 'a0000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'delete was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- 6. Audit log: append-only and chained, even for the app role.
DO $$ BEGIN
  BEGIN
    UPDATE audit_events SET action = 'tampered';
    RAISE EXCEPTION 'audit update was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO audit_events (tenant_id, seq, actor_id, actor_name, action, prev_hash, hash)
      VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 5, 'x', 'X', 'skip', repeat('1', 64), repeat('2', 64));
    RAISE EXCEPTION 'out-of-order audit insert was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'audit_events seq must be%' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO audit_events (tenant_id, seq, actor_id, actor_name, action, prev_hash, hash)
      VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 2, 'x', 'X', 'bad link', repeat('9', 64), repeat('2', 64));
    RAISE EXCEPTION 'broken-chain audit insert was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'audit_events prev_hash%' THEN RAISE; END IF;
  END;
  INSERT INTO audit_events (tenant_id, seq, actor_id, actor_name, action, prev_hash, hash)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 2, 'x', 'X', 'ok', repeat('1', 64), repeat('2', 64));
END $$;

RESET ROLE;

-- 7. Even the table owner cannot rewrite the log (trigger).
DO $$ BEGIN
  BEGIN
    DELETE FROM audit_events;
    RAISE EXCEPTION 'owner delete was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'audit_events is append-only%' THEN RAISE; END IF;
  END;
END $$;

\echo RLS tests passed
