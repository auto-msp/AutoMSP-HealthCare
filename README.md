# AutoMSP HealthCare

One multi-tenant portal for US healthcare practices. It brings the useful ideas from a set of hackathon demos into a single product, starting with three modules: **prior authorization**, **denial appeals** and a **guardrails layer**. Every outbound action waits for a human click.

**Status: demo build.** It runs on synthetic data and an in-memory store. There is no real patient data and no BAA in place, so do not put real patient data into it.

## What is here

| Path | What it holds |
| --- | --- |
| `apps/portal` | Next.js 16 / React 19 / Tailwind 4 portal: demo sign-in, dashboard, approval queue, modules, audit log |
| `packages/core` | Domain rules: tenants, roles, module catalogue, approval queue, hash-chained audit log, with tests |
| `packages/gateway` | The guardrails gateway: every AI call passes through it (redaction, injection screen, output screen, audit) |
| `packages/db` | Prisma 7 schema, migrations and Postgres row-level security, with an isolation test |

## Run it

```bash
corepack enable
pnpm install
pnpm dev          # http://localhost:3000
```

Pick a demo user on the sign-in page. Two practices are seeded, and each only ever sees its own data.

## Check it

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

`pnpm test` runs the core unit tests and the database test. The database test starts a throwaway Postgres (needs the Postgres 14+ server binaries installed), applies every migration and proves that one tenant cannot read, write or change another tenant's rows, and that the audit log cannot be edited.

## How the pieces fit

- **Tenant isolation lives in the database.** Every table carries `tenant_id`, and `0002_row_level_security` forces a policy on each one. The app connects as `app_user` and sets `app.tenant_id` per transaction (`withTenant` in `packages/db`). An unset tenant sees nothing.
- **Demo mode mirrors the same rules in memory.** `TenantScope` in `packages/core` has no tenant id parameter anywhere, so a signed-in user cannot name another tenant's data.
- **The audit log is chained.** Each event stores the hash of the one before it. The portal shows whether the chain verifies, and the database refuses updates, deletes and out-of-order inserts.
- **Roles:** owner, admin, billing, clinician, auditor, with the grants in `packages/core/src/permissions.ts`.

## The guardrails gateway

`packages/gateway` is the one door for model calls. For each call it checks the module is on for the practice, scores the text for prompt injection (blocking before the model is called), replaces identifiers with tokens, calls the model, then screens the answer for a leaked hidden marker, raw identifiers, mentions of other patients and echoed attacks. A risky answer is never returned: it goes to the approval queue, already redacted, for a person to decide. Every call leaves a summary (no raw text) in the practice's audit chain.

Redaction is pattern-based, so names and free-text identifiers are only caught when the caller lists them. It does not check that a summary is faithful to the source. It is a safety net with a human behind it, not a guarantee.

The portal's Guardrails page has a playground. Without a key it uses an offline scripted model. With `AI_GATEWAY_API_KEY` set it calls a free, zero-data-retention US model on Vercel AI Gateway (`GATEWAY_MODEL` overrides the model). A live test in `packages/gateway` runs only when the key is set.

## Not built yet

1. Prior authorization and denial appeals agents behind the gateway.
2. Postgres-backed store for the portal (the schema and `withTenant` are ready).
3. Single sign-on with multi-factor authentication.
4. Release of held output after approval (today a reviewer can see the held, redacted text and record a decision).
5. Before any real patient data: a signed BAA with every host, database and model provider, and a security review.
