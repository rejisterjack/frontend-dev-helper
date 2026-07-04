"use client";

import { useSession } from "next-auth/react";
import { TOOL_COUNT } from "@/data/tools";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function DashboardContent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
        Dashboard
      </h1>
      <p className="mt-1 text-text-tertiary">
        Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4">
            <Eyebrow>Account</Eyebrow>
          </h2>
          {session?.user ? (
            <div className="space-y-1.5">
              <p className="font-medium text-text-primary">
                {session.user.name || "User"}
              </p>
              <p className="text-sm text-text-tertiary">{session.user.email}</p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Not signed in.</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4">
            <Eyebrow>Extension</Eyebrow>
          </h2>
          <p className="text-xl font-semibold text-text-primary">Free plan</p>
          <p className="mt-1 text-sm text-text-tertiary">
            All {TOOL_COUNT} tools available.
          </p>
        </Card>
      </div>
    </div>
  );
}
