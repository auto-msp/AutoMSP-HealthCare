import { randomUUID } from "node:crypto";
import { GENESIS_HASH, hashEvent, verifyChain } from "./audit";
import { ConflictError, NotFoundError } from "./errors";
import { MODULES, getModule } from "./modules";
import { assertCan } from "./permissions";
import type {
  ApprovalItem, ApprovalKind, AuditEvent, ModuleDef, ModuleId, Tenant, User,
} from "./types";

export interface Clock { now(): Date }
const systemClock: Clock = { now: () => new Date() };

export interface SeedData {
  tenants: Tenant[];
  users: User[];
  /** Modules switched on per tenant id. Always-on modules are added automatically. */
  enabled: Record<string, ModuleId[]>;
  approvals: Omit<ApprovalItem, "status" | "createdAt">[];
}

export interface EnqueueInput {
  module: ModuleId;
  kind: ApprovalKind;
  title: string;
  detail: string;
  patientRef: string;
  payer?: string;
  amountUsd?: number;
  payload?: string;
}

export interface PortalStats {
  pendingApprovals: number;
  decidedApprovals: number;
  modulesOn: number;
  auditEvents: number;
  chainIntact: boolean;
}

/**
 * Demo store. It mirrors the rules the Postgres schema enforces (see packages/db):
 * every record carries a tenant id, and nothing is reachable except through a
 * `TenantScope` that is bound to one signed-in user's tenant.
 */
export class DemoStore {
  private readonly tenants = new Map<string, Tenant>();
  private readonly users = new Map<string, User>();
  private readonly approvals = new Map<string, ApprovalItem>();
  private readonly audit = new Map<string, AuditEvent[]>();
  private readonly enabled = new Map<string, Set<ModuleId>>();

  constructor(seed: SeedData, private readonly clock: Clock = systemClock) {
    const alwaysOn = MODULES.filter((m) => m.alwaysOn).map((m) => m.id);
    for (const t of seed.tenants) {
      this.tenants.set(t.id, t);
      this.audit.set(t.id, []);
      this.enabled.set(t.id, new Set([...alwaysOn, ...(seed.enabled[t.id] ?? [])]));
    }
    for (const u of seed.users) {
      if (!this.tenants.has(u.tenantId)) throw new Error(`User ${u.id} has unknown tenant`);
      this.users.set(u.id, u);
    }
    const system = { id: "system", name: "System" };
    for (const a of seed.approvals) {
      if (!this.tenants.has(a.tenantId)) throw new Error(`Approval ${a.id} has unknown tenant`);
      const item: ApprovalItem = { ...a, status: "pending", createdAt: this.clock.now().toISOString() };
      this.approvals.set(item.id, item);
      this.record(item.tenantId, system, "approval.queued", { module: item.module, subject: item.id, detail: item.title });
    }
  }

  /** Demo sign-in picker only. A real deployment replaces this with SSO. */
  listTenants(): Tenant[] { return [...this.tenants.values()]; }
  listUsers(): User[] { return [...this.users.values()]; }

  scope(userId: string): TenantScope {
    const user = this.users.get(userId);
    if (!user) throw new NotFoundError("User");
    const tenant = this.tenants.get(user.tenantId);
    if (!tenant) throw new NotFoundError("Tenant");
    return new TenantScope(this, tenant, user);
  }

  /** @internal Used by TenantScope; not part of the public surface. */
  _internals() {
    return {
      approvals: this.approvals,
      audit: this.audit,
      enabled: this.enabled,
      users: this.users,
      clock: this.clock,
      record: this.record.bind(this),
    };
  }

  private record(
    tenantId: string,
    actor: { id: string; name: string },
    action: string,
    extra: { module?: ModuleId; subject?: string; detail?: string } = {},
  ): AuditEvent {
    const chain = this.audit.get(tenantId);
    if (!chain) throw new NotFoundError("Tenant");
    const prev = chain[chain.length - 1];
    const draft = {
      id: randomUUID(),
      tenantId,
      seq: chain.length + 1,
      at: this.clock.now().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      action,
      ...extra,
      prevHash: prev ? prev.hash : GENESIS_HASH,
    };
    const event: AuditEvent = { ...draft, hash: hashEvent(draft) };
    chain.push(event);
    return event;
  }
}

/** Everything a signed-in user can do. There is no tenant id parameter anywhere on purpose. */
export class TenantScope {
  constructor(
    private readonly store: DemoStore,
    readonly tenant: Tenant,
    readonly actor: User,
  ) {}

