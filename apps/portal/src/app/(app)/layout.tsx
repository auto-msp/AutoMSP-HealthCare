import { requireScope } from "@/lib/session";
import { signOut } from "@/lib/actions";
import { NavLink } from "@/components/NavLink";
import { Badge, quietButton } from "@/components/ui";
import { can } from "@automsp/core";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const scope = await requireScope();
  const pending = scope.stats().pendingApprovals;
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
      <aside className="border-b border-line p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <p className="px-3 text-sm font-semibold">AutoMSP HealthCare</p>
        <p className="mt-1 px-3 text-xs text-quiet">{scope.tenant.name}</p>
        <nav aria-label="Main" className="mt-4 grid gap-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/approvals">Approvals{pending ? ` (${pending})` : ""}</NavLink>
          <NavLink href="/modules">Modules</NavLink>
          {can(scope.actor.role, "audit.view") ? <NavLink href="/audit">Audit log</NavLink> : null}
        </nav>
        <div className="mt-6 border-t border-line px-3 pt-4 text-sm">
          <p className="font-medium">{scope.actor.name}</p>
          <div className="mt-1"><Badge tone="accent">{scope.actor.role}</Badge></div>
          <form action={signOut} className="mt-3">
            <button type="submit" className={quietButton}>Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
