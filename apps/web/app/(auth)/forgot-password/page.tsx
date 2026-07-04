"use client";

import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/ui/auth-shell";
import { AuthInput } from "@/components/ui/auth-input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10">
            <Mail className="h-6 w-6 text-brand-cyan" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Check your email
          </h1>
          <p className="mt-3 text-text-tertiary">
            If an account exists for{" "}
            <strong className="text-text-secondary">{email}</strong>, you will
            receive a password reset link shortly.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-cyan underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Back to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Reset password">
      <p className="mb-6 text-center text-sm text-text-tertiary">
        Enter your email and we&apos;ll send you a reset link.
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
          <label htmlFor="forgot-email" className="sr-only">
            Email address
          </label>
          <AuthInput
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            aria-required="true"
            aria-invalid={Boolean(error)}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="mt-2 w-full"
        >
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" /> Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