  private get s() { return this.store._internals(); }

  modules(): Array<{ def: ModuleDef; enabled: boolean }> {
    const on = this.s.enabled.get(this.tenant.id) ?? new Set<ModuleId>();
    return MODULES.map((def) => ({ def, enabled: on.has(def.id) }));
  }

  isEnabled(id: ModuleId): boolean {
    return this.s.enabled.get(this.tenant.id)?.has(id) ?? false;
  }

  setModule(id: ModuleId, enabled: boolean): void {
    assertCan(this.actor.role, "module.toggle");
    const def = getModule(id);
    if (def.alwaysOn && !enabled) throw new ConflictError(`${def.name} is always on`);
    if (def.status === "planned" && enabled) throw new ConflictError(`${def.name} is not available yet`);
    const set = this.s.enabled.get(this.tenant.id);
    if (!set) throw new NotFoundError("Tenant");
    if (set.has(id) === enabled) return;
    if (enabled) set.add(id); else set.delete(id);
    this.s.record(this.tenant.id, this.actor, enabled ? "module.enabled" : "module.disabled", {
      module: id, subject: id, detail: def.name,
    });
  }

  approvals(status?: ApprovalItem["status"]): ApprovalItem[] {
    assertCan(this.actor.role, "approval.view");
    return [...this.s.approvals.values()]
      .filter((a) => a.tenantId === this.tenant.id && (!status || a.status === status))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }

  decide(approvalId: string, decision: "approved" | "rejected", note?: string): ApprovalItem {
    assertCan(this.actor.role, "approval.decide");
    const item = this.s.approvals.get(approvalId);
    // A row from another tenant looks exactly like a row that does not exist.
    if (!item || item.tenantId !== this.tenant.id) throw new NotFoundError("Approval");
    if (item.status !== "pending") throw new ConflictError("Already decided");
    const next: ApprovalItem = {
      ...item,
      status: decision,
      decidedAt: this.s.clock.now().toISOString(),
      decidedBy: this.actor.id,
      ...(note ? { decisionNote: note } : {}),
    };
    this.s.approvals.set(next.id, next);
    this.s.record(this.tenant.id, this.actor, `approval.${decision}`, {
      module: item.module, subject: item.id, detail: item.title,
    });
    return next;
  }

  /** For module services to put an outbound action in front of a human. Always lands as pending. */
  enqueue(input: EnqueueInput): ApprovalItem {
    if (!this.isEnabled(input.module)) throw new ConflictError(`${getModule(input.module).name} is switched off`);
    const item: ApprovalItem = {
      ...input,
      id: randomUUID(),
      tenantId: this.tenant.id,
      status: "pending",
      createdAt: this.s.clock.now().toISOString(),
    };
    this.s.approvals.set(item.id, item);
    this.s.record(this.tenant.id, this.actor, "approval.queued", {
      module: item.module, subject: item.id, detail: item.title,
    });
    return item;
  }

  /**
   * For platform services such as the agent gateway to leave a trace in the audit chain.
   * Callers must pass summaries only, never raw prompts, outputs or patient identifiers.
   */
  recordEvent(action: string, extra: { module?: ModuleId; subject?: string; detail?: string } = {}): AuditEvent {
    return this.s.record(this.tenant.id, this.actor, action, extra);
  }

  auditLog(): AuditEvent[] {
    assertCan(this.actor.role, "audit.view");
    return [...(this.s.audit.get(this.tenant.id) ?? [])];
  }

  /** Null if the chain is intact, otherwise the first broken sequence number. */
  verifyAudit(): number | null {
    assertCan(this.actor.role, "audit.view");
    return verifyChain(this.s.audit.get(this.tenant.id) ?? []);
  }

  members(): User[] {
    assertCan(this.actor.role, "members.view");
    return [...this.s.users.values()].filter((u) => u.tenantId === this.tenant.id);
  }

  stats(): PortalStats {
    const all = [...this.s.approvals.values()].filter((a) => a.tenantId === this.tenant.id);
    const chain = this.s.audit.get(this.tenant.id) ?? [];
    return {
      pendingApprovals: all.filter((a) => a.status === "pending").length,
      decidedApprovals: all.filter((a) => a.status !== "pending").length,
      modulesOn: this.s.enabled.get(this.tenant.id)?.size ?? 0,
      auditEvents: chain.length,
      chainIntact: verifyChain(chain) === null,
    };
  }
}
