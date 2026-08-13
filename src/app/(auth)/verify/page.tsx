"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { VerifyStep } from "@/components/auth/verify-step";

/**
 * Standalone verification, for anyone who closed the tab mid-signup or clicked
 * "verify your email" from the login page. Signing in is not possible here —
 * the password is not in hand — so a success lands on the login form.
 */
function VerifyPage() {
  const params = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [confirmed, setConfirmed] = React.useState(Boolean(params.get("email")));
  const [sending, setSending] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [devCode, setDevCode] = React.useState<string | null>(null);

  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      setDevCode(payload.devCode ?? null);
      if (response.status === 429) setNotice(payload.message);
      setConfirmed(true);
    } finally {
      setSending(false);
    }
  };

  if (confirmed) {
    return (
      <VerifyStep
        email={email}
        devCode={devCode}
        onVerified={() => router.push("/login?verified=1")}
        onBack={() => setConfirmed(false)}
      />
    );
  }

  return (
    <div className="card-surface rounded-[14px] p-7">
      <h1 className="text-[21px] font-semibold tracking-[-0.02em]">Verify your email</h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        Enter the address you signed up with and we will send a fresh code.
      </p>

      {notice && (
        <p className="mt-4 rounded-xl border border-[#ffd60a]/25 bg-[#ffd60a]/[0.06] px-3.5 py-3 text-[13px] text-[#ffd60a]">
          {notice}
        </p>
      )}

      <form onSubmit={start} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={sending}>
          Send me a code
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-muted">
        Already verified?{" "}
        <Link
          href="/login"
          className="font-medium text-white underline decoration-white/25 underline-offset-2"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <React.Suspense
      fallback={<div className="card-surface h-[320px] animate-pulse rounded-[14px]" />}
    >
      <VerifyPage />
    </React.Suspense>
  );
}
