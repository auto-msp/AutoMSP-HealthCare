import type { ModuleId } from "@automsp/core";
import type { IdentifierKind, KnownIdentifier } from "./redact";

export interface ModelClient {
  /** Model id as the provider names it, for the audit log. */
  id: string;
  generate(input: { system: string; prompt: string }): Promise<string>;
}

export interface GatewayRequest {
  /** The module asking. It must be switched on for the tenant. */
  module: ModuleId;
  /** Short purpose shown in the audit log, for example "summarize denial letter". */
  purpose: string;
  /** Task instructions from the module. Not user text. */
  system: string;
  /** User or document text. Identifiers are replaced before it leaves the gateway. */
  prompt: string;
  /** Label for the one patient this call concerns, shown to reviewers. */
  patientLabel: string;
  /** Identifiers of the current patient (name, record id). They become tokens. */
  known?: readonly KnownIdentifier[];
  /** Labels of other patients in the same practice. Mentioning them is a leak. */
  otherPatientRefs?: readonly string[];
  /** Put tokens back into allowed output before returning it to the signed-in user. */
  rehydrate?: boolean;
}

export type Verdict = "allowed" | "blocked" | "held" | "error";

export type FindingCode =
  | "module_off"
  | "prompt_injection"
  | "phi_redacted"
  | "canary_leak"
  | "phi_in_output"
  | "other_patient_in_output"
  | "injection_echo"
  | "empty_output"
  | "model_error";

export interface Finding {
  code: FindingCode;
  /** Plain-language reason a reviewer can read. Never contains patient data. */
  note: string;
}

export interface GatewayResult {
  callId: string;
  verdict: Verdict;
  model: string;
  findings: Finding[];
  /** What the model actually saw. Safe to display. */
  redactedPrompt: string;
  redactionCounts: Partial<Record<IdentifierKind, number>>;
  /** Present only when allowed. Tokenized unless `rehydrate` was requested. */
  output?: string;
  /** Present only when held: the approval item a person must decide. */
  approvalId?: string;
}
