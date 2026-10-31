"use server";

import { revalidatePath } from "next/cache";
import { isModuleId } from "@automsp/core";
import { createGateway, type Finding, type Verdict } from "@automsp/gateway";
import { activeModel } from "./model";
import { requireScope } from "./session";

export interface PlaygroundState {
  verdict: Verdict | "invalid";
  model: string;
  findings: Finding[];
  redactedPrompt: string;
  output?: string;
  approvalId?: string;
  message?: string;
}

const MAX_PROMPT = 4000;

export async function runPlayground(_prev: PlaygroundState | null, formData: FormData): Promise<PlaygroundState> {
  const scope = await requireScope();
  const model = activeModel();
  const invalid = (message: string): PlaygroundState => ({ verdict: "invalid", model: model.id, findings: [], redactedPrompt: "", message });

  const prompt = String(formData.get("prompt") ?? "").trim();
  const moduleId = String(formData.get("module") ?? "");
  const patientLabel = String(formData.get("patient") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!prompt) return invalid("Enter some text first.");
  if (prompt.length > MAX_PROMPT) return invalid(`Keep it under ${MAX_PROMPT} characters.`);
  if (!isModuleId(moduleId)) return invalid("Pick a module.");

  // Patient labels come from this practice's own queue, never from the form alone.
  const labels = [...new Set(scope.approvals().map((a) => a.patientRef))];
  if (!labels.includes(patientLabel)) return invalid("Pick one of this practice's patients.");
  const idOf = (l: string) => l.match(/[A-Z]-\d{4}/)?.[0] ?? l;

  const result = await createGateway(model).run(scope, {
    module: moduleId,
    purpose: "playground test",
    system: "Summarize the text for a practice manager in two or three sentences. Do not add facts that are not in the text.",
    prompt,
    patientLabel,
    known: [{ value: idOf(patientLabel), kind: "PATIENT" }, ...(name ? [{ value: name, kind: "NAME" as const }] : [])],
    otherPatientRefs: labels.filter((l) => l !== patientLabel).map(idOf),
    rehydrate: true,
  });
  revalidatePath("/", "layout");
  return {
    verdict: result.verdict,
    model: result.model,
    findings: result.findings,
    redactedPrompt: result.redactedPrompt,
    ...(result.output ? { output: result.output } : {}),
    ...(result.approvalId ? { approvalId: result.approvalId } : {}),
  };
}
