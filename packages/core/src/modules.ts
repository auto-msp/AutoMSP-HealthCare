import type { ModuleDef, ModuleId } from "./types";

export const MODULES: readonly ModuleDef[] = [
  {
    id: "guardrails",
    name: "Guardrails",
    family: "Trust layer",
    summary: "Screens every AI call and output, redacts identifiers and holds risky actions for approval.",
    status: "demo",
    firstWave: true,
    sourceApps: ["aegis-fleet-demo", "aegisward-frontend", "fortified-healthcare-fleet"],
    alwaysOn: true,
  },
  {
    id: "prior-auth",
    name: "Prior authorization",
    family: "Revenue cycle",
    summary: "Finds documentation gaps and prepares prior-authorization requests for a human to send.",
    status: "demo",
    firstWave: true,
    sourceApps: ["prior-pulse", "automsp-prior-auth-demo"],
  },
  {
    id: "denial-appeals",
    name: "Denial appeals",
    family: "Revenue cycle",
    summary: "Turns a denial into a cited, human-approved appeal package.",
    status: "demo",
    firstWave: true,
    sourceApps: ["automsp-denialdefender-demo"],
  },
  {
    id: "coding-compliance",
    name: "Coding checks",
    family: "Revenue cycle",
    summary: "Flags coding and documentation issues before a claim goes out.",
    status: "planned",
    firstWave: false,
    sourceApps: ["aegisward-frontend"],
  },
  {
    id: "chart-prep",
    name: "Chart prep",
    family: "Clinical workflow",
    summary: "Reads the chart before the visit and flags cited findings. Needs a clinical-safety review first.",
    status: "planned",
    firstWave: false,
    sourceApps: ["automsp-chartpilot"],
  },
  {
    id: "ambient-notes",
    name: "Ambient notes",
    family: "Clinical workflow",
    summary: "Turns visit audio into SOAP notes. Needs a clinical-safety review first.",
    status: "planned",
    firstWave: false,
    sourceApps: ["automsp-decurandi-demo"],
  },
  {
    id: "discharge",
    name: "Discharge orchestration",
    family: "Care coordination",
    summary: "Coordinates equipment, transport and home health from a ready-for-discharge trigger.",
    status: "planned",
    firstWave: false,
    sourceApps: ["carebridge-agent-demo"],
  },
  {
    id: "care-episodes",
    name: "Care episodes",
    family: "Care coordination",
    summary: "Follows a prescription through labs, waiting and results as one episode.",
    status: "planned",
    firstWave: false,
    sourceApps: ["care-episode-demo"],
  },
  {
    id: "front-desk",
    name: "AI front desk",
    family: "Patient engagement",
    summary: "Answers calls, books visits and refills the waitlist.",
    status: "planned",
    firstWave: false,
    sourceApps: ["automsp-frontdesk-demo", "clinic-ai-frontdesk-landing"],
  },
  {
    id: "lab-explainer",
    name: "Lab explainer",
    family: "Patient engagement",
    summary: "Explains lab results to patients in plain language.",
    status: "planned",
    firstWave: false,
    sourceApps: ["automsp-genetiq-demo"],
  },
];

const BY_ID = new Map<ModuleId, ModuleDef>(MODULES.map((m) => [m.id, m]));

export function getModule(id: ModuleId): ModuleDef {
  const m = BY_ID.get(id);
  if (!m) throw new Error(`Unknown module: ${id}`);
  return m;
}

export function isModuleId(value: string): value is ModuleId {
  return BY_ID.has(value as ModuleId);
}
