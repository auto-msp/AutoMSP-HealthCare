import type { Metadata } from "next";
import { can } from "@automsp/core";
import { redirect } from "next/navigation";
import { requireScope } from "@/lib/session";
import { Badge, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Audit log" };

export default async function Audit() {
  const scope = await requireScope();
  if (!can(scope.actor.role, "audit.view")) redirect("/dashboard?error=Your role cannot view the audit log");
  const events = scope.auditLog().reverse();
  const broken = scope.verifyAudit();

  return (
    <>
      <PageHeader
        title="Audit log"
        intro="An append-only record of every queue, decision and module change. Each entry is chained to the one before it."
      />
      <p className="mb-4">
        {broken === null ? (
          <Badge tone="good">Chain verified: {events.length} events intact</Badge>
        ) : (
          <Badge tone="bad">Chain broken at event {broken}</Badge>
        )}
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-quiet">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">When (UTC)</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Detail</th>
              <th className="px-4 py-3 font-medium">Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5 tabular-nums text-quiet">{e.seq}</td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-quiet">{e.at.slice(0, 19).replace("T", " ")}</td>
                <td className="px-4 py-2.5">{e.actorName}</td>
                <td className="px-4 py-2.5 font-medium">{e.action}</td>
                <td className="px-4 py-2.5 text-quiet">{e.detail}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-quiet">{e.hash.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
