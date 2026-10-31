-- Row-level security: the database, not the application, keeps tenants apart.
-- The app connects as app_user and sets app.tenant_id for each transaction.
-- If app.tenant_id is unset, no rows are visible or writable (fail closed).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_user;

CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

-- Privileges: no DELETE anywhere, and the audit log is insert-only.
GRANT SELECT ON tenants TO app_user;
GRANT SELECT, INSERT, UPDATE ON users, tenant_modules, approval_items TO app_user;
GRANT SELECT, INSERT ON audit_events TO app_user;

ALTER TABLE tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events   ENABLE ROW LEVEL SECURITY;

-- FORCE makes the policies apply to the table owner too.
ALTER TABLE tenants        FORCE ROW LEVEL SECURITY;
ALTER TABLE users          FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules FORCE ROW LEVEL SECURITY;
ALTER TABLE approval_items FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events   FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenants
  USING (id = app_tenant_id());

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());

CREATE POLICY tenant_isolation ON tenant_modules
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());

CREATE POLICY tenant_isolation ON approval_items
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());

CREATE POLICY tenant_isolation ON audit_events
  USING (tenant_id = app_tenant_id()) WITH CHECK (tenant_id = app_tenant_id());

-- Audit log: append-only, and each row must extend the tenant's hash chain.
CREATE OR REPLACE FUNCTION audit_events_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  last_seq  integer;
  last_hash text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE', 'TRUNCATE') THEN
    RAISE EXCEPTION 'audit_events is append-only';
  END IF;

  SELECT seq, hash INTO last_seq, last_hash
    FROM audit_events WHERE tenant_id = NEW.tenant_id ORDER BY seq DESC LIMIT 1;

  IF NEW.seq <> coalesce(last_seq, 0) + 1 THEN
    RAISE EXCEPTION 'audit_events seq must be %', coalesce(last_seq, 0) + 1;
  END IF;
  IF NEW.prev_hash <> coalesce(last_hash, repeat('0', 64)) THEN
    RAISE EXCEPTION 'audit_events prev_hash does not match the chain';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER audit_events_no_change
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_guard();

CREATE TRIGGER audit_events_no_truncate
  BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_guard();

CREATE TRIGGER audit_events_chain
  BEFORE INSERT ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_guard();
