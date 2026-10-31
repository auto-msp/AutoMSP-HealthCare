import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModule, isModuleId } from "@automsp/core";
import { requireScope } from "@/lib/session";
import { Badge, Card, PageHeader } from "@/components/ui";
import { GuardrailPlayground } from "@/components/GuardrailPlayground";
import { activeModel } from "@/lib/model";

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const { module } = await params;
  return { title: isModuleId(module) ? getModule(module).name : "Module" };
}

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!isModuleId(module)) notFound();
  const def = getModule(module);
  const scope = await requireScope();
  const enabled = scope.isEnabled(def.id);
  const queue = scope.approvals().filter((a) => a.module === def.id);

  return (
    <>
      <PageHeader title={def.name} intro={def.summary} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge>{def.family}</Badge>
        {enabled ? <Badge tone="good">on for {scope.tenant.name}</Badge> : <Badge tone="warn">off for {scope.tenant.name}</Badge>}
        {def.status === "planned" ? <Badge>planned</Badge> : <Badge tone="accent">demo</Badge>}
      </div>

      {!enabled ? (
        <Card>
          <p className="text-sm text-quiet">This module is off. An owner or admin can switch it on from <Link className="text-accent underline" href="/modules">Modules</Link>.</p>
        </Card>
      ) : (
        <Card>
          <h2 className="font-semibold">Waiting in the approval queue</h2>
          {queue.length === 0 ? (
            <p className="mt-3 text-sm text-quiet">Nothing from this module right now.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {queue.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-medium">{a.title}</span>
                  <Badge tone={a.status === "pending" ? "warn" : a.status === "approved" ? "good" : "bad"}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-quiet">
            The working screens for this module arrive when its agent is ported. Until then it only queues work for a human.
          </p>
        </Card>
      )}
      {def.id === "guardrails" && enabled ? (
        <GuardrailPlayground
          patients={[...new Set(scope.approvals().map((a) => a.patientRef))]}
          modules={scope.modules().filter((m) => m.enabled && m.def.id !== "guardrails" && m.def.status === "demo").map((m) => ({ id: m.def.id, name: m.def.name }))}
          live={Boolean(process.env.AI_GATEWAY_API_KEY)}
          modelLabel={activeModel().id}
        />
      ) : null}
      <p className="mt-6 text-xs text-quiet">Ported from: {def.sourceApps.join(", ")}.</p>
    </>
  );
}
