import type { Metadata } from "next";
import { DEMO_SEED } from "@automsp/core";
import { signIn } from "@/lib/actions";
import { Badge, primaryButton } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm font-medium text-accent">AutoMSP HealthCare</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">One portal for the paperwork that slows a practice down</h1>
      <p className="mt-3 max-w-xl text-quiet">
        Prior authorization, denial appeals and AI guardrails, with every outbound action waiting for a human click.
        This is a demo with synthetic data. Pick a demo user to look around.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {DEMO_SEED.tenants.map((t) => (
          <section key={t.id} className="rounded-xl border border-line bg-card p-5">
            <h2 className="font-semibold">{t.name}</h2>
            <p className="text-sm text-quiet">{t.specialty}</p>
            <ul className="mt-4 grid gap-2">
              {DEMO_SEED.users
                .filter((u) => u.tenantId === t.id)
                .map((u) => (
                  <li key={u.id}>
                    <form action={signIn} className="flex items-center justify-between gap-3">
                      <input type="hidden" name="userId" value={u.id} />
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-medium">{u.name}</span>
                        <Badge>{u.role}</Badge>
                      </span>
                      <button type="submit" className={primaryButton}>Sign in</button>
                    </form>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-6 text-xs text-quiet">
        Demo sign-in only. A live deployment uses single sign-on with multi-factor authentication.
      </p>
    </main>
  );
}
