"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      // Auto sign in after registration
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/dashboard",
      });
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const hasError = Boolean(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-white mb-8 text-center">
          Create Account
        </h1>
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
            <label htmlFor="signup-name" className="sr-only">
              Name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              required
              aria-required="true"
              aria-invalid={hasError}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="signup-email" className="sr-only">
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              aria-required="true"
              aria-invalid={hasError}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="signup-password" className="sr-only">
              Password (min 8 characters)
            </label>
            <input
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
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="signup-confirm" className="sr-only">
              Confirm password
            </label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
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
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => signIn("google", { redirectTo: "/dashboard" })}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5"
          >
            Google
          </button>
          <button
            onClick={() => signIn("github", { redirectTo: "/dashboard" })}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold text-sm hover:bg-white/5"
          >
            GitHub
          </button>
        </div>
        <p className="text-center text-neutral-500 text-sm mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-cyan-400 hover:underline">
            Log In
          </a>
        </p>
      </div>
    </div>
  );
}
