import type { Metadata } from "next";
import { can, getModule } from "@automsp/core";
import { requireScope } from "@/lib/session";
import { decideApproval } from "@/lib/actions";
import { Badge, Card, ErrorBanner, PageHeader, primaryButton, quietButton } from "@/components/ui";

export const metadata: Metadata = { title: "Approvals" };

const STATUS_TONE = { pending: "warn", approved: "good", rejected: "bad" } as const;

export default async function Approvals({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const scope = await requireScope();
  const items = scope.approvals();
  const canDecide = can(scope.actor.role, "approval.decide");
  const pending = items.filter((i) => i.status === "pending");
  const done = items.filter((i) => i.status !== "pending").reverse();

  return (
    <>
      <PageHeader
        title="Approvals"
        intro="Every prior authorization, appeal and guardrail hold waits here for a human decision."
      />
      <ErrorBanner message={error} />
      {!canDecide ? (
        <p className="mb-4 text-sm text-quiet">Your role can view this queue but not decide.</p>
      ) : null}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-quiet">Waiting ({pending.length})</h2>
      <div className="grid gap-3">
        {pending.length === 0 ? <Card><p className="text-sm text-quiet">Nothing is waiting.</p></Card> : null}
        {pending.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{getModule(a.module).name}</Badge>
              <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
              {a.amountUsd ? <span className="text-sm tabular-nums text-quiet">${a.amountUsd.toLocaleString("en-US")}</span> : null}
            </div>
            <h3 className="mt-2 font-medium">{a.title}</h3>
            <p className="mt-1 text-sm text-quiet">{a.detail}</p>
            <p className="mt-1 text-xs text-quiet">{a.patientRef}{a.payer ? ` · ${a.payer}` : ""}</p>
            {a.payload ? (
              <details className="mt-3 rounded-lg border border-line bg-paper p-3 text-sm">
                <summary className="cursor-pointer font-medium">Held output (identifiers already removed)</summary>
                <p className="mt-2 whitespace-pre-wrap">{a.payload}</p>
              </details>
            ) : null}
            {canDecide ? (
              <form action={decideApproval} className="mt-4 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={a.id} />
                <label className="sr-only" htmlFor={`note-${a.id}`}>Note</label>
                <input
                  id={`note-${a.id}`}
                  name="note"
                  placeholder="Optional note"
                  className="min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-card px-3 text-sm"
                />
                <button type="submit" name="decision" value="approved" className={primaryButton}>Approve</button>
                <button type="submit" name="decision" value="rejected" className={quietButton}>Reject</button>
              </form>
            ) : null}
          </Card>
        ))}
      </div>

      {done.length ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-quiet">Decided ({done.length})</h2>
          <div className="grid gap-2">
            {done.map((a) => (
              <Card key={a.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  <span className="text-sm font-medium">{a.title}</span>
                </div>
                {a.decisionNote ? <p className="mt-1 text-sm text-quiet">Note: {a.decisionNote}</p> : null}
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
