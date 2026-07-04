"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { AuthShell } from "@/components/ui/auth-shell";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(
        "No verification token provided. Check your email for the correct link.",
      );
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(
            data.error || "Verification failed. The link may have expired.",
          );
        }
      } catch {
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };
    verify();
  }, [token]);

  return (
    <AuthShell>
      <div className="text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-line-subtle bg-bg-elevated">
          {status === "loading" && (
            <Loader2 className="h-6 w-6 animate-spin text-brand-cyan" />
          )}
          {status === "success" && (
            <CheckCircle className="h-6 w-6 text-success" />
          )}
          {status === "error" && <XCircle className="h-6 w-6 text-danger" />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {status === "loading" && "Verifying your email…"}
          {status === "success" && "Email verified"}
          {status === "error" && "Verification failed"}
        </h1>
        <p
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
          className="mt-3 text-text-tertiary"
        >
          {message}
        </p>
        <div className="mt-6">
          {status === "success" && (
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          )}
          {status === "error" && (
            <Link href="/login">
              <Button variant="secondary">Back to login</Button>
            </Link>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
