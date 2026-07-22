"use client";

import { Suspense } from "react";
import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-text-muted">
          Loading…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
