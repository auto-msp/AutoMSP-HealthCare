import type { Metadata } from "next";
import Link from "next/link";
import { can } from "@automsp/core";
import { requireScope } from "@/lib/session";
import { Badge, Card, ErrorBanner, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const scope = await requireScope();
  const stats = scope.stats();
  const pending = scope.approvals("pending");
  const moneyAtStake = pending.reduce((sum, a) => sum + (a.amountUsd ?? 0), 0);
  const on = scope.modules().filter((m) => m.enabled);

  const tiles = [
    { label: "Waiting for a human", value: String(stats.pendingApprovals), href: "/approvals" },
    { label: "Claim value in the queue", value: `$${moneyAtStake.toLocaleString("en-US")}`, href: "/approvals" },
    { label: "Modules switched on", value: String(stats.modulesOn), href: "/modules" },
    { label: "Audit events", value: String(stats.auditEvents), href: can(scope.actor.role, "audit.view") ? "/audit" : "/dashboard" },
  ];

  return (
    <>
      <PageHeader
        title={`Good to see you, ${scope.actor.name.split(" ")[0]}`}
        intro="Nothing leaves the practice until someone approves it. Here is what is waiting."
      />
      <ErrorBanner message={error} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-xl border border-line bg-card p-4 hover:border-accent">
            <p className="text-2xl font-semibold tabular-nums">{t.value}</p>
            <p className="mt-1 text-xs text-quiet">{t.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Next up</h2>
          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-quiet">The queue is empty.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {pending.slice(0, 4).map((a) => (
                <li key={a.id} className="py-3 text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="mt-0.5 text-quiet">{a.patientRef}{a.payer ? ` · ${a.payer}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold">Your modules</h2>
          <ul className="mt-3 grid gap-2">
            {on.map(({ def }) => (
              <li key={def.id} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/m/${def.id}`} className="font-medium hover:text-accent">{def.name}</Link>
                <Badge tone={def.alwaysOn ? "neutral" : "accent"}>{def.alwaysOn ? "always on" : "on"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-6 text-xs text-quiet">
        Demo build: synthetic patients and payers. Audit chain {stats.chainIntact ? "verified intact" : "BROKEN"}.
      </p>
    </>
  );
}
