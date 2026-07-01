"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = (await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    })) as { error?: string } | undefined;
    if (result?.error) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-white mb-8 text-center">
          Log In
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
            <label htmlFor="login-email" className="sr-only">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              aria-required="true"
              aria-invalid={Boolean(error)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="login-password" className="sr-only">
              Password
            </label>
            <input
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
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold"
          >
            Log In
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
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-cyan-400 hover:underline">
            Sign Up
          </a>
        </p>
        <p className="text-center mt-2">
          <a
            href="/forgot-password"
            className="text-neutral-600 text-xs hover:text-neutral-400 transition-colors"
          >
            Forgot password?
          </a>
        </p>
      </div>
    </div>
  );
}
