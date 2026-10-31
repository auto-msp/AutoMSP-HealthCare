"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "bg-accent-soft font-medium text-accent" : "text-quiet hover:bg-paper hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
