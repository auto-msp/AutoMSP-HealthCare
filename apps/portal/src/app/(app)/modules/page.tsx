import type { Metadata } from "next";
import Link from "next/link";
import { can, type ModuleDef } from "@automsp/core";
import { requireScope } from "@/lib/session";
import { toggleModule } from "@/lib/actions";
import { Badge, Card, ErrorBanner, PageHeader, primaryButton, quietButton } from "@/components/ui";

export const metadata: Metadata = { title: "Modules" };

export default async function Modules({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const scope = await requireScope();
  const canToggle = can(scope.actor.role, "module.toggle");
  const rows = scope.modules();
  const families = [...new Set(rows.map((r) => r.def.family))];

  return (
    <>
      <PageHeader
        title="Modules"
        intro="Switch on only what your practice uses. Guardrails stay on for everyone."
      />
      <ErrorBanner message={error} />
      {families.map((family) => (
        <div key={family} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-quiet">{family}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.filter((r) => r.def.family === family).map(({ def, enabled }) => (
              <ModuleCard key={def.id} def={def} enabled={enabled} canToggle={canToggle} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ModuleCard({ def, enabled, canToggle }: { def: ModuleDef; enabled: boolean; canToggle: boolean }) {
  const planned = def.status === "planned";
  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">
          {enabled ? <Link href={`/m/${def.id}`} className="hover:text-accent">{def.name}</Link> : def.name}
        </h3>
        {def.firstWave ? <Badge tone="accent">first wave</Badge> : null}
        {planned ? <Badge>planned</Badge> : null}
        {enabled ? <Badge tone="good">{def.alwaysOn ? "always on" : "on"}</Badge> : null}
      </div>
      <p className="mt-2 flex-1 text-sm text-quiet">{def.summary}</p>
      {canToggle && !def.alwaysOn && !planned ? (
        <form action={toggleModule} className="mt-4">
          <input type="hidden" name="id" value={def.id} />
          <input type="hidden" name="enable" value={enabled ? "0" : "1"} />
          <button type="submit" className={enabled ? quietButton : primaryButton}>
            {enabled ? "Switch off" : "Switch on"}
          </button>
        </form>
      ) : null}
    </Card>
  );
}
