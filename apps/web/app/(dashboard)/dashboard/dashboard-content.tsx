"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { TOOL_COUNT } from "@/data/tools";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Button } from "@/components/ui/button";

type ReferralRow = {
  id: string;
  referralCode: string;
  status: string;
  referred: { status: string; joinedAt: string | null } | null;
  createdAt: string;
};

export default function DashboardContent() {
  const { data: session, status } = useSession();
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [refError, setRefError] = useState("");
  const [refLoading, setRefLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");

  const loadReferrals = useCallback(async () => {
    setRefError("");
    try {
      const res = await fetch("/api/referrals");
      if (!res.ok) {
        setRefError("Could not load referrals.");
        return;
      }
      const data = (await res.json()) as { referrals: ReferralRow[] };
      setReferrals(data.referrals);
      const pending = data.referrals.find((r) => r.status === "PENDING");
      const any = data.referrals[0];
      setReferralCode(pending?.referralCode ?? any?.referralCode ?? null);
    } catch {
      setRefError("Could not load referrals.");
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void loadReferrals();
    }
  }, [status, loadReferrals]);

  const generateCode = async () => {
    setRefLoading(true);
    setRefError("");
    try {
      const res = await fetch("/api/referrals/code", { method: "POST" });
      const data = (await res.json()) as {
        referralCode?: string;
        error?: string;
      };
      if (!res.ok || !data.referralCode) {
        setRefError(data.error || "Failed to generate code.");
        return;
      }
      setReferralCode(data.referralCode);
      await loadReferrals();
    } catch {
      setRefError("Failed to generate code.");
    } finally {
      setRefLoading(false);
    }
  };

  const copyCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const linkProvider = async (provider: "google" | "github") => {
    setLinkMessage("");
    const res = await fetch("/api/auth/prepare-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (!res.ok) {
      setLinkMessage("Could not start account linking. Try again.");
      return;
    }
    await signIn(provider, { redirectTo: "/dashboard?linked=1" });
  };

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-text-muted">Loading…</div>
      </div>
    );
  }

  const completedCount = referrals.filter((r) => r.status === "COMPLETED")
    .length;

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
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="font-medium text-text-primary">
                  {session.user.name || "User"}
                </p>
                <p className="text-sm text-text-tertiary">
                  {session.user.email}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void linkProvider("google")}
                >
                  Link Google
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void linkProvider("github")}
                >
                  Link GitHub
                </Button>
              </div>
              {linkMessage && (
                <p className="text-sm text-danger">{linkMessage}</p>
              )}
              <p className="text-xs text-text-muted">
                Link only works when signed in with email/password and the OAuth
                email matches your account.
              </p>
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
            All {TOOL_COUNT} tools available — no license required.
          </p>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h2 className="mb-4">
            <Eyebrow>Referrals</Eyebrow>
          </h2>
          {refError && (
            <p className="mb-2 text-sm text-danger">{refError}</p>
          )}
          {referralCode ? (
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded bg-bg-elevated px-3 py-2 text-sm text-text-primary">
                {referralCode}
              </code>
              <Button size="sm" variant="secondary" onClick={() => void copyCode()}>
                {copied ? "Copied" : "Copy code"}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              disabled={refLoading}
              onClick={() => void generateCode()}
            >
              {refLoading ? "Generating…" : "Generate referral code"}
            </Button>
          )}
          <p className="mt-3 text-sm text-text-tertiary">
            Share your code. Friends enter it at signup. Completions:{" "}
            <span className="font-medium text-text-primary">
              {completedCount}
            </span>
          </p>
          {referrals.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-text-tertiary">
              {referrals.map((r) => (
                <li key={r.id}>
                  {r.referralCode} — {r.status}
                  {r.referred?.joinedAt
                    ? ` (${new Date(r.referred.joinedAt).toLocaleDateString()})`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
