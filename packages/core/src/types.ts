export type Role = "owner" | "admin" | "billing" | "clinician" | "auditor";

export type Action =
  | "module.toggle"
  | "approval.decide"
  | "approval.view"
  | "audit.view"
  | "members.view";

export type ModuleId =
  | "prior-auth"
  | "denial-appeals"
  | "guardrails"
  | "coding-compliance"
  | "chart-prep"
  | "ambient-notes"
  | "discharge"
  | "care-episodes"
  | "front-desk"
  | "lab-explainer";

export type ModuleStatus = "demo" | "planned";

export interface ModuleDef {
  id: ModuleId;
  name: string;
  family: "Trust layer" | "Revenue cycle" | "Clinical workflow" | "Care coordination" | "Patient engagement";
  summary: string;
  status: ModuleStatus;
  /** True for the three modules approved to be built first. */
  firstWave: boolean;
  /** Cloned Vercel project(s) the idea comes from. */
  sourceApps: string[];
  /** Always on for every tenant (cannot be switched off). */
  alwaysOn?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  specialty: string;
  plan: "core" | "practice" | "group";
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalKind = "prior-auth-submit" | "appeal-send" | "guardrail-release";

export interface ApprovalItem {
  id: string;
  tenantId: string;
  module: ModuleId;
  kind: ApprovalKind;
  title: string;
  detail: string;
  /** Synthetic patient label only. No real patient data in the demo. */
  patientRef: string;
  payer?: string;
  amountUsd?: number;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  seq: number;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  module?: ModuleId;
  subject?: string;
  detail?: string;
  prevHash: string;
  hash: string;
}
