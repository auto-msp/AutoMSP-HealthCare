import type { SeedData } from "./store";

/** Synthetic demo data. Patient references are made-up labels, never real people. */
export const DEMO_SEED: SeedData = {
  tenants: [
    { id: "t-riverside", name: "Riverside Family Clinic", specialty: "Family medicine", plan: "practice" },
    { id: "t-lakeshore", name: "Lakeshore Pediatrics", specialty: "Pediatrics", plan: "core" },
  ],
  users: [
    { id: "u-rf-owner", tenantId: "t-riverside", name: "Dana Whitfield", email: "dana@riverside.example", role: "owner" },
    { id: "u-rf-billing", tenantId: "t-riverside", name: "Marcus Hale", email: "marcus@riverside.example", role: "billing" },
    { id: "u-rf-doc", tenantId: "t-riverside", name: "Dr. Priya Nair", email: "priya@riverside.example", role: "clinician" },
    { id: "u-rf-audit", tenantId: "t-riverside", name: "Lena Ortiz", email: "lena@riverside.example", role: "auditor" },
    { id: "u-ls-owner", tenantId: "t-lakeshore", name: "Sam Okafor", email: "sam@lakeshore.example", role: "owner" },
    { id: "u-ls-billing", tenantId: "t-lakeshore", name: "Rhea Patel", email: "rhea@lakeshore.example", role: "billing" },
  ],
  enabled: {
    "t-riverside": ["prior-auth", "denial-appeals"],
    "t-lakeshore": ["prior-auth"],
  },
  approvals: [
    {
      id: "a-rf-1", tenantId: "t-riverside", module: "prior-auth", kind: "prior-auth-submit",
      title: "Prior auth: MRI lumbar spine (CPT 72148)",
      detail: "Draft is complete. Payer rule requires six weeks of conservative therapy; the note documents eight.",
      patientRef: "Patient A-1042 (synthetic)", payer: "Northwind Health", amountUsd: 1280,
    },
    {
      id: "a-rf-2", tenantId: "t-riverside", module: "prior-auth", kind: "prior-auth-submit",
      title: "Prior auth: GLP-1 agonist (J-code pending)",
      detail: "Missing: most recent HbA1c within 90 days. Draft holds the request until the lab is attached.",
      patientRef: "Patient A-1177 (synthetic)", payer: "Evergreen Mutual", amountUsd: 940,
    },
    {
      id: "a-rf-3", tenantId: "t-riverside", module: "denial-appeals", kind: "appeal-send",
      title: "Appeal: denied echocardiogram (CO-50, not medically necessary)",
      detail: "Appeal letter cites the two guideline sections and the 2026-08 progress note. Awaiting sign-off before it goes to the payer.",
      patientRef: "Patient A-0931 (synthetic)", payer: "Northwind Health", amountUsd: 2150,
    },
    {
      id: "a-rf-4", tenantId: "t-riverside", module: "guardrails", kind: "guardrail-release",
      title: "Guardrail hold: outbound fax contains an unredacted date of birth",
      detail: "The gateway stopped a prior-auth fax. Approve to release after redaction, or reject to discard.",
      patientRef: "Patient A-1042 (synthetic)",
    },
    {
      id: "a-ls-1", tenantId: "t-lakeshore", module: "prior-auth", kind: "prior-auth-submit",
      title: "Prior auth: allergy immunotherapy series",
      detail: "Draft is complete; skin-test results attached.",
      patientRef: "Patient B-2210 (synthetic)", payer: "Evergreen Mutual", amountUsd: 610,
    },
    {
      id: "a-ls-2", tenantId: "t-lakeshore", module: "guardrails", kind: "guardrail-release",
      title: "Guardrail hold: model output mentions a second patient",
      detail: "The gateway blocked a summary that referred to another patient's chart.",
      patientRef: "Patient B-2275 (synthetic)",
    },
  ],
};
