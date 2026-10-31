import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AutoMSP HealthCare", template: "%s · AutoMSP HealthCare" },
  description: "One portal for prior authorization, denial appeals and AI guardrails. Demo build with synthetic data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
