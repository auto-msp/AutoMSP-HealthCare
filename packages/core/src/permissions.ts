import type { Action, Role } from "./types";

const GRANTS: Record<Role, readonly Action[]> = {
  owner: ["module.toggle", "approval.decide", "approval.view", "audit.view", "members.view"],
  admin: ["module.toggle", "approval.decide", "approval.view", "audit.view", "members.view"],
  billing: ["approval.decide", "approval.view"],
  clinician: ["approval.view"],
  auditor: ["approval.view", "audit.view", "members.view"],
};

export function can(role: Role, action: Action): boolean {
  return GRANTS[role].includes(action);
}

export class ForbiddenError extends Error {
  constructor(role: Role, action: Action) {
    super(`Role "${role}" may not perform "${action}"`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) throw new ForbiddenError(role, action);
}
