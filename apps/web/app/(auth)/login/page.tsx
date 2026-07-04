"use client";

import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/ui/auth-shell";
import { AuthInput } from "@/components/ui/auth-input";
import { Button } from "@/components/ui/button";

const NEXTAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already linked to a different sign-in method. Log in with your original method to link accounts.",
  Configuration: "Authentication is misconfigured. Please try again later.",
  AccessDenied: "Access denied. If this keeps happening, contact support.",
  Verification: "The sign-in link is invalid or has expired.",
  Default: "Invalid email or password",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState("");

  const queryError = searchParams.get("error");
  const error =
    submitError ||
    (queryError && NEXTAUTH_ERROR_MESSAGES[queryError]
      ? NEXTAUTH_ERROR_MESSAGES[queryError]
      : queryError
        ? "Sign-in failed. Please try again."
        : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const result = (await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    })) as { error?: string } | undefined;
    if (result?.error) {
      setSubmitError(
        NEXTAUTH_ERROR_MESSAGES[result.error] ??
          NEXTAUTH_ERROR_MESSAGES.Default,
      );
    }
  };

  return (
    <AuthShell eyebrow="Log in">
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
          <label htmlFor="login-email" className="sr-only">
            Email address
          </label>
          <AuthInput
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            aria-required="true"
            aria-invalid={Boolean(error)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="login-password" className="sr-only">
            Password
          </label>
          <AuthInput
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            aria-required="true"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        <Button type="submit" size="lg" className="mt-2 w-full">
          Log in
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
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-cyan underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
      <p className="mt-2 text-center">
        <Link
          href="/forgot-password"
          className="text-xs text-text-muted transition-colors hover:text-text-secondary"
        >
          Forgot password?
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
