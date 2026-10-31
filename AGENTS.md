# Working in this repo

- pnpm monorepo: `apps/portal`, `packages/core`, `packages/db`. Node 22+.
- Check before committing: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- Tenant isolation is the core rule. Never add a `tenantId` parameter to anything a signed-in user can reach; go through `TenantScope`. In SQL, every table needs `tenant_id`, RLS enabled and forced, and a policy.
- Demo data is synthetic. Never add real patient data, keys or tokens to the repo.
- Anything that sends something outside the practice goes through the approval queue.
- Change the Prisma schema, then regenerate the migration SQL and re-run `pnpm --filter @automsp/db test`.
