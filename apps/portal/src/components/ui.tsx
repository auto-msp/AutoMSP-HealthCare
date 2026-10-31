import type { ReactNode } from "react";

export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {intro ? <p className="mt-1 max-w-2xl text-sm text-quiet">{intro}</p> : null}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-card p-5 ${className}`}>{children}</section>;
}

const TONES = {
  neutral: "bg-paper text-quiet border-line",
  accent: "bg-accent-soft text-accent border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  bad: "bg-bad-soft text-bad border-transparent",
  good: "bg-good-soft text-good border-transparent",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 rounded-lg border border-transparent bg-bad-soft px-4 py-3 text-sm text-bad">
      {message}
    </div>
  );
}

export const buttonClass =
  "inline-flex min-h-9 items-center justify-center rounded-lg px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButton = `${buttonClass} bg-accent text-white hover:bg-[#0b5f58]`;
export const quietButton = `${buttonClass} border border-line bg-card text-ink hover:bg-paper`;
