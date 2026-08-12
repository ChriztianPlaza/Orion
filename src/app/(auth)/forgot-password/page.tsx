"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [mailConfigured, setMailConfigured] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.message ?? "Something went wrong. Please try again.");
        return;
      }
      setMailConfigured(payload.mailConfigured !== false);
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="card-surface rounded-[22px] p-7 text-center">
        <CheckCircle2 className="mx-auto size-8 text-[#30d158]" />
        <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.02em]">Check your inbox</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-white/50">
          If that address has an account, a reset link is on its way. It expires in one hour.
        </p>
        {!mailConfigured && (
          <p className="mt-4 rounded-xl border border-[#ffd60a]/20 bg-[#ffd60a]/[0.06] p-3 text-[12.5px] text-[#ffd60a]">
            Email delivery is not configured on this instance, so the link was written to the server
            log instead. Ask an administrator to set RESEND_API_KEY and EMAIL_FROM.
          </p>
        )}
        <Link href="/login" className="mt-6 block">
          <Button variant="secondary" className="w-full">
            Back to login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="card-surface rounded-[22px] p-7">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Reset your password</h1>
      <p className="mt-2 text-[13.5px] text-white/45">
        Enter the email you signed up with and we will send you a link.
      </p>

      {error && (
        <p className="mt-5 rounded-xl border border-[#ff453a]/25 bg-[#ff453a]/[0.06] px-3.5 py-3 text-[13px] text-[#ff6961]" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
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
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-white/40">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-white underline decoration-white/25 underline-offset-2">
          Log in
        </Link>
      </p>
    </div>
  );
}
