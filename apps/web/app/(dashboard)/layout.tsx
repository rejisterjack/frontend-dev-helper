"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/eyebrow";

// Dashboard navigation. Only routes that actually exist are listed — the
// previous /settings link pointed to a non-existent page and 404'd.
const nav = [{ href: "/dashboard", label: "Overview" }];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-bg-base">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line-subtle bg-bg-elevated/40 p-6 md:flex">
        <Link href="/" aria-label="FrontendDevHelper home">
          <Logo size={28} />
        </Link>
        <nav className="mt-8 space-y-1">
          <Eyebrow>Account</Eyebrow>
          <div className="mt-3 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-bg-elevated text-text-primary"
                    : "text-text-tertiary hover:bg-bg-elevated hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </aside>
      <div className="flex-1 p-6 md:p-10">{children}</div>
    </div>
  );
}
