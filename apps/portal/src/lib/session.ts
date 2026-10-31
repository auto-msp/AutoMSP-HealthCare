import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_SEED, DemoStore, type TenantScope } from "@automsp/core";

export const SESSION_COOKIE = "demo_user";

// Demo mode keeps state in memory, on one server process. A hosted deployment
// that spins up several instances will show each its own copy; the Postgres
// path (packages/db) is what replaces this for real use.
const g = globalThis as unknown as { __store?: DemoStore };

export function getStore(): DemoStore {
  g.__store ??= new DemoStore(structuredClone(DEMO_SEED));
  return g.__store;
}

export async function getScope(): Promise<TenantScope | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  try {
    return getStore().scope(id);
  } catch {
    return null;
  }
}

export async function requireScope(): Promise<TenantScope> {
  const scope = await getScope();
  if (!scope) redirect("/login");
  return scope;
}
