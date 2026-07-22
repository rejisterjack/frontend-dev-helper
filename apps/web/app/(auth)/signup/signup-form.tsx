"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/ui/auth-shell";
import { AuthInput } from "@/components/ui/auth-input";
import { Button } from "@/components/ui/button";

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("ref") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        message?: string;
        requiresVerification?: boolean;
      };

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      if (data.requiresVerification || res.status === 201) {
        setSuccess(
          data.message ||
            "Account created. Check your email to verify, then log in.",
        );
        router.push(
          `/verify-email?email=${encodeURIComponent(email)}&registered=1`,
        );
        return;
      }

      setSuccess(data.message || "Check your email to continue.");
      router.push("/verify-email?registered=1");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const hasError = Boolean(error);

  return (
    <AuthShell eyebrow="Create account">
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-center text-sm text-danger"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-3 text-center text-sm text-text-primary"
        >
          {success}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="signup-name" className="sr-only">
            Name
          </label>
          <AuthInput
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
            aria-required="true"
            aria-invalid={hasError}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="signup-email" className="sr-only">
            Email address
          </label>
          <AuthInput
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            aria-required="true"
            aria-invalid={hasError}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="signup-password" className="sr-only">
            Password (min 8 characters)
          </label>
          <AuthInput
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 characters)"
            required
            minLength={8}
            aria-required="true"
            aria-invalid={hasError}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="signup-confirm" className="sr-only">
            Confirm password
          </label>
          <AuthInput
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            required
            aria-required="true"
            aria-invalid={hasError}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="signup-referral" className="sr-only">
            Referral code (optional)
          </label>
          <AuthInput
            id="signup-referral"
            type="text"
            autoComplete="off"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Referral code (optional)"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="mt-2 w-full"
        >
          {loading ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line-subtle" />
        <span className="text-xs text-text-muted">or continue with</span>
        <div className="h-px flex-1 bg-line-subtle" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={() => signIn("google", { redirectTo: "/dashboard" })}
        >
          Google
        </Button>
        <Button
          variant="secondary"
          onClick={() => signIn("github", { redirectTo: "/dashboard" })}
        >
          GitHub
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-text-tertiary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-cyan underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
