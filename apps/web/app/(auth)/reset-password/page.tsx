"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-black px-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-8">
            <XCircle className="w-7 h-7 text-red-400" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4">Invalid Link</h1>
          <p role="alert" className="text-neutral-400 mb-8">
            {error}
          </p>
          <a
            href="/forgot-password"
            className="px-6 py-3 rounded-xl border border-white/10 text-white font-bold text-sm inline-block hover:bg-white/5"
          >
            Request New Link
          </a>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-8">
            <CheckCircle
              className="w-7 h-7 text-green-400"
              aria-hidden="true"
            />
          </div>
          <h1 className="text-3xl font-black text-white mb-4">
            Password Reset!
          </h1>
          <p className="text-neutral-400 mb-8">
            Your password has been updated. You can now log in with your new
            password.
          </p>
          <a
            href="/login"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-sm inline-block"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  const hasError = Boolean(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-white mb-2 text-center">
          Set New Password
        </h1>
        <p className="text-neutral-500 text-center mb-8">
          Enter your new password below.
        </p>
        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="text-red-400 text-sm mb-4 text-center"
          >
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="reset-password" className="sr-only">
              New password (min 8 characters)
            </label>
            <input
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
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="reset-confirm" className="sr-only">
              Confirm new password
            </label>
            <input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              aria-required="true"
              aria-invalid={hasError}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2
            className="w-8 h-8 text-cyan-400 animate-spin"
            aria-label="Loading"
          />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
