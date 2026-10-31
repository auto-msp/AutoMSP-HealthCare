import { describe, expect, it } from "vitest";
import { DEMO_SEED, DemoStore } from "@automsp/core";
import { FREE_MODELS, aiGatewayModel, createGateway } from "./index";

// Runs only when AI_GATEWAY_API_KEY is set. Uses a free, zero-data-retention model and synthetic text.
describe.skipIf(!process.env.AI_GATEWAY_API_KEY)("live free model", () => {
  it("redacts before the call and screens the answer", async () => {
    const scope = new DemoStore(structuredClone(DEMO_SEED)).scope("u-rf-owner");
    const model = aiGatewayModel(process.env.GATEWAY_MODEL || FREE_MODELS[0]);
    const res = await createGateway(model).run(scope, {
      module: "prior-auth",
      purpose: "live smoke test",
      system: "Summarize the text for a practice manager in two or three sentences. Do not add facts that are not in the text.",
      prompt: "Jane Q. Doe, SSN 123-45-6789, born 03/14/1961, needs a prior authorization for a lumbar MRI after eight weeks of physical therapy. Payer requires six weeks.",
      patientLabel: "Patient A-1042 (synthetic)",
      known: [{ value: "Jane Q. Doe", kind: "NAME" }],
      otherPatientRefs: ["A-1177", "A-0931"],
      rehydrate: true,
    });
    console.log(JSON.stringify({ verdict: res.verdict, model: res.model, findings: res.findings.map((f) => f.code), redactedPrompt: res.redactedPrompt, output: res.output }, null, 2));
    expect(res.redactedPrompt).not.toMatch(/Jane|123-45-6789|03\/14\/1961/);
    expect(["allowed", "held"]).toContain(res.verdict);
    expect(scope.verifyAudit()).toBeNull();
  }, 120_000);
});
