import { createHash } from "node:crypto";
import type { AuditEvent } from "./types";

export const GENESIS_HASH = "0".repeat(64);

type AuditInput = Omit<AuditEvent, "hash">;

export function hashEvent(e: AuditInput): string {
  const body = JSON.stringify([
    e.id, e.tenantId, e.seq, e.at, e.actorId, e.actorName, e.action,
    e.module ?? null, e.subject ?? null, e.detail ?? null, e.prevHash,
  ]);
  return createHash("sha256").update(body).digest("hex");
}

/** Walks one tenant's chain. Returns the first broken sequence number, or null if intact. */
export function verifyChain(events: readonly AuditEvent[]): number | null {
  let prev = GENESIS_HASH;
  for (const [i, e] of events.entries()) {
    const { hash, ...rest } = e;
    if (e.seq !== i + 1 || e.prevHash !== prev || hashEvent(rest) !== hash) return e.seq;
    prev = hash;
  }
  return null;
}
