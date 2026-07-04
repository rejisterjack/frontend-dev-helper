"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/ui/auth-shell";
import { AuthInput } from "@/components/ui/auth-input";
import { Button } from "@/components/ui/button";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError(
        "No reset token provided. Please request a new password reset link.",
      );
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
      } else {
        setError(data.error || "Reset failed. The link may have expired.");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "error") {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/20 bg-danger/10">
            <XCircle className="h-6 w-6 text-danger" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Invalid link
          </h1>
          <p role="alert" className="mt-3 text-text-tertiary">
            {error}
          </p>
          <Link href="/forgot-password" className="mt-6 inline-block">
            <Button variant="secondary">Request new link</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-success/20 bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Password reset
          </h1>
          <p className="mt-3 text-text-tertiary">
            Your password has been updated. You can now log in with your new
            password.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button>Log in</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  const hasError = Boolean(error);

  return (
    <AuthShell eyebrow="Set new password">
      <p className="mb-6 text-center text-sm text-text-tertiary">
        Enter your new password below.
      </p>
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-center text-sm text-danger"
        >
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="reset-password" className="sr-only">
            New password (min 8 characters)
          </label>
          <AuthInput
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 8 characters)"
            required
            minLength={8}
            aria-required="true"
            aria-invalid={hasError}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="reset-confirm" className="sr-only">
            Confirm new password
          </label>
          <AuthInput
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            aria-required="true"
            aria-invalid={hasError}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="mt-2 w-full"
        >
          {loading ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg-base">
          <Loader2
            className="h-6 w-6 animate-spin text-brand-cyan"
            aria-label="Loading"
          />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
