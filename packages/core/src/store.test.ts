import { describe, expect, it } from "vitest";
import { DEMO_SEED, DemoStore, ConflictError, ForbiddenError, NotFoundError } from "./index";

const fresh = () => new DemoStore(structuredClone(DEMO_SEED));

describe("tenant isolation", () => {
  it("lists only the signed-in tenant's approvals", () => {
    const store = fresh();
    const riverside = store.scope("u-rf-owner").approvals();
    const lakeshore = store.scope("u-ls-owner").approvals();
    expect(riverside.every((a) => a.tenantId === "t-riverside")).toBe(true);
    expect(lakeshore.every((a) => a.tenantId === "t-lakeshore")).toBe(true);
    expect(riverside.length + lakeshore.length).toBe(DEMO_SEED.approvals.length);
  });

  it("cannot decide another tenant's approval, and it looks like it does not exist", () => {
    const store = fresh();
    expect(() => store.scope("u-ls-owner").decide("a-rf-1", "approved")).toThrow(NotFoundError);
    expect(store.scope("u-rf-owner").approvals("pending").some((a) => a.id === "a-rf-1")).toBe(true);
  });

  it("keeps module switches and audit logs per tenant", () => {
    const store = fresh();
    store.scope("u-rf-owner").setModule("denial-appeals", false);
    expect(store.scope("u-ls-owner").isEnabled("denial-appeals")).toBe(false);
    expect(store.scope("u-rf-owner").isEnabled("denial-appeals")).toBe(false);
    expect(store.scope("u-ls-owner").isEnabled("prior-auth")).toBe(true);
    const lakeshoreLog = store.scope("u-ls-owner").auditLog();
    expect(lakeshoreLog.every((e) => e.tenantId === "t-lakeshore")).toBe(true);
    expect(lakeshoreLog.some((e) => e.action === "module.disabled")).toBe(false);
  });
});

describe("roles", () => {
  it("lets billing decide approvals but not switch modules", () => {
    const store = fresh();
    const billing = store.scope("u-rf-billing");
    expect(billing.decide("a-rf-1", "approved").status).toBe("approved");
    expect(() => billing.setModule("denial-appeals", false)).toThrow(ForbiddenError);
  });

  it("lets a clinician view but not decide", () => {
    const doc = fresh().scope("u-rf-doc");
    expect(doc.approvals().length).toBeGreaterThan(0);
    expect(() => doc.decide("a-rf-1", "approved")).toThrow(ForbiddenError);
    expect(() => doc.auditLog()).toThrow(ForbiddenError);
  });

  it("lets an auditor read the log but not decide", () => {
    const auditor = fresh().scope("u-rf-audit");
    expect(auditor.auditLog().length).toBeGreaterThan(0);
    expect(() => auditor.decide("a-rf-1", "rejected")).toThrow(ForbiddenError);
  });
});

describe("approval queue", () => {
  it("decides once and records who and when", () => {
    const owner = fresh().scope("u-rf-owner");
    const done = owner.decide("a-rf-3", "rejected", "Needs the cardiology note");
    expect(done).toMatchObject({ status: "rejected", decidedBy: "u-rf-owner", decisionNote: "Needs the cardiology note" });
    expect(() => owner.decide("a-rf-3", "approved")).toThrow(ConflictError);
  });

  it("refuses to queue work for a module that is switched off", () => {
    const owner = fresh().scope("u-ls-owner");
    expect(() =>
      owner.enqueue({ module: "denial-appeals", kind: "appeal-send", title: "x", detail: "y", patientRef: "p" }),
    ).toThrow(ConflictError);
  });

  it("always lands new work as pending", () => {
    const owner = fresh().scope("u-rf-owner");
    const item = owner.enqueue({
      module: "prior-auth", kind: "prior-auth-submit", title: "Test", detail: "d", patientRef: "p",
    });
    expect(item.status).toBe("pending");
  });
});

describe("modules", () => {
  it("keeps guardrails always on and planned modules off", () => {
    const owner = fresh().scope("u-rf-owner");
    expect(owner.isEnabled("guardrails")).toBe(true);
    expect(() => owner.setModule("guardrails", false)).toThrow(ConflictError);
    expect(() => owner.setModule("chart-prep", true)).toThrow(ConflictError);
  });
});

describe("audit chain", () => {
  it("stays intact through normal use", () => {
    const owner = fresh().scope("u-rf-owner");
    owner.decide("a-rf-1", "approved");
    owner.setModule("denial-appeals", false);
    expect(owner.verifyAudit()).toBeNull();
    expect(owner.stats().chainIntact).toBe(true);
  });

  it("detects a tampered event", () => {
    const store = fresh();
    const owner = store.scope("u-rf-owner");
    owner.decide("a-rf-1", "approved");
    const chain = store._internals().audit.get("t-riverside")!;
    chain[1] = { ...chain[1]!, detail: "edited after the fact" };
    expect(owner.verifyAudit()).toBe(2);
  });

  it("detects a deleted event", () => {
    const store = fresh();
    const owner = store.scope("u-rf-owner");
    const chain = store._internals().audit.get("t-riverside")!;
    chain.splice(1, 1);
    expect(owner.verifyAudit()).not.toBeNull();
  });
});
